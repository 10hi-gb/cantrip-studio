'use strict';
// One Less Trip — UI. Visitor text only via textContent/value. Nothing stored; ticks live in memory; the address bar is only ever cleared.
(function () {
  var C = COPY, M = MILL, O = OLT, $ = function (id) { return document.getElementById(id); };
  var st = O.blank(), checks = {}, editing = null, toastT = 0, mode = 'own', isCopy = false, prevSig = null, hhTouched = {}, V = window.MILLVIEW;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function toast(m) { V.toast(m, 3200); } // shared: route() clears it (QA N2)
  function clearHash() { if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
  function changed() { clearHash(); $('linkbox').hidden = true; $('fbwrap').hidden = true; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function qu(q, u) { return O.qtyUnit(q, u); }
  // D5: every sender-typed value (household, item, unit, stop) is quoted wherever it appears: DOM text via V.typed(),
  // plain-text places (aria-labels, toasts, option labels, notes) via V.quote(). Quantities are app-formatted numbers.
  function qt(s) { return V.quote(s); }
  function quT(q, u) { return O.fmtQty(q) + (u ? ' ' + qt(u) : ''); }
  function qtyNodes(parent, q, u) { parent.appendChild(el('span', 'olt-qty', O.fmtQty(q))); if (u) { parent.appendChild(document.createTextNode(' ')); parent.appendChild(V.typed(u, 'olt-unit')); } }

  // ---- households
  function drawHouseholds() {
    var ul = $('hh'); ul.textContent = '';
    st.h.forEach(function (h, i) {
      var li = el('li'), inp = el('input'); inp.id = 'hh-' + h.id; inp.value = h.name; inp.placeholder = C.householdPlaceholder; inp.autocomplete = 'off'; inp.setAttribute('aria-label', C.householdLabel + ' ' + (i + 1));
      var err = el('span', 'olt-err'); err.id = 'hhe-' + h.id; inp.setAttribute('aria-describedby', err.id);
      inp.addEventListener('input', function () { h.name = inp.value; hhTouched[h.id] = 1; changed(); refresh(); });
      inp.addEventListener('blur', function () { if (!hhTouched[h.id]) { hhTouched[h.id] = 1; V.afterPointer(function () { paintHH(); }); } });
      li.appendChild(inp);
      var rm = btn('olt-mini', C.removeHousehold.replace(/\s*\{name\}/, ''), function () { O.removeHousehold(st, h.id); changed(); drawHouseholds(); drawRows(); refresh(); var f = $('hh-add'); f.focus(); });
      rm.id = 'hhr-' + h.id; rm.setAttribute('aria-label', M.fill(C.removeHousehold, { name: M.strip(h.name) ? qt(M.strip(h.name)) : (C.householdLabel + ' ' + (i + 1)) })); rm.disabled = st.h.length <= O.LIM.hhMin; li.appendChild(rm); li.appendChild(err); ul.appendChild(li);
    });
  }
  // ---- source rows (left list)
  function drawRows() {
    var c = O.compute(st), ol = $('rows'); ol.textContent = '';
    c.rows.forEach(function (x) {
      var li = el('li', 'olt-row' + (x.ok ? '' : ' is-invalid')); li.id = 'row-' + x.id;
      li.appendChild(el('span', 'olt-src', x.tag));
      var what = el('span', 'olt-what'); if (x.owner) what.appendChild(V.typed(x.owner, null, 'b')); else what.appendChild(el('b', null, '—')); what.appendChild(document.createTextNode(' · ')); if (M.strip(x.row.i)) what.appendChild(V.typed(M.strip(x.row.i))); what.appendChild(document.createTextNode(' ' + quT(x.row.q, M.strip(x.row.u)))); li.appendChild(what);
      var wh = el('span', 'olt-where' + (x.stopKey ? '' : ' is-unknown')); if (x.stopKey) wh.appendChild(V.typed(M.strip(x.row.s))); else wh.textContent = C.unknownStop; li.appendChild(wh);
      if (!x.ok) li.appendChild(el('span', 'olt-err', x.err.o ? C.ownerMissing : x.err.i === 'empty' ? C.itemEmpty : C.qtyInvalid));
      var acts = el('span', 'olt-acts');
      var ed = btn('olt-mini', C.editRow, function () { startEdit(x.id); }); ed.id = 'ed-' + x.id; ed.setAttribute('aria-label', M.fill(C.editRowAria, { item: qt(M.strip(x.row.i)) + ' (' + x.tag + ')' }));
      var rm = btn('olt-mini', C.removeRow.replace(/\s*\{item\}/, '') || C.removeRow, function () { O.removeRow(st, x.id); delete checks['r' + x.id]; if (editing === x.id) stopEdit(); changed(); drawRows(); refresh(); $('f-i').focus(); });
      rm.id = 'rm-' + x.id; rm.setAttribute('aria-label', M.fill(C.removeRow, { item: qt(M.strip(x.row.i)) + ' (' + x.tag + ')' }));
      acts.appendChild(ed); acts.appendChild(rm); li.appendChild(acts); ol.appendChild(li);
    });
  }
  function ownerOptions() {
    var s = $('f-o'), v = s.value; s.textContent = ''; var o0 = el('option', null, C.ownerChoose); o0.value = ''; s.appendChild(o0);
    st.h.forEach(function (h, i) { var o = el('option', null, M.strip(h.name) ? qt(M.strip(h.name)) : (C.householdLabel + ' ' + (i + 1))); o.value = String(h.id); s.appendChild(o); });
    s.value = v; if (s.value !== v) s.value = '';
    var dl = $('stoplist'); dl.textContent = ''; O.compute(st).stops.forEach(function (x) { var o = el('option'); o.value = x.name; dl.appendChild(o); });
  }
  // ---- form
  function formErr(id, msg) { $('e-' + id).textContent = msg || ''; var f = $('f-' + id); if (f) { f.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) f.setAttribute('aria-describedby', 'e-' + id); } }
  function readForm() {
    ['o', 'i', 'q', 'u', 's'].forEach(function (k) { formErr(k, ''); }); $('e-form').textContent = '';
    var o = +$('f-o').value || null, i = $('f-i').value, q = O.parseQty($('f-q').value), u = $('f-u').value, s = $('f-x').checked ? '' : $('f-s').value, bad = null;
    function fail(k, m) { formErr(k, m); if (!bad) bad = k; }
    if (!o || !O.compute(st).rows && false) fail('o', C.ownerMissing); else if (!st.h.some(function (h) { return h.id === o && M.strip(h.name); })) fail('o', C.ownerMissing);
    var il = M.len(M.strip(i)); if (!il) fail('i', C.itemEmpty); else if (il > O.LIM.item) fail('i', M.plural(C.itemTooLong, il - O.LIM.item));
    if (!q.ok) fail('q', q.why === 'zero' ? C.qtyInvalid : q.why === 'big' ? M.fill(C.qtyTooBig, { max: O.LIM.qtyMax }) : C.qtyNotNumber);
    var ul = M.len(M.strip(u)); if (ul > O.LIM.unit) fail('u', M.plural(C.unitTooLong, ul - O.LIM.unit, { max: O.LIM.unit }));
    var sl = M.len(M.strip(s)); if (sl > O.LIM.stop) fail('s', M.plural(C.stopTooLong, sl - O.LIM.stop, { max: O.LIM.stop }));
    if (bad) { $('f-' + bad).focus(); return null; }
    return { o: o, i: M.strip(i), q: q.v, u: M.strip(u), s: M.strip(s) };
  }
  function clearForm(keepOwner) { var o = $('f-o').value; ['f-i', 'f-q', 'f-u'].forEach(function (id) { $(id).value = ''; }); if (!keepOwner) { $('f-s').value = ''; $('f-x').checked = false; $('f-s').disabled = false; } if (keepOwner) $('f-o').value = o; }
  function startEdit(id) {
    var r = st.r.filter(function (x) { return x.id === id; })[0]; if (!r) return; editing = id;
    $('f-o').value = r.o ? String(r.o) : ''; $('f-i').value = r.i; $('f-q').value = O.fmtQty(r.q); $('f-u').value = r.u; $('f-s').value = r.s; $('f-x').checked = !r.s; $('f-s').disabled = !r.s && false;
    $('f-add').textContent = C.saveRow; $('f-cancel').hidden = false; $('f-add').disabled = false; $('f-i').focus();
  }
  function stopEdit() { editing = null; $('f-add').textContent = C.addRow; $('f-cancel').hidden = true; clearForm(true); refresh(); }
  // ---- belt
  function ticket(b, n, unknown) {
    var a = el('article', 'olt-ticket' + (unknown ? ' is-unknown' : '')); a.setAttribute('data-stop', unknown ? '9' : String((n - 1) % 6 + 1)); var hid = 'tk-' + (unknown ? 'u' : n); a.setAttribute('aria-labelledby', hid);
    var stub = el('div', 'olt-stub'), num = el('div', 'olt-num', unknown ? '?' : pad(n)); num.setAttribute('aria-hidden', 'true'); stub.appendChild(num);
    var sd = el('div'), h = el('h3', 'olt-stopname' + (unknown ? '' : ' olt-typedstop')); if (unknown) h.textContent = C.unknownStop; else h.appendChild(V.typed(b.name)); h.id = hid; sd.appendChild(h);
    sd.appendChild(el('span', 'olt-stopmeta', M.plural(C.stopItems, b.rows.length) + ' · ' + b.rows.map(function (x) { return x.tag; }).join(' '))); stub.appendChild(sd); a.appendChild(stub);
    if (unknown) a.appendChild(el('p', 'olt-fine', C.unknownStopHint));
    var ul = el('ul', 'olt-items');
    b.lines.forEach(function (l) {
      var li = el('li', 'olt-item' + (checks[l.lk] ? ' is-done' : '')), cb = el('input', 'olt-check'); cb.type = 'checkbox'; cb.id = 'ck-' + l.lk; cb.checked = !!checks[l.lk];
      cb.setAttribute('aria-label', M.fill(C.checkAria, { item: qt(l.item) + ' ' + quT(l.q, l.unit), owner: l.traces.map(function (t) { return qt(t.owner); }).join(', '), stop: unknown ? C.unknownStop : qt(b.name) }));
      cb.addEventListener('change', function () { if (cb.checked) checks[l.lk] = 1; else delete checks[l.lk]; li.classList.toggle('is-done', cb.checked); progress(); });
      li.appendChild(cb);
      var line = el('div', 'olt-line'); qtyNodes(line, l.q, l.unit); line.appendChild(document.createTextNode(' ')); line.appendChild(V.typed(l.item, 'olt-name'));
      if (l.merged) line.appendChild(el('span', 'olt-merged', C.mergedBadge));
      var tags = el('div', 'olt-tags'); l.traces.forEach(function (t) { var tg = el('span', 'olt-tag'); tg.appendChild(V.typed(t.owner)); tg.appendChild(document.createTextNode(' ' + t.tag + (l.merged ? ' ·' + O.fmtQty(t.q) : ''))); tags.appendChild(tg); }); line.appendChild(tags);
      if (l.merged) { var ub = btn('olt-mini', C.unmergeButton, function () { var wasRecv = mode === 'recv'; O.unmerge(st, l.traces[0].id); delete checks[l.lk]; if (wasRecv) takeCopy(C.copyMergedNote); changed(); refresh(); if (wasRecv) offerLink(); toast(M.fill(C.unmergedStatus, { item: qt(l.item) })); var f = $('ck-r' + l.traces[0].id); if (f) f.focus(); }); ub.id = 'um-' + l.traces[0].id; line.appendChild(ub); }
      if (l.kept) line.appendChild(el('div', 'olt-note olt-note--kept', M.fill(C.keptSeparateUnit, { unit1: l.kept.unit1 ? qt(l.kept.unit1) : '—', unit2: l.kept.unit2 ? qt(l.kept.unit2) : '—' })));
      li.appendChild(line); ul.appendChild(li);
    });
    a.appendChild(ul);
    b.offers.forEach(function (of) {
      var nt = el('div', 'olt-note olt-note--merge'), owners = [].concat.apply([], of.lines.map(function (l) { return l.traces.map(function (t) { return t.owner; }); }));
      var tagsTxt = [].concat.apply([], of.lines.map(function (l) { return l.traces.map(function (t) { return t.tag; }); }));
      nt.appendChild(el('p', null, M.fill(C.duplicateFound, { owner1: owners.slice(0, -1).join('\u201D, \u201C'), owner2: owners[owners.length - 1], item: of.lines[0].item, unit: of.lines[0].unit ? qt(of.lines[0].unit) : '—' }) + ' ' + C.mergeHint));
      var mb = btn('olt-mini', C.mergeButton, function () { var wasRecv = mode === 'recv'; O.merge(st, of.stopKey, of.key); if (wasRecv) takeCopy(C.copyMergedNote); changed(); refresh(); if (wasRecv) offerLink(); toast(M.fill(C.mergedStatus, { item: qt(of.lines[0].item) })); var f = $('um-' + of.ids.slice().sort(function (p, q) { return idx(p) - idx(q); })[0]); if (f) f.focus(); });
      mb.id = 'mg-' + of.ids[0]; mb.setAttribute('aria-label', M.fill(C.mergeAria, { tags: tagsTxt.join(' + ') })); nt.appendChild(mb); a.appendChild(nt);
    });
    return a;
  }
  function idx(id) { for (var i = 0; i < st.r.length; i++) if (st.r[i].id === id) return i; return 1e9; }
  function progress() {
    var c = O.compute(st), keys = []; c.stops.concat([c.unknown]).forEach(function (b) { b.lines.forEach(function (l) { keys.push(l.lk); }); });
    Object.keys(checks).forEach(function (k) { if (keys.indexOf(k) < 0) delete checks[k]; });
    var n = keys.filter(function (k) { return checks[k]; }).length; $('progress').textContent = keys.length ? M.plural(C.progress, n).replace('{total}', String(keys.length)) + ' · ' + C.checksNote : '';
  }
  // Recipient view is read-only in the DOM (shared helper): the intake is hidden and its controls disabled (never inert), Start over is gone.
  // Shopping ticks stay usable; they live in this tab only and are never in the link.
  function applyMode() { var r = mode === 'recv'; V.readOnly($('intake'), r); $('intake').hidden = r; $('b-reset').hidden = r; $('b-reset').disabled = r; $('samestop').hidden = r; }
  // Recipient changes (Merge / Split back out / Make my own) turn the list into the recipient's own copy: banner says so, the
  // sender isn't notified, the editor appears, and any link made from here is labelled as their copy's link.
  function takeCopy(note) { mode = 'own'; isCopy = true; clearHash(); $('banner').hidden = false; $('banner-t').textContent = note; $('banner-typed').hidden = true; $('own-copy').hidden = true; $('link-l').textContent = C.ownLinkLabel; }
  function offerLink() { var u = makeLink(); if (u) showLink(u); }
  function linkPrefix() { return location.origin + location.pathname + '#'; }
  // Belt motion (Creative DIRECTION §6): ribs advance and new/changed tickets slide in when the grouping changes.
  // Only under prefers-reduced-motion: no-preference (CSS is guarded too); reduced motion = instant state change.
  function motionOK() { return !window.matchMedia || window.matchMedia('(prefers-reduced-motion: no-preference)').matches; }
  function animateBelt(c) {
    var sig = {}; c.stops.forEach(function (s) { sig[s.key] = s.n + '|' + s.lines.map(function (l) { return l.lk + ':' + l.q; }).join(','); });
    var prev = prevSig; prevSig = sig; if (!prev || !motionOK()) return;
    var changedAny = false;
    [].forEach.call($('lane').querySelectorAll('article.olt-ticket'), function (a) { var k = a.getAttribute('data-key'); if (prev[k] !== sig[k]) { a.classList.add('is-arriving'); changedAny = true; } });
    if (Object.keys(prev).length !== Object.keys(sig).length) changedAny = true;
    if (!changedAny) return;
    [].forEach.call($('lane').querySelectorAll('.olt-divider'), function (d, i) { if (i >= Object.keys(prev).length - 1) d.classList.add('is-dropping'); });
    var b = $('belt'); b.classList.remove('is-advancing'); void b.offsetWidth; b.classList.add('is-advancing');
  }
  // Household errors painted IN PLACE (no rebuild): a blur on an untouched field only marks it touched and repaints these
  // spans, so the click that caused the blur still lands on the button under the pointer (QA N1).
  function paintHH(c) {
    c = c || O.compute(st);
    var herr = {}; c.hhErr.forEach(function (e) { if (e.id) herr[e.id] = e; });
    // An empty household name is only flagged once that field was used (or a row was added): a blank start shows no errors.
    st.h.forEach(function (h) { var e = herr[h.id], inp = $('hh-' + h.id); if (!inp) return; if (e && e.why === 'empty' && !hhTouched[h.id] && !st.r.length) e = null; if (e) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid');
      $('hhe-' + h.id).textContent = !e ? '' : e.why === 'empty' ? C.householdEmpty : e.why === 'dup' ? C.householdDuplicate : M.plural(C.householdTooLong, e.over);
      var rm = $('hhr-' + h.id); if (rm) rm.setAttribute('aria-label', M.fill(C.removeHousehold, { name: M.strip(h.name) ? qt(M.strip(h.name)) : C.householdLabel })); });
  }
  function refresh() { refresh0(); applyMode(); }
  function refresh0() {
    if (mode === 'own') O.prune(st); // D10: a merge an edit dissolved never comes back by itself
    var c = O.compute(st), L = c.ledger;
    paintHH(c);
    $('hh-meta').textContent = M.plural(C.householdCount, st.h.length);
    $('hh-add').disabled = st.h.length >= O.LIM.hhMax; $('hh-e').textContent = st.h.length >= O.LIM.hhMax ? C.tooManyHouseholds : '';
    $('rows-meta').textContent = M.plural(C.rowCount, st.r.length) + (st.r.length >= O.LIM.rows ? ' · ' + C.tooManyRows : '');
    $('f-add').disabled = !editing && st.r.length >= O.LIM.rows;
    ownerOptions(); drawRows();
    // ledger: in = on tickets + set aside + held back
    var lg = $('ledger'); lg.textContent = '';
    lg.appendChild(el('span', null, M.plural(C.ledgerIn, L.inn))); lg.appendChild(el('span', null, M.plural(C.ledgerPlaced, L.placed))); lg.appendChild(el('span', null, M.plural(C.ledgerSetAside, L.aside)));
    if (L.held) lg.appendChild(el('span', 'is-off', M.plural(C.ledgerHeld, L.held))); else if (L.inn) lg.appendChild(el('b', null, C.allSourceNote));
    $('fix').hidden = !L.held; $('fix').textContent = L.held ? M.plural(C.rowsNeedFixing, L.held) : '';
    // belt
    var lane = $('lane'); lane.textContent = '';
    if (!c.stops.length) { var em = el('div', 'olt-empty'), g = el('div', 'olt-ghost', '01'); g.setAttribute('aria-hidden', 'true'); em.appendChild(g); em.appendChild(el('p', null, L.aside ? '' : C.emptyState)); lane.appendChild(em); }
    c.stops.forEach(function (s, i) { if (i) { var d = el('div', 'olt-divider'); d.setAttribute('aria-hidden', 'true'); lane.appendChild(d); } var tk = ticket(s, s.n, false); tk.setAttribute('data-key', s.key); lane.appendChild(tk); });
    animateBelt(c); drawSameStops(c);
    $('belt').setAttribute('aria-label', M.plural({ one: C.stopsAria, other: C.stopsAria }, c.stops.length).replace('{n}', String(c.stops.length)));
    $('tray').hidden = !c.unknown.lines.length; var tt = $('tray-t'); tt.textContent = ''; if (c.unknown.lines.length) tt.appendChild(ticket(c.unknown, 0, true));
    var anyKept = c.stops.concat([c.unknown]).some(function (b) { return b.lines.some(function (l) { return l.kept; }); });
    $('notes').textContent = anyKept ? C.similarNote : '';
    progress();
    var can = O.canShare(st); ['b-copy', 'b-print', 'b-share'].forEach(function (id) { $(id).disabled = !can; });
    $('blocked').hidden = !(st.r.length && !can); $('blocked').textContent = C.copyBlocked;
    $('fallback').value = can ? O.text(st, C) : '';
    // D11: the whole URL is capped at URL_MAX; the current length is always shown, nothing is cut silently.
    var f = can ? O.rawFragment(st) : null, lr = $('linkroom');
    if (f == null) { lr.textContent = ''; lr.classList.remove('is-over'); }
    else { var n = linkPrefix().length + f.length; /* N4: the real length of the link this list would make, even when over */ lr.textContent = M.fill(C.linkRoom, { n: n.toLocaleString('en-US'), max: O.URL_MAX.toLocaleString('en-US') }) + (n > O.URL_MAX ? ' ' + C.tooLongLink : ''); lr.classList.toggle('is-over', n > O.URL_MAX); }
  }
  // PM 2: "Same stop?" prompt, never an automatic grouping.
  function drawSameStops(c) {
    var box = $('samestop'); box.textContent = ''; if (mode !== 'own') return;
    O.sameStops(st, c).forEach(function (q, i) {
      var nt = el('div', 'olt-note olt-note--merge olt-same'); nt.appendChild(el('p', null, M.fill(C.sameStopPrompt, { a: q.nameA, b: q.nameB })));
      var y = btn('olt-mini', C.sameStopYes, function () { O.sameStop(st, q.a, q.b); changed(); refresh(); var f = $('samestop').querySelector('button') || $('b-copy'); f.focus(); }); y.id = 'ss-y-' + i;
      var n = btn('olt-mini', C.sameStopNo, function () { O.notSameStop(st, q.a, q.b); refresh(); var f = $('samestop').querySelector('button') || $('b-copy'); f.focus(); }); n.id = 'ss-n-' + i;
      nt.appendChild(y); nt.appendChild(document.createTextNode(' ')); nt.appendChild(n); box.appendChild(nt);
    });
  }
  function showFallback() { var w = $('fbwrap'), f = $('fallback'); f.value = O.text(st, C); w.hidden = false; f.focus(); f.select(); }
  function showLink(u) { $('linkbox').hidden = false; var l = $('link'); l.value = u; l.focus(); l.select(); }
  function makeLink() { var f = O.encode(st, O.URL_MAX - linkPrefix().length); if (f === null) return null; if (f === '') { toast(C.tooLongLink); showFallback(); return null; } return linkPrefix() + f; }

  function init() {
    document.title = C.title + ' · ' + C.studioName; $('home').textContent = '← ' + C.backLabel; $('strip').textContent = C.studioLabel;
    $('title').textContent = C.title; $('lede').textContent = C.invitation; $('skip').textContent = C.skipToStops;
    $('hh-h').textContent = C.householdsHeading; $('hh-add').textContent = C.addHousehold; $('rows-h').textContent = C.itemsHeading;
    $('l-o').textContent = C.ownerLabel; $('l-i').textContent = C.itemLabel; $('l-q').textContent = C.qtyLabel; $('l-u').textContent = C.unitLabel; $('l-s').textContent = C.stopLabel; $('l-x').textContent = C.stopUnknownOption;
    $('f-i').placeholder = C.itemPlaceholder; $('f-q').placeholder = C.qtyPlaceholder; $('f-u').placeholder = C.unitPlaceholder; $('f-s').placeholder = C.stopPlaceholder;
    $('f-add').textContent = C.addRow; $('f-cancel').textContent = C.cancelEdit;
    $('hh-hint').textContent = C.householdHint; $('h-s').textContent = C.stopHint; $('limits').textContent = M.fill(C.limitsNote, { name: O.LIM.name, item: O.LIM.item, unit: O.LIM.unit, stop: O.LIM.stop, url: O.URL_MAX.toLocaleString('en-US') });
    $('st-h').textContent = C.stopsHeading; $('order').textContent = C.notOrdered; $('tray-h').textContent = C.unknownStop;
    $('b-copy').textContent = C.copyList; $('b-print').textContent = C.printList; $('b-share').textContent = C.share; $('b-reset').textContent = C.reset;
    $('privacy').textContent = C.privacy; $('link-l').textContent = C.linkLabel; $('fb-l').textContent = C.copyTextLabel; $('pfoot').textContent = C.printFooter; $('own-copy').textContent = C.receiverPrimary;
    $('hh-add').addEventListener('click', function () { if (st.h.length >= O.LIM.hhMax) return; var h = { id: st.next++, name: '' }; st.h.push(h); changed(); drawHouseholds(); refresh(); $('hh-' + h.id).focus(); });
    $('f-x').addEventListener('change', function () { $('f-s').disabled = $('f-x').checked; });
    $('form').addEventListener('submit', function (e) { e.preventDefault();
      if (!editing && st.r.length >= O.LIM.rows) { $('e-form').textContent = C.tooManyRows; return; }
      var r = readForm(); if (!r) return;
      if (editing) { var x = st.r.filter(function (y) { return y.id === editing; })[0]; if (x) { x.o = r.o; x.i = r.i; x.q = r.q; x.u = r.u; x.s = r.s; } editing = null; $('f-add').textContent = C.addRow; $('f-cancel').hidden = true; }
      else { r.id = st.next++; st.r.push(r); }
      changed(); clearForm(true); refresh(); $('f-i').focus(); });
    $('f-cancel').addEventListener('click', function () { stopEdit(); $('f-i').focus(); });
    $('b-copy').addEventListener('click', function () { var t = O.text(st, C); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showFallback(); }); else { toast(C.copyFail); showFallback(); } });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-share').addEventListener('click', function () { var u = makeLink(); if (!u) return; showLink(u);
      if (navigator.share) navigator.share({ title: C.title, text: C.shareText, url: u }).then(function () {}, function () { toast(C.shareCancel); showLink(u); });
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showLink(u); });
      else { toast(C.copyFail); showLink(u); } });
    $('b-reset').addEventListener('click', function () { if (mode !== 'own' || !window.confirm(C.resetConfirm)) return; clearHash(); load(''); toast(C.resetDone); $('hh-' + st.h[0].id).focus(); });
    $('own-copy').addEventListener('click', function () { takeCopy(C.copyTakenNote); refresh(); $('hh-' + st.h[0].id).focus(); });
    V.route(load);
  }
  // Every load and every hashchange (valid, bad, old or empty) starts from a blank tab: nothing from a previous link survives.
  function load(h) {
    var bn = $('banner');
    st = O.blank(); checks = {}; editing = null; mode = 'own'; isCopy = false; prevSig = null; hhTouched = {}; $('link-l').textContent = C.linkLabel; $('banner-typed').hidden = true;
    $('f-add').textContent = C.addRow; $('f-cancel').hidden = true; V.clearInputs($('form')); $('f-s').disabled = false;
    ['o', 'i', 'q', 'u', 's'].forEach(function (k) { formErr(k, ''); }); $('e-form').textContent = ''; V.clearErrors(document, '.olt-err');
    bn.hidden = true; $('own-copy').hidden = true; $('linkbox').hidden = true; $('link').value = ''; $('fbwrap').hidden = true; $('fallback').value = '';
    if (h) {
      var d = O.decode(h);
      if (d.ok) { st = d.data; mode = 'recv'; bn.hidden = false; $('banner-t').textContent = C.receiverIntro + ' ' + C.receiverNote; $('banner-typed').textContent = C.receiverTypedNote; $('banner-typed').hidden = false; $('own-copy').hidden = false; }
      else if (d.why !== 'empty') { bn.hidden = false; $('banner-t').textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; }
    }
    drawHouseholds(); refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
