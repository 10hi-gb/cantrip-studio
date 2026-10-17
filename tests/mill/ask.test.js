// node tests/mill/ask.test.js — One Small Ask: parser, round-trip, caps, malformed links, counteroffer diff
const assert = require('assert'); const A = require('../../mill/one-small-ask/ask.js'), M = require('../../mill/shared/core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const ask = { w: 'Pick up my parcel and drop it at Mom\'s', e: 20, u: 'min', d: 'Tue Oct 20', s: '16:00', t: '18:00', h: '', f: 'Dana', o: 'Sam' };
const offer = { w: 'Collection only', e: 20, u: 'min', d: 'Wed Oct 21', s: '17:00', t: '18:00', h: '' };
t('ask round-trip byte-exact', () => { const f = A.encodeAsk(ask); assert.ok(f.startsWith('a1.')); const d = A.decode('#' + f); assert.equal(d.kind, 'ask'); assert.deepEqual(d.data, ask); });
t('Joshua example: 20 min pickup Tue 4–6 -> collection-only Wed 5–6 shows changed action + window, effort same', () => {
  const r = { a: ask, v: 'p', p: offer, n: '' }, f = A.encodeReply(r); assert.ok(f.startsWith('r1.')); const d = A.decode(f); assert.equal(d.kind, 'reply'); assert.deepEqual(d.data, r);
  assert.deepEqual(A.diff(d.data.a, d.data.p), { action: true, effort: false, window: true, where: false }); assert.equal(A.fmtTime('16:00') + '–' + A.fmtTime('18:00'), '4 PM–6 PM'); });
t('yes and no replies round-trip; no carries no reason', () => { for (const v of ['y', 'n']) { const r = { a: ask, v, p: null, n: '' }; assert.deepEqual(A.decode(A.encodeReply(r)).data, r); } assert.equal(A.encodeReply({ a: ask, v: 'n', p: null, n: 'because' }), null); assert.ok(A.encodeReply({ a: ask, v: 'y', p: null, n: 'Happy to.' })); });
t('part with nothing changed is refused (encode and forged decode)', () => { const same = { w: ask.w, e: 20, u: 'min', d: ask.d, s: ask.s, t: ask.t, h: '' }; assert.equal(A.replyError({ a: ask, v: 'p', p: same, n: '' }), 'partNothingChanged'); assert.equal(A.decode(M.pack('r', 1, { a: ask, v: 'p', p: same, n: '' })).ok, false); });
t('ask validation: empty favor, too long, effort bounds, window missing/order, names', () => {
  const e = o => A.askError({ ...ask, ...o });
  assert.equal(e({ w: '  ' }), 'actionEmpty'); assert.equal(e({ w: 'x'.repeat(141) }), 'actionTooLong'); assert.equal(e({ w: '😀'.repeat(140) }), null);
  for (const v of [0, -5, 1.5, NaN, Infinity, 601, '20']) assert.equal(e({ e: v }), 'effortInvalid', String(v)); assert.equal(e({ e: 25, u: 'hr' }), 'effortInvalid'); assert.equal(e({ u: 'day' }), 'effortInvalid');
  assert.equal(e({ d: '' }), 'windowMissing'); assert.equal(e({ s: '4pm' }), 'windowMissing'); assert.equal(e({ s: '24:00' }), 'windowMissing'); assert.equal(e({ s: '18:00', t: '16:00' }), 'windowOrder'); assert.equal(e({ s: '16:00', t: '16:00' }), 'windowOrder');
  assert.equal(e({ f: 'x'.repeat(25) }), 'nameTooLong'); assert.equal(e({ h: 'x'.repeat(81) }), 'whereTooLong'); assert.equal(e({ h: 'Main St post office' }), null); });
t('where: optional, round-trips, change counts as a change', () => { const a = { ...ask, h: 'Main St post office' }; assert.deepEqual(A.decode(A.encodeAsk(a)).data, a); const p = { ...A.cleanTerms(a), h: 'Side door' }; assert.deepEqual(A.diff(a, p), { action: false, effort: false, window: false, where: true }); assert.ok(A.encodeReply({ a, v: 'p', p, n: '' })); });
t('caps: max Latin reply fits 2000; max-emoji reply is refused as too long (empty string), never truncated', () => { const X = k => 'x'.repeat(k), E = k => '😀'.repeat(k);
  const f = A.encodeReply({ a: { ...ask, w: X(120), d: X(40), h: X(80), f: X(24), o: X(24) }, v: 'p', p: { ...offer, w: X(119) + 'y', d: X(40), h: X(80) }, n: X(120) }); assert.ok(f && f.length <= 2000, f && f.length); console.log('   max Latin reply length', f.length);
  const g = A.encodeAsk({ ...ask, w: E(120), d: E(40), f: E(24), o: E(24) }); assert.ok(g && g.length <= 2000, 'max emoji ask fits: ' + (g && g.length)); console.log('   max emoji ask length', g.length);
  assert.strictEqual(A.encodeReply({ a: { ...ask, w: E(120), d: E(40), f: E(24), o: E(24) }, v: 'p', p: { ...offer, w: E(119) + 'x', d: E(40) }, n: E(120) }), ''); });
t('malformed: empty, truncated, bad checksum, oversize, old version, wrong shape, extra keys, bad JSON, unknown tag', () => {
  const f = A.encodeReply({ a: ask, v: 'p', p: offer, n: '' });
  assert.equal(A.decode('').why, 'empty'); assert.equal(A.decode(f.slice(0, 60)).ok, false); assert.equal(A.decode(f.slice(0, -1) + (f.endsWith('a') ? 'b' : 'a')).why, 'bad');
  assert.equal(A.decode('r1.' + 'A'.repeat(2100) + '.aaaaaa').why, 'tooLong'); assert.equal(A.decode(M.pack('a', 2, ask)).why, 'oldVersion'); assert.equal(A.decode(M.pack('r', 0, {})).why, 'oldVersion');
  assert.equal(A.decode(M.pack('a', 1, { ...ask, x: 1 })).why, 'bad'); assert.equal(A.decode(M.pack('a', 1, [1])).why, 'bad'); assert.equal(A.decode(M.pack('r', 1, { a: ask, v: 'maybe', p: null, n: '' })).why, 'bad');
  assert.equal(A.decode(M.pack('r', 1, { a: ask, v: 'y', p: offer, n: '' })).why, 'bad'); const h = 'a1.' + M.b64e('{x'); assert.equal(A.decode(h + '.' + M.ck(h)).why, 'bad');
  assert.equal(A.decode(M.pack('s', 1, ask)).ok, false); assert.equal(A.decode('#<script>alert(1)</script>').why, 'bad'); });
t('control and bidi characters are stripped, text otherwise exact', () => { const d = A.decode(A.encodeAsk({ ...ask, w: 'Water\u202E the\u0000 plants  please' })); assert.equal(d.data.w, 'Water the plants please'); });
t('property: 2000 random asks/replies round-trip exactly', () => { let s = 7; const r = k => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s % k; }; const ch = 'abcXYZ 😀éß<>&"\'', str = k => Array.from({ length: k }, () => [...ch][r([...ch].length)]).join('').trim() || 'a';
  for (let i = 0; i < 2000; i++) { const hh = 1 + r(20); const a = { w: str(1 + r(60)), e: 1 + r(600), u: 'min', d: str(1 + r(20)), s: String(hh).padStart(2, '0') + ':00', t: String(hh + 1 + r(23 - hh)).padStart(2, '0') + ':30', h: r(2) ? str(r(30)) : '', f: r(2) ? str(r(10)) : '', o: str(r(10)) };
    const ca = A.decode(A.encodeAsk(a)).data; const v = ['y', 'p', 'n'][r(3)]; const p = v === 'p' ? { ...A.cleanTerms(ca), w: ca.w + '!' } : null; const rep = { a: ca, v, p, n: v === 'n' ? '' : str(r(30)) };
    const d = A.decode(A.encodeReply(rep)); assert.ok(d.ok, JSON.stringify(rep)); assert.deepEqual(d.data.a, ca); assert.equal(d.data.v, v); } });
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/one-small-ask/copy.js', 'utf8') + ';COPY');
t('plain-text exports read complete (Writer templates, verbatim values)', () => {
  assert.equal(A.textAsk(C, ask), "From Dana\nSmall favor: Pick up my parcel and drop it at Mom's\nTime: 20 minutes max\nWhen: Tue Oct 20, 4 PM–6 PM\nYou can say yes, take part of it, or say not this time.");
  assert.equal(A.textReply(C, { a: ask, v: 'p', p: offer, n: '' }), "Re: Pick up my parcel and drop it at Mom's\nI can do part of it.\nFavor: Collection only (asked: Pick up my parcel and drop it at Mom's)\nWhen: Wed Oct 21, 5 PM–6 PM (asked: Tue Oct 20, 4 PM–6 PM)\nTime it takes: 20 minutes max (same)\n");
  assert.equal(A.textReply(C, { a: ask, v: 'n', p: null, n: '' }), "Re: Pick up my parcel and drop it at Mom's\nNot this time.");
  assert.equal(A.textReply(C, { a: { ...ask, h: 'Main St' }, v: 'y', p: null, n: 'Happy to.' }), "Re: Pick up my parcel and drop it at Mom's\nYes, as asked: 20 minutes max, Tue Oct 20, 4 PM–6 PM. Where: Main St.\nNote: Happy to.");
  for (const x of [A.textAsk(C, ask), A.textReply(C, { a: ask, v: 'p', p: offer, n: '' })]) assert.ok(!/\b(sent|delivered|accepted|confirmed|agreed|notified)\b/i.test(x)); });
t('favor cap is 140 (counted after cleaning); 141 refused', () => { const base = { ...ask, w: 'x'.repeat(140) }; assert.ok(A.encodeAsk(base)); assert.equal(A.termsError({ ...base, w: 'x'.repeat(141) }), 'actionTooLong'); assert.equal(A.encodeAsk({ ...base, w: 'x'.repeat(141) }), null); });
t('favor keeps up to 3 line breaks; more collapse to spaces; blank lines dropped; text export matches', () => {
  assert.equal(A.stripW('a\nb\r\nc\n\n\nd'), 'a\nb\nc\nd'); assert.equal(A.stripW('1\n2\n3\n4\n5\n6'), '1\n2\n3\n4 5 6'); assert.equal(A.stripW('  a  b \n\t c '), 'a b\nc');
  const a = { ...ask, w: 'Pick up\nthe parcel\nfrom\nthe post office\nplease' }; const d = A.decode(A.encodeAsk(a)); assert.equal(d.data.w, 'Pick up\nthe parcel\nfrom\nthe post office please'); assert.ok(A.textAsk(C, d.data).includes('Small favor: Pick up\nthe parcel\nfrom\nthe post office please\n')); });
t('"Not this time" carries no note: a reply link with v=n and a note is refused', () => { assert.equal(A.encodeReply({ a: ask, v: 'n', p: null, n: 'sorry' }), null); assert.ok(A.encodeReply({ a: ask, v: 'n', p: null, n: '' })); });
console.log('PASS ' + n + ' tests');
