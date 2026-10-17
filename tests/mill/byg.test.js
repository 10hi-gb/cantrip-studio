// node tests/mill/byg.test.js — Before You Go: exact missing fields + questions, confirm rules, no organization claims, link codec
const assert = require('assert'); const B = require('../../mill/before-you-go/byg.js'), M = require('../../mill/shared/core.js');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/before-you-go/copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const st = o => { const s = B.blank(); Object.assign(s, o.top || {}); for (const k in o.f || {}) Object.assign(s.f[k], o.f[k]); return s; };
t('empty pickup: all 5 core facts missing, 5 questions in fixed order, exact wording', () => {
  const s = B.blank(); assert.deepEqual(B.missing(s), ['place', 'window', 'contact', 'instructions', 'bring']);
  assert.deepEqual(B.questions(s, C).map(q => q.text), ["What's the exact address, and where do I go when I get there?", 'What day and time can I come?', 'Who do I contact, and how?', 'Anything I should know when I arrive?', 'What should I bring?']);
  assert.deepEqual(B.openEssentials(s), ['place', 'window', 'bring']); assert.equal(B.ready(s), false); });
t('given place + window typed: missing = contact, instructions, bring; said facts still asked after missing ones', () => {
  const s = st({ f: { place: { v: '1420 Pine St' }, window: { v: 'Sat 10–12' } } });
  assert.deepEqual(B.missing(s), ['contact', 'instructions', 'bring']);
  assert.deepEqual(B.questions(s, C).map(q => q.key + ':' + q.kind), ['contact:missing', 'instructions:missing', 'bring:missing', 'place:said', 'window:said']);
  assert.equal(B.status(s, 'place'), 'said'); });
t('missing bring asks what to bring and never defaults to ID', () => { const q = B.questions(B.blank(), C).find(x => x.key === 'bring'); assert.equal(q.text, 'What should I bring?'); assert.ok(!/\bID\b|paperwork|identification/i.test(q.text)); assert.equal(B.shown(B.blank(), 'bring'), ''); assert.ok(!/\bID\b/.test(B.text(B.blank(), C).split(C.questionsHeading)[0].replace(C.printFooter, ''))); });
t('confirm requires an entered answer; confirmed flag without answer stays unconfirmed', () => {
  const s = st({ f: { place: { v: '1420 Pine St', c: true } } }); assert.equal(B.status(s, 'place'), 'said');
  s.f.place.a = '  '; assert.equal(B.status(s, 'place'), 'said'); s.f.place.a = 'Side gate, ring twice'; assert.equal(B.status(s, 'place'), 'confirmed'); assert.equal(B.shown(s, 'place'), 'Side gate, ring twice'); });
t('ready only when all 3 essentials confirmed; contact/instructions do not block; optional never blocks', () => {
  const s = B.blank(); for (const k of ['place', 'window']) Object.assign(s.f[k], { v: 'x', a: 'y', c: true }); assert.equal(B.ready(s), false); assert.deepEqual(B.openEssentials(s), ['bring']);
  Object.assign(s.f.bring, { a: 'Nothing needed', c: true }); assert.equal(B.ready(s), true); assert.deepEqual(B.missing(s), ['contact', 'instructions']); });
t('phone only from typed number, label exactly as typed; names/emails give none', () => {
  assert.equal(B.phone('Text Maria, 555-0134'), '555-0134'); assert.equal(B.phone('Gate code 1234'), null); assert.equal(B.phone('Maria (415) 555-0134'), '(415) 555-0134'); assert.equal(B.telHref('(415) 555-0134'), 'tel:4155550134');
  assert.equal(B.phone('Maria'), null); assert.equal(B.phone('maria@example.org'), null); assert.equal(B.phone(''), null); assert.equal(B.phone('+44 20 7946 0958'), '+44 20 7946 0958'); });
t('no organization-specific claims: every generated question is a fixed COPY template or the visitor\'s own text; all are questions', () => {
  const templates = new Set([...Object.values(C.questions), ...Object.values(C.optionalQuestions)]);
  let seed = 3; const r = k => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed % k; };
  for (let i = 0; i < 500; i++) { const s = B.blank(); for (const k of B.ALL) { if (r(2)) s.f[k].v = 'typed ' + k; if (r(3) === 0) { s.f[k].a = 'ans'; s.f[k].c = true; } } if (r(2)) s.o = ['Can I park in front?'];
    for (const q of [...B.questions(s, C), ...B.optionalQuestions(s, C)]) { assert.ok(q.text.endsWith('?')); assert.ok(templates.has(q.text) || s.o.includes(q.text), q.text); } }
  // copy itself carries no hours, eligibility, availability or ID requirement statements
  const all = JSON.stringify(C); assert.ok(!/\b(open (from|at|until)|hours are|you (must|need to) (bring|show)|required|eligible|eligibility|in stock|available (on|at))\b/i.test(all)); });
t('text export: unknowns and said survive, contact-missing line, footer; no invented values', () => {
  const s = st({ top: { k: 'Used bike' }, f: { place: { v: '1420 Pine St' }, bring: { v: 'Cash', a: 'Cash, exact', c: true } } }); const x = B.text(s, C);
  assert.ok(x.startsWith('Pickup: Used bike')); assert.ok(x.includes('[ ] Place: 1420 Pine St (You said)')); assert.ok(x.includes('[ ] When: — (Unknown)')); assert.ok(x.includes('[x] Bring: Cash, exact (Confirmed)'));
  assert.ok(x.includes('Not set: 2 essentials still open')); assert.ok(x.includes(C.contactMissing)); assert.ok(x.endsWith(C.printFooter)); });
t('link round-trip; confirmed-without-answer and unknown fields refused; caps; malformed', () => {
  const s = st({ top: { k: 'Bike', by: 'Jo', o: ['Can I park in front?'] }, f: { place: { v: '1420 Pine St', a: 'Side gate', c: true }, contact: { v: 'Maria 555-0134' } } });
  const f = B.encode(s); assert.ok(f.startsWith('b1.')); const d = B.decode('#' + f); assert.ok(d.ok); assert.deepEqual(d.data, s);
  assert.equal(B.decode(M.pack('b', 1, { k: '', y: '', f: { place: ['x', '', 1] }, o: [] })).why, 'bad');
  assert.equal(B.decode(M.pack('b', 1, { k: '', y: '', f: { hours: ['9-5', '', 0] }, o: [] })).why, 'bad');
  assert.equal(B.decode(M.pack('b', 1, { k: 'x'.repeat(61), y: '', f: {}, o: [] })).why, 'bad'); assert.equal(B.decode(M.pack('b', 2, {})).why, 'oldVersion');
  assert.equal(B.decode(f.slice(0, 40)).ok, false); assert.equal(B.decode('b1.' + 'A'.repeat(2100) + '.aaaaaa').why, 'tooLong'); assert.equal(B.decode('#<svg onload=1>').why, 'bad');
  assert.equal(B.encode(st({ top: { k: 'x'.repeat(61) } })), null);
  const big = B.blank(); for (const k of B.ALL) { big.f[k].v = '😀'.repeat(120); big.f[k].a = '😀'.repeat(120); } assert.strictEqual(B.encode(big), '');
  const lat = B.blank(); lat.k = 'x'.repeat(60); for (const k of B.CORE) lat.f[k].v = 'x'.repeat(120); const lf = B.encode(lat); assert.ok(lf && lf.length <= 2000, lf && lf.length); console.log('   5 full Latin facts link length', lf.length); });
console.log('PASS ' + n + ' tests');
