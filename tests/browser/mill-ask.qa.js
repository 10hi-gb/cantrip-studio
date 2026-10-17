// node tests/browser/mill-ask.qa.js <host[:port]> <ip> [scheme] — One Small Ask end to end: sender -> recipient -> reply, @320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const M = require('../../mill/shared/core.js'), C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/one-small-ask/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/one-small-ask/`;
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    const s = await session(H, IP); const { p, b } = s; await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    const miss = await tabReach(p, ['f-w', 'f-e', 'f-u', 'f-d', 'f-s', 'f-t', 'f-h', 'f-f', 'f-o', 'b-link', 'b-share', 'b-reset']); ck(w + ' keyboard reach (composer)', !miss.length, miss);
    // required-field errors before anything is made
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(100);
    let t = await p.evaluate(() => ({ e: document.getElementById('e-w').textContent, link: document.getElementById('linkbox').hidden, focus: document.activeElement.id }));
    ck(w + ' empty ask refused with Writer error', t.e === 'Say what the favor is.' && t.link && t.focus === 'f-w', t);
    // SENDER composes by keyboard
    await typeInto(p, '#f-w', "Pick up groceries from my porch and drop them at Mom's"); await typeInto(p, '#f-e', '20');
    await typeInto(p, '#f-d', 'Tue Oct 20'); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM');
    await typeInto(p, '#f-f', 'Dana'); await typeInto(p, '#f-o', 'Sam');
    t = await p.evaluate(() => ({ s: document.getElementById('f-s').value, t: document.getElementById('f-t').value, text: document.getElementById('text').textContent }));
    ck(w + ' sender text export', t.s === '16:00' && t.t === '18:00' && t.text.includes('When: “Tue Oct 20”, 4 PM–6 PM') && t.text.startsWith('From: “Dana”\nThe favor, as typed: “Pick up groceries from my porch and drop them at Mom\'s”\n'), t);
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(300);
    const askUrl = await p.$eval('#link', e => e.value); ck(w + ' ask link made (#a1)', /#a1\./.test(askUrl), askUrl.length);
    ck(w + ' address bar not rewritten', (await p.evaluate(() => location.hash)) === '', null);
    // RECIPIENT opens in a fresh tab
    const q = await b.newPage(); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e))); q.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) qe.push(m.text()); });
    await q.goto(askUrl, { waitUntil: 'load' }); await sleep(200);
    t = await q.evaluate(() => ({ title: document.getElementById('title').textContent, typed: (document.querySelector('#title .osa-typed') || {}).textContent, qlab: [...document.querySelectorAll('.osa-term .ask .osa-qlabel')].map(e => e.textContent), send: [...document.querySelectorAll('.osa-fine')].map(e => e.textContent).join('|'), ask: [...document.querySelectorAll('.osa-term .ask')].map(e => e.textContent), choices: document.querySelectorAll('[role=radio]').length }));
    ck(w + ' recipient sees the ask (D4: name after its label as separate text; favor quoted under receiverAskLabel)', t.title === 'Small ask from: “Dana”' && t.typed === '“Dana”' && t.qlab[0] === 'Their ask, as typed:' && t.ask[0].includes('“Pick up groceries') && t.ask[0].endsWith('”') && t.ask[2] === '“Tue Oct 20”, 4 PM–6 PM' && t.choices === 3 && t.ask.length === 3, t);
    // keyboard radiogroup: focus Yes, arrow to Part of it
    await q.focus('#c-y'); await q.keyboard.press('ArrowDown'); await sleep(100);
    t = await q.evaluate(() => ({ checked: document.querySelector('[aria-checked=true]').id, focus: document.activeElement.id, inputs: !!document.getElementById('o-w') }));
    ck(w + ' arrow keys select Part of it', t.checked === 'c-p' && t.focus === 'c-p' && t.inputs, t);
    t = await q.evaluate(() => ({ btn: document.getElementById('b-rlink').textContent, err: document.getElementById('e-part').textContent }));
    ck(w + ' part unchanged => "This is a yes"', t.btn === 'This is a yes' && /Nothing's changed/.test(t.err), t);
    // counteroffer: collection-only Wed 5–6
    await typeInto(q, '#o-w', 'Collection only'); await sleep(50); await typeInto(q, '#o-d', 'Wed Oct 21'); await sleep(50); await q.focus('#o-s'); await q.keyboard.type('0500PM'); await sleep(100);
    t = await q.evaluate(() => ({ states: [...document.querySelectorAll('.osa-term')].map(e => e.className.replace('osa-term ', '')), struck: [...document.querySelectorAll('.osa-term .ask s')].map(e => e.textContent), btn: document.getElementById('b-rlink').textContent, text: document.getElementById('text').textContent }));
    ck(w + ' changed terms shown against original', t.states.join() === 'is-changed,is-same,is-changed' && t.struck.length === 2 && t.btn === 'Copy my reply link' && t.text.includes('Favor: “Collection only” (asked: “Pick up groceries from my porch and drop them at Mom\'s”)') && t.text.includes('Time it takes: 20 minutes max (same)'), t);
    await q.focus('#b-rlink'); await q.keyboard.press('Enter'); await sleep(300);
    const repUrl = await q.$eval('#link', e => e.value); ck(w + ' reply link made (#r1)', /#r1\./.test(repUrl), repUrl.length);
    // SENDER opens the reply
    const r = await b.newPage(); await r.setViewport({ width: w, height: 800 }); const re = []; r.on('pageerror', e => re.push(String(e)));
    await r.goto(repUrl, { waitUntil: 'load' }); await sleep(200);
    t = await r.evaluate(() => ({ title: document.getElementById('title').textContent, delta: document.getElementById('delta').textContent, verdict: document.querySelector('.osa-verdict').textContent, note: document.getElementById('note').textContent, body: document.body.innerText }));
    ck(w + ' sender sees reply with delta + snapshot note', t.title === '“Sam” replied with what they can do.' && t.delta.includes('“Collection only” · “Wed Oct 21”, 5 PM–6 PM') && t.verdict === 'Part of it' && /Nothing has been booked/.test(t.note) && !/\b(accepted|confirmed|agreed|delivered|notified)\b/i.test(t.body), t);
    { const qv = await r.evaluate(() => [...document.querySelectorAll('.osa-term .ask .osa-quoted')].map(e => e.textContent)); ck(w + ' reply view: original typed favor quoted under receiverAskLabel (D4)', qv.length >= 1 && qv[0].startsWith('Their ask, as typed: “Pick up groceries') && qv[0].endsWith('”'), qv); }
    // ask again, changed -> composer prefilled with the offer
    await r.focus('#b-again'); await r.keyboard.press('Enter'); await sleep(100);
    t = await r.evaluate(() => ({ w: document.getElementById('f-w').value, d: document.getElementById('f-d').value, hash: location.hash }));
    ck(w + ' ask again changed prefills', t.w === 'Collection only' && t.d === 'Wed Oct 21' && t.hash === '', t);
    // "no" reply has no reason field
    await q.focus('#c-n'); await q.keyboard.press('Enter'); await sleep(100);
    t = await q.evaluate(() => ({ note: !!document.getElementById('f-note'), text: document.getElementById('text').textContent }));
    ck(w + ' no = no reason field', !t.note && t.text.endsWith('Not this time.\n' + C.receiverTypedNote), t);
    // malformed links
    for (const [nm, h, want] of [['truncated', askUrl.split('#')[1].slice(0, 50), /damaged/], ['oversized', 'a1.' + 'A'.repeat(2100) + '.abcdef', /damaged/], ['script', '<img src=x onerror=alert(1)>', /damaged/], ['old version', await r.evaluate(() => MILL.pack('a', 0, {})), /older version/]]) {
      await r.goto('about:blank'); await r.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(100);
      const x = await r.evaluate(() => ({ b: document.getElementById('banner').textContent, hid: document.getElementById('banner').hidden, img: document.querySelectorAll('img').length, composer: !!document.getElementById('f-w') }));
      ck(w + ' ' + nm + ' link refused', want.test(x.b) && !x.hid && !x.img && x.composer, x);
    }
    // text-safe
    await typeInto(p, '#f-w', '<b>bold</b> & <i>x</i>'); t = await p.evaluate(() => ({ b: document.querySelectorAll('#x b b, .osa-copytext b').length, text: document.getElementById('text').textContent }));
    ck(w + ' text-safe rendering', t.b === 0 && t.text.includes('<b>bold</b>'), t);
    const of = await overflow(p), ofq = await overflow(q); ck(w + ' no overflow (composer, answer)', of.sw <= of.w && !of.bad.length && ofq.sw <= ofq.w && !ofq.bad.length, { of, ofq });
    // reset
    await p.focus('#b-reset'); await p.keyboard.press('Enter'); await sleep(100);
    t = await p.evaluate(() => ({ w: document.getElementById('f-w').value, hash: location.hash, link: document.getElementById('linkbox').hidden })); ck(w + ' reset clears', t.w === '' && t.hash === '' && t.link, t);
    for (const [nm, pg] of [['sender', p], ['recipient', q], ['reply', r]]) { const st = await storage(pg); ck(w + ' storage empty (' + nm + ')', !st.cookie && !st.ls.length && !st.ss.length && !(Array.isArray(st.idb) && st.idb.length) && !st.caches.length && !st.sw, st); }
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests (sender tab)', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length && !qe.length && !re.length, [errsOf(s, SCHEME), qe, re]);
    await b.close();
  }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); const f = await p.evaluate(() => ASK.encodeAsk({ w: 'Water plants', e: 10, u: 'min', d: 'Sat', s: '09:00', t: '10:00', h: '', f: 'Ana', o: 'Bo' }));
    await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await p.focus('#c-y'); await p.keyboard.press('Enter'); await sleep(50);
    await p.focus('#f-note'); await p.keyboard.type('Happy to.'); const nt = await p.evaluate(() => ({ vis: document.getElementById('f-note').getBoundingClientRect().height > 20, text: document.getElementById('text').textContent })); ck('390 yes + optional note visible and exported', nt.vis && nt.text.endsWith('Note: “Happy to.”\n' + C.receiverTypedNote), nt); await p.focus('#b-rshare'); await p.keyboard.press('Enter'); await sleep(300);
    const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value }));
    ck('390 reply share cancel keeps link selectable', t.toast === 'Not sent. Your reply is still here.' && t.sel === 'link' && /#r1\./.test(t.link), t); ck('390 share-cancel no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // D1/D2/D4 pattern checks carried over from Split the Sack QA: long single-word sender values never widen the page or overlap; full name kept in title
  for (const w of [320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' });
    const L = 'Pneumonoultramicroscopic'; const f = await p.evaluate(l => ASK.encodeAsk({ w: 'W'.repeat(120), e: 600, u: 'min', d: 'D'.repeat(40), s: '09:00', t: '10:00', h: 'H'.repeat(80), f: l, o: l }), L);
    await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(150);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth); const ov = await textOverlap(p, '#title, .osa-who b, .osa-who small, .osa-term .k1, .osa-term .ask, .osa-choice');
    const ttl = await p.$$eval('.osa-who b', bs => bs.map(b => b.title));
    ck(w + ' ask long single-word values: no overflow, no overlap, full name in title attr', sw <= w && !ov.length && ttl.includes('“' + L + '”'), { sw, ov, ttl }); await s.b.close(); }
  // ---- QA 83a2ebcd fixes (D1-D9) + PM scope (140 cap, line breaks, no note on "Not this time", recipient Start over)
  const USPS = 'Track at https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223344556677';
  const A0 = { w: 'pickup', e: 20, u: 'min', d: 'Tue', s: '16:00', t: '18:00', h: '', f: 'Jordan', o: 'Sam' };
  for (const w of [320, 390]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 800 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const L = await p.evaluate((A0, USPS) => { const { f: _f, o: _o, ...T0 } = A0; const part = ASK.encodeReply({ a: A0, v: 'p', p: { ...T0, w: 'collection-only', d: 'Wed', s: '17:00' }, n: '' });
      const yes = ASK.encodeReply({ a: { ...A0, w: 'water plants', d: 'Sat', s: '09:00', t: '10:00', f: 'Kim', o: 'Lee' }, v: 'y', p: null, n: '' });
      const urlPart = ASK.encodeReply({ a: { ...A0, w: USPS }, v: 'p', p: { ...T0, w: 'collection only', d: 'Wed' }, n: '' }); const urlAsk = ASK.encodeAsk({ ...A0, w: USPS, h: USPS.slice(0, 80) }); const ask2 = ASK.encodeAsk({ ...A0, w: 'Line one\nLine two\nLine three\nLine four\nLine five' });
      const names = ASK.encodeAsk({ ...A0, f: 'Christopher Montgomery', o: 'Bartholomew-Featherstone' }); return { part, yes, urlPart, urlAsk, ask2, names }; }, A0, USPS);
    const delta = () => p.evaluate(() => { const d = document.getElementById('delta'); return { shown: getComputedStyle(d).display !== 'none', text: d.textContent }; });
    await p.goto(BASE + '#' + L.part, { waitUntil: 'load' }); await sleep(150); let d = await delta(); const okPart = d.shown && d.text.includes('pickup');
    await p.goto(BASE + '#' + L.yes, { waitUntil: 'load' }); await sleep(150); const dy = await delta();
    await p.goto(BASE + '#' + L.part, { waitUntil: 'load' }); await sleep(150); await p.goto(BASE + '#' + 'r1.zzzz.000000', { waitUntil: 'load' }); await sleep(150); const db = await delta();
    await p.goto(BASE + '#' + L.part, { waitUntil: 'load' }); await sleep(150); await p.focus('#b-again'); await p.keyboard.press('Enter'); await sleep(150); const da = await delta();
    await p.focus('#b-reset'); await p.keyboard.press('Enter'); await sleep(150); const dr = await delta();
    ck(w + ' D1: delta from a Part reply never carries over (yes reply, bad link, Ask again, Start over) in the same tab', okPart && !dy.shown && !dy.text && !db.shown && !da.shown && !dr.shown, { okPart, dy, db, da, dr });
    // Joshua 10:25: rendered + a11y-tree check of the delta along part -> yes -> compose -> Start over -> bad link (one tab)
    const seq = {}; await p.goto(BASE + '#' + L.part, { waitUntil: 'load' }); await sleep(150); seq.partShown = !(await reallyHidden(p, ['#delta'])).ok;
    await p.goto(BASE + '#' + L.yes, { waitUntil: 'load' }); await sleep(150); seq.yes = await reallyHidden(p, ['#delta']);
    await p.goto(BASE + '#', { waitUntil: 'load' }); await sleep(150); seq.compose = await reallyHidden(p, ['#delta']);
    await p.focus('#b-reset'); await p.keyboard.press('Enter'); await sleep(150); seq.reset = await reallyHidden(p, ['#delta']);
    await p.goto(BASE + '#r1.zzzz.000000', { waitUntil: 'load' }); await sleep(150); seq.bad = await reallyHidden(p, ['#delta']);
    seq.text = await p.$eval('#delta', e => e.textContent);
    ck(w + ' D1 rendered: delta shown for Part, then not rendered and not in the a11y tree after yes -> compose -> Start over -> bad link', seq.partShown && seq.yes.ok && seq.compose.ok && seq.reset.ok && seq.bad.ok && seq.text === '', seq);
    await p.goto(BASE + '#' + L.urlPart, { waitUntil: 'load' }); await sleep(150); let of = await overflow(p); const dd = await p.evaluate(() => { const r = document.getElementById('delta').getBoundingClientRect(); return [...document.querySelectorAll('#delta span')].every(e => e.getBoundingClientRect().right <= document.documentElement.clientWidth + 1); });
    const tb = await p.evaluate(() => { const t = document.getElementById('text'); return t.scrollWidth <= t.clientWidth + 1; });
    ck(w + ' D2/D3: long USPS URL wraps in delta line (incl. struck original) and copy-text box', of.sw <= w && !of.bad.length && dd && tb, { of, dd, tb });
    await p.goto(BASE + '#' + L.urlAsk, { waitUntil: 'load' }); await sleep(150); of = await overflow(p); ck(w + ' D2: long URL in favor/where on recipient view: no overflow', of.sw <= w && !of.bad.length, of);
    const ini = await p.evaluate(() => [...document.querySelectorAll('.osa-ini')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
    ck(w + ' D4: avatar initials stay round', ini.length && ini.every(x => { const [a, b] = x.split('x').map(Number); return Math.abs(a - b) <= 1; }), ini);
    await p.goto(BASE + '#' + L.names, { waitUntil: 'load' }); await sleep(150);
    const nm = await p.evaluate(() => [...document.querySelectorAll('.osa-who b')].map(b => ({ t: b.textContent, clipped: b.scrollWidth > b.clientWidth + 1, ell: getComputedStyle(b).textOverflow, lines: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 20)) })));
    ck(w + ' D5: 20+ character names wrap instead of ellipsis', nm.some(x => x.t === '“Christopher Montgomery”') && nm.every(x => !x.clipped && x.ell !== 'ellipsis'), nm);
    const D8 = await p.evaluate(() => ({ title: document.getElementById('title').textContent, typed: (document.querySelector('#title .osa-typed') || {}).textContent, q: (document.querySelector('.osa-term .ask .osa-qlabel') || {}).textContent }));
    ck(w + ' D8: "Small ask from:" label + separate name; "Their ask, as typed:" + quotes', D8.title === 'Small ask from: “Christopher Montgomery”' && D8.typed === '“Christopher Montgomery”' && D8.q === 'Their ask, as typed:', D8);
    const domA = await p.evaluate(() => ({ editable: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].filter(e => !e.disabled && !e.readOnly).map(e => e.id || e.className), askInputs: document.querySelectorAll('.is-ask.osa-in,#f-w,#f-e,#f-u,#f-d,#f-s,#f-t,#f-h,#f-f,#f-o').length, reset: !!document.getElementById('b-reset') }));
    const hidA = await reallyHidden(p, ['#f-w', '#f-h', '#b-reset', '#b-link', '#delta']);
    ck(w + ' recipient view rendered: composer controls and delta not rendered, not in a11y tree', hidA.ok, hidA);
    ck(w + ' recipient DOM (not just CSS): the ask has no editor inputs and no composer Start over; nothing editable before a choice', domA.askInputs === 0 && !domA.reset && domA.editable.length === 0, domA);
    // D7: reply privacy once on all three answer views; "Not this time" has no note field
    const views = {}; for (const c of ['y', 'p', 'n']) { await p.click('#c-' + c); await sleep(80); views[c] = await p.evaluate(P => ({ n: [...document.querySelectorAll('.osa-fine')].filter(e => e.textContent === P).length, note: !!document.getElementById('f-note') }), C.replyPrivacy); }
    ck(w + ' D7: replyPrivacy shown once on Yes / Part of it / Not this time; no note field on Not this time', views.y.n === 1 && views.p.n === 1 && views.n.n === 1 && views.y.note && views.p.note && !views.n.note, views);
    // recipient Start over: clears own unsent reply, keeps ask + hash
    await p.click('#c-y'); await sleep(50); await typeInto(p, '#f-note', 'Happy to'); await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.focus('#b-rlink'); await p.keyboard.press('Enter'); await sleep(120);
    let dlgMsg = ''; const onD = d => { dlgMsg = d.message(); }; p.on('dialog', onD); const before = await p.evaluate(() => location.hash); await p.focus('#b-rreset'); await p.keyboard.press('Enter'); await sleep(150);
    let t = await p.evaluate(() => ({ hash: location.hash, checked: [...document.querySelectorAll('[role=radio]')].filter(b => b.getAttribute('aria-checked') === 'true').length, note: !!document.getElementById('f-note'), link: document.getElementById('link').value, lb: document.getElementById('linkbox').hidden, title: document.getElementById('title').textContent, toast: document.getElementById('toast').textContent }));
    p.off('dialog', onD); ck(w + ' recipient Start over confirm uses Writer replyResetConfirm exactly', dlgMsg === 'Clear your reply? The ask stays as it is.', dlgMsg);
    ck(w + ' recipient Start over: own reply cleared (choice, note, link box value), ask and its link kept', t.hash === before && /^#a1\./.test(t.hash) && !t.checked && !t.note && t.link === '' && t.lb && t.title.startsWith('Small ask from:') && t.toast === C.resetDone, t);
    // reply link from "Not this time" holds no note
    await p.click('#c-n'); await sleep(50); await p.focus('#b-rlink'); await p.keyboard.press('Enter'); await sleep(120); const rl = await p.$eval('#link', e => e.value);
    const nd = await p.evaluate(u => ASK.decode(u.split('#')[1]), rl); ck(w + ' "Not this time" reply link carries an empty note', nd.ok && nd.data.v === 'n' && nd.data.n === '', nd);
    await p.goto(BASE + '#' + L.part, { waitUntil: 'load' }); await sleep(150);
    const domR = await p.evaluate(() => ({ editable: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].filter(e => !e.disabled && !e.readOnly).map(e => e.id || e.className), btns: [...document.querySelectorAll('button')].map(b => b.id) }));
    ck(w + ' requester reading a reply: no editable inputs in the DOM; only Ask again / Ask someone else', domR.editable.length === 0 && !domR.btns.includes('b-reset') && !domR.btns.includes('b-rreset'), domR);
    // line breaks: favor shows up to 3 breaks (pre-line), copy text matches
    await p.goto(BASE + '#' + L.ask2, { waitUntil: 'load' }); await sleep(150);
    t = await p.evaluate(() => { const q = document.querySelector('.osa-term .ask .osa-qtext'); return { txt: q.textContent, ws: getComputedStyle(q).whiteSpace, lines: q.getClientRects().length, h: q.getBoundingClientRect().height, lh: parseFloat(getComputedStyle(q).lineHeight) }; });
    ck(w + ' favor keeps 3 line breaks (4th line collects the rest), shown with pre-line', t.txt === '“Line one\nLine two\nLine three\nLine four Line five”' && t.ws === 'pre-line' && t.h >= 3.5 * t.lh, t);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(100); await p.goto(BASE + '#', { waitUntil: 'load' }); await sleep(100);
    // composer: where hint, 140 cap, D6 link value cleared on Start over
    const hint = await p.evaluate(() => ({ t: (document.getElementById('h-h') || {}).textContent, d: document.getElementById('f-h').getAttribute('aria-describedby') }));
    ck(w + ' D9: whereHint under the Where field, wired to it', hint.t === C.whereHint && hint.d === 'h-h', hint);
    await typeInto(p, '#f-w', 'x'.repeat(141)); await p.focus('#f-e'); await sleep(60); const e141 = await p.$eval('#e-w', e => e.textContent);
    await typeInto(p, '#f-w', 'Line A'); await p.keyboard.down('Shift'); await p.keyboard.press('Enter'); await p.keyboard.up('Shift'); await p.keyboard.type('Line B'); await typeInto(p, '#f-e', '20'); await typeInto(p, '#f-d', 'Tue'); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM'); await typeInto(p, '#f-f', 'Dana'); await typeInto(p, '#f-o', 'Sam'); await sleep(60);
    const tx = await p.$eval('#text', e => e.textContent);
    ck(w + ' composer: 141 characters refused (cap 140); typed line break kept in copy text', e141 === M.plural(C.actionTooLong, 1) && tx.includes('The favor, as typed: “Line A\nLine B”\n'), { e141, tx });
    await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(120); const had = await p.$eval('#link', e => e.value);
    await p.focus('#b-reset'); await p.keyboard.press('Enter'); await sleep(150); const after = await p.$eval('#link', e => e.value);
    ck(w + ' D6: Start over empties the hidden link box', /#a1\./.test(had) && after === '', { had: had.length, after });
    ck(w + ' QA-fix checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-58436b3 N1 (same tab): fill -> Copy the ask link -> open it -> open a bad link: no stale validation errors
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const r = await sameTabBadLink(p, { errSel: '.osa-err', bad: 'a1.broken',
      fill: async p => { await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(80); await typeInto(p, '#f-w', 'Confirm your account by replying yes'); await typeInto(p, '#f-e', '20'); await typeInto(p, '#f-d', 'Tue Oct 20'); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM'); await typeInto(p, '#f-h', 'Verified ✔ Bank branch'); await typeInto(p, '#f-f', 'Verified ✔ Bank'); await typeInto(p, '#f-o', 'Sam'); },
      link: async p => { await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(200); return p.$eval('#link', e => e.value); } });
    ck(w + ' N1 same tab: bad link after fill + link + open shows zero validation errors (none rendered, nothing aria-invalid)', r.ok, r);
    // D8 + N2: typed name quoted in the headline + card header, typed-by note; copy-as-text quotes from/favor/Re:
    const t0 = await p.evaluate(() => 1); await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(120);
    await typeInto(p, '#f-w', 'Confirm your account by replying yes'); await typeInto(p, '#f-e', '20'); await typeInto(p, '#f-d', 'Tue Oct 20'); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM'); await typeInto(p, '#f-h', 'Verified ✔ Bank branch'); await typeInto(p, '#f-f', 'Verified ✔ Bank'); await typeInto(p, '#f-o', 'Sam');
    const sTxt = await p.$eval('#text', e => e.textContent); await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(200); const url = await p.$eval('#link', e => e.value);
    await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(200);
    const rv = await p.evaluate(() => ({ h1: document.getElementById('title').textContent, lede: document.getElementById('lede').textContent, once: document.body.innerText.split('Names and the favor are as typed by the sender. Not checked.').length - 1, heads: [...document.querySelectorAll('.osa-heads b')].map(e => e.textContent) }));
    ck(w + ' D8 recipient: headline + card header quote the typed name; typed-by-sender note shown', rv.h1 === 'Small ask from: “Verified ✔ Bank”' && rv.lede === 'Names and the favor are as typed by the sender. Not checked.' && rv.once === 1 && rv.heads[0] === '“Verified ✔ Bank”', rv);
    ck(w + ' N2 sender copy-as-text: from-name, favor and Where quoted', sTxt.startsWith('From: “Verified ✔ Bank”\nThe favor, as typed: “Confirm your account by replying yes”\n') && sTxt.includes('Where: “Verified ✔ Bank branch”\n'), sTxt);
    await s.b.close(); }
  // QA local-652d0e0 Ask N3: typed text quoted in the strikethrough, CHANGED values, aria summaries, delta and note row;
  // receiverTypedNote on reply views; a hash change with focus in the favor field blurs first and clears errors after.
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const ASKD = { w: 'Zqx favor', e: 20, u: 'min', d: 'Zqx Tue', s: '16:00', t: '18:00', h: 'Zqx porch', f: 'Zqx Dana', o: 'Zqx Sam' };
    const L = await p.evaluate(a => ({ ask: ASK.encodeAsk(a), p: ASK.encodeReply({ a, v: 'p', p: { w: 'Zqx new', e: 20, u: 'min', d: 'Zqx Wed', s: '17:00', t: '18:00', h: 'Zqx gate' }, n: 'Zqx note' }), y: ASK.encodeReply({ a, v: 'y', p: null, n: 'Zqx yes note' }), n: ASK.encodeReply({ a, v: 'n', p: null, n: '' }) }), ASKD);
    const SEEDS = ['Zqx favor', 'Zqx porch', 'Zqx Dana', 'Zqx Sam', 'Zqx new', 'Zqx gate', 'Zqx note', 'Zqx yes note', 'Zqx Tue', 'Zqx Wed']; // N5: typed Day values are seeds too
    for (const v of ['p', 'y', 'n']) {
      await p.goto('about:blank'); await p.goto(BASE + '#' + L[v], { waitUntil: 'load' }); await sleep(200);
      const r = await p.evaluate(() => ({ lede: document.getElementById('lede').hidden ? null : document.getElementById('lede').textContent, body: document.body.innerText, struck: [...document.querySelectorAll('.osa-term.is-changed .ask s')].map(e => e.textContent), now: [...document.querySelectorAll('.osa-term.is-changed .ans')].map(e => e.firstChild.textContent), sr: [...document.querySelectorAll('.osa-term.is-changed .osa-vh')].map(e => e.textContent), delta: document.getElementById('delta').hidden ? '' : document.getElementById('delta').textContent, text: (e => e.value != null ? e.value : e.textContent)(document.getElementById('text')) }));
      const outTx = await p.evaluate(() => { const t = document.getElementById('text'); return t ? t.innerText : ''; }); const once = r.body.split('Your ask is as you sent it. Their reply is as they typed it. Not checked.').length - 1 - (outTx.split(C.replyTypedNote).length - 1); // the copy-text box carries its own copy (PM)
      await p.emulateMediaType('print'); const pb = await p.evaluate(() => document.body.innerText); await p.emulateMediaType(null); const ptx = await (async () => { await p.emulateMediaType('print'); const v = await p.evaluate(() => { const t = document.getElementById('text'); return t && t.getClientRects().length ? t.innerText : ''; }); await p.emulateMediaType(null); return v; })(); const ponce = pb.split(C.replyTypedNote).length - 1 - (ptx.split(C.replyTypedNote).length - 1);
      ck(w + ' Writer N4 reply view (' + v + '): replyTypedNote (verbatim) shown once on screen and once in print; receiverTypedNote nowhere (screen, print, copied text)', r.lede === 'Your ask is as you sent it. Their reply is as they typed it. Not checked.' && once === 1 && ponce === 1 && !r.body.includes(C.receiverTypedNote) && !pb.includes(C.receiverTypedNote) && !r.text.includes(C.receiverTypedNote), { lede: r.lede, once, ponce });
      if (v === 'p') ck(w + ' N3 reply (part): strikethrough, CHANGED values, aria summaries and delta quote the typed favor and Where', r.struck.some(x => x.includes('“Zqx favor”')) && r.struck.some(x => x.includes('“Zqx porch”')) && r.now.includes('“Zqx new”') && r.now.includes('“Zqx gate”') && r.sr.some(x => x.endsWith(': was “Zqx favor”, now “Zqx new”.')) && r.sr.some(x => x.endsWith(': was “Zqx porch”, now “Zqx gate”.')) && r.delta.includes('“Zqx favor”') && r.delta.includes('“Zqx new”') && r.body.includes('“Zqx note”'), r);
      if (v === 'y') ck(w + ' N3 reply (yes): the note row is quoted typed text', r.body.includes('“Zqx yes note”'), r.body.slice(0, 600));
      const a = await typedAudit(p, SEEDS, { copied: r.text, print: pb }); ck(w + ' N3/N5 reply (' + v + '): typedAudit (screen, aria, describedby, live, toast, print, copied text) finds nothing unquoted incl. the typed Day', a.ok, a);
      ck(w + ' PM: reply (' + v + ') copy-as-text ends with replyTypedNote, verbatim and once', r.text.endsWith('\n' + C.replyTypedNote) && r.text.split(C.replyTypedNote).length === 2 && !r.text.includes(C.receiverTypedNote), r.text);
      if (v !== 'n') ck(w + ' N5 reply (' + v + '): the Day shows as “Zqx Tue” on screen, in print and in copied text', r.body.includes('“Zqx Tue”, 4 PM–6 PM') && pb.includes('“Zqx Tue”') && r.text.includes('“Zqx Tue”'), r.text);
    }
    // answer view, part mode: rows marked changed in place keep the quotes
    await p.goto('about:blank'); await p.goto(BASE + '#' + L.ask, { waitUntil: 'load' }); await sleep(200); { const ld = await p.evaluate(() => document.getElementById('lede').textContent); ck(w + ' Writer N4: the answer view keeps receiverTypedNote', ld === C.receiverTypedNote, ld); }
    await p.click('#c-p'); await sleep(100);
    { const r0 = await p.evaluate(() => [...document.querySelectorAll('#x .osa-term .ask')].map(e => e.textContent)); const a0 = await typedAudit(p, SEEDS);
      ck(w + ' F-A1 answer (Part of it, before any edit): the ask column quotes the typed favor and Where; typedAudit clean', r0.some(x => x.includes('“Zqx favor”')) && r0.some(x => x.includes('“Zqx porch”')) && !r0.some(x => /(^|[^“])Zqx (favor|porch)/.test(x)) && a0.ok, { r0, a0 }); }
    await typeInto(p, '#o-w', 'Zqx new'); await sleep(100);
    let r = await p.evaluate(() => ({ struck: [...document.querySelectorAll('.osa-term .ask s')].map(e => e.textContent), same: [...document.querySelectorAll('.osa-term.is-same[data-key=where] .ask')].map(e => e.textContent) }));
    ck(w + ' N3 answer (part): the struck original favor is quoted; unchanged Where stays quoted', r.struck.includes('“Zqx favor”') && r.same.some(x => x.includes('“Zqx porch”')), r);
    await typeInto(p, '#o-d', 'Zqx Wed'); await sleep(100);
    let a = await typedAudit(p, SEEDS, { copied: await p.$eval('#text', e => e.textContent) }); ck(w + ' N3/N5 answer (part): typedAudit finds nothing unquoted (Day struck and in the copy text included)', a.ok, a);
    { const tx = await p.$eval('#text', e => e.textContent); ck(w + ' PM: answer view copy-as-text ends with receiverTypedNote, verbatim and once; Day quoted', tx.endsWith('\n' + C.receiverTypedNote) && tx.split(C.receiverTypedNote).length === 2 && !tx.includes(C.replyTypedNote) && tx.includes('(asked: “Zqx Tue”, 4 PM–6 PM)'), tx); }
    // hash change with focus in the favor field: blur first, clear errors after
    for (const [nm, frag] of [['valid ask', L.ask], ['bad link', 'a1.broken'], ['empty', '']]) {
      await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await typeInto(p, '#f-w', 'x'); await p.focus('#f-w'); await p.keyboard.press('Backspace'); await sleep(50);
      if (!frag) { await p.evaluate(f => { location.hash = 'a1.broken'; }); await sleep(150); await p.focus('#f-w'); }
      await p.evaluate(f => { location.hash = f; }, frag); await sleep(250);
      r = await p.evaluate(() => ({ errs: [...document.querySelectorAll('.osa-err')].map(e => e.textContent).filter(Boolean), invalid: document.querySelectorAll('[aria-invalid=true]').length, focus: document.activeElement.id }));
      ck(w + ' N3 hash change (' + nm + ') with focus in the favor field: zero errors, nothing aria-invalid', !r.errs.length && !r.invalid, r);
    }
    ck(w + ' N3 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-71ba769 N5 (QA's exact case: spoof Day) + N6 (compose card headers on screen, in the AX tree and in print)
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const DAY = 'Verified by \u201CYour bank\u201D', NF = '\u00ABVerified\u00BB Bank', NO = 'Sam \u00ABS\u00BB';
    await typeInto(p, '#f-w', 'pickup'); await typeInto(p, '#f-e', '20'); await typeInto(p, '#f-d', DAY); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM'); await typeInto(p, '#f-f', NF); await typeInto(p, '#f-o', NO); await sleep(100);
    const heads = await p.evaluate(() => [...document.querySelectorAll('.osa-heads b')].map(e => [e.textContent, e.title]));
    const snap = await p.accessibility.snapshot({ interestingOnly: false }); const ax = []; (function wk(n) { if (!n) return; if (n.name) ax.push(String(n.name)); (n.children || []).forEach(wk); })(snap);
    await p.emulateMediaType('print'); const pr = await p.evaluate(() => document.body.innerText); await p.emulateMediaType(null);
    const qf = '\u201C"Verified" Bank\u201D', qo = '\u201CSam "S"\u201D';
    ck(w + ' N6 compose: card headers quote From/To (screen + title), in the accessibility tree and in print', heads[0][0] === qf && heads[1][0] === qo && heads[0][1] === qf && heads[1][1] === qo && ax.includes(qf) && ax.includes(qo) && pr.includes(qf) && pr.includes(qo) && !pr.includes(NF), { heads, pr: pr.slice(0, 300) });
    const ctext = await p.$eval('#text', e => e.textContent); const a0 = await typedAudit(p, [DAY, NF, NO], { copied: ctext, print: pr }); ck(w + ' N5/N6 compose: typedAudit (Day + names, incl. copy text and print) clean', a0.ok, a0.hits);
    const L = await p.evaluate((d) => { const a = { w: 'pickup', e: 20, u: 'min', d, s: '16:00', t: '18:00', h: '', f: 'Jo', o: 'Sam' }; return { ask: ASK.encodeAsk(a), p: ASK.encodeReply({ a, v: 'p', p: { w: 'pickup', e: 20, u: 'min', d: 'Call 555-0100 first', s: '16:00', t: '18:00', h: '' }, n: '' }) }; }, DAY);
    await p.evaluateOnNewDocument(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    for (const [tag, frag, prep] of [['recipient ask', L.ask, null], ['recipient part (Day edited)', L.ask, async () => { await p.click('#c-p'); await sleep(80); await typeInto(p, '#o-d', 'Call 555-0100 first'); await sleep(80); }], ['reply part', L.p, null]]) {
      await p.goto('about:blank'); await p.goto(BASE + '#' + frag, { waitUntil: 'load' }); await sleep(200); if (prep) await prep();
      for (const b of ['#b-text', '#b-rtext']) { if (await p.evaluate(sel => { const e = document.querySelector(sel); return !!(e && !e.disabled && e.getClientRects().length); }, b)) { await p.click(b); await sleep(100); } }
      await p.emulateMediaType('print'); const pb = await p.evaluate(() => document.body.innerText); await p.emulateMediaType(null);
      const clip = await p.evaluate(() => window.__clip.slice()), tx = await p.$eval('#text', e => e.textContent);
      const a = await typedAudit(p, [DAY, 'Call 555-0100 first'], Object.assign({ copied: tx, print: pb }, Object.fromEntries(clip.map((c, i) => ['clipboard#' + i, c]))));
      ck(w + ' N5 ' + tag + ': the typed Day is quoted with Q1 neutralising everywhere (When row, Part column, delta, aria, print, copy text, clipboard)', a.ok, a.hits); }
    ck(w + ' N5/N6 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // PM 03:48 (audit 04:00): the WHOLE received URL is capped at 2,000 with the shared MILLVIEW.linkFor before decode (as in Sack, Even Up, Care Rota).
  // Normal path /mill/one-small-ask/ under a long *.localhost origin (Chrome resolves *.localhost to this server; hostnames up to 253) and a long path (throwaway
  // server, nested dirs + symlink to this tree): 1999 and 2000 open; 2001 and 2040 show this piece's bad-link message and nothing received.
  { const fsx = require('fs'), osx = require('os'), pathx = require('path'), { spawn } = require('child_process'), REPO = pathx.resolve(__dirname, '../..');
    const X = require('../../mill/one-small-ask/ask.js'), CX = require('vm').runInNewContext(fsx.readFileSync(__dirname + '/../../mill/one-small-ask/copy.js', 'utf8') + ';COPY');
    const MARK = 'Zqxd7', em = '\u{1F600}', E = (k, ch) => ch.repeat(k);
    const pickF = (gen, lo, hi) => { for (let k = 0; k < 400; k++) { const f = gen(k); if (f && f.length >= lo && f.length <= hi) return f; } return null; };
    const BIG = pickF(k => X.encodeReply({ a: { w: MARK + ' water the plants ' + E(100, em), e: 20, u: 'min', d: E(40, em), s: '16:00', t: '18:00', h: E(80, em), f: E(24, em), o: E(24, em) }, v: 'y', p: null, n: E(Math.min(k, 120), em) }), 1760, 1960), SMALL = X.encodeAsk({ w: MARK + ' water the plants', e: 20, u: 'min', d: 'Tue Oct 20', s: '16:00', t: '18:00', h: '', f: 'Ana', o: 'Sam' });
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    const openAt = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300);
      return p.evaluate((MARK, bad) => { const t = document.body.innerText; return { len: location.href.length, opened: t.includes(MARK) && !t.includes(bad), bad: t.includes(bad) && !t.includes(MARK) }; }, MARK, CX.badLink); };
    const port = H.includes(':') ? ':' + H.split(':').pop() : '', PATH = '/mill/one-small-ask/', fixed = (SCHEME + '://').length + port.length + PATH.length + 1 + BIG.length;
    const hostOf = n => { const labels = []; let left = n - 10; while (left > 0) { const k = Math.min(63, left > 63 ? left - 1 : left); labels.push('a'.repeat(k)); left -= k + 1; } const h = labels.join('.') + '.localhost'; if (h.length !== n) throw new Error('host ' + h.length + ' != ' + n); return h; };
    const normal = {}, maxN = fixed + 253;
    for (const want of [1999, 2000, 2001, 2040]) { const total = Math.min(want, maxN); const r = await openAt(SCHEME + '://' + hostOf(total - fixed) + port + PATH + '#' + BIG); r.want = want; normal[want] = r; }
    const root = fsx.mkdtempSync(osx.tmpdir() + '/d7-one-small-ask-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] }); const long = {};
    try { const lport = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
      const ORIGIN = 'http://127.0.0.1:' + lport; let tag = 0;
      const pathOf = total => { let left = total - 1 - PATH.length; const segs = []; tag++;
        while (left > 0) { let k = left > 200 ? (left === 201 ? 199 : 200) : left; left -= k; if (left) left -= 1; segs.push(segs.length ? 'a'.repeat(k) : ('t' + tag + '_' + 'a'.repeat(k)).slice(0, k)); }
        let dir = root; segs.slice(0, -1).forEach(x => { dir = pathx.join(dir, x); fsx.mkdirSync(dir, { recursive: true }); }); fsx.symlinkSync(REPO, pathx.join(dir, segs[segs.length - 1]));
        const P = '/' + segs.join('/') + PATH; if (P.length !== total) throw new Error('path ' + P.length + ' != ' + total); return P; };
      for (const total of [1999, 2000, 2001, 2040]) long[total] = await openAt(ORIGIN + pathOf(total - ORIGIN.length - 1 - SMALL.length) + '#' + SMALL);
    } finally { srv.kill(); }
    const over = Object.values(normal).filter(r => r.len > 2000);
    ck('whole-URL receive cap, normal path (fragment ' + BIG.length + ', long origin): 1999 and 2000 open; over 2,000 (2001, ' + (maxN >= 2040 ? '2040' : maxN + ' = longest reachable with a 253-char host') + ') -> bad-link message, nothing received',
      normal[1999].len === 1999 && normal[1999].opened && normal[2000].len === 2000 && normal[2000].opened && normal[2001].len === 2001 && over.length >= 2 && over.every(r => r.bad && !r.opened) && (maxN >= 2040 ? normal[2040].len === 2040 : normal[2040].len === maxN), normal);
    ck('whole-URL receive cap, long path (fragment ' + SMALL.length + '): 1999 and 2000 open; 2001 and 2040 -> bad-link message, nothing received',
      [1999, 2000].every(t => long[t].len === t && long[t].opened) && [2001, 2040].every(t => long[t].len === t && long[t].bad && !long[t].opened), long);
    ck('whole-URL receive cap: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // PM 04:30 query-string ruling: the 2,000 cap covers origin + path + '#' + fragment and an appended ?query is ignored. Links this piece generates carry
  // no '?'; a received link with ?q=<marker> appended (normal path, and a 2,002-char total on a long path = 2,002 minus the query without it) opens, and the
  // marker appears nowhere: page text, markup/accessible names, field values, copied/shared/printed text, or any link generated onward.
  { const fsq = require('fs'), osq = require('os'), pathq = require('path'), { spawn: spawnq } = require('child_process'), REPOQ = pathq.resolve(__dirname, '../..');
    const QM = 'Qzmk7x', QQ = '?q=' + QM, PATHQ = '/mill/one-small-ask/';
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
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); const fq = await p.evaluate(() => ASK.encodeAsk({ w: 'Zqv water the plants', e: 20, u: 'min', d: 'Tue Oct 20', s: '16:00', t: '18:00', h: '', f: 'Ana', o: 'Sam' }));
    const SEE = 'Zqv water', PRE = async p => { await p.evaluate(() => { const b = [...document.querySelectorAll('button,input[type=radio]')].find(b => /yes|i can/i.test(b.textContent + ' ' + (b.labels && b.labels[0] ? b.labels[0].textContent : ''))); if (b) b.click(); }); await sleep(200); }, STEPS = [], SEND = async p => { await typeInto(p, '#f-w', 'Zqv water the plants'); await typeInto(p, '#f-e', '20'); await typeInto(p, '#f-d', 'Tue Oct 20'); await p.focus('#f-s'); await p.keyboard.type('0400PM'); await p.focus('#f-t'); await p.keyboard.type('0600PM'); await typeInto(p, '#f-f', 'Ana'); await typeInto(p, '#f-o', 'Sam'); };
    const snd = await runQ(BASE + QQ, null, SEND, []), rcv = await runQ(BASE + QQ + '#' + fq, SEE, PRE, STEPS);
    const rootq = fsq.mkdtempSync(osq.tmpdir() + '/q-one-small-ask-'), srvq = spawnq('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', rootq], { stdio: ['ignore', 'pipe', 'pipe'] }); let l2002 = null;
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
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
