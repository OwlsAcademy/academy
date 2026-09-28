-- ================================================================
-- Owl's Academy — ZAPIS POSTĘPU UCZNIA PRZEZ SCALANIE
--
-- Dotąd każdy zapis postępu podmieniał CAŁE block_progress i srs_data
-- lekcji. Starsza kopia (druga karta, drugie urządzenie, podgląd
-- nauczyciela „jako uczeń”) mogła więc skasować nowsze odpowiedzi.
--
-- Ta funkcja scala tylko to, co się zmieniło:
--   • p_blocks / p_srs  — dopisywane do istniejących (jsonb ||),
--                         klucz = id bloku / karty, reszta nietknięta,
--   • p_mywords / p_notes — nadpisywane tylko gdy przekazane (≠ NULL).
-- Operacja jest atomowa (INSERT … ON CONFLICT DO UPDATE).
--
-- SECURITY INVOKER: działa z uprawnieniami wywołującego, więc anon
-- nadal podlega kolumnowym GRANT-om i politykom RLS z security-fix.sql
-- (brak dostępu do teacher_notes, brak DELETE). Nic nie rozszerza.
--
-- Front (js/progress.js) woła ją od wersji SW v36; bez niej wraca do
-- starego zapisu całego wiersza, więc kolejność wdrożenia jest dowolna.
--
-- Uruchom w: Supabase Dashboard → SQL Editor → New query
-- Skrypt jest idempotentny (można uruchamiać wielokrotnie).
-- ================================================================

CREATE OR REPLACE FUNCTION public.save_lesson_progress(
  p_student_id uuid,
  p_lesson_id  uuid,
  p_blocks     jsonb DEFAULT NULL,
  p_srs        jsonb DEFAULT NULL,
  p_mywords    jsonb DEFAULT NULL,
  p_notes      text  DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  INSERT INTO lesson_progress AS lp
         (student_id, lesson_id, block_progress, srs_data, mywords, notes)
  VALUES (p_student_id, p_lesson_id,
          coalesce(p_blocks, '{}'::jsonb), coalesce(p_srs, '{}'::jsonb),
          coalesce(p_mywords, '[]'::jsonb), coalesce(p_notes, ''))
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET
    block_progress = CASE WHEN p_blocks IS NULL THEN lp.block_progress
                          ELSE coalesce(lp.block_progress, '{}'::jsonb) || p_blocks END,
    srs_data       = CASE WHEN p_srs IS NULL THEN lp.srs_data
                          ELSE coalesce(lp.srs_data, '{}'::jsonb) || p_srs END,
    mywords        = coalesce(p_mywords, lp.mywords),
    notes          = coalesce(p_notes, lp.notes);
$$;

REVOKE ALL ON FUNCTION public.save_lesson_progress(uuid, uuid, jsonb, jsonb, jsonb, text) FROM public;
GRANT EXECUTE ON FUNCTION public.save_lesson_progress(uuid, uuid, jsonb, jsonb, jsonb, text)
  TO anon, authenticated;

-- ── WERYFIKACJA ──────────────────────────────────────────────────
-- 1) Otwórz tę samą lekcję ucznia w dwóch kartach. W karcie A rozwiąż
--    ćwiczenie 1, w karcie B ćwiczenie 2 (bez odświeżania). Po
--    odświeżeniu obie odpowiedzi muszą być zachowane.
-- 2) Wpisz odpowiedź i od razu kliknij „← Wróć” — po ponownym wejściu
--    w lekcję odpowiedź ma być na miejscu.
