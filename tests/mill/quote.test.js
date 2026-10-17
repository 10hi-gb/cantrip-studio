// node tests/mill/quote.test.js — PM Q1 anti-spoof: typed “ ” „ ‟ « » are shown as " inside the typed-text frame
// (MILL.quote, MILL.fill quoted slots, copy-as-text builders); links/stored values keep the original characters.
const assert = require('assert'); const M = require('../../mill/shared/core.js'), vm = require('vm'), fs = require('fs');
const B = require('../../mill/before-you-go/byg.js'), O = require('../../mill/one-less-trip/olt.js'), T = require('../../mill/the-same-hour/tsh.js'), L = require('../../mill/split-the-sack/link.js'), A = require('../../mill/one-small-ask/ask.js');
const copy = slug => vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/' + slug + '/copy.js', 'utf8') + ';COPY');
function mk(hh, rows) { const s = { h: hh.map((x, i) => ({ id: i + 1, name: x })), r: [], m: [], next: 0 }; let id = 100; for (const [o, i, q, u, st] of rows) s.r.push({ id: id++, o, i, q: O.parseQty(q).v, u, s: st }); s.next = id; return s; }
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const SP = 'Milk\u201D from \u201CYour bank', SHOWN = '\u201CMilk" from "Your bank\u201D', G = '\u00ABBank\u00BB \u201Ex\u201F';
const MARKS = /[\u201C\u201D\u201E\u201F\u00AB\u00BB]/;
const noSpoof = (txt, seed, shown) => { assert.ok(!txt.includes(seed), 'raw marks shown: ' + txt); assert.ok(txt.includes(shown), 'display form missing: ' + shown + ' in ' + txt); };
t('MILL.quote: QA screenshot case renders as ONE quoted item; every mark (“ ” „ ‟ « ») neutralised; plain text unchanged', () => {
  assert.equal(M.quote(SP), SHOWN); assert.equal(M.quote(G), '\u201C"Bank" "x"\u201D'); assert.equal(M.quote('Ana'), '\u201CAna\u201D'); assert.equal(M.quote("Bao & Linh's"), '\u201CBao & Linh\'s\u201D');
  assert.ok(!MARKS.test(M.quote(SP).slice(1, -1))); });
t('MILL.fill: values in a quoted slot (“{x}” or "{x}") are neutralised; unquoted slots untouched; raw() opts out', () => {
  assert.equal(M.fill('As typed: \u201C{item}\u201D ({unit})', { item: SP, unit: 'x\u201D' }), 'As typed: ' + SHOWN + ' (x\u201D)');
  assert.equal(M.fill('"{a}"', { a: G }), '""Bank" "x""'); assert.equal(M.fill('\u201C{o}\u201D', { o: M.raw('A\u201D, \u201CB') }), '\u201CA\u201D, \u201CB\u201D');
  assert.equal(M.plural({ one: '\u201C{name}\u201D {n}', other: '\u201C{name}\u201D {n}' }, 2, { name: SP }), SHOWN + ' 2'); });
t('links keep the original characters (display only): every codec round-trips the marks byte-exact', () => {
  const b = B.blank(); b.k = SP; b.by = 'Jo\u201D x'; b.f.place.v = G; b.o = [SP]; const db = B.decode('#' + B.encode(b)); assert.ok(db.ok, JSON.stringify(db)); const bj = JSON.stringify(db.st || db.data); assert.ok(bj.includes(SP) && bj.includes(G));
  const tf = T.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: SP, p: [{ id: 1, n: G, iv: [{ id: 2, d: 0, s: '18:00', e: '20:00' }] }, { id: 3, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 });
  const tj = JSON.stringify(T.decode('#' + tf)); assert.ok(tj.includes(SP) && tj.includes(G), tj.slice(0, 300));
  const sk = { n: SP, u: 'lb', c: '$', q: '25', i: '0.5', p: '31.47', f: '2.00', b: 'p', x: -1, h: [[G, '8'], ['Ben', '8.5']] }; assert.deepEqual(L.decode('#' + L.encode(sk)).data, sk);
  const ak = { w: SP, e: 20, u: 'min', d: 'Tue Oct 20', s: '16:00', t: '18:00', h: '', f: G, o: 'Sam' }; assert.deepEqual(A.decode('#' + A.encodeAsk(ak)).data, ak);
  const os = mk([G, 'Ben'], [[1, SP, '2', 'carton', 'Shop'], [2, 'Tea', '1', '', 'Shop']]);
  const oj = JSON.stringify(O.decode('#' + O.encode(os))); assert.ok(oj.includes(SP) && oj.includes(G), oj.slice(0, 300)); });
t('copy-as-text builders show the display form, never the raw marks (BYG, OLT, Ask)', () => {
  const b = B.blank(); b.k = SP; b.f.place.v = G; b.o = [SP]; const bt = B.text(b, copy('before-you-go')); noSpoof(bt, SP, SHOWN); noSpoof(bt, G, '\u201C"Bank" "x"\u201D');
  const os = mk(['Ana', 'Ben'], [[1, SP, '2', 'carton', 'Shop'], [2, 'Tea', '1', '', 'Shop']]);
  noSpoof(O.text(os, copy('one-less-trip')), SP, SHOWN);
  const ak = { w: SP, e: 20, u: 'min', d: 'Tue Oct 20', s: '16:00', t: '18:00', h: '', f: 'Ana', o: 'Sam' }; noSpoof(A.textAsk(copy('one-small-ask'), ak), SP, SHOWN); });
console.log('PASS ' + n + ' tests');
