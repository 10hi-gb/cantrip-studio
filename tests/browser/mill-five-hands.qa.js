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
const ZEROHEAD = '0 minutes · no tasks'; // STAND-IN in app.js (SI.zeroHead), logged in writer/ENGINEER-NEEDS-five-hands.txt
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

// ---- Creative design check 5f127ab (items 1–6) helpers: Creative's reference data, S4 assignment, pixel sampling of a screenshot
const CTITLE = 'Community garden cleanup, Saturday';
const CHK = { 'Rake paths': 'Ana', 'Haul yard bags to curb': 'Ana', 'Turn compost bed A': 'Ben', 'Turn compost bed B': 'Ben', 'Clean and oil tools': 'Ben', 'Pull tomato cages': 'Chen', 'Fix gate latch': 'Dee', 'Cover raised beds': 'Eli' };
async function checkS4(p) { await p.evaluate(CHK => { const m = document.getElementById('m-check'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelectorAll('#check-rows select').forEach(s => { const lab = document.querySelector(`label[for="${s.id}"]`).textContent, t = Object.keys(CHK).find(k => lab === 'Who does “' + k + '”?');
    s.value = t ? [...s.options].find(o => o.textContent === '“' + CHK[t] + '”').value : ''; }); }, CHK); }
// sample page pixels (CSS px, viewport coords) from a real screenshot, decoded on a blank page's canvas
async function pixels(p, b, pts) { const sc = await p.evaluate(() => [scrollX, scrollY]); pts = pts.map(([x, y]) => [x + sc[0], y + sc[1]]); const png = await p.screenshot({ encoding: 'base64', fullPage: true }), dpr = await p.evaluate(() => devicePixelRatio), q = await b.newPage();
  const out = await q.evaluate(async (png, pts, dpr) => { const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return pts.map(([X, Y]) => [...x.getImageData(Math.round(X * dpr), Math.round(Y * dpr), 1, 1).data].slice(0, 3)); }, png, pts, dpr); await q.close(); return out; }
const near = (c, t, d = 14) => c.every((v, i) => Math.abs(v - t[i]) <= d);
const RED = [200, 54, 31];
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
      && t.cards.map(c => c.load).join('|') === '115 of 120 min · 5 min spare|50 of 60 min · 10 min spare|70 of 90 min · 20 min spare|' + ZEROHEAD + '|25 of 45 min · 20 min spare' && t.cards[0].label === '“Ana”: 115 of 120 min · 5 min spare' && t.cards[3].zero && t.cards[0].btn === 'Copy the card for “Ana”', t.cards);
    ck(w + ' stamp under every card (5/5) = Writer stamp', t.cards.length === 5 && t.cards.every(c => c.stamp === C.stamp), t.cards.map(c => c.stamp));
    ck(w + ' bench: benchHeadingEmpty above benchEmpty, no copy button, no benchExplain', t.benchEmpty === C.benchEmpty && t.benchH === C.benchHeadingEmpty && t.benchH === 'Still on the bench: none' && !t.benchBtn && !t.explain && !t.bench.length, t);
    ck(w + ' sheet: “title” heading, one row per helper (quoted), tasks as sheetTaskCell joined " · ", stamp, sheetRule, sheetNote', t.sheetH === '“Garden cleanup, Saturday”: who does what' && t.sheet[0] === '“Ana” | “Rake paths” 45 min · “Haul yard bags to curb” 35 min · “Clean and oil tools” 20 min · “Fix gate latch” 15 min | 115 of 120 min · 5 min spare' && t.sheet.slice(1, 5).join('/') === '“Ben” | “Turn compost bed A” 30 min · “Empty rain barrels” 20 min | 50 of 60 min · 10 min spare/“Chen” | “Pull tomato cages” 40 min · “Turn compost bed B” 30 min | 70 of 90 min · 20 min spare/“Dee” | ' + C.rolledUp + ' | 0 of 0 min/“Eli” | “Cover raised beds” 25 min | 25 of 45 min · 20 min spare' && t.sheet[3] === '“Dee” | ' + C.rolledUp + ' | 0 of 0 min' && t.sheet.length === 6 && t.sheet[5] === C.sheetBenchRow + ' | ' + C.benchEmpty + ' | 0 min' && t.sheetStamp === C.stamp && t.sheetRule === C.sheetRule && t.sheetNote === C.sheetNote, t.sheet);
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
    ck(w + ' Check never moves tasks: Ana keeps her six in typed order; Dee (0 min) holds Pull tomato cages, over by its 40 minutes (overBy), stick painted over', t.cards[0].sticks.join(', ') === '“Turn compost bed B” 30, “Rake paths” 45, “Cover raised beds” 25, “Clean and oil tools” 20, “Haul yard bags to curb” 35 over, “Fix gate latch” 15 over' && t.cards[3].sticks.join() === '“Pull tomato cages” 40 over' && t.cards[3].load === '40 of 0 min · Over by 40 min · “Dee” has 0 min' && t.cards[0].load === '170 of 120 min · Over by 50 min · “Ana” has 120 min' && t.cards.every(c => !c.overtag) && t.cards.every(c => c.stamp === C.stampCheck) && t.bench.join() === '“Turn compost bed A”30', t.cards);
    ck(w + ' Check sheet: sheetRuleCheck, over shown in the minutes column, stamp', t.sheetRule === C.sheetRuleCheck && t.sheet[3] === '“Dee” | “Pull tomato cages” 40 min | 40 of 0 min · Over by 40 min · “Dee” has 0 min' && t.sheetStamp === C.stampCheck, t.sheet);
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


    // ---------- QA local-8206084 H1: nothing from a previous plan prints after Start over or a bad link (sheet DOM + state emptied; print shows #s5 only when current)
    { await p.reload({ waitUntil: 'load' }); await sleep(200); await fill(p, CTITLE, TS, HS); await split(p);
      const pr = async () => { await p.emulateMediaType('print'); const r = await p.evaluate(() => ({ s5: getComputedStyle(document.getElementById('s5')).display !== 'none', text: document.body.innerText.trim(), rows: document.querySelectorAll('#sheet-t tbody tr').length, h: document.getElementById('sheet-h').textContent, stamp: document.getElementById('sheet-stamp').textContent, rolls: document.querySelectorAll('#rolls article').length, plank: document.getElementById('plank').textContent })); await p.emulateMediaType(null); return r; };
      const before = await pr();
      ck(w + ' QA H1: with a current split, print shows the sheet (title, 6 rows)', before.s5 && before.rows === 6 && before.text.includes('“Community garden cleanup, Saturday”: who does what'), before);
      await p.click('#b-reset'); await sleep(200); const toast = await p.evaluate(() => document.getElementById('toast').textContent); const after = await pr();
      ck(w + ' QA H1 (a): Start over → OK ("Cleared."): print emulation shows nothing from the old plan; sheet heading, rows and stamp emptied; rolls and bench emptied', toast === C.resetDone && !after.s5 && !after.text.includes('Community garden') && !after.text.includes('Ana') && after.rows === 0 && !after.h && !after.stamp && !after.rolls && !after.plank, after);
      await fill(p, CTITLE, TS, HS); await split(p); await p.click('#b-link'); await sleep(150); const good = await p.evaluate(() => document.getElementById('link').value);
      const q = await s.b.newPage(); await q.setViewport({ width: w, height: 900 }); await q.goto(good, { waitUntil: 'load' }); await sleep(250);
      const okRecv = await q.evaluate(() => !document.getElementById('recv').hidden && document.querySelectorAll('#sheet-t tbody tr').length === 6);
      await q.evaluate(f => { location.hash = f; }, good.split('#')[1].slice(0, -9) + 'zz'); await sleep(300);
      await q.emulateMediaType('print'); const bad = await q.evaluate(() => ({ s5: getComputedStyle(document.getElementById('s5')).display !== 'none', text: document.body.innerText.trim(), rows: document.querySelectorAll('#sheet-t tbody tr').length, h: document.getElementById('sheet-h').textContent, rolls: document.querySelectorAll('#rolls article').length }));
      await q.emulateMediaType(null); const badScreen = await q.evaluate(() => document.getElementById('bad').hidden ? '' : document.getElementById('bad-t').textContent);
      ck(w + ' QA H1 (b): a valid link, then a malformed link in the same tab: badLink on screen; print emulation shows nothing from the earlier split; sheet DOM emptied', okRecv && badScreen === C.badLink && !bad.s5 && !bad.text.includes('Community garden') && !bad.text.includes('Ana') && bad.rows === 0 && !bad.h && !bad.rolls, { okRecv, badScreen, bad });
      await q.close(); }
    // ---------- QA H2: numbers never break. Sweep task names 1–40 chars (spaced/hyphenated words, and one unbroken word) with 15 minutes
    if (w <= 390) { const bad = [];
      for (const kind of ['words', 'one']) for (let L = 1; L <= 40; L++) {
        const nm = kind === 'one' ? 'W'.repeat(L) : 'Disassemble-and-reassemble greenhouse roof'.slice(0, L).replace(/[\s-]+$/, '') || 'D';
        await fill(p, CTITLE, [[nm, 15], ['Rake paths', 45]], [['Ana', 120]]); await p.evaluate(() => { const m = document.getElementById('m-suggest'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('b-split').click(); });
        const r = await p.evaluate(nm => { const out = [], lines = el => { const rg = document.createRange(); rg.selectNodeContents(el); return new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size; };
          document.querySelectorAll('#rolls .stick').forEach(st => { const m = st.querySelector('.m'); if (lines(m) !== 1) out.push('minutes "' + m.textContent + '" on ' + lines(m) + ' lines'); });
          const st = [...document.querySelectorAll('#rolls .stick')].find(x => x.querySelector('.t').textContent === '“' + nm + '”'), t = st.querySelector('.mill-typed'), tn = t.firstChild, box = st.querySelector('.t').getBoundingClientRect().width, cx = document.createElement('canvas').getContext('2d'); cx.font = getComputedStyle(t).font;
          // each word (between spaces/hyphens) stays on one line unless that word alone is wider than its box
          let i = 0; for (const wd of nm.split(/(?<=[\s-])/)) { const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + wd.trimEnd().length); i += wd.length; const rs = [...rg.getClientRects()].filter(x => x.width > 0);
            if (new Set(rs.map(x => Math.round(x.top))).size > 1 && cx.measureText(wd.trimEnd()).width < box - 1) out.push('word "' + wd + '" broken though it fits'); }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('sideways scroll');
          return out; }, nm);
        if (r.length) bad.push(kind + ' ' + L + ': ' + r.join('; ')); }
      ck(w + ' QA H2: task names 1–40 chars (words and one unbroken word), 15 min: the minutes never break; words break only at spaces/hyphens unless one word is wider than its box; no sideways scroll', !bad.length, bad.slice(0, 8)); }
    // ---------- Creative design check 5f127ab (items 1–6), Creative's reference data
    await p.reload({ waitUntil: 'load' }); await sleep(200); await fill(p, CTITLE, TS, HS); await split(p); await p.evaluate(() => document.fonts.ready);
    t = await p.evaluate(() => { const a = [...document.querySelectorAll('#rolls article')], d = a[3];
      return { dee: d.querySelector('.load').textContent, deeLabel: d.getAttribute('aria-label'), zn: getComputedStyle(d.querySelector('.zeronote')).display !== 'none' ? [...d.querySelectorAll('.zeronote span')].map(x => x.textContent) : null, deeText: d.innerText,
        anaSpare: a[0].querySelector('.load .spare').textContent, anaSpareC: getComputedStyle(a[0].querySelector('.load .spare')).color,
        benchH: document.getElementById('bench-h').textContent, benchHShown: document.getElementById('bench-h').getClientRects().length > 0 && getComputedStyle(document.getElementById('bench-h')).visibility !== 'hidden',
        benchEmpty: (document.querySelector('#plank .empty') || {}).textContent, inBench: document.getElementById('bench').contains(document.getElementById('b-bench')) && document.getElementById('bench').contains(document.getElementById('bench-explain')) }; });
    ck(w + ' C3 Dee (0 min, no tasks): header "0 minutes · no tasks" (stand-in), never "Rolled up" in the header; aria-label = quoted name + header; ' + (w > 640 ? 'label by the rolled roll = rolledUp + zeroHint' : 'phone: roll label hidden'),
      t.dee === ZEROHEAD && !/Rolled up/.test(t.dee) && t.deeLabel === '“Dee”: ' + ZEROHEAD && (w > 640 ? t.zn && t.zn.join('|') === C.rolledUp + '|' + C.zeroHint && t.deeText.split(C.rolledUp).length === 2 : t.zn === null && !t.deeText.includes(C.rolledUp)), t);
    ck(w + ' C2 spare: "· N min spare" (loadSpare) after loadLine, green', t.anaSpare === C.tallySep + '5 min spare' && t.anaSpareC === 'rgb(62, 94, 46)', t);
    ck(w + ' C4 empty bench: "Still on the bench" heading always shown (benchHeadingEmpty) above benchEmpty; explainer + copy button live inside the bench', t.benchHShown && t.benchH === C.benchHeadingEmpty && t.benchEmpty === C.benchEmpty && t.inBench, t);
    await p.emulateMediaType('print'); t = await p.evaluate(() => [...document.querySelectorAll('#sheet-t tbody tr')].filter(r => r.getClientRects().length).map(r => [...r.cells].map(c => c.textContent).join(' | '))); await p.emulateMediaType(null);
    ck(w + ' C4 print emulation: the sheet always prints the bench row, empty too (sheetBenchRow | benchEmpty | 0 min)', t.length === 6 && t[5] === C.sheetBenchRow + ' | ' + C.benchEmpty + ' | 0 min', t);
    // S4: Check with Creative's assignment (Ben 80/60, Dee 15/0)
    await checkS4(p); await split(p); await sleep(700); // sticks slide in (500ms)
    t = await p.evaluate(() => { const a = [...document.querySelectorAll('#rolls article')], ben = a[1], dee = a[3], ana = a[0];
      const g = e => e.getBoundingClientRect(), bs = [...ben.querySelectorAll('.stick')], over = ben.querySelector('.stick.over'), roll = ben.querySelector('.roll'), ds = dee.querySelector('.stick'), rolled = dee.querySelector('.rolled');
      const st = e => { const c = getComputedStyle(e); return { bg: c.backgroundColor, img: c.backgroundImage, color: c.color }; };
      return { benLoad: ben.querySelector('.load').textContent, benOver: ben.querySelector('.load .over').textContent, benOverC: getComputedStyle(ben.querySelector('.load .over')).color, benLabel: ben.getAttribute('aria-label'),
        deeLoad: dee.querySelector('.load').textContent, anaLoad: ana.querySelector('.load').textContent, overzones: document.querySelectorAll('.overzone').length, overtags: document.querySelectorAll('.overtag').length,
        bens: bs.map(x => x.className + ' ' + x.style.getPropertyValue('--p')), deeCls: ds.className, overSt: st(over), deeSt: st(ds), fitSt: st(bs[0]),
        rollR: roll && getComputedStyle(roll).display !== 'none' ? g(roll).right : null, overL: g(over).left, overR: g(over).right, overT: g(over).top, overB: g(over).bottom, fitR: g(bs[1]).right, fitL: g(bs[0]).left,
        dee: [g(ds).left, g(ds).right, g(ds).top, g(ds).bottom], rolled: rolled && getComputedStyle(rolled).display !== 'none' ? [g(rolled).left, g(rolled).right, g(rolled).top, g(rolled).bottom] : null,
        stamps: a.map(x => x.querySelector('.stampline').textContent), sheetStamp: document.getElementById('sheet-stamp').textContent }; });
    ck(w + ' C2 over: Ben "80 of 60 min · Over by 20 min · “Ben” has 60 min" (loadLine · overBy, over part red), aria-label the same; Dee "15 of 0 min · Over by 15 min · “Dee” has 0 min"; no separate over tag (said once)',
      t.benLoad === '80 of 60 min · Over by 20 min · “Ben” has 60 min' && t.benOver === C.tallySep + 'Over by 20 min · “Ben” has 60 min' && t.benOverC === 'rgb(200, 54, 31)' && t.benLabel === '“Ben”: ' + t.benLoad && t.deeLoad === '15 of 0 min · Over by 15 min · “Dee” has 0 min' && t.anaLoad === '80 of 120 min · 40 min spare' && !t.overtags, t);
    ck(w + ' C1 over-tip classes: Ben only "Clean and oil tools" over, all of it (--p 100%); Dee\'s 15-min stick over, all of it; no translucent overlay element past the roll',
      t.bens.join(',') === 'stick ,stick ,stick over all 100%' && t.deeCls === 'stick over all' && !t.overzones, t);
    ck(w + ' C1 over-tip colour: the over part is solid --fh-over (#C8361F), one flat colour (no grain layer), chalk text; sticks that fit stay pine',
      t.overSt.bg === 'rgb(200, 54, 31)' && t.overSt.img === 'none' && t.deeSt.bg === 'rgb(200, 54, 31)' && t.deeSt.img === 'none' && t.overSt.color === 'rgb(244, 239, 227)' && t.fitSt.img !== 'none' && t.fitSt.bg !== 'rgb(200, 54, 31)', t);
    if (w > 640) {
      ck(w + ' C1 tip geometry: Ben\'s red starts at the roll end (60/80 of the track; ±4px) and the fitting sticks end there; Dee\'s stick sits right of the rolled-up roll, not over it',
        Math.abs(t.overL - t.rollR) <= 4 && t.fitR <= t.rollR + 1 && t.rolled && t.dee[0] >= t.rolled[1] - 1, t);
      const pts = [[t.overL + 4, (t.overT + t.overB) / 2 + 12], [(t.overL + t.overR) / 2, t.overB - 4], [t.overR - 16, t.overT + 8], [t.dee[0] + 4, t.dee[3] - 4], [(t.dee[0] + t.dee[1]) / 2, t.dee[3] - 4], [t.dee[1] - 16, t.dee[2] + 8],
        [t.rollR - 3, t.overB - 2], [(t.rolled[0] + t.rolled[1]) / 2 - 12, (t.rolled[2] + t.rolled[3]) / 2], [t.rolled[0] + 6, (t.rolled[2] + t.rolled[3]) / 2]];
      const px = await pixels(p, s.b, pts);
      ck(w + ' C1 pixels: Ben\'s over part and Dee\'s whole stick paint flat #C8361F at left/middle/right; the roll edge and the rolled-up roll stay canvas (never tinted)',
        px.slice(0, 6).every(c => near(c, RED)) && px.slice(6).every(c => c[0] < 120 && Math.abs(c[0] - c[2]) < 30), px);
    } else {
      const pts = [[t.overL + 6, t.overB - 3], [(t.overL + t.overR) / 2, t.overB - 3], [t.dee[0] + 6, t.dee[3] - 3], [t.dee[1] - 30, t.dee[3] - 3]];
      const px = await pixels(p, s.b, pts);
      ck(w + ' C1 phone: a stick whose minutes are all past the cap is flat #C8361F end to end (Ben "Clean and oil tools", Dee "Fix gate latch")', px.every(c => near(c, RED)), px);
    }
    ck(w + ' C6 Check-mode footer: stampCheck under every card (5/5) and on the sheet; never the Suggest stamp', t.stamps.length === 5 && t.stamps.every(x => x === C.stampCheck) && t.sheetStamp === C.stampCheck, t.stamps);
    await p.evaluate(() => { window.__clip = []; document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); document.getElementById('b-bench').click(); }); await sleep(150);
    t = await p.evaluate(() => window.__clip);
    ck(w + ' C6 Check-mode copied text: every copied card and the bench text end with stampCheck, no Suggest stamp; Ben\'s card exact',
      t.length === 6 && t.every(c => c.includes(C.stampCheck) && !c.includes(C.stamp)) && t[1] === 'For: “Ben”\nSession: “Community garden cleanup, Saturday”\n• “Turn compost bed A” 30 min\n• “Turn compost bed B” 30 min\n• “Clean and oil tools” 20 min\n= 80 of your 60 min.\nTask names and minutes are my estimates.\n' + C.stampCheck + '\nIf something doesn\'t work for you, tell me.' && t[5].endsWith('\n' + C.stampCheck), t);
    const ax = await p.accessibility.snapshot({ root: await p.$('#rolls article .hhead button') });
    const cbt = await p.evaluate(() => [...document.querySelectorAll("#rolls article .hhead button")].map(b => b.textContent));
    ck(w + ' C6 copyCard: visible text and accessible name "Copy the card for “Ana”" (Writer copyCard, name in visible quotes)', ax && ax.name === 'Copy the card for “Ana”' && cbt.join("|") === ["Ana", "Ben", "Chen", "Dee", "Eli"].map(n => 'Copy the card for “' + n + '”').join('|'), { ax, cbt });
    await p.click('#m-suggest'); await split(p); t = await p.evaluate(() => [...document.querySelectorAll('#rolls .stampline')].map(x => x.textContent).concat(document.getElementById('sheet-stamp').textContent));
    ck(w + ' C6 back in Suggest: the Suggest stamp returns on cards and sheet', t.every(x => x === C.stamp), t);
    t = await p.evaluate(() => { const bad = [], small = []; document.querySelectorAll('body *').forEach(e => { const c = getComputedStyle(e); if (c.overflowWrap === 'anywhere' || c.wordBreak === 'break-all') bad.push(e.tagName + '.' + e.className);
        if (e.getClientRects().length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(c.fontSize) < 10) small.push(e.tagName + '.' + e.className + ' ' + c.fontSize); });
      return { bad, small, typed: getComputedStyle(document.querySelector('#rolls .mill-typed')).overflowWrap, stick: getComputedStyle(document.querySelector('#rolls .stick')).overflowWrap }; });
    ck(w + ' wrap rule: no element uses overflow-wrap:anywhere or word-break:break-all; typed text and sticks break-word; no visible text under 10px', !t.bad.length && !t.small.length && t.typed === 'break-word' && t.stick === 'break-word', t);
    // reset
    await p.click('#b-reset'); await sleep(150); t = await p.evaluate(() => ({ on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), title: document.getElementById('f-title').value, n: document.querySelectorAll('#tasks .row').length + document.querySelectorAll('#helpers .row').length, v: [...document.querySelectorAll('#form input[type=text]')].map(i => i.value).join(''), toast: document.getElementById('toast').textContent, btn: document.getElementById('b-split').textContent }));
    ck(w + ' Start over (confirm): cleared to one empty task + one empty helper, results gone, toast "Cleared."', t.on === 's1' && t.title === '' && t.n === 2 && t.v === '' && t.toast === C.resetDone && t.btn === C.primary, t);
    const st0 = await storage(p); ck(w + ' no cookies/localStorage/sessionStorage/IndexedDB/caches/SW, no {placeholders} on screen', !st0.cookie && !st0.ls.length && !st0.ss.length && (!st0.idb.length || st0.idb === 'n/a') && !st0.caches.length && !st0.sw && !st0.undef, st0);
    ck(w + ' no request off the page origin, no query strings, GET only', !netCheck(s.reqs, H, []).offending.length, netCheck(s.reqs, H, []).offending);
    ck(w + ' no page errors (CSP: no inline style attributes)', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }

  // ---------- C5 entry at 320 and 360: name at full width, minutes + × on the line below; title full width; no input text truncated
  for (const w of [320, 360, 390]) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await p.evaluate(() => document.fonts.ready);
    await fill(p, CTITLE, TS, HS); await sleep(100);
    const t = await p.evaluate(() => { const ins = [...document.querySelectorAll('#form input[type=text], #form textarea')], g = e => e.getBoundingClientRect();
      const rowsOf = id => [...document.getElementById(id).children].map(r => { const i = r.querySelectorAll('input'), x = r.querySelector('.fh-rm'); return { n: g(i[0]), m: g(i[1]), x: g(x), row: g(r), v: i[0].value }; });
      const pan = g(document.querySelector('#tasks').closest('.panel')), ti = document.getElementById('f-title');
      return { trunc: ins.filter(i => i.scrollWidth > i.clientWidth || (i.tagName === 'TEXTAREA' && i.scrollHeight > i.clientHeight + 1)).map(i => i.id + ' ' + i.value + ' sw' + i.scrollWidth + '/cw' + i.clientWidth + ' sh' + i.scrollHeight + '/ch' + i.clientHeight),
        rows: rowsOf('tasks').concat(rowsOf('helpers')).map(r => ({ v: r.v, full: Math.abs(r.n.width - r.row.width) < 1, below: r.m.top >= r.n.bottom, sameLine: Math.abs(r.m.top - r.x.top) < 2 && r.x.left > r.m.right, side: Math.abs(r.n.top - r.m.top) < 2 })),
        title: { w: g(ti).width, panel: g(ti.closest('.panel')).width, tag: ti.tagName, h: g(ti).height }, compost: ins.find(i => i.value === 'Turn compost bed A'), haul: ins.find(i => i.value === 'Haul yard bags to curb'),
        vis: ['Turn compost bed A', 'Haul yard bags to curb'].map(v => { const i = ins.find(x => x.value === v); return v + ' ' + i.scrollWidth + '<=' + i.clientWidth + ':' + (i.scrollWidth <= i.clientWidth); }),
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
    if (w <= 360) ck(w + ' C5 stacked rows: every task/helper name input at full row width, minutes and × together on the line below', t.rows.length === 14 && t.rows.every(r => r.full && r.below && r.sameLine), t.rows.filter(r => !(r.full && r.below && r.sameLine)));
    else ck(w + ' C5 above 360 the rows stay one line (name, minutes, ×)', t.rows.every(r => r.side), t.rows.filter(r => !r.side));
    ck(w + ' C5 no input text truncated: every input scrollWidth <= clientWidth ("Turn compost bed A", "Haul yard bags to curb" fully visible); the session title (textarea, grows) shows all of "' + CTITLE + '"; no sideways scroll',
      !t.trunc.length && t.vis.every(v => v.endsWith(':true')) && t.sw <= t.cw, t);
    if (w <= 360) ck(w + ' C5 session title at full panel width', t.title.tag === 'TEXTAREA' && t.title.w >= t.title.panel - 2 * 10 - 1, t.title);
    // Enter in the title submits (like an input), pasted line breaks become spaces
    await p.evaluate(() => { const f = document.getElementById('f-title'); f.value = 'Garden\ncleanup'; f.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.focus('#f-title'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); await sleep(250);
    const e = await p.evaluate(() => ({ v: document.getElementById('f-title').value, s2: document.getElementById('s2').classList.contains('on') }));
    ck(w + ' C5 title: a pasted line break becomes a space; Enter splits (no newline typed)', e.v === 'Garden cleanup' && e.s2, e);
    ck(w + ' C5 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }

  // ---------- QA H3: the WHOLE URL is capped at 2,000 on send and receive (shared MILLVIEW.linkFor), tested under a long path (/mill/ + slashes + five-hands/)
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    const pathFor = n => '/mill/' + '/'.repeat(n) + 'five-hands/';
    await p.goto(`${SCHEME}://${H}${pathFor(0)}`, { waitUntil: 'load' }); await sleep(150);
    // a valid fragment under 1,000 chars from the real encoder
    const st = { title: 'Long-path check ' + 'T'.repeat(30), tasks: Array.from({ length: 12 }, (_, i) => [String.fromCharCode(65 + i).repeat(28) + i, 10 + i]), helpers: [['Ana', 480], ['Ben', 60]] };
    const frag = await p.evaluate(st => { const h = st.helpers.map(x => ({ name: x[0], min: x[1] })), t = st.tasks.map(x => ({ name: x[0], min: x[1] })); return FH.encode(st.title, h, t, FH.suggest(h, t)); }, st);
    const origin = `${SCHEME}://${H}`, base = (origin + pathFor(0) + '#').length, res = {};
    for (const L of [1999, 2000, 2001]) { const n = L - base - frag.length, url = origin + pathFor(n) + '#' + frag; await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(250);
      res[L] = await p.evaluate(() => ({ len: location.href.length, recv: !document.getElementById('recv').hidden, bad: document.getElementById('bad').hidden ? '' : document.getElementById('bad-t').textContent, rows: document.querySelectorAll('#rolls article').length, sheet: document.querySelectorAll('#sheet-t tbody tr').length })); }
    ck('QA H3 receive: long path, whole URL 1,999 and 2,000 open the recipient view (fragment ' + frag.length + ' ≤ 1,000)', frag.length <= 1000 && res[1999].len === 1999 && res[1999].recv && res[1999].rows === 2 && res[2000].len === 2000 && res[2000].recv && res[2000].rows === 2, res);
    ck('QA H3 receive: long path, whole URL 2,001 → badLink, nothing opened, no sheet', res[2001].len === 2001 && !res[2001].recv && res[2001].bad === C.badLink && !res[2001].rows && !res[2001].sheet, res[2001]);
    const send = {};
    for (const L of [1999, 2000, 2001]) { const n = L - base - frag.length; await p.goto('about:blank'); await p.goto(origin + pathFor(n), { waitUntil: 'load' }); await sleep(150);
      await fill(p, st.title, st.tasks, st.helpers); await split(p); await p.evaluate(() => { window.__clip = []; }); await p.click('#b-link'); await sleep(150);
      send[L] = await p.evaluate(() => ({ link: document.getElementById('link-box').hidden ? '' : document.getElementById('link').value, msg: document.getElementById('link-long').hidden ? '' : document.getElementById('link-long').textContent, clip: window.__clip.length }));
      send[L].len = send[L].link.length; }
    ck('QA H3 send: long path, the same state makes a 1,999- and a 2,000-character link (copied); at 2,001 no link, tooLongLink shown, nothing copied',
      send[1999].len === 1999 && send[1999].link.endsWith('#' + frag) && send[1999].clip === 1 && send[2000].len === 2000 && send[2000].clip === 1 && !send[2001].link && send[2001].msg === C.tooLongLink && !send[2001].clip, send);
    ck('QA H3 no page errors on the long path', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})();
