'use strict';
// Here It Comes. COPY from copy.js verbatim. Throw = type + optional note, in the URL fragment only. No storage, no network, no receipts.
var HIC = (function () {
  var TYPES = ['lob', 'straight', 'curve', 'fast'], CODE = { lob: 'l', straight: 's', curve: 'c', fast: 'f' };
  // flight ms and catch window [open, close] measured from launch on the rAF clock
  var FLIGHT = { lob: 1800, straight: 1500, curve: 1500, fast: 1200 };
  var NOTE_MAX = 60, FRAG_MAX = 340;
  function win(t) { var f = FLIGHT[t]; return [f - 500, f + 200]; }
  function clean(s) { return String(s || '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function b64u(str) { var u = new TextEncoder().encode(str), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]*$/.test(s)) throw 0; s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(a); }
  function encode(type, note) { note = clean(note); if (Array.from(note).length > NOTE_MAX) note = Array.from(note).slice(0, NOTE_MAX).join(''); return '1' + CODE[type] + (note ? '.' + b64u(note) : ''); }
  function decode(frag) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > FRAG_MAX) return null;
    var m = /^1([lscf])(?:\.([A-Za-z0-9_-]+))?$/.exec(frag); if (!m) return null;
    var type = TYPES.filter(function (t) { return CODE[t] === m[1]; })[0], note = '';
    if (m[2]) { try { note = clean(unb64u(m[2])); } catch (e) { return null; } if (Array.from(note).length > NOTE_MAX) return null; }
    return { type: type, note: note };
  }
  // judge a press at time t (ms since launch)
  function judge(type, t) { var w = win(type); return t < w[0] ? 'early' : t <= w[1] ? 'caught' : 'missed'; }
  return { TYPES: TYPES, FLIGHT: FLIGHT, win: win, encode: encode, decode: decode, judge: judge, NOTE_MAX: NOTE_MAX, FRAG_MAX: FRAG_MAX };
})();
if (typeof module !== 'undefined') module.exports = HIC;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  var ball = $('ball'), ring = $('ring');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('note').placeholder = COPY.notePlaceholder; $('throws').setAttribute('aria-label', COPY.makerHint);
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function actions(id) { ['a-make', 'a-share', 'a-ready', 'a-done', 'a-bad'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function text(big, sub) { $('big').textContent = big || ''; $('sub').textContent = sub || ''; }
  function setBall(y, d, x) { [ball, ring].forEach(function (n) { n.style.setProperty('--y', y + '%'); n.style.setProperty('--d', d + 'px'); n.style.setProperty('--x', (x || 0) + 'px'); }); }
  function rest() { ball.className = 'hic-ball'; ring.hidden = true; ring.classList.remove('is-hot'); setBall(innerWidth < 600 ? 44 : 48, innerWidth < 600 ? 90 : 120); }
  function anim(cls) { ball.classList.remove('is-caught', 'is-thrown'); void ball.offsetWidth; ball.classList.add(cls); }

  // ---------- maker ----------
  var pick = 'straight', link = '';
  function buildThrows() {
    var host = $('throws'); host.textContent = '';
    HIC.TYPES.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hic-throw'; b.setAttribute('aria-pressed', t === pick ? 'true' : 'false');
      b.appendChild(document.createTextNode(COPY.throws[t])); var s = document.createElement('small'); s.textContent = COPY.throwNotes[t]; b.appendChild(s);
      b.onclick = function () { pick = t; buildThrows(); host.querySelector('[aria-pressed=true]').focus(); };
      host.appendChild(b);
    });
  }
  function maker() { state = 'make'; rest(); text(COPY.title, COPY.invitation); buildThrows(); actions('a-make'); $('callout').textContent = ''; }
  $('throw').onclick = function () {
    var frag = HIC.encode(pick, $('note').value); link = location.origin + location.pathname + '#' + frag;
    anim('is-thrown'); text(COPY.throws[pick], COPY.throwNotes[pick]); actions('a-share'); $('share').focus();
  };
  $('rethrow').onclick = maker;
  $('share').onclick = function () {
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };

  // ---------- receiver ----------
  var T = null, state = 'idle', raf = 0, t0 = 0, timers = [];
  function clearRun() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; }
  function readyScreen(msg) {
    clearRun(); state = 'ready'; rest();
    text(COPY.ready, msg || (T.note ? T.note : '')); $('board').textContent = COPY.receiverIntroAnon;
    actions('a-ready'); $('callout').textContent = ''; $('ready').focus();
    if (RM.matches && !msg) $('sub').textContent = (T.note ? T.note + ' — ' : '') + COPY.reducedMotion;
  }
  function countdown() {
    state = 'count'; actions(null); text('', T.note); setBall(30, 14); ring.hidden = true;
    COPY.countdown.forEach(function (n, i) { timers.push(setTimeout(function () { $('callout').textContent = n; }, i * 700)); });
    timers.push(setTimeout(launch, COPY.countdown.length * 700));
  }
  function launch() {
    state = 'fly'; $('callout').textContent = ''; text(COPY.incoming, ''); ring.hidden = false; t0 = performance.now();
    var F = HIC.FLIGHT[T.type], W = HIC.win(T.type), big = innerWidth < 600 ? 150 : 200;
    var tick = function (now) {
      var t = now - t0, k = Math.min(1, t / F), e = k * k;   // ease-in: it speeds up as it gets close
      var y = 30 + (62 - 30) * e, d = 14 + (big - 14) * e;
      var x = T.type === 'curve' ? Math.sin(k * Math.PI * 1.5) * Math.min(innerWidth * 0.18, 140) * (1 - k * 0.6) : 0;
      if (T.type === 'lob') y = 30 + (62 - 30) * k - Math.sin(k * Math.PI) * 14;
      if (RM.matches) { y = 56; x = 0; d = 14 + (big - 14) * Math.floor(k * 6) / 6; }
      setBall(y, d, x); ring.classList.toggle('is-hot', t >= W[0] && t <= W[1]);
      if (t > W[1]) return result('missed');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function press() {
    if (state !== 'fly') return;
    result(HIC.judge(T.type, performance.now() - t0));
  }
  function result(r) {
    clearRun(); state = 'done'; ring.classList.remove('is-hot'); ring.hidden = true;
    if (r === 'caught') { anim('is-caught'); var d = document.createElement('div'); d.className = 'hic-dust'; d.style.setProperty('--y', ball.style.getPropertyValue('--y')); document.body.appendChild(d); setTimeout(function () { d.remove(); }, 600); text(COPY.caught, COPY.caughtSub); }
    else if (r === 'early') text(COPY.missed, COPY.early);
    else { setBall(80, 60, 120); text(COPY.missed, COPY.missedSub); }
    setTimeout(function () { if (state === 'done') { setBall(innerWidth < 600 ? 44 : 48, innerWidth < 600 ? 90 : 120); } }, 700);
    actions('a-done'); $('back').focus();
  }
  $('scene').addEventListener('pointerdown', function (e) { if (state === 'fly') { e.preventDefault(); press(); } });
  ball.addEventListener('pointerdown', function () { press(); }); ring.addEventListener('pointerdown', function () { press(); });
  document.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && state === 'fly') { e.preventDefault(); press(); } });
  $('ready').onclick = countdown;
  $('again').onclick = function () { readyScreen(); };
  $('back').onclick = function () { history.replaceState(null, '', location.pathname); T = null; $('board').textContent = COPY.title; maker(); };
  // Page hidden mid-throw: never a miss. Pause and return to ready.
  document.addEventListener('visibilitychange', function () { if (document.hidden && (state === 'count' || state === 'fly')) readyScreen(COPY.paused); });
  window.addEventListener('blur', function () { if (state === 'count' || state === 'fly') readyScreen(COPY.paused); });

  function route() {
    clearRun(); var h = location.hash;
    if (!h || h === '#') { T = null; $('board').textContent = COPY.title; return maker(); }
    T = HIC.decode(h);
    if (!T) { state = 'bad'; rest(); text(COPY.missed, COPY.badLink); return actions('a-bad'); }
    readyScreen();
  }
  window.addEventListener('hashchange', route);
  route();
})();
