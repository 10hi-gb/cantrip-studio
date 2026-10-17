'use strict';
// Left or Right (P018, original scope): pure model. No DOM, no storage, no network, no timers of its own.
// One sender writes up to 6 questions, each with a left and a right answer (optional single emoji per side), and picks how
// the chooser picks: tap a side, switch or keys (one switch auto-scan, or two-switch step-scan), or hold to choose.
// The board itself is a small event -> action state machine (board/boardEvent) so every input rule is unit-tested with an
// injected clock: auto-scan only ever moves the highlight (never picks), a pointer choice fires on release inside the half
// it started in, a hold picks only once the hold time has passed and letting go earlier cancels.
// Link: "#l1.<base64url JSON>.<6-hex checksum>" (shared MILL.pack), questions and settings only, never the answers.
// The WHOLE URL (origin + path + '#' + fragment) must be <= 2,000 characters (MILLVIEW.linkFor does the runtime check).
(function (root, factory) { var m = factory(root.MILL || (typeof require === 'function' ? require('../shared/core.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.LR = m; })(this, function (M) {
  var URL_MAX = 2000, VER = 1, TAG = 'l';
  var LIM = { qMax: 6, q: 80, a: 30, from: 30, everyMin: 10, everyMax: 40, dwellMin: 10, dwellMax: 30, step: 5, everyDef: 20, dwellDef: 15 };
  var MODES = ['tap', 'switch', 'hold'], KEYS = ['space', 'enter', 'any'], SCANS = ['auto', 'step'];
  var KEYNAME = { space: 'Space', enter: 'Enter' };
  function clean(s) { return M.strip(s); }
  // One emoji (one picture): a flag pair, or one pictograph with optional skin tone / VS16, optionally ZWJ-joined, or a keycap.
  var EMOJI = /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;
  function isEmoji(s) { return typeof s === 'string' && s.length <= 24 && EMOJI.test(s); }
  function blankQ() { return { q: '', l: '', r: '', le: '', re: '' }; }
  function blank() { return { from: '', mode: 'tap', key: 'space', scan: 'auto', every: LIM.everyDef, dwell: LIM.dwellDef, qs: [blankQ()] }; }
  function steps(lo, hi) { var o = []; for (var v = lo; v <= hi; v += LIM.step) o.push(v); return o; }
  var EVERY = steps(LIM.everyMin, LIM.everyMax), DWELL = steps(LIM.dwellMin, LIM.dwellMax);
  // tenths of a second -> "1.5" / "2"
  function secs(t) { return t % 10 ? (t / 10).toFixed(1) : String(t / 10); }
  // Writer plural with {n} = formatted seconds ("1 second" / "1.5 seconds" / "2 seconds")
  function secondsText(o, t) { return M.plural(o, t === 10 ? 1 : 2, { n: secs(t) }); }
  // Settings problems that the UI can't produce but a hand-made state could.
  function settingsOk(st) {
    return MODES.indexOf(st.mode) >= 0 && KEYS.indexOf(st.key) >= 0 && SCANS.indexOf(st.scan) >= 0 && EVERY.indexOf(st.every) >= 0 && DWELL.indexOf(st.dwell) >= 0 && !(st.scan === 'step' && st.key === 'any');
  }
  // Field problems: [{i (question index, -1 for the name), f: 'from'|'q'|'l'|'r'|'le'|'re', why: 'empty'|'long'|'emoji', over?}]
  function errors(st) {
    var out = [], fl = M.len(clean(st.from));
    if (fl > LIM.from) out.push({ i: -1, f: 'from', why: 'long', over: fl - LIM.from });
    st.qs.forEach(function (x, i) {
      var ql = M.len(clean(x.q)); if (!ql) out.push({ i: i, f: 'q', why: 'empty' }); else if (ql > LIM.q) out.push({ i: i, f: 'q', why: 'long', over: ql - LIM.q });
      ['l', 'r'].forEach(function (f) { var n = M.len(clean(x[f])); if (!n) out.push({ i: i, f: f, why: 'empty' }); else if (n > LIM.a) out.push({ i: i, f: f, why: 'long', over: n - LIM.a }); });
      ['le', 're'].forEach(function (f) { var e = clean(x[f]); if (e && !isEmoji(e)) out.push({ i: i, f: f, why: 'emoji' }); });
    });
    return out;
  }
  function ready(st) { return st.qs.length >= 1 && st.qs.length <= LIM.qMax && settingsOk(st) && !errors(st).length; }
  function canAdd(st) { return st.qs.length < LIM.qMax; }
  function addQuestion(st) { if (!canAdd(st)) return false; st.qs.push(blankQ()); return true; }
  function removeQuestion(st, i) { if (st.qs.length <= 1 || i < 0 || i >= st.qs.length) return false; st.qs.splice(i, 1); return true; }
  function cleaned(st) { return { from: clean(st.from), mode: st.mode, key: st.key, scan: st.scan, every: st.every, dwell: st.dwell, qs: st.qs.map(function (x) { return { q: clean(x.q), l: clean(x.l), r: clean(x.r), le: clean(x.le), re: clean(x.re) }; }) }; }
  // ---- link
  function rawFragment(st) {
    if (!ready(st)) return null; var c = cleaned(st);
    return M.pack(TAG, VER, { f: c.from, m: MODES.indexOf(c.mode), k: KEYS.indexOf(c.key), s: SCANS.indexOf(c.scan), e: c.every, d: c.dwell, q: c.qs.map(function (x) { return [x.q, x.l, x.r, x.le, x.re]; }) });
  }
  // prefixLen: length of origin + path + '#'. Returns the fragment, '' when the whole URL would pass 2,000, null when not ready.
  function encode(st, prefixLen) { var f = rawFragment(st); if (f === null) return null; return (prefixLen || 0) + f.length <= URL_MAX ? f : ''; }
  function isInt(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v % 1 === 0 && v >= lo && v <= hi; }
  // Full rejection: wrong shape, extra keys, out-of-range or off-step numbers, text that isn't clean, a state that
  // wouldn't pass validation. {ok:true,data:st} | {ok:false, why:'empty'|'bad'|'oldVersion'|'tooLong'}
  function decode(frag) {
    var u = M.unpack(frag, TAG, VER, URL_MAX); if (!u.ok) return u.why === 'otherTag' ? { ok: false, why: 'bad' } : u;
    var d = u.data, bad = { ok: false, why: 'bad' };
    if (Array.isArray(d) || Object.keys(d).sort().join() !== 'd,e,f,k,m,q,s') return bad;
    if (typeof d.f !== 'string' || !isInt(d.m, 0, 2) || !isInt(d.k, 0, 2) || !isInt(d.s, 0, 1) || !isInt(d.e, 0, 99) || !isInt(d.d, 0, 99) || !Array.isArray(d.q) || d.q.length < 1 || d.q.length > LIM.qMax) return bad;
    var st = { from: d.f, mode: MODES[d.m], key: KEYS[d.k], scan: SCANS[d.s], every: d.e, dwell: d.d, qs: [] };
    for (var i = 0; i < d.q.length; i++) {
      var r = d.q[i]; if (!Array.isArray(r) || r.length !== 5 || r.some(function (x) { return typeof x !== 'string' || clean(x) !== x; })) return bad;
      st.qs.push({ q: r[0], l: r[1], r: r[2], le: r[3], re: r[4] });
    }
    if (clean(st.from) !== st.from || !ready(st)) return bad;
    return { ok: true, data: st };
  }
  // ---- plain text (Writer answerText / answerListLine). Every typed value is quoted with the shared rule (PM Q1).
  function sideWord(C, side) { return side === 'l' ? C.sideLeft : C.sideRight; }
  function answerOf(x, side) { return side === 'l' ? x.l : x.r; }
  function answerText(C, x, side) { return M.fill(C.answerText, { answer: M.quote(clean(answerOf(x, side))), side: sideWord(C, side), question: M.quote(clean(x.q)) }); }
  // answers: array parallel to st.qs of 'l' | 'r' | null. Lines in question order, numbered by question.
  function answerLines(C, st, answers) {
    var out = []; st.qs.forEach(function (x, i) { var s = answers[i]; if (s !== 'l' && s !== 'r') return; out.push(M.fill(C.answerListLine, { i: i + 1, question: M.quote(clean(x.q)), answer: M.quote(clean(answerOf(x, s))), side: sideWord(C, s) })); });
    return out;
  }
  function answersCopy(C, st, answers) { var l = answerLines(C, st, answers); return l.length ? [C.answersHeading].concat(l).join('\n') : ''; }
  // ---- the board: input state machine. cfg = {mode, key, scan, dwell (tenths)}. Times in ms from an injected clock.
  // s = {cfg, hi: 'l'|'r' (highlight / focus), down: side|null (pointer press), hold: {side, at}|null, done: side|null}
  function board(cfg) { return { cfg: { mode: cfg.mode, key: cfg.key, scan: cfg.scan, dwell: cfg.dwell }, hi: 'l', down: null, hold: null, done: null }; }
  var NOT_SWITCH = /^(Tab|Shift|Control|Alt|AltGraph|Meta|OS|Escape|CapsLock|NumLock|ScrollLock|Fn|FnLock|Hyper|Super|Unidentified|Dead|Process)$/;
  function stepKey(cfg) { return cfg.key === 'enter' ? 'Space' : 'Enter'; }
  function selectKey(cfg) { return KEYNAME[cfg.key] || 'Space'; }
  function other(side) { return side === 'l' ? 'r' : 'l'; }
  // ev: {t:'tick'} | {t:'key', key, repeat, at} | {t:'keyup', key} | {t:'down', side, at} | {t:'up', side (half under the pointer, or null)}
  //     | {t:'cancel'} | {t:'due', at} | {t:'click', side} | {t:'focus', side}
  // Returns {s, out} where out is null or one of {choose: side} {move: side} {holdStart: side, due: ms} {holdCancel: true} {consumed: true}
  function boardEvent(s, ev) {
    var c = s.cfg, out = null;
    if (s.done) return { s: s, out: ev.t === 'key' ? { consumed: true } : null };
    function choose(side) { s.done = side; s.hold = null; s.down = null; out = { choose: side }; }
    function move(side) { s.hi = side; out = { move: side }; }
    function holdStart(side, at) { s.hold = { side: side, at: at }; s.hi = side; out = { holdStart: side, due: at + c.dwell * 100 }; }
    function holdCancel() { if (s.hold) { s.hold = null; out = { holdCancel: true }; } }
    var sw = c.mode === 'switch', step = sw && c.scan === 'step', hold = c.mode === 'hold';
    switch (ev.t) {
      case 'tick': if (sw && !step) move(other(s.hi)); break; // auto-scan only moves the highlight; it never picks
      case 'focus': s.hi = ev.side; break;
      case 'key':
        if (ev.repeat) { if (/^(Space|Enter)$/.test(ev.key) || (sw && c.key === 'any' && !NOT_SWITCH.test(ev.key))) out = { consumed: true }; break; } // a held key never picks twice
        if (sw && c.key === 'any') { if (!NOT_SWITCH.test(ev.key)) choose(s.hi); break; }
        if (sw && step) { if (ev.key === selectKey(c)) choose(s.hi); else if (ev.key === stepKey(c)) move(other(s.hi)); else if (ev.key === 'ArrowLeft') move('l'); else if (ev.key === 'ArrowRight') move('r'); break; }
        if (sw) { if (ev.key === selectKey(c)) choose(s.hi); else if (ev.key === 'ArrowLeft') move('l'); else if (ev.key === 'ArrowRight') move('r'); break; }
        if (ev.key === 'ArrowLeft') { move('l'); break; } if (ev.key === 'ArrowRight') { move('r'); break; }
        if (ev.key === 'Space' || ev.key === 'Enter') { if (hold) { if (!s.hold) holdStart(s.hi, ev.at); else out = { consumed: true }; } else choose(s.hi); }
        break;
      case 'keyup': if (hold && s.hold && (ev.key === 'Space' || ev.key === 'Enter')) holdCancel(); break;
      case 'down': if (hold) holdStart(ev.side, ev.at); else { s.down = ev.side; s.hi = ev.side; } break;
      case 'up':
        if (hold) { holdCancel(); break; }
        if (s.down && ev.side === s.down) choose(ev.side); s.down = null; break; // fires on release inside the half it started in
      case 'cancel': s.down = null; holdCancel(); break;
      case 'due': if (hold && s.hold && ev.at - s.hold.at >= c.dwell * 100) choose(s.hold.side); break;
      case 'click': choose(ev.side); break; // activation with no pointer press (screen reader or programmatic click)
    }
    return { s: s, out: out };
  }
  return { LIM: LIM, URL_MAX: URL_MAX, VER: VER, TAG: TAG, MODES: MODES, KEYS: KEYS, SCANS: SCANS, EVERY: EVERY, DWELL: DWELL, KEYNAME: KEYNAME, clean: clean, isEmoji: isEmoji, blank: blank, blankQ: blankQ, secs: secs, secondsText: secondsText, settingsOk: settingsOk, errors: errors, ready: ready, canAdd: canAdd, addQuestion: addQuestion, removeQuestion: removeQuestion, cleaned: cleaned, rawFragment: rawFragment, encode: encode, decode: decode, sideWord: sideWord, answerOf: answerOf, answerText: answerText, answerLines: answerLines, answersCopy: answersCopy, board: board, boardEvent: boardEvent, stepKey: stepKey, selectKey: selectKey, NOT_SWITCH: NOT_SWITCH };
});
