// node tests/browser/mill-tsh.qa.js <host[:port]> <ip> [scheme] — The Same Hour @320/390/1280 (ENGINEER SELF-CHECK, not QA)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const T = require('../../mill/the-same-hour/tsh.js'), M = require('../../mill/shared/core.js');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/the-same-hour/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/the-same-hour/`, NY = 'America/New_York';
let vid = 10; const mk = (people, o = {}) => ({ w: o.w || '2026-10-19', z: o.z === undefined ? NY : o.z, n: String(o.n || 60), u: o.u || 'min', t: o.t || '', p: people.map(([n, iv], i) => ({ id: i + 1, n, iv: iv.map(([d, s, e]) => ({ id: vid++, d, s, e })) })) });
const ex = o => mk([['Rae', [[0, '18:00', '20:00'], [2, '12:00', '14:00'], [2, '13:30', '15:00'], [5, '09:00', '12:00']]], ['Sol', [[0, '19:00', '21:00'], [2, '14:00', '16:00'], [5, '11:00', '13:00']]], ['Tam', [[0, '18:30', '20:30'], [2, '15:00', '17:00'], [3, '10:00', '12:00']]]], o);
const link = st => BASE + '#' + T.encode(st);
const view = p => p.evaluate(() => { const g = id => document.getElementById(id), tx = id => g(id).textContent, vis = id => !g(id).hidden;
  return { zone: tx('zone'), banner: vis('banner') ? tx('banner-t') : '', fix: vis('fix') ? tx('fix') : '', res: vis('res'), opts: [...document.querySelectorAll('#opts li')].map(l => l.querySelector('b').textContent), prop: vis('prop') ? tx('prop-h') : '', propAll: vis('prop') ? g('prop').innerText : '',
    none: vis('none') ? [...g('none').querySelectorAll('p,h3')].map(e => e.textContent).join('\n') : '', empty: vis('empty') ? tx('empty-t') : '', seams: [...document.querySelectorAll('.tsh-seam')].map(s => s.className + ':' + s.textContent), touch: [...document.querySelectorAll('.tsh-touch')].map(s => s.textContent),
    collapsed: [...document.querySelectorAll('.tsh-collapsed .tsh-dayname')].map(e => e.textContent), weaves: [...document.querySelectorAll('.tsh-weave')].map(e => e.getAttribute('aria-label')), merged: [...document.querySelectorAll('.tsh-merged')].filter(e => !e.hidden).map(e => e.textContent),
    invalid: document.querySelectorAll('[aria-invalid=true]').length, errs: [...document.querySelectorAll('.tsh-form .tsh-err')].map(e => e.textContent).filter(Boolean) }; });
const stubClip = (p, ok) => p.evaluate(ok => { window.__clip = null; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip = t; return ok ? Promise.resolve() : Promise.reject(new Error('denied')); } } }); }, ok);
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  const propText = 'Coffee\nMon 19 Oct 2026, 19:00–20:00\nAll times in America/New_York (EDT, UTC\u221204:00).\n1 hour · Rae, Sol, Tam\nWorked out from the free times typed in. Nobody has replied to it yet.';
  for (const w of W) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    let t = await view(p);
    ck(w + ' empty: zone not set line, empty note, no proposal, no red errors before input', t.zone === C.zoneNotSet && t.empty === C.emptyState && !t.prop && !t.none && !t.invalid && !t.errs.length && !t.fix, t);
    await p.select('#z', NY); await p.$eval('#w', e => { e.value = '2026-10-19'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await typeInto(p, '#pn-1', 'Ana'); await typeInto(p, '#pn-2', 'Ben');
    await p.focus('#pa-1'); await p.keyboard.press('Enter'); await sleep(50); await p.keyboard.type('09:00'); await p.keyboard.press('Tab'); await p.keyboard.type('11:00');
    await p.focus('#pa-2'); await p.keyboard.press('Enter'); await sleep(50); await p.keyboard.type('10:00'); await p.keyboard.press('Tab'); await p.keyboard.type('12:00'); await sleep(80);
    t = await view(p); ck(w + ' typed by keyboard: one window Mon 19 Oct 10:00–11:00, zone line computed', t.opts.join() === 'Mon 19 Oct, 10:00–11:00' && /America\/New_York \(EDT, UTC\u221204:00\)/.test(t.zone) && t.prop === 'Mon 19 Oct 2026, 10:00–11:00 (America/New_York)', t);
    await p.focus('#find'); await p.keyboard.press('Enter'); await sleep(50); ck(w + ' Find the overlap moves focus to results', (await p.evaluate(() => document.activeElement.id)) === 'res');
    await p.goto(link(ex({ t: 'Coffee' })), { waitUntil: 'load' }); await sleep(250); t = await view(p);
    ck(w + ' link opens snapshot banner (receiverIntro + receiverNote)', t.banner === C.receiverIntro + ' ' + C.receiverNote, t.banner);
    ck(w + ' s1: only Mon 19:00–20:00 offered; proposal card states slot + zone', t.opts.join() === 'Mon 19 Oct, 19:00–20:00' && t.prop === 'Mon 19 Oct 2026, 19:00–20:00 (America/New_York)' && t.propAll.includes('America/New_York (EDT, UTC\u221204:00)') && t.propAll.includes('1 hour · Rae, Sol, Tam') && t.propAll.includes(C.proposalSnapshot), t);
    ck(w + ' s1: Wed touch pin at 15:00, no Wed seam; touch note shown', t.touch.join() === '15:00' && t.seams.filter(x => !/is-maybe|is-short/.test(x)).length === 1 && t.propAll.includes(C.touchNote), t.seams);
    ck(w + ' s1: Sat blocked by unknown (dashed "Tam ?" outline + proposalExcluded line), never offered', t.seams.some(x => /is-maybe/.test(x) && x.endsWith('Tam ?')) && t.propAll.includes("Sat 24 Oct 11:00–12:00 isn't offered: Tam's Saturday is unknown."), t.propAll);
    ck(w + ' s1: Tue/Fri/Sun collapse to one unknown-for-everyone line', t.collapsed.length === 1 && t.collapsed[0].startsWith('Tue Fri Sun'), t.collapsed);
    ck(w + ' s1: day weave aria-label lists everyone, unknown named', t.weaves.some(a => a.startsWith('Sat 24 Oct.') && a.includes('Tam: Not given;')) && t.weaves.some(a => a.includes(M.fill(C.overlapAria, { day: 'Mon 19 Oct', start: '19:00', end: '20:00' }))), t.weaves);
    ck(w + ' s1: Rae Wed merged before comparing (sources kept)', t.merged.length === 1 && t.merged[0] === C.mergeNote + ' Wed 12:00–14:00 + 13:30–15:00 → 12:00–15:00', t.merged);
    await stubClip(p, true); await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(100);
    ck(w + ' copy proposal: exact proposalText (date, start–end, zone+offset, length, names, snapshot caveat)', (await p.evaluate(() => window.__clip)) === propText, await p.evaluate(() => window.__clip));
    await p.focus('#astext'); await p.keyboard.press('Enter'); await sleep(80);
    t = await p.evaluate(() => ({ cap: document.querySelector('#tbl caption').textContent, vis: !document.getElementById('tblwrap').hidden && document.getElementById('vis').hidden, pressed: document.getElementById('astext').getAttribute('aria-pressed'), lbl: document.getElementById('astext').textContent, wed: [...document.querySelectorAll('#tbl tbody tr')][2].innerText, sat: [...document.querySelectorAll('#tbl tbody tr')][5].innerText }));
    ck(w + ' show as text: table with caption, touch + unknown reasons listed', t.vis && t.pressed === 'true' && t.lbl === C.showAsRibbons && t.cap === 'Free times in America/New_York, week of Mon 19 Oct 2026' && t.wed.includes(C.touchNote) && t.sat.includes('Not given') && t.sat.includes("isn't offered"), t);
    await p.focus('#astext'); await p.keyboard.press('Enter'); await sleep(50);
    const of = await overflow(p); ck(w + ' no horizontal overflow (s1)', of.sw <= w && !of.bad.length, of);
    const ov = await textOverlap(p, '.tsh-dayname, .tsh-zone span, .tsh-otext > b, .tsh-otext > span, #prop-h, #prop-z, #prop-n, .tsh-legend li span:last-child, .tsh-collapsed span'); ck(w + ' no text overlap (s1)', !ov.length, ov);
    await typeInto(p, '#n', '90'); await sleep(80); t = await view(p);
    ck(w + ' s2 (90 min): no-overlap card, closest slot + shortfall, unknown count, ask line; proposal hidden', !t.prop && t.none.includes('No shared 90 minutes') && t.none.includes("Mon 19 Oct, 19:00–20:00: everyone's free, but only for 1 hour. 30 minutes short") && t.none.includes(M.plural(C.noOverlapUnknown, 3)) && t.none.includes(C.noOverlapAsk) && t.seams.some(x => /is-short/.test(x)), t.none);
    ck(w + ' editing clears the address bar and banner', (await p.evaluate(() => location.hash)) === '' && !t.banner);
    await stubClip(p, true); await p.focus('#b-ncopy'); await p.keyboard.press('Enter'); await sleep(100);
    ck(w + ' copy no-overlap note text', (await p.evaluate(() => window.__clip)) === 'No shared 90 minutes in the week of Mon 19 Oct 2026 (America/New_York).\nClosest: Mon 19 Oct 2026, 19:00–20:00, 30 minutes short.\nUnknown: Rae: Tue, Thu, Fri, Sun; Sol: Tue, Thu, Fri, Sun; Tam: Tue, Fri, Sat, Sun', await p.evaluate(() => window.__clip));
    await typeInto(p, '#n', '60'); await sleep(50); await p.emulateMediaType('print');
    t = await p.evaluate(() => ({ form: getComputedStyle(document.querySelector('.tsh-form')).display, prop: getComputedStyle(document.getElementById('prop')).display, zone: getComputedStyle(document.getElementById('zone')).display, btns: getComputedStyle(document.querySelector('#prop .tsh-actions')).display }));
    await p.emulateMediaType(null); ck(w + ' print: zone line + loom + proposal; form and buttons hidden', t.form === 'none' && t.prop !== 'none' && t.zone !== 'none' && t.btns === 'none', t);
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); t = await p.evaluate(() => getComputedStyle(document.querySelector('.tsh-rib:not(.is-unknown)')).animationName); await p.emulateMediaFeatures([]);
    ck(w + ' reduced motion: ribbons appear without unfurl animation', t === 'none', t);
    const miss = await tabReach(p, ['home', 'astext', 'pick-0', 'b-copy', 'b-print', 'b-share', 'b-reset', 'z', 'w', 'n', 'u', 't', 'pn-1', 'pr-1', 'pa-1', 'addp', 'find'], 200); ck(w + ' keyboard reach', !miss.length, miss);
    await stubClip(p, true); await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(80);
    await p.focus('#b-reset'); await p.keyboard.press('Enter'); await sleep(150); t = await view(p);
    ck(w + ' reset clears everything incl. hidden link box value and address bar', t.zone === C.zoneNotSet && !t.prop && (await p.$eval('#pn-1', e => e.value)) === '' && (await p.$eval('#linkbox', e => e.hidden)) && (await p.$eval('#link', e => e.value)) === '' && (await p.evaluate(() => location.hash)) === '', t);
    await p.goto(link(mk([['A', [[6, '01:30', '03:00']]], ['B', [[6, '00:00', '04:00'], [0, '24:00', '10:00']]]], { w: '2026-10-26' })), { waitUntil: 'load' }); await sleep(200); t = await view(p);
    ck(w + ' fall-back: 01:30 rejected (dstAmbiguous), clocks-change line, summary counts entries, nothing proposed', t.fix.includes('2 entries need fixing. Nothing was moved or guessed.') && t.errs.includes("01:30 happens twice on Sun 1 Nov 2026 in America/New_York. Pick a time that isn't repeated.") && t.zone.includes('Clocks change Sun 1 Nov 2026: 02:00 EDT becomes 01:00 EST.') && !t.prop && !t.none && t.empty === C.fixToContinue, t);
    await p.goto(link(mk([['A', [[6, '02:30', '04:00']]], ['B', [[6, '00:00', '05:00']]]], { w: '2027-03-08' })), { waitUntil: 'load' }); await sleep(200); t = await view(p);
    ck(w + ' spring-forward: 02:30 rejected (dstGap)', t.errs.includes("02:30 doesn't exist on Sun 14 Mar 2027 in America/New_York; the clocks skip it. Pick another time.") && !t.prop, t.errs);
    await p.goto(link(mk([['<img src=x onerror=1>', [[0, '09:00', '10:00']]], ['B', [[0, '09:00', '10:00']]]])), { waitUntil: 'load' }); await sleep(200);
    t = await p.evaluate(() => ({ img: document.querySelectorAll('img').length, legend: document.querySelector('.tsh-legend .tsh-lname').textContent, prop: document.getElementById('prop-n').textContent }));
    ck(w + ' text-safe: markup in a name is shown as text', !t.img && t.legend === '<img src=x onerror=1>' && t.prop.includes('<img src=x onerror=1>'), t);
    const sg = await storage(p); ck(w + ' storage empty', !sg.cookie && !sg.ls.length && !sg.ss.length && !(Array.isArray(sg.idb) && sg.idb.length) && !sg.caches.length && !sg.sw && !sg.undef, sg);
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 390, height: 800 }); const f = T.encode(ex());
    for (const [nm, h, want] of [['tampered', f.slice(0, -1) + (f.slice(-1) === 'a' ? 'b' : 'a'), C.badLink], ['truncated', f.slice(0, 40), C.badLink], ['old version', M.pack('h', 9, {}), C.oldVersion], ['oversized', 'h1.' + 'A'.repeat(2100) + '.000000', C.badLink], ['bad zone', M.pack('h', 1, { w: '2026-10-19', z: 'Mars/Base', n: '60', u: 'min', t: '', p: [] }), C.badLink]]) {
      await p.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(120); const t = await view(p); ck('390 ' + nm + ' link refused with message, nothing loaded', t.banner === want && !t.prop && (await p.$eval('#pn-1', e => e.value)) === '', t.banner); }
    ck('390 link checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 }); await p.goto(link(ex()), { waitUntil: 'load' }); await sleep(200);
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(150);
    let t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value, selected: document.getSelection().toString().length }));
    ck('390 share cancel: shareCancel toast, link stays selected (#h1)', t.toast === C.shareCancel && t.sel === 'link' && /#h1\./.test(t.link) && t.selected > 20, t);
    await stubClip(p, false); await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(150);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, val: document.getElementById('fallback').value, lbl: document.getElementById('fb-l').textContent }));
    ck('390 copy failure: copyFail, proposal text left selected in labelled box', t.toast === C.copyFail && t.sel === 'fallback' && t.val.startsWith('Mon 19 Oct 2026, 19:00–20:00') && t.lbl === C.copyTextLabel, t);
    ck('390 share/copy no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 320, height: 800 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    for (let i = 0; i < 5; i++) { await p.focus('#addp'); await p.keyboard.press('Enter'); await sleep(30); }
    let t = await p.evaluate(() => ({ n: document.querySelectorAll('.tsh-person').length, dis: document.getElementById('addp').disabled, msg: document.getElementById('e-p').textContent }));
    ck('320 six people max, then disabled with message', t.n === 6 && t.dis && t.msg === C.tooManyPeople, t);
    const L = 'Pneumonoultramicroscopicx'; await p.goto(link(mk([[L.slice(0, 24), [[0, '09:00', '10:00']]], ['B'.repeat(24), [[0, '09:00', '10:00']]]], { t: 'C'.repeat(40) })), { waitUntil: 'load' }); await sleep(200);
    const of = await overflow(p); const ov = await textOverlap(p, '.tsh-lane-label, .tsh-dayname, #prop-h, #prop-title, #prop-n, .tsh-legend .tsh-lname, .tsh-otext > b');
    ck('320 longest single-word names/title: no overflow, no text overlap, full name in title attr', of.sw <= 320 && !of.bad.length && !ov.length && (await p.$eval('.tsh-lane-label', e => e.title)) === L.slice(0, 24), { of, ov });
    await typeInto(p, '#pn-1', L); await p.focus('#n'); await sleep(50); t = await view(p);
    ck('320 name over 24 characters flagged', t.errs.includes(M.plural(C.personTooLong, 1)), t.errs);
    ck('320 limits no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})();
