# Owl's Academy

Platforma do nauki języków (głównie angielski) jednego nauczyciela: lekcje złożone z zakładek i bloków, portal ucznia logującego się kodem, panel nauczyciela z generatorem lekcji AI.

- Produkcja: https://portal.owlsacademy.edu.pl (GitHub Pages z gałęzi `master`, repo `OwlsAcademy/academy`)
- Backend: Supabase `oyyhmckgpwafqauxkbch` (Postgres + Auth + Storage, bucket `media`)

## Stack i uruchamianie

Czysty HTML + vanilla JS, **bez bundlera, bez importów, bez testów automatycznych**. Moduły to IIFE przypięte do `window.OWL` (`OWL.Blocks`, `OWL.AdminBlocks`, `OWL.Progress`, `OWL.SRS`, `OWL.Offline`, `OWL.TTS`). Kolejność tagów `<script>` ma znaczenie.

Lokalnie: dowolny serwer statyczny w katalogu repo (np. `npx serve .`). Front zawsze łączy się z produkcyjnym Supabase (`js/supabase-client.js`). `node_modules` służy tylko do `db/convert-v1-to-v2.js`.

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | Portal ucznia: logowanie kodem → lista przypisanych lekcji, passa dni, statystyki |
| `lesson.html` | Odtwarzacz lekcji (`?id=`), zakładki „Moje słówka” i „Notatki”; `previewAs=<studentId>` = podgląd nauczyciela |
| `admin.html` | Panel nauczyciela (~130 KB, jeden plik): kreator lekcji, uczniowie i przypisania, postępy (odpowiedzi, „Sprawdź z AI”), ustawienia, generator AI |
| `js/blocks.js` | Renderery wszystkich bloków + `normalize()` + główny `switch` w `render()` |
| `js/admin-blocks.js` | Edytory bloków: `BLOCK_LABELS`, `BLOCK_DEFAULTS`, `EDITORS`, `BLOCK_CATEGORIES` (picker), import/eksport CSV i JSON bloku, upload do Storage |
| `js/progress.js` | Zapis postępu ucznia: debounce 1,8 s, wysyła **tylko zmienione** bloki/karty przez RPC `save_lesson_progress` (serwer scala `jsonb ||`); przy `pagehide`/ukryciu karty wysyła od razu `fetch` z `keepalive` |
| `js/offline.js`, `sw.js` | PWA: cache localStorage + kolejka zapisów offline; service worker |
| `js/srs.js` | SM-2 dla fiszek |
| `db/*.sql` | Skrypty uruchamiane ręcznie w Supabase SQL Editor (patrz niżej) |

## Model danych

- `lessons.tabs` (JSONB) = `[{ id, name, icon, blocks: [{ id, type, data }] }]`. Dowolny blok w dowolnej zakładce.
- `lesson_progress`: jeden wiersz na (uczeń, lekcja). `block_progress` jest kluczowany `block.id`, więc **nie zmieniaj id istniejących bloków**, bo uczeń straci odpowiedzi. `srs_data` klucz `blockId:cardIndex`, do tego `mywords`, `notes`, `teacher_notes`.
- `students` (kod dostępu = jedyna „tożsamość” ucznia), `student_lessons` (przypisania), `config` (id=1: klucze API, `ai_prompt`, EmailJS).
- Pola bloków: `en` = język nauczany, `pl` = język instrukcji (nazwy historyczne, niezależne od faktycznych języków lekcji: `target_lang` / `instruction_lang`).

## Bloki

Około 55 typów. `OWL.Blocks.normalize()` mapuje typy v1 (`vocab-sentcomp`, `vocab-scramble`, `vocab-discussion`) i starsze kształty danych z AI na format rendererów. Wywołują ją `render()`, lista bloków w kreatorze i widok postępów w panelu. Dane w bazie mogą więc być „stare”, a panel zapisuje je już znormalizowane.

**Dodanie nowego typu bloku wymaga zmian we wszystkich miejscach:**
1. `js/blocks.js`: funkcja `renderXxx` + `case` w `render()`; zapis odpowiedzi przez `OWL.Progress.setBlock(block.id, { answers })`.
2. `js/admin-blocks.js`: `BLOCK_LABELS`, `BLOCK_DEFAULTS`, `EDITORS`, `BLOCK_CATEGORIES`.
3. `admin.html`: obie mapy `BTYPE` (etykiety) oraz obsługa w `buildAnswerCheckPrompt()` i `renderStudentAnswers()`, jeśli blok zbiera odpowiedzi.
4. `admin.html` → `getDefaultPromptTemplate()`: schemat JSON bloku, **dokładnie w formacie czytanym przez renderer**.
5. Podbicie `CACHE` w `sw.js`.

### Blok `html`

HTML nauczycielki (często z zewnętrznego AI) renderuje się w `<iframe srcdoc>` z `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-modals"`, **bez `allow-same-origin`**. Nie dodawaj `allow-same-origin`: te bloki renderuje też panel admina, a skrypt z ramki dostałby wtedy sesję admina. Do ramki wstrzykiwany jest `htmlBlockBridge()` (`js/blocks.js`). Ten sam mechanizm działa dla fragmentów HTML i pełnych dokumentów. Most:
- raportuje wysokość (`ResizeObserver`), więc ramka nie ma własnego scrolla;
- zapisuje wszystkie `input`/`textarea`/`select` do `block_progress[id] = { values, items, score?, total? }`. `values` służą do przywracania, `items` (`{s: sekcja, q: zdanie z ___, a: odpowiedź, e?: data-answer, ok?}`) do widoku postępów i „Sprawdź z AI”;
- klucz pola: `id`, potem `name` + indeks opcji dla radio/checkbox, a w ostateczności pozycja pola (kruche, jeśli nauczycielka zmieni HTML);
- pomija pola w `[data-owl-ignore]`. Ukryte przez CSS radio/checkboxy (zakładki, obracanie fiszek) są przywracane, ale nie trafiają do `items`;
- `data-answer` na polu = poprawna odpowiedź → wynik `score/total`.

Edytory zwracają dane przez `onChange(Object.assign(data, …))`. Unikaj domknięć na nieaktualnym `data` (było źródłem kilku błędów).

## Bezpieczeństwo (obowiązujące zasady)

- **DOM:** żadnego `innerHTML` / `document.write` z dynamiczną treścią. Używaj `el()` / `textContent` / `appendChild`. HTML autorstwa nauczyciela przechodzi przez `san()` w `blocks.js`. URL-e do `src`/`href` waliduj (tylko `http(s)`).
- **Baza (po `db/security-fix.sql`, uruchomionym na produkcji):**
  - panel działa tylko dla `app_metadata.role = 'admin'`, egzekwowane przez RLS (`public.is_admin()`), nie tylko w JS;
  - `anon` ma **kolumnowe** GRANT-y dopasowane do zapytań portalu ucznia. Jeśli portal ucznia zacznie czytać lub zapisywać nową kolumnę, dopisz ją do GRANT-ów, inaczej dostanie `permission denied`;
  - `anon` nie może aktualizować `students`. Passę dni zapisuje funkcja `student_checkin()` (`db/student-checkin.sql`);
  - `anon` nie może kasować postępów ani pisać do `teacher_notes`.
- Świadome ryzyka (R1–R3 w `db/security-fix.sql`): tabela `students` z kodami jest publicznie czytelna, postępy są czytelne po ID ucznia, klucze AI trafiają do przeglądarki admina.

## Zmiany w bazie

Nie ma systemu migracji. Każda zmiana to **idempotentny** skrypt w `db/` (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`) z nagłówkiem po polsku: co robi, jak uruchomić, jak zweryfikować. Właściciel uruchamia go ręcznie w Supabase Dashboard → SQL Editor. `db/migration.sql` to schemat bazowy, a kolejne skrypty należy uruchamiać po nim w tej kolejności: `security-fix.sql`, `storage-media.sql`, `student-checkin.sql`, `save-progress.sql`.

Nigdy nie zapisuj z frontu całego `block_progress`/`srs_data` naraz, bo starsza kopia z innej karty lub urządzenia nadpisze nowsze odpowiedzi. Zmiany postępu idą przez `OWL.Progress.set*()`, a te trafiają do RPC scalającego.

## AI

- Wywołania bezpośrednio z przeglądarki admina: Gemini `gemini-2.5-flash` (maxOutputTokens 65536) i Claude `claude-sonnet-4-6` (max_tokens 16000). Klucze pochodzą z `config`.
- Prompt generatora = `config.ai_prompt`, a gdy jest puste, `getDefaultPromptTemplate()`. Placeholdery to `{{TARGET_LANG_NAME}}`, `{{LEVEL}}`, `{{Q_*}}` (ilości), `{{TAB_*}}` (nazwy zakładek). **Zmiana domyślnego promptu nie działa, jeśli w bazie jest zapisany własny.** Trzeba go zresetować w Ustawieniach.
- Tryb „refine” utrzymuje rozmowę, żeby można było doprecyzować lekcję. „Sprawdź z AI” w postępach ocenia odpowiedzi jako nauczyciel języka nauczanego, a komentarze pisze w języku lekcji.

## Konwencje

- Teksty UI panelu po polsku. W portalu ucznia elementy ćwiczeń bywają po angielsku (np. przyciski fiszek).
- Komentarze w kodzie po angielsku, skrypty SQL po polsku.
- Commity w stylu conventional commits po angielsku (`feat:`, `fix:`, `refactor:`, `chore:`). **Push od razu po commicie**, bo push = deploy.
- Po każdej zmianie CSS/JS podbij `CACHE` w `sw.js`, inaczej uczniowie dostaną stare pliki z cache.

## Testowanie

Brak testów automatycznych. Weryfikacja odbywa się ręcznie w przeglądarce na produkcji: panel admina i podgląd jako uczeń. Lekcja QA z każdym blokiem i wypełnionym każdym polem: `../testyQA.json` (import w panelu).
