// node tests/browser/mill-olt.qa.js <host[:port]> <ip> [scheme] — One Less Trip @320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, sameTabBadLink, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result, reallyHidden } = require('./mill-common');
const BASE = `${SCHEME}://${H}/mill/one-less-trip/`;
async function addRow(p, owner, item, qty, unit, stop) {
  await p.select('#f-o', String(owner)); await typeInto(p, '#f-i', item); await typeInto(p, '#f-q', qty); await typeInto(p, '#f-u', unit);
  const chk = await p.$eval('#f-x', e => e.checked); if (!stop) { if (!chk) { await p.focus('#f-x'); await p.keyboard.press('Space'); } } else { if (chk) { await p.focus('#f-x'); await p.keyboard.press('Space'); } await typeInto(p, '#f-s', stop); }
  await p.focus('#f-add'); await p.keyboard.press('Enter'); await sleep(40);
}
const view = p => p.evaluate(() => ({ ledger: document.getElementById('ledger').textContent, stops: [...document.querySelectorAll('#lane .olt-ticket')].map(a => a.querySelector('.olt-stopname').textContent + ':' + a.querySelectorAll('.olt-item').length),
  tray: [...document.querySelectorAll('#tray-t .olt-item .olt-name')].map(e => e.textContent.replace(/^“|”$/g, '')), trayHidden: document.getElementById('tray').hidden, offers: [...document.querySelectorAll('.olt-note--merge button')].map(b => b.getAttribute('aria-label')),
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
    ck(w + ' regrouped by stop in entered order; unknown tray; ledger reconciles', t.stops.join() === '“Corner Co-op”:4,“Post office”:2,“Hardware store”:2' && t.tray.join() === 'AA batteries,Sourdough' && t.ledger === '10 rows in8 on tickets2 set asideEvery item from every list is here once.', t);
    ck(w + ' exact dup offered (not merged); different unit kept separate', t.offers.join() === 'Merge r01 + r02' && t.kept.join() === "Kept separate: “litre” isn't “carton”." && t.tags.length === 10, t);
    // form validation
    await addRow(p, 1, 'Glue', '1e9', '', 'X'); let fe = await p.evaluate(() => ({ q: document.getElementById('e-q').textContent, n: document.querySelectorAll('#rows li').length, f: document.activeElement.id }));
    ck(w + ' qty 1e9 rejected inline, no row added', fe.q === 'Use a plain number, like 2 or 0.5.' && fe.n === 10 && fe.f === 'f-q', fe);
    await addRow(p, 1, 'Glue', '0', '', 'X'); fe = await p.evaluate(() => document.getElementById('e-q').textContent); ck(w + ' qty 0 rejected', fe === 'Enter a quantity above zero.', fe);
    await typeInto(p, '#f-q', ''); await typeInto(p, '#f-i', '');
    // explicit merge by keyboard
    await p.focus('#mg-' + await p.evaluate(() => document.querySelector('.olt-note--merge button').id.slice(3))); await p.keyboard.press('Enter'); await sleep(80);
    t = await view(p); const um = await p.evaluate(() => ({ f: document.activeElement.id, merged: [...document.querySelectorAll('.olt-merged')].length, qty: document.querySelector('#lane .olt-line').firstChild.textContent + ' ' + document.querySelector('#lane .olt-line .olt-unit').textContent, toast: document.getElementById('toast').textContent }));
    ck(w + ' merge: one line, both owner tags with qty, focus on Split back out', um.merged === 1 && um.qty === '3 “carton”' && t.tags.includes('“Ana” r01 ·2') && t.tags.includes('“Ben” r02 ·1') && um.f.startsWith('um-') && um.toast === 'Merged “Oat milk” into one line.' && t.ledger.startsWith('10 rows in8 on tickets'), { t, um });
    // check-off is session-only and keyboard
    await p.focus('#' + await p.evaluate(() => [...document.querySelectorAll('#lane .olt-item')].find(li => li.querySelector('.olt-name').textContent.replace(/^“|”$/g, '') === 'Brown rice').querySelector('input').id)); await p.keyboard.press('Space'); await sleep(30);
    t = await p.evaluate(() => ({ done: document.querySelectorAll('.olt-item.is-done').length, prog: document.getElementById('progress').textContent })); ck(w + ' check-off', t.done === 1 && t.prog.startsWith('1 of 9 picked up'), t);
    // copy fails in headless (no permission) -> fallback selectable
    await p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); });
    await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(150);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, f: document.activeElement.id, v: document.getElementById('fallback').value, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart }));
    ck(w + ' copy failure leaves full list selected', t.toast === "Couldn't copy. Select the text below and copy it yourself." && t.f === 'fallback' && t.sel > 100 && t.v.startsWith('Shopping by stop. Items, stops and names as typed by the sender.\n\nStop: “Corner Co-op”\n☐ “Oat milk”: 3 “carton” total · for “Ana”, “Ben”\n') && t.v.includes('\nStop unknown\n☐ “AA batteries”: 8 “each” · for “Ana”\n'), t);
    // remove a household -> rows held back, copy blocked
    await p.focus('#hhr-3'); await p.keyboard.press('Enter'); await sleep(60); t = await view(p);
    ck(w + ' removed household: its rows held back, never dropped; copy blocked', t.ledger.includes('10 rows in') && t.ledger.includes('4 held back') && t.copy && t.fix.startsWith('4 rows need fixing'), t);
    // fix via edit: re-own r03
    await p.focus('#hh-add'); await p.keyboard.press('Enter'); await sleep(30); await p.keyboard.type('Cy');
    for (const tag of ['r03', 'r07', 'r09', 'r10']) { const id = await p.evaluate(tg => [...document.querySelectorAll('#rows li')].find(li => li.querySelector('.olt-src').textContent === tg).id.slice(4), tag); await p.focus('#ed-' + id); await p.keyboard.press('Enter'); await sleep(30);
      const cyId = await p.evaluate(() => [...document.querySelectorAll('#f-o option')].find(o => o.textContent === '“Cy”').value); await p.select('#f-o', cyId); await p.focus('#f-add'); await p.keyboard.press('Enter'); await sleep(40); }
    t = await view(p); ck(w + ' edited rows back on tickets; ledger reconciles', t.ledger.startsWith('10 rows in8 on tickets2 set aside') && !t.copy && !t.fix, t);
    const miss = await tabReach(p, ['skip', 'hh-1', 'hh-add', 'f-o', 'f-i', 'f-q', 'f-u', 'f-s', 'f-x', 'f-add', 'b-copy', 'b-print', 'b-share', 'b-reset'], 160); ck(w + ' keyboard reach', !miss.length, miss);
    // link -> receiver
    await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(200);
    const url = await p.$eval('#link', e => e.value); ck(w + ' link made (#t1), address bar untouched', /#t1\./.test(url) && (await p.evaluate(() => location.hash)) === '', url.length);
    const q = await b.newPage(); q.setDefaultTimeout(15000); q.on('dialog', d => d.accept().catch(() => {})); await q.setViewport({ width: w, height: 800 }); const qe = []; q.on('pageerror', e => qe.push(String(e))); q.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) qe.push(m.text()); });
    await q.goto(url, { waitUntil: 'load' }); await sleep(200);
    t = await view(q); const bt = await q.evaluate(() => ({ b: document.getElementById('banner-t').textContent, done: document.querySelectorAll('.olt-item.is-done').length, body: document.body.innerText }));
    ck(w + ' receiver sees the same stops + merge, no ticks, no sent claims', bt.b.startsWith('A shared list, grouped by stop.') && t.stops.join() === '“Corner Co-op”:3,“Post office”:2,“Hardware store”:2' && t.tags.includes('“Ana” r01 ·2') && bt.done === 0 && !/\b(sent|delivered|accepted|agreed)\b/i.test(bt.body.replace('Not sent. The list is still here.', '')), { t, bt: bt.b });
    const ofq = await overflow(q);
    for (const [nm, h, want] of [['truncated', url.split('#')[1].slice(0, 40), /damaged/], ['oversized', 't1.' + 'A'.repeat(2100) + '.abcdef', /damaged/], ['script', '<img src=x onerror=alert(1)>', /damaged/], ['old version', await q.evaluate(() => MILL.pack('t', 0, {})), /older version/], ['forged merge', await q.evaluate(() => MILL.pack('t', 1, { h: ['A', 'B'], r: [[0, 'Milk', '1', 'l', 'X'], [1, 'Milk', '1', 'kg', 'X']], m: [[0, 1]] })), /damaged/]]) {
      await q.goto('about:blank'); await q.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(100);
      const x = await q.evaluate(() => ({ b: document.getElementById('banner-t').textContent, hid: document.getElementById('banner').hidden, img: document.querySelectorAll('img').length, rows: document.querySelectorAll('#rows li').length }));
      ck(w + ' ' + nm + ' link refused', want.test(x.b) && !x.hid && !x.img && !x.rows, x);
    }
    // text-safe
    await addRow(p, 1, '<img src=x onerror=alert(1)>', '1', '<b>u</b>', '<i>S</i>'); t = await p.evaluate(() => ({ img: document.querySelectorAll('img, b b, .olt-ticket i').length, name: ([...document.querySelectorAll('.olt-name')].find(e => e.textContent.startsWith('“<img')) || {}).textContent || '', stop: [...document.querySelectorAll('.olt-stopname')].some(e => e.textContent === '“<i>S</i>”') }));
    ck(w + ' text-safe rendering', !t.img && t.name.startsWith('“<img') && t.stop, t);
    await sleep(600); const of = await overflow(p); ck(w + ' no overflow (owner, receiver)', of.sw <= of.w && !of.bad.length && ofq.sw <= ofq.w && !ofq.bad.length, { of, ofq });
    // recipient view is read-only in the DOM (shared MILLVIEW.readOnly): no enabled control in the intake, no Start over
    await q.goto('about:blank'); await q.goto(url, { waitUntil: 'load' }); await sleep(150);
    let ro = await q.evaluate(() => ({ en: [...document.querySelectorAll('#intake input,#intake select,#intake textarea,#intake button')].filter(e => !e.disabled).map(e => e.id || e.className), inert: document.getElementById('intake').inert, ticks: [...document.querySelectorAll('.olt-check')].filter(e => !e.disabled).length }));
    const rh = await reallyHidden(q, ['#b-reset']);
    ck(w + ' recipient read-only in DOM: intake controls disabled (never inert), Start over not rendered, shopping ticks still usable', !ro.en.length && !ro.inert && ro.ticks > 0 && rh.ok, { ro, rh });
    // same tab: valid link -> bad link fully resets (no rows, no read-only leftovers, empty link box)
    await q.evaluate(() => { location.hash = 't1.broken'; }); await sleep(150);
    ro = await q.evaluate(() => ({ rows: document.querySelectorAll('#rows li').length, tickets: document.querySelectorAll('.olt-ticket').length, hh: [...document.querySelectorAll('#hh input')].map(i => i.value).join(), b: document.getElementById('banner-t').textContent, inert: document.getElementById('intake').inert, dis: [...document.querySelectorAll('#intake input:disabled,#intake select:disabled')].map(e => e.id), reset: document.getElementById('b-reset').hidden, own: document.getElementById('own-copy').hidden, link: document.getElementById('link').value }));
    ck(w + ' same tab: bad link after a valid one fully resets the tab', !ro.rows && !ro.tickets && ro.hh === ',' && /damaged/.test(ro.b) && !ro.inert && !ro.dis.filter(i => i !== 'f-s').length && !ro.reset && ro.own && ro.link === '', ro);
    // same tab: back to no fragment -> blank
    await q.evaluate(() => { location.hash = ''; }); await sleep(150);
    ro = await q.evaluate(() => ({ ban: document.getElementById('banner').hidden, rows: document.querySelectorAll('#rows li').length }));
    ck(w + ' same tab: empty fragment -> blank, no banner', ro.ban && !ro.rows, ro);
    // reset (receiver -> Make my own copy -> Start over) + reload
    await q.goto(url, { waitUntil: 'load' }); await sleep(100); await q.click('#own-copy'); await sleep(80);
    ro = await q.evaluate(() => ({ en: [...document.querySelectorAll('#intake input,#intake select')].filter(e => !e.disabled).length, inert: document.getElementById('intake').inert, rows: document.querySelectorAll('#rows li').length, reset: document.getElementById('b-reset').hidden }));
    ck(w + ' Make my own copy unlocks the intake and keeps the rows', ro.en > 3 && !ro.inert && ro.rows > 5 && !ro.reset, ro);
    await q.focus('#b-reset'); await q.keyboard.press('Enter'); await sleep(100);
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
  // Writer QA-83 strings, exact: unit/stop limits with {max}, duplicate household name
  for (const w of [390]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const ids = await p.evaluate(() => [...document.querySelectorAll('input[id^=hh-]')].filter(e => e.id !== 'hh-add').map(e => e.id));
    await typeInto(p, '#' + ids[0], 'Ana'); await typeInto(p, '#' + ids[1], 'ana'); await sleep(80);
    const dup = await p.evaluate(id => document.getElementById('hhe-' + id.slice(3)).textContent, ids[1]);
    await typeInto(p, '#' + ids[1], 'Ben'); await p.select('#f-o', await p.$eval('#f-o', e => e.options[1].value)); await typeInto(p, '#f-i', 'Milk'); await typeInto(p, '#f-q', '1'); await typeInto(p, '#f-u', 'u'.repeat(17)); await typeInto(p, '#f-s', 's'.repeat(42));
    await p.click('#f-add'); await sleep(80); const e = await p.evaluate(() => ({ u: document.getElementById('e-u').textContent, s: document.getElementById('e-s').textContent }));
    ck(w + ' Writer strings exact: householdDuplicate, unitTooLong/stopTooLong with {max}', dup === 'Two households have this name. Make them different.' && e.u === 'Up to 16 characters. 1 over.' && e.s === 'Up to 40 characters. 2 over.', { dup, e });
    await s.b.close(); }
  // ---- QA 83a2ebcd D4–D13 + PM scope (exact Writer strings), live at every width
  const Cx = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/one-less-trip/copy.js', 'utf8') + ';COPY');
  for (const w of W) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const L1 = await p.evaluate(() => MILL.pack('t', 1, { h: ['Ana Maria de los Santos', 'The Nguyen-Okafors', 'Pneumonoultramicroscopic'], r: [[0, 'Oat milk', '2', 'carton', 'Walgreens on 5th Avenue & Main St'], [1, 'Oat milk', '1', 'carton', 'Walgreens on 5th Avenue & Main St'], [2, 'Glue', '100000', 'tube', 'Office Depot (Riverside Plaza)'], [2, 'Tea', '1', '', 'corner shop'], [0, 'Jam', '1', '', 'Corner Shop'], [1, 'Bread', '1', '', '']], m: [] }));
    await p.goto('about:blank'); await p.goto(BASE + '#' + L1, { waitUntil: 'load' }); await sleep(700);
    const rh = await reallyHidden(p, ['#intake', '#b-reset', '#samestop', '#hh-1', '#f-i']);
    ck(w + ' D4 recipient: no editor rendered (intake, inputs, Start over not rendered, not in a11y tree)', rh.ok, rh);
    let t = await p.evaluate(() => { const tk = [...document.querySelectorAll('article.olt-ticket')]; return {
      typed: document.getElementById('banner-typed').textContent, typedHidden: document.getElementById('banner-typed').hidden, prompt: (document.querySelector('.olt-note--merge p') || {}).textContent, order: document.getElementById('order').textContent,
      stops: [...document.querySelectorAll('#lane .olt-stopname')].map(e => e.textContent), font: getComputedStyle(document.querySelector('.olt-typedstop')).fontFamily, slab: getComputedStyle(document.querySelector('.olt-title')).fontFamily,
      tagOut: [...document.querySelectorAll('.olt-tag')].filter(g => { const a = g.closest('article').getBoundingClientRect(), r = g.getBoundingClientRect(); return r.right > a.right + 0.5 || r.left < a.left - 0.5; }).map(g => g.textContent),
      stubOver: [...document.querySelectorAll('.olt-stub')].filter(st => { const m = st.querySelector('.olt-stopmeta'); return m && m.getBoundingClientRect().bottom > st.getBoundingClientRect().bottom + 0.5; }).length,
      sw: document.documentElement.scrollWidth, progress: document.getElementById('progress').textContent, same: document.querySelectorAll('.olt-same').length }; });
    ck(w + ' D5 recipient: receiverTypedNote exact under the intro; merge prompt = quoted duplicateFound + mergeHint; stop headings typed + quoted in body type', !t.typedHidden && t.typed === 'Names, items and stops are as typed by the sender. Not checked.' && t.prompt === 'Possible double, as typed: “Oat milk” (“carton”). Listed for “Ana Maria de los Santos” and “The Nguyen-Okafors”. Merge only if it\'s the same thing.' && t.stops[0] === '“Walgreens on 5th Avenue & Main St”' && t.font !== t.slab, t);
    ck(w + ' D6 notOrdered neutral, exact; PM5 checksNote exact', t.order === 'Stops are in the order they were entered, not by route.' && t.progress.endsWith(' · Ticks live on this screen only. They clear if the page closes or reloads, the lists merge, or a new link opens.'), { order: t.order, progress: t.progress });
    ck(w + ' PM2 stops differing only in capitals stay separate tickets; no Same stop? prompt in the recipient view', t.stops.includes('“corner shop”') && t.stops.includes('“Corner Shop”') && t.same === 0, t.stops);
    ck(w + ' D8/D9 long owner tags wrap inside the ticket; stub grows, meta never overlaps the perforation; no sideways scroll', !t.tagOut.length && !t.stubOver && t.sw <= w, { tagOut: t.tagOut, stubOver: t.stubOver, sw: t.sw });
    // PM3: recipient Merge -> their own copy with a new link; sender isn't notified
    await p.click('.olt-note--merge button'); await sleep(200);
    t = await p.evaluate(() => ({ b: document.getElementById('banner-t').textContent, typedHidden: document.getElementById('banner-typed').hidden, intake: document.getElementById('intake').hidden, lb: document.getElementById('linkbox').hidden, ll: document.getElementById('link-l').textContent, link: document.getElementById('link').value, h: location.hash, merged: document.querySelectorAll('.olt-merged').length }));
    ck(w + ' PM3 recipient Merge makes their own copy: copyMergedNote, editor back, new link labelled as their copy, address bar cleared', t.b === "This is your copy now, with your change. The sender isn't notified." && t.typedHidden && !t.intake && !t.lb && t.ll === 'Link to your copy' && t.link.startsWith(BASE + '#t1.') && t.h === '' && t.merged === 1, t);
    // owner view checks
    t = await p.evaluate(() => { const li = document.getElementById('hh-1').closest('li'); return { hint: document.getElementById('hh-hint').textContent, sh: document.getElementById('h-s').textContent, limits: document.getElementById('limits').textContent, room: document.getElementById('linkroom').textContent,
      inW: document.getElementById('hh-1').getBoundingClientRect().width, liW: li.getBoundingClientRect().width, rmTxt: document.getElementById('hhr-1').textContent, rmAria: document.getElementById('hhr-1').getAttribute('aria-label'),
      unk: getComputedStyle(document.querySelector('.olt-row .olt-where.is-unknown')).color, sw: document.documentElement.scrollWidth, prompt: (document.querySelector('.olt-same p') || {}).textContent }; });
    ck(w + ' D13 householdHint + stopHint exact; D11 limits + link length shown', t.hint === 'A first name or nickname is plenty.' && t.sh === 'A shop or place name, not a home address. Anyone with the link can read it.' && t.limits === 'Names up to 24 characters, items 40, units 16, stops 40. The whole link can be up to 2,000 characters.' && /^Link length: [\d,]+ of 2,000 characters\.$/.test(t.room), t);
    ck(w + ' D7 household input keeps most of its row (short visible Remove, full name in aria-label); D12 Stop unknown uses mute ink (5.9:1); no sideways scroll', t.inW >= t.liW * 0.6 && t.rmTxt === 'Remove' && t.rmAria === 'Remove “Ana Maria de los Santos”' && t.unk === 'rgb(91, 101, 95)' && t.sw <= w, t);
    ck(w + ' PM2 Same stop? prompt shown to the owner, exact', t.prompt === 'Same stop? “corner shop” and “Corner Shop” differ only in capitals or spacing.', t.prompt);
    await p.click('#ss-y-0'); await sleep(80);
    t = await p.evaluate(() => ({ stops: [...document.querySelectorAll('#lane .olt-stopname')].map(e => e.textContent), arriving: document.querySelectorAll('.olt-ticket.is-arriving').length, adv: document.getElementById('belt').classList.contains('is-advancing'), same: document.querySelectorAll('.olt-same').length }));
    ck(w + ' PM2 "Same stop" groups only on the click; PM4 belt advances + changed tickets slide in (motion allowed)', t.stops.length === 3 && t.stops[2] === '“corner shop”' && !t.same && t.arriving >= 1 && t.adv, t);
    // D10: merge dissolved by an edit stays dissolved when the edit is reversed
    async function editUnit(id, u) { await p.click('#ed-' + id); await sleep(30); await typeInto(p, '#f-u', u); await p.click('#f-add'); await sleep(60); }
    await editUnit(5, 'litre'); await editUnit(5, 'carton');
    t = await p.evaluate(() => ({ merged: document.querySelectorAll('.olt-merged').length, offers: document.querySelectorAll('.olt-note--merge:not(.olt-same) button').length }));
    ck(w + ' D10 a merge an edit dissolved does not come back when the edit is reversed (offer shown again instead)', t.merged === 0 && t.offers === 1, t);
    // PM4 reduced motion: static
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.click('.olt-note--merge:not(.olt-same) button'); await sleep(60);
    t = await p.evaluate(() => ({ arriving: document.querySelectorAll('.is-arriving,.is-dropping').length, adv: document.getElementById('belt').classList.contains('is-advancing') && getComputedStyle(document.getElementById('belt')).animationName !== 'none' }));
    await p.emulateMediaFeatures([]); ck(w + ' PM4 reduced motion: no motion classes, instant change', !t.arriving && !t.adv, t);
    // D11 max length: a list whose fragment fits but whose WHOLE URL would pass 2,000 is refused for a link, fallback shown; one row less fits
    // (PM 03:48 receive cap: a received link over 2,000 in total no longer opens, so the over-cap list is reached the way a sender would: open the list
    //  just under the cap with a 1-letter household name, take a copy, then type the name out to 24 letters, which pushes the whole URL over 2,000.)
    const big = await p.evaluate(base => { const LN = 'A' + 'a'.repeat(23), pk = (h0, r) => MILL.pack('t', 1, { h: [h0, 'B'], r, m: [] }), pre = base.length + 1; let r = [];
      for (let i = 0; i < 30; i++) { r.push([i % 2, 'Item ' + 'x'.repeat(28), '1', 'u', 'Stop ' + i]); if (pk(LN, r).length + pre > 2000) break; }
      let k = 28; while (pk(LN, r).length + pre > 2000 && k > 0) r[r.length - 1][1] = 'Item ' + 'x'.repeat(--k);
      while (pk(LN, r).length + pre <= 2000) r[r.length - 1][1] += 'y';
      const f = pk(LN, r), under = pk('A', r); return { f, under, n: r.length, url: f.length + pre, underUrl: under.length + pre, frag: f.length }; }, BASE);
    await p.goto('about:blank'); await p.goto(BASE + '#' + big.under, { waitUntil: 'load' }); await sleep(150); await p.click('#own-copy'); await sleep(60);
    await typeInto(p, '#hh li:first-child input', 'A' + 'a'.repeat(23)); await sleep(80);
    await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.click('#b-share'); await sleep(120);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, lb: document.getElementById('linkbox').hidden, fb: document.getElementById('fbwrap').hidden, over: document.getElementById('linkroom').classList.contains('is-over'), room: document.getElementById('linkroom').textContent }));
    ck(w + ' D11 whole URL over 2,000 (fragment fits): no link made, tooLongLink, list text selectable, length shown as over', big.url > 2000 && big.frag <= 2000 && big.underUrl <= 2000 && t.toast === 'Too much for a link. Copy or print the list instead.' && t.lb && !t.fb && t.over, { big: { url: big.url, frag: big.frag, underUrl: big.underUrl }, t });
    const lastId = await p.evaluate(() => [...document.querySelectorAll('[id^=rm-]')].pop().id); await p.click('#' + lastId); await sleep(60); await p.click('#b-share'); await sleep(120);
    t = await p.evaluate(() => ({ link: document.getElementById('link').value, lb: document.getElementById('linkbox').hidden, ok: OLT.decode(document.getElementById('link').value.split('#')[1]).ok }));
    ck(w + ' D11 one row less: link made, whole URL <= 2,000 and opens', !t.lb && t.link.length <= 2000 && t.link.length > 1900 && t.ok, { len: t.link.length, ok: t.ok });
    ck(w + ' D4–D13 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  // ---- QA local-652d0e0: D5 typed-text audit, N1 first mouse click, N2 toast reset, N3 320 form, N4 real link length
  const HOST = ['Verified ✔ Bank', 'Kiwi Flat', 'You owe me, deadbeat', 'deadbeatunit', 'boxunit', 'I know where you live'];
  const HL = { h: ['Verified ✔ Bank', 'Kiwi Flat'], r: [[0, 'You owe me, deadbeat', '2', 'deadbeatunit', 'I know where you live'], [1, 'You owe me, deadbeat', '1', 'deadbeatunit', 'I know where you live'], [1, 'You owe me, deadbeat', '1', 'boxunit', 'I know where you live']], m: [] };
  const clipStub = p => p.evaluate(() => { window.__clip = ''; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip = t; return Promise.resolve(); } } }); });
  const mouseOn = async (p, sel) => { const h = await p.$(sel); await h.evaluate(e => e.scrollIntoView({ block: 'center' })); const b = await h.boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(40); await p.mouse.up(); await sleep(150); };
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); let t;
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(100);
    const frag = await p.evaluate(o => MILL.pack('t', 1, o), HL);
    await p.goto('about:blank'); await p.goto(BASE + '#' + frag, { waitUntil: 'load' }); await sleep(250); await clipStub(p);
    await p.click('#b-copy'); await sleep(120); const clip = await p.evaluate(() => window.__clip);
    let a = await typedAudit(p, HOST, { copied: clip, fallback: await p.$eval('#fallback', e => e.value) });
    ck(w + ' D5 recipient: every sender string quoted in visible text, aria-labels, describedby, live regions, toast and copied text', a.ok && /“deadbeatunit”/.test(clip), a);
    t = await p.evaluate(() => [...document.querySelectorAll('#lane .olt-line')].map(l => l.textContent));
    ck(w + ' D5 ticket line: qty, then quoted unit, then quoted item', t.some(x => x.startsWith('2 “deadbeatunit” “You owe me, deadbeat”')) || t.some(x => x.startsWith('3 “deadbeatunit” “You owe me, deadbeat”')), t);
    await mouseOn(p, '[id^=mg-]'); a = await typedAudit(p, HOST, { copied: await p.$eval('#fallback', e => e.value) });
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, kept: [...document.querySelectorAll('.olt-note--kept')].map(e => e.textContent) }));
    ck(w + ' D5 merge (recipient -> own copy): toast + editor + kept note quoted', a.ok && t.toast === 'Merged “You owe me, deadbeat” into one line.' && t.kept.every(k => /“[^”]+” isn't “[^”]+”/.test(k)), { a, t });
    await mouseOn(p, '[id^=um-]'); a = await typedAudit(p, HOST);
    t = await p.evaluate(() => document.getElementById('toast').textContent);
    ck(w + ' D5 split back out: toast quoted; whole page still clean', a.ok && t === '“You owe me, deadbeat” split back out.', { a, t });
    // N2: a visible toast is gone (and its timer cleared) after the hash changes, bad link or good
    await p.click('#b-copy'); await sleep(60); const before = await p.$eval('#toast', e => !e.hidden);
    await p.evaluate(() => { location.hash = 't1.broken'; }); await sleep(150);
    t = await p.evaluate(() => ({ hidden: document.getElementById('toast').hidden, txt: document.getElementById('toast').textContent }));
    ck(w + ' N2 toast cleared on route change (bad link)', before && t.hidden && t.txt === '', t);
    await p.evaluate(f => { location.hash = f; }, frag); await sleep(150); await mouseOn(p, '#own-copy'); await mouseOn(p, '[id^=mg-]');
    await p.evaluate(() => { location.hash = ''; }); await sleep(3400);
    t = await p.evaluate(() => ({ hidden: document.getElementById('toast').hidden, txt: document.getElementById('toast').textContent }));
    ck(w + ' N2 toast from an own-copy merge does not come back over the next list (timer cleared)', t.hidden && t.txt === '', t);
    // N1: first real mouse click after "Make my own from this" / "Add household" acts (no re-render on blur)
    const N1L = await p.evaluate(() => MILL.pack('t', 1, { h: ['Fay', 'Gus'], r: [[0, 'Tea', '1', '', 'Cafe'], [1, 'Tea', '2', '', 'Cafe']], m: [] }));
    const fresh = async () => { await p.goto('about:blank'); await p.goto(BASE + '#' + N1L, { waitUntil: 'load' }); await sleep(200); await mouseOn(p, '#own-copy'); };
    await fresh(); const act = await p.evaluate(() => document.activeElement.id); await mouseOn(p, '[id^=ed-]');
    t = await p.evaluate(() => ({ i: document.getElementById('f-i').value, add: document.getElementById('f-add').textContent }));
    ck(w + ' N1 own copy -> first mouse click on Edit opens the edit', t.i === 'Tea' && t.add === 'Save item', { act, t });
    await fresh(); await mouseOn(p, '#lane .olt-check'); t = await p.evaluate(() => document.querySelectorAll('#lane .olt-check:checked').length);
    ck(w + ' N1 own copy -> first mouse click on a checkbox ticks it', t === 1, t);
    await fresh(); await mouseOn(p, '[id^=mg-]'); t = await p.evaluate(() => document.querySelectorAll('.olt-merged').length);
    ck(w + ' N1 own copy -> first mouse click on Merge merges', t === 1, t);
    await fresh(); await mouseOn(p, '#hh-add'); const act2 = await p.evaluate(() => document.activeElement.id); await mouseOn(p, '[id^=ed-]');
    t = await p.evaluate(() => ({ i: document.getElementById('f-i').value, err: [...document.querySelectorAll('[id^=hhe-]')].map(e => e.textContent).filter(Boolean) }));
    ck(w + ' N1 Add household -> first mouse click on Edit opens the edit; empty-name error still shown in place', t.i === 'Tea' && t.err.length === 1, { act2, t });
    // N4: an over-cap list shows its REAL link length (not a made-up FRAG_MAX + prefix + 1)
    // (PM 03:48 receive cap: the starting list must itself open, so rows are dropped until its whole URL is within 2,000; the four added rows take it over)
    const N4 = await p.evaluate(base => { const h = ['A', 'B'], r = []; for (let i = 0; i < 26; i++) r.push([i % 2, 'Item ' + i + 'x'.repeat(24), '1', 'u', 'Stop ' + i]);
      while (base.length + 1 + MILL.pack('t', 1, { h, r, m: [] }).length > 2000) r.pop(); return { h, r, f: MILL.pack('t', 1, { h, r, m: [] }) }; }, BASE);
    await p.goto('about:blank'); await p.goto(BASE + '#' + N4.f, { waitUntil: 'load' }); await sleep(200); await mouseOn(p, '#own-copy');
    const extra = []; for (let k = 0; k < 4; k++) { const it = 'More ' + k + 'z'.repeat(30); extra.push([0, it, '1', 'u', 'Stop Z' + k]); await addRow(p, 1, it, '1', 'u', 'Stop Z' + k); }
    t = await p.evaluate((N4, extra, base) => ({ txt: document.getElementById('linkroom').textContent, real: base.length + 1 + MILL.pack('t', 1, { h: N4.h, r: N4.r.concat(extra), m: [] }).length, fake: OLT.FRAG_MAX + base.length + 1 + 1 }), N4, extra, BASE);
    const shown = +((t.txt.match(/Link length: ([\d,]+) of/) || [])[1] || '0').replace(/,/g, '');
    ck(w + ' N4 over-cap link length shows the real length', shown === t.real && shown > 2000 && /Too much for a link/.test(t.txt), { shown, t });
    // N3: at 320 the For select, the Stop field and the limits note are full width
    if (w === 320) { await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      t = await p.evaluate(() => { const W = id => Math.round(document.getElementById(id).getBoundingClientRect().width); return { fo: W('f-o'), fs: W('f-s'), fi: W('f-i'), lim: W('limits'), hint: W('h-s'), form: W('form') }; });
      ck('320 N3 For, Item, Stop and the limits note stack full width (no "The Nguyen-(" / "Hardware" clipping)', t.fo >= t.form - 4 && t.fs >= t.form - 4 && t.fi >= t.form - 4 && t.lim >= t.form - 4 && t.hint >= t.form - 30, t); }
    await s.b.close(); }
  // QA N1 (same tab, all pieces)
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const r = await sameTabBadLink(p, { errSel: '.olt-err', bad: 't1.broken',
      fill: async p => { await p.click('#f-add'); await sleep(50); await typeInto(p, '#hh-1', 'Ana'); await typeInto(p, '#hh-2', 'Ben'); await addRow(p, 1, 'Milk', '1', 'l', 'Shop'); await typeInto(p, '#f-q', 'abc'); await p.click('#f-add'); await sleep(50); },
      link: async p => { await p.evaluate(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); }); await p.click('#b-share'); await sleep(200); return p.$eval('#link', e => e.value); } });
    ck(w + ' N1 same tab: bad link after fill + link + open shows zero validation errors', r.ok, r); await s.b.close(); }
  // PM 03:48 (audit 04:00): the WHOLE received URL is capped at 2,000 with the shared MILLVIEW.linkFor before decode (as in Sack, Even Up, Care Rota).
  // Normal path /mill/one-less-trip/ under a long *.localhost origin (Chrome resolves *.localhost to this server; hostnames up to 253) and a long path (throwaway
  // server, nested dirs + symlink to this tree): 1999 and 2000 open; 2001 and 2040 show this piece's bad-link message and nothing received.
  { const fsx = require('fs'), osx = require('os'), pathx = require('path'), { spawn } = require('child_process'), REPO = pathx.resolve(__dirname, '../..');
    const X = require('../../mill/one-less-trip/olt.js'), CX = require('vm').runInNewContext(fsx.readFileSync(__dirname + '/../../mill/one-less-trip/copy.js', 'utf8') + ';COPY');
    const MARK = 'Zqxd7', em = '\u{1F600}', E = (k, ch) => ch.repeat(k);
    const pickF = (gen, lo, hi) => { for (let k = 0; k < 400; k++) { const f = gen(k); if (f && f.length >= lo && f.length <= hi) return f; } return null; };
    const BIG = pickF(k => { const st = { h: [{ id: 1, name: MARK }, { id: 2, name: 'Ben' }], r: [], m: [], next: 200 }; for (let i = 0; i < Math.min(k, 30); i++) st.r.push({ id: 100 + i, o: 1 + (i % 2), i: 'Item' + i + ' ' + E(8, em), q: 1, u: 'bag', s: 'Shop ' + E(6, em) }); return X.encode(st); }, 1760, 1960), SMALL = X.encode({ h: [{ id: 1, name: MARK }, { id: 2, name: 'Ben' }], r: [{ id: 100, o: 1, i: 'Milk', q: 2, u: 'carton', s: 'Shop' }, { id: 101, o: 2, i: 'Tea', q: 1, u: '', s: 'Shop' }], m: [], next: 102 });
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    const openAt = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300);
      return p.evaluate((MARK, bad) => { const t = document.body.innerText; return { len: location.href.length, opened: t.includes(MARK) && !t.includes(bad), bad: t.includes(bad) && !t.includes(MARK) }; }, MARK, CX.badLink); };
    const port = H.includes(':') ? ':' + H.split(':').pop() : '', PATH = '/mill/one-less-trip/', fixed = (SCHEME + '://').length + port.length + PATH.length + 1 + BIG.length;
    const hostOf = n => { const labels = []; let left = n - 10; while (left > 0) { const k = Math.min(63, left > 63 ? left - 1 : left); labels.push('a'.repeat(k)); left -= k + 1; } const h = labels.join('.') + '.localhost'; if (h.length !== n) throw new Error('host ' + h.length + ' != ' + n); return h; };
    const normal = {}, maxN = fixed + 253;
    for (const want of [1999, 2000, 2001, 2040]) { const total = Math.min(want, maxN); const r = await openAt(SCHEME + '://' + hostOf(total - fixed) + port + PATH + '#' + BIG); r.want = want; normal[want] = r; }
    const root = fsx.mkdtempSync(osx.tmpdir() + '/d7-one-less-trip-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] }); const long = {};
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
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
