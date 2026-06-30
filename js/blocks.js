// Owl's Academy v2 — Block Renderer
// Vanilla JS, no bundler, no imports.
// Requires: OWL.TTS, OWL.SRS, OWL.Progress (loaded before this file)

window.OWL = window.OWL || {};

OWL.Blocks = (function () {
  'use strict';

  // ─── Internal helpers ────────────────────────────────────────────────────────

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(color) {
    const d = el('div', 'card');
    if (color) d.classList.add(color);
    return d;
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function san(html) {
    // Parse into a detached element so the browser tokenises the markup,
    // then strip every dangerous node/attribute before returning the result.
    // This is intentionally using innerHTML for parsing only — the output
    // is scrubbed before it ever reaches the live document.
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('script, iframe, object, embed, form, meta, link').forEach(n => n.remove());
    d.querySelectorAll('*').forEach(n => {
      Array.from(n.attributes).forEach(attr => {
        if (/^on/i.test(attr.name)) n.removeAttribute(attr.name);
        if (attr.name === 'href'   && /^javascript:/i.test(attr.value)) n.removeAttribute(attr.name);
        if (attr.name === 'src'    && /^javascript:/i.test(attr.value)) n.removeAttribute(attr.name);
        if (attr.name === 'action' && /^javascript:/i.test(attr.value)) n.removeAttribute(attr.name);
      });
    });
    return d.innerHTML;
  }

  /** Remove all child nodes without touching innerHTML. */
  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function ttsBtn(text, lang) {
    if (!OWL.TTS || !OWL.TTS.supported) return null;
    return OWL.TTS.btn(text, lang || 'en-GB');
  }

  function lightbox(src) {
    const overlay = el('div', 'lightbox-overlay');
    const img = document.createElement('img');
    img.src = src;
    img.addEventListener('click', e => e.stopPropagation());
    const closeBtn = el('button', 'lightbox-close', '×');
    closeBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', () => overlay.remove());
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
  }

  function imgEl(src, caption) {
    const wrap = el('div', 'block-img-wrap');
    wrap.style.cssText = 'text-align:center;margin:1rem 0;';
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:100%;cursor:pointer;border-radius:var(--radius-sm);';
    img.addEventListener('click', () => lightbox(src));
    wrap.appendChild(img);
    if (caption) {
      const cap = el('p', '', caption);
      cap.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-top:.4rem;font-style:italic;';
      wrap.appendChild(cap);
    }
    return wrap;
  }

  function instrBanner(text) {
    const d = el('div', 'instruction-banner', text);
    return d;
  }

  function blockTitle(text, tag) {
    const h = document.createElement(tag || 'h3');
    h.textContent = text;
    return h;
  }

  function wrap(inner) {
    const w = el('div', 'block-wrap');
    w.appendChild(inner);
    return w;
  }

  function saveBtn(label) {
    const b = el('button', 'check-btn', label || 'Sprawdź');
    return b;
  }

  function feedbackEl() {
    return el('div', 'exercise-feedback');
  }

  function showFeedback(fb, correct, msg) {
    fb.className = 'exercise-feedback show ' + (correct ? 'correct' : 'incorrect');
    fb.textContent = msg || (correct ? 'Poprawnie!' : 'Niepoprawnie');
  }

  // ─── DISPLAY BLOCKS ──────────────────────────────────────────────────────────

  function renderQuote(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const div = el('div', 'quote-block');
    const p = document.createElement('p');
    p.textContent = d.text || '';
    div.appendChild(p);
    if (d.author) {
      const cite = el('cite', '', '— ' + d.author);
      div.appendChild(cite);
    }
    const btn = ttsBtn(d.text, lang);
    if (btn) {
      btn.style.cssText = 'margin-top:10px;';
      div.appendChild(btn);
    }
    return wrap(div);
  }

  function renderDiscussion(block, opts) {
    const d = block.data;
    const c = card('yellow');
    if (d.label) {
      const badge = el('span', 'badge', d.label);
      badge.style.marginBottom = '10px';
      badge.style.display = 'inline-block';
      c.appendChild(badge);
    }
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.description) {
      const p = el('p', '', d.description);
      p.style.cssText = 'margin-bottom:12px;color:var(--ink-60);font-size:.9rem;';
      c.appendChild(p);
    }
    const qs = d.questions || [];
    qs.forEach((q, i) => {
      const qText = typeof q === 'string' ? q : (q.q || q.text || q.question || '');
      const qHint = typeof q === 'object' ? (q.hint || '') : '';
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;';
      const num = el('span', 'speak-num', String(i + 1));
      num.style.cssText = 'width:24px;height:24px;min-width:24px;background:var(--amber);color:var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;margin-top:2px;';
      const inner = el('div', '');
      inner.style.cssText = 'font-size:.93rem;line-height:1.55;';
      inner.textContent = qText;
      if (qHint) {
        const hint = el('div', '');
        hint.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-top:2px;font-style:italic;';
        hint.textContent = qHint;
        inner.appendChild(hint);
      }
      row.appendChild(num);
      row.appendChild(inner);
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderArticle(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const box = el('div', 'reading-box');
    if (d.articleTitle) {
      const h = el('h3', '', d.articleTitle);
      h.style.marginBottom = d.articleNote ? '4px' : '14px';
      box.appendChild(h);
    }
    if (d.articleNote) {
      const note = el('p', '', d.articleNote);
      note.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-bottom:12px;font-style:italic;';
      box.appendChild(note);
    }
    if (d.image) box.appendChild(imgEl(d.image));
    if (d.text) {
      const p = el('div', 'reading-text');
      p.innerHTML = san(d.text);
      box.appendChild(p);
      const btn = ttsBtn(p.textContent, lang);
      if (btn) {
        btn.style.marginTop = '10px';
        box.appendChild(btn);
      }
    }
    if (d.footnote) {
      const fn = el('p', '', d.footnote);
      fn.style.cssText = 'font-size:.78rem;color:var(--ink-60);margin-top:10px;font-style:italic;border-top:1px solid var(--border);padding-top:8px;';
      box.appendChild(fn);
    }
    return wrap(box);
  }

  function renderGlossary(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title !== undefined) c.appendChild(blockTitle(d.title || 'Słowniczek'));
    const grid = el('div', 'vocab-grid');
    (d.items || []).forEach(item => {
      const vi = el('div', 'vocab-item');
      const wordEl = el('span', 'vi-pl', item.word);
      vi.appendChild(wordEl);
      if (item.phonetic) {
        const ph = el('span', '', item.phonetic);
        ph.style.cssText = 'font-size:.75rem;color:var(--ink-60);display:block;';
        vi.appendChild(ph);
      }
      const enEl = el('span', 'vi-en', item.translation || '');
      vi.appendChild(enEl);
      if (item.hint) vi.appendChild(el('span', 'vi-hint', item.hint));
      if (item.example) {
        const ex = el('span', '', item.example);
        ex.style.cssText = 'font-size:.72rem;color:var(--ink-60);font-style:italic;margin-top:4px;display:none;';
        ex.classList.add('vi-example');
        vi.appendChild(ex);
      }
      const flip = el('span', 'vi-flip-hint', 'kliknij →');
      vi.appendChild(flip);
      const btn = ttsBtn(item.word, lang);
      if (btn) {
        btn.style.cssText = 'position:absolute;bottom:6px;right:6px;';
        vi.appendChild(btn);
      }
      vi.style.position = 'relative';
      vi.addEventListener('click', () => {
        vi.classList.toggle('revealed');
        const exEl = vi.querySelector('.vi-example');
        if (exEl) exEl.style.display = vi.classList.contains('revealed') ? 'block' : 'none';
      });
      grid.appendChild(vi);
    });
    c.appendChild(grid);
    return wrap(c);
  }

  function renderImage(block, opts) {
    const d = block.data;
    const c = card();
    c.style.textAlign = 'center';
    c.appendChild(imgEl(d.image, d.caption));
    return wrap(c);
  }

  function renderHtml(block, opts) {
    const d = block.data;
    const div = el('div', 'block-wrap');
    // INTENTIONAL: the `html` block is teacher-authored content served from
    // the admin's own lesson data.  Teachers are trusted content creators in
    // this application (analogous to a CMS "raw HTML" widget).  Student-
    // supplied input is never passed to this code path.
    div.innerHTML = d.html || ''; // trusted teacher HTML — no sanitisation by design
    return div;
  }

  function renderInfo(block, opts) {
    const d = block.data;
    const colorMap = { green: 'green', yellow: 'yellow', red: 'red', purple: 'purple', orange: 'orange', teal: 'teal' };
    const c = card(colorMap[d.color] || 'teal');
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.text) {
      const p = el('p', '', d.text);
      p.style.fontSize = '.95rem';
      c.appendChild(p);
    }
    if (d.tip) {
      const tip = el('p', '', '💡 ' + d.tip);
      tip.style.cssText = 'font-size:.85rem;color:var(--ink-60);margin-top:8px;font-style:italic;';
      c.appendChild(tip);
    }
    return wrap(c);
  }

  function renderTable(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:.9rem;';
    if (d.headers && d.headers.length) {
      const thead = tbl.createTHead();
      const tr = thead.insertRow();
      d.headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'background:var(--ink);color:white;padding:8px 12px;text-align:left;font-size:.8rem;letter-spacing:.04em;';
        tr.appendChild(th);
      });
    }
    const tbody = tbl.createTBody();
    (d.rows || []).forEach((row, ri) => {
      const tr = tbody.insertRow();
      if (ri % 2 === 1) tr.style.background = 'var(--cream)';
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        td.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
        tr.appendChild(td);
      });
    });
    c.appendChild(tbl);
    return wrap(c);
  }

  function renderExamples(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    const ul = el('ul', '');
    ul.style.cssText = 'list-style:none;padding:0;';
    (d.items || []).forEach(item => {
      const li = el('li', '');
      li.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:.93rem;';
      const pl = el('span', '', item.pl);
      pl.style.cssText = 'color:var(--ink-60);flex:1;min-width:120px;';
      const arrow = el('span', '', '→');
      arrow.style.cssText = 'color:var(--amber);font-weight:700;';
      const en = el('span', '', item.en);
      en.style.cssText = 'font-weight:600;flex:1;min-width:120px;';
      li.appendChild(pl);
      li.appendChild(arrow);
      li.appendChild(en);
      const btn = ttsBtn(item.en, lang);
      if (btn) li.appendChild(btn);
      ul.appendChild(li);
    });
    c.appendChild(ul);
    return wrap(c);
  }

  function renderTwoCol(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    const grid = el('div', '');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;';
    (d.columns || []).forEach(col => {
      const div = el('div', '');
      if (col.header) {
        const h4 = el('h4', '', col.header);
        h4.style.cssText = 'font-size:.9rem;font-weight:700;margin-bottom:8px;color:var(--amber);text-transform:uppercase;letter-spacing:.05em;';
        div.appendChild(h4);
      }
      const ul = el('ul', '');
      ul.style.cssText = 'list-style:none;padding:0;';
      (col.items || []).forEach(item => {
        const li = el('li', '');
        li.style.cssText = 'padding:5px 0;border-bottom:1px solid var(--border);font-size:.9rem;';
        if (typeof item === 'string') {
          li.textContent = item;
        } else if (item && typeof item === 'object') {
          // V1 format: {pl, en} — show English, with Polish as subtitle
          if (item.en || item.pl) {
            li.textContent = item.en || item.pl;
            if (item.en && item.pl) {
              const sub = el('div', '', item.pl);
              sub.style.cssText = 'font-size:.78rem;color:var(--ink-60);margin-top:1px;';
              li.appendChild(sub);
            }
          } else {
            li.textContent = item.text || item.label || item.value || '';
          }
        }
        ul.appendChild(li);
      });
      div.appendChild(ul);
      grid.appendChild(div);
    });
    c.appendChild(grid);
    return wrap(c);
  }

  function renderCta(block, opts) {
    const d = block.data;
    const div = el('div', 'cta-block');
    const left = el('div', '');
    if (d.label) left.appendChild(el('div', 'cta-label', d.label));
    left.appendChild(el('div', 'cta-text', d.text || ''));
    div.appendChild(left);
    const btn = el('button', 'cta-action-btn', d.buttonText || 'Przejdź dalej');
    btn.addEventListener('click', () => {
      if (typeof window.OWL.switchTab === 'function') window.OWL.switchTab(d.targetTabId);
    });
    div.appendChild(btn);
    return wrap(div);
  }

  function renderComprehension(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));
    (d.questions || []).forEach((qItem, i) => {
      const qDiv = el('div', '');
      qDiv.style.cssText = 'margin-bottom:16px;';
      const qRow = el('div', '');
      qRow.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;';
      const num = el('span', '', String(i + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--amber);min-width:20px;';
      qRow.appendChild(num);
      qRow.appendChild(el('span', '', qItem.question));
      qDiv.appendChild(qRow);
      const answerDiv = el('div', '');
      answerDiv.style.cssText = 'background:var(--cream);border-radius:8px;padding:10px 14px;font-size:.9rem;display:none;color:var(--teal);font-weight:600;margin-top:4px;';
      answerDiv.textContent = qItem.answer;
      const showBtn = el('button', 'check-btn', 'Pokaż odpowiedź');
      showBtn.style.cssText = 'font-size:.8rem;padding:6px 14px;margin-top:0;';
      showBtn.addEventListener('click', () => {
        answerDiv.style.display = 'block';
        showBtn.style.display = 'none';
      });
      qDiv.appendChild(showBtn);
      qDiv.appendChild(answerDiv);
      c.appendChild(qDiv);
    });
    return wrap(c);
  }

  function renderVocabGrid(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card(d.color || '');
    if (d.title) c.appendChild(blockTitle(d.title));
    const grid = el('div', 'vocab-grid');
    (d.items || []).forEach(item => {
      const vi = el('div', 'vocab-item');
      vi.style.position = 'relative';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.style.cssText = 'width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;';
        vi.appendChild(img);
      }
      if (item.emoji) vi.appendChild(el('span', 'vi-emoji', item.emoji));
      vi.appendChild(el('span', 'vi-pl', item.pl));
      const enEl = el('span', 'vi-en', item.en);
      vi.appendChild(enEl);
      const flip = el('span', 'vi-flip-hint', 'kliknij →');
      vi.appendChild(flip);
      // TTS button
      const btn = ttsBtn(item.en, lang);
      if (btn) {
        btn.style.cssText = 'position:absolute;bottom:6px;right:6px;';
        vi.appendChild(btn);
      }
      // Save-word button
      const saveW = el('button', 'save-word-btn', '＋');
      saveW.title = 'Zapisz słowo';
      saveW.addEventListener('click', e => {
        e.stopPropagation();
        if (!OWL.Progress) return;
        const words = OWL.Progress.getMyWords() || [];
        const exists = words.find(w => w.en === item.en);
        if (!exists) {
          words.push({ pl: item.pl, en: item.en });
          OWL.Progress.setMyWords(words);
          saveW.classList.add('saved');
          saveW.textContent = '✓';
        }
      });
      vi.appendChild(saveW);
      vi.addEventListener('click', () => vi.classList.toggle('revealed'));
      grid.appendChild(vi);
    });
    c.appendChild(grid);
    return wrap(c);
  }

  function renderVocabTable(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card(d.color || '');
    if (d.title) c.appendChild(blockTitle(d.title));
    const tbl = document.createElement('table');
    tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:.9rem;';
    const thead = tbl.createTHead();
    const hrow = thead.insertRow();
    ['PL', 'EN', ''].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      th.style.cssText = 'background:var(--ink);color:white;padding:8px 12px;text-align:left;font-size:.8rem;';
      hrow.appendChild(th);
    });
    const tbody = tbl.createTBody();
    (d.items || []).forEach((item, ri) => {
      const tr = tbody.insertRow();
      if (ri % 2 === 1) tr.style.background = 'var(--cream)';
      const tdPl = tr.insertCell();
      tdPl.textContent = item.pl;
      tdPl.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);color:var(--ink-60);';
      const tdEn = tr.insertCell();
      tdEn.textContent = item.en;
      tdEn.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);font-weight:600;';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.style.cssText = 'height:40px;border-radius:4px;margin-right:6px;vertical-align:middle;';
        tdEn.prepend(img);
      }
      const tdBtn = tr.insertCell();
      tdBtn.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);';
      const btn = ttsBtn(item.en, lang);
      if (btn) tdBtn.appendChild(btn);
    });
    c.appendChild(tbl);
    return wrap(c);
  }

  function renderPhrases(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    (d.items || []).forEach(item => {
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;';
      const pl = el('span', '', item.pl);
      pl.style.cssText = 'color:var(--ink-60);flex:1;min-width:100px;font-size:.9rem;';
      const arrow = el('span', '', '→');
      arrow.style.cssText = 'color:var(--amber);font-weight:700;';
      const en = el('span', '', item.en);
      en.style.cssText = 'font-weight:600;flex:1.5;min-width:120px;font-size:.9rem;';
      row.appendChild(pl);
      row.appendChild(arrow);
      row.appendChild(en);
      const btn = ttsBtn(item.en, lang);
      if (btn) row.appendChild(btn);
      c.appendChild(row);
    });
    return wrap(c);
  }

  // ─── INTERACTIVE EXERCISES ───────────────────────────────────────────────────

  function renderQuiz(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const answers = saved.answers || {};
    const qDivs = [];

    (d.questions || []).forEach((q, qi) => {
      const qDiv = el('div', '');
      qDiv.style.cssText = 'margin-bottom:20px;';
      qDivs.push(qDiv);

      const qText = el('p', '', String(qi + 1) + '. ' + q.q);
      qText.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:.93rem;';
      qDiv.appendChild(qText);

      if (q.image) qDiv.appendChild(imgEl(q.image));

      const optsBtns = [];
      q.options.forEach(opt => {
        const btn = el('button', 'quiz-option', opt);
        optsBtns.push(btn);
        qDiv.appendChild(btn);
      });

      const expDiv = el('div', '');
      expDiv.style.cssText = 'font-size:.82rem;color:var(--ink-60);margin-top:6px;font-style:italic;display:none;';
      qDiv.appendChild(expDiv);

      function applyAnswer(selected) {
        optsBtns.forEach(b => {
          b.disabled = true;
          b.classList.remove('correct', 'incorrect');
          if (b.textContent === q.answer) b.classList.add('correct');
          else if (b.textContent === selected) b.classList.add('incorrect');
        });
        if (q.explanation) {
          expDiv.textContent = q.explanation;
          expDiv.style.display = 'block';
        }
      }

      // restore saved state
      if (answers[qi] !== undefined) {
        applyAnswer(answers[qi]);
      }

      optsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          const sel = btn.textContent;
          answers[qi] = sel;
          applyAnswer(sel);
          if (OWL.Progress) {
            const score = Object.values(answers).filter((a, i) => a === (d.questions[i] || {}).answer).length;
            OWL.Progress.setBlock(block.id, { answers, score });
          }
        });
      });

      c.appendChild(qDiv);
    });

    const checkAllBtn = saveBtn('Sprawdź wszystkie');
    checkAllBtn.addEventListener('click', () => {
      (d.questions || []).forEach((q, qi) => {
        if (answers[qi] === undefined) {
          // highlight unanswered
          const qDiv = qDivs[qi];
          if (qDiv) qDiv.style.border = '1.5px solid var(--coral)';
        }
      });
    });
    c.appendChild(checkAllBtn);
    return wrap(c);
  }

  function renderGapfill(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedAnswers = saved.answers || {};
    const inputs = [];

    // Wordbank — handle both array and comma-separated string (V1 legacy)
    const wbWords = Array.isArray(d.wordbank)
      ? d.wordbank
      : (d.wordbank ? String(d.wordbank).split(/[,·]+/).map(w => w.trim()).filter(Boolean) : []);
    if (wbWords.length) {
      const wb = el('div', '');
      wb.style.cssText = 'background:var(--cream-dark);border-radius:8px;padding:10px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:6px;';
      const lbl = el('span', '', 'Słowa: ');
      lbl.style.cssText = 'font-size:.78rem;font-weight:700;color:var(--ink-60);margin-right:4px;align-self:center;';
      wb.appendChild(lbl);
      wbWords.forEach(w => {
        const chip = el('span', 'word-chip', w);
        chip.dataset.word = w;
        chip.addEventListener('click', () => {
          // find first unfilled input
          const inp = inputs.find(i => !i.value);
          if (inp) {
            inp.value = w;
            chip.classList.add('used');
          }
        });
        wb.appendChild(chip);
      });
      c.appendChild(wb);
    }

    (d.items || []).forEach((item, idx) => {
      const p = el('p', '');
      p.style.cssText = 'margin-bottom:10px;font-size:.93rem;line-height:2;';
      // V1 gr-fill uses {before, answer, after}; V2 uses {sentence with ___}
      const sentence = item.sentence || ((item.before || '') + ' ___ ' + (item.after || ''));
      const parts = sentence.split('___');
      parts.forEach((part, pi) => {
        p.appendChild(document.createTextNode(part));
        if (pi < parts.length - 1) {
          const inp = document.createElement('input');
          inp.className = 'gap-input';
          inp.value = savedAnswers[idx] || '';
          inp.dataset.idx = idx;
          inp.dataset.answer = item.answer;
          inputs.push(inp);
          p.appendChild(inp);
        }
      });
      c.appendChild(p);
    });

    const fb = feedbackEl();
    const btn = saveBtn('Sprawdź');
    btn.addEventListener('click', () => {
      let correct = 0;
      inputs.forEach(inp => {
        const ans = (inp.dataset.answer || '').trim().toLowerCase();
        const val = (inp.value || '').trim().toLowerCase();
        inp.classList.remove('correct', 'incorrect');
        if (val === ans) { inp.classList.add('correct'); correct++; }
        else inp.classList.add('incorrect');
      });
      showFeedback(fb, correct === inputs.length,
        correct + '/' + inputs.length + ' poprawnych odpowiedzi');
      const answers = {};
      inputs.forEach(inp => { answers[inp.dataset.idx] = inp.value; });
      if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers, score: correct });
    });
    c.appendChild(btn);
    c.appendChild(fb);
    return wrap(c);
  }

  function renderMatching(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const pairs = d.pairs || [];
    const shuffledDefs = shuffle(pairs.map((p, i) => ({ text: p.def, idx: i })));

    const grid = el('div', '');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

    const wordCol = el('div', 'matching-col');
    const defCol  = el('div', 'matching-col');
    grid.appendChild(wordCol);
    grid.appendChild(defCol);

    let selectedWord = null;
    let selectedWordIdx = null;
    const wordEls = [];
    const defEls  = [];
    const matched  = new Set();

    pairs.forEach((p, i) => {
      const wordEl = el('div', 'match-item', p.word);
      wordEl.dataset.idx = i;
      wordEls.push(wordEl);
      wordEl.addEventListener('click', () => {
        if (wordEl.classList.contains('matched')) return;
        wordEls.forEach(e => e.classList.remove('selected'));
        wordEl.classList.add('selected');
        selectedWord = wordEl;
        selectedWordIdx = i;
      });
      wordCol.appendChild(wordEl);
    });

    shuffledDefs.forEach(({ text, idx }) => {
      const defEl = el('div', 'match-item', text);
      defEl.dataset.idx = idx;
      defEls.push(defEl);
      defEl.addEventListener('click', () => {
        if (defEl.classList.contains('matched') || !selectedWord) return;
        const correct = parseInt(defEl.dataset.idx) === selectedWordIdx;
        if (correct) {
          selectedWord.classList.add('matched', 'correct');
          defEl.classList.add('matched', 'correct');
          matched.add(selectedWordIdx);
        } else {
          selectedWord.classList.add('matched', 'incorrect');
          defEl.classList.add('matched', 'incorrect');
          setTimeout(() => {
            selectedWord.classList.remove('matched', 'incorrect', 'selected');
            defEl.classList.remove('matched', 'incorrect', 'selected');
          }, 900);
        }
        wordEls.forEach(e => e.classList.remove('selected'));
        selectedWord = null; selectedWordIdx = null;

        if (matched.size === pairs.length && OWL.Progress) {
          OWL.Progress.setBlock(block.id, { completed: true });
        }
      });
      defCol.appendChild(defEl);
    });

    c.appendChild(grid);
    return wrap(c);
  }

  function renderTranslation(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedAnswers = saved.answers || {};

    (d.items || []).forEach((item, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:16px;';
      const plRow = el('p', '', item.pl);
      plRow.style.cssText = 'font-weight:600;margin-bottom:6px;font-size:.93rem;';
      div.appendChild(plRow);
      if (item.hint) {
        const hint = el('p', '', '💡 ' + item.hint);
        hint.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-bottom:4px;font-style:italic;';
        div.appendChild(hint);
      }
      const ta = document.createElement('textarea');
      ta.className = 'own-textarea';
      ta.style.minHeight = '52px';
      ta.placeholder = 'Wpisz tłumaczenie...';
      ta.value = savedAnswers[idx] || '';
      div.appendChild(ta);
      const answerDiv = el('div', '');
      answerDiv.style.cssText = 'background:var(--teal-light);border-radius:8px;padding:10px 14px;font-size:.9rem;color:var(--teal);font-weight:600;margin-top:6px;display:none;';
      answerDiv.textContent = item.en;
      const showBtn = el('button', 'check-btn', 'Pokaż odpowiedź');
      showBtn.style.cssText = 'font-size:.8rem;padding:6px 14px;';
      showBtn.addEventListener('click', () => {
        answerDiv.style.display = 'block';
        showBtn.style.display = 'none';
        const btn = ttsBtn(item.en, lang);
        if (btn) answerDiv.appendChild(btn);
      });
      div.appendChild(showBtn);
      div.appendChild(answerDiv);
      ta.addEventListener('input', () => {
        savedAnswers[idx] = ta.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedAnswers });
      });
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderScramble(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    (d.items || []).forEach((item, idx) => {
      const words = item.sentence.split(' ');
      const shuffled = shuffle(words.slice());

      const div = el('div', '');
      div.style.cssText = 'margin-bottom:20px;';
      if (item.context) {
        const ctx = el('p', '', item.context);
        ctx.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-bottom:6px;font-style:italic;';
        div.appendChild(ctx);
      }

      const chipsArea = el('div', '');
      chipsArea.style.cssText = 'min-height:42px;background:var(--cream);border-radius:8px;padding:6px;display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;border:1.5px dashed var(--border);';

      const bankArea = el('div', '');
      bankArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';

      const fb = feedbackEl();

      const placed = [];

      function makeChip(word, inBank) {
        const chip = el('span', 'drag-chip', word);
        chip.style.cursor = 'pointer';
        chip.addEventListener('click', () => {
          if (inBank) {
            placed.push(word);
            bankArea.removeChild(chip);
            const c2 = makeChip(word, false);
            chipsArea.appendChild(c2);
          } else {
            const i = placed.indexOf(word);
            if (i !== -1) placed.splice(i, 1);
            chipsArea.removeChild(chip);
            const c2 = makeChip(word, true);
            bankArea.appendChild(c2);
          }
        });
        return chip;
      }

      shuffled.forEach(w => bankArea.appendChild(makeChip(w, true)));

      const checkBtn = saveBtn('Sprawdź');
      checkBtn.addEventListener('click', () => {
        const ans = placed.join(' ');
        const correct = ans.trim() === item.sentence.trim();
        showFeedback(fb, correct, correct ? 'Poprawnie! 🎉' : 'Poprawna kolejność: ' + item.sentence);
      });

      div.appendChild(chipsArea);
      div.appendChild(bankArea);
      div.appendChild(checkBtn);
      div.appendChild(fb);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderTransform(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.items || []).forEach((item, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border);';
      div.appendChild(el('p', '', item.original));
      if (item.instruction) {
        const ins = el('p', '', item.instruction);
        ins.style.cssText = 'font-size:.82rem;color:var(--amber);font-weight:600;margin:4px 0;';
        div.appendChild(ins);
      }
      if (item.hint) {
        const hint = el('p', '', '💡 ' + item.hint);
        hint.style.cssText = 'font-size:.78rem;color:var(--ink-60);font-style:italic;margin-bottom:4px;';
        div.appendChild(hint);
      }
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.style.cssText = 'width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:.9rem;margin-bottom:6px;';
      inp.placeholder = 'Wpisz odpowiedź...';
      inp.value = savedA[idx] || '';
      const ansDiv = el('div', '');
      ansDiv.style.cssText = 'background:var(--teal-light);border-radius:8px;padding:8px 12px;font-size:.9rem;color:var(--teal);font-weight:600;display:none;margin-top:4px;';
      ansDiv.textContent = item.answer;
      const checkBtn = el('button', 'check-btn', 'Sprawdź');
      checkBtn.style.cssText = 'font-size:.8rem;padding:6px 14px;';
      checkBtn.addEventListener('click', () => {
        ansDiv.style.display = 'block';
        const correct = inp.value.trim().toLowerCase() === item.answer.trim().toLowerCase();
        inp.style.borderColor = correct ? 'var(--teal)' : 'var(--coral)';
        savedA[idx] = inp.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      inp.addEventListener('input', () => {
        savedA[idx] = inp.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      div.appendChild(inp);
      div.appendChild(checkBtn);
      div.appendChild(ansDiv);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderErrorcorrect(block, opts) {
    const d = block.data;
    const c = card('red');
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction || 'Znajdź i popraw błąd'));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.items || []).forEach((item, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);';
      const orig = el('p', '', item.sentence);
      orig.style.cssText = 'font-size:.93rem;margin-bottom:6px;color:var(--coral);text-decoration:line-through;font-style:italic;';
      div.appendChild(orig);
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.style.cssText = 'width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:.9rem;margin-bottom:6px;';
      inp.placeholder = 'Wpisz poprawne zdanie...';
      inp.value = savedA[idx] || '';
      const ansDiv = el('div', '');
      ansDiv.style.cssText = 'background:var(--teal-light);border-radius:8px;padding:8px 12px;font-size:.9rem;color:var(--teal);font-weight:600;margin-top:4px;display:none;';
      ansDiv.textContent = item.answer;
      if (item.explanation) {
        const exp = el('p', '', item.explanation);
        exp.style.cssText = 'font-size:.8rem;margin-top:4px;font-style:italic;color:var(--teal);';
        ansDiv.appendChild(exp);
      }
      const checkBtn = el('button', 'check-btn', 'Sprawdź');
      checkBtn.style.cssText = 'font-size:.8rem;padding:6px 14px;';
      checkBtn.addEventListener('click', () => {
        ansDiv.style.display = 'block';
        const correct = inp.value.trim().toLowerCase() === item.answer.trim().toLowerCase();
        inp.style.borderColor = correct ? 'var(--teal)' : 'var(--coral)';
        savedA[idx] = inp.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      inp.addEventListener('input', () => {
        savedA[idx] = inp.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      div.appendChild(inp);
      div.appendChild(checkBtn);
      div.appendChild(ansDiv);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderOwnsentences(block, opts) {
    const d = block.data;
    const c = card('purple');
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.structures || []).forEach((struct, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:14px;';
      const label = el('p', '', struct);
      label.style.cssText = 'font-weight:600;font-size:.9rem;color:var(--purple);margin-bottom:4px;';
      const ta = document.createElement('textarea');
      ta.className = 'own-textarea';
      ta.placeholder = 'Napisz własne zdanie...';
      ta.value = savedA[idx] || '';
      ta.addEventListener('input', () => {
        savedA[idx] = ta.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      div.appendChild(label);
      div.appendChild(ta);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderCollocations(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    (d.blocks || []).forEach((blk, bi) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:18px;';
      const kw = el('p', '', blk.keyword);
      kw.style.cssText = 'font-weight:700;font-size:1rem;color:var(--amber);margin-bottom:4px;';
      div.appendChild(kw);
      if (blk.instruction) {
        const ins = el('p', '', blk.instruction);
        ins.style.cssText = 'font-size:.82rem;color:var(--ink-60);margin-bottom:8px;';
        div.appendChild(ins);
      }
      const chipsWrap = el('div', 'colloc-options');
      const chips = [];
      (blk.options || []).forEach(opt => {
        const chip = el('span', 'colloc-chip', opt.word);
        chip.dataset.correct = opt.correct ? '1' : '0';
        chip.dataset.selected = '0';
        chip.addEventListener('click', () => {
          const sel = chip.dataset.selected === '1';
          chip.dataset.selected = sel ? '0' : '1';
          chip.classList.toggle('selected', !sel);
        });
        chips.push(chip);
        chipsWrap.appendChild(chip);
      });
      div.appendChild(chipsWrap);

      const fb = feedbackEl();
      const checkBtn = saveBtn('Sprawdź');
      checkBtn.addEventListener('click', () => {
        let ok = true;
        chips.forEach(chip => {
          const isCorrect = chip.dataset.correct === '1';
          const isSelected = chip.dataset.selected === '1';
          chip.classList.remove('selected', 'correct', 'incorrect');
          if (isCorrect) chip.classList.add('correct');
          else if (isSelected) { chip.classList.add('incorrect'); ok = false; }
          if (isCorrect && !isSelected) ok = false;
        });
        showFeedback(fb, ok, ok ? 'Poprawnie!' : 'Sprawdź zaznaczone opcje');
      });
      if (blk.note) {
        const note = el('p', '', blk.note);
        note.style.cssText = 'font-size:.8rem;color:var(--ink-60);font-style:italic;margin-top:6px;';
        div.appendChild(note);
      }
      div.appendChild(checkBtn);
      div.appendChild(fb);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderWordform(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const cols = d.columns || ['Root', 'Noun', 'Verb', 'Adj', 'Adv'];
    const keys = ['root', 'noun', 'verb', 'adj', 'adv'];

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};
    const allInputs = [];

    const tbl = document.createElement('table');
    tbl.className = 'wordform-table';
    const thead = tbl.createTHead();
    const hrow = thead.insertRow();
    cols.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    const tbody = tbl.createTBody();
    (d.rows || []).forEach((row, ri) => {
      const tr = tbody.insertRow();
      keys.forEach((key, ki) => {
        const td = tr.insertCell();
        const cellData = row[key];
        if (ki === 0) {
          td.textContent = row.root || '';
          td.className = 'wf-given';
        } else if (!cellData || (!cellData.given && !cellData.answer)) {
          td.textContent = '—';
          td.className = 'wf-dash';
        } else if (cellData.given) {
          td.textContent = cellData.given;
          td.className = 'wf-given';
        } else {
          const inp = document.createElement('input');
          inp.className = 'wordform-input';
          inp.placeholder = '...';
          inp.value = (savedA[ri] && savedA[ri][key]) || '';
          inp.dataset.ri = ri;
          inp.dataset.key = key;
          inp.dataset.answer = cellData.answer || '';
          inp.addEventListener('input', () => {
            savedA[ri] = savedA[ri] || {};
            savedA[ri][key] = inp.value;
            if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
          });
          allInputs.push(inp);
          td.appendChild(inp);
        }
      });
    });
    c.appendChild(tbl);

    const fb = feedbackEl();
    const checkBtn = saveBtn('Sprawdź');
    checkBtn.addEventListener('click', () => {
      let correct = 0;
      allInputs.forEach(inp => {
        const ans = (inp.dataset.answer || '').trim().toLowerCase();
        const val = (inp.value || '').trim().toLowerCase();
        inp.style.borderColor = val === ans ? 'var(--teal)' : 'var(--coral)';
        inp.style.color = val === ans ? 'var(--teal)' : 'var(--coral)';
        if (val === ans) correct++;
      });
      showFeedback(fb, correct === allInputs.length, correct + '/' + allInputs.length + ' poprawnych');
    });
    c.appendChild(checkBtn);
    c.appendChild(fb);
    return wrap(c);
  }

  function renderTf(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.items || []).forEach((item, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:14px;';
      const stmt = el('p', '', String(idx + 1) + '. ' + item.statement);
      stmt.style.cssText = 'font-size:.93rem;margin-bottom:6px;font-weight:600;';
      div.appendChild(stmt);

      const btnsWrap = el('div', 'tf-btns');
      const opts2 = ['T', 'F', 'N'];
      const labels = { T: 'True', F: 'False', N: 'Not Mentioned' };
      const tfBtns = [];
      opts2.forEach(opt => {
        const b = el('button', 'tf-btn', labels[opt]);
        b.dataset.val = opt;
        if (savedA[idx] === opt) {
          b.classList.add('selected');
          b.classList.add(opt === item.answer ? 'correct' : 'incorrect');
        }
        b.addEventListener('click', () => {
          if (b.classList.contains('correct') || b.classList.contains('incorrect')) return;
          tfBtns.forEach(x => x.classList.remove('selected', 'correct', 'incorrect'));
          b.classList.add('selected');
          const correct = opt === item.answer;
          b.classList.add(correct ? 'correct' : 'incorrect');
          if (!correct) {
            const correctBtn = tfBtns.find(x => x.dataset.val === item.answer);
            if (correctBtn) correctBtn.classList.add('selected', 'correct');
          }
          savedA[idx] = opt;
          if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
          if (item.explanation && correct) {
            const exp = div.querySelector('.tf-exp');
            if (exp) exp.style.display = 'block';
          }
        });
        tfBtns.push(b);
        btnsWrap.appendChild(b);
      });
      div.appendChild(btnsWrap);
      if (item.explanation) {
        const exp = el('div', 'tf-exp', item.explanation);
        exp.style.cssText = 'font-size:.82rem;color:var(--teal);font-style:italic;margin-top:6px;display:none;';
        div.appendChild(exp);
      }
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderJumble(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    (d.items || []).forEach((item, idx) => {
      const words = item.sentence.split(' ');
      const shuffled = shuffle(words.slice());
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:20px;';

      const answerArea = el('div', '');
      answerArea.style.cssText = 'min-height:40px;background:var(--cream-dark);border-radius:8px;padding:6px;display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;border:1.5px dashed var(--border);';

      const bankArea = el('div', '');
      bankArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';

      const fb = feedbackEl();
      const placed = [];

      function makeChip(word, inBank) {
        const chip = el('span', 'word-chip', word);
        chip.addEventListener('click', () => {
          if (inBank) {
            placed.push(word);
            bankArea.removeChild(chip);
            answerArea.appendChild(makeChip(word, false));
          } else {
            const i = placed.lastIndexOf(word);
            if (i !== -1) placed.splice(i, 1);
            answerArea.removeChild(chip);
            bankArea.appendChild(makeChip(word, true));
          }
        });
        return chip;
      }

      shuffled.forEach(w => bankArea.appendChild(makeChip(w, true)));

      const checkBtn = saveBtn('Sprawdź');
      checkBtn.addEventListener('click', () => {
        const ans = placed.join(' ');
        const correct = ans.trim() === item.sentence.trim();
        showFeedback(fb, correct, correct ? 'Poprawnie!' : 'Poprawne: ' + item.sentence);
      });

      div.appendChild(answerArea);
      div.appendChild(bankArea);
      div.appendChild(checkBtn);
      div.appendChild(fb);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderVic(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.items || []).forEach((item, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:18px;';
      const wordEl = el('strong', '', item.word + ': ');
      wordEl.style.color = 'var(--amber)';
      const sentEl = el('p', '');
      sentEl.appendChild(wordEl);
      sentEl.appendChild(document.createTextNode(item.sentence));
      sentEl.style.cssText = 'font-size:.93rem;margin-bottom:8px;';
      div.appendChild(sentEl);

      const optBtns = [];
      (item.options || []).forEach(opt => {
        const btn = el('button', 'quiz-option', opt);
        optBtns.push(btn);
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          optBtns.forEach(b => {
            b.disabled = true;
            b.classList.remove('correct', 'incorrect');
            if (b.textContent === item.answer) b.classList.add('correct');
            else if (b.textContent === opt) b.classList.add('incorrect');
          });
          savedA[idx] = opt;
          if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
          if (item.explanation) {
            const exp = el('p', '', item.explanation);
            exp.style.cssText = 'font-size:.82rem;color:var(--teal);font-style:italic;margin-top:6px;';
            div.appendChild(exp);
          }
        });
        div.appendChild(btn);
      });

      if (savedA[idx] !== undefined) {
        const saved2 = savedA[idx];
        optBtns.forEach(b => {
          b.disabled = true;
          b.classList.remove('correct', 'incorrect');
          if (b.textContent === item.answer) b.classList.add('correct');
          else if (b.textContent === saved2) b.classList.add('incorrect');
        });
      }

      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderOpenq(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.questions || []).forEach((q, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:16px;';
      const qText = el('p', '', String(idx + 1) + '. ' + q.question);
      qText.style.cssText = 'font-weight:600;font-size:.93rem;margin-bottom:6px;';
      div.appendChild(qText);
      if (q.hint) {
        const hint = el('p', '', '💡 ' + q.hint);
        hint.style.cssText = 'font-size:.8rem;color:var(--ink-60);font-style:italic;margin-bottom:4px;';
        div.appendChild(hint);
      }
      const ta = document.createElement('textarea');
      ta.className = 'own-textarea';
      ta.placeholder = 'Twoja odpowiedź...';
      ta.value = savedA[idx] || '';
      ta.addEventListener('input', () => {
        savedA[idx] = ta.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      div.appendChild(ta);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderSentcomp(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.starters || []).forEach((starter, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:14px;';
      const lbl = el('p', '', starter);
      lbl.style.cssText = 'font-weight:600;font-size:.93rem;color:var(--amber);margin-bottom:4px;';
      const ta = document.createElement('textarea');
      ta.className = 'own-textarea';
      ta.placeholder = 'Dokończ zdanie...';
      ta.value = savedA[idx] || '';
      ta.addEventListener('input', () => {
        savedA[idx] = ta.value;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
      });
      div.appendChild(lbl);
      div.appendChild(ta);
      c.appendChild(div);
    });
    return wrap(c);
  }

  function renderVocabMcq(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedA = saved.answers || {};

    (d.questions || []).forEach((q, idx) => {
      const div = el('div', '');
      div.style.cssText = 'margin-bottom:20px;';
      const qText = el('p', '', String(idx + 1) + '. ' + q.sentence);
      qText.style.cssText = 'font-weight:600;font-size:.93rem;margin-bottom:8px;';
      div.appendChild(qText);

      const optBtns = [];
      (q.options || []).forEach(opt => {
        const btn = el('button', 'quiz-option', opt);
        optBtns.push(btn);
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          optBtns.forEach(b => {
            b.disabled = true;
            b.classList.remove('correct', 'incorrect');
            if (b.textContent === q.answer) b.classList.add('correct');
            else if (b.textContent === opt) b.classList.add('incorrect');
          });
          savedA[idx] = opt;
          if (OWL.Progress) OWL.Progress.setBlock(block.id, { answers: savedA });
          if (q.explanation) {
            const exp = el('p', '', q.explanation);
            exp.style.cssText = 'font-size:.82rem;color:var(--teal);font-style:italic;margin-top:6px;';
            div.appendChild(exp);
          }
        });
        div.appendChild(btn);
      });

      if (savedA[idx] !== undefined) {
        const s = savedA[idx];
        optBtns.forEach(b => {
          b.disabled = true;
          if (b.textContent === q.answer) b.classList.add('correct');
          else if (b.textContent === s) b.classList.add('incorrect');
        });
      }

      c.appendChild(div);
    });
    return wrap(c);
  }

  // ─── VOCAB-SENTCOMP (V1 legacy) ──────────────────────────────────────────────

  function renderVocabSentcomp(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));
    (d.starters || d.items || []).forEach((s, i) => {
      const starter = typeof s === 'string' ? s : (s.starter || s.sentence || '');
      const row = el('div', '');
      row.style.cssText = 'margin-bottom:12px;';
      const lbl = el('p', '', (i + 1) + '. ' + starter);
      lbl.style.cssText = 'font-size:.93rem;font-weight:600;color:var(--amber);margin-bottom:6px;';
      const ta = document.createElement('textarea');
      ta.className = 'write-box'; ta.rows = 2; ta.style.minHeight = '44px';
      ta.placeholder = 'Complete the sentence…';
      row.appendChild(lbl); row.appendChild(ta);
      c.appendChild(row);
    });
    return wrap(c);
  }

  // ─── VOCAB-SCRAMBLE (V1 legacy) ──────────────────────────────────────────────

  function renderVocabScramble(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));
    (d.items || []).forEach((item, i) => {
      const sentence = typeof item === 'string' ? item : (item.sentence || '');
      const context  = typeof item === 'object' ? (item.context || '') : '';
      const words    = sentence.trim().split(/\s+/);
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      const uid2     = 'scr_' + block.id + '_' + i;
      const state    = { words, shuffled, userAnswer: [] };

      const wrap2 = el('div', '');
      wrap2.style.cssText = 'background:var(--cream-dark);border-radius:10px;padding:14px;margin-bottom:12px;';
      if (context) { const ctx = el('div', '', context); ctx.style.cssText = 'font-size:.72rem;color:var(--ink-60);margin-bottom:6px;font-family:monospace;'; wrap2.appendChild(ctx); }

      const ansEl = el('div', ''); ansEl.id = uid2 + '_a';
      ansEl.style.cssText = 'min-height:36px;border:2px dashed var(--border);border-radius:8px;padding:6px 10px;margin-bottom:8px;display:flex;flex-wrap:wrap;gap:6px;font-size:.9rem;';
      const wbEl  = el('div', ''); wbEl.id  = uid2 + '_w';
      wbEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      wrap2.appendChild(ansEl); wrap2.appendChild(wbEl);

      function renderWords() {
        wbEl.innerHTML = ''; ansEl.innerHTML = '';
        state.shuffled.forEach((w, wi) => {
          const used = state.userAnswer.some(a => a.wi === wi);
          const btn = el('button', '', w);
          btn.style.cssText = 'padding:4px 10px;border-radius:6px;border:1.5px solid var(--border);background:' + (used ? 'var(--cream)' : 'white') + ';cursor:' + (used ? 'default' : 'pointer') + ';font-size:.88rem;color:' + (used ? 'var(--ink-40)' : 'var(--ink)') + ';';
          if (!used) btn.addEventListener('click', () => { state.userAnswer.push({wi, word: w}); renderWords(); });
          wbEl.appendChild(btn);
        });
        state.userAnswer.forEach((aw, ai) => {
          const ww = el('span', '', aw.word);
          ww.style.cssText = 'padding:4px 10px;background:var(--amber-light);border-radius:6px;font-size:.88rem;cursor:pointer;';
          ww.addEventListener('click', () => { state.userAnswer.splice(ai, 1); renderWords(); });
          ansEl.appendChild(ww);
        });
      }
      renderWords();

      const chk = el('button', 'save-btn', 'Sprawdź'); chk.style.marginTop = '8px';
      const fb = feedbackEl();
      chk.addEventListener('click', () => {
        const ans = state.userAnswer.map(a => a.word).join(' ');
        showFeedback(fb, ans === sentence, ans === sentence ? 'Poprawnie!' : 'Właściwa odpowiedź: ' + sentence);
      });
      wrap2.appendChild(chk); wrap2.appendChild(fb);
      c.appendChild(wrap2);
    });
    return wrap(c);
  }

  // ─── VOCAB-DISCUSSION (V1 legacy) ────────────────────────────────────────────

  function renderVocabDiscussion(block, opts) {
    const d = block.data;
    const c = card('yellow');
    if (d.title) c.appendChild(blockTitle(d.title));
    (d.questions || []).forEach((q, i) => {
      const qText = typeof q === 'string' ? q : (q.q || q.text || '');
      const qHint = typeof q === 'object' ? (q.hint || '') : '';
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;';
      const num = el('span', '', String(i + 1));
      num.style.cssText = 'width:24px;height:24px;min-width:24px;background:var(--amber);color:var(--ink);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;flex-shrink:0;margin-top:2px;';
      const inner = el('div', '');
      inner.style.cssText = 'font-size:.93rem;line-height:1.55;';
      inner.textContent = qText;
      if (qHint) { const h = el('div', '', qHint); h.style.cssText = 'font-size:.8rem;color:var(--ink-60);margin-top:2px;font-style:italic;'; inner.appendChild(h); }
      row.appendChild(num); row.appendChild(inner);
      c.appendChild(row);
    });
    return wrap(c);
  }

  // ─── FLASHCARDS (SM-2) ───────────────────────────────────────────────────────

  function renderFlashcards(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const items = d.items || [];
    if (!items.length) return wrap(c);

    // Sort: due first, then new
    const getSRS = key => (OWL.Progress ? OWL.Progress.getSRS(key) : null);
    const setSRS = (key, data) => { if (OWL.Progress) OWL.Progress.setSRS(key, data); };

    const orderedItems = items
      .map((item, i) => ({ item, i, card: getSRS(block.id + ':' + i) }))
      .sort((a, b) => {
        const aDue = OWL.SRS.isDue(a.card);
        const bDue = OWL.SRS.isDue(b.card);
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        return 0;
      });

    let currentIdx = 0;
    let flipped = false;
    let reversed = false;   // false = word→def, true = def→word

    const total = orderedItems.length;
    const counterEl = el('div', 'fc-counter', '');
    const progressBar = el('div', 'fc-progress-bar');
    const progressFill = el('div', 'fc-progress-fill');
    progressFill.style.width = '0%';
    progressBar.appendChild(progressFill);

    // Direction toggle
    const dirBtn = el('button', 'fc-dir-btn', '⇄ word → translation');
    dirBtn.title = 'Swap card direction';
    dirBtn.addEventListener('click', () => {
      reversed = !reversed;
      dirBtn.textContent = reversed ? '⇄ translation → word' : '⇄ word → translation';
      updateCard();
    });

    const scene = el('div', 'flashcard-scene');
    const fcEl  = el('div', 'flashcard');
    const front = el('div', 'flashcard-front');
    const back  = el('div', 'flashcard-back');
    fcEl.appendChild(front);
    fcEl.appendChild(back);
    scene.appendChild(fcEl);

    const ratingWrap = el('div', 'fc-rating');
    ratingWrap.style.display = 'none';

    const doneScreen = el('div', 'fc-done-screen');
    doneScreen.style.display = 'none';
    doneScreen.appendChild(el('div', 'fc-done-emoji', '🦉'));
    doneScreen.appendChild(el('h3', '', 'Great job!'));
    doneScreen.appendChild(el('p', '', 'All cards reviewed.'));

    const srsLabel = el('div', '');
    srsLabel.style.cssText = 'text-align:center;font-size:.75rem;color:var(--ink-30);margin-bottom:.5rem;';

    function updateCard() {
      if (currentIdx >= orderedItems.length) {
        scene.style.display = 'none';
        ratingWrap.style.display = 'none';
        srsLabel.style.display = 'none';
        doneScreen.style.display = 'block';
        return;
      }
      const { item, i, card: cardData } = orderedItems[currentIdx];
      flipped = false;
      fcEl.classList.remove('flipped');
      clearChildren(front);
      clearChildren(back);

      if (!reversed) {
        // Normal: word on front, definition on back
        if (item.emoji) front.appendChild(el('div', 'fc-emoji', item.emoji));
        front.appendChild(el('div', 'fc-word', item.word));
        front.appendChild(el('div', 'fc-hint', 'click to reveal'));
        const ttsF = ttsBtn(item.word, lang);
        if (ttsF) front.appendChild(ttsF);

        back.appendChild(el('div', 'fc-def', item.definition || ''));
        if (item.example) back.appendChild(el('div', 'fc-ex', item.example));
        const ttsB = ttsBtn(item.definition || item.word, lang);
        if (ttsB) back.appendChild(ttsB);
      } else {
        // Reversed: definition on front, word on back
        front.appendChild(el('div', 'fc-def', item.definition || ''));
        if (item.example) front.appendChild(el('div', 'fc-ex', item.example));
        front.appendChild(el('div', 'fc-hint', 'click to reveal'));

        if (item.emoji) back.appendChild(el('div', 'fc-emoji', item.emoji));
        back.appendChild(el('div', 'fc-word', item.word));
        const ttsB = ttsBtn(item.word, lang);
        if (ttsB) back.appendChild(ttsB);
      }

      counterEl.textContent = (currentIdx + 1) + ' / ' + total;
      progressFill.style.width = Math.round((currentIdx / total) * 100) + '%';
      srsLabel.textContent = OWL.SRS.dueLabel(cardData);
      ratingWrap.style.display = 'none';
    }

    scene.addEventListener('click', () => {
      flipped = !flipped;
      fcEl.classList.toggle('flipped', flipped);
      if (flipped) ratingWrap.style.display = 'flex';
    });

    const ratings = [
      { cls: 'btn-blackout', label: "Don't know", q: 1 },
      { cls: 'btn-hard',     label: 'Hard',       q: 3 },
      { cls: 'btn-good',     label: 'Good',       q: 4 },
      { cls: 'btn-easy',     label: 'Easy',       q: 5 }
    ];
    ratings.forEach(({ cls, label, q }) => {
      const btn = el('button', cls, label);
      btn.addEventListener('click', () => {
        if (!flipped) return;
        const { i, card: cardData } = orderedItems[currentIdx];
        const key = block.id + ':' + i;
        const newCardData = OWL.SRS.calc(cardData || {}, q);
        setSRS(key, newCardData);
        currentIdx++;
        updateCard();
      });
      ratingWrap.appendChild(btn);
    });

    c.appendChild(counterEl);
    c.appendChild(dirBtn);
    c.appendChild(progressBar);
    c.appendChild(srsLabel);
    c.appendChild(scene);
    c.appendChild(ratingWrap);
    c.appendChild(doneScreen);

    updateCard();
    return wrap(c);
  }

  // ─── SPEAKING BLOCKS ─────────────────────────────────────────────────────────

  function renderConversation(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card('teal');
    if (d.title) c.appendChild(blockTitle(d.title));

    (d.prompts || []).forEach((p, idx) => {
      const sc = el('div', 'speak-card');
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;';
      const num = el('span', 'speak-num', String(idx + 1));
      const qWrap = el('div', '');
      qWrap.style.flex = '1';

      const qEl = el('p', '', p.q);
      qEl.style.cssText = 'font-weight:700;font-size:.95rem;margin-bottom:2px;';
      qWrap.appendChild(qEl);

      if (p.qEn) {
        const qEn = el('p', '', p.qEn);
        qEn.style.cssText = 'font-size:.82rem;color:var(--ink-60);font-style:italic;margin-bottom:4px;';
        qWrap.appendChild(qEn);
      }

      const ttsQ = ttsBtn(p.q, 'pl-PL');
      if (ttsQ) qWrap.appendChild(ttsQ);

      if (p.image) {
        const imgW = imgEl(p.image);
        imgW.style.marginTop = '8px';
        qWrap.appendChild(imgW);
      }

      row.appendChild(num);
      row.appendChild(qWrap);
      sc.appendChild(row);

      // Hidden answer
      const ansDiv = el('div', '');
      ansDiv.style.cssText = 'background:var(--teal-light);border-radius:8px;padding:10px 14px;font-size:.9rem;color:var(--teal);font-weight:600;margin-top:6px;display:none;';
      ansDiv.textContent = p.answer;
      const ttsA = ttsBtn(p.answer, lang);
      if (ttsA) ansDiv.appendChild(ttsA);

      const showBtn = el('button', 'check-btn', 'Pokaż odpowiedź');
      showBtn.style.cssText = 'font-size:.8rem;padding:6px 14px;margin-top:6px;';
      showBtn.addEventListener('click', () => {
        ansDiv.style.display = 'block';
        showBtn.style.display = 'none';
      });

      sc.appendChild(showBtn);
      sc.appendChild(ansDiv);
      c.appendChild(sc);
    });
    return wrap(c);
  }

  function renderWarmup(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card('green');
    if (d.title) c.appendChild(blockTitle(d.title));

    (d.sentences || []).forEach((s, idx) => {
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);font-size:.95rem;';
      const num = el('span', '', String(idx + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--teal);min-width:24px;';
      const txt = el('span', '', s);
      txt.style.flex = '1';
      row.appendChild(num);
      row.appendChild(txt);
      const btn = ttsBtn(s, lang);
      if (btn) row.appendChild(btn);
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderHotseats(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card('orange');
    if (d.title) c.appendChild(blockTitle(d.title));

    const timerSec = d.timer || 30;
    const timerDisplay = el('div', 'timer-display', formatTime(timerSec));
    let timerInterval = null;
    let remaining = timerSec;

    const timerRow = el('div', '');
    timerRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;';
    timerRow.appendChild(timerDisplay);

    const startBtn = el('button', 'check-btn', 'Start timer');
    startBtn.style.marginTop = '0';
    startBtn.addEventListener('click', () => {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; startBtn.textContent = 'Start timer'; timerDisplay.className = 'timer-display'; remaining = timerSec; timerDisplay.textContent = formatTime(remaining); return; }
      remaining = timerSec;
      timerDisplay.className = 'timer-display running';
      startBtn.textContent = 'Zatrzymaj';
      timerInterval = setInterval(() => {
        remaining--;
        timerDisplay.textContent = formatTime(remaining);
        if (remaining <= 0) {
          clearInterval(timerInterval); timerInterval = null;
          timerDisplay.className = 'timer-display finished';
          timerDisplay.textContent = 'CZAS!';
          startBtn.textContent = 'Start timer';
        }
      }, 1000);
    });
    timerRow.appendChild(startBtn);
    c.appendChild(timerRow);

    (d.questions || []).forEach((q, idx) => {
      const qText = typeof q === 'string' ? q : (q.q || q.text || q.question || '');
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:.93rem;';
      const num = el('span', '', String(idx + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--amber);min-width:24px;';
      const txt = el('span', '', qText);
      txt.style.flex = '1';
      row.appendChild(num);
      row.appendChild(txt);
      const btn = ttsBtn(qText, lang);
      if (btn) row.appendChild(btn);
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderOpinions(block, opts) {
    const d = block.data;
    const lang = opts.ttsLang || 'en-GB';
    const c = card('purple');
    if (d.title) c.appendChild(blockTitle(d.title));

    (d.cards || []).forEach(cardItem => {
      const text = cardItem.statement || cardItem.text || '';
      const note = cardItem.hint || cardItem.prompt || '';
      const sc = el('div', 'speak-card');
      const stmtEl = el('p', '', text);
      stmtEl.style.cssText = 'font-weight:700;font-size:1rem;margin-bottom:6px;';
      sc.appendChild(stmtEl);
      const btn = ttsBtn(text, lang);
      if (btn) sc.appendChild(btn);
      if (note) {
        const hint = el('p', '', '💡 ' + note);
        hint.style.cssText = 'font-size:.82rem;color:var(--ink-60);margin-top:6px;font-style:italic;';
        sc.appendChild(hint);
      }
      c.appendChild(sc);
    });
    return wrap(c);
  }

  function renderWyr(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));

    (d.questions || []).forEach(q => {
      const wrapper = el('div', 'wyr-wrap');
      const optA = el('div', 'wyr-option', q.a);
      const vs = el('div', 'wyr-vs', 'VS');
      const optB = el('div', 'wyr-option', q.b);
      wrapper.appendChild(optA);
      wrapper.appendChild(vs);
      wrapper.appendChild(optB);
      c.appendChild(wrapper);
      if (q.hint) {
        const hint = el('p', '', '💡 ' + q.hint);
        hint.style.cssText = 'font-size:.82rem;color:var(--ink-60);margin-bottom:12px;font-style:italic;text-align:center;';
        c.appendChild(hint);
      }
    });
    return wrap(c);
  }

  function renderRanking(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));
    if (d.instruction) c.appendChild(instrBanner(d.instruction));

    const items = (d.items || []).slice();
    const list = el('div', '');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

    let dragSrc = null;

    function buildList(arr) {
      clearChildren(list);
      arr.forEach((item, idx) => {
        const row = el('div', 'drag-chip');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:white;border:1.5px solid var(--border);cursor:grab;user-select:none;';
        row.draggable = true;
        row.dataset.idx = idx;
        const grip = el('span', '', '⣿');
        grip.style.cssText = 'color:var(--ink-30);font-size:1.1rem;';
        const num = el('span', '', String(idx + 1) + '.');
        num.style.cssText = 'font-weight:700;color:var(--amber);min-width:24px;';
        const txt = el('span', '', item);
        txt.style.flex = '1';
        row.appendChild(grip);
        row.appendChild(num);
        row.appendChild(txt);

        row.addEventListener('dragstart', e => { dragSrc = idx; row.style.opacity = '.4'; });
        row.addEventListener('dragend', () => { row.style.opacity = '1'; });
        row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drag-over'); });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', e => {
          e.preventDefault();
          row.classList.remove('drag-over');
          if (dragSrc === null || dragSrc === idx) return;
          const moved = arr.splice(dragSrc, 1)[0];
          arr.splice(idx, 0, moved);
          buildList(arr);
          if (OWL.Progress) OWL.Progress.setBlock(block.id, { order: arr });
        });

        list.appendChild(row);
      });
    }

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const savedOrder = saved.order || items;
    buildList(savedOrder);
    c.appendChild(list);
    return wrap(c);
  }

  function renderDebate(block, opts) {
    const d = block.data;
    const c = card('red');
    if (d.title) c.appendChild(blockTitle(d.title));

    if (d.timer) {
      const timerSec = d.timer;
      const timerDisplay = el('div', 'timer-display', formatTime(timerSec));
      let timerInterval = null;
      let remaining = timerSec;
      const timerRow = el('div', '');
      timerRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;';
      const startBtn = el('button', 'check-btn', 'Start timer');
      startBtn.style.marginTop = '0';
      startBtn.addEventListener('click', () => {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; startBtn.textContent = 'Start timer'; timerDisplay.className = 'timer-display'; remaining = timerSec; timerDisplay.textContent = formatTime(remaining); return; }
        remaining = timerSec;
        timerDisplay.className = 'timer-display running';
        startBtn.textContent = 'Zatrzymaj';
        timerInterval = setInterval(() => {
          remaining--;
          timerDisplay.textContent = formatTime(remaining);
          if (remaining <= 0) { clearInterval(timerInterval); timerInterval = null; timerDisplay.className = 'timer-display finished'; timerDisplay.textContent = 'CZAS!'; startBtn.textContent = 'Start timer'; }
        }, 1000);
      });
      timerRow.appendChild(timerDisplay);
      timerRow.appendChild(startBtn);
      c.appendChild(timerRow);
    }

    (d.motions || []).forEach((motion, idx) => {
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);';
      const num = el('span', '', String(idx + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--coral);min-width:24px;flex-shrink:0;';
      const txt = el('span', '', motion);
      txt.style.cssText = 'font-size:.93rem;font-weight:600;line-height:1.5;';
      row.appendChild(num);
      row.appendChild(txt);
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderMonologue(block, opts) {
    const d = block.data;
    const c = card('amber');
    if (d.title) c.appendChild(blockTitle(d.title));

    const timerSec = d.timer || 60;
    const timerDisplay = el('div', 'timer-display', formatTime(timerSec));
    let timerInterval = null;
    let remaining = timerSec;
    const timerRow = el('div', '');
    timerRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px;';
    const startBtn = el('button', 'check-btn', 'Start timer');
    startBtn.style.marginTop = '0';
    startBtn.addEventListener('click', () => {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; startBtn.textContent = 'Start timer'; timerDisplay.className = 'timer-display'; remaining = timerSec; timerDisplay.textContent = formatTime(remaining); return; }
      remaining = timerSec;
      timerDisplay.className = 'timer-display running';
      startBtn.textContent = 'Zatrzymaj';
      timerInterval = setInterval(() => {
        remaining--;
        timerDisplay.textContent = formatTime(remaining);
        if (remaining <= 0) { clearInterval(timerInterval); timerInterval = null; timerDisplay.className = 'timer-display finished'; timerDisplay.textContent = 'CZAS!'; startBtn.textContent = 'Restart'; }
      }, 1000);
    });
    timerRow.appendChild(timerDisplay);
    timerRow.appendChild(startBtn);
    c.appendChild(timerRow);

    (d.prompts || []).forEach((p, idx) => {
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.93rem;';
      const num = el('span', '', String(idx + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--amber);min-width:24px;';
      const txt = el('span', '', p);
      txt.style.flex = '1';
      row.appendChild(num);
      row.appendChild(txt);
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderPairs(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));

    const tbl = document.createElement('table');
    tbl.className = 'pairs-table';
    const thead = tbl.createTHead();
    const hrow = thead.insertRow();
    ['Rola A', 'Rola B', 'Sytuacja'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    const tbody = tbl.createTBody();
    (d.activities || []).forEach((act, ri) => {
      const tr = tbody.insertRow();
      if (ri % 2 === 1) tr.style.background = 'var(--cream)';
      [act.roleA, act.roleB, act.situation].forEach(text => {
        const td = tr.insertCell();
        td.textContent = text || '';
        td.style.cssText = 'padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:top;font-size:.9rem;';
      });
    });
    c.appendChild(tbl);
    return wrap(c);
  }

  function renderIdiomtasks(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));

    if (d.idioms && d.idioms.length) {
      const idiomWrap = el('div', '');
      idiomWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;';
      d.idioms.forEach(idiom => {
        const chip = el('span', 'chip amber', idiom);
        idiomWrap.appendChild(chip);
      });
      c.appendChild(idiomWrap);
    }

    (d.tasks || []).forEach((task, idx) => {
      const row = el('div', '');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.9rem;';
      const num = el('span', '', String(idx + 1) + '.');
      num.style.cssText = 'font-weight:700;color:var(--amber);min-width:24px;flex-shrink:0;';
      row.appendChild(num);
      row.appendChild(el('span', '', task.task || task));
      c.appendChild(row);
    });
    return wrap(c);
  }

  function renderIdiomstory(block, opts) {
    const d = block.data;
    const c = card('purple');
    if (d.title) c.appendChild(blockTitle(d.title));

    if (d.idioms && d.idioms.length) {
      const h4 = el('h4', '', 'Użyj tych idiomów:');
      h4.style.cssText = 'font-size:.85rem;font-weight:700;color:var(--purple);margin-bottom:8px;';
      c.appendChild(h4);
      const idiomWrap = el('div', '');
      idiomWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;';
      d.idioms.forEach(idiom => {
        const chip = el('span', 'chip', idiom);
        chip.style.background = 'var(--purple-light)';
        chip.style.color = 'var(--purple)';
        idiomWrap.appendChild(chip);
      });
      c.appendChild(idiomWrap);
    }

    if (d.starters && d.starters.length) {
      const h4 = el('h4', '', 'Zacznij od:');
      h4.style.cssText = 'font-size:.85rem;font-weight:700;color:var(--purple);margin-bottom:8px;';
      c.appendChild(h4);
      d.starters.forEach((s, idx) => {
        const row = el('div', '');
        row.style.cssText = 'font-size:.93rem;font-style:italic;color:var(--ink-60);margin-bottom:6px;';
        row.textContent = (idx + 1) + '. ' + s;
        c.appendChild(row);
      });
    }
    return wrap(c);
  }

  // ─── MISC BLOCKS ─────────────────────────────────────────────────────────────

  function renderChecklist(block, opts) {
    const d = block.data;
    const c = card();
    if (d.title) c.appendChild(blockTitle(d.title));

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const checked = saved.checked || {};

    (d.items || []).forEach((item, idx) => {
      const label = el('label', '');
      label.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:.93rem;';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!checked[idx];
      cb.style.cssText = 'width:18px;height:18px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;';
      cb.addEventListener('change', () => {
        checked[idx] = cb.checked;
        if (OWL.Progress) OWL.Progress.setBlock(block.id, { checked });
        const txt = label.querySelector('span');
        if (txt) txt.style.textDecoration = cb.checked ? 'line-through' : '';
      });
      const txt = el('span', '', item);
      if (cb.checked) txt.style.textDecoration = 'line-through';
      label.appendChild(cb);
      label.appendChild(txt);
      c.appendChild(label);
    });
    return wrap(c);
  }

  function renderHwWrite(block, opts) {
    const d = block.data;
    const c = card('purple');
    const h = blockTitle(d.title || 'Zadanie pisemne');
    c.appendChild(h);

    if (d.prompt) {
      const p = el('p', '', d.prompt);
      p.style.cssText = 'font-size:.95rem;line-height:1.7;margin:10px 0 14px;';
      c.appendChild(p);
    }

    const saved = OWL.Progress ? (OWL.Progress.getBlock(block.id) || {}) : {};
    const ta = document.createElement('textarea');
    ta.className = 'own-textarea';
    ta.style.minHeight = '120px';
    ta.placeholder = 'Wpisz swoją odpowiedź...';
    ta.value = saved.text || '';
    c.appendChild(ta);

    const fb = feedbackEl();
    const btn = saveBtn('Zapisz');
    btn.addEventListener('click', () => {
      if (OWL.Progress) OWL.Progress.setBlock(block.id, { text: ta.value });
      showFeedback(fb, true, 'Zapisano!');
    });
    ta.addEventListener('input', () => {
      if (OWL.Progress) OWL.Progress.setBlock(block.id, { text: ta.value });
    });
    c.appendChild(btn);
    c.appendChild(fb);
    return wrap(c);
  }

  // ─── Timer helper ────────────────────────────────────────────────────────────

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return (m > 0 ? String(m) + ':' : '') + (s < 10 ? '0' : '') + String(s);
  }

  // ─── MAIN RENDER FUNCTION ────────────────────────────────────────────────────

  function render(block, opts) {
    opts = opts || {};
    const type = (block.type || '').toLowerCase();
    try {
      switch (type) {
        // Display
        case 'quote':          return renderQuote(block, opts);
        case 'discussion':     return renderDiscussion(block, opts);
        case 'article':        return renderArticle(block, opts);
        case 'glossary':       return renderGlossary(block, opts);
        case 'image':          return renderImage(block, opts);
        case 'html':           return renderHtml(block, opts);
        case 'info':           return renderInfo(block, opts);
        case 'table':          return renderTable(block, opts);
        case 'examples':       return renderExamples(block, opts);
        case 'two-col':        return renderTwoCol(block, opts);
        case 'cta':            return renderCta(block, opts);
        case 'comprehension':  return renderComprehension(block, opts);
        case 'vocab-grid':     return renderVocabGrid(block, opts);
        case 'vocab-table':    return renderVocabTable(block, opts);
        case 'phrases':        return renderPhrases(block, opts);
        // Interactive
        case 'quiz':           return renderQuiz(block, opts);
        case 'gapfill':        return renderGapfill(block, opts);
        case 'matching':       return renderMatching(block, opts);
        case 'translation':    return renderTranslation(block, opts);
        case 'scramble':       return renderScramble(block, opts);
        case 'transform':      return renderTransform(block, opts);
        case 'errorcorrect':   return renderErrorcorrect(block, opts);
        case 'ownsentences':   return renderOwnsentences(block, opts);
        case 'collocations':   return renderCollocations(block, opts);
        case 'wordform':       return renderWordform(block, opts);
        case 'tf':             return renderTf(block, opts);
        case 'jumble':         return renderJumble(block, opts);
        case 'vic':            return renderVic(block, opts);
        case 'openq':          return renderOpenq(block, opts);
        case 'sentcomp':       return renderSentcomp(block, opts);
        case 'vocab-mcq':        return renderVocabMcq(block, opts);
        case 'vocab-sentcomp':   return renderVocabSentcomp(block, opts);
        case 'vocab-scramble':   return renderVocabScramble(block, opts);
        case 'vocab-discussion': return renderVocabDiscussion(block, opts);
        // Flashcards
        case 'flashcards':     return renderFlashcards(block, opts);
        // Speaking
        case 'conversation':   return renderConversation(block, opts);
        case 'warmup':         return renderWarmup(block, opts);
        case 'hotseats':       return renderHotseats(block, opts);
        case 'opinions':       return renderOpinions(block, opts);
        case 'wyr':            return renderWyr(block, opts);
        case 'ranking':        return renderRanking(block, opts);
        case 'debate':         return renderDebate(block, opts);
        case 'monologue':      return renderMonologue(block, opts);
        case 'pairs':          return renderPairs(block, opts);
        case 'idiomtasks':     return renderIdiomtasks(block, opts);
        case 'idiomstory':     return renderIdiomstory(block, opts);
        // Misc
        case 'checklist':      return renderChecklist(block, opts);
        case 'hw-write':       return renderHwWrite(block, opts);
        default: {
          const unknown = el('div', 'block-wrap');
          unknown.style.cssText = 'padding:12px;background:var(--coral-light);border-radius:8px;font-size:.82rem;color:var(--coral);';
          unknown.textContent = 'Nieznany typ bloku: ' + type;
          return unknown;
        }
      }
    } catch (err) {
      const errDiv = el('div', 'block-wrap');
      errDiv.style.cssText = 'padding:12px;background:var(--coral-light);border-radius:8px;font-size:.82rem;color:var(--coral);';
      errDiv.textContent = 'Błąd bloku [' + type + ']: ' + (err && err.message ? err.message : String(err));
      console.error('[OWL.Blocks] render error for block', block, err);
      return errDiv;
    }
  }

  return { render };
})();
