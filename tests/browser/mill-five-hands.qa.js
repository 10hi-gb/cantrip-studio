// node tests/browser/mill-five-hands.qa.js <host[:port]> <ip> [scheme] — Five Hands r1c @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Validation UX (field errors, "Fix N things to continue", first error focused; -10/0/2.5/-5 refused, 0-minute helper fine, caps,
// duplicates, 12/5 row limits), worked example (Suggest exact rolls + bench + sheet), the simple-rule line on every Suggest,
// the stamp under every card / inside every copied card / bench text / sheet / recipient, short-handed + change summary +
// benchExplain, Check mode (never moves, refuses -10, over-by on a 0-minute helper), roll scale + phone meter, print (sheet only,
// one page), link (warning before the link, 1,000-char fragment cap, recipient read-only + Make my own copy, bad/old links),
// typedAudit incl. the PM Q1 spoof case, self-hosted fonts, no storage / no network / no CSP errors, no sideways scroll.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, mouseAt, errsOf, W, sleep, session, overflow, typeInto, storage, netCheck, result } = require('./mill-common');
const fs = require('fs'), vm = require('vm');
const C = vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/five-hands/copy.js', 'utf8') + ';COPY');
const FH = require('../../mill/five-hands/fh.js'), M = require('../../mill/shared/core.js');
const pdfPages = buf => { const f = require('os').tmpdir() + '/fh-print-' + process.pid + '.pdf'; fs.writeFileSync(f, buf); const m = /Pages:\s+(\d+)/.exec(require('child_process').execFileSync('pdfinfo', [f]).toString()); fs.unlinkSync(f); return m ? +m[1] : -1; };
const BASE = `${SCHEME}://${H}/mill/five-hands/`;
const mk = a => a.map(x => ({ name: x[0], min: x[1] }));
const HS = [['Ana', 120], ['Ben', 60], ['Chen', 90], ['Dee', 0], ['Eli', 45]];
const TS = [['Pull tomato cages', 40], ['Turn compost bed A', 30], ['Turn compost bed B', 30], ['Rake paths', 45], ['Cover raised beds', 25], ['Clean and oil tools', 20], ['Haul yard bags to curb', 35], ['Fix gate latch', 15], ['Empty rain barrels', 20]];
const TITLE = 'Garden cleanup, Saturday';
const clipStub = () => { window.__clip = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); };
const on = p => p.evaluate(() => [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join());
// fill the form: add rows with the real Add buttons, then set values (input events fire like typing)
async function fill(p, title, tasks, helpers) {
  await p.evaluate((title, tasks, helpers) => {
    const set = (e, v) => { e.value = v == null ? '' : String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.getElementById('f-title'), title);
    [['tasks', 'add-task', tasks], ['helpers', 'add-helper', helpers]].forEach(([host, add, list]) => { const h = document.getElementById(host);
      while (h.children.length > Math.max(1, list.length)) h.lastElementChild.querySelector('.fh-rm').click();
      while (h.children.length < list.length) document.getElementById(add).click();
      list.forEach((x, i) => { const ins = h.children[i].querySelectorAll('input'); set(ins[0], x[0]); set(ins[1], x[1]); }); });
  }, title, tasks, helpers);
}
const split = async p => { await p.click('#b-split'); await sleep(200); };
const state = p => p.evaluate(() => ({ h: document.getElementById('s2-h').textContent, tally: document.getElementById('tally').textContent, rule: getComputedStyle(document.getElementById('rule')).display !== 'none' ? document.getElementById('rule').textContent : '',
  change: document.getElementById('change').hidden ? '' : document.getElementById('change').textContent, over: document.getElementById('over').hidden ? '' : document.getElementById('over').textContent,
  cards: [...document.querySelectorAll('#rolls article')].map(a => ({ label: a.getAttribute('aria-label'), tab: a.querySelector('.tab').textContent, load: a.querySelector('.load').textContent, btn: a.querySelector('button').textContent, sticks: [...a.querySelectorAll('.stick')].map(s => s.querySelector('.t').textContent + ' ' + s.querySelector('.m').textContent + (s.classList.contains('over') ? ' over' : '')), stamp: a.querySelector('.stampline').textContent, overtag: (a.querySelector('.overtag') || {}).textContent || '', zero: a.classList.contains('zero') })),
  benchH: document.getElementById('bench-h').hidden ? '' : document.getElementById('bench-h').textContent, bench: [...document.querySelectorAll('#plank .stick')].map(s => s.textContent), benchEmpty: (document.querySelector('#plank .empty') || {}).textContent || '',
  explain: document.getElementById('bench-explain').hidden ? '' : document.getElementById('bench-explain').textContent, benchBtn: !document.getElementById('b-bench').hidden,
  sheetH: document.getElementById('sheet-h').textContent, sheet: [...document.querySelectorAll('#sheet-t tbody tr')].map(r => [...r.cells].map(c => c.textContent).join(' | ')), sheetStamp: document.getElementById('sheet-stamp').textContent, sheetRule: document.getElementById('sheet-rule').textContent, sheetNote: document.getElementById('sheet-note').textContent,
  on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), active: document.activeElement && document.activeElement.id }));
const errs = p => p.evaluate(() => ({ msgs: [...document.querySelectorAll('#form .errmsg')].filter(e => !e.hidden).map(e => e.textContent), inv: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.id), btn: document.getElementById('b-split').textContent, dis: document.getElementById('b-split').getAttribute('aria-disabled'), active: document.activeElement.id, s2: document.getElementById('s2').classList.contains('on') }));
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info: ok ? undefined : info });
  for (const w of W) {
    let s = await session(H, IP); let { p } = s; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(250); await p.evaluate(() => document.fonts.ready);
    let t = await p.evaluate(() => ({ h1: document.getElementById('title').textContent, lede: document.getElementById('lede').textContent, scope: document.getElementById('scope').textContent, empty: document.getElementById('empty-state').textContent, priv: document.getElementById('privacy').textContent, title: document.title,
      on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), h1f: getComputedStyle(document.querySelector('h1')).fontFamily, bf: getComputedStyle(document.body).fontFamily,
      fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '') + ' ' + f.weight), heads: [document.getElementById('tasks-h').textContent, document.getElementById('helpers-h').textContent], btn: document.getElementById('b-split').textContent, zero: document.getElementById('zero-hint').textContent,
      modes: [...document.querySelectorAll('.modes span')].map(s => s.textContent), legend: document.getElementById('mode-l').textContent }));
    ck(w + ' S1: Writer title/invitation/scope/emptyState/privacy/zeroHint/mode/primary verbatim; only S1 shown', t.h1 === C.title && t.lede === C.invitation && t.scope === C.scopeLine && t.empty === C.emptyState && t.priv === C.privacy && t.zero === C.zeroHint && t.title === 'Five Hands · Cantrip Studio' && t.on === 's1' && t.btn === C.primary && t.modes.join('|') === C.modeSuggest + '|' + C.modeCheck && t.legend === C.modeLabel && t.heads.join('|') === 'Tasks · 1 of 12|Helpers · 1 of 5', t);
    ck(w + ' fonts self-hosted and in use: Saira Stencil One 400 (sign), Schibsted Grotesk (UI)', /Saira Stencil One/.test(t.h1f) && /Schibsted Grotesk/.test(t.bf) && t.fonts.includes('Saira Stencil One 400') && t.fonts.some(f => /^Schibsted Grotesk/.test(f)), t.fonts);
    // ---------- validation UX
    await split(p); t = await errs(p);
    ck(w + ' empty form: field errors (Writer sessionEmpty + taskEmpty / minutes / helperEmpty / minutes), "Fix 5 things to continue", aria-disabled, focus on the first error, nothing split',
      t.msgs.join('|') === [C.sessionEmpty, C.taskEmpty + ' ' + M.fill(C.taskMinutesInvalid, { min: 1, max: 480 }), C.helperEmpty + ' ' + M.fill(C.helperMinutesInvalid, { min: 0, max: 480 })].join('|') && t.btn === 'Fix 5 things to continue' && t.dis === 'true' && t.active === 'f-title' && !t.s2 && t.inv.length === 5, t);
    await fill(p, TITLE, [['Rake paths', '-10'], ['Fix gate latch', '0'], ['Cover raised beds', '2.5'], ['Empty rain barrels', '−10']], [['Ana', '-5'], ['Dee', '0']]); await sleep(80); t = await errs(p);
    const tmi = M.fill(C.taskMinutesInvalid, { min: 1, max: 480 });
    ck(w + ' task minutes -10, 0, 2.5, −10 refused; helper -5 refused; helper Dee 0 is fine; errors update live; "Fix 5 things to continue"', t.msgs.join('|') === [tmi, tmi, tmi, tmi, M.fill(C.helperMinutesInvalid, { min: 0, max: 480 })].join('|') && t.btn === 'Fix 5 things to continue' && t.inv.length === 5, t);
    await mouseAt(p, '#b-split'); await sleep(100); t = await errs(p);
    ck(w + ' clicking "Fix N things" lands focus on the first wrong field (in view), still no split', /^m-t/.test(t.active) && !t.s2 && await p.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), t);
    await fill(p, 'x'.repeat(61), [['t'.repeat(41), 5], ['Rake', 5], ['rake ', 5]], [['h'.repeat(26), 5], ['Ana', 5], ['ana', 5]]); await split(p); t = await errs(p);
    ck(w + ' caps (session 60 / task 40 / helper 24, Writer {one,other}) and case-insensitive duplicates (Writer, typed name in its “” slot)', t.msgs.join('|') === ['Up to 60 characters. 1 over.', 'Up to 40 characters. 1 over.', M.fill(C.taskDuplicate, { name: 'Rake' }), 'Up to 24 characters. 2 over.', M.fill(C.helperDuplicate, { name: 'Ana' })].join('|') && t.msgs[2] === 'Two tasks are both called “Rake”.' && t.btn === 'Fix 5 things to continue', t);
    t = await p.evaluate(() => { for (let i = 0; i < 20; i++) { document.getElementById('add-task').click(); document.getElementById('add-helper').click(); } return { tasks: document.getElementById('tasks').children.length, helpers: document.getElementById('helpers').children.length, at: document.getElementById('add-task').disabled, ah: document.getElementById('add-helper').disabled, tm: document.getElementById('tasks-max').hidden ? '' : document.getElementById('tasks-max').textContent, hm: document.getElementById('helpers-max').hidden ? '' : document.getElementById('helpers-max').textContent, th: document.getElementById('tasks-h').textContent, hh: document.getElementById('helpers-h').textContent }; });
    ck(w + ' row limits: 12 tasks / 5 helpers, Add disabled at the limit with tooManyTasks / tooManyHelpers shown; headings count', t.tasks === 12 && t.helpers === 5 && t.at && t.ah && t.tm === 'Up to 12 tasks.' && t.hm === 'Up to 5 helpers.' && t.th === 'Tasks · 12 of 12' && t.hh === 'Helpers · 5 of 5', t);
    t = await p.evaluate(() => { const lab = i => document.querySelector(`label[for="${i.id}"]`).textContent, ti = [...document.querySelectorAll('#tasks input')], hi = [...document.querySelectorAll('#helpers input')];
      return { rmT: [...document.querySelectorAll('#tasks .fh-rm')].map(b => b.getAttribute('aria-label')), rmH: [...document.querySelectorAll('#helpers .fh-rm')].map(b => b.getAttribute('aria-label')), t: [lab(ti[0]), lab(ti[1]), lab(ti[23])], h: [lab(hi[0]), lab(hi[1]), lab(hi[9])] }; });
    ck(w + ' row labels (Writer taskRowLabel/minutesRowLabel/helperRowLabel/helperMinutesRowLabel); Remove “typed name” quoted; blank rows removeTaskBlank/removeHelperBlank',
      t.t.join('|') === 'Task 1|Minutes for task 1|Minutes for task 12' && t.h.join('|') === 'Helper 1|Minutes for helper 1|Minutes for helper 5' && t.rmT[0] === 'Remove “' + 't'.repeat(41) + '”' && t.rmT[1] === 'Remove “Rake”' && t.rmT[11] === 'Remove task 12' && t.rmH[1] === 'Remove “Ana”' && t.rmH[4] === 'Remove helper 5', t);
    // ---------- worked example (Suggest)
    await p.reload({ waitUntil: 'load' }); await sleep(200);
    await fill(p, TITLE, TS, HS); await typeInto(p, '#tasks .row:nth-child(1) input.min', '40'); await split(p); t = await state(p);
    const r0 = FH.suggest(mk(HS), mk(TS));
    ck(w + ' S2 heading + tally + conservation (Writer, numbers from the proto): 260 work · 315 available · 260 given out · 0 bench · 260 + 0 = 260 ✓ nothing lost', t.h === C.suggestHeading && t.tally === '260 min of work · 315 min available · 260 given out · 0 on the bench · 260 + 0 = 260 ✓ nothing lost' && t.on === 's1,s2,s5', t);
    ck(w + ' simple-rule label line on the Suggest result (ruleHeading + ruleText verbatim)', t.rule === C.ruleHeading + ' ' + C.ruleText, t.rule);
    ck(w + ' rolls exact (proto r1d order): Ana Rake/Haul/Clean/Fix 115 of 120, Ben 50, Chen 70, Dee rolled up, Eli 25; tabs + aria quoted',
      JSON.stringify(t.cards.map(c => c.tab + ': ' + c.sticks.join(', '))) === JSON.stringify(['“Ana”: “Rake paths” 45, “Haul yard bags to curb” 35, “Clean and oil tools” 20, “Fix gate latch” 15', '“Ben”: “Turn compost bed A” 30, “Empty rain barrels” 20', '“Chen”: “Pull tomato cages” 40, “Turn compost bed B” 30', '“Dee”: ', '“Eli”: “Cover raised beds” 25'])
      && t.cards.map(c => c.load).join('|') === '115 of 120 min · 5 min spare|50 of 60 min · 10 min spare|70 of 90 min · 20 min spare|' + C.rolledUp + '|25 of 45 min · 20 min spare' && t.cards[0].label === '“Ana”: 115 of 120 min · 5 min spare' && t.cards[3].zero && t.cards[0].btn === 'Copy the card for “Ana”', t.cards);
    ck(w + ' stamp under every card (5/5) = Writer stamp', t.cards.length === 5 && t.cards.every(c => c.stamp === C.stamp), t.cards.map(c => c.stamp));
    ck(w + ' bench: benchHeadingEmpty above benchEmpty, no copy button, no benchExplain', t.benchEmpty === C.benchEmpty && t.benchH === C.benchHeadingEmpty && t.benchH === 'Still on the bench: none' && !t.benchBtn && !t.explain && !t.bench.length, t);
    ck(w + ' sheet: “title” heading, one row per helper (quoted), tasks as sheetTaskCell joined " · ", stamp, sheetRule, sheetNote', t.sheetH === '“Garden cleanup, Saturday”: who does what' && t.sheet[0] === '“Ana” | “Rake paths” 45 min · “Haul yard bags to curb” 35 min · “Clean and oil tools” 20 min · “Fix gate latch” 15 min | 115 of 120 min' && t.sheet[3] === '“Dee” | ' + C.rolledUp + ' | 0 of 0 min' && t.sheet.length === 5 && t.sheetStamp === C.stamp && t.sheetRule === C.sheetRule && t.sheetNote === C.sheetNote, t.sheet);
    // copy every card: Writer cardText exactly (names, title, tasks quoted), stamp inside each copied card
    await p.evaluate(() => { window.__clip = []; document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); }); await sleep(150);
    t = await p.evaluate(() => ({ clip: window.__clip, ph: document.getElementById('preview-h').textContent, pt: document.getElementById('preview-t').textContent, toast: document.getElementById('toast').textContent }));
    ck(w + ' copy card x5: each equals Writer finals cardText / cardTextNoTasks (For: “name” / Session: “title” / “task”); stamp inside every copied card; preview + toast', t.clip.length === 5 && t.clip.every((c, i) => c === FH.cardText(C, TITLE, r0.rows[i]) && c.includes(C.stamp)) && t.clip[0].startsWith('For: “Ana”\nSession: “Garden cleanup, Saturday”\n• “Rake paths” 45 min') && t.clip[3] === 'For: “Dee”\nSession: “Garden cleanup, Saturday”\nNo tasks for you this time (0 minutes).\n' + C.stamp && t.ph === 'What the card for “Eli” says' && t.pt === t.clip[4] && t.toast === C.copied, t);
    // roll scale: track/stick widths follow minutes / max(helper minutes, loads)
    t = await p.evaluate(() => { const a = document.querySelector('#rolls article'), tr = a.querySelector('.track'), st = a.querySelector('.stick'), roll = a.querySelector('.roll'), me = a.querySelector('.meter');
      return { tw: tr.getBoundingClientRect().width, sw: st.getBoundingClientRect().width, rw: roll.getBoundingClientRect().width, rollShown: getComputedStyle(roll).display !== 'none', meter: getComputedStyle(me).display !== 'none', sc: tr.style.getPropertyValue('--sc'), cap: me.querySelector('.cap').getBoundingClientRect().width, mw: me.getBoundingClientRect().width }; });
    if (w > 640) ck(w + ' tool roll scale: roll = 120/120 of the track, first stick (45) = 45/120; meter hidden', t.rollShown && !t.meter && t.sc === '120' && Math.abs(t.rw - t.tw) < 2 && Math.abs(t.sw - t.tw * 45 / 120) < 3, t);
    else ck(w + ' phone (≤640): meter instead of the roll; meter cap = 120/120; sticks listed as rows', !t.rollShown && t.meter && Math.abs(t.cap - t.mw) < 2, t);
    // print = sheet only, one page
    await p.emulateMediaType('print'); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), share: document.getElementById('share').getClientRects().length, btns: [...document.querySelectorAll('button')].filter(b => b.getClientRects().length).length, head: document.getElementById('head').getClientRects().length }));
    await p.emulateMediaType(null);
    ck(w + ' print: the table sheet only (no form, rolls, buttons or share box)', t.on === 's5' && !t.share && !t.btns && !t.head, t);
    if (w === W[W.length - 1]) { const pages = pdfPages(await p.pdf({ format: 'letter' })); ck(w + ' print: one Letter page', pages === 1, pages); }
    // ---------- short-handed: change the minutes (Chen 60, Eli 0) -> bench 35, change summary, benchExplain
    await p.click('#b-change'); await sleep(80); const act = await p.evaluate(() => document.activeElement.closest('#helpers') && document.activeElement.classList.contains('min'));
    await fill(p, TITLE, TS, [['Ana', 120], ['Ben', 60], ['Chen', 60], ['Dee', 0], ['Eli', 0]]); await split(p); t = await state(p);
    ck(w + ' "Change the minutes" focuses the first helper\'s minutes', act, act);
    ck(w + ' short-handed: heading, tally 260/240/225/35 with conservation, change summary quoted (Writer changeSummary/changeItem)', t.h === C.suggestHeadingShort && t.tally === '260 min of work · 240 min available · 225 given out · 35 on the bench · 225 + 35 = 260 ✓ nothing lost' && t.change === 'What changed: “Chen” 90 → 60 min · “Eli” 45 → 0 min', t);
    ck(w + ' short-handed: rule line still on the Suggest result; bench = Empty rain barrels 20 + Fix gate latch 15; Writer benchHeading; benchExplain with spare list joined " · "',
      t.rule === C.ruleHeading + ' ' + C.ruleText && t.benchH === 'Still on the bench: 2 tasks · 35 min' && t.bench.join('|') === '“Empty rain barrels”20|“Fix gate latch”15' && t.explain === M.fill(C.benchExplain, { m: 35, list: M.raw('“Ana” 5 · “Ben” 5 · “Chen” 5') }) && t.cards.every(c => c.stamp === C.stamp), t);
    ck(w + ' sheet bench row (sheetBenchRow, sheetTaskCell, sheetMinutes) on a short-handed sheet', t.sheet[5] === C.sheetBenchRow + ' | “Empty rain barrels” 20 min · “Fix gate latch” 15 min | 35 min', t.sheet);
    await p.evaluate(() => { window.__clip = []; document.getElementById('b-bench').click(); }); await sleep(100); t = await p.evaluate(() => window.__clip[0]);
    ck(w + ' copy the bench list: Writer benchText exactly, title and tasks quoted, stamp last', t === 'Still on the bench for “Garden cleanup, Saturday”:\n• “Empty rain barrels” 20 min\n• “Fix gate latch” 15 min\n' + C.stamp, t);
    // spoofed title + task (Q1): template-framed “{title}” / “{task}” get the shared normalisation, never a second pair of quotes
    await fill(p, 'Fest” · Pay “me', [['Rake” 999 min “Bank', 10], ['Big', 200]], [['Ana', 30], ['Ben', 0]]); await split(p);
    await p.evaluate(() => { window.__clip = []; document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); document.getElementById('b-bench').click(); }); await sleep(150);
    t = await p.evaluate(() => ({ clip: window.__clip, sheetH: document.getElementById('sheet-h').textContent, cell: document.querySelector('#sheet-t tbody td:nth-child(2)').textContent }));
    ck(w + ' Q1 spoof: a typed ” in the session title / task name cannot close the frame (card, bench text, sheet); no doubled quotes', t.clip[0] === 'For: “Ana”\nSession: “Fest" · Pay "me”\n• “Rake" 999 min "Bank” 10 min\n= 10 of your 30 min.\nTask names and minutes are my estimates.\n' + C.stamp + '\nIf something doesn\'t work for you, tell me.'
      && t.clip[2] === 'Still on the bench for “Fest" · Pay "me”:\n• “Big” 200 min\n' + C.stamp && t.sheetH === '“Fest" · Pay "me”: who does what' && t.cell === '“Rake" 999 min "Bank” 10 min' && !t.clip.some(c => /””|““/.test(c)), t);
    await fill(p, TITLE, [['Big', 200]], [['Eli', 45]]); await split(p); await p.evaluate(() => { window.__clip = []; document.querySelector('#rolls article .hhead button').click(); }); await sleep(100);
    t = await p.evaluate(() => window.__clip[0]);
    ck(w + ' helper with minutes but no task: Writer cardTextNoFit', t === 'For: “Eli”\nSession: “Garden cleanup, Saturday”\nNo tasks for you in this split. You offered 45 min.\n' + C.stamp + '\nIf something doesn\'t work for you, tell me.', t);
    // ---------- Check mode
    await p.reload({ waitUntil: 'load' }); await sleep(200); await fill(p, TITLE, TS, HS); await p.click('#m-check'); await sleep(80);
    t = await p.evaluate(() => ({ shown: !document.getElementById('check').hidden, h: document.getElementById('check-h').textContent, n: document.querySelectorAll('#check-rows select').length, lab: document.querySelector(`label[for="${document.querySelector('#check-rows select').id}"]`).textContent, note: document.getElementById('check-note').textContent, mins: [...document.querySelectorAll('#check-rows .fh-cm')].map(e => e.textContent).slice(0, 2).join('|'), opts: [...document.querySelector('#check-rows select').options].map(o => o.textContent) }));
    ck(w + ' Check mode: "Your split" panel + checkNote, minutes via sheetMinutes, one select per task labelled "Who does “task”?", options bench + quoted helpers', t.shown && t.h === C.checkHeading && t.note === C.checkNote && t.mins === '40 min|30 min' && t.n === 9 && t.lab === 'Who does “Pull tomato cages”?' && t.opts.join('|') === C.benchOption + '|“Ana”|“Ben”|“Chen”|“Dee”|“Eli”', t);
    const pick = async (i, v) => p.evaluate((i, v) => { const s = document.querySelectorAll('#check-rows select')[i]; s.value = [...s.options].find(o => o.textContent === v).value; s.dispatchEvent(new Event('change', { bubbles: true })); }, i, v);
    await pick(0, '“Dee”'); for (let i = 2; i < 8; i++) await pick(i, '“Ana”'); await pick(8, '“Ben”');
    // the reference Check accepted -10: here Check validates first
    await p.evaluate(() => { const i = document.querySelectorAll('#tasks input.min')[3]; i.value = '-10'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await split(p); t = await errs(p);
    ck(w + ' Check refuses -10 (reference bug not ported): field error, "Fix 1 thing to continue", no result', t.msgs.join('|') === tmi && t.btn === 'Fix 1 thing to continue' && !t.s2, t);
    await p.evaluate(() => { const i = document.querySelectorAll('#tasks input.min')[3]; i.value = '45'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(60);
    const kept = await p.evaluate(() => [...document.querySelectorAll('#check-rows select')].map(s => s.selectedOptions[0].textContent).join(','));
    await split(p); t = await state(p);
    ck(w + ' check selections survive editing the minutes', kept === '“Dee”,— on the bench —,“Ana”,“Ana”,“Ana”,“Ana”,“Ana”,“Ana”,“Ben”', kept);
    ck(w + ' Check result: "What it adds up to", no rule line, tally 260/315/230/30 + conservation, overList quoted (Writer)', t.h === C.checkTotals && !t.rule && t.tally === '260 min of work · 315 min available · 230 given out · 30 on the bench · 230 + 30 = 260 ✓ nothing lost' && t.over === '2 people over their minutes: “Ana” by 50, “Dee” by 40. Nothing is changed for you; move a task or ask them.', t);
    ck(w + ' Check never moves tasks: Ana keeps her six in typed order; Dee (0 min) holds Pull tomato cages, over by its 40 minutes (overBy), stick painted over', t.cards[0].sticks.join(', ') === '“Turn compost bed B” 30, “Rake paths” 45, “Cover raised beds” 25, “Clean and oil tools” 20, “Haul yard bags to curb” 35 over, “Fix gate latch” 15 over' && t.cards[3].sticks.join() === '“Pull tomato cages” 40 over' && t.cards[3].overtag === 'Over by 40 min · “Dee” has 0 min' && t.cards[0].overtag === 'Over by 50 min · “Ana” has 120 min' && t.cards.every(c => c.stamp === C.stamp) && t.bench.join() === '“Turn compost bed A”30', t.cards);
    ck(w + ' Check sheet: sheetRuleCheck, over shown in the minutes column, stamp', t.sheetRule === C.sheetRuleCheck && t.sheet[3] === '“Dee” | “Pull tomato cages” 40 min | 40 of 0 min · Over by 40 min · “Dee” has 0 min' && t.sheetStamp === C.stamp, t.sheet);
    t = await p.evaluate(() => { const s = [...document.querySelectorAll('#rolls .stick.over')]; return s.map(e => e.style.getPropertyValue('--p')); });
    ck(w + ' over paint --p per stick: Ana past 120 at Haul (100-120 fits Clean; Haul 120-155 and Fix all over) -> 100%, 100%; Dee 100%', t.join() === '100%,100%,100%', t);
    await p.click('#m-suggest'); await split(p); t = await state(p);
    ck(w + ' back to Suggest: rule line is back on the result', t.rule === C.ruleHeading + ' ' + C.ruleText && t.h === C.suggestHeading, t.h);
    let o = await overflow(p); ck(w + ' no sideways scroll (results)', o.sw <= o.w && !o.bad.length, o);
    // ---------- link: warning shown before the link exists
    t = await p.evaluate(() => ({ warn: document.getElementById('link-warn').textContent, warnShown: document.getElementById('link-warn').getClientRects().length > 0, holds: document.getElementById('link-holds').textContent, box: document.getElementById('link-box').hidden, h: document.getElementById('share-h').textContent, b: document.getElementById('b-link').textContent, hash: location.hash }));
    ck(w + ' share: heading, linkWarning + linkHolds shown BEFORE any link exists; no link yet; address bar untouched', t.warn === C.linkWarning && t.warnShown && t.holds === C.linkHolds && t.box && t.h === C.shareHeading && t.b === C.makeLink && t.hash === '', t);
    await p.evaluate(() => { window.__clip = []; }); await p.click('#b-link'); await sleep(120);
    t = await p.evaluate(() => ({ v: document.getElementById('link').value, clip: window.__clip[0], hash: location.hash }));
    const frag = t.v.split('#')[1] || '';
    ck(w + ' link: #fh1. fragment ≤ 1,000 chars, copied, only title/tasks/minutes/first names/split inside; page hash untouched', /^fh1\.[A-Za-z0-9_-]+\.[0-9a-f]{6}$/.test(frag) && frag.length <= 1000 && t.clip === t.v && t.hash === '' && JSON.stringify(Object.keys(JSON.parse(M.b64d(frag.split('.')[1]))).sort()) === '["a","h","k","m","t"]', t);
    // recipient
    const r = await s.b.newPage(); await r.setViewport({ width: w, height: 900 }); await r.evaluateOnNewDocument(clipStub); await r.goto(t.v, { waitUntil: 'load' }); await sleep(250);
    t = await state(r); const rv = await r.evaluate(() => ({ intro: document.getElementById('recv').hidden ? '' : document.getElementById('recv-intro').textContent, note: document.getElementById('recv-note').textContent, share: document.getElementById('share').hidden, change: getComputedStyle(document.getElementById('b-change')).display, dis: [...document.querySelectorAll('#form input,#form select,#form button')].every(e => e.disabled), formShown: getComputedStyle(document.getElementById('s1')).display !== 'none' }));
    ck(w + ' recipient: receiverIntro + receiverNote, the proposed split (rule line, rolls, stamp under every card, sheet with stamp); share + change hidden; form disabled (shared readOnly) and not shown',
      rv.intro === C.receiverIntro && rv.note === C.receiverNote && rv.share && rv.change === 'none' && rv.dis && !rv.formShown && t.rule === C.ruleHeading + ' ' + C.ruleText && t.cards.length === 5 && t.cards.every(c => c.stamp === C.stamp) && t.sheetStamp === C.stamp && t.sheetH === '“Garden cleanup, Saturday”: who does what' && t.cards[0].sticks.length === 4, { rv, t });
    await r.evaluate(() => { window.__clip = []; document.querySelector('#rolls article .hhead button').click(); }); await sleep(100); const rclip = await r.evaluate(() => window.__clip[0]);
    ck(w + ' recipient copies a card: same Writer text with the stamp', rclip === FH.cardText(C, TITLE, r0.rows[0]), rclip);
    const ra = await recipientAccess(r, { facts: [C.receiverIntro, C.stamp, '“Garden cleanup, Saturday”: who does what'], tabTo: ['#own', '#b-print'] });
    ck(w + ' recipient access: not inert / aria-hidden, facts in the a11y tree, Make my own copy + Print reachable by Tab', ra.ok, ra);
    await r.click('#own'); await sleep(250); t = await state(r); const rown = await r.evaluate(() => ({ hash: location.hash, dis: [...document.querySelectorAll('#form input')].some(e => e.disabled), title: document.getElementById('f-title').value, n: document.querySelectorAll('#tasks .row').length, recv: document.getElementById('recv').hidden, share: document.getElementById('share').hidden }));
    ck(w + ' Make my own copy: form editable with the same tasks/helpers, split re-run here, link gone from the address bar', rown.hash === '' && !rown.dis && rown.title === TITLE && rown.n === 9 && rown.recv && !rown.share && t.on === 's1,s2,s5' && t.cards[0].sticks.length === 4, rown);
    await r.close();
    // bad / old links
    const bad = await s.b.newPage(); await bad.goto(BASE + '#' + frag.slice(0, -12), { waitUntil: 'load' }); await sleep(150);
    let bt = await bad.evaluate(() => ({ t: document.getElementById('bad').hidden ? '' : document.getElementById('bad-t').textContent, on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join() }));
    const oldH = 'fh0.' + frag.split('.')[1]; await bad.goto(BASE + '#' + oldH + '.' + M.ck(oldH), { waitUntil: 'load' }); await bad.reload({ waitUntil: 'load' }); await sleep(150);
    const ot = await bad.evaluate(() => document.getElementById('bad').hidden ? '' : document.getElementById('bad-t').textContent);
    ck(w + ' cut link -> badLink (empty form offered); older version -> oldVersion', bt.t === C.badLink && bt.on === 's1' && ot === C.oldVersion, { bt, ot }); await bad.close();
    // ---------- typed audit (worked example + spoof case), copied text included
    await p.reload({ waitUntil: 'load' }); await sleep(200);
    const SP = 'Gartenfest “Q”', HN = [['Zorbaq', 30], ['Yuvrex “X”', 25], ['Wexo', 0]], TN = [['Plinktask “Z”', 20], ['Quorvatask', 25], ['Mobrask', 15], ['Xylotask', 30]];
    await fill(p, SP, TN, HN); await split(p); await p.evaluate(() => { window.__clip = []; document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); document.getElementById('b-bench').click(); }); await sleep(150);
    let clips = await p.evaluate(() => window.__clip); await p.click('#m-check'); await sleep(60);
    const seeds = ['Gartenfest “Q”', 'Zorbaq', 'Yuvrex “X”', 'Wexo', 'Plinktask “Z”', 'Quorvatask', 'Mobrask', 'Xylotask'];
    let ta = await typedAudit(p, seeds, Object.fromEntries(clips.map((c, i) => ['clip' + i, c])));
    ck(w + ' typedAudit (Suggest + Check panel + every copied card + bench text, PM Q1 spoof): every typed title / task / helper quoted, raw marks never shown', ta.ok && clips.length === 4, ta.hits);
    await p.evaluate(() => { const s = document.querySelectorAll('#check-rows select'); s[0].value = s[0].options[3].value; s[1].value = s[1].options[1].value; }); await split(p);
    await p.evaluate(() => { window.__clip = []; document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); }); await sleep(120); clips = await p.evaluate(() => window.__clip);
    await p.click('#b-link'); await sleep(100); const lv = await p.evaluate(() => document.getElementById('link').value);
    ta = await typedAudit(p, seeds, Object.fromEntries(clips.map((c, i) => ['clip' + i, c])));
    ck(w + ' typedAudit (Check result with over-by on the 0-minute helper, sheet, overList)', ta.ok, ta.hits);
    const rr = await s.b.newPage(); await rr.goto(lv, { waitUntil: 'load' }); await sleep(200); ta = await typedAudit(rr, seeds);
    ck(w + ' typedAudit (recipient view)', ta.ok && await rr.evaluate(() => !document.getElementById('recv').hidden), ta.hits); await rr.close();
    // ---------- link cap: 12×40-char tasks, 5×24-char helpers, 60-char title -> fragment over 1,000 -> tooLongLink, no link
    await p.reload({ waitUntil: 'load' }); await sleep(200);
    await fill(p, 'T'.repeat(60), Array.from({ length: 12 }, (_, i) => [String.fromCharCode(65 + i).repeat(40), 480]), Array.from({ length: 5 }, (_, i) => [String.fromCharCode(97 + i).repeat(24), 480])); await split(p);
    await p.evaluate(() => { window.__clip = []; }); await p.click('#b-link'); await sleep(120);
    t = await p.evaluate(() => ({ box: document.getElementById('link-box').hidden, msg: document.getElementById('link-long').hidden ? '' : document.getElementById('link-long').textContent, toast: document.getElementById('toast').textContent, clip: window.__clip.length, hash: location.hash }));
    ck(w + ' link cap: fragment over 1,000 chars -> no link, tooLongLink shown + toast; print still offered', t.box && t.msg === C.tooLongLink && t.toast === C.tooLongLink && !t.clip && t.hash === '', t);
    o = await overflow(p); ck(w + ' no sideways scroll at full caps (12 × 40-char tasks, 5 × 24-char helpers)', o.sw <= o.w && !o.bad.length, o);
    if (w === W[W.length - 1]) { const pages = pdfPages(await p.pdf({ format: 'letter' })); ck(w + ' print at full caps: one Letter page', pages === 1, pages); }
    // reset
    await p.click('#b-reset'); await sleep(150); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), title: document.getElementById('f-title').value, n: document.querySelectorAll('#tasks .row').length + document.querySelectorAll('#helpers .row').length, v: [...document.querySelectorAll('#form input[type=text]')].map(i => i.value).join(''), toast: document.getElementById('toast').textContent, btn: document.getElementById('b-split').textContent }));
    ck(w + ' Start over (confirm): cleared to one empty task + one empty helper, results gone, toast "Cleared."', t.on === 's1' && t.title === '' && t.n === 2 && t.v === '' && t.toast === C.resetDone && t.btn === C.primary, t);
    const st0 = await storage(p); ck(w + ' no cookies/localStorage/sessionStorage/IndexedDB/caches/SW, no {placeholders} on screen', !st0.cookie && !st0.ls.length && !st0.ss.length && (!st0.idb.length || st0.idb === 'n/a') && !st0.caches.length && !st0.sw && !st0.undef, st0);
    ck(w + ' no request off the page origin, no query strings, GET only', !netCheck(s.reqs, H, []).offending.length, netCheck(s.reqs, H, []).offending);
    ck(w + ' no page errors (CSP: no inline style attributes)', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }
  process.exit(result(rows));
})();
