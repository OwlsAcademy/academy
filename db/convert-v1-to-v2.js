/**
 * Owl's Academy — v1 → v2 Lesson Converter
 *
 * Run in Node.js:
 *   node convert-v1-to-v2.js                 # convert all lessons in DB
 *   node convert-v1-to-v2.js lesson_id       # convert single lesson
 *
 * Reads from the OLD database (set V1_SUPABASE_* below) and writes
 * to the NEW database (set V2_SUPABASE_* below). Safe to run multiple
 * times — uses UPSERT. Does NOT delete original data.
 */

const { createClient } = require('@supabase/supabase-js');

// ── CONFIGURE ──────────────────────────────────────────────────────
// V1: używamy anon key (RLS pozwala anon na SELECT wszystkiego)
const V1_SUPABASE_URL  = 'https://oilitfktzemvathmefpc.supabase.co';
const V1_SUPABASE_KEY  = 'sb_publishable_3Qq3Cxv80-KbL5ybAywj3Q_-c-CCws0';

// V2: service_role key do pełnego zapisu
const V2_SUPABASE_URL  = 'https://oyyhmckgpwafqauxkbch.supabase.co';
const V2_SUPABASE_KEY  = process.env.V2_KEY  || '';
// ──────────────────────────────────────────────────────────────────

const v1 = createClient(V1_SUPABASE_URL, V1_SUPABASE_KEY);
const v2 = createClient(V2_SUPABASE_URL, V2_SUPABASE_KEY);

function uid() { return Math.random().toString(36).slice(2, 10); }

// ── CONVERT A SINGLE V1 LESSON OBJECT TO V2 FORMAT ────────────────
function convertLesson(v1Lesson) {
  const tabs = [];
  function addTab(name, icon, blocks) {
    if (blocks && blocks.length) tabs.push({ id: 'tab_' + uid(), name, icon, blocks });
  }

  // INTRODUCTION
  if (v1Lesson.introduction) {
    const intro = v1Lesson.introduction;
    const blocks = (intro.sections || []).map(s => ({
      id: 'b_' + uid(), type: mapIntroType(s.type), data: s
    }));
    if (intro.subtitle) blocks.unshift({ id: 'b_' + uid(), type: 'info', data: { text: intro.subtitle, color: 'yellow' } });
    addTab('Introduction', '🎯', blocks);
  }

  // VOCABULARY
  if (v1Lesson.vocabulary) {
    const vocab = v1Lesson.vocabulary;
    const blocks = [];
    if (vocab.subtitle) blocks.push({ id: 'b_' + uid(), type: 'info', data: { text: vocab.subtitle, color: 'green' } });
    (vocab.sections || []).forEach(s => {
      blocks.push({ id: 'b_' + uid(), type: s.type === 'grid' ? 'vocab-grid' : 'vocab-table', data: s });
    });
    if (vocab.phrases && vocab.phrases.length) {
      blocks.push({ id: 'b_' + uid(), type: 'phrases', data: { title: 'Useful Phrases', items: vocab.phrases } });
    }
    (vocab.blocks || []).forEach(b => {
      blocks.push({ id: 'b_' + uid(), type: b.type, data: b });
    });
    addTab('Vocabulary', '📚', blocks);
  }

  // GRAMMAR
  if (v1Lesson.grammar) {
    const grammar = v1Lesson.grammar;
    const blocks = [];
    if (grammar.title || grammar.subtitle) {
      blocks.push({ id: 'b_' + uid(), type: 'info', data: { title: grammar.title, text: grammar.subtitle || '', color: 'purple' } });
    }
    (grammar.blocks || []).forEach(b => {
      blocks.push({ id: 'b_' + uid(), type: mapGrammarType(b.type), data: b });
    });
    addTab('Grammar', '📐', blocks);
  }

  // READING
  if (v1Lesson.reading) {
    const reading = v1Lesson.reading;
    const blocks = [];
    if (reading.beforeYouRead) {
      blocks.push({ id: 'b_' + uid(), type: 'discussion', data: { title: 'Before You Read', questions: reading.beforeYouRead } });
    }
    blocks.push({
      id: 'b_' + uid(), type: 'article', data: {
        articleTitle: reading.title,
        text: reading.text,
        image: reading.image || '',
        footnote: reading.note || ''
      }
    });
    if (reading.vocab && reading.vocab.length) {
      blocks.push({ id: 'b_' + uid(), type: 'vocab-grid', data: { title: 'Key Vocabulary', color: 'green', items: reading.vocab.map(v => ({ pl: v.pl, en: v.en })) } });
    }
    if (reading.comprehension && reading.comprehension.length) {
      blocks.push({ id: 'b_' + uid(), type: 'comprehension', data: { title: 'Check Your Understanding', questions: reading.comprehension } });
    }
    (reading.exercises || []).forEach(b => {
      blocks.push({ id: 'b_' + uid(), type: b.type, data: b });
    });
    if (reading.postReading) {
      blocks.push({ id: 'b_' + uid(), type: 'discussion', data: { title: 'After Reading', questions: reading.postReading } });
    }
    addTab('Reading', '📖', blocks);
  }

  // EXERCISES
  if (v1Lesson.exercises && v1Lesson.exercises.length) {
    const blocks = v1Lesson.exercises.map(b => ({ id: 'b_' + uid(), type: mapExerciseType(b.type), data: b }));
    addTab('Exercises', '✏️', blocks);
  }

  // SPEAKING
  if (v1Lesson.speaking) {
    const speaking = v1Lesson.speaking;
    const blocks = [];
    if (speaking.subtitle) blocks.push({ id: 'b_' + uid(), type: 'info', data: { text: speaking.subtitle, color: 'teal' } });
    (speaking.conversations || []).forEach(c => blocks.push({ id: 'b_' + uid(), type: 'conversation', data: c }));
    (speaking.blocks || []).forEach(b => blocks.push({ id: 'b_' + uid(), type: b.type, data: b }));
    addTab('Speaking', '💬', blocks);
  }

  // FLASHCARDS
  if (v1Lesson.flashcards && v1Lesson.flashcards.length) {
    const items = v1Lesson.flashcards.map(f => ({
      word: f.word, definition: f.translation || f.definition || '', example: f.example || '', emoji: f.emoji || ''
    }));
    addTab('Flashcards', '🃏', [{ id: 'b_' + uid(), type: 'flashcards', data: { title: 'Study the Words', items } }]);
  }

  // HOMEWORK
  if (v1Lesson.homework && v1Lesson.homework.length) {
    const blocks = v1Lesson.homework.map(b => ({ id: 'b_' + uid(), type: mapHomeworkType(b.type), data: b }));
    addTab('Homework', '📝', blocks);
  }

  return {
    id:           v1Lesson.id,
    title:        v1Lesson.title,
    subtitle:     v1Lesson.subtitle,
    level:        v1Lesson.level,
    header_emoji: v1Lesson.header_emoji,
    tabs
  };
}

function mapIntroType(type) {
  const map = { quote: 'quote', discussion: 'discussion', article: 'article', glossary: 'glossary',
    comprehension: 'comprehension', speaking: 'discussion', cta: 'cta', image: 'image', html: 'html', info: 'info' };
  return map[type] || 'info';
}

function mapGrammarType(type) {
  const map = { info: 'info', table: 'table', examples: 'examples', 'qa-table': 'table',
    'two-col': 'two-col', 'gr-fill': 'gapfill', 'gr-mcq': 'quiz', 'gr-transform': 'transform',
    'gr-errorcorrect': 'errorcorrect', 'gr-ownsentences': 'ownsentences', 'gr-translate': 'translation',
    'gr-sentcomp': 'sentcomp' };
  return map[type] || type;
}

function mapExerciseType(type) {
  const map = { quiz: 'quiz', fill: 'gapfill', translate: 'translation' };
  return map[type] || type;
}

function mapHomeworkType(type) {
  const map = { write: 'hw-write', checklist: 'checklist', 'hw-fill': 'gapfill',
    'hw-translate': 'translation', 'hw-match': 'matching', 'hw-gr-fill': 'gapfill',
    'hw-gr-mcq': 'quiz', 'hw-gr-transform': 'transform', 'hw-gr-errorcorrect': 'errorcorrect',
    'hw-gr-sentcomplete': 'sentcomp', 'hw-gr-own': 'ownsentences', 'hw-reading': 'comprehension' };
  return map[type] || type;
}

// ── ALSO CONVERT STUDENTS & student_lessons ────────────────────────
async function convertStudents() {
  console.log('Converting students...');
  const { data: students, error } = await v1.from('students').select('*');
  if (error) { console.error('Error fetching students:', error.message); return; }

  for (const s of students) {
    const { error: e } = await v2.from('students').upsert({
      id: s.id, name: s.name, code: s.code, prefix: s.prefix || '',
      last_active: null, streak_days: 0, xp: 0, created_at: s.created_at
    }, { onConflict: 'id' });
    if (e) console.error('Error upserting student', s.name, e.message);
    else console.log('  ✓ Student:', s.name);
  }
}

async function convertStudentLessons(idMap) {
  console.log('Converting student_lessons...');
  const { data: rows, error } = await v1.from('student_lessons').select('*');
  if (error) { console.error('Error fetching student_lessons:', error.message); return; }

  let ok = 0, fail = 0;
  for (const r of rows) {
    const lessonId = idMap[r.lesson_id] || r.lesson_id;
    if (!isUUID(lessonId)) { console.error('  ✗ Skipping assignment — unmapped lesson_id:', r.lesson_id); fail++; continue; }
    const rowId = isUUID(r.id) ? r.id : newUUID();
    const { error: e } = await v2.from('student_lessons').upsert({
      id: rowId, student_id: r.student_id, lesson_id: lessonId,
      lesson_order: r.lesson_order || 1, assigned_at: r.assigned_at
    }, { onConflict: 'id' });
    if (e) { console.error('  ✗ Error upserting student_lesson', r.id, e.message); fail++; }
    else ok++;
  }
  console.log(`  ✓ ${ok} assignments converted, ${fail} failed`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(s) { return UUID_RE.test(s); }

// crypto.randomUUID available in Node 14.17+
function newUUID() {
  try { return require('crypto').randomUUID(); }
  catch { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
}

// ── MAIN ──────────────────────────────────────────────────────────
async function main() {
  const targetId = process.argv[2];

  // Convert lessons — track id mapping for non-UUID legacy ids
  console.log('Converting lessons...');
  const idMap = {}; // v1_id → v2_id
  let query = v1.from('lessons').select('*');
  if (targetId) query = query.eq('id', targetId);

  const { data: lessons, error } = await query;
  if (error) { console.error('Error fetching lessons:', error.message); process.exit(1); }

  let ok = 0, fail = 0;
  for (const lesson of lessons) {
    try {
      const converted = convertLesson(lesson);
      // If V1 id is not a valid UUID, generate a new one and record the mapping
      if (!isUUID(converted.id)) {
        const newId = newUUID();
        console.log(`  ↻ Non-UUID id "${converted.id}" → new UUID ${newId}`);
        idMap[converted.id] = newId;
        converted.id = newId;
      } else {
        idMap[converted.id] = converted.id;
      }
      const { error: e } = await v2.from('lessons').upsert(converted, { onConflict: 'id' });
      if (e) { console.error('  ✗', lesson.title, e.message); fail++; }
      else   { console.log('  ✓', lesson.title, '(' + (converted.tabs.length) + ' tabs)'); ok++; }
    } catch(e) {
      console.error('  ✗ Error converting', lesson.title, e.message);
      fail++;
    }
  }
  console.log(`\nLessons: ${ok} converted, ${fail} failed`);

  if (!targetId) {
    await convertStudents();
    await convertStudentLessons(idMap);
  }

  console.log('\nDone! Verify the results in your v2 Supabase dashboard.');
}

main().catch(e => { console.error(e); process.exit(1); });
