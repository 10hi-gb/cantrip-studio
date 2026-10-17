// node tests/browser/mill-olt.qa.js <host[:port]> <ip> [scheme] — One Less Trip @320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const BASE = `${SCHEME}://${H}/mill/one-less-trip/`;
async function addRow(p, owner, item, qty, unit, stop) {
  await p.select('#f-o', String(owner)); await typeInto(p, '#f-i', item); await typeInto(p, '#f-q', qty); await typeInto(p, '#f-u', unit);
  const chk = await p.$eval('#f-x', e => e.checked); if (!stop) { if (!chk) { await p.focus('#f-x'); await p.keyboard.press('Space'); } } else { if (chk) { await p.focus('#f-x'); await p.keyboard.press('Space'); } await typeInto(p, '#f-s', stop); }
  await p.focus('#f-add'); await p.keyboard.press('Enter'); await sleep(40);
}
const view = p => p.evaluate(() => ({ ledger: document.getElementById('ledger').textContent, stops: [...document.querySelectorAll('#lane .olt-ticket')].map(a => a.querySelector('.olt-stopname').textContent + ':' + a.querySelectorAll('.olt-item').length),
  tray: [...document.querySelectorAll('#tray-t .olt-item .olt-name')].map(e => e.textContent), trayHidden: document.getElementById('tray').hidden, offers: [...document.querySelectorAll('.olt-note--merge button')].map(b => b.getAttribute('aria-label')),
  kept: [...document.querySelectorAll('.olt-note--kept')].map(e => e.textContent), tags: [...document.querySelectorAll('#lane .olt-tag, #tray-t .olt-tag')].map(e => e.textContent), copy: document.getElementById('b-copy').disabled, fix: document.getElementById('fix').textContent }));
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
    const s = await session(H, IP); const { p, b } = s; await p.setViewport({ width: w, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    let t = await view(p); ck(w + ' empty state: copy/print/share disabled, ghost ticket', t.copy && !t.stops.length && (await p.$('.olt-ghost')) && t.trayHidden, t);
    // households by keyboard
    await typeInto(p, '#hh-1', 'Ana'); await typeInto(p, '#hh-2', 'Ben'); await p.focus('#hh-add'); await p.keyboard.press('Enter'); await sleep(40); await p.keyboard.type('Cy');
    for (let i = 0; i < 3; i++) { await p.focus('#hh-add'); await p.keyboard.press('Enter'); await sleep(30); await p.keyboard.type('X' + i); }
    t = await p.evaluate(() => ({ dis: document.getElementById('hh-add').disabled, msg: document.getElementById('hh-e').textContent, n: document.querySelectorAll('#hh li').length }));
    ck(w + ' 6 households max, 7th refused with message', t.dis && t.n === 6 && t.msg === 'Six households is the most.', t);
    for (const id of [4, 5, 6]) { await p.focus('#hhr-' + id); await p.keyboard.press('Enter'); await sleep(30); }
    // Creative s1 rows
    const R = [[1, 'Oat milk', '2', 'carton', 'Corner Co-op'], [2, 'Oat milk', '1', 'carton', 'Corner Co-op'], [3, 'Oat milk', '1', 'litre', 'Corner Co-op'], [2, 'Brown rice', '2', 'kg', 'Corner Co-op'], [2, 'Stamps', '1', 'book', 'Post office'], [1, 'Picture hooks', '1', 'pack', 'Hardware store'], [3, 'Parcel to return', '1', 'each', 'Post office'], [1, 'AA batteries', '8', 'each', ''], [3, 'Sourdough', '1', 'loaf', ''], [3, 'Wood glue', '1', 'bottle', 'Hardware store']];
    for (const r of R) await addRow(p, ...r);
    t = await view(p);
    ck(w + ' regrouped by stop in entered order; unknown tray; ledger reconciles', t.stops.join() === 'Corner Co-op:4,Post office:2,Hardware store:2' && t.tray.join() === 'AA batteries,Sourdough' && t.ledger === '10 rows in8 on tickets2 set asideEvery item from every list is here once.', t);
    ck(w + ' exact dup offered (not merged); different unit kept separate', t.offers.join() === 'Merge r01 + r02' && t.kept.join() === "Kept separate: litre isn't carton." && t.tags.length === 10, t);
    // form validation
    await addRow(p, 1, 'Glue', '1e9', '', 'X'); let fe = await p.evaluate(() => ({ q: document.getElementById('e-q').textContent, n: document.querySelectorAll('#rows li').length, f: document.activeElement.id }));
    ck(w + ' qty 1e9 rejected inline, no row added', fe.q === 'Use a plain number, like 2 or 0.5.' && fe.n === 10 && fe.f === 'f-q', fe);
    await addRow(p, 1, 'Glue', '0', '', 'X'); fe = await p.evaluate(() => document.getElementById('e-q').textContent); ck(w + ' qty 0 rejected', fe === 'Enter a quantity above zero.', fe);
    await typeInto(p, '#f-q', ''); await typeInto(p, '#f-i', '');
    // explicit merge by keyboard
    await p.focus('#mg-' + await p.evaluate(() => document.querySelector('.olt-note--merge button').id.slice(3))); await p.keyboard.press('Enter'); await sleep(80);
    t = await view(p); const um = await p.evaluate(() => ({ f: document.activeElement.id, merged: [...document.querySelectorAll('.olt-merged')].length, qty: document.querySelector('#lane .olt-qty').textContent, toast: document.getElementById('toast').textContent }));
    ck(w + ' merge: one line, both owner tags with qty, focus on Split back out', um.merged === 1 && um.qty === '3 carton' && t.tags.includes('Ana r01 ·2') && t.tags.includes('Ben r02 ·1') && um.f.startsWith('um-') && um.toast === 'Merged Oat milk into one line.' && t.ledger.startsWith('10 rows in8 on tickets'), { t, um });
    // check-off is session-only and keyboard
    await p.focus('#' + await p.evaluate(() => [...document.querySelectorAll('#lane .olt-item')].find(li => li.querySelector('.olt-name').textContent === 'Brown rice').querySelector('input').id)); await p.keyboard.press('Space'); await sleep(30);
    t = await p.evaluate(() => ({ done: document.querySelectorAll('.olt-item.is-done').length, prog: document.getElementById('progress').textContent })); ck(w + ' check-off', t.done === 1 && t.prog.startsWith('1 of 9 picked up'), t);
    // copy fails in headless (no permission) -> fallback selectable
    await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); });
    await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(150);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, f: document.activeElement.id, v: document.getElementById('fallback').value, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart }));
    ck(w + ' copy failure leaves full list selected', t.toast === "Couldn't copy. Select the text below and copy it yourself." && t.f === 'fallback' && t.sel > 100 && t.v.includes('01 · Corner Co-op\n[ ] Oat milk: 3 carton total — From Ana: 2 carton (r01), Ben: 1 carton (r02)') && t.v.includes('? · Stop unknown'), t);
    // remove a household -> rows held back, copy blocked
    await p.focus('#hhr-3'); await p.keyboard.press('Enter'); await sleep(60); t = await view(p);
    ck(w + ' removed household: its rows held back, never dropped; copy blocked', t.ledger.includes('10 rows in') && t.ledger.includes('4 held back') && t.copy && t.fix.startsWith('4 rows need fixing'), t);
    // fix via edit: re-own r03
    await p.focus('#hh-add'); await p.keyboard.press('Enter'); await sleep(30); await p.keyboard.type('Cy');
    for (const tag of ['r03', 'r07', 'r09', 'r10']) { const id = await p.evaluate(tg => [...document.querySelectorAll('#rows li')].find(li => li.querySelector('.olt-src').textContent === tg).id.slice(4), tag); await p.focus('#ed-' + id); await p.keyboard.press('Enter'); await sleep(30);
      const cyId = await p.evaluate(() => [...document.querySelectorAll('#f-o option')].find(o => o.textContent === 'Cy').value); await p.select('#f-o', cyId); await p.focus('#f-add'); await p.keyboard.press('Enter'); await sleep(40); }
    t = await view(p); ck(w + ' edited rows back on tickets; ledger reconciles', t.ledger.startsWith('10 rows in8 on tickets2 set aside') && !t.copy && !t.fix, t);
    const miss = await tabReach(p, ['skip', 'hh-1', 'hh-add', 'f-o', 'f-i', 'f-q', 'f-u', 'f-s', 'f-x', 'f-add', 'b-copy', 'b-print', 'b-share', 'b-reset'], 160); ck(w + ' keyboard reach', !miss.length, miss);
    // link -> receiver
    await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(200);
    const url = await p.$eval('#link', e => e.value); ck(w + ' link made (#t1), address bar untouched', /#t1\./.test(url) && (await p.evaluate(() => location.hash)) === '', url.length);
    const q = await b.newPage(); q.setDefaultTimeout(15000); q.on('dialog', d => d.accept().catch(() => {})); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e))); q.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) qe.push(m.text()); });
    await q.goto(url, { waitUntil: 'load' }); await sleep(200);
    t = await view(q); const bt = await q.evaluate(() => ({ b: document.getElementById('banner-t').textContent, done: document.querySelectorAll('.olt-item.is-done').length, body: document.body.innerText }));
    ck(w + ' receiver sees the same stops + merge, no ticks, no sent claims', bt.b.startsWith('A shared list, grouped by stop.') && t.stops.join() === 'Corner Co-op:3,Post office:2,Hardware store:2' && t.tags.includes('Ana r01 ·2') && bt.done === 0 && !/\b(sent|delivered|accepted|agreed)\b/i.test(bt.body.replace('Not sent. The list is still here.', '')), { t, bt: bt.b });
    const ofq = await overflow(q);
    for (const [nm, h, want] of [['truncated', url.split('#')[1].slice(0, 40), /damaged/], ['oversized', 't1.' + 'A'.repeat(2100) + '.abcdef', /damaged/], ['script', '<img src=x onerror=alert(1)>', /damaged/], ['old version', await q.evaluate(() => MILL.pack('t', 0, {})), /older version/], ['forged merge', await q.evaluate(() => MILL.pack('t', 1, { h: ['A', 'B'], r: [[0, 'Milk', '1', 'l', 'X'], [1, 'Milk', '1', 'kg', 'X']], m: [[0, 1]] })), /damaged/]]) {
      await q.goto('about:blank'); await q.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(100);
      const x = await q.evaluate(() => ({ b: document.getElementById('banner-t').textContent, hid: document.getElementById('banner').hidden, img: document.querySelectorAll('img').length, rows: document.querySelectorAll('#rows li').length }));
      ck(w + ' ' + nm + ' link refused', want.test(x.b) && !x.hid && !x.img && !x.rows, x);
    }
    // text-safe
    await addRow(p, 1, '<img src=x onerror=alert(1)>', '1', '<b>u</b>', '<i>S</i>'); t = await p.evaluate(() => ({ img: document.querySelectorAll('img, b b, .olt-ticket i').length, name: ([...document.querySelectorAll('.olt-name')].find(e => e.textContent.startsWith('<img')) || {}).textContent || '', stop: [...document.querySelectorAll('.olt-stopname')].some(e => e.textContent === '<i>S</i>') }));
    ck(w + ' text-safe rendering', !t.img && t.name.startsWith('<img') && t.stop, t);
    const of = await overflow(p); ck(w + ' no overflow (owner, receiver)', of.sw <= of.w && !of.bad.length && ofq.sw <= ofq.w && !ofq.bad.length, { of, ofq });
    // reset (receiver with fragment) + reload
    await q.goto(url, { waitUntil: 'load' }); await q.focus('#b-reset'); await q.keyboard.press('Enter'); await sleep(100);
    t = await q.evaluate(() => ({ h: location.hash, rows: document.querySelectorAll('#rows li').length, hh: [...document.querySelectorAll('#hh input')].map(i => i.value).join(), ban: document.getElementById('banner').hidden, tickets: document.querySelectorAll('.olt-ticket').length }));
    ck(w + ' reset clears rows, merges, ticks and fragment', t.h === '' && !t.rows && t.hh === ',' && t.ban && !t.tickets, t);
    await p.reload({ waitUntil: 'load' }); t = await p.evaluate(() => ({ rows: document.querySelectorAll('#rows li').length, hh: document.getElementById('hh-1').value })); ck(w + ' reload keeps nothing', !t.rows && t.hh === '', t);
    for (const [nm, pg] of [['owner', p], ['receiver', q]]) { const sg = await storage(pg); ck(w + ' storage empty (' + nm + ')', !sg.cookie && !sg.ls.length && !sg.ss.length && !(Array.isArray(sg.idb) && sg.idb.length) && !sg.caches.length && !sg.sw && !sg.undef, sg); }
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no console/page errors', !errsOf(s, SCHEME).length && !qe.length, [errsOf(s, SCHEME), qe]);
    await b.close();
  }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 });
    await p.goto(BASE, { waitUntil: 'load' }); await typeInto(p, '#hh-1', 'Ana'); await typeInto(p, '#hh-2', 'Ben'); await addRow(p, 1, 'Milk', '1', 'l', 'Shop');
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(300);
    let t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, f: document.activeElement.id, link: document.getElementById('link').value, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart }));
    ck('390 share cancel keeps link selectable', t.toast === 'Not sent. The list is still here.' && t.f === 'link' && /#t1\./.test(t.link) && t.sel > 20, t);
    // 30-row limit
    await p.evaluate(() => { for (let i = 0; i < 29; i++) { document.getElementById('f-o').value = '1'; document.getElementById('f-i').value = 'Item ' + i; document.getElementById('f-q').value = '1'; document.getElementById('f-add').click(); } });
    t = await p.evaluate(() => ({ n: document.querySelectorAll('#rows li').length, dis: document.getElementById('f-add').disabled, meta: document.getElementById('rows-meta').textContent }));
    ck('390 30-row limit disables add with message', t.n === 30 && t.dis && t.meta.endsWith('Thirty items is the most.'), t);
    ck('390 share-cancel/limit no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
