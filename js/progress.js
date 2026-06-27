// Owl's Academy — Progress tracking (debounced Supabase saves + offline queue)

window.OWL = window.OWL || {};

OWL.Progress = (() => {
  let _lessonId  = null;
  let _studentId = null;
  let _cache     = { block_progress: {}, srs_data: {}, mywords: [], notes: '', teacher_notes: '' };
  let _dirty     = false;
  let _timer     = null;
  const DEBOUNCE = 1800;

  async function load(lessonId, studentId) {
    _lessonId  = lessonId;
    _studentId = studentId;

    if (!OWL.Offline.isOnline()) {
      const cached = OWL.Offline.loadProgress(studentId, lessonId);
      if (cached) _cache = { ..._cache, ...cached };
      return _cache;
    }

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
  function setBlock(blockId, data) { _cache.block_progress[blockId] = data; _schedule(); }
  function getSRS(cardKey)         { return _cache.srs_data[cardKey] || null; }
  function setSRS(cardKey, data)   { _cache.srs_data[cardKey] = data; _schedule(); }
  function getMyWords()            { return _cache.mywords; }
  function setMyWords(words)       { _cache.mywords = words; _schedule(); }
  function getNotes()              { return _cache.notes; }
  function setNotes(text)          { _cache.notes = text; _schedule(); }

  function _schedule() {
    _dirty = true;
    clearTimeout(_timer);
    _timer = setTimeout(flush, DEBOUNCE);
  }

  async function flush() {
    if (!_dirty || !_lessonId || !_studentId) return;
    _dirty = false;

    const payload = {
      student_id:     _studentId,
      lesson_id:      _lessonId,
      block_progress: _cache.block_progress,
      srs_data:       _cache.srs_data,
      mywords:        _cache.mywords,
      notes:          _cache.notes
    };

    // Always persist locally (instant, works offline)
    OWL.Offline.saveProgress(_studentId, _lessonId, _cache);

    if (!OWL.Offline.isOnline()) {
      OWL.Offline.enqueue({ type: 'upsert', table: 'lesson_progress', conflict: 'student_id,lesson_id', data: payload });
      OWL.Offline.updateBanner();
      return;
    }

    try {
      const { error } = await sb.from('lesson_progress')
        .upsert(payload, { onConflict: 'student_id,lesson_id' });
      if (error) throw error;
    } catch {
      // Connection dropped mid-flight — queue for sync on reconnect
      OWL.Offline.enqueue({ type: 'upsert', table: 'lesson_progress', conflict: 'student_id,lesson_id', data: payload });
      OWL.Offline.updateBanner();
    }
  }

  return { load, getBlock, setBlock, getSRS, setSRS, getMyWords, setMyWords, getNotes, setNotes, flush };
})();
