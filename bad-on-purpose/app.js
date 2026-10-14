'use strict';
// Bad on Purpose. COPY comes verbatim from copy.js (Writing Bot). All state in memory: no storage, no network.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var PIG = [['black', '#1b1a17'], ['red', '#c8322b'], ['blue', '#2a5db0'], ['yellow', '#e8b923'], ['brown', '#7a4b2a'], ['white', '#ffffff']];
  var cv = $('cv'), ctx = cv && cv.getContext && cv.getContext('2d');
  var strokes = [], cur = null, t0 = 0, tEnd = 0, ai = -1, timer = null, pig = 0, lastP = null;
  var kb = { x: 400, y: 300, down: false };

  function fill(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }
  function show(id) { ['s-home', 's-draw', 's-hung', 's-tour'].forEach(function (x) { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }

  function metrics(ss, dur) {
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9, cols = [];
    ss.forEach(function (s) { if (cols.indexOf(s.c) < 0) cols.push(s.c); s.p.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }); });
    var cover = ss.length ? Math.max(0, (maxx - minx) * (maxy - miny)) / (800 * 600) : 0;
    return { strokes: ss.length, seconds: Math.max(1, Math.round(dur / 1000)), coverage: cover, colors: cols.map(function (i) { return PIG[i][0]; }) };
  }
  function test(when, m) {
    if (when === 'default') return true;
    var r = /^(\w+)\s*(<=|>=|<|>)\s*([\d.]+)$/.exec(when); if (!r) return false;
    var a = m[r[1]], b = parseFloat(r[3]);
    return r[2] === '<=' ? a <= b : r[2] === '>=' ? a >= b : r[2] === '<' ? a < b : a > b;
  }
  function placard(ss, dur, assignment) {
    var m = metrics(ss, dur);
    var label = null;
    for (var i = 0; i < COPY.labels.length; i++) { if (COPY.labels[i].when !== 'default' && test(COPY.labels[i].when, m)) { label = COPY.labels[i]; break; } }
    if (!label) { var d = COPY.labels.filter(function (l) { return l.when === 'default'; }); label = d[(m.strokes + m.seconds) % d.length]; }
    var v = { assignment: assignment, assignment_lower: assignment.toLowerCase(), strokes: m.strokes, seconds: m.seconds, colors: m.colors.join(', ') };
    var value = (m.strokes * m.seconds * 137500 + 850000);
    v.value = '$' + value.toLocaleString('en-US');
    return { title: assignment, meta: fill(COPY.placard.metaLine, v), medium: m.colors.length > 1 ? COPY.placard.medium.many : COPY.placard.medium.one,
      label: fill(label.text, v), labelId: label.id, insurance: fill(COPY.placard.insurance, v), acq: COPY.placard.acquisition, m: m };
  }
  function renderPlacard(el, P) {
    el.textContent = '';
    var mk = function (tag, cls, txt) { var n = document.createElement(tag); n.className = cls; n.textContent = txt; el.appendChild(n); return n; };
    mk('p', 'title', P.title); mk('p', 'meta', P.meta); if (P.medium) mk('p', 'meta', P.medium); mk('p', 'body', P.label);
    if (P.insurance) { var v = mk('p', 'value', ''); var d = document.createElement('span'); d.className = 'bop-dot'; v.appendChild(d); v.appendChild(document.createTextNode(P.insurance)); }
    if (P.acq) mk('p', 'meta', P.acq);
  }
  function redraw(c, ss, w, h) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = 0.016 * w;
    ss.forEach(function (s) {
      if (!s.p.length) return; c.strokeStyle = PIG[s.c][1]; if (s.c === 5) { c.save(); c.shadowColor = '#999'; c.shadowBlur = 2; }
      c.beginPath(); c.moveTo(s.p[0][0] * w / 800, s.p[0][1] * h / 600);
      if (s.p.length === 1) c.lineTo(s.p[0][0] * w / 800 + 0.1, s.p[0][1] * h / 600);
      for (var i = 1; i < s.p.length; i++) c.lineTo(s.p[i][0] * w / 800, s.p[i][1] * h / 600);
      c.stroke(); if (s.c === 5) c.restore();
    });
  }
  function stats() {
    $('n-strokes').textContent = strokes.length;
    var sec = t0 ? Math.round(((cur ? performance.now() : tEnd) - t0) / 1000) : 0;
    $('n-meta').textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function newAssignment() { var i; do { i = Math.floor(Math.random() * COPY.assignments.length); } while (i === ai && COPY.assignments.length > 1); ai = i; $('assign').textContent = COPY.assignments[i]; }
  function reset() { strokes = []; cur = null; t0 = 0; tEnd = 0; if (ctx) redraw(ctx, strokes, 800, 600); stats(); $('draw-msg').textContent = ''; }
  function startDraw() { if (!ctx) { toast(COPY.canvasFail); return; } newAssignment(); reset(); show('s-draw'); cv.focus({ preventScroll: true }); }
  function pos(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * 800 / r.width), Math.round((e.clientY - r.top) * 600 / r.height)]; }
  function begin(p) { if (!t0) t0 = performance.now(); cur = { c: pig, p: [p] }; strokes.push(cur); redraw(ctx, strokes, 800, 600); $('draw-msg').textContent = ''; if (!timer) timer = setInterval(stats, 500); }
  function extend(p) { if (!cur) return; var q = cur.p[cur.p.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 2) return; if (cur.p.length < 4000) cur.p.push(p); redraw(ctx, strokes, 800, 600); }
  function end() { if (!cur) return; cur = null; tEnd = performance.now(); stats(); }
  if (ctx) {
    cv.addEventListener('pointerdown', function (e) { if (e.button > 0) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} begin(pos(e)); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) { if (cur) extend(pos(e)); });
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('keydown', function (e) {
      var d = e.shiftKey ? 40 : 12, k = e.key;
      if (k === ' ' || k === 'Enter') { e.preventDefault(); if (kb.down) { kb.down = false; end(); } else { kb.down = true; begin([kb.x, kb.y]); } return; }
      var mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[k]; if (!mv) return; e.preventDefault();
      kb.x = Math.max(0, Math.min(800, kb.x + mv[0])); kb.y = Math.max(0, Math.min(600, kb.y + mv[1])); if (kb.down) extend([kb.x, kb.y]);
    });
  }
  function hang() {
    if (!strokes.length) { $('draw-msg').textContent = COPY.emptyCanvas; return; }
    kb.down = false; end(); clearInterval(timer); timer = null;
    try {
      lastP = placard(strokes, tEnd - t0, COPY.assignments[ai]);
      redraw($('cv-hung').getContext('2d'), strokes, 800, 600);
      var pl = $('placard'); pl.textContent = ''; var h = document.createElement('p'); h.className = 'bop-hanging'; h.textContent = COPY.hanging; pl.appendChild(h);
      show('s-hung');
      var fr = $('hung-frame'); [fr, pl, document.body].forEach(function (n) { n.classList.remove('bop-lit', 'is-in', 'settle'); void n.offsetWidth; });
      document.body.classList.add('bop-lit'); fr.classList.add('settle');
      setTimeout(function () { renderPlacard(pl, lastP); pl.classList.add('is-in'); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
    } catch (e) { toast(COPY.error); show('s-draw'); }
  }
  function wrap(g, text, x, y, maxW, lh) { var line = ''; text.split(' ').forEach(function (w) { var t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; }); if (line) { g.fillText(line, x, y); y += lh; } return y; }
  function exportPNG() {
    try {
      var W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
      g.fillStyle = '#ECE8E1'; g.fillRect(0, 0, W, H); g.fillStyle = '#B9AF9F'; g.fillRect(0, 870, W, 130);
      var sp = g.createRadialGradient(560, 380, 40, 560, 380, 620); sp.addColorStop(0, 'rgba(255,250,236,.8)'); sp.addColorStop(1, 'rgba(255,250,236,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, 870);
      g.fillStyle = '#141311'; g.fillRect(120, 120, 880, 680); g.fillStyle = '#FBFAF6'; g.fillRect(140, 140, 840, 640);
      var dc = document.createElement('canvas'); dc.width = 760; dc.height = 570; redraw(dc.getContext('2d'), strokes, 760, 570); g.drawImage(dc, 180, 175);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(1086, 446, 420, 400); g.fillStyle = '#FBFAF6'; g.fillRect(1080, 440, 420, 400);
      g.fillStyle = '#1B1A17'; g.font = 'italic 500 34px "Cormorant Garamond",Garamond,serif'; var y = wrap(g, lastP.title, 1104, 486, 372, 36);
      g.fillStyle = '#5B574F'; g.font = '14px "Libre Franklin",Arial'; y = wrap(g, lastP.meta, 1104, y + 2, 372, 20); y = wrap(g, lastP.medium, 1104, y, 372, 20);
      g.fillStyle = '#1B1A17'; g.font = '15px "Libre Franklin",Arial'; y = wrap(g, lastP.label, 1104, y + 12, 372, 21);
      g.fillStyle = '#C8322B'; g.beginPath(); g.arc(1110, y + 10, 7, 0, 7); g.fill(); g.fillStyle = '#5B574F'; g.font = '12px "Libre Franklin",Arial'; y = wrap(g, lastP.insurance, 1124, y + 14, 360, 16);
      wrap(g, lastP.acq, 1104, y + 10, 372, 16);
      g.font = '14px "Libre Franklin",Arial'; g.fillText(COPY.title + ' · Cantrip Studio', 120, 940);
      c.toBlob(function (b) {
        if (!b) { toast(COPY.saveFail); return; }
        var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'bad-on-purpose.png'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000); toast(COPY.saved);
      }, 'image/png');
    } catch (e) { toast(COPY.saveFail); }
  }
  function invite() {
    var url = location.origin + location.pathname; // generic: no drawing, no assignment, no fragment
    if (navigator.share) navigator.share({ title: COPY.title, text: COPY.shareText, url: url }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else copy(url); });
    else copy(url);
  }
  function copy(url) {
    var fb = function () { window.prompt(COPY.share, url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast(COPY.copied); }, fb); else fb();
  }
  // Six exhibition drawings: authored to match COPY.samples meta (stroke counts and pigments).
  function circ(cx, cy, r, n) { var p = []; for (var i = 0; i <= (n || 14); i++) { var a = i / (n || 14) * Math.PI * 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]); } return p; }
  function S(c, p) { return { c: c, p: p }; }
  var DRAW = [
    [S(0,[[150,260],[200,190],[420,180],[560,220],[600,270],[150,260]]),S(0,[[200,262],[190,380]]),S(0,[[300,265],[310,380]]),S(0,[[470,262],[480,380]]),S(0,[[560,250],[640,150],[690,170],[650,230]]),S(0,[[640,150],[650,115]]),S(0,[[150,260],[90,330]])],
    [S(0,[[200,500],[200,300],[400,300],[400,500],[200,500]]),S(0,[[180,310],[300,200],[420,310]]),S(0,[[280,500],[280,420],[320,420],[320,500]]),S(3,circ(620,130,60)),S(0,[[600,120],[605,122],[640,120],[645,122],[600,160],[640,160]])],
    [S(0,[[330,250],[340,252]]),S(0,[[460,250],[470,252]]),S(0,[[340,360],[460,360]])],
    [S(2,[[20,320],[120,270],[220,330],[320,270],[420,330],[520,270],[620,330],[720,270],[790,310]])],
    (function () { var a = [S(4,circ(400,330,140,18)),S(4,circ(400,170,80,14)),S(4,[[330,110],[290,60],[320,170]]),S(4,[[470,110],[510,60],[480,170]]),S(0,[[370,160],[372,162]]),S(0,[[430,160],[432,162]]),S(1,[[400,215],[400,260],[420,250]])];
      for (var i = 0; i < 15; i++) { var x = 280 + (i % 5) * 60, y = 280 + Math.floor(i / 5) * 50; a.push(S(4, [[x, y], [x + 18, y + 14]])); } return a; })(),
    (function () { var a = [S(5,circ(300,300,110,16)),S(3,circ(300,300,40)),S(5,circ(520,320,100,16)),S(3,circ(520,320,38))]; [[280,290],[320,290],[500,310],[540,310]].forEach(function (p) { a.push(S(5,[p,[p[0]+2,p[1]+2]])); }); a.push(S(5,[[270,330],[330,330]])); return a; })()
  ];
  function buildTour() {
    var host = $('tour'); if (host.childNodes.length) return;
    COPY.samples.forEach(function (s, i) {
      var fig = document.createElement('figure'), fr = document.createElement('div'); fr.className = 'bop-frame';
      var c = document.createElement('canvas'); c.width = 800; c.height = 600; c.setAttribute('role', 'img'); c.setAttribute('aria-label', s.title);
      redraw(c.getContext('2d'), DRAW[i], 800, 600); fr.appendChild(c); fig.appendChild(fr);
      var pl = document.createElement('figcaption'); pl.className = 'bop-placard'; renderPlacard(pl, { title: s.title, meta: s.meta, label: s.label }); fig.appendChild(pl); host.appendChild(fig);
    });
  }
  function buildPig() {
    var host = $('pig');
    PIG.forEach(function (p, i) {
      var b = document.createElement('button'); b.className = 'bop-sw'; b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', p[0]); b.setAttribute('aria-checked', i === pig ? 'true' : 'false');
      b.style.background = p[1];
      b.onclick = function () { pig = i; Array.prototype.forEach.call(host.children, function (x, j) { x.setAttribute('aria-checked', j === i ? 'true' : 'false'); }); };
      host.appendChild(b);
    });
  }
  // Static copy
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  var s0 = COPY.samples[0]; renderPlacard($('home-placard'), { title: s0.title, meta: s0.meta, label: s0.label });
  buildPig();
  $('go').onclick = startDraw; $('tour-go').onclick = startDraw; $('again').onclick = startDraw;
  $('tour-btn').onclick = function () { buildTour(); show('s-tour'); };
  $('tour-home').onclick = $('home2').onclick = function () { reset(); show('s-home'); };
  $('undo').onclick = function () { strokes.pop(); redraw(ctx, strokes, 800, 600); stats(); };
  $('clear').onclick = reset; $('reroll').onclick = newAssignment;
  $('hang').onclick = hang; $('save').onclick = exportPNG; $('invite').onclick = invite;
  window.__bop = { placard: placard, metrics: metrics, DRAW: DRAW };
})();
