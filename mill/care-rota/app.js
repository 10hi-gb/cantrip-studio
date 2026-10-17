'use strict';
// Care Rota r1c UI. Memory only: no storage, no network. All visitor text from COPY (Writer copy.v2.js verbatim, N5).
// Typed text (names, who it's for, organizer, other need, notes, pasted lines) is shown through the shared quote rule
// everywhere: screen, aria, print and copied text (PM 02:34: no exemption; Writer's templates are filled with quoted values).
// Shared helpers: MILLVIEW.route/readOnly/toast/quote/typed/linkFor/clearInputs.
(function () {
  var C = COPY, M = MILL, V = MILLVIEW, $ = function (id) { return document.getElementById(id); };
  var KEYS = ['dinner', 'ride', 'walk', 'other'], NC = { dinner: 'meal', ride: 'ride', walk: 'walk', other: 'other' };
  var last = null, lastCfg = null, prevPatch = {}, fbText = '';
  var q = V.quote;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function plural(o, n, v) { return M.plural(o, n, v); }
  // ---- needs fieldset ----
  function buildNeeds() { var fs = $('needs'); fs.querySelectorAll('.cr-need').forEach(function (n) { n.remove(); });
    KEYS.forEach(function (k) { var box = el('div', 'cr-need'); box.id = 'need-' + k;
      var head = el('div', 'cr-need-h'), cb = el('input'); cb.type = 'checkbox'; cb.id = 'n-' + k; var lab = el('label', 'chip ' + NC[k], C.needs[k]); lab.htmlFor = cb.id;
      head.append(cb, lab);
      if (k === 'other') { var ot = el('input'); ot.type = 'text'; ot.id = 'n-other-t'; ot.placeholder = C.otherNeedPlaceholder; ot.setAttribute('aria-label', C.needs.other); ot.autocomplete = 'off'; head.append(ot); }
      box.append(head);
      var body = el('div', 'cr-need-b'); body.id = 'nb-' + k; body.hidden = true;
      var rl = el('label', null, C.dayRuleLabel); rl.htmlFor = 'r-' + k; var sel = el('select'); sel.id = 'r-' + k;
      ['every', 'weekdays', 'these', 'except'].forEach(function (r) { var o = el('option', null, C.dayRules[r]); o.value = r; sel.append(o); });
      var chips = el('fieldset', 'cr-chips'); chips.id = 'c-' + k; chips.hidden = true; chips.append(el('legend', null, C.pickDays));
      var nl = el('label', null, M.fill(C.notesLabel, { need: C.needs[k] })); nl.htmlFor = 'note-' + k; nl.id = 'note-' + k + '-l'; var nt = el('textarea'); nt.id = 'note-' + k; nt.rows = 2; nt.placeholder = C.notesPlaceholder;
      body.append(rl, sel, chips, nl, nt, Object.assign(el('p', 'cr-fe'), { id: 'e-need-' + k, hidden: true }), Object.assign(el('p', 'cr-fe'), { id: 'e-note-' + k, hidden: true }));
      box.append(body); fs.append(box);
      cb.addEventListener('change', function () { body.hidden = !cb.checked; });
      sel.addEventListener('change', function () { chips.hidden = !(sel.value === 'these' || sel.value === 'except'); });
      if (k === 'other') $('n-other-t').addEventListener('input', function () { var v = M.strip(this.value) || C.needs.other; $('note-other-l').textContent = M.fill(C.notesLabel, { need: this.value.trim() ? q(v) : v }); });
    }); buildChips(); }
  function buildChips() { var days = CR.range($('f-first').value, $('f-last').value) || []; if (days.length > CR.LIM.days) days = [];
    KEYS.forEach(function (k) { var fs = $('c-' + k), was = {}; fs.querySelectorAll('input:checked').forEach(function (i) { was[i.value] = 1; });
      fs.querySelectorAll('.cr-chip').forEach(function (n) { n.remove(); });
      days.forEach(function (t) { var iso = CR.iso(t), w = el('label', 'cr-chip'), i = el('input'); i.type = 'checkbox'; i.value = iso; i.checked = !!was[iso]; var d = CR.d2(t).split(' '); w.append(i, el('span', null, d[0] + ' ' + d[2])); w.title = CR.d2(t); i.setAttribute('aria-label', CR.d2(t)); fs.append(w); }); }); }
  // ---- read the form ----
  function cfg() { var needs = []; KEYS.forEach(function (k) { if (!$('n-' + k).checked) return; var label = k === 'other' ? M.strip($('n-other-t').value) : C.needs[k];
      needs.push({ key: k, label: label, rule: $('r-' + k).value, days: Array.from($('c-' + k).querySelectorAll('input:checked')).map(function (i) { return i.value; }), note: $('note-' + k).value }); });
    return { forName: $('f-for').value, org: $('f-org').value, first: $('f-first').value, last: $('f-last').value, needs: needs, noteAll: $('f-note-all').value }; }
  function planLines() { return $('f-plan').value.split(/\r?\n/); }
  // ---- errors ----
  var FIELD = { 'for': 'f-for', org: 'f-org', first: 'f-first', last: 'f-last', needs: 'needs', plan: 'f-plan', 'note-all': 'f-note-all' };
  function fieldOf(f) { return FIELD[f] || (f === 'need-other' ? 'n-other-t' : /^need-/.test(f) ? 'r-' + f.slice(5) : /^note-/.test(f) ? f : f); }
  function errText(e) { var max = { forTooLong: CR.LIM.forName, orgTooLong: CR.LIM.org, otherTooLong: CR.LIM.other, notesTooLong: CR.LIM.notes, tooManyDays: CR.LIM.days, tooManyNeeds: CR.LIM.needs, planTooManyLines: CR.LIM.lines }[e.code];
    var t = C[e.code]; if (e.code === 'needNoDays') return M.fill(t, { need: isStd(e.need) ? e.need : q(e.need) });
    return typeof t === 'object' ? plural(t, e.n, { max: max }) : M.fill(t, { max: max }); }
  function clearErrs() { V.clearErrors(document, '.cr-fe'); document.querySelectorAll('[aria-describedby]').forEach(function (n) { if (n.id !== 'f-plan') n.removeAttribute('aria-describedby'); }); $('f-plan').setAttribute('aria-describedby', 'plan-hint'); $('errs').hidden = true; $('errs-l').textContent = ''; }
  function showErrs(list) { clearErrs(); var ul = $('errs-l');
    list.forEach(function (e) { var id = fieldOf(e.f), box = $('e-' + e.f) || $('e-needs'), msg = errText(e), f = $(id);
      if (box) { box.textContent = box.textContent ? box.textContent + ' ' + msg : msg; box.hidden = false; }
      if (f) { f.setAttribute('aria-invalid', 'true'); if (box) f.setAttribute('aria-describedby', (f.id === 'f-plan' ? 'plan-hint ' : '') + box.id); }
      var li = el('li'), a = el('a', null, msg); a.href = '#' + id; li.append(a); ul.append(li);
      // in-page error link: never touches the address bar; scrolls the field (with its label) into view and focuses it
      a.addEventListener('click', function (ev) { ev.preventDefault(); var t = $(id); if (!t) return; if (t.tagName === 'FIELDSET') t = t.querySelector('input') || t; t.scrollIntoView({ block: 'center' }); t.focus({ preventScroll: true }); }); });
    $('errs').hidden = false; var first = ul.querySelector('a'); if (first) first.focus(); }
  // ---- render the check ----
  // PM wrap rule in quilt patches (QA C5/C6): break at spaces, then hyphens; mid-word only when one word can't fit its box; a
  // closing quote never alone on a line (the last letter and ” are kept together). Same quote rule as MILLVIEW.typed.
  function qn(s) { var t = q(s), e = el('span', 'mill-typed'); e.append(document.createTextNode(t.slice(0, -2)), el('span', 'cr-nw', t.slice(-2))); return e; }
  function names(list) { return list.map(function (n) { return q(n); }).join(' + '); }
  function show(id, on) { $(id).classList.toggle('on', !!on); }
  function tallyRow(r) { var t = CR.tally(r), box = $('tally'); box.textContent = '';
    [['needed', ''], ['covered', 'ok'], ['gaps', 'g'], ['double', 'g'], ['toFix', 'g'], ['notNeeded', 'g'], ['duplicate', '']].forEach(function (p, i) {
      var n = t[p[0]], cls = p[1] === 'g' ? (n ? 'bad' : 'ok') : p[1], s = el('span', cls), txt = plural(C.tally[p[0]], n, {}), m = /^(\d+)(.*)$/.exec(txt);
      if (m) { s.append(el('b', null, m[1]), document.createTextNode(m[2])); } else s.textContent = txt;
      if (i) { var sp = el('span', 'cr-sep', C.tallySep); sp.setAttribute('aria-hidden', 'true'); box.append(sp); } box.append(s); });
    box.setAttribute('aria-label', Object.keys(C.tally).map(function (k) { return plural(C.tally[k], t[k], {}); }).join(C.tallySep));
    var clear = !t.gaps && !t.double && !t.toFix && !t.notNeeded && !t.duplicate; $('all-clear').hidden = !clear; $('all-clear').textContent = clear ? C.allClear : ''; }
  function quilt(r) { var host = $('quilts'); host.textContent = ''; var next = {};
    for (var w = 0; w < r.days.length; w += 7) { var wk = r.days.slice(w, w + 7), qd = el('div', 'quilt'), g = el('div', 'qgrid'); qd.setAttribute('role', 'group'); qd.setAttribute('aria-label', C.quiltLabel + ': ' + CR.d2(wk[0]) + ' – ' + CR.d2(wk[wk.length - 1]));
      g.style.gridTemplateColumns = '5.2em repeat(' + wk.length + ',minmax(0,1fr))';
      g.append(el('div', 'colhead')); wk.forEach(function (t) { var d = CR.d2(t).split(' '); var h = el('div', 'dow colhead', d[0] + ' ' + d[2]); h.setAttribute('aria-hidden', 'true'); g.append(h); });
      r.needs.forEach(function (n, ni) { var rl = el('div', 'rowlab'); rl.append(n.key === 'other' ? V.typed(n.label) : document.createTextNode(n.label)); rl.setAttribute('aria-hidden', 'true'); g.append(rl);
        var nshow = n.key === 'other' ? q(n.label) : n.label;
        wk.forEach(function (t, di) { var key = t + '|' + n.label, on = r.needSet[key], who = r.got[key] || [], p = el('div', 'patch'), d = CR.d2(t).split(' ');
          p.style.setProperty('--o', String((w + di) * 10 + ni)); p.setAttribute('role', 'img');
          var dd = el('span', 'd'); dd.append(el('span', 'wd', d[0] + ' '), document.createTextNode(d[2])); var ne = el('span', 'need'); ne.append(n.key === 'other' ? qn(n.label) : document.createTextNode(n.label)); p.append(dd, ne);
          if (!on) { p.classList.add('hole'); p.append(el('span', 'who', C.legend.notNeeded)); p.setAttribute('aria-label', M.fill(C.patchNotNeeded, { date: CR.d2(t), need: nshow })); }
          else if (!who.length) { p.classList.add('gap'); p.append(el('span', 'who', C.legend.gap)); p.setAttribute('aria-label', M.fill(C.patchGap, { date: CR.d2(t), need: nshow })); }
          else { p.classList.add(who.length > 1 ? 'dbl' : 'taken'); if (who.length === 1) p.classList.add(NC[n.key]); var wh = el('span', 'who'); who.forEach(function (nm, wi) { if (wi) wh.append(document.createTextNode(' +\n')); wh.append(qn(nm)); }); p.append(wh); if (who.length > 1) p.append(el('span', 'pin', '×' + who.length));
            p.setAttribute('aria-label', M.fill(C.patchNames, { date: CR.d2(t), need: nshow, names: M.raw((who.length > 1 ? C.legend.double + ': ' : '') + names(who)) })); }
          var sig = (on ? 1 : 0) + ':' + who.join('\u0001'); next[key] = sig; if (prevPatch[key] != null && prevPatch[key] !== sig) p.classList.add('new');
          g.append(p); }); });
      qd.append(g); host.append(qd); }
    prevPatch = next;
    var lg = $('legend'); lg.textContent = ''; [['covered'], ['gap'], ['double'], ['notNeeded']].forEach(function (x) { var s = el('span'), i = el('i', 'cr-sw cr-sw--' + x[0]); s.append(i, document.createTextNode(C.legend[x[0]])); lg.append(s); }); }
  function needShown(r, label) { var n = r.needs.find(function (x) { return x.label === label; }); return n && n.key === 'other' ? q(label) : label; }
  function issueText(i) { switch (i.kind) {
    case 'wrongWeekday': return M.fill(C.tagToFix, { line: i.line, date: CR.d2(i.t), weekday: i.weekday, typedWeekday: i.typedWeekday, name: q(i.name) });
    case 'twoNeeds': return M.fill(C.tagTwoNeeds, { line: i.line }); case 'twoNames': return M.fill(C.tagTwoNames, { line: i.line });
    case 'noDay': return M.fill(C.tagNoDay, { line: i.line }); case 'nameTooLong': return M.fill(C.tagNameTooLong, { line: i.line, max: i.max }); case 'ambiguous': return M.fill(C.tagAmbiguous, { line: i.line, n: i.n });
    default: return M.fill(C.tagCouldntRead, { line: i.line }); } }
  function tags(r) { var host = $('tags'); host.textContent = ''; var add = function (txt, info, cls) { var d = el('div', 'tag' + (info ? ' info' : '') + (cls ? ' ' + cls : '')); d.append(el('p', null, txt)); host.append(d); };
    r.issues.forEach(function (i) { add(issueText(i)); });
    r.dbl.forEach(function (x) { add(M.fill(C.tagDouble, { date: CR.d2(x.t), need: needShown(r, x.need), names: M.raw(x.names.map(function (n) { return q(n); }).join(', ')) }), false, 'cr-tag-dbl'); }); // Creative 05:42: spans the full row in the tag grid
    r.gaps.forEach(function (k) { add(M.fill(C.tagGap, { date: CR.d2(k[0]), need: needShown(r, k[1]) })); });
    r.notneeded.forEach(function (x) { add(M.fill(C.tagNotNeeded, { line: x.line, need: needShown(r, x.need), date: CR.d2(x.t) })); });
    r.readas.forEach(function (x) { if (x.onlyWeekday) add(M.fill(C.tagReadAs, { line: x.line, date: CR.d2(x.t), weekday: x.onlyWeekday, need: needShown(r, x.need), name: q(x.name) }), true); });
    r.dups.forEach(function (x) { add(M.fill(C.tagDuplicate, { line: x.line }), true); });
    // set-aside pocket: every line not placed
    var pl = $('pocket-l'); pl.textContent = ''; $('pocket-h').textContent = C.setAsideHeading;
    r.rows.forEach(function (row) { if (row.result === 'placed' || row.result === 'double') return; var li = el('li'); li.append(V.typed(row.line), document.createTextNode(' · ' + (row.result === 'duplicate' ? C.duplicateBadge : C.readingResults[row.result]))); pl.append(li); });
    $('pocket').hidden = !pl.children.length;
    $('per-h').textContent = C.perHelperHeading; var per = $('per-l'); per.textContent = '';
    r.helpers.forEach(function (h) { per.append(el('li', null, M.fill(C.perHelperLine, { name: q(h.name), n: h.items.length }))); }); $('per').hidden = !r.helpers.length; }
  function stampShown(r, c) { return M.fill(C.stamp, { datetime: r.stamp, org: q(M.strip(c.org)) }); }
  function card(title, text, btnLabel, titleNode) { var d = el('div', 'panel hcard'), h = el('h3'); if (titleNode) h.append(titleNode); else h.textContent = title; d.append(h);
    var lines = text.split('\n'), st = lines.pop(), m = el('div', 'msg'); m.textContent = lines.join('\n') + '\n'; m.append(el('span', 'stamp', st)); d.append(m);
    var b = el('button', 'btn btn-main', btnLabel); b.type = 'button'; b.addEventListener('click', function () { copy(text); }); var row = el('div', 'btnrow'); row.append(b); d.append(row); return d; }
  function handoffs(r, c) { $('s3-h').textContent = C.handoffsHeading; $('s3-note').textContent = C.handoffsNote; var host = $('cards'); host.textContent = '';
    r.helpers.forEach(function (h) { host.append(card(null, CR.handoff(C, r, c, h), M.fill(C.copyHelper, { name: q(h.name) }), V.typed(h.name))); });
    host.append(card(C.stillOpenHeading, CR.stillOpen(C, r, c), C.copyStillOpen)); }
  function sheetView(s, head, recv) { $('sheet-h').textContent = M.fill(C.sheetHeading, { for: q(head.forName) }); $('sheet-range').textContent = M.fill(C.sheetRange, { first: CR.d2(CR.parseISO(head.first)), last: CR.d2(CR.parseISO(head.last)) });
    // explicit table roles: on a phone the rows are stacked with display:block (QA W-7), which would otherwise turn the table into a layout table
    var tb = $('sheet-t').tBodies[0]; tb.textContent = ''; $('sheet').classList.toggle('is-long', s.length > 14); // print: up to 28 days on one Letter page
    s.forEach(function (d) { var tr = el('tr'), td = el('td', 'day', CR.d2(d.t)), tw = el('td'); tr.setAttribute('role', 'row'); td.setAttribute('role', 'cell'); tw.setAttribute('role', 'cell'); tr.append(td, tw);
      if (!d.who.length) tw.textContent = C.sheetNothing; else tw.textContent = d.who.map(function (w) { return M.fill(C.sheetLine, { name: q(w.name), needs: w.needs.map(function (n) { return head.std(n) ? n : q(n); }).join(' + ') }); }).join(' · ');
      tb.append(tr); });
    $('stamp-4').textContent = M.fill(C.stamp, { datetime: head.stamp, org: q(head.org) }); $('sheet-note').textContent = M.fill(C.sheetChangeNote, { org: q(head.org) }); $('b-print').textContent = C.printSheet;
    document.body.classList.add('has-sheet'); } // print shows #s4 only while a current sheet exists (QA C2)
  // QA C2: Start over, Make my own rota and a damaged link all drop the old sheet (DOM and state), so print can't carry it over
  function clearSheet() { ['sheet-h', 'sheet-range', 'stamp-4', 'sheet-note'].forEach(function (id) { $(id).textContent = ''; }); $('sheet-t').tBodies[0].textContent = ''; $('sheet').classList.remove('is-long'); document.body.classList.remove('has-sheet'); }
  function isStd(n) { return KEYS.slice(0, 3).some(function (k) { return C.needs[k] === n; }); }
  function reading(r) { var tr = $('readas').tHead.rows[0]; tr.textContent = ''; ['line', 'day', 'need', 'name', 'result'].forEach(function (k) { tr.append(el('th', null, C.readingCols[k])); });
    var tb = $('readas').tBodies[0]; tb.textContent = '';
    r.rows.forEach(function (row) { var x = el('tr'), l = el('td', 'l'); l.append(document.createTextNode(row.n + '. '), V.typed(row.line)); x.append(l);
      [['day', row.day != null ? CR.d2(row.day) : ''], ['need', row.need ? needShown(r, row.need) : ''], ['name', row.name ? q(row.name) : '']].forEach(function (p) { var td = el('td', null, p[1]); td.setAttribute('data-l', C.readingCols[p[0]] + ': '); x.append(td); });
      var st = el('td'), sp = el('span', 'st ' + ({ placed: 'placed', double: 'dbl', duplicate: 'dup' }[row.result] || 'fix'), C.readingResults[row.result]); st.append(sp); x.append(st); tb.append(x); });
    $('s5-h').textContent = C.readingHeading; $('s5-note').textContent = C.readingNote; $('s5-rules').textContent = C.readingRules; }
  function runCheck() { clearErrs(); hideFb(); var c = cfg(), lines = planLines(), errs = CR.errors(c, lines); if (errs.length) { showErrs(errs); return; }
    var r = CR.check(c, lines); r.stamp = CR.stampTime(Date.now()); last = r; lastCfg = c;
    $('s2-h').textContent = C.checkedBadge; tallyRow(r); quilt(r); tags(r); $('stamp-2').textContent = stampShown(r, c);
    $('b-open').textContent = C.copyStillOpen; $('b-edit').textContent = C.editAgain;
    handoffs(r, c); sheetView(CR.sheet(r), { forName: M.strip(c.forName), org: M.strip(c.org), first: c.first, last: c.last, stamp: r.stamp, std: isStd }); reading(r);
    $('link-box').hidden = true; $('link').value = ''; $('link-long').hidden = true; $('link-long').textContent = '';
    ['s2', 's3', 's4', 's5'].forEach(function (s) { show(s, true); }); $('share').hidden = false; refit();
    $('s2').focus({ preventScroll: true }); $('s2').scrollIntoView({ block: 'start' }); }
  // QA local-cde64e3 C14: above the phone layout, a quoted name of up to 10 graphemes stays on one line in its square: that square's names step
  // down in size (never under 10px) until the name fits. Longer names keep the base size and wrap under the PM rule (spaces, hyphens, mid-word last).
  var SEG = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function graphemes(t) { return SEG ? Array.from(SEG.segment(t)).length : Array.from(t).length; }
  // QA local-83edf87 C14: measure against the exact text width (not the rounded clientWidth), including the closing quote, and confirm the name
  // really sits on one line; refit after layout settles (two frames), when web fonts finish loading, and on resize.
  function lineCount(s) { var rg = document.createRange(), tops = []; rg.selectNodeContents(s);
    Array.prototype.forEach.call(rg.getClientRects(), function (r) { if (r.width > 0.5 && !tops.some(function (t) { return Math.abs(t - r.top) <= 3; })) tops.push(r.top); }); return tops.length; }
  function fitNames() { var wide = window.matchMedia('(min-width: 561px)').matches;
    document.querySelectorAll('#quilts .patch .who').forEach(function (w) { w.style.fontSize = ''; var nm = w.querySelectorAll('.mill-typed'), avail = w.getBoundingClientRect().width; if (!wide || !nm.length || !avail) return;
      var f = parseFloat(getComputedStyle(w).fontSize), wid = function (s) { s.style.whiteSpace = 'nowrap'; var x = s.getBoundingClientRect().width; s.style.whiteSpace = ''; return x; };
      nm.forEach(function (s) { if (graphemes(s.textContent) - 2 > 10) return; // the two quote marks are not part of the name
        for (var x = wid(s); (x > avail - 0.25 || lineCount(s) > 1) && f > 10; x = wid(s)) { f = Math.max(10, Math.min(f - 0.25, Math.floor(f * (avail - 0.25) / x * 4) / 4)); w.style.fontSize = f + 'px'; } }); }); }
  function refit() { fitNames(); requestAnimationFrame(function () { fitNames(); requestAnimationFrame(fitNames); }); }
  var fitT = 0; window.addEventListener('resize', function () { cancelAnimationFrame(fitT); fitT = requestAnimationFrame(refit); });
  if (document.fonts) { if (document.fonts.ready) document.fonts.ready.then(refit); if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit); }
  // fetch Care Rota's own six font files at load (names are set in the italic, which nothing on the form uses), so they are in place before
  // Check and the first fit already measures the final glyphs; a late swap still refits on 'loadingdone'.
  if (document.fonts && document.fonts.forEach) document.fonts.forEach(function (f) { if (f.status === 'unloaded') f.load().catch(function () {}); });
  // PM 04:57 / 05:15 query strip: load and hashchange keep path + #fragment; edit, reset and Make my own rota write the path only. A ?query never survives.
  function bare() { if (location.hash || location.search) history.replaceState(null, '', location.pathname); }
  // ---- copy / fallback ----
  function hideFb() { $('fb').hidden = true; $('fb-t').value = ''; fbText = ''; }
  function copy(text) { hideFb(); var fail = function () { V.toast(C.copyFail); fbText = text; $('fb-why').textContent = C.copyFail; $('fb-t').value = text; $('fb').hidden = false; $('fb-t').focus(); $('fb-t').select(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { V.toast(C.copied); }, fail); else fail(); }
  function makeLink() { if (!last) return; var u = V.linkFor(CR.encodeSheet(last, lastCfg));
    if (!u) { $('link-box').hidden = true; $('link-long').textContent = C.tooLongLink; $('link-long').hidden = false; V.toast(C.tooLongLink); return; }
    $('link-long').hidden = true; $('link').value = u; $('link-box').hidden = false; $('link').focus(); $('link').select(); copy(u); }
  // ---- views ----
  function texts() { document.title = C.title + ' · ' + C.studioName; $('home').textContent = C.studioLabel; $('home').setAttribute('aria-label', C.backLabel); $('title').textContent = C.title; $('lede').textContent = C.invitation;
    $('days-h').textContent = C.daysHeading; $('f-for-l').textContent = C.forLabel; $('f-for').placeholder = C.forPlaceholder; $('f-org-l').textContent = C.orgLabel; $('f-org').placeholder = C.orgPlaceholder;
    $('f-first-l').textContent = C.firstDayLabel; $('f-last-l').textContent = C.lastDayLabel; $('needs-l').textContent = C.needsLabel; $('f-note-all-l').textContent = C.notesEveryoneLabel; $('f-note-all').placeholder = C.notesPlaceholder; $('notes-hint').textContent = C.notesHint;
    $('f-plan-l').textContent = C.planLabel; $('plan-hint').textContent = C.planHint; $('b-check').textContent = C.primary; $('b-reset').textContent = C.reset; $('empty-state').textContent = C.emptyState;
    $('share-h').textContent = C.shareSheetHeading; $('link-warn').textContent = C.linkWarning; $('link-holds').textContent = C.linkHolds; $('b-link').textContent = C.makeLink; $('link-l').textContent = C.linkLabel;
    $('fb-l').textContent = C.copyTextLabel; $('privacy').textContent = C.privacy; $('own').textContent = C.receiverPrimary; $('b-print').textContent = C.printSheet; }
  function fresh() { last = null; lastCfg = null; prevPatch = {}; clearSheet(); $('quilts').textContent = ''; $('cards').textContent = ''; $('tags').textContent = ''; $('readas').tBodies[0].textContent = ''; $('link-box').hidden = true; $('link').value = ''; V.readOnly($('form'), false); V.clearInputs($('form')); buildNeeds(); clearErrs(); hideFb();
    ['s2', 's3', 's4', 's5'].forEach(function (s) { show(s, false); }); show('s1', true); $('recv').hidden = true; $('bad').hidden = true; $('share').hidden = false; $('privacy').hidden = false; document.body.classList.remove('is-recv'); }
  function routeTo(h) { if (location.search) history.replaceState(null, '', location.pathname + location.hash); // PM 04:57: never keep a ?query
    fresh(); if (!h) return;
    // QA C1: received origin+path+fragment is capped at 2,000 like every piece (shared linkFor), not just the fragment
    // Cap: origin+path+fragment ≤ 2,000 chars. Not a literal full-URL cap. An appended ?query is ignored; pieces never generate a query, and no visitor content is ever in a query string (never parsed, shown or echoed).
    var d = V.linkFor(String(h).replace(/^#/, '')) ? CR.decodeSheet(h) : { ok: false, why: 'bad' }; if (!d.ok) { $('bad-t').textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; $('bad').hidden = false; return; }
    var s = d.data; document.body.classList.add('is-recv');
    // recipient: the household sheet only, read-only; the organizer form is disabled in the DOM (shared readOnly) and not shown
    V.readOnly($('form'), true); show('s1', false); $('share').hidden = true;
    var intro = $('recv-intro'), parts = C.receiverIntro.split('{org}'); intro.textContent = ''; intro.append(document.createTextNode(parts[0]), V.typed(s.org), document.createTextNode(parts.slice(1).join('{org}')));
    $('recv-note').textContent = C.receiverNote; $('recv').hidden = false;
    sheetView(s.sheet, { forName: s.forName, org: s.org, first: s.first, last: s.last, stamp: s.stamp, std: isStd }); show('s4', true); }
  function reset() { if (!window.confirm(C.resetConfirm)) return;
    bare(); routeTo(''); V.toast(C.resetDone); $('f-for').focus(); }
  // deferred script: the DOM is parsed. Wire once here, BEFORE route() runs (route runs at once when readyState isn't 'loading').
  (function init() { texts(); buildNeeds();
    $('form').addEventListener('submit', function (e) { e.preventDefault(); try { runCheck(); } catch (err) { V.toast(C.error); } });
    ['f-first', 'f-last'].forEach(function (id) { $(id).addEventListener('change', buildChips); });
    $('b-reset').addEventListener('click', reset);
    $('b-open').addEventListener('click', function () { if (last) copy(CR.stillOpen(C, last, lastCfg)); });
    $('form').addEventListener('input', bare); $('form').addEventListener('change', bare);
    $('b-edit').addEventListener('click', function () { bare(); var p = $('f-plan'); p.scrollIntoView({ block: 'center' }); p.focus(); });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-link').addEventListener('click', makeLink);
    $('own').addEventListener('click', function () { bare(); routeTo(''); $('f-for').focus(); });
  })();
  V.route(routeTo);
})();
