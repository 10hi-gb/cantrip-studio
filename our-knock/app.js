'use strict';
// C051 Our Knock — "The Green Door: Call & Answer" (rework 2026-10-14, Creative ENGINEER-HANDOFF). All text from COPY (Writer, verbatim).
// Fragment: #k1.<mode>[.<call>[.<answer>]][.n.<note>]  (≤ 400 chars). s = classic preset, c = call + expected answer, r = call, recipient repeats.
// Gaps in 10 ms units, base36, joined by '-'. c answer = <lead>~<gaps> ('0' for a 1-knock answer). Note = base64url(UTF-8), ≤ 80 chars.
// A game, not a lock: anyone with the link can read the knock and note. No mic, no storage, no network.
var OK = (function () {
  var FRAG_MAX = 400, NOTE_MAX = 80;
  var B = { callMin: 3, callMax: 12, ansMin: 1, ansMax: 8, gapMin: 80, gapMax: 2000, callTotal: 6000, ansTotal: 4000, leadMin: 300, leadMax: 3000 };
  // classic at 100 bpm: call 0/600/900/1200/1800, answer 3000/3600 (lead 1200)
  var CLASSIC = { call: [600, 300, 300, 600], lead: 1200, ans: [600], syl: ['Shave', 'and', 'a', 'hair', 'cut', 'two', 'bits'] };
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]+$/.test(s) || s.length % 4 === 1) throw 0; s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function clean(s) { return String(s || '').replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
  function clampGap(ms) { return Math.max(B.gapMin, Math.min(B.gapMax, Math.round(ms / 10) * 10)); }
  function enc(g) { return g.map(function (x) { return Math.round(x / 10).toString(36); }).join('-'); }
  var GAPS = /^[0-9a-z]{1,2}(-[0-9a-z]{1,2})*$/;
  function dec(s, nMin, nMax) { if (!GAPS.test(s)) return null; var g = s.split('-').map(function (x) { return parseInt(x, 36) * 10; });
    if (g.length < nMin - 1 || g.length > nMax - 1 || g.some(function (x) { return x < B.gapMin || x > B.gapMax; })) return null; return g; }
  function okCall(g) { return g.length >= B.callMin - 1 && g.length <= B.callMax - 1 && sum(g) <= B.callTotal; }
  function okAns(g) { return g.length >= B.ansMin - 1 && g.length <= B.ansMax - 1 && sum(g) <= B.ansTotal; }
  // spec: {mode:'s'|'c'|'r', call:[gaps], lead, ans:[gaps]}, note
  function encode(spec, note) {
    var f = 'k1.' + spec.mode;
    if (spec.mode === 'c') { if (!okCall(spec.call) || !okAns(spec.ans)) return null; f += '.' + enc(spec.call) + '.' + Math.round(spec.lead / 10).toString(36) + '~' + (spec.ans.length ? enc(spec.ans) : '0'); }
    else if (spec.mode === 'r') { if (!okCall(spec.call)) return null; f += '.' + enc(spec.call); }
    else if (spec.mode !== 's') return null;
    note = clean(note); if (Array.from(note).length > NOTE_MAX) return null;
    if (note) f += '.n.' + b64u(new TextEncoder().encode(note));
    return f.length <= FRAG_MAX ? f : null;
  }
  // -> {mode, call, lead, ans, note} | null (badLink). Strict per segment; never echoes raw text.
  function decode(frag) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > FRAG_MAX) return null;
    var p = frag.split('.'), note = '', i = p.indexOf('n');
    if (i >= 0) { if (i !== p.length - 2) return null; try { note = new TextDecoder('utf-8', { fatal: true }).decode(unb64u(p[i + 1])); } catch (e) { return null; }
      if (note !== clean(note) || !note || Array.from(note).length > NOTE_MAX) return null; p = p.slice(0, i); }
    if (p[0] !== 'k1') return null;
    var r;
    if (p[1] === 's' && p.length === 2) r = { mode: 's', call: CLASSIC.call.slice(), lead: CLASSIC.lead, ans: CLASSIC.ans.slice() };
    else if (p[1] === 'r' && p.length === 3) { var c = dec(p[2], B.callMin, B.callMax); if (!c || !okCall(c)) return null; r = { mode: 'r', call: c, lead: 0, ans: c.slice() }; }
    else if (p[1] === 'c' && p.length === 4) {
      var c2 = dec(p[2], B.callMin, B.callMax), m = /^([0-9a-z]{1,3})~(0|[0-9a-z]{1,2}(?:-[0-9a-z]{1,2})*)$/.exec(p[3]); if (!c2 || !okCall(c2) || !m) return null;
      var lead = parseInt(m[1], 36) * 10; if (lead < B.leadMin || lead > B.leadMax) return null;
      var a = m[2] === '0' ? [] : dec(m[2], 2, B.ansMax); if (!a || !okAns(a)) return null; r = { mode: 'c', call: c2, lead: lead, ans: a };
    } else return null;
    r.note = note; return r;
  }
  // t: answer knock times in ms relative to the LAST CALL knock (s/c) or to the end of the call (r). misses widen tolerances ×1.5 after 2.
  // -> {ok:true} | {ok:false, why:'early'|'late'|'count'|'rhythm', off:n}
  function judge(spec, t, misses) {
    var k = misses >= 2 ? 1.5 : 1, exp = spec.ans.length + 1, n = t.length;
    var open = spec.mode === 'r' ? 0 : 250, close = spec.mode === 'r' ? 4000 : spec.lead + 2500;
    if (!n) return { ok: false, why: 'late' };
    if (t[0] < open / k) return { ok: false, why: 'early' };
    if (t[0] > close * k) return { ok: false, why: 'late' };
    var slack = exp >= 4 ? 1 : 0;
    if (Math.abs(n - exp) > slack) return { ok: false, why: 'count', off: n - exp };
    if (exp >= 2 && n >= 2) {
      var g = []; for (var i = 1; i < n; i++) g.push(t[i] - t[i - 1]);
      if (exp === 2) { if (g[0] < 150 / k || g[0] > 1400 * k) return { ok: false, why: 'rhythm' }; }
      else { var m = Math.min(g.length, spec.ans.length), gs = sum(g.slice(0, m)), es = sum(spec.ans.slice(0, m));
        for (var j = 0; j < m; j++) if (Math.abs(g[j] / gs - spec.ans[j] / es) > 0.18 * k) return { ok: false, why: 'rhythm' }; }
    }
    return { ok: true };
  }
  return { FRAG_MAX: FRAG_MAX, NOTE_MAX: NOTE_MAX, B: B, CLASSIC: CLASSIC, clean: clean, clampGap: clampGap, sum: sum, encode: encode, decode: decode, judge: judge };
})();
if (typeof module !== 'undefined') module.exports = OK;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var plural = function (o, n) { return fill(n === 1 ? o.one : o.other, { n: n }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  Array.prototype.forEach.call(document.querySelectorAll('[data-al]'), function (n) { n.setAttribute('aria-label', COPY[n.getAttribute('data-al')]); });
  $('note').placeholder = COPY.notePlaceholder;
  var door = $('door'), rail = $('rail');
  function flow(id) { ['f-make', 'f-share', 'f-gate', 'f-ans', 'f-miss', 'f-open', 'f-bad'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function plate(b, s) { $('plate').hidden = !b; $('plate-b').textContent = b || ''; $('plate-s').textContent = s || ''; }
  function head(h, lede, status) { $('h').textContent = h || ''; $('lede').textContent = lede || ''; $('status').textContent = status || ''; $('status').classList.remove('is-sr'); $('h').classList.remove('is-small'); $('phrase').hidden = true; }

  // ---------- audio (Creative §3): context only from a gesture; synth knocks on the audio clock; visuals follow that clock ----------
  var muted = false, master = null, comp = null, needResume = false;
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
  function unlock() { var c = AudioUnlock.poke(); if (c && !master) { comp = c.createDynamicsCompressor(); master = c.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(comp); comp.connect(c.destination); } needResume = false; return c; }
  document.addEventListener('visibilitychange', function () { if (document.hidden) needResume = true; });
  function live() { var c = AudioUnlock.ctx(); return c && c.state === 'running' && master ? c : null; }
  function knockAt(c, t, hi) {
    var len = Math.round(c.sampleRate * 0.025), b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var n = c.createBufferSource(); n.buffer = b; var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hi ? 1100 : 900; bp.Q.value = 1.2;
    var g1 = c.createGain(); g1.gain.setValueAtTime(0.5, t); g1.gain.linearRampToValueAtTime(0, t + 0.045); n.connect(bp); bp.connect(g1); g1.connect(master); n.start(t);
    var o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(hi ? 170 : 150, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    var g2 = c.createGain(); g2.gain.setValueAtTime(0.6, t); g2.gain.linearRampToValueAtTime(0, t + 0.07); o.connect(g2); g2.connect(master); o.start(t); o.stop(t + 0.08);
  }
  function ding(c) { var t = c.currentTime + 0.02; [784, 1175].forEach(function (f, i) { var o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.35, t + i * 0.12 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.6); o.connect(g); g.connect(master); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.65); }); }
  var lat = function (c) { return c.outputLatency || c.baseLatency || 0; };
  var sched = { n: 0 }; window.__okAudio = function () { var c = AudioUnlock.ctx(); return { state: c ? c.state : 'none', scheduled: sched.n, live: !!live() }; };
  function setSound() { $('sound').textContent = muted ? COPY.unmute : COPY.mute; if (master) master.gain.value = muted ? 0 : 0.7; }
  $('sound').onclick = function () { muted = !muted; setSound(); }; setSound();
  AudioUnlock.onLive(function () { $('sound').classList.add('is-live'); }); // visible "sound is on" cue once audio actually runs

  // ---------- visuals ----------
  function visualKnock() {
    if (RM.matches) { door.classList.add('is-flash'); setTimeout(function () { door.classList.remove('is-flash'); }, 120); return; }
    door.classList.remove('is-knock'); void door.offsetWidth; door.classList.add('is-knock');
    var r = document.createElement('span'); r.className = 'ok-ring'; door.appendChild(r); setTimeout(function () { r.remove(); }, 650);
  }
  // rail: studs on a time axis (call, then answer after its lead); ticks mark where a visitor's answer knocks landed
  var R = null; // {spec, callX[], ansX[], span}
  function buildRail(spec) {
    var ct = [0], i; for (i = 0; i < spec.call.length; i++) ct.push(ct[i] + spec.call[i]);
    var lead = spec.mode === 'r' ? 1000 : spec.lead, a0 = ct[ct.length - 1] + lead, at = [a0]; for (i = 0; i < spec.ans.length; i++) at.push(at[i] + spec.ans[i]);
    var span = at[at.length - 1] || 1; R = { spec: spec, ct: ct, at: at, span: span, a0: a0 }; rail.textContent = ''; rail.classList.remove('is-done');
    var syl = spec.mode === 's' ? OK.CLASSIC.syl : null;
    ct.forEach(function (t, k) { stud('is-call', t / span * 100, syl && syl[k]); }); at.forEach(function (t, k) { stud('is-ans', t / span * 100, syl && syl[ct.length + k]); });
    railLabel(0);
  }
  function stud(cls, x, s) { var e = document.createElement('span'); e.className = 'ok-stud ' + cls; e.style.setProperty('--x', x.toFixed(1)); if (s) { var y = document.createElement('span'); y.className = 'syl'; y.textContent = s; e.appendChild(y); } rail.appendChild(e); }
  function studs(cls) { return Array.prototype.slice.call(rail.querySelectorAll('.ok-stud.' + cls)); }
  function railLabel(answered) { if (!R) return; rail.setAttribute('aria-label', fill(COPY.railAria, { callCount: plural(COPY.callCount, R.ct.length), answerCount: plural(COPY.callCount, R.at.length), answered: answered })); }
  function railReset(onCall) { studs('is-call').forEach(function (s) { s.classList.toggle('is-on', !!onCall); }); studs('is-ans').forEach(function (s) { s.classList.remove('is-on', 'is-miss'); }); Array.prototype.forEach.call(rail.querySelectorAll('.ok-tick'), function (t) { t.remove(); }); rail.classList.remove('is-done'); }

  // ---------- playback: audio-clock schedule (or performance clock if no running audio), rAF drives door + studs ----------
  var playing = null;
  function playPhrase(times, which, done) { // times: ms offsets; which[i] = 'call'|'ans'
    if (playing) cancelAnimationFrame(playing.raf); var c = live(), startPerf, i;
    if (c) { var t0 = c.currentTime + 0.15; for (i = 0; i < times.length; i++) { knockAt(c, t0 + times[i] / 1000, which[i] === 'ans'); sched.n++; }
      startPerf = performance.now() + (t0 - c.currentTime + lat(c)) * 1000; }
    else startPerf = performance.now() + 150;
    var k = 0, cs = studs('is-call'), as = studs('is-ans'), ci = 0, ai = 0, P = playing = { raf: 0 };
    (function tick() { var now = performance.now() - startPerf;
      while (k < times.length && now >= times[k]) { visualKnock(); if (which[k] === 'call') { if (cs[ci]) cs[ci].classList.add('is-on'); ci++; } else { if (as[ai]) as[ai].classList.add('is-on'); ai++; } k++; }
      if (k < times.length) P.raf = requestAnimationFrame(tick); else { playing = null; if (done) done(startPerf + times[times.length - 1]); } })();
  }
  function callTimes() { return R.ct.slice(); }

  // ---------- input: whole door is the pad ----------
  var onKnock = null, lastIn = -1e9;
  function knockIn(e) {
    var now = performance.now(); if (now - lastIn < 40) return; lastIn = now;
    var c = unlock(); if (c && c.state === 'running' && master) { knockAt(c, c.currentTime + 0.005, state === 'recv'); sched.n++; }
    visualKnock(); if (onKnock) onKnock(now);
  }
  door.addEventListener('pointerdown', function (e) { if (!e.isPrimary || door.classList.contains('is-open')) return; e.preventDefault(); knockIn(e); });
  door.addEventListener('pointerup', function () { unlock(); }); // pointerup is an activating gesture on mobile: lets audio start from the first tap
  door.addEventListener('keydown', function (e) { var k = e.key; if ((k === ' ' || k === 'Enter' || k === 'k' || k === 'K') && !door.classList.contains('is-open')) { e.preventDefault(); if (!e.repeat) knockIn(e); } });

  // ---------- sender ----------
  var state = 'make', mode = 's', spec = null, link = '', rec = null;
  var MODES = [['s', 'modeClassic', 'modeClassicHint'], ['c', 'modeCustom', 'modeCustomHint'], ['r', 'modeCopy', 'modeCopyHint']];
  var mbtn = MODES.map(function (m, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'ok-mode'; b.setAttribute('role', 'radio'); b.tabIndex = i ? -1 : 0;
    var dot = document.createElement('i'), sp = document.createElement('span'), t = document.createElement('b'), s = document.createElement('small'); t.textContent = COPY[m[1]]; s.textContent = COPY[m[2]]; sp.appendChild(t); sp.appendChild(s); b.appendChild(dot); b.appendChild(sp);
    b.onclick = function () { setMode(m[0]); };
    b.onkeydown = function (e) { var j = i; if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % 3; else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i + 2) % 3; else return; e.preventDefault(); setMode(MODES[j][0]); mbtn[j].focus(); };
    $('modes').appendChild(b); return b; });
  function setMode(m) { mode = m; mbtn.forEach(function (b, i) { var on = MODES[i][0] === m; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); startMake(); }
  function startMake() {
    state = 'make'; flow('f-make'); $('modes').hidden = false; door.classList.remove('is-open', 'is-turn'); $('note-out').textContent = ''; $('msg').textContent = ''; $('linkbox').hidden = true;
    head(COPY.title, COPY.invitation, ''); plate(COPY.padPlate, COPY.padPlateHint);
    if (mode === 's') { spec = { mode: 's', call: OK.CLASSIC.call.slice(), lead: OK.CLASSIC.lead, ans: OK.CLASSIC.ans.slice() }; buildRail(spec); railReset(true); $('hint').textContent = ''; $('done').hidden = true; $('replay').hidden = false; $('redo').hidden = true; $('closeDoor').disabled = false; onKnock = null; }
    else { spec = null; rail.textContent = ''; R = null; $('hint').textContent = COPY.stepCall + ' ' + COPY.recordHint; $('done').hidden = false; $('replay').hidden = true; $('redo').hidden = true; $('closeDoor').disabled = true; record('call'); }
  }
  // recording: stops 1.5 s after the last tap or on Done
  function record(part) { rec = { part: part, t: [], idle: 0, callEnd: rec && rec.callEnd }; onKnock = function (now) { if (!rec) return; rec.t.push(now); clearTimeout(rec.idle); rec.idle = setTimeout(stopRec, 1500); }; }
  function gapsOf(t) { var g = []; for (var i = 1; i < t.length; i++) g.push(OK.clampGap(t[i] - t[i - 1])); return g; }
  function stopRec() {
    if (!rec) return; clearTimeout(rec.idle); var t = rec.t;
    if (rec.part === 'call') {
      if (t.length < OK.B.callMin) { $('msg').textContent = t.length ? COPY.tooFew : ''; if (t.length) record('call'); return; }
      if (t.length > OK.B.callMax) { $('msg').textContent = COPY.tooMany; return record('call'); }
      var g = gapsOf(t); if (OK.sum(g) > OK.B.callTotal) { $('msg').textContent = COPY.tooLong; return record('call'); }
      spec = { mode: mode, call: g, lead: 1000, ans: mode === 'r' ? g.slice() : [] }; $('msg').textContent = '';
      if (mode === 'c') { var last = t[t.length - 1]; $('hint').textContent = COPY.stepAnswer; record('ans'); rec.callEnd = last; buildRail({ mode: 'c', call: g, lead: 1000, ans: [] }); railReset(true); studs('is-ans').forEach(function (s) { s.remove(); }); return; }
      return recorded();
    }
    if (!t.length) { $('msg').textContent = plural(COPY.answerTooFew, OK.B.ansMin); return record('ans'); }
    if (t.length > OK.B.ansMax) { $('msg').textContent = plural(COPY.answerTooMany, OK.B.ansMax); return record('ans'); }
    var a = gapsOf(t); if (OK.sum(a) > OK.B.ansTotal) { $('msg').textContent = COPY.answerTooLongTime; return record('ans'); }
    spec.ans = a; spec.lead = Math.max(OK.B.leadMin, Math.min(OK.B.leadMax, Math.round((t[0] - rec.callEnd) / 10) * 10)); $('msg').textContent = ''; recorded();
  }
  function recorded() { rec = null; onKnock = null; buildRail(spec); railReset(true); studs('is-ans').forEach(function (s) { s.classList.add('is-on'); }); $('hint').textContent = ''; $('done').hidden = true; $('replay').hidden = false; $('redo').hidden = false; $('closeDoor').disabled = false; $('closeDoor').focus(); }
  $('done').onclick = function () { if (rec) stopRec(); };
  // QA 384e5cb6 D1: "Knock again" resets ALL local state (recording, spec, link, note, messages, share box)
  function resetAll() { if (rec) clearTimeout(rec.idle); rec = null; spec = null; link = ''; $('note').value = ''; $('note-msg').textContent = ''; $('linkbox').value = ''; $('linkbox').hidden = true; $('msg').textContent = ''; }
  $('redo').onclick = function () { resetAll(); startMake(); door.focus(); };
  $('replay').onclick = function () { unlock(); if (!spec) return; railReset(false); var t = callTimes(), w = t.map(function () { return 'call'; }); R.at.forEach(function (x) { t.push(x); w.push('ans'); }); playPhrase(t, w); };
  function noteCheck() { var n = Array.from(OK.clean($('note').value)).length; $('note-msg').textContent = n > OK.NOTE_MAX ? plural(COPY.noteTooLong, n - OK.NOTE_MAX) : ''; return n <= OK.NOTE_MAX; }
  $('note').addEventListener('input', noteCheck);
  $('closeDoor').onclick = function () {
    if (!spec || !noteCheck()) return; var f = OK.encode(spec, $('note').value);
    if (!f) { $('note-msg').textContent = plural(COPY.noteTooLong, 1); return; } // only a very multi-byte note can push the link past 400
    link = location.origin + location.pathname + '#' + f; flow('f-share'); $('modes').hidden = true; $('share').focus();
  };
  $('again').onclick = function () { resetAll(); startMake(); door.focus(); };
  $('share').onclick = function () {
    var box = $('linkbox'), manual = function () { box.value = link; box.hidden = false; box.focus(); box.select(); };
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, manual); else manual(); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };

  // ---------- recipient ----------
  var T = null, misses = 0, ansT = null;
  function receiver() {
    state = 'recv'; misses = 0; $('modes').hidden = true; flow('f-gate'); head(COPY.receiverIntro, COPY.receiverSub, ''); plate(null);
    buildRail(T); railReset(false); onKnock = null; $('gate').focus();
  }
  $('gate').onclick = function () { var c = unlock(); setTimeout(function () { var x = AudioUnlock.ctx(); $('blocked').hidden = !!(x && x.state === 'running'); $('blocked').textContent = COPY.soundBlocked; }, 300); hear(); };
  function hear() { unlock(); onKnock = null; flow('f-ans'); $('amsg').textContent = ''; door.classList.remove('is-turn'); plate(null); railReset(false); head(COPY.receiverIntro, COPY.receiverSub, '');
    playPhrase(callTimes(), callTimes().map(function () { return 'call'; }), turn); }
  $('hear').onclick = hear; $('hear2').onclick = hear;
  function turn(lastCallPerf) {
    var cls = T.mode === 's' ? [COPY.answerPlateClassic, COPY.answerPlateClassicHint, COPY.answerHowClassic] : T.mode === 'c' ? [COPY.answerPlateCustom, '', plural(COPY.answerHow, T.ans.length + 1)] : [COPY.answerPlateCopy, '', COPY.answerHowCopy];
    door.classList.add('is-turn'); plate(cls[0], cls[1]); head(cls[0], cls[2], COPY.yourTurn); flow('f-ans'); door.focus();
    var exp = T.ans.length + 1, base = lastCallPerf, close = T.mode === 'r' ? 4000 : T.lead + 2500, k = misses >= 2 ? 1.5 : 1, as = studs('is-ans');
    ansT = { t: [], settle: 0, giveUp: setTimeout(evaluate, close * k + 50) };
    onKnock = function (now) { if (!ansT) return; var rel = now - base; ansT.t.push(rel); if (as[ansT.t.length - 1]) as[ansT.t.length - 1].classList.add('is-on'); railLabel(Math.min(ansT.t.length, exp));
      clearTimeout(ansT.giveUp); clearTimeout(ansT.settle); ansT.settle = setTimeout(evaluate, ansT.t.length >= exp ? 500 : 1800); };
  }
  function evaluate() {
    if (!ansT) return; clearTimeout(ansT.settle); clearTimeout(ansT.giveUp); var t = ansT.t; ansT = null; onKnock = null; door.classList.remove('is-turn'); plate(null);
    var r = OK.judge(T, t, misses);
    if (r.ok) return opened();
    misses++; var hint = r.why === 'early' ? COPY.missEarly : r.why === 'late' ? COPY.missLate : r.why === 'rhythm' ? COPY.missRhythm : Math.abs(r.off) === 1 ? COPY.close : COPY.missCount;
    head(COPY.missed, hint, COPY.missed); $('status').classList.add('is-sr'); studs('is-ans').forEach(function (s) { s.classList.remove('is-on'); s.classList.add('is-miss'); });
    t.forEach(function (x) { var tk = document.createElement('span'); tk.className = 'ok-tick'; var pos = ((R.ct[R.ct.length - 1] + x) / R.span * 100); tk.style.setProperty('--x', Math.max(0, Math.min(100, pos)).toFixed(1)); rail.appendChild(tk); });
    flow('f-miss'); $('hear2').focus();
  }
  function opened() {
    studs('is-ans').forEach(function (s) { s.classList.add('is-on'); }); rail.classList.add('is-done'); railLabel(T.ans.length + 1);
    var c = live(); if (c) ding(c);
    var ph = T.mode === 's' ? COPY.completedClassic : COPY.completedCustom, p = $('phrase'); p.textContent = '';
    var cut = T.mode === 's' ? ph.lastIndexOf(', ') : -1; if (cut > 0) { p.appendChild(document.createTextNode(ph.slice(0, cut + 2))); var em = document.createElement('em'); em.textContent = ph.slice(cut + 2); p.appendChild(em); } else p.textContent = ph;
    $('h').textContent = COPY.opened; $('lede').textContent = ''; $('status').textContent = ph; $('status').classList.add('is-sr'); $('h').classList.add('is-small'); p.hidden = false;
    $('note-out').textContent = T.note || COPY.noNote; door.classList.add('is-open'); door.setAttribute('aria-label', T.note || COPY.noNote);
    $('oneBack').hidden = T.mode !== 's'; flow('f-open'); $(T.mode === 's' ? 'oneBack' : 'mine').focus();
  }
  function toMaker(m) { history.replaceState(null, '', location.pathname); door.setAttribute('aria-label', COPY.doorAria); $('blocked').hidden = true; setMode(m); }
  $('oneBack').onclick = function () { toMaker('s'); }; $('mine').onclick = function () { toMaker('s'); }; $('mine2').onclick = function () { toMaker('s'); };

  function route() {
    var h = location.hash; if (!h || h === '#') return setMode('s');
    T = OK.decode(h); if (!T) { state = 'bad'; $('modes').hidden = true; head(COPY.title, COPY.badLink, ''); plate(null); rail.textContent = ''; flow('f-bad'); return; }
    receiver();
  }
  window.addEventListener('hashchange', function () { location.reload(); });
  route();
})();
