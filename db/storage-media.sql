-- ================================================================
-- Owl's Academy — BUCKET `media` (audio / wideo / PDF z bloków)
--
-- Dotąd polityki tego bucketu istniały tylko w dashboardzie (ustawione
-- ręcznie przy błędzie „new row violates row-level security policy”).
-- Ten skrypt zapisuje docelowy stan w repozytorium:
--   • bucket publiczny — uczeń odtwarza pliki po publicznym URL
--     (getPublicUrl), bez logowania i bez polityki SELECT dla anona,
--   • wysyłanie, podmiana i kasowanie plików — WYŁĄCZNIE admin
--     (public.is_admin() z security-fix.sql, więc tamten skrypt musi
--     być uruchomiony wcześniej).
--
-- Front używa:
--   admin-blocks.js  uploadToStorage  → storage.upload (INSERT)
--   admin.html       usunięcie bloku  → storage.remove (SELECT + DELETE)
--
-- Uruchom w: Supabase Dashboard → SQL Editor → New query
-- Skrypt jest idempotentny (można uruchamiać wielokrotnie).
-- ================================================================

-- ── 0. PODGLĄD PRZED URUCHOMIENIEM (opcjonalnie) ─────────────────
-- Polityki, które dziś dotyczą bucketu `media`:
--
--   SELECT policyname, cmd, roles, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'storage' AND tablename = 'objects'
--      AND (qual ILIKE '%''media''%' OR with_check ILIKE '%''media''%');
--
-- Sekcja 2 usuwa je wszystkie i zastępuje czterema politykami admina.
-- Jeśli któraś z nich była świadomie dodana do innych celów, przenieś
-- ją po uruchomieniu skryptu.

BEGIN;

-- ── 1. BUCKET ────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ── 2. USUNIĘCIE DOTYCHCZASOWYCH POLITYK BUCKETU ─────────────────
-- Ręcznie dodane polityki mogły wpuszczać każdego zalogowanego
-- (a nie tylko admina). Nazwy nie są znane, więc szukamy po treści.

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND (qual ILIKE '%''media''%' OR with_check ILIKE '%''media''%')
  LOOP
    RAISE NOTICE 'Usuwam politykę: %', p.policyname;
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- ── 3. POLITYKI ADMINA ───────────────────────────────────────────

CREATE POLICY "media_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "media_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.is_admin());

COMMIT;

-- ================================================================
-- WERYFIKACJA PO WYKONANIU
-- ================================================================
-- 1) Panel nauczyciela: dodaj blok Audio → „Wgraj plik” → plik się
--    wysyła i odtwarza w podglądzie lekcji.
-- 2) Portal ucznia: ten sam plik odtwarza się bez logowania.
-- 3) Usuń blok i zapisz lekcję → w Storage → media plik znika.
-- 4) Anonim nie może wgrać pliku — musi zwrócić błąd RLS:
--      curl -X POST "https://oyyhmckgpwafqauxkbch.supabase.co/storage/v1/object/media/test.txt" \
--           -H "apikey: <klucz publiczny>" -H "Authorization: Bearer <klucz publiczny>" \
--           -H "Content-Type: text/plain" -d "x"
