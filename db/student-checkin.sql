-- ================================================================
-- Owl's Academy — ZAPIS PASSY DNI (streak) UCZNIA
--
-- Po security-fix.sql anonim nie ma już UPDATE na `students`, więc
-- bezpośredni zapis z index.html był po cichu odrzucany i passa
-- przestała rosnąć. Ta funkcja przejmuje ten zapis:
--   • działa z uprawnieniami właściciela (SECURITY DEFINER),
--   • zmienia WYŁĄCZNIE last_active i streak_days,
--   • wymaga pary id + kod ucznia, więc nie da się „odbić”
--     aktywności komuś, czyjego kodu się nie zna,
--   • liczy passę po stronie bazy (czas polski), a nie w przeglądarce.
--
-- Uruchom w: Supabase Dashboard → SQL Editor → New query
-- Skrypt jest idempotentny (można uruchamiać wielokrotnie).
-- ================================================================

CREATE OR REPLACE FUNCTION public.student_checkin(p_student_id uuid, p_code text)
RETURNS TABLE (streak_days int, last_active date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
  v_last  date;
  v_streak int;
BEGIN
  SELECT s.last_active, s.streak_days INTO v_last, v_streak
    FROM students s
   WHERE s.id = p_student_id
     AND lower(s.code) = lower(trim(p_code))
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid student' USING ERRCODE = '28000';
  END IF;

  IF v_last IS DISTINCT FROM v_today THEN
    v_streak := CASE WHEN v_last = v_today - 1 THEN coalesce(v_streak, 0) + 1 ELSE 1 END;
    UPDATE students s
       SET last_active = v_today, streak_days = v_streak
     WHERE s.id = p_student_id;
    v_last := v_today;
  END IF;

  RETURN QUERY SELECT v_streak, v_last;
END;
$$;

REVOKE ALL ON FUNCTION public.student_checkin(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.student_checkin(uuid, text) TO anon, authenticated;

-- ── WERYFIKACJA ──────────────────────────────────────────────────
-- Zaloguj się w portalu kodem ucznia — w konsoli przeglądarki nie może
-- być błędu „student_checkin”, a w panelu nauczyciela (Uczniowie)
-- data ostatniej aktywności powinna pokazać dzisiejszy dzień.
