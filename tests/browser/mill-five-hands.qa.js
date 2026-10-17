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
const ZEROHEAD = C.zeroHead; // Writer N12
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
const RED = [174, 47, 27]; // --fh-over #AE2F1B (QA H6/H7: same hue as --red #C8361F, darker)
const lum = c => { const v = c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
// Check mode; who[i] is the helper name for task i ('' = bench)
async function checkAll(p, who) { await p.evaluate(who => { const m = document.getElementById('m-check'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true }));
  [...document.querySelectorAll('#check-rows select')].forEach((s, i) => { const o = [...s.options].find(o => o.textContent === '“' + who[i] + '”'); s.value = o ? o.value : ''; s.dispatchEvent(new Event('change', { bubbles: true })); }); }, who); }
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
    ck(w + ' C3 Dee (0 min, no tasks): header = Writer zeroHead "0 minutes · no tasks", never "Rolled up" in the header; aria-label “Dee”: 0 minutes · no tasks; ' + (w > 640 ? 'label by the rolled roll = rolledUp only (no zeroHint line)' : 'phone (QA H8): the rolledUp label shows once, no zeroHint line'),
      t.dee === '0 minutes · no tasks' && ZEROHEAD === '0 minutes · no tasks' && !/Rolled up/.test(t.dee) && t.deeLabel === '“Dee”: 0 minutes · no tasks' && !t.deeText.includes(C.zeroHint) && (w > 640 ? t.zn && t.zn.join('|') === C.rolledUp && C.rolledUp === 'Rolled up · coming, just not on a task' && t.deeText.split(C.rolledUp).length === 2 : t.zn && t.zn.join('|') === C.rolledUp && t.deeText.split(C.rolledUp).length === 2), t);
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
      t.benLoad === '80 of 60 min · Over by 20 min · “Ben” has 60 min' && t.benOver === C.tallySep + 'Over by 20 min · “Ben” has 60 min' && t.benOverC === 'rgb(174, 47, 27)' && t.benLabel === '“Ben”: ' + t.benLoad && t.deeLoad === '15 of 0 min · Over by 15 min · “Dee” has 0 min' && t.anaLoad === '80 of 120 min · 40 min spare' && !t.overtags, t);
    ck(w + ' C1 over-tip classes: Ben only "Clean and oil tools" over, all of it (--p 100%); Dee\'s 15-min stick over, all of it; no translucent overlay element past the roll',
      t.bens.join(',') === 'stick ,stick ,stick over all 100%' && t.deeCls === 'stick over all' && !t.overzones, t);
    ck(w + ' C1 over-tip colour: the over part is solid --fh-over (#AE2F1B), one flat colour (no grain layer), chalk text; sticks that fit stay pine',
      t.overSt.bg === 'rgb(174, 47, 27)' && t.overSt.img === 'none' && t.deeSt.bg === 'rgb(174, 47, 27)' && t.deeSt.img === 'none' && t.overSt.color === 'rgb(244, 239, 227)' && t.fitSt.img !== 'none' && t.fitSt.bg !== 'rgb(174, 47, 27)', t);
    if (w > 640) {
      ck(w + ' C1 tip geometry: Ben\'s red starts at the roll end (60/80 of the track; ±4px) and the fitting sticks end there; Dee\'s stick sits right of the rolled-up roll, not over it',
        Math.abs(t.overL - t.rollR) <= 4 && t.fitR <= t.rollR + 1 && t.rolled && t.dee[0] >= t.rolled[1] - 1, t);
      const pts = [[t.overL + 4, (t.overT + t.overB) / 2 + 12], [(t.overL + t.overR) / 2, t.overB - 4], [t.overR - 16, t.overT + 8], [t.dee[0] + 4, t.dee[3] - 4], [(t.dee[0] + t.dee[1]) / 2, t.dee[3] - 4], [t.dee[1] - 16, t.dee[2] + 8],
        [t.rollR - 3, t.overB - 2], [(t.rolled[0] + t.rolled[1]) / 2 - 12, (t.rolled[2] + t.rolled[3]) / 2], [t.rolled[0] + 6, (t.rolled[2] + t.rolled[3]) / 2]];
      const px = await pixels(p, s.b, pts);
      ck(w + ' C1 pixels: Ben\'s over part and Dee\'s whole stick paint flat #AE2F1B at left/middle/right; the roll edge and the rolled-up roll stay canvas (never tinted)',
        px.slice(0, 6).every(c => near(c, RED)) && px.slice(6).every(c => c[0] < 120 && Math.abs(c[0] - c[2]) < 30), px);
    } else {
      const pts = [[t.overL + 6, t.overB - 3], [(t.overL + t.overR) / 2, t.overB - 3], [t.dee[0] + 6, t.dee[3] - 3], [t.dee[1] - 30, t.dee[3] - 3]];
      const px = await pixels(p, s.b, pts);
      ck(w + ' C1 phone: a stick whose minutes are all past the cap is flat #AE2F1B end to end (Ben "Clean and oil tools", Dee "Fix gate latch")', px.every(c => near(c, RED)), px);
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

  // ---------- QA local-08b466c/2a02a48 H5: short sticks keep a readable name box (no letter-per-line) and big overruns stay inside the card; Suggest + Check, tiny and huge minutes
  { const TINY = [['Wab3', 5], ['Sweep the path', 5], ['Greenhouse-Greenhouse10', 120], ['rake rake rake', 480], ['Weed', 15], ['Wabcdefghijklmnopqrstuvwxyzabcdefghijkl3', 1], ['Fix gate latch', 1]];
    const SETS = [['suggest tiny+huge', TINY, [['Ana', 480], ['Ben', 480], ['Cy', 480]], null], ['check, Ana 10 has everything', TINY, [['Ana', 10], ['Ben', 480]], TINY.map(() => 'Ana')],
      ['check, Dee 0 has everything (480 each)', [['Haul yard bags to curb', 480], ['Turn compost bed A', 480], ['Weed', 1], ['Sweep the path', 1]], [['Dee', 0], ['Ana', 480]], ['Dee', 'Dee', 'Dee', 'Dee']],
      ['suggest, all 1-minute tasks', Array.from({ length: 12 }, (_, i) => ['Task number ' + (i + 1), 1]), [['Ana', 480], ['Ben', 1]], null]];
    for (const w of [1280, 1440, 1024, 641, 390, 320]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await p.evaluate(() => document.fonts.ready); const bad = [];
      for (const [nm, tasks, helpers, who] of SETS) { await fill(p, 'Sweep', tasks, helpers);
        if (who) await checkAll(p, who); else await p.evaluate(() => { const m = document.getElementById('m-suggest'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); });
        await split(p); await sleep(100);
        const r = await p.evaluate(() => { const out = [], g = e => e.getBoundingClientRect(), cx = document.createElement('canvas').getContext('2d');
          const sticks = [...document.querySelectorAll('#rolls .stick, #plank .stick')]; if (!sticks.length) out.push('no sticks');
          for (const st of sticks) { const t = st.querySelector('.t'), tn = t.querySelector('.mill-typed').firstChild, nm = tn.textContent, box = g(t), sr = g(st), card = g(st.closest('.helper, .bench')), tr = g(st.closest('.track, .plank'));
            if (box.width < 30) out.push('"' + nm + '" name box ' + Math.round(box.width) + 'px');
            if (sr.left < card.left - .5 || sr.right > card.right + .5 || sr.left < tr.left - .5 || sr.right > tr.right + .5) out.push('"' + nm + '" stick past its card/track (' + Math.round(sr.left) + '–' + Math.round(sr.right) + ' vs card ' + Math.round(card.left) + '–' + Math.round(card.right) + ')');
            const ell = getComputedStyle(t).textOverflow === 'ellipsis', tb = g(t); if (ell && (tb.right > tr.right + .5 || tb.left < tr.left - .5 || tb.bottom > tr.bottom + .5)) out.push('"' + nm + '" name box outside the track');
            const rg = document.createRange(); rg.selectNodeContents(ell ? st.querySelector('.m') : st); for (const x of rg.getClientRects()) if (x.width && (x.right > tr.right + .5 || x.left < tr.left - .5 || x.bottom > tr.bottom + .5 || x.right > innerWidth)) { out.push('"' + nm + '" text clipped/off-screen'); break; }
            cx.font = getComputedStyle(tn.parentElement).font; let i = 0;
            for (const wd of nm.split(/(?<=[\s-])/)) { const r2 = document.createRange(); r2.setStart(tn, i); r2.setEnd(tn, i + wd.trimEnd().length); i += wd.length;
              if (new Set([...r2.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size > 1 && cx.measureText(wd.trimEnd()).width < box.width - 1) out.push('word "' + wd + '" broken though it fits (' + Math.round(box.width) + 'px)'); }
            const m = st.querySelector('.m'), mr = document.createRange(); mr.selectNodeContents(m); if (new Set([...mr.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size !== 1) out.push('minutes "' + m.textContent + '" broken'); }
          if (document.documentElement.scrollWidth > document.documentElement.clientWidth) out.push('sideways scroll');
          return out; });
        if (r.length) bad.push(nm + ': ' + r.slice(0, 4).join('; ')); }
      ck(w + ' QA H5: tiny (1–5 min) and huge (480 min) sticks in Suggest and Check (big overruns, 0-minute helper): every name box ≥30px, words break only at spaces/hyphens unless one word is wider than its box, minutes never break, every stick and its text inside its card and track, no sideways scroll', !bad.length, bad);
      if (w > 640) { // QA H14: the sticks are to scale at every width above 640: Ben 30+30+20 of 60 ends 20 min past the roll end
        await fill(p, CTITLE, TS, HS); await checkS4(p); await split(p); await sleep(100);
        const g = await p.evaluate(() => { const ben = document.querySelectorAll('#rolls article')[1], tr = ben.querySelector('.track').getBoundingClientRect(), roll = ben.querySelector('.roll').getBoundingClientRect(), st = [...ben.querySelectorAll('.stick')].map(x => x.getBoundingClientRect());
          return { rows: new Set(st.map(x => Math.round(x.top))).size, end: st[st.length - 1].right - tr.left, rollEnd: roll.right - tr.left, track: tr.width }; });
        ck(w + ' QA H5: readable sticks stay to scale on one row (scale 120 = Ana: Ben\'s roll ends at 60/120 of the track, his 80 min of sticks at 80/120, ±4px)', g.rows === 1 && Math.abs(g.rollEnd - g.track * 60 / 120) <= 4 && Math.abs(g.end - g.track * 80 / 120) <= 4, g); }
      ck(w + ' QA H5 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); } }

  // ---------- QA H6 (non-text contrast ≥3:1, measured on the rendered page), H7 (over text ≥4.5:1 on the page), H8 (phones show rolledUp under Dee's header, no empty track)
  for (const w of [320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await p.evaluate(() => document.fonts.ready);
    await fill(p, 'Saturday', [['Rake the paths', 50], ['Weed beds', 30], ['Haul bags', 20], ['Sweep', 40]], [['Ana', 60], ['Ben', 120], ['Cy', 10], ['Dee', 0]]); await checkAll(p, ['Ana', 'Ana', 'Ben', 'Cy']); await split(p); await sleep(150);
    const t = await p.evaluate(() => { const a = document.querySelector('#rolls article'), g = e => e.getBoundingClientRect(), ov = a.querySelector('.stick.over:not(.all)'), r = g(ov), pc = parseFloat(ov.style.getPropertyValue('--p')) / 100;
      const me = a.querySelector('.meter'), mo = me.querySelector('.ovr'), mc = me.querySelector('.cap'), ld = a.querySelector('.load .over'), lr = ld.getClientRects()[0];
      // the tip's left edge
      const tipX = r.right - r.width * pc; // H14: the tip is the over share of the bar at every width
      return { tipX, top: r.top, bot: r.bottom, meter: getComputedStyle(me).display !== 'none' ? { o: (b => ({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }))(g(mo)), c: (b => ({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }))(g(mc)), bl: getComputedStyle(mo).borderLeftWidth + ' ' + getComputedStyle(mo).borderLeftColor, bg: getComputedStyle(mo).backgroundColor } : null,
        txt: getComputedStyle(ld).color, fs: getComputedStyle(ld).fontSize, fw: getComputedStyle(ld).fontWeight, lr: { l: lr.left, t: lr.top, b: lr.bottom, r: lr.right }, card: (b => ({ left: b.left, right: b.right, top: b.top }))(g(a)) }; });
    // one page screenshot for every sample (a full-page capture can move the scroll position, so all points are taken from the same layout)
    const ys = [0.12, 0.3, 0.5, 0.7, 0.88].map(f => t.top + 4 + (t.bot - t.top - 8) * f), my = t.meter && (t.meter.o.top + t.meter.o.bottom) / 2;
    const pts = ys.flatMap(y => [[t.tipX - 3, y], [t.tipX + 3, y]]).concat(t.meter ? [[t.meter.c.right - 3, t.meter.c.top + 1], [t.meter.o.left + 1, my], [t.meter.o.left + 6, my], [t.meter.o.right + 3, my]] : [])
      .concat([[t.lr.l + 2, t.lr.t - 1], [t.card.right - 4, t.lr.b - 2], [t.card.left + 3, t.card.top + 3]]);
    const px = await pixels(p, s.b, pts), pairs = ys.map((y, i) => ({ y: Math.round(y), wood: px[2 * i], red: px[2 * i + 1], cr: +cr(px[2 * i], px[2 * i + 1]).toFixed(2) }));
    // H6 stick tip: red against the wood just left of the tip, from the top to the bottom of the stick (the lightest and the darkest wood)
    ck(w + ' QA H6: the over tip is ≥3:1 against the wood next to it at every height of the stick (sampled top to bottom on the page)', pairs.every(q => near(q.red, RED, 6) && q.cr >= 3), pairs);
    if (t.meter) { const mp = px.slice(10, 14);
      const m = { canvas: mp[0], edge: mp[1], red: mp[2], page: mp[3], bl: t.meter.bl, bg: t.meter.bg, redEdge: +cr(mp[2], mp[1]).toFixed(2), edgeCanvas: +cr(mp[1], mp[0]).toFixed(2), redPage: +cr(mp[2], mp[3]).toFixed(2) };
      ck(w + ' QA H6: capacity bar: the red never touches the dark frame (2px chalk edge); red/edge, edge/frame and red/page all ≥3:1', t.meter.bl === '2px rgb(244, 239, 227)' && near(m.red, RED, 6) && m.redEdge >= 3 && m.edgeCanvas >= 3 && m.redPage >= 3, m); }
    // H7: the over text colour against the page pixels behind it (sampled just outside the text line inside the card)
    const bgp = px.slice(-3), tc = rgb(t.txt), h7 = { color: t.txt, fs: t.fs, fw: t.fw, bg: bgp, cr: bgp.map(b => +cr(tc, b).toFixed(2)) };
    ck(w + ' QA H7: "Over by … has … min" (' + t.fs + ' bold) is ≥4.5:1 against the page behind it, same hue as --red', t.txt === 'rgb(174, 47, 27)' && h7.cr.every(c => c >= 4.5), h7);
    // H8
    const d = await p.evaluate(() => { const a = [...document.querySelectorAll('#rolls article')][3], g = e => e.getBoundingClientRect(), z = a.querySelector('.zeronote'), hh = g(a.querySelector('.hhead')), sl = g(a.querySelector('.stampline'));
      const zv = z && z.checkVisibility({ checkVisibilityCSS: true }) ? g(z) : null, me = a.querySelector('.meter');
      return { cls: a.className, label: z ? z.textContent : null, zv: zv && { t: zv.top, b: zv.bottom, l: zv.left, r: zv.right }, hhB: hh.bottom, slT: sl.top, card: g(a).right, meter: getComputedStyle(me).display, head: a.querySelector('.load').textContent, aria: a.getAttribute('aria-label') }; });
    if (w <= 640) ck(w + ' QA H8: phone: Dee (0 minutes, no tasks) shows rolledUp "' + C.rolledUp + '" right under the header; no empty track or meter (≤14px from header to label, label to stamp line)', d.label === C.rolledUp && d.zv && d.zv.t >= d.hhB - .5 && d.zv.t - d.hhB <= 14 && d.slT - d.zv.b <= 14 && d.zv.r <= d.card && d.meter === 'none' && d.head === C.zeroHead && d.aria === '“Dee”: ' + C.zeroHead, d);
    else ck(w + ' QA H8: desktop: Dee\'s roll label still on the rolled-up roll', d.label === C.rolledUp && d.zv && d.zv.t > d.hhB, d);
    ck(w + ' QA H6–H8 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }

  // ---------- QA local-d68094a. H14 (PM 05:12/05:36, Creative 05:37): bars to scale (4px floor) at 320–1440; H11 the roll holds an under-capacity helper's bars; H9 text on the red tip ≥4.5:1
  { const lw = (p, sel) => p.evaluate(sel => { const out = []; document.querySelectorAll(sel).forEach(box => { const cs = getComputedStyle(box), W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), sts = [...box.children].filter(x => x.classList.contains('stick')), floored = sts.filter(s => +s.style.getPropertyValue('--m') / +s.style.getPropertyValue('--sc') * W < 7).length;
        sts.forEach((s, i) => { const m = +s.style.getPropertyValue('--m'), sc = +s.style.getPropertyValue('--sc'), w = s.getBoundingClientRect().width, exp = m / sc * W;
          out.push({ t: s.querySelector('.t').textContent, m, sc, W: Math.round(W), w: +w.toFixed(1), exp: +exp.toFixed(1), ok: exp < 4 ? w >= 3.5 && w <= 4.5 : Math.abs(w - exp) <= 1 + 4 * floored }); }); }); return out; }, sel);
    const H9 = { title: 'Saturday', h: [['Ana', 30], ['Ben', 480]], t: [['Rake the long paths', 25], ['Weed every bed', 60], ['Haul bags', 200]], who: ['Ana', 'Ana', 'Ben'] };
    const H11 = { title: 'Saturday', h: [['Ana', 15], ['Ben', 480]], t: [['Sweep', 5], ['Wipe', 5], ['Haul bags', 300]], who: ['Ana', 'Ana', 'Ben'] };
    const TINY = [['Wab3', 5], ['Sweep the path', 5], ['Greenhouse-Greenhouse10', 120], ['rake rake rake', 480], ['Weed', 15], ['Wabcdefghijklmnopqrstuvwxyzabcdefghijkl3', 1], ['Fix gate latch', 1]];
    const SETS = [['garden Check', CTITLE, TS, HS, null], ['H9', H9.title, H9.t, H9.h, H9.who], ['H11', H11.title, H11.t, H11.h, H11.who], ['tiny Check, Ana 10 has everything', 'Tiny', TINY, [['Ana', 10], ['Ben', 480]], TINY.map(() => 'Ana')],
      ['tiny Suggest', 'Tiny', TINY, [['Ana', 480], ['Ben', 480], ['Cy', 480]], 'suggest'], ['12 × 5 min on a 480 roll, 3 on the bench', 'Many', Array.from({ length: 12 }, (_, i) => ['Job ' + (i + 1), 5]), [['Ana', 45], ['Ben', 480]], 'suggest']];
    for (const w of [320, 390, 641, 700, 1024, 1280, 1440]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await p.evaluate(() => document.fonts.ready); const prop = [], roll = [], tip = [], mins = [], grounds = [];
      for (const [nm, title, tasks, helpers, who] of SETS) { await fill(p, title, tasks, helpers);
        if (who === null) await checkS4(p); else if (who === 'suggest') await p.evaluate(() => { const m = document.getElementById('m-suggest'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true })); }); else await checkAll(p, who);
        await split(p); await sleep(120);
        (await lw(p, '#rolls .sticks, #plank .sticks')).filter(x => !x.ok).forEach(x => prop.push(nm + ': ' + JSON.stringify(x)));
        // H11: every minute that fits the roll stays on it: for each helper, the sticks before the roll end end at or before it (±1px)
        (await p.evaluate(() => [...document.querySelectorAll('#rolls article')].map(a => { const r = a.querySelector('.roll'), sts = [...a.querySelectorAll('.stick')]; if (!r || getComputedStyle(r).display === 'none') return null;
          const re = r.getBoundingClientRect().right; return { n: a.querySelector('.tab').textContent, re: Math.round(re), bad: sts.filter(s => !s.classList.contains('over')).filter(s => s.getBoundingClientRect().right > re + 1).map(s => s.querySelector('.t').textContent + ' ends ' + Math.round(s.getBoundingClientRect().right)) }; }).filter(x => x && x.bad.length))).forEach(x => roll.push(nm + ': ' + JSON.stringify(x)));
        // H9: every name and minutes run sits wholly on one ground: wood (dark text), the red tip (light text) or a chalk tag (ink), each ≥4.5:1
        (await p.evaluate(() => { const out = []; document.querySelectorAll('#rolls .stick, #plank .stick').forEach(s => { const r = s.getBoundingClientRect(), p = +s.dataset.p || 0, edge = r.right - r.width * p, out_ = s.classList.contains('out');
          for (const e of [s.querySelector('.t'), s.querySelector('.m')]) { const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()].filter(x => x.width > 0), c = getComputedStyle(e).color;
            if (out_) continue; // outside labels: ground sampled from pixels below
            const ground = rs.every(x => x.right <= edge + .5) ? 'wood' : rs.every(x => x.left >= edge - .5) ? 'red' : 'both';
            out.push({ t: e.textContent, ground, c, p: +p.toFixed(3) }); } }); return out; })).forEach(x => {
          const c = rgb(x.c), worst = x.ground === 'wood' ? Math.min(cr(c, [240, 215, 163]), cr(c, [210, 171, 108])) : x.ground === 'red' ? cr(c, RED) : x.ground === 'chalk' ? cr(c, [244, 239, 227]) : 0;
          if (worst < 4.5) tip.push(nm + ': ' + JSON.stringify(Object.assign(x, { cr: +worst.toFixed(2) }))); });
        (await p.evaluate(() => [...document.querySelectorAll('#rolls .stick, #plank .stick')].map(s => { const m = s.querySelector('.m'), rg = document.createRange(); rg.selectNodeContents(m); const rs = [...rg.getClientRects()].filter(x => x.width), bad = [];
          if (new Set(rs.map(x => Math.round(x.top))).size !== 1) bad.push('lines ' + rs.length); if (getComputedStyle(m).textOverflow !== 'clip' || m.textContent !== String(+m.textContent)) bad.push('ellipsis/text');
          for (let a = m.parentElement; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (/(hidden|clip|auto|scroll)/.test(c.overflowX + c.overflowY)) { const b = a.getBoundingClientRect(); if (rs.some(x => x.left < b.left - .5 || x.right > b.right + .5 || x.top < b.top - .5 || x.bottom > b.bottom + .5)) bad.push('cut by ' + (a.id || a.className)); } }
          if (rs.some(x => x.left < 0 || x.right > innerWidth)) bad.push('off-screen'); return bad.length ? s.querySelector('.t').textContent + ' ' + m.textContent + ': ' + bad.join(', ') : null; }).filter(Boolean))).forEach(x => mins.push(nm + ': ' + x));
        const ol = await p.evaluate(() => [...document.querySelectorAll('#rolls .stick.out, #plank .stick.out')].map(s => { const t = s.querySelector('.t'), m = s.querySelector('.m'), tb = t.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(m); const mb = rg.getClientRects()[0], tr = s.closest('.track, .plank').getBoundingClientRect();
          const pt = (x, y) => [Math.min(Math.max(x, tr.left + 1), tr.right - 1), y]; return { t: t.textContent, cls: s.className, tc: getComputedStyle(t).color, mc: getComputedStyle(m).color, tfs: parseFloat(getComputedStyle(t).fontSize), mfs: parseFloat(getComputedStyle(m).fontSize), split: s.classList.contains('split'),
            pts: [pt(tb.right + 3, (tb.top + tb.bottom) / 2 + (s.classList.contains('split') ? 2 : 0)), pt(mb.right + 3, (mb.top + mb.bottom) / 2), pt(tb.left - (s.classList.contains('split') ? -1 : 3), tb.top + 1)] }; }));
        if (ol.length) { const px = await pixels(p, s.b, ol.flatMap(o => o.pts));
          ol.forEach((o, i) => { const gT = px[3 * i], gM = px[3 * i + 1], pine = q => q[0] > 190 && q[1] > 150 && q[2] < 175 && q[0] - q[2] > 60, crT = cr(rgb(o.tc), gT), crM = cr(rgb(o.mc), gM);
            if (crT < 4.5 || crM < 4.5 || pine(gT) || pine(gM) || o.tfs < 10 || o.mfs < 10) grounds.push(nm + ': ' + JSON.stringify({ t: o.t, cls: o.cls, tc: o.tc, mc: o.mc, gT, gM, crT: +crT.toFixed(2), crM: +crM.toFixed(2) })); }); } }
      ck(w + ' Creative 05:37: the minutes are never truncated: every minutes run is whole (its own digits, one line, no ellipsis) and wholly inside every clipping box and the screen', !mins.length, mins.slice(0, 8));
      ck(w + ' QA H14 labels outside a bar: on the canvas (chalk) or the card (ink, red minutes when over), never on the pine; name and minutes ≥4.5:1 against the ground sampled beside them; nothing under 10px', !grounds.length, grounds.slice(0, 8));
      ck(w + ' QA H14: every bar is to scale: width = minutes / scale × track, ±1px; bars under 4px held at the 4px floor (bars, bench, Suggest and Check, 1–480 min)', !prop.length, prop.slice(0, 8));
      ck(w + ' QA H11: no bar that fits the roll runs past the roll end (H11 repro: Ana 15 with Sweep 5 + Wipe 5)', !roll.length, roll.slice(0, 8));
      ck(w + ' QA H9: every task name and minutes in a bar sits wholly on the wood (dark text), wholly on the red tip (light text) or on a chalk tag (ink): ≥4.5:1 against the lightest and darkest wood / the red / chalk (H9 repro: Ana 30, "Weed every bed" 60)', !tip.length, tip.slice(0, 8));
      // pixels, H9 repro: the text colour against the ground right next to the "Weed every bed" name, sampled with the page painted
      await fill(p, H9.title, H9.t, H9.h); await checkAll(p, H9.who); await split(p); await sleep(150);
      const g = await p.evaluate(() => { const s = [...document.querySelectorAll('#rolls .stick')].find(x => x.querySelector('.t').textContent === '“Weed every bed”'), t = s.querySelector('.t').getBoundingClientRect(), m = s.querySelector('.m').getBoundingClientRect(); return { cls: s.className, c: getComputedStyle(s.querySelector('.t')).color, tl: t.left, tt: t.top, tb: t.bottom, mr: m.right, mt: m.top }; });
      const px = await pixels(p, s.b, [[g.tl - 3, (g.tt + g.tb) / 2], [g.mr + 3, g.mt + 4]]), h9 = { cls: g.cls, color: g.c, ground: px, cr: px.map(b => +cr(rgb(g.c), b).toFixed(2)) };
      ck(w + ' QA H9 pixels: "Weed every bed" (92% over): its name and minutes are light on the red, ≥4.5:1 against the painted ground beside them', h9.cr.every(c => c >= 4.5), h9);
      ck(w + ' QA H9/H11/H14 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); } }

  // ---------- QA H10: the focus ring is ≥3:1 against every colour next to it, measured from pixels at every focus stop (form, form with errors, results) at 390 and 1280
  for (const w of [390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await p.evaluate(() => document.fonts.ready); const bad = [], seen = [];
    const walk = async (state, max) => { await p.evaluate(() => { window.scrollTo(0, 0); const d = document.createElement('span'); d.tabIndex = -1; document.body.prepend(d); d.focus(); d.blur(); d.remove(); });
      let first = null;
      for (let i = 0; i < max; i++) { await p.keyboard.press('Tab'); await sleep(40);
        const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const t = e.closest('.modes') || e; t.scrollIntoView({ block: 'center' }); const b = t.getBoundingClientRect();
          return { id: e.id || e.tagName + '.' + e.className, fv: e.matches(':focus-visible'), field: /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !e.closest('.modes'), link: e.tagName === 'A', bg: getComputedStyle(e).backgroundColor.match(/\d+/g).slice(0, 3).map(Number), l: b.left, r: b.right, t: b.top, b: b.bottom, cy: (b.top + b.bottom) / 2, cx: (b.left + b.right) / 2 }; });
        if (!f) break; if (first === f.id) break; first = first || f.id; await sleep(30);
        const f2 = await p.evaluate(() => { const e = document.activeElement, t = e.closest('.modes') || e, b = t.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; }); Object.assign(f, f2, { cy: (f2.t + f2.b) / 2, cx: (f2.l + f2.r) / 2 });
        // outside ring (buttons, links, mode switch): ink 0–2 | yellow 2–5 | ink 5–7 outside the box; inside ring (fields): border 0–2 | white 2–4 | ink 4–6 | yellow 6–8 | ink 8–10 | field
        const IN = f.field, o = IN ? [1, 3, 5, 7, 9] : [-8.5, -6, -3.5, -1, 1], L = o.map(d => [f.l + d, f.cy]).concat(o.map(d => [f.cx, f.t + d])); if (f.link) { L[4] = [f.l + 1, f.t + 1]; L[9] = [f.l + 1, f.t + 1]; }
        const px = await pixels(p, s.b, L), INK = [31, 33, 36], YEL = [242, 194, 48];
        const sides = [px.slice(0, 5), px.slice(5)].map(q => { if (IN) { const [edge, wh, ink1, yel, ink2] = q, bg = f.bg; return { edge, wh, ink1, yel, ink2, bg, a: +cr(edge, wh).toFixed(2), b: +cr(wh, ink1).toFixed(2), c: +cr(ink1, yel).toFixed(2), d: +cr(yel, ink2).toFixed(2), e: +cr(ink2, bg).toFixed(2), ok: near(ink1, INK, 10) && near(yel, YEL, 10) && near(ink2, INK, 10) }; }
          const [out, ink1, yel, ink2, edge] = q; return { out, ink1, yel, ink2, edge, a: +cr(out, ink1).toFixed(2), b: +cr(ink1, yel).toFixed(2), c: +cr(yel, ink2).toFixed(2), d: +cr(ink2, edge).toFixed(2), e: 99, ok: near(ink1, INK, 10) && near(yel, YEL, 10) && near(ink2, INK, 10) && (near(edge, INK, 12) || cr(ink2, edge) >= 3) }; });
        const ok = f.fv && sides.every(q => q.ok && q.a >= 3 && q.b >= 3 && q.c >= 3 && (IN ? q.d >= 3 && q.e >= 3 : true));
        seen.push(state + ' ' + f.id); if (!ok) bad.push({ state, id: f.id, fv: f.fv, sides }); } };
    await walk('form', 40); await fill(p, '', [['', '']], [['', '']]); await split(p); await walk('form+errors', 40);
    await fill(p, CTITLE, TS, HS); await split(p); await walk('results', 60);
    ck(w + ' QA H10: at every focus stop (' + seen.length + ': form, form with errors, results) the ring is ink | yellow | ink with every edge ≥3:1 (buttons/links/mode switch outside: page/ink, ink/yellow, yellow/ink, ink/element or its own ink edge; fields inside: border/white, white/ink, ink/yellow, yellow/ink, ink/field), sampled left and top from pixels', seen.length >= 30 && !bad.length, { n: seen.length, bad: bad.slice(0, 6) });
    // H13: error text ≥4.5:1 and invalid borders ≥3:1 against what they sit on (pixels)
    await fill(p, '', [['', '']], [['', '']]); await split(p); await sleep(150);
    const e = await p.evaluate(() => { document.activeElement && document.activeElement.blur(); const m = [...document.querySelectorAll('#form .errmsg')].find(x => !x.hidden && x.getClientRects().length), f = document.querySelector('[aria-invalid=true]'); m.scrollIntoView({ block: 'center' }); const a = m.getClientRects()[0], b = f.getBoundingClientRect();
      return { c: getComputedStyle(m).color, bc: getComputedStyle(f).borderLeftColor, ml: a.left, mt: a.top, mb: a.bottom, mr: a.right, fl: b.left, fcy: (b.top + b.bottom) / 2, fb: b.bottom, fcx: (b.left + b.right) / 2 }; });
    const ep = await pixels(p, s.b, [[e.mr + 4, (e.mt + e.mb) / 2], [e.ml, e.mb + 1], [e.fl + 1, e.fcy], [e.fl + 4, e.fcy], [e.fcx, e.fb + 4]]), tc = rgb(e.c);
    const h13 = { text: e.c, border: e.bc, textOn: [ep[0], ep[1]].map(b => +cr(tc, b).toFixed(2)), borderPx: ep[2], borderVsField: +cr(ep[2], ep[3]).toFixed(2), borderVsPanel: +cr(ep[2], ep[4]).toFixed(2) };
    ck(w + ' QA H13: error text (' + e.c + ') ≥4.5:1 on the panel; invalid-field border ≥3:1 against the field and the panel (pixels)', e.c === 'rgb(174, 47, 27)' && h13.textOn.every(c => c >= 4.5) && h13.borderVsField >= 3 && h13.borderVsPanel >= 3, h13);
    ck(w + ' QA H10/H13 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }

  // ---------- QA H12: the sheet table stays inside the sheet at 641/700/739/800, on screen and in print media (24-letter one-word helper, 40-letter one-word task)
  { const s = await session(H, IP); const { p } = s; const bad = [];
    for (const w of [641, 700, 739, 800, 1024]) { await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      for (const [nm, helpers, who] of [['over', [['Abcdefghijklmnopqrstuvwx', 60], ['Ben', 120]], ['Abcdefghijklmnopqrstuvwx', 'Abcdefghijklmnopqrstuvwx', 'Ben']], ['hyphenated, under', [['Abcdefghijk-lmnopqrstuvw', 120], ['Ben', 120]], ['Abcdefghijk-lmnopqrstuvw', 'Abcdefghijk-lmnopqrstuvw', 'Ben']]]) {
        await fill(p, 'Sheet', [['Wabcdefghijklmnopqrstuvwxyzabcdefghijkl3', 50], ['Weed beds', 30], ['Haul', 20]], helpers); await checkAll(p, who); await split(p); await sleep(120);
        for (const media of [null, 'print']) { await p.emulateMediaType(media); await sleep(80);
          const r = await p.evaluate(() => { const sh = document.getElementById('sheet'), t = document.getElementById('sheet-t'), cs = getComputedStyle(sh), inner = sh.getBoundingClientRect().right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
            const cells = [...t.querySelectorAll('td')].filter(c => c.getClientRects().length), over = cells.filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.textContent.slice(0, 30));
            const nums = cells.filter(c => /\d/.test(c.textContent)).flatMap(c => { const out = []; const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const re = /\d+/g; let m; while ((m = re.exec(n.textContent))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); if (new Set([...rg.getClientRects()].filter(x => x.width).map(x => Math.round(x.top))).size > 1) out.push(m[0]); } } return out; });
            return { tableR: Math.round(t.getBoundingClientRect().right), inner: Math.round(inner), over, nums, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
          if (r.tableR > r.inner + 1 || r.over.length || r.nums.length || (!media && r.sw > r.cw)) bad.push(w + ' ' + nm + ' ' + (media || 'screen') + ': ' + JSON.stringify(r)); }
        await p.emulateMediaType(null); } }
    ck('QA H12: at 641/700/739/800/1024 the sheet table stays inside the sheet, on screen and in print media (24-letter one-word and hyphenated helper, 40-letter one-word task, over and under): no cell overflows, no number split across lines, no sideways scroll', !bad.length, bad.slice(0, 6));
    ck('QA H12 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }

  // ---------- PM 04:57 query rulings. (a) links this piece makes never carry '?', and a ?q=<marker> on the sender page or a received link is never shown,
  // used or copied; (b) query-strip: every address-bar rewrite (load, Make my own copy, Start over) writes path + #fragment only: location.search stays '',
  // the #fragment is kept where it was kept before (a received link) and cleared where it was cleared before (Make my own copy, Start over).
  for (const [QN, QQ] of [['short', '?q=Qzst57'], ['html+script with a visitor name', '?q=' + encodeURIComponent('<script>alert("Ana")</script><b onclick=x>Ana Qzst57</b>') + '&name=Qzst57&title=Qzst57'], ['2,100-char pad', '?q=Qzst57' + 'p'.repeat(2100)]]) {
    const QM = 'Qzst57', s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    await p.evaluateOnNewDocument(() => { window.__q = []; window.confirm = () => true; window.print = () => window.__q.push('print:' + document.body.innerText); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__q.push('clip:' + t); return Promise.resolve(); } } }); });
    const scan = () => p.evaluate(M => { const a = []; document.querySelectorAll('*').forEach(e => { for (const n of e.getAttributeNames()) if ((e.getAttribute(n) || '').includes(M)) a.push(e.tagName + '@' + n); });
      return { search: location.search, hash: location.hash, href: location.href.includes(M), text: document.body.innerText.includes(M) || document.title.includes(M), attrs: a, vals: [...document.querySelectorAll('input,textarea,select')].filter(e => String(e.value).includes(M)).map(e => e.id), outs: window.__q.filter(x => x.includes(M)).length, links: [...document.querySelectorAll('#link')].map(e => e.value).filter(Boolean) }; }, QM);
    const steps = [], at = async (step, exp, did = true) => { const r = await scan(); steps.push(Object.assign({ step, did, exp, hashOk: r.hash === exp }, r, { hash: r.hash.slice(0, 40) })); return r; };
    const open = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300); };
    await open(BASE); const fq = await p.evaluate(() => { const h = [{ name: 'Ana', min: 60 }, { name: 'Ben', min: 30 }], t = [{ name: 'Rake paths', min: 45 }, { name: 'Weed', min: 20 }]; return FH.encode('Saturday', h, t, FH.suggest(h, t)); }), F = '#' + fq;
    await open(BASE + QQ); await at('open the sender page with the query', '');
    await fill(p, 'Saturday', [['Rake paths', 45], ['Weed', 20]], [['Ana', 60], ['Ben', 30]]); await split(p); await p.click('#b-link'); await sleep(150);
    await p.evaluate(() => { document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); document.getElementById('b-print').click(); }); await sleep(150); await at('split, make a link, copy the cards, print', '');
    const r1 = await p.evaluate(() => document.getElementById('b-reset') && !document.getElementById('b-reset').disabled); await p.click('#b-reset'); await sleep(200); await at('Start over', '', r1);
    await open(BASE + QQ + F); const rv = await at('open a received link with the query', F); const okRecv = await p.evaluate(() => !document.getElementById('recv').hidden && document.querySelectorAll('#rolls article').length === 2);
    await p.evaluate(() => { document.querySelectorAll('#rolls article .hhead button').forEach(b => b.click()); }); await sleep(100); await at('copy the cards (recipient)', F);
    await p.click('#own'); await sleep(250); await at('Make my own copy', ''); await p.click('#b-link'); await sleep(150); const own = await at('make a link from my own copy', '');
    await open(BASE + QQ + F); await p.click('#own'); await sleep(250); await p.click('#b-reset'); await sleep(200); await at('received -> Make my own copy -> Start over', '');
    const links = steps.flatMap(x => x.links);
    ck('PM 04:57 query-strip (' + QN + '): ' + steps.map(x => x.step).join(' -> ') + ': location.search empty, no marker in the address bar, #fragment kept on the received link and cleared after Make my own copy / Start over', okRecv && steps.length === 8 && steps.every(x => x.did && x.search === '' && !x.href && x.hashOk), steps.map(x => ({ step: x.step, search: x.search.slice(0, 30), hash: x.hash, exp: (x.exp || '').slice(0, 40), href: x.href })));
    ck('query ruling (' + QN + '): links made here carry no "?" (' + links.length + ': sender, own copy); the marker is nowhere in page text, attributes, field values or copied/printed text', links.length >= 2 && !links.some(u => u.includes('?')) && steps.every(x => !x.text && !x.attrs.length && !x.vals.length && !x.outs), steps.filter(x => x.text || x.attrs.length || x.vals.length || x.outs).map(x => ({ step: x.step, text: x.text, attrs: x.attrs, vals: x.vals, outs: x.outs })).concat(links.filter(u => u.includes('?'))));
    ck('query (' + QN + '): no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }

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
