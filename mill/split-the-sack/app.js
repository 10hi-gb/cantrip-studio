'use strict';
// Split the Sack UI. Memory only: state lives in this page and, if the visitor makes one, a link fragment. No storage, no network.
(function () {
  var C = COPY, M = MILL, S = SACK, L = SACKLINK, $ = function (id) { return document.getElementById(id); };
  // mode: 'own' (editor) | 'view' (read-only recipient of a link) | 'change' (recipient's local copy, one household's amount)
  var st, lastLink = '', toastT, mode = 'own', orig = null, pick = -1, V = window.MILLVIEW;
  function blank() { return { n: '', u: '', c: '$', q: '', i: '1', p: '', f: '', b: 'p', x: -1, h: [['', ''], ['', '']] }; }
  function key(k) { return k.split('.').reduce(function (o, p) { return o && o[p]; }, C); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function toast(t) { V.toast(t, 2600); } // shared: route() clears it (QA N2)
  function qName(i) { var n = M.strip(st.h[i][0]); return n ? M.quote(n) : nameOf(i); } // QA D13: typed names quoted in aria too
  function nameOf(i) { return M.strip(st.h[i][0]) || (C.householdLabel + ' ' + (i + 1)); }
  // Sender-typed household names are quoted (shared MILLVIEW.quote) wherever someone else reads them: the recipient view and
  // the copied text. A blank name falls back to the app's own "Household N", which is not typed text and is not quoted.
  // QA local-7b5ceeb D14: one accessor for every place a household name is shown (sender editor included): typed names quoted,
  // the product fallback "Household N" not. nameOf() is only for comparisons, never for display.
  function typedName(i) { return qName(i); }
  function shownName(i) { return qName(i); }
  // QA D10 (reopened): the unit (#u) is free text, so it is shown quoted with the shared rule everywhere it is displayed
  // (row spans, aria, messages, LCD, status, reconcile, assign, notready, copy text, changedWas, amount label, print). unitRaw() for length checks.
  function unitRaw() { return M.strip(st.u); }
  function unit() { var u = unitRaw(); return u ? V.quote(u) : ''; }
  function money(c) { return S.fmtMoney(c, M.strip(st.c)); }
  function staticText() {
    document.querySelectorAll('[data-c]').forEach(function (e) { e.textContent = key(e.getAttribute('data-c')); });
    document.querySelectorAll('[data-ph]').forEach(function (e) { e.placeholder = key(e.getAttribute('data-ph')); });
    document.querySelectorAll('[data-aria]').forEach(function (e) { e.setAttribute('aria-label', key(e.getAttribute('data-aria'))); });
    document.title = C.studioLabel;
  }
  // Text caps counted exactly like the link parser (SACKLINK.glen: grapheme clusters after strip), enforced on the input itself for typing,
  // paste, drop and script-set values. No maxlength: it counts UTF-16 code units (an emoji is 2, a ZWJ family 11). An edit that would go
  // over keeps the text around it and only as much of the inserted text as fits, so a character past the cap is refused. Registered
  // before the state listener, so the state only ever sees a value that fits.
  function capInput(el, max) {
    el._capPrev = el.value; el._capOver = 0;
    el.addEventListener('input', function () { var v = el.value; if (mode !== 'own') return; el._capOver = 0; if (L.glen(v) <= max) { el._capPrev = v; return; }
      el._capOver = L.glen(v) - max; // QA local-7dfd6ac note: a cut edit is never silent; capNotes() shows the field's existing over-cap message
      var a = String(el._capPrev || ''), pre = 0, suf = 0; while (pre < a.length && pre < v.length && a[pre] === v[pre]) pre++; while (suf < a.length - pre && suf < v.length - pre && a[a.length - 1 - suf] === v[v.length - 1 - suf]) suf++;
      var head = a.slice(0, pre), tail = a.slice(a.length - suf), ins = L.graphemes(v.slice(pre, v.length - suf)), keep = '';
      for (var k = 0; k < ins.length && L.glen(head + keep + ins[k] + tail) <= max; k++) keep += ins[k];
      if (L.glen(head + keep + tail) > max) { var g = L.graphemes(v), out = ''; for (var j = 0; j < g.length && L.glen(out + g[j]) <= max; j++) out += g[j]; head = out; keep = ''; tail = ''; }
      el.value = head + keep + tail; el._capPrev = el.value; try { el.setSelectionRange((head + keep).length, (head + keep).length); } catch (er) {} });
  }
  // Over-cap messages for an edit the input cut (Writer's existing strings, same wording as the validator). Shown, never blocking: the value
  // left in the field fits. Cleared by the field's next edit that fits, and by reset / opening a link (toForm).
  function capNotes() {
    var it = [], hh = [], x;
    if ((x = $('item')._capOver)) it.push(C.itemLabel + ' ' + M.plural(C.itemTooLong, x));
    if ((x = $('u')._capOver)) it.push(M.plural(C.unitTooLong, x, { max: L.UNIT_MAX }));
    if ((x = $('c')._capOver)) it.push(M.plural(C.currencyTooLong, x, { max: L.SYM_MAX }));
    [].forEach.call($('hh').querySelectorAll('.ss-hn'), function (e, i) { if (e._capOver) hh.push(qName(i) + ': ' + M.plural(C.householdTooLong, e._capOver)); });
    return { item: it, hh: hh };
  }
  function toForm() {
    $('item').value = st.n; $('u').value = st.u; $('c').value = st.c; $('q').value = st.q; $('inc').value = st.i; $('p').value = st.p; $('f').value = st.f;
    ['item', 'u', 'c'].forEach(function (id) { $(id)._capPrev = $(id).value; $(id)._capOver = 0; });
    basisButtons(); drawHouseholds();
  }
  function drawHouseholds() {
    var ol = $('hh'); ol.textContent = '';
    st.h.forEach(function (x, i) {
      var li = el('li', 'ss-hrow');
      var nf = el('div', 'ss-field'), nl = el('label', null, C.householdLabel + ' ' + (i + 1)), n = el('input');
      n.id = 'hn' + i; nl.htmlFor = n.id; n.value = x[0]; capInput(n, L.NAME_MAX); n.autocomplete = 'off'; n.className = 'ss-hn'; n.placeholder = i === 0 ? C.householdPlaceholder : '';
      n.addEventListener('input', function () { if (mode !== 'own') { n.value = st.h[i][0]; return; } st.h[i][0] = n.value; edited(); }); nf.appendChild(nl); nf.appendChild(n);
      var rf = el('div', 'ss-field'), rlab = el('label', null, C.requestLabel), w = el('div', 'ss-wants'), r = el('input');
      r.id = 'hr' + i; rlab.htmlFor = r.id; r.value = x[1]; r.inputMode = 'decimal'; r.autocomplete = 'off'; r.placeholder = C.requestPlaceholder; r.className = 'sk-rq';
      r.addEventListener('input', function () { if (mode !== 'own') { r.value = st.h[i][1]; return; } st.h[i][1] = r.value; edited(); }); w.appendChild(r); w.appendChild(el('span', 'u sk-unit', unit())); rf.appendChild(rlab); rf.appendChild(w);
      var rm = el('button', 'ss-x sk-x', '×'); rm.type = 'button'; rm.disabled = st.h.length <= S.MIN_H;
      rm.addEventListener('click', function () { if (mode !== 'own') return; st.h.splice(i, 1); if (st.x === i) st.x = -1; else if (st.x > i) st.x--; drawHouseholds(); edited(); ($('hh').querySelectorAll('input')[Math.max(0, (i - 1) * 2)] || $('add')).focus(); });
      li.appendChild(nf); li.appendChild(rf); li.appendChild(rm); ol.appendChild(li);
    });
    $('add').disabled = st.h.length >= S.MAX_H; labels();
  }
  function labels() { // aria labels that depend on current names/unit
    var rows = $('hh').children; for (var i = 0; i < rows.length; i++) { rows[i].querySelector('.sk-rq').setAttribute('aria-label', M.fill(C.requestAria, { name: qName(i), unit: unit() || C.unitLabel })); rows[i].querySelector('.sk-x').setAttribute('aria-label', M.fill(C.removeHousehold, { name: qName(i) })); rows[i].querySelector('.sk-unit').textContent = unit(); }
    $('hcount').textContent = M.plural(C.householdCount, st.h.length);
  }
  // Editing makes the old link a snapshot: clear it from the address bar and the link box.
  function edited() {
    if (location.hash || location.search) history.replaceState(null, '', location.pathname);
    if (lastLink) { lastLink = ''; $('linkbox').hidden = true; }
    $('banner').hidden = true; labels(); render();
  }
  function numErr(v, allowZero, inc) { // -> COPY error string or ''
    v = String(v).trim(); if (v === '') return '';
    if (/^-/.test(v) && /^-\d*\.?\d+$/.test(v)) return C.errorNegative;
    if (!/^(\d+\.?\d*|\.\d+)$/.test(v)) return C.errorNumber;
    if (/^\d{14,}/.test(v)) return C.errorTooBig;
    var q = S.parseQty(v); if (q != null && q > 1e12) return M.fill(C.errorRange, { max: '1000000000' });
    if (q == null) return inc ? M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() }) : C.errorNumber;
    if (!allowZero && q === 0) return C.errorZero;
    if (inc && q % inc) return M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() });
    return '';
  }
  function moneyErr(v) { v = String(v).trim(); if (v === '') return ''; if (/^-/.test(v)) return C.errorNegative; if (S.parseMoney(v) > 1e11) return M.fill(C.errorRange, { max: money(1e11) }); if (S.parseMoney(v) == null) return /^\d{14,}/.test(v) ? C.errorTooBig : C.errorNumber; return ''; }
  function fieldErrors() {
    var e = [], h = [], q = S.parseQty(st.q), inc = S.parseQty(st.i), x;
    if ((x = L.glen(st.n) - L.ITEM_MAX) > 0) e.push(C.itemLabel + ' ' + M.plural(C.itemTooLong, x));
    if ((x = L.glen(unitRaw()) - L.UNIT_MAX) > 0) e.push(M.plural(C.unitTooLong, x, { max: L.UNIT_MAX })); // same count as the link parser
    if ((x = L.glen(st.c) - L.SYM_MAX) > 0) e.push(M.plural(C.currencyTooLong, x, { max: L.SYM_MAX }));
    if ((x = numErr(st.q, false))) e.push(C.packageQtyLabel + ': ' + x);
    if ((x = numErr(st.i, false))) e.push(C.incrementLabel + ': ' + x);
    else if (q && inc && q % inc) e.push(C.packageQtyLabel + ': ' + M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() }));
    if ((x = moneyErr(st.p))) e.push(C.priceLabel + ': ' + x);
    if ((x = moneyErr(st.f))) e.push(C.feeLabel + ': ' + x);
    var seen = {}, dup = false;
    st.h.forEach(function (r, i) {
      var nm = M.strip(r[0]); if ((x = L.glen(nm) - L.NAME_MAX) > 0) h.push(qName(i) + ': ' + M.plural(C.householdTooLong, x));
      if (nm) { if (seen[nm.toLowerCase()]) dup = true; seen[nm.toLowerCase()] = 1; }
      if ((x = numErr(r[1], true, inc > 0 ? inc : 0))) h.push(qName(i) + ': ' + x);
    });
    if (dup) h.push(C.duplicateHousehold);
    return { item: e, hh: h };
  }
  function basisButtons() { $('bp').setAttribute('aria-pressed', String(st.b === 'p')); $('be').setAttribute('aria-pressed', String(st.b === 'e')); }
  var BIN = 'M4 10 L36 10 L33 38 L7 38 Z';
  function bin(qty, Q) { var NS = 'http://www.w3.org/2000/svg', sp = el('span', 'ss-bin'), sv = document.createElementNS(NS, 'svg'); sv.setAttribute('viewBox', '0 0 40 40'); sv.setAttribute('aria-hidden', 'true');
    var h = Q > 0 ? 26 * Math.min(1, 2 * qty / Q) : 0, y = (37 - h).toFixed(1);
    [['path', { 'class': 'b', d: BIN }], ['path', { 'class': 'f', d: 'M6 ' + y + ' L34 ' + y + ' L33 37 L7 37 Z' }], ['rect', { 'class': 'rim', x: 2, y: 7, width: 36, height: 5, rx: 2 }]].forEach(function (p) { var e = document.createElementNS(NS, p[0]); for (var k in p[1]) e.setAttribute(k, p[1][k]); if (p[0] === 'path' && p[1]['class'] === 'f' && h === 0) e.setAttribute('d', 'M6 37 L34 37 L33 37 L7 37 Z'); sv.appendChild(e); });
    sp.appendChild(sv); sp.setAttribute('role', 'presentation'); return sp; }
  function arow(cls, who, qty, item, fee, tot, penny) {
    var r = el('div', 'ss-alloc' + (cls ? ' ' + cls : '')); r.setAttribute('role', 'row');
    r.appendChild(bin(qty.n, qty.Q));
    var w = el('span', 'who', who); w.title = who; w.setAttribute('role', 'rowheader'); r.appendChild(w);
    // D10: the quoted unit may move to its own line at 320, but neither the number nor the unit is ever split
    var q = el('span', 'qty'), sp = String(qty.t).indexOf(' '); if (sp > 0) { q.appendChild(document.createTextNode(qty.t.slice(0, sp + 1))); q.appendChild(el('span', 'qu', qty.t.slice(sp + 1))); } else q.textContent = qty.t; q.setAttribute('role', 'cell'); r.appendChild(q);
    var it = el('span', 'm item', item); it.setAttribute('role', 'cell'); r.appendChild(it);
    var fe = el('span', 'm fee', fee); fe.setAttribute('role', 'cell'); if (fee !== '—') fe.appendChild(el('span', 'fw', ' ' + C.colFee.toLowerCase())); r.appendChild(fe);
    var t = el('span', 'tot', tot); t.setAttribute('role', 'cell'); if (penny) t.appendChild(el('span', 'p', penny)); r.appendChild(t);
    return r;
  }
  function colhead(qtyLabel) { var r = el('div', 'ss-colhead'); r.setAttribute('role', 'row'); [' ', C.colWho, qtyLabel, C.colItem, C.colFee, C.colPays].forEach(function (t, k) { var c = el('span', null, k ? t : ''); c.setAttribute('role', k ? 'columnheader' : 'presentation'); r.appendChild(c); }); return r; }
  function list(id, arr) { var u = $(id); u.textContent = ''; arr.forEach(function (t) { u.appendChild(el('li', null, t)); }); }
  function row(cells, cls) { var tr = el('tr', cls); cells.forEach(function (c, k) { var td = el(k ? 'td' : 'th', null, c); if (!k) td.scope = 'row'; tr.appendChild(td); }); return tr; }
  function result() {
    var inp = L.toCompute(st); if (!inp) return null;
    inp.requests = inp.requests.map(function (r) { return String(r).trim() === '' ? '0' : r; });
    var r = S.compute(inp); if (!r.ok && r.error === 'assign') { inp.assignTo = -1; r = S.compute(inp); }
    return r.ok ? r : null;
  }
  // Recipient view is read-only in the DOM via the shared helper (controls disabled, never inert); household inputs are not rendered at all.
  function lockEditor() { if (mode === 'own') return; $('hh').textContent = ''; V.readOnly($('editor'), true); }
  // QA local-a254042 D10-r1/D10-r2 (PM wrap rule): a quoted unit breaks at spaces, then hyphens, and mid-word only if one word can't fit
  // its box at all (CSS overflow-wrap:break-word). Where a unit would wrap, the row reflows instead: the LCD package value takes its own
  // full-width line, the household rows stack (name above wants) and the Change my amount figure sits above its −/+ buttons.
  function lineCount(e) { var t = e && e.firstChild; if (!t || !e.getClientRects().length) return 0; var r = document.createRange(); r.selectNodeContents(e); var tops = {}; [].forEach.call(r.getClientRects(), function (x) { if (x.width > 0) tops[Math.round(x.top)] = 1; }); return Object.keys(tops).length; }
  function spills(e) { var cell = e.closest('.v, output, .ss-field') || e.parentNode, r = document.createRange(); r.selectNodeContents(e); var c = cell.getBoundingClientRect(); return [].some.call(r.getClientRects(), function (x) { return x.width > 0 && (x.right > c.right + 1 || x.left < c.left - 1); }); }
  function fitOne(box, cls, unitEl) { box.classList.remove(cls); var els = !unitEl ? [] : unitEl.length != null ? [].slice.call(unitEl) : [unitEl]; if (els.some(function (e) { return e.getClientRects().length && (lineCount(e) > 1 || spills(e)); })) box.classList.add(cls); }
  function fitPick() { var sel = $('pick'), pk = $('picked'), o = sel.selectedOptions && sel.selectedOptions[0]; pk.hidden = true; if (pick < 0 || !o || !sel.getClientRects().length) return;
    var cs = getComputedStyle(sel), c = document.createElement('canvas').getContext('2d'); c.font = cs.font;
    pk.hidden = c.measureText(o.textContent).width <= sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24; } // 24px: the native arrow
  // D10-r5: the widest piece of a name that the PM wrap rule keeps whole (split at spaces and after hyphens), measured unwrapped in the name's own font.
  function widestWord(e) { var m = document.createElement('span'), w = 0; m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0'; e.appendChild(m);
    e.firstChild.textContent.replace(/-/g, '-\n').split(/\s+/).forEach(function (t) { if (!t) return; m.textContent = t; w = Math.max(w, m.getBoundingClientRect().width); }); e.removeChild(m); return w; }
  function fitWho(rws) { rws.classList.remove('is-widew'); rws.style.removeProperty('--who-w'); var whos = [].filter.call(rws.querySelectorAll('.ss-alloc .who'), function (e) { return e.getClientRects().length && e.firstChild; });
    var need = 0, over = whos.some(function (e) { var ww = widestWord(e); need = Math.max(need, ww); return ww > e.clientWidth + .5; }); if (!over) return;
    rws.classList.add('is-widew'); if (matchMedia('(min-width:561px)').matches) rws.style.setProperty('--who-w', Math.ceil(Math.min(need + 1, rws.clientWidth * .34)) + 'px'); }
  function fitUnits() {
    fitPick();
    fitOne(document.querySelector('.ss-lcd'), 'is-wideq', $('lcd-q').querySelector('.unit'));
    fitOne($('hh'), 'is-wideu', $('hh').querySelector('.ss-wants .u'));
    fitOne(document.querySelector('.ss-stepper'), 'is-wide', $('amt').querySelector('.unit'));
    // D10-r3: when a table unit doesn't fit its quantity cell, narrow screens give the quantity its own full-width line; wider tables
    // widen the quantity column (all rows and the header together) to the unit's own width.
    var rws = $('rows'), qus = rws.querySelectorAll('.qu'); rws.style.removeProperty('--qu-w'); fitWho(rws); fitOne(rws, 'is-wideq', qus);
    if (rws.classList.contains('is-wideq')) { var mw = 0; [].forEach.call(qus, function (q) { q.style.whiteSpace = 'nowrap'; q.style.maxWidth = 'none'; mw = Math.max(mw, q.getBoundingClientRect().width); q.style.whiteSpace = ''; q.style.maxWidth = ''; }); rws.style.setProperty('--qu-w', Math.ceil(mw + 1) + 'px'); }
  }
  var fitT; window.addEventListener('resize', function () { cancelAnimationFrame(fitT); fitT = requestAnimationFrame(fitUnits); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitUnits(); });
  // Print lays the page out at the paper's width: refit before printing and whenever print media starts or stops.
  window.addEventListener('beforeprint', fitUnits); window.addEventListener('afterprint', fitUnits); if (window.matchMedia) { var pm = matchMedia('print'); if (pm.addEventListener) pm.addEventListener('change', fitUnits); else if (pm.addListener) pm.addListener(fitUnits); }
  function render() {
    var fe = fieldErrors(), cn = mode === 'own' ? capNotes() : { item: [], hh: [] }; list('item-msg', fe.item.concat(cn.item)); list('hh-msg', fe.hh.concat(cn.hh));
    var rows = $('rows'), as = $('assign'), u = unit(); rows.textContent = ''; as.textContent = '';
    $('basisnote').textContent = C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'];
    var res = result(), status = $('status'), q = S.parseQty(st.q) || 0;
    var lq = $('lcd-q'); lq.textContent = ''; lq.appendChild(el('span', 'num', st.q ? (S.parseQty(st.q) != null ? S.fmtQty(S.parseQty(st.q)) : '—') : '—')); if (st.q && u) { lq.appendChild(document.createTextNode(' ')); lq.appendChild(el('span', 'unit', u)); }
    $('lcd-p').textContent = S.parseMoney(st.p) != null ? money(S.parseMoney(st.p)) : '—';
    $('lcd-f').textContent = money(S.parseMoney(st.f) || 0);
    ['lcd-p', 'lcd-f'].forEach(function (id) { $(id).classList.toggle('is-long', $(id).textContent.length >= 10); }); // QA D13 (optional): app max $9999999.99 stays in its own cell at 320
    // D11: on the recipient page the item is the sender's typed text (quoted, typed style), on its own line; the app's
    // "Split in steps of" line is a separate element so the two never run together.
    var inc = S.parseQty(st.i), sn = $('sname'), stepTxt = inc ? C.incrementLabel + ' ' + S.fmtQty(inc) + (u ? ' ' + u : '') : ''; sn.textContent = '';
    if (mode !== 'own' && M.strip(st.n)) { sn.appendChild(V.typed(M.strip(st.n), 'ss-typedname')); if (stepTxt) sn.appendChild(el('span', 'ss-step', stepTxt)); }
    else sn.textContent = (M.strip(st.n) ? M.quote(M.strip(st.n)) : C.itemPlaceholder) + (stepTxt ? ' · ' + stepTxt : ''); // D14: typed item quoted in the editor preview too
    status.className = 'ss-status'; status.setAttribute('role', 'status'); $('reconcile').textContent = ''; $('residual').textContent = '';
    rows.setAttribute('aria-label', M.fill(C.tableAria, { n: st.h.length }));
    if (!res) { status.textContent = C.emptyState; }
    else if (res.status === 'nobasis') { status.textContent = C.errorFeeNoBasis; status.classList.add('is-short'); status.setAttribute('role', 'alert'); }
    else if (res.status === 'over') {
      status.textContent = M.fill(C.statusShortage, { qty: S.fmtQty(res.shortage), unit: u }) + ' ' + M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }) + ' ' + C.noProrateNote;
      status.classList.add('is-short'); status.setAttribute('role', 'alert');
      rows.appendChild(colhead(C.colAsked));
      st.h.forEach(function (x, i) { var r = S.parseQty(String(x[1]).trim() === '' ? '0' : x[1]) || 0; rows.appendChild(arow(r ? '' : 'is-zero', shownName(i), { n: Math.min(r, q), Q: q, t: S.fmtQty(r) + ' ' + u }, '—', '—', '—')); });
      rows.appendChild(arow('is-short', C.shortRow, { n: 0, Q: q, t: S.fmtQty(res.shortage) + ' ' + u }, '—', '—', '—'));
    }
    else if (res.status === 'under') { status.textContent = M.fill(C.statusRemainder, { qty: S.fmtQty(res.unallocated.qty), unit: u }) + ' ' + C.unallocatedHint; status.classList.add('is-unalloc'); }
    else { status.textContent = M.fill(C.statusExact, { package: S.fmtQty(res.pkgQty), unit: u }); status.classList.add('is-full'); }
    if (res && res.complete) {
      rows.appendChild(colhead(C.colQty));
      res.rows.forEach(function (r, i) { var ar = rows.appendChild(arow((r.qty ? '' : 'is-zero') + (res.assigned === i ? ' is-assigned' : '') + (mode !== 'own' && i === pick ? ' is-you' : '') + (wasOf(i) ? ' is-changed' : ''), shownName(i), { n: r.qty, Q: res.pkgQty, t: S.fmtQty(r.qty) + ' ' + u }, money(r.goods), money(r.fee), money(r.total), r.extraCents ? M.plural(C.pennyTag, r.extraCents) : '')); if (wasOf(i)) ar.querySelector('.qty').setAttribute('data-was', wasOf(i)); });
      var un = res.unallocated; rows.appendChild(arow('is-unalloc' + (un.qty ? '' : ' is-zero'), C.unallocatedRow, { n: un.qty, Q: res.pkgQty, t: S.fmtQty(un.qty) + ' ' + u }, money(un.goods), money(un.fee), money(un.total), un.extraCents ? M.plural(C.pennyTag, un.extraCents) : ''));
      var sumQ = res.rows.reduce(function (a, r) { return a + r.qty; }, un.qty), sumM = res.rows.reduce(function (a, r) { return a + r.total; }, un.total);
      var sum = el('div', 'ss-sum'); sum.setAttribute('role', 'row'); var ok = sumQ === res.pkgQty && sumM === res.total;
      [['', 'presentation'], [C.reconcileLabel, 'rowheader'], [S.fmtQty(sumQ) + ' ' + u + (ok ? ' ✓' : ''), 'cell', 'ok'], [money(res.price), 'cell', 'ok'], [money(res.fee), 'cell', 'ok'], [money(sumM) + (ok ? ' ✓' : ''), 'cell', 'ok']].forEach(function (c) { var e = el('span', c[2] || null, c[0]); e.setAttribute('role', c[1]); sum.appendChild(e); });
      if (u) { var sq = sum.children[2]; sq.textContent = S.fmtQty(sumQ) + ' '; sq.appendChild(el('span', 'qu', u)); if (ok) sq.appendChild(document.createTextNode(' ✓')); } // D10-r3: the unit wraps/reflows like the rows'
      rows.appendChild(sum);
      if (ok) $('reconcile').textContent = M.fill(C.reconcileLine, { qty: S.fmtQty(sumQ), unit: u, total: money(sumM) });
      $('residual').textContent = residualSentence(res);
      if (mode !== 'own') {}
      else if (un.qty > 0) {
        as.appendChild(el('p', null, M.fill(C.assignUnallocated, { qty: S.fmtQty(un.qty), unit: u })));
        st.h.forEach(function (_, i) { var b = el('button', 'ss-btn', M.fill(C.assignTo, { name: qName(i) })); b.type = 'button'; b.addEventListener('click', function () { st.x = i; edited(); var ub = $('unassign'); if (ub) ub.focus(); }); as.appendChild(b); });
      } else if (res.assigned >= 0) {
        var b = el('button', 'ss-btn', C.unassign); b.type = 'button'; b.id = 'unassign'; b.addEventListener('click', function () { st.x = -1; edited(); var f = as.querySelector('button'); if (f) f.focus(); }); as.appendChild(b);
      }
    }
    var blocked = L.check(st), feeNoTaker = !!(res && res.status === 'nobasis');
    if (feeNoTaker) fe.item.push(C.errorFeeNoBasis), list('item-msg', fe.item.concat(cn.item));
    var ready = !blocked && !fe.item.length && !fe.hh.length;
    ['share', 'copytext', 'print'].forEach(function (id) { $(id).disabled = !ready; });
    $('notready').textContent = ready ? '' : feeNoTaker ? C.errorFeeNoBasis : (blocked === 'over' && res && res.status === 'over' ? M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }) : blocked === 'count' ? C.tooFewHouseholds : blocked === 'duplicate' ? C.duplicateHousehold : feeNoTaker ? C.errorFeeNoBasis : C.notReady);
    if (mode !== 'own') { ['share', 'copytext', 'print'].forEach(function (id) { $(id).disabled = true; }); }
    lockEditor(); var txt = ready ? proposal(res) : ''; $('text').value = txt; $('printout').textContent = ready ? M.fill(C.shareTextTyped, { item: M.strip(st.n) }) + '\n' + C.textNamesTyped + '\n\n' + M.fill(C.proposalPolicy, { feeBasisLine: C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'], residualNote: C.residualNote }) + '\n' + C.proposalSnapshot + '\n' + C.noPaymentNote : '';
    fitUnits();
  }
  // D9: the leftover-cents sentence names each row's actual extra cents. Writer's "one each" form is used only when every listed row got exactly 1.
  var textNames = false;
  function residualSentence(res) {
    var parts = [], n = 0; res.rows.forEach(function (r, i) { if (r.extraCents) parts.push([textNames ? typedName(i) : shownName(i), r.extraCents]); }); if (res.unallocated && res.unallocated.extraCents) parts.push([C.unallocatedRow, res.unallocated.extraCents]);
    parts.forEach(function (p) { n += p[1]; }); if (!n) return C.residualNone;
    if (parts.every(function (p) { return p[1] === 1; })) return M.plural(C.residualLine, n, { names: parts.map(function (p) { return p[0]; }).join(', ') });
    return M.plural(C.residualLineMixed, n, { names: parts.map(function (p) { return M.plural(C.residualShare, p[1], { name: p[0] }); }).join(', ') });
  }
  function proposal(res) {
    var u = unit(), out = [M.fill(C.shareTextTyped, { item: M.strip(st.n) }), C.textNamesTyped, C.packageQtyLabel + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + C.priceLabel + ': ' + money(res.price) + ' · ' + C.feeLabel + ': ' + money(res.fee), ''];
    res.rows.forEach(function (r, i) { out.push(typedName(i) + ': ' + S.fmtQty(r.qty) + ' ' + u + ' · ' + C.colItem + ' ' + money(r.goods) + ' + ' + C.colFee + ' ' + money(r.fee) + ' = ' + C.colPays + ' ' + money(r.total)); });
    out.push(C.unallocatedRow + ': ' + M.fill(C.unallocatedLine, { qty: S.fmtQty(res.unallocated.qty), unit: u, cost: money(res.unallocated.total) }));
    out.push(C.rowTotal + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + money(res.total), '');
    out.push(M.fill(C.proposalPolicy, { feeBasisLine: C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'], residualNote: C.residualNote }));
    textNames = true; var resid = residualSentence(res); textNames = false;
    out.push(resid, C.proposalSnapshot, C.noPaymentNote);
    return out.join('\n');
  }
  function wasOf(i) { if (mode !== 'change' || !orig || i !== pick) return ''; var a = S.parseQty(String(orig.h[i][1]).trim() || '0'), b = S.parseQty(String(st.h[i][1]).trim() || '0'); return a !== b ? M.fill(C.changedWas, { qty: S.fmtQty(a), unit: unit() }) : ''; }
  function setMode(m) {
    mode = m; document.body.classList.toggle('is-recv', m !== 'own');
    $('editor').hidden = m !== 'own'; $('recv').hidden = m === 'own'; $('changebox').hidden = m !== 'change'; $('change').hidden = m === 'change';
    $('from').hidden = m === 'own'; $('from').textContent = C.senderTextLabel; $('caption').hidden = m === 'own'; $('caption').textContent = C.senderNamesCaption;
    if (m !== 'change') { $('rlinkbox').hidden = true; $('rlink').value = ''; }
    V.readOnly($('editor'), m !== 'own'); // #recv is hidden (not inert) in own mode, line above
    if (m === 'own') { orig = null; pick = -1; $('pick').textContent = ''; $('owncost').textContent = ''; $('change-err').textContent = ''; $('amt').textContent = ''; $('amt-l').textContent = ''; } else recvPanel(); render();
  }
  function recvPanel() {
    var sel = $('pick'), v = pick; sel.textContent = ''; var o0 = el('option', null, '—'); o0.value = ''; sel.appendChild(o0);
    st.h.forEach(function (_, i) { var o = el('option', null, typedName(i)); o.value = String(i); sel.appendChild(o); }); sel.value = v >= 0 ? String(v) : '';
    // No ellipsis on typed names: a closed <select> cuts a long picked name, so the full name is also shown under it (wrapping) when it doesn't fit (fitPick).
    var pk = $('picked'); pk.textContent = ''; if (pick >= 0) { var pn = M.strip(st.h[pick][0]); if (pn) pk.appendChild(V.typed(pn)); else pk.textContent = nameOf(pick); }
    $('change').disabled = pick < 0; var inc = S.parseQty(st.i);
    if (pick >= 0) { $('amt-l').textContent = M.fill(C.answerAmountLabel, { increment: S.fmtQty(inc), unit: unit() }); $('down').setAttribute('aria-label', M.fill(C.stepDownAria, { name: qName(pick) })); $('up').setAttribute('aria-label', M.fill(C.stepUpAria, { name: qName(pick) })); var am = $('amt'), au = unit(); am.textContent = ''; am.appendChild(el('span', 'num', S.fmtQty(S.parseQty(String(st.h[pick][1]).trim() || '0')))); if (au) { am.appendChild(document.createTextNode(' ')); am.appendChild(el('span', 'unit', au)); } }
    var res = result(), oc = $('owncost'); oc.textContent = '';
    if (pick >= 0 && res && res.complete) { var r = res.rows[pick]; oc.textContent = r.fee ? M.fill(C.receiverOwnCost, { qty: S.fmtQty(r.qty), unit: unit(), item: money(r.goods), fee: money(r.fee), total: money(r.total) }) : M.fill(C.receiverOwnCostNoFee, { qty: S.fmtQty(r.qty), unit: unit(), total: money(r.total) }); }
    var ok = !!(res && res.complete); $('makelink').disabled = mode === 'change' && (!ok || !wasOf(pick));
    $('change-err').textContent = mode === 'change' && res && res.status === 'over' ? M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: unit() }) : (mode === 'change' && res && res.status === 'nobasis' ? C.errorFeeNoBasis : '');
  }
  function step(dir) {
    if (pick < 0) return; var inc = S.parseQty(st.i), cur = S.parseQty(String(st.h[pick][1]).trim() || '0') || 0, nx = cur + dir * inc; if (nx < 0) return;
    if (nx > S.parseQty(st.q)) return; st.h[pick][1] = S.fmtQty(nx); $('rlinkbox').hidden = true; $('rlink').value = ''; recvPanel(); render();
  }
  // Change my amount: a NEW link built in this browser only. The original link and the sender's copy are untouched; nobody is told.
  function makeChangeLink() {
    var f = L.encode(st); if (!f) return; var url = f.length > L.FRAG_MAX ? null : V.linkFor(f); if (!url) { toast(C.tooLongLink); return; } // QA D7: whole-URL cap
    var box = $('rlink'); box.value = url; $('rlinkbox').hidden = false;
    if (navigator.share) navigator.share({ title: C.title, text: C.changeShareText, url: url }).catch(function (e) { toast(e && e.name === 'AbortError' ? C.shareCancel : C.copyFail); box.focus(); box.select(); });
    else copy(url, box);
  }
  function makeLink() { var f = L.encode(st); if (!f) return null; var u = f.length > L.FRAG_MAX ? null : V.linkFor(f); if (!u) { toast(C.tooLongLink); return null; } lastLink = u; history.replaceState(null, '', location.pathname + '#' + f); $('link').value = lastLink; $('linkbox').hidden = false; return lastLink; }
  function copy(text, box) {
    function fail() { toast(C.copyFail); box.focus(); box.select(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(C.copied); }, fail); else fail();
  }
  function share() {
    var url = makeLink(); if (!url) return;
    if (navigator.share) navigator.share({ title: C.title, text: M.fill(C.shareTextTyped, { item: M.strip(st.n) }), url: url }).catch(function (e) { if (e && e.name === 'AbortError') toast(C.shareCancel); else toast(C.copyFail); $('link').focus(); $('link').select(); });
    else copy(url, $('link'));
  }
  function reset() { if (mode !== 'own') return; if (!confirm(C.resetConfirm)) return; st = blank(); orig = null; pick = -1; lastLink = ''; $('link').value = ''; history.replaceState(null, '', location.pathname); $('linkbox').hidden = true; $('banner').hidden = true; setMode('own'); toForm(); render(); toast(C.resetDone); $('item').focus(); }
  function banner(t) { $('banner-h').hidden = true; $('banner-q').hidden = true; $('banner-t').textContent = t; $('banner').hidden = false; }
  function fromHash() {
    if (location.search) history.replaceState(null, '', location.pathname + location.hash); // PM 04:57: the address bar never keeps a ?query (path + #fragment only)
    V.clearErrors(document, '#item-msg,#hh-msg,#change-err'); $('banner').hidden = true; lastLink = ''; $('link').value = ''; $('linkbox').hidden = true; $('rlink').value = ''; $('rlinkbox').hidden = true;
    if (!location.hash || location.hash === '#') { st = blank(); setMode('own'); return; }
    // QA local-d8d1dce D7r: the WHOLE received URL (origin + path + # + fragment) is capped at 2,000 like sending (shared MILLVIEW.linkFor), not just the fragment
    var d = V.linkFor(location.hash.replace(/^#/, '')) ? L.decode(location.hash) : { ok: false, why: 'tooLong' };
    if (d.ok) {
      st = d.data; orig = JSON.parse(JSON.stringify(st)); pick = -1;
      // D4: sender text is labelled and quoted, never inside a product sentence (no organizer-name field -> anonymous strings)
      $('banner-h').textContent = C.receiverHeader; $('banner-h').hidden = false; $('banner-t').textContent = C.receiverIntro;
      $('banner-ql').textContent = C.senderTextLabel; $('banner-qv').textContent = ''; $('banner-qv').appendChild(V.typed(M.strip(st.n))); $('banner-q').hidden = false; $('banner').hidden = false;
      setMode('view');
    }
    else { st = blank(); setMode('own'); banner(d.why === 'oldVersion' ? C.oldVersion : C.badLink); }
  }
  function bind() {
    // Text caps (item 40, unit 16, currency 3, household names 24 in drawHouseholds) are enforced by capInput(), counted like the link parser.
    capInput($('item'), L.ITEM_MAX); capInput($('u'), L.UNIT_MAX); capInput($('c'), L.SYM_MAX);
    [['item', 'n'], ['q', 'q'], ['inc', 'i'], ['p', 'p'], ['f', 'f'], ['c', 'c'], ['u', 'u']].forEach(function (p) { $(p[0]).addEventListener('input', function (e) { if (mode !== 'own') { e.target.value = st[p[1]]; return; } st[p[1]] = e.target.value; edited(); }); });
    $('bp').addEventListener('click', function () { if (mode !== 'own') return; st.b = 'p'; basisButtons(); edited(); });
    $('be').addEventListener('click', function () { if (mode !== 'own') return; st.b = 'e'; basisButtons(); edited(); });
    $('add').addEventListener('click', function () { if (mode !== 'own') return; if (st.h.length >= S.MAX_H) return; st.h.push(['', '']); drawHouseholds(); edited(); var ins = $('hh').querySelectorAll('input'); ins[ins.length - 2].focus(); });
    $('pick').addEventListener('change', function () { pick = $('pick').value === '' ? -1 : +$('pick').value; if (mode === 'change') { st = JSON.parse(JSON.stringify(orig)); } recvPanel(); render(); });
    $('change').addEventListener('click', function () { if (pick < 0) { $('pick').focus(); return; } setMode('change'); $('up').focus(); });
    $('down').addEventListener('click', function () { step(-1); }); $('up').addEventListener('click', function () { step(1); });
    $('cancel').addEventListener('click', function () { st = JSON.parse(JSON.stringify(orig)); setMode('view'); $('change').focus(); });
    $('makelink').addEventListener('click', makeChangeLink);
    $('share').addEventListener('click', share);
    $('copytext').addEventListener('click', function () { copy($('text').value, $('text')); });
    $('print').addEventListener('click', function () { window.print(); });
    $('reset').addEventListener('click', reset);
  }
  // Every load and every hashchange (valid, bad, old or empty) rebuilds the tab from the fragment alone.
  staticText(); bind(); V.route(function () { fromHash(); toForm(); render(); });
})();
