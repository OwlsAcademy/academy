'use strict';
window.OWL = window.OWL || {};

OWL.Offline = (() => {
  // ── STORAGE ──────────────────────────────────────────────────────
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function _set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { console.warn('[OWL offline] localStorage pełny?', e); }
  }

  const K = {
    student:  code         => 'owl_s_'  + String(code).toLowerCase(),
    lessons:  studentId    => 'owl_ls_' + studentId,
    lesson:   lessonId     => 'owl_l_'  + lessonId,
    progress: (sid, lid)   => 'owl_p_'  + sid + '_' + lid,
    queue:    'owl_q'
  };

  // ── STATUS ───────────────────────────────────────────────────────
  function isOnline() { return navigator.onLine !== false; }

  // ── STUDENT ──────────────────────────────────────────────────────
  function saveStudent(s)    { _set(K.student(s.code), s); }
  function loadStudent(code) { return _get(K.student(code)); }

  // ── LESSONS LIST (dashboard) ─────────────────────────────────────
  function saveLessons(studentId, lessons) {
    _set(K.lessons(studentId), lessons);
    // Cache individual lesson content (tabs + blocks)
    lessons.forEach(l => { if (l.tabs && l.tabs.length) _set(K.lesson(l.id), l); });
  }
  function loadLessons(studentId) { return _get(K.lessons(studentId)); }

  // ── LESSON CONTENT ───────────────────────────────────────────────
  function saveLesson(lesson) { _set(K.lesson(lesson.id), lesson); }
  function loadLesson(id)     { return _get(K.lesson(id)); }

  // ── PROGRESS ─────────────────────────────────────────────────────
  function saveProgress(studentId, lessonId, data) {
    _set(K.progress(studentId, lessonId), data);
  }
  function loadProgress(studentId, lessonId) {
    return _get(K.progress(studentId, lessonId));
  }

  // ── SYNC QUEUE ───────────────────────────────────────────────────
  function enqueue(entry) {
    const q = _get(K.queue) || [];
    // Deduplicate — merge same student+lesson into one entry
    const i = q.findIndex(x =>
      x.table === entry.table &&
      x.data?.student_id === entry.data?.student_id &&
      x.data?.lesson_id  === entry.data?.lesson_id
    );
    if (i >= 0) q[i] = entry; else q.push(entry);
    _set(K.queue, q);
  }

  function hasPending() { return (_get(K.queue) || []).length > 0; }

  async function syncPending() {
    const q = _get(K.queue) || [];
    if (!q.length) return true;
    const failed = [];
    for (const op of q) {
      try {
        const { error } = await sb.from(op.table)
          .upsert(op.data, { onConflict: op.conflict });
        if (error) throw error;
      } catch { failed.push(op); }
    }
    _set(K.queue, failed);
    return failed.length === 0;
  }

  // ── BANNER ───────────────────────────────────────────────────────
  let _banner = null;

  function updateBanner() {
    const offline = !isOnline();
    const pending = hasPending();
    if (!offline && !pending) {
      if (_banner) _banner.style.display = 'none';
      return;
    }
    if (!_banner) {
      _banner = document.createElement('div');
      _banner.id = 'offlineBanner';
      document.body.prepend(_banner);
    }
    _banner.style.display = 'block';
    _banner.textContent = offline
      ? '📵 Tryb offline — postęp zapisywany lokalnie'
      : '🔄 Synchronizuję z serwerem...';
  }

  // ── AUTO-SYNC on reconnect ────────────────────────────────────────
  window.addEventListener('offline', () => updateBanner());
  window.addEventListener('online', async () => {
    if (!hasPending()) { updateBanner(); return; }
    updateBanner();
    const ok = await syncPending();
    updateBanner();
    if (ok && typeof showToast === 'function')
      showToast('✓ Zsynchronizowano z serwerem', 'success');
  });

  return {
    isOnline,
    saveStudent, loadStudent,
    saveLessons, loadLessons,
    saveLesson,  loadLesson,
    saveProgress, loadProgress,
    enqueue, hasPending, syncPending,
    updateBanner
  };
})();
