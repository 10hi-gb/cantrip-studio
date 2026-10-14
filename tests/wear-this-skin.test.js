// node tests/wear-this-skin.test.js — C087 QA d797f8cd: a bad skin tone (k8) falls back to the default
// without flagging an empty slot (the "unknownItem" line is only for slots that really came through empty).
const W = require('../wear-this/app.js'), as = require('assert');
const qa = W.decode('#dzEfaDFjMS50MWM0LmIyYzEuczVjMy5rOA.a44401');
as.ok(qa, 'QA link decodes'); as.equal(qa.unknown, false); as.equal(qa.skinFallback, true); as.equal(qa.o.k, 3);
for (const s of W.SLOTS) as.ok(qa.o[s], s + ' not empty');
const ok = W.decode('#' + W.encode({ head: { s: 2, c: 3 }, top: { s: 2, c: 2 }, bottom: { s: 2, c: 4 }, shoes: { s: 2, c: 5 }, k: 5 }));
as.equal(ok.unknown, false); as.equal(ok.skinFallback, false); as.equal(ok.o.k, 5);
// a genuinely unknown piece still flags unknown
const bad = W.decode('#' + W.encode({ head: { s: 7, c: 3 }, top: { s: 2, c: 2 }, bottom: { s: 2, c: 4 }, shoes: { s: 2, c: 5 }, k: 5 }));
as.equal(bad.unknown, true); as.equal(bad.o.head, null); as.equal(bad.skinFallback, false);
console.log('wear-this-skin ok');
