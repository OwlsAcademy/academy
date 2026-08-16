-- ================================================================
-- Owl's Academy — POPRAWKA UPRAWNIEŃ DO BAZY
--
-- Wyłącznie zmiany w Postgresie. Portal ucznia i panel nauczyciela
-- działają dokładnie tak samo — żadnego deployu GitHub Pages,
-- żadnej zmiany w kodzie, żadnej zmiany kodów dostępu uczniów.
--
-- Uruchom w: Supabase Dashboard → SQL Editor → New query
-- Skrypt jest idempotentny (można uruchamiać wielokrotnie).
--
-- ── CO NAPRAWIA ─────────────────────────────────────────────────
--
--   H1. KLUCZE API BYŁY PUBLICZNE.  `config` z kluczami Anthropic,
--       Gemini i EmailJS miał politykę `anon_read_config USING (true)`.
--       Każdy, kto znał publiczny URL Supabase (a jest w źródle strony),
--       pobierał je jednym zapytaniem i mógł generować na Twój koszt.
--
--   H2. KAŻDE KONTO MIAŁO PEŁNE PRAWA ADMINA.  Polityki `auth_all_*`
--       dawały odczyt i zapis wszystkiego KAŻDEMU zalogowanemu, nie tylko
--       Tobie. Rola sprawdzana była wyłącznie w przeglądarce
--       (admin.html:2715), co nie jest kontrolą dostępu. Jeśli rejestracja
--       w Supabase Auth jest włączona, dowolna osoba mogła założyć konto
--       i skasować wszystkie lekcje.
--
--   H3. ANONIM MÓGŁ KASOWAĆ POSTĘPY.  `anon_write_progress` było
--       `FOR ALL`, więc obejmowało również DELETE.
--
--   H4. ANONIM MÓGŁ NADPISAĆ NOTATKI NAUCZYCIELA.  `lesson_progress`
--       miało tabelowy GRANT UPDATE, więc zapis obejmował także kolumnę
--       `teacher_notes`, której portal ucznia nigdy nie zapisuje.
--
--   H5. NADMIAROWE UPRAWNIENIA KOLUMNOWE.  `anon` mógł czytać kolumny,
--       których front w ogóle nie używa. Skrypt przycina GRANT-y dokładnie
--       do kolumn występujących w zapytaniach (spis w sekcji 4).
--
-- ── CZEGO NIE NAPRAWIA ──────────────────────────────────────────
--   Patrz sekcja „POZOSTAŁE RYZYKO” na końcu pliku.
-- ================================================================

BEGIN;

-- ── 0. WERYFIKACJA WSTĘPNA ───────────────────────────────────────
-- Po tym skrypcie panel wymaga roli `admin` w JWT. Panel już dziś jej
-- wymaga (admin.html:2715 wylogowuje konta bez niej), więc rola musi
-- istnieć — ale jeśli masz wątpliwości, sprawdź PRZED uruchomieniem:
--
--   SELECT email, raw_app_meta_data ->> 'role' AS role FROM auth.users;
--
-- Gdyby brakowało (podmień e-mail):
--
--   UPDATE auth.users
--      SET raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb)
--                              || '{"role":"admin"}'::jsonb
--    WHERE email = 'twoj@email.pl';
--
-- Po zmianie roli wyloguj się i zaloguj ponownie — rola jest zaszyta
-- w tokenie JWT i stary token jej nie zawiera.

-- ── 1. HELPER: CZY BIEŻĄCY UŻYTKOWNIK JEST ADMINEM ───────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Rola z app_metadata w JWT. app_metadata ustawia wyłącznie serwer
   (service_role) i użytkownik nie może go podmienić — w przeciwieństwie
   do user_metadata, którego NIGDY nie wolno tu użyć.';

-- ── 2. CONFIG — WYŁĄCZNIE ADMIN (H1) ─────────────────────────────

DROP POLICY IF EXISTS "anon_read_config" ON config;
DROP POLICY IF EXISTS "auth_all_config"  ON config;
DROP POLICY IF EXISTS "admin_all_config" ON config;

REVOKE ALL ON config FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON config TO authenticated;   -- filtrowane przez RLS niżej

CREATE POLICY "admin_all_config" ON config
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 3. POLITYKI DLA ZALOGOWANYCH — TYLKO ADMIN (H2) ──────────────

DROP POLICY IF EXISTS "auth_all_students"        ON students;
DROP POLICY IF EXISTS "auth_all_lessons"         ON lessons;
DROP POLICY IF EXISTS "auth_all_student_lessons" ON student_lessons;
DROP POLICY IF EXISTS "auth_all_lesson_progress" ON lesson_progress;

DROP POLICY IF EXISTS "admin_all_students"        ON students;
DROP POLICY IF EXISTS "admin_all_lessons"         ON lessons;
DROP POLICY IF EXISTS "admin_all_student_lessons" ON student_lessons;
DROP POLICY IF EXISTS "admin_all_lesson_progress" ON lesson_progress;

CREATE POLICY "admin_all_students" ON students
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_lessons" ON lessons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_student_lessons" ON student_lessons
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_lesson_progress" ON lesson_progress
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 4. ANON — MINIMUM POTRZEBNE FRONTOWI (H3, H4, H5) ────────────
--
-- Poniższe GRANT-y odpowiadają dokładnie zapytaniom, które wykonuje
-- portal ucznia. Gdyby front kiedyś zaczął czytać nową kolumnę,
-- trzeba ją tutaj dopisać — inaczej dostanie „permission denied”.
--
--   index.html:123   students        SELECT id, name, code, prefix,
--                                           last_active, streak_days, xp
--   index.html:187   student_lessons SELECT lesson_id, lesson_order,
--                                           available_from, due_date
--                                    + filtr .eq('student_id')
--                                    + embed lessons(id, title, subtitle,
--                                           level, header_emoji, tabs)
--   index.html:211   lesson_progress SELECT lesson_id, block_progress, srs_data
--   lesson.html:319  lessons         SELECT id, title, subtitle, level,
--                                           header_emoji, tabs
--   progress.js:25   lesson_progress SELECT *            ← wymusza SELECT na całej tabeli
--   progress.js:81   lesson_progress UPSERT student_id, lesson_id,
--                                           block_progress, srs_data, mywords, notes

REVOKE ALL ON students        FROM anon;
REVOKE ALL ON lessons         FROM anon;
REVOKE ALL ON student_lessons FROM anon;
REVOKE ALL ON lesson_progress FROM anon;

GRANT SELECT (id, name, code, prefix, last_active, streak_days, xp)
  ON students TO anon;

GRANT SELECT (id, title, subtitle, level, header_emoji, tabs)
  ON lessons TO anon;

GRANT SELECT (student_id, lesson_id, lesson_order, available_from, due_date)
  ON student_lessons TO anon;

-- SELECT na całej tabeli, bo progress.js woła `.select('*')`, a Postgres
-- rozwija gwiazdkę do wszystkich kolumn i sprawdza prawa do każdej z nich.
-- Skutek uboczny: `teacher_notes` jest dla anona czytelne (patrz R3 niżej).
GRANT SELECT ON lesson_progress TO anon;

-- Zapis TYLKO do kolumn, które front faktycznie wysyła.
-- Kluczowe: brak `teacher_notes` na tej liście — anonim nie nadpisze
-- już notatek nauczyciela. Brak DELETE — nie skasuje postępów.
GRANT INSERT (student_id, lesson_id, block_progress, srs_data, mywords, notes)
  ON lesson_progress TO anon;
GRANT UPDATE (student_id, lesson_id, block_progress, srs_data, mywords, notes)
  ON lesson_progress TO anon;

-- Polityki RLS dla anona: rozbite z `FOR ALL` na konkretne operacje,
-- żeby DELETE nie był objęty żadną polityką.
DROP POLICY IF EXISTS "anon_read_students"        ON students;
DROP POLICY IF EXISTS "anon_read_lessons"         ON lessons;
DROP POLICY IF EXISTS "anon_read_student_lessons" ON student_lessons;
DROP POLICY IF EXISTS "anon_write_progress"       ON lesson_progress;
DROP POLICY IF EXISTS "anon_select_progress"      ON lesson_progress;
DROP POLICY IF EXISTS "anon_insert_progress"      ON lesson_progress;
DROP POLICY IF EXISTS "anon_update_progress"      ON lesson_progress;

CREATE POLICY "anon_read_students"        ON students        FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_lessons"         ON lessons         FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_student_lessons" ON student_lessons FOR SELECT TO anon USING (true);

CREATE POLICY "anon_select_progress" ON lesson_progress FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_progress" ON lesson_progress FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_progress" ON lesson_progress FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ── 5. SERVICE_ROLE — BEZ ZMIAN ──────────────────────────────────
GRANT ALL ON students, lessons, student_lessons, lesson_progress, config TO service_role;

COMMIT;

-- ================================================================
-- WERYFIKACJA PO WYKONANIU
-- ================================================================
--   BASE=https://oyyhmckgpwafqauxkbch.supabase.co/rest/v1
--   KEY=sb_publishable_cGtd_C86KwKh0x1n7bw8WQ_QMFcplQw
--
-- 1) Klucze API już NIE są publiczne — musi zwrócić błąd uprawnień:
--      curl "$BASE/config?select=*" -H "apikey: $KEY"
--
-- 2) Notatki nauczyciela są nie do nadpisania — musi zwrócić błąd:
--      curl -X PATCH "$BASE/lesson_progress?id=eq.<dowolne-id>" \
--           -H "apikey: $KEY" -H "Content-Type: application/json" \
--           -d '{"teacher_notes":"test"}'
--
-- 3) Kasowanie postępów zablokowane — musi zwrócić błąd:
--      curl -X DELETE "$BASE/lesson_progress?id=eq.<dowolne-id>" -H "apikey: $KEY"
--
-- 4) PORTAL UCZNIA — przetestuj ręcznie, to najważniejszy test:
--      • zaloguj się kodem ucznia
--      • otwórz lekcję, rozwiąż jedno ćwiczenie
--      • odśwież stronę i sprawdź, czy odpowiedź się zachowała
--      • dopisz coś w zakładce „Notatki”, odśwież, sprawdź
--    Jeśli zapis nie działa, w konsoli będzie „permission denied for
--    column ...” — dopisz brakującą kolumnę do GRANT-ów w sekcji 4.
--
-- 5) PANEL NAUCZYCIELA — zaloguj się i sprawdź listę lekcji, uczniów,
--    postępy i ustawienia.
--
-- ================================================================
-- WYKONAJ TAKŻE POZA TYM SKRYPTEM
-- ================================================================
-- Klucze Anthropic i Gemini były publicznie dostępne przez cały okres
-- działania portalu. Trzeba założyć, że wyciekły:
--
--   • Anthropic: console.anthropic.com → API Keys → usuń stary, utwórz nowy
--   • Gemini:    aistudio.google.com/apikey → usuń stary, utwórz nowy
--   • Sprawdź billing obu kont pod kątem nieznanego zużycia
--   • Wklej nowe klucze w panelu → Ustawienia (teraz już bezpiecznie)
--
-- ================================================================
-- POZOSTAŁE RYZYKO (świadomie nienaprawione)
-- ================================================================
-- Portal ucznia odpytuje tabele bezpośrednio kluczem publicznym i nie ma
-- żadnej tożsamości po stronie bazy, po której RLS mogłaby filtrować.
-- Dopóki front zostaje bez zmian, otwarte pozostają:
--
--   R1. `students` — jedno zapytanie zwraca kody i imiona wszystkich uczniów.
--       Kody były publicznie czytelne przez cały okres działania portalu
--       i decyzją właściciela zostają bez zmian.
--
--   R2. `lessons`, `student_lessons` — treść lekcji do pobrania bez logowania.
--       Ryzyko biznesowe (własność intelektualna), nie dla danych osobowych.
--
--   R3. `lesson_progress` — odczyt postępów, notatek ucznia i notatek
--       nauczyciela przez osobę, która zna ID ucznia. Zapis ograniczony
--       do kolumn ucznia, kasowanie zablokowane.
--
-- Wszystkie trzy wynikają z tej samej przyczyny: uczeń nie ma konta.
-- Znikają w nowej platformie, gdzie RLS filtruje po `auth.uid()`:
--   ../LearingOwl/docs/ARCHITECTURE.md
--
-- Gdyby stary portal miał żyć jeszcze długo, domknięcie R1–R3 wymaga
-- przepisania jego warstwy danych na funkcje SECURITY DEFINER z tokenem
-- sesji — ok. 200 linii SQL i zmiany w 4 plikach frontu.
