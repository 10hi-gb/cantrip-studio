'use strict';
// Before You Go — UI. All visitor text goes through textContent / value. Nothing stored; the address bar is only ever cleared.
// Every load / hashchange rebuilds from scratch (MILLVIEW.route). A received link opens read-only (MILLVIEW.readOnly);
// "Make my own copy" turns it into an editable copy that keeps per-fact attribution (sender vs you).
(function () {
  var C = COPY, M = MILL, B = BYG, V = MILLVIEW, $ = function (id) { return document.getElementById(id); };
  var ICONS = {"place": "<path d=\"M20 36s-11-10-11-19a11 11 0 0 1 22 0c0 9-11 19-11 19z\"/><circle cx=\"20\" cy=\"17\" r=\"4\"/>", "when": "<rect x=\"6\" y=\"9\" width=\"28\" height=\"25\" rx=\"3\"/><path d=\"M6 16h28M13 5v7M27 5v7\"/><path d=\"M20 21v6l4 2\"/>", "contact": "<path d=\"M12 6h6l2 8-4 3a20 20 0 0 0 7 7l3-4 8 2v6a3 3 0 0 1-3 3C18 31 9 22 9 9a3 3 0 0 1 3-3z\"/>", "door": "<rect x=\"10\" y=\"5\" width=\"20\" height=\"31\" rx=\"1\"/><circle class=\"fill\" cx=\"25\" cy=\"21\" r=\"1.8\"/><path d=\"M5 36h30\"/>", "bag": "<path d=\"M8 14h24l-2 21H10z\"/><path d=\"M14 14v-3a6 6 0 0 1 12 0v3\"/>", "id": "<rect x=\"5\" y=\"10\" width=\"30\" height=\"21\" rx=\"3\"/><circle cx=\"14\" cy=\"20\" r=\"3.5\"/><path d=\"M9 27c1-3 9-3 10 0M23 17h8M23 22h8\"/><text x=\"0\" y=\"0\"/>", "appt": "<rect x=\"6\" y=\"9\" width=\"28\" height=\"25\" rx=\"3\"/><path d=\"M6 16h28M13 5v7M27 5v7M14 25l4 4 8-8\"/>", "park": "<rect x=\"7\" y=\"5\" width=\"26\" height=\"30\" rx=\"4\"/><path d=\"M16 29V12h6a5 5 0 0 1 0 10h-6\"/>"}; // Creative's static icon paths (no visitor content)
  var ICON_OF = { place: 'place', window: 'when', contact: 'contact', instructions: 'door', bring: 'bag', id: 'id', appt: 'appt', park: 'park', access: 'door' };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var st = B.blank(), mode = 'own', rows = {}, toastT = 0, senderName = ''; // senderName: the name typed in the opened link (kept for its facts after Make my own copy)
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function label(k) { return B.OPTIONAL.indexOf(k) >= 0 ? C.optionalFields[k] : C.fields[k]; }
  function question(k) { var q = B.questions(st, C).filter(function (x) { return x.key === k; })[0]; return q ? q.text : (B.OPTIONAL.indexOf(k) >= 0 ? C.optionalQuestions[k] : C.questions[k]); }
  function toast(msg) { V.toast(msg, 3200); } // shared: route() clears it (QA N2)
  function clearHash() { if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function roomLine(node, err, value, cap, tpl) { var used = B.room(M.strip(value)), over = used - cap; node.textContent = M.fill(C.limitCounter, { n: used, max: cap }); err.textContent = over > 0 ? M.plural(tpl, over, { max: cap }) : ''; return over; }
  function edited() { clearHash(); $('linkbox').hidden = true; $('link').value = ''; }
  function quoted(v) { return window.MILLVIEW.quote(v); } // shared typed-text rule (mill/shared/view.js)
  // label + separate value node (D4: typed text is never part of a product sentence)
  function typedInto(node, tpl, key, value) { node.textContent = ''; var parts = String(tpl).split('{' + key + '}'); node.appendChild(document.createTextNode(parts[0])); var q = /[“"]$/.test(parts[0]); node.appendChild(q ? el('span', 'byg-typed mill-typed', M.unquote(value)) : V.typed(value, 'byg-typed')); if (parts[1]) node.appendChild(document.createTextNode(parts[1])); }
  function whenPair(prefix, labelText) { // date (required for a value) + optional time
    var w = el('div', 'byg-when'), d = el('input', 'byg-in'), t = el('input', 'byg-in'), dl = el('label', null, C.whenDateLabel), tl = el('label', null, C.whenTimeLabel);
    d.type = 'date'; t.type = 'time'; d.id = prefix + '-d'; t.id = prefix + '-t'; dl.htmlFor = d.id; tl.htmlFor = t.id; d.setAttribute('aria-label', labelText + ' · ' + C.whenDateLabel); t.setAttribute('aria-label', labelText + ' · ' + C.whenTimeLabel);
    [[dl, d], [tl, t]].forEach(function (p) { var c = el('div', 'is-empty'); c.appendChild(p[0]); c.appendChild(p[1]); w.appendChild(c); p[1].addEventListener('input', function () { c.classList.toggle('is-empty', !p[1].value); }); p[1].__box = c; });
    return { box: w, d: d, t: t, get: function () { return d.value ? d.value + (t.value ? ' ' + t.value : '') : ''; }, set: function (v) { if (!v) { if (d.value) d.value = ''; } else { var p = String(v).split(' '); if (d.value !== (p[0] || '')) d.value = p[0] || ''; if (t.value !== (p[1] || '')) t.value = p[1] || ''; } d.__box.classList.toggle('is-empty', !d.value); t.__box.classList.toggle('is-empty', !t.value); }, timeOnly: function () { return !!t.value && !d.value; } };
  }
  function buildRow(k, list) {
    var li = el('li', 'byg-fact'), id = 'f-' + k, r = { li: li }, isW = k === 'window';
    li.appendChild(el('span', 'byg-box')).setAttribute('aria-hidden', 'true');
    var tile = el('span', 'byg-tile'); tile.setAttribute('aria-hidden', 'true'); var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('viewBox', '0 0 40 40'); svg.innerHTML = ICONS[ICON_OF[k]]; tile.appendChild(svg); li.appendChild(tile);
    var mid = el('div'); var lab = el('div', 'byg-lab'); r.lab = el(isW ? 'span' : 'label', null, label(k)); if (!isW) r.lab.htmlFor = id; lab.appendChild(r.lab); mid.appendChild(lab);
    r.editv = el('div', 'byg-editv');
    if (isW) { r.w = whenPair('f-window', label(k)); r.editv.appendChild(r.w.box); r.inp = r.w.d; r.editv.appendChild(el('span', 'byg-count', C.placeholders.window)); }
    else { r.inp = el('textarea', 'byg-in byg-fv'); r.inp.rows = 1; r.inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); }); r.inp.id = id; r.inp.autocomplete = 'off'; r.inp.placeholder = (k in C.placeholders) ? C.placeholders[k] : ''; r.editv.appendChild(r.inp); r.cnt = el('span', 'byg-count'); r.cnt.id = 'c-' + k; r.inp.setAttribute('aria-describedby', r.cnt.id + ' e-' + k); r.editv.appendChild(r.cnt); }
    r.err = el('span', 'byg-err'); r.err.id = 'e-' + k; r.err.setAttribute('aria-live', 'polite'); r.editv.appendChild(r.err); if (k === 'contact') { var ph = el('p', 'byg-hintline', C.privateDetailsHint); ph.id = 'privacy-hint'; r.editv.appendChild(ph); } mid.appendChild(r.editv);
    // read-only value line: what the facts say, with who typed/confirmed them (shown on received links, always printed)
    r.line = el('div', 'byg-line'); mid.appendChild(r.line); r.past = el('div', 'byg-past', C.datePassed); mid.appendChild(r.past); li.appendChild(mid);
    r.chip = el('span', 'byg-chip'); li.appendChild(r.chip);
    r.q = el('div', 'byg-q'); li.appendChild(r.q);
    r.edit = el('div', 'byg-edit');
    if (isW) { r.wa = whenPair('a-window', label(k) + ' · ' + C.confirmPlaceholder); r.edit.appendChild(r.wa.box); r.ans = r.wa.d; }
    else { r.ans = el('input', 'byg-in'); r.ans.id = 'a-' + k; r.ans.autocomplete = 'off'; r.ans.placeholder = C.confirmPlaceholder; r.ans.setAttribute('aria-label', M.fill(C.answerAria, { field: label(k) })); r.edit.appendChild(r.ans); r.acnt = el('span', 'byg-count byg-acount'); r.acnt.id = 'ac-' + k; r.edit.appendChild(r.acnt); }
    r.ok = el('button', 'byg-btn byg-btn--ok', C.confirmButton); r.ok.type = 'button'; r.ok.id = 'ok-' + k; r.hint = el('span', 'byg-hint'); r.hint.id = 'h-' + k; r.hint.setAttribute('aria-live', 'polite');
    r.ans.setAttribute('aria-describedby', (r.acnt ? r.acnt.id + ' ' : '') + r.hint.id); r.nsb = el('button', 'byg-btn byg-ns', C.notSureToggle); r.nsb.type = 'button'; r.nsb.id = 'ns-' + k; r.edit.appendChild(r.ok); r.edit.appendChild(r.nsb); r.edit.appendChild(r.hint); li.appendChild(r.edit);
    r.nsl = el('div', 'byg-nsl'); li.appendChild(r.nsl);
    r.conf = el('div', 'byg-confirmed'); r.by = el('span', 'byg-by'); r.undo = el('button', 'byg-btn', C.unconfirm); r.undo.type = 'button'; r.undo.id = 'un-' + k; r.conf.appendChild(r.by); r.conf.appendChild(r.undo); li.appendChild(r.conf);
    if (k === 'contact') { r.call = el('a', 'byg-call byg-btn byg-btn--go'); r.call.id = 'call'; r.text = el('a', 'byg-call byg-btn'); r.text.id = 'sms'; r.callnote = el('div', 'byg-callnote', C.typedBySenderMarker); r.callnote.id = 'callnote'; r.nocall = el('div', 'byg-nocall', C.contactMissing); r.nocall.id = 'nocall'; li.appendChild(r.call); li.appendChild(r.text); li.appendChild(r.callnote); li.appendChild(r.nocall); }
    li.appendChild(el('div', 'byg-write'));
    function setV(v) { if (mode !== 'own') return; st.f[k].v = v; st.f[k].vby = 'you'; edited(); refresh(); }
    function setA(v) { if (mode !== 'own') return; st.f[k].a = v; if (st.f[k].c) { st.f[k].c = false; } st.f[k].cby = 'you'; edited(); refresh(); }
    if (isW) { [r.w.d, r.w.t].forEach(function (e) { e.addEventListener('input', function () { r.wtouched = true; setV(r.w.get()); }); }); [r.wa.d, r.wa.t].forEach(function (e) { e.addEventListener('input', function () { setA(r.wa.get()); }); }); }
    else { r.inp.addEventListener('input', function () { grow(r.inp); setV(r.inp.value); }); r.ans.addEventListener('input', function () { setA(r.ans.value); }); }
    r.nsb.addEventListener('click', function () { if (mode !== 'own') return; var x = st.f[k]; x.ns = !x.ns; x.nsby = 'you'; if (x.ns) x.c = false; edited(); refresh(); r.nsb.focus(); });
    r.ok.addEventListener('click', function () { if (mode !== 'own') return; var a = isW ? r.wa.get() : M.strip(st.f[k].a); if (!a) { r.hint.textContent = C.confirmNeedsAnswer; r.ans.focus(); return; }
      if (!isW && B.room(a) > B.CAP[k]) { r.ans.focus(); return; } st.f[k].a = isW ? a : st.f[k].a; st.f[k].c = true; st.f[k].ns = false; st.f[k].cby = 'you'; edited(); refresh(); r.undo.focus(); });
    r.ans.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); r.ok.click(); } });
    r.undo.addEventListener('click', function () { if (mode !== 'own') return; var x = st.f[k];
      if (x.cby !== 'you') { x.v = x.a; x.vby = x.cby; x.a = ''; x.cby = 'you'; } x.c = false; edited(); refresh(); r.ans.focus(); });
    list.appendChild(li); rows[k] = r;
  }
  function grow(t) { t.style.height = 'auto'; if (t.scrollHeight) t.style.height = (t.scrollHeight + t.offsetHeight - t.clientHeight) + 'px'; } // N8: full text visible at 320
  function paintRow(k) {
    var r = rows[k], s = B.status(st, k), x = st.f[k], conf = s === 'confirmed', own = mode === 'own', isW = k === 'window';
    if (isW) { r.w.set(x.v); r.wa.set(x.a); } else { if (r.inp.value !== x.v) r.inp.value = x.v; if (r.ans.value !== x.a) r.ans.value = x.a; }
    r.li.className = 'byg-fact ' + (conf ? 'is-ok' : s === 'optional' ? 'is-opt' : 'is-wait') + (own ? '' : ' is-ro');
    var mine = B.owner(st, k) === 'you', name = senderName;
    // value editor (own copy only)
    r.editv.hidden = !own || conf;
    if (isW) r.err.textContent = (r.w.t.value && !r.w.d.value) || (r.wa.t.value && !r.wa.d.value) ? C.windowNeedsDate : ''; else roomLine(r.cnt, r.err, x.v, B.CAP[k], C.fieldTooLong);
    // read-only line: "As typed:" + the quoted value (recipient view and print; on the sender's screen the input shows it)
    r.line.textContent = ''; var v = B.display(st, k);
    if (v) { r.line.appendChild(el('span', 'byg-astyped', C.answerAsTyped)); r.line.appendChild(document.createTextNode(' ')); r.line.appendChild(el('span', 'byg-typed', quoted(v))); }
    else if (s !== 'optional') r.line.appendChild(el('span', 'byg-none', C.status.unknown));
    r.line.hidden = s === 'optional' || (s === 'notsure' && !v && !own); r.line.className = 'byg-line' + (own && !conf ? ' byg-print-only' : '') + (conf ? ' is-conf' : '');
    r.past.hidden = !(isW && B.datePassed(st, today()));
    r.chip.textContent = s === 'said' ? (mine ? C.status.said : C.status.saidSender) : s === 'notsure' ? C.status.notSure : C.status[s];
    r.chip.setAttribute('aria-label', M.fill(C.statusAria, { field: label(k), status: r.chip.textContent }));
    r.q.textContent = question(k); r.q.hidden = conf; r.edit.hidden = conf || !own; r.conf.hidden = !conf; r.undo.hidden = !own;
    r.nsb.setAttribute('aria-pressed', String(!!x.ns));
    var aover = isW ? 0 : B.room(M.strip(x.a)) - B.CAP[k], hasA = isW ? !!r.wa.d.value : !!M.strip(x.a);
    r.ok.setAttribute('aria-disabled', hasA && aover <= 0 ? 'false' : 'true');
    r.hint.textContent = aover > 0 ? M.plural(C.answerTooLong, aover, { max: B.CAP[k] }) : (hasA ? '' : C.confirmHint);
    if (r.acnt) r.acnt.textContent = M.fill(C.limitCounter, { n: B.room(M.strip(x.a)), max: B.CAP[k] }); // N6: the limit shows up front
    if (!isW && own && !r.editv.hidden) grow(r.inp);
    // who marked it: per fact; the sender's marks are never relabelled as "you"
    if (conf) { if (mine) r.by.textContent = C.confirmedByYou; else if (x.cby === 'sender' && name) typedInto(r.by, C.confirmedBy, 'name', name); else r.by.textContent = C.confirmedBySenderAnon; } else r.by.textContent = '';
    r.nsl.textContent = ''; if (s === 'notsure' && !mine) { if ((x.nsby || 'sender') === 'sender' && name) typedInto(r.nsl, C.notSureNote, 'name', name); else r.nsl.textContent = C.notSureBySenderAnon; } r.nsl.hidden = !r.nsl.textContent;
    if (k === 'contact') {
      var num = B.phone(B.shown(st, 'contact')), fromSender = !mine;
      r.call.hidden = r.text.hidden = !num; r.nocall.hidden = s !== 'unknown' || !!num; r.callnote.hidden = !(num && fromSender);
      if (num) { r.call.textContent = M.fill(C.callButton, { number: num }); r.call.href = B.telHref(num); r.text.textContent = M.fill(C.textButton, { number: num }); r.text.href = B.smsHref(num); }
      else { r.call.removeAttribute('href'); r.text.removeAttribute('href'); r.call.textContent = ''; r.text.textContent = ''; }
    }
  }
  function paintScript() {
    var ol = $('script'), pq = $('printq'); ol.textContent = ''; pq.textContent = '';
    B.questions(st, C).forEach(function (q) {
      var own = q.kind === 'own', li = el('li'); li.appendChild(own ? V.typed(q.text, 't') : el('span', 't', q.text)); pq.appendChild(el('li', null, (own ? quoted(q.text) : q.text) + '  ' + C.printAnswerLine + ' ____'));
      if (q.kind === 'own' && mode === 'own') { var i = +q.key.slice(3), b = el('button', 'byg-btn byg-rm', C.removeQuestion); b.type = 'button'; b.setAttribute('aria-label', C.removeQuestion + ': ' + quoted(q.text));
        b.addEventListener('click', function () { if (mode !== 'own') return; st.o.splice(i, 1); edited(); refresh(); $('own-in').focus(); }); li.appendChild(b); }
      ol.appendChild(li);
    });
    $('own-add').disabled = mode !== 'own';
  }
  function refresh() {
    var own = mode === 'own';
    B.ALL.forEach(paintRow);
    var open = B.openEssentials(st);
    var rd = $('ready'); rd.className = 'byg-ready ' + (open.length ? 'is-open' : 'is-ready');
    $('ready-n').textContent = open.length ? String(open.length) : '✓';
    $('ready-h').textContent = open.length ? M.plural(C.notSetHeading, open.length) : C.allConfirmedHeading;
    var saidN = B.CORE.filter(function (k) { return B.status(st, k) === 'said'; }), mineN = saidN.filter(function (k) { return B.owner(st, k) === 'you'; }).length, theirN = saidN.length - mineN;
    $('ready-s').textContent = [open.length ? M.fill(C.openList, { fields: open.map(label).join(', ') }) : '', mineN ? M.plural(C.someSaidNote, mineN) : '', theirN ? M.plural(C.someSaidNoteSender, theirN) : ''].filter(Boolean).join(' ');
    rd.setAttribute('aria-label', open.length ? M.fill(C.readinessAria, { n: open.length }) + '. ' + M.fill(C.openList, { fields: open.map(label).join(', ') }) : C.allConfirmedHeading);
    var pk = M.strip(st.k), what = $('what');
    what.textContent = ''; if (!pk) what.textContent = C.emptyState; else what.appendChild(V.typed(pk)); // N2: quoted in own copy too
    if ($('pickup').value !== st.k) $('pickup').value = st.k; if ($('by').value !== st.by) $('by').value = st.by;
    roomLine($('pickup-c'), $('pickup-e'), st.k, B.CAP.pickup, C.pickupTooLong); roomLine($('by-c'), $('by-e'), st.by, B.CAP.by, C.byTooLong); roomLine($('own-c'), $('own-e2'), $('own-in').value, B.CAP.own, C.ownTooLong);
    $('own-max').textContent = st.o.length >= B.CAP.ownMax ? M.fill(C.ownLimitReached, { max: B.CAP.ownMax }) : '';
    ['pickup-row', 'by-row', 'own-row'].forEach(function (id) { $(id).hidden = !own; }); $('own-e').hidden = !own;
    paintScript();
    $('text').value = B.text(st, C);
  }
  function setMode(m) {
    mode = m; var ro = m !== 'own';
    ['list', 'optlist', 'pickup-row', 'by-row', 'own-row', 'edit-actions'].forEach(function (id) { V.readOnly($(id), ro); }); $('edit-actions').hidden = ro; $('room-note').hidden = ro;
    document.body.classList.toggle('is-recv', ro);
  }
  function overLabels() { return B.overCaps(st).map(function (o) { if (o.key === 'pickup') return C.pickupLabel; if (o.key === 'by') return C.byLabel; if (/^own/.test(o.key)) return C.addOwnQuestion; return label(o.key.replace(/\.a$/, '')); }).filter(function (x, i, a) { return a.indexOf(x) === i; }); }
  function firstOver() { var o = B.overCaps(st)[0]; if (!o) return null; if (o.key === 'pickup') return $('pickup'); if (o.key === 'by') return $('by'); if (/^own/.test(o.key)) return $('own-in'); var k = o.key.replace(/\.a$/, ''); return /\.a$/.test(o.key) ? rows[k].ans : rows[k].inp; }
  function makeLink() {
    var rw = rows.window; if (rw.w.timeOnly() || rw.wa.timeOnly()) { rw.err.textContent = C.windowNeedsDate; toast(C.windowNeedsDate); (rw.w.timeOnly() ? rw.w.d : rw.wa.d).focus(); return null; } // N5: never drop the time silently
    var f = B.encode(st); if (f === null) { var e = firstOver(), ls = overLabels(); toast(ls.length ? M.plural(C.tooLongToShare, ls.length, { fields: ls.join(', ') }) : C.windowNeedsDate); if (e) e.focus(); return null; }
    if (f === '') { toast(C.tooLongLink); selectText(); return null; }
    var u = location.origin + location.pathname + '#' + f; if (u.length > B.URL_MAX) { toast(C.tooLongLink); selectText(); return null; } return u;
  }
  function selectText() { var t = $('text'); t.focus(); t.select(); }
  function showLink(u) { $('linkbox').hidden = false; var l = $('link'); l.value = u; l.focus(); l.select(); }
  function copy(s, after) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { toast(C.copied); }, function () { toast(C.copyFail); after(); }); else { toast(C.copyFail); after(); } }
  // Full reset of state and DOM: runs before every load / hashchange, bad links included (QA D1/D2).
  function resetAll() {
    st = B.blank(); senderName = ''; setMode('own'); V.clearInputs(document);
    $('linkbox').hidden = true; $('own-e').textContent = ''; $('banner').hidden = true; $('banner-t').textContent = ''; $('banner-n').textContent = ''; $('banner-y').textContent = ''; $('banner-y').hidden = true; $('own-copy').hidden = true;
    B.ALL.forEach(function (k) { rows[k].hint.textContent = ''; rows[k].wtouched = false; });
    V.clearErrors(document, '.byg-err,#own-e,#own-e2,#pickup-e,#by-e');
  }
  function load(h) {
    resetAll();
    if (h) {
      var d = B.decode(h), bn = $('banner');
      if (!d.ok) { if (d.why !== 'empty') { bn.hidden = false; $('banner-t').textContent = d.why === 'oldVersion' ? C.oldVersion : d.why === 'tooLong' ? C.tooLongLink : C.badLink; } }
      else {
        st = d.data; senderName = M.strip(st.by); setMode('recv');
        bn.hidden = false; if (M.strip(st.k)) typedInto($('banner-t'), C.receiverIntro, 'pickup', M.strip(st.k)); else $('banner-t').textContent = C.title;
        $('banner-y').textContent = C.typedBySenderMarker; $('banner-y').hidden = false;
        $('banner-n').textContent = C.receiverNote + ' ' + (M.strip(st.by) ? C.receiverEditNote : C.receiverEditNoteAnon); $('own-copy').hidden = false;
      }
    }
    refresh();
  }
  function init() {
    document.title = C.title + ' · ' + C.studioName; $('home').textContent = '← ' + C.backLabel;
    $('kicker').textContent = C.plateKicker; $('title').textContent = C.title;
    $('pickup-l').textContent = C.pickupLabel; $('pickup').placeholder = C.pickupPlaceholder;
    $('opt-h').textContent = C.optionalHeading; $('q-h').textContent = C.questionsHeading; $('printq-h').textContent = C.questionsHeading;
    $('own-in').placeholder = C.ownPlaceholder; $('own-in').setAttribute('aria-label', C.addOwnQuestion); $('own-add').textContent = C.addOwnQuestion;
    $('by-l').textContent = C.byLabel; $('by').placeholder = C.byPlaceholder;
    $('room-note').textContent = C.limitNote;
    $('b-link').textContent = C.copyLink; $('b-share').textContent = C.share; $('b-text').textContent = C.copyNotes; $('b-print').textContent = C.printNotes; $('b-reset').textContent = C.reset;
    $('fine').textContent = C.privacy + ' ' + C.noLookupNote; $('snap').textContent = C.snapshotNote; $('foot').textContent = C.printFooter;
    $('link-l').textContent = C.linkLabel; $('text-l').textContent = C.checklistHeading; $('own-copy').textContent = C.receiverPrimary;
    B.CORE.forEach(function (k) { buildRow(k, $('list')); }); B.OPTIONAL.forEach(function (k) { buildRow(k, $('optlist')); });
    $('pickup').addEventListener('input', function () { if (mode !== 'own') return; st.k = $('pickup').value; edited(); refresh(); });
    $('by').addEventListener('input', function () { if (mode !== 'own') return; st.by = $('by').value; edited(); refresh(); });
    function addOwn() { if (mode !== 'own') return; var v = M.strip($('own-in').value), over = B.room(v) - B.CAP.own; $('own-e').textContent = '';
      if (!v) return; if (st.o.length >= B.CAP.ownMax) { $('own-e').textContent = M.fill(C.ownLimitReached, { max: B.CAP.ownMax }); return; } if (over > 0) { $('own-e').textContent = M.plural(C.ownTooLong, over, { max: B.CAP.own }); return; }
      st.o.push(v); $('own-in').value = ''; edited(); refresh(); }
    $('own-add').addEventListener('click', addOwn); $('own-in').addEventListener('input', function () { roomLine($('own-c'), $('own-e2'), $('own-in').value, B.CAP.own, C.ownTooLong); });
    $('own-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
    $('b-link').addEventListener('click', function () { if (mode !== 'own') return; var u = makeLink(); if (!u) return; showLink(u); copy(u, function () { showLink(u); }); });
    $('b-share').addEventListener('click', function () { if (mode !== 'own') return; var u = makeLink(); if (!u) return; showLink(u);
      if (navigator.share) navigator.share({ title: C.title, text: M.strip(st.k) ? M.fill(C.shareTextTyped, { pickup: M.strip(st.k) }) : C.title, url: u }).then(function () {}, function () { toast(C.shareCancel); showLink(u); });
      else copy(u, function () { showLink(u); }); });
    $('b-text').addEventListener('click', function () { copy($('text').value, selectText); });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-reset').addEventListener('click', function () { if (mode !== 'own') return; if (!window.confirm(C.resetConfirm)) return; clearHash(); resetAll(); refresh(); toast(C.resetDone); $('pickup').focus(); });
    // Make my own copy: editable; per-fact attribution kept (sender's facts stay "by the sender"); the sender's name is not carried as "Your name".
    $('own-copy').addEventListener('click', function () { clearHash(); st.by = ''; senderName = ''; // N7: nothing is "confirmed by the sender" in a copy
      B.ALL.forEach(function (k) { var x = st.f[k], v = B.shown(st, k); st.f[k] = { v: v || '', a: '', c: false, ns: false, vby: 'you', cby: 'you', nsby: 'you' }; void x; }); setMode('own'); $('banner').hidden = true; refresh(); $('pickup').focus(); });
    V.route(load);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
