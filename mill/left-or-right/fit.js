'use strict';
// Left or Right: answer layout for the board tiles and the chosen screen (Creative r2 + QA local-372ce92 L1 + local-d0ca704 L5). Pure: no DOM;
// widths come from an injected measure(). fit.js decides every line; the page draws exactly these lines (white-space:pre,
// no CSS hyphenation), so what is planned is what is rendered.
// Wrap rule (PM, QA local-d0ca704 L5): greedy first-fit, never balanced. Words go on the current line while they fit (the
// closing quote counted on the last line, the opening one on the first). A word that can't fit on a line by itself is
// split at its own hyphens (no hyphen added; 2+ letters each side), filled greedily too. Only a hyphen segment that still
// can't fit a line by itself is broken inside, greedily at the latest point that fits: tier 1 dictionary points (Liang
// patterns, hyph-en.js), tier 2 any letter point, both with 4+ letters each side (and in every piece) and an added hyphen, tier 3 grapheme
// boundaries (emoji runs, digits, symbols: never between two letters (QA local-2a8c67b L11), never inside an emoji, no hyphen). Size: the largest size, normal down to the 24px floor, at
// which the greedy layout fits with no inner break; only if none, the largest size with tier 1, then tier 2, then tier 3.
// Multi-word with an inner break (QA local-ad96660 L16): fewest pieces first, keeping whole every segment that fits a line by
// itself at the floor, then the largest size (binary search to 0.25px), then the lowest tier within 10%; see plan().
// Single word (Creative r5, after f66fb8e): an answer with no space takes the FEWEST pieces before the larger size: 1 piece
// (unbroken) at the largest size that fits, else 2 pieces at the largest size, else 3, and so on. Within one piece count the
// size comes first (PM ruling on QA local-2a8c67b L13; Creative 08:25 for L14): take the TRUE largest size at which any tier
// makes that count (grid pass, then a binary search to 0.25px between the last passing and first failing grid step); the
// drawn size is never more than 10% under it (NEAR). Within that 10% the lowest tier wins (own hyphens, then dictionary, then
// letter fallback, then graphemes), at its own largest size, so Grand- / mother's keeps its dictionary break when a letter
// split would only gain a step or two, while abc30 takes 2 letter pieces at 36px over a dictionary break at 26px. Own
// hyphens always come first anyway, since a segment that fits is never broken inside; a word gets another break only when fewer pieces can't fit even at the floor. The floor is the last
// entry of o.sizes (app.js FLOOR = 24px, measured as the answer's own font size; for the two board tiles the shared size
// is applied afterwards, so the other tile shrinks to match). If no piece count fits at the floor, plan() falls back to
// the multi-word search below and then to the old overflow line, unchanged.
(function (root, factory) { var m = factory(root.LR_HYPH || (typeof require === 'function' ? require('./hyph-en.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.LRFIT = m; })(this, function (HY) {
  var PAT = null, EXC = null, MAXP = 0, MINF = 4, NEAR = 0.9, STEP = 0.25;
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
  var LETTER = /^\p{L}\p{M}*$/u, WORD = /^(?:\p{L}\p{M}*|[-\u2010'\u2019])$/u, ASCII = /^[A-Za-z]$/, HYPH = /^[-\u2010]$/;
  // QA local-f66fb8e: CJK and kana (and Hangul) break between characters with no hyphen and no 4-letter minimum (kind 'c'),
  // never before closing punctuation, small kana or the long-vowel mark, never after an opening bracket
  var CJK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303F\uFF00-\uFFEF]/u,
    NOSTART = /^[\u3001\u3002\uFF0C\uFF0E\u30FB\u30FC\u3005\u309D\u309E\u30FD\u30FE\u3063\u3083\u3085\u3087\u3041\u3043\u3045\u3047\u3049\u308E\u30C3\u30E3\u30E5\u30E7\u30A1\u30A3\u30A5\u30A7\u30A9\u30EE\u30F5\u30F6\u300D\u300F\u3011\u3015\u3009\u300B\uFF09\uFF3D\uFF5D\uFF01\uFF1F\uFF1A\uFF1B!?)\]}:;,.]/u,
    NOEND = /^[\u300C\u300E\u3010\u3014\u3008\u300A\uFF08\uFF3B\uFF5B(\[{]/u;
  // the text as graphemes, its natural breaks and its segments (each with its inner break points by tier)
  function parse(inner) {
    var G = graphemes(inner.replace(/ +/g, ' ').trim()), n = G.length, nat = [], segs = [], a = 0, i;
    // letters next to a hyphen, up to the next space or hyphen: a break at the answer's own hyphen keeps 2+ letters each side (no "x-" / "ray")
    function lets(s, e, dir) { var c = 0, k; if (dir > 0) { for (k = s; k < e && G[k] !== ' ' && !HYPH.test(G[k]); k++) if (LETTER.test(G[k])) c++; } else { for (k = e - 1; k >= s && !HYPH.test(G[k]); k--) if (LETTER.test(G[k])) c++; } return c; }
    function seg(s, e) { if (e <= s) return; var x = { s: s, e: e, t: [[], [], []] }, pre = [0], k;
      for (k = s; k < e; k++) pre.push(pre[k - s] + (LETTER.test(G[k]) ? 1 : 0)); var L = pre[e - s], lt = function (p) { return pre[p - s]; };
      var cjk = function (p) { return CJK.test(G[p - 1]) || CJK.test(G[p]); }, four = function (p) { return !cjk(p) && lt(p) >= MINF && L - lt(p) >= MINF && LETTER.test(G[p - 1]) && LETTER.test(G[p]); }, seen = {};
      for (k = s + 1; k < e; k++) if (cjk(k)) { seen[k] = 1; if (!NOSTART.test(G[k]) && !NOEND.test(G[k - 1])) x.t[1].push({ pos: k, skip: 0, hy: false, kind: 'c' }); }
      for (k = s; k < e;) { if (!ASCII.test(G[k])) { k++; continue; } var r = k; while (k < e && ASCII.test(G[k])) k++;
        hyphenate(G.slice(r, k).join('')).forEach(function (b) { var p = r + b; if (four(p)) { seen[p] = 1; x.t[0].push({ pos: p, skip: 0, hy: true, kind: 'd' }); } }); }
      for (k = s + 1; k < e; k++) if (!seen[k] && four(k)) { seen[k] = 1; x.t[1].push({ pos: k, skip: 0, hy: true, kind: 'f' }); }
      // QA local-2a8c67b L11: tier 3 never splits inside a word (between two of: letter, own hyphen, apostrophe) (no "Bartholom / ew", no "Baptiste-A / lexandre"); a letter run
      // breaks only at tiers 1-2 (4+ letters each side, hyphen added), so tier 3 is left for emoji, digits and symbols
      for (k = s + 1; k < e; k++) if (!seen[k] && !(WORD.test(G[k - 1]) && WORD.test(G[k]))) x.t[2].push({ pos: k, skip: 0, hy: false, kind: 'g' });
      segs.push(x); }
    for (i = 0; i < n; i++) {
      if (G[i] === ' ') { seg(a, i); nat.push({ pos: i, skip: 1, hy: false, kind: 's' }); a = i + 1; }
      else if (HYPH.test(G[i]) && i > a && i + 1 < n && G[i + 1] !== ' ' && lets(a, i, -1) >= 2 && lets(i + 1, n, 1) >= 2) { seg(a, i + 1); nat.push({ pos: i + 1, skip: 0, hy: false, kind: 'h' }); a = i + 1; } }
    seg(a, n); return { G: G, n: n, nat: nat, segs: segs };
  }
  // greedy first-fit at one size; level 0 natural breaks only, 1 + dictionary, 2 + letter fallback, 3 + graphemes
  function greedy(P, fits, level, keep) {
    var G = P.G, n = P.n, lines = [], kinds = [], ls = -1, le = -1, i, k;
    function txt(a, b, hy) { return G.slice(a, b).join('') + (hy ? '-' : ''); }
    function fit(a, b, hy) { return fits(txt(a, b, hy), a === 0, b === n && !hy); }
    function push(a, b, hy, kind) { lines.push(txt(a, b, hy)); kinds.push(kind); }
    function lets(x, y) { var c = 0; for (var q = x; q < y; q++) if (LETTER.test(G[q])) c++; return c; } // a piece between two inner breaks keeps 4+ letters too
    function close(nextStart) { push(ls, le, false, G[le] === ' ' && nextStart === le + 1 ? 's' : 'h'); ls = -1; }
    var words = [], a = 0; for (i = 0; i <= n; i++) if (i === n || G[i] === ' ') { if (i > a) words.push([a, i]); a = i + 1; }
    var hpos = {}; P.nat.forEach(function (b) { if (b.kind === 'h') hpos[b.pos] = 1; });
    for (var w = 0; w < words.length; w++) { var ws = words[w][0], we = words[w][1];
      if (ls >= 0 && fit(ls, we)) { le = we; continue; }
      if (fit(ws, we)) { if (ls >= 0) close(ws); ls = ws; le = we; continue; }
      // the word can't fit a line by itself: its own hyphens, greedily
      var cuts = [ws]; for (k = ws + 1; k < we; k++) if (hpos[k]) cuts.push(k); cuts.push(we);
      for (var c = 0; c + 1 < cuts.length; c++) { var ps = cuts[c], pe = cuts[c + 1];
        if (ls >= 0 && fit(ls, pe)) { le = pe; continue; }
        if (fit(ps, pe)) { if (ls >= 0) close(ps); ls = ps; le = pe; continue; }
        if (!level || (keep && keep[ps])) return null; // keep: QA local-ad96660 L16, a segment that fits whole at the floor is never broken inside
        // a hyphen segment that can't fit a line by itself: break inside, greedily at the latest allowed point that fits
        var sg = null; P.segs.forEach(function (x) { if (x.s === ps) sg = x; }); if (!sg) return null;
        var pts = []; for (k = 0; k < level; k++) pts = pts.concat(sg.t[k]); pts.sort(function (x, y) { return x.pos - y.pos; });
        var pos = ps;
        for (;;) { var st = ls >= 0 ? ls : pos;
          if (fit(st, pe)) { ls = st; le = pe; break; }
          var best = null; for (k = pts.length - 1; k >= 0; k--) if (pts[k].pos > pos && pts[k].pos < pe && (pts[k].kind === 'g' || pts[k].kind === 'c' || lets(pos, pts[k].pos) >= MINF) && fit(st, pts[k].pos, pts[k].hy)) { best = pts[k]; break; }
          if (best) { push(st, best.pos, best.hy, best.kind); ls = -1; pos = best.pos; continue; }
          if (ls >= 0) { close(pos); continue; }
          return null; } } }
    if (ls >= 0) { lines.push(txt(ls, le, false)); }
    return lines.length ? { lines: lines, kinds: kinds } : null;
  }
  // o: { sizes: [desc px], measure(str, first, last) -> {w, marks, hang} at o.R px, R, avail (px or fn(size)), full, ok(size, lines)? }
  // A line must fit the content box with its marks counted, and with the marks hung it must stay inside the tile padding.
  function plan(inner, o) {
    var P = parse(inner), cache = {}, ok = o.ok || function () { return true; }, i, L;
    function mz(s, f, l) { var key = (f ? 1 : 0) + (l ? 2 : 0) + s; return cache[key] || (cache[key] = o.measure(s, f, l)); }
    function fitsAt(size) { var r = size / o.R, av = typeof o.avail === 'function' ? o.avail(size) : o.avail; return function (s, f, l) { var m = mz(s, f, l); return (m.w + (m.marks || 0)) * r <= av - 1 && (m.w + m.hang) * r <= o.full - 1; }; }
    function done(size, res, level) { return { size: size, lines: res.lines, kinds: res.kinds, level: level, broken: res.kinds.some(function (k) { return k === 'd' || k === 'f' || k === 'g' || k === 'c'; }) }; }
    var memo = {}; function at(L, i) { var key = L + ':' + i; if (!(key in memo)) { var r = greedy(P, fitsAt(o.sizes[i]), L); memo[key] = r && ok(o.sizes[i], r.lines) ? r : null; } return memo[key]; }
    if (P.G.indexOf(' ') < 0) { // single word: fewest pieces first, then the largest size, then the lowest break tier
      var most = 0; for (L = 0; L <= 3; L++) for (i = 0; i < o.sizes.length; i++) { var q = at(L, i); if (q && q.lines.length > most) most = q.lines.length; }
      // QA local-2304261 L14 (Creative 08:25): each tier's largest size for k pieces is found on the grid, then binary-searched
      // between its last passing and first failing step to STEP px (capped at the normal size); fewest pieces, then the
      // largest of those true sizes, then the lowest tier within 10% of it
      var best = function (L, k) { for (var g = 0; g < o.sizes.length; g++) { var r0 = at(L, g); if (r0 && r0.lines.length <= k) break; } if (g === o.sizes.length) return null;
        var lo = o.sizes[g], res = at(L, g), hi = g ? o.sizes[g - 1] : lo;
        while (hi - lo > STEP) { var mid = (lo + hi) / 2, rm = greedy(P, fitsAt(mid), L); if (rm && rm.lines.length <= k && ok(mid, rm.lines)) { lo = mid; res = rm; } else hi = mid; }
        return { size: Math.floor(lo * 100) / 100, res: res }; };
      for (var k = 1; k <= most; k++) { var cand = [], top = -1; for (L = 0; L <= 3; L++) { cand[L] = best(L, k); if (cand[L] && cand[L].size > top) top = cand[L].size; }
        if (top < 0) continue;
        for (L = 0; L <= 3; L++) if (cand[L] && cand[L].size >= NEAR * top - 0.001) return done(cand[L].size, cand[L].res, L); } }
    var old = null; for (L = 0; L <= 3 && !old; L++) for (i = 0; i < o.sizes.length; i++) { var r = at(L, i); if (r) { old = done(o.sizes[i], r, L); break; } }
    // QA local-ad96660 L16 (PM, Creative L13 order), multi-word only: fewest pieces first (a piece is a word, or a part of one
    // where a line ends without a space), then the largest size, then the lowest tier within 10%. A segment that fits a line
    // by itself at the floor is kept whole (no "choco- / late" when "chocolate" fits at 27.62px). The greedy layout above is
    // kept, byte for byte, whenever no layout with fewer pieces fits at the floor.
    if (old && P.G.indexOf(' ') >= 0 && old.level) {
      var pcs = function (res) { return res.kinds.filter(function (k) { return k !== 's'; }).length; }, fl = fitsAt(o.sizes[o.sizes.length - 1]), keep = {}, mk = {};
      P.segs.forEach(function (x) { if (fl(P.G.slice(x.s, x.e).join(''), x.s === 0, x.e === P.n)) keep[x.s] = 1; });
      var atK = function (L, i) { var key = L + ':' + i; if (!(key in mk)) { var r = greedy(P, fitsAt(o.sizes[i]), L, keep); mk[key] = r && ok(o.sizes[i], r.lines) ? r : null; } return mk[key]; };
      var least = pcs(old); for (L = 1; L <= 3; L++) for (i = 0; i < o.sizes.length; i++) { var rk = atK(L, i); if (rk && pcs(rk) < least) least = pcs(rk); }
      if (least < pcs(old)) {
        var bestM = function (L, kp) { var get = kp ? atK : at; for (var g = 0; g < o.sizes.length; g++) { var r0 = get(L, g); if (r0 && pcs(r0) <= least) break; } if (g === o.sizes.length) return null;
          var lo = o.sizes[g], res = get(L, g), hi = g ? o.sizes[g - 1] : lo;
          while (hi - lo > STEP) { var mid = (lo + hi) / 2, rm = greedy(P, fitsAt(mid), L, kp ? keep : null); if (rm && pcs(rm) <= least && ok(mid, rm.lines)) { lo = mid; res = rm; } else hi = mid; }
          return { size: Math.floor(lo * 100) / 100, res: res }; };
        var cm = [], tm = -1; for (L = 1; L <= 3; L++) { var u = bestM(L, false), v = bestM(L, true); cm[L] = !u ? v : !v ? u : v.size >= u.size ? v : u; if (cm[L] && cm[L].size > tm) tm = cm[L].size; }
        for (L = 1; L <= 3; L++) if (cm[L] && cm[L].size >= NEAR * tm - 0.001) return done(cm[L].size, cm[L].res, L); } }
    if (old) return old;
    var last = o.sizes[o.sizes.length - 1]; return { size: last, lines: [P.G.join('')], kinds: [], level: 4, broken: false, overflow: true };
  }
  function sizes(base, floor) { var out = [], s = base; while (s > floor + 0.01) { out.push(Math.round(s * 100) / 100); s -= 2; } out.push(floor); return out; }
  return { hyphenate: hyphenate, graphemes: graphemes, parse: parse, greedy: greedy, plan: plan, sizes: sizes, MINF: MINF };
});
