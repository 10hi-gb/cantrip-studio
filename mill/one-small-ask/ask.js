'use strict';
// One Small Ask: pure model + link codec. Ask link "#a1.<b64url JSON>.<ck>", reply link "#r1.<b64url JSON>.<ck>", each <= 2000 chars.
// Ask JSON  {w: favor, e: effort number, u: 'min'|'hr', d: day text, s: 'HH:MM', t: 'HH:MM', f: from, o: to}
// Reply JSON {a: <ask>, v: 'y'|'p'|'n', p: <offer {w,e,u,d,s,t}> | null, n: note}
//   y: p null, note optional. p: offer required and must differ from the ask in at least one term. n: p null, note must be '' (no reason).
// encodeAsk/encodeReply return null when invalid and '' when valid but over the 2000-char cap (UI then offers text only).
// Text is kept exactly as typed (after stripping control/bidi characters and collapsing whitespace). No time-zone math.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.ASK = factory(root.MILL);
})(this, function (M) {
  var FRAG_MAX = 2000, CAP = { w: 120, d: 40, name: 24, note: 120 }, EMAX = { min: 600, hr: 24 };
  var TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function exact(o, keys) { return o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(function (k) { return own(o, k); }); }
  // Terms check -> null or the first error code (used for both the ask and an offer)
  function termsError(t) {
    if (typeof t.w !== 'string' || !M.strip(t.w)) return 'actionEmpty';
    if (M.len(M.strip(t.w)) > CAP.w) return 'actionTooLong';
    if (t.u !== 'min' && t.u !== 'hr') return 'effortInvalid';
    if (!Number.isInteger(t.e) || t.e < 1 || t.e > EMAX[t.u]) return 'effortInvalid';
    if (typeof t.d !== 'string' || typeof t.s !== 'string' || typeof t.t !== 'string' || !M.strip(t.d) || !TIME.test(t.s) || !TIME.test(t.t)) return 'windowMissing';
    if (M.len(M.strip(t.d)) > CAP.d) return 'windowMissing';
    if (t.t <= t.s) return 'windowOrder';
    return null;
  }
  function askError(a) {
    if (!exact(a, ['w', 'e', 'u', 'd', 's', 't', 'f', 'o'])) return 'shape';
    var e = termsError(a); if (e) return e;
    if (typeof a.f !== 'string' || typeof a.o !== 'string') return 'shape';
    if (M.len(M.strip(a.f)) > CAP.name || M.len(M.strip(a.o)) > CAP.name) return 'nameTooLong';
    return null;
  }
  function cleanTerms(t) { return { w: M.strip(t.w), e: t.e, u: t.u, d: M.strip(t.d), s: t.s, t: t.t }; }
  function cleanAsk(a) { var c = cleanTerms(a); c.f = M.strip(a.f); c.o = M.strip(a.o); return c; }
  // Which terms changed between the ask and an offer. Byte-for-byte after the same cleaning.
  function diff(a, p) { a = cleanTerms(a); p = cleanTerms(p); return { action: a.w !== p.w, effort: a.e !== p.e || a.u !== p.u, window: a.d !== p.d || a.s !== p.s || a.t !== p.t }; }
  function anyChanged(d) { return d.action || d.effort || d.window; }
  function replyError(r) {
    if (!exact(r, ['a', 'v', 'p', 'n'])) return 'shape';
    if (askError(r.a)) return 'ask';
    if (typeof r.n !== 'string' || M.len(M.strip(r.n)) > CAP.note) return 'noteTooLong';
    if (r.v === 'y') return r.p === null ? null : 'shape';
    if (r.v === 'n') return r.p === null && M.strip(r.n) === '' ? null : 'shape';
    if (r.v !== 'p') return 'shape';
    if (!exact(r.p, ['w', 'e', 'u', 'd', 's', 't'])) return 'shape';
    var e = termsError(r.p); if (e) return e;
    return anyChanged(diff(r.a, r.p)) ? null : 'partNothingChanged';
  }
  function encodeAsk(a) { if (askError(a)) return null; var f = M.pack('a', 1, cleanAsk(a)); return f.length <= FRAG_MAX ? f : ''; }
  function encodeReply(r) {
    if (replyError(r)) return null;
    var f = M.pack('r', 1, { a: cleanAsk(r.a), v: r.v, p: r.p ? cleanTerms(r.p) : null, n: M.strip(r.n) });
    return f.length <= FRAG_MAX ? f : '';
  }
  // -> {ok, kind:'ask'|'reply', data} or {ok:false, why}
  function decode(frag) {
    var f = String(frag == null ? '' : frag).replace(/^#/, ''); if (!f) return { ok: false, why: 'empty' };
    var tag = f.charAt(0) === 'r' ? 'r' : 'a', u = M.unpack(f, tag, 1, FRAG_MAX);
    if (!u.ok) return u;
    if (tag === 'a') { if (askError(u.data)) return { ok: false, why: 'bad' }; return { ok: true, kind: 'ask', data: cleanAsk(u.data) }; }
    if (replyError(u.data)) return { ok: false, why: 'bad' };
    var d = u.data; return { ok: true, kind: 'reply', data: { a: cleanAsk(d.a), v: d.v, p: d.p ? cleanTerms(d.p) : null, n: M.strip(d.n) } };
  }
  function fmtTime(hm) { var h = +hm.slice(0, 2), m = hm.slice(3), ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12; return h12 + (m === '00' ? '' : ':' + m) + ' ' + ap; }
  return { FRAG_MAX: FRAG_MAX, CAP: CAP, EMAX: EMAX, termsError: termsError, askError: askError, replyError: replyError, diff: diff, anyChanged: anyChanged, encodeAsk: encodeAsk, encodeReply: encodeReply, decode: decode, fmtTime: fmtTime, cleanTerms: cleanTerms };
});
