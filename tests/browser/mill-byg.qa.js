// node tests/browser/mill-byg.qa.js <host[:port]> <ip> [scheme] — Before You Go @320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const BASE = `${SCHEME}://${H}/mill/before-you-go/`;
const state = p => p.evaluate(() => ({ ready: document.getElementById('ready').className, n: document.getElementById('ready-n').textContent, h: document.getElementById('ready-h').textContent, s: document.getElementById('ready-s').textContent,
  rows: [...document.querySelectorAll('#list .byg-fact')].map(e => e.className.replace('byg-fact ', '') + ':' + e.querySelector('.byg-chip').textContent),
  qs: [...document.querySelectorAll('#script li .t')].map(e => e.textContent), call: !document.getElementById('call').hidden, nocall: !document.getElementById('nocall').hidden, text: document.getElementById('text').value,
  green: [...document.querySelectorAll('.byg-ready, .byg-fact, .byg-chip')].some(e => { const m = getComputedStyle(e).backgroundColor.match(/\d+/g); return m && +m[1] > 120 && +m[1] > +m[0] + 40 && +m[1] > +m[2] + 40; }) }));
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    const s = await session(H, IP); const { p, b } = s; await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    let t = await state(p);
    ck(w + ' empty: amber, 3 essentials open, all unknown, 5 generic questions, no call button', t.ready === 'byg-ready is-open' && t.n === '3' && t.h === 'Not set: 3 essentials still open' && t.rows.every(r => r === 'is-wait:Unknown') && t.qs.length === 5 && !t.call && t.nocall && !t.green, t);
    const miss = await tabReach(p, ['pickup', 'f-place', 'a-place', 'ok-place', 'f-bring', 'f-id', 'own-in', 'own-add', 'by', 'b-link', 'b-share', 'b-text', 'b-print', 'b-reset']); ck(w + ' keyboard reach', !miss.length, miss);
    await typeInto(p, '#pickup', 'Used bike'); await typeInto(p, '#f-place', '1420 Pine St, side gate'); await typeInto(p, '#f-window', 'Sat 10–12'); await typeInto(p, '#f-contact', 'Text Maria, 555-0134');
    t = await state(p);
    ck(w + ' typed facts are "You said", still amber; questions keep asking about them', t.rows.slice(0, 3).every(r => r === 'is-wait:You said') && t.n === '3' && t.qs.length === 5 && /3 details are what you said/.test(t.s) && !t.green, t);
    ck(w + ' call/text only from typed number, labelled with it', t.call && !t.nocall && (await p.$eval('#call', e => e.textContent + '|' + e.getAttribute('href'))) === 'Call 555-0134|tel:5550134', null);
    // confirm requires an answer (keyboard)
    await p.focus('#ok-place'); await p.keyboard.press('Enter'); await sleep(50);
    t = await p.evaluate(() => ({ hint: document.getElementById('h-place').textContent, cls: document.querySelector('#f-place').closest('.byg-fact').className, focus: document.activeElement.id }));
    ck(w + ' confirm refused without answer', t.hint === 'Type their answer first.' && t.cls === 'byg-fact is-wait' && t.focus === 'a-place', t);
    for (const k of ['place', 'window']) { await typeInto(p, '#a-' + k, k === 'place' ? 'Side gate, ring twice' : 'Sat 10–11 only'); await p.keyboard.press('Enter'); await sleep(50); }
    t = await state(p);
    ck(w + ' 2 confirmed + bring open: still amber, bring listed', t.n === '1' && t.s.startsWith('Still open: Bring') && t.ready.includes('is-open') && t.rows[0] === 'is-ok:Confirmed' && t.qs[0] === 'Anything I should know when I arrive?' && !t.green, t);
    ck(w + ' bring question asks, never defaults to ID', t.qs.includes('What should I bring?') && !/ID/.test(t.qs.join('|')) && (await p.$eval('#f-bring', e => e.value)) === '', t.qs);
    await typeInto(p, '#a-bring', 'Nothing needed'); await p.keyboard.press('Enter'); await sleep(50);
    t = await state(p); ck(w + ' all essentials confirmed => blue, never green', t.ready === 'byg-ready is-ready' && t.h === 'Everything essential is confirmed.' && !t.green && (await p.$eval('#ready', e => getComputedStyle(e).backgroundColor)) === 'rgb(0, 87, 184)', t);
    // undo confirm returns to amber
    await p.focus('#un-bring'); await p.keyboard.press('Enter'); await sleep(50); t = await state(p); ck(w + ' undo confirm => amber again', t.ready.includes('is-open') && t.n === '1', t.h);
    // own question + text-safe
    await typeInto(p, '#own-in', '<img src=x onerror=alert(1)> Can I park?'); await p.keyboard.press('Enter'); await sleep(50);
    t = await p.evaluate(() => ({ img: document.querySelectorAll('img').length, q: [...document.querySelectorAll('#script li .t')].pop().textContent, text: document.getElementById('text').value }));
    ck(w + ' own question text-safe, in list and notes', !t.img && t.q.startsWith('<img') && t.text.includes('<img src=x'), t.q);
    t = await p.evaluate(() => document.getElementById('text').value);
    ck(w + ' notes: heading, statuses, answer lines, footer', t.startsWith('Pickup: Used bike') && t.includes('[x] Place: Side gate, ring twice (Confirmed)') && t.includes('[ ] Bring: — (Unknown)') && t.includes('Answer: ____') && t.endsWith('Nothing was looked up.'), t);
    // link -> receiver
    await typeInto(p, '#by', 'Jo'); await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(300);
    const url = await p.$eval('#link', e => e.value); ck(w + ' link made (#b1), address bar untouched', /#b1\./.test(url) && (await p.evaluate(() => location.hash)) === '', url.length);
    const q = await b.newPage(); q.setDefaultTimeout(15000); q.on('dialog', d => d.accept().catch(() => {})); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e))); q.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) qe.push(m.text()); });
    await q.goto(url, { waitUntil: 'load' }); await sleep(200);
    t = await q.evaluate(() => ({ b: document.getElementById('banner').innerText, by: document.querySelector('#f-place').closest('.byg-fact').querySelector('.byg-confirmed span').textContent, byTyped: (document.querySelector('#f-place').closest('.byg-fact').querySelector('.byg-confirmed .byg-typed') || {}).textContent, val: document.querySelector('#f-place').closest('.byg-fact').querySelector('.byg-val').textContent, bannerTyped: (document.querySelector('#banner-t .byg-typed') || {}).textContent, body: document.body.innerText, rows: [...document.querySelectorAll('#list .byg-chip')].map(e => e.textContent) }));
    ck(w + ' receiver sees snapshot, attributed confirmations, no sent/agreed claims', t.b.includes('Pickup notes: Used bike') && t.b.includes("The link you were sent doesn't change.") && t.by === 'Marked confirmed by: Jo' && t.byTyped === 'Jo' && t.bannerTyped === 'Used bike' && /^As typed: /.test(t.val) && t.rows.join() === 'Confirmed,Confirmed,You said,Unknown,Unknown' && !/\b(sent|delivered|accepted|agreed)\b/i.test(t.body.replace("Not sent. Your notes are still here.", '').replace("The link you were sent doesn't change.", '')), t);
    await q.emulateMediaType('print'); const pv = await q.evaluate(() => [...document.querySelectorAll('.byg-val')].filter(e => e.offsetParent !== null && e.querySelector('.byg-typed')).map(e => e.innerText)); await q.emulateMediaType(null);
    ck(w + ' print shows "As typed:" before every confirmed typed value (D4)', pv.length >= 2 && pv.every(v => /^As typed:/.test(v)), pv);
    const ofq = await overflow(q);
    // malformed links
    for (const [nm, h, want] of [['truncated', url.split('#')[1].slice(0, 40), /damaged/], ['oversized', 'b1.' + 'A'.repeat(2100) + '.abcdef', /Too much/], ['script', '<img src=x onerror=alert(1)>', /damaged/], ['old version', await q.evaluate(() => MILL.pack('b', 0, {})), /older version/], ['confirmed-without-answer', await q.evaluate(() => MILL.pack('b', 1, { k: '', y: '', f: { place: ['x', '', 1] }, o: [] })), /damaged/]]) {
      await q.goto('about:blank'); await q.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(100);
      const x = await q.evaluate(() => ({ b: document.getElementById('banner-t').textContent, hid: document.getElementById('banner').hidden, img: document.querySelectorAll('img').length, ok: document.querySelectorAll('.byg-fact.is-ok').length }));
      ck(w + ' ' + nm + ' link refused', want.test(x.b) && !x.hid && !x.img && !x.ok, x);
    }
    const of = await overflow(p); ck(w + ' no overflow (owner, receiver)', of.sw <= of.w && !of.bad.length && ofq.sw <= ofq.w && !ofq.bad.length, { of, ofq });
    // reload restores nothing; reset clears UI + fragment
    await q.goto(url, { waitUntil: 'load' }); await q.focus('#b-reset'); await q.keyboard.press('Enter'); await sleep(100);
    t = await q.evaluate(() => ({ h: location.hash, pk: document.getElementById('pickup').value, ok: document.querySelectorAll('.byg-fact.is-ok').length, ban: document.getElementById('banner').hidden, n: document.getElementById('ready-n').textContent }));
    ck(w + ' reset clears UI and fragment', t.h === '' && t.pk === '' && !t.ok && t.ban && t.n === '3', t);
    await p.reload({ waitUntil: 'load' }); t = await p.evaluate(() => ({ pk: document.getElementById('pickup').value, f: document.getElementById('f-place').value })); ck(w + ' reload keeps nothing', t.pk === '' && t.f === '', t);
    for (const [nm, pg] of [['owner', p], ['receiver', q]]) { const st = await storage(pg); ck(w + ' storage empty (' + nm + ')', !st.cookie && !st.ls.length && !st.ss.length && !(Array.isArray(st.idb) && st.idb.length) && !st.caches.length && !st.sw && !st.undef, st); }
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length && !qe.length, [errsOf(s, SCHEME), qe]);
    await b.close();
  }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await typeInto(p, '#pickup', 'Crib'); await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(300);
    let t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value, s: getSelection().toString() || (document.activeElement.selectionEnd - document.activeElement.selectionStart) }));
    ck('390 share cancel keeps link selectable', t.toast === 'Not sent. Your notes are still here.' && t.sel === 'link' && /#b1\./.test(t.link) && t.s, t);
    // over-cap: link refused, notes selected instead
    await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); }; ['place', 'window', 'contact', 'instructions', 'bring', 'id', 'appt', 'park', 'access'].forEach(k => { set('f-' + k, '😀'.repeat(120)); set('a-' + k, '😀'.repeat(120)); }); });
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(200);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, len: document.activeElement.selectionEnd - document.activeElement.selectionStart }));
    ck('390 over-cap link => tooLongLink, notes selected', t.toast === 'Too much to fit in a link. Copy or print the notes instead.' && t.sel === 'text' && t.len > 100, t);
    ck('390 share-cancel/over-cap no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // D1/D2 pattern checks carried over from Split the Sack QA: long unbroken values wrap inside their cards, nothing overlaps
  for (const w of [320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' });
    const g = await p.evaluate(() => { const s = BYG.blank(); s.k = 'Pneumonoultramicroscopic ' + 'x'.repeat(35); s.by = 'Pneumonoultramicroscopic'; for (const k of BYG.ALL) { s.f[k].v = '9'.repeat(60); s.f[k].a = 'A'.repeat(60); s.f[k].c = k !== 'bring'; } return BYG.encode(s); });
    await p.goto(BASE + '#' + g, { waitUntil: 'load' }); await sleep(150);
    const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, wide: [...document.querySelectorAll('.byg-fact')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth).length }));
    const ov = await textOverlap(p, '#kicker, #title, #what, #ready-h, #ready-s, .byg-chip, .byg-lab label, .byg-val, .byg-said, .byg-confirmed > span');
    ck(w + ' byg long unbroken values: cards fit, no overlap', r.sw <= w && !r.wide && !ov.length, { r, ov }); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
