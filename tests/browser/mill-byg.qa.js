// node tests/browser/mill-byg.qa.js <host[:port]> <ip> [scheme] — Before You Go @320/390/1280 (ENGINEER SELF-CHECK)
// QA 83a2ebcd D1–D10 + PM 10:33 scope + Writer QA-83 strings (exact). Rendered visibility via reallyHidden (computed style/box + a11y tree).
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/before-you-go/copy.js', 'utf8') + ';COPY');
const M = require('../../mill/shared/core.js');
const BASE = `${SCHEME}://${H}/mill/before-you-go/`;
const setVal = (p, id, v) => p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
const state = p => p.evaluate(() => ({ ready: document.getElementById('ready').className, n: document.getElementById('ready-n').textContent, h: document.getElementById('ready-h').textContent, s: document.getElementById('ready-s').textContent,
  chips: Object.fromEntries([...document.querySelectorAll('.byg-fact')].map(e => [e.querySelector('[id^=ok-]').id.slice(3), e.querySelector('.byg-chip').textContent])),
  by: Object.fromEntries([...document.querySelectorAll('.byg-fact')].map(e => [e.querySelector('[id^=ok-]').id.slice(3), e.querySelector('.byg-by').textContent + (e.querySelector('.byg-nsl').textContent ? '|' + e.querySelector('.byg-nsl').textContent : '')])),
  qs: [...document.querySelectorAll('#script li .t')].map(e => e.textContent), text: document.getElementById('text').value,
  call: document.getElementById('call').getClientRects().length > 0, sms: document.getElementById('sms').getClientRects().length > 0, callTxt: document.getElementById('call').textContent, href: document.getElementById('call').getAttribute('href') }));
const toastOf = p => p.$eval('#toast', e => e.textContent);
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    const s = await session(H, IP); const { p, b } = s; await p.setViewport({ width: w, height: 800 });
    await p.evaluate(() => {}); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    let t = await state(p);
    ck(w + ' empty: amber, all 5 essentials open and named, 5 Unknown, 5 generic questions, no call button', t.ready === 'byg-ready is-open' && t.n === '5' && t.h === 'Not set: 5 essentials still open' && t.s === 'Still open: Place, When, Contact, Instructions, Bring.' && ['place', 'window', 'contact', 'instructions', 'bring'].every(k => t.chips[k] === 'Unknown') && t.qs.length === 5 && !t.call, t);
    const ph = await p.evaluate(() => ({ place: document.getElementById('f-place').placeholder, contact: document.getElementById('f-contact').placeholder, instructions: document.getElementById('f-instructions').placeholder, bring: document.getElementById('f-bring').placeholder, by: document.getElementById('by').placeholder, hints: [...document.querySelectorAll('.byg-hintline')].filter(e => e.textContent === COPY.privateDetailsHint && e.getClientRects().length).length, cnt: document.getElementById('c-place').textContent }));
    ck(w + ' D10: neutral placeholders (Writer), privateDetailsHint shown once, limit counter shown', ph.place === 'The pickup spot' && ph.contact === 'Who to ask' && ph.instructions === 'What to do when you get there' && ph.bring === 'What to bring' && ph.by === 'First name' && ph.hints === 1 && ph.cnt === '0/120' && !/\d{3}-\d{4}|Maria|Pine/.test(JSON.stringify(ph)), ph);
    const miss = await tabReach(p, ['pickup', 'f-place', 'a-place', 'ok-place', 'ns-place', 'f-window-d', 'f-window-t', 'f-contact', 'f-bring', 'f-id', 'own-in', 'own-add', 'by', 'b-link', 'b-share', 'b-text', 'b-print', 'b-reset']); ck(w + ' keyboard reach', !miss.length, miss);
    await typeInto(p, '#pickup', 'Used bike'); await typeInto(p, '#f-place', 'Corner of 5th and Main, by the blue mailbox'); await setVal(p, 'f-window-d', '2026-10-24'); await typeInto(p, '#f-contact', '412-555-0187');
    t = await state(p);
    ck(w + ' typed facts: chip "Your note · not confirmed", someSaidNote, still 5 open; date-specific question', t.chips.place === 'Your note · not confirmed' && t.chips.window === 'Your note · not confirmed' && t.n === '5' && t.s === 'Still open: Place, When, Contact, Instructions, Bring. 3 details are your notes, not confirmed.' && t.qs.includes('What time can I come on Sat Oct 24 2026?'), t);
    ck(w + ' call/text from a clear phone number, labelled with it', t.call && t.sms && t.callTxt === 'Call 412-555-0187' && t.href === 'tel:4125550187', t);
    for (const [v, want] of [['Listing #123456789 on Marketplace', false], ['Sat 2026-10-24', false], ['5550134 or 5550199', false], ['Text Maria, 555-0134', false], ['Room 101-2020', false], ['++15551234567', false], ['10-24-2026', false], ['12.30-14.00', false], ['2026/10/24', false], ['2026.1.2', false], ['2026-1-02', false], ['2026.10.24', false], ['2026-10-4', false], ['2026-1-15', false], ['555.0100', true], ['Gate code 555-1234', false], ['555-0134', true], ['(415) 555-0134', true]]) { await typeInto(p, '#f-contact', v); const x = await state(p); ck(w + ' D8 Call/Text for "' + v + '": ' + (want ? 'shown' : 'none'), x.call === want && x.sms === want && (want || (await reallyHidden(p, ['#call', '#sms'])).ok), x.callTxt); }
    await typeInto(p, '#f-contact', '412-555-0187');
    // time without date -> windowNeedsDate
    await setVal(p, 'f-window-d', ''); await setVal(p, 'f-window-t', '14:00'); let we = await p.$eval('#e-window', e => e.textContent); await setVal(p, 'f-window-t', ''); await setVal(p, 'f-window-d', '2026-10-24');
    ck(w + ' When needs a real date (windowNeedsDate)', we === 'Add the date, not just a weekday or a time.', we);
    await p.focus('#ok-place'); await p.keyboard.press('Enter'); await sleep(50);
    t = await p.evaluate(() => ({ hint: document.getElementById('h-place').textContent, focus: document.activeElement.id }));
    ck(w + ' confirm refused without an answer', t.hint === 'Type their answer first.' && t.focus === 'a-place', t);
    await typeInto(p, '#a-place', 'Side gate, ring twice'); await p.keyboard.press('Enter'); await sleep(50);
    await typeInto(p, '#a-bring', 'Cash, $80'); await p.keyboard.press('Enter'); await sleep(50);
    await p.click('#ns-instructions'); await sleep(50);
    t = await state(p);
    ck(w + ' Not sure is its own state and never counts; 3 confirmed of 5 is not ready', t.chips.instructions === 'Not sure' && t.chips.place === 'Confirmed' && t.by.place === 'Confirmed by you' && t.n === '3' && t.ready.includes('is-open') && t.h !== C.allConfirmedHeading && !t.text.includes(C.allConfirmedHeading), t);
    await typeInto(p, '#own-in', 'Is the lock included?'); await p.keyboard.press('Enter'); await sleep(50);
    // D9 limits
    await typeInto(p, '#pickup', 'x'.repeat(61)); let pe = await p.$eval('#pickup-e', e => e.textContent); await typeInto(p, '#pickup', 'Used bike');
    await typeInto(p, '#by', 'Christopher-Montgomery-Jo'); const be = await p.$eval('#by-e', e => e.textContent);
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(150); const tl = await toastOf(p); const focus = await p.evaluate(() => document.activeElement.id); const kept = await p.$eval('#f-place', e => e.value);
    ck(w + ' D9: over-limit fields say "Up to {max} characters. {n} over."; Copy link names the field (tooLongToShare); nothing cleared; never "Something broke"', pe === 'Up to 60 characters. 1 over.' && be === 'Up to 24 characters. 1 over.' && tl === 'Too long for a link: Your name (optional). Shorten it and try again. Nothing was cleared.' && focus === 'by' && kept.startsWith('Corner') && !/Something broke/.test(tl + pe + be), { pe, be, tl, focus });
    await typeInto(p, '#by', 'Jo');
    for (const q of ['Q2?', 'Q3?', 'Q4?', 'Q5?', 'Q6?']) { await typeInto(p, '#own-in', q); await p.keyboard.press('Enter'); await sleep(30); }
    const oe = await p.$eval('#own-e', e => e.textContent); const nq = await p.evaluate(() => [...document.querySelectorAll('#script li .t')].filter(e => /^“Q\d\?”$|lock/.test(e.textContent)).length);
    ck(w + ' 6th own question: ownLimitReached, 5 kept', oe === 'Up to 5 questions.' && nq === 5, { oe, nq });
    for (let i = 0; i < 4; i++) { await p.evaluate(() => [...document.querySelectorAll('#script .byg-rm')].pop().click()); await sleep(20); }
    t = await state(p);
    ck(w + ' copy text: Writer templates exactly', t.text.split('\n').slice(0, 13).join('\n') === ['Pickup notes for “Used bike”', 'Notes by: “Jo”', '', 'Not set: 3 essentials still open. Still open: When, Contact, Instructions.', '', 'Place: “Corner of 5th and Main, by the blue mailbox” · Confirmed', 'Answer: “Side gate, ring twice”', 'When: “Sat Oct 24 2026” · Your note, not confirmed', 'Contact: “412-555-0187” · Your note, not confirmed', 'Instructions: Not sure', 'Bring: “Cash, $80” · Confirmed', '', 'Ask before you go:'].join('\n') && t.text.includes('• “Is the lock included?”') && t.text.endsWith(C.textFooter), t.text);
    // link -> recipient
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(250);
    const url = await p.$eval('#link', e => e.value); ck(w + ' link made (#b2), <= 2000 chars, address bar untouched', /#b2\./.test(url) && url.length <= 2000 && (await p.evaluate(() => location.hash)) === '', url.length);
    const q = await b.newPage(); q.setDefaultTimeout(15000); q.on('dialog', d => d.accept().catch(() => {})); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e)));
    await q.goto(url, { waitUntil: 'load' }); await sleep(250);
    t = await state(q);
    const rb = await q.evaluate(() => ({ t: document.getElementById('banner-t').textContent, y: document.getElementById('banner-y').textContent, n: document.getElementById('banner-n').textContent, name: (document.querySelector('.byg-fact .byg-by .byg-typed') || {}).textContent, callnote: document.getElementById('callnote').getClientRects().length ? document.getElementById('callnote').textContent : null, all: document.body.innerText }));
    ck(w + ' D3 recipient: sender\'s facts credited to the sender (saidSender / confirmedBy with name node), never "Your note" or "Confirmed by you"', t.chips.place === 'Confirmed' && t.by.place === 'Marked confirmed by the sender: “Jo”' && rb.name === '“Jo”' && t.chips.contact === "Sender's note · not confirmed" && t.chips.window === "Sender's note · not confirmed" && t.chips.instructions === 'Not sure' && t.by.instructions === '|Marked not sure by the sender: “Jo”' && !/Your note|Confirmed by you|You said/i.test(rb.all), { chips: t.chips, by: t.by });
    ck(w + ' D4 recipient: intro quotes the pickup; typedBySenderMarker under the intro and beside Contact/Call', rb.t === 'Pickup notes for “Used bike”' && rb.y === 'Typed by the sender. Not checked.' && rb.callnote === 'Typed by the sender. Not checked.' && t.call, rb);
    ck(w + ' recipient readiness note uses someSaidNoteSender', t.s === "Still open: When, Contact, Instructions. 2 details are the sender's notes, not confirmed.", t.s);
    const dom = await q.evaluate(() => ({ editable: [...document.querySelectorAll('input,textarea,select')].filter(e => !e.disabled && !e.readOnly).map(e => e.id), destructive: [...document.querySelectorAll('#b-reset,#b-link,#b-share,[id^=ok-],[id^=un-],[id^=ns-],#own-add,.byg-rm')].filter(e => !e.disabled).map(e => e.id || e.className) }));
    const hid = await reallyHidden(q, ['#f-place', '#a-place', '#ok-place', '#un-place', '#pickup', '#by', '#own-in', '#b-reset', '#b-link', '#b-share', '#ns-place']);
    ck(w + ' recipient view is read-only in the DOM (no editable inputs, no enabled destructive/edit buttons) and those controls are not rendered or in the a11y tree', !dom.editable.length && !dom.destructive.length && hid.ok, { dom, hid: hid.ok ? 'ok' : hid });
    const lines = await q.evaluate(() => [...document.querySelectorAll('.byg-line')].filter(e => e.getClientRects().length).map(e => ({ t: e.textContent, clip: e.scrollWidth > e.clientWidth + 1 })));
    ck(w + ' D7 recipient: unconfirmed values are full wrapping text ("As typed:" + quotes), nothing clipped', lines.some(l => l.t === 'As typed: “Sat Oct 24 2026”') && lines.some(l => l.t === 'As typed: “412-555-0187”') && lines.every(l => !l.clip), lines);
    await q.emulateMediaType('print'); const pv = await q.evaluate(() => ({ lines: [...document.querySelectorAll('.byg-line')].filter(e => e.getClientRects().length).map(e => e.textContent), qs: [...document.querySelectorAll('#printq li')].filter(e => e.getClientRects().length).map(e => e.textContent), qh: document.getElementById('printq-h').getClientRects().length > 0 })); await q.emulateMediaType(null);
    ck(w + ' D6 print: typed-but-unconfirmed values (labelled) and the Ask list incl. own question print', pv.lines.includes('As typed: “412-555-0187”') && pv.lines.includes('As typed: “Sat Oct 24 2026”') && pv.qh && pv.qs.some(x => x.startsWith('“Is the lock included?”')) && pv.qs.some(x => x.startsWith('Who do I contact')), pv);
    // Make my own copy: empty name; recipient confirms one fact -> only that fact is "by you"
    await q.click('#own-copy'); await sleep(100);
    const byv = await q.$eval('#by', e => e.value); await setVal(q, 'a-window-d', '2026-10-24'); await setVal(q, 'a-window-t', '15:00'); await q.click('#ok-window'); await sleep(80);
    t = await state(q);
    const own = await q.evaluate(() => ({ body: document.body.innerText, what: document.getElementById('what').textContent }));
    ck(w + ' N7 own copy: name field empty; every carried fact resets to "Your note · not confirmed" (nothing "Marked confirmed by the sender"); the recipient\'s own confirm is "Confirmed by you"', byv === '' && t.by.window === 'Confirmed by you' && t.by.place === '' && t.by.bring === '' && t.chips.place === 'Your note · not confirmed' && t.chips.bring === 'Your note · not confirmed' && t.chips.contact === 'Your note · not confirmed' && t.chips.instructions === 'Unknown' && !/by the sender|Sender's note/.test(own.body) && own.what === '“Used bike”', { by: t.by, chips: t.chips, what: own.what });
    ck(w + ' N7 own-copy export: carried facts are "Your note, not confirmed"; no sender credit; no "Notes by"', t.text.includes('When: “Sat Oct 24 2026” · Confirmed') && t.text.includes('Answer: “Sat Oct 24 2026, 3 PM”') && t.text.includes('Place: “Side gate, ring twice” · Your note, not confirmed') && t.text.includes('Contact: “412-555-0187” · Your note, not confirmed') && t.text.includes('Bring: “Cash, $80” · Your note, not confirmed') && !/confirmed by the sender|Sender's note|Notes by/i.test(t.text), t.text);
    // D1/D2 same tab: half-typed question + link box, then bad / old / empty links reset everything
    await typeInto(q, '#own-in', 'half typed'); await q.focus('#b-link'); await q.keyboard.press('Enter'); await sleep(150);
    const lb = await q.evaluate(() => !document.getElementById('linkbox').hidden && document.getElementById('link').value.length > 0);
    for (const [nm, h, want] of [['bad', url.split('#')[1].slice(0, 40), C.badLink], ['old', M.pack('b', 1, { k: 'Couch', y: 'Lee', f: { place: ['9 Elm', 'garage', 1] }, o: [] }), C.oldVersion], ['empty', '', null]]) {
      await q.evaluate(u => { location.hash = u; }, url.split('#')[1]); await sleep(150);
      await q.evaluate(h => { location.hash = h; }, h || '#'); await sleep(150);
      const x = await q.evaluate(() => ({ banner: document.getElementById('banner').hidden ? null : document.getElementById('banner-t').textContent, ok: document.querySelectorAll('.byg-fact.is-ok').length, typed: [...document.querySelectorAll('.byg-fact input')].filter(i => i.value).length, own: document.getElementById('own-in').value, link: document.getElementById('link').value, pk: document.getElementById('pickup').value, what: document.getElementById('what').textContent, q: document.querySelectorAll('#script li').length }));
      const hd = await reallyHidden(q, ['#call', '#sms', '#linkbox', '#callnote', '#banner-y']);
      ck(w + ' D1/D2 same tab → ' + nm + ' link: full reset (no old notes, no Call, no link box, no half-typed question)', lb && x.banner === want && !x.ok && !x.typed && x.own === '' && x.link === '' && x.pk === '' && x.what === C.emptyState && x.q === 5 && hd.ok, { x, hd: hd.ok || hd });
    }
    const of = await overflow(p), ofq = await overflow(q); ck(w + ' no overflow (owner, recipient)', of.sw <= of.w && !of.bad.length && ofq.sw <= ofq.w && !ofq.bad.length, { of, ofq });
    // reset clears UI + fragment
    await q.goto(url, { waitUntil: 'load' }); await sleep(100); await q.click('#own-copy'); await q.focus('#b-reset'); await q.keyboard.press('Enter'); await sleep(100);
    t = await q.evaluate(() => ({ h: location.hash, pk: document.getElementById('pickup').value, ok: document.querySelectorAll('.byg-fact.is-ok').length, ban: document.getElementById('banner').hidden, n: document.getElementById('ready-n').textContent, link: document.getElementById('link').value }));
    ck(w + ' reset clears UI, link box value and fragment', t.h === '' && t.pk === '' && !t.ok && t.ban && t.n === '5' && t.link === '', t);
    await p.reload({ waitUntil: 'load' }); t = await p.evaluate(() => ({ pk: document.getElementById('pickup').value, f: document.getElementById('f-place').value })); ck(w + ' reload keeps nothing', t.pk === '' && t.f === '', t);
    for (const [nm, pg] of [['owner', p], ['recipient', q]]) { const st = await storage(pg); ck(w + ' storage empty (' + nm + ')', !st.cookie && !st.ls.length && !st.ss.length && !(Array.isArray(st.idb) && st.idb.length) && !st.caches.length && !st.sw.length, st); }
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length && !qe.length, [errsOf(s, SCHEME), qe]);
    await b.close();
  }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await typeInto(p, '#pickup', 'Crib'); await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(300);
    const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value, s: document.activeElement.selectionEnd - document.activeElement.selectionStart }));
    ck('390 share cancel keeps link selectable', t.toast === 'Not sent. Your notes are still here.' && t.sel === 'link' && /#b2\./.test(t.link) && t.s > 10, t);
    // max-everything link built in the page (emoji + quotes) stays <= 2000 including the real origin
    const L = await p.evaluate(() => { const out = []; for (const ch of ['😀', '"', '中', 'z']) { const s = BYG.blank(), fill = cap => ch.repeat(Math.floor(cap / BYG.room(ch))); s.k = fill(60); s.by = fill(24); s.o = [1, 2, 3, 4, 5].map(() => fill(60)); for (const k of BYG.ALL) { if (k === 'window') { s.f.window.a = '2026-10-24 14:30'; s.f.window.c = true; continue; } s.f[k].a = fill(BYG.CAP[k]); s.f[k].c = true; } const f = BYG.encode(s); out.push(f ? (location.origin + location.pathname + '#' + f).length : -1); } return out; });
    ck('390 max-everything links (emoji, quotes, CJK, ASCII) open and full URL <= 2000', L.every(x => x > 0 && x <= 2000), L);
    ck('390 share-cancel/max-link no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  for (const w of [320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' });
    const g = await p.evaluate(() => { const s = BYG.blank(); s.k = 'Pneumonoultramicroscopic ' + 'x'.repeat(30); s.by = 'Pneumonoultramicroscopic'; for (const k of BYG.ALL) { if (k === 'window') { s.f.window.v = '2026-10-24 14:30'; continue; } s.f[k].v = '9'.repeat(BYG.CAP[k]); } s.f.place.a = 'A'.repeat(120); s.f.place.c = true; return BYG.encode(s); });
    await p.goto(BASE + '#' + g, { waitUntil: 'load' }); await sleep(150);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, wide: [...document.querySelectorAll('.byg-fact')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length, clip: [...document.querySelectorAll('.byg-line')].filter(e => e.getClientRects().length && e.scrollWidth > e.clientWidth + 1).length }));
    const ov = await textOverlap(p, '#kicker, #title, #what, #ready-h, #ready-s, .byg-chip, .byg-lab > span, .byg-lab > label, .byg-line, .byg-by');
    ck(w + ' long unbroken values on the recipient view: cards fit, full text wraps, no overlap', r.sw <= w && !r.wide && !r.clip && !ov.length, { r, ov }); await s.b.close(); }
  // QA local-652d0e0 N2–N9 regressions (N1 readOnly: tests/browser/mill-recipient-a11y.qa.js; N4 phone rule: the D8 loop above)
  for (const w of W) { const s = await session(H, IP); const { p, b } = s; await p.setViewport({ width: w, height: 900 });
    await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const cap = await p.evaluate(() => BYG.CAP.place);
    let r = await p.evaluate(() => { const c = document.getElementById('ac-place'), a = document.getElementById('a-place'); return { t: c.textContent, vis: c.getClientRects().length > 0, desc: a.getAttribute('aria-describedby') }; });
    ck(w + ' N6: the answer limit shows up front (before typing) and is announced with the answer field', r.t === '0/' + cap && r.vis && r.desc.split(' ').includes('ac-place'), r);
    const LONG = 'Zqx corner ' + 'behind the long brick building '.repeat(3);
    await typeInto(p, '#pickup', 'Zqx bike'); await typeInto(p, '#f-place', LONG.slice(0, cap)); await typeInto(p, '#own-in', 'Zqx lock?'); await p.keyboard.press('Enter'); await sleep(60);
    r = await p.evaluate(() => { const t = document.getElementById('f-place'); return { tag: t.tagName, sh: t.scrollHeight, ch: t.clientHeight, sw: document.documentElement.scrollWidth }; });
    ck(w + ' N8: facts are auto-growing textareas; the full text is visible (no inner scroll), no sideways scroll', r.tag === 'TEXTAREA' && r.sh <= r.ch + 2 && r.ch > 30 && r.sw <= w, r);
    await p.focus('#f-place'); await p.keyboard.press('Enter'); r = await p.$eval('#f-place', e => e.value.includes('\n')); ck(w + ' N8: Enter never adds a line break to a fact', !r, r);
    const SEEDS = ['Zqx bike', 'Zqx lock?'];
    let a = await typedAudit(p, SEEDS, { copied: await p.$eval('#text', e => e.value), print: await p.$eval('#printq', e => e.textContent) });
    ck(w + ' N2 own view: pickup and typed questions quoted on screen, in aria (Remove), print list and copied text', a.ok && (await p.$eval('#what', e => e.textContent)) === '“Zqx bike”', a);
    // N5: time without a date blocks Copy link, names why, focuses the date
    await setVal(p, 'f-window-t', '15:00'); await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(150);
    r = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, box: !document.getElementById('linkbox').hidden && !!document.getElementById('link').value, focus: document.activeElement.id, err: document.getElementById('e-window').textContent }));
    ck(w + ' N5: a time without a date blocks Copy link (windowNeedsDate), never drops the time silently', r.toast === C.windowNeedsDate && !r.box && r.focus === 'f-window-d' && r.err === C.windowNeedsDate, r);
    // N3: route reset clears the toast and its timer
    await p.evaluate(() => { location.hash = 'b2.broken'; }); await sleep(200);
    r = await p.evaluate(() => { const t = document.getElementById('toast'); return { text: t.textContent, hidden: t.hidden }; });
    ck(w + ' N3: a hash change clears the toast', r.text !== C.windowNeedsDate && (r.hidden || !r.text), r);
    // N9: print leaves out the empty date/time inputs
    await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await typeInto(p, '#pickup', 'Zqx bike'); await setVal(p, 'f-window-d', '2026-10-24'); await sleep(50);
    await p.emulateMediaType('print'); r = await p.evaluate(() => ['f-window-d', 'f-window-t', 'a-window-d', 'a-window-t'].map(id => document.getElementById(id).parentElement.getClientRects().length > 0)); const plv = await p.evaluate(() => { const l = document.getElementById('f-window-d').closest('.byg-fact').querySelector('.byg-line'); return l.getClientRects().length > 0; }); await p.emulateMediaType(null); r.push(!plv);
    const pl = await p.evaluate(() => { const l = document.getElementById('f-window-d').closest('.byg-fact').querySelector('.byg-line'); return l.textContent; });
    ck(w + ' N9 + N9b: print leaves out every date/time input (empty or filled); the filled date prints once, as the As typed line', r.every(x => x === false) && pl === 'As typed: “Sat Oct 24 2026”', { r, pl });
    // link -> recipient: N2 quoted; N7 own copy resets
    await typeInto(p, '#f-place', 'Zqx corner'); await typeInto(p, '#own-in', 'Zqx lock?'); await p.keyboard.press('Enter'); await setVal(p, 'f-window-t', '15:00'); await typeInto(p, '#a-bring', 'Cash'); await p.click('#ok-bring'); await typeInto(p, '#by', 'Jo'); await sleep(50);
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(200); const url = await p.$eval('#link', e => e.value);
    const q = await b.newPage(); await q.setViewport({ width: w, height: 900 }); await q.goto(url, { waitUntil: 'load' }); await sleep(250);
    a = await typedAudit(q, SEEDS.concat(['Zqx corner']), { copied: await q.$eval('#text', e => e.value), print: await q.$eval('#printq', e => e.textContent) });
    ck(w + ' N2 received: pickup, place and typed question quoted (screen, aria, print, copied text)', a.ok, a);
    await q.click('#own-copy'); await sleep(150);
    r = await q.evaluate(() => ({ what: document.getElementById('what').textContent, body: document.body.innerText, by: document.getElementById('by').value }));
    a = await typedAudit(q, SEEDS.concat(['Zqx corner']), { copied: await q.$eval('#text', e => e.value), print: await q.$eval('#printq', e => e.textContent) });
    ck(w + ' N2+N7 own copy: pickup stays quoted; nothing "confirmed by the sender"; the sender name is not carried', r.what === '“Zqx bike”' && !/by the sender|Sender's note/.test(r.body) && r.by === '' && a.ok, { r: { what: r.what, by: r.by }, a });
    ck(w + ' N2–N9 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await b.close(); }
  // QA local-92575f1 follow-ups: N8b pickup wraps in own copy, N10 aria plural, N13 own-copy footer (Writer verbatim)
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const f = await p.evaluate(() => { const st = BYG.blank(); st.k = 'Pneumonoultramicroscopic bike with a very long name for 60c'.slice(0, 60); st.by = 'Jo'; for (const k of ['place', 'window', 'contact', 'bring']) { st.f[k].a = k === 'window' ? '2026-10-24' : 'ok ' + k; st.f[k].c = true; } return { frag: BYG.encode(st), k: st.k }; });
    await p.goto('about:blank'); await p.goto(BASE + '#' + f.frag, { waitUntil: 'load' }); await sleep(200);
    let r = await p.evaluate(() => ({ aria: document.getElementById('ready').getAttribute('aria-label'), h: document.getElementById('ready-h').textContent, text: document.getElementById('text').value, foot: document.getElementById('foot').textContent }));
    ck(w + ' N10: readiness aria-label "1 essential still open" matches the heading', r.aria.startsWith('1 essential still open.') && r.h === 'Not set: 1 essential still open', r);
    ck(w + ' N13: the received view keeps its footers (textFooter in copied text, printFooter on the page)', r.text.endsWith('\n\n' + C.textFooter) && r.foot === C.printFooter && !r.text.includes(C.ownCopyFooter), { tail: r.text.slice(-120), foot: r.foot });
    await p.click('#own-copy'); await sleep(150);
    r = await p.evaluate(() => { const t = document.getElementById('pickup'); return { tag: t.tagName, v: t.value, sh: t.scrollHeight, ch: t.clientHeight, sw: t.scrollWidth, cw: t.clientWidth, dw: document.documentElement.scrollWidth, text: document.getElementById('text').value, foot: document.getElementById('foot').textContent }; });
    ck(w + ' N8b: own copy shows the full 60-character pickup (wrapping auto-grow textarea, no inner scroll, no sideways scroll)', r.tag === 'TEXTAREA' && r.v === f.k && r.sh <= r.ch + 2 && r.sw <= r.cw + 1 && r.dw <= w, r);
    ck(w + ' N13: own copy uses ownCopyFooter (Writer verbatim) in copied text and on the page, never "as typed by the sender"', r.text.endsWith('\n\nThese notes started from the link you opened, plus any changes you made.') && !r.text.includes('as typed by the sender') && r.foot.startsWith('These notes started from the link you opened, plus any changes you made.'), { tail: r.text.slice(-120), foot: r.foot });
    await p.emulateMediaType('print'); const pr = await p.evaluate(() => document.body.innerText); await p.emulateMediaType(null);
    ck(w + ' N13: own-copy print carries ownCopyFooter and not "as typed by the sender"', pr.includes(C.ownCopyFooter) && !pr.includes('as typed by the sender'), pr.slice(-300));
    await p.focus('#pickup'); await p.keyboard.press('End'); await p.keyboard.press('Enter'); r = await p.$eval('#pickup', e => e.value.includes('\n')); ck(w + ' N8b: Enter never adds a newline to the pickup', !r, r);
    await p.evaluate(() => { window.confirm = () => true; }); await p.click('#b-reset'); await sleep(150);
    r = await p.evaluate(() => ({ text: document.getElementById('text').value, foot: document.getElementById('foot').textContent }));
    ck(w + ' N13: after Start over (sender view) the footers are back to textFooter / printFooter', r.text.endsWith('\n\n' + C.textFooter) && r.foot === C.printFooter, r);
    ck(w + ' follow-ups no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA N1 (same tab, all pieces): fill -> Copy link -> open it -> open a bad link: no stale validation errors
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const r = await sameTabBadLink(p, { errSel: '.byg-err, #own-e, #own-e2, #pickup-e, #by-e', bad: 'b2.broken',
      fill: async p => { await typeInto(p, '#pickup', 'x'.repeat(61)); await typeInto(p, '#pickup', 'Used bike'); await typeInto(p, '#f-place', 'Corner of 5th and Main'); await typeInto(p, '#f-contact', 'Message Sam on Marketplace'); },
      link: async p => { await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.click('#b-link'); await sleep(200); return p.$eval('#link', e => e.value); } });
    ck(w + ' N1 same tab: bad link after fill + link + open shows zero validation errors', r.ok, r); await s.b.close(); }
  // PM 03:48 (audit 04:00): the WHOLE received URL is capped at 2,000 with the shared MILLVIEW.linkFor before decode (as in Sack, Even Up, Care Rota).
  // Normal path /mill/before-you-go/ under a long *.localhost origin (Chrome resolves *.localhost to this server; hostnames up to 253) and a long path (throwaway
  // server, nested dirs + symlink to this tree): 1999 and 2000 open; 2001 and 2040 show this piece's bad-link message and nothing received.
  { const fsx = require('fs'), osx = require('os'), pathx = require('path'), { spawn } = require('child_process'), REPO = pathx.resolve(__dirname, '../..');
    const X = require('../../mill/before-you-go/byg.js'), CX = require('vm').runInNewContext(fsx.readFileSync(__dirname + '/../../mill/before-you-go/copy.js', 'utf8') + ';COPY');
    const MARK = 'Zqxd7', em = '\u{1F600}', E = (k, ch) => ch.repeat(k);
    const pickF = (gen, lo, hi) => { for (let k = 0; k < 400; k++) { const f = gen(k); if (f && f.length >= lo && f.length <= hi) return f; } return null; };
    const BIG = (() => { const b = X.blank(); b.k = MARK + ' ' + E(Math.floor((X.CAP.pickup - 6) / 4), em); b.by = E(6, em); for (const key of X.ALL) { if (key === 'window') { b.f[key].v = '2026-10-20'; b.f[key].a = '2026-10-21 10:00'; continue; } const n = Math.floor(X.CAP[key] / 4); b.f[key].v = E(n, em); b.f[key].a = E(n, em); } b.o = [0, 1, 2, 3, 4].map(() => E(15, em)); return X.encode(b); })(), SMALL = (() => { const b = X.blank(); b.k = MARK + ' clinic'; b.by = 'Jo'; return X.encode(b); })();
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    const openAt = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300);
      return p.evaluate((MARK, bad) => { const t = document.body.innerText; return { len: location.href.length, opened: t.includes(MARK) && !t.includes(bad), bad: t.includes(bad) && !t.includes(MARK) }; }, MARK, CX.badLink); };
    const port = H.includes(':') ? ':' + H.split(':').pop() : '', PATH = '/mill/before-you-go/', fixed = (SCHEME + '://').length + port.length + PATH.length + 1 + BIG.length;
    const hostOf = n => { const labels = []; let left = n - 10; while (left > 0) { const k = Math.min(63, left > 63 ? left - 1 : left); labels.push('a'.repeat(k)); left -= k + 1; } const h = labels.join('.') + '.localhost'; if (h.length !== n) throw new Error('host ' + h.length + ' != ' + n); return h; };
    const normal = {}, maxN = fixed + 253;
    for (const want of [1999, 2000, 2001, 2040]) { const total = Math.min(want, maxN); const r = await openAt(SCHEME + '://' + hostOf(total - fixed) + port + PATH + '#' + BIG); r.want = want; normal[want] = r; }
    const root = fsx.mkdtempSync(osx.tmpdir() + '/d7-before-you-go-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] }); const long = {};
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
    const QM = 'Qzmk7x', QQ = '?q=' + QM, PATHQ = '/mill/before-you-go/';
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
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); const fq = await p.evaluate(() => { const b = BYG.blank(); b.k = 'Zqv clinic'; b.by = 'Jo'; return BYG.encode(b); });
    const SEE = 'Zqv clinic', PRE = null, STEPS = ['#own-copy', '#b-link'], SEND = null;
    const snd = await runQ(BASE + QQ, null, SEND, []), rcv = await runQ(BASE + QQ + '#' + fq, SEE, PRE, STEPS);
    const rootq = fsq.mkdtempSync(osq.tmpdir() + '/q-before-you-go-'), srvq = spawnq('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', rootq], { stdio: ['ignore', 'pipe', 'pipe'] }); let l2002 = null;
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
  // PM 04:57 query-strip (hardening): every address-bar rewrite writes path + #fragment only, never a ?query, so a URL copied from the address bar never
  // carries it; the #fragment is kept or cleared exactly as before. For each ?q= QA probes (short; HTML/script with a visitor name; a 2,100-char pad),
  // open a valid link with it, then take a copy, edit, make a link and reset: after each step location.search is '', the marker is not in location.href, and location.hash is as expected.
  for (const [QN, QQ] of [['short', '?q=Qzst57'], ['html+script with a visitor name', '?q=' + encodeURIComponent('<script>alert("Ana")</script><b onclick=x>Ana Qzst57</b>')], ['2,100-char pad', '?q=Qzst57' + 'p'.repeat(2100)]]) {
    const QM = 'Qzst57', s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    await p.evaluateOnNewDocument(() => { window.confirm = () => true; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); });
    const steps = [], loc = () => p.evaluate(M => ({ search: location.search, hash: location.hash, mark: location.href.includes(M) }), QM);
    const at = async (step, did, exp) => { const l = await loc(); steps.push(Object.assign({ step, did: did !== false, exp, hashOk: exp === null || l.hash === exp }, l)); };
    const clickIf = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.disabled) return false; const b = e.getBoundingClientRect(); if (!b.width || !b.height) return false; e.click(); return true; }, sel);
    const val = sel => p.evaluate(sel => { const e = document.querySelector(sel); return e ? e.value : ''; }, sel), frag = u => (u.match(/#.*$/) || [''])[0];
    const open = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300); };
    await open(BASE); const fq = await p.evaluate(() => { const b = BYG.blank(); b.k = 'Clinic'; b.by = 'Jo'; return BYG.encode(b); }), F = '#' + fq;
    await open(BASE + QQ + '#' + fq); await at('open received link', true, F);
    const c = await clickIf('#own-copy'); await sleep(200); await at('take a copy', c, '');
    await p.focus('#pickup'); await p.keyboard.press('End'); await p.keyboard.type('x'); await sleep(150); await at('edit', (await p.$eval('#pickup', e => e.value)) === 'Clinicx', '');
    await clickIf('#b-link'); await sleep(300); const lk = await val('#link'); await at('make link', /#b2\./.test(lk), '');
    const r = await clickIf('#b-reset'); await sleep(250); await at('reset', r, '');
    ck('PM 04:57 query-strip (' + QN + '): ' + steps.map(x => x.step).join(' -> ') + ': every step happened; location.search empty, no marker in location.href, location.hash as expected after each', steps.length >= 5 && steps.every(x => x.did && x.search === '' && !x.mark && x.hashOk), steps.map(x => Object.assign({}, x, { hash: x.hash.slice(0, 60), exp: x.exp && x.exp.slice(0, 60) })));
    ck('PM 04:57 query-strip (' + QN + '): no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
