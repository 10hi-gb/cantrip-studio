'use strict';
// Left or Right (P018, original scope): UI. Memory only: no storage, no network, no timers that pick for anyone.
// Every sender-typed string (name, questions, answers, emoji) reaches the screen, aria, live regions, toasts, print and
// copied text only through the shared quote rule (MILLVIEW.typed / MILL.quote). All strings come from Writer copy.js.
(function () {
  var M = window.MILL, V = window.MILLVIEW, L = window.LR;
  var C = COPY;
  var $ = function (id) { return document.getElementById(id); };
  var st = L.blank(), recv = false, answers = [null], cur = 0, edRow = 0;
  var bd = null, scanT = 0, dueT = 0, raf = 0, armT = 0, armed = true, swallowUp = false, lastPtr = -1e9, lastShare = '';
  function now() { return performance.now(); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function typed(s, cls) { return V.typed(L.clean(s), cls); }
  // Creative's quote styling (board tiles + question, chosen screen, From line, recipient intro): the shared typed() text
  // stays whole in a visually hidden span (one text node: screen readers, the accessibility tree, find and copy get “…”),
  // and the visible copy is CSS generated content with empty alt text, so the marks can be styled (0.8em, 70% ink, hung)
  // without splitting the text in the accessibility tree and without being read twice.
  function typedVis(s) { var t = typed(s), w = el('span', 'lr-tv'), sr = el('span', 'lr-sr'), v = el('span', 'lr-vis'), x = t.textContent, q = x.length >= 2 && x[0] === '\u201C' && x[x.length - 1] === '\u201D';
    function part(cls, val) { var e = el('span', cls); e.setAttribute('data-v', val); v.appendChild(e); }
    sr.appendChild(t); if (q) part('lr-qm lr-qo', '\u201C'); part('lr-vt', q ? x.slice(1, -1) : x); if (q) part('lr-qm lr-qc', '\u201D');
    w.appendChild(sr); w.appendChild(v); return w; }
  function qt(s) { return M.quote(L.clean(s)); }
  // Writer template -> nodes; values may be strings or nodes (typed values are already-quoted nodes).
  function tpl(t, v) { var f = document.createDocumentFragment(), re = /\{(\w+)\}/g, last = 0, m;
    while ((m = re.exec(t))) { if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index))); var x = v[m[1]]; f.appendChild(x == null ? document.createTextNode(m[0]) : typeof x === 'object' ? x : document.createTextNode(String(x))); last = re.lastIndex; }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last))); return f; }
  function put(e, f) { e.textContent = ''; e.appendChild(f); }
  function toast(m) { V.toast(m); }
  // PM 04:57: every history write is origin + path (+ #fragment) only; an appended ?query is never kept or carried on
  function bare(frag) { return location.origin + location.pathname + (frag ? '#' + frag : ''); }
  function clearHash() { if (location.hash || location.search) history.replaceState(null, '', bare('')); }
  function dropQuery() { if (location.search) history.replaceState(null, '', bare(location.hash.replace(/^#/, ''))); }
  function sideLabel(s) { return s === 'l' ? C.leftSide : C.rightSide; }

  // ---------- screens
  function screen(n) { $('s1').hidden = n !== 1; $('s2').hidden = n !== 2; $('s3').hidden = n !== 3; if (n !== 2) stopBoard(); window.scrollTo(0, 0); }

  // ---------- editor
  var FIELDS = [['q', 'questionLabel', 'questionPlaceholder'], ['l', 'leftLabel', 'leftPlaceholder'], ['r', 'rightLabel', 'rightPlaceholder']];
  function rowNode(x, i, n) {
    var fs = el('fieldset', 'lr-q'), lg = el('legend', 'lr-qn', M.fill(C.fromLineAnon, { i: i + 1, n: n })); fs.appendChild(lg); fs.id = 'row-' + i;
    function field(f, lab, ph, wrap) {
      var d = el('div', 'lr-field lr-f-' + f), l = el('label', null, C[lab]), inp = el('input'); l.htmlFor = inp.id = f + '-' + i; l.id = 'l-' + f + '-' + i; inp.type = 'text'; inp.autocomplete = 'off'; inp.value = x[f]; if (ph && i === 0) inp.placeholder = C[ph];
      if (f === 'l') inp.className = 'chip-l'; if (f === 'r') inp.className = 'chip-r';
      d.appendChild(l); d.appendChild(inp); var e = el('span', 'lr-err'); e.id = 'e-' + f + '-' + i; d.appendChild(e); (wrap || fs).appendChild(d); return d;
    }
    field('q', 'questionLabel', 'questionPlaceholder');
    var pair = el('div', 'pair');
    ['l', 'r'].forEach(function (s) { var col = el('div', 'lr-side'); field(s, s === 'l' ? 'leftLabel' : 'rightLabel', s === 'l' ? 'leftPlaceholder' : 'rightPlaceholder', col);
      var d = field(s + 'e', 'emojiLabel', null, col), inp = d.querySelector('input'); inp.className = 'lr-emoji'; inp.setAttribute('aria-labelledby', 'l-' + s + '-' + i + ' l-' + s + 'e-' + i); inp.setAttribute('aria-describedby', 'eh-' + i); pair.appendChild(col); });
    fs.appendChild(pair); var h = el('p', 'lr-fine', C.emojiHint); h.id = 'eh-' + i; fs.appendChild(h);
    if (n > 1) { var rm = el('button', 'btn btn-ghost lr-rm', C.removeQuestion); rm.type = 'button'; rm.id = 'rm-' + i; rm.setAttribute('data-i', i); fs.appendChild(rm); }
    return fs;
  }
  function renderRows() { var box = $('qs'); box.textContent = ''; st.qs.forEach(function (x, i) { box.appendChild(rowNode(x, i, st.qs.length)); });
    $('add').hidden = false; $('add').disabled = !L.canAdd(st); $('qcount').textContent = L.canAdd(st) ? M.plural(C.questionCount, st.qs.length) : M.fill(C.tooManyQuestions, { max: L.LIM.qMax }); preview(); }
  function renderMode() {
    ['tap', 'switch', 'hold'].forEach(function (m) { $('m-' + m).setAttribute('aria-pressed', String(st.mode === m)); });
    $('sw-set').hidden = st.mode !== 'switch'; $('hold-set').hidden = st.mode !== 'hold'; $('every-f').hidden = st.scan === 'step';
    var anyOpt = $('key').querySelector('option[value=any]'); anyOpt.disabled = st.scan === 'step'; if (st.scan === 'step' && st.key === 'any') st.key = 'space';
    $('key').value = st.key; $('scan').value = st.scan; $('every').value = String(st.every); $('dwell').value = String(st.dwell);
  }
  function options() {
    function fill(id, list) { var s = $(id); s.textContent = ''; list.forEach(function (o) { var e = el('option', null, o[1]); e.value = o[0]; s.appendChild(e); }); }
    fill('key', L.KEYS.map(function (k) { return [k, C.switchKeys[k]]; })); fill('scan', L.SCANS.map(function (k) { return [k, C.scanModes[k]]; }));
    fill('every', L.EVERY.map(function (t) { return [String(t), L.secondsText(C.scanEvery, t)]; })); fill('dwell', L.DWELL.map(function (t) { return [String(t), L.secondsText(C.holdFor, t)]; }));
  }
  function errText(e) {
    if (e.why === 'empty') return e.f === 'q' ? C.questionEmpty : C.answerEmpty;
    if (e.why === 'emoji') return C.emojiBad;
    return M.plural(e.f === 'q' || e.f === 'from' ? C.questionTooLong : C.answerTooLong, e.over);
  }
  function fid(e) { return e.f === 'from' ? 'from' : e.f + '-' + e.i; }
  function clearFieldErr(id) { var inp = $(id), e = $('e-' + id); if (!inp) return; inp.removeAttribute('aria-invalid'); if (e) e.textContent = ''; var d = (inp.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== 'e-' + id; }); if (d.length) inp.setAttribute('aria-describedby', d.join(' ')); else inp.removeAttribute('aria-describedby'); }
  function showErrors() {
    V.clearErrors($('edit'), '.lr-err'); document.querySelectorAll('#edit input').forEach(function (i) { clearFieldErr(i.id); });
    var es = L.errors(st); es.forEach(function (e) { var id = fid(e), inp = $(id), sp = $('e-' + id); if (!inp) return; sp.textContent = errText(e); inp.setAttribute('aria-invalid', 'true');
      var d = (inp.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean); d.unshift('e-' + id); inp.setAttribute('aria-describedby', d.join(' ')); });
    if (es.length) { var f = $(fid(es[0])); V.land(f); return false; } return true;
  }
  // QA local-f66fb8e L10: an edit (or Make a link) in the editor writes the path only, also after a bad link (#garbage)
  function edited(i) { if (!recv) clearHash(); if (i >= 0) answers[i] = null; $('linkbox').hidden = true; preview(); renderAnswers(); }
  // QA local-372ce92 L3: Chrome may break between any two emoji, so a word holding emoji (🍕🍕🍕, 🍕🍕🍕!) goes in an inline
  // block no wider than the line: it moves whole to the next line when it fits there, and only a run wider than the whole
  // line breaks, between emoji (never inside one). The text itself is unchanged for copy and the accessibility tree.
  // QA local-d0ca704 L6: "emoji" is any extended grapheme cluster (Intl.Segmenter, as on the board) holding an
  // Extended_Pictographic or Regional_Indicator code point, so flag pairs (🇬🇧🇫🇷🇯🇵) count too.
  var EMO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
  function hasEmoji(x) { return LRFIT.graphemes(x).some(function (g) { return EMO.test(g); }); }
  function keepEmoji(n) { var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), ts = [], t; while ((t = w.nextNode())) ts.push(t);
    ts.forEach(function (t) { if (!hasEmoji(t.data)) return; var f = document.createDocumentFragment();
      t.data.split(/(\s+)/).forEach(function (x) { if (!x) return; if (hasEmoji(x)) { var b = el('span', 'lr-nb'); b.textContent = x; f.appendChild(b); } else f.appendChild(document.createTextNode(x)); });
      t.parentNode.replaceChild(f, t); }); return n; }
  function preview() {
    var x = st.qs[edRow] || st.qs[0];
    function set(id, v) { var e = $(id); e.textContent = ''; if (L.clean(v)) e.appendChild(keepEmoji(typed(v))); }
    // the preview answers are drawn like the board tiles (QA local-d0ca704 L5): fit.js plans the lines, the page draws them
    function setA(id, v) { var e = $(id); e.textContent = ''; e.style.fontSize = ''; if (L.clean(v)) e.appendChild(typedVis(v)); }
    set('pv-q', x.q); setA('pv-l', x.l); setA('pv-r', x.r); $('pv-la').textContent = '\u25C0 ' + C.leftSide; $('pv-ra').textContent = C.rightSide + ' \u25B6';
    fitPreview();
  }

  // ---------- recipient (read-only) view
  function renderRecv() {
    var n = st.qs.length, from = L.clean(st.from), intro = $('recv-intro');
    if (from) put(intro, n === 1 ? tpl(C.receiverIntroOne, { from: typedVis(from) }) : tpl(C.receiverIntro, { from: typedVis(from), n: n })); else intro.textContent = M.plural(C.receiverIntroAnon, n);
    var ol = $('recv-list'); ol.textContent = '';
    st.qs.forEach(function (x, i) { var li = el('li', 'lr-item'); li.appendChild(el('p', 'lr-qn', M.fill(C.fromLineAnon, { i: i + 1, n: n }))); var qp = el('p', 'lr-iq'); qp.appendChild(typed(x.q)); li.appendChild(qp);
      ['l', 'r'].forEach(function (s) { var p = el('p', 'lr-is lr-is-' + s); var a = typed(L.answerOf(x, s)); var e = L.clean(s === 'l' ? x.le : x.re); put(p, tpl(C.halfAria, { side: sideLabel(s), answer: a })); if (e) { p.appendChild(document.createTextNode(' ')); p.appendChild(typed(e)); } li.appendChild(p); });
      ol.appendChild(li); });
  }

  // ---------- answers (this visit only)
  function renderAnswers() {
    var any = answers.some(function (a) { return a === 'l' || a === 'r'; }); $('answers').hidden = !any; $('ans-fb').hidden = true; if (!any) return;
    var ul = $('ans-list'); ul.textContent = '';
    st.qs.forEach(function (x, i) { var s = answers[i]; if (s !== 'l' && s !== 'r') return; var li = el('li'); put(li, tpl(C.answerListLine, { i: i + 1, question: typed(x.q), answer: typed(L.answerOf(x, s)), side: L.sideWord(C, s) })); ul.appendChild(li); });
  }

  // ---------- the board
  function cfg() { return { mode: st.mode, key: st.key, scan: st.scan, dwell: st.dwell }; }
  function hintText() {
    if (st.mode === 'tap') return C.hint.tap + ' ' + C.hint.keys;
    if (st.mode === 'hold') return M.fill(C.hint.hold, { seconds: L.secondsText(C.holdFor, st.dwell) });
    if (st.scan === 'step') return M.fill(C.hint.switchStep, { stepKey: C.switchKeys[L.stepKey(cfg()) === 'Enter' ? 'enter' : 'space'], selectKey: C.switchKeys[st.key] });
    if (st.key === 'any') return C.hint.switchAny;
    return M.fill(C.hint.switch, { key: C.switchKeys[st.key] });
  }
  // ---------- long answers (Creative r2 + QA local-372ce92 L1; plan in fit.js): spaces and the answer's own hyphens first,
  // largest size from normal down to the 24px floor; only a segment that can't fit alone is broken inside (dictionary point,
  // else 4+4 letters, else between emoji), fewest lines then largest size. fit.js decides every line and the page draws
  // exactly those lines (white-space:pre, no CSS hyphenation). Both halves share one size. The visible copy is CSS
  // generated content with empty alt text; the clean text stays in the DOM (visually hidden), so names, the accessibility
  // tree and copies are untouched.
  var FLOOR = 24, TALL_FLOOR = 30, R = 100, qCache = {};
  function hOver(t) { return t.scrollHeight > t.clientHeight + 1; }
  function px(e, k) { return parseFloat(getComputedStyle(e)[k]) || 0; }
  // QA local-372ce92 (a): the probe sits in a zero-size, clipped wrapper, so measuring never widens the page (a 100px nowrap
  // probe in the box used to overflow it and bring in classic scrollbars mid-plan, shrinking the width being planned)
  function probe(box, fs) { var w = el('span', 'lr-probe-w'), p = el('span', 'lr-probe'); p.style.fontSize = fs + 'px'; w.appendChild(p); box.appendChild(w); return p; }
  function unprobe(p) { var w = p.parentNode; w.parentNode.removeChild(w); }
  function quoteEm(box) { // width of each mark as a fraction of the mark's own size, per font (for the hang margins)
    var cs = getComputedStyle(box), key = cs.fontFamily + '|' + cs.fontWeight + '|' + cs.fontStyle;
    if (!qCache[key]) { var pr = probe(box, R); pr.textContent = '\u201C'; var o = pr.offsetWidth; pr.textContent = '\u201D'; var c = pr.offsetWidth; unprobe(pr); qCache[key] = { o: o / R, c: c / R }; }
    return qCache[key]; }
  function tileOf(box) { return box.closest('.half,.chosen,.qstrip,.lr-pv') || box.parentElement; }
  function extra(q, size, pad) { return { s: Math.max(0, Math.ceil(q.o * 0.8 * size - pad + 1)), e: Math.max(0, Math.ceil(q.c * 0.8 * size - pad + 1)) }; } // the part of a hung mark the tile padding can't hold
  function hang(box, size) { if (!box.getClientRects().length) return; var q = quoteEm(box), t = tileOf(box); box.style.setProperty('--qo', q.o.toFixed(3)); box.style.setProperty('--qc', q.c.toFixed(3));
    box.style.paddingInlineStart = box.style.paddingInlineEnd = ''; var x = extra(q, size || px(box, 'fontSize'), Math.min(px(t, 'paddingLeft'), px(t, 'paddingRight'))); // a full-width line still hangs inside the tile
    box.style.paddingInlineStart = x.s + 'px'; box.style.paddingInlineEnd = x.e + 'px'; }
  function innerOf(box) { var t = box.querySelector('.lr-sr').textContent; return t.length >= 2 && t[0] === '\u201C' && t[t.length - 1] === '\u201D' ? t.slice(1, -1) : t; }
  function lines(box, ls) { box.querySelector('.lr-vt').setAttribute('data-v', ls.join('\n')); }
  function planFor(box, tile, sizes, cwAt) { // measure at R px once per string; widths scale with the size
    lines(box, ['']); box.style.fontSize = ''; box.style.paddingInlineStart = box.style.paddingInlineEnd = ''; hang(box, 0); var q = quoteEm(box), cw = cwAt || box.clientWidth, pr = probe(box, R), padIn = px(tile, 'paddingLeft') + px(tile, 'paddingRight'), padMin = Math.min(px(tile, 'paddingLeft'), px(tile, 'paddingRight'));
    var o = { R: R, avail: function (size) { var x = extra(q, size, padMin); return cw - x.s - x.e; }, sizes: sizes || LRFIT.sizes(px(box, 'fontSize'), FLOOR),
      measure: function (s, f, l) { pr.textContent = s; return { w: pr.offsetWidth, marks: (f ? q.o * 0.8 * R : 0) + (l ? q.c * 0.8 * R : 0), hang: 2 * Math.max(f ? q.o * 0.8 * R : 0, l ? q.c * 0.8 * R : 0) }; } };
    o.full = cw + padIn - 4; // hanging marks may use the tile padding, never the tile edge
    o.ok = function (size, ls) { if (!tile.classList.contains('half') || size <= TALL_FLOOR) return true; box.style.fontSize = size + 'px'; lines(box, ls); var t = hOver(tile); box.style.fontSize = ''; lines(box, ['']); return !t; };
    var r = LRFIT.plan(innerOf(box), o); unprobe(pr); return r; }
  function draw(box, r) { // apply the size and exactly the planned lines
    box.style.fontSize = r.size + 'px'; hang(box, r.size); lines(box, r.lines); box.classList.toggle('lr-shy', r.broken); }
  // QA local-372ce92 (a): the answers are blanked before anything is measured, so the unplanned text can't make the page
  // scroll (with classic scrollbars that took 15px off the width being planned: 24.7px where 26.8px fits at 320x760); if
  // the page width still changes once drawn, plan again once at the new width
  function blank(box) { lines(box, ['']); box.style.fontSize = ''; }
  // if drawing changes the page width (a classic scrollbar comes or goes with the new height), plan once more at the
  // width the drawn page actually has (read before blanking, since blanking would take the scrollbar away again)
  function fitBoard(again) { if ($('s2').hidden) return; hang($('b-q'));
    var a = $('h-l-a'), b = $('h-r-a'), wa = again && a.clientWidth, wb = again && b.clientWidth, vw = (blank(a), blank(b), document.documentElement.clientWidth), ra = planFor(a, $('h-l'), null, wa), rb = planFor(b, $('h-r'), null, wb), m = Math.min(ra.size, rb.size); // one size for both halves, so neither looks favoured
    draw(a, ra.size === m ? ra : planFor(a, $('h-l'), [m], wa)); draw(b, rb.size === m ? rb : planFor(b, $('h-r'), [m], wb));
    if (!again && document.documentElement.clientWidth !== vw) fitBoard(true); }
  function fitChosen(again) { if ($('s3').hidden) return; hang($('c-q')); var a = $('c-a'), wa = again && a.clientWidth, vw = (blank(a), document.documentElement.clientWidth); draw(a, planFor(a, $('s3'), null, wa));
    if (!again && document.documentElement.clientWidth !== vw) fitChosen(true); }
  function fitPreview() { var a = $('pv-l'), b = $('pv-r'); if (!a || !a.getClientRects().length) return; var bx = [a, b].filter(function (e) { return e.querySelector('.lr-vt'); }); if (!bx.length) return;
    bx.forEach(blank); var rs = bx.map(function (e) { return planFor(e, e.parentElement); }), m = Math.min.apply(null, rs.map(function (r) { return r.size; }));
    bx.forEach(function (e, i) { draw(e, rs[i].size === m ? rs[i] : planFor(e, e.parentElement, [m])); }); }
  function refit() { fitBoard(false); fitChosen(false); fitPreview(); }
  function setHi() { ['l', 'r'].forEach(function (s) { $('h-' + s).classList.toggle('scan', st.mode === 'switch' && bd && bd.hi === s); }); }
  function stopBoard() { clearInterval(scanT); clearTimeout(dueT); cancelAnimationFrame(raf); scanT = dueT = raf = 0; ringOff(); }
  function ringOff() { cancelAnimationFrame(raf); raf = 0; ['l', 'r'].forEach(function (s) { var h = $('h-' + s); h.classList.remove('holding'); h.style.removeProperty('--p'); }); }
  function startBoard(i) {
    cur = i; var x = st.qs[i], n = st.qs.length, from = L.clean(st.from);
    if (from) put($('b-from'), tpl(C.fromLine, { from: typedVis(from), i: i + 1, n: n })); else $('b-from').textContent = M.fill(C.fromLineAnon, { i: i + 1, n: n });
    put($('b-q'), typedVis(x.q));
    ['l', 'r'].forEach(function (s) { var h = $('h-' + s), e = L.clean(s === 'l' ? x.le : x.re);
      $('h-' + s + '-s').textContent = s === 'l' ? '\u25C0 ' + C.leftSide : C.rightSide + ' \u25B6';
      put($('h-' + s + '-e'), e ? typedVis(e) : document.createDocumentFragment()); $('h-' + s + '-e').hidden = !e;
      put($('h-' + s + '-a'), typedVis(L.answerOf(x, s))); h.setAttribute('aria-label', M.fill(C.halfAria, { side: sideLabel(s), answer: qt(L.answerOf(x, s)) }) + (e ? ' ' + qt(e) : '')); });
    $('hint').textContent = hintText(); $('b-back').textContent = C.boardBack;
    $('s2').setAttribute('data-mode', st.mode);
    bd = L.board(cfg()); screen(2); setHi(); fitBoard();
    if (st.mode === 'switch') { $('halves').focus({ preventScroll: true }); if (st.scan === 'auto') scanT = setInterval(function () { act(L.boardEvent(bd, { t: 'tick' }).out); }, st.every * 100); }
    else $('h-l').focus({ preventScroll: true });
  }
  function act(out) {
    if (!out) return;
    if (out.move) { setHi(); if (st.mode !== 'switch') $('h-' + out.move).focus({ preventScroll: true }); }
    if (out.holdStart) { ringOff(); $('hint').textContent = hintText(); var h = $('h-' + out.holdStart), t0 = now(), dur = st.dwell * 100; h.classList.add('holding');
      (function step() { var p = Math.min(1, (now() - t0) / dur); h.style.setProperty('--p', p.toFixed(3)); if (p < 1) raf = requestAnimationFrame(step); })();
      clearTimeout(dueT); (function wait(ms) { dueT = setTimeout(function () { var r = L.boardEvent(bd, { t: 'due', at: now() }); if (r.out) act(r.out); else if (bd.hold) wait(Math.max(10, bd.hold.at + dur - now())); }, ms); })(dur); }
    if (out.holdCancel) { clearTimeout(dueT); ringOff(); $('hint').textContent = C.holdCancelled; }
    if (out.choose) chosen(out.choose);
  }
  function chosen(side) {
    stopBoard(); answers[cur] = side; var x = st.qs[cur], last = cur >= st.qs.length - 1, s3 = $('s3');
    s3.classList.remove('l', 'r'); s3.classList.add(side);
    put($('c-q'), typedVis(x.q)); put($('c-a'), typedVis(L.answerOf(x, side))); $('c-tag').textContent = M.fill(C.chosenTag, { side: L.sideWord(C, side) });
    $('c-next').hidden = last; $('c-done').hidden = !last; $('c-done').textContent = C.done; $('c-fb').hidden = true;
    $('live').textContent = M.fill(C.chosenAria, { answer: qt(L.answerOf(x, side)), side: L.sideWord(C, side) });
    screen(3); renderAnswers(); fitChosen(); // the answers list first: it can bring in a page scrollbar (classic scrollbars), which the chosen answer is planned under
    guard(s3); // the press that picked can't also press a button here
    (last ? $('c-send') : $('c-next')).focus({ preventScroll: true });
  }
  // QA local-372ce92 L4, Creative option (b): for 500ms the buttons look exactly as they are (fill, label, border, focus
  // ring); a 3px bar in the label colour sweeps along the inside bottom edge of each (static under reduced motion), the
  // buttons are aria-disabled with cursor:progress, and presses do nothing. Then the bar and aria-disabled go.
  function guardBtns(s3) { return Array.prototype.slice.call(s3.querySelectorAll('.btn')); }
  function guard(s3) { armed = false; clearTimeout(armT); s3.classList.remove('lr-guard'); void s3.offsetWidth; s3.classList.add('lr-guard');
    guardBtns(s3).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
    armT = setTimeout(function () { armed = true; s3.classList.remove('lr-guard'); guardBtns(s3).forEach(function (b) { b.removeAttribute('aria-disabled'); }); }, 500); }
  function sideOf(t) { var h = t && t.closest && t.closest('.half'); return h ? (h.id === 'h-l' ? 'l' : 'r') : null; }
  function boardKeys() {
    document.addEventListener('keydown', function (ev) {
      if ($('s2').hidden || ev.target === $('b-back') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key === ' ' || ev.key === 'Spacebar' ? 'Space' : ev.key, f = sideOf(document.activeElement);
      if (f && st.mode !== 'switch') L.boardEvent(bd, { t: 'focus', side: f });
      var r = L.boardEvent(bd, { t: 'key', key: k, repeat: ev.repeat, at: now() });
      if (r.out || k === 'Space' || k === 'Enter') ev.preventDefault();
      if (r.out && r.out.choose) swallowUp = true; act(r.out);
    });
    document.addEventListener('keyup', function (ev) {
      var k = ev.key === ' ' || ev.key === 'Spacebar' ? 'Space' : ev.key;
      if (swallowUp) { swallowUp = false; ev.preventDefault(); ev.stopPropagation(); return; }
      if ($('s2').hidden || ev.target === $('b-back')) return;
      if (k === 'Space' || k === 'Enter') ev.preventDefault(); act(L.boardEvent(bd, { t: 'keyup', key: k }).out);
    }, true);
    ['h-l', 'h-r'].forEach(function (id) { var h = $(id), side = id === 'h-l' ? 'l' : 'r';
      h.addEventListener('pointerdown', function (ev) { if (ev.button) return; lastPtr = now(); act(L.boardEvent(bd, { t: 'down', side: side, at: now() }).out); });
      h.addEventListener('pointerleave', function () { if (bd && bd.hold && bd.hold.side === side) act(L.boardEvent(bd, { t: 'cancel' }).out); });
      h.addEventListener('focus', function () { if (bd && st.mode !== 'switch') L.boardEvent(bd, { t: 'focus', side: side }); });
      h.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
      h.addEventListener('click', function (ev) { ev.preventDefault(); if (now() - lastPtr < 1000 || $('s2').hidden) return; act(L.boardEvent(bd, { t: 'click', side: side }).out); });
    });
    document.addEventListener('pointerup', function (ev) { if ($('s2').hidden || !bd) return; lastPtr = now(); var t = document.elementFromPoint(ev.clientX, ev.clientY); act(L.boardEvent(bd, { t: 'up', side: sideOf(t) }).out); });
    document.addEventListener('pointercancel', function () { if (!$('s2').hidden && bd) act(L.boardEvent(bd, { t: 'cancel' }).out); });
  }

  // ---------- copy / share with a selectable fallback
  function fallback(boxId, taId, text) { $(boxId).hidden = false; var ta = $(taId); ta.value = text; ta.focus({ preventScroll: false }); ta.select(); }
  function copyText(text, boxId, taId) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(C.copied); }, function () { toast(C.copyFail); fallback(boxId, taId, text); });
    else { toast(C.copyFail); fallback(boxId, taId, text); }
  }
  function makeLink() { if (!recv) clearHash();
    if (!showErrors()) return null; var f = L.rawFragment(st); if (!f) return null; var u = V.linkFor(f);
    if (!u) { $('linkbox').hidden = true; toast(C.tooLongLink); return null; }
    $('linkbox').hidden = false; $('link').value = u; $('link').focus(); $('link').select(); return u;
  }

  // ---------- load (every route: first load and every hashchange)
  function load(hash) {
    stopBoard(); V.clearInputs(document); V.clearErrors(document, '.lr-err'); $('live').textContent = ''; $('banner').hidden = true; $('linkbox').hidden = true;
    recv = false; st = L.blank(); edRow = 0;
    // QA local-372ce92 L2: the 2,000 cap is on the whole received URL (shared MILLVIEW.linkFor), not the fragment alone
    if (hash) { var d = V.linkFor(String(hash).replace(/^#/, '')) ? L.decode(hash) : { ok: false, why: 'tooLong' }; if (d.ok) { st = d.data; recv = true; } else { $('banner-t').textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; $('banner').hidden = false; } }
    answers = st.qs.map(function () { return null; });
    $('edit').hidden = recv; $('recv').hidden = !recv; $('preview').hidden = recv; V.readOnly($('edit'), recv);
    if (recv) renderRecv(); else { $('from').value = st.from; renderRows(); renderMode(); }
    renderAnswers(); screen(1);
  }
  function wire() {
    document.title = C.title + ' \u00B7 ' + C.studioName;
    $('home').textContent = C.backLabel; $('strip').textContent = C.studioLabel; $('title').textContent = C.title; $('lede').textContent = C.invitation;
    ['limit1', 'limit2', 'limit3'].forEach(function (id) { $(id).textContent = C.limitBanner; });
    $('required').textContent = C.requiredLine; $('fair').textContent = C.fairHint; $('l-from').textContent = C.fromLabel;
    $('add').textContent = C.addQuestion; $('l-method').textContent = C.methodLabel; $('m-tap').textContent = C.methods.tap; $('m-switch').textContent = C.methods['switch']; $('m-hold').textContent = C.methods.hold;
    $('helper').textContent = C.helperTapHint; $('l-key').textContent = C.switchKeyLabel; $('l-scan').textContent = C.scanModeLabel; $('l-every').textContent = C.scanSpeedLabel; $('l-dwell').textContent = C.holdTimeLabel;
    $('go').textContent = C.primary; $('mk').textContent = C.makeLink; $('l-link').textContent = C.linkLabel; $('send').textContent = C.share; $('r-go').textContent = C.receiverPrimary;
    $('ans-h').textContent = C.answersHeading; $('ans-note').textContent = C.answersNote; $('copy-ans').textContent = C.copyAnswers; $('print').textContent = C.printLabel; $('l-ans-fbt').textContent = C.copyTextLabel;
    $('reset').textContent = C.reset; $('privacy').textContent = C.privacy;
    $('c-next').textContent = C.nextQuestion; $('c-send').textContent = C.sendBack; $('c-again').textContent = C.askAgain; $('c-back').textContent = C.boardBack; $('l-c-fbt').textContent = C.copyTextLabel;
    options();
    $('from').addEventListener('input', function () { st.from = this.value; clearFieldErr('from'); edited(-1); });
    $('qs').addEventListener('input', function (ev) { var m = /^(q|l|r|le|re)-(\d+)$/.exec(ev.target.id); if (!m) return; var i = +m[2]; st.qs[i][m[1]] = ev.target.value; edRow = i; clearFieldErr(ev.target.id); edited(i); });
    $('qs').addEventListener('focusin', function (ev) { var m = /-(\d+)$/.exec(ev.target.id || ''); if (m && ev.target.tagName === 'INPUT') { edRow = +m[1]; preview(); } });
    $('qs').addEventListener('click', function (ev) { var b = ev.target.closest('.lr-rm'); if (!b) return; var i = +b.getAttribute('data-i'); if (L.removeQuestion(st, i)) { answers.splice(i, 1); edRow = Math.min(edRow, st.qs.length - 1); renderRows(); edited(-1); V.land($('q-' + Math.min(i, st.qs.length - 1))); } });
    $('add').addEventListener('click', function () { if (!L.addQuestion(st)) return; answers.push(null); edRow = st.qs.length - 1; renderRows(); edited(-1); $('q-' + edRow).focus(); });
    ['tap', 'switch', 'hold'].forEach(function (m) { $('m-' + m).addEventListener('click', function () { st.mode = m; renderMode(); edited(-1); }); });
    $('key').addEventListener('change', function () { st.key = this.value; renderMode(); edited(-1); });
    $('scan').addEventListener('change', function () { st.scan = this.value; renderMode(); edited(-1); });
    $('every').addEventListener('change', function () { st.every = +this.value; edited(-1); });
    $('dwell').addEventListener('change', function () { st.dwell = +this.value; edited(-1); });
    $('go').addEventListener('click', function () { if (showErrors() && L.ready(st)) startBoard(0); });
    $('r-go').addEventListener('click', function () { startBoard(0); });
    $('mk').addEventListener('click', function () { lastShare = makeLink() || ''; });
    $('send').addEventListener('click', function () { var u = $('link').value; if (!u) return;
      if (navigator.share) navigator.share({ title: C.title, text: C.shareText, url: u }).then(function () {}, function () { toast(C.shareCancel); $('linkbox').hidden = false; $('link').focus(); $('link').select(); });
      else copyText(u, 'linkbox', 'link'); });
    $('copy-ans').addEventListener('click', function () { var t = L.answersCopy(C, st, answers); if (t) copyText(t, 'ans-fb', 'ans-fbt'); });
    $('print').addEventListener('click', function () { window.print(); });
    $('reset').addEventListener('click', function () { if (!window.confirm(C.resetConfirm)) return; clearHash(); load(''); toast(C.resetDone); $('q-0').focus(); });
    $('b-back').addEventListener('click', function () { screen(1); renderAnswers(); ($('answers').hidden ? (recv ? $('r-go') : $('go')) : $('ans-h')).focus(); });
    $('c-back').addEventListener('click', function () { if (!armed) return; screen(1); renderAnswers(); $('ans-h').focus(); });
    $('c-next').addEventListener('click', function () { if (armed) startBoard(cur + 1); });
    $('c-again').addEventListener('click', function () { if (armed) startBoard(cur); });
    $('c-send').addEventListener('click', function () { if (!armed) return; var t = L.answerText(C, st.qs[cur], answers[cur]);
      if (navigator.share) navigator.share({ text: t }).then(function () {}, function () { toast(C.answerShareCancel); fallback('c-fb', 'c-fbt', t); });
      else copyText(t, 'c-fb', 'c-fbt'); });
    boardKeys();
    window.addEventListener('resize', refit); window.addEventListener('orientationchange', refit);
    // QA local-372ce92 (a): the tile faces load on first use, after the first plan; any face that finishes loading clears
    // the cached mark widths and re-plans (fonts.ready alone had already resolved, so the board kept fallback-font widths)
    if (document.fonts) { document.fonts.addEventListener('loadingdone', function () { qCache = {}; refit(); }); if (document.fonts.ready) document.fonts.ready.then(function () { qCache = {}; refit(); });
      ['700 1em Andika', '400 1em Andika', '500 1em "Shantell Sans"', '700 1em "Shantell Sans"', '700 1em "LR Quotes"', '500 1em "LR Quotes"'].forEach(function (f) { document.fonts.load(f, f.indexOf('Quotes') > 0 ? '\u201C\u201D' : 'a').catch(function () {}); }); }
    dropQuery(); V.route(load);
  }
  try { wire(); } catch (e) { document.body.textContent = C.error; throw e; }
})();
