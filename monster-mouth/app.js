'use strict';
// Monster Mouth. COPY from copy.js verbatim. Drawing lives in memory only: no storage, no network, no mic/camera.
var MM = (function () {
  // Voice parameters derived ONLY from stroke geometry.
  function features(strokes) {
    var pts = [], turn = 0, segs = 0, len = 0, minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    strokes.forEach(function (s) {
      for (var i = 0; i < s.length; i++) {
        var p = s[i]; pts.push(p); minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
        if (i) len += Math.hypot(p[0] - s[i - 1][0], p[1] - s[i - 1][1]);
        if (i > 1) { var a1 = Math.atan2(s[i - 1][1] - s[i - 2][1], s[i - 1][0] - s[i - 2][0]), a2 = Math.atan2(p[1] - s[i - 1][1], p[0] - s[i - 1][0]); var d = Math.abs(a2 - a1); if (d > Math.PI) d = 2 * Math.PI - d; turn += d; segs++; }
      }
    });
    var size = pts.length ? Math.min(1, Math.hypot(maxx - minx, maxy - miny) / 1131) : 0;
    var spiky = segs ? Math.min(1, (turn / segs) / 1.2) : 0;
    return { size: size, spiky: spiky, strokes: strokes.length, len: len, box: [minx, miny, maxx, maxy], pts: pts };
  }
  function voice(f) {
    return {
      f0: Math.round(60 + (1 - f.size) * 260),            // big shape → low voice (60–320 Hz)
      drive: 1 + f.spiky * 60,                             // spiky lines → rougher (waveshaper)
      noise: +(0.05 + f.spiky * 0.5).toFixed(3),           // breath/grit mix
      cutoff: Math.round(500 + (1 - f.size) * 2500),
      syllables: Math.max(1, Math.min(4, Math.ceil(f.strokes / 3))),
      dur: +(0.35 + f.size * 0.6).toFixed(2),
      wave: f.spiky > 0.45 ? 'sawtooth' : f.spiky > 0.2 ? 'square' : 'triangle'
    };
  }
  function hull(P) {
    if (P.length < 3) return P.slice();
    var p = P.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lo = [], up = [];
    p.forEach(function (q) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
    for (var i = p.length - 1; i >= 0; i--) { var q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  return { features: features, voice: voice, hull: hull };
})();
if (typeof module !== 'undefined') module.exports = MM;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('undo').setAttribute('aria-label', 'Undo'); $('clear').setAttribute('aria-label', 'Clear');
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  var cv = $('cv'), g = cv.getContext('2d'), W = 800, H = 800;
  var strokes = [], cur = null, alive = false, F = null, V = null, hullPts = null, frame = 0, mouth = 0, twitch = 0, replyI = 0, loop = 0;
  var kb = { x: 400, y: 400, down: false };
  var PAPER = '#FFF8E7', INK = '#1C1C1C', MAG = '#E2367A', LIME = '#B7E34B';

  function drawStrokes(jit) {
    g.strokeStyle = INK; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round';
    strokes.forEach(function (s, si) {
      g.beginPath();
      s.forEach(function (p, i) { var j = jit ? Math.sin(p[0] * 0.13 + p[1] * 0.07 + frame * 2.1 + si) * jit : 0; var x = p[0] + j, y = p[1] - j; if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (s.length === 1) g.lineTo(s[0][0] + 0.1, s[0][1]);
      g.stroke();
    });
  }
  function render() {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    if (!alive) { drawStrokes(0); if (document.activeElement === cv) { g.save(); g.strokeStyle = INK; g.lineWidth = 3; g.setLineDash(kb.down ? [] : [6, 6]); g.beginPath(); g.arc(kb.x, kb.y, kb.down ? 9 : 14, 0, Math.PI * 2); g.stroke(); g.restore(); } return; }
    var jit = RM.matches ? 0 : 1.6, b = F.box, bw = Math.max(80, b[2] - b[0]), bh = Math.max(80, b[3] - b[1]);
    g.save(); g.translate(twitch, 0);
    // body: cut-paper magenta hull
    g.fillStyle = MAG; g.beginPath(); hullPts.forEach(function (p, i) { var j = Math.sin(i + frame * 2.1) * jit; if (i) g.lineTo(p[0] + j, p[1] + j); else g.moveTo(p[0] + j, p[1] + j); }); g.closePath(); g.fill();
    drawStrokes(jit);
    // eyes
    var ex = b[0] + bw * 0.35, ex2 = b[0] + bw * 0.65, ey = b[1] + bh * 0.32, er = Math.max(12, Math.min(40, bw * 0.08));
    [[ex, er], [ex2, er * 0.75]].forEach(function (e) { g.fillStyle = '#fff'; g.beginPath(); g.arc(e[0], ey, e[1], 0, 7); g.fill(); g.lineWidth = 5; g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(e[0] + e[1] * 0.25, ey + e[1] * 0.2, e[1] * 0.38, 0, 7); g.fill(); });
    // mouth: opens with `mouth` (0..1)
    var mx = b[0] + bw * 0.5, my = b[1] + bh * 0.66, mw = bw * 0.28, open = 6 + mouth * bh * 0.22;
    g.fillStyle = INK; g.beginPath(); g.moveTo(mx - mw, my); g.quadraticCurveTo(mx, my + open * 2, mx + mw, my); g.quadraticCurveTo(mx, my + open * 0.3 - 4, mx - mw, my); g.fill();
    g.fillStyle = LIME; g.strokeStyle = INK; g.lineWidth = 3; var n = Math.max(4, Math.round(mw / 18));
    for (var i = 0; i < n; i++) { var x0 = mx - mw + (2 * mw) * i / n, x1 = x0 + 2 * mw / n, yy = my + 2; g.beginPath(); g.moveTo(x0, yy); g.lineTo((x0 + x1) / 2, yy + 10 + mouth * 8); g.lineTo(x1, yy); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
  }
  // line boil: 8fps redraw
  function startLoop() { stopLoop(); loop = setInterval(function () { frame = (frame + 1) % 3; if (!activeVoice) render(); }, 125); }
  function stopLoop() { clearInterval(loop); }

  // ---- drawing input
  function pos(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * W / r.width), Math.round((e.clientY - r.top) * H / r.height)]; }
  cv.addEventListener('pointerdown', function (e) {
    if (alive) { e.preventDefault(); return poke(); }
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    cur = [pos(e)]; strokes.push(cur); render(); e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) { if (!cur) return; var p = pos(e), q = cur[cur.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 3 && cur.length < 3000) { cur.push(p); render(); } });
  ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { cur = null; }); });
  cv.addEventListener('focus', function () { if (!alive) render(); }); cv.addEventListener('blur', function () { if (!alive) render(); });
  cv.addEventListener('keydown', function (e) {
    if (alive) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); poke(); } return; }
    var d = e.shiftKey ? 40 : 14;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (kb.down) { kb.down = false; cur = null; } else { kb.down = true; cur = [[kb.x, kb.y]]; strokes.push(cur); } render(); return; }
    var mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]; if (!mv) return; e.preventDefault();
    kb.x = Math.max(0, Math.min(W, kb.x + mv[0])); kb.y = Math.max(0, Math.min(H, kb.y + mv[1])); if (kb.down && cur) cur.push([kb.x, kb.y]); render();
  });
  $('undo').onclick = function () { strokes.pop(); render(); };
  $('clear').onclick = function () { strokes = []; render(); };

  // ---- wake
  $('wake').onclick = function () {
    if (!strokes.length) { $('bubble').textContent = COPY.emptyCanvas; return; }
    try {
      $('bubble').textContent = COPY.waking;
      F = MM.features(strokes); V = MM.voice(F); hullPts = MM.hull(F.pts);
      if (hullPts.length < 3) { var c = F.pts[0]; hullPts = [[c[0] - 60, c[1] - 60], [c[0] + 60, c[1] - 60], [c[0] + 60, c[1] + 60], [c[0] - 60, c[1] + 60]]; F.box = [c[0] - 60, c[1] - 60, c[0] + 60, c[1] + 60]; }
      setTimeout(function () {
        alive = true; $('jaw').classList.add('is-alive'); $('p-draw').hidden = true; $('p-alive').hidden = false;
        $('bubble').textContent = ''; $('sound-state').textContent = window.AudioContext || window.webkitAudioContext ? COPY.tapForSound : COPY.audioFail;
        if (RM.matches) $('sound-state').textContent += ' ' + COPY.reducedMotion;
        render(); startLoop(); cv.focus({ preventScroll: true });
      }, RM.matches ? 0 : 500);
    } catch (e) { toast(COPY.error); }
  };

  // ---- audio (starts on first poke gesture; conservative volume)
  var AC = null, master = null, muted = false, activeVoice = null, VOL = 0.12;
  function ensureAudio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return true; }
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return false;
    try { AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination); $('sound-state').textContent = COPY.soundOn; return true; } catch (e) { return false; }
  }
  function curve(k) { var n = 1024, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); } return c; }
  function growl() {
    if (!ensureAudio()) { $('sound-state').textContent = COPY.audioFail; return 0; }
    stopVoice();
    var t = AC.currentTime + 0.02, dur = V.dur * V.syllables, nodes = [];
    var o1 = AC.createOscillator(), o2 = AC.createOscillator(), sh = AC.createWaveShaper(), lp = AC.createBiquadFilter(), env = AC.createGain();
    o1.type = V.wave; o2.type = 'square'; o1.frequency.value = V.f0; o2.frequency.value = V.f0 * 0.503; sh.curve = curve(V.drive); lp.type = 'lowpass'; lp.frequency.value = V.cutoff; lp.Q.value = 6;
    var o2g = AC.createGain(); o2g.gain.value = 0.5;
    // noise grit
    var nb = AC.createBuffer(1, AC.sampleRate * dur, AC.sampleRate), d = nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var ns = AC.createBufferSource(); ns.buffer = nb; var ng = AC.createGain(); ng.gain.value = V.noise;
    o1.connect(sh); o2.connect(o2g); o2g.connect(sh); ns.connect(ng); ng.connect(lp); sh.connect(lp); lp.connect(env); env.connect(master);
    env.gain.setValueAtTime(0, t);
    for (var s = 0; s < V.syllables; s++) {
      var st = t + s * V.dur; env.gain.linearRampToValueAtTime(VOL, st + 0.05); env.gain.linearRampToValueAtTime(VOL * 0.5, st + V.dur * 0.6); env.gain.linearRampToValueAtTime(0.0001, st + V.dur * 0.95);
      o1.frequency.setValueAtTime(V.f0 * 1.15, st); o1.frequency.exponentialRampToValueAtTime(V.f0 * 0.8, st + V.dur * 0.9);
    }
    [o1, o2, ns].forEach(function (n) { n.start(t); n.stop(t + dur + 0.05); });
    nodes = [o1, o2, ns, env];
    activeVoice = { nodes: nodes, t0: t, dur: dur };
    o1.onended = function () { if (activeVoice && activeVoice.nodes === nodes) activeVoice = null; };
    return dur;
  }
  function stopVoice() { if (!activeVoice) return; activeVoice.nodes.forEach(function (n) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }); activeVoice = null; }

  // ---- poke: chomp synced to growl envelope
  var chompRaf = 0;
  function poke() {
    $('bubble').textContent = COPY.pokeReplies[replyI++ % COPY.pokeReplies.length];
    var dur = growl() || 0.5;
    if (RM.matches) { twitch = 3; render(); setTimeout(function () { twitch = 0; render(); }, 160); return; }
    cancelAnimationFrame(chompRaf); var t0 = performance.now();
    var step = function (now) {
      var t = (now - t0) / 1000; if (t > dur) { mouth = 0; render(); return; }
      var syl = V.dur, ph = (t % syl) / syl; mouth = Math.sin(Math.min(1, ph / 0.95) * Math.PI); render(); chompRaf = requestAnimationFrame(step);
    };
    chompRaf = requestAnimationFrame(step);
  }
  $('mute').onclick = function () { muted = !muted; if (master) master.gain.value = muted ? 0 : 1; $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? COPY.unmute : COPY.mute; };
  $('stop').onclick = function () { stopVoice(); cancelAnimationFrame(chompRaf); mouth = 0; render(); if (AC) AC.suspend(); };
  $('redraw').onclick = function () {
    if (!window.confirm(COPY.restartConfirm)) return;
    stopVoice(); stopLoop(); cancelAnimationFrame(chompRaf); alive = false; strokes = []; F = V = hullPts = null; mouth = 0;
    $('jaw').classList.remove('is-alive'); $('p-draw').hidden = false; $('p-alive').hidden = true; $('bubble').textContent = ''; render();
  };
  $('save').onclick = function () {
    try { cv.toBlob(function (b) { if (!b) return toast(COPY.saveFail); var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'monster-mouth.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); toast(COPY.saved); }, 'image/png'); } catch (e) { toast(COPY.saveFail); }
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) { stopVoice(); if (AC) AC.suspend(); } });
  window.__mm = { get V() { return V; } };
  render();

  // Keyboard-drawing hint sits under the canvas and shows only while drawing is possible.
  (function () { var pd = $('p-draw'), kh = $('kbhint'), sync = function () { kh.hidden = pd.hidden; }; new MutationObserver(sync).observe(pd, { attributes: true, attributeFilter: ['hidden'] }); sync(); cv.setAttribute('aria-label', COPY.title); })();
})();
