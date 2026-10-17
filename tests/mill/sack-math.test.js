// node tests/mill/sack-math.test.js — Split the Sack pure math (Joshua Wave 1 cases + property-style + edges)
const assert = require('assert'); const S = require('../../mill/split-the-sack/sack.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const tot = r => r.rows.map(x => x.total);
const sumAll = r => r.rows.reduce((a, x) => a + x.total, 0) + r.unallocated.total;
const qtyAll = r => r.rows.reduce((a, x) => a + x.qty, 0) + r.unallocated.qty;
t('10 units/1000c, requests 3,3,4 -> 300/300/400', () => { const r = S.compute({ pkgQty: '10', inc: '1', price: 1000, requests: ['3', '3', '4'] }); assert.equal(r.status, 'exact'); assert.deepEqual(tot(r), [300, 300, 400]); assert.equal(r.unallocated.qty, 0); assert.equal(r.unallocated.total, 0); });
t('10 units/1000c, requests 3,3,3 -> 1 unit + 100c unassigned', () => { const r = S.compute({ pkgQty: 10, inc: 1, price: 1000, requests: [3, 3, 3] }); assert.equal(r.status, 'under'); assert.deepEqual(tot(r), [300, 300, 300]); assert.equal(r.unallocated.qty, 1000); assert.equal(S.fmtQty(r.unallocated.qty), '1'); assert.equal(r.unallocated.total, 100); assert.equal(sumAll(r), 1000); });
t('10 units/1000c, requests 4,4,4 -> shortage 2, blocked', () => { const r = S.compute({ pkgQty: 10, inc: 1, price: 1000, requests: [4, 4, 4] }); assert.equal(r.status, 'over'); assert.equal(r.complete, false); assert.equal(S.fmtQty(r.shortage), '2'); assert.equal(r.rows, undefined); });
t('3 equal units of a 3-unit/1000c package -> 334/333/333 (tie: list order)', () => { const r = S.compute({ pkgQty: 3, inc: 1, price: 1000, requests: [1, 1, 1] }); assert.deepEqual(tot(r), [334, 333, 333]); });
t('equal thirds of 30 units/1000c -> 334/333/333 (same rule, scaled)', () => { const r = S.compute({ pkgQty: 30, inc: 1, price: 1000, requests: [10, 10, 10] }); assert.deepEqual(tot(r), [334, 333, 333]); });
t('tie order follows list order, not value', () => { const r = S.compute({ pkgQty: 3, inc: 1, price: 2, requests: [1, 1, 1] }); assert.deepEqual(tot(r), [1, 1, 0]); });
t('1 cent split 3 ways -> 1/0/0', () => { const r = S.compute({ pkgQty: 3, inc: 1, price: 1, requests: [1, 1, 1] }); assert.deepEqual(tot(r), [1, 0, 0]); assert.equal(sumAll(r), 1); });
t('0 households rejected; 1 household rejected; 9 rejected', () => { assert.equal(S.compute({ pkgQty: 1, inc: 1, price: 1, requests: [] }).error, 'tooFew'); assert.equal(S.compute({ pkgQty: 1, inc: 1, price: 1, requests: [1] }).error, 'tooFew'); assert.equal(S.compute({ pkgQty: 9, inc: 1, price: 1, requests: Array(9).fill(1) }).error, 'tooMany'); });
t('large totals reconcile exactly (BigInt inside)', () => { const r = S.compute({ pkgQty: '999999999.999', inc: '0.001', price: 1e11, fee: 99999999999, requests: ['333333333.333', '333333333.333', '1.001'] }); assert.equal(sumAll(r), 1e11 + 99999999999); assert.equal(qtyAll(r), r.pkgQty); });
t('fractional quantities with 0.25 increment', () => { const r = S.compute({ pkgQty: '2.5', inc: '0.25', price: 1001, requests: ['0.75', '1.25', '0.5'] }); assert.equal(r.status, 'exact'); assert.deepEqual(tot(r), [300, 501, 200]); });
t('fee proportional (default) vs equal', () => { const p = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, requests: [2, 8] }); assert.deepEqual(p.rows.map(x => x.fee), [20, 80]); const e = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 101, feeBasis: 'equal', requests: [2, 8] }); assert.deepEqual(e.rows.map(x => x.fee), [51, 50]); assert.equal(sumAll(e), 1101); });
t('scope (b): proportional fee includes the unallocated row (cost + fee share); equal fee = households only', () => { const p = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, requests: [3, 3, 3] }); assert.equal(p.unallocated.fee, 10); assert.equal(p.unallocated.goods, 100); assert.equal(p.unallocated.total, 110); assert.deepEqual(p.rows.map(x => x.fee), [30, 30, 30]); assert.equal(sumAll(p), 1100); const e = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, feeBasis: 'equal', requests: [3, 3, 3] }); assert.equal(e.unallocated.fee, 0); assert.deepEqual(e.rows.map(x => x.fee), [34, 33, 33]); assert.equal(sumAll(e), 1100); });
t('scope (b): proportional remainder cents — unclaimed last in tie order; QA real example 25 lb', () => { const p = S.compute({ pkgQty: 3, inc: 1, price: 0, fee: 2, requests: [1, 1] }); assert.deepEqual([...p.rows, p.unallocated].map(x => x.fee), [1, 1, 0]);
  const r = S.compute({ pkgQty: '25', inc: '0.5', price: 3147, fee: 299, requests: ['8', '7.5', '6'] }); assert.deepEqual([...r.rows, r.unallocated].map(x => x.goods), [1007, 944, 755, 441]); assert.deepEqual([...r.rows, r.unallocated].map(x => x.fee), [95, 90, 72, 42]); assert.equal(sumAll(r), 3446); });
t('scope (b): equal mode with a fee and nobody taking -> nobasis (blocked); proportional always has a basis', () => { const z = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, feeBasis: 'equal', requests: [0, 0] }); assert.equal(z.status, 'nobasis'); assert.equal(z.complete, false); const z0 = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 0, feeBasis: 'equal', requests: [0, 0] }); assert.equal(z0.unallocated.total, 1000); const pz = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, requests: [0, 0] }); assert.equal(pz.unallocated.total, 1100); });
t('rejects invalid / non-finite / negative / out-of-increment', () => {
  const b = { pkgQty: 10, inc: 1, price: 1000, requests: [3, 3, 4] }, bad = o => S.compute(Object.assign({}, b, o)).ok;
  for (const v of [NaN, Infinity, -Infinity, -1, '-1', 'abc', '1e3', '', null, undefined, {}, '0x10']) assert.equal(bad({ requests: [v, 3, 4] }), false, 'req ' + String(v));
  for (const v of [NaN, Infinity, 0, -10, '1e1']) assert.equal(bad({ pkgQty: v }), false, 'pkg ' + v);
  for (const v of [0, -1, NaN, 11]) assert.equal(bad({ inc: v }), false, 'inc ' + v);
  for (const v of [NaN, Infinity, -1, 1.5, '1000', 1e12]) assert.equal(bad({ price: v }), false, 'price ' + v);
  for (const v of [-1, 0.5, Infinity]) assert.equal(bad({ fee: v }), false, 'fee ' + v);
  assert.equal(bad({ feeBasis: 'weird' }), false);
  assert.equal(S.compute(Object.assign({}, b, { requests: ['2.5', 3, 4] })).error, 'increment');
  assert.equal(S.compute({ pkgQty: '10', inc: '3', price: 1, requests: [3, 3] }).error, 'pkgNotMultiple');
  assert.equal(S.compute({ pkgQty: '1', inc: '0.0001', price: 1, requests: [0, 0] }).ok, false);
});
t('explicit assign: unclaimed 1 unit + 100c goes to chosen household only when asked', () => { const r = S.compute({ pkgQty: 10, inc: 1, price: 1000, requests: [3, 3, 3], assignTo: 1 }); assert.equal(r.status, 'exact'); assert.deepEqual(tot(r), [300, 400, 300]); assert.equal(r.rows[1].requested, 3000); assert.equal(r.unallocated.qty, 0); assert.equal(S.compute({ pkgQty: 10, inc: 1, price: 1, requests: [3, 3], assignTo: 2 }).error, 'assign'); });
t('equal fee goes only to households that take some', () => { const r = S.compute({ pkgQty: 10, inc: 1, price: 1000, fee: 100, feeBasis: 'equal', requests: [5, 0, 5] }); assert.deepEqual(r.rows.map(x => x.fee), [50, 0, 50]); });
t('build rule: the unclaimed fee share is never charged to a household automatically (stays on Unclaimed until assigned)', () => {
  let seed = 99; const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % k; };
  for (let i = 0; i < 3000; i++) { const Q = 1 + rnd(200), H = 2 + rnd(7), reqs = Array.from({ length: H }, () => rnd(Math.ceil(Q / H) + 1)); if (reqs.reduce((a, b) => a + b, 0) > Q) continue; const fee = rnd(100000), price = rnd(1e6);
    const r = S.compute({ pkgQty: Q, inc: 1, price, fee, requests: reqs }); const unQ = Q - reqs.reduce((a, b) => a + b, 0);
    // every household's fee is its own proportional share, rounded (never more than 1 cent above fee*q/Q), so nothing of Unclaimed's share moved onto it
    r.rows.forEach((x, k) => assert.ok(x.fee <= Math.ceil(fee * reqs[k] / Q), 'household ' + k + ' fee ' + x.fee));
    assert.ok(Math.abs(r.unallocated.fee - fee * unQ / Q) < 1, 'unclaimed fee'); if (unQ === 0) assert.equal(r.unallocated.fee, 0);
    // only an explicit assignment moves it
    if (unQ > 0) { const a = S.compute({ pkgQty: Q, inc: 1, price, fee, requests: reqs, assignTo: 0 }); assert.equal(a.unallocated.fee, 0); assert.equal(a.rows[0].fee + a.rows.slice(1).reduce((t, x) => t + x.fee, 0), fee); } } });
t('extraCents marks residual recipients', () => { const r = S.compute({ pkgQty: 3, inc: 1, price: 1000, requests: [1, 1, 1] }); assert.deepEqual(r.rows.map(x => x.extraCents), [1, 0, 0]); });
t('parseMoney', () => { assert.equal(S.parseMoney('18.99'), 1899); assert.equal(S.parseMoney('18.9'), 1890); assert.equal(S.parseMoney('18'), 1800); assert.equal(S.parseMoney('18.999'), null); assert.equal(S.parseMoney('-1'), null); assert.equal(S.parseMoney('1,000'), null); });
t('property: 5000 random cases reconcile money and quantity exactly; shortage blocks', () => {
  let seed = 12345; const rnd = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % k; };
  for (let i = 0; i < 5000; i++) {
    const inc = [1, 250, 500, 1000, 1, 5][rnd(6)], steps = 1 + rnd(400), Q = inc * steps, H = 2 + rnd(7);
    const reqs = Array.from({ length: H }, () => S.fmtQty(inc * rnd(Math.ceil(steps / H) + 2)));
    const price = rnd(5) === 0 ? rnd(4) : rnd(1e9), fee = rnd(3) ? rnd(5000) : 0, feeBasis = rnd(2) ? 'equal' : 'proportional';
    const r = S.compute({ pkgQty: S.fmtQty(Q), inc: S.fmtQty(inc), price, fee, feeBasis, requests: reqs });
    assert.ok(r.ok, JSON.stringify(r));
    if (r.status === 'over') { assert.equal(r.requested - Q, r.shortage); continue; }
    if (r.status === 'nobasis') { assert.ok(feeBasis === 'equal' && fee > 0 && reqs.every(q => S.parseQty(q) === 0)); continue; }
    if (feeBasis === 'equal') assert.equal(r.unallocated.fee, 0); else { const ex = fee * r.unallocated.qty / Q; assert.ok(Math.abs(r.unallocated.fee - ex) < 1 + 1e-6); }
    assert.equal(sumAll(r), price + fee); assert.equal(qtyAll(r), Q);
    [...r.rows, r.unallocated].forEach(x => { assert.ok(Number.isSafeInteger(x.total) && x.total >= 0); });
    // each row within 1 cent of its exact proportional goods share
    const W = Q; r.rows.forEach(x => { const exact = price * x.qty / W; assert.ok(Math.abs(x.goods - exact) < 1 + 1e-6); });
    // determinism
    assert.deepEqual(S.compute({ pkgQty: S.fmtQty(Q), inc: S.fmtQty(inc), price, fee, feeBasis, requests: reqs }), r);
  }
});
console.log('PASS ' + n + ' tests');
