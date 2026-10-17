// node tests/browser/mill-sack.qa.js <host[:port]> <ip> [scheme]  — Split the Sack full flow at 320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const COPYV2 = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/split-the-sack/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/split-the-sack/`;
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(300);
    // keyboard: every control reachable by Tab
    const miss = await tabReach(p, ['item', 'q', 'u', 'inc', 'c', 'p', 'f', 'add', 'reset']); ck(w + ' keyboard reach', !miss.length, miss);
    await typeInto(p, '#item', 'Jasmine rice'); await typeInto(p, '#q', '10'); await typeInto(p, '#u', 'lb'); await typeInto(p, '#inc', '1'); await typeInto(p, '#p', '10.00');
    const hn = await p.$$('#hh input:not(.sk-rq)'); await hn[0].focus(); await p.keyboard.type('Ana'); await hn[1].focus(); await p.keyboard.type('Ben');
    await p.focus('#add'); await p.keyboard.press('Enter'); await sleep(50); await p.keyboard.type('Cy');
    const rq = await p.$$('#hh .sk-rq');
    // Joshua case 4,4,4 -> shortage 2, blocked
    for (const r of rq) { await r.focus(); await p.keyboard.type('4'); }
    let t = await p.evaluate(() => ({ st: document.getElementById('status').textContent, role: document.getElementById('status').getAttribute('role'), dis: document.getElementById('share').disabled, money: [...document.querySelectorAll('#rows .ss-alloc .tot')].map(e => e.textContent), short: !!document.querySelector('#rows .is-short') }));
    ck(w + ' 4,4,4 shortage 2 blocks, costs hidden', /2 lb short/.test(t.st) && t.role === 'alert' && t.dis && t.short && t.money.every(m => m === '—'), t);
    // 3,3,3 -> 1 lb + $1.00 unclaimed
    for (const r of rq) { await r.click({ clickCount: 3 }); await p.keyboard.type('3'); }
    t = await p.evaluate(() => ({ st: document.getElementById('status').textContent, tb: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.textContent.replace(/\s+/g, ' ')), dis: document.getElementById('share').disabled, rec: document.getElementById('reconcile').textContent }));
    ck(w + ' 3,3,3 unclaimed 1 lb $1.00', /1 lb unclaimed/.test(t.st) && t.tb[3].includes('1 lb') && t.tb[3].includes('$1.00') && !t.dis && /10 lb, \$10\.00/.test(t.rec), t);
    // 3,3,4 -> 300/300/400
    await rq[2].click({ clickCount: 3 }); await p.keyboard.type('4');
    t = await p.evaluate(() => [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent)); ck(w + ' 3,3,4 -> 3.00/3.00/4.00', t.join() === '$3.00,$3.00,$4.00,$0.00', t);
    // off-increment and negative input rejected with Writer strings
    await rq[0].click({ clickCount: 3 }); await p.keyboard.type('2.5');
    t = await p.evaluate(() => document.getElementById('hh-msg').textContent + '|' + document.getElementById('share').disabled); ck(w + ' off-increment rejected', /Use steps of 1 lb/.test(t) && t.endsWith('true'), t);
    await rq[0].click({ clickCount: 3 }); await p.keyboard.type('-1');
    t = await p.evaluate(() => document.getElementById('hh-msg').textContent); ck(w + ' negative rejected', /negative/.test(t), t);
    await rq[0].click({ clickCount: 3 }); await p.keyboard.type('3');
    // 334/333/333: package 3 lb, 1 each
    await typeInto(p, '#q', '3'); for (const r of rq) { await r.click({ clickCount: 3 }); await p.keyboard.type('1'); }
    t = await p.evaluate(() => ({ pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), res: document.getElementById('residual').textContent }));
    ck(w + ' 3 equal -> 3.34/3.33/3.33, cent to Ana', t.pays.slice(0, 3).join() === '$3.34,$3.33,$3.33' && /Ana/.test(t.res), t);
    // explicit assign of unclaimed
    await typeInto(p, '#q', '10'); await sleep(50);
    const ab = await p.$$('#assign button'); ck(w + ' assign buttons shown', ab.length === 3, ab.length); await ab[1].focus(); await p.keyboard.press('Enter');
    t = await p.evaluate(() => ({ pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), un: !!document.getElementById('unassign') }));
    ck(w + ' assign rest to Ben', t.pays.join() === '$1.00,$8.00,$1.00,$0.00' && t.un, t);
    await p.focus('#unassign'); await p.keyboard.press('Enter');
    // share (no navigator.share headless -> clipboard path; failure must leave selectable link)
    await p.focus('#share'); await p.keyboard.press('Enter'); await sleep(300);
    t = await p.evaluate(() => ({ link: document.getElementById('link').value, hash: location.hash, text: document.getElementById('text').value, toast: document.getElementById('toast').textContent }));
    ck(w + ' link made + text proposal', /#s1\./.test(t.link) && t.hash.startsWith('#s1.') && /Proposed split: Jasmine rice/.test(t.text) && /Unclaimed: 7 lb/.test(t.text), { len: t.link.length, toast: t.toast });
    // recipient opens the link in a fresh tab
    const q = await s.b.newPage(); await q.setViewport({ width: w, height: 800 }); const qerr = []; q.on('pageerror', e => qerr.push(String(e)));
    await q.goto(t.link || BASE, { waitUntil: 'load' }); await sleep(200);
    let r = await q.evaluate(() => ({ b: [...document.querySelectorAll('#banner > *')].filter(e => !e.hidden).map(e => e.textContent).join('\n'), pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), editor: document.getElementById('editor').hidden, recv: !document.getElementById('recv').hidden, from: document.getElementById('from').textContent, cap: document.getElementById('caption').textContent, assign: document.querySelectorAll('#assign button').length, buttons: [...document.querySelectorAll('#recv button')].filter(b => b.offsetParent).map(b => b.textContent) }));
    ck(w + ' recipient: read-only view, header + intro, sender text labelled (D4, scope a)', /^Proposed split\nThe sender's proposal, as it was when the link was made\.\nFrom the sender: “Jasmine rice”/.test(r.b) && !/proposed split for/i.test(r.b) && r.editor && r.recv && r.from === 'From the sender:' && r.cap === 'Households, as the sender typed them' && !r.assign && r.buttons.join() === 'Change my amount' && r.pays.join() === '$1.00,$1.00,$1.00,$7.00' && !qerr.length, r);
    await q.select('#pick', '1'); await sleep(50);
    r = await q.evaluate(() => ({ own: document.getElementById('owncost').textContent, you: !!document.querySelector('.ss-alloc.is-you') }));
    ck(w + ' recipient picks household -> own cost line', r.own === 'You take 1 lb: $1.00.' && r.you, r);
    await q.focus('#change'); await q.keyboard.press('Enter'); await sleep(50); await q.keyboard.press('Enter'); await sleep(80);
    r = await q.evaluate(() => ({ note: document.getElementById('changenote').textContent, vis: !document.getElementById('changebox').hidden, amt: document.getElementById('amt').textContent, was: { was: (document.querySelector('.ss-alloc.is-changed .qty') || { getAttribute: () => null }).getAttribute('data-was') }, pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), hash: location.hash }));
    ck(w + ' Change my amount: changeNote once, stepper by keyboard, "was" marker, original link untouched', r.vis && r.note === "This makes a new link for you to send back. It doesn't change the sender's copy or tell them anything." && r.amt === '2 lb' && r.was && r.was.was === 'was 1 lb' && r.pays.join() === '$1.00,$2.00,$1.00,$6.00' && r.hash === new URL(t.link).hash, r);
    await q.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); });
    await q.focus('#makelink'); await q.keyboard.press('Enter'); await sleep(150);
    r = await q.evaluate(() => ({ link: document.getElementById('rlink').value, f: document.activeElement.id, toast: document.getElementById('toast').textContent }));
    const newHash = r.link.split('#')[1] || '';
    ck(w + ' new link made (differs from original), selectable on copy failure', /^s1\./.test(newHash) && '#' + newHash !== new URL(t.link).hash && r.f === 'rlink' && /Couldn't copy/.test(r.toast), { len: r.link.length, f: r.f });
    await q.focus('#cancel'); await q.keyboard.press('Enter'); await sleep(50);
    r = await q.evaluate(() => ({ pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), box: document.getElementById('changebox').hidden, rl: document.getElementById('rlink').value }));
    ck(w + ' Back to the proposal restores the original', r.pays.join() === '$1.00,$1.00,$1.00,$7.00' && r.box && r.rl === '', r);
    const nq = await s.b.newPage(); await nq.setViewport({ width: w, height: 800 }); await nq.goto(BASE + '#' + newHash, { waitUntil: 'load' }); await sleep(100);
    r = await nq.evaluate(() => ({ pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), recv: !document.getElementById('recv').hidden })); await nq.close();
    ck(w + ' new link opens as a read-only proposal with the changed amount', r.recv && r.pays.join() === '$1.00,$2.00,$1.00,$6.00', r);
    const ofr = await overflow(q); ck(w + ' recipient no overflow', ofr.sw <= ofr.w && !ofr.bad.length, ofr);
    // malformed / truncated / oversized / old version
    for (const [nm, h, want] of [['truncated', t.hash.slice(0, 40), /damaged/], ['oversized', '#s1.' + 'A'.repeat(2100) + '.abcdef', /damaged/], ['garbage', '#<img src=x onerror=alert(1)>', /damaged/], ['old version', '#' + (await q.evaluate(() => MILL.pack('s', 0, {}))), /older version/]]) {
      await q.goto('about:blank'); await q.goto(BASE + h, { waitUntil: 'load' }); await sleep(100);
      r = await q.evaluate(() => ({ b: document.getElementById('banner').innerText, imgs: document.querySelectorAll('img').length, rows: document.querySelectorAll('#rows .ss-alloc').length }));
      ck(w + ' ' + nm + ' link handled', want.test(r.b) && !r.imgs && !r.rows, r);
    }
    await q.close();
    // text-safe rendering: hostile names stay text
    const hn2 = await p.$$('#hh input:not(.sk-rq)'); await hn2[0].click({ clickCount: 3 }); await p.keyboard.type('<b>x</b>');
    t = await p.evaluate(() => ({ b: document.querySelectorAll('#rows b').length, cell: document.querySelector('#rows .ss-alloc .who').textContent })); ck(w + ' text-safe', t.b === 0 && t.cell === '<b>x</b>', t);
    // editing clears the stale link from the address bar
    t = await p.evaluate(() => location.hash); ck(w + ' edit clears old link', t === '', t);
    const of = await overflow(p); ck(w + ' no overflow', of.sw <= of.w && !of.bad.length, of);
    // reset
    await p.focus('#reset'); await p.keyboard.press('Enter'); await sleep(100);
    t = await p.evaluate(() => ({ item: document.getElementById('item').value, hash: location.hash, rows: document.querySelectorAll('#rows .ss-alloc').length, hh: document.querySelectorAll('#hh li').length }));
    t.link = await p.$eval('#link', e => e.value); ck(w + ' reset clears (incl. hidden link box, D3)', t.item === '' && t.hash === '' && t.rows === 0 && t.hh === 2 && t.link === '', t);
    // D1: readout values never overlap, for ordinary and cap-bound values
    for (const [q1, u1, p1, f1] of [['100', 'each', '129.99', '12.50'], ['48', 'dozen', '250.00', '5.00'], ['1000', 'kg', '1234.56', '99.99'], ['999999', 'u'.repeat(16), '100000.00', '100000.00']]) {
      await typeInto(p, '#q', q1); await typeInto(p, '#u', u1); await typeInto(p, '#p', p1); await typeInto(p, '#f', f1); await sleep(50);
      const ov = await textOverlap(p, '.ss-lcd .v, .ss-lcd .k'); const of2 = await overflow(p); ck(w + ' readout no text overlap ' + q1 + ' ' + u1.slice(0, 5) + ' $' + p1 + ' fee ' + f1 + ' (D1)', !ov.length && of2.sw <= of2.w, { ov, of2 });
    }
    // D2: 24-char single word is ellipsized (not broken mid-word), full text kept
    await typeInto(p, '#item', 'Rice'); await typeInto(p, '#q', '10'); await typeInto(p, '#p', '10'); await typeInto(p, '#f', '');
    { const hn3 = await p.$$('#hh input:not(.sk-rq)'); await hn3[0].click({ clickCount: 3 }); await p.keyboard.type('Pneumonoultramicroscopic'); const rq3 = await p.$$('#hh input.sk-rq'); if (rq3[0]) { await rq3[0].click({ clickCount: 3 }); await p.keyboard.type('1'); } await sleep(80);
      const e2 = await p.evaluate(() => { const w = [...document.querySelectorAll('#rows .ss-alloc .who')].find(e => e.textContent === 'Pneumonoultramicroscopic'); if (!w) return null; const r = document.createRange(); r.selectNodeContents(w); const cs = getComputedStyle(w); return { lines: new Set([...r.getClientRects()].map(x => Math.round(x.top))).size, ell: cs.textOverflow, title: w.title, text: w.textContent }; });
      ck(w + ' long single-word name ellipsized, one line, full text kept (D2)', e2 && e2.lines === 1 && e2.ell === 'ellipsis' && e2.title === 'Pneumonoultramicroscopic', e2); }
    const stg = await storage(p); ck(w + ' storage empty', !stg.cookie && !stg.ls.length && !stg.ss.length && !(Array.isArray(stg.idb) && stg.idb.length) && !stg.caches.length && !stg.sw && !stg.undef, { ...stg, meta: undefined });
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }
  // share cancel path (emulated share sheet closed) at 390
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    const st = { n: 'Rice', u: 'lb', c: '$', q: '10', i: '1', p: '10', f: '', b: 'p', x: -1, h: [['A', '3'], ['B', '7']] };
    await p.goto(BASE, { waitUntil: 'load' }); for (const [id, v] of [['item', 'Rice'], ['q', '10'], ['u', 'lb'], ['p', '10']]) await typeInto(p, '#' + id, v);
    { const hn = await p.$$('#hh input:not(.sk-rq)'), rq = await p.$$('#hh input.sk-rq'); await hn[0].focus(); await p.keyboard.type('A'); await hn[1].focus(); await p.keyboard.type('B'); await rq[0].focus(); await p.keyboard.type('3'); await rq[1].focus(); await p.keyboard.type('7'); }
    await p.focus('#share'); await p.keyboard.press('Enter'); await sleep(300);
    const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, text: document.getElementById('text').value.length }));
    ck('390 share cancel keeps text', t.toast === 'Not sent. The split is still here.' && t.sel === 'link' && t.text > 50, t);
    // recipient's new link: share sheet cancelled -> link stays selectable, nothing claimed
    const f = await p.evaluate(o => SACKLINK.encode(o), st); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await p.select('#pick', '0'); await p.focus('#change'); await p.keyboard.press('Enter'); await sleep(50); await p.focus('#down'); await p.keyboard.press('Enter'); await sleep(50);
    await p.focus('#makelink'); await p.keyboard.press('Enter'); await sleep(300);
    const t2 = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('rlink').value }));
    ck('390 recipient new-link share cancel keeps link selectable', t2.toast === 'Not sent. The split is still here.' && t2.sel === 'rlink' && /#s1\./.test(t2.link), t2); ck('390 share-cancel no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // scope (b): fee lines per mode, unclaimed carries its proportional fee share, equal mode households only, nobasis blocked
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 390, height: 800 }); await p.goto(BASE, { waitUntil: 'load' });
    for (const [id, v] of [['item', 'Rice'], ['q', '10'], ['u', 'lb'], ['p', '10.00'], ['f', '1.00']]) await typeInto(p, '#' + id, v);
    { const hn = await p.$$('#hh input:not(.sk-rq)'), rq = await p.$$('#hh input.sk-rq'); await hn[0].focus(); await p.keyboard.type('A'); await hn[1].focus(); await p.keyboard.type('B'); await rq[0].focus(); await p.keyboard.type('3'); await rq[1].focus(); await p.keyboard.type('3'); }
    await sleep(50); const rowsOf = () => p.evaluate(() => ({ note: document.getElementById('basisnote').textContent, fees: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.fee').firstChild.textContent), tots: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), text: document.getElementById('text').value, status: document.getElementById('status').textContent }));
    let t = await rowsOf(); ck('390 proportional: unclaimed shows cost + fee share; line from copy.v2', t.note === COPYV2.feeBasisLine.proportional && t.fees.join() === '$0.30,$0.30,$0.40' && t.tots.join() === '$3.30,$3.30,$4.40' && t.text.includes(COPYV2.feeBasisLine.proportional) && t.text.includes('Unclaimed: 4 lb · $4.40'), t);
    await p.focus('#be'); await p.keyboard.press('Enter'); await sleep(50); t = await rowsOf();
    ck('390 equal: fee across households only, unclaimed none; UI says so', t.note === COPYV2.feeBasisLine.equal && t.fees.join() === '$0.50,$0.50,$0.00' && t.tots.join() === '$3.50,$3.50,$4.00', t);
    { const rq = await p.$$('#hh input.sk-rq'); await typeInto(p, '#' + await rq[0].evaluate(e => e.id), '0'); await typeInto(p, '#' + await rq[1].evaluate(e => e.id), '0'); } await sleep(50); t = await rowsOf();
    ck('390 equal with nobody taking: errorFeeNoBasis, export blocked', t.status === COPYV2.errorFeeNoBasis && (await p.$eval('#share', e => e.disabled)), t);
    await p.focus('#bp'); await p.keyboard.press('Enter'); await sleep(50); t = await rowsOf(); ck('390 proportional with nobody taking: fee sits on Unclaimed', t.tots.join() === '$0.00,$0.00,$11.00', t);
    ck('390 fee-mode checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
