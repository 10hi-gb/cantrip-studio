// node tests/cheers-cap.test.js — C088 encoded-link cap
const C = require('../cheers/app.js'), as = require('assert');
for (const n of [40, 44, 45, 46, 47, 48]) {
  const t = '😀'.repeat(n), over = C.overBy(t), ok = '😀'.repeat(n - over);
  const L = C.encode(ok).length;
  console.log(`${n} emoji: raw link ${C.encode(t).length}, overBy ${over}, accepted ${n - over} → ${L} chars, decodes=${!!C.decode('#' + C.encode(ok))}`);
  as.ok(L <= C.FRAG_MAX); as.ok(C.decode('#' + C.encode(ok)));
  if (over > 0) as.ok(C.encode('😀'.repeat(n - over + 1)).length > C.FRAG_MAX);
  if (C.encode(t).length <= C.FRAG_MAX) as.equal(over, 0);
}
as.equal(C.overBy('x'.repeat(48)), 0); as.equal(C.overBy('x'.repeat(52)), 4); as.ok(C.decode('#' + C.encode('x'.repeat(48))));
console.log('PASS');
