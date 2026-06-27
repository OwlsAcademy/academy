// Owl's Academy — Progress tracking (debounced Supabase saves)

window.OWL = window.OWL || {};

OWL.Progress = (() => {
  let _lessonId = null;
  let _studentId = null;
  let _cache = { block_progress: {}, srs_data: {}, mywords: [], notes: '', teacher_notes: '' };
  let _dirty = false;
  let _timer = null;
  const DEBOUNCE = 1800;

  async function load(lessonId, studentId) {
    _lessonId = lessonId;
    _studentId = studentId;
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
    }
    return _cache;
  }

  function getBlock(blockId) {
    return _cache.block_progress[blockId] || null;
  }

  function setBlock(blockId, data) {
    _cache.block_progress[blockId] = data;
    _schedule();
  }

  function getSRS(cardKey) {
    return _cache.srs_data[cardKey] || null;
  }

  function setSRS(cardKey, data) {
    _cache.srs_data[cardKey] = data;
    _schedule();
  }

  function getMyWords() { return _cache.mywords; }

  function setMyWords(words) {
    _cache.mywords = words;
    _schedule();
  }

  function getNotes() { return _cache.notes; }
  function setNotes(text) { _cache.notes = text; _schedule(); }

  function _schedule() {
    _dirty = true;
    clearTimeout(_timer);
    _timer = setTimeout(flush, DEBOUNCE);
  }

  async function flush() {
    if (!_dirty || !_lessonId || !_studentId) return;
    _dirty = false;
    await sb.from('lesson_progress').upsert({
      student_id:     _studentId,
      lesson_id:      _lessonId,
      block_progress: _cache.block_progress,
      srs_data:       _cache.srs_data,
      mywords:        _cache.mywords,
      notes:          _cache.notes
    }, { onConflict: 'student_id,lesson_id' });
  }

  return { load, getBlock, setBlock, getSRS, setSRS, getMyWords, setMyWords, getNotes, setNotes, flush };
})();
