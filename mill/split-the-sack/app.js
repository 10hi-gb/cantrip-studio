'use strict';
// Split the Sack UI. Memory only: state lives in this page and, if the visitor makes one, a link fragment. No storage, no network.
(function () {
  var C = COPY, M = MILL, S = SACK, L = SACKLINK, $ = function (id) { return document.getElementById(id); };
  var st, lastLink = '', toastT;
  function blank() { return { n: '', u: '', c: '$', q: '', i: '1', p: '', f: '', b: 'p', x: -1, h: [['', ''], ['', '']] }; }
  function key(k) { return k.split('.').reduce(function (o, p) { return o && o[p]; }, C); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function toast(t) { var e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { e.hidden = true; }, 2600); }
  function nameOf(i) { return M.strip(st.h[i][0]) || (C.householdLabel + ' ' + (i + 1)); }
  function unit() { return M.strip(st.u); }
  function money(c) { return S.fmtMoney(c, M.strip(st.c)); }
  function staticText() {
    document.querySelectorAll('[data-c]').forEach(function (e) { e.textContent = key(e.getAttribute('data-c')); });
    document.querySelectorAll('[data-ph]').forEach(function (e) { e.placeholder = key(e.getAttribute('data-ph')); });
    document.querySelectorAll('[data-aria]').forEach(function (e) { e.setAttribute('aria-label', key(e.getAttribute('data-aria'))); });
    document.title = C.studioLabel;
  }
  function toForm() {
    $('item').value = st.n; $('u').value = st.u; $('c').value = st.c; $('q').value = st.q; $('inc').value = st.i; $('p').value = st.p; $('f').value = st.f;
    basisButtons(); drawHouseholds();
  }
  function drawHouseholds() {
    var ol = $('hh'); ol.textContent = '';
    st.h.forEach(function (x, i) {
      var li = el('li', 'ss-hrow');
      var nf = el('div', 'ss-field'), nl = el('label', null, C.householdLabel + ' ' + (i + 1)), n = el('input');
      n.id = 'hn' + i; nl.htmlFor = n.id; n.value = x[0]; n.maxLength = 48; n.autocomplete = 'off'; n.className = 'ss-hn'; n.placeholder = i === 0 ? C.householdPlaceholder : '';
      n.addEventListener('input', function () { st.h[i][0] = n.value; edited(); }); nf.appendChild(nl); nf.appendChild(n);
      var rf = el('div', 'ss-field'), rlab = el('label', null, C.requestLabel), w = el('div', 'ss-wants'), r = el('input');
      r.id = 'hr' + i; rlab.htmlFor = r.id; r.value = x[1]; r.inputMode = 'decimal'; r.autocomplete = 'off'; r.placeholder = C.requestPlaceholder; r.className = 'sk-rq';
      r.addEventListener('input', function () { st.h[i][1] = r.value; edited(); }); w.appendChild(r); w.appendChild(el('span', 'u sk-unit', unit())); rf.appendChild(rlab); rf.appendChild(w);
      var rm = el('button', 'ss-x sk-x', '×'); rm.type = 'button'; rm.disabled = st.h.length <= S.MIN_H;
      rm.addEventListener('click', function () { st.h.splice(i, 1); if (st.x === i) st.x = -1; else if (st.x > i) st.x--; drawHouseholds(); edited(); ($('hh').querySelectorAll('input')[Math.max(0, (i - 1) * 2)] || $('add')).focus(); });
      li.appendChild(nf); li.appendChild(rf); li.appendChild(rm); ol.appendChild(li);
    });
    $('add').disabled = st.h.length >= S.MAX_H; labels();
  }
  function labels() { // aria labels that depend on current names/unit
    var rows = $('hh').children; for (var i = 0; i < rows.length; i++) { rows[i].querySelector('.sk-rq').setAttribute('aria-label', M.fill(C.requestAria, { name: nameOf(i), unit: unit() || C.unitLabel })); rows[i].querySelector('.sk-x').setAttribute('aria-label', M.fill(C.removeHousehold, { name: nameOf(i) })); rows[i].querySelector('.sk-unit').textContent = unit(); }
    $('hcount').textContent = M.plural(C.householdCount, st.h.length);
  }
  // Editing makes the old link a snapshot: clear it from the address bar and the link box.
  function edited() {
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
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
    if ((x = M.len(M.strip(st.n)) - L.ITEM_MAX) > 0) e.push(C.itemLabel + ' ' + M.plural(C.itemTooLong, x));
    if ((x = M.len(unit()) - L.UNIT_MAX) > 0) e.push(M.plural(C.unitTooLong, x));
    if ((x = M.len(M.strip(st.c)) - L.SYM_MAX) > 0) e.push(M.plural(C.currencyTooLong, x));
    if ((x = numErr(st.q, false))) e.push(C.packageQtyLabel + ': ' + x);
    if ((x = numErr(st.i, false))) e.push(C.incrementLabel + ': ' + x);
    else if (q && inc && q % inc) e.push(C.packageQtyLabel + ': ' + M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() }));
    if ((x = moneyErr(st.p))) e.push(C.priceLabel + ': ' + x);
    if ((x = moneyErr(st.f))) e.push(C.feeLabel + ': ' + x);
    var seen = {}, dup = false;
    st.h.forEach(function (r, i) {
      var nm = M.strip(r[0]); if ((x = M.len(nm) - L.NAME_MAX) > 0) h.push(nameOf(i) + ': ' + M.plural(C.householdTooLong, x));
      if (nm) { if (seen[nm.toLowerCase()]) dup = true; seen[nm.toLowerCase()] = 1; }
      if ((x = numErr(r[1], true, inc > 0 ? inc : 0))) h.push(nameOf(i) + ': ' + x);
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
    var w = el('span', 'who', who); w.setAttribute('role', 'rowheader'); r.appendChild(w);
    var q = el('span', 'qty', qty.t); q.setAttribute('role', 'cell'); r.appendChild(q);
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
  function render() {
    var fe = fieldErrors(); list('item-msg', fe.item); list('hh-msg', fe.hh);
    var rows = $('rows'), as = $('assign'), u = unit(); rows.textContent = ''; as.textContent = '';
    $('basisnote').textContent = C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'] + ' ' + C.feeUnallocatedNote;
    var res = result(), status = $('status'), q = S.parseQty(st.q) || 0;
    $('lcd-q').textContent = st.q ? (S.parseQty(st.q) != null ? S.fmtQty(S.parseQty(st.q)) : '—') + (u ? ' ' + u : '') : '—';
    $('lcd-p').textContent = S.parseMoney(st.p) != null ? money(S.parseMoney(st.p)) : '—';
    $('lcd-f').textContent = money(S.parseMoney(st.f) || 0);
    var inc = S.parseQty(st.i); $('sname').textContent = (M.strip(st.n) || C.itemPlaceholder) + (inc ? ' · ' + C.incrementLabel + ' ' + S.fmtQty(inc) + (u ? ' ' + u : '') : '');
    status.className = 'ss-status'; status.setAttribute('role', 'status'); $('reconcile').textContent = ''; $('residual').textContent = '';
    rows.setAttribute('aria-label', M.fill(C.tableAria, { n: st.h.length }));
    if (!res) { status.textContent = C.emptyState; }
    else if (res.status === 'over') {
      status.textContent = M.fill(C.statusShortage, { qty: S.fmtQty(res.shortage), unit: u }) + ' ' + M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }) + ' ' + C.noProrateNote;
      status.classList.add('is-short'); status.setAttribute('role', 'alert');
      rows.appendChild(colhead(C.colAsked));
      st.h.forEach(function (x, i) { var r = S.parseQty(String(x[1]).trim() === '' ? '0' : x[1]) || 0; rows.appendChild(arow(r ? '' : 'is-zero', nameOf(i), { n: Math.min(r, q), Q: q, t: S.fmtQty(r) + ' ' + u }, '—', '—', '—')); });
      rows.appendChild(arow('is-short', C.shortRow, { n: 0, Q: q, t: S.fmtQty(res.shortage) + ' ' + u }, '—', '—', '—'));
    }
    else if (res.status === 'under') { status.textContent = M.fill(C.statusRemainder, { qty: S.fmtQty(res.unallocated.qty), unit: u }) + ' ' + C.unallocatedHint; status.classList.add('is-unalloc'); }
    else { status.textContent = M.fill(C.statusExact, { package: S.fmtQty(res.pkgQty), unit: u }); status.classList.add('is-full'); }
    if (res && res.complete) {
      rows.appendChild(colhead(C.colQty));
      res.rows.forEach(function (r, i) { rows.appendChild(arow((r.qty ? '' : 'is-zero') + (res.assigned === i ? ' is-assigned' : ''), nameOf(i), { n: r.qty, Q: res.pkgQty, t: S.fmtQty(r.qty) + ' ' + u }, money(r.goods), money(r.fee), money(r.total), r.extraCents ? M.plural(C.pennyTag, r.extraCents) : '')); });
      var un = res.unallocated; rows.appendChild(arow('is-unalloc' + (un.qty ? '' : ' is-zero'), C.unallocatedRow, { n: un.qty, Q: res.pkgQty, t: S.fmtQty(un.qty) + ' ' + u }, money(un.goods), money(un.fee), money(un.total), un.extraCents ? M.plural(C.pennyTag, un.extraCents) : ''));
      var sumQ = res.rows.reduce(function (a, r) { return a + r.qty; }, un.qty), sumM = res.rows.reduce(function (a, r) { return a + r.total; }, un.total);
      var sum = el('div', 'ss-sum'); sum.setAttribute('role', 'row'); var ok = sumQ === res.pkgQty && sumM === res.total;
      [['', 'presentation'], [C.reconcileLabel, 'rowheader'], [S.fmtQty(sumQ) + ' ' + u + (ok ? ' ✓' : ''), 'cell', 'ok'], [money(res.price), 'cell', 'ok'], [money(res.fee), 'cell', 'ok'], [money(sumM) + (ok ? ' ✓' : ''), 'cell', 'ok']].forEach(function (c) { var e = el('span', c[2] || null, c[0]); e.setAttribute('role', c[1]); sum.appendChild(e); });
      rows.appendChild(sum);
      if (ok) $('reconcile').textContent = M.fill(C.reconcileLine, { qty: S.fmtQty(sumQ), unit: u, total: money(sumM) });
      var ex = [], exn = 0; res.rows.forEach(function (r, i) { if (r.extraCents) { ex.push(nameOf(i)); exn += r.extraCents; } }); if (un.extraCents) { ex.push(C.unallocatedRow); exn += un.extraCents; }
      $('residual').textContent = exn ? M.plural(C.residualLine, exn, { names: ex.join(', ') }) : C.residualNone;
      if (un.qty > 0) {
        as.appendChild(el('p', null, M.fill(C.assignUnallocated, { qty: S.fmtQty(un.qty), unit: u })));
        st.h.forEach(function (_, i) { var b = el('button', 'ss-btn', M.fill(C.assignTo, { name: nameOf(i) })); b.type = 'button'; b.addEventListener('click', function () { st.x = i; edited(); var ub = $('unassign'); if (ub) ub.focus(); }); as.appendChild(b); });
      } else if (res.assigned >= 0) {
        var b = el('button', 'ss-btn', C.unassign); b.type = 'button'; b.id = 'unassign'; b.addEventListener('click', function () { st.x = -1; edited(); var f = as.querySelector('button'); if (f) f.focus(); }); as.appendChild(b);
      }
    }
    var blocked = L.check(st), feeNoTaker = res && res.complete && res.fee > 0 && res.rows.every(function (r) { return r.qty === 0; });
    if (feeNoTaker) fe.item.push(C.errorFeeNoBasis), list('item-msg', fe.item);
    var ready = !blocked && !fe.item.length && !fe.hh.length;
    ['share', 'copytext', 'print'].forEach(function (id) { $(id).disabled = !ready; });
    $('notready').textContent = ready ? '' : (blocked === 'over' && res ? M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }) : blocked === 'count' ? C.tooFewHouseholds : blocked === 'duplicate' ? C.duplicateHousehold : feeNoTaker ? C.errorFeeNoBasis : C.notReady);
    var txt = ready ? proposal(res) : ''; $('text').value = txt; $('printout').textContent = ready ? M.fill(C.proposalPolicy, { feeBasisLine: C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'], residualNote: C.residualNote }) + '\n' + C.feeUnallocatedNote + '\n' + C.proposalSnapshot + '\n' + C.noPaymentNote : '';
  }
  function proposal(res) {
    var u = unit(), out = [C.proposalHeading + ': ' + M.strip(st.n), C.packageQtyLabel + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + C.priceLabel + ': ' + money(res.price) + ' · ' + C.feeLabel + ': ' + money(res.fee), ''];
    res.rows.forEach(function (r, i) { out.push(nameOf(i) + ': ' + S.fmtQty(r.qty) + ' ' + u + ' · ' + C.colItem + ' ' + money(r.goods) + ' + ' + C.colFee + ' ' + money(r.fee) + ' = ' + C.colPays + ' ' + money(r.total)); });
    out.push(C.unallocatedRow + ': ' + M.fill(C.unallocatedLine, { qty: S.fmtQty(res.unallocated.qty), unit: u, cost: money(res.unallocated.total) }));
    out.push(C.rowTotal + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + money(res.total), '');
    out.push(M.fill(C.proposalPolicy, { feeBasisLine: C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'], residualNote: C.residualNote }));
    out.push(C.feeUnallocatedNote, $('residual').textContent, C.proposalSnapshot, C.noPaymentNote);
    return out.join('\n');
  }
  function makeLink() { var f = L.encode(st); if (!f) return null; if (f.length > L.FRAG_MAX) { toast(C.tooLongLink); return null; } lastLink = location.origin + location.pathname + '#' + f; history.replaceState(null, '', '#' + f); $('link').value = lastLink; $('linkbox').hidden = false; return lastLink; }
  function copy(text, box) {
    function fail() { toast(C.copyFail); box.focus(); box.select(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(C.copied); }, fail); else fail();
  }
  function share() {
    var url = makeLink(); if (!url) return;
    if (navigator.share) navigator.share({ title: C.title, text: M.fill(C.shareText, { item: M.strip(st.n) }), url: url }).catch(function (e) { if (e && e.name === 'AbortError') toast(C.shareCancel); else toast(C.copyFail); $('link').focus(); $('link').select(); });
    else copy(url, $('link'));
  }
  function reset() { if (!confirm(C.resetConfirm)) return; st = blank(); lastLink = ''; history.replaceState(null, '', location.pathname); $('linkbox').hidden = true; $('banner').hidden = true; toForm(); render(); toast(C.resetDone); $('item').focus(); }
  function banner(t, n, own) { $('banner-t').textContent = t; $('banner-n').textContent = n || ''; $('banner-n').hidden = !n; $('own').hidden = !own; $('banner').hidden = false; }
  function fromHash() {
    $('banner').hidden = true; lastLink = ''; $('linkbox').hidden = true;
    if (!location.hash || location.hash === '#') { st = blank(); return; }
    var d = L.decode(location.hash);
    if (d.ok) { st = d.data; banner(M.fill(C.receiverIntro, { item: st.n }), C.receiverNote, true); lastLink = location.href; $('link').value = lastLink; $('linkbox').hidden = false; }
    else { st = blank(); banner(d.why === 'oldVersion' ? C.oldVersion : C.badLink); }
  }
  function bind() {
    [['item', 'n'], ['q', 'q'], ['inc', 'i'], ['p', 'p'], ['f', 'f'], ['c', 'c'], ['u', 'u']].forEach(function (p) { $(p[0]).addEventListener('input', function (e) { st[p[1]] = e.target.value; edited(); }); });
    $('bp').addEventListener('click', function () { st.b = 'p'; basisButtons(); edited(); });
    $('be').addEventListener('click', function () { st.b = 'e'; basisButtons(); edited(); });
    $('add').addEventListener('click', function () { if (st.h.length >= S.MAX_H) return; st.h.push(['', '']); drawHouseholds(); edited(); var ins = $('hh').querySelectorAll('input'); ins[ins.length - 2].focus(); });
    $('own').addEventListener('click', function () { edited(); $('item').focus(); });
    $('share').addEventListener('click', share);
    $('copytext').addEventListener('click', function () { copy($('text').value, $('text')); });
    $('print').addEventListener('click', function () { window.print(); });
    $('reset').addEventListener('click', reset);
    window.addEventListener('hashchange', function () { fromHash(); toForm(); render(); });
  }
  staticText(); fromHash(); toForm(); bind(); render();
})();
