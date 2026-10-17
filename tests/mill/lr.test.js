// node tests/mill/lr.test.js — Left or Right (P018 original) model: validation + caps, the versioned link codec (full
// rejection of malformed input, the 2,000-char WHOLE-URL cap tested from a 64-char origin), plain-text answers quoted with
// the shared rule (PM Q1), Writer copy coverage, banned-claim grep, and the board input state machine with an injected clock.
const assert = require('assert'); const fs = require('fs'); const L = require('../../mill/left-or-right/lr.js'), M = require('../../mill/shared/core.js');
const DIR = __dirname + '/../../mill/left-or-right/';
const C = require('vm').runInNewContext(fs.readFileSync(DIR + 'copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const q = (qq, l, r, le = '', re = '') => ({ q: qq, l, r, le, re });
const mk = (qs, o = {}) => Object.assign(L.blank(), { qs }, o);
const ORIGIN = 'https://' + 'x'.repeat(64 - 'https://'.length); // a 64-character origin
const PRE = ORIGIN + '/mill/left-or-right/#';
const errs = st => L.errors(st).map(e => e.i + e.f + ':' + e.why + (e.over ? e.over : ''));

t('Writer copy.js is used verbatim (same bytes as both Writer copies)', () => {
  const a = fs.readFileSync(DIR + 'copy.js', 'utf8'); for (const p of ['/workspace/mill-sprint-2026-10-16/writer/left-or-right/copy.js', '/workspace/mill-sprint-2026-10-16/left-or-right/writer/copy.js']) if (fs.existsSync(p)) assert.equal(fs.readFileSync(p, 'utf8'), a, p); });
t('defaults: tap, Space, one-switch auto-scan, scan every 2 s, hold 1.5 s, one empty question', () => {
  const b = L.blank(); assert.deepEqual([b.mode, b.key, b.scan, b.every, b.dwell, b.qs.length], ['tap', 'space', 'auto', 20, 15, 1]);
  assert.deepEqual(L.EVERY, [10, 15, 20, 25, 30, 35, 40]); assert.deepEqual(L.DWELL, [10, 15, 20, 25, 30]); });
t('seconds text from Writer plurals: 1 second, 1.5 seconds, Every 2 seconds', () => {
  assert.equal(L.secondsText(C.holdFor, 10), '1 second'); assert.equal(L.secondsText(C.holdFor, 15), '1.5 seconds'); assert.equal(L.secondsText(C.scanEvery, 10), 'Every 1 second'); assert.equal(L.secondsText(C.scanEvery, 20), 'Every 2 seconds'); assert.equal(L.secondsText(C.scanEvery, 35), 'Every 3.5 seconds'); });
t('validation: empty question/answers, caps 80 / 30 / name 30 counted in characters (not UTF-16 units), emoji', () => {
  assert.deepEqual(errs(mk([q('', '', '')])), ['0q:empty', '0l:empty', '0r:empty']);
  assert.deepEqual(errs(mk([q('Q'.repeat(80), 'a'.repeat(30), '\u{1F355}'.repeat(30))])), []);
  assert.deepEqual(errs(mk([q('Q'.repeat(83), 'a'.repeat(31), 'b')], { from: 'N'.repeat(32) })), ['-1from:long2', '0q:long3', '0l:long1']);
  assert.deepEqual(errs(mk([q('  What   now? ', ' Pizza ', 'Tacos', 'ab', '\u{1F32E}')])), ['0le:emoji']);
  assert.deepEqual(errs(mk([q('Q', 'a', 'b', '\u{1F355}\u{1F355}', '\u{1F44D}\u{1F3FD}')])), ['0le:emoji']); });
t('emoji: exactly one picture (flags, skin tones, ZWJ families, keycaps); never letters, two pictures or quote marks', () => {
  for (const e of ['\u{1F355}', '\u{1F44D}\u{1F3FD}', '\u{1F1EC}\u{1F1E7}', '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', '\u2764\uFE0F', '1\uFE0F\u20E3']) assert.ok(L.isEmoji(e), e);
  for (const e of ['a', ':)', '\u{1F355}\u{1F355}', '\u201C', '\u{1F355}x', ' ', '1']) assert.ok(!L.isEmoji(e), e); });
t('queue: up to 6 questions; the last one cannot be removed', () => {
  const st = mk([q('A', 'b', 'c')]); for (let i = 0; i < 5; i++) assert.ok(L.addQuestion(st)); assert.ok(!L.addQuestion(st)); assert.equal(st.qs.length, 6); assert.ok(!L.canAdd(st));
  while (st.qs.length > 1) assert.ok(L.removeQuestion(st, 0)); assert.ok(!L.removeQuestion(st, 0)); assert.equal(st.qs.length, 1); });
t('settings guard: step-scan needs Space or Enter as the pick key (not "any key"); off-step times refused', () => {
  assert.ok(L.settingsOk(mk([q('A', 'b', 'c')], { mode: 'switch', scan: 'step', key: 'enter' })));
  assert.ok(!L.settingsOk(mk([q('A', 'b', 'c')], { mode: 'switch', scan: 'step', key: 'any' })));
  assert.ok(!L.settingsOk(mk([q('A', 'b', 'c')], { every: 12 }))); assert.ok(!L.settingsOk(mk([q('A', 'b', 'c')], { dwell: 35 }))); assert.ok(!L.settingsOk(mk([q('A', 'b', 'c')], { mode: 'voice' }))); });
t('link round-trip: questions + settings, cleaned text, never the answers; typed curly quotes kept raw in the link', () => {
  const st = mk([q('What should we eat tonight?', 'Pizza', 'Tacos', '\u{1F355}', ''), q('  Milk\u201D from \u201CYour bank  ', '\u00ABA\u00BB', 'B')], { from: ' Maya ', mode: 'switch', key: 'enter', scan: 'step', every: 35, dwell: 25 });
  const f = L.encode(st, PRE.length); assert.ok(/^l1\.[A-Za-z0-9_-]+\.[0-9a-f]{6}$/.test(f), f);
  const d = L.decode('#' + f); assert.ok(d.ok); assert.deepEqual(d.data, L.cleaned(st)); assert.equal(d.data.qs[1].q, 'Milk\u201D from \u201CYour bank'); assert.equal(d.data.from, 'Maya');
  assert.ok(!/answer|chosen/.test(JSON.stringify(M.unpack(f, 'l', 1, 1e6).data))); });
t('not ready -> no link (null); every mode round-trips', () => {
  assert.equal(L.encode(mk([q('', 'a', 'b')]), 10), null);
  for (const mode of L.MODES) for (const key of L.KEYS) for (const scan of L.SCANS) { const st = mk([q('A?', 'b', 'c')], { mode, key, scan }); if (!L.settingsOk(st)) { assert.equal(L.encode(st, 10), null); continue; } const d = L.decode(L.encode(st, 10)); assert.ok(d.ok && d.data.mode === mode && d.data.key === key && d.data.scan === scan); } });
t('WHOLE-URL cap 2,000 from a 64-char origin: max-size ASCII queue fits; multi-byte queue over the cap -> "" (no link)', () => {
  const big = mk(Array.from({ length: 6 }, (_, i) => q('Q'.repeat(79) + i, 'L'.repeat(29) + i, 'R'.repeat(29) + i, '\u{1F355}', '\u{1F32E}')), { from: 'F'.repeat(30) });
  const f = L.encode(big, PRE.length); assert.ok(f && PRE.length + f.length <= 2000, String(f && PRE.length + f.length));
  const wide = mk(Array.from({ length: 6 }, (_, i) => q('\u6C34'.repeat(79) + i, '\u6C34'.repeat(29) + i, '\u6C34'.repeat(29) + i)), { from: 'F' });
  const raw = L.rawFragment(wide); assert.ok(PRE.length + raw.length > 2000); assert.equal(L.encode(wide, PRE.length), '');
  // boundary: the largest link that still fits is accepted by decode; the cap is on the whole URL, so decode rejects > 2,000
  assert.equal(L.decode('l1.' + 'A'.repeat(2001)).why, 'tooLong'); assert.equal(PRE.length, 64 + '/mill/left-or-right/#'.length); });
t('malformed links: 40 mutations all rejected (bad / oldVersion), never a partial board', () => {
  const good = L.encode(mk([q('A?', 'b', 'c')]), 0); const P = o => M.pack('l', 1, o);
  const base = { f: '', m: 0, k: 0, s: 0, e: 20, d: 15, q: [['A?', 'b', 'c', '', '']] }; const w = (k, v) => P(Object.assign({}, base, { [k]: v }));
  const cases = [['', 'empty'], ['#', 'empty'], ['x', 'bad'], [good.slice(0, -1), 'bad'], [good.slice(0, 20), 'bad'], [good + 'a', 'bad'], [good.replace('l1.', 'l1x.'), 'bad'], [good.replace(/.{6}$/, '000000'), 'bad'],
    ['e1.' + good.slice(3), 'bad'], [M.pack('e', 1, base), 'bad'], [M.pack('l', 2, base), 'oldVersion'], [M.pack('l', 0, base), 'oldVersion'], ['l1.%%%.000000', 'bad'], [P([1, 2]), 'bad'], [P('str'), 'bad'], [P(null), 'bad'],
    [P(Object.assign({ x: 1 }, base)), 'bad'], [w('f', 5), 'bad'], [w('f', ' Maya'), 'bad'], [w('f', 'N'.repeat(31)), 'bad'], [w('m', 3), 'bad'], [w('m', -1), 'bad'], [w('m', '0'), 'bad'], [w('k', 1.5), 'bad'], [w('s', 2), 'bad'], [w('e', 12), 'bad'], [w('e', 45), 'bad'], [w('d', 5), 'bad'], [w('d', 35), 'bad'],
    [P(Object.assign({}, base, { s: 1, k: 2 })), 'bad'], [w('q', []), 'bad'], [w('q', Array(7).fill(['A?', 'b', 'c', '', ''])), 'bad'], [w('q', [['A?', 'b', 'c', '']]), 'bad'], [w('q', [['A?', 'b', 'c', '', '', '']]), 'bad'], [w('q', [['', 'b', 'c', '', '']]), 'bad'],
    [w('q', [['A?', 'b', 'c', 'xy', '']]), 'bad'], [w('q', [['A?', 'b ', 'c', '', '']]), 'bad'], [w('q', [['A?', 'b', 'c'.repeat(31), '', '']]), 'bad'], [w('q', [['A?', 'b', 7, '', '']]), 'bad'], [w('q', [['A\u202E?', 'b', 'c', '', '']]), 'bad']];
  assert.equal(cases.length, 40); for (const [f, why] of cases) { const d = L.decode(f); assert.ok(!d.ok && d.why === why, JSON.stringify([f.slice(0, 30), d])); } });
t('answer text + answers list: Writer templates, every typed value quoted, Q1 marks shown as " inside one frame', () => {
  const st = mk([q('What should we eat tonight?', 'Pizza', 'Tacos'), q('Milk\u201D from \u201CYour bank', '\u00ABYes\u00BB', 'No'), q('Skip me', 'a', 'b')]);
  assert.equal(L.answerText(C, st.qs[0], 'l'), '\u201CPizza\u201D (left), for: \u201CWhat should we eat tonight?\u201D');
  assert.equal(L.answerText(C, st.qs[1], 'l'), '\u201C"Yes"\u201D (left), for: \u201CMilk" from "Your bank\u201D');
  assert.equal(L.answersCopy(C, st, ['r', 'l', null]), 'Answers so far\n1. \u201CWhat should we eat tonight?\u201D: \u201CTacos\u201D (right)\n2. \u201CMilk" from "Your bank\u201D: \u201C"Yes"\u201D (left)');
  assert.equal(L.answersCopy(C, st, [null, null, null]), ''); });
t('board, tap: ← → move, Space/Enter pick the focused side; pointer picks only on release inside the half it started in', () => {
  const cfg = { mode: 'tap', key: 'space', scan: 'auto', dwell: 15 }; let b = L.board(cfg), r;
  r = L.boardEvent(b, { t: 'key', key: 'ArrowRight' }); assert.deepEqual(r.out, { move: 'r' }); r = L.boardEvent(b, { t: 'key', key: 'Enter' }); assert.deepEqual(r.out, { choose: 'r' });
  r = L.boardEvent(b, { t: 'key', key: 'Space' }); assert.deepEqual(r.out, { consumed: true }); // already chosen: a second press does nothing
  b = L.board(cfg); L.boardEvent(b, { t: 'down', side: 'l', at: 0 }); r = L.boardEvent(b, { t: 'up', side: 'r' }); assert.equal(r.out, null); assert.equal(b.done, null); // swipe-through: no pick
  L.boardEvent(b, { t: 'down', side: 'l', at: 0 }); r = L.boardEvent(b, { t: 'up', side: null }); assert.equal(b.done, null); // released outside both halves
  L.boardEvent(b, { t: 'down', side: 'r', at: 0 }); L.boardEvent(b, { t: 'cancel' }); r = L.boardEvent(b, { t: 'up', side: 'r' }); assert.equal(b.done, null); // pointercancel
  L.boardEvent(b, { t: 'down', side: 'r', at: 0 }); r = L.boardEvent(b, { t: 'up', side: 'r' }); assert.deepEqual(r.out, { choose: 'r' });
  b = L.board(cfg); r = L.boardEvent(b, { t: 'tick' }); assert.equal(r.out, null); assert.equal(b.hi, 'l'); // no scanning in tap mode
  b = L.board(cfg); r = L.boardEvent(b, { t: 'key', key: 'Enter', repeat: true }); assert.deepEqual(r.out, { consumed: true }); assert.equal(b.done, null); });
t('board, one-switch auto-scan: ticks only move the highlight (1000 ticks never pick); the switch picks the highlighted side', () => {
  let b = L.board({ mode: 'switch', key: 'space', scan: 'auto', dwell: 15 }), r;
  for (let i = 0; i < 1000; i++) { r = L.boardEvent(b, { t: 'tick' }); assert.ok(r.out.move); } assert.equal(b.done, null); assert.equal(b.hi, 'l');
  L.boardEvent(b, { t: 'tick' }); r = L.boardEvent(b, { t: 'key', key: 'Enter' }); assert.equal(r.out, null); // Enter isn't the switch here
  r = L.boardEvent(b, { t: 'key', key: 'Space' }); assert.deepEqual(r.out, { choose: 'r' });
  b = L.board({ mode: 'switch', key: 'any', scan: 'auto', dwell: 15 }); for (const k of ['Tab', 'Shift', 'Escape', 'Control', 'Alt', 'Meta']) { r = L.boardEvent(b, { t: 'key', key: k }); assert.equal(r.out, null, k); }
  r = L.boardEvent(b, { t: 'key', key: 'x' }); assert.deepEqual(r.out, { choose: 'l' });
  b = L.board({ mode: 'switch', key: 'enter', scan: 'auto', dwell: 15 }); L.boardEvent(b, { t: 'down', side: 'r', at: 0 }); r = L.boardEvent(b, { t: 'up', side: 'r' }); assert.deepEqual(r.out, { choose: 'r' }); }); // the helper can still tap
t('board, two-switch step-scan: one key moves, the other picks; no timer movement', () => {
  let b = L.board({ mode: 'switch', key: 'space', scan: 'step', dwell: 15 }), r;
  assert.equal(L.stepKey(b.cfg), 'Enter'); assert.equal(L.selectKey(b.cfg), 'Space');
  r = L.boardEvent(b, { t: 'tick' }); assert.equal(r.out, null); r = L.boardEvent(b, { t: 'key', key: 'Enter' }); assert.deepEqual(r.out, { move: 'r' }); r = L.boardEvent(b, { t: 'key', key: 'Enter' }); assert.deepEqual(r.out, { move: 'l' });
  r = L.boardEvent(b, { t: 'key', key: 'Space' }); assert.deepEqual(r.out, { choose: 'l' });
  b = L.board({ mode: 'switch', key: 'enter', scan: 'step', dwell: 15 }); assert.equal(L.stepKey(b.cfg), 'Space'); L.boardEvent(b, { t: 'key', key: 'Space' }); r = L.boardEvent(b, { t: 'key', key: 'Enter' }); assert.deepEqual(r.out, { choose: 'r' }); });
t('board, hold: picks only after the hold time; letting go early cancels (pointer and key); no pick on release', () => {
  const cfg = { mode: 'hold', key: 'space', scan: 'auto', dwell: 15 }; let b = L.board(cfg), r;
  r = L.boardEvent(b, { t: 'down', side: 'r', at: 1000 }); assert.deepEqual(r.out, { holdStart: 'r', due: 2500 });
  r = L.boardEvent(b, { t: 'due', at: 2499 }); assert.equal(r.out, null); r = L.boardEvent(b, { t: 'up', side: 'r' }); assert.deepEqual(r.out, { holdCancel: true }); assert.equal(b.done, null);
  r = L.boardEvent(b, { t: 'due', at: 9999 }); assert.equal(r.out, null); // a stale timer after release never picks
  L.boardEvent(b, { t: 'down', side: 'l', at: 5000 }); r = L.boardEvent(b, { t: 'due', at: 6500 }); assert.deepEqual(r.out, { choose: 'l' });
  b = L.board(cfg); L.boardEvent(b, { t: 'key', key: 'ArrowRight' }); r = L.boardEvent(b, { t: 'key', key: 'Space', at: 0 }); assert.deepEqual(r.out, { holdStart: 'r', due: 1500 });
  r = L.boardEvent(b, { t: 'key', key: 'Space', repeat: true, at: 500 }); assert.deepEqual(r.out, { consumed: true }); r = L.boardEvent(b, { t: 'keyup', key: 'Space' }); assert.deepEqual(r.out, { holdCancel: true });
  L.boardEvent(b, { t: 'key', key: 'Enter', at: 10000 }); r = L.boardEvent(b, { t: 'due', at: 11500 }); assert.deepEqual(r.out, { choose: 'r' });
  b = L.board(cfg); r = L.boardEvent(b, { t: 'click', side: 'l' }); assert.deepEqual(r.out, { choose: 'l' }); }); // screen-reader activation (no press)
t('copy coverage: every C.key the piece uses exists (Writer or engineer fallback); no {placeholder} left unfilled by design', () => {
  const X = fs.existsSync(DIR + 'copy-extra.js') ? require('vm').runInNewContext(fs.readFileSync(DIR + 'copy-extra.js', 'utf8') + ';COPY_EXTRA') : {};
  const src = ['app.js', 'lr.js'].filter(f => fs.existsSync(DIR + f)).map(f => fs.readFileSync(DIR + f, 'utf8')).join('\n'); const used = new Set([...src.matchAll(/\bC\.([a-zA-Z]+)/g)].map(m => m[1]));
  const missing = [...used].filter(k => !(k in C) && !(k in X)); assert.deepEqual(missing, []);
  Object.keys(X).forEach(k => assert.ok(!(k in C), 'fallback overrides a Writer key: ' + k)); });
t('banned claims: no AAC / therapy / speech / assistive / communication device anywhere in the piece; "communication aid" only in the Writer negation', () => {
  const files = fs.readdirSync(DIR).filter(f => /\.(js|css|html)$/.test(f)); let hits = [];
  for (const f of files) { const s = fs.readFileSync(DIR + f, 'utf8'); if (/\bAAC\b|therap|speech|assistive|communication device|augmentative|helps? (someone|people) communicate/i.test(s)) hits.push(f);
    const ca = (s.match(/communication aid/gi) || []).length; if (ca && !(f === 'copy.js' && ca === 1 && s.includes("It isn't a communication aid and doesn't replace one."))) hits.push(f + ':communication aid'); }
  assert.deepEqual(hits, []); });

// ---- long-word fit (Creative r2): fit.js with a fake measure (every grapheme 0.6em, emoji 1.2em, marks 0.4em at R = 100)
const F = require('../../mill/left-or-right/fit.js');
const fake = (avail, pad = 12) => ({ R: 100, avail, full: avail + 2 * pad - 4, measure: (s, f, l) => { const w = F.graphemes(s).reduce((a, g) => a + (/\p{Extended_Pictographic}/u.test(g) ? 120 : 60), 0), qo = f ? 32 : 0, qc = l ? 32 : 0; return { w, marks: qo + qc, hang: 2 * Math.max(qo, qc) }; } });
t('fit: Liang patterns (hyph-en-us, notice kept) give Grand-mother, hy-phen-ation; exceptions win (ta-ble, present never)', () => {
  assert.deepEqual(F.hyphenate('grandmother'), [5]); assert.deepEqual(F.hyphenate('hyphenation'), [2, 6]); assert.deepEqual(F.hyphenate('table'), [2]); assert.deepEqual(F.hyphenate('present'), []);
  const src = fs.readFileSync(DIR + 'hyph-en.js', 'utf8'); assert.ok(src.includes('Copyright (C) 1990, 2004, 2005 Gerard D.C. Kuiken') && src.includes('provided the copyright') && !/fetch\(|XMLHttpRequest|import\(/.test(src)); });
t('fit: sizes step 2px from the normal size down to the 24px floor', () => { assert.deepEqual(F.sizes(31, 24), [31, 29, 27, 25, 24]); assert.deepEqual(F.sizes(24, 24), [24]); });
t('fit: unbroken whenever it fits at any size down to 24px (no break above the floor)', () => {
  const r = F.plan("Grandmother's", Object.assign(fake(220), { sizes: F.sizes(60, 24) })); assert.equal(r.broken, false); assert.ok(r.size >= 24); assert.deepEqual(r.lines, [["Grandmother's"]]); });
t('fit: Grandmother\'s too wide even at 24px -> dictionary break Grand- / mother\'s at the largest size where both lines fit', () => {
  const r = F.plan("Grandmother's", Object.assign(fake(136), { sizes: F.sizes(44.8, 24) })); assert.equal(r.broken, true); assert.deepEqual(r.lines, [['Grand-', "mother's"]]); assert.equal(r.level, 0); assert.ok(r.size > 24, r.size);
  const w = n => n * 0.6 * r.size; assert.ok(w(8) + 0.32 * r.size <= 136 - 1); }); // mother's + closing mark fits the line
t('fit: no dictionary break -> fallback at the most even letter point, >= 4 letters on each side, visible hyphens; fewest lines first', () => {
  assert.deepEqual(F.hyphenate('nooooooooooooooooooo'), []);
  let r = F.plan('Nooooooooooooooooooo', Object.assign(fake(171), { sizes: F.sizes(54.6, 24) })); assert.equal(F.token('Nooooooooooooooooooo', true, true).tiers[0], 1); assert.equal(r.lines[0].length, 2, JSON.stringify(r));
  r.lines[0].forEach((l, i, a) => { assert.ok((l.match(/\p{L}/gu) || []).length >= 4); if (i < a.length - 1) assert.ok(l.endsWith('-')); });
  r = F.plan('Nooooooooooooooooooo', Object.assign(fake(136), { sizes: F.sizes(44.8, 24) })); assert.ok(r.lines[0].length >= 2); r.lines[0].forEach(l => assert.ok((l.match(/\p{L}/gu) || []).length >= 4));
  const tk = F.token('Abcdefgh', true, true); assert.deepEqual(tk.br.filter(b => b.tier === 1).map(b => b.at), [4]); }); // 4 | 4 only
t('fit: emoji (ZWJ + skin tone sequences) are never split; no hyphen between emoji; breaks only on grapheme boundaries', () => {
  const E = '\u{1F9D1}\u{1F3FD}\u200D\u{1F9B3}', r = F.plan(E.repeat(7), Object.assign(fake(136), { sizes: F.sizes(44.8, 24) })); assert.equal(r.broken, true);
  r.lines[0].forEach(l => { assert.ok(!l.endsWith('-')); assert.equal(l.split(E).join(''), ''); }); assert.equal(r.lines[0].join(''), E.repeat(7));
  const tk = F.token('Abuela' + E + 'Rosalinda', true, true), bounds = new Set(); let k = 0; tk.gs.forEach((g, i) => { bounds.add(i); }); tk.br.forEach(b => { assert.ok(b.at > 0 && b.at < tk.gs.length); assert.ok(!(tk.gs[b.at - 1] === E && b.hy) && !(tk.gs[b.at] === E && b.hy)); }); });
t('fit: the closing mark never sits alone — it is outside the tokens and counted on the last line; the last line is never empty', () => {
  for (const [word, avail] of [["Grandmother's", 136], ['Nooooooooooooooooooo', 136], ['Abcdefghijklmnopqrstuvwxyzabcd', 136], ['Superextraordinarily', 120]]) {
    const o = Object.assign(fake(avail), { sizes: F.sizes(44.8, 24) }), r = F.plan(word, o), lines = r.lines[r.lines.length - 1], last = lines[lines.length - 1];
    assert.ok(F.graphemes(last).length >= 1 && /\p{L}/u.test(last)); const m = o.measure(last, lines.length === 1, true); assert.ok((m.w + m.marks) * r.size / 100 <= avail - 1, word); } });
t('fit: multi-word answers keep spaces as the only breaks when every word fits; marks counted on the first and last word', () => {
  const r = F.plan('Watch a movie at home', Object.assign(fake(136), { sizes: F.sizes(44.8, 24) })); assert.equal(r.broken, false); assert.deepEqual(r.lines.map(x => x.join('|')), ['Watch', 'a', 'movie', 'at', 'home']); });
console.log('lr unit: ' + n + ' passed');
