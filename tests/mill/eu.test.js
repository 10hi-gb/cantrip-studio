// node tests/mill/eu.test.js — Even Up model: integer cents, deterministic leftover cents, zero-sum balances, a settlement
// that zeroes every balance, validation, and the versioned link codec (full rejection of malformed input, 2,000-char URL cap).
const assert = require('assert'); const E = require('../../mill/even-up/eu.js'), M = require('../../mill/shared/core.js');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/even-up/copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
// mk(['A','B','C'], [[what, '30.00', payerIdx, 'e'|'w', [idx...] | [[idx, '1'],...]]])
function mk(names, xs, ev = 'Cabin weekend') {
  const st = { ev, cur: 0, p: names.map((name, i) => ({ id: i + 1, name })), x: [], next: 0 }; let id = 100;
  for (const [what, amt, payer, mode, ps] of xs) { const x = { id: id++, what, amt: E.parseAmount(amt).v, payer: payer + 1, gone: '', mode, inc: [], w: {} };
    for (const q of ps) { if (mode === 'w') { x.inc.push(q[0] + 1); const w = E.parseWeight(q[1]); x.w[q[0] + 1] = w.ok ? w.v : w.v === 0 ? 0 : NaN; } else { x.inc.push(q + 1); } } st.x.push(x); }
  st.next = id; return st;
}
const nm = (st, id) => E.person(st, id).name;
const tr = (st, c) => c.transfers.map(x => nm(st, x.from) + '>' + nm(st, x.to) + ' ' + E.fmt(x.c));
const nets = (st, c) => c.balances.map(b => nm(st, b.id) + ' ' + E.fmt(b.net, '$', true));
t('brief test: A pays 30 for A/B/C -> B pays A 10, C pays A 10 (Creative s1)', () => {
  const st = mk(['A', 'B', 'C'], [['Firewood', '30', 0, 'e', [0, 1, 2]]]), c = E.compute(st);
  assert.deepEqual(c.xs[0].shares.map(s => s.c), [1000, 1000, 1000]); assert.deepEqual(nets(st, c), ['A +$20.00', 'B −$10.00', 'C −$10.00']);
  assert.deepEqual(tr(st, c), ['B>A $10.00', 'C>A $10.00']); assert.equal(c.sum, 0); });
t('zero net -> no transfers (Creative s3)', () => {
  const st = mk(['A', 'B'], [['Dinner', '20', 0, 'e', [0, 1]], ['Taxi', '20', 1, 'e', [0, 1]]]), c = E.compute(st);
  assert.deepEqual(c.transfers, []); assert.ok(c.balances.every(b => b.net === 0)); assert.ok(E.summary(st, C, c).includes(C.summaryEven)); });
t('odd cent: 10.00 / 3 -> A 3.34 (+1 leftover cent, ties to first listed), B 3.33, C 3.33', () => {
  const c = E.compute(mk(['A', 'B', 'C'], [['Groceries', '10', 1, 'e', [0, 1, 2]]])); assert.deepEqual(c.xs[0].shares, [{ id: 1, c: 334, extra: 1 }, { id: 2, c: 333, extra: 0 }, { id: 3, c: 333, extra: 0 }]); assert.equal(c.xs[0].residual, 1); });
t('leftover cents go to largest remainders first, then list order', () => {
  // 1.00 weighted 1:1:1:3 over 6 -> exact 16.67,16.67,16.67,50 ; floors 16,16,16,50 = 98 ; remainders 4,4,4,0 -> 2 cents to first two
  assert.deepEqual(E.split(100, [1, 2, 3, 4], [1, 1, 1, 3]).map(s => s.c), [17, 17, 16, 50]);
  // 0.05 over weights 1,2 -> exact 1.67, 3.33 ; floors 1,3 ; remainders 2,1 -> the cent goes to the first (larger remainder)
  assert.deepEqual(E.split(5, [1, 2], [1, 2]).map(s => s.c), [2, 3]);
  // remainder ordering beats list order: 0.10 weights 1,1,4 (W=6) -> 1.67,1.67,6.67 ; floors 1,1,6=8 ; rems 4,4,4 -> first two
  assert.deepEqual(E.split(10, [7, 8, 9], [1, 1, 4]).map(s => s.c), [2, 2, 6]);
  // rems 1,5 (W=6, amounts 1*.. ) : 0.01 weights 1,5 -> exact .17,.83 ; floors 0,0 ; rems 1,5 -> cent to second (largest remainder)
  assert.deepEqual(E.split(1, [1, 2], [1, 5]).map(s => s.c), [0, 1]); });
t('excluded participant + weighted (Creative s2): nets A +8.66, B −3.33, C −13.33, D +8.00; B>A 3.33, C>A 5.33, C>D 8.00', () => {
  const st = mk(['A', 'B', 'C', 'D'], [['Firewood', '30', 0, 'e', [0, 1, 2]], ['Groceries', '10', 1, 'e', [0, 1, 2]], ['Canoe hire', '24', 3, 'w', [[0, '1'], [3, '2']]]]), c = E.compute(st);
  assert.deepEqual(c.xs[2].shares.map(s => s.c), [800, 1600]); assert.deepEqual(c.xs[0].out, [4]); assert.deepEqual(c.xs[2].out, [2, 3]);
  assert.deepEqual(nets(st, c), ['A +$8.66', 'B −$3.33', 'C −$13.33', 'D +$8.00']); assert.deepEqual(tr(st, c), ['B>A $3.33', 'C>A $5.33', 'C>D $8.00']);
  assert.ok(Object.values(E.after(c.balances, c.transfers)).every(v => v === 0)); });
t('unequal splits: weights 1, 2.5, 0.5 on 12.34 add up exactly', () => {
  const st = mk(['A', 'B', 'C'], [['Fuel', '12.34', 2, 'w', [[0, '1'], [1, '2.5'], [2, '0.5']]]]), c = E.compute(st);
  assert.equal(c.xs[0].total, 1234); assert.deepEqual(c.xs[0].shares.map(s => s.c), [309, 771, 154]); assert.equal(c.sum, 0); });
t('refunds / negatives rejected, plain amounts only, caps', () => {
  assert.deepEqual(E.parseAmount('-5'), { ok: false, why: 'negative' }); assert.deepEqual(E.parseAmount('\u22125.00'), { ok: false, why: 'negative' });
  assert.equal(E.parseAmount('12,5').why, 'plain'); assert.equal(E.parseAmount('1e3').why, 'plain'); assert.equal(E.parseAmount('$5').why, 'plain'); assert.equal(E.parseAmount('5.555').why, 'plain'); assert.equal(E.parseAmount('').why, 'empty'); assert.equal(E.parseAmount('Infinity').why, 'plain'); assert.equal(E.parseAmount('NaN').why, 'plain');
  assert.equal(E.parseAmount('12.5').v, 1250); assert.equal(E.parseAmount('.5').v, 50); assert.equal(E.parseAmount('0').v, 0); assert.equal(E.parseAmount(' 007.10 ').v, 710);
  assert.equal(E.parseAmount('100000').v, 10000000); assert.equal(E.parseAmount('100000.01').why, 'big'); assert.equal(E.parseAmount('9999999999999').why, 'plain'); assert.equal(E.parseAmount('999999999999').why, 'big');
  const st = mk(['A', 'B'], [['Returned tent', '5', 0, 'e', [0, 1]]]); st.x[0].amt = -500; assert.equal(E.expenseErrors(st, st.x[0]).amt, 'negative');
  st.x[0].amt = 1.5; assert.equal(E.expenseErrors(st, st.x[0]).amt, 'plain'); st.x[0].amt = E.LIM.amtMax + 1; assert.equal(E.expenseErrors(st, st.x[0]).amt, 'big'); });
t('invalid totals: weights all zero, a zero/invalid weight, nobody in the split, payer missing; invalid lines left out of balances', () => {
  const st = mk(['A', 'B', 'C'], [['Firewood', '30', 0, 'e', [0, 1, 2]], ['Fuel', '12', 0, 'w', [[0, '0'], [1, '0'], [2, '0']]], ['Snacks', '6', 1, 'w', [[0, '0'], [1, '1']]], ['Tea', '3', 2, 'e', []], ['Wood', '9', 0, 'w', [[0, 'x']]]]);
  const c = E.compute(st); assert.deepEqual(c.xs.map(r => r.err.split || ''), ['', 'weightZero', 'weight', 'none', 'weight']); assert.equal(c.bad, 4);
  assert.deepEqual(nets(st, c), ['A +$20.00', 'B −$10.00', 'C −$10.00']); assert.ok(!E.canShare(st, c));
  E.removePerson(st, 1); const c2 = E.compute(st); assert.equal(c2.xs[0].err.payer, 'gone'); assert.equal(st.x[0].gone, 'A'); assert.deepEqual(st.x[0].inc, [2, 3]);
  st.x[0].payer = null; st.x[0].gone = ''; assert.equal(E.expenseErrors(st, st.x[0]).payer, 'none');
  assert.equal(E.parseWeight('0').why, 'zero'); assert.equal(E.parseWeight('-1').why, 'nan'); assert.equal(E.parseWeight('1000').v, 100000); assert.equal(E.parseWeight('1000.01').why, 'big'); assert.equal(E.parseWeight('2.5').v, 250); assert.equal(E.fmtWeight(250), '2.5'); assert.equal(E.fmtWeight(105), '1.05'); });
t('people/event validation: 2–8, unique names (case and spacing folded), lengths, event required', () => {
  const st = E.blank(); assert.deepEqual(E.peopleErrors(st).map(e => e.why), ['eventEmpty', 'empty', 'empty']);
  st.ev = 'x'.repeat(61); st.p = [{ id: 1, name: 'Ana' }, { id: 2, name: ' an a ' }]; assert.deepEqual(E.peopleErrors(st).map(e => e.why + (e.over || '')), ['eventLong1', 'dup']);
  st.ev = 'Trip'; st.p = [{ id: 1, name: 'x'.repeat(25) }]; assert.deepEqual(E.peopleErrors(st).map(e => e.why + (e.over || '')), ['tooFew', 'long1']);
  st.p = Array.from({ length: 9 }, (_, i) => ({ id: i + 1, name: 'P' + i })); assert.deepEqual(E.peopleErrors(st).map(e => e.why), ['tooMany']);
  st.p = st.p.slice(0, 2); assert.ok(!E.removePerson(st, 1), 'never fewer than 2'); assert.deepEqual(E.peopleErrors(st), []); });
t('fmt: integer cents only, grouping, signs', () => {
  assert.equal(E.fmt(0), '$0.00'); assert.equal(E.fmt(5, '\u20AC'), '\u20AC0.05'); assert.equal(E.fmt(123456789), '$1,234,567.89'); assert.equal(E.fmt(-1050, '$', true), '\u2212$10.50'); assert.equal(E.fmt(1050, '$', true), '+$10.50'); assert.equal(E.fmt(0, '$', true), '$0.00');
  assert.throws(() => E.fmt(1.5)); assert.throws(() => E.fmt(NaN)); });
t('summary text: Writer template, typed names/event quoted (spoof marks neutralised), no fewest/minimum claim', () => {
  const st = mk(['A\u201D pays \u201CZed', 'B', 'C'], [['Firewood', '30', 0, 'e', [0, 1, 2]]]), s = E.summary(st, C);
  assert.equal(s, '\u201CCabin weekend\u201D ($)\n\u201CB\u201D pays \u201CA" pays "Zed\u201D $10.00\n\u201CC\u201D pays \u201CA" pays "Zed\u201D $10.00\nAfter these, every balance is $0.00.\n' + C.residualPolicy + '\nThis shows who pays whom. It doesn\'t move money.');
  assert.ok(!/fewest|minim|optimal/i.test(s)); });
t('no user-facing copy claims the fewest/minimum/optimal transfers (only the Writer disclaimer says "not necessarily")', () => {
  const all = JSON.stringify(C); const hits = Object.entries(C).filter(([k, v]) => /fewest|minim|optimal|smallest number/i.test(JSON.stringify(v))).map(([k]) => k);
  assert.deepEqual(hits, ['notFewestNote']); assert.ok(/aren't necessarily the fewest/.test(C.notFewestNote)); assert.ok(all.length); });
t('link: round trip of a valid event; versioned; tag e1', () => {
  const st = mk(['A', 'B', 'C', 'D'], [['Firewood', '30', 0, 'e', [0, 1, 2]], ['Canoe hire', '24', 3, 'w', [[0, '1'], [3, '2.5']]]]); const f = E.encode(st, 30);
  assert.ok(/^e1\./.test(f)); const d = E.decode('#' + f); assert.ok(d.ok, JSON.stringify(d));
  const c1 = E.compute(st), c2 = E.compute(d.data); assert.deepEqual(c2.balances.map(b => b.net), c1.balances.map(b => b.net)); assert.deepEqual(c2.transfers.map(x => x.c), c1.transfers.map(x => x.c));
  assert.equal(d.data.x[1].w[4], 250); assert.equal(E.summary(d.data, C), E.summary(st, C));
  assert.equal(E.decode(M.pack('e', 2, {})).why, 'oldVersion'); assert.equal(E.decode('').why, 'empty');
  assert.equal(E.encode(E.blank(), 30), null, 'nothing to share until valid'); });
t('link: malformed input fully rejected', () => {
  const ok = { e: 'Trip', c: 0, p: ['A', 'B'], x: [['Food', 1000, 0, 0, [0, 1]]] }; assert.ok(E.decode(M.pack('e', 1, ok)).ok);
  const mut = [
    o => { o.z = 1; }, o => { delete o.c; }, o => { o.c = 3; }, o => { o.c = 0.5; }, o => { o.e = ''; }, o => { o.e = ' Trip'; }, o => { o.e = 5; }, o => { o.p = ['A']; }, o => { o.p = ['A', 'a']; },
    o => { o.p = Array.from({ length: 9 }, (_, i) => 'P' + i); }, o => { o.p = ['A', 'B\u202E']; }, o => { o.p = ['A', 'x'.repeat(25)]; }, o => { o.x = []; }, o => { o.x = Array.from({ length: 21 }, () => ['F', 1, 0, 0, [0]]); },
    o => { o.x[0][1] = -1; }, o => { o.x[0][1] = 1.5; }, o => { o.x[0][1] = '1000'; }, o => { o.x[0][1] = 10000001; }, o => { o.x[0][2] = 2; }, o => { o.x[0][2] = -1; }, o => { o.x[0][3] = 2; },
    o => { o.x[0][4] = []; }, o => { o.x[0][4] = [1, 0]; }, o => { o.x[0][4] = [0, 0]; }, o => { o.x[0][4] = [0, 5]; }, o => { o.x[0][4] = [[0, 100]]; }, o => { o.x[0][3] = 1; },
    o => { o.x[0][3] = 1; o.x[0][4] = [[0, 0], [1, 100]]; }, o => { o.x[0][3] = 1; o.x[0][4] = [[0, 100001]]; }, o => { o.x[0][3] = 1; o.x[0][4] = [[0, 1.5]]; }, o => { o.x[0][0] = ''; }, o => { o.x[0][0] = 'x'.repeat(41); },
    o => { o.x[0].push(1); }, o => { o.x[0] = 'Food'; }, o => { o.p = 'A,B'; }, o => { o.x = {}; }];
  mut.forEach((f, i) => { const o = JSON.parse(JSON.stringify(ok)); f(o); assert.equal(E.decode(M.pack('e', 1, o)).ok, false, 'mutation ' + i); });
  const f = M.pack('e', 1, ok); assert.equal(E.decode(f.slice(0, -1)).why, 'bad'); assert.equal(E.decode(f.slice(0, 20)).why, 'bad'); assert.equal(E.decode(f.replace('.', '..')).why, 'bad');
  assert.equal(E.decode(f.slice(0, -6) + 'zzzzzz').why, 'bad'); assert.equal(E.decode('e1.' + Buffer.from('[1,2]').toString('base64url') + '.000000').why, 'bad'); assert.equal(E.decode(M.pack('t', 1, ok)).why, 'bad');
  assert.equal(E.decode(M.pack('e', 1, [1])).why, 'bad'); assert.equal(E.decode('e1.' + 'A'.repeat(2100) + '.abcdef').why, 'tooLong'); assert.equal(E.decode('%%%').why, 'bad'); });
t('URL cap: whole URL (64-char origin + path + # + fragment) never over 2,000; too-long -> "" (no silent cut)', () => {
  const origin = 'https://' + 'o'.repeat(64 - 'https://'.length - 4) + '.dev'; assert.equal(origin.length, 64); const prefix = origin + '/mill/even-up/#';
  const big = mk(Array.from({ length: 8 }, (_, i) => 'Person ' + 'x'.repeat(14) + i), Array.from({ length: 20 }, (_, i) => ['Expense number ' + i + ' ' + 'y'.repeat(20), '99999.99', i % 8, 'w', Array.from({ length: 8 }, (_, k) => [k, '999.99'])]), 'E'.repeat(60));
  assert.ok(E.canShare(big)); const raw = E.rawFragment(big); assert.ok(prefix.length + raw.length > E.URL_MAX); assert.equal(E.encode(big, prefix.length), '');
  const small = mk(['A', 'B'], [['Food', '10', 0, 'e', [0, 1]]]); const f = E.encode(small, prefix.length); assert.ok(f && prefix.length + f.length <= E.URL_MAX);
  // grow one event until it crosses the cap; the last accepted URL is <= 2000, the first refused is > 2000
  const g = mk(['A', 'B'], []); let lastOk = 0, firstOver = 0; for (let i = 0; i < 20 && !firstOver; i++) { g.x.push({ id: 900 + i, what: 'W' + 'z'.repeat(38) + (i % 10), amt: 12345, payer: 1, gone: '', mode: 'w', inc: [1, 2], w: { 1: 12345, 2: 100 } }); g.p = Array.from({ length: 8 }, (_, k) => ({ id: k + 1, name: 'N'.repeat(22) + k })); g.x.forEach(x => { x.inc = [1, 2, 3, 4, 5, 6, 7, 8]; [1, 2, 3, 4, 5, 6, 7, 8].forEach(k => { x.w[k] = 99999; }); }); g.ev = 'V'.repeat(60);
    const e = E.encode(g, prefix.length); if (e) lastOk = prefix.length + e.length; else firstOver = prefix.length + E.rawFragment(g).length; }
  assert.ok(lastOk > 0 && lastOk <= 2000 && firstOver > 2000, lastOk + ' / ' + firstOver);
  assert.ok(E.decode(E.rawFragment(big)).why === 'tooLong' || prefix.length + E.rawFragment(big).length > 2000); });
t('property: 5000 random events — shares add up per expense, cents conserved, Σ balances = 0, settlement zeroes everyone, every transfer > 0', () => {
  let seed = 11; const r = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) % k; };
  for (let k = 0; k < 5000; k++) {
    const np = 2 + r(7), names = Array.from({ length: np }, (_, i) => 'P' + i), xs = [];
    for (let i = 0, nx = 1 + r(20); i < nx; i++) { const amt = String(r(4) ? r(100000) : r(10000000)) ; const cents = (r(3) ? amt : String(Math.floor(+amt / 100)) + '.' + String(+amt % 100).padStart(2, '0'));
      const ps = []; for (let q = 0; q < np; q++) if (r(3)) ps.push(q); if (!ps.length) ps.push(r(np));
      if (r(2)) xs.push(['X' + i, cents, r(np), 'e', ps]); else xs.push(['X' + i, cents, r(np), 'w', ps.map(q => [q, String(1 + r(999)) + (r(2) ? '.' + r(100) : '')])]); }
    const st = mk(names, xs.filter(x => E.parseAmount(x[1]).ok)); if (!st.x.length) continue; const c = E.compute(st);
    let total = 0; c.xs.forEach(x => { assert.ok(x.ok, JSON.stringify(x.err)); assert.equal(x.shares.reduce((a, s) => a + s.c, 0), x.x.amt); assert.ok(x.shares.every(s => s.c >= 0 && Number.isInteger(s.c))); assert.ok(x.residual < x.shares.length || x.shares.length === 0); total += x.x.amt; });
    assert.equal(c.balances.reduce((a, b) => a + b.net, 0), 0); assert.equal(c.balances.reduce((a, b) => a + b.paid, 0), total); assert.equal(c.balances.reduce((a, b) => a + b.share, 0), total);
    assert.ok(c.transfers.every(x => Number.isInteger(x.c) && x.c > 0 && x.from !== x.to));
    assert.ok(Object.values(E.after(c.balances, c.transfers)).every(v => v === 0));
    assert.ok(c.transfers.every(x => c.balances.find(b => b.id === x.from).net < 0 && c.balances.find(b => b.id === x.to).net > 0), 'only debtors pay, only creditors receive');
    assert.ok(c.transfers.length <= Math.max(0, c.balances.filter(b => b.net).length - 1));
    const again = E.compute(JSON.parse(JSON.stringify(st))); assert.deepEqual(again.transfers, c.transfers, 'deterministic');
    if (k % 50 === 0) { const f = E.encode(st, 0); if (f) { const d = E.decode(f); assert.ok(d.ok); assert.deepEqual(E.compute(d.data).transfers.map(x => x.c), c.transfers.map(x => x.c)); } }
  } });
console.log('PASS ' + n + ' tests');
