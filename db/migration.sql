-- ================================================================
-- Owl's Academy v2 — Supabase Database Migration
-- Safe to run multiple times (idempotent).
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ================================================================

-- ── TABLES ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  code        TEXT    NOT NULL UNIQUE,
  prefix      TEXT    NOT NULL DEFAULT '',
  last_active DATE,
  streak_days INT     NOT NULL DEFAULT 0,
  xp          INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Lessons: tabs is an ordered JSON array of {id, name, icon, blocks[]}
-- Each block: {id, type, data{}}  — any block type in any tab
CREATE TABLE IF NOT EXISTS lessons (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT,
  subtitle         TEXT,
  level            TEXT,
  header_emoji     TEXT,
  target_lang      TEXT NOT NULL DEFAULT 'en',
  instruction_lang TEXT NOT NULL DEFAULT 'pl',
  tabs             JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_lessons (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id      UUID NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  lesson_order   INT  NOT NULL DEFAULT 1,
  available_from TIMESTAMPTZ DEFAULT now(),
  due_date       TIMESTAMPTZ,
  assigned_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

-- block_progress: keyed by block_id, stores answers/state per block
-- srs_data: SM-2 data per flashcard, keyed by blockId:cardIndex
CREATE TABLE IF NOT EXISTS lesson_progress (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_id      UUID NOT NULL REFERENCES lessons(id)  ON DELETE CASCADE,
  block_progress JSONB NOT NULL DEFAULT '{}',
  srs_data       JSONB NOT NULL DEFAULT '{}',
  mywords        JSONB NOT NULL DEFAULT '[]',
  notes          TEXT  NOT NULL DEFAULT '',
  teacher_notes  TEXT  NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS config (
  id                  INT  PRIMARY KEY DEFAULT 1,
  emailjs_public_key  TEXT NOT NULL DEFAULT '',
  emailjs_service_id  TEXT NOT NULL DEFAULT '',
  emailjs_template_id TEXT NOT NULL DEFAULT '',
  emailjs_to_email    TEXT NOT NULL DEFAULT '',
  anthropic_api_key   TEXT NOT NULL DEFAULT ''
);

-- Add columns introduced after initial release (safe to re-run)
ALTER TABLE config ADD COLUMN IF NOT EXISTS ai_prompt TEXT NOT NULL DEFAULT '';

INSERT INTO config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── AUTO-UPDATE TRIGGERS ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lessons_updated_at         ON lessons;
DROP TRIGGER IF EXISTS lesson_progress_updated_at ON lesson_progress;

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────

ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE config          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_students"        ON students;
DROP POLICY IF EXISTS "anon_read_lessons"         ON lessons;
DROP POLICY IF EXISTS "anon_read_student_lessons" ON student_lessons;
DROP POLICY IF EXISTS "anon_read_config"          ON config;
DROP POLICY IF EXISTS "anon_write_progress"       ON lesson_progress;
DROP POLICY IF EXISTS "auth_all_students"         ON students;
DROP POLICY IF EXISTS "auth_all_lessons"          ON lessons;
DROP POLICY IF EXISTS "auth_all_student_lessons"  ON student_lessons;
DROP POLICY IF EXISTS "auth_all_lesson_progress"  ON lesson_progress;
DROP POLICY IF EXISTS "auth_all_config"           ON config;

CREATE POLICY "anon_read_students"        ON students        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_lessons"         ON lessons         FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_student_lessons" ON student_lessons FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_config"          ON config          FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_progress"       ON lesson_progress FOR ALL    TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_students"        ON students        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_lessons"         ON lessons         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_student_lessons" ON student_lessons FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_lesson_progress" ON lesson_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_config"          ON config          FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── GRANTS ────────────────────────────────────────────────────────

GRANT SELECT                         ON students        TO anon;
GRANT SELECT                         ON lessons         TO anon;
GRANT SELECT                         ON student_lessons TO anon;
GRANT SELECT                         ON config          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON students        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON student_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON config          TO authenticated;

GRANT ALL ON students, lessons, student_lessons, lesson_progress, config TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
