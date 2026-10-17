'use strict';
// Even Up — UI. Visitor text only via textContent/value; every typed name, event and "what for" is shown through
// MILLVIEW.typed (DOM) or MILLVIEW.quote (aria, options, toasts, copied text). Nothing stored; the address bar is only
// ever set by the visitor opening a link and is cleared on any edit or Clear. All money comes from EU (integer cents).
(function () {
  var C = COPY, M = MILL, E = EU, V = window.MILLVIEW, $ = function (id) { return document.getElementById(id); };
  var st = E.blank(), mode = 'own', editing = null, touched = {}, showAll = false, form = null, prevSide = {};
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function qt(s) { return V.quote(s); }
  function sym() { return E.CUR[st.cur] || E.CUR[0]; }
  function money(c, signed) { return E.fmt(c, sym(), signed); }
  function pname(id) { var p = E.person(st, id); return p ? M.strip(p.name) : ''; }
  // a person's name for display: typed -> quoted; never named yet -> "?" (product placeholder, unquoted)
  function nameNode(id, tag) { var n = pname(id); return n ? V.typed(n, null, tag) : el(tag || 'span', 'eu-unnamed', '?'); }
  function nameText(id, i) { var n = pname(id); return n ? qt(n) : C.personLabel + ' ' + (i + 1); }
  // Build DOM from a Writer template: {slot} -> Node | string. Text outside slots stays product text.
  function tpl(t, map) {
    var f = document.createDocumentFragment(), re = /\{(\w+)\}/g, last = 0, m;
    while ((m = re.exec(t))) { if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index))); var v = map[m[1]]; f.appendChild(v == null ? document.createTextNode(m[0]) : typeof v === 'string' ? document.createTextNode(v) : v); last = re.lastIndex; }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last))); return f;
  }
  // the event: typed -> quoted; left blank -> Writer's title as the default (unquoted product text)
  function eventNode() { var e = M.strip(st.ev); return e ? V.typed(e) : document.createTextNode(C.title); }
  // QA E2: frame name. Same quoted text as V.typed (class mill-typed), but the closing quote is held to the last word
  // (or, for one very long word, to its last two letters) with a no-wrap span, so it can never sit alone on a line.
  function frameName(id) {
    var n = pname(id); if (!n) return el('span', 'eu-unnamed', '?');
    var q = V.quote(n), cut = q.lastIndexOf(' ') + 1; if (q.length - cut > 14) cut = Math.max(1, q.length - 3);
    var s = el('span', 'mill-typed'); if (cut) s.appendChild(document.createTextNode(q.slice(0, cut))); s.appendChild(el('span', 'eu-nobr', q.slice(cut))); return s;
  }
  function listNodes(ids) { var f = document.createDocumentFragment(); ids.forEach(function (id, i) { if (i) f.appendChild(document.createTextNode(', ')); f.appendChild(nameNode(id)); }); return f; }
  function toast(m) { V.toast(m, 3200); }
  function clearHash() { if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
  function changed() { clearHash(); $('linkbox').hidden = true; $('fbwrap').hidden = true; }
  function linkPrefix() { return location.origin + location.pathname + '#'; }

  // ---------- people + event
  function drawPeople() {
    var ul = $('plist'); ul.textContent = '';
    st.p.forEach(function (p, i) {
      var li = el('li'), inp = el('input'); inp.id = 'p-' + p.id; inp.value = p.name; if (!i) inp.placeholder = C.personPlaceholder; inp.autocomplete = 'off'; inp.setAttribute('aria-label', C.personLabel + ' ' + (i + 1));
      var err = el('span', 'eu-err'); err.id = 'pe-' + p.id;
      inp.addEventListener('input', function () { p.name = inp.value; touched['p' + p.id] = 1; changed(); refresh(); });
      inp.addEventListener('blur', function () { if (!touched['p' + p.id]) { touched['p' + p.id] = 1; V.afterPointer(refresh); } });
      var rm = btn('eu-btn eu-mini', C.removePerson.replace(/\s*\{name\}/, ''), function () { if (!E.removePerson(st, p.id)) return; if (form) delete form.inc[p.id]; changed(); drawPeople(); refresh(); $('p-add').focus(); });
      rm.id = 'pr-' + p.id; li.appendChild(inp); li.appendChild(rm); li.appendChild(err); ul.appendChild(li);
    });
  }
  function paintPeople(c) {
    var errs = c.pErr, byId = {}; errs.forEach(function (e) { if (e.id != null && !byId[e.id]) byId[e.id] = e; });
    st.p.forEach(function (p, i) {
      var e = byId[p.id], show = e && (showAll || touched['p' + p.id]), inp = $('p-' + p.id), out = $('pe-' + p.id); if (!inp) return;
      out.textContent = !show ? '' : e.why === 'empty' ? C.personEmpty : e.why === 'dup' ? C.duplicatePerson : M.plural(C.personTooLong, e.over);
      inp.setAttribute('aria-invalid', show ? 'true' : 'false'); if (show) inp.setAttribute('aria-describedby', out.id); else inp.removeAttribute('aria-describedby');
      var rm = $('pr-' + p.id); rm.setAttribute('aria-label', M.fill(C.removePerson, { name: M.raw(nameText(p.id, i)) })); rm.disabled = st.p.length <= E.LIM.pMin;
    });
    var ev = errs.filter(function (e) { return e.why === 'eventLong'; })[0], sh = ev && (showAll || touched.ev);
    $('e-ev').textContent = !sh ? '' : M.plural(C.eventTooLong, ev.over);
    $('ev').setAttribute('aria-invalid', sh ? 'true' : 'false'); if (sh) $('ev').setAttribute('aria-describedby', 'e-ev'); else $('ev').removeAttribute('aria-describedby');
    $('p-meta').textContent = M.plural(C.personCount, st.p.length);
    $('p-add').disabled = st.p.length >= E.LIM.pMax; $('p-hint').textContent = st.p.length >= E.LIM.pMax ? C.tooManyPeople : ''; // QA E8: a neutral hint, not an error
  }
  // ---------- expense form (memory only)
  function blankForm() { var f = { what: '', amt: '', payer: st.p.length ? st.p[0].id : null, mode: 'e', inc: {}, w: {} }; st.p.forEach(function (p) { f.inc[p.id] = true; f.w[p.id] = '1'; }); return f; }
  function drawForm() {
    $('f-what').value = form.what; $('f-amt').value = form.amt;
    var s = $('f-payer'); s.textContent = ''; st.p.forEach(function (p, i) { var o = el('option', null, pname(p.id) ? qt(pname(p.id)) : '?'); o.value = String(p.id); s.appendChild(o); });
    s.value = form.payer != null ? String(form.payer) : ''; if (s.value !== String(form.payer)) { s.value = st.p.length ? String(st.p[0].id) : ''; form.payer = st.p.length ? st.p[0].id : null; }
    $('m-e').setAttribute('aria-pressed', String(form.mode === 'e')); $('m-w').setAttribute('aria-pressed', String(form.mode === 'w'));
    var box = $('chips'); box.textContent = '';
    st.p.forEach(function (p, i) {
      if (!(p.id in form.inc)) { form.inc[p.id] = true; form.w[p.id] = '1'; }
      var wrap = el('span', 'eu-chipwrap'), on = !!form.inc[p.id], b = el('button', 'eu-chip'); b.type = 'button'; b.id = 'c-' + p.id; b.setAttribute('aria-pressed', String(on)); b.appendChild(nameNode(p.id));
      b.addEventListener('click', function () { form.inc[p.id] = !form.inc[p.id]; b.setAttribute('aria-pressed', String(!!form.inc[p.id])); var w = $('w-' + p.id); if (w) w.disabled = !form.inc[p.id]; });
      wrap.appendChild(b);
      if (form.mode === 'w') { var w = el('input', 'eu-w'); w.id = 'w-' + p.id; w.inputMode = 'decimal'; w.autocomplete = 'off'; w.value = form.w[p.id]; w.disabled = !on; w.setAttribute('aria-label', C.weightLabel + ' ' + nameText(p.id, i)); w.setAttribute('aria-describedby', 'w-hint'); w.addEventListener('input', function () { form.w[p.id] = w.value; }); wrap.appendChild(w); }
      box.appendChild(wrap);
    });
    $('w-hint').hidden = form.mode !== 'w';
    $('f-add').textContent = editing ? C.saveExpense : C.addExpense; $('f-cancel').hidden = !editing;
  }
  function fErr(k, msg) { var o = $('e-' + k); o.textContent = msg || ''; var f = k === 'split' ? null : $('f-' + k); if (f) { f.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) f.setAttribute('aria-describedby', 'e-' + k); else f.removeAttribute('aria-describedby'); } }
  function clearFormErrs() { ['what', 'amt', 'payer', 'split'].forEach(function (k) { fErr(k, ''); }); $('e-form').textContent = ''; $('chips').querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); }); }
  function readForm() {
    clearFormErrs(); var first = null, out = { what: M.strip(form.what), mode: form.mode, inc: [], w: {} };
    function fail(k, m, focusEl) { fErr(k, m); if (!first) first = focusEl || $('f-' + k); }
    var wl = M.len(out.what); if (!wl) fail('what', C.expenseEmpty); else if (wl > E.LIM.what) fail('what', M.plural(C.eventTooLong, wl - E.LIM.what));
    var a = E.parseAmount(form.amt);
    if (!a.ok) fail('amt', a.why === 'empty' ? C.errorNumber : a.why === 'negative' ? C.errorNegative : a.why === 'big' ? C.errorTooBig : a.why === 'commas' ? C.errorCommas : C.errorPlainAmount); else out.amt = a.v;
    var py = +$('f-payer').value; if (!E.person(st, py)) fail('payer', C.errorNoPayer); else out.payer = py;
    st.p.forEach(function (p) { if (form.inc[p.id]) out.inc.push(p.id); });
    if (!out.inc.length) fail('split', C.errorNoParticipants, $('c-' + st.p[0].id));
    else if (form.mode === 'w') {
      var ws = out.inc.map(function (id) { return { id: id, r: E.parseWeight(form.w[id]) }; }), zero = ws.every(function (x) { return x.r.why === 'zero'; });
      var badW = ws.filter(function (x) { return !x.r.ok; });
      if (badW.length) { badW.forEach(function (x) { $('w-' + x.id).setAttribute('aria-invalid', 'true'); });
        fail('split', zero ? C.errorWeightZero : badW.some(function (x) { return x.r.why === 'big'; }) && badW.every(function (x) { return x.r.why === 'big'; }) ? M.fill(C.weightTooBig, { max: E.fmtWeight(E.LIM.wMax) }) : C.errorWeight, $('w-' + badW[0].id)); }
      else ws.forEach(function (x) { out.w[x.id] = x.r.v; });
    }
    if (first) { first.focus(); return null; } return out;
  }
  function startEdit(id) {
    var x = st.x.filter(function (y) { return y.id === id; })[0]; if (!x) return; editing = id; clearFormErrs();
    form = { what: x.what, amt: E.fmt(x.amt, '').replace(/,/g, ''), payer: x.payer, mode: x.mode, inc: {}, w: {} };
    st.p.forEach(function (p) { form.inc[p.id] = x.inc.indexOf(p.id) >= 0; form.w[p.id] = x.w[p.id] > 0 ? E.fmtWeight(x.w[p.id]) : x.w[p.id] === 0 ? '0' : '1'; });
    drawForm(); $('f-what').focus();
  }
  function stopEdit() { editing = null; form = blankForm(); clearFormErrs(); drawForm(); }

  // ---------- the counting frame
  // Rods are kept per person while the people list is unchanged, so a token slides to its new balance (DIRECTION §6).
  var rodEls = {}, rodKey = '';
  function drawFrame(c) {
    var ol = $('rods'), max = 0; c.balances.forEach(function (b) { max = Math.max(max, Math.abs(b.net)); });
    ol.setAttribute('aria-label', M.plural({ one: C.balancesAria, other: C.balancesAria }, st.p.length));
    var key = st.p.map(function (p) { return p.id; }).join(',');
    if (key !== rodKey) { rodKey = key; rodEls = {}; ol.textContent = '';
      st.p.forEach(function (p) { var li = el('li', 'eu-rod-row'), nm = el('span', 'eu-name'), rod = el('div', 'eu-rod'), tok = el('span', 'eu-token'); li.setAttribute('data-id', p.id);
        rod.appendChild(el('span', 'eu-trail')); rod.appendChild(tok); li.appendChild(nm); li.appendChild(rod); ol.appendChild(li); rodEls[p.id] = { li: li, nm: nm, rod: rod, tok: tok }; }); }
    c.balances.forEach(function (b) {
      var R = rodEls[b.id], side = b.net < 0 ? 'owes' : b.net > 0 ? 'owed' : 'even';
      R.nm.textContent = ''; R.nm.appendChild(frameName(b.id)); R.li.classList.toggle('is-unnamed', !pname(b.id));
      R.rod.setAttribute('data-side', side); R.rod.style.setProperty('--p', max ? (Math.abs(b.net) / max).toFixed(3) : '0');
      R.tok.textContent = ''; R.tok.appendChild(el('span', 'eu-fig', money(Math.abs(b.net)))); R.tok.appendChild(el('small', null, side === 'owes' ? C.tagOwes : side === 'owed' ? C.tagOwed : C.tagEven));
      if (prevSide[b.id] != null && prevSide[b.id] !== b.net) { R.tok.classList.remove('is-arriving'); void R.tok.offsetWidth; R.tok.classList.add('is-arriving'); }
      prevSide[b.id] = b.net; R.tok.hidden = !st.x.length; // s5: before anything is on the tape the rods are bare
    });
    $('frame').classList.toggle('is-empty', !st.x.length);
    $('empty').textContent = st.x.length ? '' : C.emptyState; $('empty').hidden = !!st.x.length;
    layoutLines(c);
  }
  // Settlement brackets in the margin: payer dot -> payee arrowhead, a number matching the payments list (the list is
  // the accessible source; the brackets carry only that number, so nothing factual is hidden from assistive tech).
  var lastC = null;
  function layoutLines(c) {
    lastC = c; var box = $('lines'); box.textContent = '';
    var ids = st.p.map(function (p) { return p.id; }), rows = ids.map(function (id) { return rodEls[id]; }), idx = {}; ids.forEach(function (id, i) { idx[id] = i; });
    var T = c.transfers.map(function (t, i) { var a = idx[t.from], b = idx[t.to]; return { i: i, top: Math.min(a, b), bot: Math.max(a, b), dir: a < b ? 'down' : 'up' }; });
    var tracks = []; T.slice().sort(function (x, y) { return (x.bot - x.top) - (y.bot - y.top) || x.i - y.i; }).forEach(function (t) {
      var k = 0; while (tracks[k] && tracks[k].some(function (o) { return t.top <= o.bot && o.top <= t.bot; })) k++; (tracks[k] = tracks[k] || []).push(t); t.k = k; });
    var narrow = window.matchMedia && window.matchMedia('(max-width: 699px)').matches, gap = narrow ? (tracks.length > 4 ? 12 : 19) : 26;
    $('frame').style.setProperty('--eu-settle', T.length ? (16 + 8 + Math.max(0, tracks.length - 1) * gap + 24) + 'px' : (narrow ? '12px' : '24px'));
    box.style.setProperty('--gap', gap + 'px');
    // QA E1 (measured after the margin width is set, so the rod is at its final size): the figure never wraps (white-space:nowrap);
    // a token wider than its half of the rod steps its figure 13 -> 12 -> 11 -> 10px. QA E9 (Creative): if any token would need 11px or
    // less, or the screen is <=360px with more than 4 people, every token drops its visible tag (eu-notags; still in the accessible text).
    var fr = $('frame'), tiers = ['is-tight', 'is-tighter', 'is-tightest'];
    function fit(R) { var room = R.rod.clientWidth / 2 - 6, k = 0; R.tok.classList.remove.apply(R.tok.classList, tiers); while (k < tiers.length && R.tok.offsetWidth > room) R.tok.classList.add(tiers[k++]); return k; }
    fr.classList.remove('eu-notags');
    var deep = st.x.length && (window.matchMedia && window.matchMedia('(max-width: 360px)').matches && st.p.length > 4);
    rows.forEach(function (R) { if (fit(R) >= 2) deep = true; });
    if (deep) { fr.classList.add('eu-notags'); rows.forEach(fit); }
    rows.forEach(function (R) { R.rod.style.setProperty('--half', Math.ceil(R.tok.offsetWidth / 2) + 'px'); });
    var bTop = box.getBoundingClientRect().top, cy = rows.map(function (R) { var r = R.rod.getBoundingClientRect(); return r.top + r.height / 2 - bTop; });
    T.forEach(function (t) {
      var ln = el('div', 'eu-link'); ln.setAttribute('data-dir', t.dir); ln.style.setProperty('--k', String(t.k)); ln.style.top = cy[t.top] + 'px'; ln.style.height = Math.max(2, cy[t.bot] - cy[t.top]) + 'px'; box.appendChild(ln);
      var n = el('b', 'eu-link-num', String(t.i + 1)); n.style.setProperty('--k', String(t.k)); n.style.top = ((cy[t.top] + cy[t.bot]) / 2) + 'px'; box.appendChild(n);
    });
    $('legend').hidden = !T.length; $('legend').textContent = C.numberedLegend;
  }
  // ---------- settle card
  function drawSettle(c, ok) {
    var ol = $('transfers'); ol.textContent = '';
    if (!st.x.length || (!c.transfers.length && !ok)) { $('settle-h').textContent = C.settleHeading; $('settle-count').textContent = ''; $('settle-check').textContent = ''; $('notfewest').hidden = true; return; }
    if (!c.transfers.length) { $('settle-h').textContent = C.noTransfers; $('settle-count').textContent = ''; $('settle-check').textContent = '\u2713 ' + M.fill(C.allZeroLine, { zero: money(0) }); $('notfewest').hidden = true; return; }
    $('settle-h').textContent = C.settleHeading; $('settle-count').textContent = M.plural(C.settleCount, c.transfers.length);
    ol.setAttribute('aria-label', M.plural({ one: C.settleAria, other: C.settleAria }, c.transfers.length));
    c.transfers.forEach(function (t, i) {
      var li = el('li'), num = el('span', 'eu-num', String(i + 1)); num.setAttribute('aria-hidden', 'true'); li.appendChild(num);
      li.appendChild(tpl(C.settleLine, { from: nameNode(t.from, 'b'), to: nameNode(t.to, 'b'), amount: el('span', 'eu-amt-t', money(t.c)) })); ol.appendChild(li);
    });
    $('settle-check').textContent = '\u2713 ' + C.settleNote; $('notfewest').hidden = false; $('notfewest').textContent = C.notFewestNote;
  }
  // ---------- audit tape
  function errText(x, e) {
    if (e.what) return e.what === 'empty' ? C.expenseEmpty : M.plural(C.eventTooLong, M.len(M.strip(x.what)) - E.LIM.what);
    if (e.amt) return e.amt === 'negative' ? C.errorNegative : e.amt === 'big' ? C.errorTooBig : C.errorPlainAmount;
    if (e.payer) return e.payer === 'gone' ? M.fill(C.errorPayerMissing, { name: qt(x.gone) }) : C.errorNoPayer;
    if (e.split) return e.split === 'none' ? C.errorNoParticipants : e.split === 'weightZero' ? C.errorWeightZero : C.errorWeight;
    return '';
  }
  function errNodes(x, e) { return e.payer === 'gone' && !e.what && !e.amt ? tpl(C.errorPayerMissing, { name: V.typed(x.gone) }) : document.createTextNode(errText(x, e)); }
  function drawTape(c) {
    var box = $('xs'); box.textContent = '';
    $('tape-h').textContent = C.auditHeading; $('tape-meta').textContent = sym() + ' \u00B7 ' + M.plural(C.expenseCount, st.x.length);
    c.xs.forEach(function (r) {
      var x = r.x, d = el('div', 'eu-x' + (r.ok ? '' : ' is-invalid')); d.id = 'x-' + x.id; d.tabIndex = -1;
      var h = el('div', 'eu-x-h'), hl = el('span'); hl.appendChild(document.createTextNode('#' + r.n + ' ')); if (M.strip(x.what)) hl.appendChild(V.typed(M.strip(x.what))); h.appendChild(hl); h.appendChild(el('span', null, typeof x.amt === 'number' && x.amt >= 0 && x.amt % 1 === 0 ? money(x.amt) : '')); d.appendChild(h);
      var ids = E.parts(st, x);
      if (r.ok) {
        var meta = el('div', 'eu-x-meta'); meta.appendChild(tpl(C.auditLine, { payer: nameNode(x.payer), amount: money(x.amt), expense: V.typed(M.strip(x.what)), mode: x.mode === 'w' ? C.splitModesInline.weighted : C.splitModesInline.equal, people: listNodes(ids) }));
        d.appendChild(meta); meta = el('div', 'eu-x-meta'); // QA E6: nothing after the sentence's full stop; weights / not-in-it on their own line
        if (x.mode === 'w') { meta.appendChild(document.createTextNode(C.splitModes.weighted + ': ')); ids.forEach(function (id, i) { if (i) meta.appendChild(document.createTextNode(', ')); meta.appendChild(nameNode(id)); meta.appendChild(document.createTextNode(' ' + E.fmtWeight(x.w[id]))); }); }
        if (r.out.length) { if (meta.firstChild) meta.appendChild(document.createTextNode(' \u00B7 ')); meta.appendChild(tpl(C.notInIt, { names: listNodes(r.out) })); }
        if (meta.firstChild) d.appendChild(meta);
        var dl = el('dl');
        r.shares.forEach(function (s) { var dt = el('dt'); dt.appendChild(nameNode(s.id)); var dd = el('dd'); dd.appendChild(el('span', 'eu-amt', money(s.c)));
          // QA E5: the final share is the figure; the rounding cent is Writer's note after it (screen readers: residualMarkAria)
          if (s.extra) { var mk = el('span', 'eu-rmark', C.residualMark); mk.setAttribute('aria-hidden', 'true'); dd.appendChild(el('span', 'eu-sr', ', ' + C.residualMarkAria)); dd.appendChild(mk); } else dd.appendChild(el('span', 'eu-rmark')); dl.appendChild(dt); dl.appendChild(dd); });
        dl.appendChild(el('dt', 'eu-total', C.tapeShares)); var tdd = el('dd', 'eu-total'); tdd.appendChild(el('span', 'eu-amt', money(r.total) + ' \u2713')); tdd.appendChild(el('span', 'eu-rmark')); dl.appendChild(tdd); d.appendChild(dl);
        if (r.residual) { var rs = el('div', 'eu-x-meta eu-resid'); var who = r.shares.filter(function (s) { return s.extra; }).map(function (s) { return s.id; }); rs.appendChild(tpl(M.plural(C.auditResidual, r.residual), { names: listNodes(who) })); d.appendChild(rs); }
      } else { var er = el('p', 'eu-err'); er.id = 'xe-' + x.id; er.appendChild(errNodes(x, r.err)); d.appendChild(er); }
      if (mode === 'own') {
        var acts = el('div', 'eu-xacts'), lab = M.strip(x.what) ? qt(M.strip(x.what)) + ' (#' + r.n + ')' : '#' + r.n;
        var ed = btn('eu-btn eu-mini', C.editExpense, function () { startEdit(x.id); }); ed.id = 'xed-' + x.id; ed.setAttribute('aria-label', M.fill(C.editExpenseAria, { expense: M.raw(lab) }));
        var rm = btn('eu-btn eu-mini', C.removeExpense.replace(/\s*\{expense\}/, ''), function () { E.removeExpense(st, x.id); if (editing === x.id) stopEdit(); changed(); refresh(); var n = $('f-what'); n.focus(); });
        rm.id = 'xrm-' + x.id; rm.setAttribute('aria-label', M.fill(C.removeExpense, { expense: M.raw(lab) })); if (!r.ok) { ed.setAttribute('aria-describedby', 'xe-' + x.id); }
        acts.appendChild(ed); acts.appendChild(rm); d.appendChild(acts);
      }
      box.appendChild(d);
    });
    var net = $('net'); net.textContent = ''; net.hidden = !st.x.length;
    if (st.x.length) {
      net.appendChild(el('div', 'eu-x-h', C.netLabel)); var dl = el('dl');
      c.balances.forEach(function (b) { var dt = el('dt'); dt.appendChild(nameNode(b.id)); dl.appendChild(dt); dl.appendChild(el('dd', null, money(b.net, true))); });
      dl.appendChild(el('dt', 'eu-total', C.sumLabel)); dl.appendChild(el('dd', 'eu-total', money(c.sum) + ' \u2713')); net.appendChild(dl);
      net.appendChild(el('p', 'eu-check', C.balanceCheck));
    }
    $('policy').textContent = st.x.length ? C.residualPolicy : '';
  }
  // in-page error links: land focus on the expense (never change the hash: the hash is the link's content)
  function drawFix(c) {
    var bad = c.xs.filter(function (r) { return !r.ok; }), f = $('fix'), ul = $('fix-l'); ul.textContent = ''; f.hidden = !bad.length; $('fix-t').textContent = bad.length ? M.plural(C.expensesNeedFixing, bad.length) : '';
    bad.forEach(function (r) { var li = el('li'), a = el('a'); a.href = '#x-' + r.x.id; a.id = 'fx-' + r.x.id; a.appendChild(document.createTextNode('#' + r.n + ' ')); if (M.strip(r.x.what)) a.appendChild(V.typed(M.strip(r.x.what)));
      a.addEventListener('click', function (ev) { ev.preventDefault(); var t = $('x-' + r.x.id); if (t) { t.focus(); t.scrollIntoView({ block: 'center' }); } }); li.appendChild(a); ul.appendChild(li); });
  }
  // ---------- whole-page refresh
  function refresh() {
    var c = E.compute(st), ok = E.canShare(st, c);
    paintPeople(c);
    var line = $('event-line'); line.textContent = ''; line.appendChild(document.createTextNode(C.eventLabel + ': ')); line.appendChild(eventNode()); line.appendChild(document.createTextNode(' \u00B7 ' + sym()));
    document.title = (M.strip(st.ev) ? qt(M.strip(st.ev)) + ' \u00B7 ' + C.title : C.title) + ' \u00B7 ' + C.studioName;
    drawFrame(c); drawSettle(c, ok); drawTape(c); drawFix(c);
    $('x-meta').textContent = M.plural(C.expenseCount, st.x.length) + (st.x.length >= E.LIM.xMax ? ' \u00B7 ' + C.tooManyExpenses : '');
    $('f-add').disabled = !editing && st.x.length >= E.LIM.xMax;
    $('l-amt').textContent = M.fill(C.amountLabelCurrency, { currency: sym() });
    ['b-copy', 'b-print', 'b-share'].forEach(function (id) { $(id).disabled = !ok; $(id).hidden = !st.x.length; });
    // empty event (no expenses yet): no tape, no payments heading; the card keeps only Clear and the privacy line
    var none = !st.x.length; $('tape').hidden = none; $('settle-h').hidden = none; $('nomoney').hidden = none; $('event-line').hidden = none && !M.strip(st.ev);
    $('fallback').value = ok ? E.summary(st, C, c) : '';
    var f = ok ? E.rawFragment(st) : null, lr = $('linkroom');
    if (f == null || mode !== 'own') { lr.textContent = ''; lr.classList.remove('is-over'); }
    else { var n = linkPrefix().length + f.length; lr.textContent = M.fill(C.linkRoom, { n: n.toLocaleString('en-US'), max: E.URL_MAX.toLocaleString('en-US') }) + (n > E.URL_MAX ? ' ' + C.tooLongLink : ''); lr.classList.toggle('is-over', n > E.URL_MAX); }
    applyMode();
  }
  function applyMode() {
    var r = mode === 'recv'; document.body.classList.toggle('is-recv', r);
    ['people', 'expform'].forEach(function (id) { V.readOnly($(id), r); $(id).hidden = r; });
    V.readOnly($('xs'), r); $('b-share').hidden = r || !st.x.length;
  }
  function showFallback() { var w = $('fbwrap'), f = $('fallback'); f.value = E.summary(st, C); w.hidden = false; f.focus(); f.select(); }
  function showLink(u) { $('linkbox').hidden = false; var l = $('link'); l.value = u; l.focus(); l.select(); }
  function makeLink() { var f = E.encode(st, linkPrefix().length); if (f === null) return null; if (f === '') { toast(C.tooLongLink); showFallback(); return null; } return linkPrefix() + f; }

  function init() {
    document.title = C.title + ' \u00B7 ' + C.studioName; $('home').textContent = '\u2190 ' + C.backLabel; $('strip').textContent = C.studioLabel;
    $('title').textContent = C.title; $('lede').textContent = C.invitation;
    $('frame-h').textContent = C.balancesHeading; $('sc-owes').textContent = '\u2190 ' + C.tagOwes; $('sc-owed').textContent = C.tagOwed + ' \u2192';
    $('b-copy').textContent = C.copySettlement; $('b-share').textContent = C.share; $('b-print').textContent = C.printSettlement; $('b-reset').textContent = C.reset;
    $('nomoney').textContent = C.noMoneyNote; $('privacy').textContent = C.privacy; $('link-l').textContent = C.linkLabel; $('fb-l').textContent = C.copyTextLabel; $('pfoot').textContent = C.printFooter; $('own-copy').textContent = C.receiverPrimary;
    $('people-h').textContent = C.peopleHeading; $('l-ev').textContent = C.eventLabel; $('ev').placeholder = C.eventPlaceholder; $('l-cur').textContent = C.currencyLabel; $('p-add').textContent = C.addPerson;
    E.CUR.forEach(function (s, i) { var o = el('option', null, s); o.value = String(i); $('cur').appendChild(o); });
    $('x-h').textContent = C.expensesHeading; $('l-what').textContent = C.expenseLabel; $('f-what').placeholder = C.expensePlaceholder; $('f-amt').placeholder = C.amountPlaceholder; $('l-payer').textContent = C.payerLabel;
    $('l-mode').textContent = C.splitLabel; $('m-e').textContent = C.splitModes.equal; $('m-w').textContent = C.splitModes.weighted; $('l-among').textContent = C.splitAmong; $('w-hint').textContent = C.weightHint; $('f-cancel').textContent = C.cancelEdit;
    $('limits').textContent = M.fill(C.limitsNote, { name: E.LIM.name, event: E.LIM.event, what: E.LIM.what, amount: E.fmt(E.LIM.amtMax, ''), weight: E.fmtWeight(E.LIM.wMax), url: E.URL_MAX.toLocaleString('en-US') });
    $('ev').addEventListener('input', function () { st.ev = $('ev').value; touched.ev = 1; changed(); refresh(); });
    $('ev').addEventListener('blur', function () { if (!touched.ev) { touched.ev = 1; V.afterPointer(refresh); } });
    $('cur').addEventListener('change', function () { st.cur = +$('cur').value; changed(); refresh(); });
    $('p-add').addEventListener('click', function () { if (st.p.length >= E.LIM.pMax) return; var p = { id: st.next++, name: '' }; st.p.push(p); form.inc[p.id] = true; form.w[p.id] = '1'; changed(); drawPeople(); drawForm(); refresh(); $('p-' + p.id).focus(); });
    $('f-what').addEventListener('input', function () { form.what = $('f-what').value; });
    $('f-amt').addEventListener('input', function () { form.amt = $('f-amt').value; });
    $('f-payer').addEventListener('change', function () { form.payer = +$('f-payer').value; });
    $('m-e').addEventListener('click', function () { form.mode = 'e'; drawForm(); $('m-e').focus(); });
    $('m-w').addEventListener('click', function () { form.mode = 'w'; drawForm(); $('m-w').focus(); });
    $('form').addEventListener('submit', function (ev) { ev.preventDefault();
      if (!editing && st.x.length >= E.LIM.xMax) { $('e-form').textContent = C.tooManyExpenses; return; }
      var pe = E.peopleErrors(st); if (pe.length) { showAll = true; refresh(); var e0 = pe[0], tgt = e0.id != null ? $('p-' + e0.id) : $('ev'); if (tgt) tgt.focus(); return; }
      var r = readForm(); if (!r) return;
      if (editing) { var x = st.x.filter(function (y) { return y.id === editing; })[0]; if (x) { x.what = r.what; x.amt = r.amt; x.payer = r.payer; x.gone = ''; x.mode = r.mode; x.inc = r.inc; x.w = r.w; } editing = null; }
      else st.x.push({ id: st.next++, what: r.what, amt: r.amt, payer: r.payer, gone: '', mode: r.mode, inc: r.inc, w: r.w });
      var keepPayer = form.payer; form = blankForm(); form.payer = keepPayer; changed(); drawForm(); refresh(); $('f-what').focus(); });
    $('f-cancel').addEventListener('click', function () { stopEdit(); $('f-what').focus(); });
    $('b-copy').addEventListener('click', function () { var t = E.summary(st, C); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showFallback(); }); else { toast(C.copyFail); showFallback(); } });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-share').addEventListener('click', function () { var u = makeLink(); if (!u) return; showLink(u);
      if (navigator.share) navigator.share({ title: C.title, text: M.fill(C.shareText, { event: M.raw(E.eventText(st, C)) }), url: u }).then(function () {}, function () { toast(C.shareCancel); showLink(u); });
      else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showLink(u); });
      else { toast(C.copyFail); showLink(u); } });
    $('b-reset').addEventListener('click', function () { if (!window.confirm(C.resetConfirm)) return; clearHash(); load(''); toast(C.resetDone); $('ev').focus(); });
    $('own-copy').addEventListener('click', function () { mode = 'own'; clearHash(); $('banner-t').textContent = C.copyTakenNote; $('banner-n').hidden = true; $('banner-n').textContent = ''; $('own-copy').hidden = true; form = blankForm(); drawPeople(); drawForm(); refresh(); $('ev').focus(); });
    var rt = 0; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (lastC) layoutLines(lastC); }, 60); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (lastC) layoutLines(lastC); });
    V.route(load);
  }
  // Every load and every hashchange (valid, bad, old or empty) starts from a blank page: nothing from a previous link survives.
  function load(h) {
    st = E.blank(); mode = 'own'; editing = null; touched = {}; showAll = false; prevSide = {};
    V.clearInputs(document); V.clearErrors(document, '.eu-err'); $('banner').hidden = true; $('banner-n').hidden = true; $('own-copy').hidden = true;
    $('banner-t').textContent = ''; $('banner-n').textContent = ''; // QA E3: a hidden banner keeps nothing from an earlier link
    $('linkbox').hidden = true; $('link').value = ''; $('fbwrap').hidden = true; $('fallback').value = ''; $('rods').textContent = ''; rodKey = ''; rodEls = {};
    if (h) {
      // QA E4: the WHOLE URL (origin + path + # + fragment) against the same 2,000 cap as sending (MILLVIEW.linkFor, D7)
      var d = V.linkFor(h.replace(/^#/, '')) ? E.decode(h) : { ok: false, why: 'tooLong' }, bt = $('banner-t');
      if (d.ok) { st = d.data; mode = 'recv'; $('banner').hidden = false; bt.textContent = ''; bt.appendChild(tpl(C.receiverIntro, { event: eventNode() })); $('banner-n').textContent = C.receiverNote; $('banner-n').hidden = false; $('own-copy').hidden = false; }
      else if (d.why !== 'empty') { $('banner').hidden = false; bt.textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; }
    }
    $('ev').value = st.ev; $('cur').value = String(st.cur);
    form = blankForm(); drawPeople(); drawForm(); clearFormErrs(); refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
