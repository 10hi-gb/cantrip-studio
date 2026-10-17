// node tests/mill/fh.test.js — Five Hands r1c core: every assert of Creative's proto five_hands_alloc.py r1d, plus check()
// validating (the reference Check accepted -10), 12 equal tasks, 0-minute helper over in Check, stamp in every card/bench text, link codec.
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const F = require('../../mill/five-hands/fh.js'), M = require('../../mill/shared/core.js');
const C = vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/five-hands/copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const mk = a => a.map(x => ({ name: x[0], min: x[1] }));
const H = mk([['Ana', 120], ['Ben', 60], ['Chen', 90], ['Dee', 0], ['Eli', 45]]);
const T = mk([['Pull tomato cages', 40], ['Turn compost bed A', 30], ['Turn compost bed B', 30], ['Rake paths', 45], ['Cover raised beds', 25], ['Clean and oil tools', 20], ['Haul yard bags to curb', 35], ['Fix gate latch', 15], ['Empty rain barrels', 20]]);
const H2 = mk([['Ana', 120], ['Ben', 60], ['Chen', 60], ['Dee', 0], ['Eli', 0]]);
const codes = e => e.map(x => x.code);
const view = r => r.rows.map(x => x.name + ' ' + x.load + ' [' + x.items.map(i => i.name + ' ' + i.min).join(', ') + ']');
const conserved = r => { assert.ok(r.conserved); assert.equal(r.given + r.benchMin, r.work); assert.equal(r.rows.reduce((s, x) => s + x.items.length, 0) + r.bench.length, r.assign.length); };
const STAMP = 'Proposed split from the minutes typed. Nobody has agreed to this yet.';
t('proto first run exact: work 260, capacity 315, loads and order as the rule placed them, bench empty', () => {
  const r = F.suggest(H, T); assert.equal(r.work, 260); assert.equal(r.available, 315);
  assert.deepEqual(view(r), ['Ana 115 [Rake paths 45, Haul yard bags to curb 35, Clean and oil tools 20, Fix gate latch 15]', 'Ben 50 [Turn compost bed A 30, Empty rain barrels 20]', 'Chen 70 [Pull tomato cages 40, Turn compost bed B 30]', 'Dee 0 []', 'Eli 25 [Cover raised beds 25]']);
  assert.deepEqual(r.rows.map(x => x.spare), [5, 10, 20, 0, 20]); assert.equal(r.bench.length, 0); assert.equal(r.benchExplain, false); conserved(r); });
t('proto short-handed (Chen 60, Eli 0): bench = Empty rain barrels 20 + Fix gate latch 15 = 35; spare spread out -> benchExplain', () => {
  const r = F.suggest(H2, T); assert.deepEqual(view(r), ['Ana 115 [Rake paths 45, Pull tomato cages 40, Turn compost bed B 30]', 'Ben 55 [Haul yard bags to curb 35, Clean and oil tools 20]', 'Chen 55 [Turn compost bed A 30, Cover raised beds 25]', 'Dee 0 []', 'Eli 0 []']);
  assert.deepEqual(r.bench.map(b => b.name + ' ' + b.min), ['Empty rain barrels 20', 'Fix gate latch 15']); assert.equal(r.benchMin, 35); assert.ok(r.benchExplain); assert.deepEqual(r.spares.map(s => s.name + ' ' + s.spare), ['Ana 5', 'Ben 5', 'Chen 5']); conserved(r); });
t('proto validation: task -10, 0 and 2.5 rejected; helper -5 rejected; helper Dee 0 is fine', () => {
  for (const m of [-10, 0, 2.5, 481, NaN, '45', true]) assert.deepEqual(codes(F.validate(H, mk([['x', m]]))), ['taskMinutesInvalid'], String(m));
  assert.deepEqual(codes(F.validate(mk([['Ana', -5]]), T)), ['helperMinutesInvalid']); assert.deepEqual(F.validate(mk([['Dee', 0]]), T), []);
  assert.deepEqual(F.validate(mk([['Ana', 480]]), mk([['x', 1], ['y', 480]])), []); assert.deepEqual(codes(F.validate(mk([['Ana', 481]]), T)), ['helperMinutesInvalid']); });
t('proto validation: 13 tasks rejected, 6 helpers rejected, Ana/ana rejected; 0 tasks / 0 helpers rejected', () => {
  assert.ok(codes(F.validate(H, mk(Array.from({ length: 13 }, (_, i) => ['t' + i, 5])))).includes('tooManyTasks'));
  assert.ok(codes(F.validate(mk(Array.from({ length: 6 }, (_, i) => ['h' + i, 5])), T)).includes('tooManyHelpers'));
  const d = F.validate(mk([['Ana', 10], ['ana', 10]]), T); assert.deepEqual(codes(d), ['helperDuplicate']); assert.equal(d[0].i, 1); assert.equal(d[0].name, 'Ana');
  assert.deepEqual(codes(F.validate(H, mk([['Rake', 5], ['RAKE ', 5]]))), ['taskDuplicate']);
  assert.ok(codes(F.validate(H, [])).includes('taskEmpty')); assert.ok(codes(F.validate([], T)).includes('helperEmpty')); });
t('names: non-empty, task cap 40, helper cap 24, session title required, cap 60', () => {
  assert.deepEqual(codes(F.validate(mk([['  ', 5]]), mk([['', 5]]))), ['taskEmpty', 'helperEmpty']);
  assert.deepEqual(F.validate(mk([['h'.repeat(24), 5]]), mk([['t'.repeat(40), 5]])), []);
  const e = F.validate(mk([['h'.repeat(26), 5]]), mk([['t'.repeat(41), 5]])); assert.deepEqual(e.map(x => x.code + x.n), ['taskTooLong1', 'helperTooLong2']);
  assert.deepEqual(codes(F.validate(H, T, ' ')), ['sessionEmpty']); assert.deepEqual(codes(F.validate(H, T, 's'.repeat(61))), ['sessionTooLong']); assert.deepEqual(F.validate(H, T, 'Garden'), []); });
t('suggest() and check() both refuse invalid input (reference Check accepted -10: not ported)', () => {
  const bad = mk([['Rake paths', -10]]); assert.throws(() => F.suggest(H, bad), /taskMinutesInvalid/); assert.throws(() => F.check(H, [0], bad), /taskMinutesInvalid/);
  assert.throws(() => F.check(H, [0], mk([['x', 2.5]])), /invalid/); assert.throws(() => F.check(mk([['Ana', -5]]), [0], T.slice(0, 1)), /helperMinutesInvalid/);
  assert.throws(() => F.check(H, [0, 0], T.slice(0, 1)), /assign/); assert.throws(() => F.check(H, [5], T.slice(0, 1)), /assign/); assert.throws(() => F.check(H, [0.5], T.slice(0, 1)), /assign/); });
t('proto: all-zero helpers -> every task on the bench; Big 200 -> bench', () => {
  let r = F.suggest(mk([['A', 0], ['B', 0]]), T); assert.equal(r.bench.length, 9); assert.equal(r.given, 0); assert.equal(r.benchExplain, false); conserved(r);
  r = F.suggest(H, mk([['Big', 200], ['Small', 10]])); assert.deepEqual(r.bench.map(b => b.name), ['Big']); conserved(r); });
t('proto conservation over many random valid inputs', () => { let seed = 7; const rnd = k => (seed = (seed * 1103515245 + 12345) % 2147483648) % k;
  for (let i = 0; i < 400; i++) { const hs = mk(Array.from({ length: 1 + rnd(5) }, (_, j) => ['h' + j, rnd(481)])), ts = mk(Array.from({ length: 1 + rnd(12) }, (_, j) => ['t' + j, 1 + rnd(480)]));
    const r = F.suggest(hs, ts); conserved(r); r.rows.forEach(x => assert.ok(x.load <= x.cap)); const c = F.check(hs, ts.map(() => rnd(hs.length + 1) - 1), ts); conserved(c); } });
t('12 equal tasks over 5 helpers: ties in typed order (proto oracle), conservation', () => {
  const r = F.suggest(mk([['A', 60], ['B', 60], ['C', 30], ['D', 30], ['E', 0]]), mk(Array.from({ length: 12 }, (_, i) => ['T' + (i + 1), 15])));
  assert.deepEqual(r.rows.map(x => x.items.map(i => i.name).join(' ')), ['T1 T3 T5 T9', 'T2 T4 T6 T10', 'T7 T11', 'T8 T12', '']); // = proto suggest() output for the same input
  assert.ok(r.rows.every(x => x.load <= x.cap)); conserved(r); });
t('Check: a task on a 0-minute helper -> over by its minutes, stick fully over; no task is moved', () => {
  const r = F.check(H, [3, -1, 0, 0, 0, 0, 0, 0, 1], T); const dee = r.rows[3];
  assert.equal(dee.load, 40); assert.equal(dee.over, 40); assert.equal(dee.items[0].overMin, 40); assert.deepEqual(r.over.map(x => x.name), ['Ana', 'Dee']); assert.equal(r.rows[0].load, 170); assert.equal(r.rows[0].over, 50);
  assert.deepEqual(r.rows[0].items.map(i => i.overMin), [0, 0, 0, 0, 35, 15]); assert.deepEqual(r.assign, [3, -1, 0, 0, 0, 0, 0, 0, 1]); conserved(r); assert.equal(r.scale, 170); });
t('card text: Writer templates verbatim, name/title/tasks quoted, stamp in every card (Writer finals N9: For/Session lines; tasks, cardTextNoTasks at 0, cardTextNoFit with minutes)', () => {
  const r = F.suggest(H, T);
  assert.equal(F.cardText(C, 'Garden cleanup', r.rows[0]), 'For: “Ana”\nSession: “Garden cleanup”\n• “Rake paths” 45 min\n• “Haul yard bags to curb” 35 min\n• “Clean and oil tools” 20 min\n• “Fix gate latch” 15 min\n= 115 of your 120 min.\nTask names and minutes are my estimates.\n' + STAMP + '\nIf something doesn\'t work for you, tell me.');
  assert.equal(F.cardText(C, 'Garden cleanup', r.rows[3]), 'For: “Dee”\nSession: “Garden cleanup”\nNo tasks for you this time (0 minutes).\n' + STAMP);
  const s = F.suggest(H2, T); const lone = F.result(mk([['Eli', 45]]), mk([['Big', 200]]), [-1], 'suggest').rows[0];
  assert.equal(F.cardText(C, 'G', lone), 'For: “Eli”\nSession: “G”\nNo tasks for you in this split. You offered 45 min.\n' + STAMP + '\nIf something doesn\'t work for you, tell me.'); // cardTextNoFit
  [...r.rows, ...s.rows, lone].forEach(x => assert.ok(F.cardText(C, 'G', x).includes(STAMP))); });
t('Writer N9b: {stamp} = stamp in Suggest, stampCheck in Check (cardText, cardTextNoTasks, cardTextNoFit, benchText); stampFor', () => {
  const SC = 'Split made by hand, then added up. Nobody has agreed to this yet.'; assert.equal(C.stampCheck, SC); assert.equal(F.stampFor(C, 'check'), SC); assert.equal(F.stampFor(C, 'suggest'), STAMP);
  const c = F.check(H, [3, -1, 0, 0, 0, 0, 0, 0, 1], T), lone = F.result(mk([['Eli', 45]]), mk([['Big', 200]]), [-1], 'check');
  assert.equal(F.cardText(C, 'G', c.rows[3], 'check'), 'For: “Dee”\nSession: “G”\n• “Pull tomato cages” 40 min\n= 40 of your 0 min.\nTask names and minutes are my estimates.\n' + SC + '\nIf something doesn\'t work for you, tell me.');
  assert.equal(F.cardText(C, 'G', F.check(H, [0, 0, 0, 0, 0, 0, 0, 0, 0].map((x, i) => i < 3 ? 0 : -1), T).rows[3], 'check'), 'For: “Dee”\nSession: “G”\nNo tasks for you this time (0 minutes).\n' + SC);
  assert.equal(F.cardText(C, 'G', lone.rows[0], 'check'), 'For: “Eli”\nSession: “G”\nNo tasks for you in this split. You offered 45 min.\n' + SC + '\nIf something doesn\'t work for you, tell me.');
  assert.equal(F.benchText(C, 'G', c), 'Still on the bench for “G”:\n• “Turn compost bed A” 30 min\n' + SC);
  c.rows.forEach(r => { const x = F.cardText(C, 'G', r, 'check'); assert.ok(x.includes(SC) && !x.includes(STAMP) && !x.includes('{stamp}'), x); });
  F.suggest(H, T).rows.forEach(r => { const x = F.cardText(C, 'G', r, 'suggest'); assert.ok(x.includes(STAMP) && !x.includes(SC), x); assert.equal(F.cardText(C, 'G', r), x); }); });
t('typed marks neutralised: names with quotes / {braces} cannot break the frame', () => {
  const r = F.suggest(mk([['“Jo”', 30]]), mk([['{title} “x”', 10]])); const c = F.cardText(C, 'A “B” {name}', r.rows[0]);
  assert.ok(c.startsWith('For: “"Jo"”\nSession: “A "B" {name}”\n• “{title} "x"” 10 min\n= 10 of your 30 min.'), c); }); // shared quote/fill: inner curly marks -> straight, braces stay literal
t('bench text: verbatim, quoted, stamp; benchExplain only when spare exists but nothing fits', () => {
  const r = F.suggest(H2, T); assert.equal(F.benchText(C, 'Garden cleanup', r), 'Still on the bench for “Garden cleanup”:\n• “Empty rain barrels” 20 min\n• “Fix gate latch” 15 min\n' + STAMP);
  assert.equal(F.suggest(mk([['A', 10]]), mk([['B', 5], ['C', 20]])).benchExplain, true); // C 20 > 10 -> bench; B 5 placed -> 5 spare < 20
  assert.equal(F.suggest(mk([['A', 30]]), mk([['B', 5], ['C', 20]])).benchExplain, false); // everything placed
  assert.equal(F.suggest(mk([['A', 25]]), mk([['B', 5], ['C', 30]])).benchExplain, true);
  assert.equal(F.suggest(mk([['A', 0]]), mk([['B', 5]])).benchExplain, false); });
t('link codec: round trip (suggest + check), <=1000 chars, rejects tamper, cut, old version, extra keys, mismatched suggest', () => {
  const r = F.suggest(H, T), f = F.encode('Garden cleanup', H, T, r); assert.ok(/^fh1\.[A-Za-z0-9_-]+\.[0-9a-f]{6}$/.test(f)); assert.ok(f.length <= 1000, f.length);
  const d = F.decode('#' + f); assert.ok(d.ok); assert.equal(d.data.title, 'Garden cleanup'); assert.equal(d.data.res.mode, 'suggest'); assert.deepEqual(d.data.res.assign, r.assign);
  const c = F.check(H, [3, -1, 0, 0, 0, 0, 0, 0, 1], T), dc = F.decode(F.encode('G', H, T, c)); assert.ok(dc.ok); assert.equal(dc.data.res.mode, 'check'); assert.equal(dc.data.res.rows[3].over, 40);
  assert.equal(F.decode(f.slice(0, -10)).why, 'bad'); assert.equal(F.decode(f.replace('fh1.', 'fh2.').replace(/\.[0-9a-f]{6}$/, '.' + M.ck(f.replace('fh1.', 'fh2.').replace(/\.[0-9a-f]{6}$/, '')))).why, 'oldVersion');
  const forge = o => { const h = 'fh1.' + M.b64e(JSON.stringify(o)); return h + '.' + M.ck(h); }, base = { t: 'G', h: [['A', 10]], k: [['x', 5]], a: [0], m: 's' };
  assert.ok(F.decode(forge(base)).ok); assert.ok(!F.decode(forge(Object.assign({}, base, { z: 1 }))).ok); assert.ok(!F.decode(forge(Object.assign({}, base, { a: [-1] }))).ok);
  assert.ok(F.decode(forge(Object.assign({}, base, { a: [-1], m: 'c' }))).ok); assert.ok(!F.decode(forge(Object.assign({}, base, { k: [['x', -10]], m: 'c' }))).ok); assert.ok(!F.decode(forge(Object.assign({}, base, { h: [['A', 10], ['a', 3]] }))).ok);
  const big = mk(Array.from({ length: 12 }, (_, i) => [String.fromCharCode(65 + i).repeat(40), 480])), bh = mk(Array.from({ length: 5 }, (_, i) => [String(i).repeat(24), 480]));
  assert.ok(F.encode('T'.repeat(60), bh, big, F.suggest(bh, big)).length > 1000); assert.equal(F.decode('x'.repeat(1001)).why, 'bad'); });
t('Q1 spoof in the template-framed slots: a typed ” in the session title or a task name cannot close “…” early; no doubled quotes', () => {
  const title = 'Fest” · Pay “me', task = 'Rake” 999 min “Bank';
  const r = F.suggest(mk([['Ana”x', 30], ['Ben', 0]]), mk([[task, 10], ['Big', 200]])), c = F.cardText(C, title, r.rows[0]);
  assert.equal(c.split('\n').slice(0, 3).join('\n'), 'For: “Ana"x”\nSession: “Fest" · Pay "me”\n• “Rake" 999 min "Bank” 10 min');
  for (const x of [c, F.cardText(C, title, r.rows[1]), F.benchText(C, title, r)]) { assert.ok(!x.includes('””') && !x.includes('““'), x); const body = x.replace(C.stamp, '');
    assert.ok(!/[\u201C\u201D]/.test(body.replace(/“[^“”]*”/g, '')), 'every curly mark is a matched frame: ' + x); assert.ok(!x.includes('Fest”') && !x.includes('Rake”'), x); }
  assert.equal(F.benchText(C, title, r).split('\n')[0], 'Still on the bench for “Fest" · Pay "me”:');
  assert.equal(M.fill(C.taskDuplicate, { name: 'Rake” and “x' }), 'Two tasks are both called “Rake" and "x”.'); });
t('minutes(): digits only; −10, 2.5, 1e2, blank -> NaN', () => { assert.equal(F.minutes(' 45 '), 45); assert.equal(F.minutes('0'), 0); for (const s of ['−10', '-10', '2.5', '1e2', '', ' ', '45min']) assert.ok(Number.isNaN(F.minutes(s)), s); });
t('copy.js has every key the core and UI use; banned words absent except "agreed" in the stamp', () => {
  for (const k of ['stampCheck', 'overBy', 'loadLine', 'copyCard', 'zeroHint', 'rolledUp', 'sheetBenchRow', 'benchEmpty', 'cardText', 'cardTextNoTasks', 'cardTextNoFit', 'sessionEmpty', 'loadSpare', 'benchHeadingEmpty', 'sheetTaskCell', 'sheetMinutes', 'taskRowLabel', 'minutesRowLabel', 'helperRowLabel', 'helperMinutesRowLabel', 'removeTaskBlank', 'removeHelperBlank', 'checkNote', 'receiverNote', 'cardTaskLine', 'benchText', 'benchLine', 'stamp', 'ruleHeading', 'ruleText', 'sheetRule', 'sheetRuleCheck', 'conservation', 'linkWarning']) assert.ok(C[k], k);
  const all = JSON.stringify(C).toLowerCase(); for (const w of ['booked', 'confirmed', 'reserved', 'accepted', 'optimal', 'fair split', 'guaranteed', ' safe', 'private']) assert.ok(!all.includes(w), w);
  assert.equal(all.split('agreed').length - 1, 3); // stamp + stampCheck + receiverNote (N9b: card templates take {stamp})
  for (const k of ['cardText', 'cardTextNoTasks', 'cardTextNoFit']) assert.ok(C[k].includes('{stamp}') && !C[k].includes('agreed'), k); });
console.log(n + ' tests passed');
