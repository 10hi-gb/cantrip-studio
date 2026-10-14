'use strict';
// C050 A Plant From This — deterministic invented plant from words (seeded, local). Versioned payload: ["p1", phrase, note].
var PL = (function (L) {
  var PMAX = 60, NMAX = 80, FRAG = 800, VER = 'p1';
  function norm(p) { return L.clean(p, PMAX).normalize('NFC'); }
  function key(p) { return norm(p).toLowerCase(); } // growth ignores case; display keeps it
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function h32(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
  // Features come from the actual words, so changing a word changes the form, not just the noise.
  function features(p) {
    var k = key(p), words = k.split(/[\s\-–—]+/).filter(Boolean), letters = Array.from(k.replace(/[^\p{L}\p{N}]/gu, ''));
    var vowels = letters.filter(function (c) { return /[aeiouyàáâäãåæèéêëìíîïòóôöõøùúûü]/.test(c); }).length;
    var avg = words.length ? letters.length / words.length : 0;
    return {
      words: words, n: Math.max(1, Math.min(9, words.length)),
      depth: Math.max(3, Math.min(6, 2 + Math.ceil(words.length / 2))),
      round: letters.length ? vowels / letters.length : .4,           // vowel-rich -> rounder leaves
      reach: Math.max(.7, Math.min(1.25, .6 + avg / 9)),             // long words -> longer internodes
      lean: ((h32(words[0] || '') % 21) - 10) / 100,                   // first word sets the lean
      flowers: words.filter(function (w) { return /[aeiouy]$/.test(w); }).length, // words ending in a vowel bloom
      hue: h32(words[words.length - 1] || k) % 360                    // last word sets flower hue
    };
  }
  function grow(p) {
    var F = features(p), r = rng(h32(VER + '|' + key(p))), stems = [], leaves = [], flowers = [], branches = 0;
    function branch(x, y, a, len, d, delay) {
      var bend = (r() - .5) * .5, ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len, cx = x + Math.sin(a + bend) * len * .55, cy = y - Math.cos(a + bend) * len * .55;
      stems.push({ d: 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1), w: Math.max(.6, d * .75), l: Math.round(len * 1.15), delay: delay });
      branches++;
      if (d <= 1 || len < 9 || stems.length > 140) { leaves.push({ x: ex, y: ey, a: a, s: 4 + r() * 4, delay: delay + 500 }); return; }
      var kids = 1 + (r() < .55 + F.n / 30 ? 1 : 0) + (d > 3 && r() < F.n / 12 ? 1 : 0), spread = .35 + r() * .45;
      for (var i = 0; i < kids; i++) {
        var t = kids === 1 ? 0 : i / (kids - 1) - .5, na = a + t * spread * 2 + (r() - .5) * .25 + F.lean * .4;
        branch(ex, ey, na, len * (.68 + r() * .14) * F.reach, d - 1, delay + 260);
      }
      if (r() < .7) { var side = r() < .5 ? -1 : 1, mx = (x + ex) / 2, my = (y + ey) / 2; leaves.push({ x: mx, y: my, a: a + side * (1 + r() * .5), s: 5 + r() * 5, delay: delay + 300 }); }
    }
    branch(150, 365, F.lean, 66 * F.reach, F.depth, 0);
    // choose bloom tips deterministically from leaf tips
    var tips = leaves.slice().sort(function (a, b) { return a.y - b.y; }), nf = Math.min(tips.length, F.flowers + (F.flowers ? 0 : (r() < .5 ? 1 : 0)));
    for (var j = 0; j < nf; j++) { var t = tips[Math.floor(j * tips.length / Math.max(1, nf))]; flowers.push({ x: t.x, y: t.y, petals: 4 + (F.words[j % F.words.length] || 'x').length % 5, s: 5 + r() * 4, delay: t.delay + 300 }); }
    return { F: F, stems: stems, leaves: leaves, flowers: flowers, branches: branches, code: (h32(VER + key(p)) % 9000 + 1000).toString() };
  }
  function leafPath(l, round) { var w = l.s * (.35 + round * .8), h = l.s * 2.1; return 'M0 0 C' + (-w).toFixed(1) + ' ' + (-h * .35).toFixed(1) + ' ' + (-w * .6).toFixed(1) + ' ' + (-h * .85).toFixed(1) + ' 0 ' + (-h).toFixed(1) + ' C' + (w * .6).toFixed(1) + ' ' + (-h * .85).toFixed(1) + ' ' + w.toFixed(1) + ' ' + (-h * .35).toFixed(1) + ' 0 0Z'; }
  function encode(p, n) { return L.seal([VER, norm(p), L.clean(n, NMAX)]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a || a.length !== 3 || a[0] !== VER) return null; var p = norm(a[1]), n = L.clean(a[2], NMAX); if (!p || p !== a[1] || n !== a[2]) return null; return { phrase: p, note: n }; }
  return { PMAX: PMAX, NMAX: NMAX, FRAG: FRAG, norm: norm, features: features, grow: grow, leafPath: leafPath, encode: encode, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = PL;

if (typeof document !== 'undefined') (function () {
  var $ = L.$, NS = 'http://www.w3.org/2000/svg'; L.bind(); L.chrome();
  var cur = null, timer = 0;
  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }
  function draw(phrase, animate) {
    var G = PL.grow(phrase), svg = $('svg'); svg.textContent = ''; svg.classList.toggle('pv-grow', !!animate && !L.reduce);
    var hue = G.F.hue, g = el('g', {});
    G.stems.forEach(function (s) { var p = el('path', { d: s.d, class: 'pv-stem', 'stroke-width': s.w.toFixed(2) }); p.style.setProperty('--l', s.l); p.style.setProperty('--d', Math.round(s.delay * .9) + 'ms'); g.appendChild(p); });
    G.leaves.forEach(function (l, i) { var p = el('path', { d: PL.leafPath(l, G.F.round), class: 'pv-leaf', transform: 'translate(' + l.x.toFixed(1) + ' ' + l.y.toFixed(1) + ') rotate(' + (l.a * 57.3).toFixed(0) + ')', fill: 'hsla(' + (118 + (i * 7) % 34) + ',34%,' + (30 + (i * 13) % 20) + '%,.8)' }); p.style.setProperty('--d', Math.round(l.delay * .9) + 'ms'); g.appendChild(p); });
    G.flowers.forEach(function (f) { var fg = el('g', { class: 'pv-flower', transform: 'translate(' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ')' }); fg.style.setProperty('--d', Math.round(f.delay * .9) + 'ms');
      for (var i = 0; i < f.petals; i++) fg.appendChild(el('ellipse', { cx: 0, cy: -f.s * .6, rx: f.s * .38, ry: f.s * .7, transform: 'rotate(' + (360 / f.petals * i).toFixed(0) + ')', fill: 'hsla(' + ((hue % 60) + 5) + ',72%,64%,.85)' }));
      fg.appendChild(el('circle', { r: f.s * .25, fill: '#E9B949' })); g.appendChild(fg); });
    svg.appendChild(g);
    svg.setAttribute('aria-label', L.fill(COPY.plantAlt, { phrase: phrase }));
    $('caption').textContent = L.fill(COPY.grownCaption, { phrase: phrase }); $('label').hidden = false;
    clearTimeout(timer); if (animate && !L.reduce) { $('status').textContent = COPY.growing; timer = setTimeout(function () { $('status').textContent = ''; }, 2400); } else $('status').textContent = '';
    return G;
  }
  function over(id, max) { return L.len(L.clean($(id).value)) - max; }
  function check() {
    var po = over('phrase', PL.PMAX), no = over('note', PL.NMAX);
    $('pmsg').textContent = po > 0 ? L.plural(COPY.phraseTooLong, po) : ''; $('nmsg').textContent = no > 0 ? L.plural(COPY.noteTooLong, no) : '';
    return po <= 0 && no <= 0;
  }
  function showMade(on) { $('share').hidden = !on; $('save').hidden = !on; $('regrow').hidden = !on; }
  ['phrase', 'note'].forEach(function (id) { $(id).addEventListener('input', function () { check(); showMade(false); $('linkbox').hidden = true; }); });
  $('phrase').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('grow').click(); });
  $('grow').onclick = function () {
    if (!check()) return; var p = PL.norm($('phrase').value); if (!p) { $('pmsg').textContent = COPY.phraseEmpty; $('phrase').focus(); return; }
    cur = { phrase: p, note: L.clean($('note').value, PL.NMAX) };
    if (PL.encode(cur.phrase, cur.note).length > PL.FRAG) { $('pmsg').textContent = COPY.tooLongLink; return; }
    draw(p, true); showMade(true);
  };
  $('regrow').onclick = function () { showMade(false); $('phrase').focus(); $('phrase').select(); };
  $('share').onclick = function () { if (cur) L.share(L.link(PL.encode(cur.phrase, cur.note)), COPY.title, COPY.shareText); };
  // Local deliberate export: SVG -> canvas -> PNG download, made on this device.
  function save() {
    try {
      var svg = $('svg'), W = 1000, H = 1400, xml = new XMLSerializer().serializeToString(svg).replace('<svg', '<svg width="' + W + '" height="' + H + '"').replace(/class="pv-stem"/g, 'class="pv-stem" stroke="#24513A" fill="none" stroke-linecap="round"');
      var img = new Image(); img.onload = function () {
        var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
        var gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#FFFBEF'); gr.addColorStop(1, '#F4F1E6'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        x.strokeStyle = 'rgba(90,70,48,.45)'; x.beginPath(); x.moveTo(120, H * .87); x.lineTo(W - 120, H * .87); x.stroke();
        x.drawImage(img, 0, 0, W, H);
        x.fillStyle = '#5A4630'; x.font = 'italic 300 34px Spectral, Georgia, serif'; x.fillText($('caption').textContent.slice(0, 70), 70, H - 60);
        x.font = '500 18px Jost, sans-serif'; x.fillStyle = '#3F7D4E'; x.fillText(COPY.studioLabel.toUpperCase(), 70, 70);
        c.toBlob(function (b) { if (!b) return L.toast(COPY.saveFail); var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'a-plant-from-this.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); L.toast(COPY.saved); }, 'image/png');
      }; img.onerror = function () { L.toast(COPY.saveFail); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    } catch (e) { L.toast(COPY.saveFail); }
  }
  $('save').onclick = save; $('save2').onclick = save;
  $('back').onclick = function () { L.clearHash(); $('recv').hidden = true; $('maker').hidden = false; $('lede').textContent = COPY.invitation; $('phrase').value = ''; $('note').value = ''; $('svg').textContent = ''; $('label').hidden = true; showMade(false); $('phrase').focus(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = PL.decode(h);
    if (r) {
      $('maker').hidden = true; $('recv').hidden = false; $('lede').textContent = COPY.receiverIntro;
      if (r.note) { $('rnote').textContent = r.note; $('rnote').hidden = false; }
      $('see').onclick = function () { draw(r.phrase, true); $('see').hidden = true; $('save2').hidden = false; };
    } else { var raw = L.unseal(h, PL.FRAG); $('lede').textContent = raw && /^p\d+$/.test(raw[0]) && raw[0] !== 'p1' ? COPY.oldVersion : COPY.badLink; }
  }
})();
