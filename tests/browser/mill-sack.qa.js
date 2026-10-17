// node tests/browser/mill-sack.qa.js <host[:port]> <ip> [scheme]  — Split the Sack full flow at 320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const COPYV2 = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/split-the-sack/copy.js', 'utf8') + ';COPY');
const COPY = COPYV2;
const M_fill = (t, name) => t.replace('{name}', name);
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
    ck(w + ' 4,4,4 shortage 2 blocks, costs hidden', /2 “lb” short/.test(t.st) && t.role === 'alert' && t.dis && t.short && t.money.every(m => m === '—'), t);
    // 3,3,3 -> 1 lb + $1.00 unclaimed
    for (const r of rq) { await r.click({ clickCount: 3 }); await p.keyboard.type('3'); }
    t = await p.evaluate(() => ({ st: document.getElementById('status').textContent, tb: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.textContent.replace(/\s+/g, ' ')), dis: document.getElementById('share').disabled, rec: document.getElementById('reconcile').textContent }));
    ck(w + ' 3,3,3 unclaimed 1 “lb” $1.00', /1 “lb” unclaimed/.test(t.st) && t.tb[3].includes('1 “lb”') && t.tb[3].includes('$1.00') && !t.dis && /10 “lb”, \$10\.00/.test(t.rec), t);
    // 3,3,4 -> 300/300/400
    await rq[2].click({ clickCount: 3 }); await p.keyboard.type('4');
    t = await p.evaluate(() => [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent)); ck(w + ' 3,3,4 -> 3.00/3.00/4.00', t.join() === '$3.00,$3.00,$4.00,$0.00', t);
    // off-increment and negative input rejected with Writer strings
    await rq[0].click({ clickCount: 3 }); await p.keyboard.type('2.5');
    t = await p.evaluate(() => document.getElementById('hh-msg').textContent + '|' + document.getElementById('share').disabled); ck(w + ' off-increment rejected', /Use steps of 1 “lb”/.test(t) && t.endsWith('true'), t);
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
    ck(w + ' link made + text proposal', /#s1\./.test(t.link) && t.hash.startsWith('#s1.') && /^Proposed split for “Jasmine rice” \(typed by the sender\)\n/.test(t.text) && /Unclaimed: 7 “lb”/.test(t.text), { len: t.link.length, toast: t.toast });
    // recipient opens the link in a fresh tab
    const q = await s.b.newPage(); await q.setViewport({ width: w, height: 800 }); const qerr = []; q.on('pageerror', e => qerr.push(String(e)));
    await q.goto(t.link || BASE, { waitUntil: 'load' }); await sleep(200);
    let r = await q.evaluate(() => ({ b: [...document.querySelectorAll('#banner > *')].filter(e => !e.hidden).map(e => e.textContent).join('\n'), pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), editor: document.getElementById('editor').hidden, recv: !document.getElementById('recv').hidden, from: document.getElementById('from').textContent, cap: document.getElementById('caption').textContent, assign: document.querySelectorAll('#assign button').length, buttons: [...document.querySelectorAll('#recv button')].filter(b => b.offsetParent).map(b => b.textContent) }));
    ck(w + ' recipient: read-only view, header + intro, sender text labelled (D4, scope a)', /^Proposed split\nThe sender's proposal, as it was when the link was made\.\nFrom the sender: “Jasmine rice”/.test(r.b) && !/proposed split for/i.test(r.b) && r.editor && r.recv && r.from === 'From the sender:' && r.cap === 'Households, as the sender typed them' && !r.assign && r.buttons.join() === 'Change my amount' && r.pays.join() === '$1.00,$1.00,$1.00,$7.00' && !qerr.length, r);
    await q.select('#pick', '1'); await sleep(50);
    r = await q.evaluate(() => ({ own: document.getElementById('owncost').textContent, you: !!document.querySelector('.ss-alloc.is-you') }));
    ck(w + ' recipient picks household -> own cost line', r.own === 'You take 1 “lb”: $1.00.' && r.you, r);
    await q.focus('#change'); await q.keyboard.press('Enter'); await sleep(50); await q.keyboard.press('Enter'); await sleep(80);
    r = await q.evaluate(() => ({ note: document.getElementById('changenote').textContent, vis: !document.getElementById('changebox').hidden, amt: document.getElementById('amt').textContent, was: { was: (document.querySelector('.ss-alloc.is-changed .qty') || { getAttribute: () => null }).getAttribute('data-was') }, pays: [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.querySelector('.tot').firstChild.textContent), hash: location.hash }));
    ck(w + ' Change my amount: changeNote once, stepper by keyboard, "was" marker, original link untouched', r.vis && r.note === "This makes a new link for you to send back. It doesn't change the sender's copy or tell them anything." && r.amt === '2 “lb”' && r.was && r.was.was === 'was 1 “lb”' && r.pays.join() === '$1.00,$2.00,$1.00,$6.00' && r.hash === new URL(t.link).hash, r);
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
    t = await p.evaluate(() => ({ b: document.querySelectorAll('#rows b').length, cell: document.querySelector('#rows .ss-alloc .who').textContent })); ck(w + ' text-safe', t.b === 0 && t.cell === '“<b>x</b>”', t); // D14: editor preview quotes typed names too
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
    // D2 (kept by D10-r5's wrap rule, no ellipsis): a 24-char single word that fits its cell stays whole on one line, shown in full
    await typeInto(p, '#item', 'Rice'); await typeInto(p, '#q', '10'); await typeInto(p, '#p', '10'); await typeInto(p, '#f', '');
    { const hn3 = await p.$$('#hh input:not(.sk-rq)'); await hn3[0].click({ clickCount: 3 }); await p.keyboard.type('Pneumonoultramicroscopic'); const rq3 = await p.$$('#hh input.sk-rq'); if (rq3[0]) { await rq3[0].click({ clickCount: 3 }); await p.keyboard.type('1'); } await sleep(80);
      const e2 = await p.evaluate(() => { const w = [...document.querySelectorAll('#rows .ss-alloc .who')].find(e => e.textContent === '“Pneumonoultramicroscopic”'); if (!w) return null; const r = document.createRange(); r.selectNodeContents(w); const cs = getComputedStyle(w), b = w.getBoundingClientRect(), rs = [...r.getClientRects()].filter(x => x.width > 0); const m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap'; m.textContent = w.textContent; w.appendChild(m); const ww = m.getBoundingClientRect().width; w.removeChild(m); return { wordW: Math.round(ww), fits: ww <= w.clientWidth + .5, lines: new Set(rs.map(x => Math.round(x.top))).size, ell: cs.textOverflow, ws: cs.whiteSpace, inBox: rs.every(a => a.left >= b.left - .5 && a.right <= b.right + .5), sw: w.scrollWidth, cw: w.clientWidth, text: w.textContent }; });
      ck(w + ' long single-word name: whole on one line wherever the word fits its (widened) cell, broken mid-word only when it cannot fit; no ellipsis, shown in full inside its cell (D2 + D10-r5)', e2 && (e2.fits ? e2.lines === 1 : e2.lines > 1) && (w >= 390 ? e2.fits : true) && e2.ell !== 'ellipsis' && e2.ws !== 'nowrap' && e2.inBox && e2.sw <= e2.cw + 1 && e2.text === '“Pneumonoultramicroscopic”', e2); }
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
    let t = await rowsOf(); ck('390 proportional: unclaimed shows cost + fee share; line from copy.v2', t.note === COPYV2.feeBasisLine.proportional && t.fees.join() === '$0.30,$0.30,$0.40' && t.tots.join() === '$3.30,$3.30,$4.40' && t.text.includes(COPYV2.feeBasisLine.proportional) && t.text.includes('Unclaimed: 4 “lb” · $4.40'), t);
    await p.focus('#be'); await p.keyboard.press('Enter'); await sleep(50); t = await rowsOf();
    ck('390 equal: fee across households only, unclaimed none; UI says so', t.note === COPYV2.feeBasisLine.equal && t.fees.join() === '$0.50,$0.50,$0.00' && t.tots.join() === '$3.50,$3.50,$4.00', t);
    { const rq = await p.$$('#hh input.sk-rq'); await typeInto(p, '#' + await rq[0].evaluate(e => e.id), '0'); await typeInto(p, '#' + await rq[1].evaluate(e => e.id), '0'); } await sleep(50); t = await rowsOf();
    ck('390 equal with nobody taking: errorFeeNoBasis, export blocked', t.status === COPYV2.errorFeeNoBasis && (await p.$eval('#share', e => e.disabled)), t);
    await p.focus('#bp'); await p.keyboard.press('Enter'); await sleep(50); t = await rowsOf(); ck('390 proportional with nobody taking: fee sits on Unclaimed', t.tots.join() === '$0.00,$0.00,$11.00', t);
    await typeInto(p, '#u', 'u'.repeat(17)); await typeInto(p, '#c', 'ABCDE'); await sleep(50);
    // The unit (16) and currency (3) inputs stop at their caps (counted like the link parser); a refused keystroke shows Writer's over-cap message with {max}
    { const body = await p.evaluate(() => document.body.innerText), uv = await p.$eval('#u', e => e.value), cv = await p.$eval('#c', e => e.value); ck('390 unit capped at 16 and currency at 3 in the inputs; the refused keystroke shows Writer copy with {max} (Unit: 16 … 1 over. / Currency: 3 … 1 over.)', uv === 'u'.repeat(16) && cv === 'ABC' && body.includes('Unit: 16 characters max. 1 over.') && body.includes('Currency: 3 characters max. 1 over.'), { uv, cv, msgs: body.match(/(Unit|Currency):[^\n]*/g) }); }
    ck('390 fee-mode checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // ---- QA recheck 83a2ebcd: D7 read-only recipient / no stray recipient panel for the sender, D8 nobasis message, D9 residual sentence vs math, D1b unbroken money
  const RICE = { n: 'Rice', u: 'lb', c: '$', q: '25', i: '0.5', p: '31.47', f: '2.99', b: 'p', x: -1, h: [['Ana', '8'], ['Unit 2B', '7.5'], ['Bao & Linh', '6']] };
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 800 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const vis = () => p.evaluate(() => { const v = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; return { inputs: [...document.querySelectorAll('input,select,textarea,button')].filter(v).map(e => e.id || e.className || e.tagName), editor: v(document.getElementById('editor')), recv: v(document.getElementById('recv')), pick: v(document.getElementById('pick')), change: v(document.getElementById('change')), reset: v(document.getElementById('reset')) }; });
    const hs = await reallyHidden(p, ['#recv', '#pick', '#change', '#changebox']); ck(w + ' D7 sender view rendered: recipient panel/picker/Change not rendered, not in a11y tree', hs.ok, hs);
    let o = await vis(); ck(w + ' D7 sender view: no household picker and no Change my amount', o.editor && !o.recv && !o.pick && !o.change && o.reset, o);
    const f = await p.evaluate(o => SACKLINK.encode(o), RICE); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(150);
    const nums = () => p.evaluate(() => [...document.querySelectorAll('#rows .ss-alloc')].map(r => r.textContent).join('|'));
    const n0 = await nums(); o = await vis();
    const editable = o.inputs.filter(x => !['pick', 'change', 'ss-btn', 'home'].includes(x) && !/^(BUTTON|A)$/.test(x));
    ck(w + ' D7 recipient view: editor and Clear the table not shown; only picker/Change are controls', !o.editor && o.recv && o.pick && o.change && !o.reset && !o.inputs.some(x => ['item', 'q', 'p', 'f', 'inc', 'u', 'c', 'add', 'reset', 'bp', 'be'].includes(x)) && !o.inputs.some(x => /ss-in|sk-/.test(x)), o);
    const hr = await reallyHidden(p, ['#editor', '#reset', '#add', '#item', '#q', '#p', '#f', '#bp', '#be', '#hh input']); ck(w + ' D7 recipient view rendered: editor, Clear the table, inputs not rendered, not in a11y tree', hr.ok, hr);
    const dom = await p.evaluate(() => ({ editable: [...document.querySelectorAll('input,textarea,select')].filter(e => !e.disabled && !e.readOnly).map(e => e.id || e.className), buttons: [...document.querySelectorAll('button')].filter(e => !e.disabled).map(e => e.id || e.className), hhRows: document.querySelectorAll('#hh li, #hh input').length, inert: document.getElementById('editor').inert }));
    ck(w + ' D7 recipient DOM (not just CSS): no editable editor inputs, no enabled Clear/add/remove/basis/export buttons, household editor not rendered, nothing inert', dom.editable.every(x => x === 'pick') && !dom.buttons.some(x => ['reset', 'add', 'bp', 'be', 'share', 'copytext', 'print'].includes(x) || /ss-x|sk-x/.test(x)) && dom.hhRows === 0 && !dom.inert, dom);
    // even forced input events on the hidden editor change nothing
    await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; set('q', '99'); set('p', '1.00'); document.querySelectorAll('#hh input').forEach(i => { i.value = '20'; i.dispatchEvent(new Event('input', { bubbles: true })); }); document.getElementById('add').click(); document.getElementById('be').click(); document.getElementById('reset').click(); });
    await sleep(100); const n1 = await nums(); const h1 = await p.evaluate(() => location.hash);
    ck(w + ' D7 recipient: forced edits/Clear on the hidden editor change no numbers and keep the link', n0 === n1 && h1 === '#' + f && /Ana/.test(n1) && /\$11\.02/.test(n1), { n0, n1 });
    await p.select('#pick', '0'); await sleep(50); await p.goto(BASE + '#', { waitUntil: 'load' }); await sleep(150);
    o = await vis(); const res = await p.evaluate(() => ({ own: document.getElementById('owncost').textContent, sel: document.getElementById('pick').options.length }));
    ck(w + ' D7 back to own view: no recipient residue (picker emptied, "you take" text cleared, panel hidden)', !o.recv && !o.pick && !o.change && res.own === '' && res.sel === 0, { o, res });
    // D9: sentence vs math (rice example: Unclaimed gets +2¢)
    await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(150);
    const d9 = await p.evaluate(st => { const c = SACK.compute(SACKLINK.toCompute(st)); const per = c.rows.map((r, i) => [st.h[i][0], r.extraCents]).concat([[COPY.unallocatedRow, c.unallocated.extraCents]]).filter(x => x[1]); return { per, line: document.getElementById('residual').textContent, total: per.reduce((a, x) => a + x[1], 0) }; }, RICE);
    const parsed = (d9.line.match(/: (.*)\.$/) || [])[1]; const pairs = parsed ? parsed.split(', ').map(x => { const m = x.match(/^(.*) (\d+)¢$/); return m ? [m[1].replace(/^“(.*)”$/, '$1'), +m[2]] : null; }) : null;
    const allOne = d9.per.every(x => x[1] === 1);
    ck(w + ' D9 leftover-cents sentence matches the per-row math (no "one each" unless every row got 1¢)', d9.per.some(x => x[1] === 2) && !/one each/.test(d9.line) && d9.line.startsWith(d9.total + ' extra cents') && JSON.stringify(pairs) === JSON.stringify(d9.per) && !allOne && d9.line.includes('“Unit 2B” 1¢') && d9.line.includes(' Unclaimed 2¢'), d9);
    // D8: equal fee, nobody takes any
    await p.goto(BASE + '#', { waitUntil: 'load' }); await sleep(100);
    await typeInto(p, '#item', 'Oats'); await typeInto(p, '#q', '10'); await typeInto(p, '#u', 'unit'); await typeInto(p, '#inc', '1'); await typeInto(p, '#p', '10.00'); await typeInto(p, '#f', '1.00'); await p.click('#be');
    const hh = await p.$$('#hh input'); await hh[0].type('A'); await hh[1].type('0'); await hh[2].type('B'); await hh[3].type('0'); await sleep(100);
    const d8 = await p.evaluate(() => ({ nr: document.getElementById('notready').textContent, st: document.getElementById('status').textContent, dis: document.getElementById('share').disabled }));
    ck(w + ' D8 equal fee with no takers: errorFeeNoBasis, never "Requests are 0 … over"', d8.nr === COPY.errorFeeNoBasis && !/over the package/.test(d8.nr + d8.st) && d8.dis, d8);
    // D1b: big values unbroken
    await p.goto(BASE + '#', { waitUntil: 'load' }); await sleep(100); await typeInto(p, '#item', 'Sand'); await typeInto(p, '#q', '100000'); await typeInto(p, '#u', 'lb'); await typeInto(p, '#inc', '1'); await typeInto(p, '#p', '9999999.99'); await typeInto(p, '#f', '100000.00');
    const hb = await p.$$('#hh input'); await hb[0].type('A'); await hb[1].type('50000'); await hb[2].type('B'); await hb[3].type('50000'); await sleep(120);
    const d1 = await p.evaluate(() => [...document.querySelectorAll('.ss-lcd .v, #rows .ss-alloc .tot, #rows .ss-alloc .m.fee, #rows .ss-alloc .qty')].filter(e => e.getClientRects().length).map(e => { const r = document.createRange(); r.selectNodeContents(e.firstChild || e); const ls = new Set([...r.getClientRects()].map(x => Math.round(x.top))); return { t: (e.firstChild || e).textContent, lines: ls.size }; }));
    { const qu = await p.evaluate(() => [...document.querySelectorAll('#rows .qu, .ss-wants .u')].filter(e => e.getClientRects().length).map(e => ({ t: e.textContent, lines: (r => { r.selectNodeContents(e.firstChild); return new Set([...r.getClientRects()].map(x => Math.round(x.bottom))).size; })(document.createRange()), rects: e.getClientRects().length, clip: e.scrollWidth > e.clientWidth + 1 }))); ck(w + ' D10: the quoted unit is never split or clipped (allocation rows, request rows)', qu.length && qu.every(x => x.lines <= 1 && x.rects === 1 && !x.clip), qu); }
    const of = await overflow(p);
    ck(w + ' D1b money/quantity values stay on one line (no mid-number wrap), no overflow', d1.length >= 6 && d1.every(x => x.lines === 1) && of.sw <= w && !of.bad.length, { d1, of });
    ck(w + ' QA-recheck checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-58436b3 N1 (same tab) + D10/D11/D12/D1c
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const fillSack = async p => { await typeInto(p, '#item', 'You owe me, deadbeat. Pay up'); await typeInto(p, '#q', '10'); await typeInto(p, '#inc', '1'); await typeInto(p, '#p', '20.00'); await typeInto(p, '#f', '1.00'); await typeInto(p, '#u', 'kg');
      await p.click('#be'); const hh = await p.$$('#hh input'); await hh[0].click({ clickCount: 3 }); await hh[0].type('Verified ✔ Bank'); await hh[1].click({ clickCount: 3 }); await hh[1].type('4'); await hh[2].click({ clickCount: 3 }); await hh[2].type('Kiwi Flat'); await hh[3].click({ clickCount: 3 }); await hh[3].type('3'); await sleep(80); };
    const r = await sameTabBadLink(p, { errSel: '#item-msg li, #hh-msg li, #change-err', bad: 's1.broken', fill: async p => { await typeInto(p, '#item', ''); await typeInto(p, '#q', 'x'); await fillSack(p); },
      link: async p => { await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.click('#share'); await sleep(200); return p.$eval('#link', e => e.value); } });
    ck(w + ' N1 same tab: bad link after fill + link + open shows zero validation errors', r.ok, r);
    await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(120); await fillSack(p);
    const txt = await p.$eval('#text', e => e.value); await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.click('#share'); await sleep(200); const url = await p.$eval('#link', e => e.value);
    ck(w + ' D10 copy-as-text: household names quoted + attributed (textNamesTyped)', txt.split('\n')[0] === 'Proposed split for “You owe me, deadbeat. Pay up” (typed by the sender)' && txt.split('\n')[1] === 'Household names are as typed by the sender.' && txt.split('\n').filter(l => l === 'Household names are as typed by the sender.').length === 1 && (await p.$eval('#printout', e => e.textContent)).startsWith('Proposed split for “You owe me, deadbeat. Pay up” (typed by the sender)\nHousehold names are as typed by the sender.\n') && /\n“Verified ✔ Bank”: 4 “kg” · /.test(txt) && /\n“Kiwi Flat”: 3 “kg” · /.test(txt), txt);
    await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(200);
    const rv = await p.evaluate(() => { const sn = document.getElementById('sname'), ty = sn.querySelector('.mill-typed'), stp = sn.querySelector('.ss-step');
      return { typed: ty && ty.textContent, tt: ty && getComputedStyle(ty).textTransform, step: stp && stp.textContent, sep: ty && stp ? stp.getBoundingClientRect().top >= ty.getBoundingClientRect().bottom - 1 : false,
        cells: [...document.querySelectorAll('#rows .ss-alloc .who')].map(e => e.textContent), opts: [...document.getElementById('pick').options].map(o => o.textContent) }; });
    ck(w + ' D11 recipient item: quoted typed text (no uppercase), the app\'s step line on its own line', rv.typed === '“You owe me, deadbeat. Pay up”' && rv.tt === 'none' && rv.step === 'Split in steps of 1 “kg”' && rv.sep, rv);
    ck(w + ' D12 recipient table + picker quote typed household names', rv.cells.includes('“Verified ✔ Bank”') && rv.cells.includes('“Kiwi Flat”') && rv.opts.includes('“Verified ✔ Bank”') && rv.opts.includes('“Kiwi Flat”'), rv);
    await p.select('#pick', await p.evaluate(() => [...document.getElementById('pick').options].find(o => o.textContent === '“Kiwi Flat”').value)); await sleep(80); await p.click('#change'); await sleep(120);
    const ar = await p.evaluate(() => ({ down: document.getElementById('down').getAttribute('aria-label'), up: document.getElementById('up').getAttribute('aria-label') }));
    ck(w + ' D13 change mode: −/+ accessible names quote the typed household ("Less for “Kiwi Flat”")', ar.down === 'Less for “Kiwi Flat”' && ar.up === 'More for “Kiwi Flat”', ar);
    const au = await typedAudit(p, ['Verified ✔ Bank', 'Kiwi Flat', 'You owe me, deadbeat. Pay up']); ck(w + ' D13 change mode: typedAudit (screen, aria, describedby, live regions, options, toast) finds no unquoted household or item', au.ok, au);
    for (const [nm, price] of [['100000', '100000.00'], ['app max', '9999999.99']]) {
      await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100); await typeInto(p, '#item', 'Rice'); await typeInto(p, '#q', '100000'); await typeInto(p, '#p', price); await typeInto(p, '#f', price); await sleep(60);
      const b = await p.evaluate(() => { const pan = document.querySelector('.ss-lcd').getBoundingClientRect(); return ['lcd-p', 'lcd-f', 'lcd-q'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(document.getElementById(id)); const tr = rg.getBoundingClientRect(); return { id, txt: document.getElementById(id).textContent, inside: tr.right <= pan.right - 2 && tr.left >= pan.left + 2 && tr.right <= r.right + 0.5 && tr.left >= r.left - 0.5, cr: Math.round(r.right), tr: Math.round(tr.right), pr: Math.round(pan.right) }; }); });
      ck(w + ' D1c/D13 LCD money ' + nm + ' ($' + price + ') sits inside the panel and inside its own cell', b.every(x => x.inside) && b[0].txt.includes(price), b);
    }
    await s.b.close(); }
  // QA local-7b5ceeb D14: the SENDER editor quotes typed names too (× aria, validation messages, Give to buttons, preview)
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    await typeInto(p, '#item', 'Zqx rice'); await typeInto(p, '#q', '10'); await typeInto(p, '#inc', '1'); await typeInto(p, '#p', '20.00'); await typeInto(p, '#f', '1.00'); await typeInto(p, '#u', 'kg');
    let hh = await p.$$('#hh input'); await hh[0].click({ clickCount: 3 }); await hh[0].type('Zqx Ana'); await hh[1].click({ clickCount: 3 }); await hh[1].type('4'); await hh[2].click({ clickCount: 3 }); await hh[2].type('Zqx Ben'); await hh[3].click({ clickCount: 3 }); await hh[3].type('3'); await sleep(100);
    let r = await p.evaluate(() => ({ x: [...document.querySelectorAll('#hh .sk-x')].map(e => e.getAttribute('aria-label')), give: [...document.querySelectorAll('#assign button, .ss-assign button')].map(e => e.textContent) }));
    ck(w + ' D14 editor: × aria-labels quote the typed household', r.x.includes(M_fill(COPY.removeHousehold, '“Zqx Ana”')) && r.x.includes(M_fill(COPY.removeHousehold, '“Zqx Ben”')), r);
    let a = await typedAudit(p, ['Zqx rice', 'Zqx Ana', 'Zqx Ben']); ck(w + ' D14 editor with leftover (Give to buttons): typedAudit (screen, aria, describedby, live, options, toast) finds nothing unquoted', a.ok && r.give.some(t => t.includes('“Zqx Ana”')), { a, give: r.give });
    await p.click('#add'); await sleep(80); hh = await p.$$('#hh input'); await hh[4].click({ clickCount: 3 }); await hh[4].type('Zqx Cy with a long name'); await hh[5].click({ clickCount: 3 }); await hh[5].type('abc'); await hh[1].click({ clickCount: 3 }); await hh[1].type('4.5'); await p.keyboard.press('Tab'); await sleep(150);
    const msgs = await p.evaluate(() => [...document.querySelectorAll('#hh-msg li')].map(e => e.textContent));
    a = await typedAudit(p, ['Zqx rice', 'Zqx Ana', 'Zqx Ben', 'Zqx Cy with a long name']);
    ck(w + ' D14 editor validation messages name the household quoted ("“Zqx Ana”: …")', msgs.length >= 2 && msgs.some(m => m.startsWith('“Zqx Ana”: ')) && msgs.some(m => m.startsWith('“Zqx Cy with a long name”: ')) && a.ok, { msgs, a });
    ck(w + ' D14 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA D10 reopened (PM): the free-text unit is quoted everywhere it is displayed: row unit spans, request aria, error/increment
  // messages, LCD, status, reconcile, assign, notready, copy text, changedWas, answer amount label, amount and print.
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.evaluateOnNewDocument(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    const UN = 'Zqx bag', US = '\u201Cbags\u201D', all = async (seeds, extra = {}) => { await p.emulateMediaType('print'); const pr = await p.evaluate(() => document.body.innerText); await p.emulateMediaType(null); const clip = await p.evaluate(() => window.__clip.slice()); return typedAudit(p, seeds, Object.assign({ print: pr }, extra, Object.fromEntries(clip.map((c, i) => ['clipboard#' + i, c])))); };
    // sender editor: short (over), unallocated, off-increment, exact, copy text
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    for (const [id, v] of [['item', 'Rice'], ['q', '10'], ['u', UN], ['inc', '1'], ['p', '10.00']]) await typeInto(p, '#' + id, v);
    const nn = await p.evaluate(() => [...document.querySelectorAll('.ss-hn')].map(e => '#' + e.id)); for (let i = 0; i < nn.length; i++) await typeInto(p, nn[i], ['Ana', 'Bo', 'Cy', 'Di'][i] || 'H' + i);
    const ids = await p.evaluate(() => [...document.querySelectorAll('.sk-rq')].map(e => '#' + e.id));
    const fillRows = async vals => { for (let i = 0; i < vals.length; i++) await typeInto(p, ids[i], vals[i]); await sleep(80); };
    for (const [tag, vals] of [['over', ['6', '6']], ['unallocated', ['3', '3']], ['off-increment', ['2.5', '3']], ['exact', ['4', '6', '0', '0'].slice(0, ids.length)]]) { await fillRows(vals);
      const a = await all([UN]); const seen = await p.evaluate(u => document.body.innerText.includes('\u201C' + u + '\u201D'), UN);
      ck(w + ' D10 sender editor (' + tag + '): unit quoted everywhere (screen, aria, messages, LCD, status, reconcile, assign, notready, print)', a.ok && seen, a.hits); }
    { const ra = await p.evaluate(() => [...document.querySelectorAll('.sk-rq')].map(e => e.getAttribute('aria-label'))); ck(w + ' D10 request aria names the quoted unit', ra.every(x => x.includes('\u201CZqx bag\u201D')), ra); }
    await p.click('#share'); await sleep(200); const url = await p.$eval('#link', e => e.value);
    await p.evaluate(() => { window.__clip = []; }); for (const b of ['#copytext', '#b-text', '#b-copy']) if (await p.$(b) && await p.$eval(b, e => !e.disabled && e.getClientRects().length > 0)) { await p.click(b); await sleep(100); }
    { const a = await all([UN]); ck(w + ' D10 copy text / clipboard: unit quoted', a.ok, a.hits); }
    // recipient: pick, amount label, own cost, change my amount (changedWas), print
    await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(250); await p.select('#pick', '0'); await sleep(120);
    { const a = await all([UN]); const amt = await p.$eval('#amt-l', e => e.textContent); ck(w + ' D10 recipient: answer amount label, own cost, LCD quoted', a.ok && amt.includes('\u201CZqx bag\u201D'), { amt, hits: a.hits }); }
    if (await p.$('#change') && await p.$eval('#change', e => e.getClientRects().length > 0 && !e.disabled)) { await p.click('#change'); await sleep(150); await p.focus('#up'); await p.keyboard.press('Enter'); await sleep(120);
      const a = await all([UN]); const was = await p.evaluate(() => document.body.innerText); ck(w + ' D10 change my amount: changedWas + amount quoted', a.ok && /\u201CZqx bag\u201D/.test(was), a.hits); }
    // Q1: a unit carrying curly quotes is neutralised inside the frame; the link keeps it
    const f = await p.evaluate(u => SACKLINK.encode({ n: 'Rice', u, c: '$', q: '10', i: '1', p: '10', f: '', b: 'p', x: -1, h: [['Ana', '4'], ['Bo', '3']] }), US);
    await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(250); await p.select('#pick', '0'); await sleep(120);
    { const a = await all([US]); ck(w + ' D10 + Q1: spoof unit shown as \u201C"bags"\u201D everywhere, link keeps the marks', a.ok && f.length > 0, a.hits); }
    ck(w + ' D10 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-a254042 D10-r1 / D10-r2 (PM wrap rule): a quoted unit breaks at spaces, then hyphens, and mid-word only if one word can't fit
  // its box at all. Max-length units (16 = UNIT_MAX) in the sender LCD, household Wants rows, recipient LCD and Change my amount at every width:
  // line boxes measured per character (Range.getClientRects); no page overflow; −/+, error and footer inside the viewport; unit input capped at 16.
  {
    const SCAN = (units) => { const out = []; const vis = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = tw.nextNode())) { if (!vis(n.parentElement) || n.parentElement.closest('textarea,option,select,script,style,.ss-print-only')) continue;
        for (const u of units) { const tok = '\u201C' + u + '\u201D'; let at = n.data.indexOf(tok); if (at < 0) continue;
          const ch = []; for (let i = at; i < at + tok.length; i++) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const rs = [...r.getClientRects()].filter(x => x.width > 0); if (rs.length) ch.push({ i, top: Math.round(rs[0].top) }); }
          const br = []; for (let k = 1; k < ch.length; k++) if (ch[k].top > ch[k - 1].top + 2) { const gap = n.data.slice(ch[k - 1].i, ch[k].i); br.push(/\s/.test(gap) ? 'space' : /[-\u2010]/.test(n.data[ch[k - 1].i]) ? 'hyphen' : 'mid'); }
          out.push({ where: (n.parentElement.id || n.parentElement.className || n.parentElement.tagName) + '', u, breaks: br }); } }
      return out; };
    const SW = 'abcdefghijklmnop', MW = 'family size bags', HY = 'extra-large-bags';
    const fit = p => p.evaluate(() => { const vw = document.documentElement.clientWidth, R = e => e ? e.getBoundingClientRect() : null, inV = r => !!r && r.width > 0 && r.left >= -1 && r.right <= vw + 1;
      const foot = document.querySelector('#recv > .ss-fine:last-of-type'), rg = document.createRange(); if (foot) rg.selectNodeContents(foot);
      const err = document.getElementById('change-err'), er = document.createRange(); er.selectNodeContents(err);
      return { sw: document.documentElement.scrollWidth, vw, up: inV(R(document.getElementById('up'))), down: inV(R(document.getElementById('down'))), err: err.textContent, errIn: [...er.getClientRects()].every(inV), footIn: foot ? [...rg.getClientRects()].every(inV) : null, footText: foot ? foot.textContent.slice(-20) : '' }; });
    const setForm = (p, st) => p.evaluate(st => { const set = (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, g = id => document.getElementById(id);
      set(g('item'), st.n); set(g('q'), st.q); set(g('u'), st.u); set(g('inc'), st.i); set(g('p'), st.p); set(g('f'), st.f); while (document.querySelectorAll('.ss-hn').length < st.h.length) g('add').click();
      const hn = document.querySelectorAll('.ss-hn'), rq = document.querySelectorAll('.sk-rq'); st.h.forEach((h, i) => { set(hn[i], h[0]); set(rq[i], h[1]); }); }, st);
    for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 800 });
      for (const u of [SW, MW, HY]) { const tag = u === SW ? '16-char single word' : u === MW ? '16-char multi-word' : '16-char hyphenated';
        const st = { n: 'Rice', u, c: '$', q: '10', i: '1', p: '20.00', f: '1.00', b: 'p', x: -1, h: [['Ana', '3'], ['Bo', '3'], ['Cy', '2']] };
        await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(120); await setForm(p, st); await sleep(150);
        const okBreaks = x => x.breaks.every(b => b !== 'mid') && (x.u !== SW || !x.breaks.length);
        let sc = await p.evaluate(SCAN, [u]); let pick = k => sc.filter(x => x.where === k);
        const lcd = pick('unit'), wants = pick('u sk-unit');
        ck(w + ' D10-r1 sender LCD (' + tag + '): unit ' + (u === SW ? 'stays whole on one line' : 'breaks only at spaces/hyphens, never mid-word'), lcd.length === 1 && lcd.every(okBreaks), lcd);
        ck(w + ' D10-r1 sender household Wants rows (' + tag + '): ' + (u === SW ? 'unit stays whole' : 'no mid-word break'), wants.length === 3 && wants.every(okBreaks), wants);
        ck(w + ' D10-r1 sender (' + tag + '): every displayed quoted unit (LCD, rows, step line, status, table) has no mid-word break' + (u === SW ? ', single word never broken' : ''), sc.length >= 6 && sc.every(okBreaks), sc.filter(x => !okBreaks(x)));
        const wr = await p.evaluate(() => { const li = document.querySelector('.ss-hrow'), u = li.querySelector('.u'), x = li.querySelector('.ss-x'), r = document.createRange(); r.selectNodeContents(u); const ur = [...r.getClientRects()], xr = x.getBoundingClientRect(), lr = li.getBoundingClientRect(); return { inside: ur.every(t => t.left >= lr.left && t.right <= lr.right), clearX: ur.every(t => t.right <= xr.left || t.left >= xr.right || t.bottom <= xr.top || t.top >= xr.bottom) }; });
        ck(w + ' D10-r1 sender Wants row (' + tag + '): unit inside the row and clear of the × button', wr.inside && wr.clearX, wr);
        let f0 = await fit(p); ck(w + ' D10-r2 sender (' + tag + '): document scrollWidth <= viewport', f0.sw <= f0.vw, f0);
        const link = await p.evaluate(st => SACKLINK.encode(st), st);
        await p.goto('about:blank'); await p.goto(BASE + '#' + link, { waitUntil: 'load' }); await sleep(150);
        sc = await p.evaluate(SCAN, [u]); pick = k => sc.filter(x => x.where === k);
        ck(w + ' D10-r1 recipient LCD (' + tag + '): ' + (u === SW ? 'unit stays whole' : 'no mid-word break'), pick('unit').length === 1 && pick('unit').every(okBreaks), pick('unit'));
        ck(w + ' D10-r1 recipient view (' + tag + '): no displayed quoted unit breaks mid-word', sc.length >= 4 && sc.every(okBreaks), sc.filter(x => !okBreaks(x)));
        f0 = await fit(p); ck(w + ' D10-r2 recipient view (' + tag + '): document scrollWidth <= viewport', f0.sw <= f0.vw, f0);
        await p.select('#pick', '1'); await sleep(60); await p.click('#change'); await sleep(80); for (let k = 0; k < 3; k++) { await p.click('#up'); await sleep(60); }
        sc = await p.evaluate(SCAN, [u]); pick = k => sc.filter(x => x.where === k);
        const amt = await p.$eval('#amt', e => e.textContent);
        ck(w + ' D10-r1 Change my amount (' + tag + '): amount "6 \u201C…\u201D" ' + (u === SW ? 'keeps the unit whole' : 'never breaks mid-word') + ', label and error too', amt === '6 \u201C' + u + '\u201D' && pick('unit').length >= 2 && sc.every(okBreaks), { amt, sc });
        f0 = await fit(p);
        ck(w + ' D10-r2 Change my amount (' + tag + '): scrollWidth <= viewport; −, +, over-package error and footer inside the viewport', f0.sw <= f0.vw && f0.up && f0.down && /over the package/.test(f0.err) && f0.errIn && f0.footIn === true, f0);
        await p.click('#cancel'); await sleep(60);
      }
      // PM: a hyphenated unit breaks at the hyphen before any mid-word break (same CSS as the LCD unit, in a box too narrow for the whole token)
      { await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
        const hy = await p.evaluate((HY, SW) => { const lcd = document.querySelector('.ss-lcd'), mk = (t, wpx) => { const v = document.createElement('span'); v.className = 'v'; v.style.cssText = 'grid-column:1/-1;width:' + wpx + 'px'; const u = document.createElement('span'); u.className = 'unit'; u.textContent = t; v.appendChild(u); lcd.appendChild(v); return { v, u }; };
          const lines = (u, t) => { const n = u.firstChild, ch = []; for (let i = 0; i < t.length; i++) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const rs = [...r.getClientRects()].filter(x => x.width > 0); if (rs.length) ch.push({ i, top: Math.round(rs[0].top) }); } const br = []; for (let k = 1; k < ch.length; k++) if (ch[k].top > ch[k - 1].top + 2) br.push(/[-]/.test(t[ch[k - 1].i]) ? 'hyphen' : /\s/.test(t.slice(ch[k - 1].i, ch[k].i)) ? 'space' : 'mid'); return br; };
          const a = mk('\u201C' + HY + '\u201D', 90), b = mk('\u201C' + SW + '\u201D', 60), cs = getComputedStyle(a.u);
          const out = { hy: lines(a.u, a.u.textContent), sw: lines(b.u, b.u.textContent), wrap: cs.overflowWrap, wb: cs.wordBreak, swInside: b.u.getBoundingClientRect().right <= b.v.getBoundingClientRect().right + 1 }; a.v.remove(); b.v.remove(); return out; }, HY, SW);
        ck(w + ' D10-r1 PM rule: overflow-wrap break-word (not anywhere/break-all); hyphenated unit in a narrow box breaks at its hyphens, no mid-word; a word that cannot fit at all breaks rather than overflow', hy.wrap === 'break-word' && hy.wb === 'normal' && hy.hy.length >= 1 && hy.hy.every(b => b === 'hyphen') && hy.sw.includes('mid') && hy.swInside, hy); }
      // D10-r2: the unit input takes at most 16 characters: maxlength, typing, paste (insertText), script-set value; no "over" error reachable
      { await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
        await typeInto(p, '#u', 'abcdefghijklmnopq'); const typed = await p.$eval('#u', e => e.value);
        await p.$eval('#u', e => { e.focus(); e.select(); }); await p.evaluate(() => document.execCommand('insertText', false, 'abcdefghijklmnopqrstuvwxyz012345')); await sleep(50); const pasted = await p.$eval('#u', e => e.value);
        await p.evaluate(() => { const e = document.getElementById('u'); e.removeAttribute('maxlength'); e.value = 'large family size bags of grains'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(50);
        const forced = await p.evaluate(() => ({ v: document.getElementById('u').value, body: document.body.innerText }));
        await p.reload({ waitUntil: 'load' }); await sleep(100); const ml = await p.$eval('#u', e => e.hasAttribute('maxlength') ? e.maxLength : 'none');
        const f1 = await fit(p);
        ck(w + ' D10-r2 unit input rejects more than 16 characters (no code-unit maxlength; typed 17 -> 16; pasted 32 -> 16; script-set 32 without maxlength -> 16 by validation); the cut shows "Unit: 16 characters max. 16 over."; no overflow', ml === 'none' && typed === 'abcdefghijklmnop' && pasted === 'abcdefghijklmnop' && forced.v === 'large family siz' && forced.body.includes('Unit: 16 characters max. 16 over.') && forced.body.includes('\u201Clarge family siz\u201D') && f1.sw <= f1.vw, { ml, typed, pasted, forced: forced.v }); }
      // Unit cap counts like the link parser (grapheme clusters): 16 emoji incl. ZWJ / flag / tag-flag / keycap sequences can be TYPED, a 17th
      // character is refused (typed, pasted, mid-text insert), 'abcdefghijklmnop' is unchanged, and the emoji unit survives a link round-trip.
      { const EMO = ['👨‍👩‍👧‍👦', '🏳️‍🌈', '🇯🇵', '🇺🇦', '👩🏽‍💻', '😀', '❤️', '🧑‍🤝‍🧑', '🇬🇧', '👍🏿', '🐈‍⬛', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '1️⃣', '🫶', '🇨🇦', '🦊'], EU = EMO.join('');
        await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
        await typeInto(p, '#u', EU); await sleep(50); const typed = await p.$eval('#u', e => e.value);
        await p.keyboard.type('x'); await sleep(30); const after17 = await p.$eval('#u', e => e.value), msg17 = await p.$eval('#item-msg', e => e.textContent);
        await p.keyboard.type('🇫🇷'); await sleep(30); const afterFlag = await p.$eval('#u', e => e.value);
        await p.$eval('#u', e => { e.focus(); e.setSelectionRange(4, 4); }); await p.evaluate(() => document.execCommand('insertText', false, 'zz')); await sleep(30); const afterMid = await p.$eval('#u', e => e.value);
        await p.$eval('#u', e => { e.focus(); e.select(); }); await p.evaluate(t => document.execCommand('insertText', false, t), EU + 'abc'); await sleep(30); const afterPaste = await p.$eval('#u', e => e.value);
        const drop = await p.evaluate(t => { const e = document.getElementById('u'); e.value = t; e.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromDrop' })); return e.value; }, '🦊'.repeat(20));
        await typeInto(p, '#u', EU); await sleep(30);
        const st = { n: 'Rice', u: EU, c: '$', q: '10', i: '1', p: '20.00', f: '1.00', b: 'p', x: -1, h: [['Ana', '3'], ['Bo', '3'], ['Cy', '2']] };
        await setForm(p, { ...st, u: (await p.$eval('#u', e => e.value)) }); await sleep(100);
        const sv = await p.evaluate(() => ({ err: document.getElementById('item-msg').textContent, lcd: (document.querySelector('#lcd-q .unit') || {}).textContent, share: document.getElementById('share').disabled }));
        await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
        await p.click('#share'); await sleep(200); const link = await p.$eval('#link', e => e.value);
        await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(200);
        const rv = await p.evaluate(() => { const d = SACKLINK.decode(location.hash); return { ok: d.ok, u: d.ok && d.data.u, recv: !document.getElementById('recv').hidden, lcd: (document.querySelector('#lcd-q .unit') || {}).textContent, banner: document.getElementById('banner').innerText }; });
        await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100); await typeInto(p, '#u', 'abcdefghijklmnop'); const abc = await p.$eval('#u', e => e.value); await p.keyboard.type('q'); const abc17 = await p.$eval('#u', e => e.value);
        ck(w + ' unit cap = link parser count: 16 emoji (ZWJ, flags, tag flag, keycap) typed in full; 17th char refused when typed, as a flag, mid-text insert, paste and drop; no unit error', typed === EU && after17 === EU && msg17.includes('Unit: 16 characters max. 1 over.') && afterFlag === EU && afterMid === EU && afterPaste === EU && drop === '🦊'.repeat(16) && !/Unit:/.test(sv.err) && sv.lcd === '\u201C' + EU + '\u201D' && !sv.share, { typed: typed === EU, after17: after17 === EU, msg17, afterFlag: afterFlag === EU, afterMid: afterMid === EU, afterPaste: afterPaste === EU, dropLen: [...drop].length, sv });
        ck(w + ' unit cap: the 16-emoji unit survives a link round-trip (link made, decodes, recipient view shows it quoted)', /#s1\./.test(link) && rv.ok && rv.u === EU && rv.recv && rv.lcd === '\u201C' + EU + '\u201D' && !/damaged/.test(rv.banner), { link: link.length, rv: { ok: rv.ok, same: rv.u === EU, recv: rv.recv } });
        ck(w + " unit cap: 'abcdefghijklmnop' typed unchanged, a 17th letter refused", abc === 'abcdefghijklmnop' && abc17 === 'abcdefghijklmnop', { abc, abc17 }); }
      // Remaining caps count like the link parser too: item 40, household name 24, currency 3, all in grapheme clusters. Typed to the cap
      // with ZWJ/flag/keycap sequences, one more refused (typed, pasted, script-set), no limit error, and every capped value survives a link round-trip.
      { const EMO = ['👨‍👩‍👧‍👦', '🏳️‍🌈', '🇯🇵', '🇺🇦', '👩🏽‍💻', '😀', '❤️', '🧑‍🤝‍🧑', '🇬🇧', '👍🏿', '🐈‍⬛', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '1️⃣', '🫶', '🇨🇦', '🦊'], E = k => Array.from({ length: k }, (_, i) => EMO[i % EMO.length]).join('');
        const IT = E(40), NM1 = E(24), NM2 = 'Bo' + E(22), CU = '🇪🇺€£';
        await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
        const nameSel = await p.evaluate(() => '#' + document.querySelector('.ss-hn').id);
        const capRun = async (sel, val, extra) => { await typeInto(p, sel, val); await sleep(30); const typed = await p.$eval(sel, e => e.value); await p.keyboard.type(extra); await sleep(30); const after = await p.$eval(sel, e => e.value);
          await p.$eval(sel, e => { e.focus(); e.select(); }); await p.evaluate(t => document.execCommand('insertText', false, t), val + extra + extra); await sleep(30); const pasted = await p.$eval(sel, e => e.value), pmsg = await p.evaluate(() => document.getElementById('item-msg').textContent + '|' + document.getElementById('hh-msg').textContent);
          const forced = await p.evaluate((sel, t) => { const e = document.querySelector(sel); e.value = t; e.dispatchEvent(new Event('input', { bubbles: true })); return e.value; }, sel, val + extra);
          const ml = await p.$eval(sel, e => e.hasAttribute('maxlength')); const fmsg = await p.evaluate(() => document.getElementById('item-msg').textContent + '|' + document.getElementById('hh-msg').textContent); return { typed: typed === val, after: after === val, pasted: pasted === val, forced: forced === val, noMaxlength: !ml, pmsg, fmsg }; };
        const it = await capRun('#item', IT, '🇫🇷'), nm = await capRun(nameSel, NM1, 'x'), cu = await capRun('#c', CU, '$');
        const ascii = { item: await capRun('#item', 'i'.repeat(40), 'j'), name: await capRun(nameSel, 'n'.repeat(24), 'm'), cur: await capRun('#c', 'ABC', 'D') };
        const okRun = r => r.typed && r.after && r.pasted && r.forced && r.noMaxlength;
        const MSG = { item: n => 'What is it? ' + n + ' characters over.'.replace(/^1 characters/, '1 character'), cur: n => 'Currency: 3 characters max. ' + n + ' over.', name: n => ': ' + (n === 1 ? '1 character over.' : n + ' characters over.') };
        const okMsg = (r, k) => r.pmsg.includes(MSG[k](2)) && r.fmsg.includes(k === 'item' ? 'What is it? 1 character over.' : MSG[k](1));
        const st = { n: IT, u: 'kg', c: CU, q: '10', i: '1', p: '20.00', f: '1.00', b: 'p', x: -1, h: [[NM1, '3'], [NM2, '3']] };
        await setForm(p, st); await p.evaluate(c => { const e = document.getElementById('c'); e.value = c; e.dispatchEvent(new Event('input', { bubbles: true })); }, CU); await sleep(120);
        const sv = await p.evaluate(() => ({ errs: document.getElementById('item-msg').textContent + document.getElementById('hh-msg').textContent, share: document.getElementById('share').disabled, vals: [document.getElementById('item').value, document.getElementById('c').value].concat([...document.querySelectorAll('.ss-hn')].map(e => e.value)) }));
        await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
        await p.click('#share'); await sleep(200); const link = await p.$eval('#link', e => e.value);
        await p.goto('about:blank'); await p.goto(link || BASE, { waitUntil: 'load' }); await sleep(200);
        const rv = await p.evaluate(() => { const d = SACKLINK.decode(location.hash); return { ok: d.ok, d: d.ok ? { n: d.data.n, c: d.data.c, h: d.data.h.map(x => x[0]) } : null, recv: !document.getElementById('recv').hidden, cells: [...document.querySelectorAll('#rows .ss-alloc .who')].map(e => e.textContent), lcd: document.getElementById('lcd-p').textContent }; });
        ck(w + ' caps count like the link parser: item 40 / name 24 / currency 3 graphemes (ZWJ, flags, keycaps) typed in full, one more refused typed + pasted + script-set, no maxlength', okRun(it) && okRun(nm) && okRun(cu), { it, nm, cu });
        ck(w + ' caps: a cut edit is never silent: Writer over-cap message for item / household / currency (pasted 2 over, script-set 1 over), same wording as the validator', okMsg(it, 'item') && okMsg(nm, 'name') && okMsg(cu, 'cur') && okMsg(ascii.item, 'item') && okMsg(ascii.name, 'name') && okMsg(ascii.cur, 'cur'), { it: [it.pmsg, it.fmsg], nm: [nm.pmsg, nm.fmsg], cu: [cu.pmsg, cu.fmsg] });
        ck(w + ' caps: ASCII at the cap unchanged (item 40, name 24, currency ABC), one more letter refused', okRun(ascii.item) && okRun(ascii.name) && okRun(ascii.cur), ascii);
        ck(w + ' caps: capped item, names and currency make a link; over-cap messages cleared by the next edit that fits', !/characters? (max|over)|too long/i.test(sv.errs) && !sv.share && sv.vals.join('|') === [IT, CU, NM1, NM2].join('|') && /#s1\./.test(link), { errs: sv.errs, share: sv.share });
        ck(w + ' caps: capped item, names and currency survive the link round-trip (decode + recipient view)', rv.ok && rv.d.n === IT && rv.d.c === CU && rv.d.h.join('|') === [NM1, NM2].join('|') && rv.recv && rv.cells.includes('\u201C' + NM1 + '\u201D') && rv.cells.includes('\u201C' + NM2 + '\u201D') && rv.lcd.startsWith(CU), { ok: rv.ok, recv: rv.recv, lcd: rv.lcd }); }
      ck(w + ' D10-r1/r2 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  }
  // QA local-7dfd6ac D10-r3: allocation-table unit at a 305px layout (320 desktop window with a scrollbar), 320, 390 and 1280: the quoted unit stays inside its
  // quantity cell (rows and "Adds up"), never overlaps the fee or other row text, and a single word isn't broken; sender and recipient views.
  for (const w of [305, 320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    for (const u of ['abcdefghijklmnop', 'family size bags', 'kg']) {
      await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(80);
      const st = { n: 'Rice', u, c: '$', q: '10', i: '1', p: '20.00', f: '1.00', b: 'p', x: -1, h: [['Ana', '3'], ['Bo', '3'], ['Cy', '2']] };
      for (const view of ['sender', 'recipient']) {
        if (view === 'sender') await p.evaluate(st => { const set = (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, g = id => document.getElementById(id); set(g('item'), st.n); set(g('q'), st.q); set(g('u'), st.u); set(g('p'), st.p); set(g('f'), st.f); g('add').click(); const hn = document.querySelectorAll('.ss-hn'), rq = document.querySelectorAll('.sk-rq'); st.h.forEach((h, i) => { set(hn[i], h[0]); set(rq[i], h[1]); }); }, st);
        else { const f = await p.evaluate(st => SACKLINK.encode(st), st); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); }
        await sleep(150);
        const r = await p.evaluate(() => { const out = [], R = e => { const g = document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()].filter(x => x.width > 0); };
          document.querySelectorAll('#rows .ss-alloc, #rows .ss-sum').forEach(row => { const q = row.querySelector('.qu'); if (!q) return; const cell = q.parentElement.getBoundingClientRect(), qr = R(q), rowR = row.getBoundingClientRect();
            const others = [...row.children].filter(c => c !== q.parentElement && c.getClientRects().length).flatMap(R);
            const overlap = qr.some(a => others.some(o => a.left < o.right - .5 && o.left < a.right - .5 && a.top < o.bottom - .5 && o.top < a.bottom - .5));
            out.push({ row: row.className.replace('ss-', ''), inCell: qr.every(a => a.left >= cell.left - .5 && a.right <= cell.right + .5), inRow: qr.every(a => a.right <= rowR.right + .5), lines: new Set(qr.map(a => Math.round(a.top))).size, overlap }); });
          return { rows: out, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }; });
        const single = !/ /.test(u);
        ck(w + ' D10-r3 ' + view + ' table unit ' + JSON.stringify(u) + ': inside its quantity cell in every row and Adds up, no overlap with the fee or other text' + (single ? ', not broken' : '') + ', no page overflow', r.rows.length === 5 && r.rows.every(x => x.inCell && x.inRow && !x.overlap && (!single || x.lines === 1)) && r.sw <= r.vw, r);
      }
    }
    ck(w + ' D10-r3 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // QA local-d8d1dce D10-r5: household names at the 24-grapheme cap (QA's sets + combined emoji / hyphens / one long word) are never cut with an ellipsis or
  // clipped: sender, sender print, recipient, change, recipient print, at 305/320/390/600/1280. The full quoted name is visible inside its cell and the
  // viewport, nothing overlaps it, and a piece of the name that fits its cell (split at spaces and after hyphens) is never broken mid-word (old D2).
  { const FAM = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
    const SETS = { family: ['A' + FAM.repeat(23), 'B' + FAM.repeat(23), 'Cy'], latin: ['Wwwwwwwwwwwwwwwwwwwwwwww', 'Mmmmmmmmmmmmmmmmmmmmmmmm', 'Ana'], spaced: ['The Okonkwo-Adeyemi Home', 'The Bartholomew-Fitz Hse', 'Cy'], mixed: ['Mary-Kate Lee-Park \u{1F1EF}\u{1F1F5}\u{1F44D}\u{1F3FD} Bo', 'Pneumonoultramicroscopic', 'Zo\u00EB Ng'] };
    const SCAN = names => { const Q = names.map(n => '\u201C' + n + '\u201D'), out = { rows: [], ell: [], btn: [] }, vw = document.documentElement.clientWidth;
      const R = e => { const g = document.createRange(); g.selectNodeContents(e); return [...g.getClientRects()].filter(x => x.width > 0); };
      document.querySelectorAll('#rows .ss-alloc .who').forEach(who => { if (!who.getClientRects().length || !Q.includes(who.textContent)) return; const row = who.parentElement, cs = getComputedStyle(who), b = who.getBoundingClientRect(), rs = R(who);
        const others = [...row.children].filter(c => c !== who && c.getClientRects().length && getComputedStyle(c).visibility !== 'hidden').flatMap(R);
        const tn = who.firstChild, txt = tn.textContent, m = document.createElement('span'); m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0'; who.appendChild(m); const broken = []; let at = 0;
        const EMO = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u, SEG = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        // words = runs between spaces and after hyphens; each emoji is its own word (Unicode line breaking allows a break between two emoji, as between CJK characters)
        txt.replace(/-/g, '-\n').split(/\s+/).flatMap(t => { const out = []; let cur = ''; for (const { segment: g } of SEG.segment(t.replace(/\n/g, ''))) { if (EMO.test(g)) { if (cur) out.push(cur); out.push(g); cur = ''; } else cur += g; } if (cur) out.push(cur); return out; }).forEach(tok => { if (!tok) return; const i = txt.indexOf(tok, at); at = i + tok.length; m.textContent = tok; const tw = m.getBoundingClientRect().width;
          if (tw <= who.clientWidth + .5) { const g = document.createRange(); g.setStart(tn, i); g.setEnd(tn, i + tok.length); if (new Set([...g.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size > 1) broken.push(tok); } });
        who.removeChild(m); const last = document.createRange(); last.setStart(tn, txt.length - 1); last.setEnd(tn, txt.length); const lq = last.getBoundingClientRect();
        out.rows.push({ name: txt.slice(0, 12), ell: cs.textOverflow === 'ellipsis', nowrap: cs.whiteSpace === 'nowrap', sw: who.scrollWidth, cw: who.clientWidth, inBox: rs.every(a => a.left >= b.left - .5 && a.right <= b.right + .5 && a.top >= b.top - .5 && a.bottom <= b.bottom + .5),
          inView: rs.every(a => a.left >= -.5 && a.right <= vw + .5), closeQ: lq.width > 0 && lq.right <= b.right + .5 && lq.left >= b.left - .5, overlap: rs.some(a => others.some(o => a.left < o.right - .5 && o.left < a.right - .5 && a.top < o.bottom - .5 && o.top < a.bottom - .5)), broken, tot: (row.querySelector('.tot') || {}).textContent }); });
      for (const el of document.querySelectorAll('body *')) { if (!el.getClientRects().length) continue; const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(''); if (!names.some(n => own.includes(n.slice(0, 3)))) continue;
        const cs = getComputedStyle(el); if (cs.textOverflow === 'ellipsis' || (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1)) out.ell.push((el.id || el.className) + ':' + own.slice(0, 10)); }
      document.querySelectorAll('#assign .ss-btn').forEach(bt => { if (!bt.getClientRects().length || !names.some(n => bt.textContent.includes(n))) return; const r = bt.getBoundingClientRect(); out.btn.push({ ok: bt.scrollWidth <= bt.clientWidth + 1 && r.right <= vw + .5 && r.left >= -.5 }); });
      out.sw = document.documentElement.scrollWidth; out.vw = vw; return out; };
    const good = (r, n) => r.rows.length === n && r.rows.every(x => !x.ell && !x.nowrap && x.sw <= x.cw + 1 && x.inBox && x.inView && x.closeQ && !x.overlap && !x.broken.length) && !r.ell.length && r.btn.every(x => x.ok) && r.sw <= r.vw;
    const fill = async (p, st) => p.evaluate(st => { const set = (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, g = id => document.getElementById(id); set(g('item'), st.n); set(g('q'), st.q); set(g('u'), st.u); set(g('inc'), st.i); set(g('p'), st.p); set(g('f'), st.f); while (document.querySelectorAll('.ss-hn').length < st.h.length) g('add').click(); const hn = document.querySelectorAll('.ss-hn'), rq = document.querySelectorAll('.sk-rq'); st.h.forEach((h, i) => { set(hn[i], h[0]); set(rq[i], h[1]); }); }, st);
    const pdfs = {};
    for (const w of [305, 320, 390, 600, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
      for (const [k, names] of Object.entries(SETS)) {
        const st = { n: 'Rice', u: 'kg', c: '$', q: '10', i: '1', p: '20.00', f: '1.00', b: 'p', x: -1, h: [[names[0], '3'], [names[1], '3'], [names[2], '2']] }, res = {};
        await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(80); await fill(p, st); await sleep(200);
        res.sender = await p.evaluate(SCAN, names); await p.emulateMediaType('print'); await sleep(200); res.senderPrint = await p.evaluate(SCAN, names);
        if (w === 390) { const f = '/tmp/sack-d10r5-' + k + '-sender-letter.pdf'; await p.pdf({ path: f, format: 'Letter', printBackground: true }); pdfs[k + ' sender'] = f; }
        await p.emulateMediaType('screen');
        const f = await p.evaluate(st => SACKLINK.encode(st), st); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(200); res.recipient = await p.evaluate(SCAN, names);
        await p.emulateMediaType('print'); await sleep(200); res.recipientPrint = await p.evaluate(SCAN, names);
        if (w === 390) { const fp = '/tmp/sack-d10r5-' + k + '-recipient-letter.pdf'; await p.pdf({ path: fp, format: 'Letter', printBackground: true }); pdfs[k + ' recipient'] = fp; }
        await p.emulateMediaType('screen');
        await p.select('#pick', '0'); await sleep(80);
        res.picked = await p.evaluate(() => { const sel = document.getElementById('pick'), cs = getComputedStyle(sel), c = document.createElement('canvas').getContext('2d'); c.font = cs.font; const o = sel.selectedOptions[0], clips = c.measureText(o.textContent).width > sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 24, pk = document.getElementById('picked'); if (!pk) return { clips, shown: false, missing: true };
          const r = pk.getBoundingClientRect(); return { clips, shown: !pk.hidden && pk.getClientRects().length > 0, full: pk.textContent === o.textContent, inView: r.right <= document.documentElement.clientWidth + .5, fits: pk.scrollWidth <= pk.clientWidth + 1, aria: pk.getAttribute('aria-hidden') }; });
        await p.evaluate(() => document.getElementById('change').click()); await sleep(150); await p.evaluate(() => document.getElementById('up').click()); await sleep(200); res.change = await p.evaluate(SCAN, names);
        const okAll = ['sender', 'senderPrint', 'recipient', 'recipientPrint', 'change'].every(v => good(res[v], v === 'change' ? 3 : 3));
        ck(w + ' D10-r5 ' + k + ' names at the 24 cap: full quoted name visible (no ellipsis, scrollWidth <= clientWidth, closing ” inside), nothing overlaps, pieces that fit are never broken mid-word; sender, sender print, recipient, recipient print, change (+1 -> $8.40); no page overflow',
          okAll && res.change.rows[0].tot === '$8.40', Object.fromEntries(Object.entries(res).map(([v, r]) => [v, r.rows ? { bad: r.rows.filter(x => x.ell || x.nowrap || x.sw > x.cw + 1 || !x.inBox || !x.inView || !x.closeQ || x.overlap || x.broken.length), ell: r.ell, btn: r.btn.filter(x => !x.ok).length, sw: r.sw, vw: r.vw, tot0: r.rows[0] && r.rows[0].tot } : r])));
        ck(w + ' D10-r5 ' + k + ' recipient picker: a picked name the closed list cuts is also shown in full under it (wrapping, in view, not aria-hidden: facts stay in the accessibility tree); not shown when it fits', res.picked.clips ? res.picked.shown && res.picked.full && res.picked.inView && res.picked.fits && res.picked.aria === null : !res.picked.shown, res.picked);
      }
      ck(w + ' D10-r5 no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
    // Letter print (PDF from the 390 window): every name comes out in full (text layer; whitespace/line breaks removed, case folded)
    const { execSync } = require('child_process'), norm = t => t.replace(/\s+/g, '').toUpperCase(), pdfOut = {};
    for (const [key, fpath] of Object.entries(pdfs)) { const t = norm(execSync('pdftotext -raw ' + fpath + ' -').toString()), names = SETS[key.split(' ')[0]]; pdfOut[key] = names.map(n => t.includes(norm('\u201C' + n + '\u201D'))); }
    ck('D10-r5 Letter print (390 window): every at-cap name, with both quotes, is in the printed text in full, sender and recipient, all 4 sets', Object.values(pdfOut).every(a => a.every(Boolean)), pdfOut); }
  // QA local-d8d1dce D7r: the WHOLE received URL is capped at 2,000 (shared MILLVIEW.linkFor, same as sending). Normal path: valid links whose whole URL is
  // 1999 / 2000 open; 2001 / 2040 are refused with the bad-link message (fresh tab and same tab). Long path (throwaway server, nested dirs + symlink): same.
  { const fs = require('fs'), os = require('os'), path = require('path'), { spawn } = require('child_process'), REPO = path.resolve(__dirname, '../..');
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    const openAt = async (url, same) => { if (!same) await p.goto('about:blank'); if (same) await p.evaluate(u => { location.href = u; }, url); else await p.goto(url, { waitUntil: 'load' }); await sleep(250);
      return p.evaluate(() => ({ len: location.href.length, recv: document.body.classList.contains('is-recv') && !document.getElementById('recv').hidden, bad: !document.getElementById('banner').hidden && document.getElementById('banner-t').textContent, rows: document.querySelectorAll('#rows .ss-alloc').length })); };
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
    const FAM = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}';
    // valid fragments of exact lengths (item padding x household name tail), all within the link format's own 2,000 cap
    const fragFor = async T => p.evaluate((T, FAM) => { for (let fam = 23; fam >= 0; fam--) for (let pad = 0; pad <= 36; pad++) for (let hh = 2; hh <= 8; hh++) {
      const h = []; for (let i = 0; i < hh; i++) h.push([(i === hh - 1 ? 'Z' + 'y'.repeat(23 - fam) + FAM.repeat(fam) : String.fromCharCode(65 + i) + FAM.repeat(23)), '1']);
      const f = SACKLINK.encode({ n: 'Rice' + 'x'.repeat(pad), u: 'kg', c: '$', q: String(hh), i: '1', p: '10.00', f: '', b: 'p', x: -1, h }); if (f && f.length === T && SACKLINK.decode('#' + f).ok) return f; } return null; }, T, FAM);
    const normal = {}; let f2000 = null;
    for (const total of [1999, 2000, 2001, 2040]) { const f = await fragFor(total - BASE.length - 1); if (!f) { normal[total] = 'no fragment of that length'; continue; } if (total === 2000) f2000 = f; normal[total] = await openAt(BASE + '#' + f); normal[total].fragLen = f.length; }
    // same tab: from an open 2,000 link to a 2,001 one (hashchange)
    let sameTab = null; { const f = await fragFor(2001 - BASE.length - 1); if (f && f2000) { await openAt(BASE + '#' + f2000); sameTab = await openAt(BASE + '#' + f, true); } }
    const B = COPY.badLink;
    ck('QA D7r normal path: whole URL 1999 and 2000 open the proposed split; 2001 and 2040 (fragment under 2,000) refused with the bad-link message, no rows; 2001 in the same tab refused too',
      [1999, 2000].every(t => normal[t].recv && normal[t].len === t && normal[t].bad !== B && normal[t].rows > 0) && [2001, 2040].every(t => !normal[t].recv && normal[t].len === t && normal[t].bad === B && normal[t].fragLen <= 2000) && sameTab && !sameTab.recv && sameTab.bad === B && sameTab.len === 2001, { normal, sameTab });
    const root = fs.mkdtempSync(os.tmpdir() + '/sk-long-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] });
    try { const port = await new Promise((res, rej) => { let b = ''; const f = d => { b += d; const m = /port (\d+)/.exec(b); if (m) res(+m[1]); }; srv.stdout.on('data', f); srv.stderr.on('data', f); setTimeout(() => rej(new Error('no port')), 8000); });
      const ORIGIN = 'http://127.0.0.1:' + port; let tag = 0;
      const pathOf = total => { let left = total - 1 - '/mill/split-the-sack/'.length; const segs = []; tag++;
        while (left > 0) { let k = left > 200 ? (left === 201 ? 199 : 200) : left; left -= k; if (left) left -= 1; segs.push(segs.length ? 'a'.repeat(k) : ('t' + tag + '_' + 'a'.repeat(k)).slice(0, k)); }
        let dir = root; segs.slice(0, -1).forEach(x => { dir = path.join(dir, x); fs.mkdirSync(dir, { recursive: true }); }); fs.symlinkSync(REPO, path.join(dir, segs[segs.length - 1]));
        const P = '/' + segs.join('/') + '/mill/split-the-sack/'; if (P.length !== total) throw new Error('path ' + P.length + ' != ' + total); return P; };
      const small = await p.evaluate(() => SACKLINK.encode({ n: 'Rice', u: 'kg', c: '$', q: '10', i: '1', p: '20.00', f: '', b: 'p', x: -1, h: [['Ana', '5'], ['Bo', '5']] })), long = {};
      for (const total of [1999, 2000, 2001, 2040]) long[total] = await openAt(ORIGIN + pathOf(total - ORIGIN.length - 1 - small.length) + '#' + small);
      ck('QA D7r long path (fragment ' + small.length + ' chars): whole URL 1999 and 2000 open; 2001 and 2040 refused with the bad-link message', [1999, 2000].every(t => long[t].recv && long[t].len === t && long[t].bad !== B && long[t].rows > 0) && [2001, 2040].every(t => !long[t].recv && long[t].len === t && long[t].bad === B && long[t].rows === 0), long);
    } finally { srv.kill(); }
    ck('D7r no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
