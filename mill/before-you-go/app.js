'use strict';
// Before You Go — UI. All visitor text goes through textContent / value. Nothing stored; the address bar is only ever cleared.
(function () {
  var C = COPY, M = MILL, B = BYG, $ = function (id) { return document.getElementById(id); };
  var ICONS = {"place": "<path d=\"M20 36s-11-10-11-19a11 11 0 0 1 22 0c0 9-11 19-11 19z\"/><circle cx=\"20\" cy=\"17\" r=\"4\"/>", "when": "<rect x=\"6\" y=\"9\" width=\"28\" height=\"25\" rx=\"3\"/><path d=\"M6 16h28M13 5v7M27 5v7\"/><path d=\"M20 21v6l4 2\"/>", "contact": "<path d=\"M12 6h6l2 8-4 3a20 20 0 0 0 7 7l3-4 8 2v6a3 3 0 0 1-3 3C18 31 9 22 9 9a3 3 0 0 1 3-3z\"/>", "door": "<rect x=\"10\" y=\"5\" width=\"20\" height=\"31\" rx=\"1\"/><circle class=\"fill\" cx=\"25\" cy=\"21\" r=\"1.8\"/><path d=\"M5 36h30\"/>", "bag": "<path d=\"M8 14h24l-2 21H10z\"/><path d=\"M14 14v-3a6 6 0 0 1 12 0v3\"/>", "id": "<rect x=\"5\" y=\"10\" width=\"30\" height=\"21\" rx=\"3\"/><circle cx=\"14\" cy=\"20\" r=\"3.5\"/><path d=\"M9 27c1-3 9-3 10 0M23 17h8M23 22h8\"/><text x=\"0\" y=\"0\"/>", "appt": "<rect x=\"6\" y=\"9\" width=\"28\" height=\"25\" rx=\"3\"/><path d=\"M6 16h28M13 5v7M27 5v7M14 25l4 4 8-8\"/>", "park": "<rect x=\"7\" y=\"5\" width=\"26\" height=\"30\" rx=\"4\"/><path d=\"M16 29V12h6a5 5 0 0 1 0 10h-6\"/>"}; // Creative's static icon paths (no visitor content)
  var ICON_OF = { place: 'place', window: 'when', contact: 'contact', instructions: 'door', bring: 'bag', id: 'id', appt: 'appt', park: 'park', access: 'door' };
  var SVGNS = 'http://www.w3.org/2000/svg';
  var st = B.blank(), recv = null, rows = {}, toastT = 0;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function label(k) { return B.OPTIONAL.indexOf(k) >= 0 ? C.optionalFields[k] : C.fields[k]; }
  function question(k) { return B.OPTIONAL.indexOf(k) >= 0 ? C.optionalQuestions[k] : C.questions[k]; }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 3200); }
  function clearHash() { if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
  function overMsg(over) { return M.plural(C.fieldTooLong, over); }
  function edited() { clearHash(); $('linkbox').hidden = true; }

  function buildRow(k, list) {
    var li = el('li', 'byg-fact'), id = 'f-' + k, r = { li: li };
    li.appendChild(el('span', 'byg-box')).setAttribute('aria-hidden', 'true');
    var tile = el('span', 'byg-tile'); tile.setAttribute('aria-hidden', 'true'); var svg = document.createElementNS(SVGNS, 'svg'); svg.setAttribute('viewBox', '0 0 40 40'); svg.innerHTML = ICONS[ICON_OF[k]]; tile.appendChild(svg); li.appendChild(tile);
    var mid = el('div'); var lab = el('div', 'byg-lab'); var l = el('label', null, label(k)); l.htmlFor = id; lab.appendChild(l); mid.appendChild(lab);
    r.inp = el('input', 'byg-in byg-fv'); r.inp.id = id; r.inp.autocomplete = 'off'; r.inp.placeholder = (k in C.placeholders) ? C.placeholders[k] : ''; mid.appendChild(r.inp);
    r.err = el('span', 'byg-err'); r.err.setAttribute('aria-live', 'polite'); mid.appendChild(r.err);
    r.val = el('div', 'byg-val'); mid.appendChild(r.val); r.said = el('div', 'byg-said'); mid.appendChild(r.said); li.appendChild(mid);
    r.chip = el('span', 'byg-chip'); li.appendChild(r.chip);
    r.q = el('div', 'byg-q', question(k)); li.appendChild(r.q);
    r.edit = el('div', 'byg-edit'); r.ans = el('input', 'byg-in'); r.ans.id = 'a-' + k; r.ans.autocomplete = 'off'; r.ans.placeholder = C.confirmPlaceholder; r.ans.setAttribute('aria-label', M.fill(C.answerAria, { field: label(k) }));
    r.ok = el('button', 'byg-btn byg-btn--ok', C.confirmButton); r.ok.type = 'button'; r.ok.id = 'ok-' + k; r.hint = el('span', 'byg-hint'); r.hint.id = 'h-' + k; r.hint.setAttribute('aria-live', 'polite');
    r.ans.setAttribute('aria-describedby', r.hint.id); r.edit.appendChild(r.ans); r.edit.appendChild(r.ok); r.edit.appendChild(r.hint); li.appendChild(r.edit);
    r.conf = el('div', 'byg-confirmed'); r.by = el('span'); r.undo = el('button', 'byg-btn', C.unconfirm); r.undo.type = 'button'; r.undo.id = 'un-' + k; r.conf.appendChild(r.by); r.conf.appendChild(r.undo); li.appendChild(r.conf);
    if (k === 'contact') { r.call = el('a', 'byg-call byg-btn byg-btn--go'); r.call.id = 'call'; r.text = el('a', 'byg-call byg-btn'); r.text.id = 'sms'; r.nocall = el('div', 'byg-nocall', C.contactMissing); r.nocall.id = 'nocall'; li.appendChild(r.call); li.appendChild(r.text); li.appendChild(r.nocall); }
    li.appendChild(el('div', 'byg-write'));
    r.inp.addEventListener('input', function () { st.f[k].v = r.inp.value; edited(); refresh(); });
    r.ans.addEventListener('input', function () { st.f[k].a = r.ans.value; if (st.f[k].c && !M.strip(r.ans.value)) st.f[k].c = false; edited(); refresh(); });
    r.ok.addEventListener('click', function () { if (!M.strip(st.f[k].a)) { r.hint.textContent = C.confirmNeedsAnswer; r.ans.focus(); return; } if (M.len(M.strip(st.f[k].a)) > B.CAP.a) return; st.f[k].c = true; recvBy = null; edited(); refresh(); r.undo.focus(); });
    r.ans.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); r.ok.click(); } });
    r.undo.addEventListener('click', function () { st.f[k].c = false; edited(); refresh(); r.ans.focus(); });
    list.appendChild(li); rows[k] = r;
  }
  // D4: typed values as label + separate text node.
  function typedInto(node, tpl, key, value) { node.textContent = ''; var parts = String(tpl).split('{' + key + '}'); node.appendChild(document.createTextNode(parts[0])); node.appendChild(el('span', 'byg-typed', value)); if (parts[1]) node.appendChild(document.createTextNode(parts[1])); }
  var recvBy = null; // name shown on confirmations that came in a received link (until the visitor changes one)
  function paintRow(k) {
    var r = rows[k], s = B.status(st, k), x = st.f[k], conf = s === 'confirmed';
    if (r.inp.value !== x.v) r.inp.value = x.v; if (r.ans.value !== x.a) r.ans.value = x.a;
    r.li.className = 'byg-fact ' + (conf ? 'is-ok' : s === 'optional' ? 'is-opt' : 'is-wait');
    var over = M.len(M.strip(x.v)) - B.CAP.v; r.err.textContent = over > 0 ? overMsg(over) : '';
    r.inp.hidden = conf; r.val.hidden = !conf && s !== 'unknown' && s !== 'optional';
    if (conf) { r.val.textContent = ''; r.val.appendChild(el('span', 'byg-astyped', C.answerAsTyped)); r.val.appendChild(document.createTextNode(' ')); r.val.appendChild(el('span', 'byg-typed', B.shown(st, k))); } else r.val.textContent = s === 'optional' ? '' : C.status.unknown; r.val.className = 'byg-val' + (conf ? '' : ' is-none'); if (s === 'optional') r.val.hidden = true;
    r.said.textContent = conf && M.strip(x.v) && M.strip(x.v) !== M.strip(x.a) ? C.status.said + ': ' + M.strip(x.v) : ''; r.said.hidden = !r.said.textContent;
    r.chip.textContent = C.status[s]; r.chip.setAttribute('aria-label', M.fill(C.statusAria, { field: label(k), status: C.status[s] }));
    r.q.hidden = conf; r.edit.hidden = conf; r.conf.hidden = !conf;
    var aover = M.len(M.strip(x.a)) - B.CAP.a;
    r.ok.disabled = false; r.ok.setAttribute('aria-disabled', M.strip(x.a) && aover <= 0 ? 'false' : 'true');
    r.hint.textContent = aover > 0 ? overMsg(aover) : (M.strip(x.a) ? '' : C.confirmHint);
    if (conf && recvBy) typedInto(r.by, C.confirmedBy, 'name', recvBy); else r.by.textContent = conf ? C.confirmedByYou : '';
    if (k === 'contact') {
      var num = B.phone(B.shown(st, 'contact'));
      r.call.hidden = r.text.hidden = !num; r.nocall.hidden = s !== 'unknown' || !!num;
      if (num) { r.call.textContent = M.fill(C.callButton, { number: num }); r.call.href = B.telHref(num); r.text.textContent = M.fill(C.textButton, { number: num }); r.text.href = B.smsHref(num); }
      else { r.call.removeAttribute('href'); r.text.removeAttribute('href'); }
    }
  }
  function paintScript() {
    var ol = $('script'); ol.textContent = '';
    B.questions(st, C).forEach(function (q) {
      var li = el('li'); li.appendChild(el('span', 't', q.text));
      if (q.kind === 'own') { var i = +q.key.slice(3), b = el('button', 'byg-btn byg-rm', C.removeQuestion); b.type = 'button'; b.setAttribute('aria-label', C.removeQuestion + ': ' + q.text);
        b.addEventListener('click', function () { st.o.splice(i, 1); edited(); refresh(); $('own-in').focus(); }); li.appendChild(b); }
      ol.appendChild(li);
    });
    $('own-add').disabled = st.o.length >= B.CAP.ownMax;
  }
  function refresh() {
    B.ALL.forEach(paintRow);
    var open = B.openEssentials(st), said = B.CORE.filter(function (k) { return B.status(st, k) === 'said'; }).length;
    var rd = $('ready'); rd.className = 'byg-ready ' + (open.length ? 'is-open' : 'is-ready');
    $('ready-n').textContent = open.length ? String(open.length) : '✓';
    $('ready-h').textContent = open.length ? M.plural(C.notSetHeading, open.length) : C.allConfirmedHeading;
    $('ready-s').textContent = open.length ? M.fill(C.openList, { fields: open.map(label).join(', ') }) + (said ? ' ' + M.plural(C.someSaidNote, said) : '') : (said ? M.plural(C.someSaidNote, said) : '');
    rd.setAttribute('aria-label', open.length ? M.fill(C.readinessAria, { n: open.length }) : C.allConfirmedHeading);
    var pk = M.strip(st.k); $('what').textContent = pk || C.emptyState;
    var pover = M.len(pk) - B.CAP.pickup; $('pickup-e').textContent = pover > 0 ? M.plural(C.pickupTooLong, pover) : '';
    paintScript();
    $('text').value = B.text(st, C);
  }
  function makeLink() {
    var f = B.encode(st); if (f === null) { toast(C.error); return null; }
    if (f === '') { toast(C.tooLongLink); selectText(); return null; }
    return location.origin + location.pathname + '#' + f;
  }
  function selectText() { var t = $('text'); t.focus(); t.select(); }
  function showLink(u) { $('linkbox').hidden = false; var l = $('link'); l.value = u; l.focus(); l.select(); }
  function copy(s, after) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(function () { toast(C.copied); }, function () { toast(C.copyFail); after(); }); else { toast(C.copyFail); after(); } }

  function init() {
    document.title = C.title + ' · ' + C.studioName; $('home').textContent = '← ' + C.backLabel;
    $('kicker').textContent = C.plateKicker; $('title').textContent = C.title;
    $('pickup-l').textContent = C.pickupLabel; $('pickup').placeholder = C.pickupPlaceholder;
    $('opt-h').textContent = C.optionalHeading; $('q-h').textContent = C.questionsHeading;
    $('own-in').placeholder = C.ownPlaceholder; $('own-in').setAttribute('aria-label', C.addOwnQuestion); $('own-add').textContent = C.addOwnQuestion;
    $('by-l').textContent = C.byLabel; $('by').placeholder = C.byPlaceholder;
    $('b-link').textContent = C.copyLink; $('b-share').textContent = C.share; $('b-text').textContent = C.copyNotes; $('b-print').textContent = C.printNotes; $('b-reset').textContent = C.reset;
    $('fine').textContent = C.privacy + ' ' + C.noLookupNote; $('snap').textContent = C.snapshotNote; $('foot').textContent = C.printFooter;
    $('link-l').textContent = C.linkLabel; $('text-l').textContent = C.checklistHeading; $('own-copy').textContent = C.receiverPrimary;
    B.CORE.forEach(function (k) { buildRow(k, $('list')); }); B.OPTIONAL.forEach(function (k) { buildRow(k, $('optlist')); });
    $('pickup').addEventListener('input', function () { st.k = $('pickup').value; edited(); refresh(); });
    $('by').addEventListener('input', function () { st.by = $('by').value; edited(); refresh(); });
    function addOwn() { var v = M.strip($('own-in').value), over = M.len(v) - B.CAP.own; $('own-e').textContent = '';
      if (!v || st.o.length >= B.CAP.ownMax) return; if (over > 0) { $('own-e').textContent = M.plural(C.ownTooLong, over); return; }
      st.o.push(v); $('own-in').value = ''; edited(); refresh(); }
    $('own-add').addEventListener('click', addOwn); $('own-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } });
    $('b-link').addEventListener('click', function () { var u = makeLink(); if (!u) return; showLink(u); copy(u, function () { showLink(u); }); });
    $('b-share').addEventListener('click', function () { var u = makeLink(); if (!u) return; showLink(u);
      if (navigator.share) navigator.share({ title: C.title, text: M.fill(C.shareText, { pickup: M.strip(st.k) || C.title }), url: u }).then(function () {}, function () { toast(C.shareCancel); showLink(u); });
      else copy(u, function () { showLink(u); }); });
    $('b-text').addEventListener('click', function () { copy($('text').value, selectText); });
    $('b-print').addEventListener('click', function () { window.print(); });
    $('b-reset').addEventListener('click', function () { if (!window.confirm(C.resetConfirm)) return; st = B.blank(); recvBy = null; $('pickup').value = ''; $('by').value = ''; $('own-in').value = ''; $('own-e').textContent = '';
      $('banner').hidden = true; clearHash(); $('linkbox').hidden = true; $('link').value = ''; refresh(); toast(C.resetDone); $('pickup').focus(); });
    $('own-copy').addEventListener('click', function () { clearHash(); $('banner').hidden = true; $('pickup').focus(); });
    window.addEventListener('hashchange', function () { if (location.hash) load(); });
    load();
  }
  function load() {
    var h = location.hash; if (!h || h === '#') { refresh(); return; }
    var d = B.decode(h), bn = $('banner');
    if (!d.ok) { if (d.why === 'empty') { refresh(); return; } bn.hidden = false; $('banner-t').textContent = d.why === 'oldVersion' ? C.oldVersion : d.why === 'tooLong' ? C.tooLongLink : C.badLink; $('banner-n').textContent = ''; $('own-copy').hidden = true; refresh(); return; }
    st = d.data; recvBy = M.strip(st.by) || null; $('pickup').value = st.k; $('by').value = st.by;
    bn.hidden = false; if (M.strip(st.k)) typedInto($('banner-t'), C.receiverIntro, 'pickup', st.k); else $('banner-t').textContent = M.fill(C.receiverIntro, { pickup: C.title });
    $('banner-n').textContent = C.receiverNote + ' ' + C.receiverEditNote; $('own-copy').hidden = false;
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
