'use strict';
// Left or Right: long-word fit (Creative r2, 2026-10-17). Pure: no DOM; widths come from an injected measure().
// Rule: a tile's answer keeps its normal size if it fits; otherwise it shrinks in 2px steps; it stays unbroken at any size
// down to the 24px floor if it can; only when a word can't fit even at 24px does it break, and then:
//   tier 0  dictionary breaks (Liang patterns, hyph-en.js; mins 2 left / 3 right; e.g. Grand-mother's),
//   tier 1  no dictionary break: between two letters with at least 4 letters on each side (names, made-up words),
//   tier 2  last resort (e.g. a run of emoji): any grapheme boundary.
// Among the allowed breaks it takes the fewest lines (two if at all possible), then the largest size (normal down to 24px)
// where every line fits, then the most even lines (smallest widest line, then the smallest spread). Breaks are only ever between graphemes
// (never inside an emoji), and the quotes are outside the tokens, so the closing quote always stays with the last letters.
// The browser can't tell us its own hyphenation points (and headless Linux has no dictionary), so this is the deterministic
// stand-in; lang="en" + hyphens:auto stay on the clean text for real devices.
(function (root, factory) { var m = factory(root.LR_HYPH || (typeof require === 'function' ? require('./hyph-en.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.LRFIT = m; })(this, function (HY) {
  var PAT = null, EXC = null, MAXP = 0;
  function load() { if (PAT) return; PAT = Object.create(null); EXC = Object.create(null);
    HY.patterns.split(' ').forEach(function (p) { var ch = p.replace(/\d/g, ''); PAT[ch] = p.split(/[.a-z]/).map(function (d) { return +d || 0; }); if (ch.length > MAXP) MAXP = ch.length; });
    HY.exceptions.split(' ').forEach(function (x) { var pos = [], k = 0; for (var i = 0; i < x.length; i++) { if (x[i] === '-') pos.push(k); else k++; } EXC[x.replace(/-/g, '')] = pos; }); }
  // Liang: break positions (counts of letters before the break) in a lowercase a-z word
  function hyphenate(word) { load(); var w = word.toLowerCase(); if (!/^[a-z]+$/.test(w)) return []; if (EXC[w]) return EXC[w].filter(ok);
    var work = '.' + w + '.', pts = new Array(work.length + 1).fill(0);
    for (var i = 0; i < work.length; i++) for (var j = i + 1; j <= Math.min(work.length, i + MAXP); j++) { var p = PAT[work.slice(i, j)]; if (p) for (var k = 0; k < p.length; k++) if (p[k] > pts[i + k]) pts[i + k] = p[k]; }
    var out = []; for (var b = 1; b < w.length; b++) if (pts[b + 1] % 2 && ok(b)) out.push(b); return out;
    function ok(b) { return b >= HY.left && w.length - b >= HY.right; } }
  function graphemes(s) { if (typeof Intl === 'object' && Intl.Segmenter) return Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s), function (x) { return x.segment; }); return Array.from(s); }
  var LETTER = /^\p{L}\p{M}*$/u, ASCII = /^[A-Za-z]$/;
  // one space-separated token -> graphemes + candidate breaks {at (grapheme index), hy (draw a hyphen), tier}
  function token(text, first, last) {
    var gs = graphemes(text), n = gs.length, br = [], seen = {}, i, pre = [0];
    for (i = 0; i < n; i++) pre.push(pre[i] + (LETTER.test(gs[i]) ? 1 : 0));
    for (i = 0; i < n;) { if (!ASCII.test(gs[i])) { i++; continue; } var a = i; while (i < n && ASCII.test(gs[i])) i++;
      hyphenate(gs.slice(a, i).join('')).forEach(function (b) { seen[a + b] = 1; br.push({ at: a + b, hy: true, tier: 0 }); }); }
    for (i = 1; i < n; i++) if (!seen[i] && LETTER.test(gs[i - 1]) && LETTER.test(gs[i]) && pre[i] >= 4 && pre[n] - pre[i] >= 4) { seen[i] = 1; br.push({ at: i, hy: true, tier: 1 }); }
    for (i = 1; i < n; i++) if (!seen[i]) br.push({ at: i, hy: LETTER.test(gs[i - 1]) && LETTER.test(gs[i]), tier: 2 });
    br.sort(function (x, y) { return x.at - y.at; });
    var tiers = []; br.forEach(function (b) { if (tiers.indexOf(b.tier) < 0) tiers.push(b.tier); }); tiers.sort();
    return { text: text, gs: gs, br: br, tiers: tiers, first: first, last: last };
  }
  function tokens(inner) { var parts = inner.split(' ').filter(function (x) { return x !== ''; }); return parts.map(function (p, i) { return token(p, i === 0, i === parts.length - 1); }); }
  // pieces of one token at one size; fits(str, first, last) and width(str, first, last) are supplied by the caller
  function split(tk, tierMax, fits, width, K) {
    if (fits(tk.text, tk.first, tk.last)) return [tk.text];
    var cand = tk.br.filter(function (b) { return b.tier <= tierMax; }), n = tk.gs.length, best = null;
    function piece(a, b, hy) { return tk.gs.slice(a, b).join('') + (hy ? '-' : ''); }
    for (var k = 2; k <= Math.min(cand.length + 1, K || 8) && !best; k++) (function rec(start, from, left, acc, mx, mn) {
      if (left === 1) { var s = piece(start, n, false), f = tk.first && start === 0; if (!fits(s, f, tk.last)) return; var w = width(s, f, tk.last), M = Math.max(mx, w), m = Math.min(mn, w);
        if (!best || M < best.M - 0.01 || (Math.abs(M - best.M) <= 0.01 && M - m < best.M - best.m)) best = { M: M, m: m, p: acc.concat([s]) }; return; }
      for (var c = from; c < cand.length; c++) { var b = cand[c], s2 = piece(start, b.at, b.hy), f2 = tk.first && start === 0; if (!fits(s2, f2, false)) continue; var w2 = width(s2, f2, false);
        if (best && w2 > best.M + 0.01) continue; rec(b.at, c + 1, left - 1, acc.concat([s2]), Math.max(mx, w2), Math.min(mn, w2)); }
    })(0, 0, k, [], 0, Infinity);
    return best ? best.p : null;
  }
  // level -1: everything unbroken; level L: each token uses its L-th tier (or its last)
  function at(toks, level, fits, width, K) { var out = [];
    for (var i = 0; i < toks.length; i++) { var tk = toks[i], p;
      if (level < 0) { if (!fits(tk.text, tk.first, tk.last)) return null; p = [tk.text]; }
      else { if (!tk.tiers.length) { if (!fits(tk.text, tk.first, tk.last)) return null; p = [tk.text]; } else p = split(tk, tk.tiers[Math.min(level, tk.tiers.length - 1)], fits, width, K); }
      if (!p) return null; out.push(p); }
    return out; }
  // o: { sizes: [desc px], measure(str, first, last) -> {w, hang} at o.R px, R, avail, full, ok(size, plan)? }
  function plan(inner, o) {
    var toks = tokens(inner), cache = {};
    function mz(s, f, l) { var key = (f ? 1 : 0) + (l ? 2 : 0) + s; return cache[key] || (cache[key] = o.measure(s, f, l)); }
    function mk(size) { var r = size / o.R; return { fits: function (s, f, l) { var m = mz(s, f, l); return m.w * r <= o.avail - 1 && (m.w + m.hang) * r <= o.full - 1; }, width: function (s, f, l) { return mz(s, f, l).w * r; } }; }
    var ok = o.ok || function () { return true; }, levels = [-1, 0, 1, 2];
    // unbroken at the largest size; else per tier level: fewest lines per word first (K), then the largest size
    for (var L = 0; L < levels.length; L++) for (var K = levels[L] < 0 ? 1 : 2; K <= (levels[L] < 0 ? 1 : 8); K++) for (var i = 0; i < o.sizes.length; i++) {
      var f = mk(o.sizes[i]), p = at(toks, levels[L], f.fits, f.width, K); if (p && ok(o.sizes[i], p)) return { size: o.sizes[i], level: levels[L], lines: p, broken: p.some(function (x) { return x.length > 1; }) }; }
    var last = o.sizes[o.sizes.length - 1]; return { size: last, level: 3, lines: toks.map(function (t) { return [t.text]; }), broken: false, overflow: true };
  }
  function sizes(base, floor) { var out = [], s = base; while (s > floor + 0.01) { out.push(Math.round(s * 100) / 100); s -= 2; } out.push(floor); return out; }
  return { hyphenate: hyphenate, graphemes: graphemes, token: token, tokens: tokens, split: split, plan: plan, sizes: sizes };
});
