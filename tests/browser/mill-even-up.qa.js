// node tests/browser/mill-even-up.qa.js <host[:port]> <ip> [scheme] — Even Up @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Flows (brief test, odd cent, excluded + weighted, invalid input, payer removed + in-page error link), copy / copy failure,
// share cancel, recipient read-only (recipientAccess), typedAudit incl. the PM Q1 spoof case, malformed links, reset,
// no storage / no network, the 2,000-char URL cap, toast reset on route change, 320 fit, print.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, sameTabBadLink, mouseAt, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result, reallyHidden } = require('./mill-common');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/even-up/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/even-up/`;
const SP = 'Milk\u201D from \u201CYour bank', G = '\u00ABBank\u00BB \u201Ex\u201F', SE = 'Rent\u201D paid by \u201CLandlord', SW = '\u00ABFee\u00BB \u201Esent\u201F'; // distinct seeds: names, event, what
async function press(p, sel, key = 'Enter') { await p.focus(sel); await p.keyboard.press(key); await sleep(40); }
async function addX(p, what, amt, payer, mode, inc) { // inc: {personId: true | weight string}
  await typeInto(p, '#f-what', what); await typeInto(p, '#f-amt', amt); if (payer) await p.select('#f-payer', String(payer));
  await press(p, mode === 'w' ? '#m-w' : '#m-e');
  const ids = await p.$$eval('#chips .eu-chip', bs => bs.map(b => [b.id.slice(2), b.getAttribute('aria-pressed') === 'true']));
  for (const [id, on] of ids) { const want = inc[id] != null; if (want !== on) await press(p, '#c-' + id, 'Space'); if (want && mode === 'w') await typeInto(p, '#w-' + id, String(inc[id])); }
  await press(p, '#f-add');
}
const view = p => p.evaluate(() => ({
  transfers: [...document.querySelectorAll('#transfers li')].map(li => li.textContent.replace(/^\d+/, '')), settleH: document.getElementById('settle-h').textContent, check: document.getElementById('settle-check').textContent,
  tokens: [...document.querySelectorAll('#rods .eu-rod-row')].map(r => r.querySelector('.eu-name').textContent + ' ' + r.querySelector('.eu-rod').dataset.side + ' ' + r.querySelector('.eu-fig').textContent),
  tape: [...document.querySelectorAll('#xs .eu-x')].map(x => x.innerText.replace(/\n(Edit|Remove)/g, '')), net: document.getElementById('net').innerText, fix: document.getElementById('fix').hidden ? '' : document.getElementById('fix-t').textContent,
  copyDis: document.getElementById('b-copy').disabled, nums: [...document.querySelectorAll('#lines .eu-link-num')].map(n => n.textContent), links: document.querySelectorAll('#lines .eu-link').length, hash: location.hash, toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent }));
const fill = async p => {
  await typeInto(p, '#ev', 'Cabin weekend'); await typeInto(p, '#p-1', 'Ade'); await typeInto(p, '#p-2', 'Ben'); await press(p, '#p-add'); await p.keyboard.type('Cy');
  await addX(p, 'Firewood', '30', 1, 'e', { 1: 1, 2: 1, 3: 1 });
};
const clipStub = fail => () => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return window.__clipFail ? Promise.reject(new Error('no')) : Promise.resolve(); } } }); };
async function fits(p) { return p.evaluate(() => { const w = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('button,label,select,input,.eu-chip,.eu-token,.eu-transfers li,.eu-x-h,.eu-name').forEach(e => { if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return; const r = e.getBoundingClientRect();
    if (r.right > w + 1 || r.left < -1) bad.push('edge:' + (e.id || e.className)); if (e.tagName !== 'INPUT' && e.tagName !== 'SELECT' && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') bad.push('clip:' + (e.id || e.className));
    if ((e.tagName === 'BUTTON') && e.scrollWidth > e.clientWidth + 1) bad.push('btnclip:' + (e.id || e.textContent)); });
  return bad.slice(0, 10); }); }
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    // ---------- sender flow
    let s = await session(H, IP); let { p } = s; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub());
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(250);
    let t = await p.evaluate(() => ({ rods: document.querySelectorAll('#rods li').length, names: [...document.querySelectorAll('#rods .eu-name')].map(e => e.textContent).join(), toks: [...document.querySelectorAll('#rods .eu-token')].filter(e => e.getClientRects().length).length, frame: !!document.getElementById('frame').getClientRects().length, scale: getComputedStyle(document.querySelector('.eu-scale')).display, empty: document.getElementById('empty').textContent, emptyVis: !!document.getElementById('empty').getClientRects().length, copyHidden: document.getElementById('b-copy').hidden, tape: document.getElementById('tape').hidden, h1: getComputedStyle(document.querySelector('h1')).fontFamily, body: getComputedStyle(document.body).fontFamily }));
    ck(w + ' Creative 7 (s5) empty: counting frame visible, two bare "?" rods (no tokens, no scale), empty line; no tape, copy hidden', t.frame && t.rods === 2 && t.names === '?,?' && t.toks === 0 && t.scale === 'none' && t.empty === C.emptyState && t.emptyVis && t.copyHidden && t.tape, t);
    ck(w + ' Writer finals: limitsNote filled exactly (cap 2,000), no copy-extra.js loaded', (await p.$eval('#limits', e => e.textContent)) === 'Names up to 24 characters, the event 60, what for 40. Amounts up to 100,000.00 each, weights up to 1000. Links up to 2,000 characters.' && !(await p.$('script[src="copy-extra.js"]')) && !s.reqs.some(r => r.includes('copy-extra')), await p.$eval('#limits', e => e.textContent));
    ck(w + ' distinct from Split the Sack: Young Serif + Lexend (not Barlow / Inter Tight), counting frame + tape', /Young Serif/.test(t.h1) && /Lexend/.test(t.body) && !/Barlow|Inter Tight/.test(t.h1 + t.body) && !!(await p.$('.eu-frame')) && !(await p.$('.ss-lcd, .ss-sack')), t);
    // add expense before names are valid -> name errors shown, focus on the first name (the event name is optional)
    await addX(p, 'Firewood', '30', null, 'e', { 1: 1, 2: 1 }); t = await p.evaluate(() => ({ f: document.activeElement.id, ev: document.getElementById('e-ev').textContent, p1: document.getElementById('pe-1').textContent, n: document.querySelectorAll('#xs .eu-x').length, inv: document.getElementById('ev').getAttribute('aria-invalid') }));
    ck(w + ' expense refused until names are valid; errors shown; focus on the first name; blank event is not an error', t.f === 'p-1' && t.ev === '' && t.p1 === C.personEmpty && t.n === 0 && t.inv !== 'true', t);
    // Creative 8: blank event -> Writer title as the default (unquoted) in summary, print, <title>, copy, share text, received banner
    await typeInto(p, '#p-1', 'Ade'); await typeInto(p, '#p-2', 'Ben'); await addX(p, 'Firewood', '30', 1, 'e', { 1: 1, 2: 1 }); await press(p, '#b-copy'); await sleep(100);
    t = await p.evaluate(() => ({ clip: window.__clip.slice(-1)[0] || '', title: document.title, line: document.getElementById('event-line').textContent, fb: document.getElementById('fallback').value, toks: [...document.querySelectorAll('#rods .eu-token')].filter(e => e.getClientRects().length).length }));
    ck(w + ' Creative 8: blank event -> "Even Up" (unquoted) in copied summary, fallback text, <title>, event line; tokens back once the tape has a line', t.clip.startsWith(C.title + ' ($)\n“Ben” pays “Ade” $15.00\n') && t.fb === t.clip && t.title === C.title + ' · ' + C.studioName && t.line === C.eventLabel + ': ' + C.title + ' · $' && !/“Even Up”/.test(t.clip + t.title + t.line) && t.toks === 2, t);
    await p.emulateMediaType('print'); t = await p.evaluate(() => ({ d: getComputedStyle(document.getElementById('event-line')).display, txt: document.getElementById('event-line').textContent })); await p.emulateMediaType('screen');
    ck(w + ' Creative 8: print shows the default event line', t.d !== 'none' && t.txt === C.eventLabel + ': ' + C.title + ' · $', t);
    await typeInto(p, '#ev', 'Cabin weekend'); t = await p.evaluate(() => document.title); ck(w + ' Creative 8: typed event -> quoted in <title> before the product name', t === '“Cabin weekend” · ' + C.title + ' · ' + C.studioName, t);
    await p.reload({ waitUntil: 'load' }); await sleep(250); // memory-only: a reload starts over
    await fill(p); t = await view(p);
    ck(w + ' brief test: Ade pays 30 for Ade/Ben/Cy -> Ben pays Ade 10, Cy pays Ade 10; every balance zero after', t.transfers.join('|') === '“Ben” pays “Ade” $10.00|“Cy” pays “Ade” $10.00' && t.check === '✓ ' + C.settleNote && t.tokens.join('|') === '“Ade” owed $20.00|“Ben” owes $10.00|“Cy” owes $10.00' && t.nums.join() === '1,2' && t.links === 2, t);
    ck(w + ' tape: per-expense audit with shares = total ✓, net column sums to $0.00 ✓', t.tape[0].includes('#1 “Firewood”') && t.tape[0].includes('“Ade” paid $30.00 for “Firewood”, split equally between “Ade”, “Ben”, “Cy”.') && !/\.\s*Equally/.test(t.tape[0]) && /Shares\s+\$30\.00 ✓/.test(t.tape[0]) && /Sum\s+\$0\.00 ✓/.test(t.net) && t.net.includes(C.balanceCheck), t);
    const body = await p.evaluate(() => document.body.innerText); ck(w + ' no fewest/minimum/optimal claim on the page (only "aren\'t necessarily the fewest")', !/fewest|minim|optimal/i.test(body.replace(C.notFewestNote, '')) && body.includes(C.notFewestNote), null);
    // odd cent
    await addX(p, 'Groceries', '10', 2, 'e', { 1: 1, 2: 1, 3: 1 }); t = await view(p);
    ck(w + ' odd cent (QA E5): $10.00 / 3 -> “Ade” $3.34 then Writer residualMark, no +$0.01; residual line, policy shown', t.tape[1].includes('$3.34') && t.tape[1].includes(C.residualMark) && !t.tape[1].includes('+$0.01') && t.tape[1].includes('1 extra cent went to “Ade”.') && (await p.$eval('#policy', e => e.textContent)) === C.residualPolicy, t.tape[1]);
    // validation (form)
    const fe = async () => p.evaluate(() => ({ amt: document.getElementById('e-amt').textContent, split: document.getElementById('e-split').textContent, f: document.activeElement.id, n: document.querySelectorAll('#xs .eu-x').length, inv: document.getElementById('f-amt').getAttribute('aria-invalid'), d: document.getElementById('f-amt').getAttribute('aria-describedby') }));
    const cases = [['-5', C.errorNegative], ['12,5', C.errorCommas], ['1,23', C.errorCommas], [',5', C.errorCommas], ['12,34,567', C.errorCommas], ['', C.errorNumber], ['100000.01', C.errorTooBig], ['1e3', C.errorPlainAmount]];
    for (const [a, msg] of cases) { await addX(p, 'Returned tent', a, 1, 'e', { 1: 1 }); const r = await fe(); ck(w + ` amount "${a}" rejected inline (${msg.slice(0, 24)}…), focus on amount, nothing added`, r.amt === msg && r.f === 'f-amt' && r.n === 2 && r.inv === 'true' && r.d === 'e-amt', r); }
    await addX(p, 'Fuel', '12', 1, 'w', { 1: '0', 2: '0', 3: '0' }); let r = await fe(); ck(w + ' weights all zero -> errorWeightZero, nothing added', r.split === C.errorWeightZero && r.n === 2 && r.f === 'w-1', r);
    await addX(p, 'Fuel', '12', 1, 'w', { 1: '1', 2: 'x' }); r = await fe(); ck(w + ' bad weight -> errorWeight', r.split === C.errorWeight && r.n === 2 && r.f === 'w-2', r);
    await addX(p, 'Fuel', '12', 1, 'e', {}); r = await fe(); ck(w + ' nobody in the split -> errorNoParticipants', r.split === C.errorNoParticipants && r.n === 2, r);
    await typeInto(p, '#f-amt', ''); await typeInto(p, '#f-what', '');
    // excluded + weighted (Creative s2)
    await press(p, '#p-add'); await p.keyboard.type('Dee'); await sleep(40);
    await addX(p, 'Canoe hire', '24', 6, 'w', { 1: '1', 6: '2' }); t = await view(p);
    ck(w + ' s2: excluded participant + weighted -> “Ben”>“Ade” 3.33, “Cy”>“Ade” 5.33, “Cy”>“Dee” 8.00', t.transfers.join('|') === '“Ben” pays “Ade” $3.33|“Cy” pays “Ade” $5.33|“Cy” pays “Dee” $8.00' && t.tape[0].includes('Not in it: “Dee”') && t.tape[2].includes('By weight: “Ade” 1, “Dee” 2') && t.tape[2].includes('Not in it: “Ben”, “Cy”') && t.nums.join() === '1,2,3', t);
    ck(w + ' frame tokens: sides + amounts match nets; Σ = 0', t.tokens.join('|') === '“Ade” owed $8.66|“Ben” owes $3.33|“Cy” owes $13.33|“Dee” owed $8.00' && /Sum\s+\$0\.00 ✓/.test(t.net), t.tokens);
    ck(w + ' 320/390/1280: no sideways scroll, controls fit, no clipped text', (await overflow(p)).sw <= w && !(await fits(p)).length, { o: await overflow(p), f: await fits(p) });
    // typedAudit on the sender view (incl. copied text)
    await p.click('#b-copy'); await sleep(120); let clip = await p.evaluate(() => window.__clip.slice());
    let a = await typedAudit(p, ['Ade', 'Ben', 'Cy', 'Dee', 'Cabin weekend', 'Firewood', 'Groceries', 'Canoe hire'].filter(x => x), { clip: clip.join('\n'), fallback: await p.$eval('#fallback', e => e.value) });
    ck(w + ' typedAudit (sender): every typed name/event/what quoted on screen, aria, describedby, live, options, toast, copied text', a.ok, a.hits);
    ck(w + ' copy: Writer summaryText exact, toast Copied.', clip[0] === '“Cabin weekend” ($)\n“Ben” pays “Ade” $3.33\n“Cy” pays “Ade” $5.33\n“Cy” pays “Dee” $8.00\nAfter these, every balance is $0.00.\n' + C.residualPolicy + '\nThis shows who pays whom. It doesn\'t move money.' && (await view(p)).toast === C.copied, clip);
    // toast reset on route change
    await p.evaluate(() => { location.hash = 'garbage'; }); await sleep(200); t = await view(p); ck(w + ' toast cleared on route change; bad link starts blank', !t.toast && (await p.$eval('#banner-t', e => e.textContent)) === C.badLink && t.tape.length === 0, t);
    // reset clears UI + fragment (also after a bad link)
    await press(p, '#b-reset'); await sleep(150); t = await view(p); const ev = await p.$eval('#ev', e => e.value);
    ck(w + ' Clear (confirm): fragment removed, banner gone, blank event, toast Cleared.', !t.hash && ev === '' && (await p.$eval('#banner', e => e.hidden)) && t.toast === C.resetDone && t.tokens.join() === '? even $0.00,? even $0.00', t);
    // payer removed -> invalid expense, alert, in-page error link lands focus
    await fill(p); await press(p, '#p-add'); await p.keyboard.type('Dee'); await addX(p, 'Canoe hire', '24', 5, 'e', { 1: 1, 5: 1 });
    await press(p, '#pr-5'); t = await view(p); const xid = await p.$eval('#xs .eu-x.is-invalid', e => e.id);
    ck(w + ' payer removed: alert (Writer plural), tape error names the removed payer quoted, copy disabled, balances leave it out', t.fix === C.expensesNeedFixing.one && t.tape[1].includes('“Dee” isn\'t on the list anymore. Pick who paid.') && t.copyDis && t.transfers.length === 2, t);
    await mouseAt(p, '#fix-l a'); r = await p.evaluate(() => ({ f: document.activeElement.id, hash: location.hash }));
    ck(w + ' in-page error link (real pointer click) lands focus on the expense; hash unchanged', r.f === xid && !r.hash, r);
    await press(p, '#xed-' + xid.slice(2)); r = await p.evaluate(() => ({ f: document.activeElement.id, what: document.getElementById('f-what').value, add: document.getElementById('f-add').textContent }));
    ck(w + ' Edit loads the expense into the form', r.f === 'f-what' && r.what === 'Canoe hire' && r.add === C.saveExpense, r);
    await p.select('#f-payer', '1'); await press(p, '#f-add'); t = await view(p); ck(w + ' fixed by picking a payer: alert gone, copy enabled', !t.fix && !t.copyDis && t.tape.length === 2, t);
    // copy failure -> selectable text
    await p.evaluate(() => { window.__clipFail = true; }); await press(p, '#b-copy'); await sleep(120);
    r = await p.evaluate(() => ({ vis: !document.getElementById('fbwrap').hidden, f: document.activeElement.id, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart, ro: document.getElementById('fallback').readOnly, toast: document.getElementById('toast').textContent, v: document.getElementById('fallback').value }));
    ck(w + ' copy failure: copyFail toast + read-only selected summary text', r.vis && r.f === 'fallback' && r.sel === r.v.length && r.ro && r.toast === C.copyFail && r.v.startsWith('“Cabin weekend”'), r);
    const st0 = await storage(p); ck(w + ' sender flow: no cookies/localStorage/sessionStorage/IndexedDB/caches/SW, no {placeholders}', !st0.cookie && !st0.ls.length && !st0.ss.length && (!st0.idb.length || st0.idb === 'n/a') && !st0.caches.length && !st0.sw && !st0.undef, st0);
    const host = H; ck(w + ' sender flow: no request off the page origin, no query strings, GET only', !netCheck(s.reqs, host, []).offending.length, netCheck(s.reqs, host, []).offending);
    ck(w + ' sender: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- share cancel + link + recipient
    s = await session(H, IP, { shareCancel: true }); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    await fill(p); await press(p, '#b-share'); await sleep(150);
    r = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, link: document.getElementById('link').value, f: document.activeElement.id, arg: window.__shareArg }));
    ck(w + ' share cancel: shareCancel toast, link left selected in a read-only box, ≤ 2,000 chars', r.toast === C.shareCancel && r.f === 'link' && r.link.startsWith(BASE + '#e1.') && r.link.length <= 2000 && r.arg && r.arg.text === 'Evening up: “Cabin weekend”', r);
    const link = r.link; await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(300);
    t = await view(p); r = await p.evaluate(() => ({ banner: document.getElementById('banner').innerText, people: document.getElementById('people').hidden, form: document.getElementById('expform').hidden, dis: [...document.querySelectorAll('#people input, #expform input, #expform button')].every(e => e.disabled), acts: document.querySelectorAll('#xs .eu-xacts').length, share: document.getElementById('b-share').hidden, copy: document.getElementById('b-copy').disabled }));
    ck(w + ' recipient: banner (receiverIntro + receiverNote, no agreement claim), editors hidden + disabled, same transfers, copy/print stay', r.banner.includes('Evening up: “Cabin weekend”') && r.banner.includes(C.receiverNote) && r.people && r.form && r.dis && !r.acts && r.share && !r.copy && t.transfers.join('|') === '“Ben” pays “Ade” $10.00|“Cy” pays “Ade” $10.00', { r, t });
    const ra = await recipientAccess(p, { facts: ['“Ade”', '“Ben”', '“Cy”', '$10.00', '$20.00', '“Cabin weekend”', C.receiverNote], tabTo: ['#home', '#own-copy', '#b-copy', '#b-reset'], click: '#own-copy' });
    ck(w + ' recipientAccess: no inert, no aria-hidden facts, facts in the a11y tree, Tab reaches links/buttons, real click works', ra.ok, ra);
    r = await p.evaluate(() => ({ hash: location.hash, people: document.getElementById('people').hidden, banner: document.getElementById('banner-t').textContent, ev: document.getElementById('ev').value }));
    ck(w + ' Start my own from this: editable copy, fragment cleared, copyTakenNote', !r.hash && !r.people && r.banner === C.copyTakenNote && r.ev === 'Cabin weekend', r);
    // reset from a recipient view clears the fragment
    await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(250); await press(p, '#b-reset'); await sleep(150);
    r = await p.evaluate(() => ({ hash: location.hash, people: document.getElementById('people').hidden, rods: document.querySelectorAll('#rods li').length, tape: document.getElementById('tape').hidden }));
    ck(w + ' Clear on a received link: fragment cleared, blank editable page', !r.hash && !r.people && r.rods === 2 && r.tape, r);
    // malformed links (same tab): every one shows badLink / oldVersion with nothing from the previous event
    const frag = link.split('#')[1]; const bads = [['x', 'badLink'], [frag.slice(0, -1), 'badLink'], [frag.slice(0, 30), 'badLink'], [frag.replace('e1.', 'e2.'), 'badLink'], ['e1.' + 'A'.repeat(2100) + '.abcdef', 'badLink'], ['e1.%%%.000000', 'badLink'], ['t1.' + frag.slice(3), 'badLink']];
    const v2 = await p.evaluate(() => MILL.pack('e', 2, { e: 'X', c: 0, p: ['A', 'B'], x: [] })); bads.push([v2, 'oldVersion']);
    const shape = await p.evaluate(() => [MILL.pack('e', 1, { e: 'X', c: 0, p: ['A', 'a'], x: [['F', 100, 0, 0, [0, 1]]] }), MILL.pack('e', 1, { e: 'X', c: 0, p: ['A', 'B'], x: [['F', -100, 0, 0, [0, 1]]] }), MILL.pack('e', 1, { e: 'X', c: 0, p: ['A', 'B'], x: [['F', 100, 0, 1, [[0, 0], [1, 0]]]] }), MILL.pack('e', 1, { e: 'X', c: 0, p: ['A', 'B'], x: [] })]);
    shape.forEach(f => bads.push([f, 'badLink']));
    for (const [b, why] of bads) { await p.evaluate(f => { location.hash = f; }, frag); await sleep(150); await p.evaluate(f => { location.hash = f; }, b); await sleep(150);
      r = await p.evaluate(() => ({ b: document.getElementById('banner-t').textContent, x: document.querySelectorAll('#xs .eu-x').length, ev: document.getElementById('ev').value, people: document.getElementById('people').hidden, inv: document.querySelectorAll('[aria-invalid=true]').length }));
      ck(w + ` malformed link (${b.slice(0, 14)}… len ${b.length}) -> ${why}, nothing from the previous event`, r.b === C[why] && r.x === 0 && r.ev === '' && !r.people && !r.inv, r); }
    const stb = await sameTabBadLink(p, { fill: async () => { await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await fill(p); }, link: async () => { await press(p, '#b-share'); await sleep(120); return p.$eval('#link', e => e.value); }, bad: 'e1.zzz.000000', errSel: '.eu-err' });
    ck(w + ' same-tab: link -> bad link leaves no visible error, nothing aria-invalid', stb.ok, stb);
    ck(w + ' share/recipient: no request off origin; no storage', !netCheck(s.reqs, H, []).offending.length && !(await storage(p)).ls.length, netCheck(s.reqs, H, []).offending);
    ck(w + ' share/recipient: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- PM Q1 spoof case on a received link + own copy + sender editor
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub());
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    { const bf = await p.evaluate(() => MILL.pack('e', 1, { e: '', c: 0, p: ['Ade', 'Ben'], x: [['Firewood', 3000, 0, 0, [0, 1]]] }));
      await p.goto('about:blank'); await p.goto(BASE + '#' + bf, { waitUntil: 'load' }); await sleep(300);
      const rb = await p.evaluate(() => ({ b: document.getElementById('banner-t').textContent, title: document.title, people: document.getElementById('people').hidden, line: document.getElementById('event-line').textContent }));
      ck(w + ' Creative 8: received link with a blank event opens read-only; banner/<title>/event line use "Even Up" unquoted', rb.people && rb.b === 'Evening up: ' + C.title && rb.title === C.title + ' · ' + C.studioName && rb.line === C.eventLabel + ': ' + C.title + ' · $', rb);
      await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); }
    const sf = await p.evaluate((SP, G, SE, SW) => MILL.pack('e', 1, { e: SE, c: 1, p: [G, SP, 'Bo'], x: [[SW, 1001, 0, 0, [0, 1, 2]], ['Tea', 500, 2, 1, [[0, 100], [1, 300]]]] }), SP, G, SE, SW);
    await p.goto('about:blank'); await p.goto(BASE + '#' + sf, { waitUntil: 'load' }); await sleep(300);
    const outs = async () => { const c = await p.evaluate(() => window.__clip.slice()); const o = { fallback: await p.$eval('#fallback', e => e.value) }; c.forEach((x, i) => { o['clip' + i] = x; }); return o; };
    await p.click('#b-copy'); await sleep(100); a = await typedAudit(p, [SP, G, SE, SW], await outs());
    ck(w + ' Q1 spoof (received): typed “ ” „ ‟ « » shown as " inside one “…” frame everywhere incl. copied text', a.ok, a.hits);
    const kept = await p.evaluate(() => { const u = MILL.unpack(location.hash, 'e', 1, 1e6); return u.ok ? JSON.stringify(u.data) : ''; }); ck(w + ' Q1: the link keeps the original typed marks', [SP, G, SE, SW].every(x => kept.includes(JSON.stringify(x).slice(1, -1))), kept.slice(0, 80));
    await p.click('#own-copy'); await sleep(200); await p.evaluate(() => { window.__clip = []; }); await p.click('#b-copy'); await sleep(100);
    a = await typedAudit(p, [SP, G, SE, SW], await outs()); ck(w + ' Q1 spoof (own copy / sender editor: chips, options, remove/edit aria, weights aria)', a.ok, a.hits);
    // invalid states in the editor carry typed text too: remove the payer of expense 2 ("Bo")
    await press(p, '#pr-3'); a = await typedAudit(p, [SP, G, SE, SW, 'Bo', 'Tea'], await outs()); ck(w + ' typedAudit with an invalid expense (payer removed: alert link, tape error, aria)', a.ok && (await p.$eval('#fix', e => !e.hidden)), a.hits);
    // print
    await p.emulateMediaType('print'); r = await p.evaluate(() => ({ forms: getComputedStyle(document.getElementById('people')).display, foot: getComputedStyle(document.getElementById('pfoot')).display, txt: document.getElementById('pfoot').textContent, acts: getComputedStyle(document.querySelector('.eu-actions')).display })); await p.emulateMediaType('screen');
    ck(w + ' print: forms + buttons hidden, footer printFooter shown', r.forms === 'none' && r.acts === 'none' && r.foot !== 'none' && r.txt === C.printFooter, r);
    ck(w + ' spoof: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- URL cap: a link just under 2,000 opens; one more expense makes the link too long -> no link, text instead
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub());
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const big = await p.evaluate(() => { const pre = location.origin + location.pathname + '#'; let best = null;
      for (let n = 1; n <= 20; n++) { const st = { e: 'E'.repeat(60), c: 0, p: Array.from({ length: 8 }, (_, i) => 'N'.repeat(22) + i), x: Array.from({ length: n }, (_, i) => ['W'.repeat(38) + (i % 10) + 'x', 9999999, i % 8, 0, [0, 1, 2, 3, 4, 5, 6, 7]]) };
        const f = MILL.pack('e', 1, st); if (pre.length + f.length <= 2000) best = f; else break; } return best; });
    await p.goto('about:blank'); await p.goto(BASE + '#' + big, { waitUntil: 'load' }); await sleep(300);
    r = await p.evaluate(() => ({ len: location.href.length, ok: !document.getElementById('people').hidden ? 'own' : 'recv', b: document.getElementById('banner-t').textContent }));
    ck(w + ' URL cap: a link under 2,000 chars opens as a received event', r.len <= 2000 && r.ok === 'recv' && r.b.startsWith('Evening up:'), r);
    await p.click('#own-copy'); await sleep(150); await addX(p, 'W'.repeat(40), '99999.99', 1, 'e', { 1: 1, 2: 1 }); await press(p, '#b-share'); await sleep(150);
    r = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, link: document.getElementById('linkbox').hidden, fb: !document.getElementById('fbwrap').hidden, room: document.getElementById('linkroom').textContent, over: document.getElementById('linkroom').classList.contains('is-over'), hash: location.hash }));
    ck(w + ' URL cap: over 2,000 -> no link made (tooLongLink), summary text offered, real length shown', r.toast === C.tooLongLink && r.link && r.fb && r.over && /Link length: 2,\d{3} of 2,000 characters\./.test(r.room) && !r.hash, r);
    ck(w + ' cap: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- keyboard reach
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await fill(p);
    const miss = await tabReach(p, ['home', 'b-copy', 'b-share', 'b-print', 'b-reset', 'ev', 'cur', 'p-1', 'p-add', 'f-what', 'f-amt', 'f-payer', 'm-e', 'm-w', 'c-1', 'f-add', 'xed-4', 'xrm-4'], 160);
    ck(w + ' keyboard: Tab reaches every control', !miss.length, miss); await s.b.close();
  }
  // ---------- QA local-a695196 E1–E4, E5 layout, E8 and the empty-rod contrast (320/390/1280/1440)
  const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rgb = s => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  for (const w of [320, 390, 1280, 1440]) {
    const s = await session(H, IP); const p = s.p; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub());
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); // measure tokens at rest, not mid-slide
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(250);
    // Creative: empty rods >= 3:1 (computed colours, worst case over the wood grain, and pixels sampled on screen)
    let t = await p.evaluate(() => { const fr = document.getElementById('frame'), cs = getComputedStyle(fr), q = document.querySelector('#rods .eu-unnamed'), row = document.querySelector('#rods .eu-rod-row');
      const tmp = document.createElement('span'); tmp.style.color = 'var(--eu-mute)'; fr.appendChild(tmp); const mute = getComputedStyle(tmp).color; tmp.style.color = 'var(--eu-post)'; const post = getComputedStyle(tmp).color; tmp.remove();
      const rod = row.querySelector('.eu-rod'), rb = rod.getBoundingClientRect();
      return { board: cs.backgroundColor, mute, post, q: getComputedStyle(q).color, qOp: getComputedStyle(q).opacity, rowOp: getComputedStyle(row).opacity, rodBg: getComputedStyle(rod, '::before').backgroundImage, unnamed: row.classList.contains('is-unnamed'), y: rb.top + rb.height / 2, x0: rb.left, x1: rb.right }; });
    const grain = rgb(t.board).map((v, i) => Math.round(0.07 * [150, 110, 60][i] + 0.93 * v));
    const png = await p.screenshot({ clip: { x: t.x0, y: t.y - 1, width: Math.min(140, t.x1 - t.x0), height: 2 }, encoding: 'base64' });
    const px = await (await s.b.newPage()).evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, 1).data, out = []; for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]); return out; }, png);
    const L = px.map(lum), dark = px[L.indexOf(Math.min(...L))], light = px[L.indexOf(Math.max(...L))];
    const R = { qBoard: ratio(rgb(t.q), rgb(t.board)), qGrain: ratio(rgb(t.q), grain), rodBoard: ratio(rgb(t.mute), rgb(t.board)), rodGrain: ratio(rgb(t.mute), grain), postBoard: ratio(rgb(t.post), grain), pixels: ratio(dark, light) };
    ck(w + ' Creative empty rods: "?" and dashed rod full-opacity --eu-mute, >= 3:1 on maple incl. the grain and on screen pixels; post solid', t.unnamed && t.qOp === '1' && t.rowOp === '1' && /repeating-linear-gradient/.test(t.rodBg) && Object.values(R).every(v => v >= 3), { R, t: { board: t.board, mute: t.mute, q: t.q } });
    // E8: people cap is a neutral hint
    for (let i = 3; i <= 8; i++) { await press(p, '#p-add'); await p.keyboard.type('P' + i); }
    t = await p.evaluate(() => { const h = document.getElementById('p-hint'), cs = getComputedStyle(h), tmp = document.createElement('span'); tmp.style.color = 'var(--eu-err)'; document.body.appendChild(tmp); const err = getComputedStyle(tmp).color; tmp.remove();
      return { txt: h.textContent, cls: h.className, color: cs.color, err, inv: document.querySelectorAll('[aria-invalid=true]').length, role: h.getAttribute('role'), add: document.getElementById('p-add').disabled }; });
    ck(w + ' QA E8: 8 people -> "Up to eight people." as a neutral hint (not .eu-err, not error colour, no aria-invalid, no alert role)', t.txt === C.tooManyPeople && !/eu-err/.test(t.cls) && t.color !== t.err && !t.inv && !t.role && t.add, t);
    // E1 + E2: amounts at the cap on both sides and long names
    const cases = { twoAtCap: { e: 'Cap', c: 0, p: ['Ade', 'Ben'], x: Array.from({ length: 20 }, (_, i) => ['x' + i, 10000000, 0, 0, [1]]) },
      eightAtCap: { e: 'Cap', c: 0, p: ['Maximiliana Wolfeschlege', 'Bartholomew-Fitzgerald J', 'W'.repeat(24), 'Ngozi Okonkwo-Adeyemi', 'Ade', 'Zoë', 'M'.repeat(24), 'Cy'], x: Array.from({ length: 20 }, (_, i) => ['x' + i, 10000000 - i * 77, i % 3, 0, [0, 1, 2, 3, 4, 5, 6, 7]]) },
      thousand: { e: 'K', c: 0, p: ['Ade', 'Bea'], x: [['Hotel', 123456, 0, 0, [1]], ['Car', 1234567, 0, 0, [1]]] } };
    for (const [name, o] of Object.entries(cases)) {
      const f = await p.evaluate(o => MILL.pack('e', 1, o), o); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(350);
      t = await p.evaluate(() => [...document.querySelectorAll('#rods .eu-rod-row')].map(r => { const tok = r.querySelector('.eu-token'), fig = tok.querySelector('.eu-fig'), sm = tok.querySelector('small'), rod = r.querySelector('.eu-rod');
        const tb = tok.getBoundingClientRect(), rb = rod.getBoundingClientRect(), post = rb.left + rb.width / 2, lh = parseFloat(getComputedStyle(fig).fontSize) * 1.6;
        return { fig: fig.textContent, side: rod.dataset.side, figLines: fig.getClientRects().length, figTall: fig.getBoundingClientRect().height > lh, smTall: sm.getBoundingClientRect().height > parseFloat(getComputedStyle(sm).fontSize) * 1.8,
          inRod: tb.left >= rb.left - 1 && tb.right <= rb.right + 1, post: rod.dataset.side === 'owes' ? tb.right <= post + 1 : rod.dataset.side === 'owed' ? tb.left >= post - 1 : true }; }));
      const bad = t.filter(r => r.figLines !== 1 || r.figTall || r.smTall || !r.inRod || !r.post);
      ck(w + ` QA E1 ${name}: every frame amount on one unbroken line (owes + gets back up to ${t.map(r => r.fig).sort((a, b) => b.length - a.length)[0]}), token inside its rod, never across the zero post`, !bad.length && t.some(r => r.side === 'owes') && t.some(r => r.side === 'owed'), bad.length ? bad : t.map(r => r.side + ' ' + r.fig).join(' | '));
      if (name === 'eightAtCap') {
        // E2: names break only between words (a single word longer than the column may break); the closing quote never sits alone
        t = await p.evaluate(() => [...document.querySelectorAll('#rods .eu-name .mill-typed')].map(e => { const txt = e.textContent, rg = document.createRange(), tops = []; let node, idx = 0; const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
          while ((node = walk.nextNode())) for (let i = 0; i < node.length; i++) { rg.setStart(node, i); rg.setEnd(node, i + 1); const rc = rg.getClientRects()[0]; tops.push(rc ? Math.round(rc.top) : null); idx++; }
          const breaks = []; for (let i = 1; i < tops.length; i++) if (tops[i] > tops[i - 1] + 2) breaks.push(i);
          const word = txt.replace(/^\u201C|\u201D$/g, '').split(' '), longWord = word.some(x => x.length > 14);
          return { txt, lines: breaks.length + 1, midWord: !longWord && breaks.some(i => txt[i - 1] !== ' ' && txt[i] !== ' ' && txt[i - 1] !== '-'), quoteAlone: breaks.length && breaks[breaks.length - 1] === txt.length - 1, overflow: e.closest('.eu-name').scrollWidth > e.closest('.eu-name').clientWidth + 1 }; }));
        const badN = t.filter(r => r.midWord || r.quoteAlone || r.overflow);
        ck(w + ' QA E2: long names wrap between words (no mid-word breaks for normal names), closing quote stays with the last word, nothing clipped', !badN.length, badN.length ? badN : t.map(r => r.txt + ':' + r.lines).join(' | '));
        if (w >= 1280) { const nw = await p.$eval('#rods .eu-name', e => e.getBoundingClientRect().width); ck(w + ' QA E2: name column is wider at desktop widths (>= 180px)', nw >= 180, nw); }
      }
      if (name === 'thousand') await p.screenshot({ path: `/tmp/eu/e1-${w}.png` });
    }
    // E5 layout: the note follows the amount on the same line (320: under it, right-aligned); amounts stay in one column; SR text from residualMarkAria
    { const f = await p.evaluate(() => MILL.pack('e', 1, { e: 'Odd', c: 0, p: ['Ade', 'Ben', 'Cy'], x: [['Groceries', 1000, 0, 0, [0, 1, 2]]] })); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(300);
      t = await p.evaluate(() => { const dds = [...document.querySelectorAll('#xs .eu-x dd')], a = dds.map(d => d.querySelector('.eu-amt').getBoundingClientRect()), mk = document.querySelector('#xs .eu-rmark:not(:empty)'), mb = mk.getBoundingClientRect(), a0 = a[0], cs = getComputedStyle(mk);
        const tmp = document.createElement('span'); tmp.style.color = 'var(--eu-tape-red)'; document.body.appendChild(tmp); const red = getComputedStyle(tmp).color; tmp.remove();
        return { rights: a.map(r => Math.round(r.right)), sameLine: Math.abs(mb.top - a0.top) < 6 && mb.left >= a0.right, under: mb.top >= a0.bottom - 1 && Math.abs(mb.right - a0.right) <= 1, txt: mk.textContent, color: cs.color, red, size: cs.fontSize, weight: cs.fontWeight, fam: cs.fontFamily, sr: dds[0].querySelector('.eu-sr').textContent, ddText: dds[0].textContent, plus: document.getElementById('xs').textContent.includes('+$0.01'), ah: mk.getAttribute('aria-hidden'), amtSize: getComputedStyle(dds[0].querySelector('.eu-amt')).fontSize, amtSize2: getComputedStyle(dds[1].querySelector('.eu-amt')).fontSize }; });
      const okPos = w <= 320 ? t.under : t.sameLine;
      ck(w + ` QA E5: “Ade” $3.34 is the figure, Writer residualMark ${w <= 320 ? 'under it, right-aligned' : 'after it on the same line'} (13px Lexend 400 --eu-tape-red), amounts in one column, SR hears "$3.34, ${C.residualMarkAria}", no +$0.01`,
        okPos && new Set(t.rights).size === 1 && t.txt === C.residualMark && t.color === t.red && t.size === '13px' && t.weight === '400' && /Lexend/.test(t.fam) && t.sr === ', ' + C.residualMarkAria && t.ddText.startsWith('$3.34, ' + C.residualMarkAria) && !t.plus && t.ah === 'true' && t.amtSize === t.amtSize2, t);
      const tr = await p.$$eval('#transfers li', ls => ls.map(l => l.textContent).join('|')); ck(w + ' QA E5: no rounding note on the settle-up transfer lines', !tr.includes(C.residualMark) && !tr.includes('1¢'), tr);
      await p.emulateMediaType('print'); t = await p.evaluate(() => { const mk = document.querySelector('#xs .eu-rmark:not(:empty)'), cs = getComputedStyle(mk); return { d: cs.display, pca: cs.printColorAdjust || cs.webkitPrintColorAdjust, color: cs.color }; }); await p.emulateMediaType('screen');
      ck(w + ' QA E5: print keeps the red note (print-color-adjust: exact)', t.d !== 'none' && t.pca === 'exact', t); }
    // E3: residue after a valid link -> empty hash, and -> Clear
    const sec = { e: 'Yolanda party', c: 0, p: ['Yolanda', 'Xavier'], x: [['Cake', 1200, 0, 0, [0, 1]]] }, sf = await p.evaluate(o => MILL.pack('e', 1, o), sec);
    for (const how of ['residueEmptyHash', 'residueClear']) {
      await p.goto('about:blank'); await p.goto(BASE + '#' + sf, { waitUntil: 'load' }); await sleep(300); const before = await p.$eval('#banner-t', e => e.textContent);
      if (how === 'residueEmptyHash') { await p.evaluate(() => { location.hash = ''; }); } else { await press(p, '#b-reset'); } await sleep(300);
      t = await p.evaluate(() => ({ html: document.body.innerHTML.includes('Yolanda') || document.body.innerHTML.includes('Xavier'), bt: document.getElementById('banner-t').textContent, bn: document.getElementById('banner-n').textContent, hidden: document.getElementById('banner').hidden, title: document.title }));
      ck(w + ` QA E3 ${how}: after a valid link, the hidden banner is empty and nothing from the link stays in the DOM or the title`, before.includes('Yolanda') && t.hidden && !t.bt && !t.bn && !t.html && !t.title.includes('Yolanda'), t);
    }
    // E3: Start my own -> the hidden receiver note is emptied too
    await p.goto('about:blank'); await p.goto(BASE + '#' + sf, { waitUntil: 'load' }); await sleep(300); await press(p, '#own-copy'); await sleep(150);
    t = await p.evaluate(() => ({ bn: document.getElementById('banner-n').textContent, hid: document.getElementById('banner-n').hidden })); ck(w + ' QA E3: own copy -> hidden receiverNote emptied', t.hid && !t.bn, t);
    ck(w + ' QA a695196 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  // E4: whole-URL cap on the receiving side, from a 64-character origin: 2,000 opens, 2,001 is refused as damaged
  { const port = (H.split(':')[1] || ''), tail = port ? ':' + port : '', hn = 'x'.repeat(64 - (SCHEME + '://').length - tail.length - '.eu-cap.test'.length) + '.eu-cap.test', O = SCHEME + '://' + hn + tail;
    const s = await session(hn, IP); const p = s.p; await p.setViewport({ width: 390, height: 900 }); await p.goto(O + '/mill/even-up/', { waitUntil: 'load' }); await sleep(200);
    const fr = await p.evaluate(() => { const pre = (location.origin + location.pathname + '#').length, want = { 2000: null, 2001: null }; // pad the event / names until the whole URL is exactly 2,000 and 2,001
      for (let n = 1; n <= 20 && (!want[2000] || !want[2001]); n++) for (let e = 0; e <= 60; e++) for (let k = 0; k <= 22; k++) { const o = { e: 'E'.repeat(e), c: 0, p: Array.from({ length: 8 }, (_, i) => 'N'.repeat(k) + i), x: Array.from({ length: n }, (_, i) => ['W'.repeat(38) + 'x', 9999999, i % 8, 0, [0, 1, 2, 3, 4, 5, 6, 7]]) };
        const f = MILL.pack('e', 1, o), L = pre + f.length; if ((L === 2000 || L === 2001) && !want[L]) want[L] = f; }
      return { origin: location.origin, oLen: location.origin.length, pre, want }; });
    const r = {}; for (const L of [2000, 2001]) { await p.goto('about:blank'); await p.goto(O + '/mill/even-up/#' + fr.want[L], { waitUntil: 'load' }); await sleep(300);
      r[L] = await p.evaluate(() => ({ len: location.href.length, b: document.getElementById('banner-t').textContent, recv: document.getElementById('people').hidden, x: document.querySelectorAll('#xs .eu-x').length })); }
    ck('QA E4: 64-char origin: whole URL 2,000 opens as a received event', fr.oLen === 64 && r[2000].len === 2000 && r[2000].recv && r[2000].b.startsWith('Evening up:'), { o: fr.origin, r: r[2000] });
    ck('QA E4: 64-char origin: whole URL 2,001 refused as damaged (badLink), nothing opened', r[2001].len === 2001 && r[2001].b === C.badLink && !r[2001].recv && r[2001].x === 0, r[2001]);
    await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
