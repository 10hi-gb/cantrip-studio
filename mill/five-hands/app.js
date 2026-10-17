'use strict';
// Five Hands r1c UI. Memory only: no storage, no network. Visitor text from COPY (writer/five-hands/copy.js verbatim) plus one
// marked stand-in (COPY_EXTRA.sessionEmpty). Typed text (session title, task names, helper names) is shown through the shared
// quote rule everywhere: screen, aria, select options, print and copied text (PM: no exemption).
// Shared helpers: MILLVIEW.route/readOnly/toast/quote/typed/linkFor/clearInputs. Sizes go through style.setProperty (CSP-safe).
(function () {
  var C = COPY, X = COPY_EXTRA, M = MILL, V = MILLVIEW, $ = function (id) { return document.getElementById(id); }, q = V.quote, L = FH.LIM;
  var seq = 0, tried = false, last = null, prevSuggest = null, fbText = '';
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function txt(s) { return document.createTextNode(s); }
  function sep() { var s = el('span', 'fh-sep', C.tallySep); s.setAttribute('aria-hidden', 'true'); return s; }
  // ---- form rows ----
  function row(kind, name, min) { var id = kind[0] + (++seq), r = el('div', 'row fh-row'); r.dataset.id = id; r.dataset.kind = kind;
    var nl = el('label', 'fh-vh'), ni = el('input'), ml = el('label', 'fh-vh'), mi = el('input', 'min'), rm = el('button', 'btn fh-rm', '×');
    ni.type = 'text'; ni.id = 'n-' + id; ni.autocomplete = 'off'; ni.placeholder = kind === 'task' ? C.taskPlaceholder : C.helperPlaceholder; nl.htmlFor = ni.id; ni.value = name || '';
    mi.type = 'text'; mi.id = 'm-' + id; mi.inputMode = 'numeric'; mi.autocomplete = 'off'; ml.htmlFor = mi.id; mi.value = min == null ? '' : String(min);
    rm.type = 'button'; var a = el('div', 'fh-cell'), b = el('div', 'fh-cell'); a.append(nl, ni); b.append(ml, mi); var e = el('p', 'errmsg'); e.id = 'e-' + id; e.hidden = true; e.setAttribute('data-err-hide', '');
    r.append(a, b, rm, e);
    rm.addEventListener('click', function () { var host = r.parentNode, next = r.nextElementSibling || r.previousElementSibling; r.remove(); relabel(); syncCheck(); if (tried) live(); var f = next && next.querySelector('input'); (f || $(kind === 'task' ? 'add-task' : 'add-helper')).focus(); });
    ni.addEventListener('input', function () { relabel(); syncCheck(); }); mi.addEventListener('input', syncCheck);
    return r; }
  function rows(kind) { return Array.from($(kind === 'task' ? 'tasks' : 'helpers').children); }
  function relabel() { ['task', 'helper'].forEach(function (k) { var rs = rows(k), max = k === 'task' ? L.tasks : L.helpers;
      rs.forEach(function (r, i) { var nm = M.strip(r.querySelector('input').value), lab = r.querySelectorAll('label');
        lab[0].textContent = (k === 'task' ? C.taskLabel : C.helperLabel) + ' ' + (i + 1); lab[1].textContent = (k === 'task' ? C.minutesLabel : C.helperMinutesLabel) + ' ' + (i + 1);
        var rm = r.querySelector('.fh-rm'); rm.setAttribute('aria-label', M.fill(k === 'task' ? C.removeTask : C.removeHelper, k === 'task' ? { task: nm ? q(nm) : lab[0].textContent } : { name: nm ? q(nm) : lab[0].textContent })); rm.disabled = rs.length < 2; });
      $(k + 's-h').textContent = M.fill(k === 'task' ? C.tasksHeading : C.helpersHeading, { n: rs.length, max: max });
      $('add-' + k).disabled = rs.length >= max; var mx = $(k + 's-max'); mx.hidden = rs.length < max; mx.textContent = M.fill(k === 'task' ? C.tooManyTasks : C.tooManyHelpers, { max: max }); }); }
  function addRow(kind, name, min, focus) { var host = $(kind === 'task' ? 'tasks' : 'helpers'); if (host.children.length >= (kind === 'task' ? L.tasks : L.helpers)) return; var r = row(kind, name, min); host.append(r); relabel(); syncCheck(); if (focus) r.querySelector('input').focus(); }
  // blank rows (no name, no minutes) are skipped, unless every row is blank (then the first one reports "Name the task.")
  function read() { var out = {}; ['task', 'helper'].forEach(function (k) { var rs = rows(k).filter(function (r) { var i = r.querySelectorAll('input'); return i[0].value.trim() || i[1].value.trim(); });
      if (!rs.length) rs = rows(k).slice(0, 1); out[k] = rs; out[k + 's'] = rs.map(function (r) { var i = r.querySelectorAll('input'); return { name: i[0].value, min: FH.minutes(i[1].value) }; }); });
    out.title = $('f-title').value; out.mode = $('m-check').checked ? 'check' : 'suggest'; return out; }
  // ---- check-mode panel: one select per named task; selection kept by helper row id ----
  function syncCheck() { var on = $('m-check').checked; $('check').hidden = !on; if (!on) return; var host = $('check-rows'), was = {};
    host.querySelectorAll('select').forEach(function (s) { was[s.dataset.task] = s.value; }); host.textContent = '';
    var hs = rows('helper').filter(function (r) { return M.strip(r.querySelector('input').value); });
    rows('task').forEach(function (r) { var nm = M.strip(r.querySelector('input').value); if (!nm) return; var min = FH.minutes(r.querySelectorAll('input')[1].value);
      var d = el('div', 'row chk'), t = el('span', 'fh-cn'), s = el('select'); s.id = 'a-' + r.dataset.id; s.dataset.task = r.dataset.id;
      t.append(V.typed(nm)); var lab = el('label', 'fh-vh', M.fill(C.checkAssignLabel, { task: nm })); lab.htmlFor = s.id;
      var o = el('option', null, C.benchOption); o.value = ''; s.append(o);
      hs.forEach(function (h) { var op = el('option', null, q(M.strip(h.querySelector('input').value))); op.value = h.dataset.id; s.append(op); });
      s.value = was[r.dataset.id] && hs.some(function (h) { return h.dataset.id === was[r.dataset.id]; }) ? was[r.dataset.id] : '';
      d.append(t, el('span', 'fh-cm', isNaN(min) ? '' : min + ' min'), lab, s); host.append(d); }); }
  // ---- validation UX: field errors, button says "Fix N things to continue", first error gets focus ----
  function errText(e) { switch (e.code) {
    case 'taskMinutesInvalid': return M.fill(C.taskMinutesInvalid, { min: L.taskMin, max: L.maxMin }); case 'helperMinutesInvalid': return M.fill(C.helperMinutesInvalid, { min: L.helperMin, max: L.maxMin });
    case 'taskTooLong': return M.plural(C.taskTooLong, e.n, { max: L.task }); case 'helperTooLong': return M.plural(C.helperTooLong, e.n, { max: L.helper }); case 'sessionTooLong': return M.plural(C.sessionTooLong, e.n, { max: L.title });
    case 'taskDuplicate': case 'helperDuplicate': return M.fill(C[e.code], { name: e.name }); case 'tooManyTasks': return M.fill(C.tooManyTasks, { max: L.tasks }); case 'tooManyHelpers': return M.fill(C.tooManyHelpers, { max: L.helpers });
    case 'sessionEmpty': return X.sessionEmpty; default: return C[e.code] || C.error; } }
  function clearErrs() { V.clearErrors($('form'), '.errmsg'); $('form').querySelectorAll('[aria-invalid]').forEach(function (n) { n.removeAttribute('aria-invalid'); n.removeAttribute('aria-describedby'); });
    $('form').querySelectorAll('.row.err').forEach(function (r) { r.classList.remove('err'); }); }
  function showErrs(errs, d) { clearErrs(); var first = null;
    errs.forEach(function (e) { var input, box;
      if (e.f === 'title') { input = $('f-title'); box = $('e-title'); }
      else { var k = /^task|^tasks$/.test(e.f) ? 'task' : 'helper', r = d[k][e.i || 0] || rows(k)[0]; input = r.querySelectorAll('input')[/Min$/.test(e.f) ? 1 : 0]; box = r.querySelector('.errmsg'); r.classList.add('err'); }
      var m = errText(e); box.textContent = box.textContent ? box.textContent + ' ' + m : m; box.hidden = false; input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', box.id);
      if (!first) first = input; });
    var b = $('b-split'); if (errs.length) { b.textContent = M.plural(C.fixToContinue, errs.length, {}); b.setAttribute('aria-disabled', 'true'); } else { b.textContent = C.primary; b.removeAttribute('aria-disabled'); }
    return first; }
  function live() { var d = read(); showErrs(FH.validate(d.helpers, d.tasks, d.title), d); }
  // ---- render a result ----
  function show(id, on) { $(id).classList.toggle('on', !!on); }
  function setv(n, k, v) { n.style.setProperty(k, String(v)); }
  function tally(res) { var box = $('tally'); box.textContent = '';
    [['work', res.work, ''], ['available', res.available, ''], ['assigned', res.given, ''], ['bench', res.benchMin, res.benchMin ? 'bad' : 'ok']].forEach(function (p, i) {
      var s = el('span', p[2] || null), t = M.fill(C.tally[p[0]], { n: p[1] }), m = /^(\d+)(.*)$/.exec(t); s.append(el('b', null, m[1]), txt(m[2])); if (i) box.append(sep()); box.append(s); });
    var ok = res.conserved; box.append(sep()); box.append(el('span', ok ? 'ok' : 'bad', ok ? M.fill(C.conservation, { on: res.given, bench: res.benchMin, work: res.work }) : C.conservationFail)); }
  function stick(it, sc) { var s = el('div', 'stick'); setv(s, '--m', it.min); setv(s, '--sc', sc); var t = el('span', 't'); t.append(V.typed(it.name)); s.append(t, el('span', 'm', String(it.min)));
    if (it.overMin) { s.classList.add('over'); setv(s, '--p', (Math.round(it.overMin / it.min * 1000) / 10) + '%'); } return s; }
  function helperCard(r, sc, title) { var a = el('article', 'helper' + (r.cap === 0 ? ' zero' : '')), nm = q(M.strip(r.name)), ll = M.fill(C.loadLine, { load: r.load, cap: r.cap });
    a.setAttribute('aria-label', nm + ': ' + ll);
    var hh = el('div', 'hhead'), tab = el('span', 'tab'); tab.append(V.typed(r.name)); var ld = el('span', 'load', r.cap === 0 && !r.items.length ? C.rolledUp : ll);
    var b = el('button', 'btn noprint', M.fill(C.copyCard, { name: nm })); b.type = 'button'; b.addEventListener('click', function () { var t = FH.cardText(C, title, r); preview(nm, t); copy(t); });
    hh.append(tab, ld, b); a.append(hh);
    var me = el('div', 'meter'); me.setAttribute('aria-hidden', 'true'); setv(me, '--sc', sc); setv(me, '--cap', r.cap); setv(me, '--ld', Math.min(r.load, r.cap)); setv(me, '--ov', r.over);
    me.append(el('span', 'cap'), el('span', 'fill')); if (r.over) me.append(el('span', 'ovr')); a.append(me);
    var tr = el('div', 'track'); setv(tr, '--sc', sc); setv(tr, '--cap', r.cap); setv(tr, '--ov', r.over);
    if (r.cap === 0) { var ru = el('span', 'rolled'); ru.setAttribute('aria-hidden', 'true'); tr.append(ru); if (!r.items.length) { var zn = el('span', 'zeronote', C.rolledUp); zn.setAttribute('aria-hidden', 'true'); tr.append(zn); } }
    else { var rl = el('span', 'roll'); rl.setAttribute('aria-hidden', 'true'); tr.append(rl); }
    if (r.over) { var oz = el('span', 'overzone'); oz.setAttribute('aria-hidden', 'true'); tr.append(oz); }
    var st = el('div', 'sticks'); r.items.forEach(function (it) { st.append(stick(it, sc)); }); tr.append(st); a.append(tr);
    if (r.over) a.append(el('p', 'overtag', M.fill(C.overBy, { n: r.over, name: nm, cap: r.cap })));
    a.append(el('div', 'stampline', C.stamp)); return a; }
  function preview(nm, t) { $('preview-h').textContent = M.fill(C.cardPreviewLabel, { name: nm }); $('preview-t').textContent = t; $('preview').hidden = false; }
  function render(d, res, recv) { last = { d: d, res: res }; var title = M.strip(d.title);
    $('s2-h').textContent = res.mode === 'check' ? C.checkTotals : res.bench.length ? C.suggestHeadingShort : C.suggestHeading;
    tally(res); $('cons-fail').hidden = res.conserved; $('cons-fail').textContent = res.conserved ? '' : C.conservationFail; $('result').hidden = !res.conserved;
    // the simple-rule label line rides on every Suggest result
    $('rule').hidden = res.mode !== 'suggest'; $('rule-h').textContent = C.ruleHeading; $('rule-t').textContent = C.ruleText;
    var ov = $('over'); ov.hidden = res.mode !== 'check';
    ov.textContent = res.over.length ? M.plural(C.overList, res.over.length, { list: M.raw(res.over.map(function (r) { return M.fill(C.overItem, { name: q(M.strip(r.name)), n: r.over }); }).join(', ')) }) : C.checkNoneOver;
    var sc = res.scale, host = $('rolls'); host.textContent = ''; res.rows.forEach(function (r) { host.append(helperCard(r, sc, title)); });
    // bench
    var bh = $('bench-h'), pl = $('plank'); pl.textContent = ''; bh.hidden = !res.bench.length; bh.textContent = res.bench.length ? M.plural(C.benchHeading, res.bench.length, { m: res.benchMin }) : '';
    if (res.bench.length) { var bs = el('div', 'sticks'), bsc = Math.max(sc, Math.max.apply(null, res.bench.map(function (t) { return t.min; }))); res.bench.forEach(function (t) { bs.append(stick(t, bsc)); }); pl.append(bs); }
    else pl.append(el('p', 'empty', C.benchEmpty));
    var be = $('bench-explain'); be.hidden = !res.benchExplain; be.textContent = res.benchExplain ? M.fill(C.benchExplain, { m: res.benchMin, list: M.raw(res.spares.map(function (r) { return M.fill(C.spareItem, { name: q(M.strip(r.name)), n: r.spare }); }).join(' · ')) }) : '';
    $('b-bench').hidden = !res.bench.length; $('preview').hidden = true;
    $('b-change').hidden = !!recv; sheet(title, res); $('link-box').hidden = true; $('link').value = ''; $('link-long').hidden = true; $('share').hidden = !!recv;
    show('s2', true); show('s5', true); }
  function sheet(title, res) { $('sheet-h').textContent = M.fill(C.sheetHeading, { title: title }); var tb = $('sheet-t').tBodies[0]; tb.textContent = '';
    var line = function (its) { return its.map(function (it) { return q(M.strip(it.name)) + ' ' + it.min; }).join(' · '); };
    res.rows.forEach(function (r) { var tr = el('tr'), n = el('td', 'n'); n.append(V.typed(r.name)); var nm = q(M.strip(r.name));
      var mt = M.fill(C.loadLine, { load: r.load, cap: r.cap }) + (r.over ? C.tallySep + M.fill(C.overBy, { n: r.over, name: nm, cap: r.cap }) : '');
      tr.append(n, el('td', null, r.items.length ? line(r.items) : r.cap === 0 ? C.rolledUp : ''), el('td', null, mt)); tb.append(tr); });
    if (res.bench.length) { var tr = el('tr', 'fh-benchrow'); tr.append(el('td', 'n', C.sheetBenchRow), el('td', null, line(res.bench)), el('td', null, res.benchMin + ' min')); tb.append(tr); }
    $('sheet-stamp').textContent = C.stamp; $('sheet-rule').textContent = res.mode === 'check' ? C.sheetRuleCheck : C.sheetRule; $('sheet-note').textContent = C.sheetNote; }
  function split() { tried = true; var d = read(), errs = FH.validate(d.helpers, d.tasks, d.title), first = showErrs(errs, d);
    if (errs.length) { first.scrollIntoView({ block: 'center' }); first.focus({ preventScroll: true }); return; }
    var res;
    if (d.mode === 'check') { var ids = d.helper.map(function (r) { return r.dataset.id; });
      res = FH.check(d.helpers, d.task.map(function (r) { var s = $('a-' + r.dataset.id); return s && s.value ? ids.indexOf(s.value) : -1; }), d.tasks); }
    else res = FH.suggest(d.helpers, d.tasks);
    var ch = $('change'); ch.hidden = true; ch.textContent = '';
    if (res.mode === 'suggest') { var now = d.helpers.map(function (h) { return [M.strip(h.name).toLowerCase(), h.min, M.strip(h.name)]; });
      if (prevSuggest && prevSuggest.length === now.length && now.every(function (h, i) { return h[0] === prevSuggest[i][0]; })) {
        var items = now.filter(function (h, i) { return h[1] !== prevSuggest[i][1]; }).map(function (h) { var i = now.indexOf(h); return M.fill(C.changeItem, { name: q(h[2]), was: prevSuggest[i][1], now: h[1] }); });
        if (items.length) { ch.textContent = M.fill(C.changeSummary, { list: M.raw(items.join(' · ')) }); ch.hidden = false; } }
      prevSuggest = now; }
    render({ title: d.title, helpers: d.helpers, tasks: d.tasks }, res, false); hideFb();
    $('s2').scrollIntoView({ block: 'start' }); $('s2').focus({ preventScroll: true }); }
  // ---- copy / fallback ----
  function hideFb() { $('fb').hidden = true; $('fb-t').value = ''; fbText = ''; }
  function copy(text) { hideFb(); var fail = function () { V.toast(C.copyFail); fbText = text; $('fb-why').textContent = C.copyFail; $('fb-t').value = text; $('fb').hidden = false; $('fb-t').focus(); $('fb-t').select(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { V.toast(C.copied); }, fail); else fail(); }
  function makeLink() { if (!last) return; var f = FH.encode(last.d.title, last.d.helpers, last.d.tasks, last.res), u = f.length <= L.frag ? V.linkFor(f) : null;
    if (!u) { $('link-box').hidden = true; $('link-long').textContent = C.tooLongLink; $('link-long').hidden = false; V.toast(C.tooLongLink); return; }
    $('link-long').hidden = true; $('link').value = u; $('link-box').hidden = false; $('link').focus(); $('link').select(); copy(u); }
  // ---- views ----
  function texts() { document.title = C.title + ' · ' + C.studioName; $('home').textContent = C.studioLabel; $('home').setAttribute('aria-label', C.backLabel); $('title').textContent = C.title; $('lede').textContent = C.invitation; $('scope').textContent = C.scopeLine;
    $('f-title-l').textContent = C.sessionLabel; $('f-title').placeholder = C.sessionPlaceholder; $('empty-state').textContent = C.emptyState;
    $('th-task').textContent = C.taskLabel; $('th-min').textContent = C.minutesLabel; $('th-helper').textContent = C.helperLabel; $('th-hmin').textContent = C.helperMinutesLabel; $('zero-hint').textContent = C.zeroHint;
    $('add-task').textContent = C.addTask; $('add-helper').textContent = C.addHelper; $('mode-l').textContent = C.modeLabel; $('m-suggest-l').textContent = C.modeSuggest; $('m-check-l').textContent = C.modeCheck; $('check-h').textContent = C.checkHeading;
    $('b-split').textContent = C.primary; $('b-reset').textContent = C.reset; $('privacy').textContent = C.privacy; $('b-bench').textContent = C.copyBench; $('b-print').textContent = C.printSheet; $('b-change').textContent = C.changeMinutes;
    $('sc-helper').textContent = C.sheetCols.helper; $('sc-tasks').textContent = C.sheetCols.tasks; $('sc-min').textContent = C.sheetCols.minutes;
    $('share-h').textContent = C.shareHeading; $('link-warn').textContent = C.linkWarning; $('link-holds').textContent = C.linkHolds; $('b-link').textContent = C.makeLink; $('link-l').textContent = C.linkLabel; $('fb-l').textContent = C.copyTextLabel; $('own').textContent = C.receiverPrimary; }
  function fill(data, mode, assign) { $('tasks').textContent = ''; $('helpers').textContent = ''; $('f-title').value = data ? data.title : '';
    (data ? data.tasks : [{}]).forEach(function (t) { addRow('task', t.name, t.min); }); (data ? data.helpers : [{}]).forEach(function (h) { addRow('helper', h.name, h.min); });
    $('m-check').checked = mode === 'check'; $('m-suggest').checked = mode !== 'check'; syncCheck();
    if (assign) { var hr = rows('helper'); rows('task').forEach(function (r, i) { var s = $('a-' + r.dataset.id); if (s && assign[i] >= 0) s.value = hr[assign[i]].dataset.id; }); } }
  function fresh() { last = null; prevSuggest = null; tried = false; V.readOnly($('form'), false); V.clearInputs($('form')); fill(null); clearErrs(); hideFb(); $('b-split').textContent = C.primary; $('b-split').removeAttribute('aria-disabled');
    show('s2', false); show('s5', false); show('s1', true); $('head').hidden = false; $('recv').hidden = true; $('bad').hidden = true; $('share').hidden = false; document.body.classList.remove('is-recv'); }
  function routeTo(h) { fresh(); if (!h) return;
    var r = FH.decode(h); if (!r.ok) { $('bad-t').textContent = r.why === 'oldVersion' ? C.oldVersion : C.badLink; $('bad').hidden = false; return; }
    var d = r.data; document.body.classList.add('is-recv');
    // recipient: the proposed split, read-only; the organizer form is filled (for "Make my own copy"), disabled (shared readOnly) and not shown
    fill(d, d.res.mode, d.res.assign); V.readOnly($('form'), true); show('s1', false);
    $('recv-intro').textContent = C.receiverIntro; $('recv').hidden = false;
    render(d, d.res, true); }
  function own() { var d = last && last.d, res = last && last.res; history.replaceState(null, '', location.pathname + location.search); routeTo('');
    if (d) { fill(d, res.mode, res.assign); split(); } }
  function reset() { if (!window.confirm(C.resetConfirm)) return; if (location.hash && location.hash !== '#') history.replaceState(null, '', location.pathname + location.search); routeTo(''); V.toast(C.resetDone); $('f-title').focus(); }
  // deferred script: the DOM is parsed. Wire once here, BEFORE route() runs (route runs at once when readyState isn't 'loading').
  (function init() { texts(); fill(null);
    $('form').addEventListener('submit', function (e) { e.preventDefault(); try { split(); } catch (err) { V.toast(C.error); } });
    $('form').addEventListener('input', function () { if (tried) live(); });
    $('add-task').addEventListener('click', function () { addRow('task', '', null, true); }); $('add-helper').addEventListener('click', function () { addRow('helper', '', null, true); });
    $('m-suggest').addEventListener('change', syncCheck); $('m-check').addEventListener('change', syncCheck);
    $('b-reset').addEventListener('click', reset);
    $('b-bench').addEventListener('click', function () { if (last) copy(FH.benchText(C, last.d.title, last.res)); });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-change').addEventListener('click', function () { var f = rows('helper')[0].querySelectorAll('input')[1]; f.scrollIntoView({ block: 'center' }); f.focus({ preventScroll: true }); });
    $('b-link').addEventListener('click', makeLink); $('own').addEventListener('click', own);
  })();
  V.route(routeTo);
})();
