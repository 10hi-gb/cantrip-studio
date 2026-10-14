// node tests/not-on-the-screen.test.js — C205 fragment: versioned, bounded, only two distinct validated IDs; disc is stripes only
const N = require('../not-on-the-screen/app.js'), P = require('../not-on-the-screen/palette.js'), as = require('assert'), fs = require('fs');
as.deepEqual(Object.keys(P), N.IDS); for (const a of N.IDS) for (const b of N.IDS) { const f = N.encode(a, b); if (a === b) { as.equal(f, null); continue; } as.ok(f.length <= N.FRAG); as.deepEqual(N.decode('#' + f), { a, b }); }
for (const bad of ['', '#', 'n1', 'n1.c1', 'n1.c1.', 'n1.c1.c1', 'n1.c0.c2', 'n1.c1.c9', 'n1.C1.c2', 'n1.c1.c2.c3', 'n1.c1.c2x', 'x'.repeat(5000), 'n1.c1.c2' + ' ', '%6E1.c1.c2']) as.equal(N.decode(bad), null, bad);
as.deepEqual(N.decode('n2.c1.c2'), { old: true }); as.deepEqual(N.decode('n0.c5.c6'), { old: true });
as.equal(N.wedges(24).length, 24); as.ok(N.wedges(24).every((w, i) => w.k === i % 2));
const src = fs.readFileSync(__dirname + '/../not-on-the-screen/app.js', 'utf8'); as.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|getUserMedia|DeviceOrientation|devicemotion/.test(src));
console.log('PASS');
