'use strict';
// C201 Broken Telephone — one phone, 2–8 players, memory only (no links, no storage). Survivors = LCS of normalized word tokens (repeat-aware).
var BT = (function () {
  var SMAX = 80, REVEAL = 4;
  // Words = letter/number runs (apostrophes and hyphens joined); every emoji (with its modifiers/ZWJ sequence), flag or symbol is its own word. VS16 ignored.
  function tokens(s) { return (String(s || '').normalize('NFC').toLowerCase().replace(/['’-]/g, '').match(/[\p{L}\p{N}\p{M}]+|\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}\uFE0F\u20E3]|\u200D\p{Extended_Pictographic})*|\p{Regional_Indicator}{2}|\p{S}/gu) || []).map(function (t) { return t.replace(/\uFE0F/g, ''); }); }
  // LCS over word tokens: order matters; each occurrence matches at most once. Returns count + matched indices for <mark>.
  function lcs(a, b) { var n = a.length, m = b.length, T = []; for (var i = 0; i <= n; i++) { T.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) T[i][j] = a[i] === b[j] ? T[i + 1][j + 1] + 1 : Math.max(T[i + 1][j], T[i][j + 1]);
    var ma = [], mb = []; i = 0; j = 0; while (i < n && j < m) { if (a[i] === b[j]) { ma.push(i); mb.push(j); i++; j++; } else if (T[i + 1][j] >= T[i][j + 1]) i++; else j++; }
    return { n: T[0][0], a: ma, b: mb }; }
  function coil(L, flip) { var pts = [], N = 7, S = 220; for (var k = 0; k <= S; k++) { var t = k / S, th = t * N * 2 * Math.PI, taper = Math.min(1, t * 6, (1 - t) * 6), along = t * L - 6 * Math.sin(th) * taper, side = 9 * Math.cos(th) * taper; pts.push([along, side]); }
    var x0 = 125, y0 = 0, x1 = 255, y1 = 66, dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    return 'M' + pts.map(function (p) { var s = p[0] / L * len; return (x0 + ux * s - uy * p[1]).toFixed(1) + ' ' + (y0 + uy * s + ux * p[1]).toFixed(1); }).join(' L'); }
  return { SMAX: SMAX, REVEAL: REVEAL, tokens: tokens, lcs: lcs, coil: coil };
})();
if (typeof module !== 'undefined') module.exports = BT;

if (typeof document !== 'undefined') (function () {
  var $ = L.$, NS = 'http://www.w3.org/2000/svg'; L.bind(); L.chrome();
  var players = 4, R = null, tick = 0, CORD = BT.coil(150);
  function count() { $('pcount').textContent = L.plural(COPY.playerCount, players); $('minus').disabled = players <= 2; $('plus').disabled = players >= 8;
    $('minus').setAttribute('aria-label', L.plural(COPY.playerCount, Math.max(2, players - 1))); $('plus').setAttribute('aria-label', L.plural(COPY.playerCount, Math.min(8, players + 1))); }
  $('minus').onclick = function () { players = Math.max(2, players - 1); count(); }; $('plus').onclick = function () { players = Math.min(8, players + 1); count(); }; count();
  function show(id) { ['setup', 'type', 'finale'].forEach(function (s) { $(s).hidden = s !== id; }); }
  function begin(solo) { R = { solo: solo, total: solo ? 3 : players, turn: 1, lines: [] }; $('solo').hidden = !solo; $('chain').textContent = ''; $('driftlab').hidden = true; $('msg').textContent = ''; turn(); }
  $('start').onclick = function () { begin(false); }; $('demo').onclick = function () { begin(true); };
  function who(n) { return R.solo ? L.fill(COPY.soloPlayer, { n: n, total: R.total }) : ''; }
  function turn() { show('type'); $('sentence').value = ''; $('smsg').textContent = ''; $('reveal').hidden = true; $('rcount').textContent = '';
    if (R.turn === 1) { $('tprompt').textContent = (R.solo ? who(1) + ' · ' : '') + COPY.firstPrompt; $('sentence').placeholder = COPY.sentencePlaceholder; $('sentence').hidden = false; $('pass').hidden = false; $('sentence').focus(); }
    else cover(); }
  // cover sheet at every handoff; the reveal starts only after Ready
  function cover() { var c = $('cover'); c.hidden = false; c.setAttribute('aria-label', COPY.coverAria); document.querySelector('.bt-page').inert = true;
    $('cbig').textContent = String(R.turn); $('chead').textContent = R.solo ? who(R.turn) : L.fill(COPY.handoff, { n: R.turn }); $('ready').textContent = L.fill(COPY.readyButton, { n: R.turn }); $('ready').focus(); }
  $('ready').onclick = function () { $('cover').hidden = true; document.querySelector('.bt-page').inert = false; reveal(); };
  function reveal() { var prev = R.lines[R.lines.length - 1], left = BT.REVEAL; $('tprompt').textContent = (R.solo ? who(R.turn) + ' · ' : '') + (L.reduce ? COPY.reducedMotionReveal : COPY.revealing);
    $('reveal').hidden = false; $('reveal').textContent = prev; $('sentence').hidden = true; $('pass').hidden = true; $('rcount').textContent = L.plural(COPY.revealCount, left);
    clearInterval(tick); tick = setInterval(function () { left--; if (left > 0) { $('rcount').textContent = L.plural(COPY.revealCount, left); return; }
      clearInterval(tick); $('reveal').hidden = true; $('reveal').textContent = ''; $('rcount').textContent = ''; $('tprompt').textContent = (R.solo ? who(R.turn) + ' · ' : '') + COPY.hidden;
      $('sentence').hidden = false; $('sentence').placeholder = COPY.retypePlaceholder; $('pass').hidden = false; $('sentence').focus(); }, 1000); }
  $('sentence').addEventListener('input', function () { var o = L.len(L.clean($('sentence').value)) - BT.SMAX; $('smsg').textContent = o > 0 ? L.plural(COPY.sentenceTooLong, o) : ''; });
  $('sentence').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('pass').click(); });
  $('pass').onclick = function () { var s = L.clean($('sentence').value); if (!s) { $('smsg').textContent = COPY.sentenceEmpty; return; } if (L.len(s) > BT.SMAX) return;
    R.lines.push(s); $('sentence').value = ''; if (R.turn >= R.total) return finale(); R.turn++; turn(); };
  function bubble(text, side, cls, label, marks) { var b = document.createElement('div'); b.className = 'bt-bubble bt-bubble--' + side + (cls ? ' ' + cls : ''); var sm = document.createElement('small'); sm.textContent = label; b.appendChild(sm); paintMarks(b, text, marks); return b; }
  function paintMarks(el, text, marks) { var words = text.split(/(\s+)/), ti = 0; words.forEach(function (w) { if (!w.trim()) { el.appendChild(document.createTextNode(w)); return; }
      var t = BT.tokens(w), hit = t.length && marks && marks.indexOf(ti) >= 0; ti += t.length; if (hit) { var m = document.createElement('mark'); m.textContent = w; el.appendChild(m); } else el.appendChild(document.createTextNode(w)); }); }
  function cord(flip) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'bt-cord is-new' + (flip ? ' is-flip' : '')); s.setAttribute('viewBox', '0 0 380 66'); s.setAttribute('aria-hidden', 'true');
    ['c-out', 'c-in'].forEach(function (c) { var p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); p.setAttribute('d', CORD); s.appendChild(p); }); return s; }
  function finale() {
    show('finale'); var o = R.lines[0], f = R.lines[R.lines.length - 1], A = BT.tokens(o), B = BT.tokens(f), M = BT.lcs(A, B);
    $('forig').textContent = ''; $('ffinal').textContent = ''; paintMarks($('forig'), o, M.a); paintMarks($('ffinal'), f, M.b);
    $('score').textContent = M.n === 0 ? COPY.survivorsNone : M.n === A.length ? COPY.survivorsAll : L.fill(M.n === 1 ? COPY.survivors.one : COPY.survivors.other, { n: M.n, total: A.length });
    var ch = $('chain'); ch.textContent = ''; $('driftlab').hidden = false;
    R.lines.forEach(function (s, i) { if (i) ch.appendChild(cord(i % 2 === 0)); ch.appendChild(bubble(s, i % 2 ? 'r' : 'l', i === 0 ? 'bt-bubble--start' : i === R.lines.length - 1 ? 'bt-bubble--end' : '', i === 0 ? COPY.original : i === R.lines.length - 1 ? COPY.final : String(i + 1), i === 0 ? M.a : i === R.lines.length - 1 ? M.b : null)); });
    voiceCheck();
  }
  // read-aloud: only with a voice that runs on this device (localService); never a remote voice, never the mic
  var voice = null;
  function voiceCheck() { voice = null; $('speak').hidden = true; $('novoice').hidden = true; if (!('speechSynthesis' in window)) { $('novoice').textContent = COPY.noVoice; $('novoice').hidden = false; return; }
    var pick = function () { var v = speechSynthesis.getVoices().filter(function (x) { return x.localService; }); voice = v.filter(function (x) { return (x.lang || '').slice(0, 2) === (navigator.language || 'en').slice(0, 2); })[0] || v[0] || null;
      $('speak').hidden = !voice; $('novoice').textContent = voice ? '' : COPY.noVoice; $('novoice').hidden = !!voice; };
    pick(); if (!voice) speechSynthesis.addEventListener('voiceschanged', pick, { once: true }); }
  $('speak').onclick = function () { if (speechSynthesis.speaking) { speechSynthesis.cancel(); $('speak').textContent = COPY.readAloud; return; }
    if (!voice || !voice.localService) return; var u = new SpeechSynthesisUtterance(R.lines[0] + '. … ' + R.lines[R.lines.length - 1]); u.voice = voice; u.volume = .8;
    u.onend = function () { $('speak').textContent = COPY.readAloud; }; $('speak').textContent = COPY.stopReading; speechSynthesis.speak(u); };
  function end() { if (!confirm(COPY.resetConfirm)) return; clearInterval(tick); if ('speechSynthesis' in window) speechSynthesis.cancel(); R = null; $('chain').textContent = ''; $('driftlab').hidden = true; $('solo').hidden = true; show('setup'); }
  $('end1').onclick = end; $('end2').onclick = end;
  $('again').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); var solo = R && R.solo; begin(!!solo); };
})();
