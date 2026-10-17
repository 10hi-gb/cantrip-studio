// node tests/mill/urlcap.test.js — QA TSH D7 (all pieces): origin+path+fragment stays <= 2,000 characters from a 64-character origin.
// Fixed-shape pieces (Sack, the Ask itself) fit by their per-field limits at worst case (4-byte emoji in every field);
// open-ended ones (TSH, the Ask reply, OLT, BYG) are refused at runtime by the origin+path+fragment check (MILLVIEW.linkFor / URL_MAX).
// Cap: origin+path+fragment ≤ 2,000 chars. Not a literal full-URL cap. An appended ?query is ignored; pieces never generate a query, and no visitor content is ever in a query string (never parsed, shown or echoed).
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const L = require('../../mill/split-the-sack/link.js'), S = require('../../mill/split-the-sack/sack.js'), A = require('../../mill/one-small-ask/ask.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const ORIGIN = 'https://' + 'x'.repeat(64 - 8 - 31) + '.cantrip-oct13-review.pages.dev'; assert.equal(ORIGIN.length, 64);
const url = (path, f) => ORIGIN + path + '#' + f, E = (k, ch) => ch.repeat(k);
t('Split the Sack worst case (8 households, every field at its cap, emoji) <= 2,000 in total from a 64-char origin', () => {
  for (const ch of ['😀', '"', '中', 'z']) { const st = { n: E(L.ITEM_MAX, ch), u: E(L.UNIT_MAX, ch), c: E(L.SYM_MAX, ch), q: '999999999.999', i: '0.001', p: '999999999.99', f: '999999999.99', b: 'p', x: -1, h: [] };
    for (let i = 0; i < S.MAX_H; i++) st.h.push([E(L.NAME_MAX - 1, ch) + String.fromCharCode(65 + i), '0.001']);
    const f = L.encode(st); assert.ok(f); assert.ok(url('/mill/split-the-sack/', f).length <= 2000, ch + ' ' + url('/mill/split-the-sack/', f).length); } });
t('One Small Ask: the ask at worst case <= 2,000 in total from a 64-char origin', () => {
  for (const ch of ['😀', '"', '中']) { const f = A.encodeAsk({ w: E(A.CAP.w, ch), e: 600, u: 'min', d: E(A.CAP.d, ch), s: '16:00', t: '18:00', h: E(A.CAP.h, ch), f: E(A.CAP.name, ch), o: E(A.CAP.name, ch) });
    assert.ok(f); assert.ok(url('/mill/one-small-ask/', f).length <= 2000, ch); } });
t('shared MILLVIEW.linkFor caps origin+path+fragment at exactly 2,000 (Sack, Ask, TSH share through it; BYG/OLT have their own URL_MAX)', () => {
  const ctx = { location: { origin: ORIGIN, pathname: '/mill/the-same-hour/' }, window: {} }; ctx.window = ctx; ctx.MILL = require('../../mill/shared/core.js');
  vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/shared/view.js', 'utf8'), ctx); const V = ctx.MILLVIEW, pre = (ORIGIN + '/mill/the-same-hour/#').length;
  assert.equal(V.URL_MAX, 2000); assert.equal(V.linkFor('x'.repeat(2000 - pre)).length, 2000); assert.equal(V.linkFor('x'.repeat(2001 - pre)), null);
  for (const [dir, re] of [['split-the-sack', /V\.linkFor\(f\)/g], ['one-small-ask', /V\.linkFor\(frag\)/g], ['the-same-hour', /V\.linkFor\(f\)/g]]) assert.ok((fs.readFileSync(__dirname + '/../../mill/' + dir + '/app.js', 'utf8').match(re) || []).length >= 1, dir);
  assert.equal((fs.readFileSync(__dirname + '/../../mill/split-the-sack/app.js', 'utf8').match(/V\.linkFor\(f\)/g) || []).length, 2, 'Sack: both the link and the change link');
  for (const dir of ['split-the-sack', 'one-small-ask', 'the-same-hour']) assert.ok(!/location\.origin \+ location\.pathname \+ '#' \+/.test(fs.readFileSync(__dirname + '/../../mill/' + dir + '/app.js', 'utf8')), dir + ': no uncapped URL building'); });
console.log('PASS ' + n + ' tests');
