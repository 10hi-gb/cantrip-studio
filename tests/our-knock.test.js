// node tests/our-knock.test.js — C051 rework: fragment schema (strict, bounded), judge rules, and copy-key hygiene
const O = require('../our-knock/app.js'), as = require('assert'), fs = require('fs');
// round trips
for (const [spec, note] of [[{ mode: 's' }, ''], [{ mode: 's' }, 'Took you long enough.'], [{ mode: 'c', call: [600, 300, 300, 600], lead: 1200, ans: [600] }, 'hi'], [{ mode: 'c', call: [200, 200], lead: 300, ans: [] }, ''], [{ mode: 'r', call: [500, 250, 250, 500, 2000, 80, 80, 80, 80, 80, 80] }, '']]) {
  const f = O.encode(spec, note); as.ok(f && f.length <= 400, JSON.stringify(spec)); const d = O.decode('#' + f); as.equal(d.mode, spec.mode); as.equal(d.note, note); if (spec.call) as.deepEqual(d.call, spec.call); }
as.equal(O.encode({ mode: 's' }, ''), 'k1.s'); as.equal(O.encode({ mode: 'c', call: [600, 300, 300, 600], lead: 1200, ans: [600] }, ''), 'k1.c.1o-u-u-1o.3c~1o');
// bounds on encode
as.equal(O.encode({ mode: 'r', call: [600] }, ''), null); as.equal(O.encode({ mode: 'r', call: Array(12).fill(100) }, ''), null); as.equal(O.encode({ mode: 'r', call: [2000, 2000, 2000, 100] }, ''), null);
as.equal(O.encode({ mode: 's' }, 'x'.repeat(81)), null); as.ok(O.encode({ mode: 's' }, 'x'.repeat(80)));
as.equal(O.encode({ mode: 's' }, '😀'.repeat(80)), null); // 320 UTF-8 bytes -> > 400 chars
// malformed / truncated / oversized -> null
const nb = Buffer.from('hi').toString('base64url');
for (const bad of ['', '#', 'k1', 'k2.s', 'K1.s', 'k1.x', 'k1.s.1o', 'k1.r', 'k1.r.1o', 'k1.r.1o-u-u-1o-', 'k1.r.1o--u', 'k1.r.zz-u', 'k1.r.7-u', 'k1.c.1o-u-u', 'k1.c.1o-u-u.3c', 'k1.c.1o-u-u.3c~', 'k1.c.1o-u-u.1~1o', 'k1.c.1o-u-u.zz~1o', 'k1.c.1o-u-u.3c~zz',
  'k1.s.n.', 'k1.s.n', 'k1.s.n.' + nb + '.x', 'k1.s.n.!!', 'k1.s.n.' + Buffer.from(' hi').toString('base64url'), 'k1.s.n.' + Buffer.from([0xff, 0xfe]).toString('base64url'), 'k1.s.n.' + Buffer.from('x'.repeat(81)).toString('base64url'),
  'k1.s.' + 'a'.repeat(400), 'k1.s%00', 'k1.s ', '<script>', 'k1.r.' + Array(12).fill('a').join('-')]) as.equal(O.decode(bad), null, bad);
// judge (classic: lead 1200; window 250 .. 3700 after "cut"; 2-knock gap 150..1400)
const S = O.decode('k1.s');
as.deepEqual(O.judge(S, [1200, 1800], 0), { ok: true }); as.equal(O.judge(S, [100, 700], 0).why, 'early'); as.equal(O.judge(S, [3800, 4400], 0).why, 'late'); as.equal(O.judge(S, [], 0).why, 'late');
as.equal(O.judge(S, [1200], 0).why, 'count'); as.equal(O.judge(S, [1200], 0).off, -1); as.equal(O.judge(S, [1200, 1250], 0).why, 'rhythm'); as.equal(O.judge(S, [1200, 2700], 0).why, 'rhythm'); as.ok(O.judge(S, [1200, 2700], 2).ok);
const C = O.decode('k1.c.1o-u-u.2s~u-u-1o'); as.ok(O.judge(C, [1000, 1300, 1600, 2200], 0).ok); as.ok(O.judge(C, [1000, 1300, 1600], 0).ok); as.equal(O.judge(C, [1000, 1600, 1700, 2200], 0).why, 'rhythm');
const Rp = O.decode('k1.r.1o-u-u-1o'); as.ok(O.judge(Rp, [100, 700, 1000, 1300, 1900], 0).ok); as.ok(O.judge(Rp, [100, 700, 1000, 1300], 0).ok);
// copy hygiene: every key used exists; removed keys are gone
const copy = fs.readFileSync(__dirname + '/../our-knock/copy.js', 'utf8'); const COPY = new Function(copy + ';return COPY')();
as.equal(Object.keys(COPY).length, 72);
const src = fs.readFileSync(__dirname + '/../our-knock/app.js', 'utf8') + fs.readFileSync(__dirname + '/../our-knock/index.html', 'utf8');
const used = new Set([...src.matchAll(/COPY\.([A-Za-z]+)/g), ...src.matchAll(/data-(?:c|al)="([A-Za-z]+)"/g), ...src.matchAll(/'(mode[A-Z][A-Za-z]*)'/g)].map(m => m[1]));
for (const k of used) as.ok(k in COPY, 'missing COPY key ' + k);
for (const k of ['teach', 'teachHint', 'tryAgain', 'recording']) { as.ok(!(k in COPY), 'removed key back in copy.js: ' + k); as.ok(!new RegExp('COPY\\.' + k + '\\b|data-(c|al)="' + k + '"').test(src), 'removed key referenced: ' + k); }
as.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|getUserMedia|DeviceOrientation|devicemotion|sendBeacon/.test(src));
console.log('PASS');
