'use strict';
// Wishbone. Result is random (crypto). Names only leave this screen if the visitor shares a link.
var WB = (function () {
  var NAME_MAX = 24;
  function clean(s) { return Array.from(String(s == null ? '' : s).replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g, '').replace(/[\u0000-\u001F\u007F-\u009F~]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join(''); }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function b64e(s) { var b = new TextEncoder().encode(s), t = ''; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { var t = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  function encode(r) { var p = b64e(['1', r.side, clean(r.names[0]), clean(r.names[1])].join('~')); return p + '.' + ck(p); }
  function decode(f) {
    try {
      f = String(f || '').replace(/^#/, ''); if (!f || f.length > 300) return null;
      var m = /^([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f); if (!m || ck(m[1]) !== m[2]) return null;
      var a = b64d(m[1]).split('~'); if (a.length !== 4 || a[0] !== '1' || (a[1] !== 'l' && a[1] !== 'r')) return null;
      return { side: a[1], names: [clean(a[2]), clean(a[3])] };
    } catch (e) { return null; }
  }
  function pick() { var u = new Uint8Array(1); (typeof crypto !== 'undefined' ? crypto : require('crypto').webcrypto).getRandomValues(u); return u[0] & 1 ? 'r' : 'l'; }
  return { clean: clean, encode: encode, decode: decode, pick: pick, NAME_MAX: NAME_MAX };
})();
if (typeof module !== 'undefined') module.exports = WB;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  [0, 1].forEach(function (i) { $('nl' + i).textContent = COPY.nameLabels[i]; $('n' + i).placeholder = COPY.namePlaceholders[i]; });
  $('tl').setAttribute('aria-label', COPY.namePlaceholders[0] + ' (F)'); $('tr').setAttribute('aria-label', COPY.namePlaceholders[1] + ' (J)');
  var stage = $('stage'), held = { l: false, r: false }, state = 'idle', t0 = 0, raf = 0, result = null, PULL = 2400;
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function status(s) { $('status').textContent = s; }
  function tension(v) { stage.style.setProperty('--wb-tension', v.toFixed(2)); }
  function sync() {
    $('tl').classList.toggle('is-down', held.l); $('tr').classList.toggle('is-down', held.r);
    $('tl').setAttribute('aria-pressed', String(held.l)); $('tr').setAttribute('aria-pressed', String(held.r));
    if (state === 'snapped' || state === 'idle') return;
    if (held.l && held.r) { if (state !== 'pulling') { state = 'pulling'; t0 = performance.now(); stage.classList.add('is-holding'); status(COPY.bothHolding); loop(); } }
    else {
      if (state === 'pulling') { state = 'armed'; cancelAnimationFrame(raf); stage.classList.remove('is-holding'); tension(0); status(COPY.letGoEarly); }
      else if (held.l || held.r) status(COPY.waiting);
    }
  }
  function loop() {
    var k = Math.min(1, (performance.now() - t0) / PULL); tension(k);
    if (k > 0.25 && $('status').textContent === COPY.bothHolding) status(COPY.pulling);
    if (k >= 1) return snap(WB.pick());
    raf = requestAnimationFrame(loop);
  }
  function names() { return [WB.clean($('n0').value), WB.clean($('n1').value)]; }
  function snap(side, nm) {
    state = 'snapped'; result = { side: side, names: nm || names() };
    var big = side === 'l' ? $('hl') : $('hr'); big.appendChild($('knob')); $('hl').classList.toggle('is-big', side === 'l'); $('hr').classList.toggle('is-big', side === 'r');
    stage.classList.remove('is-holding'); stage.classList.add('is-snapped'); held.l = held.r = false; sync();
    $('title').textContent = COPY.snap;
    var n = result.names[side === 'l' ? 0 : 1];
    $('result').textContent = n ? fill(COPY.winner, { name: n }) : fill(COPY.winnerAnon, { side: COPY.namePlaceholders[side === 'l' ? 0 : 1].toLowerCase() });
    $('result').hidden = false; status(COPY.wishNote);
    $('lede').hidden = true; $('names').hidden = true; $('howto').hidden = true; $('solo').hidden = true; $('go').hidden = true;
    $('again').hidden = false; $('share').hidden = false; $('honesty').hidden = false; $('tl').hidden = true; $('tr').hidden = true;
  }
  function reset() {
    state = 'idle'; result = null; held.l = held.r = false; tension(0); stage.classList.remove('is-snapped', 'is-holding');
    $('hl').classList.remove('is-big'); $('hr').classList.remove('is-big'); stage.querySelector('.wb-bone svg').insertBefore($('knob'), stage.querySelector('.crack'));
    $('title').textContent = COPY.title; $('result').hidden = true; status('');
    $('lede').hidden = false; $('names').hidden = false; $('howto').hidden = false; $('solo').hidden = false; $('go').hidden = false;
    $('again').hidden = true; $('share').hidden = true; $('honesty').hidden = true; $('tl').hidden = false; $('tr').hidden = false; sync();
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  function arm() { if (state === 'idle') { state = 'armed'; status(COPY.howTo); $('go').hidden = true; } }
  $('go').onclick = function () { arm(); $('tl').focus(); };
  $('again').onclick = function () { reset(); };
  // Touch/pen: hold while pressed (multi-touch for two people). Mouse: a click latches a side, so one person can hold both.
  [['tl', 'l'], ['tr', 'r']].forEach(function (p) {
    var b = $(p[0]), s = p[1];
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); arm(); if (e.pointerType === 'mouse') { held[s] = !held[s]; } else { held[s] = true; try { b.setPointerCapture(e.pointerId); } catch (x) {} } sync(); });
    var up = function (e) { if (e.pointerType !== 'mouse') { held[s] = false; sync(); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); arm(); held[s] = !held[s]; sync(); } });
  });
  document.addEventListener('keydown', function (e) { if (e.target.tagName === 'INPUT' || e.repeat) return; var k = e.key.toLowerCase(); if (k === 'f' || k === 'j') { arm(); held[k === 'f' ? 'l' : 'r'] = true; sync(); } });
  document.addEventListener('keyup', function (e) { var k = e.key.toLowerCase(); if (k === 'f' || k === 'j') { held[k === 'f' ? 'l' : 'r'] = false; sync(); } });
  window.addEventListener('blur', function () { if (state === 'pulling' || state === 'armed') { held.l = held.r = false; sync(); } });
  $('share').onclick = function () {
    var link = location.origin + location.pathname + '#' + WB.encode(result);
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, text: $('result').textContent, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };
  $('title').textContent = COPY.title;
  var h = location.hash;
  if (h && h !== '#') { var r = WB.decode(h); if (r) snap(r.side, r.names); else status(COPY.badLink); }
})();
