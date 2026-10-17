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
    let t = await p.evaluate(() => ({ rods: document.querySelectorAll('#rods li').length, empty: document.getElementById('empty').textContent, copyHidden: document.getElementById('b-copy').hidden, tape: document.getElementById('tape').hidden, h1: getComputedStyle(document.querySelector('h1')).fontFamily, body: getComputedStyle(document.body).fontFamily }));
    ck(w + ' empty: two rods, empty-state copy, no tape, copy hidden', t.rods === 2 && t.empty === C.emptyState && t.copyHidden && t.tape, t);
    ck(w + ' Writer finals: limitsNote filled exactly (cap 2,000), no copy-extra.js loaded', (await p.$eval('#limits', e => e.textContent)) === 'Names up to 24 characters, the event 60, what for 40. Amounts up to 100,000.00 each, weights up to 1000. Links up to 2,000 characters.' && !(await p.$('script[src="copy-extra.js"]')) && !s.reqs.some(r => r.includes('copy-extra')), await p.$eval('#limits', e => e.textContent));
    ck(w + ' distinct from Split the Sack: Young Serif + Lexend (not Barlow / Inter Tight), counting frame + tape', /Young Serif/.test(t.h1) && /Lexend/.test(t.body) && !/Barlow|Inter Tight/.test(t.h1 + t.body) && !!(await p.$('.eu-frame')) && !(await p.$('.ss-lcd, .ss-sack')), t);
    // add expense before people are valid -> people errors shown, focus on event
    await addX(p, 'Firewood', '30', null, 'e', { 1: 1, 2: 1 }); t = await p.evaluate(() => ({ f: document.activeElement.id, ev: document.getElementById('e-ev').textContent, p1: document.getElementById('pe-1').textContent, n: document.querySelectorAll('#xs .eu-x').length, inv: document.getElementById('ev').getAttribute('aria-invalid') }));
    ck(w + ' expense refused until event + names are valid; errors shown; focus lands on the event', t.f === 'ev' && t.ev === C.eventEmpty && t.p1 === C.personEmpty && t.n === 0 && t.inv === 'true', t);
    await fill(p); t = await view(p);
    ck(w + ' brief test: Ade pays 30 for Ade/Ben/Cy -> Ben pays Ade 10, Cy pays Ade 10; every balance zero after', t.transfers.join('|') === '“Ben” pays “Ade” $10.00|“Cy” pays “Ade” $10.00' && t.check === '✓ ' + C.settleNote && t.tokens.join('|') === '“Ade” owed $20.00|“Ben” owes $10.00|“Cy” owes $10.00' && t.nums.join() === '1,2' && t.links === 2, t);
    ck(w + ' tape: per-expense audit with shares = total ✓, net column sums to $0.00 ✓', t.tape[0].includes('#1 “Firewood”') && t.tape[0].includes('“Ade” paid $30.00 for “Firewood”, split between “Ade”, “Ben”, “Cy”.') && /Shares\s+\$30\.00 ✓/.test(t.tape[0]) && /Sum\s+\$0\.00 ✓/.test(t.net) && t.net.includes(C.balanceCheck), t);
    const body = await p.evaluate(() => document.body.innerText); ck(w + ' no fewest/minimum/optimal claim on the page (only "aren\'t necessarily the fewest")', !/fewest|minim|optimal/i.test(body.replace(C.notFewestNote, '')) && body.includes(C.notFewestNote), null);
    // odd cent
    await addX(p, 'Groceries', '10', 2, 'e', { 1: 1, 2: 1, 3: 1 }); t = await view(p);
    ck(w + ' odd cent: $10.00 / 3 -> “Ade” $3.34 +$0.01, residual line, policy shown', t.tape[1].includes('$3.34 +$0.01') && t.tape[1].includes('1 extra cent went to “Ade”.') && (await p.$eval('#policy', e => e.textContent)) === C.residualPolicy, t.tape[1]);
    // validation (form)
    const fe = async () => p.evaluate(() => ({ amt: document.getElementById('e-amt').textContent, split: document.getElementById('e-split').textContent, f: document.activeElement.id, n: document.querySelectorAll('#xs .eu-x').length, inv: document.getElementById('f-amt').getAttribute('aria-invalid'), d: document.getElementById('f-amt').getAttribute('aria-describedby') }));
    const cases = [['-5', C.errorNegative], ['12,5', C.errorPlainAmount], ['', C.errorNumber], ['100000.01', C.errorTooBig], ['1e3', C.errorPlainAmount]];
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
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
