'use strict';
// Before You Go: pure model. One pickup; every fact is typed by the visitor and starts unconfirmed.
// Status per fact: 'unknown' (nothing typed) -> 'said' (typed, not confirmed) -> 'confirmed' (ONLY after an answer is typed and
// the visitor marks it confirmed). Questions come ONLY from the fixed generic templates in COPY.questions /
// COPY.optionalQuestions plus the visitor's own typed questions. The model never adds hours, ID, eligibility, availability or
// any other fact about any place. Link "#b1.<b64url JSON>.<ck>" <= 2000 chars; a snapshot.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.BYG = factory(root.MILL);
})(this, function (M) {
  var CORE = ['place', 'window', 'contact', 'instructions', 'bring'], ESSENTIAL = ['place', 'window', 'bring'], OPTIONAL = ['id', 'appt', 'park', 'access'];
  var ALL = CORE.concat(OPTIONAL), CAP = { pickup: 60, by: 24, v: 120, a: 120, own: 80, ownMax: 5 }, FRAG_MAX = 2000;
  function blank() { var f = {}; ALL.forEach(function (k) { f[k] = { v: '', a: '', c: false }; }); return { k: '', by: '', f: f, o: [] }; }
  function status(st, key) { var x = st.f[key]; if (x.c && M.strip(x.a)) return 'confirmed'; if (M.strip(x.v)) return 'said'; return OPTIONAL.indexOf(key) >= 0 ? 'optional' : 'unknown'; }
  function shown(st, key) { var x = st.f[key]; return status(st, key) === 'confirmed' ? M.strip(x.a) : M.strip(x.v); }
  // Facts with nothing typed and not confirmed (core fields only).
  function missing(st) { return CORE.filter(function (k) { return status(st, k) === 'unknown'; }); }
  function openEssentials(st) { return ESSENTIAL.filter(function (k) { return status(st, k) !== 'confirmed'; }); }
  function ready(st) { return openEssentials(st).length === 0; }
  // Call-ahead questions: every core fact not yet confirmed (missing ones first, then "you said" ones), then own questions.
  function questions(st, C) {
    var q = [], miss = missing(st);
    miss.forEach(function (k) { q.push({ key: k, text: C.questions[k], kind: 'missing' }); });
    CORE.forEach(function (k) { if (status(st, k) === 'said') q.push({ key: k, text: C.questions[k], kind: 'said' }); });
    st.o.forEach(function (t, i) { if (M.strip(t)) q.push({ key: 'own' + i, text: M.strip(t), kind: 'own' }); });
    return q;
  }
  function optionalQuestions(st, C) { return OPTIONAL.filter(function (k) { return status(st, k) !== 'confirmed'; }).map(function (k) { return { key: k, text: C.optionalQuestions[k], kind: 'optional' }; }); }
  // A tel:/sms: target only if the visitor typed a number (>= 7 digits). Returns the number exactly as typed, or null.
  function phone(text) { var m = /(?:\+|\()?\d[\d ().-]{5,}\d/.exec(String(text || '')); if (!m) return null; var digits = m[0].replace(/\D/g, ''); return digits.length >= 7 && digits.length <= 15 ? m[0].trim() : null; }
  function telHref(num) { return 'tel:' + num.replace(/[^\d+]/g, ''); }
  function smsHref(num) { return 'sms:' + num.replace(/[^\d+]/g, ''); }
  // Validation: returns list of {key, over} for over-cap fields.
  function overCaps(st) {
    var out = [], x; if ((x = M.len(M.strip(st.k)) - CAP.pickup) > 0) out.push({ key: 'pickup', over: x }); if ((x = M.len(M.strip(st.by)) - CAP.by) > 0) out.push({ key: 'by', over: x });
    ALL.forEach(function (k) { if ((x = M.len(M.strip(st.f[k].v)) - CAP.v) > 0) out.push({ key: k, over: x }); if ((x = M.len(M.strip(st.f[k].a)) - CAP.a) > 0) out.push({ key: k + '.a', over: x }); });
    st.o.forEach(function (t, i) { if ((x = M.len(M.strip(t)) - CAP.own) > 0) out.push({ key: 'own' + i, over: x }); });
    return out;
  }
  function encode(st) {
    if (overCaps(st).length || st.o.length > CAP.ownMax) return null;
    var f = {}; ALL.forEach(function (k) { var x = st.f[k], v = M.strip(x.v), a = M.strip(x.a), c = !!(x.c && a); if (v || a || c) f[k] = [v, a, c ? 1 : 0]; });
    var fr = M.pack('b', 1, { k: M.strip(st.k), y: M.strip(st.by), f: f, o: st.o.map(M.strip).filter(Boolean) });
    return fr.length <= FRAG_MAX ? fr : '';
  }
  function decode(frag) {
    var u = M.unpack(frag, 'b', 1, FRAG_MAX); if (!u.ok) return u; var d = u.data, bad = { ok: false, why: 'bad' };
    if (Array.isArray(d) || Object.keys(d).sort().join() !== 'f,k,o,y' || typeof d.k !== 'string' || typeof d.y !== 'string' || !d.f || typeof d.f !== 'object' || Array.isArray(d.f) || !Array.isArray(d.o)) return bad;
    if (d.o.length > CAP.ownMax || d.o.some(function (t) { return typeof t !== 'string' || !M.strip(t); })) return bad;
    var st = blank(); st.k = M.strip(d.k); st.by = M.strip(d.y); st.o = d.o.map(M.strip);
    for (var k in d.f) {
      if (ALL.indexOf(k) < 0) return bad; var x = d.f[k];
      if (!Array.isArray(x) || x.length !== 3 || typeof x[0] !== 'string' || typeof x[1] !== 'string' || (x[2] !== 0 && x[2] !== 1)) return bad;
      if (x[2] === 1 && !M.strip(x[1])) return bad;          // confirmed without an answer: refused
      if (!M.strip(x[0]) && !M.strip(x[1])) return bad;
      st.f[k] = { v: M.strip(x[0]), a: M.strip(x[1]), c: x[2] === 1 };
    }
    if (overCaps(st).length) return bad;
    return { ok: true, data: st };
  }
  // Plain-text export (copy and print). Reads complete without the page.
  function text(st, C) {
    var L = [M.fill(C.printHeading, { pickup: M.strip(st.k) || '—' }), ''], open = openEssentials(st);
    L.push(open.length ? M.plural(C.notSetHeading, open.length) + ' ' + M.fill(C.openList, { fields: open.map(function (k) { return C.fields[k]; }).join(', ') }) : C.allConfirmedHeading + (st.by ? ' ' + M.fill(C.confirmedBy, { name: st.by }) : ''), '');
    L.push(C.checklistHeading);
    CORE.forEach(function (k) { var s = status(st, k), mark = { unknown: C.printUnknownMarker, said: C.printSaidMarker, confirmed: C.printConfirmedMarker }[s]; L.push('[' + (s === 'confirmed' ? 'x' : ' ') + '] ' + M.fill(C.checkItem, { field: C.fields[k], value: shown(st, k) || '—' }) + ' (' + mark + ')'); });
    OPTIONAL.forEach(function (k) { var s = status(st, k); if (s === 'optional') return; L.push('[' + (s === 'confirmed' ? 'x' : ' ') + '] ' + M.fill(C.checkItem, { field: C.optionalFields[k], value: shown(st, k) }) + ' (' + (s === 'confirmed' ? C.printConfirmedMarker : C.printSaidMarker) + ')'); });
    var q = questions(st, C); if (q.length) { L.push('', C.questionsHeading); q.forEach(function (x, i) { L.push((i + 1) + '. ' + x.text + '  ' + C.printAnswerLine + ' ____'); }); }
    if (status(st, 'contact') === 'unknown') L.push('', C.contactMissing);
    L.push('', C.printFooter);
    return L.join('\n');
  }
  return { CORE: CORE, ESSENTIAL: ESSENTIAL, OPTIONAL: OPTIONAL, ALL: ALL, CAP: CAP, FRAG_MAX: FRAG_MAX, blank: blank, status: status, shown: shown, missing: missing, openEssentials: openEssentials, ready: ready, questions: questions, optionalQuestions: optionalQuestions, phone: phone, telHref: telHref, smsHref: smsHref, overCaps: overCaps, encode: encode, decode: decode, text: text };
});
