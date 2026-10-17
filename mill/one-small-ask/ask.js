'use strict';
// One Small Ask: pure model + link codec. Ask link "#a1.<b64url JSON>.<ck>", reply link "#r1.<b64url JSON>.<ck>", each fragment <= 2000 chars.
// Cap: origin+path+fragment ≤ 2,000 chars. Not a literal full-URL cap. An appended ?query is ignored; pieces never generate a query, and no visitor content is ever in a query string (never parsed, shown or echoed).
// Ask JSON  {w: favor, e: effort number, u: 'min'|'hr', d: day text, s: 'HH:MM', t: 'HH:MM', h: where ('' = none), f: from, o: to}
// Reply JSON {a: <ask>, v: 'y'|'p'|'n', p: <offer {w,e,u,d,s,t,h}> | null, n: note}
//   y: p null, note optional. p: offer required and must differ from the ask in at least one term. n: p null, note must be '' (no reason).
// encodeAsk/encodeReply return null when invalid and '' when valid but over the 2000-char cap (UI then offers text only).
// Text is kept exactly as typed (after stripping control/bidi characters and collapsing whitespace; the favor keeps up to 3 line breaks). No time-zone math.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.ASK = factory(root.MILL);
})(this, function (M) {
  var FRAG_MAX = 2000, CAP = { w: 140, d: 40, h: 80, name: 24, note: 120 }, EMAX = { min: 600, hr: 24 };
  // Favor text keeps up to 3 line breaks (4 lines); further lines collapse into the 4th with spaces. Each line is stripped like other text; blank lines dropped.
  function stripW(x) { var lines = String(x == null ? '' : x).replace(/\r\n?/g, '\n').split('\n').map(M.strip).filter(Boolean); return lines.slice(0, 4).join('\n') + (lines.length > 4 ? ' ' + lines.slice(4).join(' ') : ''); }
  var TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function exact(o, keys) { return o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(function (k) { return own(o, k); }); }
  // Terms check -> null or the first error code (used for both the ask and an offer)
  function termsError(t) {
    if (typeof t.w !== 'string' || !stripW(t.w)) return 'actionEmpty';
    if (M.len(stripW(t.w)) > CAP.w) return 'actionTooLong';
    if (t.u !== 'min' && t.u !== 'hr') return 'effortInvalid';
    if (!Number.isInteger(t.e) || t.e < 1 || t.e > EMAX[t.u]) return 'effortInvalid';
    if (typeof t.d !== 'string' || typeof t.s !== 'string' || typeof t.t !== 'string' || !M.strip(t.d) || !TIME.test(t.s) || !TIME.test(t.t)) return 'windowMissing';
    if (M.len(M.strip(t.d)) > CAP.d) return 'windowMissing';
    if (t.t <= t.s) return 'windowOrder';
    if (typeof t.h !== 'string') return 'shape';
    if (M.len(M.strip(t.h)) > CAP.h) return 'whereTooLong';
    return null;
  }
  function askError(a) {
    if (!exact(a, ['w', 'e', 'u', 'd', 's', 't', 'h', 'f', 'o'])) return 'shape';
    var e = termsError(a); if (e) return e;
    if (typeof a.f !== 'string' || typeof a.o !== 'string') return 'shape';
    if (M.len(M.strip(a.f)) > CAP.name || M.len(M.strip(a.o)) > CAP.name) return 'nameTooLong';
    return null;
  }
  function cleanTerms(t) { return { w: stripW(t.w), e: t.e, u: t.u, d: M.strip(t.d), s: t.s, t: t.t, h: M.strip(t.h) }; }
  function cleanAsk(a) { var c = cleanTerms(a); c.f = M.strip(a.f); c.o = M.strip(a.o); return c; }
  // Which terms changed between the ask and an offer. Byte-for-byte after the same cleaning.
  function diff(a, p) { a = cleanTerms(a); p = cleanTerms(p); return { action: a.w !== p.w, effort: a.e !== p.e || a.u !== p.u, window: a.d !== p.d || a.s !== p.s || a.t !== p.t, where: a.h !== p.h }; }
  function anyChanged(d) { return d.action || d.effort || d.window || d.where; }
  function replyError(r) {
    if (!exact(r, ['a', 'v', 'p', 'n'])) return 'shape';
    if (askError(r.a)) return 'ask';
    if (typeof r.n !== 'string' || M.len(M.strip(r.n)) > CAP.note) return 'noteTooLong';
    if (r.v === 'y') return r.p === null ? null : 'shape';
    if (r.v === 'n') return r.p === null && M.strip(r.n) === '' ? null : 'shape';
    if (r.v !== 'p') return 'shape';
    if (!exact(r.p, ['w', 'e', 'u', 'd', 's', 't', 'h'])) return 'shape';
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
  // Display strings and plain-text exports. C = Writer COPY. Values are verbatim user text.
  function effortText(C, t) { return M.plural(C.effortLine[t.u], t.e); }
  // QA N5: Day is free text the sender (or replier) typed: quoted with the shared rule wherever the window shows (screen, aria, print, copy)
  function windowText(C, t) { var d = M.strip(t.d || ''); return M.fill(C.windowLine, { day: d ? M.raw(M.quote(d)) : '', start: fmtTime(t.s), end: fmtTime(t.t) }); }
  function termValues(C, t) { return { action: t.w, effort: effortText(C, t), window: windowText(C, t), where: t.h }; }
  var TERMS = [['action', 'diffAction'], ['effort', 'diffEffort'], ['window', 'diffWindow'], ['where', 'diffWhere']];
  function textAsk(C, a) {
    var v = termValues(C, a);
    return M.fill(C.textAsk, { fromLine: a.f ? M.fill(C.textFromLine, { from: M.quote(a.f) }) : C.textFromLineAnon, action: v.action, effort: v.effort, window: v.window, whereLine: a.h ? M.fill(C.textWhereLine, { where: a.h }) : '' });
  }
  function textReply(C, r) {
    var a = termValues(C, r.a), noteLine = r.n ? M.fill(C.textNoteLine, { note: r.n }) : '';
    if (r.v === 'y') return M.fill(C.textReplyYes, { action: a.action, effort: a.effort, window: a.window, whereSuffix: r.a.h ? M.fill(C.textWhereSuffix, { where: r.a.h }) : '', noteLine: noteLine });
    if (r.v === 'n') return M.fill(C.textReplyNo, { action: a.action, noteLine: '' });
    var p = termValues(C, r.p), d = diff(r.a, r.p), ch = '', same = '';
    TERMS.forEach(function (t) { var k = t[0]; if (k === 'where' && !r.a.h && !r.p.h) return;
      var typed = k === 'action' || k === 'where'; // typed text is quoted (Writer QA-83 *Typed templates)
      if (d[k]) ch += M.fill(typed ? C.textChangedLineTyped : C.textChangedLine, { term: C[t[1]], now: p[k] || '—', was: a[k] || '—' }); else same += M.fill(typed ? C.textSameLineTyped : C.textSameLine, { term: C[t[1]], value: a[k] }); });
    return M.fill(C.textReplyPart, { action: a.action, changedLines: ch, sameLines: same, noteLine: noteLine });
  }
  return { TERMS: TERMS, effortText: effortText, windowText: windowText, termValues: termValues, textAsk: textAsk, textReply: textReply, FRAG_MAX: FRAG_MAX, CAP: CAP, EMAX: EMAX, termsError: termsError, askError: askError, replyError: replyError, diff: diff, anyChanged: anyChanged, encodeAsk: encodeAsk, encodeReply: encodeReply, decode: decode, fmtTime: fmtTime, cleanTerms: cleanTerms, stripW: stripW };
});
