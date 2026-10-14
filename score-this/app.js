'use strict';
// Score This. COPY from copy.js verbatim (sound ids are frozen: they ride in links). All 24 sounds are synthesized locally with Web Audio.
var ST = (function () {
  var FRAG_MAX = 120;
  function ids(copy, p) { return copy.sounds['p' + p].map(function (s) { return s.id; }); }
  function encode(picks) { return '1~' + picks.join('~'); }
  function decode(frag, copy) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > FRAG_MAX) return null;
    var p = frag.split('~'); if (p.length !== 4 || p[0] !== '1') return null;
    for (var i = 1; i <= 3; i++) if (ids(copy, i).indexOf(p[i]) < 0) return null;
    return p.slice(1);
  }
  return { encode: encode, decode: decode, ids: ids };
})();
if (typeof module !== 'undefined') module.exports = ST;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }

  // ---------- synth ----------
  var AC = null, master = null, muted = false, live = [];
  var VOL = 0.22;
  function audio() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return true; }
    var C = window.AudioContext || window.webkitAudioContext; if (!C) { $('sound-note').textContent = COPY.audioFail; return false; }
    try { AC = new C(); master = AC.createGain(); master.gain.value = muted ? 0 : VOL; var comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination); $('sound-note').textContent = ''; return true; } catch (e) { $('sound-note').textContent = COPY.audioFail; return false; }
  }
  function track(n) { live.push(n); n.onended = function () { var i = live.indexOf(n); if (i >= 0) live.splice(i, 1); }; return n; }
  function env(t, a, peak, d, rel) { var g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.6), t + a + d); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + rel); return g; }
  // tone: f0 → f1 glide, optional vibrato
  function tone(t, o) {
    var osc = track(AC.createOscillator()); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.glide || o.dur));
    if (o.vib) { var l = track(AC.createOscillator()), lg = AC.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || o.f * 0.03; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + o.dur + 0.3); }
    var g = env(t, o.a || 0.005, o.peak || 0.5, o.d || o.dur * 0.5, o.rel || o.dur * 0.5);
    var last = osc; if (o.lp) { var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 1; osc.connect(f); last = f; }
    last.connect(g); g.connect(master); osc.start(t); osc.stop(t + (o.a || 0.005) + (o.d || o.dur * 0.5) + (o.rel || o.dur * 0.5) + 0.05);
  }
  function noise(t, o) {
    var len = Math.ceil(AC.sampleRate * (o.dur + 0.1)), b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var s = track(AC.createBufferSource()); s.buffer = b; var f = AC.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur); f.Q.value = o.q || 1;
    var g = env(t, o.a || 0.002, o.peak || 0.6, o.d || o.dur * 0.3, o.rel || o.dur * 0.7); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + o.dur + 0.1);
  }
  var R = {
    'p1.tap': function (t) { tone(t, { f: 1800, f1: 900, type: 'triangle', dur: 0.05, peak: 0.5 }); noise(t, { f: 3000, q: 4, dur: 0.03, peak: 0.3 }); },
    'p1.creak': function (t) { tone(t, { f: 180, f1: 320, type: 'sawtooth', dur: 0.9, a: 0.08, peak: 0.25, lp: 900, q: 8, vib: 23, vibAmt: 25 }); },
    'p1.squeak': function (t) { tone(t, { f: 900, f1: 1500, type: 'square', dur: 0.12, peak: 0.2, lp: 2500 }); tone(t + 0.13, { f: 1400, f1: 1000, type: 'square', dur: 0.1, peak: 0.18, lp: 2500 }); },
    'p1.harp': function (t) { [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) { tone(t + i * 0.06, { f: f, type: 'triangle', dur: 0.6, peak: 0.25, a: 0.003, d: 0.1, rel: 0.6 }); }); },
    'p1.lownote': function (t) { tone(t, { f: 65.4, type: 'sawtooth', dur: 1.6, a: 0.12, peak: 0.45, lp: 400, vib: 5, vibAmt: 1.2 }); },
    'p1.tiptoe': function (t) { [988, 880, 988, 880].forEach(function (f, i) { tone(t + i * 0.22, { f: f, type: 'sine', dur: 0.15, peak: 0.4, a: 0.002, d: 0.03, rel: 0.15 }); tone(t + i * 0.22, { f: f * 3.9, type: 'sine', dur: 0.05, peak: 0.12 }); }); },
    'p1.vault': function (t) { [0, 0.35, 0.6].forEach(function (dt) { noise(t + dt, { f: 4200, q: 9, dur: 0.025, peak: 0.6 }); tone(t + dt, { f: 2400, type: 'square', dur: 0.015, peak: 0.15 }); }); },
    'p1.choir': function (t) { [440, 554, 659].forEach(function (f) { tone(t, { f: f, type: 'sawtooth', dur: 1.2, a: 0.25, peak: 0.12, lp: 1200, q: 4, vib: 5.5, vibAmt: 4 }); }); },
    'p2.smash': function (t) { noise(t, { ft: 'highpass', f: 2500, dur: 0.8, peak: 0.8, d: 0.05, rel: 0.7 }); [3100, 4300, 5200, 3700].forEach(function (f, i) { tone(t + 0.02 + i * 0.05, { f: f, type: 'sine', dur: 0.25, peak: 0.12 }); }); tone(t, { f: 120, f1: 50, type: 'sine', dur: 0.2, peak: 0.6 }); },
    'p2.boing': function (t) { tone(t, { f: 90, f1: 380, glide: 0.15, type: 'sine', dur: 0.8, peak: 0.6, vib: 14, vibAmt: 60 }); },
    'p2.gong': function (t) { [110, 167, 223, 298, 410].forEach(function (f, i) { tone(t, { f: f, f1: f * 0.985, type: 'sine', dur: 3, a: 0.01, peak: 0.28 / (i + 1) * 1.5, d: 0.4, rel: 2.6, vib: 3 + i, vibAmt: 1.5 }); }); },
    'p2.splat': function (t) { noise(t, { ft: 'lowpass', f: 1800, f1: 200, dur: 0.35, peak: 0.9, q: 2 }); tone(t, { f: 160, f1: 60, type: 'sine', dur: 0.15, peak: 0.6 }); },
    'p2.cymbal': function (t) { noise(t, { ft: 'highpass', f: 6000, dur: 1.6, peak: 0.6, a: 0.002, d: 0.1, rel: 1.5 }); noise(t, { f: 9000, q: 2, dur: 1.2, peak: 0.25 }); },
    'p2.whistle': function (t) { tone(t, { f: 1800, f1: 260, glide: 1.1, type: 'sine', dur: 1.1, peak: 0.35, a: 0.03, vib: 6, vibAmt: 12 }); },
    'p2.thunder': function (t) { noise(t, { ft: 'lowpass', f: 900, f1: 120, dur: 2.2, peak: 0.9, a: 0.02, d: 0.3, rel: 1.9 }); noise(t + 0.25, { ft: 'lowpass', f: 400, dur: 1.4, peak: 0.6 }); },
    'p2.bowling': function (t) { tone(t, { f: 70, f1: 45, type: 'sine', dur: 0.5, peak: 0.6 }); for (var i = 0; i < 9; i++) { var dt = 0.35 + i * 0.045 + Math.random() * 0.03; tone(t + dt, { f: 600 + Math.random() * 900, type: 'triangle', dur: 0.08, peak: 0.25 }); noise(t + dt, { f: 1500, q: 3, dur: 0.05, peak: 0.3 }); } },
    'p3.trombone': function (t) { [[392, 0], [370, 0.45], [349, 0.9], [330, 1.35]].forEach(function (n, i) { tone(t + n[1], { f: n[0], f1: i === 3 ? 300 : null, type: 'sawtooth', dur: i === 3 ? 1.1 : 0.4, a: 0.04, peak: 0.25, lp: 1100, q: 2, vib: i === 3 ? 6 : 0, vibAmt: 8 }); }); },
    'p3.scratch': function (t) { noise(t, { f: 800, f1: 3000, q: 6, dur: 0.18, peak: 0.7 }); noise(t + 0.18, { f: 3000, f1: 500, q: 6, dur: 0.22, peak: 0.7 }); },
    'p3.cricket': function (t) { [0, 0.6].forEach(function (dt) { for (var i = 0; i < 4; i++) tone(t + dt + i * 0.035, { f: 4500, type: 'sine', dur: 0.02, peak: 0.3, a: 0.002, d: 0.005, rel: 0.015 }); }); },
    'p3.gasp': function (t) { noise(t, { f: 1200, f1: 2600, q: 1.5, dur: 0.55, a: 0.12, peak: 0.6 }); [300, 380, 450].forEach(function (f) { tone(t + 0.05, { f: f, f1: f * 1.3, type: 'sawtooth', dur: 0.6, a: 0.15, peak: 0.07, lp: 1600 }); }); },
    'p3.kazoo': function (t) { tone(t, { f: 330, f1: 294, glide: 0.4, type: 'sawtooth', dur: 0.5, peak: 0.25, lp: 2200, q: 6, vib: 7, vibAmt: 6 }); tone(t + 0.55, { f: 294, f1: 392, glide: 0.35, type: 'sawtooth', dur: 0.4, peak: 0.25, lp: 2200, q: 6, vib: 7, vibAmt: 6 }); noise(t, { f: 2500, q: 3, dur: 0.95, peak: 0.08 }); },
    'p3.applause': function (t) { for (var i = 0; i < 14; i++) noise(t + i * 0.11 + Math.random() * 0.05, { f: 1500 + Math.random() * 1200, q: 1.2, dur: 0.04, peak: 0.35 + Math.random() * 0.2 }); },
    'p3.western': function (t) { tone(t, { f: 1200, f1: 1800, glide: 0.25, type: 'sine', dur: 0.3, peak: 0.35, vib: 5, vibAmt: 10 }); tone(t + 0.35, { f: 1800, f1: 900, glide: 0.4, type: 'sine', dur: 0.45, peak: 0.35, vib: 5, vibAmt: 10 }); tone(t + 0.85, { f: 1200, f1: 1500, glide: 0.3, type: 'sine', dur: 0.4, peak: 0.3, vib: 5, vibAmt: 10 }); },
    'p3.purr': function (t) { var o = track(AC.createOscillator()); o.type = 'sawtooth'; o.frequency.value = 26; var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; var g = env(t, 0.2, 0.35, 0.8, 0.6); var am = track(AC.createOscillator()), amg = AC.createGain(); am.frequency.value = 2; amg.gain.value = 0.15; am.connect(amg); amg.connect(g.gain); o.connect(f); f.connect(g); g.connect(master); o.start(t); am.start(t); o.stop(t + 1.7); am.stop(t + 1.7); }
  };
  var DUR = { 'p1.lownote': 1.7, 'p1.choir': 1.5, 'p2.gong': 2.2, 'p2.thunder': 2.2, 'p2.cymbal': 1.6, 'p3.trombone': 2.2, 'p3.purr': 1.7 };
  function play(id) { if (!audio() || muted) return; try { R[id](AC.currentTime + 0.02); } catch (e) {} }
  function stopAll() { live.slice().forEach(function (n) { try { n.stop(); } catch (e) {} }); live = []; timers.forEach(clearTimeout); timers = []; }

  // ---------- comic ----------
  var BURST = [{ x: '62%', y: '30%', r: '-6deg' }, { x: '40%', y: '36%', r: '8deg', big: true }, { x: '58%', y: '36%', r: '-4deg' }];
  var picks = [null, null, null], locked = false, panels = [], timers = [], link = '';
  function soundById(id) { for (var p = 1; p <= 3; p++) { var s = COPY.sounds['p' + p].filter(function (x) { return x.id === id; })[0]; if (s) return s; } return null; }
  function build() {
    var host = $('strip'); host.textContent = '';
    for (var i = 0; i < 3; i++) (function (i) {
      var pn = document.createElement('section'); pn.className = 'st-panel'; pn.setAttribute('aria-label', fill(COPY.panelLabel, { n: i + 1 }));
      var art = document.createElement('div'); art.className = 'st-art';
      var img = document.createElement('img'); img.src = 'panel' + (i + 1) + '.svg'; img.alt = ''; art.appendChild(img);
      var cap = document.createElement('span'); cap.className = 'st-cap'; cap.textContent = fill(COPY.panelLabel, { n: i + 1 }); art.appendChild(cap);
      var b = document.createElement('div'); b.className = 'st-burst' + (BURST[i].big ? ' is-big' : ''); ['x', 'y', 'r'].forEach(function (k) { b.style.setProperty('--b' + k, BURST[i][k]); }); b.setAttribute('aria-live', 'polite'); art.appendChild(b);
      pn.appendChild(art);
      var board = document.createElement('div'); board.className = 'st-board'; board.setAttribute('role', 'group');
      var lab = document.createElement('p'); lab.className = 'st-label'; lab.textContent = COPY.pickHint; board.appendChild(lab);
      COPY.sounds['p' + (i + 1)].forEach(function (s) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'st-chip'; c.textContent = s.label; c.dataset.id = s.id;
        c.onclick = function () { if (locked) return; picks[i] = s.id; link = ''; refresh(); play(s.id); pop(i); $('msg').textContent = ''; };
        board.appendChild(c);
      });
      var hear = document.createElement('button'); hear.type = 'button'; hear.className = 'st-hear'; hear.textContent = COPY.preview; hear.disabled = true;
      hear.onclick = function () { if (picks[i]) { play(picks[i]); pop(i); } }; board.appendChild(hear);
      pn.appendChild(board); host.appendChild(pn); panels.push({ el: pn, burst: b, board: board, hear: hear });
    })(i);
  }
  function refresh() {
    panels.forEach(function (P, i) {
      var s = picks[i] && soundById(picks[i]);
      P.burst.textContent = s ? s.sfx : COPY.emptySlot; P.burst.classList.toggle('is-empty', !s); if (BURST[i].big) P.burst.classList.toggle('is-big', !!s);
      Array.prototype.forEach.call(P.board.querySelectorAll('.st-chip'), function (c) { c.setAttribute('aria-pressed', c.dataset.id === picks[i] ? 'true' : 'false'); c.disabled = locked; });
      P.board.classList.toggle('is-locked', locked); P.hear.disabled = !s;
    });
  }
  function pop(i) { var el = panels[i].el; el.classList.remove('is-playing'); void el.offsetWidth; el.classList.add('is-playing'); }
  $('play').onclick = function () {
    var miss = picks.indexOf(null); if (miss >= 0) { $('msg').textContent = fill(COPY.incomplete, { n: miss + 1 }); panels[miss].board.querySelector('.st-chip').focus(); return; }
    if (!audio()) { /* silent playback still animates */ }
    stopAll(); var at = 0;
    picks.forEach(function (id, i) { timers.push(setTimeout(function () { pop(i); play(id); if (!RM.matches) panels[i].el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, at)); at += ((DUR[id] || 1.1) + 0.35) * 1000; });
  };
  $('share').onclick = function () {
    var miss = picks.indexOf(null); if (miss >= 0) { $('msg').textContent = fill(COPY.incomplete, { n: miss + 1 }); return; }
    link = location.origin + location.pathname + '#' + ST.encode(picks);
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };
  $('rescore').onclick = function () { locked = false; history.replaceState(null, '', location.pathname); $('rescore').hidden = true; $('share').hidden = false; $('play').textContent = COPY.primary; $('lede').textContent = COPY.invitation; refresh(); panels[0].board.querySelector('.st-chip').focus(); };
  $('mute').onclick = function () { muted = !muted; if (master) master.gain.value = muted ? 0 : VOL; if (muted) stopAll(); $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? COPY.unmute : COPY.mute; };
  $('stop').onclick = stopAll;
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); });

  build();
  var h = location.hash, R0 = h && h !== '#' ? ST.decode(h, COPY) : null;
  if (h && h !== '#' && !R0) { $('lede').textContent = COPY.badLink; refresh(); }
  else if (R0) { picks = R0; locked = true; $('lede').textContent = COPY.receiverIntro; $('play').textContent = COPY.receiverPrimary; $('rescore').hidden = false; $('share').hidden = true; refresh(); }
  else { $('lede').textContent = COPY.invitation; refresh(); }
  $('sound-note').textContent = COPY.soundStart;
  window.addEventListener('hashchange', function () { location.reload(); });
  window.__st = { R: R };
})();
