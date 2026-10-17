'use strict';
// One Small Ask UI. Three views from one page: compose (no fragment), answer (#a1 ask link), read reply (#r1 reply link).
// Memory only. Links are made only when the visitor asks; the address bar is never rewritten except to clear it on reset/edit.
(function () {
  var C = COPY, M = MILL, A = ASK, $ = function (id) { return document.getElementById(id); };
  var V = window.MILLVIEW, mode, draft, ask, reply, choice, offer, note, touched = {}, toastT, lastText = '';
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function toast(t) { V.toast(t, 2600); } // shared: route() clears it (QA N2)
  function blankDraft() { return { w: '', e: '', u: 'min', d: '', s: '', t: '', h: '', f: '', o: '' }; }
  function initial(name) { var g = Array.from(M.strip(name))[0]; return g ? g.toUpperCase() : '?'; }
  function draftTerms(d) { return { w: d.w, e: /^\d{1,4}$/.test(String(d.e).trim()) ? +String(d.e).trim() : NaN, u: d.u, d: d.d, s: d.s, t: d.t, h: d.h }; }
  function draftAsk(d) { var t = draftTerms(d); t.f = d.f; t.o = d.o; return t; }
  // ---------- generic pieces ----------
  function input(cls, val, aria, opts) { var e = el(opts && opts.area ? 'textarea' : 'input', 'osa-in ' + cls); e.value = val; if (aria) e.setAttribute('aria-label', aria); if (opts) { if (opts.type) e.type = opts.type; if (opts.ph) e.placeholder = opts.ph; if (opts.mode) e.inputMode = opts.mode; if (opts.id) e.id = opts.id; } e.autocomplete = 'off'; return e; }
  function head(side, ini, b, small, extra) { var d = el('div', 'is-' + side), w = el('div', 'osa-who'), i = el('span', 'osa-ini', ini); i.setAttribute('aria-hidden', 'true'); var sp = el('span'); var bb = el('b', null, b); bb.title = b; sp.appendChild(bb); if (small) sp.appendChild(el('small', null, small)); w.appendChild(i); w.appendChild(sp); d.appendChild(w); if (extra) d.appendChild(extra); return d; }
  function heads(a, b) { var h = el('div', 'osa-heads'); h.appendChild(a); h.appendChild(el('div', 'gap')); h.appendChild(b || el('div', 'is-ans')); return h; }
  var rowN = 0;
  function term(state, label, askNode, seam, ansNode, srText) {
    var r = el('div', 'osa-term is-' + state), id = 'k' + (++rowN), k = el('span', 'k', label); k.id = id; r.setAttribute('role', 'group'); r.setAttribute('aria-labelledby', id);
    var a = el('div', 'ask'); a.appendChild(askNode); var s = el('span', 'seam', seam); s.setAttribute('aria-hidden', 'true'); var n = el('div', 'ans'); n.appendChild(ansNode);
    if (srText) n.appendChild(el('span', 'osa-vh', srText));
    if (state === 'changed') { a.setAttribute('data-lbl', C.askedLabel); n.setAttribute('data-lbl', C.changedLabel); }
    r.appendChild(k); r.appendChild(a); r.appendChild(s); r.appendChild(n); return r;
  }
  function foot(askSide, ansSide) { var f = el('div', 'osa-foot'), a = el('div', 'is-ask'), b = el('div', 'is-ans'); (askSide || []).forEach(function (x) { a.appendChild(x); }); (ansSide || []).forEach(function (x) { b.appendChild(x); }); f.appendChild(a); f.appendChild(el('div', 'gap')); f.appendChild(b); return f; }
  function btn(label, cls, fn, id) { var b = el('button', 'osa-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; if (id) b.id = id; b.addEventListener('click', fn); return b; }
  function btns(list) { var d = el('div', 'osa-btns'); list.forEach(function (b) { d.appendChild(b); }); return d; }
  function txt(t, cls) { return el('span', cls || null, t); }
  function errBox(id) { var e = el('span', 'osa-err'); e.id = id; e.setAttribute('aria-live', 'polite'); return e; }
  function setText(t) { lastText = t || ''; $('text').textContent = lastText; $('text').setAttribute('aria-label', C.copyAsText); }
  // D4: sender-typed values are shown as label + separate value, never voiced inside product copy.
  function typed(tpl, key, value) { var f = document.createDocumentFragment(), parts = String(tpl).split('{' + key + '}'); f.appendChild(document.createTextNode(parts[0])); f.appendChild(V.typed(value, 'osa-typed')); if (parts[1]) f.appendChild(document.createTextNode(parts[1])); return f; }
  function quoted(value) { var w = el('span', 'osa-quoted'); w.appendChild(el('span', 'osa-qlabel', C.receiverAskLabel)); w.appendChild(document.createTextNode(' ')); w.appendChild(el('span', 'osa-qtext', M.fill(C.quoteWrap, { text: value }))); return w; }
  function page(title, lede) { var tt = $('title'); tt.textContent = ''; if (typeof title === 'string') tt.textContent = title; else tt.appendChild(title); $('lede').textContent = lede || ''; $('lede').hidden = !lede; $('delta').hidden = true; $('delta').textContent = ''; $('delta').removeAttribute('aria-label'); $('link').value = ''; setText(''); $('note').hidden = true; $('linkbox').hidden = true; $('x').textContent = ''; $('x').setAttribute('aria-label', C.exchangeAria); rowN = 0; }
  function noteLine(t) { $('note').textContent = t; $('note').hidden = !t; }
  // ---------- copy / share ----------
  function selectText(node) { node.focus(); if (node.select) node.select(); else { var r = document.createRange(); r.selectNodeContents(node); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  function copy(text, node) { function fail() { toast(C.copyFail); selectText(node); } if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(C.copied); }, fail); else fail(); }
  function showLink(frag) { var url = location.origin + location.pathname + '#' + frag; $('link').value = url; $('linkbox').hidden = false; return url; }
  function linkOrText(frag) { if (frag === '') { toast(C.tooLongLink); selectText($('text')); return null; } return frag ? showLink(frag) : null; }
  function share(frag, title, text, cancelMsg) {
    var url = linkOrText(frag); if (!url) return;
    if (navigator.share) navigator.share({ title: title, text: text, url: url }).catch(function (e) { toast(e && e.name === 'AbortError' ? cancelMsg : C.copyFail); selectText($('link')); });
    else copy(url, $('link'));
  }
  // ---------- compose ----------
  function composeErrors(d) {
    var e = {}, t = draftTerms(d), x;
    if ((x = M.len(A.stripW(d.w)) - A.CAP.w) > 0) e.w = M.plural(C.actionTooLong, x); else if (!A.stripW(d.w)) e.w = C.actionEmpty;
    if (!(t.e >= 1 && t.e <= A.EMAX[t.u])) e.e = String(d.e).trim() && /^\d+$/.test(String(d.e).trim()) && +d.e > 0 ? M.fill(C.errorRange, { max: A.EMAX[t.u] }) : C.effortInvalid;
    if (!M.strip(d.d) || !d.s || !d.t || M.len(M.strip(d.d)) > A.CAP.d) e.win = C.windowMissing; else if (d.t <= d.s) e.win = C.windowOrder;
    if ((x = M.len(M.strip(d.h)) - A.CAP.h) > 0) e.h = M.plural(C.whereTooLong, x);
    if ((x = M.len(M.strip(d.f)) - A.CAP.name) > 0) e.f = M.plural(C.nameTooLong, x); else if (!M.strip(d.f)) e.f = C.nameEmpty;
    if ((x = M.len(M.strip(d.o)) - A.CAP.name) > 0) e.o = M.plural(C.nameTooLong, x); else if (!M.strip(d.o)) e.o = C.nameEmpty;
    return e;
  }
  function compose() {
    mode = 'compose'; page(C.title, C.invitation); var d = draft, x = $('x');
    x.appendChild(el('span', 'osa-seamline')).setAttribute('aria-hidden', 'true');
    x.appendChild(heads(head('ask', initial(d.f), M.strip(d.f) || C.fromLabel, C.previewHeading), head('ans', initial(d.o), M.strip(d.o) || C.toLabel, C.ghostAnswer)));
    function bind(e, k) { e.addEventListener('input', function () { draft[k] = e.value; touched[k] = 1; edited(); }); e.addEventListener('blur', function () { touched[k] = 1; V.afterPointer(validate); }); return e; }
    function wrap(nodes) { var w = el('div'); nodes.forEach(function (n) { w.appendChild(n); }); return w; }
    var ghost = el('span', 'ghost', C.ghostAnswer), none = function () { return el('span', 'none', '—'); };
    var w = bind(input('is-ask', d.w, C.actionLabel, { area: true, ph: C.actionPlaceholder, id: 'f-w' }), 'w');
    x.appendChild(term('open', C.actionLabel, wrap([w, el('span', 'osa-hint', C.actionHint), errBox('e-w')]), '·', ghost));
    var eff = bind(input('is-ask', d.e, C.effortLabel, { mode: 'numeric', ph: C.effortPlaceholder, id: 'f-e' }), 'e');
    var unit = el('select', 'osa-in is-ask'); unit.id = 'f-u'; unit.setAttribute('aria-label', C.effortUnitLabel); ['min', 'hr'].forEach(function (u) { var o = el('option', null, C.effortUnits[u]); o.value = u; unit.appendChild(o); }); unit.value = d.u; unit.addEventListener('change', function () { draft.u = unit.value; edited(); });
    var er = el('div', 'osa-effort'); er.appendChild(eff); er.appendChild(unit);
    x.appendChild(term('open', C.effortLabel, wrap([er, el('span', 'osa-hint', C.effortHint), errBox('e-e')]), '·', none()));
    var day = bind(input('is-ask', d.d, C.windowDayLabel, { ph: C.windowDayPlaceholder, id: 'f-d' }), 'd');
    var s = bind(input('is-ask', d.s, C.windowStartLabel, { type: 'time', id: 'f-s' }), 's'), t = bind(input('is-ask', d.t, C.windowEndLabel, { type: 'time', id: 'f-t' }), 't');
    var win = el('div', 'osa-win'); [[C.windowStartLabel, s], [C.windowEndLabel, t]].forEach(function (p) { var l = el('label'); l.appendChild(el('span', null, p[0])); l.appendChild(p[1]); win.appendChild(l); });
    x.appendChild(term('open', C.windowLabel, wrap([day, win, el('span', 'osa-hint', C.asTypedHint), errBox('e-win')]), '·', none()));
    var h = bind(input('is-ask', d.h, C.whereLabel, { ph: C.wherePlaceholder, id: 'f-h' }), 'h');
    h.setAttribute('aria-describedby', 'h-h'); var wh = el('span', 'osa-hint', C.whereHint); wh.id = 'h-h'; x.appendChild(term('open', C.whereLabel, wrap([h, wh, errBox('e-h')]), '·', none()));
    var f = bind(input('is-ask', d.f, C.fromLabel, { ph: C.fromPlaceholder, id: 'f-f' }), 'f'), o = bind(input('is-ask', d.o, C.toLabel, { ph: C.toPlaceholder, id: 'f-o' }), 'o');
    x.appendChild(term('open', C.fromLabel, wrap([f, errBox('e-f')]), '·', none()));
    x.appendChild(term('open', C.toLabel, wrap([o, errBox('e-o')]), '·', none()));
    x.appendChild(foot([btns([btn(C.copyAskLink, 'osa-btn--ask', function () { var fr = makeAsk(); if (fr != null) { var u = linkOrText(fr); if (u) copy(u, $('link')); } }, 'b-link'), btn(C.share, '', function () { var fr = makeAsk(); if (fr != null) share(fr, C.title, C.shareText, C.shareCancel); }, 'b-share'), btn(C.copyAsText, '', function () { copy(lastText, $('text')); }, 'b-text'), btn(C.reset, '', reset, 'b-reset')]), el('p', 'osa-fine', C.privacy), el('p', 'osa-fine', C.knownPersonNote + ' ' + C.emergencyNote)], []));
    validate();
  }
  function makeAsk() { touched = { w: 1, e: 1, d: 1, s: 1, t: 1, h: 1, f: 1, o: 1 }; validate(); var e = composeErrors(draft); if (Object.keys(e).length) { var first = { w: 'f-w', e: 'f-e', win: 'f-d', h: 'f-h', f: 'f-f', o: 'f-o' }[Object.keys(e)[0]]; $(first).focus(); return null; } return A.encodeAsk(draftAsk(draft)); }
  function validate() {
    if (mode !== 'compose') return; var e = composeErrors(draft), map = { w: ['w'], e: ['e'], win: ['d', 's', 't'], h: ['h'], f: ['f'], o: ['o'] };
    Object.keys(map).forEach(function (k) { var show = map[k].some(function (f) { return touched[f]; }); $('e-' + k).textContent = show && e[k] ? e[k] : ''; });
    var ok = !Object.keys(e).length; setText('');
    if (ok) { var c = A.cleanTerms(draftAsk(draft)); c.f = M.strip(draft.f); c.o = M.strip(draft.o); setText(A.textAsk(C, c)); }
    $('b-text').disabled = !ok;
    var hd = $('x').querySelectorAll('.osa-heads b'); if (hd[0]) { hd[0].textContent = M.strip(draft.f) || C.fromLabel; hd[1].textContent = M.strip(draft.o) || C.toLabel; var ini = $('x').querySelectorAll('.osa-heads .osa-ini'); ini[0].textContent = initial(draft.f); ini[1].textContent = initial(draft.o); }
  }
  function edited() { if (location.hash) history.replaceState(null, '', location.pathname + location.search); $('linkbox').hidden = true; $('banner').hidden = true; validate(); }
  // ---------- answer (#a1) ----------
  function answer() {
    mode = 'answer'; page(ask.f ? typed(C.receiverIntro, 'from', ask.f) : C.receiverIntroAnon, C.receiverTypedNote); drawAnswer();
  }
  function offerTerms() { return { w: offer.w, e: /^\d{1,4}$/.test(String(offer.e).trim()) ? +String(offer.e).trim() : NaN, u: offer.u, d: offer.d, s: offer.s, t: offer.t, h: offer.h }; }
  function partState() { var t = offerTerms(), err = A.termsError(t); return { err: err, diff: err ? null : A.diff(ask, t), t: t }; }
  function drawAnswer(focusId) {
    var x = $('x'), v = A.termValues(C, ask); x.textContent = ''; rowN = 0;
    x.appendChild(el('span', 'osa-seamline')).setAttribute('aria-hidden', 'true');
    var ch = el('div', 'osa-choices'); ch.setAttribute('role', 'radiogroup'); ch.setAttribute('aria-label', C.replyHeading);
    [['y', C.replyYes, C.replyYesSub], ['p', C.replyPart, C.replyPartSub], ['n', C.replyNo, C.replyNoSub]].forEach(function (c, i, all) {
      var b = el('button', 'osa-choice'); b.type = 'button'; b.setAttribute('role', 'radio'); b.id = 'c-' + c[0]; var on = choice === c[0];
      b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on || (!choice && i === 0) ? 0 : -1;
      b.appendChild(el('span', 'dot')); var sp = el('span', null, c[1]); sp.appendChild(el('small', null, c[2])); b.appendChild(sp);
      b.addEventListener('click', function () { pick(c[0]); });
      b.addEventListener('keydown', function (e) { var k = e.key, j = i; if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % 3; else if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i + 2) % 3; else return; e.preventDefault(); pick(all[j][0]); });
      ch.appendChild(b);
    });
    x.appendChild(heads(head('ask', initial(ask.f), ask.f ? V.quote(ask.f) : C.receiverIntroAnon.replace(/:$/, ''), C.previewHeading), head('ans', initial(ask.o), C.replyHeading, ask.o ? V.quote(ask.o) : '', ch)));
    var ps = choice === 'p' ? partState() : null;
    function roRow(key, label, value) {
      var q = (key === 'action' || key === 'where') && value !== '—', av = function () { return q ? quoted(value) : txt(value); };
      if (choice === 'y') return term('same', label, av(), '=', txt(M.fill(C.sameLine, { value: q ? M.fill(C.quoteWrap, { text: value }) : value })), C.unchangedLabel);
      if (choice === 'n') return term('same', label, av(), '·', el('span', 'none', key === 'action' ? C.replyNo : '—'));
      if (choice !== 'p') return term('open', label, av(), '·', el('span', 'none', '—'));
      var row = term('same', label, av(), '=', partInput(key, label), C.unchangedLabel); row.setAttribute('data-key', key); row.setAttribute('data-val', value); return row;
    }
    x.appendChild(roRow('action', C.actionLabel, v.action));
    x.appendChild(roRow('effort', C.effortLabel, v.effort));
    x.appendChild(roRow('window', C.windowLabel, v.window));
    if (ask.h || (choice === 'p' && offer.h)) x.appendChild(roRow('where', C.whereLabel, ask.h || '—'));
    var side = [];
    if (choice === 'p') side.push(el('p', 'osa-hint', C.partHint));
    if (choice === 'y' || choice === 'p') { var nl = el('label', 'osa-lab', C.noteLabel), na = input('osa-note-in', note, null, { area: true, ph: C.notePlaceholder, id: 'f-note' }); nl.htmlFor = 'f-note'; na.addEventListener('input', function () { note = na.value; refreshReply(); }); side.push(nl, na, errBox('e-note')); }
    if (choice === 'n') side.push(el('p', 'osa-fine', C.noConfirm));
    if (choice === 'p') side.push(errBox('e-part'));
    if (choice) side.push(btns([btn(C.copyReplyLink, 'osa-btn--ans', function () { var fr = makeReply(); if (fr != null) { var u = linkOrText(fr); if (u) copy(u, $('link')); } }, 'b-rlink'), btn(C.replyShare, '', function () { var fr = makeReply(); if (fr != null) share(fr, C.title, C.replyShareText, C.replyShareCancel); }, 'b-rshare'), btn(C.copyAsText, '', function () { copy(lastText, $('text')); }, 'b-rtext'), btn(C.reset, '', replyReset, 'b-rreset')]), el('p', 'osa-fine', C.replyPrivacy), el('p', 'osa-fine', C.replySendYourself), el('p', 'osa-fine', C.replySnapshot));
    x.appendChild(foot([el('p', 'osa-fine', C.knownPersonNote)], side));
    refreshReply(); markRows();
    if (focusId && $(focusId)) { var f = $(focusId); f.focus(); if (f.setSelectionRange && typeof f.value === 'string' && f.type !== 'time') try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) {} }
  }
  function partInput(key, label) {
    var w = el('div');
    function bind(e, k) { e.addEventListener('input', function () { offer[k] = e.value; refreshReply(); markRows(); }); return e; }
    if (key === 'action') w.appendChild(bind(input('is-ans', offer.w, C.partActionLabel, { area: true, id: 'o-w' }), 'w'));
    if (key === 'effort') { var r = el('div', 'osa-effort'), n = bind(input('is-ans', offer.e, C.partEffortLabel, { mode: 'numeric', id: 'o-e' }), 'e'), u = el('select', 'osa-in is-ans'); u.id = 'o-u'; u.setAttribute('aria-label', C.effortUnitLabel); ['min', 'hr'].forEach(function (k) { var o = el('option', null, C.effortUnits[k]); o.value = k; u.appendChild(o); }); u.value = offer.u; u.addEventListener('change', function () { offer.u = u.value; refreshReply(); markRows(); }); r.appendChild(n); r.appendChild(u); w.appendChild(r); }
    if (key === 'window') { w.appendChild(bind(input('is-ans', offer.d, C.windowDayLabel, { id: 'o-d' }), 'd')); var g = el('div', 'osa-win'); [['s', C.windowStartLabel], ['t', C.windowEndLabel]].forEach(function (p) { var l = el('label'); l.appendChild(el('span', null, p[1])); l.appendChild(bind(input('is-ans', offer[p[0]], p[1], { type: 'time', id: 'o-' + p[0] }), p[0])); g.appendChild(l); }); w.appendChild(g); }
    if (key === 'where') w.appendChild(bind(input('is-ans', offer.h, C.whereLabel, { id: 'o-h' }), 'h'));
    return w;
  }
  // Part mode: mark each row changed/same in place (no re-render, so typing and time pickers keep focus).
  function markRows() {
    if (choice !== 'p') return; var ps = partState();
    document.querySelectorAll('.osa-term[data-key]').forEach(function (r) {
      var k = r.getAttribute('data-key'), ch = ps.diff ? !!ps.diff[k] : r.classList.contains('is-changed'), a = r.querySelector('.ask'), n = r.querySelector('.ans'), v = r.getAttribute('data-val');
      r.className = 'osa-term is-' + (ch ? 'changed' : 'same'); r.querySelector('.seam').textContent = ch ? '→' : '=';
      a.textContent = ''; a.appendChild(ch ? el('s', null, v) : txt(v));
      if (ch) { a.setAttribute('data-lbl', C.askedLabel); n.setAttribute('data-lbl', C.changedLabel); } else { a.removeAttribute('data-lbl'); n.removeAttribute('data-lbl'); }
      var sr = n.querySelector('.osa-vh'); if (sr) sr.textContent = ch ? C.changedLabel : C.unchangedLabel;
    });
  }
  function currentReply() {
    if (!choice) return null;
    if (choice === 'p') { var ps = partState(); if (ps.err) return { err: ps.err }; if (!A.anyChanged(ps.diff)) return { err: 'partNothingChanged', yes: true }; return { r: { a: ask, v: 'p', p: ps.t, n: note } }; }
    return { r: { a: ask, v: choice, p: null, n: choice === 'n' ? '' : note } };
  }
  function refreshReply() {
    var c = currentReply(), x;
    if ($('e-note')) $('e-note').textContent = (x = M.len(M.strip(note)) - A.CAP.note) > 0 ? M.plural(C.noteTooLong, x) : '';
    if ($('e-part')) $('e-part').textContent = c && c.err ? (c.err === 'partNothingChanged' ? C.partNothingChanged : C[c.err] || C.windowMissing) : '';
    if ($('b-rlink')) $('b-rlink').textContent = c && c.yes ? C.partIsYes : C.copyReplyLink;
    var ok = c && c.r && !A.replyError(c.r) && M.len(M.strip(note)) <= A.CAP.note;
    if (ok) { var cl = A.decode(A.encodeReply(c.r) || ''); setText(A.textReply(C, cl.ok ? cl.data : { a: ask, v: c.r.v, p: c.r.p ? A.cleanTerms(c.r.p) : null, n: M.strip(c.r.n) })); } else setText('');
    if ($('b-rtext')) $('b-rtext').disabled = !ok; if ($('b-rshare')) $('b-rshare').disabled = !ok && !(c && c.yes);
    $('linkbox').hidden = true;
  }
  function makeReply() { var c = currentReply(); if (c && c.yes) { pick('y'); return null; } if (!c || !c.r) return null; return A.encodeReply(c.r); }
  // Recipient Start over: clears only this visitor's unsent reply (choice, offer, note, link box); the ask and its link stay.
  function replyReset() { if (!confirm(C.replyResetConfirm)) return; choice = null; offer = null; note = ''; $('link').value = ''; $('linkbox').hidden = true; drawAnswer('c-y'); toast(C.resetDone); }
  function pick(v) { choice = v; if (v === 'p' && !offer) offer = { w: ask.w, e: String(ask.e), u: ask.u, d: ask.d, s: ask.s, t: ask.t, h: ask.h }; drawAnswer('c-' + v); }
  // ---------- read reply (#r1) ----------
  function readReply() {
    mode = 'reply'; var r = reply, a = A.termValues(C, r.a), p = r.p ? A.termValues(C, r.p) : null, d = r.p ? A.diff(r.a, r.p) : null;
    var intro = { y: r.a.o ? typed(C.replyIntroYes, 'to', r.a.o) : C.replyIntroYesAnon, p: r.a.o ? typed(C.replyIntroPart, 'to', r.a.o) : C.replyIntroPartAnon, n: r.a.o ? typed(C.replyIntroNo, 'to', r.a.o) : C.replyIntroNoAnon }[r.v];
    page(intro, '');
    if (r.v === 'p') { var dl = $('delta'), was = [], now = []; A.TERMS.forEach(function (t) { if (d[t[0]]) { was.push(a[t[0]] || '—'); now.push(p[t[0]] || '—'); } }); dl.textContent = ''; dl.appendChild(el('span', 'a', was.join(' · '))); var to = el('span', 'to', '→'); to.setAttribute('aria-hidden', 'true'); dl.appendChild(to); dl.appendChild(el('span', 'b', now.join(' · '))); dl.setAttribute('aria-label', C.deltaAria); dl.hidden = false; }
    var x = $('x'); x.appendChild(el('span', 'osa-seamline')).setAttribute('aria-hidden', 'true');
    var vp = el('span', 'osa-verdict is-' + { y: 'yes', p: 'part', n: 'no' }[r.v], { y: C.replyYes, p: C.replyPart, n: C.replyNo }[r.v]);
    x.appendChild(heads(head('ask', initial(r.a.f), C.originalLabel, r.a.f ? V.quote(r.a.f) : ''), head('ans', initial(r.a.o), C.offerLabel, r.a.o ? V.quote(r.a.o) : '', vp)));
    A.TERMS.forEach(function (t, i) {
      var k = t[0], label = [C.actionLabel, C.effortLabel, C.windowLabel, C.whereLabel][i];
      if (k === 'where' && !r.a.h && !(r.p && r.p.h)) return;
      var q = (k === 'action' || k === 'where') && a[k], orig = function () { return q ? quoted(a[k]) : txt(a[k] || '—'); };
      if (r.v === 'n') { x.appendChild(term('same', label, orig(), '·', el('span', 'none', k === 'action' ? C.replyNo : '—'))); return; }
      if (r.v === 'y' || !d[k]) { x.appendChild(term('same', label, orig(), '=', txt(M.fill(C.sameLine, { value: q ? M.fill(C.quoteWrap, { text: a[k] }) : (a[k] || '—') })), C.unchangedLabel)); return; }
      var sw = el('s'); if (q) sw.appendChild(quoted(a[k])); else sw.textContent = a[k] || '—'; x.appendChild(term('changed', label, sw, '→', txt(p[k] || '—'), M.fill(C.diffAria, { term: C[t[1]], was: a[k] || '—', now: p[k] || '—' })));
    });
    if (r.n) x.appendChild(term('same', C.noteLabel, el('span', 'none', '—'), '·', txt(r.n)));
    x.appendChild(foot([btns([btn(C.askAgainChanged, 'osa-btn--ask', function () { var src = r.p || r.a; draft = { w: src.w, e: String(src.e), u: src.u, d: src.d, s: src.s, t: src.t, h: src.h, f: r.a.f, o: r.a.o }; leave(); }, 'b-again'), btn(C.askSomeoneElse, '', function () { draft = { w: r.a.w, e: String(r.a.e), u: r.a.u, d: r.a.d, s: r.a.s, t: r.a.t, h: r.a.h, f: r.a.f, o: '' }; leave(); }, 'b-else'), btn(C.copyAsText, '', function () { copy(lastText, $('text')); }, 'b-text'), btn(C.printLabel, '', function () { window.print(); }, 'b-print')])], []));
    noteLine([C.replyReceivedNote, C.noBookingNote, r.v === 'n' ? C.noReasonReceived : ''].filter(Boolean).join(' '));
    setText(A.textReply(C, r));
  }
  function leave() { history.replaceState(null, '', location.pathname + location.search); touched = {}; $('banner').hidden = true; compose(); $('f-w').focus(); }
  function reset() { if (!confirm(C.resetConfirm)) return; history.replaceState(null, '', location.pathname + location.search); $('link').value = ''; $('linkbox').hidden = true; draft = blankDraft(); touched = {}; $('banner').hidden = true; compose(); toast(C.resetDone); $('f-w').focus(); }
  // Shared MILLVIEW.route: every load and every hashchange (valid, bad, old or empty) rebuilds the tab from the fragment alone.
  function route(h) {
    choice = null; offer = null; note = ''; touched = {}; ask = null; reply = null; $('banner').hidden = true; V.clearErrors(document, '.osa-err'); $('link').value = ''; $('linkbox').hidden = true;
    if (!h) { draft = blankDraft(); return compose(); }
    var d = A.decode(h);
    if (d.ok && d.kind === 'ask') { ask = d.data; return answer(); }
    if (d.ok && d.kind === 'reply') { reply = d.data; return readReply(); }
    draft = blankDraft(); compose(); $('banner').textContent = d.why === 'oldVersion' ? C.oldVersion : C.badLink; $('banner').hidden = false;
  }
  $('home').textContent = C.studioLabel; $('home').setAttribute('aria-label', C.backLabel); $('linklab').textContent = C.linkLabel; document.title = C.studioLabel;
  window.MILLVIEW.route(route);
})();
