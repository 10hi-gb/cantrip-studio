// node tests/mill/cr.test.js — Care Rota r1c core: every assert of proto care_rota_check.py r1d __main__, plus the build rules
// (two needs / "and" between names -> to fix, never placed), caps, Nov 1 2026 DST, per-helper notes, stamp on all 4 outputs, link.
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const CR = require('../../mill/care-rota/cr.js'), M = require('../../mill/shared/core.js');
const C = vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/care-rota/copy.js', 'utf8') + ';COPY');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const T = s => CR.parseISO(s);
const NEEDS = [{ key: 'dinner', label: 'Dinner', rule: 'except', days: [5], note: "No nuts (Sam's allergy). Drop off 5:30–6:30." }, { key: 'ride', label: 'Ride', rule: 'these', days: ['2026-10-21'], note: 'Pediatrician 10:15. Leave by 9:50.' }, { key: 'walk', label: 'Dog walk', rule: 'weekdays', days: [], note: 'Midday, about 30 min. Use the harness.' }];
const CFG = { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: NEEDS, noteAll: '' };
const PLAN = 'Mon 19 dinner Ana|Mon 19 walk Ben|Tue 20 dinner Carla|Tue 20 dinner Dev|Tue 20 walk Ben|Wed 21 ride Ana|Thu 21 dinner Ellie|Thu 22 walk Ben|Fri 23 dinner Ana|Fri 23 walk Ana|Sat 24 dinner Carla|Sun 25 dinner Dev|Wed walk Fatima'.split('|');
const FIXED = PLAN.filter(l => !['Thu 21 dinner Ellie', 'Tue 20 dinner Dev', 'Sat 24 dinner Carla'].includes(l)).concat(['Thu 22 dinner Ellie', 'Wed 21 dinner Dev']);
const got = r => Object.fromEntries(Object.entries(r.got).map(([k, v]) => [CR.iso(+k.split('|')[0]) + ' ' + k.split('|')[1], v]));
const C2 = Object.assign({}, CFG, { first: '2026-10-26', last: '2026-11-08' }); // crosses DST Sun Nov 1 2026
const one = line => CR.check(C2, [line]);
t('proto first check (exact report): 12 needed · 10 covered · 2 gaps · 1 double · 1 to fix · 1 not needed', () => {
  const r = CR.check(CFG, PLAN); assert.equal(CR.summary(r), '12 needed · 10 covered · 2 gaps · 1 double · 1 to fix · 1 not needed · 0 duplicate lines');
  assert.deepEqual(r.gaps.map(k => CR.d2(k[0]) + ' ' + k[1]), ['Wed Oct 21 Dinner', 'Thu Oct 22 Dinner']); assert.deepEqual(r.dbl.map(x => CR.d2(x.t) + ' ' + x.need + ': ' + x.names.join(', ')), ['Tue Oct 20 Dinner: Carla, Dev']);
  assert.equal(r.issues.length, 1); assert.equal(r.issues[0].kind, 'wrongWeekday'); assert.equal(CR.d2(r.issues[0].t) + ' is a ' + r.issues[0].weekday + ', not a ' + r.issues[0].typedWeekday, 'Wed Oct 21 is a Wednesday, not a Thursday');
  assert.deepEqual(r.notneeded.map(x => x.line), ['Sat 24 dinner Carla']); const ra = r.readas.find(x => x.line === 'Wed walk Fatima'); assert.equal(CR.d2(ra.t), 'Wed Oct 21'); assert.equal(ra.onlyWeekday, 'Wednesday');
  assert.deepEqual(r.helpers.map(h => h.name + ' ' + h.items.length), ['Ana 4', 'Ben 3', 'Carla 1', 'Dev 2', 'Fatima 1']); });
t('proto after fixes: 12/12, all zero', () => { assert.equal(CR.summary(CR.check(CFG, FIXED)), '12 needed · 12 covered · 0 gaps · 0 double · 0 to fix · 0 not needed · 0 duplicate lines'); });
t('(1) multi-word need: "Wed 28 dog walk Ben" -> Dog walk, Ben (never "walk Ben")', () => { assert.deepEqual(got(one('Wed 28 dog walk Ben')), { '2026-10-28 Dog walk': ['Ben'] }); assert.deepEqual(got(one('Wed 28 walk Ben')), { '2026-10-28 Dog walk': ['Ben'] }); });
t('(2) month/weekday-prefix names stay names; a month counts only next to a number', () => {
  for (const nm of ['Mark', 'Jan', 'Octavia', 'Mary', 'Maria', 'June', 'May', 'Monica', 'Sunny', 'Fritz']) { const r = one(nm + ': Tue 27 dinner'); assert.deepEqual(got(r), { '2026-10-27 Dinner': [nm] }, nm); assert.equal(r.issues.length, 0, nm); }
  assert.deepEqual(got(one('Tue Oct 27 dinner May')), { '2026-10-27 Dinner': ['May'] }); });
t('(3) duplicate line counted once, never a double; a true double needs two names', () => {
  let r = CR.check(C2, ['Tue 27 dinner Ana', 'Tue 27 dinner Ana']); assert.ok(r.dups.length && !r.dbl.length);
  r = CR.check(C2, ['Tue 27 dinner Ana', 'Ana: 10/27 meal']); assert.equal(r.dups.length, 1); assert.equal(r.dbl.length, 0);
  r = CR.check(C2, ['Tue 27 dinner Ana', 'Tue 27 dinner Dev']); assert.ok(r.dbl.length); });
t('G8 DST Sun Nov 1 2026: Sun 1 placed, Mon 1 -> "Sunday, not a Monday", Mon 2 placed; weekday-only ambiguity; not needed', () => {
  assert.deepEqual(got(one('Sun 1 dinner Ana')), { '2026-11-01 Dinner': ['Ana'] });
  let r = one('Mon 1 dinner Ana'); assert.equal(r.issues[0].kind, 'wrongWeekday'); assert.equal(r.issues[0].weekday + ', not a ' + r.issues[0].typedWeekday, 'Sunday, not a Monday'); assert.equal(CR.d2(r.issues[0].t), 'Sun Nov 1');
  assert.deepEqual(got(one('Mon 2 dinner Ana')), { '2026-11-02 Dinner': ['Ana'] });
  r = one('Thu walk Ben'); assert.equal(r.issues[0].kind, 'ambiguous'); assert.equal(r.issues[0].n, 2);
  assert.ok(one('11/2 ride Ana').notneeded.length);
  // every day of the DST fortnight keeps its weekday whatever the process TZ (date math only)
  const days = CR.range('2026-10-26', '2026-11-08'); assert.equal(days.length, 14); assert.deepEqual(days.map(d => CR.d2(d).slice(0, 3)), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  assert.deepEqual(days.map(CR.iso).slice(5, 8), ['2026-10-31', '2026-11-01', '2026-11-02']); });
t('build rule: a line with two needs is TO FIX and never placed', () => {
  for (const l of ['Mon 19 dinner and walk Ana', 'Mon 19 dinner walk Ana', 'Ana: Wed 21 ride meal', 'Mon 19 dog walk dinner Ben']) { const r = CR.check(CFG, [l]); assert.equal(r.issues.length, 1, l); assert.equal(r.issues[0].kind, 'twoNeeds', l); assert.equal(Object.keys(r.got).length, 0, l); assert.equal(r.rows[0].result, 'toFix'); } });
t('build rule: "and" (or & / +) between names is TO FIX and never placed', () => {
  for (const l of ['Mon 19 dinner Ana and Ben', 'Ana & Ben: Tue 20 dinner', 'Tue 20 walk Ben + Dev', 'Mon 19 dinner Ana AND Ben']) { const r = CR.check(CFG, [l]); assert.equal(r.issues.length, 1, l); assert.equal(r.issues[0].kind, 'twoNames', l); assert.equal(Object.keys(r.got).length, 0, l); }
  assert.deepEqual(got(CR.check(CFG, ['Mon 19 dinner Andrea'])), { '2026-10-19 Dinner': ['Andrea'] }); assert.deepEqual(got(CR.check(CFG, ['Mon 19 dinner Sandy'])), { '2026-10-19 Dinner': ['Sandy'] }); });
t('couldn\'t read: no need or no name; all lines unreadable; empty paste; d/m not accepted; out-of-range day', () => {
  let r = CR.check(CFG, ['Mon 19 Ana', 'Tue 20 dinner', 'hello']); assert.deepEqual(r.issues.map(i => i.kind), ['couldntRead', 'couldntRead', 'couldntRead']); assert.equal(r.covered, 0);
  assert.equal(CR.check(CFG, ['', '  ']).rows.length, 0); assert.deepEqual(CR.errors(CFG, ['', ' ']).map(e => e.code), ['planEmpty']);
  r = CR.check(CFG, ['20/10 dinner Ana']); assert.equal(r.issues[0].kind, 'noDay'); // d/m reads as month 20: no such day
  assert.equal(CR.check(CFG, ['Mon 30 dinner Ana']).issues[0].kind, 'noDay'); });
t('caps: 28 days ok, 29 rejected; 60 lines ok, 61 rejected; need with zero days; names/notes over cap', () => {
  const c = Object.assign({}, CFG, { first: '2026-10-01', last: '2026-10-28' }); assert.ok(!CR.errors(c, ['Mon dinner Ana']).some(e => e.code === 'tooManyDays'));
  assert.ok(CR.errors(Object.assign({}, c, { last: '2026-10-29' }), ['x']).some(e => e.code === 'tooManyDays'));
  assert.ok(!CR.errors(CFG, Array(60).fill('Mon 19 dinner Ana')).some(e => e.code === 'planTooManyLines')); assert.ok(CR.errors(CFG, Array(61).fill('Mon 19 dinner Ana')).some(e => e.code === 'planTooManyLines'));
  assert.deepEqual(CR.errors(Object.assign({}, CFG, { needs: [{ key: 'ride', label: 'Ride', rule: 'these', days: [] }] }), ['x']).map(e => e.code), ['needNoDays']);
  assert.deepEqual(CR.errors(Object.assign({}, CFG, { forName: 'x'.repeat(41), org: 'y'.repeat(25) }), ['x']).map(e => e.code + e.n), ['forTooLong1', 'orgTooLong1']);
  assert.ok(CR.errors(Object.assign({}, CFG, { last: '2026-10-18' }), ['x']).some(e => e.code === 'dateOrder')); });
t('handoffs: only the helper\'s days and only the notes for their needs (Ben never gets the Dinner note), note for everyone added, stamp', () => {
  const r = CR.check(CFG, FIXED); r.stamp = 'Fri Oct 16, 10:04 PM PDT'; const ben = CR.handoff(C, r, CFG, r.helpers.find(h => h.name === 'Ben')), ana = CR.handoff(C, r, Object.assign({}, CFG, { noteAll: 'Thank you!' }), r.helpers.find(h => h.name === 'Ana'));
  assert.ok(!ben.includes('No nuts') && !ben.includes('Pediatrician') && ben.includes('Dog walk note: “Midday, about 30 min. Use the harness.”'));
  assert.equal(ana, 'Days for: “Ana”\nHelping: “Priya & Sam”\nFrom: “Jess”\n• Mon Oct 19: Dinner\n• Wed Oct 21: Ride\n• Fri Oct 23: Dinner + Dog walk\nDinner note: “No nuts (Sam\'s allergy). Drop off 5:30–6:30.”\nRide note: “Pediatrician 10:15. Leave by 9:50.”\nDog walk note: “Midday, about 30 min. Use the harness.”\nNote for everyone: “Thank you!”\nCan\'t make one? Tell “Jess” before you swap with anyone.\nPlan checked Fri Oct 16, 10:04 PM PDT by “Jess”. Changes after this aren\'t here.'); });
t('stamp on all four outputs (report stamp, every handoff, still-open, household sheet) with zone label; banned words absent', () => {
  const r = CR.check(CFG, PLAN); r.stamp = CR.stampTime(Date.UTC(2026, 9, 17, 4, 58), 'America/Los_Angeles'); assert.equal(r.stamp, 'Fri Oct 16, 9:58 PM PDT');
  assert.equal(CR.stampTime(Date.UTC(2026, 10, 2, 18, 0), 'America/Los_Angeles'), 'Mon Nov 2, 10:00 AM PST', 'after Nov 1 the zone label is PST');
  const st = 'Plan checked Fri Oct 16, 9:58 PM PDT by “Jess”. Changes after this aren\'t here.';
  const so = CR.stillOpen(C, r, CFG); assert.equal(so, 'For: “Priya & Sam”\nStill open. Reply to me, not the group:\n• Wed Oct 21 Dinner\n• Thu Oct 22 Dinner\n' + st);
  const outs = [CR.stampText(C, r, CFG), so, ...r.helpers.map(h => CR.handoff(C, r, CFG, h)), CR.sheetText(C, CR.sheet(r), { forName: 'Priya & Sam', org: 'Jess', first: CFG.first, last: CFG.last, stamp: r.stamp })];
  outs.forEach(o => { assert.ok(o.includes(st), o); assert.ok(!/booked|confirmed|signed up|accepted|guaranteed|\bsafe\b|private/i.test(o), o); });
  const r2 = CR.check(CFG, FIXED); r2.stamp = r.stamp; assert.equal(CR.stillOpen(C, r2, CFG), 'For: “Priya & Sam”\nEvery need has someone for now.\n' + st); });
t('household sheet: per day, helpers with needs, "Nothing planned from helpers"', () => { const r = CR.check(CFG, FIXED); r.stamp = 'X'; const s = CR.sheet(r);
  assert.deepEqual(s.map(d => CR.d2(d.t) + ': ' + (d.who.map(w => w.name + ' (' + w.needs.join(' + ') + ')').join(' · ') || '-')), ['Mon Oct 19: Ana (Dinner) · Ben (Dog walk)', 'Tue Oct 20: Carla (Dinner) · Ben (Dog walk)', 'Wed Oct 21: Dev (Dinner) · Ana (Ride) · Fatima (Dog walk)', 'Thu Oct 22: Ellie (Dinner) · Ben (Dog walk)', 'Fri Oct 23: Ana (Dinner + Dog walk)', 'Sat Oct 24: -', 'Sun Oct 25: Dev (Dinner)']); });
t('link: household sheet only (no notes, no plan lines), round-trips, malformed/old refused', () => {
  const r = CR.check(CFG, FIXED); r.stamp = 'Fri Oct 16, 10:04 PM PDT'; const f = CR.encodeSheet(r, CFG); assert.ok(f.startsWith('cr2.'));
  const d = CR.decodeSheet(f); assert.ok(d.ok); assert.equal(d.data.org, 'Jess'); assert.equal(d.data.sheet.length, 7); assert.deepEqual(d.data.sheet[4].who, [{ name: 'Ana', needs: ['Dinner', 'Dog walk'] }]);
  const raw = M.b64d(f.split('.')[1]); assert.ok(!/nuts|Pediatrician|harness|walk Fatima/.test(raw), 'no notes or plan lines in the link');
  for (const bad of ['', 'cr2.' + 'A'.repeat(2100) + '.000000', f.slice(0, -1) + (f.slice(-1) === 'a' ? 'b' : 'a'), f.slice(0, 30), 'cr1.' + f.slice(4), 'zz2.e30.000000']) assert.ok(!CR.decodeSheet(bad).ok, bad.slice(0, 20));
  assert.equal(CR.decodeSheet('cr1.' + f.split('.')[1] + '.' + M.ck('cr1.' + f.split('.')[1])).why, 'oldVersion');
  const extra = JSON.parse(raw); extra.n = 'note'; const h2 = 'cr2.' + M.b64e(JSON.stringify(extra)); assert.ok(!CR.decodeSheet(h2 + '.' + M.ck(h2)).ok, 'unknown keys refused'); });
t('PM 02:34: typed names quoted in copy text (helper, who it\'s for, organizer, Other need); Writer templates verbatim; spoof marks neutralised', () => {
  const cfg = { forName: 'Milk\u201D from \u201CYour bank', org: '\u00ABBank\u00BB', first: '2026-10-19', last: '2026-10-25', noteAll: '', needs: [{ key: 'other', label: 'Gro\u201Ec\u201F', rule: 'every', days: [], note: 'Bags' }] };
  const r = CR.check(cfg, ['Mon 19 gro\u201Ec\u201F Zq\u201Dx']); r.stamp = 'S';
  assert.equal(CR.handoff(C, r, cfg, r.helpers[0]), 'Days for: “Zq"x”\nHelping: “Milk" from "Your bank”\nFrom: “"Bank"”\n• Mon Oct 19: “Gro"c"”\n“Gro"c"” note: “Bags”\nCan\'t make one? Tell “"Bank"” before you swap with anyone.\nPlan checked S by “"Bank"”. Changes after this aren\'t here.');
  assert.ok(CR.stillOpen(C, r, cfg).startsWith('For: “Milk" from "Your bank”\nStill open. Reply to me, not the group:\n• Tue Oct 20 “Gro"c"”'));
  assert.equal(CR.sheetText(C, CR.sheet(r), { forName: cfg.forName, org: cfg.org, first: cfg.first, last: cfg.last, stamp: 'S', std: () => false }).split('\n')[2], 'Mon Oct 19: “Zq"x” (“Gro"c"”)');
  const WR = '/workspace/mill-sprint-2026-10-16/writer/care-rota/copy.v2.js'; if (fs.existsSync(WR)) assert.equal(fs.readFileSync(__dirname + '/../../mill/care-rota/copy.js', 'utf8'), fs.readFileSync(WR, 'utf8'), 'copy.js is Writer copy.v2.js verbatim');
  assert.ok(!fs.existsSync(__dirname + '/../../mill/care-rota/copy-extra.js'), 'no stand-in file left (Writer N5b supplied tagNameTooLong)');
});
t('Writer finals (N5) verbatim: tagTwoNeeds, tagTwoNames, tagNoDay quote {line}; patchGap, patchNotNeeded, copyHelper, label-line templates', () => {
  assert.equal(C.tagTwoNeeds, 'To fix: “{line}” has two needs. Put each on its own line.'); assert.equal(C.tagTwoNames, 'To fix: “{line}” has more than one name. One person per line.');
  assert.equal(C.tagNoDay, 'To fix: “{line}”. No day in this rota matches it.'); assert.equal(C.patchGap, '{date}: {need}, nobody yet'); assert.equal(C.patchNotNeeded, '{date}: {need}, not needed'); assert.equal(C.copyHelper, 'Copy the message for {name}');
  assert.equal(C.handoffText, "Days for: {name}\nHelping: {for}\nFrom: {org}\n{dayLines}\n{noteLines}Can't make one? Tell {org} before you swap with anyone.\n{stamp}"); assert.equal(C.stillOpenText, 'For: {for}\nStill open. Reply to me, not the group:\n{lines}\n{stamp}');
  assert.equal(M.fill(C.tagTwoNeeds, { line: 'Mon dinner \u201Cwalk\u201D Ana' }), 'To fix: “Mon dinner "walk" Ana” has two needs. Put each on its own line.'); });
// ---------- QA local-ea5aabe C3 / C4 / C7 and the sweeps
t('QA C3: a joined pair is TO FIX (tagTwoNames), never placed, never mangled into one name; plain names still placed', () => {
  for (const pr of ['Ana&Ben', 'Ana+Ben', 'Ana\uFF06Ben', 'Ana \uFF06 Ben', 'Ana\uFF0BBen', 'Ana\u2795Ben', 'Ana / Ben', 'Ana/Ben', 'Ana or Ben', 'Ana OR Ben', 'Ana, Ben', 'Ana,Ben']) for (const l of ['Mon 19 dinner ' + pr, pr + ': Mon 19 dinner', 'Mon 19 ' + pr + ' dinner']) {
    const r = CR.check(CFG, [l]); assert.equal(r.rows[0].result, 'toFix', l); assert.equal(r.issues.length, 1, l); assert.equal(r.issues[0].kind, 'twoNames', l); assert.equal(Object.keys(r.got).length, 0, l); assert.ok(!r.helpers.length, l); }
  for (const nm of ['Andrea', 'Sandy', 'Alexander', 'Brandon', 'Dan', 'Orla', 'Mary-Jane', "O'Neil", 'Zoë', 'Anna Maria']) for (const l of ['Mon 19 dinner ' + nm, nm + ': Mon 19 dinner', nm + ' Mon 19 dinner'])
    assert.deepEqual(got(CR.check(CFG, [l])), { '2026-10-19 Dinner': [nm] }, l);
  assert.deepEqual(got(CR.check(CFG, ['Wed, Oct 21 ride Ana'])), { '2026-10-21 Ride': ['Ana'] }); assert.deepEqual(got(CR.check(CFG, ['10/21 ride Ana'])), { '2026-10-21 Ride': ['Ana'] }); });
t('QA C4: "Name: day need" reads the name even when the name is a month (May/Jan/June/April); proto r1d month rule kept', () => {
  const C4 = Object.assign({}, CFG, { first: '2026-10-19', last: '2026-10-28', needs: [{ key: 'dinner', label: 'Dinner', rule: 'every', days: [] }, { key: 'walk', label: 'Dog walk', rule: 'every', days: [] }] });
  for (const [l, k, nm] of [['May: 20 dinner', '2026-10-20 Dinner', 'May'], ['Jan: 21 dinner', '2026-10-21 Dinner', 'Jan'], ['June: 24 dinner', '2026-10-24 Dinner', 'June'], ['April: 25 dinner', '2026-10-25 Dinner', 'April'],
    ['May: 24 dog walk', '2026-10-24 Dog walk', 'May'], ['May: Oct 22 dinner', '2026-10-22 Dinner', 'May'], ['May 22 Oct dinner', '2026-10-22 Dinner', 'May'], ['Tue Oct 27 dinner May', '2026-10-27 Dinner', 'May']])
    assert.deepEqual(got(CR.check(C4, [l])), { [k]: [nm] }, l);
  assert.equal(CR.check(C4, ['Mon 19 dinner May 2']).rows[0].result, 'toFix', 'a month next to a number is still a date (proto)');
  assert.equal(CR.check(C4, ['Ana: Tue 20 dinner Ben']).issues[0].kind, 'twoNames', 'a name before the colon and another after it'); });
t('QA C7: helper name cap 40 at paste/parse and in a received link; over-cap line -> to fix (nameTooLong) with its {max}', () => {
  const n40 = 'A' + 'b'.repeat(39), n41 = n40 + 'c'; assert.deepEqual(got(CR.check(CFG, ['Mon 19 dinner ' + n40])), { '2026-10-19 Dinner': [n40] });
  const r = CR.check(CFG, ['Mon 19 dinner ' + n41]); assert.equal(r.rows[0].result, 'toFix'); assert.deepEqual(r.issues.map(i => [i.kind, i.max]), [['nameTooLong', 40]]); assert.equal(Object.keys(r.got).length, 0);
  const r2 = CR.check(CFG, ['Mon 19 dinner Zoë ' + 'é'.repeat(35)]); assert.equal(r2.rows[0].result, 'placed', '40 code points incl. accents');
  assert.equal(C.tagNameTooLong, 'To fix: “{line}”. Names can be up to {max} characters. Shorten this one.', 'Writer N5b verbatim');
  assert.equal(M.fill(C.tagNameTooLong, { line: 'Mon 19 dinner ' + n41, max: 40 }), 'To fix: “Mon 19 dinner ' + n41 + '”. Names can be up to 40 characters. Shorten this one.');
  const mk = nm => { const o = { f: 'Priya', o: 'Jess', a: '2026-10-19', b: '2026-10-19', s: 'Fri Oct 16, 10:04 PM PDT', d: [[[nm, ['Dinner']]]] }; const h = 'cr2.' + M.b64e(JSON.stringify(o)); return h + '.' + M.ck(h); };
  assert.ok(CR.decodeSheet(mk(n40)).ok); assert.ok(!CR.decodeSheet(mk(n41)).ok); });
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
t('codec agreement: every sheet the app makes is accepted by the app (2,000 random checks: names up to the cap, accents, quotes, emoji)', () => {
  const R = rng(7), pick = a => a[Math.floor(R() * a.length)], CH = 'abcdefghijklmnopqrstuvwxyzéøüßñ’\'-'.split('').concat(['\u201C', '\u201D', '\u00AB', '😀', 'Z']);
  for (let i = 0; i < 2000; i++) { const len = 1 + Math.floor(R() * 40), nd = 1 + Math.floor(R() * 28), first = '2026-10-' + String(1 + Math.floor(R() * 3)).padStart(2, '0'), d0 = T(first);
    const nm = () => { let s = 'Q'; while (M.len(s) < 1 + Math.floor(R() * 40)) s += pick(CH); return s; };
    const cfg = { forName: 'F' + 'x'.repeat(Math.floor(R() * 39)), org: 'O' + 'y'.repeat(Math.floor(R() * 23)), first, last: CR.iso(d0 + (nd - 1) * 864e5), needs: [{ key: 'dinner', label: 'Dinner', rule: 'every', days: [] }, { key: 'walk', label: 'Dog walk', rule: 'every', days: [] }], noteAll: '' };
    const lines = Array.from({ length: 1 + Math.floor(R() * 12) }, () => 'Oct ' + (1 + Math.floor(R() * 28)) + ' ' + pick(['dinner', 'walk']) + ' ' + nm());
    const r = CR.check(cfg, lines); r.stamp = 'Fri Oct 16, 10:04 PM PDT'; const f = CR.encodeSheet(r, cfg), d = CR.decodeSheet(f);
    assert.ok(d.ok, JSON.stringify({ lines, why: d.why })); assert.deepEqual(d.data.sheet.map(x => x.who), CR.sheet(r).map(x => x.who)); void len; } });
t('placement sweep vs an independent reference (port of QA ref.py, 6,000 random ranges/lines incl. DST, month/year ends, month & weekday-prefix names)', () => {
  const R = rng(20261017), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pick = a => a[Math.floor(R() * a.length)];
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], WDL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const NAMES = ['Ana', 'Ben', 'Carla', 'Dev', 'Ellie', 'Fatima', 'Mark', 'May', 'Andrea', 'Jan', 'Sandy', 'Zoë', 'Orla', 'Dan', 'Brandon', 'Alexander', 'June', 'April', 'Monica', 'Sunny', 'Mary-Jane'];
  const NEEDW = { Dinner: ['dinner', 'meal', 'food'], Ride: ['ride', 'lift', 'drive'], 'Dog walk': ['dog walk', 'walk', 'dog'] };
  const U = (y, m, d) => Date.UTC(y, m - 1, d), add = (t, k) => t + k * 864e5, D = t => new Date(t), wdOf = t => (D(t).getUTCDay() + 6) % 7, isoU = t => D(t).toISOString().slice(0, 10);
  const on = (n, t) => n.rule === 'every' || (n.rule === 'weekdays' && wdOf(t) < 5) || (n.rule === 'these' && n.days.includes(isoU(t))) || (n.rule === 'except' && !n.days.includes(isoU(t)));
  const starts = [U(2026, 10, 26), U(2027, 3, 8), U(2026, 12, 20), U(2027, 2, 15), U(2028, 2, 20), U(2026, 1, 1)]; let checked = 0, monthAsBareName = 0;
  for (let i = 0; i < 6000; i++) {
    const first = add(pick(starts), ri(-10, 40)), n = ri(1, 28), days = Array.from({ length: n }, (_, k) => add(first, k)); const needs = [];
    for (const [key, label] of [['dinner', 'Dinner'], ['ride', 'Ride'], ['walk', 'Dog walk']]) if (R() < .7) { const rule = pick(['every', 'weekdays', 'these', 'except']); const pool = days.map(isoU).slice(); const pk = [];
      for (let k = Math.min(n, ri(1, 3)); k > 0; k--) pk.push(pool.splice(ri(0, pool.length - 1), 1)[0]); needs.push({ key, label, rule, days: rule === 'these' || rule === 'except' ? pk.sort() : [] }); }
    if (!needs.length) needs.push({ key: 'dinner', label: 'Dinner', rule: 'every', days: [] });
    const needed = days.reduce((a, t) => a + needs.filter(x => on(x, t)).length, 0);
    const d = R() < n / (n + 1) ? pick(days) : add(first, ri(-5, 35)), dd = D(d).getUTCDate(), dm = D(d).getUTCMonth() + 1, w = wdOf(d);
    const v = pick(['wd num', 'num', 'wd', 'm/d', 'mon num', 'num mon', 'wd mon num', 'wrongwd', 'wd num th']); let parts, toks;
    if (v === 'wd num') { parts = { wd: w, num: dd }; toks = [WD[w], '' + dd]; } else if (v === 'num') { parts = { num: dd }; toks = ['' + dd]; } else if (v === 'wd') { parts = { wd: w }; toks = [pick([WD[w], WDL[w]])]; }
    else if (v === 'm/d') { parts = { mon: dm, num: dd }; toks = [dm + '/' + dd]; } else if (v === 'mon num') { parts = { mon: dm, num: dd }; toks = [MO[dm - 1], '' + dd]; } else if (v === 'num mon') { parts = { mon: dm, num: dd }; toks = ['' + dd, MO[dm - 1]]; }
    else if (v === 'wd mon num') { parts = { wd: w, mon: dm, num: dd }; toks = [WD[w], MO[dm - 1], '' + dd]; } else if (v === 'wrongwd') { const x = (w + ri(1, 6)) % 7; parts = { wd: x, num: dd }; toks = [WD[x], '' + dd]; }
    else { parts = { wd: w, num: dd }; toks = [WD[w], dd + (dd >= 11 && dd <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[dd % 10] || 'th')]; }
    const nd = pick(needs.concat([{ label: 'Dinner' }])), word = pick(NEEDW[nd.label]), name = pick(NAMES), order = pick(['d n N', 'N d n', 'N: d n']);
    const line = order === 'd n N' ? toks.concat([word, name]).join(' ') : order === 'N d n' ? [name].concat(toks, [word]).join(' ') : name + ': ' + toks.concat([word]).join(' ');
    const cand = days.filter(t => (parts.num == null || D(t).getUTCDate() === parts.num) && (parts.mon == null || D(t).getUTCMonth() + 1 === parts.mon) && (parts.wd == null || wdOf(t) === parts.wd)); let e;
    if (parts.num != null && parts.wd != null && !cand.length) { const mm = days.filter(t => D(t).getUTCDate() === parts.num && (parts.mon == null || D(t).getUTCMonth() + 1 === parts.mon)); if (mm.length) e = { kind: 'wrongWeekday', date: isoU(mm[0]), weekday: WDL[wdOf(mm[0])] }; }
    if (!e) e = cand.length === 1 ? { kind: 'one', date: isoU(cand[0]) } : { kind: cand.length ? 'ambiguous' : 'noDay' };
    const r = CR.check({ forName: 'Q', org: 'Jo', first: isoU(first), last: isoU(days[n - 1]), needs }, [line]), row = r.rows[0], iss = r.issues[0], gd = row.day != null ? CR.iso(row.day) : null;
    assert.equal(r.needList.length, needed, line);
    // "Jan 10 food" (a month-word name first, then a bare number): honestly ambiguous — the app may read Jan as the month and
    // ask for a name ("couldn't read"), but it must never place it on a wrong day or under a wrong name.
    if (order === 'N d n' && MO.concat(['June', 'April']).includes(name) && /^\d+$/.test(toks[0]) && row.result === 'couldntRead') { monthAsBareName++; continue; }
    if (e.kind === 'one') { const want = needs.some(x => x.label === nd.label && on(x, Date.parse(e.date + 'T00:00:00Z'))) ? 'placed' : 'notNeeded';
      assert.deepEqual([row.result, gd, row.name, row.need], [want, e.date, name, nd.label], line + ' ' + isoU(first) + '+' + n); }
    else if (e.kind === 'wrongWeekday') { assert.deepEqual([row.result, gd, iss && iss.weekday], ['toFix', e.date, e.weekday], line); }
    else if (e.kind === 'ambiguous') assert.equal(row.result, 'ambiguous', line); else { assert.equal(row.result, 'toFix', line); assert.equal(gd, null, line); }
    checked++; }
  assert.ok(checked > 5800, checked); console.log('   sweep: ' + checked + ' matched the reference; ' + monthAsBareName + ' "Month N need" lines asked for a name (never misplaced)'); });
t('QA local-e5780b7 regression names: Corey, Orla, Andrea, Leonor, Igor placed as single helpers, alone and inside a plan; lowercase right side "Ana orben" unchanged (placed as typed)', () => {
  const NM = ['Corey', 'Orla', 'Andrea', 'Leonor', 'Igor'];
  for (const nm of NM) for (const l of ['Mon 19 dinner ' + nm, nm + ': Mon 19 dinner', nm + ' Mon 19 dinner', 'Mon 19 ' + nm + ' dinner']) { const r = CR.check(CFG, [l]);
    assert.deepEqual([r.rows[0].result, r.issues.length], ['placed', 0], l); assert.deepEqual(got(r), { '2026-10-19 Dinner': [nm] }, l); }
  const days = ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23'], lines = NM.map((nm, i) => days[i] + ' walk ' + nm).concat(FIXED.filter(l => !/ walk /.test(l)));
  const r = CR.check(CFG, lines); assert.ok(!r.issues.length, JSON.stringify(r.issues));
  for (const [i, nm] of NM.entries()) assert.deepEqual(got(r)[CR.iso(T('2026-10-' + (19 + i))) + ' Dog walk'], [nm], nm);
  assert.deepEqual(r.helpers.filter(h => NM.includes(h.name)).map(h => h.name + ' ' + h.items.length), NM.map(n => n + ' 1'));
  const o = CR.check(CFG, ['Mon 19 dinner Ana orben']); assert.deepEqual([o.rows[0].result, o.rows[0].name], ['placed', 'Ana orben']); });
t('PM C9 (03:48): "<name> or|and<Capitalised>" with no space is TO FIX (tagTwoNames, line quoted), never placed; "Anaor Ben", "AnaorBen", lowercase "Ana orben" and the "or/and" names stay one helper', () => {
  for (const pr of ['Ana orBen', 'Ana andBen', 'Ana orÉlise', 'Mary Jo andBen']) for (const l of ['Mon 19 dinner ' + pr, pr + ': Mon 19 dinner', pr + ' Mon 19 dinner', 'Mon 19 ' + pr + ' dinner']) {
    const r = CR.check(CFG, [l]); assert.deepEqual([r.rows[0].result, r.issues.map(i => i.kind).join()], ['toFix', 'twoNames'], l); assert.equal(Object.keys(r.got).length, 0, l); assert.ok(!r.helpers.length, l);
    assert.equal(M.fill(C.tagTwoNames, { line: r.issues[0].line }), 'To fix: “' + l + '” has more than one name. One person per line.'); }
  for (const nm of ['Anaor Ben', 'AnaorBen', 'Ana orben', 'Ana andben', 'Igor', 'Leonor', 'Corey', 'Andrea', 'Orla', 'Brandon', 'Sandra', 'Igor Petrov', 'Leonor Ben', 'Ana Andrea', 'Mary Orla', 'orBen'])
    for (const l of ['Mon 19 dinner ' + nm, nm + ': Mon 19 dinner']) assert.deepEqual(got(CR.check(CFG, [l])), { '2026-10-19 Dinner': [nm] }, l);
  const r = CR.check(CFG, ['Mon 19 dinner Igor', 'Tue 20 dinner Ana orBen', 'Wed 21 ride Leonor', 'Thu 22 dinner Corey', 'Fri 23 dinner Ana andBen', 'Sun 25 dinner Sandra']);
  assert.deepEqual(r.issues.map(i => i.kind + ':' + i.line), ['twoNames:Tue 20 dinner Ana orBen', 'twoNames:Fri 23 dinner Ana andBen']);
  assert.deepEqual(r.helpers.map(h => h.name), ['Igor', 'Leonor', 'Corey', 'Sandra']); });
t('QA C10 + PM 04:38: a joiner is ONLY lowercase or|and glued to an uppercase letter; all-caps surnames and Or/OR/And/AND spellings are one helper', () => {
  const PLACE = ['Mary ANDERSON', 'Ana ORLANDO', 'ANA ORTIZ', 'JO ORR', 'SAM ANDREWS', 'Ana OrBen', 'Ana ORBen', 'Ana AndBen', 'Ana ANDBen', 'ANA ORBEN', 'Mary Anderson', 'MARY JANE', 'Ana Ortiz',
    'Anaor Ben', 'AnaorBen', 'Ana orben', 'Igor', 'Leonor', 'Corey', 'Andrea', 'Orla', 'Brandon', 'Sandra'];
  for (const nm of PLACE) for (const l of ['Mon 19 dinner ' + nm, nm + ': Mon 19 dinner', nm + ' Mon 19 dinner']) { const r = CR.check(CFG, [l]);
    assert.deepEqual([r.rows[0].result, r.issues.length], ['placed', 0], l); assert.deepEqual(got(r), { '2026-10-19 Dinner': [nm] }, l); }
  for (const pr of ['Ana orBen', 'Ana andBen']) for (const l of ['Mon 19 dinner ' + pr, pr + ': Mon 19 dinner']) { const r = CR.check(CFG, [l]);
    assert.deepEqual([r.rows[0].result, r.issues.map(i => i.kind).join(), Object.keys(r.got).length], ['toFix', 'twoNames', 0], l); }
  const r = CR.check(CFG, PLACE.slice(0, 5).map((nm, i) => ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23'][i] + ' dinner ' + nm).concat(['Sun 25 dinner Ana orBen']));
  assert.deepEqual(r.helpers.map(h => h.name), PLACE.slice(0, 5)); assert.deepEqual(r.issues.map(i => i.kind + ':' + i.line), ['twoNames:Sun 25 dinner Ana orBen']); });
console.log('PASS ' + n + ' tests');
