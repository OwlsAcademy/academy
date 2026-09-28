// Owl's Academy — Progress tracking (debounced Supabase saves + offline queue)
//
// Saves send only what changed since the last save and the server merges it
// (db/save-progress.sql), so a stale copy in another tab/device or the
// teacher's "view as student" preview can't wipe newer answers.

window.OWL = window.OWL || {};

OWL.Progress = (() => {
  let _lessonId  = null;
  let _studentId = null;
  let _cache     = { block_progress: {}, srs_data: {}, mywords: [], notes: '', teacher_notes: '' };
  let _timer     = null;
  const DEBOUNCE = 1800;
  const RPC      = 'save_lesson_progress';

  // What changed since the last save
  let _dirtyBlocks = new Set();
  let _dirtySrs    = new Set();
  let _dirtyWords  = false;
  let _dirtyNotes  = false;

  async function load(lessonId, studentId) {
    _lessonId  = lessonId;
    _studentId = studentId;

    if (!OWL.Offline.isOnline()) {
      const cached = OWL.Offline.loadProgress(studentId, lessonId);
      if (cached) _cache = { ..._cache, ...cached };
      return _cache;
    }

    // Push answers left over from an offline session before reading the server copy
    if (OWL.Offline.hasPending()) await OWL.Offline.syncPending();

    const { data } = await sb
      .from('lesson_progress')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (data) {
      _cache = {
        block_progress: data.block_progress || {},
        srs_data:       data.srs_data       || {},
        mywords:        data.mywords         || [],
        notes:          data.notes           || '',
        teacher_notes:  data.teacher_notes   || ''
      };
      OWL.Offline.saveProgress(studentId, lessonId, _cache);
    }
    return _cache;
  }

  function getBlock(blockId)       { return _cache.block_progress[blockId] || null; }
  function setBlock(blockId, data) { _cache.block_progress[blockId] = data; _dirtyBlocks.add(blockId); _schedule(); }
  function getSRS(cardKey)         { return _cache.srs_data[cardKey] || null; }
  function setSRS(cardKey, data)   { _cache.srs_data[cardKey] = data; _dirtySrs.add(cardKey); _schedule(); }
  function getMyWords()            { return _cache.mywords; }
  function setMyWords(words)       { _cache.mywords = words; _dirtyWords = true; _schedule(); }
  function getNotes()              { return _cache.notes; }
  function setNotes(text)          { _cache.notes = text; _dirtyNotes = true; _schedule(); }

  function _isDirty() {
    return _dirtyBlocks.size > 0 || _dirtySrs.size > 0 || _dirtyWords || _dirtyNotes;
  }

  function _schedule() {
    clearTimeout(_timer);
    _timer = setTimeout(flush, DEBOUNCE);
  }

  function _pick(obj, keys) {
    if (!keys.size) return null;
    const out = {};
    keys.forEach(k => { out[k] = obj[k]; });
    return out;
  }

  // Build RPC args from the pending changes and clear the dirty state
  function _takeChanges() {
    const args = {
      p_student_id: _studentId,
      p_lesson_id:  _lessonId,
      p_blocks:     _pick(_cache.block_progress, _dirtyBlocks),
      p_srs:        _pick(_cache.srs_data, _dirtySrs),
      p_mywords:    _dirtyWords ? _cache.mywords : null,
      p_notes:      _dirtyNotes ? _cache.notes : null
    };
    _dirtyBlocks = new Set();
    _dirtySrs    = new Set();
    _dirtyWords  = false;
    _dirtyNotes  = false;
    return args;
  }

  function _enqueue(args) {
    OWL.Offline.enqueue({ type: 'rpc', fn: RPC, args });
    OWL.Offline.updateBanner();
  }

  // Before db/save-progress.sql is applied the RPC doesn't exist — fall back
  // to the old whole-row upsert so saving keeps working.
  async function _legacyUpsert() {
    const { error } = await sb.from('lesson_progress').upsert({
      student_id:     _studentId,
      lesson_id:      _lessonId,
      block_progress: _cache.block_progress,
      srs_data:       _cache.srs_data,
      mywords:        _cache.mywords,
      notes:          _cache.notes
    }, { onConflict: 'student_id,lesson_id' });
    if (error) throw error;
  }

  async function flush() {
    clearTimeout(_timer);
    if (!_isDirty() || !_lessonId || !_studentId) return;

    const args = _takeChanges();

    // Always persist locally (instant, works offline)
    OWL.Offline.saveProgress(_studentId, _lessonId, _cache);

    if (!OWL.Offline.isOnline()) { _enqueue(args); return; }

    try {
      const { error } = await sb.rpc(RPC, args);
      if (error && error.code === 'PGRST202') await _legacyUpsert();
      else if (error) throw error;
    } catch {
      // Connection dropped mid-flight — queue for sync on reconnect
      _enqueue(args);
    }
  }

  // Page is being hidden or unloaded (back link, closed tab, app switch on a
  // phone): send pending changes right away with keepalive, which the browser
  // completes even after the page is gone. The debounced flush would be lost.
  function _flushOnLeave() {
    clearTimeout(_timer);
    if (!_isDirty() || !_lessonId || !_studentId) return;

    const args = _takeChanges();
    OWL.Offline.saveProgress(_studentId, _lessonId, _cache);

    if (!OWL.Offline.isOnline()) { _enqueue(args); return; }

    fetch(SUPABASE_URL + '/rest/v1/rpc/' + RPC, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(args)
    }).then(res => {
      // Only reached if the page is still alive (e.g. tab switched, not closed)
      if (res.status === 404) return _legacyUpsert();
      if (!res.ok) _enqueue(args);
    }).catch(() => _enqueue(args));
  }

  window.addEventListener('pagehide', _flushOnLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushOnLeave();
  });

  return { load, getBlock, setBlock, getSRS, setSRS, getMyWords, setMyWords, getNotes, setNotes, flush };
})();
