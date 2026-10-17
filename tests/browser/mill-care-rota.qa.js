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
const X = vm.runInNewContext('var COPY={};' + fs.readFileSync(__dirname + '/../../mill/care-rota/copy-extra.js', 'utf8') + ';COPY');
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
    ck(w + ' build rules: two-needs and "and"-names lines are never placed (Mon 19 Dinner stays “Ana” alone, no Ben on Tue walk twice, Fri ride stays not needed)', pmon.join('|') === 'hole|Fri Oct 23: Ride not needed|taken meal|Mon Oct 19: Dinner, “Ana”|taken walk|Tue Oct 20: Dog walk, “Ben”' && !t.patches.some(x => /and|&/.test(x)), pmon);
    ck(w + ' quilt: 21 patches (3 needs × 7 days): 10 covered (9 single + 1 double with ×2 pin), 2 gap, 9 not-needed holes', t.patches.length === 21 && t.patches.filter(x => /^taken/.test(x)).length === 9 && t.patches.filter(x => /^gap/.test(x)).length === 2 && t.patches.filter(x => /^dbl/.test(x)).length === 1 && t.patches.filter(x => /^hole/.test(x)).length === 9 && t.patches.includes('dbl|Tue Oct 20: Dinner, Double: “Carla” + “Dev”'), t.patches);
    ck(w + ' set-aside pocket lists every line not placed (to fix, not needed), quoted, with its reading result', t.pocketShown && JSON.stringify(t.pocket) === JSON.stringify(['“Thu 21 dinner Ellie” · To fix', '“Sat 24 dinner Carla” · Set aside: not needed', '“' + RULES[0] + '” · To fix', '“' + RULES[1] + '” · To fix', '“' + RULES[2] + '” · To fix']), t.pocket);
    ck(w + ' per helper counts', t.per.join('|') === '“Ana”: 4|“Ben”: 3|“Carla”: 1|“Dev”: 2|“Fatima”: 1', t.per);
    ck(w + ' stamp on the S2 report: "Plan checked {date, time, zone label} by “Jess”. Changes after this aren\'t here."', STAMP_RE.test(t.stamp2), t.stamp2);
    const stampTxt = t.stamp2.replace('“Jess”', 'Jess');
    ck(w + ' S3 handoffs: one card per helper + still-open card; every message ends with the stamp', t.cards.length === 6 && t.cards.every(c => c.stamp === stampTxt && c.msg.endsWith(stampTxt)) && t.cards.map(c => c.h).join() === '“Ana”,“Ben”,“Carla”,“Dev”,“Fatima”,' + X.stillOpenHeading && t.cards[1].btn === 'Copy “Ben”\'s message', t.cards.map(c => c.h + '/' + c.btn));
    const ben = t.cards[1].msg; r0.stamp = stampTxt.match(/checked (.*) by/)[1];
    ck(w + ' Ben\'s handoff: only his days, only the Dog walk note (never the Dinner/Ride notes), Writer template exactly', ben === CR.handoff(C, r0, CFG, r0.helpers[1]) && !ben.includes('No nuts') && !ben.includes('Pediatrician') && ben.includes('Dog walk, note from Jess: “' + NOTES.walk + '”'), ben);
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
    ck(w + ' still-open when nothing is open: stillOpenNone + stamp', /^Priya & Sam: every need has someone for now\.\nPlan checked .* by Jess\. Changes after this aren't here\.$/.test(t), t);
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
      ck(`${w} ${tz} stamp carries the device zone label after the change (${z}) on the report, every handoff and the sheet`, t.stamp2 === `Plan checked ${z} by “Jess”. Changes after this aren't here.` && t.cards.every(c => c.stamp === `Plan checked ${z} by Jess. Changes after this aren't here.`) && t.stamp4 === t.stamp2, [t.stamp2, t.cards.map(c => c.stamp)]);
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
    await p.evaluate(() => document.querySelectorAll('#cards .msg').forEach(m => { m.dataset.keep = m.textContent; m.textContent = ''; }));
    const LINES = ['Mon 19 dinner ' + SN, 'Mon 19 dinner ' + SN2, 'Tue 20 ' + SG.toLowerCase() + ' ' + SN, 'Wed ' + SN2 + ' dinner', 'Thu 21 dinner ' + SN, 'Fri 23 dinner Ana and ' + SN].map(l => '“' + M.unquote(l) + '”');
    let a = await typedAudit(p, [SF, SO, SN, SN2, SG].concat(LINES.map(l => l.slice(1, -1))));
    const vis = (await p.evaluate(() => document.body.innerText)).split(LINES[0]).join('').split(LINES[1]).join('').split(LINES[2]).join('').split(LINES[3]).join('').split(LINES[4]).join('').split(LINES[5]).join('');
    const { unquotedIn } = require('./mill-common'); const visHits = [SF, SO, SN, SN2, SG].map(x => M.unquote(x)).flatMap(x => unquotedIn(vis, x));
    a.all = a.all.filter(h => h.where !== 'visible').concat(visHits.map(ctx => ({ where: 'visible (outside quoted pasted lines)', ctx })));
    ck(w + ' typedAudit organizer view (PM Q1 spoof seeds: who it\'s for, organizer, names, other need, whole pasted lines): screen, aria, titles, live regions, toast; a name inside a quoted pasted line counts as quoted', !a.all.length, a.all.slice(0, 12));
    ck(w + ' copied still-open is exactly Writer\'s template (unframed values as typed; Writer frames none there)', clips[0] === CR.stillOpen(C, Object.assign(CR.check({ forName: SF, org: SO, first: '2026-10-19', last: '2026-10-25', needs: [{ key: 'dinner', label: 'Dinner', rule: 'every' }, { key: 'other', label: SG, rule: 'weekdays' }] }, ['Mon 19 dinner ' + SN, 'Mon 19 dinner ' + SN2, 'Tue 20 ' + SG.toLowerCase() + ' ' + SN, 'Wed ' + SN2 + ' dinner', 'Thu 21 dinner ' + SN, 'Fri 23 dinner Ana and ' + SN]), { stamp: clips[0].match(/Plan checked (.*) by /)[1] }), { forName: SF, org: SO }), clips[0]);
    await p.evaluate(() => document.querySelectorAll('#cards .msg').forEach(m => { m.textContent = m.dataset.keep; }));
    const hand = await p.evaluate(() => document.querySelector('#cards .msg').textContent);
    ck(w + ' handoff note quoted and attributed (template), spoof marks neutralised inside the frame', hand.includes('Dinner, note from ' + SO + ': “Ring" says "Police”'), hand);
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
  process.exit(result(rows));
})();
