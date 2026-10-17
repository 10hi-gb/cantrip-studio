// node tests/browser/mill-ask.qa.js <host[:port]> <ip> [scheme] — One Small Ask end to end: sender -> recipient -> reply, @320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
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
    ck(w + ' sender text export', t.s === '16:00' && t.t === '18:00' && t.text.includes('When: Tue Oct 20, 4 PM–6 PM') && t.text.startsWith('From Dana'), t);
    await p.focus('#b-link'); await p.keyboard.press('Enter'); await sleep(300);
    const askUrl = await p.$eval('#link', e => e.value); ck(w + ' ask link made (#a1)', /#a1\./.test(askUrl), askUrl.length);
    ck(w + ' address bar not rewritten', (await p.evaluate(() => location.hash)) === '', null);
    // RECIPIENT opens in a fresh tab
    const q = await b.newPage(); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e))); q.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) qe.push(m.text()); });
    await q.goto(askUrl, { waitUntil: 'load' }); await sleep(200);
    t = await q.evaluate(() => ({ title: document.getElementById('title').textContent, ask: [...document.querySelectorAll('.osa-term .ask')].map(e => e.textContent), choices: document.querySelectorAll('[role=radio]').length }));
    ck(w + ' recipient sees the ask', t.title === 'Dana is asking:' && t.ask[0].includes('Pick up groceries') && t.ask[2] === 'Tue Oct 20, 4 PM–6 PM' && t.choices === 3 && t.ask.length === 3, t);
    // keyboard radiogroup: focus Yes, arrow to Part of it
    await q.focus('#c-y'); await q.keyboard.press('ArrowDown'); await sleep(100);
    t = await q.evaluate(() => ({ checked: document.querySelector('[aria-checked=true]').id, focus: document.activeElement.id, inputs: !!document.getElementById('o-w') }));
    ck(w + ' arrow keys select Part of it', t.checked === 'c-p' && t.focus === 'c-p' && t.inputs, t);
    t = await q.evaluate(() => ({ btn: document.getElementById('b-rlink').textContent, err: document.getElementById('e-part').textContent }));
    ck(w + ' part unchanged => "This is a yes"', t.btn === 'This is a yes' && /Nothing's changed/.test(t.err), t);
    // counteroffer: collection-only Wed 5–6
    await typeInto(q, '#o-w', 'Collection only'); await sleep(50); await typeInto(q, '#o-d', 'Wed Oct 21'); await sleep(50); await q.focus('#o-s'); await q.keyboard.type('0500PM'); await sleep(100);
    t = await q.evaluate(() => ({ states: [...document.querySelectorAll('.osa-term')].map(e => e.className.replace('osa-term ', '')), struck: [...document.querySelectorAll('.osa-term .ask s')].map(e => e.textContent), btn: document.getElementById('b-rlink').textContent, text: document.getElementById('text').textContent }));
    ck(w + ' changed terms shown against original', t.states.join() === 'is-changed,is-same,is-changed' && t.struck.length === 2 && t.btn === 'Copy my reply link' && t.text.includes('Favor: Collection only (asked: Pick up groceries') && t.text.includes('Time it takes: 20 minutes max (same)'), t);
    await q.focus('#b-rlink'); await q.keyboard.press('Enter'); await sleep(300);
    const repUrl = await q.$eval('#link', e => e.value); ck(w + ' reply link made (#r1)', /#r1\./.test(repUrl), repUrl.length);
    // SENDER opens the reply
    const r = await b.newPage(); await r.setViewport({ width: w, height: 800 }); const re = []; r.on('pageerror', e => re.push(String(e)));
    await r.goto(repUrl, { waitUntil: 'load' }); await sleep(200);
    t = await r.evaluate(() => ({ title: document.getElementById('title').textContent, delta: document.getElementById('delta').textContent, verdict: document.querySelector('.osa-verdict').textContent, note: document.getElementById('note').textContent, body: document.body.innerText }));
    ck(w + ' sender sees reply with delta + snapshot note', t.title === 'Sam replied with what they can do.' && t.delta.includes('Collection only · Wed Oct 21, 5 PM–6 PM') && t.verdict === 'Part of it' && /Nothing has been booked/.test(t.note) && !/\b(accepted|confirmed|agreed|delivered|notified)\b/i.test(t.body), t);
    // ask again, changed -> composer prefilled with the offer
    await r.focus('#b-again'); await r.keyboard.press('Enter'); await sleep(100);
    t = await r.evaluate(() => ({ w: document.getElementById('f-w').value, d: document.getElementById('f-d').value, hash: location.hash }));
    ck(w + ' ask again changed prefills', t.w === 'Collection only' && t.d === 'Wed Oct 21' && t.hash === '', t);
    // "no" reply has no reason field
    await q.focus('#c-n'); await q.keyboard.press('Enter'); await sleep(100);
    t = await q.evaluate(() => ({ note: !!document.getElementById('f-note'), text: document.getElementById('text').textContent }));
    ck(w + ' no = no reason field', !t.note && t.text.endsWith('Not this time.'), t);
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
    await p.focus('#f-note'); await p.keyboard.type('Happy to.'); const nt = await p.evaluate(() => ({ vis: document.getElementById('f-note').getBoundingClientRect().height > 20, text: document.getElementById('text').textContent })); ck('390 yes + optional note visible and exported', nt.vis && nt.text.endsWith('Note: Happy to.'), nt); await p.focus('#b-rshare'); await p.keyboard.press('Enter'); await sleep(300);
    const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value }));
    ck('390 reply share cancel keeps link selectable', t.toast === 'Not sent. Your reply is still here.' && t.sel === 'link' && /#r1\./.test(t.link), t); ck('390 share-cancel no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
