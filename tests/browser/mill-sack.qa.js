// node tests/browser/mill-sack.qa.js <host[:port]> <ip> [scheme]  — Split the Sack full flow at 320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
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
    let r = await q.evaluate(() => ({ b: document.getElementById('banner').innerText, pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), item: document.getElementById('item').value }));
    ck(w + ' recipient sees snapshot', /A proposed split for Jasmine rice/.test(r.b) && r.pays.join() === '$1.00,$1.00,$1.00,$7.00' && !qerr.length, r);
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
    ck(w + ' reset clears', t.item === '' && t.hash === '' && t.rows === 0 && t.hh === 2, t);
    const stg = await storage(p); ck(w + ' storage empty', !stg.cookie && !stg.ls.length && !stg.ss.length && !(Array.isArray(stg.idb) && stg.idb.length) && !stg.caches.length && !stg.sw && !stg.undef, { ...stg, meta: undefined });
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME));
    await s.b.close();
  }
  // share cancel path (emulated share sheet closed) at 390
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    const st = { n: 'Rice', u: 'lb', c: '$', q: '10', i: '1', p: '10', f: '', b: 'p', x: -1, h: [['A', '3'], ['B', '7']] };
    await p.goto(BASE, { waitUntil: 'load' }); const f = await p.evaluate(o => SACKLINK.encode(o), st); await p.goto(BASE + '#' + f, { waitUntil: 'load' });
    await p.focus('#share'); await p.keyboard.press('Enter'); await sleep(300);
    const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, text: document.getElementById('text').value.length }));
    ck('390 share cancel keeps text', t.toast === 'Not sent. The split is still here.' && t.sel === 'link' && t.text > 50, t); ck('390 share-cancel no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
