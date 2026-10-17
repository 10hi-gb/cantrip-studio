'use strict';
// Left or Right: answer layout for the board tiles and the chosen screen (Creative r2 + QA local-372ce92 L1). Pure: no DOM;
// widths come from an injected measure(). fit.js decides every line; the page draws exactly these lines (white-space:pre,
// no CSS hyphenation), so what is planned is what is rendered.
// Wrap rule (PM): break at spaces first, then at the hyphens already in the text (no hyphen added; 2+ letters each side). Only a segment (the run
// between those breaks) that can't fit on a line by itself may be broken inside, and then: tier 1 dictionary points (Liang
// patterns, hyph-en.js), tier 2 any letter point, both with at least 4 letters on each side and a visible added hyphen,
// tier 3 grapheme boundaries (a run of emoji that can't fit; never inside an emoji, no hyphen). A segment that fits is never
// split. The closing quote is counted on the last line and always stays with the last grapheme.
// Order: natural breaks only (spaces + existing hyphens) at the largest size from the normal size down to the 24px floor;
// only if that fails at 24px, inner breaks: fewest lines, then the largest size, then the most even lines.
(function (root, factory) { var m = factory(root.LR_HYPH || (typeof require === 'function' ? require('./hyph-en.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.LRFIT = m; })(this, function (HY) {
  var PAT = null, EXC = null, MAXP = 0, MINF = 4;
  function load() { if (PAT) return; PAT = Object.create(null); EXC = Object.create(null);
    HY.patterns.split(' ').forEach(function (p) { var ch = p.replace(/\d/g, ''); PAT[ch] = p.split(/[.a-z]/).map(function (d) { return +d || 0; }); if (ch.length > MAXP) MAXP = ch.length; });
    HY.exceptions.split(' ').forEach(function (x) { var pos = [], k = 0; for (var i = 0; i < x.length; i++) { if (x[i] === '-') pos.push(k); else k++; } EXC[x.replace(/-/g, '')] = pos; }); }
  // Liang: break positions (letters before the break) in an a-z word, with the patterns' own minimums (2 left, 3 right)
  function hyphenate(word) { load(); var w = word.toLowerCase(); if (!/^[a-z]+$/.test(w)) return []; if (EXC[w]) return EXC[w].filter(ok);
    var work = '.' + w + '.', pts = new Array(work.length + 1).fill(0);
    for (var i = 0; i < work.length; i++) for (var j = i + 1; j <= Math.min(work.length, i + MAXP); j++) { var p = PAT[work.slice(i, j)]; if (p) for (var k = 0; k < p.length; k++) if (p[k] > pts[i + k]) pts[i + k] = p[k]; }
    var out = []; for (var b = 1; b < w.length; b++) if (pts[b + 1] % 2 && ok(b)) out.push(b); return out;
    function ok(b) { return b >= HY.left && w.length - b >= HY.right; } }
  function graphemes(s) { if (typeof Intl === 'object' && Intl.Segmenter) return Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s), function (x) { return x.segment; }); return Array.from(s); }
  var LETTER = /^\p{L}\p{M}*$/u, ASCII = /^[A-Za-z]$/, HYPH = /^[-\u2010]$/;
  // the text as graphemes, its natural breaks and its segments (each with its inner break points by tier)
  function parse(inner) {
    var G = graphemes(inner.replace(/ +/g, ' ').trim()), n = G.length, nat = [], segs = [], a = 0, i;
    // letters next to a hyphen, up to the next space or hyphen: a break at the answer's own hyphen keeps 2+ letters each side (no "x-" / "ray")
    function lets(s, e, dir) { var c = 0, k; if (dir > 0) { for (k = s; k < e && G[k] !== ' ' && !HYPH.test(G[k]); k++) if (LETTER.test(G[k])) c++; } else { for (k = e - 1; k >= s && !HYPH.test(G[k]); k--) if (LETTER.test(G[k])) c++; } return c; }
    function seg(s, e) { if (e <= s) return; var x = { s: s, e: e, t: [[], [], []] }, pre = [0], k;
      for (k = s; k < e; k++) pre.push(pre[k - s] + (LETTER.test(G[k]) ? 1 : 0)); var L = pre[e - s], lt = function (p) { return pre[p - s]; };
      var four = function (p) { return lt(p) >= MINF && L - lt(p) >= MINF && LETTER.test(G[p - 1]) && LETTER.test(G[p]); }, seen = {};
      for (k = s; k < e;) { if (!ASCII.test(G[k])) { k++; continue; } var r = k; while (k < e && ASCII.test(G[k])) k++;
        hyphenate(G.slice(r, k).join('')).forEach(function (b) { var p = r + b; if (four(p)) { seen[p] = 1; x.t[0].push({ pos: p, skip: 0, hy: true, kind: 'd' }); } }); }
      for (k = s + 1; k < e; k++) if (!seen[k] && four(k)) { seen[k] = 1; x.t[1].push({ pos: k, skip: 0, hy: true, kind: 'f' }); }
      for (k = s + 1; k < e; k++) if (!seen[k]) x.t[2].push({ pos: k, skip: 0, hy: LETTER.test(G[k - 1]) && LETTER.test(G[k]) && lt(k) >= MINF && L - lt(k) >= MINF, kind: 'g' });
      segs.push(x); }
    for (i = 0; i < n; i++) {
      if (G[i] === ' ') { seg(a, i); nat.push({ pos: i, skip: 1, hy: false, kind: 's' }); a = i + 1; }
      else if (HYPH.test(G[i]) && i > a && i + 1 < n && G[i + 1] !== ' ' && lets(a, i, -1) >= 2 && lets(i + 1, n, 1) >= 2) { seg(a, i + 1); nat.push({ pos: i + 1, skip: 0, hy: false, kind: 'h' }); a = i + 1; } }
    seg(a, n); return { G: G, n: n, nat: nat, segs: segs };
  }
  // fewest lines (<= K), then the smallest widest line, then the smallest spread, over the allowed breaks
  function layout(P, cands, fits, width, K) {
    var C = [{ pos: 0, skip: 0, hy: false, kind: 'start' }].concat(cands.slice().sort(function (x, y) { return x.pos - y.pos; })).concat([{ pos: P.n, skip: 0, hy: false, kind: 'end' }]), m = C.length;
    function text(i, j) { return P.G.slice(C[i].pos + C[i].skip, C[j].pos).join('') + (C[j].hy ? '-' : ''); }
    var best = []; for (var i = 0; i < m; i++) best.push([]); best[0][0] = { M: 0, mn: Infinity, prev: -1 };
    for (var k = 1; k <= K; k++) for (var j = 1; j < m; j++) for (var i2 = 0; i2 < j; i2++) { var b = best[i2][k - 1]; if (!b) continue; var s = text(i2, j); if (!s) continue; var f = i2 === 0, l = j === m - 1;
      if (!fits(s, f, l)) continue; var w = width(s, f, l), M = Math.max(b.M, w), mn = Math.min(b.mn, w), cur = best[j][k];
      if (!cur || M < cur.M - 0.01 || (Math.abs(M - cur.M) <= 0.01 && M - mn < cur.M - cur.mn - 0.01)) best[j][k] = { M: M, mn: mn, prev: i2 }; }
    for (var k2 = 1; k2 <= K; k2++) if (best[m - 1][k2]) { var lines = [], kinds = [], j2 = m - 1, kk = k2; while (j2 > 0) { var pr = best[j2][kk].prev; lines.unshift(text(pr, j2)); if (j2 < m - 1) kinds.unshift(C[j2].kind); j2 = pr; kk--; } return { lines: lines, kinds: kinds }; }
    return null;
  }
  // allowed breaks at one size and level (0 natural only; 1 + dictionary; 2 + letter fallback; 3 + graphemes), inner
  // breaks only inside segments that don't fit by themselves
  function cands(P, level, fits) { var out = P.nat.slice(); if (!level) return out;
    P.segs.forEach(function (x) { var s = P.G.slice(x.s, x.e).join(''); if (fits(s, x.s === 0, x.e === P.n)) return; for (var t = 0; t < level; t++) out = out.concat(x.t[t]); }); return out; }
  // o: { sizes: [desc px], measure(str, first, last) -> {w, marks, hang} at o.R px, R, avail (px or fn(size)), full, ok(size, lines)? }
  // A line must fit the content box with its marks counted, and with the marks hung it must stay inside the tile padding.
  function plan(inner, o) {
    var P = parse(inner), cache = {}, ok = o.ok || function () { return true; }, i, K, L;
    function mz(s, f, l) { var key = (f ? 1 : 0) + (l ? 2 : 0) + s; return cache[key] || (cache[key] = o.measure(s, f, l)); }
    function mk(size) { var r = size / o.R, av = typeof o.avail === 'function' ? o.avail(size) : o.avail; return { fits: function (s, f, l) { var m = mz(s, f, l); return (m.w + (m.marks || 0)) * r <= av - 1 && (m.w + m.hang) * r <= o.full - 1; }, width: function (s, f, l) { return mz(s, f, l).w * r; } }; }
    function done(size, res, level) { return { size: size, lines: res.lines, kinds: res.kinds, level: level, broken: res.kinds.some(function (k) { return k === 'd' || k === 'f' || k === 'g'; }) }; }
    var maxK = P.nat.length + 1 + 12;
    for (i = 0; i < o.sizes.length; i++) { var f0 = mk(o.sizes[i]), r0 = layout(P, cands(P, 0, f0.fits), f0.fits, f0.width, maxK); if (r0 && ok(o.sizes[i], r0.lines)) return done(o.sizes[i], r0, 0); }
    for (L = 1; L <= 3; L++) for (K = 1; K <= maxK; K++) for (i = 0; i < o.sizes.length; i++) { var f = mk(o.sizes[i]), r = layout(P, cands(P, L, f.fits), f.fits, f.width, K); if (r && ok(o.sizes[i], r.lines)) return done(o.sizes[i], r, L); }
    var last = o.sizes[o.sizes.length - 1]; return { size: last, lines: [P.G.join('')], kinds: [], level: 4, broken: false, overflow: true };
  }
  function sizes(base, floor) { var out = [], s = base; while (s > floor + 0.01) { out.push(Math.round(s * 100) / 100); s -= 2; } out.push(floor); return out; }
  return { hyphenate: hyphenate, graphemes: graphemes, parse: parse, layout: layout, plan: plan, sizes: sizes, MINF: MINF };
});
