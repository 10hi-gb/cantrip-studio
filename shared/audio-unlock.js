'use strict';
// Shared audio unlock (Cantrip review pieces). Copy this file into a piece folder (pieces are self-contained; shared/ is the source of truth).
// Mobile Chrome only lets an AudioContext start inside an *activating* gesture: pointerup/touchend/click/keydown.
// A touch pointerdown is NOT one, so a context made/resumed there stays "suspended" (silent). This arms document-level
// capture listeners for the activating events, creates/resumes the ONE shared context synchronously in the first of them,
// plays a 1-sample silent buffer (iOS/WebKit unlock), and reports "live" once ctx.state === 'running'.
// No storage, no network. Fallback for pieces: AudioUnlock.wavURL(samples, rate) -> blob: URL for an <audio> element.
var AudioUnlock = (function () {
  var ctx = null, live = false, subs = [], EV = ['pointerup', 'touchend', 'click', 'keydown'];
  function get() {
    if (ctx) return ctx; var K = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (!K) return null;
    try { ctx = new K({ latencyHint: 'interactive' }); } catch (e) { try { ctx = new K(); } catch (e2) { return null; } }
    if (ctx.addEventListener) ctx.addEventListener('statechange', check); return ctx;
  }
  function check() { if (ctx && ctx.state === 'running' && !live) { live = true; disarm(); subs.forEach(function (f) { try { f(); } catch (e) {} }); } }
  function poke() {
    var c = get(); if (!c) return null;
    try { var s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) {}
    if (c.state !== 'running') { try { var p = c.resume(); if (p && p.then) p.then(check, function () {}); } catch (e) {} } else check();
    return c;
  }
  function onGesture() { poke(); }
  function arm() { if (typeof document === 'undefined' || live) return; EV.forEach(function (e) { document.addEventListener(e, onGesture, true); }); }
  function disarm() { if (typeof document === 'undefined') return; EV.forEach(function (e) { document.removeEventListener(e, onGesture, true); }); }
  // 16-bit mono PCM WAV from Float32 samples (-1..1), as a blob: URL (CSP media-src 'self' blob:)
  function wavURL(x, rate) {
    var n = x.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) { var s = Math.max(-1, Math.min(1, x[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  return { arm: arm, poke: poke, ctx: function () { return ctx; }, running: function () { return !!ctx && ctx.state === 'running'; },
    onLive: function (f) { if (live) f(); else subs.push(f); }, wavURL: wavURL };
})();
if (typeof module !== 'undefined') module.exports = AudioUnlock;
