// Owl's Academy v2 — Admin Block Editor
// Vanilla JS, no bundler, no imports.

window.OWL = window.OWL || {};

(function () {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'class') e.className = v;
        else if (k === 'style') Object.assign(e.style, v);
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return e;
  }

  function pickImage(cb) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const file = inp.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => cb(e.target.result);
      reader.readAsDataURL(file);
    });
    inp.click();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Build a label+control row
  function field(label, control) {
    const wrap = el('div', { class: 'ab-field' });
    wrap.appendChild(el('label', { class: 'ab-label' }, label));
    wrap.appendChild(control);
    return wrap;
  }

  function textInput(val, placeholder, onChange) {
    const inp = el('input', {
      class: 'ab-input',
      type: 'text',
      value: val || '',
      placeholder: placeholder || ''
    });
    inp.addEventListener('input', () => onChange(inp.value));
    return inp;
  }

  function numberInput(val, placeholder, onChange) {
    const inp = el('input', {
      class: 'ab-input',
      type: 'number',
      value: val != null ? val : '',
      placeholder: placeholder || ''
    });
    inp.addEventListener('input', () => onChange(Number(inp.value)));
    return inp;
  }

  function textArea(val, placeholder, onChange) {
    const ta = el('textarea', {
      class: 'ab-textarea',
      placeholder: placeholder || '',
      rows: '3'
    });
    ta.value = val || '';
    ta.addEventListener('input', () => onChange(ta.value));
    return ta;
  }

  function selectInput(val, options, onChange) {
    // options: [{value, label}] or ['val', ...]
    const sel = el('select', { class: 'ab-select' });
    options.forEach(opt => {
      const v = typeof opt === 'string' ? opt : opt.value;
      const l = typeof opt === 'string' ? opt : opt.label;
      const o = el('option', { value: v }, l);
      if (v === val) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  function btn(label, cls, onClick) {
    const b = el('button', { class: 'ab-btn ' + (cls || ''), type: 'button' }, label);
    b.addEventListener('click', onClick);
    return b;
  }

  function imgPreview(src) {
    if (!src) return null;
    const img = el('img', {
      class: 'ab-img-preview',
      src: src,
      style: { maxWidth: '100%', maxHeight: '120px', marginTop: '4px', display: 'block', borderRadius: '4px' }
    });
    return img;
  }

  // Dynamic list helper: renders a list of items with add/remove
  // renderItem(item, index, update, remove) → HTMLElement
  function dynamicList(items, renderItem, onListChange, addLabel) {
    let current = items ? [...items] : [];
    const wrap = el('div', { class: 'ab-dynlist' });

    function redraw() {
      wrap.replaceChildren();
      current.forEach((item, i) => {
        const row = el('div', { class: 'ab-dynlist-row' });
        const itemEl = renderItem(
          item,
          i,
          (updated) => { current[i] = updated; onListChange([...current]); },
          () => { current.splice(i, 1); onListChange([...current]); redraw(); }
        );
        row.appendChild(itemEl);
        wrap.appendChild(row);
      });
      const addBtn = btn('+ ' + (addLabel || 'Dodaj'), 'ab-btn-add', () => {
        current.push(typeof current[0] === 'string' ? '' : {});
        onListChange([...current]);
        redraw();
      });
      wrap.appendChild(addBtn);
    }

    redraw();
    return wrap;
  }

  // Simple string list (each item is a string)
  function stringList(items, placeholder, onListChange, addLabel) {
    let current = items ? [...items] : [''];
    const wrap = el('div', { class: 'ab-dynlist' });

    function redraw() {
      wrap.replaceChildren();
      current.forEach((item, i) => {
        const row = el('div', { class: 'ab-dynlist-row ab-dynlist-row--inline' });
        const inp = textInput(item, placeholder || '', (v) => {
          current[i] = v;
          onListChange([...current]);
        });
        const removeBtn = btn('✕', 'ab-btn-remove', () => {
          current.splice(i, 1);
          if (current.length === 0) current = [''];
          onListChange([...current]);
          redraw();
        });
        row.appendChild(inp);
        row.appendChild(removeBtn);
        wrap.appendChild(row);
      });
      const addBtn = btn('+ ' + (addLabel || 'Dodaj'), 'ab-btn-add', () => {
        current.push('');
        onListChange([...current]);
        redraw();
      });
      wrap.appendChild(addBtn);
    }

    redraw();
    return wrap;
  }

  // Image picker button + preview
  function imageField(val, onImageChange) {
    const wrap = el('div', { class: 'ab-image-field' });
    let preview = imgPreview(val);
    if (preview) wrap.appendChild(preview);

    const pickBtn = btn('🖼️ ' + (val ? 'Zmień obraz' : 'Dodaj obraz'), 'ab-btn-img', () => {
      pickImage((base64) => {
        onImageChange(base64);
        // update preview
        if (preview) wrap.removeChild(preview);
        preview = imgPreview(base64);
        if (preview) wrap.insertBefore(preview, pickBtn);
        pickBtn.textContent = '🖼️ Zmień obraz';
      });
    });
    wrap.appendChild(pickBtn);

    if (val) {
      const clearBtn = btn('✕ Usuń obraz', 'ab-btn-remove', () => {
        onImageChange('');
        if (preview) { wrap.removeChild(preview); preview = null; }
        pickBtn.textContent = '🖼️ Dodaj obraz';
        wrap.removeChild(clearBtn);
      });
      wrap.appendChild(clearBtn);
    }

    return wrap;
  }

  // Block editor header with title and delete button
  function blockHeader(typeName, onDelete) {
    const header = el('div', { class: 'ab-block-header' });
    header.appendChild(el('span', { class: 'ab-block-type' }, typeName));
    header.appendChild(btn('✕ Usuń blok', 'ab-btn-delete', onDelete));
    return header;
  }

  // Drag handle
  function dragHandle() {
    return el('div', { class: 'ab-drag-handle', title: 'Przeciągnij, aby zmienić kolejność' }, '⠿');
  }

  // Color options
  const COLOR_OPTIONS = [
    { value: 'green', label: 'Zielony' },
    { value: 'yellow', label: 'Żółty' },
    { value: 'red', label: 'Czerwony' },
    { value: 'purple', label: 'Fioletowy' },
    { value: 'orange', label: 'Pomarańczowy' }
  ];

  // ─── Block type labels ───────────────────────────────────────────────────────

  const BLOCK_LABELS = {
    quote: 'Cytat',
    discussion: 'Dyskusja',
    article: 'Artykuł',
    glossary: 'Słowniczek',
    image: 'Obraz',
    html: 'HTML',
    info: 'Info/Alert',
    table: 'Tabela',
    examples: 'Przykłady',
    'two-col': 'Dwie kolumny',
    cta: 'CTA',
    comprehension: 'Rozumienie tekstu',
    'vocab-grid': 'Siatka słówek',
    'vocab-table': 'Tabela słówek',
    phrases: 'Zwroty',
    quiz: 'Quiz',
    gapfill: 'Uzupełnianie luk',
    matching: 'Dopasowywanie',
    translation: 'Tłumaczenie',
    scramble: 'Rozsypanka',
    transform: 'Transformacja zdań',
    errorcorrect: 'Korekta błędów',
    ownsentences: 'Własne zdania',
    collocations: 'Kolokacje',
    wordform: 'Formy wyrazu',
    tf: 'Prawda/Fałsz',
    jumble: 'Rozsypanka wyrazów',
    vic: 'Słowo w kontekście',
    openq: 'Pytania otwarte',
    sentcomp: 'Dokończ zdanie',
    'vocab-mcq': 'Vocab MCQ',
    flashcards: 'Fiszki',
    conversation: 'Rozmowa',
    warmup: 'Rozgrzewka',
    hotseats: 'Hot Seats',
    opinions: 'Opinie',
    wyr: 'Would You Rather',
    ranking: 'Ranking',
    debate: 'Debata',
    monologue: 'Monolog',
    pairs: 'Praca w parach',
    idiomtasks: 'Zadania z idiomami',
    idiomstory: 'Historia z idiomami',
    checklist: 'Lista kontrolna',
    'hw-write': 'Zadanie pisemne'
  };

  // ─── Block default data ──────────────────────────────────────────────────────

  const BLOCK_DEFAULTS = {
    quote: { text: '', author: '' },
    discussion: { title: '', label: '', description: '', questions: [''] },
    article: { articleTitle: '', articleNote: '', image: '', text: '', footnote: '' },
    glossary: { items: [{ word: '', phonetic: '', translation: '', hint: '', example: '' }] },
    image: { image: '', caption: '' },
    html: { html: '' },
    info: { title: '', text: '', tip: '', color: 'green' },
    table: { title: '', headers: ['', ''], rows: [['', '']] },
    examples: { title: '', items: [{ pl: '', en: '' }] },
    'two-col': { title: '', columns: [{ header: '', items: [''] }, { header: '', items: [''] }] },
    cta: { label: '', text: '', buttonText: '', targetTabId: '' },
    comprehension: { title: '', instruction: '', questions: [{ question: '', answer: '' }] },
    'vocab-grid': { title: '', color: 'green', items: [{ emoji: '', pl: '', en: '', image: '' }] },
    'vocab-table': { title: '', color: 'green', items: [{ pl: '', en: '', image: '' }] },
    phrases: { title: '', items: [{ pl: '', en: '' }] },
    quiz: { title: '', instruction: '', questions: [{ q: '', options: ['', '', '', ''], answer: '', image: '', explanation: '' }] },
    gapfill: { title: '', instruction: '', wordbank: [''], items: [{ sentence: '', answer: '' }] },
    matching: { title: '', instruction: '', pairs: [{ word: '', def: '' }] },
    translation: { title: '', instruction: '', items: [{ pl: '', hint: '', en: '' }] },
    scramble: { title: '', instruction: '', items: [{ sentence: '', context: '' }] },
    transform: { title: '', instruction: '', items: [{ original: '', instruction: '', answer: '', hint: '' }] },
    errorcorrect: { title: '', instruction: '', items: [{ sentence: '', answer: '', explanation: '' }] },
    ownsentences: { title: '', instruction: '', structures: [''] },
    collocations: { title: '', instruction: '', blocks: [{ keyword: '', instruction: '', options: [{ word: '', correct: false }], note: '' }] },
    wordform: { title: '', instruction: '', columns: ['Noun', 'Verb', 'Adjective', 'Adverb'], rows: [{ root: '', noun: { given: null, answer: '' }, verb: { given: null, answer: '' }, adj: { given: null, answer: '' }, adv: { given: null, answer: '' } }] },
    tf: { title: '', instruction: '', items: [{ statement: '', answer: 'T', explanation: '' }] },
    jumble: { title: '', instruction: '', items: [{ sentence: '' }] },
    vic: { title: '', instruction: '', items: [{ word: '', sentence: '', options: ['', '', '', ''], answer: '', explanation: '' }] },
    openq: { title: '', instruction: '', questions: [{ question: '', hint: '' }] },
    sentcomp: { title: '', instruction: '', starters: [''] },
    'vocab-mcq': { title: '', instruction: '', questions: [{ sentence: '', options: ['', '', '', ''], answer: '', explanation: '' }] },
    flashcards: { title: '', instruction: '', items: [{ word: '', definition: '', example: '', emoji: '' }] },
    conversation: { title: '', prompts: [{ q: '', qEn: '', answer: '', image: '' }] },
    warmup: { title: '', sentences: [''] },
    hotseats: { title: '', timer: 60, questions: [''] },
    opinions: { title: '', cards: [{ statement: '', hint: '' }] },
    wyr: { title: '', questions: [{ a: '', b: '', hint: '' }] },
    ranking: { title: '', instruction: '', items: [''] },
    debate: { title: '', motions: [''], timer: 120 },
    monologue: { title: '', timer: 120, prompts: [''] },
    pairs: { title: '', activities: [{ roleA: '', roleB: '', situation: '' }] },
    idiomtasks: { title: '', idioms: [''], tasks: [{ task: '' }] },
    idiomstory: { title: '', starters: [''], idioms: [''] },
    checklist: { title: '', items: [''] },
    'hw-write': { title: '', prompt: '' }
  };

  // ─── Individual block editors ────────────────────────────────────────────────

  const EDITORS = {

    quote(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Cytat', textArea(data.text, 'Treść cytatu...', v => onChange({ ...data, text: v }))));
      wrap.appendChild(field('Autor', textInput(data.author, 'Autor cytatu', v => onChange({ ...data, author: v }))));
      return wrap;
    },

    discussion(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł sekcji', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Etykieta (badge)', textInput(data.label, 'np. Dyskusja', v => onChange({ ...data, label: v }))));
      wrap.appendChild(field('Opis/instrukcja', textArea(data.description, 'Opis dla uczniów...', v => onChange({ ...data, description: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania do dyskusji'));
      wrap.appendChild(stringList(data.questions, 'Pytanie...', v => onChange({ ...data, questions: v }), 'Dodaj pytanie'));
      return wrap;
    },

    article(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł artykułu', textInput(data.articleTitle, 'Tytuł', v => onChange({ ...data, articleTitle: v }))));
      wrap.appendChild(field('Notatka pod tytułem', textInput(data.articleNote, 'np. B2 • 3 min read', v => onChange({ ...data, articleNote: v }))));
      wrap.appendChild(field('Tekst (HTML)', textArea(data.text, "Tekst artykułu... <span class='hl'>słowo</span> dla podświetlenia", v => onChange({ ...data, text: v }))));
      wrap.appendChild(field('Przypis', textInput(data.footnote, 'Źródło lub przypis', v => onChange({ ...data, footnote: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Obraz (opcjonalny)'));
      wrap.appendChild(imageField(data.image, v => onChange({ ...data, image: v })));
      return wrap;
    },

    glossary(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pozycje słowniczka'));
      const list = dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-glossary-item' });
          box.appendChild(field('Słowo', textInput(item.word, 'Słowo', v => update({ ...item, word: v }))));
          box.appendChild(field('Fonetyka', textInput(item.phonetic, '/fəˈnɛtɪk/', v => update({ ...item, phonetic: v }))));
          box.appendChild(field('Tłumaczenie', textInput(item.translation, 'Tłumaczenie', v => update({ ...item, translation: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Wskazówka/kategoria', v => update({ ...item, hint: v }))));
          box.appendChild(field('Przykład', textInput(item.example, 'Przykładowe zdanie', v => update({ ...item, example: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj słowo'
      );
      // Fix default item for add
      list.querySelector('.ab-btn-add').addEventListener('click', () => {}, false);
      wrap.appendChild(list);
      return wrap;
    },

    image(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Obraz'));
      wrap.appendChild(imageField(data.image, v => onChange({ ...data, image: v })));
      wrap.appendChild(field('Podpis', textInput(data.caption, 'Podpis obrazu', v => onChange({ ...data, caption: v }))));
      return wrap;
    },

    html(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Kod HTML', textArea(data.html, '<p>Kod HTML...</p>', v => onChange({ ...data, html: v }))));
      return wrap;
    },

    info(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł alertu', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Treść', textArea(data.text, 'Treść informacji...', v => onChange({ ...data, text: v }))));
      wrap.appendChild(field('Wskazówka (tip)', textInput(data.tip, 'Opcjonalna wskazówka', v => onChange({ ...data, tip: v }))));
      wrap.appendChild(field('Kolor', selectInput(data.color, COLOR_OPTIONS, v => onChange({ ...data, color: v }))));
      return wrap;
    },

    table(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł tabeli', v => onChange({ ...data, title: v }))));

      // Headers
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Nagłówki kolumn'));
      wrap.appendChild(stringList(
        data.headers,
        'Nagłówek...',
        v => {
          // Adjust rows when headers change
          const newHeaders = v;
          const rows = data.rows.map(row => {
            const r = [...row];
            while (r.length < newHeaders.length) r.push('');
            return r.slice(0, newHeaders.length);
          });
          onChange({ ...data, headers: newHeaders, rows });
        },
        'Dodaj nagłówek'
      ));

      // Rows
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Wiersze'));
      let currentData = data;
      const rowsWrap = el('div', { class: 'ab-table-rows' });

      function redrawRows() {
        rowsWrap.replaceChildren();
        (currentData.rows || []).forEach((row, ri) => {
          const rowDiv = el('div', { class: 'ab-table-row' });
          (currentData.headers || []).forEach((h, ci) => {
            const inp = textInput(row[ci] || '', h || ('Kol. ' + (ci + 1)), v => {
              const newRows = currentData.rows.map((r, idx) => {
                if (idx !== ri) return r;
                const nr = [...r];
                nr[ci] = v;
                return nr;
              });
              currentData = { ...currentData, rows: newRows };
              onChange(currentData);
            });
            rowDiv.appendChild(inp);
          });
          rowDiv.appendChild(btn('✕', 'ab-btn-remove', () => {
            currentData = { ...currentData, rows: currentData.rows.filter((_, idx) => idx !== ri) };
            onChange(currentData);
            redrawRows();
          }));
          rowsWrap.appendChild(rowDiv);
        });
        rowsWrap.appendChild(btn('+ Dodaj wiersz', 'ab-btn-add', () => {
          const newRow = new Array((currentData.headers || []).length).fill('');
          currentData = { ...currentData, rows: [...(currentData.rows || []), newRow] };
          onChange(currentData);
          redrawRows();
        }));
      }

      redrawRows();
      wrap.appendChild(rowsWrap);
      return wrap;
    },

    examples(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł sekcji', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Przykłady'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const row = el('div', { class: 'ab-pair-row' });
          row.appendChild(textInput(item.pl, 'Polski', v => update({ ...item, pl: v })));
          row.appendChild(textInput(item.en, 'Angielski', v => update({ ...item, en: v })));
          row.appendChild(btn('✕', 'ab-btn-remove', remove));
          return row;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj przykład'
      ));
      return wrap;
    },

    'two-col'(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł sekcji', v => onChange({ ...data, title: v }))));
      const cols = data.columns || [{ header: '', items: [''] }, { header: '', items: [''] }];

      [0, 1].forEach(ci => {
        const col = cols[ci] || { header: '', items: [''] };
        wrap.appendChild(el('div', { class: 'ab-section-label' }, `Kolumna ${ci + 1}`));
        wrap.appendChild(field('Nagłówek kolumny', textInput(col.header, 'Nagłówek', v => {
          const newCols = cols.map((c, idx) => idx === ci ? { ...c, header: v } : c);
          onChange({ ...data, columns: newCols });
        })));
        wrap.appendChild(stringList(
          col.items,
          'Element listy',
          v => {
            const newCols = cols.map((c, idx) => idx === ci ? { ...c, items: v } : c);
            onChange({ ...data, columns: newCols });
          },
          'Dodaj element'
        ));
      });
      return wrap;
    },

    cta(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Etykieta', textInput(data.label, 'np. Następny krok', v => onChange({ ...data, label: v }))));
      wrap.appendChild(field('Tekst główny', textInput(data.text, 'Treść CTA', v => onChange({ ...data, text: v }))));
      wrap.appendChild(field('Tekst przycisku', textInput(data.buttonText, 'np. Przejdź dalej', v => onChange({ ...data, buttonText: v }))));
      wrap.appendChild(field('ID docelowej zakładki', textInput(data.targetTabId, 'tabId', v => onChange({ ...data, targetTabId: v }))));
      return wrap;
    },

    comprehension(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(dynamicList(
        data.questions,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-comp-item' });
          box.appendChild(field('Pytanie', textInput(item.question, 'Pytanie...', v => update({ ...item, question: v }))));
          box.appendChild(field('Odpowiedź/wskazówka', textArea(item.answer, 'Odpowiedź...', v => update({ ...item, answer: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, questions: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    'vocab-grid'(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Kolor', selectInput(data.color, COLOR_OPTIONS, v => onChange({ ...data, color: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Słówka'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-vocab-item' });
          box.appendChild(field('Emoji', textInput(item.emoji, '📚', v => update({ ...item, emoji: v }))));
          box.appendChild(field('Polski', textInput(item.pl, 'Słowo PL', v => update({ ...item, pl: v }))));
          box.appendChild(field('Angielski', textInput(item.en, 'Słowo EN', v => update({ ...item, en: v }))));
          box.appendChild(imageField(item.image, v => update({ ...item, image: v })));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj słówko'
      ));
      return wrap;
    },

    'vocab-table'(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Kolor', selectInput(data.color, COLOR_OPTIONS, v => onChange({ ...data, color: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Słówka'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-vocab-item' });
          box.appendChild(field('Polski', textInput(item.pl, 'Słowo PL', v => update({ ...item, pl: v }))));
          box.appendChild(field('Angielski', textInput(item.en, 'Słowo EN', v => update({ ...item, en: v }))));
          box.appendChild(imageField(item.image, v => update({ ...item, image: v })));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj słówko'
      ));
      return wrap;
    },

    phrases(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł sekcji', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zwroty'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const row = el('div', { class: 'ab-pair-row' });
          row.appendChild(textInput(item.pl, 'Polski', v => update({ ...item, pl: v })));
          row.appendChild(textInput(item.en, 'Angielski', v => update({ ...item, en: v })));
          row.appendChild(btn('✕', 'ab-btn-remove', remove));
          return row;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zwrot'
      ));
      return wrap;
    },

    quiz(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł quizu', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(dynamicList(
        data.questions,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-quiz-item' });
          box.appendChild(field('Pytanie', textArea(item.q, 'Treść pytania...', v => update({ ...item, q: v }))));
          item.options.forEach((opt, oi) => {
            box.appendChild(field(`Opcja ${oi + 1}`, textInput(opt, `Opcja ${oi + 1}`, v => {
              const newOpts = [...item.options];
              newOpts[oi] = v;
              update({ ...item, options: newOpts });
            })));
          });
          box.appendChild(field('Poprawna odpowiedź', textInput(item.answer, 'Dokładna treść opcji lub jej numer', v => update({ ...item, answer: v }))));
          box.appendChild(field('Wyjaśnienie', textInput(item.explanation, 'Opcjonalne wyjaśnienie', v => update({ ...item, explanation: v }))));
          box.appendChild(imageField(item.image, v => update({ ...item, image: v })));
          box.appendChild(btn('✕ Usuń pytanie', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, questions: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    gapfill(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Bank słów'));
      wrap.appendChild(stringList(data.wordbank, 'Słowo...', v => onChange({ ...data, wordbank: v }), 'Dodaj słowo'));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania z lukami'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-gapfill-item' });
          box.appendChild(field('Zdanie (z ___ w miejscu luki)', textInput(item.sentence, 'She ___ to school every day.', v => update({ ...item, sentence: v }))));
          box.appendChild(field('Odpowiedź', textInput(item.answer, 'Poprawna odpowiedź', v => update({ ...item, answer: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    matching(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pary'));
      wrap.appendChild(dynamicList(
        data.pairs,
        (item, i, update, remove) => {
          const row = el('div', { class: 'ab-pair-row' });
          row.appendChild(textInput(item.word, 'Słowo/wyrażenie', v => update({ ...item, word: v })));
          row.appendChild(textInput(item.def, 'Definicja/tłumaczenie', v => update({ ...item, def: v })));
          row.appendChild(btn('✕', 'ab-btn-remove', remove));
          return row;
        },
        v => onChange({ ...data, pairs: v }),
        'Dodaj parę'
      ));
      return wrap;
    },

    translation(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania do tłumaczenia'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-trans-item' });
          box.appendChild(field('Zdanie PL', textInput(item.pl, 'Zdanie po polsku', v => update({ ...item, pl: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Opcjonalna wskazówka', v => update({ ...item, hint: v }))));
          box.appendChild(field('Odpowiedź EN', textInput(item.en, 'Poprawne tłumaczenie', v => update({ ...item, en: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    scramble(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania (zostaną rozsypane)'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-scramble-item' });
          box.appendChild(field('Poprawne zdanie', textInput(item.sentence, 'She goes to school every day.', v => update({ ...item, sentence: v }))));
          box.appendChild(field('Kontekst/wskazówka', textInput(item.context, 'Opcjonalny kontekst', v => update({ ...item, context: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    transform(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania do transformacji'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-transform-item' });
          box.appendChild(field('Zdanie wyjściowe', textInput(item.original, 'Zdanie oryginalne', v => update({ ...item, original: v }))));
          box.appendChild(field('Instrukcja transformacji', textInput(item.instruction, 'np. Zmień na czas przeszły', v => update({ ...item, instruction: v }))));
          box.appendChild(field('Odpowiedź', textInput(item.answer, 'Poprawna wersja', v => update({ ...item, answer: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Opcjonalna wskazówka', v => update({ ...item, hint: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    errorcorrect(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania z błędami'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-error-item' });
          box.appendChild(field('Błędne zdanie', textInput(item.sentence, 'Zdanie z błędem', v => update({ ...item, sentence: v }))));
          box.appendChild(field('Poprawna wersja', textInput(item.answer, 'Poprawna wersja', v => update({ ...item, answer: v }))));
          box.appendChild(field('Wyjaśnienie', textInput(item.explanation, 'Wyjaśnienie błędu', v => update({ ...item, explanation: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    ownsentences(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Struktury'));
      wrap.appendChild(stringList(data.structures, 'Struktura/szablon...', v => onChange({ ...data, structures: v }), 'Dodaj strukturę'));
      return wrap;
    },

    collocations(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Grupy kolokacji'));
      wrap.appendChild(dynamicList(
        data.blocks,
        (block, bi, updateBlock, removeBlock) => {
          const box = el('div', { class: 'ab-colloc-block' });
          box.appendChild(field('Słowo kluczowe', textInput(block.keyword, 'np. make', v => updateBlock({ ...block, keyword: v }))));
          box.appendChild(field('Instrukcja', textInput(block.instruction, 'np. Wybierz poprawne kolokacje', v => updateBlock({ ...block, instruction: v }))));
          box.appendChild(el('div', { class: 'ab-section-label' }, 'Opcje'));
          const optList = dynamicList(
            block.options,
            (opt, oi, updateOpt, removeOpt) => {
              const row = el('div', { class: 'ab-colloc-opt-row' });
              row.appendChild(textInput(opt.word, 'Słowo', v => updateOpt({ ...opt, word: v })));
              const chk = el('input', { type: 'checkbox', class: 'ab-checkbox', title: 'Poprawna kolokacja' });
              chk.checked = !!opt.correct;
              chk.addEventListener('change', () => updateOpt({ ...opt, correct: chk.checked }));
              row.appendChild(el('label', { class: 'ab-chk-label' }, ['Poprawna ']));
              row.querySelector('.ab-chk-label') && row.querySelector('.ab-chk-label').appendChild(chk);
              const lbl = el('label', { class: 'ab-chk-label' });
              lbl.appendChild(chk);
              lbl.appendChild(document.createTextNode(' Poprawna'));
              row.appendChild(lbl);
              row.appendChild(btn('✕', 'ab-btn-remove', removeOpt));
              return row;
            },
            v => updateBlock({ ...block, options: v }),
            'Dodaj opcję'
          );
          box.appendChild(optList);
          box.appendChild(field('Wyjaśnienie (note)', textInput(block.note, 'Opcjonalne wyjaśnienie', v => updateBlock({ ...block, note: v }))));
          box.appendChild(btn('✕ Usuń grupę', 'ab-btn-remove', removeBlock));
          return box;
        },
        v => onChange({ ...data, blocks: v }),
        'Dodaj grupę'
      ));
      return wrap;
    },

    wordform(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));

      const COL_KEYS = ['noun', 'verb', 'adj', 'adv'];
      const cols = data.columns || ['Noun', 'Verb', 'Adjective', 'Adverb'];

      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Wiersze'));
      wrap.appendChild(dynamicList(
        data.rows,
        (row, ri, update, remove) => {
          const box = el('div', { class: 'ab-wordform-row' });
          box.appendChild(field('Wyraz bazowy', textInput(row.root, 'np. beauty', v => update({ ...row, root: v }))));
          COL_KEYS.forEach((key, ci) => {
            const colData = row[key] || { given: null, answer: '' };
            const colWrap = el('div', { class: 'ab-wordform-col' });
            colWrap.appendChild(el('div', { class: 'ab-wf-col-label' }, cols[ci]));
            const modeSelect = selectInput(
              colData.given === null ? 'student' : colData.given === false ? 'none' : 'given',
              [
                { value: 'student', label: 'Uczeń wpisuje' },
                { value: 'given', label: 'Podane z góry' },
                { value: 'none', label: 'Brak' }
              ],
              v => {
                const newColData = { ...colData, given: v === 'given' ? (colData.answer || '') : v === 'none' ? false : null };
                update({ ...row, [key]: newColData });
              }
            );
            colWrap.appendChild(modeSelect);
            colWrap.appendChild(textInput(colData.answer, 'Wartość', v => {
              update({ ...row, [key]: { ...colData, answer: v } });
            }));
            box.appendChild(colWrap);
          });
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, rows: v }),
        'Dodaj wiersz'
      ));
      return wrap;
    },

    tf(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-tf-item' });
          box.appendChild(field('Zdanie', textInput(item.statement, 'Zdanie twierdzące...', v => update({ ...item, statement: v }))));
          box.appendChild(field('Odpowiedź', selectInput(item.answer, [
            { value: 'T', label: 'True (Prawda)' },
            { value: 'F', label: 'False (Fałsz)' },
            { value: 'N', label: 'Not Given (Nie podano)' }
          ], v => update({ ...item, answer: v }))));
          box.appendChild(field('Wyjaśnienie', textInput(item.explanation, 'Opcjonalne wyjaśnienie', v => update({ ...item, explanation: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    jumble(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania do rozsypania'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const row = el('div', { class: 'ab-pair-row' });
          row.appendChild(textInput(item.sentence, 'Poprawne zdanie', v => update({ ...item, sentence: v })));
          row.appendChild(btn('✕', 'ab-btn-remove', remove));
          return row;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj zdanie'
      ));
      return wrap;
    },

    vic(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-vic-item' });
          box.appendChild(field('Słowo', textInput(item.word, 'Słówko', v => update({ ...item, word: v }))));
          box.appendChild(field('Zdanie kontekstowe', textInput(item.sentence, 'Zdanie z ___ lub kontekstem', v => update({ ...item, sentence: v }))));
          (item.options || ['', '', '', '']).forEach((opt, oi) => {
            box.appendChild(field(`Opcja ${oi + 1}`, textInput(opt, `Opcja ${oi + 1}`, v => {
              const newOpts = [...(item.options || ['', '', '', ''])];
              newOpts[oi] = v;
              update({ ...item, options: newOpts });
            })));
          });
          box.appendChild(field('Poprawna odpowiedź', textInput(item.answer, 'Poprawna opcja', v => update({ ...item, answer: v }))));
          box.appendChild(field('Wyjaśnienie', textInput(item.explanation, 'Opcjonalne wyjaśnienie', v => update({ ...item, explanation: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    openq(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(dynamicList(
        data.questions,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-openq-item' });
          box.appendChild(field('Pytanie', textInput(item.question, 'Pytanie...', v => update({ ...item, question: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Opcjonalna wskazówka', v => update({ ...item, hint: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, questions: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    sentcomp(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Początki zdań'));
      wrap.appendChild(stringList(data.starters, 'Początek zdania...', v => onChange({ ...data, starters: v }), 'Dodaj starter'));
      return wrap;
    },

    'vocab-mcq'(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(dynamicList(
        data.questions,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-quiz-item' });
          box.appendChild(field('Zdanie z ___', textInput(item.sentence, 'She ___ to school every day.', v => update({ ...item, sentence: v }))));
          (item.options || ['', '', '', '']).forEach((opt, oi) => {
            box.appendChild(field(`Opcja ${oi + 1}`, textInput(opt, `Opcja ${oi + 1}`, v => {
              const newOpts = [...(item.options || ['', '', '', ''])];
              newOpts[oi] = v;
              update({ ...item, options: newOpts });
            })));
          });
          box.appendChild(field('Poprawna odpowiedź', textInput(item.answer, 'Poprawna opcja', v => update({ ...item, answer: v }))));
          box.appendChild(field('Wyjaśnienie', textInput(item.explanation, 'Opcjonalne wyjaśnienie', v => update({ ...item, explanation: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, questions: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    flashcards(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Fiszki'));
      wrap.appendChild(dynamicList(
        data.items,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-flash-item' });
          box.appendChild(field('Emoji', textInput(item.emoji, '📚', v => update({ ...item, emoji: v }))));
          box.appendChild(field('Słówko', textInput(item.word, 'Słówko', v => update({ ...item, word: v }))));
          box.appendChild(field('Definicja/tłumaczenie', textInput(item.definition, 'Definicja lub tłumaczenie', v => update({ ...item, definition: v }))));
          box.appendChild(field('Przykładowe zdanie', textInput(item.example, 'Przykład użycia', v => update({ ...item, example: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, items: v }),
        'Dodaj fiszkę'
      ));
      return wrap;
    },

    conversation(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Prompty rozmowy'));
      wrap.appendChild(dynamicList(
        data.prompts,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-conv-item' });
          box.appendChild(field('Pytanie PL', textInput(item.q, 'Pytanie po polsku', v => update({ ...item, q: v }))));
          box.appendChild(field('Pytanie EN', textInput(item.qEn, 'Pytanie po angielsku', v => update({ ...item, qEn: v }))));
          box.appendChild(field('Odpowiedź/wskazówka', textArea(item.answer, 'Przykładowa odpowiedź lub wskazówka', v => update({ ...item, answer: v }))));
          box.appendChild(imageField(item.image, v => update({ ...item, image: v })));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, prompts: v }),
        'Dodaj prompt'
      ));
      return wrap;
    },

    warmup(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zdania/prompty'));
      wrap.appendChild(stringList(data.sentences, 'Zdanie lub prompt...', v => onChange({ ...data, sentences: v }), 'Dodaj zdanie'));
      return wrap;
    },

    hotseats(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Timer (sekundy)', numberInput(data.timer, '60', v => onChange({ ...data, timer: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania'));
      wrap.appendChild(stringList(data.questions, 'Pytanie...', v => onChange({ ...data, questions: v }), 'Dodaj pytanie'));
      return wrap;
    },

    opinions(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Karty opinii'));
      wrap.appendChild(dynamicList(
        data.cards,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-opinion-item' });
          box.appendChild(field('Teza/opinia', textInput(item.statement, 'Teza do dyskusji', v => update({ ...item, statement: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Opcjonalna wskazówka', v => update({ ...item, hint: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, cards: v }),
        'Dodaj kartę'
      ));
      return wrap;
    },

    wyr(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Pytania Would You Rather'));
      wrap.appendChild(dynamicList(
        data.questions,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-wyr-item' });
          box.appendChild(field('Opcja A', textInput(item.a, 'Opcja A', v => update({ ...item, a: v }))));
          box.appendChild(field('Opcja B', textInput(item.b, 'Opcja B', v => update({ ...item, b: v }))));
          box.appendChild(field('Wskazówka', textInput(item.hint, 'Opcjonalna wskazówka', v => update({ ...item, hint: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, questions: v }),
        'Dodaj pytanie'
      ));
      return wrap;
    },

    ranking(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Instrukcja', textArea(data.instruction, 'Instrukcja do rankingu...', v => onChange({ ...data, instruction: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Elementy do uszeregowania'));
      wrap.appendChild(stringList(data.items, 'Element...', v => onChange({ ...data, items: v }), 'Dodaj element'));
      return wrap;
    },

    debate(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Timer (sekundy)', numberInput(data.timer, '120', v => onChange({ ...data, timer: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Tezy debaty'));
      wrap.appendChild(stringList(data.motions, 'Teza...', v => onChange({ ...data, motions: v }), 'Dodaj tezę'));
      return wrap;
    },

    monologue(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Timer (sekundy)', numberInput(data.timer, '120', v => onChange({ ...data, timer: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Prompty'));
      wrap.appendChild(stringList(data.prompts, 'Prompt do monologu...', v => onChange({ ...data, prompts: v }), 'Dodaj prompt'));
      return wrap;
    },

    pairs(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Aktywności'));
      wrap.appendChild(dynamicList(
        data.activities,
        (item, i, update, remove) => {
          const box = el('div', { class: 'ab-pairs-item' });
          box.appendChild(field('Rola A', textInput(item.roleA, 'Rola A', v => update({ ...item, roleA: v }))));
          box.appendChild(field('Rola B', textInput(item.roleB, 'Rola B', v => update({ ...item, roleB: v }))));
          box.appendChild(field('Sytuacja', textArea(item.situation, 'Opis sytuacji...', v => update({ ...item, situation: v }))));
          box.appendChild(btn('✕ Usuń', 'ab-btn-remove', remove));
          return box;
        },
        v => onChange({ ...data, activities: v }),
        'Dodaj aktywność'
      ));
      return wrap;
    },

    idiomtasks(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Idiomy'));
      wrap.appendChild(stringList(data.idioms, 'Idiom...', v => onChange({ ...data, idioms: v }), 'Dodaj idiom'));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Zadania'));
      wrap.appendChild(dynamicList(
        data.tasks,
        (item, i, update, remove) => {
          const row = el('div', { class: 'ab-pair-row' });
          row.appendChild(textInput(item.task, 'Treść zadania', v => update({ ...item, task: v })));
          row.appendChild(btn('✕', 'ab-btn-remove', remove));
          return row;
        },
        v => onChange({ ...data, tasks: v }),
        'Dodaj zadanie'
      ));
      return wrap;
    },

    idiomstory(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Startery historii'));
      wrap.appendChild(stringList(data.starters, 'Starter...', v => onChange({ ...data, starters: v }), 'Dodaj starter'));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Idiomy do użycia'));
      wrap.appendChild(stringList(data.idioms, 'Idiom...', v => onChange({ ...data, idioms: v }), 'Dodaj idiom'));
      return wrap;
    },

    checklist(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł listy', v => onChange({ ...data, title: v }))));
      wrap.appendChild(el('div', { class: 'ab-section-label' }, 'Elementy listy'));
      wrap.appendChild(stringList(data.items, 'Element...', v => onChange({ ...data, items: v }), 'Dodaj element'));
      return wrap;
    },

    'hw-write'(data, onChange) {
      const wrap = el('div', { class: 'ab-editor-body' });
      wrap.appendChild(field('Tytuł', textInput(data.title, 'Tytuł zadania', v => onChange({ ...data, title: v }))));
      wrap.appendChild(field('Polecenie/prompt', textArea(data.prompt, 'Treść polecenia dla ucznia...', v => onChange({ ...data, prompt: v }))));
      return wrap;
    }

  };

  // ─── Block type categories for picker ───────────────────────────────────────

  const BLOCK_CATEGORIES = [
    {
      label: 'Wyświetlanie',
      types: ['quote', 'discussion', 'article', 'glossary', 'image', 'html', 'info', 'table', 'examples', 'two-col', 'cta', 'comprehension']
    },
    {
      label: 'Słownictwo',
      types: ['vocab-grid', 'vocab-table', 'phrases']
    },
    {
      label: 'Ćwiczenia',
      types: ['quiz', 'gapfill', 'matching', 'translation', 'scramble', 'transform', 'errorcorrect', 'ownsentences', 'collocations', 'wordform', 'tf', 'jumble', 'vic', 'openq', 'sentcomp', 'vocab-mcq']
    },
    {
      label: 'Fiszki',
      types: ['flashcards']
    },
    {
      label: 'Mówienie',
      types: ['conversation', 'warmup', 'hotseats', 'opinions', 'wyr', 'ranking', 'debate', 'monologue', 'pairs', 'idiomtasks', 'idiomstory']
    },
    {
      label: 'Zadania',
      types: ['checklist', 'hw-write']
    }
  ];

  // ─── Main renderEditor ───────────────────────────────────────────────────────

  function renderEditor(block, onChange, onDelete) {
    const wrapper = el('div', {
      class: 'ab-block-editor',
      draggable: 'true',
      'data-block-id': block.id
    });

    const handle = dragHandle();
    const header = blockHeader(BLOCK_LABELS[block.type] || block.type, onDelete || (() => {}));
    header.insertBefore(handle, header.firstChild);
    wrapper.appendChild(header);

    const editorFn = EDITORS[block.type];
    if (editorFn) {
      wrapper.appendChild(editorFn(block.data || {}, (newData) => {
        onChange({ ...block, data: newData });
      }));
    } else {
      wrapper.appendChild(el('div', { class: 'ab-editor-body' }, [
        el('p', { style: { color: '#888', fontStyle: 'italic' } }, 'Brak edytora dla typu: ' + block.type)
      ]));
    }

    return wrapper;
  }

  // ─── Block picker ────────────────────────────────────────────────────────────

  function renderBlockPicker(onAdd) {
    const wrap = el('div', { class: 'ab-picker' });
    wrap.appendChild(el('div', { class: 'ab-picker-title' }, 'Dodaj blok'));

    BLOCK_CATEGORIES.forEach(cat => {
      wrap.appendChild(el('div', { class: 'ab-picker-cat-label' }, cat.label));
      const grid = el('div', { class: 'ab-picker-grid' });
      cat.types.forEach(type => {
        const b = el('button', { class: 'ab-picker-btn', type: 'button', title: type }, BLOCK_LABELS[type] || type);
        b.addEventListener('click', () => onAdd(type));
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
    });

    return wrap;
  }

  // ─── Drag & Drop helpers ─────────────────────────────────────────────────────

  function setupDragDrop(container, getBlocks, setBlocks) {
    let dragId = null;

    container.addEventListener('dragstart', (e) => {
      const block = e.target.closest('.ab-block-editor');
      if (!block) return;
      dragId = block.dataset.blockId;
      block.classList.add('ab-dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    container.addEventListener('dragend', (e) => {
      const block = e.target.closest('.ab-block-editor');
      if (block) block.classList.remove('ab-dragging');
      container.querySelectorAll('.ab-drag-over').forEach(el => el.classList.remove('ab-drag-over'));
      dragId = null;
    });

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const target = e.target.closest('.ab-block-editor');
      if (target && target.dataset.blockId !== dragId) {
        container.querySelectorAll('.ab-drag-over').forEach(el => el.classList.remove('ab-drag-over'));
        target.classList.add('ab-drag-over');
      }
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target.closest('.ab-block-editor');
      if (!target || !dragId || target.dataset.blockId === dragId) return;

      const blocks = getBlocks();
      const fromIdx = blocks.findIndex(b => b.id === dragId);
      const toIdx = blocks.findIndex(b => b.id === target.dataset.blockId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...blocks];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setBlocks(reordered);
    });
  }

  // ─── renderTabEditor ─────────────────────────────────────────────────────────

  function renderTabEditor(tab, onTabChange) {
    let currentTab = { ...tab, blocks: [...(tab.blocks || [])] };

    const wrap = el('div', { class: 'ab-tab-editor' });

    // Tab meta (name + icon)
    const metaRow = el('div', { class: 'ab-tab-meta' });
    metaRow.appendChild(field('Nazwa zakładki', textInput(currentTab.name, 'Nazwa zakładki', v => {
      currentTab = { ...currentTab, name: v };
      onTabChange(currentTab);
    })));
    metaRow.appendChild(field('Ikona (emoji)', textInput(currentTab.icon, '📖', v => {
      currentTab = { ...currentTab, icon: v };
      onTabChange(currentTab);
    })));
    wrap.appendChild(metaRow);

    // Blocks container
    const blocksContainer = el('div', { class: 'ab-blocks-container' });

    function redraw() {
      blocksContainer.replaceChildren();
      if (!currentTab.blocks || currentTab.blocks.length === 0) {
        blocksContainer.appendChild(el('div', { class: 'ab-blocks-empty' }, 'Brak bloków. Dodaj pierwszy blok poniżej.'));
      } else {
        currentTab.blocks.forEach((block) => {
          const blockEl = renderEditor(
            block,
            (updatedBlock) => {
              currentTab = {
                ...currentTab,
                blocks: currentTab.blocks.map(b => b.id === updatedBlock.id ? updatedBlock : b)
              };
              onTabChange(currentTab);
            },
            () => {
              currentTab = {
                ...currentTab,
                blocks: currentTab.blocks.filter(b => b.id !== block.id)
              };
              onTabChange(currentTab);
              redraw();
            }
          );
          blocksContainer.appendChild(blockEl);
        });
      }
    }

    setupDragDrop(
      blocksContainer,
      () => currentTab.blocks || [],
      (reordered) => {
        currentTab = { ...currentTab, blocks: reordered };
        onTabChange(currentTab);
        redraw();
      }
    );

    redraw();
    wrap.appendChild(blocksContainer);

    // Picker
    const picker = renderBlockPicker((type) => {
      const newBlock = OWL.AdminBlocks.newBlock(type);
      currentTab = { ...currentTab, blocks: [...(currentTab.blocks || []), newBlock] };
      onTabChange(currentTab);
      redraw();
    });
    wrap.appendChild(picker);

    return wrap;
  }

  // ─── Tab manager (multi-tab) ─────────────────────────────────────────────────

  function renderTabManager(tabs, onTabsChange) {
    let currentTabs = tabs ? [...tabs] : [];
    let activeTabId = currentTabs.length > 0 ? currentTabs[0].id : null;

    const wrap = el('div', { class: 'ab-tab-manager' });

    const tabBar = el('div', { class: 'ab-tabbar' });
    const editorArea = el('div', { class: 'ab-editor-area' });

    function redrawTabBar() {
      tabBar.replaceChildren();
      currentTabs.forEach((tab) => {
        const tabBtn = el('button', {
          class: 'ab-tabbar-btn' + (tab.id === activeTabId ? ' ab-tabbar-btn--active' : ''),
          type: 'button'
        }, (tab.icon ? tab.icon + ' ' : '') + (tab.name || 'Zakładka'));
        tabBtn.addEventListener('click', () => {
          activeTabId = tab.id;
          redrawTabBar();
          redrawEditor();
        });
        tabBar.appendChild(tabBtn);
      });

      tabBar.appendChild(btn('+ Zakładka', 'ab-btn-add-tab', () => {
        const newTab = { id: uid(), name: 'Nowa zakładka', icon: '📄', blocks: [] };
        currentTabs = [...currentTabs, newTab];
        activeTabId = newTab.id;
        onTabsChange([...currentTabs]);
        redrawTabBar();
        redrawEditor();
      }));
    }

    function redrawEditor() {
      editorArea.replaceChildren();
      const tab = currentTabs.find(t => t.id === activeTabId);
      if (!tab) {
        editorArea.appendChild(el('div', { class: 'ab-blocks-empty' }, 'Wybierz zakładkę lub utwórz nową.'));
        return;
      }

      // Delete tab button
      const deleteTabBtn = btn('🗑 Usuń zakładkę', 'ab-btn-delete', () => {
        if (!confirm('Usunąć zakładkę "' + (tab.name || 'Zakładka') + '"? Tej operacji nie można cofnąć.')) return;
        currentTabs = currentTabs.filter(t => t.id !== activeTabId);
        activeTabId = currentTabs.length > 0 ? currentTabs[0].id : null;
        onTabsChange([...currentTabs]);
        redrawTabBar();
        redrawEditor();
      });
      editorArea.appendChild(deleteTabBtn);

      const tabEd = renderTabEditor(tab, (updatedTab) => {
        currentTabs = currentTabs.map(t => t.id === updatedTab.id ? updatedTab : t);
        onTabsChange([...currentTabs]);
        redrawTabBar();
      });
      editorArea.appendChild(tabEd);
    }

    wrap.appendChild(tabBar);
    wrap.appendChild(editorArea);

    redrawTabBar();
    redrawEditor();

    return wrap;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  OWL.AdminBlocks = {

    BLOCK_TYPES: Object.keys(BLOCK_DEFAULTS),

    BLOCK_CATEGORIES,

    BLOCK_LABELS,

    newBlock(type) {
      const defaults = BLOCK_DEFAULTS[type];
      if (!defaults) console.warn('[OWL.AdminBlocks] Nieznany typ bloku:', type);
      return {
        id: uid(),
        type: type,
        data: JSON.parse(JSON.stringify(defaults || {}))
      };
    },

    renderEditor(block, onChange, onDelete) {
      return renderEditor(block, onChange || (() => {}), onDelete || (() => {}));
    },

    renderTabEditor(tab, onTabChange) {
      return renderTabEditor(tab, onTabChange || (() => {}));
    },

    renderTabManager(tabs, onTabsChange) {
      return renderTabManager(tabs, onTabsChange || (() => {}));
    },

    renderBlockPicker(onAdd) {
      return renderBlockPicker(onAdd || (() => {}));
    }
  };

})();

// ─── Minimal CSS (injected once) ─────────────────────────────────────────────
(function injectAdminBlocksCSS() {
  if (document.getElementById('owl-admin-blocks-css')) return;
  const style = document.createElement('style');
  style.id = 'owl-admin-blocks-css';
  style.textContent = `
/* ── Owl's Academy — Admin Block Editor Styles ── */

.ab-block-editor {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: box-shadow 0.15s;
}

.ab-block-editor.ab-dragging {
  opacity: 0.5;
  box-shadow: 0 0 0 2px #89b4fa;
}

.ab-block-editor.ab-drag-over {
  box-shadow: 0 4px 16px rgba(137,180,250,0.35);
  border-color: #89b4fa;
}

.ab-block-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.ab-block-type {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #89b4fa;
  flex: 1;
}

.ab-drag-handle {
  cursor: grab;
  color: #585b70;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
  user-select: none;
}

.ab-drag-handle:active { cursor: grabbing; }

.ab-editor-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ab-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ab-label {
  font-size: 11px;
  font-weight: 600;
  color: #a6adc8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ab-input, .ab-select {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 5px;
  color: #cdd6f4;
  font-size: 13px;
  padding: 6px 8px;
  width: 100%;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}

.ab-input:focus, .ab-select:focus, .ab-textarea:focus {
  border-color: #89b4fa;
}

.ab-textarea {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 5px;
  color: #cdd6f4;
  font-size: 13px;
  padding: 6px 8px;
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 70px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.ab-btn {
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s;
}

.ab-btn-delete {
  background: transparent;
  border-color: #f38ba8;
  color: #f38ba8;
  margin-left: auto;
}
.ab-btn-delete:hover { background: rgba(243,139,168,0.12); }

.ab-btn-remove {
  background: transparent;
  border-color: #45475a;
  color: #f38ba8;
  font-size: 11px;
  padding: 3px 7px;
  flex-shrink: 0;
}
.ab-btn-remove:hover { background: rgba(243,139,168,0.1); }

.ab-btn-add {
  background: transparent;
  border: 1px dashed #45475a;
  color: #a6e3a1;
  margin-top: 6px;
  display: block;
  width: 100%;
  font-size: 12px;
  padding: 5px;
}
.ab-btn-add:hover { border-color: #a6e3a1; background: rgba(166,227,161,0.07); }

.ab-btn-img {
  background: #313244;
  border-color: #45475a;
  color: #cba6f7;
  font-size: 12px;
}
.ab-btn-img:hover { background: #45475a; }

.ab-btn-add-tab {
  background: #313244;
  border: 1px solid #45475a;
  color: #a6e3a1;
  font-size: 12px;
}
.ab-btn-add-tab:hover { background: #45475a; }

.ab-section-label {
  font-size: 11px;
  font-weight: 700;
  color: #6c7086;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 6px;
}

.ab-dynlist { display: flex; flex-direction: column; gap: 6px; }

.ab-dynlist-row { display: flex; flex-direction: column; gap: 4px; }

.ab-dynlist-row--inline {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.ab-dynlist-row--inline .ab-input { flex: 1; }

.ab-pair-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ab-pair-row .ab-input { flex: 1; }

.ab-glossary-item,
.ab-vocab-item,
.ab-quiz-item,
.ab-gapfill-item,
.ab-trans-item,
.ab-scramble-item,
.ab-transform-item,
.ab-error-item,
.ab-comp-item,
.ab-tf-item,
.ab-vic-item,
.ab-openq-item,
.ab-flash-item,
.ab-conv-item,
.ab-opinion-item,
.ab-wyr-item,
.ab-pairs-item,
.ab-wordform-row,
.ab-colloc-block {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ab-wordform-col {
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 4px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ab-wf-col-label {
  font-size: 10px;
  font-weight: 700;
  color: #89b4fa;
  text-transform: uppercase;
}

.ab-table-row {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-bottom: 4px;
}
.ab-table-row .ab-input { flex: 1; }

.ab-table-rows { display: flex; flex-direction: column; }

.ab-colloc-opt-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.ab-colloc-opt-row .ab-input { flex: 1; }

.ab-chk-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #a6adc8;
  white-space: nowrap;
  cursor: pointer;
}

.ab-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #a6e3a1;
}

.ab-image-field { display: flex; flex-direction: column; gap: 4px; }

/* ── Tab Manager ── */

.ab-tab-manager {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ab-tabbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: #181825;
  border-bottom: 1px solid #313244;
}

.ab-tabbar-btn {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 5px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 12px;
  padding: 5px 12px;
  transition: background 0.15s;
}

.ab-tabbar-btn:hover { background: #45475a; }

.ab-tabbar-btn--active {
  background: #89b4fa;
  color: #1e1e2e;
  border-color: #89b4fa;
  font-weight: 700;
}

.ab-editor-area {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Tab Editor ── */

.ab-tab-editor { display: flex; flex-direction: column; gap: 12px; }

.ab-tab-meta {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ab-tab-meta .ab-field { flex: 1; }

.ab-blocks-container { display: flex; flex-direction: column; }

.ab-blocks-empty {
  padding: 24px;
  text-align: center;
  color: #585b70;
  font-style: italic;
  font-size: 13px;
  border: 1px dashed #313244;
  border-radius: 8px;
}

/* ── Block Picker ── */

.ab-picker {
  background: #181825;
  border: 1px solid #313244;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ab-picker-title {
  font-size: 12px;
  font-weight: 700;
  color: #cdd6f4;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ab-picker-cat-label {
  font-size: 10px;
  font-weight: 700;
  color: #6c7086;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 4px;
}

.ab-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ab-picker-btn {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}

.ab-picker-btn:hover {
  background: #89b4fa;
  border-color: #89b4fa;
  color: #1e1e2e;
}
`;
  document.head.appendChild(style);
})();
