'use strict';
// C095 Taste Like This — three axes (sweet/salt/heat, 0–3) + optional dish: ["t1", "s a h", dish] sealed in the fragment.
var TT = (function (L) {
  var DMAX = 40, FRAG = 300, AX = ['sweet', 'salt', 'heat'], ANG = { sweet: -90, salt: 30, heat: 150 }, CX = 200, CY = 205, R = 150;
  function encode(v, dish) { return L.seal(['t1', AX.map(function (a) { return v[a]; }).join(''), L.clean(dish, DMAX)]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a || a.length !== 3 || a[0] !== 't1' || !/^[0-3]{3}$/.test(a[1])) return null;
    var d = L.clean(a[2], DMAX); if (d !== a[2]) return null; var v = {}; AX.forEach(function (k, i) { v[k] = +a[1][i]; }); return { v: v, dish: d }; }
  function pt(a, val) { var t = ANG[a] * Math.PI / 180, r = R * val / 3; return [CX + r * Math.cos(t), CY + r * Math.sin(t)]; }
  function f(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
  function mid(p, q) { return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; }
  function lobes(v) { var P = AX.map(function (a) { return pt(a, v[a]); }), C = [CX, CY];
    return AX.map(function (a, i) { var p = P[i], pr = P[(i + 2) % 3], nx = P[(i + 1) % 3]; return 'M' + f(C) + ' L' + f(mid(p, pr)) + ' L' + f(p) + ' L' + f(mid(p, nx)) + 'Z'; }); }
  function rim(v) { return 'M' + AX.map(function (a) { return f(pt(a, v[a])); }).join(' L') + 'Z'; }
  return { FRAG: FRAG, AX: AX, DMAX: DMAX, ANG: ANG, CX: CX, CY: CY, R: R, encode: encode, decode: decode, pt: pt, lobes: lobes, rim: rim };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = TT;

if (typeof document !== 'undefined') (function () {
  var $ = L.$, NS = 'http://www.w3.org/2000/svg'; L.bind(); L.chrome();
  var v = { sweet: 1, salt: 1, heat: 1 }, theirs = null, theirDish = '', svg = $('shape');
  function el(n, a, t) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }
  // static frame: axes, ticks with numbers, axis labels (text from COPY)
  var frame = el('g', {}), lob = el('g', {}), dyn = el('g', {});
  TT.AX.forEach(function (a) { var e = TT.pt(a, 3.25); frame.appendChild(el('line', { class: 'axis', x1: TT.CX, y1: TT.CY, x2: e[0].toFixed(1), y2: e[1].toFixed(1) }));
    for (var n = 1; n <= 3; n++) { var p = TT.pt(a, n), t = (TT.ANG[a] + 90) * Math.PI / 180; frame.appendChild(el('line', { class: 'tick', x1: (p[0] - 5 * Math.cos(t)).toFixed(1), y1: (p[1] - 5 * Math.sin(t)).toFixed(1), x2: (p[0] + 5 * Math.cos(t)).toFixed(1), y2: (p[1] + 5 * Math.sin(t)).toFixed(1) }));
      frame.appendChild(el('text', { class: 'num', x: (p[0] + 9 * Math.cos(t)).toFixed(1), y: (p[1] + 9 * Math.sin(t) + 3).toFixed(1), 'text-anchor': 'middle' }, String(n))); } });
  svg.appendChild(frame); svg.appendChild(lob); svg.appendChild(dyn);
  var lobeEls = TT.AX.map(function (a) { var p = el('path', { class: 'lobe lobe--' + a }); lob.appendChild(p); return p; });
  var rimEl = el('path', { class: 'rim' }), theirsEl = el('path', { class: 'theirs' }), dot = el('circle', { class: 'dot', cx: TT.CX, cy: TT.CY, r: 4 }); lob.appendChild(rimEl); lob.appendChild(theirsEl); lob.appendChild(dot);
  var labels = {}; TT.AX.forEach(function (a) { var p = TT.pt(a, 3.62), anchor = a === 'sweet' ? 'middle' : a === 'salt' ? 'end' : 'start', dy = a === 'sweet' ? -6 : 22;
    var t = el('text', { class: 'axlabel', x: p[0].toFixed(1), y: (p[1] + dy).toFixed(1), 'text-anchor': anchor }, COPY.axes[a].toUpperCase()); var w = el('text', { class: 'axval', x: p[0].toFixed(1), y: (p[1] + dy + 15).toFixed(1), 'text-anchor': anchor }); dyn.appendChild(t); dyn.appendChild(w); labels[a] = w; });
  // sliders
  var rng = {};
  TT.AX.forEach(function (a) { var w = document.createElement('div'); w.className = 'tt-slider';
    var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = COPY.axes[a]; nm.id = 'nm-' + a;
    var r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = 3; r.step = 1; r.className = 'tt-range tt-range--' + a; r.id = 'r-' + a;
    var lv = document.createElement('span'); lv.className = 'lv'; lv.id = 'lv-' + a;
    r.addEventListener('input', function () { v[a] = +r.value; draw(true); });
    w.appendChild(nm); w.appendChild(r); w.appendChild(lv); $('sliders').appendChild(w); rng[a] = { r: r, lv: lv }; });
  function word(n) { return COPY.levels[n]; }
  var mt = 0;
  function draw(morph) {
    var ls = TT.lobes(v); lobeEls.forEach(function (p, i) { p.setAttribute('d', ls[i]); }); rimEl.setAttribute('d', TT.rim(v));
    if (theirs) theirsEl.setAttribute('d', TT.rim(theirs)); else theirsEl.removeAttribute('d');
    TT.AX.forEach(function (a) { var R = rng[a]; R.r.value = v[a]; var lab = L.fill(COPY.levelAria, { axis: COPY.axes[a], level: word(v[a]), n: v[a] });
      R.r.setAttribute('aria-label', COPY.axes[a]); R.r.setAttribute('aria-valuetext', lab);
      R.lv.textContent = ''; var b = document.createElement('b'); b.textContent = v[a] + ' · ' + word(v[a]); R.lv.appendChild(b);
      labels[a].textContent = (theirs ? theirs[a] + ' / ' : '') + v[a] + ' · ' + word(v[a]); });
    var z = v.sweet + v.salt + v.heat; $('quip').textContent = z === 0 ? COPY.allZero : z === 9 ? COPY.allMax : '';
    var dish = L.clean($('dish').value, TT.DMAX), sv = { sweet: v.sweet, salt: v.salt, heat: v.heat };
    svg.setAttribute('aria-label', dish ? L.fill(COPY.shapeAlt, { dish: dish, sweet: sv.sweet, salt: sv.salt, heat: sv.heat }) : L.fill(COPY.shapeAltNoDish, sv));
    if (morph && !L.reduce) { $('root').classList.remove('is-morphing'); void svg.getBoundingClientRect(); $('root').classList.add('is-morphing'); clearTimeout(mt); mt = setTimeout(function () { $('root').classList.remove('is-morphing'); }, 650); }
    $('linkbox').hidden = true;
  }
  $('dish').addEventListener('input', function () { var o = L.len(L.clean($('dish').value)) - TT.DMAX; $('dmsg').textContent = o > 0 ? L.plural(COPY.dishTooLong, o) : ''; draw(false); });
  $('send').onclick = function () { if (L.len(L.clean($('dish').value)) > TT.DMAX) { $('dish').focus(); return; } L.share(L.link(TT.encode(v, $('dish').value)), COPY.title, COPY.shareText); };
  function showTheirs() { $('lede').textContent = L.fill(COPY.receiverIntro, { dishSuffix: theirDish ? L.fill(COPY.dishSuffix, { dish: theirDish }) : '' });
    $('menu').hidden = !theirDish; $('dishShow').textContent = theirDish; }
  $('mine').onclick = function () { // compare: theirs dashed, yours filled
    $('mine').hidden = true; $('send').hidden = false; $('sliders').hidden = false; $('legendText').hidden = false; $('dishf').hidden = false; draw(true); rng.sweet.r.focus(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = TT.decode(h);
    if (r) { theirs = r.v; theirDish = r.dish; v = { sweet: r.v.sweet, salt: r.v.salt, heat: r.v.heat }; showTheirs(); $('dish').value = r.dish; $('send').hidden = true; $('mine').hidden = false; $('sliders').hidden = true; $('dishf').hidden = true; }
    else $('lede').textContent = COPY.badLink;
  }
  draw(false);
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
