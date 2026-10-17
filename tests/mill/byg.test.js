// node tests/mill/byg.test.js — Before You Go model (QA 83a2ebcd + PM 10:33): 5 essentials, states, per-fact attribution,
// date-specific When, strict phone detection, limits that keep the worst-case full URL <= 2000, Writer text templates verbatim.
const assert = require('assert'); const B = require('../../mill/before-you-go/byg.js'), M = require('../../mill/shared/core.js');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/before-you-go/copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const st = o => { const s = B.blank(); Object.assign(s, o.top || {}); for (const k in o.f || {}) Object.assign(s.f[k], o.f[k]); return s; };
const CONF = { a: 'x', c: true };
t('essentials are all 5; ready only when all 5 confirmed; Not sure and typed notes never count', () => {
  assert.deepEqual(B.ESSENTIAL, ['place', 'window', 'contact', 'instructions', 'bring']);
  const s = B.blank(); for (const k of ['place', 'window', 'bring']) Object.assign(s.f[k], k === 'window' ? { a: '2026-10-24', c: true } : CONF);
  assert.equal(B.ready(s), false); assert.deepEqual(B.openEssentials(s), ['contact', 'instructions']);
  Object.assign(s.f.contact, CONF); Object.assign(s.f.instructions, { v: 'ring', ns: true }); assert.equal(B.status(s, 'instructions'), 'notsure'); assert.equal(B.ready(s), false);
  Object.assign(s.f.instructions, CONF, { ns: false }); assert.equal(B.ready(s), true);
  assert.ok(B.text(s, C).includes('\nEverything essential is confirmed.\n'));
  s.f.contact.c = false; assert.ok(!B.text(s, C).includes('Everything essential is confirmed')); });
t('states: unknown / said / notsure / confirmed; confirm needs an answer', () => {
  const s = B.blank(); assert.equal(B.status(s, 'place'), 'unknown'); s.f.place.v = 'Pine St'; assert.equal(B.status(s, 'place'), 'said');
  s.f.place.c = true; assert.equal(B.status(s, 'place'), 'said'); s.f.place.a = 'Side gate'; assert.equal(B.status(s, 'place'), 'confirmed');
  s.f.bring.ns = true; assert.equal(B.status(s, 'bring'), 'notsure'); assert.equal(B.status(s, 'id'), 'optional'); });
t('When is a specific date with an optional time; weekday-only or time-only refused; questionWindowDay once a date is typed', () => {
  for (const v of ['2026-10-24', '2026-10-24 14:30', '']) assert.ok(B.validWhen(v), v);
  for (const v of ['Sat', '14:30', '2026-02-30', '2026-10-24 25:00', 'Sat 10-12', '2026-10-24 2pm']) assert.ok(!B.validWhen(v), v);
  const s = st({ f: { window: { v: '2026-10-24' } } }); assert.equal(B.questions(s, C).find(q => q.key === 'window').text, 'What time can I come on Sat Oct 24 2026?');
  s.f.window.v = '2026-10-24 14:30'; assert.equal(B.questions(s, C).find(q => q.key === 'window').text, C.questions.window); assert.equal(B.display(s, 'window'), 'Sat Oct 24 2026, 2:30 PM');
  assert.equal(B.encode(st({ f: { window: { v: 'Sat 10-12' } } })), null);
  assert.equal(B.datePassed(s, '2026-10-25'), true); assert.equal(B.datePassed(s, '2026-10-24'), false); });
t('D8 + QA N4 phone: Call/Text only when the field is basically just a number (7-15 digits, + ( ) - . and spaces, no letters)', () => {
  const ok = { '555-0134': '555-0134', '412-555-0100': '412-555-0100', '(415) 555-0134': '(415) 555-0134', '+44 20 7946 0958': '+44 20 7946 0958', '412.555.0187': '412.555.0187', '  555 0134 ': '555 0134' };
  for (const k in ok) assert.equal(B.phone(k), ok[k], k);
  for (const k of ['Room 101-2020', 'Gate code 555-1234', 'Text Maria, 555-0134', 'Call 412-555-0100 to verify', 'Listing #123456789 on Marketplace', 'Sat 2026-10-24', '2026-10-24', '5550134 or 5550199', 'Gate code 1234', 'maria@example.org', 'Order #412-555-0100', 'Maria', '', '123456', '1234567890123456', '555+0134']) assert.equal(B.phone(k), null, k);
  assert.equal(B.telHref('(415) 555-0134'), 'tel:4155550134'); assert.equal(B.smsHref('+44 20 7946 0958'), 'sms:+442079460958'); });
t('attribution: decoded facts belong to the sender; a recipient confirm changes only that fact; re-encode keeps origins', () => {
  const s = st({ top: { k: 'Bike', by: 'Jo' }, f: { place: { v: 'Pine', a: 'Side gate', c: true }, contact: { v: 'Sam 412-555-0187' }, bring: { v: 'cash', ns: true } } });
  const d = B.decode(B.encode(s)).data; assert.equal(d.f.place.cby, 'sender'); assert.equal(d.f.contact.vby, 'sender'); assert.equal(d.f.bring.nsby, 'sender');
  assert.equal(B.owner(d, 'place'), 'sender'); assert.equal(B.owner(d, 'contact'), 'sender'); assert.equal(B.mark(d, 'contact', C), C.printSaidMarkerSender); assert.equal(B.mark(d, 'place', C), C.printConfirmedBySender);
  Object.assign(d.f.window, { a: '2026-10-24', c: true, cby: 'you' }); assert.equal(B.owner(d, 'place'), 'sender'); assert.equal(B.owner(d, 'window'), 'you'); assert.equal(B.mark(d, 'window', C), C.printConfirmedMarker);
  const d2 = B.decode(B.encode(d)).data; assert.equal(d2.f.place.cby, 'earlier'); assert.equal(d2.f.window.cby, 'sender'); assert.equal(d2.f.contact.vby, 'earlier'); });
t('limits: caps listed; overCaps names fields; encode refuses over-limit (never silent truncation)', () => {
  assert.deepEqual([B.CAP.pickup, B.CAP.by, B.CAP.place, B.CAP.contact, B.CAP.id, B.CAP.own, B.CAP.ownMax], [60, 24, 120, 120, 80, 60, 5]);
  const s = st({ top: { k: 'x'.repeat(61), by: 'y'.repeat(25) }, f: { place: { v: 'z'.repeat(121) } } });
  assert.deepEqual(B.overCaps(s).map(o => o.key + ':' + o.over), ['pickup:1', 'by:1', 'place:1']); assert.equal(B.encode(s), null);
  assert.equal(B.room('😀'), 4); assert.equal(B.room('é'), 2); assert.equal(B.room('中'), 3); assert.equal(B.room('"'), 2); assert.equal(B.room('a'), 1); });
t('max-everything link: worst-case full URL (longest origin + path) is <= 2000 for ASCII, quotes, accents, CJK and emoji', () => {
  const origin = 'https://' + 'a'.repeat(B.ORIGIN_BUDGET - 8), path = '/mill/before-you-go/#';
  for (const [nm, ch] of [['ascii', 'z'], ['quote', '"'], ['accent', 'é'], ['cjk', '中'], ['emoji', '😀']]) {
    for (const conf of [false, true]) {
      const fill = cap => ch.repeat(Math.floor(cap / B.room(ch))); const s = B.blank(); s.k = fill(B.CAP.pickup); s.by = fill(B.CAP.by); s.o = Array.from({ length: 5 }, () => fill(B.CAP.own));
      for (const k of B.ALL) { if (k === 'window') { Object.assign(s.f.window, conf ? { a: '2026-10-24 14:30', c: true, cby: 'sender' } : { v: '2026-10-24 14:30', vby: 'sender' }); continue; } Object.assign(s.f[k], conf ? { a: fill(B.CAP[k]), c: true, cby: 'sender' } : { v: fill(B.CAP[k]), vby: 'sender' }); }
      const f = B.encode(s); assert.ok(f, nm); const url = origin + path + f; assert.ok(url.length <= 2000, nm + ' ' + url.length); assert.ok(B.decode(f).ok, nm);
      if (nm === 'emoji' && conf) console.log('   worst-case full URL length', url.length, '(origin budget', B.ORIGIN_BUDGET + ')'); } } });
t('decode refuses malformed, old version, unknown slot shapes, bad When, over caps', () => {
  const ok = B.encode(st({ top: { k: 'Bike' }, f: { place: { v: 'Pine' } } })); assert.ok(B.decode(ok).ok);
  const F = () => Array(9).fill(0);
  const bad = [[], ['', '', F(), [], 1], ['', '', [1], []], ['', '', Object.assign(F(), { 0: ['', 1, 0] }), []], ['', '', Object.assign(F(), { 1: ['Sat', 1, 0] }), []], ['', '', Object.assign(F(), { 0: ['x', 4, 0] }), []], ['x'.repeat(61), '', F(), []], ['', '', F(), ['']]];
  for (const d of bad) assert.equal(B.decode(M.pack('b', 2, d)).ok, false, JSON.stringify(d).slice(0, 60));
  assert.equal(B.decode(M.pack('b', 1, { k: '', y: '', f: {}, o: [] })).why, 'oldVersion'); assert.equal(B.decode('#<svg onload=1>').why, 'bad'); assert.equal(B.decode(ok.slice(0, 30)).ok, false);
  assert.ok(B.decode(M.pack('b', 2, ['', '', Object.assign(F(), { 4: ['', 3, 0] }), []])).ok, 'not sure without a value is allowed'); });
t('questions: only fixed templates or the visitor\'s own text; bring never mentions ID', () => {
  const templates = new Set([...Object.values(C.questions), ...Object.values(C.optionalQuestions)]); let seed = 3; const r = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % k; };
  for (let i = 0; i < 400; i++) { const s = B.blank(); for (const k of B.ALL) { if (k === 'window') continue; if (r(2)) s.f[k].v = 'typed ' + k; if (r(3) === 0) Object.assign(s.f[k], CONF); if (r(4) === 0) s.f[k].ns = true; } if (r(2)) s.o = ['Can I park in front?'];
    for (const q of [...B.questions(s, C), ...B.optionalQuestions(s, C)]) { assert.ok(q.text.endsWith('?')); assert.ok(templates.has(q.text) || s.o.includes(q.text), q.text); } }
  assert.ok(!/\bID\b/.test(C.questions.bring)); });
t('text export uses Writer templates verbatim: quoted typed text, per-fact status, questions, footer', () => {
  const s = st({ top: { k: 'Used bike', by: 'Jo', o: ['Is the lock included?'] }, f: { place: { v: 'Corner of 5th', a: 'Side gate', c: true }, window: { v: '2026-10-24' }, contact: { v: 'Sam 412-555-0187', vby: 'sender' }, instructions: { ns: true }, bring: { a: 'Cash, $80', c: true, cby: 'sender' } } });
  const x = B.text(s, C).split('\n');
  assert.deepEqual(x, ['Pickup notes for “Used bike”', 'Notes by: “Jo”', '', 'Not set: 3 essentials still open. Still open: When, Contact, Instructions.', '',
    'Place: “Corner of 5th” · Confirmed', 'Answer: “Side gate”', 'When: “Sat Oct 24 2026” · Your note, not confirmed', 'Contact: “Sam 412-555-0187” · Sender\'s note, not confirmed', 'Instructions: Not sure', 'Bring: “Cash, $80” · Confirmed by the sender',
    '', 'Ask before you go:', '• What time can I come on Sat Oct 24 2026?', '• Who do I contact, and how?', '• Anything I should know when I arrive?', '• “Is the lock included?”', '', C.textFooter]);
  const pr = B.text(s, C, true); assert.ok(pr.startsWith('Pickup: “Used bike”\n')); assert.ok(pr.endsWith('\n' + C.printFooter));
  assert.ok(B.text(B.blank(), C).startsWith('Before You Go\n')); assert.ok(B.text(B.blank(), C).includes('Place: Unknown')); });
console.log('PASS ' + n + ' tests');
