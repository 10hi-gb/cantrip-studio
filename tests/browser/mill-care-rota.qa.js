// node tests/browser/mill-care-rota.qa.js <host[:port]> <ip> [scheme] — Care Rota r1c @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Worked example (Jess / Priya & Sam), the build rules (two needs / "and" between names -> to fix, never placed), the stamp on
// all four outputs incl. copied text (zone label, PDT and PST), Nov 1 2026 DST range, per-helper notes, set-aside pocket,
// reading table, print (sheet only), the household-sheet-only link (warning, 2,000-char whole-URL cap, malformed/old links),
// recipient read-only (shared readOnly, recipientAccess), typedAudit incl. the PM Q1 spoof case, validation + in-page error
// links landing focus, reset, toast reset on route change, no storage / no network, no sideways scroll.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, mouseAt, errsOf, W, sleep, session, overflow, typeInto, storage, netCheck, result } = require('./mill-common');
const fs = require('fs'), vm = require('vm');
const C = vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/care-rota/copy.js', 'utf8') + ';COPY');
const X = C; // Writer N5 supplied the former stand-in keys
const CR = require('../../mill/care-rota/cr.js'), M = require('../../mill/shared/core.js');
const pdfPages = buf => { const f = require('os').tmpdir() + '/cr-print-' + process.pid + '.pdf'; fs.writeFileSync(f, buf); const m = /Pages:\s+(\d+)/.exec(require('child_process').execFileSync('pdfinfo', [f]).toString()); fs.unlinkSync(f); return m ? +m[1] : -1; };
const BASE = `${SCHEME}://${H}/mill/care-rota/`;
const PLAN = 'Mon 19 dinner Ana|Mon 19 walk Ben|Tue 20 dinner Carla|Tue 20 dinner Dev|Tue 20 walk Ben|Wed 21 ride Ana|Thu 21 dinner Ellie|Thu 22 walk Ben|Fri 23 dinner Ana|Fri 23 walk Ana|Sat 24 dinner Carla|Sun 25 dinner Dev|Wed walk Fatima'.split('|');
const RULES = ['Mon 19 dinner and walk Ana', 'Tue 22 dinner Ana and Ben', 'Ana & Ben: Fri 23 ride'];
const FIXED = PLAN.filter(l => !['Thu 21 dinner Ellie', 'Tue 20 dinner Dev', 'Sat 24 dinner Carla'].includes(l)).concat(['Thu 22 dinner Ellie', 'Wed 21 dinner Dev']);
const NOTES = { dinner: "No nuts (Sam's allergy). Drop off 5:30–6:30.", ride: 'Pediatrician 10:15. Leave by 9:50.', walk: 'Midday, about 30 min. Use the harness.' };
const STAMP_RE = /^Plan checked (Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M [A-Z]{3,4} by “Jess”\. Changes after this aren't here\.$/;
const clipStub = () => { window.__clip = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); };
const setDate = (p, id, v) => p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v);
async function form(p, o) {
  await typeInto(p, '#f-for', o.forName); await typeInto(p, '#f-org', o.org); await setDate(p, 'f-first', o.first); await setDate(p, 'f-last', o.last);
  for (const n of o.needs) { const on = await p.$eval('#n-' + n.key, e => e.checked); if (!on) await p.click('#n-' + n.key); if (n.label && n.key === 'other') await typeInto(p, '#n-other-t', n.label);
    await p.select('#r-' + n.key, n.rule); for (const d of n.days || []) await p.$eval(`#c-${n.key} input[value="${d}"]`, e => e.click()); if (n.note) await typeInto(p, '#note-' + n.key, n.note); }
  if (o.noteAll) await typeInto(p, '#f-note-all', o.noteAll);
  await p.$eval('#f-plan', (e, v) => { e.value = v; }, o.lines.join('\n'));
}
const JESS = { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'except', days: ['2026-10-24'], note: NOTES.dinner }, { key: 'ride', rule: 'these', days: ['2026-10-21'], note: NOTES.ride }, { key: 'walk', rule: 'weekdays', note: NOTES.walk }] };
const CFG = { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', noteAll: '', needs: [{ key: 'dinner', label: 'Dinner', rule: 'except', days: ['2026-10-24'], note: NOTES.dinner }, { key: 'ride', label: 'Ride', rule: 'these', days: ['2026-10-21'], note: NOTES.ride }, { key: 'walk', label: 'Dog walk', rule: 'weekdays', days: [], note: NOTES.walk }] };
const check = async p => { await p.click('#b-check'); await sleep(250); };
const state = p => p.evaluate(() => ({ tally: document.getElementById('tally').textContent, tags: [...document.querySelectorAll('#tags .tag p')].map(e => e.textContent), stamp2: document.getElementById('stamp-2').textContent,
  patches: [...document.querySelectorAll('#quilts .patch')].map(e => e.className.replace('patch ', '') + '|' + e.getAttribute('aria-label')), pocket: [...document.querySelectorAll('#pocket-l li')].map(e => e.textContent), pocketShown: !document.getElementById('pocket').hidden,
  per: [...document.querySelectorAll('#per-l li')].map(e => e.textContent), cards: [...document.querySelectorAll('#cards .hcard')].map(c => ({ h: c.querySelector('h3').textContent, msg: c.querySelector('.msg').textContent, stamp: c.querySelector('.msg .stamp').textContent, btn: c.querySelector('button').textContent })),
  sheet: [...document.querySelectorAll('#sheet-t tr')].map(r => r.cells[0].textContent + ': ' + r.cells[1].textContent), sheetH: document.getElementById('sheet-h').textContent, stamp4: document.getElementById('stamp-4').textContent, sheetNote: document.getElementById('sheet-note').textContent,
  reading: [...document.querySelectorAll('#readas tbody tr')].map(r => [...r.cells].map(c => c.textContent).join(' | ')), clear: document.getElementById('all-clear').hidden ? '' : document.getElementById('all-clear').textContent,
  on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), active: document.activeElement && document.activeElement.id }));
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info: ok ? undefined : info });
  for (const w of W) {
    let s = await session(H, IP); let { p } = s; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(250);
    let t = await p.evaluate(() => ({ h1: document.getElementById('title').textContent, lede: document.getElementById('lede').textContent, empty: document.getElementById('empty-state').textContent, title: document.title, on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), font: getComputedStyle(document.querySelector('h1')).fontFamily, priv: document.getElementById('privacy').textContent }));
    ck(w + ' S1 paste: Writer title/invitation/emptyState/privacy verbatim; only S1 shown; Alegreya (Creative row 32)', t.h1 === C.title && t.lede === C.invitation && t.empty === C.emptyState && t.priv === C.privacy && t.title === 'Care Rota · Cantrip Studio' && t.on.join() === 's1' && /Alegreya/.test(t.font), t);
    // validation: empty form -> every error listed, aria-invalid, focus on the first error link; each link lands focus on its field
    await check(p); t = await p.evaluate(() => ({ errs: [...document.querySelectorAll('#errs-l a')].map(a => a.textContent + '>' + a.getAttribute('href')), inv: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.id), active: document.activeElement.getAttribute('href'), on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id) }));
    ck(w + ' validation: forEmpty, orgEmpty, dateMissing, planEmpty listed (Writer strings); fields aria-invalid; focus on the first error link; nothing checked', t.errs.join('|') === [C.forEmpty + '>#f-for', C.orgEmpty + '>#f-org', C.dateMissing + '>#f-first', C.planEmpty + '>#f-plan'].join('|') && ['f-for', 'f-org', 'f-first', 'f-plan'].every(i => t.inv.includes(i)) && t.active === '#f-for' && t.on.join() === 's1', t);
    let landed = [];
    for (const href of ['#f-plan', '#f-first', '#f-org']) { await mouseAt(p, `#errs-l a[href="${href}"]`); landed.push(await p.evaluate(h => { const a = document.activeElement, r = a.getBoundingClientRect(); return a.id === h.slice(1) && r.top >= 40 && r.bottom <= innerHeight && location.hash === ''; }, href)); }
    await p.focus('#errs-l a[href="#f-for"]'); await p.keyboard.press('Enter'); await sleep(80); landed.push(await p.evaluate(() => document.activeElement.id === 'f-for' && location.hash === ''));
    ck(w + ' KS-1r: every in-page error link (real click and Enter) lands focus on its field, in view, address bar untouched', landed.every(Boolean), landed);
    // caps
    await form(p, Object.assign({}, JESS, { forName: 'x'.repeat(41), org: 'y'.repeat(26), first: '2026-10-01', last: '2026-10-29', needs: [], lines: Array(61).fill('Mon 5 dinner Ana') }));
    await check(p); t = await p.evaluate(() => [...document.querySelectorAll('#errs-l a')].map(a => a.textContent));
    ck(w + ' caps (Writer {one,other}, {max} from the build): for 41 -> 1 over, organizer 26 -> 2 over, 29 days refused, 61 lines refused', t.join('|') === ['Up to 40 characters. 1 over.', 'Up to 24 characters. 2 over.', M.fill(C.tooManyDays, { max: 28 }), M.fill(C.planTooManyLines, { max: 60 })].join('|'), t);
    await p.reload({ waitUntil: 'load' }); await sleep(200);
    await form(p, Object.assign({}, JESS, { needs: [{ key: 'ride', rule: 'these' }], lines: ['Wed 21 ride Ana'] })); await check(p);
    t = await p.evaluate(() => [...document.querySelectorAll('#errs-l a')].map(a => a.textContent));
    ck(w + ' a need with zero days is refused (needNoDays)', t.join('|') === M.fill(C.needNoDays, { need: 'Ride' }), t);
    // ---------- worked example, first check
    await p.reload({ waitUntil: 'load' }); await sleep(200);
    await form(p, Object.assign({}, JESS, { lines: PLAN.concat(RULES) })); await check(p); t = await state(p);
    const r0 = CR.check(CFG, PLAN.concat(RULES));
    ck(w + ' S2 tally: needed · covered · gaps · double · to fix · not needed · duplicate lines (proto + 3 rule lines = 4 to fix)', t.tally === '12 needed · 10 covered · 2 gaps · 1 double · 4 to fix · 1 not needed · 0 duplicate lines' && t.clear === '', t.tally);
    const expTags = ['To fix: “Thu 21 dinner Ellie”. Wed Oct 21 is a Wednesday, not a Thursday. Ask “Ellie” which day they meant.', M.fill(X.tagTwoNeeds, { line: RULES[0] }), M.fill(X.tagTwoNames, { line: RULES[1] }), M.fill(X.tagTwoNames, { line: RULES[2] }),
      'Double: Tue Oct 20 Dinner: “Carla”, “Dev”. Both lines stay; you decide who moves.', 'Gap: Wed Oct 21 Dinner. Nobody yet.', 'Gap: Thu Oct 22 Dinner. Nobody yet.', 'Not needed: “Sat 24 dinner Carla”. Dinner isn\'t needed on Sat Oct 24. Set aside, not placed.',
      'Read as: “Wed walk Fatima” → Wed Oct 21 (the only Wednesday in these days), Dog walk, “Fatima”.'];
    ck(w + ' S2 tags exact (Writer templates; pasted lines quoted; build-rule lines are TO FIX tags)', JSON.stringify(t.tags) === JSON.stringify(expTags), t.tags);
    const pmon = t.patches.filter(x => /Mon Oct 19: Dinner|Tue Oct 20: Dog walk|Fri Oct 23: Ride/.test(x)).sort();
    ck(w + ' build rules: two-needs and "and"-names lines are never placed (Mon 19 Dinner stays “Ana” alone, no Ben on Tue walk twice, Fri ride stays not needed)', pmon.join('|') === 'hole|Fri Oct 23: Ride, not needed|taken meal|Mon Oct 19: Dinner, “Ana”|taken walk|Tue Oct 20: Dog walk, “Ben”' && !t.patches.some(x => /and|&/.test(x)), pmon);
    ck(w + ' quilt (Writer patchGap/patchNotNeeded verbatim in aria): 21 patches (3 needs × 7 days): 10 covered (9 single + 1 double with ×2 pin), 2 gap, 9 not-needed holes', t.patches.length === 21 && t.patches.filter(x => /^taken/.test(x)).length === 9 && t.patches.filter(x => /^gap/.test(x)).length === 2 && t.patches.filter(x => /^dbl/.test(x)).length === 1 && t.patches.filter(x => /^hole/.test(x)).length === 9 && t.patches.includes('dbl|Tue Oct 20: Dinner, Double: “Carla” + “Dev”') && t.patches.includes('gap|Wed Oct 21: Dinner, nobody yet') && t.patches.includes('hole|Sat Oct 24: Dinner, not needed'), t.patches);
    ck(w + ' set-aside pocket lists every line not placed (to fix, not needed), quoted, with its reading result', t.pocketShown && JSON.stringify(t.pocket) === JSON.stringify(['“Thu 21 dinner Ellie” · To fix', '“Sat 24 dinner Carla” · Set aside: not needed', '“' + RULES[0] + '” · To fix', '“' + RULES[1] + '” · To fix', '“' + RULES[2] + '” · To fix']), t.pocket);
    ck(w + ' per helper counts', t.per.join('|') === '“Ana”: 4|“Ben”: 3|“Carla”: 1|“Dev”: 2|“Fatima”: 1', t.per);
    ck(w + ' stamp on the S2 report: "Plan checked {date, time, zone label} by “Jess”. Changes after this aren\'t here."', STAMP_RE.test(t.stamp2), t.stamp2);
    const stampTxt = t.stamp2; // PM 02:34: the organizer is quoted in copied text too
    ck(w + ' S3 handoffs: one card per helper + still-open card; every message ends with the stamp', t.cards.length === 6 && t.cards.every(c => c.stamp === stampTxt && c.msg.endsWith(stampTxt)) && t.cards.map(c => c.h).join() === '“Ana”,“Ben”,“Carla”,“Dev”,“Fatima”,' + X.stillOpenHeading && t.cards[1].btn === 'Copy the message for “Ben”', t.cards.map(c => c.h + '/' + c.btn));
    const ben = t.cards[1].msg; r0.stamp = stampTxt.match(/checked (.*) by/)[1];
    ck(w + ' Ben\'s handoff: only his days, only the Dog walk note (never the Dinner/Ride notes), Writer template exactly', ben === CR.handoff(C, r0, CFG, r0.helpers[1]) && !ben.includes('No nuts') && !ben.includes('Pediatrician') && ben.includes('Dog walk note: “' + NOTES.walk + '”') && ben.startsWith('Days for: “Ben”\nHelping: “Priya & Sam”\nFrom: “Jess”\n'), ben);
    // copy outputs: still-open + a handoff, both stamped (Copy is the 4th output)
    await p.click('#b-open'); await sleep(120); await p.evaluate(() => document.querySelectorAll('#cards .hcard button')[0].click()); await sleep(120);
    t = await p.evaluate(() => ({ clip: window.__clip.slice(), toast: document.getElementById('toast').textContent }));
    ck(w + ' Copy "still open": exact Writer text, gaps only, reply to the organizer, stamp; toast "Copied."', t.clip[0] === CR.stillOpen(C, r0, CFG) && t.clip[0].endsWith(stampTxt) && t.clip[0].includes('• Wed Oct 21 Dinner\n• Thu Oct 22 Dinner') && t.toast === C.copied, t);
    ck(w + ' Copy handoff: exact Writer text with the stamp', t.clip[1] === CR.handoff(C, r0, CFG, r0.helpers[0]) && t.clip[1].endsWith(stampTxt), t.clip[1]);
    const t4 = await state(p);
    ck(w + ' S4 household sheet: per day helpers + needs, "Nothing planned from helpers", stamp + change note', t4.sheetH === 'Who\'s coming: “Priya & Sam”' && t4.sheet[5] === 'Sat Oct 24: ' + C.sheetNothing && t4.sheet[1] === 'Tue Oct 20: “Carla” (Dinner) · “Dev” (Dinner) · “Ben” (Dog walk)' && STAMP_RE.test(t4.stamp4) && t4.sheetNote === 'Plans can change. Not sure? Ask “Jess”.', t4.sheet);
    ck(w + ' S5 reading table: one row per pasted line, day · need · name · result', t4.reading.length === 16 && t4.reading[12].startsWith('13. “Wed walk Fatima” | Wed Oct 21 | Dog walk | “Fatima” | Placed') && t4.reading[1].endsWith('Placed') && t4.reading[3].endsWith(C.readingResults.double) && t4.reading[6].endsWith(C.readingResults.toFix) && t4.reading[13].startsWith('14. “' + RULES[0] + '” |') && t4.reading[13].endsWith(C.readingResults.toFix), t4.reading);
    const banned = (await p.evaluate(() => document.body.innerText)).match(/booked|confirmed|signed up|accepted|guaranteed|\bsafe\b|privately|\bprivate\b/gi);
    ck(w + ' banned words absent from the rendered page and copied text (QA grep = 0)', !banned && !t.clip.join('\n').match(/booked|confirmed|signed up|privately/i), banned);
    let o = await overflow(p); ck(w + ' checked page: no sideways scroll, nothing past the edge', o.sw <= o.w && !o.bad.length, o);
    const clipped = await p.evaluate(() => [...document.querySelectorAll('.patch .who,.tag p,.btn,.selvedge span,.msg')].filter(e => e.getClientRects().length && (e.scrollWidth > e.clientWidth + 1 || (e.closest('.patch') && e.getBoundingClientRect().bottom > e.closest('.patch').getBoundingClientRect().bottom + 1))).map(e => e.className + ':' + e.textContent.slice(0, 20)));
    ck(w + ' no clipped text in patches, tags, tally, buttons or messages', !clipped.length, clipped);
    // print: S4 only, buttons hidden, stamp kept
    await p.emulateMediaType('print'); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), btn: [...document.querySelectorAll('button')].filter(b => b.getClientRects().length).length, stamp: getComputedStyle(document.getElementById('stamp-4')).display, share: document.getElementById('share').getClientRects().length, top: document.querySelector('.top').getClientRects().length }));
    await p.emulateMediaType(null);
    ck(w + ' print: the household sheet only (S4), no buttons, share panel hidden, stamp kept', t.on.join() === 's4' && t.btn === 0 && t.stamp !== 'none' && !t.share && !t.top, t);
    if (w === W[W.length - 1]) { const pdf = await p.pdf({ format: 'letter' }); const pages = pdfPages(pdf); ck(w + ' print: one Letter page (7-day sheet)', pages === 1, pages); }
    // re-check after the three fixes: 12/12, all clear, changed patches stitch in
    await p.$eval('#f-plan', (e, v) => { e.value = v; }, FIXED.join('\n')); await p.click('#b-edit'); t = await p.evaluate(() => document.activeElement.id);
    ck(w + ' "Edit lines and check again" moves focus to the plan box', t === 'f-plan', t);
    await check(p); t = await state(p);
    ck(w + ' after the fixes: 12 needed · 12 covered · 0 … , allClear (Writer), only the READ AS info tag left, pocket hidden; S2 focused', t.tally === '12 needed · 12 covered · 0 gaps · 0 double · 0 to fix · 0 not needed · 0 duplicate lines' && t.clear === C.allClear && t.tags.join() === expTags[8] && !t.pocketShown && t.active === 's2', t);
    const stitched = await p.evaluate(() => [...document.querySelectorAll('#quilts .patch.new')].map(e => e.getAttribute('aria-label')));
    ck(w + ' stitch-in only on patches that changed between checks', stitched.sort().join('|') === ['Thu Oct 22: Dinner, “Ellie”', 'Tue Oct 20: Dinner, “Carla”', 'Wed Oct 21: Dinner, “Dev”'].join('|'), stitched);
    await p.click('#b-open'); await sleep(100); t = await p.evaluate(() => window.__clip.slice(-1)[0]);
    ck(w + ' still-open when nothing is open: stillOpenNone + stamp', /^For: “Priya & Sam”\nEvery need has someone for now\.\nPlan checked .* by “Jess”\. Changes after this aren't here\.$/.test(t), t);
    // ---------- link: household sheet only, warning before the button
    t = await p.evaluate(() => ({ warn: document.getElementById('link-warn').textContent, holds: document.getElementById('link-holds').textContent, order: document.getElementById('link-warn').compareDocumentPosition(document.getElementById('b-link')) & 4 }));
    ck(w + ' link: linkWarning + linkHolds shown before "Make the link"', t.warn === C.linkWarning && t.holds === C.linkHolds && t.order, t);
    await p.click('#b-link'); await sleep(150); t = await p.evaluate(() => ({ v: document.getElementById('link').value, clip: window.__clip.slice(-1)[0], hash: location.hash }));
    const frag = t.v.split('#')[1] || '', dec = CR.decodeSheet(frag), raw = frag ? M.b64d(frag.split('.')[1]) : '';
    ck(w + ' link: made with the shared linkFor (whole URL ≤ 2,000), copied, address bar untouched; carries only the household sheet (no notes, no plan lines)', t.v.startsWith(BASE + '#cr2.') && t.v.length <= 2000 && t.clip === t.v && t.hash === '' && dec.ok && dec.data.sheet.length === 7 && !/nuts|Pediatrician|harness|walk Fatima|dinner Ana/.test(raw) && Object.keys(JSON.parse(raw)).sort().join() === 'a,b,d,f,o,s', { v: t.v.length, raw });
    // ---------- recipient
    await p.goto('about:blank'); await p.goto(t.v, { waitUntil: 'load' }); await sleep(250);
    t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), intro: document.getElementById('recv-intro').textContent, note: document.getElementById('recv-note').textContent, typed: document.querySelector('#recv-intro .mill-typed') && document.querySelector('#recv-intro .mill-typed').textContent,
      enabled: [...document.querySelectorAll('#form input,#form select,#form textarea,#form button')].filter(e => !e.disabled).length, ctrls: document.querySelectorAll('#form input').length, share: !document.getElementById('share').hidden, sheet: [...document.querySelectorAll('#sheet-t tr')].map(r => r.cells[0].textContent + ': ' + r.cells[1].textContent), stamp: document.getElementById('stamp-4').textContent, inert: document.querySelectorAll('[inert]').length }));
    ck(w + ' recipient: household sheet only; receiverIntro with the organizer as its own quoted text node; receiverNote; the form is read-only in the DOM (shared readOnly) and not shown; no share panel', t.on.join() === 's4' && t.intro === 'Household sheet · from: “Jess”' && t.typed === '“Jess”' && t.note === C.receiverNote && t.enabled === 0 && t.ctrls > 5 && !t.share && t.sheet[2] === 'Wed Oct 21: “Dev” (Dinner) · “Ana” (Ride) · “Fatima” (Dog walk)' && STAMP_RE.test(t.stamp) && !t.inert, t);
    const ra = await recipientAccess(p, { facts: ['Who\'s coming: “Priya & Sam”', t.stamp, C.receiverNote, 'Household sheet · from:'], tabTo: ['#own', '#b-print'] });
    ck(w + ' recipient accessibility: not inert/aria-hidden, sheet + stamp in the accessibility tree, Tab reaches "Make my own rota" and Print', ra.ok, ra);
    o = await overflow(p); ck(w + ' recipient: no sideways scroll', o.sw <= o.w && !o.bad.length, o);
    await p.click('#own'); await sleep(200); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), hash: location.hash, enabled: [...document.querySelectorAll('#form input')].every(e => !e.disabled), v: document.getElementById('f-for').value, active: document.activeElement.id }));
    ck(w + ' "Make my own rota": clears the link, fresh editable form, focus on the first field', t.on.join() === 's1' && t.hash === '' && t.enabled && t.v === '' && t.active === 'f-for', t);
    // malformed / old / oversize links
    const bads = [['#cr2.e30.000000', C.badLink], ['#cr2.' + frag.split('.')[1] + '.' + 'ffffff', C.badLink], ['#cr2.' + 'A'.repeat(2100) + '.000000', C.badLink], ['#cr1.' + frag.split('.')[1] + '.' + M.ck('cr1.' + frag.split('.')[1]), C.oldVersion], ['#' + frag.slice(0, 40), C.badLink]];
    const badRes = []; for (const [h, msg] of bads) { await p.evaluate(h => { location.hash = h; }, h); await sleep(150); badRes.push(await p.evaluate(m => document.getElementById('bad-t').textContent === m && !document.getElementById('bad').hidden && getComputedStyle(document.getElementById('s4')).display === 'none' && [...document.querySelectorAll('#form input')].every(e => !e.disabled), msg)); }
    ck(w + ' malformed, tampered, oversize and cut-off links -> badLink; older version -> oldVersion; nothing rendered from them; form usable', badRes.every(Boolean), badRes);
    // toast reset on route change
    await p.evaluate(() => MILLVIEW.toast('x')); await p.evaluate(() => { location.hash = ''; }); await sleep(150); t = await p.evaluate(() => document.getElementById('toast').hidden && document.getElementById('bad').hidden);
    ck(w + ' route change clears the toast and the bad-link banner', t, t);
    const st0 = await storage(p); ck(w + ' no cookies/localStorage/sessionStorage/IndexedDB/caches/SW, no {placeholders} on screen', !st0.cookie && !st0.ls.length && !st0.ss.length && (!st0.idb.length || st0.idb === 'n/a') && !st0.caches.length && !st0.sw && !st0.undef, st0);
    ck(w + ' no request off the page origin, no query strings, GET only', !netCheck(s.reqs, H, []).offending.length, netCheck(s.reqs, H, []).offending);
    ck(w + ' no page errors (CSP: no inline style attributes)', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();

    // ---------- Nov 1 2026 DST: range Oct 26 – Nov 8 under two device zones; stamp label PST after the change
    for (const tz of ['America/Los_Angeles', 'Pacific/Auckland']) {
      s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.emulateTimezone(tz); await p.evaluateOnNewDocument(clipStub);
      await p.evaluateOnNewDocument(() => { const T = Date.UTC(2026, 10, 2, 18, 0); Date.now = () => T; });
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      await form(p, { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-26', last: '2026-11-08', needs: [{ key: 'dinner', rule: 'except', days: ['2026-10-31', '2026-11-07'] }, { key: 'ride', rule: 'these', days: ['2026-11-02'] }], lines: ['Sun 1 dinner Ana', 'Mon 1 dinner Ana', 'Mon 2 dinner Ben', 'Sat 31 dinner Cy', 'Thu dinner Dee', '11/2 ride Eve', 'Nov 1 meal Fay'] });
      await check(p); t = await state(p);
      const dst = { nov1: t.patches.find(x => x.includes('Sun Nov 1: Dinner')), nov2: t.patches.find(x => x.includes('Mon Nov 2: Dinner')), oct31: t.patches.find(x => x.includes('Sat Oct 31: Dinner')), ride: t.patches.find(x => x.includes('Mon Nov 2: Ride')), days: [...new Set(t.patches.map(x => x.split('|')[1].split(':')[0]))] };
      ck(`${w} ${tz} DST Nov 1 2026: 14 days Mon Oct 26 – Sun Nov 8 in order; "Sun 1" placed on Sun Nov 1; "Mon 1" -> "Sun Nov 1 is a Sunday, not a Monday"; "Mon 2" placed; Sat 31 not needed; "Thu" matches 2 days; 11/2 ride placed`,
        dst.days.length === 14 && dst.days[0] === 'Mon Oct 26' && dst.days[6] === 'Sun Nov 1' && dst.days[7] === 'Mon Nov 2' && dst.days[13] === 'Sun Nov 8' && dst.nov1 === 'dbl|Sun Nov 1: Dinner, Double: “Ana” + “Fay”' && dst.nov2 === 'taken meal|Mon Nov 2: Dinner, “Ben”' && /^hole/.test(dst.oct31) && dst.ride === 'taken ride|Mon Nov 2: Ride, “Eve”'
        && t.tags.includes('To fix: “Mon 1 dinner Ana”. Sun Nov 1 is a Sunday, not a Monday. Ask “Ana” which day they meant.') && t.tags.includes('“Thu dinner Dee” matches 2 days. Add the date.') && t.tags.includes('Not needed: “Sat 31 dinner Cy”. Dinner isn\'t needed on Sat Oct 31. Set aside, not placed.'), { dst, tags: t.tags });
      const z = tz === 'America/Los_Angeles' ? 'Mon Nov 2, 10:00 AM PST' : 'Tue Nov 3, 7:00 AM GMT+13';
      ck(`${w} ${tz} stamp carries the device zone label after the change (${z}) on the report, every handoff and the sheet`, t.stamp2 === `Plan checked ${z} by “Jess”. Changes after this aren't here.` && t.cards.every(c => c.stamp === `Plan checked ${z} by “Jess”. Changes after this aren't here.`) && t.stamp4 === t.stamp2, [t.stamp2, t.cards.map(c => c.stamp)]);
      await s.b.close();
    }

    // ---------- typedAudit (PM Q1 spoof seeds) on the organizer view and the recipient view; URL cap
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    const SF = 'Milk\u201D from \u201CYour bank', SO = '\u00ABBank\u00BB \u201Ex\u201F', SN = 'Zq\u201Dxa', SN2 = 'Wv\u00AByb\u00BB', SG = 'Gro\u201Ec\u201F', SNOTE = 'Ring\u201D says \u201CPolice';
    await form(p, { forName: SF, org: SO, first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every', note: SNOTE }, { key: 'other', label: SG, rule: 'weekdays' }], noteAll: 'Hi', lines: ['Mon 19 dinner ' + SN, 'Mon 19 dinner ' + SN2, 'Tue 20 ' + SG.toLowerCase() + ' ' + SN, 'Wed ' + SN2 + ' dinner', 'Thu 21 dinner ' + SN, 'Fri 23 dinner Ana and ' + SN] });
    await check(p); await p.click('#b-open'); await sleep(100);
    // the copy-text previews follow Writer's handoff/still-open templates exactly (checked above); everything else is audited
    const clips = await p.evaluate(() => window.__clip.slice());
    const LINES = ['Mon 19 dinner ' + SN, 'Mon 19 dinner ' + SN2, 'Tue 20 ' + SG.toLowerCase() + ' ' + SN, 'Wed ' + SN2 + ' dinner', 'Thu 21 dinner ' + SN, 'Fri 23 dinner Ana and ' + SN].map(l => '“' + M.unquote(l) + '”');
    let a = await typedAudit(p, [SF, SO, SN, SN2, SG].concat(LINES.map(l => l.slice(1, -1))), Object.fromEntries(clips.map((c, i) => ['clipboard#' + i, c])));
    const vis = (await p.evaluate(() => document.body.innerText)).split(LINES[0]).join('').split(LINES[1]).join('').split(LINES[2]).join('').split(LINES[3]).join('').split(LINES[4]).join('').split(LINES[5]).join('');
    const { unquotedIn } = require('./mill-common'); const visHits = [SF, SO, SN, SN2, SG].map(x => M.unquote(x)).flatMap(x => unquotedIn(vis, x));
    a.all = a.all.filter(h => h.where !== 'visible').concat(visHits.map(ctx => ({ where: 'visible (outside quoted pasted lines)', ctx })));
    ck(w + ' typedAudit organizer view (PM Q1 spoof seeds: who it\'s for, organizer, names, other need, whole pasted lines): screen incl. message previews, aria, titles, live regions, toast, copied text (PM 02:34: names quoted in copy text too); a name inside a quoted pasted line counts as quoted', !a.all.length, a.all.slice(0, 12));
    ck(w + ' copied still-open is exactly Writer\'s v2 template with the typed values quoted', clips[0] === CR.stillOpen(C, Object.assign(CR.check({ forName: SF, org: SO, first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', label: 'Dinner', rule: 'every' }, { key: 'other', label: SG, rule: 'weekdays' }] }, ['Mon 19 dinner ' + SN, 'Mon 19 dinner ' + SN2, 'Tue 20 ' + SG.toLowerCase() + ' ' + SN, 'Wed ' + SN2 + ' dinner', 'Thu 21 dinner ' + SN, 'Fri 23 dinner Ana and ' + SN]), { stamp: clips[0].match(/Plan checked (.*) by /)[1] }), { forName: SF, org: SO, needs: [{ key: 'dinner', label: 'Dinner' }, { key: 'other', label: SG }] }) && clips[0].startsWith('For: “' + M.unquote(SF) + '”\nStill open. Reply to me, not the group:\n• Mon Oct 19 “' + M.unquote(SG) + '”') && clips[0].endsWith('by “' + M.unquote(SO) + '”. Changes after this aren\'t here.'), clips[0]);
    const hand = await p.evaluate(() => document.querySelector('#cards .msg').textContent);
    ck(w + ' handoff note quoted and attributed (template), spoof marks neutralised inside the frame', hand.includes('Dinner note: “Ring" says "Police”') && hand.startsWith('Days for: “' + M.unquote(SN) + '”\nHelping: “' + M.unquote(SF) + '”\nFrom: “' + M.unquote(SO) + '”\n'), hand);
    await p.click('#b-link'); await sleep(120); const link = await p.$eval('#link', e => e.value);
    await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(250);
    a = await typedAudit(p, [SF, SO, SN, SN2, SG]);
    ck(w + ' typedAudit recipient view (spoof seeds): every typed value quoted, display form present', a.ok, a.hits);
    // URL cap: 28 days × long names -> the whole link would pass 2,000 chars -> no link, tooLongLink
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    const big = []; for (let d = 1; d <= 28; d++) for (const nm of ['Alexandria-Long', 'Bartholomew-Long']) big.push(`Oct ${d} dinner ${nm}${d}`);
    await form(p, { forName: 'f'.repeat(40), org: 'o'.repeat(24), first: '2026-10-01', last: '2026-10-28', needs: [{ key: 'dinner', rule: 'every' }], lines: big.slice(0, 60) });
    await check(p); await p.click('#b-link'); await sleep(120);
    t = await p.evaluate(() => ({ box: document.getElementById('link-box').hidden, msg: document.getElementById('link-long').textContent, toast: document.getElementById('toast').textContent, clip: window.__clip.length, hash: location.hash }));
    if (w === W[W.length - 1]) { const pdf = await p.pdf({ format: 'letter' }); const pages = pdfPages(pdf); ck(w + ' print: a full 28-day sheet fits one Letter page', pages === 1, pages); }
    ck(w + ' URL cap: a household sheet whose whole link would pass 2,000 chars gets no link; tooLongLink shown + toast; print still offered', t.box && t.msg === C.tooLongLink && t.toast === C.tooLongLink && t.clip === 0 && t.hash === '', t);
    // reset
    await p.click('#b-reset'); await sleep(150); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id), v: document.getElementById('f-plan').value + document.getElementById('f-for').value, toast: document.getElementById('toast').textContent, n: document.querySelectorAll('#n-dinner:checked').length }));
    ck(w + ' Start over (confirm): everything cleared, results gone, toast "Cleared."', t.on.join() === 's1' && t.v === '' && t.toast === C.resetDone && !t.n, t);
    ck(w + ' typed-audit session: no request off origin, no page errors', !netCheck(s.reqs, H, []).offending.length && !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }
  // ================= QA local-ea5aabe C1–C7 =================
  // C5/C6 wrap audit: nothing clipped or outside its patch, no text under 10px, a word (or hyphen part) that fits its box is never
  // broken mid-word, and a closing quote is never alone on a line.
  const wrapAudit = p => p.evaluate(() => { const out = { patches: 0, clipped: [], outside: [], small: [], midword: [], loneQuote: [] };
    for (const pt of document.querySelectorAll('#quilts .patch')) { out.patches++; const pr = pt.getBoundingClientRect();
      for (const e of pt.querySelectorAll('.d,.wd,.need,.who')) { const cs = getComputedStyle(e), tag = e.className + ':' + e.textContent.slice(0, 30); if (!e.getClientRects().length) continue;
        if (parseFloat(cs.fontSize) < 10) out.small.push(tag + ' ' + cs.fontSize); if (cs.display !== 'inline' && e.scrollWidth > e.clientWidth + 1) out.clipped.push(tag + ' w ' + [e.scrollWidth, e.clientWidth]);
        { let cl = null; for (let x = e; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).overflow !== 'visible') { cl = x; break; } const tr = document.createRange(); tr.selectNodeContents(e); const r = tr.getBoundingClientRect(), c = (cl || pt).getBoundingClientRect();
          if (r.width && (r.left < c.left - 1 || r.right > c.right + 1 || r.top < c.top - 1 || r.bottom > c.bottom + 1)) out.clipped.push(tag + ' text outside ' + (cl ? cl.className : 'patch')); }
        const er = e.getBoundingClientRect(); if (er.left < pr.left - .5 || er.right > pr.right + .5 || er.top < pr.top - .5 || er.bottom > pr.bottom + .5) out.outside.push(tag);
        if (e.matches('.d,.wd')) continue; const map = [], tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) for (let i = 0; i < n.data.length; i++) map.push([n, i]);
        const text = map.map(([n, i]) => n.data[i]).join(''), rg = (a, b) => { const r = document.createRange(); r.setStart(map[a][0], map[a][1]); r.setEnd(map[b - 1][0], map[b - 1][1] + 1); return r; }, box = e.clientWidth;
        const re = /[^\s-]+-?|-/g; let m; while ((m = re.exec(text))) { const rs = [...rg(m.index, m.index + m[0].length).getClientRects()].filter(r => r.width > 0), tops = new Set(rs.map(r => Math.round(r.top)));
          if (tops.size > 1) { const w = rs.reduce((x, r) => x + r.width, 0); if (w <= box + .5) out.midword.push({ t: m[0], w: Math.round(w), box, cls: e.className }); } }
        for (let i = 0; i < text.length; i++) if (text[i] === '\u201D') { const q = rg(i, i + 1).getClientRects()[0], pv = i ? rg(i - 1, i).getClientRects()[0] : null; if (!pv || Math.round(pv.top) !== Math.round(q.top)) out.loneQuote.push(text); } } }
    out.ok = out.patches > 0 && !out.clipped.length && !out.outside.length && !out.small.length && !out.midword.length && !out.loneQuote.length; return out; });
  {
    // C6: the worked example at 320/390 (double patch "Carla" + "Dev"), QA's stress names; C5: Other labels at 1280/1440
    for (const w of [320, 390, 1280, 1440]) {
      const s = await session(H, IP), { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      await form(p, Object.assign({}, JESS, { lines: PLAN })); await check(p); let a = await wrapAudit(p);
      const carla = await p.evaluate(() => { const e = [...document.querySelectorAll('#quilts .patch.dbl .who .mill-typed')].find(x => x.textContent === '\u201CCarla\u201D'); return e ? new Set([...e.getClientRects()].map(r => Math.round(r.top))).size : -1; });
      ck(w + ' QA C6 worked example: "Carla" (double patch) on one line, closing quote never alone, nothing clipped, text >= 10px', a.ok && carla === 1, { a, carla });
      for (const label of ['Groceries', 'Groceries-Pharm', 'Pharmacyerrands1', 'Meds pickup']) {
        await p.reload({ waitUntil: 'load' }); await sleep(150);
        await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'other', label, rule: 'every' }],
          lines: ['Mon 19 dinner Bartholomew-Alexandra', 'Mon 19 dinner Maximiliana Featherstonehaugh', 'Tue 20 ' + label.toLowerCase() + ' Carla', 'Tue 20 ' + label.toLowerCase() + ' Dev', 'Wed 21 dinner Ana'] });
        await check(p); a = await wrapAudit(p);
        ck(w + ` QA C5/C6 Other need "${label}" + stress names: nothing clipped, wrap at spaces then hyphens, mid-word only when one word can't fit, no lone quote, >= 10px`, a.ok, a);
      }
      // wrap sweep: random names (3-40 chars, spaces, hyphens, accents) and random Other labels
      const R = (seed => () => { seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; })(w);
      const word = k => { let o = 'ABCDEFGHJKLMNOPRSTWZ'[Math.floor(R() * 20)]; while (o.length < k) o += 'aeioubcdfghklmnprstvwyéøü'[Math.floor(R() * 25)]; return o; };
      const rname = () => { const L = 3 + Math.floor(R() * 38); let o = word(Math.min(L, 2 + Math.floor(R() * 16))); while (o.length < L - 2) o += (R() < .3 ? '-' : ' ') + word(Math.min(L - o.length - 1, 2 + Math.floor(R() * 16))); return o.slice(0, 40).replace(/[- ]+$/, ''); };
      let bad = [], seen = 0;
      for (let round = 0; round < 3; round++) { await p.reload({ waitUntil: 'load' }); await sleep(120); const label = rname().slice(0, 16).replace(/[- ]+$/, '').replace(/ +/g, ' '), names = Array.from({ length: 8 }, rname);
        const lines = names.map((nm, i) => `Oct ${19 + i % 7} ${i % 3 ? 'dinner' : label.toLowerCase()} ${nm}`).concat([`Oct 19 dinner ${names[0]}2`]);
        await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'other', label, rule: 'every' }], lines }); await check(p);
        const placed = (await p.evaluate(() => document.querySelectorAll('#quilts .patch.taken,#quilts .patch.dbl').length)); a = await wrapAudit(p); seen += a.patches; if (!a.ok || !placed) bad.push({ label, names, a, placed }); }
      ck(w + ` QA C5/C6 wrap sweep: 3 rounds of random names/Other labels, every patch passes the wrap audit`, !bad.length && seen > 0, bad.slice(0, 2));
      ck(w + ' wrap session: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
    }
  }
  {
    // C2: print never carries an old sheet over (Start over / Make my own rota / damaged link in the same tab); C3/C7 tags in the UI
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 1280, height: 900 }); await p.evaluateOnNewDocument(clipStub); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    const printed = async () => { await p.emulateMediaType('print'); const r = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.id),
      rows: document.querySelectorAll('#sheet-t tbody tr').length, head: document.getElementById('sheet-h').textContent + document.getElementById('stamp-4').textContent, has: document.body.classList.contains('has-sheet') }));
      await p.emulateMediaType(null); const txt = require('child_process').execFileSync('pdftotext', ['-', '-'], { input: await p.pdf({ format: 'letter' }) }).toString(); r.pdfHasSheet = /Jess|Priya/.test(txt); return r; };
    const gone = r => !r.on.includes('s4') && !r.rows && !r.head && !r.has && !r.pdfHasSheet;
    await form(p, Object.assign({}, JESS, { lines: FIXED })); await check(p); let before = await printed();
    await p.click('#b-reset'); await sleep(200); let after = await printed();
    ck('QA C2a print after Start over: the sheet printed before, now nothing of it (DOM and state cleared, PDF has no sheet)', before.on.join() === 's4' && before.rows === 7 && gone(after), { before, after });
    await form(p, Object.assign({}, JESS, { lines: FIXED })); await check(p); await p.click('#b-link'); await sleep(120); const link = await p.$eval('#link', e => e.value);
    await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(250); before = await printed();
    await p.click('#own'); await sleep(200); after = await printed();
    ck('QA C2b print after "Make my own rota": the received sheet printed, then nothing of it', before.on.join() === 's4' && before.rows === 7 && gone(after), { before, after });
    await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(250); before = await printed();
    await p.evaluate(f => { location.hash = f; }, link.split('#')[1].slice(0, -3) + 'zzz'); await sleep(250); after = await printed();
    const bad = await p.evaluate(() => !document.getElementById('bad').hidden && document.getElementById('bad-t').textContent);
    ck('QA C2c print after a damaged link in the same tab as a valid one: badLink shown, nothing of the old sheet printed', before.on.join() === 's4' && bad === C.badLink && gone(after), { before, after, bad });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const n41 = 'Q' + 'w'.repeat(40);
    await form(p, Object.assign({}, JESS, { lines: ['Mon 19 dinner ' + n41, 'Mon 19 walk Ana / Ben', 'Tue 20 dinner Ana or Ben', 'Wed 21 ride Ana\uFF06Ben', 'Fri 23 dinner Ana, Ben', 'May: 20 dinner', 'Thu 22 walk Orla'] })); await check(p);
    const st = await state(p);
    ck('QA C7 + C3 in the UI: the 41-char name -> to fix with Writer tagNameTooLong (N5b, max 40); "/", "or", "＆", "," -> tagTwoNames; May: and Orla placed',
      JSON.stringify(st.tags.filter(x => x.startsWith('To fix'))) === JSON.stringify([M.fill(C.tagNameTooLong, { line: 'Mon 19 dinner ' + n41, max: 40 })].concat(['Mon 19 walk Ana / Ben', 'Tue 20 dinner Ana or Ben', 'Wed 21 ride Ana\uFF06Ben', 'Fri 23 dinner Ana, Ben'].map(l => M.fill(C.tagTwoNames, { line: l }))))
      && st.patches.some(x => /Oct 20.*Dinner.*May/.test(x)) && st.patches.some(x => /Oct 22.*Dog walk.*Orla/.test(x)) && !st.patches.some(x => /Ben|Qwww/.test(x)), st);
    ck('C2/C3/C7 session: no page errors, no off-origin requests', !errsOf(s, SCHEME).length && !netCheck(s.reqs, H, []).offending.length, errsOf(s, SCHEME)); await s.b.close();
  }
  {
    // QA local-e5780b7 C8: a wide-glyph 16-char Other label must never widen the page (305 = 320 minus a classic scrollbar, 320, 390)
    const s = await session(H, IP), { p } = s; const bad = []; let runs = 0;
    for (const w of [305, 320, 390]) for (const label of ['WWWWWWWWWWWWWWWW', 'MMMMMMMMMMMMMMMM', 'WMWmWMwMWMWmWMWM', 'Wheelchair-Washs', 'MW WM-MWMW WMWMW']) {
      await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(120);
      await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'other', label, rule: 'every' }], lines: ['Mon 19 dinner Ana'] }); await check(p);
      const r = await p.evaluate(() => { const iw = innerWidth, out = { sw: document.documentElement.scrollWidth, iw, clipped: [], small: [] };
        const inView = e => { const rg = document.createRange(); rg.selectNodeContents(e); const b = rg.getBoundingClientRect(); return !b.width || (b.left >= -.5 && b.right <= iw + .5); };
        const targets = [document.querySelector('.qgrid'), ...document.querySelectorAll('.qgrid .patch .need, .qgrid .patch .who, .qgrid .patch .d, #tags .tag p, #stamp-2, #tally')];
        for (const e of targets) { if (!e || !e.getClientRects().length) continue; const b = e.getBoundingClientRect(); if (b.left < -.5 || b.right > iw + .5 || !inView(e) || (getComputedStyle(e).display !== 'inline' && e.scrollWidth > e.clientWidth + 1)) out.clipped.push((e.id || e.className) + ':' + e.textContent.slice(0, 40));
          if (parseFloat(getComputedStyle(e).fontSize) < 10) out.small.push(e.className); }
        out.gapTags = [...document.querySelectorAll('#tags .tag p')].filter(e => /^Gap:/.test(e.textContent)).length; out.stamp = document.getElementById('stamp-2').textContent;
        return out; }); runs++;
      if (!(r.sw <= r.iw && !r.clipped.length && !r.small.length && r.gapTags >= 7 && /^Plan checked/.test(r.stamp))) bad.push(Object.assign({ w, label }, r)); }
    ck('QA C8: Other label W×16, M×16, mixed, hyphenated and spaced at 305/320/390: document.scrollWidth <= innerWidth; grid, patches, GAP tags and "Plan checked" fully in view and unclipped; nothing under 10px', !bad.length && runs === 15, bad.slice(0, 3));
    const a = await wrapAudit(p); ck('QA C8: the W×16 / mixed grid at 390 still passes the PM wrap audit (mid-word only when one word cannot fit)', a.ok, a);
    ck('C8 session: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  {
    // PM C9 (03:48): half-spaced joiner glued to a capitalised name -> To fix (Writer tagTwoNames, line quoted); look-alikes stay placed
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const L = ['Mon 19 dinner Ana orBen', 'Tue 20 dinner Ana andBen', 'Wed 21 dinner Anaor Ben', 'Thu 22 dinner AnaorBen', 'Fri 23 dinner Ana orben', 'Mon 19 walk Igor', 'Tue 20 walk Leonor', 'Wed 21 walk Corey', 'Thu 22 walk Andrea', 'Fri 23 walk Orla', 'Wed 21 ride Brandon', 'Sun 25 dinner Sandra'];
    await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'every' }], lines: L }); await check(p);
    const st = await state(p), fx = st.tags.filter(x => x.startsWith('To fix')), want = [L[0], L[1]].map(l => M.fill(C.tagTwoNames, { line: l }));
    const placedAs = ['Anaor Ben', 'AnaorBen', 'Ana orben', 'Igor', 'Leonor', 'Corey', 'Andrea', 'Orla', 'Brandon', 'Sandra'].every(nm => st.patches.some(x => x.endsWith('“' + nm + '”')));
    ck('PM C9 in the UI: "Ana orBen" / "Ana andBen" -> To fix with Writer tagTwoNames (line quoted), never placed; "Anaor Ben", "AnaorBen", "Ana orben", Igor, Leonor, Corey, Andrea, Orla, Brandon, Sandra placed as single helpers',
      JSON.stringify(fx) === JSON.stringify(want) && fx[0] === 'To fix: “Mon 19 dinner Ana orBen” has more than one name. One person per line.' && placedAs && !st.patches.some(x => / orBen| andBen/.test(x)), { fx, patches: st.patches });
    ck('C9 session: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  {
    // QA C10 + PM 04:38: all-caps surnames and Or/OR/And/AND spellings are one helper; only lowercase or|and + uppercase is a joiner
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 1280, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const NM = ['Mary ANDERSON', 'Ana ORLANDO', 'ANA ORTIZ', 'JO ORR', 'SAM ANDREWS', 'Ana ORBen', 'Ana OrBen'], D = ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'];
    const L = NM.map((nm, i) => D[i] + ' dinner ' + nm).concat(['Mon 19 walk Ana orBen', 'Tue 20 walk Ana andBen', 'Wed 21 walk Igor', 'Thu 22 walk Leonor', 'Fri 23 walk Corey', 'Sat 24 walk Andrea']);
    await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'walk', rule: 'every' }], lines: L }); await check(p);
    const st = await state(p), fx = st.tags.filter(x => x.startsWith('To fix'));
    const placed = NM.concat(['Igor', 'Leonor', 'Corey', 'Andrea']).every(nm => st.patches.some(x => x.endsWith('“' + nm + '”')));
    ck('QA C10: Mary ANDERSON, Ana ORLANDO, ANA ORTIZ, JO ORR, SAM ANDREWS (and Ana ORBen / Ana OrBen, Igor, Leonor, Corey, Andrea) placed as single helpers; only "Ana orBen" / "Ana andBen" -> To fix (Writer tagTwoNames)',
      placed && JSON.stringify(fx) === JSON.stringify(['Mon 19 walk Ana orBen', 'Tue 20 walk Ana andBen'].map(l => M.fill(C.tagTwoNames, { line: l }))), { fx, patches: st.patches });
    ck('C10 session: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  {
    // C1: the WHOLE URL is capped at 2,000, made side and received side, at 1999 / 2000 / 2001 chars, via a long path on a local
    // throwaway server (nested dirs + a symlink to the repo). Date.now frozen so the made fragment is stable.
    const os = require('os'), path = require('path'), { spawn } = require('child_process'), REPO = path.resolve(__dirname, '../..');
    const root = fs.mkdtempSync(os.tmpdir() + '/cr-long-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
    const ORIGIN = 'http://127.0.0.1:' + port; let tag = 0;
    const pathOf = total => { let left = total - 1 - '/mill/care-rota/'.length; const segs = []; tag++;
      while (left > 0) { let k = left > 200 ? (left === 201 ? 199 : 200) : left; left -= k; if (left) left -= 1; segs.push(segs.length ? 'a'.repeat(k) : ('t' + tag + '_' + 'a'.repeat(k)).slice(0, k)); }
      let dir = root; segs.slice(0, -1).forEach(x => { dir = path.join(dir, x); fs.mkdirSync(dir, { recursive: true }); }); fs.symlinkSync(REPO, path.join(dir, segs[segs.length - 1]));
      const P = '/' + segs.join('/') + '/mill/care-rota/'; if (P.length !== total) throw new Error('path ' + P.length + ' != ' + total); return P; };
    const T0 = Date.UTC(2026, 9, 17, 17, 4);
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 1280, height: 900 }); await p.evaluateOnNewDocument(clipStub); await p.evaluateOnNewDocument(t => { Date.now = () => t; }, T0);
    const SMALL = { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-19', needs: [{ key: 'dinner', rule: 'every' }], lines: ['Mon 19 dinner Ana'] };
    const makeAt = async P => { await p.goto(ORIGIN + P, { waitUntil: 'load' }); await sleep(200); await form(p, SMALL); await check(p); await p.click('#b-link'); await sleep(150);
      return p.evaluate(() => ({ box: !document.getElementById('link-box').hidden, link: document.getElementById('link').value, long: document.getElementById('link-long').textContent })); };
    const openAt = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(250);
      return p.evaluate(() => ({ sheet: getComputedStyle(document.getElementById('s4')).display !== 'none' && document.querySelectorAll('#sheet-t tbody tr').length, bad: !document.getElementById('bad').hidden && document.getElementById('bad-t').textContent, len: location.href.length })); };
    const probe = await makeAt(pathOf(60)); const frag = probe.link.split('#')[1]; const made = {}, recv = {};
    for (const total of [1999, 2000, 2001]) {
      const P = pathOf(total - ORIGIN.length - 1 - frag.length), m = await makeAt(P); made[total] = { box: m.box, len: m.link.length, long: m.long === C.tooLongLink };
      if (m.box) made[total].reopened = await openAt(m.link);
      // received side: a valid fragment (from the app) on a long path; and a long-path variant of the 120-day-ish real sheet
      const R2 = pathOf(total - ORIGIN.length - 1 - frag.length); recv[total] = await openAt(ORIGIN + R2 + '#' + frag);
    }
    // received side with a fragment well inside cr.js's own cap but a path long enough to push the WHOLE URL over (the QA case)
    const r = CR.check({ forName: 'Priya', org: 'Jess', first: '2026-10-01', last: '2026-10-28', needs: [{ key: 'dinner', label: 'Dinner', rule: 'every', days: [] }] }, Array.from({ length: 28 }, (_, i) => `Oct ${i + 1} dinner Helper${i}`)); r.stamp = 'Sat Oct 17, 10:04 AM PDT';
    const big = CR.encodeSheet(r, { forName: 'Priya', org: 'Jess', first: '2026-10-01', last: '2026-10-28' }); const bigOver = await openAt(ORIGIN + pathOf(2001 - ORIGIN.length - 1 - big.length) + '#' + big), bigAt = await openAt(ORIGIN + pathOf(2000 - ORIGIN.length - 1 - big.length) + '#' + big);
    ck('QA C1 made side: whole link 1999 and 2000 -> link made with exactly that length and the app accepts it; 2001 -> no link, tooLongLink',
      made[1999].box && made[1999].len === 1999 && made[1999].reopened.sheet === 1 && made[2000].box && made[2000].len === 2000 && made[2000].reopened.sheet === 1 && !made[2001].box && made[2001].long, made);
    ck('QA C1 received side: whole URL 1999 and 2000 open the sheet; 2001 (long path) -> badLink, nothing shown', recv[1999].sheet === 1 && recv[1999].len === 1999 && recv[2000].sheet === 1 && recv[2000].len === 2000 && !recv[2001].sheet && recv[2001].bad === C.badLink && recv[2001].len === 2001, recv);
    ck('QA C1 received side, long real sheet (fragment ' + big.length + ' chars, under cr.js\'s own cap): 2000 opens, 2001 refused', bigAt.sheet === 28 && bigAt.len === 2000 && !bigOver.sheet && bigOver.bad === C.badLink && bigOver.len === 2001, { bigAt, bigOver });
    await s.b.close(); srv.kill(); fs.rmSync(root, { recursive: true, force: true });
  }
  process.exit(result(rows));
})();
