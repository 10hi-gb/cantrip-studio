'use strict';
// C102 Fogged Over — drawing travels as simplified, capped polylines in the fragment: ["f1", "aabb ccdd.eeff…"] (2 hex chars per axis, 0..255 grid, normalized to the 4:3 box).
var FO = (function (L) {
  var MAX = 300, MAXLINES = 120, RAWMAX = 6000, FRAG = 2400, Q = 255, VER = 'f1';
  function q(v) { return Math.max(0, Math.min(Q, Math.round(v * Q))); }
  function p2(n) { var s = n.toString(16); return s.length < 2 ? '0' + s : s; }
  function count(lines) { return lines.reduce(function (a, l) { return a + l.length; }, 0); }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy, mi = 0, md = -1;
    for (var i = 1; i < pts.length - 1; i++) { var p = pts[i], t = d2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d2 : 0; t = Math.max(0, Math.min(1, t));
      var ex = a[0] + t * dx - p[0], ey = a[1] + t * dy - p[1], d = ex * ex + ey * ey; if (d > md) { md = d; mi = i; } }
    if (Math.sqrt(md) <= eps) return [a, b];
    return rdp(pts.slice(0, mi + 1), eps).slice(0, -1).concat(rdp(pts.slice(mi), eps));
  }
  // Quantize, then simplify with a growing tolerance until it fits. Every stroke survives (min 2 points each).
  function simplify(lines) {
    var qd = lines.map(function (l) { var o = []; l.forEach(function (p) { var r = [q(p[0]) / Q, q(p[1]) / Q], z = o[o.length - 1]; if (!z || z[0] !== r[0] || z[1] !== r[1]) o.push(r); }); if (o.length === 1) o.push(o[0]); return o; });
    var eps = .0015, out = qd.map(function (l) { return rdp(l, eps); }), changed = false;
    while (count(out) > MAX && eps < 2) { eps *= 1.35; out = qd.map(function (l) { return rdp(l, eps); }); changed = true; }
    return { lines: out, simplified: changed, ok: count(out) <= MAX };
  }
  function enc(lines) { return lines.map(function (l) { return l.map(function (p) { return p2(q(p[0])) + p2(q(p[1])); }).join(''); }).join('.'); }
  function encode(lines) { return L.seal([VER, enc(lines)]); }
  function decode(f) {
    var a = L.unseal(f, FRAG); if (!a || a.length !== 2 || a[0] !== VER || !/^([0-9a-f]{4})+(\.([0-9a-f]{4})+)*$/.test(a[1])) return null;
    var lines = a[1].split('.').map(function (s) { var o = []; for (var i = 0; i < s.length; i += 4) { var x = parseInt(s.substr(i, 2), 16), y = parseInt(s.substr(i + 2, 2), 16); if (x > Q || y > Q) return null; o.push([x / Q, y / Q]); } return o; });
    if (lines.some(function (l) { return !l || l.length < 2; }) || count(lines) > MAX || lines.length > MAXLINES) return null;
    return lines;
  }
  return { MAX: MAX, MAXLINES: MAXLINES, RAWMAX: RAWMAX, count: count, simplify: simplify, encode: encode, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = FO;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var pane = $('pane'), fog = $('fog'), ghost = $('ghost'), cur = $('cur');
  var lines = [], mode = 'make', wipe = [], sent = null, creepT = 0, creepSaid = false, kb = { x: .5, y: .5, down: false };
  var STAMPS = { heart: [[[.5, .8], [.2, .5], [.18, .3], [.3, .18], [.42, .2], [.5, .32], [.58, .2], [.7, .18], [.82, .3], [.8, .5], [.5, .8]]],
    smile: [[[.5, .1], [.78, .22], [.9, .5], [.78, .78], [.5, .9], [.22, .78], [.1, .5], [.22, .22], [.5, .1]], [[.36, .38], [.36, .42]], [[.64, .38], [.64, .42]], [[.3, .58], [.5, .72], [.7, .58]]],
    star: [[[.5, .08], [.62, .38], [.92, .38], [.68, .58], [.78, .9], [.5, .7], [.22, .9], [.32, .58], [.08, .38], [.38, .38], [.5, .08]]],
    hi: [[[.2, .15], [.2, .85]], [[.2, .5], [.55, .5]], [[.55, .15], [.55, .85]], [[.8, .4], [.8, .85]], [[.8, .2], [.8, .24]]],
    arrow: [[[.1, .5], [.88, .5]], [[.62, .25], [.88, .5], [.62, .75]]],
    wave: [[[.06, .55], [.2, .35], [.35, .55], [.5, .35], [.65, .55], [.8, .35], [.94, .55]]] };
  function sw() { return Math.max(14, pane.getBoundingClientRect().width * .022); }
  // Creative fog.js foMask(el, lines, width) builds the SVG mask; throttled to rAF, and re-run on resize.
  var raf = 0; function paint() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0;
    if (mode === 'make') foMask(fog, lines, sw()); else { foMask(ghost, sent, sw()); foMask(fog, wipe, 48); } }); }
  function meter() { var n = FO.count(lines); $('meter').textContent = n ? L.fill(n === 1 ? COPY.pointCount.one : COPY.pointCount.other, { n: n, max: FO.MAX }) : ''; }
  function msg(t) { $('msg').textContent = t || ''; }
  function full() { return FO.count(lines) >= FO.RAWMAX || lines.length >= FO.MAXLINES; }
  // ---- drawing (pointer) ----
  function pt(e) { var r = pane.getBoundingClientRect(); return [Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))]; }
  var drawing = null;
  pane.addEventListener('pointerdown', function (e) {
    if (mode === 'make') { if (full()) return msg(COPY.tooBigHard); drawing = [pt(e)]; lines.push(drawing); }
    else { if (fog.classList.contains('is-gone')) return; drawing = [pt(e)]; wipe.push(drawing); clearTimeout(creepT); }
    pane.setPointerCapture(e.pointerId); $('linkbox').hidden = true; paint(); meter();
  });
  pane.addEventListener('pointermove', function (e) { if (!drawing) return; if (mode === 'make' && FO.count(lines) >= FO.RAWMAX) { drawing = null; return msg(COPY.tooBigHard); } drawing.push(pt(e)); paint(); if (mode === 'make') meter(); });
  function up() { if (!drawing) return; if (drawing.length === 1) drawing.push(drawing[0]); drawing = null; if (mode === 'make') { msg(''); meter(); } else creep(); }
  pane.addEventListener('pointerup', up); pane.addEventListener('pointercancel', up);
  // ---- fog creeps back after wiping ----
  function creep() { clearTimeout(creepT); creepT = setTimeout(function step() { if (!wipe.length || fog.classList.contains('is-gone')) return;
      if (!creepSaid) { creepSaid = true; msg(COPY.fogReturning); } wipe.shift(); paint(); creepT = setTimeout(step, 700); }, 3500); }
  // ---- keyboard drawing (maker) ----
  function placeCur() { cur.hidden = mode !== 'make'; cur.style.setProperty('left', (kb.x * 100) + '%'); cur.style.setProperty('top', (kb.y * 100) + '%'); cur.classList.toggle('is-down', kb.down); }
  pane.addEventListener('keydown', function (e) {
    if (mode !== 'make') return; var s = e.shiftKey ? .06 : .02, m = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
    if (m) { e.preventDefault(); kb.x = Math.max(0, Math.min(1, kb.x + m[0])); kb.y = Math.max(0, Math.min(1, kb.y + m[1]));
      if (kb.down) { var l = lines[lines.length - 1]; if (FO.count(lines) >= FO.RAWMAX) { msg(COPY.tooBigHard); } else l.push([kb.x, kb.y]); } placeCur(); paint(); meter(); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!kb.down) { if (full()) return msg(COPY.tooBigHard); lines.push([[kb.x, kb.y], [kb.x, kb.y]]); } kb.down = !kb.down; placeCur(); paint(); meter(); }
  });
  pane.addEventListener('focus', function () { if (mode === 'make') placeCur(); }); pane.addEventListener('blur', function () { cur.hidden = true; kb.down = false; });
  // ---- stamps ----
  Object.keys(STAMPS).forEach(function (k) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fo-stamp'; b.setAttribute('aria-label', COPY.stamps[k]);
    var NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'); sv.setAttribute('viewBox', '0 0 1 1'); sv.setAttribute('aria-hidden', 'true');
    STAMPS[k].forEach(function (l) { var p = document.createElementNS(NS, 'polyline'); p.setAttribute('points', l.map(function (x) { return x.join(','); }).join(' ')); p.setAttribute('stroke-width', '.09'); sv.appendChild(p); });
    b.appendChild(sv);
    b.onclick = function () { if (lines.length + STAMPS[k].length > FO.MAXLINES) return msg(COPY.tooBigHard);
      var r = pane.getBoundingClientRect(), sz = .26, sx = sz * Math.min(1, r.height / r.width), sy = sz * Math.min(1, r.width / r.height), cx = Math.max(sx / 2, Math.min(1 - sx / 2, kb.x)), cy = Math.max(sy / 2, Math.min(1 - sy / 2, kb.y));
      STAMPS[k].forEach(function (l) { lines.push(l.map(function (p) { return [cx + (p[0] - .5) * sx, cy + (p[1] - .5) * sy]; })); }); msg(''); paint(); meter(); };
    $('stamps').appendChild(b);
  });
  $('undo').onclick = function () { lines.pop(); msg(''); paint(); meter(); };
  $('clear').onclick = function () { lines = []; msg(''); paint(); meter(); };
  // ---- preview / share ----
  function prepare() {
    if (!lines.length) { msg(COPY.empty); return null; }
    var s = FO.simplify(lines); if (!s.ok) { msg(COPY.tooBigHard); return null; }
    var oversized = FO.count(lines) > FO.MAX;
    lines = s.lines; // quantized + simplified: what you see from here on is exactly what is sent
    return { lines: s.lines, simplified: oversized, ok: true };
  }
  function setMode(m) { mode = m; pane.classList.toggle('is-maker', m === 'make'); $('acts-make').hidden = m !== 'make'; $('acts-prev').hidden = m !== 'prev'; $('acts-recv').hidden = m !== 'recv';
    $('stamps').hidden = m !== 'make'; $('meter').hidden = m !== 'make'; fog.classList.remove('is-gone'); wipe = []; creepSaid = false; clearTimeout(creepT);
    pane.setAttribute('role', m === 'make' ? 'application' : 'img'); pane.setAttribute('aria-label', m === 'make' ? COPY.drawHint + ' ' + COPY.keyboardHint : COPY.wipeHint);
    $('hint').textContent = m === 'make' ? COPY.drawHint + ' ' + COPY.keyboardHint : m === 'prev' ? COPY.previewHint : COPY.wipeHint; placeCur(); paint(); }
  function openPreview() { var s = prepare(); if (!s) return; sent = lines.map(function (l) { return l.slice(); }); setMode('prev'); $('lede').textContent = COPY.preview; msg(s.simplified ? COPY.tooBig : ''); }
  $('prev').onclick = openPreview;
  $('go').onclick = function () { var s = prepare(); if (!s) return; if (s.simplified) { openPreview(); return; } L.share(L.link(FO.encode(lines)), COPY.title, COPY.shareText); };
  $('share').onclick = function () { L.share(L.link(FO.encode(sent)), COPY.title, COPY.shareText); };
  $('back').onclick = function () { setMode('make'); $('lede').textContent = COPY.invitation; msg(''); meter(); };
  function reveal() { fog.classList.add('is-gone'); clearTimeout(creepT); msg(COPY.revealed); pane.setAttribute('aria-label', COPY.drawingAlt); }
  $('reveal').onclick = reveal; $('reveal1').onclick = reveal;
  $('again').onclick = function () { L.clearHash(); lines = []; setMode('make'); $('lede').textContent = COPY.invitation; msg(''); meter(); };
  window.addEventListener('resize', paint);
  var h = location.hash;
  setMode('make');
  if (h && h !== '#') { var r = FO.decode(h); if (r) { sent = r; setMode('recv'); $('lede').textContent = COPY.receiverIntro; } else { $('lede').textContent = COPY.badLink; } }
})();
