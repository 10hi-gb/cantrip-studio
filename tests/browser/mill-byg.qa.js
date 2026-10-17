// node tests/browser/mill-byg.qa.js <host[:port]> <ip> [scheme] — Before You Go @320/390/1280 (ENGINEER SELF-CHECK)
// QA 83a2ebcd D1–D10 + PM 10:33 scope + Writer QA-83 strings (exact). Rendered visibility via reallyHidden (computed style/box + a11y tree).
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
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
    await typeInto(p, '#pickup', 'Used bike'); await typeInto(p, '#f-place', 'Corner of 5th and Main, by the blue mailbox'); await setVal(p, 'f-window-d', '2026-10-24'); await typeInto(p, '#f-contact', 'Message Sam on Marketplace or call 412-555-0187');
    t = await state(p);
    ck(w + ' typed facts: chip "Your note · not confirmed", someSaidNote, still 5 open; date-specific question', t.chips.place === 'Your note · not confirmed' && t.chips.window === 'Your note · not confirmed' && t.n === '5' && t.s === 'Still open: Place, When, Contact, Instructions, Bring. 3 details are your notes, not confirmed.' && t.qs.includes('What time can I come on Sat Oct 24 2026?'), t);
    ck(w + ' call/text from a clear phone number, labelled with it', t.call && t.sms && t.callTxt === 'Call 412-555-0187' && t.href === 'tel:4125550187', t);
    for (const [v, want] of [['Listing #123456789 on Marketplace', false], ['Sat 2026-10-24', false], ['5550134 or 5550199', false], ['Text Maria, 555-0134', true]]) { await typeInto(p, '#f-contact', v); const x = await state(p); ck(w + ' D8 Call/Text for "' + v + '": ' + (want ? 'shown' : 'none'), x.call === want && x.sms === want && (want || (await reallyHidden(p, ['#call', '#sms'])).ok), x.callTxt); }
    await typeInto(p, '#f-contact', 'Message Sam on Marketplace or call 412-555-0187');
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
    const oe = await p.$eval('#own-e', e => e.textContent); const nq = await p.evaluate(() => [...document.querySelectorAll('#script li .t')].filter(e => /^Q\d\?$|lock/.test(e.textContent)).length);
    ck(w + ' 6th own question: ownLimitReached, 5 kept', oe === 'Up to 5 questions.' && nq === 5, { oe, nq });
    for (let i = 0; i < 4; i++) { await p.evaluate(() => [...document.querySelectorAll('#script .byg-rm')].pop().click()); await sleep(20); }
    t = await state(p);
    ck(w + ' copy text: Writer templates exactly', t.text.split('\n').slice(0, 13).join('\n') === ['Pickup notes for “Used bike”', 'Notes by: “Jo”', '', 'Not set: 3 essentials still open. Still open: When, Contact, Instructions.', '', 'Place: “Corner of 5th and Main, by the blue mailbox” · Confirmed', 'Answer: “Side gate, ring twice”', 'When: “Sat Oct 24 2026” · Your note, not confirmed', 'Contact: “Message Sam on Marketplace or call 412-555-0187” · Your note, not confirmed', 'Instructions: Not sure', 'Bring: “Cash, $80” · Confirmed', '', 'Ask before you go:'].join('\n') && t.text.includes('• “Is the lock included?”') && t.text.endsWith(C.textFooter), t.text);
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
    ck(w + ' D7 recipient: unconfirmed values are full wrapping text ("As typed:" + quotes), nothing clipped', lines.some(l => l.t === 'As typed: “Sat Oct 24 2026”') && lines.some(l => l.t === 'As typed: “Message Sam on Marketplace or call 412-555-0187”') && lines.every(l => !l.clip), lines);
    await q.emulateMediaType('print'); const pv = await q.evaluate(() => ({ lines: [...document.querySelectorAll('.byg-line')].filter(e => e.getClientRects().length).map(e => e.textContent), qs: [...document.querySelectorAll('#printq li')].filter(e => e.getClientRects().length).map(e => e.textContent), qh: document.getElementById('printq-h').getClientRects().length > 0 })); await q.emulateMediaType(null);
    ck(w + ' D6 print: typed-but-unconfirmed values (labelled) and the Ask list incl. own question print', pv.lines.includes('As typed: “Message Sam on Marketplace or call 412-555-0187”') && pv.lines.includes('As typed: “Sat Oct 24 2026”') && pv.qh && pv.qs.some(x => x.startsWith('Is the lock included?')) && pv.qs.some(x => x.startsWith('Who do I contact')), pv);
    // Make my own copy: empty name; recipient confirms one fact -> only that fact is "by you"
    await q.click('#own-copy'); await sleep(100);
    const byv = await q.$eval('#by', e => e.value); await setVal(q, 'a-window-d', '2026-10-24'); await setVal(q, 'a-window-t', '15:00'); await q.click('#ok-window'); await sleep(80);
    t = await state(q);
    ck(w + ' D3 own copy: name field empty; recipient confirm changes only that fact; sender\'s confirmations keep their credit', byv === '' && t.by.window === 'Confirmed by you' && t.by.place === 'Marked confirmed by the sender: “Jo”' && t.by.bring === 'Marked confirmed by the sender: “Jo”' && t.chips.contact === "Sender's note · not confirmed", t.by);
    ck(w + ' D3 own-copy export keeps per-fact attribution', t.text.includes('When: “Sat Oct 24 2026” · Sender\'s note, not confirmed') === false && t.text.includes('When: “Sat Oct 24 2026” · Confirmed') && t.text.includes('Answer: “Sat Oct 24 2026, 3 PM”') && t.text.includes('Place: “Side gate, ring twice” · Confirmed by the sender') && t.text.includes("Contact: “Message Sam on Marketplace or call 412-555-0187” · Sender's note, not confirmed") && !t.text.includes('Notes by: “Jo”'), t.text);
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
  // QA N1 (same tab, all pieces): fill -> Copy link -> open it -> open a bad link: no stale validation errors
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const r = await sameTabBadLink(p, { errSel: '.byg-err, #own-e, #own-e2, #pickup-e, #by-e', bad: 'b2.broken',
      fill: async p => { await typeInto(p, '#pickup', 'x'.repeat(61)); await typeInto(p, '#pickup', 'Used bike'); await typeInto(p, '#f-place', 'Corner of 5th and Main'); await typeInto(p, '#f-contact', 'Message Sam on Marketplace'); },
      link: async p => { await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.click('#b-link'); await sleep(200); return p.$eval('#link', e => e.value); } });
    ck(w + ' N1 same tab: bad link after fill + link + open shows zero validation errors', r.ok, r); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
