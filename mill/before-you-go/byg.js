'use strict';
// Before You Go: pure model. One pickup; every fact is typed by a visitor.
// States per fact: 'unknown' (nothing typed), 'said' (typed, not confirmed), 'notsure' (explicitly marked not sure), 'confirmed'
// (ONLY after an answer is typed and marked confirmed). Only 'confirmed' counts; optional facts left blank are 'optional'.
// Attribution is per fact: who typed the value (vby) and who confirmed it (cby): 'you' (this visitor, this session),
// 'sender' (whoever made the link that was opened) or 'earlier' (carried in that link from someone before them).
// When is a specific date (YYYY-MM-DD) with an optional time (HH:MM). Questions come ONLY from COPY templates + own questions.
// Link "#b2.<b64url JSON>.<ck>": one value per fact (the answer if confirmed, else the typed value) + state + origin.
// Limits are in "spaces" = UTF-8 bytes (+1 for " and \, which JSON escapes), so the worst-case full URL stays <= 2000.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.BYG = factory(root.MILL);
})(this, function (M) {
  var CORE = ['place', 'window', 'contact', 'instructions', 'bring'], ESSENTIAL = CORE.slice(), OPTIONAL = ['id', 'appt', 'park', 'access'];
  var ALL = CORE.concat(OPTIONAL), VER = 2, FRAG_MAX = 2000, URL_MAX = 2000, ORIGIN_BUDGET = 100;
  var CAP = { pickup: 60, by: 24, place: 120, window: 16, contact: 120, instructions: 120, bring: 120, id: 80, appt: 80, park: 80, access: 80, own: 60, ownMax: 5 };
  var DATE = /^(\d{4})-(\d{2})-(\d{2})$/, TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
  function room(s) { s = String(s == null ? '' : s); var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; } else n += c < 0x80 ? (c === 34 || c === 92 ? 2 : 1) : c < 0x800 ? 2 : 3; } return n; }
  function blank() { var f = {}; ALL.forEach(function (k) { f[k] = { v: '', a: '', c: false, ns: false, vby: 'you', cby: 'you' }; }); return { k: '', by: '', f: f, o: [] }; }
  function validDate(s) { var m = DATE.exec(s); if (!m) return false; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && +m[1] >= 2000 && +m[1] <= 2100; }
  // When value: "" | "YYYY-MM-DD" | "YYYY-MM-DD HH:MM"
  function validWhen(s) { if (s === '') return true; var p = String(s).split(' '); return p.length <= 2 && validDate(p[0]) && (p.length === 1 || TIME.test(p[1])); }
  function clean(k, s) { return k === 'window' ? String(s == null ? '' : s).trim() : M.strip(s); }
  function status(st, key) { var x = st.f[key]; if (x.c && clean(key, x.a)) return 'confirmed'; if (x.ns) return 'notsure'; if (clean(key, x.v) || clean(key, x.a)) return 'said'; return OPTIONAL.indexOf(key) >= 0 ? 'optional' : 'unknown'; }
  function shown(st, key) { var x = st.f[key]; return status(st, key) === 'confirmed' ? clean(key, x.a) : (clean(key, x.v) || clean(key, x.a)); }
  function missing(st) { return CORE.filter(function (k) { return status(st, k) === 'unknown'; }); }
  function openEssentials(st) { return ESSENTIAL.filter(function (k) { return status(st, k) !== 'confirmed'; }); }
  function ready(st) { return openEssentials(st).length === 0; }
  function fmtDate(s) { var m = DATE.exec(s); if (!m) return s; return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))).replace(/,/g, ''); }
  function fmtTime(s) { var m = TIME.exec(s); if (!m) return s; var h = +m[1], ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return h + (m[2] === '00' ? '' : ':' + m[2]) + ' ' + ap; }
  function fmtWhen(s) { if (!s) return ''; var p = s.split(' '); return fmtDate(p[0]) + (p[1] ? ', ' + fmtTime(p[1]) : ''); }
  function display(st, key) { var v = shown(st, key); return key === 'window' ? fmtWhen(v) : v; }
  // today: "YYYY-MM-DD" in the visitor's own zone (passed in, so the model stays pure)
  function datePassed(st, today) { var v = shown(st, 'window'); return !!v && v.slice(0, 10) < today; }
  function questions(st, C) {
    var q = [], miss = missing(st);
    function text(k) { if (k === 'window') { var v = shown(st, 'window'); if (v && v.indexOf(' ') < 0 && C.questionWindowDay) return M.fill(C.questionWindowDay, { day: fmtDate(v) }); } return C.questions[k]; }
    miss.forEach(function (k) { q.push({ key: k, text: text(k), kind: 'missing' }); });
    CORE.forEach(function (k) { var s = status(st, k); if (s === 'said' || s === 'notsure') q.push({ key: k, text: text(k), kind: s }); });
    st.o.forEach(function (t, i) { if (M.strip(t)) q.push({ key: 'own' + i, text: M.strip(t), kind: 'own' }); });
    return q;
  }
  function optionalQuestions(st, C) { return OPTIONAL.filter(function (k) { return status(st, k) !== 'confirmed'; }).map(function (k) { return { key: k, text: C.optionalQuestions[k], kind: 'optional' }; }); }
  // N4 (QA local-652d0e0, Joshua): Call/Text only when the field is basically just a phone number: digits, spaces and + ( ) - .
  // with 7-15 digits and no letters. "Lee 555-0134", "Room 101-2020" and "Gate code 555-1234" give no button.
  function phone(text) {
    var num = M.strip(String(text || '')); if (!num || !/^[\d\s+().-]+$/.test(num)) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(num)) return null; if (num.indexOf('+') > 0) return null;
    var d = num.replace(/\D/g, ''); return d.length >= 7 && d.length <= 15 ? num : null;
  }
  function telHref(num) { return 'tel:' + num.replace(/[^\d+]/g, ''); }
  function smsHref(num) { return 'sms:' + num.replace(/[^\d+]/g, ''); }
  function capOf(key) { return CAP[key]; }
  // Over-limit fields: [{key, over}] (key 'pickup' | 'by' | fact | fact+'.a' | 'own'+i)
  function overCaps(st) {
    var out = [], x; if ((x = room(M.strip(st.k)) - CAP.pickup) > 0) out.push({ key: 'pickup', over: x }); if ((x = room(M.strip(st.by)) - CAP.by) > 0) out.push({ key: 'by', over: x });
    ALL.forEach(function (k) { if (k === 'window') return; if ((x = room(M.strip(st.f[k].v)) - CAP[k]) > 0) out.push({ key: k, over: x }); if ((x = room(M.strip(st.f[k].a)) - CAP[k]) > 0) out.push({ key: k + '.a', over: x }); });
    st.o.forEach(function (t, i) { if ((x = room(M.strip(t)) - CAP.own) > 0) out.push({ key: 'own' + i, over: x }); });
    return out;
  }
  function badWhen(st) { var x = st.f.window; return !validWhen(clean('window', x.v)) || !validWhen(clean('window', x.a)); }
  function encode(st) {
    if (overCaps(st).length || st.o.length > CAP.ownMax || badWhen(st)) return null;
    var F = ALL.map(function (k) { var s = status(st, k); if (s === 'unknown' || s === 'optional') return 0; var x = st.f[k];
      if (s === 'confirmed') return [clean(k, x.a), 2, x.cby === 'you' ? 0 : 1];
      return [clean(k, x.v) || clean(k, x.a), s === 'notsure' ? 3 : 1, (clean(k, x.v) ? x.vby : x.nsby || 'you') === 'you' ? 0 : 1]; });
    var fr = M.pack('b', VER, [M.strip(st.k), M.strip(st.by), F, st.o.map(M.strip).filter(Boolean)]);
    return fr.length <= FRAG_MAX ? fr : '';
  }
  function decode(frag) {
    var u = M.unpack(frag, 'b', VER, FRAG_MAX); if (!u.ok) return u; var d = u.data, bad = { ok: false, why: 'bad' };
    if (!Array.isArray(d) || d.length !== 4 || typeof d[0] !== 'string' || typeof d[1] !== 'string' || !Array.isArray(d[2]) || d[2].length !== ALL.length || !Array.isArray(d[3])) return bad;
    if (d[3].length > CAP.ownMax || d[3].some(function (t) { return typeof t !== 'string' || !M.strip(t); })) return bad;
    var st = blank(); st.k = M.strip(d[0]); st.by = M.strip(d[1]); st.o = d[3].map(M.strip);
    for (var i = 0; i < ALL.length; i++) {
      var k = ALL[i], x = d[2][i]; if (x === 0) continue;
      if (!Array.isArray(x) || x.length !== 3 || typeof x[0] !== 'string' || [1, 2, 3].indexOf(x[1]) < 0 || (x[2] !== 0 && x[2] !== 1)) return bad;
      var val = clean(k, x[0]); if (!val && x[1] !== 3) return bad; if (k === 'window' && !validWhen(val)) return bad;
      var who = x[2] === 0 ? 'sender' : 'earlier';
      st.f[k] = x[1] === 2 ? { v: '', a: val, c: true, ns: false, vby: who, cby: who } : { v: val, a: '', c: false, ns: x[1] === 3, nsby: who, vby: who, cby: 'you' };
    }
    if (overCaps(st).length) return bad;
    return { ok: true, data: st };
  }
  // Who a fact's status belongs to: 'you' or the sender ('sender' | 'earlier').
  function owner(st, k) { var s = status(st, k), x = st.f[k]; return s === 'confirmed' ? x.cby : s === 'notsure' ? (x.nsby || 'you') : (clean(k, x.v) ? x.vby : 'you'); }
  function mark(st, k, C) {
    var s = status(st, k), mine = owner(st, k) === 'you';
    if (s === 'confirmed') return mine ? C.printConfirmedMarker : C.printConfirmedBySender;
    if (s === 'notsure') return C.printNotSureMarker;
    return mine ? C.printSaidMarker : C.printSaidMarkerSender;
  }
  // Plain-text export (Writer QA-83 templates). Typed text quoted; product text not. Reads complete without the page.
  function text(st, C, print) {
    var pk = M.strip(st.k), L = [pk ? M.fill(print ? C.printHeading : C.textHeading, { pickup: pk }) : C.title], open = openEssentials(st);
    if (M.strip(st.by)) L.push(M.fill(C.textByLine, { name: M.quote(M.strip(st.by)) }));
    L.push('', open.length ? M.plural(C.notSetHeading, open.length) + '. ' + M.fill(C.openList, { fields: open.map(function (k) { return C.fields[k]; }).join(', ') }) : C.allConfirmedHeading, '');
    function fact(k, field) { var s = status(st, k), x = st.f[k];
      if (s === 'unknown') { L.push(M.fill(C.textFactUnknown, { field: field })); return; } if (s === 'optional') return;
      var v = s === 'confirmed' ? (clean(k, x.v) || clean(k, x.a)) : (clean(k, x.v) || clean(k, x.a)); var fv = k === 'window' ? fmtWhen(v) : v;
      if (!fv) { L.push(field + ': ' + mark(st, k, C)); return; }
      L.push(M.fill(C.textFactLine, { field: field, value: fv, status: mark(st, k, C) }));
      if (s === 'confirmed' && clean(k, x.v) && clean(k, x.a) !== clean(k, x.v)) L.push(M.fill(C.textAnswerLine, { answer: k === 'window' ? fmtWhen(clean(k, x.a)) : clean(k, x.a) })); }
    CORE.forEach(function (k) { fact(k, C.fields[k]); }); OPTIONAL.forEach(function (k) { fact(k, C.optionalFields[k]); });
    var q = questions(st, C); if (q.length) { L.push('', C.textQuestionsHeading); q.forEach(function (x) { L.push(x.kind === 'own' ? M.fill(C.textOwnQuestionLine, { question: x.text }) : M.fill(C.textQuestionLine, { question: x.text })); }); }
    L.push('', print ? C.printFooter : C.textFooter);
    return L.join('\n');
  }
  return { CORE: CORE, ESSENTIAL: ESSENTIAL, OPTIONAL: OPTIONAL, ALL: ALL, CAP: CAP, VER: VER, FRAG_MAX: FRAG_MAX, URL_MAX: URL_MAX, ORIGIN_BUDGET: ORIGIN_BUDGET, room: room, capOf: capOf, blank: blank, validWhen: validWhen, status: status, shown: shown, display: display, fmtWhen: fmtWhen, fmtDate: fmtDate, datePassed: datePassed, missing: missing, openEssentials: openEssentials, ready: ready, questions: questions, optionalQuestions: optionalQuestions, phone: phone, telHref: telHref, smsHref: smsHref, overCaps: overCaps, encode: encode, decode: decode, text: text, mark: mark, owner: owner };
});
