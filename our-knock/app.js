'use strict';
// Our Knock. COPY from copy.js verbatim. Rhythm (relative tap gaps) + optional note live only in the URL fragment.
// This is a game, not a lock: anyone with the link can decode it.
var OK = (function () {
  var MIN = 3, MAX = 12, NOTE_MAX = 80, FRAG_MAX = 480, GAP_UNIT = 10, GAP_MAX = 2550; // gaps stored in 10 ms units, ≤2.55 s
  // Tolerance (documented): compare gap PROPORTIONS (speed-independent). Open if every gap is within 0.10 of the
  // original's share of the total and the mean error is ≤ 0.06. "So close" within 1.6× that. After 3 misses, tolerance widens 1.5×.
  var TOL = { each: 0.10, mean: 0.06 };
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]*$/.test(s)) throw 0; s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function clean(s) { return String(s || '').replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function seal(f) { return f + '.' + ck(f); }
  function unseal(f) { var i = f.lastIndexOf('.'); if (i < 0) return null; var body = f.slice(0, i); return /^[0-9a-f]{6}$/.test(f.slice(i + 1)) && ck(body) === f.slice(i + 1) ? body : null; }
  function gapsFromTimes(t) { var g = []; for (var i = 1; i < t.length; i++) g.push(Math.max(GAP_UNIT, Math.min(GAP_MAX, Math.round((t[i] - t[i - 1]) / GAP_UNIT) * GAP_UNIT))); return g; }
  function encode(gaps, note) {
    var f = '1.' + b64u(gaps.map(function (g) { return Math.round(g / GAP_UNIT); }));
    note = clean(note); if (note) f += '.' + b64u(new TextEncoder().encode(note));
    return seal(f);
  }
  function decode(frag) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > FRAG_MAX) return null;
    frag = unseal(frag); if (!frag) return null;
    var p = frag.split('.'); if (p[0] !== '1' || p.length < 2 || p.length > 3) return null;
    try {
      var g = Array.from(unb64u(p[1])).map(function (x) { return x * GAP_UNIT; });
      if (g.length < MIN - 1 || g.length > MAX - 1 || g.some(function (x) { return x < GAP_UNIT; })) return null;
      var note = p[2] ? clean(new TextDecoder('utf-8', { fatal: true }).decode(unb64u(p[2]))) : '';
      if (Array.from(note).length > NOTE_MAX) return null;
      return { gaps: g, note: note };
    } catch (e) { return null; }
  }
  function compare(orig, attempt, misses) {
    if (attempt.length !== orig.length) return 'wrong';
    var so = orig.reduce(function (a, b) { return a + b; }, 0), sa = attempt.reduce(function (a, b) { return a + b; }, 0);
    var errs = orig.map(function (g, i) { return Math.abs(g / so - attempt[i] / sa); });
    var mx = Math.max.apply(null, errs), mean = errs.reduce(function (a, b) { return a + b; }, 0) / errs.length, k = misses >= 3 ? 1.5 : 1;
    if (mx <= TOL.each * k && mean <= TOL.mean * k) return 'open';
    if (mx <= TOL.each * 1.6 * k && mean <= TOL.mean * 1.6 * k) return 'close';
    return 'wrong';
  }
  return { MIN: MIN, MAX: MAX, NOTE_MAX: NOTE_MAX, FRAG_MAX: FRAG_MAX, TOL: TOL, clean: clean, gapsFromTimes: gapsFromTimes, encode: encode, decode: decode, compare: compare };
})();
if (typeof module !== 'undefined') module.exports = OK;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('note').placeholder = COPY.notePlaceholder;
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function panel(id) { ['p-make', 'p-share', 'p-recv', 'p-open', 'p-bad'].forEach(function (x) { $(x).hidden = x !== id; }); }
  var door = $('door');

  // ---- sound: soft synthesized knock (no samples); starts only from a tap/press
  var AC = null, muted = false;
  function knockSound() {
    if (muted) return;
    try {
      if (!AC) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
      if (AC.state === 'suspended') AC.resume();
      var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * 0.08, AC.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      n.buffer = b; var bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 220; bp.Q.value = 2.5;
      o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); n.connect(bp); bp.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.18); n.start(t);
    } catch (e) {}
  }
  $('mute').onclick = function () { muted = !muted; $('mute').setAttribute('aria-pressed', muted ? 'true' : 'false'); $('mute').textContent = muted ? COPY.unmute : COPY.mute; };
  function visualKnock() {
    door.classList.remove('is-knock'); void door.offsetWidth; door.classList.add('is-knock');
    if (!RM.matches) { var r = document.createElement('span'); r.className = 'ok-ring'; door.appendChild(r); setTimeout(function () { r.remove(); }, 650); }
  }
  function bars(gaps, hit) {
    var host = $('taps'); host.textContent = ''; if (!gaps) return;
    var mx = Math.max.apply(null, gaps.concat([1]));
    for (var i = 0; i <= gaps.length; i++) { var b = document.createElement('i'); var v = i < gaps.length ? gaps[i] : mx; b.style.setProperty('--h', Math.round(30 + 70 * v / mx) + '%'); if (hit != null && i < hit) b.className = 'is-hit'; host.appendChild(b); }
  }

  // ---- tap capture (shared by maker and receiver): finishes after 1.6 s of silence or MAX taps
  var mode = 'idle', times = [], idle = 0, cb = null;
  function listen(onDone) { mode = 'listen'; times = []; cb = onDone; }
  function tap() {
    if (mode === 'open') return;
    knockSound(); visualKnock();
    if (mode !== 'listen') return;
    times.push(performance.now()); clearTimeout(idle);
    if (times.length === 1 && state === 'make') $('msg').textContent = COPY.recording;
    if (state === 'recv') bars(T.gaps, times.length);
    if (times.length >= OK.MAX) { if (state === 'make') $('msg').textContent = COPY.tooMany; return finish(); }
    idle = setTimeout(finish, 1600);
  }
  function finish() { clearTimeout(idle); mode = 'idle'; var t = times.slice(); times = []; if (cb) cb(t); }
  door.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(); });
  door.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) tap(); } });

  // ---- playback (teach / replay)
  var playing = [];
  function play(gaps) {
    playing.forEach(clearTimeout); playing = []; var at = 0;
    bars(gaps, 0);
    for (var i = 0; i <= gaps.length; i++) { (function (k, when) { playing.push(setTimeout(function () { knockSound(); visualKnock(); bars(gaps, k + 1); }, when)); })(i, at); at += gaps[i] || 0; }
  }

  // ---- maker
  var state = 'make', G = null, link = '';
  function maker() {
    state = 'make'; G = null; $('h').textContent = COPY.title; $('lede').textContent = COPY.invitation; $('hint').textContent = COPY.recordHint; $('msg').textContent = '';
    $('behind').textContent = ''; door.classList.remove('is-open'); panel(null); bars(null);
    listen(gotKnock);
  }
  function gotKnock(t) {
    if (t.length < OK.MIN) { $('msg').textContent = COPY.tooFew; return listen(gotKnock); }
    G = OK.gapsFromTimes(t.slice(0, OK.MAX)); bars(G); $('msg').textContent = t.length >= OK.MAX ? COPY.tooMany : ''; panel('p-make'); $('closeDoor').focus();
  }
  $('redo').onclick = function () { panel(null); bars(null); $('msg').textContent = ''; listen(gotKnock); door.focus(); };
  $('replay').onclick = function () { if (G) play(G); };
  function noteCheck() { var n = Array.from(OK.clean($('note').value)).length; $('note-msg').textContent = n > OK.NOTE_MAX ? fill(COPY.noteTooLong, { n: n - OK.NOTE_MAX }) : ''; return n <= OK.NOTE_MAX; }
  $('note').addEventListener('input', noteCheck);
  $('closeDoor').onclick = function () {
    if (!G || !noteCheck()) return;
    var f = OK.encode(G, $('note').value); if (f.length > OK.FRAG_MAX) { $('note-msg').textContent = fill(COPY.noteTooLong, { n: Math.max(1, Math.ceil((f.length - OK.FRAG_MAX) * 3 / 4 / 4)) }); return; }
    link = location.origin + location.pathname + '#' + f; panel('p-share'); $('share').focus();
  };
  $('share').onclick = function () {
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };

  // ---- receiver
  var T = null, misses = 0;
  function receiver() {
    state = 'recv'; misses = 0; $('h').textContent = COPY.receiverIntro; $('lede').textContent = ''; $('hint').textContent = COPY.tolerance; $('msg').textContent = '';
    $('behind').textContent = T.note || COPY.noNote; door.classList.remove('is-open'); panel('p-recv'); bars(T.gaps, 0);
    listen(gotAttempt);
  }
  function gotAttempt(t) {
    var r = t.length < 2 ? 'wrong' : OK.compare(T.gaps, OK.gapsFromTimes(t), misses);
    if (r === 'open') {
      mode = 'open'; door.classList.add('is-open'); $('h').textContent = COPY.opened; $('msg').textContent = ''; $('hint').textContent = '';
      panel('p-open'); door.setAttribute('aria-label', T.note || COPY.noNote); $('back').focus(); return;
    }
    misses++; $('msg').textContent = r === 'close' ? COPY.close : COPY.tryAgain; bars(T.gaps, 0); listen(gotAttempt);
  }
  $('teach').onclick = function () { play(T.gaps); };
  $('back').onclick = function (e) { e.preventDefault(); history.replaceState(null, '', location.pathname); maker(); };

  function route() {
    var h = location.hash;
    if (!h || h === '#') return maker();
    T = OK.decode(h); if (!T) { state = 'bad'; mode = 'idle'; $('h').textContent = COPY.title; $('lede').textContent = COPY.badLink; $('hint').textContent = ''; panel('p-bad'); return; }
    receiver();
  }
  window.addEventListener('hashchange', route);
  route();
})();
