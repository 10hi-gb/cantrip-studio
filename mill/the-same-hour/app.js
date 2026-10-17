'use strict';
// The Same Hour — UI. Visitor text only via textContent/value. Nothing stored; the address bar is only ever read once and cleared.
(function () {
  var C = COPY, M = MILL, T = TSH, $ = function (id) { return document.getElementById(id); };
  var st, touched = {}, showAll = false, res = null, selA = null, asText = false, toastT = 0, lastText = '', mode = 'own', V = window.MILLVIEW;
  var DF = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  var DFY = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  [DF, DFY].forEach(function (f) { var o = f.format.bind(f); f.fmt = function (t) { return o(t).replace(/,/g, ''); }; });
  var DS = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric' });
  var DW = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short' }), DL = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long' }), DD = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function btn(cls, txt, fn) { var b = el('button', cls, txt); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function toast(m) { V.toast(m, 3200); } // shared: route() clears it (QA N2)
  function clearHash() { if (location.hash || location.search) history.replaceState(null, '', location.pathname); }
  function defaultWeek() { var d = new Date(), t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), wd = new Date(t).getUTCDay(), add = (8 - wd) % 7; return T.iso(t + add * 864e5); }
  function lenText(min) { return min % 60 === 0 ? M.plural(C.durationLine.hr, min / 60) : M.plural(C.durationLine.min, min); }
  function durText() { var n = +String(st.n).trim(); return M.plural(C.durationLine[st.u === 'hr' ? 'hr' : 'min'], n); }
  function color(i) { return 'var(--tsh-a' + (i + 1) + ')'; }
  // QA D3: every sender-typed name goes through the shared quote helper (screen, aria, title, copy text); the fallback label is ours, unquoted.
  // Hardening (PM 05:52): a displayed zone ID gets a break opportunity after '/' and '_' (an empty <wbr> element) so "America/Los_Angeles" wraps at the
  // slash at 320, never mid-word. Display only: <wbr> adds no character to textContent/innerText, a copied selection, an accessible name, the link or copy text.
  function zoneText(node, s) { node.textContent = ''; var z = String(st.z || ''), parts = z ? String(s).split(z) : [String(s)];
    parts.forEach(function (p, i) { if (i) z.split(/([\/_])/).forEach(function (x) { if (x) node.appendChild(document.createTextNode(x)); if (x === '/' || x === '_') node.appendChild(document.createElement('wbr')); }); if (p) node.appendChild(document.createTextNode(p)); }); return node; }
  function qn(n, i) { n = M.strip(n || ''); return n ? V.quote(n) : C.personLabel + ' ' + (i + 1); }
  function nm(i) { return qn(res.people[i].name, i); }
  function pidName(pid) { for (var k = 0; k < st.p.length; k++) if (st.p[k].id === pid) return qn(st.p[k].n, k); return C.personLabel; }
  function tm(t, di) { return T.hhmm(T.localMin(t, res.days[di], st.z)); }
  function endTm(t, di) { var m = T.localMin(t, res.days[di], st.z); return T.hhmm(m); }
  function changed() { clearHash(); $('linkbox').hidden = true; $('fbwrap').hidden = true; $('banner').hidden = true; }

  // ---------- form ----------
  function drawZones() { var s = $('z'); s.textContent = ''; var o = el('option', null, C.zonePlaceholder); o.value = ''; s.appendChild(o); T.zones().forEach(function (z) { var x = el('option', null, z); x.value = z; s.appendChild(x); }); }
  function dayOpts(sel, v) { sel.textContent = ''; var ds = T.days(st); for (var i = 0; i < 7; i++) { var o = el('option', null, ds ? DS.format(ds[i]).replace(/,/g, '') : String(i + 1)); o.value = String(i); sel.appendChild(o); } sel.value = String(v); }
  function drawPeople() {
    var ul = $('people'); ul.textContent = '';
    st.p.forEach(function (p, pi) {
      var li = el('li', 'tsh-person'); li.id = 'person-' + p.id;
      var h = el('div', 'tsh-person-h'), sw = el('span', 'tsh-swatch'); sw.style.setProperty('--c', color(pi)); sw.setAttribute('aria-hidden', 'true'); h.appendChild(sw);
      var f = el('div', 'tsh-field tsh-pname'), lab = el('label', null, C.personLabel), inp = el('input'); inp.id = 'pn-' + p.id; lab.htmlFor = inp.id; inp.autocomplete = 'off'; inp.value = p.n; if (pi === 0) inp.placeholder = C.personPlaceholder;
      var er = el('span', 'tsh-err'); er.id = 'e-pn-' + p.id; inp.setAttribute('aria-describedby', er.id);
      inp.addEventListener('input', function () { p.n = inp.value; changed(); updateNames(); refresh(); });
      f.appendChild(lab); f.appendChild(inp); f.appendChild(er); h.appendChild(f);
      var rm = btn('tsh-mini', C.removeInterval, function () { st.p.splice(st.p.indexOf(p), 1); changed(); drawPeople(); refresh(); $('addp').focus(); }); rm.id = 'pr-' + p.id; rm.disabled = st.p.length <= T.LIM.pMin;
      rm.setAttribute('aria-label', M.fill(C.removePerson, { name: qn(p.n, pi) })); h.appendChild(rm); li.appendChild(h);
      var fh = el('p', 'tsh-lab tsh-freeh'); fh.id = 'fh-' + p.id; li.appendChild(fh);
      var ivs = el('ul', 'tsh-ivs'); ivs.setAttribute('aria-labelledby', fh.id);
      p.iv.forEach(function (v) { ivs.appendChild(ivRow(p, v)); }); li.appendChild(ivs);
      var mg = el('p', 'tsh-merged'); mg.id = 'mg-' + p.id; mg.hidden = true; li.appendChild(mg);
      var add = btn('tsh-mini', C.addInterval, function () { if (p.iv.length >= T.LIM.ivPer) { $('e-pn-' + p.id).textContent = M.fill(C.tooManyTimes, { max: T.LIM.ivPer }); return; } var last = p.iv[p.iv.length - 1], v = { id: st.next++, d: last ? Math.min(6, +last.d + 1) : 0, s: '', e: '' }; p.iv.push(v); changed(); drawPeople(); refresh(); $('vs-' + v.id).focus(); });
      add.id = 'pa-' + p.id; li.appendChild(add); ul.appendChild(li);
    });
    $('addp').disabled = st.p.length >= T.LIM.pMax; $('e-p').textContent = st.p.length >= T.LIM.pMax ? C.tooManyPeople : '';
    $('who-n').textContent = '(' + M.plural(C.personCount, st.p.length) + ')';
    updateNames();
  }
  function ivRow(p, v) {
    var li = el('li', 'tsh-iv'); li.id = 'iv-' + v.id;
    var ds = el('select', 'tsh-day-sel'); ds.id = 'vd-' + v.id; ds.setAttribute('aria-label', C.dayLabel); dayOpts(ds, v.d); ds.addEventListener('change', function () { v.d = +ds.value; changed(); refresh(); });
    function time(key, label) { var w = el('label', 'tsh-time'), s = el('span', null, label), i = el('input'); i.id = 'v' + key + '-' + v.id; i.value = v[key]; i.placeholder = key === 's' ? '09:00' : '10:30'; i.inputMode = 'numeric'; i.autocomplete = 'off'; i.maxLength = 5; i.setAttribute('pattern', '[0-9]{1,2}:[0-9]{2}'); i.setAttribute('aria-describedby', 'e-iv-' + v.id);
      i.addEventListener('input', function () { v[key] = i.value; changed(); refresh(); }); w.appendChild(s); w.appendChild(i); return w; }
    li.appendChild(ds); li.appendChild(time('s', C.intervalStart)); li.appendChild(time('e', C.intervalEnd));
    var rm = btn('tsh-mini', C.removeInterval, function () { var i = p.iv.indexOf(v); p.iv.splice(i, 1); changed(); drawPeople(); refresh(); var nx = p.iv[i] || p.iv[i - 1]; (nx ? $('vs-' + nx.id) : $('pa-' + p.id)).focus(); }); rm.id = 'vr-' + v.id;
    li.appendChild(rm); var er = el('span', 'tsh-err'); er.id = 'e-iv-' + v.id; li.appendChild(er); return li;
  }
  function updateNames() { st.p.forEach(function (p, pi) { var n = qn(p.n, pi); var fh = $('fh-' + p.id); if (fh) { fh.textContent = ''; var parts = C.freeHeading.split('{name}'); fh.appendChild(document.createTextNode(parts[0])); fh.appendChild(el('span', 'tsh-typed', n)); if (parts[1]) fh.appendChild(document.createTextNode(parts[1])); } var rm = $('pr-' + p.id); if (rm) rm.setAttribute('aria-label', M.fill(C.removePerson, { name: n })); p.iv.forEach(function (v) { var r = $('vr-' + v.id); if (r) r.setAttribute('aria-label', C.removeInterval + ' ' + n + ' ' + (String(v.s).trim() || '') + '–' + (String(v.e).trim() || '')); }); }); }
  function redrawDaySelects() { st.p.forEach(function (p) { p.iv.forEach(function (v) { var s = $('vd-' + v.id); if (s) dayOpts(s, v.d); }); }); }

  // ---------- errors ----------
  function errText(e) {
    switch (e.code) {
      case 'weekMissing': return C.weekMissing; case 'zoneMissing': return C.zoneMissing; case 'durationInvalid': return C.durationInvalid;
      case 'titleTooLong': return M.plural(C.titleTooLong, e.n); case 'personEmpty': return C.personEmpty; case 'personTooLong': return M.plural(C.personTooLong, e.n);
      case 'timeInvalid': return C.timeInvalid; case 'intervalOrder': return C.intervalOrder; case 'tooManyTimes': return M.fill(C.tooManyTimes, { max: T.LIM.ivPer });
      case 'dstGap': case 'dstAmbiguous': return M.fill(C[e.code], { time: e.time, date: DFY.fmt(res.days[e.day] !== undefined ? res.days[e.day] : res.days[6] + 864e5), zone: st.z });
    } return C.error;
  }
  function fieldId(f) { if (f[0] === 'p') return 'pn-' + f.slice(1); if (f[0] === 'v') return 'v' + f.slice(-1) + '-' + f.slice(1, -1); return f; }
  function errBox(f) { if (f[0] === 'p') return 'e-pn-' + f.slice(1); if (f[0] === 'v') return 'e-iv-' + f.slice(1, -1); return 'e-' + f; }
  function paintErrors() {
    document.querySelectorAll('.tsh-form [aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    document.querySelectorAll('.tsh-form .tsh-err').forEach(function (x) { if (x.id !== 'e-p') x.textContent = ''; });
    var seen = {}, vis = res.errors.filter(function (e) { return showAll || touched[fieldId(e.f)]; }); vis.forEach(function (e) { var i = $(fieldId(e.f)), b = $(errBox(e.f)); if (i) i.setAttribute('aria-invalid', 'true'); if (b && !seen[b.id]) { zoneText(b, errText(e)); seen[b.id] = 1; } });
    var show = res.state === 'fix' && (showAll || vis.length > 0), fx = $('fix'), ul = $('fix-l'); fx.hidden = !show; ul.textContent = '';
    if (show) { var n = res.errors.length + (res.tooMany ? 1 : 0); $('fix-t').textContent = M.plural(C.entriesNeedFixing, n);
      res.errors.forEach(function (e) { var li = el('li'), a = zoneText(el('a'), (e.pid ? pidName(e.pid) + ': ' : '') + errText(e)); a.href = '#' + fieldId(e.f); a.addEventListener('click', function (ev) { ev.preventDefault(); goTo(fieldId(e.f)); }); li.appendChild(a); ul.appendChild(li); });
      if (res.tooMany) ul.appendChild(el('li', null, C.tooManyPeople)); }
  }

  // QA KS-1r: an error link always lands. In the recipient view the field is disabled (focus() would do nothing), so focus moves
  // to its read-only wrapper (tabindex=-1, named after the field) and that is scrolled into view.
  function goTo(id) { var x = $(id); if (!x) return; var t = x;
    if (x.disabled) { t = x.closest('.tsh-iv, .tsh-field, .tsh-person-h, li') || x; t.setAttribute('tabindex', '-1'); var lb = x.getAttribute('aria-label') || (x.labels && x.labels[0] && x.labels[0].textContent) || '';
      var er = x.getAttribute('aria-describedby'), et = er && $(er) ? $(er).textContent : ''; if (!t.getAttribute('aria-label') || t.dataset.ro) { t.setAttribute('aria-label', [rowName(x), lb, x.value, et].filter(Boolean).join(', ')); t.dataset.ro = '1'; } }
    t.scrollIntoView({ block: 'center' }); try { t.focus({ preventScroll: true }); } catch (e) { t.focus(); } }
  function rowName(x) { var li = x.closest('.tsh-person'); if (!li) return ''; var k = st.p.findIndex(function (p) { return 'person-' + p.id === li.id; }); return k < 0 ? '' : qn(st.p[k].n, k); }
  // ---------- loom ----------
  function zoneLine() {
    var z = $('zone'); z.textContent = '';
    if (!T.validZone(st.z)) { z.appendChild(el('span', null, C.zoneNotSet)); return; }
    var ds = T.days(st), ref = ds ? T.resolve(ds[0], 720, st.z) : null, info = T.zoneInfo(ref && ref.ok ? ref.t : Date.now(), st.z);
    var b = zoneText(el('span'), M.fill(C.zoneLine, info)); z.appendChild(b);
    if (ds) z.appendChild(el('span', null, M.fill(C.weekLine, { date: DFY.fmt(ds[0]) })));
    (res.changes || []).forEach(function (c) { z.appendChild(el('span', 'tsh-dst', M.fill(C.dstChangeLine, { date: DFY.fmt(ds[c.day]), from: c.from, to: c.to }))); });
  }
  function legend() {
    var ul = $('legend'); ul.textContent = '';
    res.people.forEach(function (p, i) { var li = el('li'), k = el('span', 'tsh-key'); k.style.background = color(i); k.style.opacity = '.7'; li.appendChild(k); var num = el('span', 'tsh-lnum', String(i + 1)); num.setAttribute('aria-hidden', 'true'); li.appendChild(num); li.appendChild(el('span', 'tsh-lname', nm(i))); ul.appendChild(li); });
    [['is-unknown', C.legendUnknown], ['is-seam', C.legendAll]].forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'tsh-key ' + x[0])); li.appendChild(el('span', null, x[1])); ul.appendChild(li); });
  }
  function frac(min, w) { return Math.max(0, Math.min(1, (min - w[0] * 60) / ((w[1] - w[0]) * 60))).toFixed(4); }
  function drawLoom() {
    var w = T.windowOf(res, st.z), span = w[1] - w[0], tape = $('tape'), days = $('days'); tape.textContent = ''; days.textContent = '';
    $('vis').style.setProperty('--hrs', span);
    var step = span > 8 ? 2 : 1; for (var h = w[0]; h <= w[1]; h += step) { var tk = el('span', 'tsh-tick' + ((h - w[0]) % 2 ? ' is-odd' : ''), (h < 10 ? '0' : '') + h); tk.style.setProperty('--x', ((h - w[0]) / span).toFixed(4)); tape.appendChild(tk); }
    var collapsed = res.dayRes.filter(function (d) { return d.kind === 'allUnknown'; }), placed = false;
    res.dayRes.forEach(function (d) {
      if (d.kind === 'allUnknown') { if (placed) return; placed = true;
        var row = el('div', 'tsh-collapsed'); row.setAttribute('role', 'listitem'); var dn = el('div', 'tsh-dayname', collapsed.map(function (x) { return DW.format(x.date); }).join(' ')); dn.appendChild(el('small', null, collapsed.map(function (x) { return DD.format(x.date); }).join(' · '))); row.appendChild(dn);
        var r2 = el('div'), bar = el('div', 'tsh-bar'); bar.setAttribute('aria-hidden', 'true'); r2.appendChild(bar); r2.appendChild(el('span', null, C.unknownForAll)); row.appendChild(r2); days.appendChild(row); return; }
      var row2 = el('div', 'tsh-day'); row2.setAttribute('role', 'listitem');
      var dn2 = el('div', 'tsh-dayname', DW.format(d.date)); dn2.appendChild(el('small', null, DD.format(d.date))); row2.appendChild(dn2);
      var wv = el('div', 'tsh-weave'); wv.setAttribute('role', 'img'); wv.style.setProperty('--n', res.people.length);
      var aria = [DF.fmt(d.date) + '.'];
      res.people.forEach(function (p, i) {
        var lane = el('div', 'tsh-lane'), m = p.merged[d.i]; lane.style.setProperty('--i', i);
        if (!m.length) { lane.classList.add('is-unknown'); var u = el('span', 'tsh-rib is-unknown'); u.style.setProperty('--i', i); lane.appendChild(u); aria.push(nm(i) + ': ' + C.unknownDay + ';'); }
        else { var parts = []; m.forEach(function (x) { var a = T.localMin(x.a, d.date, st.z), b = T.localMin(x.b, d.date, st.z), r = el('span', 'tsh-rib'); r.style.setProperty('--s', frac(a, w)); r.style.setProperty('--e', frac(b, w)); r.style.setProperty('--c', color(i)); r.style.setProperty('--i', i); r.title = M.fill(C.ribbonAria, { name: nm(i), day: DF.fmt(d.date) }) + ', ' + T.hhmm(a) + '–' + T.hhmm(b); lane.appendChild(r); parts.push(T.hhmm(a) + '–' + T.hhmm(b)); }); aria.push(nm(i) + ': ' + parts.join(', ') + ';'); }
        var lab = el('span', 'tsh-lane-label', String(i + 1) + (m.length ? '' : ' ?')); lab.setAttribute('aria-hidden', 'true'); lane.appendChild(lab); /* QA D4: lane number keys to the legend; names are never clipped */ wv.appendChild(lane);
      });
      var d0 = res.starts[d.i], d1 = res.starts[d.i + 1], cap = [];
      function seam(x, cls, text) { var a = T.localMin(Math.max(x.a, d0), d.date, st.z), b = T.localMin(Math.min(x.b, d1), d.date, st.z), s = el('div', 'tsh-seam' + (cls ? ' ' + cls : ''), text); s.style.setProperty('--s', frac(a, w)); s.style.setProperty('--e', frac(b, w)); wv.appendChild(s); return [T.hhmm(a), T.hhmm(b)]; }
      var on = function (x) { return x.a < d1 && x.b > d0; }; // QA D2: a span over midnight is drawn on both days, labelled with both days
      res.options.filter(on).forEach(function (x) { var sl = slot(x), lab = seamLab(x, sl); seam(x, x.a === selA ? 'is-picked' : '', lab); var t = M.fill(C.overlapAria, { day: sl.day, start: sl.start, end: sl.end }); aria.push(t + '.'); cap.push(lab); });
      res.short.filter(on).forEach(function (x) { var sl = slot(x); seam(x, 'is-short', lenText(x.len)); aria.push(M.fill(C.tooShortLine, { day: sl.day, start: sl.start, end: sl.end, length: lenText(x.len) })); });
      d.maybe.forEach(function (x) { var who = d.unknown.map(nm).join(', '); var tt = seam(x, 'is-maybe', '?'); aria.push(M.fill(C.proposalExcluded, { day: DF.fmt(d.date), start: tt[0], end: tt[1], name: who, dayName: DL.format(d.date) })); });
      d.touch.forEach(function (t) { var m = T.localMin(t, d.date, st.z), p = el('div', 'tsh-touch'); p.style.setProperty('--s', frac(m, w)); p.appendChild(el('span', null, T.hhmm(m))); wv.appendChild(p); });
      if (d.touch.length) aria.push(C.touchNote);
      wv.setAttribute('aria-label', aria.join(' ')); var cell = el('div', 'tsh-weavecell'); cell.appendChild(wv);
      // QA D4: every overlap's times are also written out under the row (seam text is only a bonus where it fits)
      if (cap.length) { var cp = el('p', 'tsh-seamcap', C.legendAll + ': ' + cap.join(', ')); cell.appendChild(cp); }
      row2.appendChild(cell); days.appendChild(row2);
    });
    $('touchnote').hidden = !res.touches; $('touchnote').textContent = res.touches ? C.touchNote : '';
    fitSeams(); drawTable();
  }
  // seam text only where it fits whole; otherwise the bar is plain and the caption line carries the times (never clipped)
  function fitSeams() { document.querySelectorAll('#days .tsh-seam').forEach(function (s) { s.classList.remove('is-tight'); if (s.textContent && s.scrollWidth > s.clientWidth + 1) s.classList.add('is-tight'); }); }
  function drawTable() {
    var t = $('tbl'); t.textContent = ''; var ds = res.days;
    var cap = zoneText(el('caption'), M.fill(C.tableCaption, { zone: st.z, date: DFY.fmt(ds[0]) })); t.appendChild(cap);
    var th = el('thead'), tr = el('tr'); [C.dayLabel].concat(res.people.map(function (p, i) { return nm(i); })).concat([C.legendAll]).forEach(function (h) { var c = el('th', null, h); c.scope = 'col'; tr.appendChild(c); }); th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    res.dayRes.forEach(function (d) {
      var r = el('tr'), h = el('th', null, DF.fmt(d.date)); h.scope = 'row'; r.appendChild(h);
      res.people.forEach(function (p) { var m = p.merged[d.i]; r.appendChild(el('td', null, m.length ? m.map(function (x) { return tm(x.a, d.i) + '–' + endTm(x.b, d.i); }).join(', ') : C.unknownDay)); });
      var lines = [];
      if (d.kind === 'allUnknown') lines.push(C.unknownForAll);
      d.options.forEach(function (x) { lines.push(tm(x.a, d.i) + '–' + endLab(x) + ' · ' + M.fill(C.optionLength, { length: lenText(x.len) })); });
      d.short.forEach(function (x) { lines.push(M.fill(C.tooShortLine, { day: DF.fmt(d.date), start: tm(x.a, d.i), end: endLab(x), length: lenText(x.len) })); });
      d.maybe.forEach(function (x) { lines.push(M.fill(C.proposalExcluded, { day: DF.fmt(d.date), start: tm(x.a, d.i), end: endTm(x.b, d.i), name: d.unknown.map(nm).join(', '), dayName: DL.format(d.date) })); });
      if (d.touch.length) lines.push(C.touchNote + ' (' + d.touch.map(function (x) { return tm(x, d.i); }).join(', ') + ')');
      var td = el('td'); lines.forEach(function (l, i) { if (i) td.appendChild(el('br')); td.appendChild(document.createTextNode(l)); }); if (!lines.length) td.textContent = '—'; r.appendChild(td); tb.appendChild(r);
    });
    t.appendChild(tb);
  }
  // ---------- results / proposal ----------
  function picked() { var o = res.options.filter(function (x) { return x.a === selA; })[0]; if (!o) { o = res.options[0]; selA = o ? o.a : null; } return o; }
  // QA D2: a span that ends on a later day names that day in its end ("Mon 19 Oct, 22:00–Tue 02:00"); ending exactly at midnight stays 24:00
  // QA D2-r: on the week chart a span over midnight names BOTH days on every row it is drawn on ("Mon 22:00–Tue 02:00")
  function seamLab(x, sl) { var ed = x.endDay != null ? x.endDay : x.day; return (ed !== x.day ? DW.format(res.days[x.day]) + ' ' : '') + sl.start + '–' + sl.end; }
  function endLab(x) { var ed = x.endDay != null ? x.endDay : x.day; return ed !== x.day ? DW.format(res.days[ed]) + ' ' + tm(x.b, ed) : endTm(x.b, x.day); }
  function slot(x) { var di = x.day; return { day: DF.fmt(res.days[di]), date: DFY.fmt(res.days[di]), start: tm(x.a, di), end: endLab(x) }; }
  // DST: a slot that runs across a clock change says so (Writer's dstChangeLine), so 00:30–03:00 on a fall-back day isn't read as 2½ h.
  function spanChange(o) { var c = (res.changes || []).filter(function (c) { return o.a < c.t && c.t < o.b; })[0]; return c ? M.fill(C.dstChangeLine, { date: DFY.fmt(res.days[c.day]), from: c.from, to: c.to }) : ''; }
  function names() { return res.people.map(function (p, i) { return nm(i); }).join(', '); }
  function shareText() { var t = M.strip(st.t); return t ? M.fill(C.shareTextTyped, { title: t }) : C.shareText; }
  function proposalText(o) { var s = slot(o), info = T.zoneInfo(o.a, st.z), title = M.strip(st.t);
    return M.fill(C.proposalText, { titleLine: title ? M.fill(C.proposalTextTitleLine, { title: title }) : '', date: s.date, start: s.start, end: s.end, zoneLine: M.fill(C.zoneLine, info) + (spanChange(o) ? '\n' + spanChange(o) : ''), length: lenText(o.len), names: names() }); }
  function unknownList() { return res.people.map(function (p) { var ds = []; p.merged.forEach(function (m, i) { if (!m.length) ds.push(DW.format(res.days[i])); }); return ds.length ? nm(p.i != null ? p.i : res.people.indexOf(p)) + ': ' + ds.join(', ') : ''; }).filter(Boolean).join('; '); }
  function noOverlapText() { var c = res.closest, s = c ? slot(c) : null, ul = unknownList();
    return M.fill(C.noOverlapText, { duration: durText(), date: DFY.fmt(res.days[0]), zone: st.z, closestLine: c ? M.fill(C.noOverlapTextClosest, { day: s.date, start: s.start, end: s.end, length: lenText(res.dur - c.len) }) : '', unknownLine: ul ? M.fill(C.noOverlapTextUnknown, { list: ul }) : '' }).replace(/\n+$/, ''); }
  function drawResults() {
    var found = res.state === 'found', none = res.state === 'none';
    $('res').hidden = !found; $('prop').hidden = !found; $('none').hidden = !none;
    if (found) {
      var o = picked(); $('res-n').textContent = M.plural(C.optionCount, res.options.length);
      var ol = $('opts'); ol.textContent = '';
      res.options.forEach(function (x, i) { var s = slot(x), li = el('li', 'tsh-option' + (x.a === selA ? ' is-picked' : '')), tx = el('span', 'tsh-otext'); tx.appendChild(el('b', null, M.fill(C.optionLine, s))); tx.appendChild(el('span', null, M.fill(C.optionLength, { length: lenText(x.len) }))); li.appendChild(tx);
        var b = btn('tsh-btn', C.pickOption, function () { selA = x.a; refresh(); var nb = $('pick-' + i); if (nb) nb.focus(); }); b.id = 'pick-' + i; b.setAttribute('aria-pressed', String(x.a === selA)); b.setAttribute('aria-label', C.pickOption + ': ' + M.fill(C.optionLine, s)); li.appendChild(b); ol.appendChild(li); });
      var sh = $('shorts'); sh.textContent = ''; res.short.forEach(function (x) { sh.appendChild(el('li', null, M.fill(C.tooShortLine, { day: slot(x).day, start: slot(x).start, end: slot(x).end, length: lenText(x.len) }))); });
      var s = slot(o), info = T.zoneInfo(o.a, st.z);
      $('prop-l').textContent = C.proposalHeading; zoneText($('prop-h'), M.fill(C.proposalLine, { day: s.date, start: s.start, end: s.end, zone: st.z }));
      var ttl = M.strip(st.t); $('prop-title').hidden = !ttl; $('prop-title').textContent = ttl ? V.quote(ttl) : '';
      zoneText($('prop-z'), M.fill(C.proposalZone, info)); $('prop-dst').textContent = spanChange(o); $('prop-dst').hidden = !spanChange(o); $('prop-n').textContent = lenText(o.len) + ' · ' + M.fill(C.proposalNames, { names: names() });
      $('prop-s').textContent = C.proposalSnapshot;
      var px = $('prop-x'); px.textContent = ''; res.maybe.slice(0, 5).forEach(function (x) { var d = res.dayRes[x.day]; px.appendChild(el('p', 'tsh-fine', M.fill(C.proposalExcluded, { day: slot(x).day, start: slot(x).start, end: slot(x).end, name: d.unknown.map(nm).join(', '), dayName: DL.format(d.date) }))); });
      if (res.touches) px.appendChild(el('p', 'tsh-fine', C.touchNote));
      lastText = proposalText(o);
    }
    if (none) {
      $('none-l').textContent = M.fill(C.noOverlapHeading, { duration: durText() }); $('none-h').textContent = M.fill(C.noOverlap, { duration: durText() });
      var c = res.closest, nc = $('none-c'); nc.hidden = !c; nc.textContent = '';
      if (c) { var s2 = slot(c); nc.appendChild(el('span', null, M.fill(C.tooShortLine, { day: s2.day, start: s2.start, end: s2.end, length: lenText(c.len) }) + ' ')); nc.appendChild(el('b', null, M.fill(C.shortBy, { length: lenText(res.dur - c.len) }))); }
      var nu = $('none-u'); nu.hidden = !res.unknownPeople.length; nu.textContent = res.unknownPeople.length ? M.plural(C.noOverlapUnknown, res.unknownPeople.length) : '';
      $('none-a').textContent = C.noOverlapAsk; lastText = noOverlapText();
    }
    if (!found && !none) lastText = '';
    // QA D5: nothing from a previous state stays in hidden DOM
    if (!found) ['opts', 'shorts', 'prop-x', 'prop-h', 'prop-title', 'prop-z', 'prop-dst', 'prop-n', 'res-n'].forEach(function (id) { $(id).textContent = ''; });
    if (!none) ['none-l', 'none-h', 'none-c', 'none-u', 'none-a'].forEach(function (id) { $(id).textContent = ''; });
  }
  // Recipient view is read-only in the DOM (shared helper): the form controls are disabled (never inert: names and times stay readable), both Start over buttons are gone.
  function applyMode() { var r = mode === 'recv'; V.readOnly($('form'), r); ['b-reset', 'b-nreset'].forEach(function (id) { $(id).hidden = r; $(id).disabled = r; }); }
  function refresh() { refresh0(); applyMode(); }
  function refresh0() {
    res = T.compute(st);
    if (!res.days) res.days = T.days(st);
    paintErrors(); zoneLine();
    var ok = res.state === 'found' || res.state === 'none';
    $('vis').hidden = !ok || asText; $('tblwrap').hidden = !ok || !asText; $('legend').hidden = !ok; $('astext').hidden = !ok;
    var em = $('empty'); em.hidden = ok;
    $('empty-t').textContent = res.state === 'fix' ? C.fixToContinue : res.state === 'nozone' ? C.emptyState : (st.p.length < T.LIM.pMin ? C.tooFewPeople : C.emptyState);
    if (ok) { legend(); drawLoom(); } else { $('touchnote').hidden = true; ['legend', 'tape', 'days', 'tbl', 'touchnote'].forEach(function (id) { $(id).textContent = ''; }); }
    st.p.forEach(function (p, pi) { var mg = $('mg-' + p.id); if (!mg) return; var P = res.people[pi], lines = []; if (ok && P && P.merged) P.merged.forEach(function (list, di) { list.forEach(function (x) { if (x.src.length > 1) lines.push(DW.format(res.days[di]) + ' ' + x.src.map(function (s) { return s.s + '–' + s.e; }).join(' + ') + ' → ' + tm(x.a, di) + '–' + endTm(x.b, di)); }); });
      mg.hidden = !lines.length; mg.textContent = lines.length ? C.mergeNote + ' ' + lines.join('; ') : ''; });
    drawResults();
    if ($('fbwrap').hidden) $('fallback').value = lastText;
  }
  // ---------- export ----------
  function showFallback() { var w = $('fbwrap'), f = $('fallback'); f.value = lastText; w.hidden = false; f.focus(); f.select(); }
  function showLink(u) { $('linkbox').hidden = false; var l = $('link'); l.value = u; l.focus(); l.select(); }
  function copyText() { var t = lastText; if (!t) return; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showFallback(); }); else { toast(C.copyFail); showFallback(); } }
  function share() { var f = T.encode(st), u = f ? V.linkFor(f) : null; if (!u) { toast(C.tooLongLink); showFallback(); return; } showLink(u); // QA D7: the WHOLE URL is capped at 2,000
    if (navigator.share) navigator.share({ title: C.title, text: shareText(), url: u }).then(function () {}, function () { toast(C.shareCancel); showLink(u); });
    else if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { toast(C.copied); }, function () { toast(C.copyFail); showLink(u); });
    else { toast(C.copyFail); showLink(u); } }
  function reset() { if (mode !== 'own' || !window.confirm(C.resetConfirm)) return; clearHash(); load(''); toast(C.resetDone); $('z').focus(); }
  function syncForm() { $('z').value = T.validZone(st.z) ? T.canon(st.z) : ''; $('w').value = st.w; $('n').value = st.n; $('u').value = st.u === 'hr' ? 'hr' : 'min'; $('t').value = st.t; }

  function init() {
    document.title = C.title + ' · ' + C.studioName; $('home').textContent = '← ' + C.backLabel; $('strip').textContent = C.studioLabel; $('title').textContent = C.title; $('lede').textContent = C.invitation;
    $('loom-h').textContent = C.loomHeading; $('astext').textContent = C.showAsText; $('res-h').textContent = C.resultsHeading; $('form-h').textContent = C.peopleHeading;
    $('l-z').textContent = C.zoneLabel; $('h-z').textContent = C.zoneHint; $('l-w').textContent = C.weekLabel; $('l-n').textContent = C.durationLabel; $('l-t').textContent = C.titleLabel; $('t').placeholder = C.titlePlaceholder;
    var u = $('u'); [['min', C.durationUnits.min], ['hr', C.durationUnits.hr]].forEach(function (x) { var o = el('option', null, x[1]); o.value = x[0]; u.appendChild(o); }); u.setAttribute('aria-label', C.durationUnitLabel); $('n').placeholder = '60';
    $('who-h').textContent = C.peopleHeading; $('addp').textContent = C.addPerson; $('unote').textContent = C.unknownNote + ' ' + C.mergeNote; $('find').textContent = C.primary;
    $('b-copy').textContent = C.copyProposal; $('b-print').textContent = C.printProposal; $('b-share').textContent = C.share; $('b-reset').textContent = C.reset;
    $('b-ncopy').textContent = C.copyNoOverlap; $('b-nshare').textContent = C.share; $('b-nreset').textContent = C.reset;
    $('privacy').textContent = C.privacy; $('link-l').textContent = C.linkLabel; $('fb-l').textContent = C.copyTextLabel; $('own-copy').textContent = C.receiverPrimary;
    drawZones();
    $('z').addEventListener('change', function () { st.z = $('z').value; changed(); refresh(); });
    $('w').addEventListener('input', function () { st.w = $('w').value; changed(); redrawDaySelects(); refresh(); });
    $('n').addEventListener('input', function () { st.n = $('n').value; changed(); refresh(); });
    $('u').addEventListener('change', function () { st.u = $('u').value; changed(); refresh(); });
    $('t').addEventListener('input', function () { st.t = $('t').value; changed(); refresh(); });
    $('addp').addEventListener('click', function () { if (st.p.length >= T.LIM.pMax) return; var p = { id: st.next++, n: '', iv: [] }; st.p.push(p); changed(); drawPeople(); refresh(); $('pn-' + p.id).focus(); });
    document.querySelector('.tsh-form').addEventListener('focusout', function (e) { var id = e.target && e.target.id; if (id && /^(z|w|n|t|pn-\d+|v[se]-\d+)$/.test(id) && !touched[id]) { touched[id] = 1; V.afterPointer(paintErrors); } }); // in place, never a rebuild mid-click
    $('find').addEventListener('click', function () { showAll = true; refresh(); var r = $('res'); if (!r.hidden) { r.focus(); return; } var tgt = !$('fix').hidden ? $('fix-l').querySelector('a') : !$('none').hidden ? $('b-ncopy') : null; if (tgt) tgt.focus(); else $('zone').scrollIntoView(); });
    $('astext').addEventListener('click', function () { asText = !asText; $('astext').textContent = asText ? C.showAsRibbons : C.showAsText; $('astext').setAttribute('aria-pressed', String(asText)); refresh(); });
    $('b-copy').addEventListener('click', copyText); $('b-ncopy').addEventListener('click', copyText);
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-share').addEventListener('click', share); $('b-nshare').addEventListener('click', share);
    $('b-reset').addEventListener('click', reset); $('b-nreset').addEventListener('click', reset);
    $('own-copy').addEventListener('click', function () { clearHash(); $('banner').hidden = true; mode = 'own'; refresh(); var f = st.p[0] && $('pn-' + st.p[0].id); if (f) f.focus(); });
    V.route(load);
  }
  // Every load and every hashchange (valid, bad, old or empty) starts from a blank tab: nothing from a previous link survives.
  function load(h) {
    if (location.search) history.replaceState(null, '', location.pathname + location.hash); // PM 04:57: the address bar never keeps a ?query (path + #fragment only)
    var bn = $('banner');
    st = T.blank(defaultWeek()); selA = null; touched = {}; showAll = false; mode = 'own'; lastText = ''; V.clearErrors(document, '.tsh-err');
    bn.hidden = true; $('own-copy').hidden = true; $('linkbox').hidden = true; $('link').value = ''; $('fbwrap').hidden = true; $('fallback').value = '';
    if (h) {
      // PM 03:48: the WHOLE received URL (origin + path + # + fragment) is capped at 2,000 with the shared MILLVIEW.linkFor before decode, same as sending
      var d = V.linkFor(h.replace(/^#/, '')) ? T.decode(h) : { ok: false, why: 'bad' };
      if (d.ok) { st = d.data; showAll = true; mode = 'recv'; bn.hidden = false; $('banner-t').textContent = C.receiverIntro + ' ' + C.receiverNote; $('own-copy').hidden = false; }
      else if (d.why !== 'empty') { bn.hidden = false; $('banner-t').textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; }
    }
    syncForm(); drawPeople(); refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
