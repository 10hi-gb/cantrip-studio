'use strict';
// Split the Sack link format: "#s1.<base64url JSON>.<checksum>", max FRAG_MAX chars. Readable by anyone holding it; a snapshot.
// JSON: {n:item, u:unit, c:symbol, q:pkgQty, i:increment, p:price, f:fee, b:'p'|'e', x:assignIndex(-1 none), h:[[name, request], ...]}
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'), require('./sack.js'));
  else root.SACKLINK = factory(root.MILL, root.SACK);
})(this, function (M, S) {
  var FRAG_MAX = 2000, ITEM_MAX = 40, NAME_MAX = 24, UNIT_MAX = 16, SYM_MAX = 3;
  var STR = ['n', 'u', 'c', 'q', 'i', 'p', 'f', 'b'];
  // The unit cap counts user-perceived characters (grapheme clusters), so a ZWJ family, a flag or a keycap is 1 of the 16: the link
  // parser, the editor's validator and the unit input all count with unitLen(). Intl.Segmenter where the browser has it; otherwise
  // a close fallback (marks, variation selectors, skin tones, tags, keycaps and ZWJ joins attach; regional indicators pair).
  // Every unit that passed the old code-point count still passes (graphemes <= code points).
  var SEG = typeof Intl === 'object' && Intl && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  var MARK = (function () { try { return new RegExp('^\\p{M}$', 'u'); } catch (e) { return /^[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]$/; } })();
  function isRI(c) { return c >= 0x1F1E6 && c <= 0x1F1FF; }
  function approxGraphemes(s) {
    var out = [], prevZWJ = false, riOpen = false;
    Array.from(s).forEach(function (ch) {
      var c = ch.codePointAt(0), last = out.length - 1;
      var attach = last >= 0 && (prevZWJ || c === 0x200D || MARK.test(ch) || (c >= 0xFE00 && c <= 0xFE0F) || (c >= 0xE0100 && c <= 0xE01EF) || (c >= 0x1F3FB && c <= 0x1F3FF) || (c >= 0xE0020 && c <= 0xE007F) || c === 0x20E3 || (isRI(c) && riOpen));
      if (attach) { out[last] += ch; riOpen = false; } else { out.push(ch); riOpen = isRI(c); }
      prevZWJ = c === 0x200D;
    });
    return out;
  }
  function graphemes(s) { s = String(s == null ? '' : s); if (!SEG) return approxGraphemes(s); var out = [], it = SEG.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; }
  function unitLen(u) { return graphemes(M.strip(u)).length; }
  function clean(st) {
    var o = { h: st.h.map(function (x) { return [M.strip(x[0]), String(x[1]).trim()]; }), x: st.x };
    STR.forEach(function (k) { o[k] = k === 'n' || k === 'u' || k === 'c' ? M.strip(st[k]) : String(st[k]).trim(); });
    return o;
  }
  function toCompute(st) {
    var p = S.parseMoney(st.p), f = String(st.f).trim() === '' ? 0 : S.parseMoney(st.f); if (p == null || f == null) return null;
    return { pkgQty: st.q, inc: st.i, price: p, fee: f, feeBasis: st.b === 'e' ? 'equal' : 'proportional', assignTo: st.x, requests: st.h.map(function (x) { return x[1]; }) };
  }
  // null when the state is a finished proposal; otherwise the first problem code.
  function check(st) {
    if (!st || typeof st !== 'object' || !Array.isArray(st.h)) return 'shape';
    for (var j = 0; j < STR.length; j++) if (typeof st[STR[j]] !== 'string') return 'shape';
    if (!Number.isInteger(st.x)) return 'shape';
    var n = M.strip(st.n), u = M.strip(st.u);
    if (!n || M.len(n) > ITEM_MAX) return 'item';
    if (!u || unitLen(u) > UNIT_MAX) return 'unit';
    if (M.len(M.strip(st.c)) > SYM_MAX) return 'sym';
    if (st.b !== 'p' && st.b !== 'e') return 'basis';
    if (st.h.length < S.MIN_H || st.h.length > S.MAX_H) return 'count';
    var seen = {};
    for (var k = 0; k < st.h.length; k++) {
      var x = st.h[k]; if (!Array.isArray(x) || x.length !== 2 || typeof x[0] !== 'string' || typeof x[1] !== 'string') return 'shape';
      var nm = M.strip(x[0]); if (!nm || M.len(nm) > NAME_MAX) return 'name';
      var key = nm.toLowerCase(); if (seen[key]) return 'duplicate'; seen[key] = 1;
    }
    var r = toCompute(st); if (!r) return 'money'; var c = S.compute(r); if (!c.ok) return c.error; if (!c.complete) return c.status === 'nobasis' ? 'nobasis' : 'over';
    if (st.x >= 0 && c.unallocatedBeforeAssign === 0) return 'assign';
    return null;
  }
  function encode(st) { var c = clean(st); if (check(c)) return null; return M.pack('s', 1, c); }
  function decode(frag) {
    var u = M.unpack(frag, 's', 1, FRAG_MAX); if (!u.ok) return u;
    var d = u.data, keys = STR.concat(['h', 'x']);
    if (Array.isArray(d) || Object.keys(d).length !== keys.length || keys.some(function (k) { return !Object.prototype.hasOwnProperty.call(d, k); })) return { ok: false, why: 'bad' };
    if (check(d)) return { ok: false, why: 'bad' };
    return { ok: true, data: clean(d) };
  }
  return { FRAG_MAX: FRAG_MAX, ITEM_MAX: ITEM_MAX, NAME_MAX: NAME_MAX, UNIT_MAX: UNIT_MAX, SYM_MAX: SYM_MAX, check: check, toCompute: toCompute, encode: encode, decode: decode, graphemes: graphemes, unitLen: unitLen, _approxGraphemes: approxGraphemes };
});
