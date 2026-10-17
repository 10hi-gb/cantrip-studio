// node tests/browser/mill-care-rota.qa.js <host[:port]> <ip> [scheme] — Care Rota r1c @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Worked example (Jess / Priya & Sam), the build rules (two needs / "and" between names -> to fix, never placed), the stamp on
// all four outputs incl. copied text (zone label, PDT and PST), Nov 1 2026 DST range, per-helper notes, set-aside pocket,
// reading table, print (sheet only), the household-sheet-only link (warning, 2,000-char origin+path+fragment cap, malformed/old links),
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
    ck(w + ' link: made with the shared linkFor (origin+path+fragment ≤ 2,000), copied, address bar untouched; carries only the household sheet (no notes, no plan lines)', t.v.startsWith(BASE + '#cr2.') && t.v.length <= 2000 && t.clip === t.v && t.hash === '' && dec.ok && dec.data.sheet.length === 7 && !/nuts|Pediatrician|harness|walk Fatima|dinner Ana/.test(raw) && Object.keys(JSON.parse(raw)).sort().join() === 'a,b,d,f,o,s', { v: t.v.length, raw });
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
    // URL cap: 28 days × long names -> origin+path+fragment would pass 2,000 chars -> no link, tooLongLink
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    const big = []; for (let d = 1; d <= 28; d++) for (const nm of ['Alexandria-Long', 'Bartholomew-Long']) big.push(`Oct ${d} dinner ${nm}${d}`);
    await form(p, { forName: 'f'.repeat(40), org: 'o'.repeat(24), first: '2026-10-01', last: '2026-10-28', needs: [{ key: 'dinner', rule: 'every' }], lines: big.slice(0, 60) });
    await check(p); await p.click('#b-link'); await sleep(120);
    t = await p.evaluate(() => ({ box: document.getElementById('link-box').hidden, msg: document.getElementById('link-long').textContent, toast: document.getElementById('toast').textContent, clip: window.__clip.length, hash: location.hash }));
    if (w === W[W.length - 1]) { const pdf = await p.pdf({ format: 'letter' }); const pages = pdfPages(pdf); ck(w + ' print: a full 28-day sheet fits one Letter page', pages === 1, pages); }
    ck(w + ' URL cap: a household sheet whose origin+path+fragment would pass 2,000 chars gets no link; tooLongLink shown + toast; print still offered', t.box && t.msg === C.tooLongLink && t.toast === C.tooLongLink && t.clip === 0 && t.hash === '', t);
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
        const text = map.map(([n, i]) => n.data[i]).join(''), rg = (a, b) => { const r = document.createRange(); r.setStart(map[a][0], map[a][1]); r.setEnd(map[b - 1][0], map[b - 1][1] + 1); return r; }, box = e.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); // exact box, not the rounded clientWidth
        const re = /[^\s-]+-?|-/g; let m; while ((m = re.exec(text))) { const rs = [...rg(m.index, m.index + m[0].length).getClientRects()].filter(r => r.width > 0), tops = new Set(rs.map(r => Math.round(r.top)));
          if (tops.size > 1) { const w = rs.reduce((x, r) => x + r.width, 0); if (w <= box + .05) out.midword.push({ t: m[0], w: Math.round(w * 100) / 100, box: Math.round(box * 100) / 100, cls: e.className }); } }
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
    // C1: origin+path+fragment is capped at 2,000, made side and received side, at 1999 / 2000 / 2001 chars, via a long path on a local
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
    // received side with a fragment well inside cr.js's own cap but a path long enough to push origin+path+fragment over (the QA case)
    const r = CR.check({ forName: 'Priya', org: 'Jess', first: '2026-10-01', last: '2026-10-28', needs: [{ key: 'dinner', label: 'Dinner', rule: 'every', days: [] }] }, Array.from({ length: 28 }, (_, i) => `Oct ${i + 1} dinner Helper${i}`)); r.stamp = 'Sat Oct 17, 10:04 AM PDT';
    const big = CR.encodeSheet(r, { forName: 'Priya', org: 'Jess', first: '2026-10-01', last: '2026-10-28' }); const bigOver = await openAt(ORIGIN + pathOf(2001 - ORIGIN.length - 1 - big.length) + '#' + big), bigAt = await openAt(ORIGIN + pathOf(2000 - ORIGIN.length - 1 - big.length) + '#' + big);
    ck('QA C1 made side: origin+path+fragment 1999 and 2000 -> link made with exactly that length and the app accepts it; 2001 -> no link, tooLongLink',
      made[1999].box && made[1999].len === 1999 && made[1999].reopened.sheet === 1 && made[2000].box && made[2000].len === 2000 && made[2000].reopened.sheet === 1 && !made[2001].box && made[2001].long, made);
    ck('QA C1 received side: origin+path+fragment 1999 and 2000 open the sheet; 2001 (long path) -> badLink, nothing shown', recv[1999].sheet === 1 && recv[1999].len === 1999 && recv[2000].sheet === 1 && recv[2000].len === 2000 && !recv[2001].sheet && recv[2001].bad === C.badLink && recv[2001].len === 2001, recv);
    ck('QA C1 received side, long real sheet (fragment ' + big.length + ' chars, under cr.js\'s own cap): 2000 opens, 2001 refused', bigAt.sheet === 28 && bigAt.len === 2000 && !bigOver.sheet && bigOver.bad === C.badLink && bigOver.len === 2001, { bigAt, bigOver });
    await s.b.close(); srv.kill(); fs.rmSync(root, { recursive: true, force: true });
  }
  // PM 04:30 query-string ruling: the 2,000 cap covers origin + path + '#' + fragment and an appended ?query is ignored. Links this piece generates carry
  // no '?'; a received link with ?q=<marker> appended (normal path, and a 2,002-char total on a long path = 2,002 minus the query without it) opens, and the
  // marker appears nowhere: page text, markup/accessible names, field values, copied/shared/printed text, or any link generated onward.
  { const fsq = require('fs'), osq = require('os'), pathq = require('path'), { spawn: spawnq } = require('child_process'), REPOQ = pathq.resolve(__dirname, '../..');
    const QM = 'Qzmk7x', QQ = '?q=' + QM, PATHQ = '/mill/care-rota/';
    const stubQ = () => { window.__q = []; const push = (k, v) => window.__q.push(k + ':' + (typeof v === 'string' ? v : JSON.stringify(v)));
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { push('clip', t); return Promise.resolve(); }, write: () => Promise.resolve() } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: d => { push('share', d); return Promise.resolve(); } });
      document.execCommand = function (c) { const a = document.activeElement; push('exec-' + c, String(getSelection()) || (a && a.value) || ''); return true; };
      window.print = () => push('print', document.body.innerText); window.confirm = () => true; };
    const scanQ = M => { const a = []; document.querySelectorAll('*').forEach(e => { for (const n of e.getAttributeNames()) if ((e.getAttribute(n) || '').includes(M)) a.push(e.tagName + '@' + n); });
      const vals = [...document.querySelectorAll('input,textarea,select')].filter(e => String(e.value).includes(M)).map(e => e.id);
      const outs = (window.__q || []).slice(), links = [...document.querySelectorAll('input,textarea')].map(e => e.value).filter(v => /^https?:\/\//.test(v));
      return { hit: document.body.innerText.includes(M) || document.documentElement.outerHTML.includes(M) || document.title.includes(M) || a.length > 0 || vals.length > 0 || outs.some(x => x.includes(M)), outs, links }; };
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.evaluateOnNewDocument(stubQ);
    const runQ = async (url, see, pre, steps) => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(350);
      const r = { len: url.length, lenNoQ: url.replace(/\?[^#]*/, '').length, opened: see ? await p.evaluate(see => document.body.innerText.includes(see), see) : true }; const a = await p.evaluate(scanQ, QM);
      if (pre) await pre(p);
      for (const sel of steps) { const ok = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.disabled) return false; const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false; e.click(); return true; }, sel); if (ok) await sleep(250); }
      const n = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const t = (b.textContent + ' ' + (b.getAttribute('aria-label') || '')).toLowerCase(), r = b.getBoundingClientRect(); return r.width && r.height && !b.disabled && /link|share|send|copy|reply|print/.test(t) && !/reset|start over|clear/.test(t); }).map((b, i) => (b.dataset.qq = 'g' + i)).length);
      for (let i = 0; i < n; i++) { await p.evaluate(i => { const b = document.querySelector('[data-qq="g' + i + '"]'); if (b && !b.disabled) b.click(); }, i); await sleep(200); }
      const z = await p.evaluate(scanQ, QM); r.mark = a.hit || z.hit; r.gen = [...new Set(z.outs.concat(z.links).map(x => (x.match(/https?:\/\/[^\s"]+/) || [''])[0]).filter(Boolean))]; r.genQ = r.gen.some(u => u.includes('?')); return r; };
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); const fq = await p.evaluate(() => { const cfg = { forName: 'Zqv', org: 'Jess', first: '2026-10-01', last: '2026-10-07' }; const r = CR.check(Object.assign({ needs: [{ key: 'dinner', label: 'Dinner', rule: 'every', days: [] }] }, cfg), Array.from({ length: 7 }, (_, i) => `Oct ${i + 1} dinner Helper${i}`)); r.stamp = 'Sat Oct 17, 10:04 AM PDT'; return CR.encodeSheet(r, cfg); });
    const SEE = 'Zqv', PRE = null, STEPS = [], SEND = async p => { await typeInto(p, '#f-for', 'Zqv'); await typeInto(p, '#f-org', 'Jess'); for (const [id, v] of [['f-first', '2026-10-19'], ['f-last', '2026-10-20']]) await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v); if (!(await p.$eval('#n-dinner', e => e.checked))) await p.click('#n-dinner'); await p.select('#r-dinner', 'every'); await p.$eval('#f-plan', e => { e.value = 'Oct 19 dinner Ana\nOct 20 dinner Bo'; }); await p.click('#b-check'); await sleep(300); };
    const snd = await runQ(BASE + QQ, null, SEND, []), rcv = await runQ(BASE + QQ + '#' + fq, SEE, PRE, STEPS);
    const rootq = fsq.mkdtempSync(osq.tmpdir() + '/q-care-rota-'), srvq = spawnq('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', rootq], { stdio: ['ignore', 'pipe', 'pipe'] }); let l2002 = null;
    try { const lport = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; srvq.stdout.on('data', f); srvq.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
      const LO = 'http://127.0.0.1:' + lport, total = 2002 - QQ.length - LO.length - 1 - fq.length; let left = total - 1 - PATHQ.length; const segs = [];
      while (left > 0) { const k = left > 200 ? (left === 201 ? 199 : 200) : left; left -= k; if (left) left -= 1; segs.push(segs.length ? 'a'.repeat(k) : ('q_' + 'a'.repeat(k)).slice(0, k)); }
      let dir = rootq; segs.slice(0, -1).forEach(x => { dir = pathq.join(dir, x); fsq.mkdirSync(dir, { recursive: true }); }); fsq.symlinkSync(REPOQ, pathq.join(dir, segs[segs.length - 1]));
      l2002 = await runQ(LO + '/' + segs.join('/') + PATHQ + QQ + '#' + fq, SEE, PRE, STEPS); } finally { srvq.kill(); }
    const gen = snd.gen.concat(rcv.gen, l2002.gen);
    ck('query ruling: links this piece generates carry no "?" (' + gen.length + ' generated: sender ' + snd.gen.length + ', from a received ?q= link ' + rcv.gen.length + ', 2,002 long path ' + l2002.gen.length + ')', gen.length > 0 && !gen.some(u => u.includes('?')), gen);
    ck('query ruling: sender page opened with ?q=<marker>: marker nowhere (text, names, values, copied/shared/printed text, links)', !snd.mark && !snd.genQ, snd);
    ck('query ruling: received link + ?q=<marker>, normal path: opens; marker nowhere; links generated onward carry no query', rcv.opened && !rcv.mark && !rcv.genQ, rcv);
    ck('query ruling: 2,002-char total incl. ?q=<marker> (long path; ' + l2002.lenNoQ + ' without the query, so within 2,000): opens; marker nowhere; no query onward', l2002.len === 2002 && l2002.lenNoQ <= 2000 && l2002.opened && !l2002.mark && !l2002.genQ, l2002);
    ck('query ruling: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // ================= QA local-cde64e3 C11–C14 + PM 04:57/05:15 query strip =================
  // C11: every visible text run has at least 4.5:1 against the rendered pixels under its glyphs (pattern, stripes, dots and stitching included):
  // shot A as rendered, shot B with all text made transparent (CSSOM; the CSP blocks a <style>); glyph pixels = where A and B differ; each one's
  // background pixel in B is compared with the text colour. Organizer (all four needs, a double, gaps, not-needed) and recipient, 320/390/1280.
  const pxContrast = async (p) => {
    const items = await p.evaluate(() => { const out = [], sx = scrollX, sy = scrollY, wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = wk.nextNode(); n; n = wk.nextNode()) { if (!n.nodeValue.trim()) continue; const e = n.parentElement; if (!e || e.closest('script,style,noscript,option,select,textarea,[hidden]')) continue;
        const cs = getComputedStyle(e); if (cs.visibility !== 'visible') continue; const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/.exec(cs.color); if (!m || (m[4] != null && +m[4] < 0.99)) continue;
        const rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 4).map(r => [r.left + sx, r.top + sy, r.right + sx, r.bottom + sy]); if (!rs.length) continue;
        out.push({ t: n.nodeValue.trim().slice(0, 40), cls: String(e.className || e.tagName).slice(0, 30), c: [+m[1], +m[2], +m[3]], rs }); }
      return out; });
    const a64 = await p.screenshot({ fullPage: true, encoding: 'base64' });
    await p.evaluate(() => { window.__pxc = []; document.querySelectorAll('*').forEach(e => { if (!e.style) return; window.__pxc.push([e, e.style.getPropertyValue('color'), e.style.getPropertyPriority('color')]);
      for (const [k, v] of [['color', 'transparent'], ['-webkit-text-fill-color', 'transparent'], ['text-shadow', 'none'], ['caret-color', 'transparent'], ['animation', 'none']]) e.style.setProperty(k, v, 'important'); }); });
    await sleep(120); const b64 = await p.screenshot({ fullPage: true, encoding: 'base64' });
    await p.evaluate(() => { for (const [e, c, cp] of window.__pxc) { ['-webkit-text-fill-color', 'text-shadow', 'caret-color', 'animation'].forEach(k => e.style.removeProperty(k)); c ? e.style.setProperty('color', c, cp) : e.style.removeProperty('color'); } delete window.__pxc; });
    return p.evaluate(async (a64, b64, items) => {
      const px = async s => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return { w: cv.width, h: cv.height, D: g.getImageData(0, 0, cv.width, cv.height).data }; };
      const B = await px(b64), A = (await px(a64)).D, D = B.D, lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      const res = []; for (const it of items) { const lt = L(...it.c); let worst = 99, n = 0;
        for (const [x0, y0, x1, y1] of it.rs) for (let y = Math.max(0, Math.floor(y0)); y < Math.min(B.h, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(B.w, Math.ceil(x1)); x++) { const k = (y * B.w + x) * 4;
          if (Math.abs(A[k] - D[k]) + Math.abs(A[k + 1] - D[k + 1]) + Math.abs(A[k + 2] - D[k + 2]) < 24) continue; const lb = L(D[k], D[k + 1], D[k + 2]), c = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); n++; if (c < worst) worst = c; }
        if (n) res.push({ t: it.t, cls: it.cls, worst: Math.round(worst * 100) / 100, n }); }
      return res; }, a64, b64, items); };
  { const s = await session(H, IP); const { p } = s; await p.evaluateOnNewDocument(clipStub);
    const CT = { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'weekdays' }, { key: 'other', rule: 'every', label: 'Meds' }],
      lines: ['Mon 19 dinner Ana', 'Mon 19 ride Ben', 'Tue 20 walk Carla', 'Wed 21 meds Dev', 'Thu 22 dinner Ellie', 'Thu 22 dinner Fatima', 'Fri 23 ride Gus', 'Sat 24 dinner MWMWMWMWMW', 'Thu 30 dinner Ana', 'Mon 19 dinner and walk Ana'] };
    for (const w of [320, 390, 1280]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await form(p, CT); await check(p); await sleep(800);
      const org = await pxContrast(p), obad = org.filter(x => x.worst < 4.5), seen = k => org.some(x => x.cls.includes(k));
      ck(w + ' QA C11 organizer: every text run ≥ 4.5:1 against the rendered pixels under its glyphs (Dinner/Ride/Walk/Other squares, double, gaps, chips, header, footer, separators)', org.length > 200 && !obad.length && seen('need') && seen('mill-typed') && seen('chip') && seen('studio') && seen('privacy') && seen('cr-sep'), { n: org.length, bad: obad.slice(0, 12) });
      await p.click('#b-link'); await sleep(200); const lk = await p.$eval('#link', e => e.value); await p.goto('about:blank'); await p.goto(lk, { waitUntil: 'load' }); await sleep(700);
      const rc = await pxContrast(p), rbad = rc.filter(x => x.worst < 4.5);
      ck(w + ' QA C11 recipient sheet: every text run ≥ 4.5:1 against the rendered pixels under its glyphs', rc.length > 20 && !rbad.length && await p.evaluate(() => !document.getElementById('recv').hidden), { n: rc.length, bad: rbad.slice(0, 12) }); }
    ck('QA C11: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // C12: the "Copy the message for “<name>”" button wraps a long one-word name inside its card (min-width:0 + break-word, the C8 pattern):
  // 305/320/390, 26/36/40-letter plain names and wide-letter names; document scrollWidth ≤ innerWidth, the button inside its card, its label inside the button.
  { const s = await session(H, IP); const { p } = s; await p.evaluateOnNewDocument(clipStub); const AZ = 'Abcdefghijklmnopqrstuvwxyzabcdefghijklmn', out = [];
    const NAMES = [AZ.slice(0, 26), AZ.slice(0, 36), AZ, 'M'.repeat(16), 'M'.repeat(20), 'W'.repeat(24), 'MWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMW'];
    for (const w of [305, 320, 390]) { await p.setViewport({ width: w, height: 900 }); for (const nm of NAMES) { await p.goto(BASE, { waitUntil: 'load' }); await sleep(120);
      await form(p, { forName: 'Q', org: 'Jo', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }], lines: ['Mon 19 dinner ' + nm] }); await check(p);
      const r = await p.evaluate(nm => { const b = [...document.querySelectorAll('#cards .hcard button')].find(x => x.textContent.includes(nm)), c = b && b.closest('.hcard'), bb = b && b.getBoundingClientRect(), cb = c && c.getBoundingClientRect();
        return { found: !!b, sw: document.documentElement.scrollWidth, iw: innerWidth, inCard: !!b && bb.left >= cb.left - 0.5 && bb.right <= cb.right + 0.5, label: !!b && b.scrollWidth <= b.clientWidth + 1, lines: b ? Math.round(bb.height / parseFloat(getComputedStyle(b).lineHeight)) : 0 }; }, nm);
      out.push(Object.assign({ w, len: nm.length, nm: nm.slice(0, 6) }, r)); } }
    ck('QA C12: copy-message button wraps long one-word names in its card at 305/320/390 (26/36/40 plain, M×16/20, W×24, MW×20): no sideways scroll, button inside card, label inside button', out.length === 21 && out.every(x => x.found && x.sw <= x.iw && x.inCard && x.label), out.filter(x => !(x.found && x.sw <= x.iw && x.inCard && x.label)));
    ck('QA C12: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // C13: QA's max organizer plan in the widest letters (set A: who-for W×40, organizer W×24, Oct 1–28, four needs every day, 60 lines) prints on ONE
  // Letter page, closing "Plans can change…" line included; and set B (hyphens, emoji/flags/ZWJ, RTL, CJK) too.
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 1280, height: 900 }); const res = {};
    const SETS = { A: { for: 'W'.repeat(40), org: 'W'.repeat(24), other: 'MWMWMWMWMWMWMWMW', names: ['W'.repeat(16), 'Supercalifragilisticexpialidociousnessxy', 'Wolfeschlegelsteinhausen', 'WWWWWWWWWWWWWWWW WWWWWWWWWWWWWWWW', 'M'.repeat(40), 'Wolfeschlegelsteinhausen Wolfeschlegel', 'WMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWMWM'] },
      B: { for: 'Featherstonehaugh-Smythe-Montgomery-Jo', org: 'محمد عبد الرحمن', other: 'Groceries-Pharm1', names: ['Featherstonehaugh-Smythe-Montgomery-Jo', 'Anne-Marie Sophia-Louise de la Croix', '🇺🇦🇯🇵🇧🇷🇮🇳🇳🇬🇲🇽 Ana', '👩‍👩‍👧‍👦👨‍👨‍👦 Familia', 'محمد عبد الرحمن الفاروق', 'שרה בת אברהם כהן', 'Ana محمد Ben', '王小明李华张伟', 'Zoë Ångström-Øberg', '😀'.repeat(20)] } };
    const plan = n => { const P = []; for (let d = 1; d <= 28; d++) P.push(`10/${d} dinner ${n[d % n.length]}`); for (let d = 1; d <= 14; d++) P.push(`10/${d} ride ${n[(d + 3) % n.length]}`); for (let d = 15; d <= 28; d++) P.push(`10/${d} walk ${n[(d + 5) % n.length]}`); for (let d = 1; d <= 4; d++) P.push(`10/${d} dinner ${n[(d + 1) % n.length]}`); return P; };
    for (const [k, S] of Object.entries(SETS)) { await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      await form(p, { forName: S.for, org: S.org, first: '2026-10-01', last: '2026-10-28', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'every' }, { key: 'other', rule: 'every', label: S.other }], lines: plan(S.names) }); await check(p);
      const pdf = await p.pdf({ format: 'letter', printBackground: true }), pages = pdfPages(pdf), txt = require('child_process').execFileSync('pdftotext', ['-', '-'], { input: pdf }).toString();
      res[k] = { pages, rows: await p.$$eval('#sheet-t tr', r => r.length), note: /Plans can change/.test(txt), stamp: /Plan checked/.test(txt) }; }
    ck('QA C13: max plan, widest letters (set A) and set B: the 28-day organizer sheet prints on one Letter page with its stamp and "Plans can change…" line', res.A.pages === 1 && res.B.pages === 1 && res.A.rows === 28 && res.A.note && res.B.note && res.A.stamp && res.B.stamp, res);
    await s.b.close(); }
  // C14: at 1280/1440 a quoted name of up to 10 graphemes stays on one line in every square type (Dinner, Ride, Walk, Other, double), never under 10px,
  // inside its square; wide letters (MWMWMWMWMW, WMWMWMWMWM), "Fatima", accented/emoji (ÅngströmØy, Renée😀Øyå). No sideways scroll.
  { const s = await session(H, IP); const { p } = s; const NM = ['Fatima', 'MWMWMWMWMW', 'ÅngströmØy', 'WMWMWMWMWM', 'Renée😀Øyå'], out = {};
    const days = ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'], lines = [];
    days.forEach((d, i) => { lines.push(d + ' dinner ' + NM[i % 5], d + ' ride ' + NM[(i + 1) % 5], d + ' walk ' + NM[(i + 2) % 5], d + ' meds ' + NM[(i + 3) % 5]); });
    lines.push('Mon 19 dinner WMWMWMWMWM', 'Tue 20 ride Fatima', 'Wed 21 meds MWMWMWMWMW'); // doubles: two names in one square
    for (const w of [1280, 1440]) { await p.setViewport({ width: w, height: 1000 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      await form(p, { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'every' }, { key: 'other', rule: 'every', label: 'Meds' }], lines }); await check(p); await sleep(300);
      out[w] = await p.evaluate(() => { const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' }), r = []; document.querySelectorAll('#quilts .patch .who .mill-typed').forEach(e => { const pt = e.closest('.patch'), cs = getComputedStyle(pt), rg = document.createRange(); rg.selectNodeContents(e);
          const tops = new Set([...rg.getClientRects()].filter(x => x.width > 0.5).map(x => Math.round(x.top))), pr = pt.getBoundingClientRect(), er = rg.getBoundingClientRect();
          r.push({ type: pt.className.replace(/patch |new/g, '').trim(), t: e.textContent, g: [...seg.segment(e.textContent)].length - 2, lines: tops.size, fs: parseFloat(getComputedStyle(e).fontSize), inside: er.left >= pr.left + parseFloat(cs.paddingLeft) - 0.5 && er.right <= pr.right - parseFloat(cs.paddingRight) + 0.5 }); });
        return { r, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; }); }
    const all = [1280, 1440].flatMap(w => out[w].r.map(x => Object.assign({ w }, x))), types = new Set(all.map(x => x.type)), bad = all.filter(x => x.g <= 10 && !(x.lines === 1 && x.fs >= 10 && x.inside));
    ck('QA C14: 1280/1440 week squares: every quoted name of ≤10 graphemes on one line, ≥10px, inside its square, in every square type (Dinner, Ride, Walk, Other, double); no sideways scroll', all.length >= 60 && !bad.length && ['taken meal', 'taken ride', 'taken walk', 'taken other', 'dbl'].every(t => types.has(t)) && [1280, 1440].every(w => out[w].sw <= out[w].cw) && all.some(x => /MWMW/.test(x.t)) && all.some(x => /😀/.test(x.t)),
      { n: all.length, types: [...types], bad: bad.slice(0, 10), sw: [out[1280].sw, out[1440].sw] });
    ck('QA C14: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // PM 04:57 / 05:15 query strip: load and hashchange leave path + #fragment, edit / Edit lines / reset / Make my own rota leave the path only; a ?query never
  // survives a step. For each ?q= (short; HTML/script with a visitor name; a 2,100-char pad): location.search is '', the marker is not in location.href or
  // the page text, location.hash is exactly as expected, and the made link carries no '?'.
  for (const [QN, QQ] of [['short', '?q=Qzcr57'], ['html+script with a visitor name', '?q=' + encodeURIComponent('<script>alert("Ana")</script><b onclick=x>Ana Qzcr57</b>')], ['2,100-char pad', '?q=Qzcr57' + 'p'.repeat(2100)]]) {
    const QM = 'Qzcr57', s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    const steps = [], at = async (step, did, exp) => { const l = await p.evaluate(M => ({ search: location.search, hash: location.hash, mark: location.href.includes(M) || document.body.innerText.includes(M) }), QM); steps.push(Object.assign({ step, did: did !== false, exp, hashOk: l.hash === exp }, l)); };
    const open = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(250); };
    await open(BASE + QQ); await at('load (organizer)', true, '');
    await form(p, Object.assign({}, JESS, { lines: [] })); await p.$eval('#f-plan', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, PLAN.join('\n')); await at('edit', true, '');
    await check(p); await at('check', await p.evaluate(() => document.getElementById('s2').classList.contains('on')), '');
    await p.click('#b-link'); await sleep(200); const lk = await p.$eval('#link', e => e.value), F = (lk.match(/#.*$/) || [''])[0]; await at('make link', /#cr2\./.test(lk) && !lk.includes('?'), '');
    await p.evaluate(Q => history.replaceState(null, '', location.pathname + Q), QQ); await p.click('#b-edit'); await sleep(100); await at('Edit lines (query put back first)', true, '');
    await p.evaluate(Q => history.replaceState(null, '', location.pathname + Q), QQ); await typeInto(p, '#f-org', 'Jessie'); await at('typing in the form (query put back first)', true, '');
    await p.evaluate(Q => history.replaceState(null, '', location.pathname + Q), QQ); await p.click('#b-reset'); await sleep(200); await at('reset (query put back first)', await p.$eval('#f-plan', e => e.value === ''), '');
    await open(BASE + QQ + F); await at('load received link', await p.evaluate(() => !document.getElementById('recv').hidden), F);
    const F2 = F.replace(/\.[^.]*$/, '.x'); await p.evaluate((Q, f) => { history.replaceState(null, '', location.pathname + Q + location.hash); location.hash = f; }, QQ, F2); await sleep(250); await at('hashchange (damaged link, query put back first)', await p.evaluate(() => !document.getElementById('bad').hidden), F2);
    await p.evaluate((Q, f) => { history.replaceState(null, '', location.pathname + Q + location.hash); location.hash = f; }, QQ, F); await sleep(250); await at('hashchange (valid link, query put back first)', await p.evaluate(() => !document.getElementById('recv').hidden), F);
    await p.evaluate(Q => history.replaceState(null, '', location.pathname + Q + location.hash), QQ); await p.click('#own'); await sleep(200); await at('Make my own rota (query put back first)', await p.evaluate(() => document.getElementById('recv').hidden && document.getElementById('s1').classList.contains('on')), '');
    ck('PM 04:57/05:15 query strip (' + QN + '): ' + steps.map(x => x.step).join(' -> ') + ': every step happened; location.search empty, no marker in location.href or page text, hash = path+#fragment on load/hashchange and none after edit/reset/make-own',
      steps.length === 11 && steps.every(x => x.did && x.search === '' && !x.mark && x.hashOk), steps.map(x => Object.assign({}, x, { hash: x.hash.slice(0, 40), exp: x.exp.slice(0, 40) })));
    ck('PM 04:57/05:15 query strip (' + QN + '): no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // Creative 05:42 (C14 follow-up): stacked check, tag column ≥720px wide -> tag grid (auto-fill minmax(300px,1fr), gap 10px), the Double tag spans the full row,
  // gaps follow in date order row by row; under 720px one column. 18 tags (1 double + 17 gaps). DOM order = visual order (tags and per-helper list), buttons
  // right under the quilt and before the tags in focus order, nothing past the edge at 320–1440.
  { const s = await session(H, IP); const { p } = s; await p.evaluateOnNewDocument(clipStub); const out = {};
    const G = { forName: 'Priya', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'every' }], lines: ['Mon 19 dinner Ana', 'Mon 19 dinner Ben', 'Mon 19 ride Carla', 'Tue 20 walk Dev', 'Wed 21 ride Ellie'] };
    for (const w of [320, 390, 700, 768, 1024, 1280, 1440]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await form(p, G); await check(p); await sleep(200);
      out[w] = await p.evaluate(() => { const host = document.getElementById('tags'), hb = host.getBoundingClientRect(), tg = [...host.querySelectorAll('.tag')].map(e => { const b = e.getBoundingClientRect(); return { dbl: e.classList.contains('cr-tag-dbl'), t: e.textContent.slice(0, 40), l: Math.round(b.left), tp: Math.round(b.top), w: Math.round(b.width), r: b.right }; });
        const vis = a => a.map((x, i) => Object.assign({ i }, x)).sort((a, b) => a.tp - b.tp || a.l - b.l).map(x => x.i), per = [...document.querySelectorAll('#per-l li')].map(e => { const b = e.getBoundingClientRect(); return { l: Math.round(b.left), tp: Math.round(b.top), r: b.right }; });
        const cw = host.parentElement.getBoundingClientRect().width, foc = [...document.querySelectorAll('#s2 button, #s2 a[href], #s2 [tabindex]:not([tabindex="-1"])')].map(e => e.id), bq = document.getElementById('b-edit').getBoundingClientRect(), qz = document.getElementById('quilts').getBoundingClientRect();
        return { n: tg.length, colW: Math.round(cw), cols: new Set(tg.filter(x => !x.dbl).map(x => x.l)).size, dbl: tg.filter(x => x.dbl).map(x => ({ first: tg.indexOf(x) === 0, full: Math.abs(x.w - hb.width) <= 1 })), order: JSON.stringify(vis(tg)) === JSON.stringify(tg.map((x, i) => i)), perOrder: JSON.stringify(vis(per)) === JSON.stringify(per.map((x, i) => i)), perCols: new Set(per.map(x => x.l)).size,
          within: tg.every(x => x.r <= hb.right + 0.5) && per.every(x => x.r <= innerWidth), sw: document.documentElement.scrollWidth, iw: innerWidth,
          btnUnderQuilt: bq.top >= qz.bottom && bq.bottom <= hb.top && document.getElementById('quilts').parentElement.contains(document.getElementById('b-edit')), focusBtnsFirst: foc.indexOf('b-edit') > -1 && foc.indexOf('b-open') > -1, tagsAfterBtns: document.getElementById('b-edit').compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING }; }); }
    const o = out[1280], expCols = Math.floor((o.colW + 10) / 310);
    ck('Creative 05:42: 1280, 18 tags: tag grid has ' + expCols + ' columns (auto-fill minmax(300px,1fr) in a ' + o.colW + 'px column) and the Double tag comes first and spans the full row', o.n === 18 && o.cols === expCols && expCols >= 3 && o.dbl.length === 1 && o.dbl[0].first && o.dbl[0].full, o);
    ck('Creative 05:42: 1440 grid too; 768/1024 grid where the column is ≥720px; 320/390/700 (column under 720px): one column, every tag full width', out[1440].cols >= 3 && out[1440].dbl[0].full && [768, 1024].every(w => out[w].colW < 720 ? out[w].cols === 1 : out[w].cols === Math.floor((out[w].colW + 10) / 310)) && [320, 390, 700].every(w => out[w].colW < 720 && out[w].cols === 1 && out[w].dbl[0].full), Object.fromEntries(Object.entries(out).map(([w, x]) => [w, { colW: x.colW, cols: x.cols, dbl: x.dbl }])));
    ck('Creative 05:42: DOM order = visual order for tags and per-helper list (row by row), per-helper in two columns at ≥720px, buttons right under the quilt and before the tags in DOM/focus order, nothing past the edge at 320–1440',
      Object.values(out).every(x => x.order && x.perOrder && x.within && x.sw <= x.iw && x.btnUnderQuilt && x.focusBtnsFirst && x.tagsAfterBtns && (x.colW >= 720 ? x.perCols === 2 : x.perCols === 1)), Object.fromEntries(Object.entries(out).map(([w, x]) => [w, { order: x.order, perOrder: x.perOrder, perCols: x.perCols, within: x.within, sw: x.sw, iw: x.iw, btn: x.btnUnderQuilt }])));
    ck('Creative 05:42: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // ================= QA local-83edf87 C14 / C15 / C16 =================
  // C14: QA's 56 cases (14 names of ≤10 graphemes × 1280/1440 × classic scrollbars visible/hidden), each name in Dinner, Ride, Dog walk, Other and Double
  // squares (name + "Bo", and name + itself), measured straight after Check, 1.2 s later and after a resize: one line, ≥10px, inside its square.
  { const s = await session(H, IP); const { p } = s; const cdp = await p.target().createCDPSession(); const fails = []; let runs = 0;
    const NAMES = ['Fatima', 'Anastasiya', 'Bartholome', 'WWWWWWWWWW', 'MMMMMMMMMM', 'WMWMWMWMWM', 'Mary-Louis', 'Anne Marie', 'É'.normalize('NFD').repeat(10), '😀'.repeat(10), '🇺🇦'.repeat(10), '👩‍👩‍👧‍👦'.repeat(5), '王小明李华张伟刘洋陈', 'عبد الرحمن'];
    const measure = nm => p.evaluate(nm => [...document.querySelectorAll('#quilts .patch')].flatMap(pt => [...pt.querySelectorAll('.who .mill-typed')].filter(e => e.textContent.includes(nm)).map(e => { const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()].filter(q => q.width > 0.5), tops = [];
      rs.forEach(q => { if (!tops.some(t => Math.abs(t - q.top) <= 3)) tops.push(q.top); }); const pr = pt.getBoundingClientRect(); return { sq: pt.className.replace(/patch |taken |new/g, '').trim(), lines: tops.length, fs: parseFloat(getComputedStyle(e).fontSize), inside: Math.min(...rs.map(q => q.left)) >= pr.left - 0.5 && Math.max(...rs.map(q => q.right)) <= pr.right + 0.5 && Math.max(...rs.map(q => q.bottom)) <= pr.bottom + 0.5 }; })), nm);
    for (const sb of ['visible', 'hidden']) { await cdp.send('Emulation.setScrollbarsHidden', { hidden: sb === 'hidden' });
      for (const w of [1280, 1440]) for (const nm of NAMES) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
        await form(p, { forName: 'Q', org: 'Jo', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'every' }, { key: 'other', rule: 'every', label: 'Groceries' }],
          lines: [`Mon 19 dinner ${nm}`, `Tue 20 ride ${nm}`, `Wed 21 walk ${nm}`, `Thu 22 groceries ${nm}`, `Fri 23 dinner ${nm}`, 'Fri 23 dinner Bo', `Sat 24 dinner ${nm}`, `Sat 24 dinner ${nm}`, `Sun 25 ride ${nm}`, 'Sun 25 ride Bo'] });
        await p.click('#b-check'); const st = { t0: await measure(nm) }; await sleep(1200); st.t1200 = await measure(nm); await p.setViewport({ width: w, height: 901 }); await sleep(300); st.resized = await measure(nm); runs++;
        const bad = Object.entries(st).filter(([k, v]) => v.length !== 7 || !['meal', 'ride', 'walk', 'other', 'dbl'].every(t => v.some(x => x.sq.includes(t))) || v.some(x => x.lines !== 1 || x.fs < 10 || !x.inside));
        if (bad.length) fails.push({ sb, w, nm, bad: bad.map(([k, v]) => k + ':' + JSON.stringify(v.filter(x => x.lines !== 1 || x.fs < 10 || !x.inside).slice(0, 3)) + ' n=' + v.length) }); } }
    await cdp.send('Emulation.setScrollbarsHidden', { hidden: false });
    ck('QA C14 (QA\'s 56 cases): 14 names ≤10 graphemes (W×10, M×10, 😀×10, 🇺🇦×10, ZWJ families, NFD É×10, CJK, Arabic …) × 1280/1440 × scrollbars visible/hidden: one line, ≥10px, inside the square, in Dinner/Ride/Walk/Other/Double, straight after Check, 1.2 s later and after a resize', runs === 56 && !fails.length, { runs, fails: fails.slice(0, 8) });
    ck('QA C14: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // C15: every focusable on the organizer (needs ticked, rules with checked and unchecked day chips; empty-Check error links; after Check + Make link) and the
  // recipient page, at 390 and 1280, every visible tabbable in DOM order: the ring = pixels that change on focus (shot focused vs shot after blur); the ring must be
  // there (at least a thin band all round) and its colour ≥3:1 against the pixel 2px beyond its edge (past one antialiased pixel) on every side (gap and outside), checked chip included.
  // Every visible tabbable element, in DOM order; each is focused with focusVisible after a real key press (keyboard modality), shot, blurred, shot again.
  const ringAudit = async (p, tag, min) => { const out = []; await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
    const total = await p.evaluate(() => { const L = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(e => !e.disabled && e.tabIndex >= 0 && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[hidden],[inert]'));
      L.forEach((e, i) => { e.dataset.raI = String(i); }); return L.length; });
    for (let i = 0; i < total; i++) { await p.keyboard.press('Shift'); await p.evaluate(i => { const e = document.querySelector(`[data-ra-i="${i}"]`); (e.closest('.cr-chip') || e).scrollIntoView({ block: 'center' }); e.focus({ focusVisible: true }); }, i); await sleep(40);
      const info = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; if (!e.dataset.ra) e.dataset.ra = String(Math.random()).slice(2, 9); const host = e.closest('.cr-chip') || e, r = host.getBoundingClientRect();
        return { id: e.id || e.dataset.ra, desc: (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.closest('.cr-chip') ? ' in checked=' + e.checked + ' chip' : '') + ':' + (e.textContent || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 24)), x: r.left + scrollX - 12, y: r.top + scrollY - 12, w: r.width + 24, h: r.height + 24, perim: 2 * (r.width + r.height) }; });
      if (!info) { out.push({ tag, desc: 'item ' + i + ' would not take focus', visible: false }); continue; } const clip = { x: Math.max(0, info.x), y: Math.max(0, info.y), width: info.w, height: info.h };
      const f = await p.screenshot({ clip, encoding: 'base64' }); await p.evaluate(() => document.activeElement.blur()); await sleep(30); const u = await p.screenshot({ clip, encoding: 'base64' });
      const m = await p.evaluate(async (f, u, perim) => { const decode = async s => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return { w: cv.width, h: cv.height, D: g.getImageData(0, 0, cv.width, cv.height).data }; }, F = await decode(f), U = (await decode(u)).D, D = F.D, W = F.w, H2 = F.h, R = new Uint8Array(W * H2); let n = 0;
        for (let k = 0; k < W * H2; k++) { const j = k * 4; if (Math.abs(D[j] - U[j]) + Math.abs(D[j + 1] - U[j + 1]) + Math.abs(D[j + 2] - U[j + 2]) > 60) { R[k] = 1; n++; } }
        if (n < perim) return { n, visible: false };
        const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, L = j => 0.2126 * lin(D[j]) + 0.7152 * lin(D[j + 1]) + 0.0722 * lin(D[j + 2]), cnt = {};
        for (let k = 0; k < W * H2; k++) if (R[k]) { const j = k * 4, key = D[j] + ',' + D[j + 1] + ',' + D[j + 2]; cnt[key] = (cnt[key] || 0) + 1; }
        const ring = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number), lr = 0.2126 * lin(ring[0]) + 0.7152 * lin(ring[1]) + 0.0722 * lin(ring[2]); let worst = 99, edges = 0;
        for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (!R[k]) continue; const j = k * 4; if (Math.abs(D[j] - ring[0]) + Math.abs(D[j + 1] - ring[1]) + Math.abs(D[j + 2] - ring[2]) > 30) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x1 = x + dx, y1 = y + dy; if (x1 < 0 || y1 < 0 || x1 >= W || y1 >= H2 || R[y1 * W + x1]) continue; // ring edge: step past one antialiased pixel, then compare
            const xx = x + 2 * dx, yy = y + 2 * dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H2 || R[yy * W + xx]) continue; const lb = L((yy * W + xx) * 4), c = (Math.max(lr, lb) + 0.05) / (Math.min(lr, lb) + 0.05); edges++; if (c < worst) worst = c; } }
        return { n, visible: true, ring: ring.join(','), worst: Math.round(worst * 100) / 100, edges }; }, f, u, info.perim);
      out.push(Object.assign({ tag, desc: info.desc, id: info.id }, m)); }
    if (total < min) out.push({ tag, desc: 'only ' + total + ' focusables (expected ≥' + min + ')', visible: false });
    return out; };
  { const s = await session(H, IP); const { p } = s; await p.evaluateOnNewDocument(clipStub); const all = [];
    for (const w of [390, 1280]) { await p.setViewport({ width: w, height: 900 });
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); all.push(...await ringAudit(p, w + ' organizer at load', 14));
      await form(p, Object.assign({}, JESS, { lines: [] })); all.push(...await ringAudit(p, w + ' organizer, needs ticked, checked + unchecked day chips', 34));
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await p.click('#b-check'); await sleep(250); all.push(...await ringAudit(p, w + ' organizer, empty Check (error links)', 18));
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await form(p, Object.assign({}, JESS, { lines: PLAN })); await check(p); await p.click('#b-link'); await sleep(250); all.push(...await ringAudit(p, w + ' organizer after Check + Make link', 45));
      const lk = await p.$eval('#link', e => e.value); await p.goto('about:blank'); await p.goto(lk, { waitUntil: 'load' }); await sleep(250); all.push(...await ringAudit(p, w + ' recipient', 3)); }
    const bad = all.filter(x => !x.visible || x.worst < 3), chips = all.filter(x => /checked=true chip/.test(x.desc));
    ck('QA C15: every focusable (organizer: load, needs + day chips checked/unchecked, error links, after Check + link; recipient) at 390/1280 shows a ring ≥3:1 against the pixels beside it, by rendered pixels; checked day chips included', all.length > 100 && chips.length >= 4 && !bad.length,
      { n: all.length, checkedChips: chips.map(x => x.worst), bad: bad.slice(0, 12), min: Math.min(...all.filter(x => x.visible).map(x => x.worst)) });
    // C16: the legend's empty "Not needed" swatch: outline pixels vs the page just outside, ≥3:1, still no fill
    const sw = []; for (const w of [390, 1280]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await form(p, Object.assign({}, JESS, { lines: PLAN })); await check(p);
      const r = await p.evaluate(() => { const e = document.querySelector('#legend .cr-sw--notNeeded'); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, bg: getComputedStyle(e).backgroundColor }; });
      const img = await p.screenshot({ clip: { x: r.x - 8, y: r.y - 8, width: r.w + 16, height: r.h + 16 }, encoding: 'base64' });
      sw.push(Object.assign({ w, bg: r.bg }, await p.evaluate(async (img, bw, bh) => { const { w: W, D } = await (async s => { const img = new Image(); img.src = 'data:image/png;base64,' + s; await img.decode(); const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0); return { w: cv.width, h: cv.height, D: g.getImageData(0, 0, cv.width, cv.height).data }; })(img), lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, L = (x, y) => { const j = (y * W + x) * 4; return 0.2126 * lin(D[j]) + 0.7152 * lin(D[j + 1]) + 0.0722 * lin(D[j + 2]); };
        const cy = 8 + Math.round(bh / 2), cx = 8 + Math.round(bw / 2), pairs = [[[7, cy], [3, cy]], [[8 + Math.round(bw), cy], [12 + Math.round(bw), cy]], [[cx, 7], [cx, 3]], [[cx, 8 + Math.round(bh)], [cx, 12 + Math.round(bh)]]];
        const cs = pairs.map(([[a, b], [c, d]]) => { const x = L(a, b), y = L(c, d); return Math.round((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) * 100) / 100; }); return { sides: cs, min: Math.min(...cs) }; }, img, r.w, r.h))); }
    ck('QA C16: legend "Not needed" swatch outline ≥3:1 against the page on all four sides at 390/1280, and still unfilled', sw.every(x => x.min >= 3 && /rgba\(0, 0, 0, 0\)|transparent/.test(x.bg)), sw);
    ck('QA C15/C16: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // Creative 07:05: the checkbox inside a selected (navy) day chip is a cream box with a dark tick, by rendered pixels: tick ≥3:1 against the box, box ≥3:1
  // against the chip, at 390 and 1280 (focused and not). Unchecked chips and the need checkboxes keep the browser default (accent-color auto).
  { const s = await session(H, IP); const { p } = s; const res = [];
    for (const w of [390, 1280]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await form(p, Object.assign({}, JESS, { lines: [] }));
      for (const focused of [false, true]) { await p.keyboard.press('Shift');
        const r = await p.evaluate(focused => { const e = document.querySelector('#c-dinner input:checked'); e.scrollIntoView({ block: 'center' }); if (focused) e.focus({ focusVisible: true }); else e.blur(); const b = e.getBoundingClientRect();
          return { x: b.left + scrollX - 2, y: b.top + scrollY - 2, width: b.width + 4, height: b.height + 4, chip: getComputedStyle(e.closest('.cr-chip')).backgroundColor }; }, focused);
        await sleep(40); const img = await p.screenshot({ clip: { x: r.x, y: r.y, width: r.width, height: r.height }, encoding: 'base64' });
        res.push(Object.assign({ w, focused }, await p.evaluate(async (img, chipCss) => { const im = new Image(); im.src = 'data:image/png;base64,' + img; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); const D = g.getImageData(0, 0, cv.width, cv.height).data;
          const chip = chipCss.match(/\d+/g).slice(0, 3).map(Number), px = [], inner = []; for (let j = 0; j < D.length; j += 4) { const q = [D[j], D[j + 1], D[j + 2]], x = (j / 4) % cv.width, y = Math.floor(j / 4 / cv.width); px.push(q); if (x >= 5 && y >= 5 && x < cv.width - 5 && y < cv.height - 5) inner.push(q); }
          const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]), mode = arr => { const c = {}; arr.forEach(q => { const k = q.join(); c[k] = (c[k] || 0) + 1; }); const e = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return e ? e[0].split(',').map(Number) : null; };
          const box = mode(px.filter(q => dist(q, chip) > 60)), tickPx = box ? inner.filter(q => dist(q, box) > 150 && dist(q, chip) > 40) : [], tick = mode(tickPx);
          const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, L = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]), cr = (a, b) => Math.round((Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05) * 100) / 100;
          const byL = tickPx.slice().sort((a, b) => L(a) - L(b)), core = byL.length ? byL[Math.floor(byL.length / 8)] : null; return { chip: chip.join(), box: box && box.join(), tickCore: core && core.join(), tickMode: tick && tick.join(), tickPx: tickPx.length, tickCoreVsBox: core ? cr(core, box) : 0, tickVsBox: tick ? cr(tick, box) : 0, boxVsChip: box ? cr(box, chip) : 0 }; }, img, r.chip))); }
      res.push(Object.assign({ w }, await p.evaluate(() => ({ uncheckedAccent: [...document.querySelectorAll('.cr-chip input:not(:checked)')].map(e => getComputedStyle(e).accentColor), needAccent: [...document.querySelectorAll('.cr-need-h input[type=checkbox]')].map(e => getComputedStyle(e).accentColor),
        uncheckedChipBg: [...new Set([...document.querySelectorAll('.cr-chip:not(:has(input:checked))')].map(e => getComputedStyle(e).backgroundColor))], checkedType: document.querySelector('#c-dinner input:checked').type })))); }
    const px = res.filter(x => 'tickVsBox' in x), meta = res.filter(x => 'uncheckedAccent' in x);
    ck('Creative 07:05: checked day chip checkbox is a cream box with a dark tick: tick ≥3:1 vs box (its dark core and its most common antialiased colour) and box ≥3:1 vs the navy chip, rendered pixels, 390/1280, focused and not', px.length === 4 && px.every(x => x.tickPx >= 4 && x.tickVsBox >= 3 && x.tickCoreVsBox >= 3 && x.boxVsChip >= 3 && x.chip === '47,59,76'), px);
    ck('Creative 07:05: unchecked chips and need checkboxes unchanged (accent-color auto, chip background white), still a native checkbox', meta.every(x => x.uncheckedAccent.length >= 5 && x.uncheckedAccent.every(a => a === 'auto') && x.needAccent.every(a => a === 'auto') && x.uncheckedChipBg.join() === 'rgb(255, 255, 255)' && x.checkedType === 'checkbox'), meta);
    ck('Creative 07:05: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA W-7 (PM wrap rule: break-word only; break at a space first, mid-word only when a word can't fit its cell): the household sheet's cells use
  // overflow-wrap:break-word (never anywhere / break-all). On the received sheet at 320/390, QA's 'Wolfeschlegelsteinhausen' and 'Pneumonoultramicroscopic'
  // sit whole on one line; a 40-char name breaks mid-word only because it is wider than its cell; organizer + recipient sheets stay inside the screen,
  // and the sheet is still a table (table/row/cell) to assistive tech while its rows are stacked on a phone.
  { const s = await session(H, IP); const { p } = s; await p.evaluateOnNewDocument(clipStub); const out = []; const n40 = 'Wolfeschlegelsteinhausenbergerdorffvoral';
    const WORDS = ['Wolfeschlegelsteinhausen', 'Pneumonoultramicroscopic', n40];
    const audit = (where, w) => p.evaluate((where, w, WORDS) => { const t = document.getElementById('sheet-t'), cells = [...t.querySelectorAll('td')], sh = t.closest('.sheet').getBoundingClientRect(), cs = cells.map(c => getComputedStyle(c));
      const words = WORDS.map(wd => { const c = cells.find(c => c.textContent.includes(wd)); if (!c) return { wd, found: false }; const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let tn; while ((tn = tw.nextNode()) && !tn.data.includes(wd));
        const i0 = tn.data.indexOf(wd), rg = document.createRange(); rg.setStart(tn, i0); rg.setEnd(tn, Math.min(tn.data.length, i0 + wd.length + 1)); const tops = []; [...rg.getClientRects()].forEach(q => { if (q.width > 0.5 && !tops.some(x => Math.abs(x - q.top) < 3)) tops.push(q.top); });
        const m = document.createElement('span'); m.style.cssText = 'position:absolute;white-space:nowrap;font:' + getComputedStyle(c).font; m.textContent = rg.toString(); document.body.append(m); const ww = m.getBoundingClientRect().width; m.remove(); const st = getComputedStyle(c), avail = c.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
        return { wd: wd.slice(0, 12), found: true, lines: tops.length, wordW: Math.round(ww), avail: Math.round(avail) }; });
      return { where, w, sw: document.documentElement.scrollWidth, iw: innerWidth, wrap: [...new Set(cs.map(c => c.overflowWrap + '/' + c.wordBreak))], over: cells.filter(c => c.scrollWidth > c.clientWidth + 1).length, inside: cells.every(c => c.getBoundingClientRect().right <= sh.right + 0.5), words }; }, where, w, WORDS);
    for (const w of [320, 390]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      await form(p, Object.assign({}, JESS, { lines: ['Mon 19 dinner Wolfeschlegelsteinhausen', 'Tue 20 dinner Pneumonoultramicroscopic', 'Tue 20 dinner Ana', 'Wed 21 ride ' + n40] })); await check(p); out.push(await audit('organizer', w));
      await p.click('#b-link'); await sleep(200); const lk = await p.$eval('#link', e => e.value); await p.goto('about:blank'); await p.goto(lk, { waitUntil: 'load' }); await sleep(250); out.push(await audit('recipient', w));
      if (w === 320) { const cdp = await p.target().createCDPSession(); const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        out.push({ ax: await p.evaluate(() => { const t = document.getElementById('sheet-t'); return { tr: t.querySelectorAll('tr[role=row]').length, td: t.querySelectorAll('td[role=cell]').length, rows: t.rows.length, display: getComputedStyle(t.rows[0]).display }; }), axRoles: (() => { const r = {}; nodes.forEach(n => { const v = n.role && n.role.value; if (/^(table|row|cell|LayoutTable|LayoutTableRow|LayoutTableCell)$/.test(v)) r[v] = (r[v] || 0) + 1; }); return r; })() }); } }
    const views = out.filter(x => x.where), ax = out.find(x => x.ax);
    ck('QA W-7: household sheet cells wrap with overflow-wrap:break-word (no anywhere/break-all); organizer and recipient sheets inside 320/390, no sideways scroll, no cell overflow', views.length === 4 && views.every(x => x.wrap.join() === 'break-word/normal' && x.sw <= x.iw && !x.over && x.inside), views.map(x => ({ where: x.where, w: x.w, wrap: x.wrap, sw: x.sw, iw: x.iw, over: x.over, inside: x.inside })));
    ck('QA W-7 / PM wrap rule: on the sheet at 320/390, \'Wolfeschlegelsteinhausen\' and \'Pneumonoultramicroscopic\' sit whole on one line; a word breaks mid-word only when it is wider than its cell (40-char name)', views.every(x => x.words.every(q => q.found && (q.wordW <= q.avail ? q.lines === 1 : q.lines > 1)) && x.words.slice(0, 2).every(q => q.lines === 1)), views.map(x => ({ where: x.where, w: x.w, words: x.words })));
    ck('QA W-7: with its rows stacked at 320 the sheet is still a table to assistive tech (role table/row/cell, no LayoutTable)', ax && ax.ax.tr === ax.ax.rows && ax.ax.td === 2 * ax.ax.rows && ax.ax.display === 'block' && !ax.axRoles.LayoutTable && !ax.axRoles.LayoutTableRow && ax.axRoles.row >= ax.ax.rows, ax);
    ck('QA W-7: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-ced37c4 C17 + PM 08:09: with a 40-character one-word name (and QA's other long words) nothing on the organizer page is offscreen at any
  // width 320–1440 (every 10px, plus 561/580/600 exactly), and in the "How each line was read" table and the household sheet a word breaks mid-word
  // only when it can't fit its cell (break at spaces first). Fails on ced37c4 at 561/580/600 (table 584.8px in a 510px box, "Mo|n", "Dinn|er").
  { const s = await session(H, IP); const { p } = s; const W40 = 'Abcdefghijklmnopqrstuvwxyzabcdefghijklmn';
    const plan = ['Mon 19 dinner ' + W40, 'Tue 20 dinner Wolfeschlegelsteinhausen', 'Tue 20 dinner Pneumonoultramicroscopic', 'Wed 21 groceries Ana', 'Wed 21 ride Ana', 'Wed 21 ride Ana', 'Thu 22 dinner and walk Ben', 'Sat 24 walk Ana', 'dinner Carla', 'blah blah'];
    await p.setViewport({ width: 561, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    await form(p, { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', rule: 'every' }, { key: 'ride', rule: 'every' }, { key: 'walk', rule: 'weekdays' }, { key: 'other', rule: 'every', label: 'Groceries' }], lines: plan }); await check(p);
    const results = await p.$$eval('#readas .st', e => [...new Set(e.map(x => x.textContent))]);
    const widths = [561, 580, 600]; for (let w = 320; w <= 1440; w += 10) widths.push(w); const bad = [], seen = { cells: 0, words: 0, broken: 0 };
    for (const w of widths) { await p.setViewport({ width: w, height: 900 }); await sleep(60);
      const m = await p.evaluate(() => { const cw = document.documentElement.clientWidth, out = { sw: document.documentElement.scrollWidth, cw, off: [], mid: [], cells: 0, words: 0, broken: 0 };
        document.querySelectorAll('section.on *').forEach(e => { if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return; const r = e.getBoundingClientRect(); if (r.width && (r.right > cw + 0.5 || r.left < -0.5)) out.off.push((e.id || e.className || e.tagName).toString().slice(0, 30) + '@' + Math.round(r.left) + '-' + Math.round(r.right)); });
        document.querySelectorAll('#readas td, #sheet-t td').forEach(td => { out.cells++; const cs = getComputedStyle(td), cellAvail = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
          const tw = document.createTreeWalker(td, NodeFilter.SHOW_TEXT); let tn; while ((tn = tw.nextNode())) { const re = /\S+/g; let mm; while ((mm = re.exec(tn.data))) { out.words++; const rg = document.createRange(); rg.setStart(tn, mm.index); rg.setEnd(tn, mm.index + mm[0].length);
            const rs = [...rg.getClientRects()].filter(q => q.width > 0.5), tops = []; rs.forEach(q => { if (!tops.some(t => Math.abs(t - q.top) < 3)) tops.push(q.top); }); if (tops.length < 2) continue; out.broken++;
            const par = tn.parentElement, ps = getComputedStyle(par), avail = par === td ? cellAvail : Math.min(cellAvail, par.getBoundingClientRect().width) - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight) - parseFloat(ps.borderLeftWidth) - parseFloat(ps.borderRightWidth), ww = rs.reduce((a, q) => a + q.width, 0);
            if (ww <= avail - 1) out.mid.push(mm[0].slice(0, 14) + ' ' + Math.round(ww) + '/' + Math.round(avail) + 'px in ' + (td.closest('#readas') ? 'readas' : 'sheet')); } } });
        return out; });
      seen.cells += m.cells; seen.words += m.words; seen.broken += m.broken; if (m.sw > m.cw || m.off.length || m.mid.length) bad.push({ w, sw: m.sw, cw: m.cw, off: m.off.slice(0, 4), mid: m.mid.slice(0, 6) }); }
    ck('QA C17: organizer page with a 40-char one-word name — nothing offscreen, no sideways scroll, and no mid-word break of a word that fits its cell (reading table + household sheet), every 10px 320–1440 plus 561/580/600', !bad.length && results.length >= 5 && seen.broken > 0, { widths: widths.length, results, seen, bad: bad.slice(0, 8), failWidths: bad.map(b => b.w).slice(0, 40) });
    ck('QA C17: reading-table and sheet cells use break-word, never anywhere/break-all', await p.evaluate(() => [...document.querySelectorAll('#readas td, #readas th, #readas .st, #sheet-t td')].every(e => { const c = getComputedStyle(e); return c.overflowWrap !== 'anywhere' && c.wordBreak !== 'break-all'; })), null);
    ck('QA C17: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-b6a90aa C18 (PM 08:59): in the reading table no ordinary word (≤10 letters, from QA's 5 plans, with its attached quote) splits at any px
  // 561–640 or every 10px to 760 — QA's five plans incl. the dinner/Carla line; plus a C17 regression (no sideways scroll, nothing offscreen) over the same widths.
  { const s = await session(H, IP); const { p } = s; const W40 = 'Abcdefghijklmnopqrstuvwxyzabcdefghijklmn', extra = ['Tue 20 dinner Carla', 'Tue 20 dinner Dev', 'Tue 20 dinner Dev', 'dinner Carla', 'blah blah', 'Mon 26 dinner Ana', 'Wed 21 ride Ana'];
    const SC = { 'w40-aside': [[['dinner', 'every'], ['walk', 'weekdays'], ['other', 'every', 'Groceries']], ['Mon 19 dinner ' + W40, 'Tue 20 dinner Wolfeschlegelsteinhausen', 'Wed 21 dinner Pneumonoultramicroscopic', 'Sat 24 walk ' + W40, ...extra]],
      'w40-noaside': [[['dinner', 'every'], ['ride', 'every'], ['walk', 'every'], ['other', 'every', 'Groceries']], ['Mon 19 dinner ' + W40, 'Mon 19 walk ' + W40, 'Tue 20 dinner Ana', 'Tue 20 dinner Ben', 'Wed 21 ride Ana', 'Wed 21 ride Ana', 'Thu 22 groceries Carla', 'groceries Thu 22 Carla', 'dinner Mon 19 Carla']],
      'ord-aside': [[['dinner', 'every'], ['walk', 'weekdays']], ['Mon 19 dinner Ana', 'Mon 19 walk Ben', 'Sat 24 walk Ben', 'Thu 22 dinner Bartholomew Quatermaine', 'Fri 23 dinner Anne-Marie-Louise-Ottoline', ...extra]],
      'ord-noaside': [[['dinner', 'every'], ['ride', 'every'], ['walk', 'every']], ['Mon 19 dinner Ana', 'Mon 19 walk Ben', 'Tue 20 dinner Carla', 'Wed 21 ride Dev', 'Thu 22 dinner Ellie', 'Fri 23 walk Fatima', 'Sun 25 dinner Gus']],
      'w40-longother-aside': [[['dinner', 'every'], ['other', 'every', 'Abcdefghijklmnop']], ['Mon 19 abcdefghijklmnop ' + W40, 'Mon 19 dinner ' + W40, 'Tue 20 walk ' + W40, 'Wed 21 ride Ana', 'Wed 21 ride Ana', 'blah blah', 'dinner Carla', 'Mon 26 dinner Ana', 'Tue 20 dinner Carla', 'Tue 20 dinner Dev']] };
    const widths = []; for (let w = 561; w <= 640; w++) widths.push(w); for (let w = 650; w <= 760; w += 10) widths.push(w);
    const splits = [], c17 = [], seen = { runs: 0, words: 0 };
    for (const [name, [needs, lines]] of Object.entries(SC)) { await p.setViewport({ width: 561, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      await form(p, { forName: 'Priya & Sam', org: 'Jess', first: '2026-10-19', last: '2026-10-25', needs: needs.map(([key, rule, label]) => ({ key, rule, label })), lines }); await check(p);
      for (const w of widths) { await p.setViewport({ width: w, height: 900 }); await sleep(40); seen.runs++;
        const m = await p.evaluate(() => { const cw = document.documentElement.clientWidth, out = { sw: document.documentElement.scrollWidth, cw, off: 0, split: [], words: 0 };
          document.querySelectorAll('section.on *').forEach(e => { if (!e.getClientRects().length) return; const r = e.getBoundingClientRect(); if (r.width && (r.right > cw + 0.5 || r.left < -0.5)) out.off++; });
          document.querySelectorAll('#readas td').forEach(td => { const tw = document.createTreeWalker(td, NodeFilter.SHOW_TEXT); let tn; while ((tn = tw.nextNode())) { const re = /\S+/g; let mm; while ((mm = re.exec(tn.data))) { const letters = mm[0].replace(/[^\p{L}]/gu, '');
            if (!letters.length || letters.length > 10 || /-/.test(mm[0])) continue; out.words++; const rg = document.createRange(); rg.setStart(tn, mm.index); rg.setEnd(tn, mm.index + mm[0].length);
            const tops = []; [...rg.getClientRects()].filter(q => q.width > 0.5).forEach(q => { if (!tops.some(t => Math.abs(t - q.top) < 3)) tops.push(q.top); }); if (tops.length > 1) out.split.push(mm[0]); } } });
          return out; });
        seen.words += m.words; if (m.split.length) splits.push(name + '@' + w + ': ' + [...new Set(m.split)].join(' ')); if (m.sw > m.cw || m.off) c17.push({ name, w, sw: m.sw, cw: m.cw, off: m.off }); } }
    ck('QA C18: reading table — no ordinary word (≤10 letters, QA\'s 5 plans incl. "dinner Carla", plus line-initial "“groceries") splits at any px 561–640 or every 10px 650–760', !splits.length && seen.runs === 5 * widths.length && seen.words > 1000, { seen, splits: splits.slice(0, 20), n: splits.length });
    ck('QA C18 / C17 regression: same plans and widths — no sideways scroll, nothing offscreen', !c17.length, c17.slice(0, 10));
    ck('QA C18: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})();
