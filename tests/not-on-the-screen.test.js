// node tests/not-on-the-screen.test.js — C205 fragment: versioned, bounded, only two distinct validated IDs; disc is stripes only
const N = require('../not-on-the-screen/app.js'), P = require('../not-on-the-screen/palette.js'), as = require('assert'), fs = require('fs');
as.deepEqual(Object.keys(P), N.IDS); for (const a of N.IDS) for (const b of N.IDS) { const f = N.encode(a, b); if (a === b) { as.equal(f, null); continue; } as.ok(f.length <= N.FRAG); as.deepEqual(N.decode('#' + f), { a, b }); }
for (const bad of ['', '#', 'v1', 'v1.c1', 'v1.c1.', 'v1.c1.c1', 'v1.c0.c2', 'v1.c1.c9', 'v1.C1.c2', 'v1.c1.c2.c3', 'v1.c1.c2x', 'x'.repeat(5000), 'v1.c1.c2' + ' ', '%6E1.c1.c2']) as.equal(N.decode(bad), null, bad);
as.deepEqual(N.decode('v2.c1.c2'), { old: true }); as.deepEqual(N.decode('v0.c5.c6'), { old: true }); as.equal(N.decode('v1.c1.c4'.padEnd(17, 'x')), null); as.equal(N.FRAG, 16); as.equal(N.WEDGES, 36);
as.equal(N.wedges(36).length, 36); as.ok(N.wedges(36).every((w, i) => w.k === i % 2));
as.ok(/^M0 0L0.000 -100.000A100 100 0 0 1 17.365 -98.481Z$/.test(N.wedges(36)[0].d), N.wedges(36)[0].d);
const src = fs.readFileSync(__dirname + '/../not-on-the-screen/app.js', 'utf8'); as.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|getUserMedia|DeviceOrientation|devicemotion/.test(src));
console.log('PASS');
