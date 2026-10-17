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
    document.querySelectorAll('input[name=b]').forEach(function (r) { r.checked = r.value === st.b; });
    drawHouseholds();
  }
  function drawHouseholds() {
    var ol = $('hh'); ol.textContent = '';
    st.h.forEach(function (x, i) {
      var li = el('li', 'sk-hrow');
      var nl = el('label', 'sk-f'); nl.appendChild(el('span', null, C.householdLabel + ' ' + (i + 1)));
      var n = el('input'); n.value = x[0]; n.maxLength = 48; n.autocomplete = 'off'; n.placeholder = i === 0 ? C.householdPlaceholder : '';
      n.addEventListener('input', function () { st.h[i][0] = n.value; edited(); }); nl.appendChild(n);
      var rl = el('label', 'sk-req'); rl.appendChild(el('span', null, C.requestLabel));
      var r = el('input'); r.value = x[1]; r.inputMode = 'decimal'; r.autocomplete = 'off'; r.placeholder = C.requestPlaceholder; r.className = 'sk-rq';
      r.addEventListener('input', function () { st.h[i][1] = r.value; edited(); }); rl.appendChild(r); rl.appendChild(el('span', 'sk-unit', unit()));
      var rm = el('button', 'sk-x', '×'); rm.type = 'button'; rm.disabled = st.h.length <= S.MIN_H;
      rm.addEventListener('click', function () { st.h.splice(i, 1); if (st.x === i) st.x = -1; else if (st.x > i) st.x--; drawHouseholds(); edited(); ($('hh').querySelectorAll('input')[Math.max(0, (i - 1) * 2)] || $('add')).focus(); });
      li.appendChild(nl); li.appendChild(rl); li.appendChild(rm); ol.appendChild(li);
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
    var q = S.parseQty(v); if (q == null) return inc ? M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() }) : C.errorNumber;
    if (!allowZero && q === 0) return C.errorZero;
    if (inc && q % inc) return M.fill(C.errorIncrement, { increment: S.fmtQty(inc), unit: unit() });
    return '';
  }
  function moneyErr(v) { v = String(v).trim(); if (v === '') return ''; if (/^-/.test(v)) return C.errorNegative; if (S.parseMoney(v) == null) return /^\d{14,}/.test(v) ? C.errorTooBig : C.errorNumber; return ''; }
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
    var tb = $('tb'), tf = $('tf'), as = $('assign'), u = unit(); tb.textContent = ''; tf.textContent = ''; as.textContent = '';
    $('basisline').textContent = C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'];
    var res = result(), status = $('status'); status.className = 'sk-status'; $('reconcile').textContent = ''; $('residual').textContent = ''; $('unhint').hidden = true;
    if (!res) { status.textContent = C.emptyState; status.classList.add('is-idle'); }
    else if (res.status === 'over') { status.textContent = M.fill(C.statusShortage, { qty: S.fmtQty(res.shortage), unit: u }) + ' ' + M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }); status.classList.add('is-over'); }
    else if (res.status === 'under') { status.textContent = M.fill(C.statusRemainder, { qty: S.fmtQty(res.unallocated.qty), unit: u }); status.classList.add('is-under'); }
    else { status.textContent = M.fill(C.statusExact, { package: S.fmtQty(res.pkgQty), unit: u }); status.classList.add('is-exact'); }
    $('tbl').setAttribute('aria-label', M.fill(C.tableAria, { n: st.h.length }));
    if (res && res.complete) {
      res.rows.forEach(function (r, i) { tb.appendChild(row([nameOf(i), S.fmtQty(r.qty) + ' ' + u, money(r.goods), money(r.fee), money(r.total)], res.assigned === i ? 'is-assigned' : '')); });
      var un = res.unallocated; tb.appendChild(row([C.unallocatedRow, S.fmtQty(un.qty) + ' ' + u, money(un.goods), money(un.fee), money(un.total)], 'sk-un' + (un.qty ? ' is-on' : '')));
      tf.appendChild(row([C.rowTotal, S.fmtQty(res.pkgQty) + ' ' + u, money(res.price), money(res.fee), money(res.total)]));
      var sumQ = res.rows.reduce(function (a, r) { return a + r.qty; }, un.qty), sumM = res.rows.reduce(function (a, r) { return a + r.total; }, un.total);
      if (sumQ === res.pkgQty && sumM === res.total) $('reconcile').textContent = M.fill(C.reconcileLine, { qty: S.fmtQty(sumQ), unit: u, total: money(sumM) });
      var ex = [], exn = 0; res.rows.forEach(function (r, i) { if (r.extraCents) { ex.push(nameOf(i)); exn += r.extraCents; } }); if (un.extraCents) { ex.push(C.unallocatedRow); exn += un.extraCents; }
      $('residual').textContent = exn ? M.plural(C.residualLine, exn, { names: ex.join(', ') }) : C.residualNone;
      if (un.qty > 0) {
        $('unhint').hidden = false;
        as.appendChild(el('p', 'sk-fine', M.fill(C.assignUnallocated, { qty: S.fmtQty(un.qty), unit: u })));
        st.h.forEach(function (_, i) { var b = el('button', 'sk-btn sk-btn--ghost sk-btn--sm', M.fill(C.assignTo, { name: nameOf(i) })); b.type = 'button'; b.addEventListener('click', function () { st.x = i; edited(); $('unassign') && $('unassign').focus(); }); as.appendChild(b); });
      } else if (res.assigned >= 0) {
        var b = el('button', 'sk-btn sk-btn--ghost sk-btn--sm', C.unassign); b.type = 'button'; b.id = 'unassign'; b.addEventListener('click', function () { st.x = -1; edited(); var f = as.querySelector('button'); if (f) f.focus(); }); as.appendChild(b);
      }
    }
    var blocked = L.check(st), ready = !blocked && !fe.item.length && !fe.hh.length;
    ['share', 'copytext', 'print'].forEach(function (id) { $(id).disabled = !ready; });
    $('notready').textContent = ready ? '' : (blocked === 'over' && res ? M.fill(C.overAllocationBlock, { qty: S.fmtQty(res.shortage), unit: u }) : blocked === 'count' ? C.tooFewHouseholds : blocked === 'duplicate' ? C.duplicateHousehold : C.notReady);
    var txt = ready ? proposal(res) : ''; $('text').value = txt; $('printout').textContent = txt;
  }
  function proposal(res) {
    var u = unit(), out = [C.proposalHeading + ': ' + M.strip(st.n), C.packageQtyLabel + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + C.priceLabel + ': ' + money(res.price) + ' · ' + C.feeLabel + ': ' + money(res.fee), ''];
    res.rows.forEach(function (r, i) { out.push(nameOf(i) + ': ' + S.fmtQty(r.qty) + ' ' + u + ' · ' + C.colItem + ' ' + money(r.goods) + ' + ' + C.colFee + ' ' + money(r.fee) + ' = ' + C.colPays + ' ' + money(r.total)); });
    out.push(C.unallocatedRow + ': ' + M.fill(C.unallocatedLine, { qty: S.fmtQty(res.unallocated.qty), unit: u, cost: money(res.unallocated.total) }));
    out.push(C.rowTotal + ': ' + S.fmtQty(res.pkgQty) + ' ' + u + ' · ' + money(res.total), '');
    out.push(M.fill(C.proposalPolicy, { feeBasisLine: C.feeBasisLine[st.b === 'e' ? 'equal' : 'proportional'], residualNote: C.residualNote }));
    out.push($('residual').textContent, C.proposalSnapshot, C.noPaymentNote);
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
    document.querySelectorAll('input[name=b]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) { st.b = r.value; edited(); } }); });
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
