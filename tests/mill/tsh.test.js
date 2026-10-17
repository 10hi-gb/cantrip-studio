// node tests/mill/tsh.test.js — The Same Hour model: zone-aware instants, DST rejection, merge-then-intersect, open overlaps, unknown never free, link codec
const assert = require('assert'); const T = require('../../mill/the-same-hour/tsh.js'), M = require('../../mill/shared/core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const NY = 'America/New_York';
let vid = 100;
function mk(people, o) { o = o || {}; const s = { w: o.w || '2026-10-19', z: o.z === undefined ? NY : o.z, n: String(o.n || 60), u: o.u || 'min', t: '', p: [], next: 1 };
  people.forEach(([name, ivs], i) => s.p.push({ id: i + 1, n: name, iv: ivs.map(([d, a, b]) => ({ id: vid++, d, s: a, e: b })) })); return s; }
// Creative example data (week Mon 19 Oct 2026). Rae Thu "not free" is not a feature here: blank = unknown.
const ex = o => mk([['Rae', [[0, '18:00', '20:00'], [2, '12:00', '14:00'], [2, '13:30', '15:00'], [5, '09:00', '12:00']]], ['Sol', [[0, '19:00', '21:00'], [2, '14:00', '16:00'], [5, '11:00', '13:00']]], ['Tam', [[0, '18:30', '20:30'], [2, '15:00', '17:00'], [3, '10:00', '12:00']]]], o);
const loc = (r, x) => T.hhmm(T.localMin(x.a, r.days[x.day], NY)) + '-' + T.hhmm(T.localMin(x.b, r.days[x.day], NY));
t('s1 (60 min): Mon 19:00-20:00 only option; Wed touch at 15:00 is not an overlap; Sat blocked by Tam unknown', () => {
  const r = T.compute(ex()); assert.equal(r.state, 'found'); assert.deepEqual(r.options.map(x => x.day + ' ' + loc(r, x)), ['0 19:00-20:00']);
  assert.deepEqual(r.dayRes[2].touch.map(x => T.hhmm(T.localMin(x, r.days[2], NY))), ['15:00']); assert.equal(r.dayRes[2].options.length + r.dayRes[2].short.length, 0);
  assert.deepEqual(r.maybe.map(x => x.day + ' ' + loc(r, x)), ['5 11:00-12:00']); assert.deepEqual(r.dayRes[5].unknown, [2]);
  assert.deepEqual([1, 4, 6].map(i => r.dayRes[i].kind), ['allUnknown', 'allUnknown', 'allUnknown']); assert.equal(r.dayRes[3].kind, 'partial'); assert.equal(r.dayRes[3].maybe.length, 0); });
t('same-person overlaps merged first (Rae Wed 12:00-14:00 + 13:30-15:00 -> 12:00-15:00, both sources kept)', () => {
  const r = T.compute(ex()), w = r.people[0].merged[2]; assert.equal(w.length, 1); assert.equal(loc(r, Object.assign({ day: 2 }, w[0])), '12:00-15:00'); assert.deepEqual(w[0].src.map(s => s.s + '-' + s.e), ['12:00-14:00', '13:30-15:00']); });
t('s2 (90 min): no option; closest Mon 19:00-20:00 is 60 min (30 short); unknown people counted', () => {
  const r = T.compute(ex({ n: 90 })); assert.equal(r.state, 'none'); assert.equal(r.options.length, 0); assert.equal(loc(r, r.closest), '19:00-20:00'); assert.equal(r.closest.len, 60); assert.equal(r.unknownPeople.length, 3); });
t('duration in hours: 1 hr == 60 min; 2 hr finds nothing', () => { assert.equal(T.compute(ex({ n: 1, u: 'hr' })).options.length, 1); assert.equal(T.compute(ex({ n: 2, u: 'hr' })).state, 'none'); });
t('touching own intervals merge (person-level), but a cross-person touch never counts', () => {
  const r = T.compute(mk([['A', [[0, '09:00', '10:00'], [0, '10:00', '11:00']]], ['B', [[0, '09:30', '10:30']]]])); assert.deepEqual(r.options.map(x => loc(r, x)), ['09:30-10:30']);
  const q = T.compute(mk([['A', [[0, '09:00', '10:00']]], ['B', [[0, '10:00', '11:00']]]])); assert.equal(q.state, 'none'); assert.equal(q.short.length, 0); assert.equal(q.dayRes[0].touch.length, 1); });
t('fall-back ambiguous 01:30 and spring-forward gap 02:30 are rejected, never moved', () => {
  let r = T.compute(mk([['A', [[6, '01:30', '03:00']]], ['B', [[6, '00:00', '04:00']]]], { w: '2026-10-26' })); assert.equal(r.state, 'fix'); assert.deepEqual(r.errors.map(e => e.code), ['dstAmbiguous']);
  r = T.compute(mk([['A', [[6, '02:30', '04:00']]], ['B', [[6, '00:00', '05:00']]]], { w: '2027-03-08' })); assert.deepEqual(r.errors.map(e => e.code + ' ' + e.time), ['dstGap 02:30']);
  assert.deepEqual(T.changes({ w: '2026-10-26', z: NY }).map(c => c.day + ' ' + c.from + ' -> ' + c.to), ['6 02:00 EDT -> 01:00 EST']); assert.equal(T.changes({ w: '2026-10-19', z: NY }).length, 0); });
t('lengths are real elapsed time across a DST change (00:00-04:00 on fall-back day = 5h)', () => {
  const r = T.compute(mk([['A', [[6, '00:00', '04:00']]], ['B', [[6, '00:00', '04:00']]]], { w: '2026-10-26', n: 300 })); assert.equal(r.options.length, 1); assert.equal(r.options[0].len, 300); });
t('24:00 end allowed; end before or equal to start rejected; bad formats rejected', () => {
  assert.equal(T.compute(mk([['A', [[0, '20:00', '24:00']]], ['B', [[0, '22:00', '24:00']]]])).options[0].len, 120);
  assert.deepEqual(T.compute(mk([['A', [[0, '10:00', '10:00'], [1, '9', '10:00'], [2, '24:00', '24:00']]], ['B', []]])).errors.map(e => e.code), ['intervalOrder', 'timeInvalid', 'timeInvalid']); });
t('zone: offsets and abbr come from the instant (EDT -04:00 in Oct, EST -05:00 in Nov; Kolkata +05:30)', () => {
  assert.equal(T.zoneInfo(Date.UTC(2026, 9, 19, 16), NY).offset, '\u221204:00'); assert.equal(T.zoneInfo(Date.UTC(2026, 10, 9, 16), NY).abbr, 'EST'); assert.equal(T.zoneInfo(0, 'Asia/Kolkata').offset, '+05:30'); });
t('same wall-clock in another zone: instants differ, overlap logic identical', () => { const r = T.compute(ex({ z: 'Asia/Tokyo' })); assert.equal(r.options.length, 1); assert.equal(T.hhmm(T.localMin(r.options[0].a, r.days[0], 'Asia/Tokyo')), '19:00'); });
t('states: no zone -> nozone; fewer than 2 / nothing typed -> empty; 7 people -> fix; unnamed -> fix', () => {
  assert.equal(T.compute(ex({ z: '' })).state, 'nozone'); assert.equal(T.compute(T.blank('2026-10-19')).state, 'nozone'); const b = T.blank('2026-10-19'); b.z = NY; assert.equal(T.compute(b).state, 'empty');
  const s = ex(); for (let i = 0; i < 4; i++) s.p.push({ id: 50 + i, n: 'P' + i, iv: [] }); assert.equal(T.compute(s).state, 'fix');
  const u = ex(); u.p[1].n = ''; assert.equal(T.compute(u).state, 'fix'); });
t('window fits the data: whole hours, at least 6h', () => { const r = T.compute(ex()); assert.deepEqual(T.windowOf(r, NY), [9, 21]); const q = T.compute(mk([['A', [[0, '10:00', '11:00']]], ['B', [[0, '10:30', '11:30']]]])); const w = T.windowOf(q, NY); assert.ok(w[1] - w[0] >= 6 && w[0] <= 10 && w[1] >= 12); });
t('link codec round trip; bad / tampered / old version / oversized refused', () => {
  const s = ex(), f = T.encode(s); assert.ok(/^h1\./.test(f)); const d = T.decode('#' + f); assert.ok(d.ok); assert.deepEqual(T.compute(d.data).options.length, 1); assert.equal(d.data.p[0].n, 'Rae');
  assert.equal(T.decode('#' + f.slice(0, -1) + (f.slice(-1) === '0' ? '1' : '0')).why, 'bad'); assert.equal(T.decode('#' + M.pack('h', 2, {})).why, 'oldVersion'); assert.equal(T.decode('#' + 'x'.repeat(2001)).why, 'tooLong');
  assert.equal(T.decode('#' + M.pack('h', 1, { w: '2026-10-19', z: 'Mars/Base', n: '60', u: 'min', t: '', p: [] })).why, 'bad');
  assert.equal(T.decode('#' + M.pack('h', 1, { w: '2026-10-19', z: NY, n: '60', u: 'min', t: '', p: [['<img src=x>', [[0, '09:00', '10:00']]], ['B', [[9, '09:00', '10:00']]]] })).why, 'bad');
  const big = ex(); for (let i = 0; i < 3; i++) big.p.push({ id: 60 + i, n: 'P'.repeat(24), iv: Array.from({ length: 21 }, (_, k) => ({ id: 900 + i * 30 + k, d: k % 7, s: '09:00', e: '10:00' })) }); assert.equal(T.encode(big), ''); });
t('property (3000 cases): options/short/touch match a brute-force minute scan of the merged free sets', () => {
  let seed = 7; const rnd = k => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % k; };
  for (let c = 0; c < 3000; c++) {
    const np = 2 + rnd(3), people = []; for (let i = 0; i < np; i++) { const iv = []; const k = 1 + rnd(3); for (let j = 0; j < k; j++) { const a = rnd(20) * 30, b = a + (1 + rnd(8)) * 30; iv.push([0, T.hhmm(a), T.hhmm(Math.min(b, 1440))]); } people.push(['P' + i, iv]); }
    const dur = (1 + rnd(4)) * 30, s = mk(people, { n: dur, z: 'UTC' }), r = T.compute(s);
    // brute force at half-minute resolution of open intervals
    const free = m => people.every(([, iv]) => iv.some(([, a, b]) => T.parseTime(a) < m && m < T.parseTime(b, true)));
    const runs = []; let st = null; for (let h = 1; h < 2880; h += 1) { const m = h / 2, f = free(m); if (f && st === null) st = m - 0.5; if (!f && st !== null) { runs.push([st, m]); st = null; } } if (st !== null) runs.push([st, 1440]);
    const got = r.options.concat(r.short).map(x => [T.localMin(x.a, r.days[0], 'UTC'), T.localMin(x.b, r.days[0], 'UTC')]).sort((a, b) => a[0] - b[0]);
    assert.deepEqual(got, runs, JSON.stringify(people)); assert.ok(r.options.every(x => x.len >= dur) && r.short.every(x => x.len < dur));
    // touches: points where everyone free on the closed sets but no open overlap around
    const closed = m => people.every(([, iv]) => iv.some(([, a, b]) => T.parseTime(a) <= m && m <= T.parseTime(b, true)));
    const tp = []; for (let m = 0; m <= 1440; m += 30) if (closed(m) && !free(m - 0.5) && !free(m + 0.5)) tp.push(m);
    assert.deepEqual(r.dayRes[0].touch.map(x => T.localMin(x, r.days[0], 'UTC')), tp, JSON.stringify(people));
  } });
console.log('PASS ' + n + ' tests');
