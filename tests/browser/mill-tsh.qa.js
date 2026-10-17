// node tests/browser/mill-tsh.qa.js <host[:port]> <ip> [scheme] — The Same Hour @320/390/1280 (ENGINEER SELF-CHECK, not QA)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result, reallyHidden, typedAudit, mouseAt } = require('./mill-common');
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
  const propText = '“Coffee”\nMon 19 Oct 2026, 19:00–20:00\nAll times in America/New_York (EDT, UTC\u221204:00).\n1 hour · Free then: “Rae”, “Sol”, “Tam”\nWorked out from the names and times the sender typed. Nobody has replied to it yet.';
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
    ck(w + ' s1: only Mon 19:00–20:00 offered; proposal card states slot + zone', t.opts.join() === 'Mon 19 Oct, 19:00–20:00' && t.prop === 'Mon 19 Oct 2026, 19:00–20:00 (America/New_York)' && t.propAll.includes('America/New_York (EDT, UTC\u221204:00)') && t.propAll.includes('1 hour · “Rae”, “Sol”, “Tam”') && t.propAll.includes(C.proposalSnapshot), t);
    ck(w + ' s1: Wed touch pin at 15:00, no Wed seam; touch note shown', t.touch.join() === '15:00' && t.seams.filter(x => !/is-maybe|is-short/.test(x)).length === 1 && t.propAll.includes(C.touchNote), t.seams);
    ck(w + ' s1: Sat blocked by unknown (dashed "Tam ?" outline + proposalExcluded line), never offered', t.seams.some(x => /is-maybe/.test(x) && x.endsWith('?')) && t.propAll.includes("Sat 24 Oct 11:00–12:00 isn't offered. Unknown Saturday: “Tam”."), t.propAll);
    ck(w + ' s1: Tue/Fri/Sun collapse to one unknown-for-everyone line', t.collapsed.length === 1 && t.collapsed[0].startsWith('Tue Fri Sun'), t.collapsed);
    ck(w + ' s1: day weave aria-label lists everyone, unknown named', t.weaves.some(a => a.startsWith('Sat 24 Oct.') && a.includes('“Tam”: Not given;')) && t.weaves.some(a => a.includes(M.fill(C.overlapAria, { day: 'Mon 19 Oct', start: '19:00', end: '20:00' }))), t.weaves);
    ck(w + ' s1: Rae Wed merged before comparing (sources kept)', t.merged.length === 1 && t.merged[0] === C.mergeNote + ' Wed 12:00–14:00 + 13:30–15:00 → 12:00–15:00', t.merged);
    await stubClip(p, true); await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(100);
    ck(w + ' copy proposal: exact proposalText (date, start–end, zone+offset, length, names, snapshot caveat)', (await p.evaluate(() => window.__clip)) === propText, await p.evaluate(() => window.__clip));
    await p.focus('#astext'); await p.keyboard.press('Enter'); await sleep(80);
    t = await p.evaluate(() => ({ cap: document.querySelector('#tbl caption').textContent, vis: !document.getElementById('tblwrap').hidden && document.getElementById('vis').hidden, pressed: document.getElementById('astext').getAttribute('aria-pressed'), lbl: document.getElementById('astext').textContent, wed: [...document.querySelectorAll('#tbl tbody tr')][2].innerText, sat: [...document.querySelectorAll('#tbl tbody tr')][5].innerText }));
    ck(w + ' show as text: table with caption, touch + unknown reasons listed', t.vis && t.pressed === 'true' && t.lbl === C.showAsRibbons && t.cap === 'Free times in America/New_York, week of Mon 19 Oct 2026' && t.wed.includes(C.touchNote) && t.sat.includes('Not given') && t.sat.includes("isn't offered"), t);
    await p.focus('#astext'); await p.keyboard.press('Enter'); await sleep(50);
    const of = await overflow(p); ck(w + ' no horizontal overflow (s1)', of.sw <= w && !of.bad.length, of);
    const ov = await textOverlap(p, '.tsh-dayname, .tsh-zone span, .tsh-otext > b, .tsh-otext > span, #prop-h, #prop-z, #prop-n, .tsh-legend li span:last-child, .tsh-collapsed span'); ck(w + ' no text overlap (s1)', !ov.length, ov);
    { const ro = await p.evaluate(() => ({ en: [...document.querySelectorAll('#form input,#form select,#form textarea,#form button')].filter(e => !e.disabled).map(e => e.id), inert: document.getElementById('form').inert, picks: [...document.querySelectorAll('[id^=pick-]')].filter(e => !e.disabled).length }));
      const rh = await reallyHidden(p, ['#b-reset', '#b-nreset']);
      ck(w + ' recipient read-only in DOM: every form control disabled (never inert), both Start over buttons not rendered; slot picks still usable', !ro.en.length && !ro.inert && ro.picks > 0 && rh.ok, { ro, rh });
      await p.click('#own-copy'); await sleep(80);
      const un = await p.evaluate(() => ({ inert: document.getElementById('form').inert, n: document.getElementById('n').disabled, nm: document.getElementById('pn-1').value, reset: document.getElementById('b-reset').hidden }));
      ck(w + ' Make my own copy unlocks the form and keeps the times', !un.inert && !un.n && un.nm === 'Rae' && !un.reset, un); }
    await typeInto(p, '#n', '90'); await sleep(80); t = await view(p);
    ck(w + ' s2 (90 min): no-overlap card, closest slot + shortfall, unknown count, ask line; proposal hidden', !t.prop && t.none.includes('No shared 90 minutes') && t.none.includes("Mon 19 Oct, 19:00–20:00: everyone's free, but only for 1 hour. 30 minutes short") && t.none.includes(M.plural(C.noOverlapUnknown, 3)) && t.none.includes(C.noOverlapAsk) && t.seams.some(x => /is-short/.test(x)), t.none);
    ck(w + ' editing clears the address bar and banner', (await p.evaluate(() => location.hash)) === '' && !t.banner);
    await stubClip(p, true); await p.focus('#b-ncopy'); await p.keyboard.press('Enter'); await sleep(100);
    ck(w + ' copy no-overlap note text', (await p.evaluate(() => window.__clip)) === 'No shared 90 minutes in the week of Mon 19 Oct 2026 (America/New_York).\nClosest: Mon 19 Oct 2026, 19:00–20:00, 30 minutes short.\nUnknown: “Rae”: Tue, Thu, Fri, Sun; “Sol”: Tue, Thu, Fri, Sun; “Tam”: Tue, Fri, Sat, Sun', await p.evaluate(() => window.__clip));
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
    // DST correctness (Joshua 23:38): Sun 1 Nov 2026 fall-back slot that spans the change; spring-forward 8 Mar 2026 slot; slot after the change uses EST
    await p.goto(link(mk([['A', [[6, '00:00', '04:00']]], ['B', [[6, '00:30', '03:00']]]], { w: '2026-10-26', n: 30 })), { waitUntil: 'load' }); await sleep(200); t = await view(p);
    let dst = await p.evaluate(() => ({ dst: document.getElementById('prop-dst').hidden ? '' : document.getElementById('prop-dst').textContent, z: document.getElementById('prop-z').textContent })); await stubClip(p, true); await p.click('#b-copy'); await sleep(120); dst.clip = await p.evaluate(() => window.__clip);
    ck(w + ' DST fall-back 1 Nov 2026: 00:30–03:00 offered as 210 minutes of real time; card + copied text say the clocks change inside it', t.opts.join() === 'Sun 1 Nov, 00:30–03:00' && t.propAll.includes('210 minutes') && dst.dst === 'Clocks change Sun 1 Nov 2026: 02:00 EDT becomes 01:00 EST.' && /\(EDT, UTC\u221204:00\)/.test(dst.z) && dst.clip === 'Sun 1 Nov 2026, 00:30–03:00\nAll times in America/New_York (EDT, UTC\u221204:00).\nClocks change Sun 1 Nov 2026: 02:00 EDT becomes 01:00 EST.\n210 minutes · Free then: “A”, “B”\nWorked out from the names and times the sender typed. Nobody has replied to it yet.', Object.assign(dst, t));
    await p.goto(link(mk([['A', [[6, '03:00', '05:00']]], ['B', [[6, '03:00', '05:00']]]], { w: '2026-10-26' })), { waitUntil: 'load' }); await sleep(200);
    dst = await p.evaluate(() => ({ z: document.getElementById('prop-z').textContent, dstHidden: document.getElementById('prop-dst').hidden, panel: document.getElementById('zone').textContent }));
    ck(w + ' DST fall-back 1 Nov 2026: a slot after the change is labelled EST UTC−05:00 and has no in-slot change line; week panel still shows the change', /\(EST, UTC\u221205:00\)/.test(dst.z) && dst.dstHidden && dst.panel.includes('Clocks change Sun 1 Nov 2026: 02:00 EDT becomes 01:00 EST.'), dst);
    await p.goto(link(mk([['A', [[6, '01:00', '04:00']]], ['B', [[6, '01:00', '04:00']]]], { w: '2026-03-02', n: 30 })), { waitUntil: 'load' }); await sleep(200); t = await view(p);
    dst = await p.evaluate(() => document.getElementById('prop-dst').textContent);
    ck(w + ' DST spring-forward 8 Mar 2026: 01:00–04:00 is 2 hours of real time; change line inside the slot', t.opts.join() === 'Sun 8 Mar, 01:00–04:00' && t.propAll.includes('2 hours') && dst === 'Clocks change Sun 8 Mar 2026: 02:00 EST becomes 03:00 EDT.' && t.zone.includes('Clocks change Sun 8 Mar 2026: 02:00 EST becomes 03:00 EDT.'), Object.assign({ dst }, t));
    await p.goto(link(mk([['A', [[6, '01:00', '04:00']]], ['B', [[6, '01:00', '04:00']]]], { w: '2026-03-02', n: 3, u: 'hr' })), { waitUntil: 'load' }); await sleep(200); t = await view(p);
    ck(w + ' DST spring-forward 8 Mar 2026: asking 3 hours finds nothing (wall clock 3 h is 2 h real), closest says 1 hour short', !t.prop && t.none.includes('only for 2 hours. 1 hour short'), t.none);
    await p.goto(link(mk([['<img src=x onerror=1>', [[0, '09:00', '10:00']]], ['B', [[0, '09:00', '10:00']]]])), { waitUntil: 'load' }); await sleep(200);
    t = await p.evaluate(() => ({ img: document.querySelectorAll('img').length, legend: document.querySelector('.tsh-legend .tsh-lname').textContent, prop: document.getElementById('prop-n').textContent }));
    ck(w + ' text-safe: markup in a name is shown as text', !t.img && t.legend === '“<img src=x onerror=1>”' && t.prop.includes('“<img src=x onerror=1>”'), t);
    const sg = await storage(p); ck(w + ' storage empty', !sg.cookie && !sg.ls.length && !sg.ss.length && !(Array.isArray(sg.idb) && sg.idb.length) && !sg.caches.length && !sg.sw && !sg.undef, sg);
    const net = netCheck(s.reqs, H, []); ck(w + ' no off-site / non-GET requests', !net.offending.length, net);
    ck(w + ' no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 390, height: 800 }); const f = T.encode(ex());
    for (const [nm, h, want] of [['tampered', f.slice(0, -1) + (f.slice(-1) === 'a' ? 'b' : 'a'), C.badLink], ['truncated', f.slice(0, 40), C.badLink], ['old version', M.pack('h', 9, {}), C.oldVersion], ['oversized', 'h1.' + 'A'.repeat(2100) + '.000000', C.badLink], ['bad zone', M.pack('h', 1, { w: '2026-10-19', z: 'Mars/Base', n: '60', u: 'min', t: '', p: [] }), C.badLink]]) {
      await p.goto(BASE + '#' + h, { waitUntil: 'load' }); await sleep(120); const t = await view(p); ck('390 ' + nm + ' link refused with message, nothing loaded', t.banner === want && !t.prop && (await p.$eval('#pn-1', e => e.value)) === '', t.banner); }
    ck('390 link checks no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 390, height: 800 }); await p.goto(link(ex({ t: 'Coffee' })), { waitUntil: 'load' }); await sleep(200);
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(150);
    let t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, link: document.getElementById('link').value, selected: document.getSelection().toString().length }));
    const sa = await p.evaluate(() => window.__shareArg);
    ck('390 share text is shareTextTyped, exact', sa && sa.text === 'When we\'re all free: “Coffee” (typed by the sender)' && sa.title === 'The Same Hour', sa);
    ck('390 share cancel: shareCancel toast, link stays selected (#h1)', t.toast === C.shareCancel && t.sel === 'link' && /#h1\./.test(t.link) && t.selected > 20, t);
    await stubClip(p, false); await p.focus('#b-copy'); await p.keyboard.press('Enter'); await sleep(150);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, sel: document.activeElement.id, val: document.getElementById('fallback').value, lbl: document.getElementById('fb-l').textContent }));
    ck('390 copy failure: copyFail, proposal text left selected in labelled box', t.toast === C.copyFail && t.sel === 'fallback' && t.val === propText && t.lbl === C.copyTextLabel, t);
    ck('390 share/copy no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 320, height: 800 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    for (let i = 0; i < 5; i++) { await p.focus('#addp'); await p.keyboard.press('Enter'); await sleep(30); }
    let t = await p.evaluate(() => ({ n: document.querySelectorAll('.tsh-person').length, dis: document.getElementById('addp').disabled, msg: document.getElementById('e-p').textContent }));
    ck('320 six people max, then disabled with message', t.n === 6 && t.dis && t.msg === C.tooManyPeople, t);
    const L = 'Pneumonoultramicroscopicx'; await p.goto(link(mk([[L.slice(0, 24), [[0, '09:00', '10:00']]], ['B'.repeat(24), [[0, '09:00', '10:00']]]], { t: 'C'.repeat(40) })), { waitUntil: 'load' }); await sleep(200);
    const of = await overflow(p); const ov = await textOverlap(p, '.tsh-lane-label, .tsh-dayname, #prop-h, #prop-title, #prop-n, .tsh-legend .tsh-lname, .tsh-otext > b');
    ck('320 longest single-word names/title: no overflow, no text overlap, full quoted name in the legend', of.sw <= 320 && !of.bad.length && !ov.length && (await p.$eval('.tsh-legend .tsh-lname', e => e.textContent)) === '“' + L.slice(0, 24) + '”', { of, ov });
    await p.click('#own-copy'); await sleep(50);
    await typeInto(p, '#pn-1', L); await p.focus('#n'); await sleep(50); t = await view(p);
    ck('320 name over 24 characters flagged', t.errs.includes(M.plural(C.personTooLong, 1)), t.errs);
    ck('320 limits no errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // Writer QA-83 exact: freeHeading (name after colon, in its own node), ribbon title; no-title share falls back to shareText
  { const s = await session(H, IP, { shareCancel: true }); const { p } = s; await p.setViewport({ width: 1280, height: 900 }); await p.goto(link(ex()), { waitUntil: 'load' }); await sleep(250);
    const t = await p.evaluate(() => ({ fh: [...document.querySelectorAll('.tsh-freeh')].map(e => e.textContent), rib: [...document.querySelectorAll('.tsh-rib:not(.is-unknown)')].map(e => e.title) }));
    await p.focus('#b-share'); await p.keyboard.press('Enter'); await sleep(150); const sa = await p.evaluate(() => window.__shareArg);
    ck('1280 Writer exact: freeHeading "Free times: “Rae”", ribbon title "Free times on Mon 19 Oct: “Rae”, 18:00–20:00", untitled share = shareText', t.fh[0] === 'Free times: “Rae”' && t.rib.includes('Free times on Mon 19 Oct: “Rae”, 18:00–20:00') && sa && sa.text === "When we're all free", { t, sa });
    await s.b.close(); }
  // same tab: valid link -> bad link fully resets (shared MILLVIEW.route); then empty fragment -> blank
  { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.goto(link(ex({ t: 'Coffee' })), { waitUntil: 'load' }); await sleep(200);
    await p.evaluate(() => { location.hash = 'h1.broken'; }); await sleep(150);
    let t = await p.evaluate(() => ({ b: document.getElementById('banner-t').textContent, ban: document.getElementById('banner').hidden, own: document.getElementById('own-copy').hidden, names: [...document.querySelectorAll('[id^=pn-]')].map(e => e.value).join(), title: document.getElementById('t').value, inert: document.getElementById('form').inert, dis: [...document.querySelectorAll('#z,#w,#n,#u,#t')].filter(e => e.disabled).length, prop: !document.getElementById('prop').hidden, link: document.getElementById('link').value, reset: document.getElementById('b-reset').hidden }));
    ck('390 same tab: bad link after a valid one fully resets the tab', t.b === C.badLink && !t.ban && t.own && !/Rae|Sol|Tam/.test(t.names) && t.title === '' && !t.inert && !t.dis && !t.prop && t.link === '' && !t.reset, t);
    await p.evaluate(() => { location.hash = ''; }); await sleep(150);
    t = await p.evaluate(() => ({ ban: document.getElementById('banner').hidden, names: [...document.querySelectorAll('[id^=pn-]')].map(e => e.value).join() }));
    ck('390 same tab: empty fragment -> blank, no banner', t.ban && !/Rae|Sol|Tam/.test(t.names), t);
    await s.b.close(); }
  // ===== QA local-715aa3a: D1–D7 + KS-1r (ENGINEER SELF-CHECK) =====
  const HOST = ['Verified ✔ Bank', 'You owe me, deadbeat', '<img src=x onerror=a()>'];
  for (const w of [320, 390, 1280, 1440].filter(x => !process.env.MILL_W || process.env.MILL_W.split(',').map(Number).includes(x) || x === 1440 && process.env.MILL_W.includes('1280'))) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.evaluateOnNewDocument(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    const go = async st => { await p.goto('about:blank'); await p.goto(link(st), { waitUntil: 'load' }); await sleep(250); };
    // D1: current IANA names open and are offered; a legacy-name link opens too and the picker shows the current name
    for (const [z, want] of [['US/Pacific', 'America/Los_Angeles'], ['US/Eastern', 'America/New_York'], ['Asia/Kolkata', 'Asia/Kolkata'], ['Asia/Kathmandu', 'Asia/Kathmandu'], ['America/Argentina/Buenos_Aires', 'America/Argentina/Buenos_Aires'], ['Asia/Calcutta', 'Asia/Kolkata'], ['Europe/Kiev', 'Europe/Kyiv']]) {
      { const st = ex({ z }); await p.goto('about:blank'); await p.goto(BASE + '#' + M.pack('h', 1, { w: st.w, z, n: st.n, u: st.u, t: st.t, p: st.p.map(q => [q.n, q.iv.map(v => [v.d, v.s, v.e])]) }), { waitUntil: 'load' }); await sleep(250); } /* QA-packed: the zone exactly as given */ const t = await p.evaluate(() => ({ ban: document.getElementById('banner-t').textContent, z: document.getElementById('z').value, prop: document.getElementById('prop').hidden ? '' : document.getElementById('prop-h').textContent }));
      ck(w + ' D1: link with zone ' + z + ' opens (not "damaged"); picker shows ' + want, t.ban === C.receiverIntro + ' ' + C.receiverNote && t.z === want && t.prop.includes('(' + want + ')'), t); }
    { const o = await p.evaluate(() => [...document.querySelectorAll('#z option')].map(o => o.value)); ck(w + ' D1: picker offers Asia/Kolkata, Asia/Kathmandu, Europe/Kyiv, America/Argentina/Buenos_Aires and not their legacy duplicates', ['Asia/Kolkata', 'Asia/Kathmandu', 'Europe/Kyiv', 'America/Argentina/Buenos_Aires'].every(z => o.includes(z)) && !['Asia/Calcutta', 'Asia/Katmandu', 'Europe/Kiev'].some(z => o.includes(z)), o.length); }
    // D2 / PM b: over midnight = one span labelled with both days
    await go(mk([['A', [[0, '22:00', '24:00'], [1, '00:00', '02:00']]], ['B', [[0, '22:00', '24:00'], [1, '00:00', '02:00']]]], { n: 180 }));
    { const t = await view(p); const caps = await p.evaluate(() => [...document.querySelectorAll('.tsh-seamcap')].map(e => e.textContent)); ck(w + ' D2-r: the week chart labels the span "Mon 22:00–Tue 02:00" on BOTH rows (seam text and caption)', t.seams.filter(x => !/is-maybe|is-short/.test(x)).length === 2 && t.seams.filter(x => !/is-maybe|is-short/.test(x)).every(x => x.endsWith(':Mon 22:00–Tue 02:00')) && caps.length === 2 && caps.every(c => c === C.legendAll + ': Mon 22:00–Tue 02:00'), { seams: t.seams, caps });
      ck(w + ' D2: Mon 22:00–24:00 + Tue 00:00–02:00 with 180 min needed: one option "Mon 19 Oct, 22:00–Tue 02:00", 4 hours, drawn on both days', t.opts.join() === 'Mon 19 Oct, 22:00–Tue 02:00' && t.propAll.includes('4 hours') && t.prop === 'Mon 19 Oct 2026, 22:00–Tue 02:00 (America/New_York)' && t.seams.filter(x => !/is-maybe|is-short/.test(x)).length === 2 && !t.none, t); }
    // D3: hostile names + title quoted everywhere (found, none, fix states; screen, aria, title attrs, describedby, live, copy text)
    const hs = (n, extra) => mk([[HOST[0], [[0, '18:00', '20:00'], [2, '09:00', '10:00']]], [HOST[1], [[0, '19:00', '21:00']]], [HOST[2], [[0, '18:30', '20:30'], [2, '09:00', '10:00']]]], Object.assign({ n, t: HOST[1] }, extra));
    for (const [tag, st, btn] of [['found', hs(60), '#b-copy'], ['none', hs(600), '#b-ncopy']]) {
      await go(st); await p.evaluate(() => { window.__clip = []; }); await p.click(btn); await sleep(120); const clip = await p.evaluate(() => window.__clip.slice());
      const a = await typedAudit(p, HOST, Object.fromEntries(clip.map((c, i) => ['clipboard#' + i, c]))); ck(w + ' D3 (' + tag + '): every sender-typed name and the title is quoted (screen, aria, title, describedby, live, copy text)', a.ok && clip.length === 1, a.ok ? clip : a.hits);
      if (tag === 'found') { await p.click('#astext'); await sleep(80); const b = await typedAudit(p, HOST); ck(w + ' D3 (table view) quoted', b.ok, b.hits); await p.click('#astext'); await sleep(50);
        await p.click('#own-copy'); await sleep(120); const c = await typedAudit(p, HOST); ck(w + ' D3 (own copy: free-times headings, Remove labels) quoted', c.ok, c.hits); } }
    await go(mk([[HOST[0], [[6, '01:30', '03:00']]], [HOST[2], [[6, '00:00', '04:00']]]], { w: '2026-10-26' }));
    { const a = await typedAudit(p, HOST); ck(w + ' D3 (fix state: alert link prefix) quoted', a.ok && (await p.$eval('#fix-l a', e => e.textContent)).startsWith('“' + HOST[0] + '”: '), a.hits); }
    // KS-1r: the DST error link lands (real click and Enter): focus on a named read-only wrapper, in the viewport
    for (const how of ['click', 'Enter']) {
      await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
      if (how === 'click') await mouseAt(p, '#fix-l a'); else { await p.focus('#fix-l a'); await p.keyboard.press('Enter'); await sleep(150); }
      const t = await p.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect(); return { tag: a.tagName, cls: a.className, ti: a.getAttribute('tabindex'), name: a.getAttribute('aria-label') || '', inView: r.top >= 0 && r.bottom <= innerHeight, has: [...a.querySelectorAll('input[id^=vs-]')].some(i => i.value === '01:30') }; });
      ck(w + ' KS-1r: DST error link (' + how + ') moves focus to the read-only entry (tabindex=-1, named with the person, time and error) and scrolls it into view', t.ti === '-1' && t.has && t.inView && t.name.includes('“' + HOST[0] + '”') && t.name.includes('01:30') && t.name.includes('happens twice'), t); }
    // D4: 24-character names at every width: nothing clipped (legend, lane labels, seams, captions); 12:00–12:15 overlap readable
    await go(mk([['Wolfeschlegelsteinhausen', [[0, '09:00', '12:15'], [1, '12:00', '12:15']]], ['Ana-Maria Josephine Lee', [[0, '10:00', '13:00'], [1, '12:00', '12:15']]], ['You owe me, deadbeat', [[0, '09:30', '12:00'], [1, '12:00', '12:15']]]], { n: 15 }));
    { const t = await p.evaluate(() => ({ clipped: [...document.querySelectorAll('.tsh-legend .tsh-lname, .tsh-lane-label, .tsh-seam, .tsh-seamcap, .tsh-otext > b, #prop-h, #prop-n')].filter(e => e.getClientRects().length && parseFloat(getComputedStyle(e).fontSize) > 0 && e.textContent && e.scrollWidth > e.clientWidth + 1).map(e => e.className + ':' + e.textContent + ' ' + e.scrollWidth + '/' + e.clientWidth),
        legend: [...document.querySelectorAll('.tsh-legend .tsh-lname')].map(e => e.textContent), caps: [...document.querySelectorAll('.tsh-seamcap')].map(e => e.textContent) }));
      ck(w + ' D4: 24-char names and a 12:00–12:15 overlap: no clipped text; legend shows full quoted names; every overlap time written out', !t.clipped.length && t.legend[0] === '“Wolfeschlegelsteinhausen”' && t.caps.some(c => c.includes('12:00–12:15')), t);
      const ov = await textOverlap(p, '.tsh-lane-label, .tsh-seam, .tsh-seamcap, .tsh-legend li span'); ck(w + ' D4: lane labels never overlap seam text', !ov.length, ov);
      const of = await overflow(p); ck(w + ' D4: no horizontal overflow', of.sw <= w && !of.bad.length, of); }
    // D5 + D6: link A (found, "Zebulon", title "Lunchtime") -> copy -> link B ("none") -> bad -> blank -> Clear: nothing stale even in hidden DOM; no toast carries over
    const A = mk([['Zebulon', [[0, '18:00', '20:00']]], ['Quixote', [[0, '19:00', '21:00']]]], { t: 'Lunchtime' }), B = mk([['Marigold', [[0, '08:00', '09:00']]], ['Bartholomew', [[0, '10:00', '11:00']]]]);
    const residue = (words) => p.evaluate(ws => { const hay = document.body.textContent + [...document.querySelectorAll('*')].map(e => [...e.attributes].map(a => a.value).join(' ')).join(' ') + [...document.querySelectorAll('input,textarea')].map(e => e.value).join(' '); return ws.filter(x => hay.includes(x)); }, words);
    await go(A); await p.click('#b-copy'); await sleep(60); await p.evaluate(h => { location.hash = h; }, T.encode(B)); await sleep(250);
    { const t = await p.evaluate(() => ({ toast: (e => e && !e.hidden && getComputedStyle(e).display !== 'none' ? e.textContent : '')(document.getElementById('toast')) })); ck(w + ' D6: "Copied." toast does not carry over to the next link', !t.toast, t); }
    ck(w + ' D5: link A -> link B: nothing of A in the DOM (visible, hidden, attributes, values)', !(await residue(['Zebulon', 'Quixote', 'Lunchtime'])).length, await residue(['Zebulon', 'Quixote', 'Lunchtime']));
    await p.evaluate(() => { location.hash = 'h1.broken'; }); await sleep(200); ck(w + ' D5: -> bad link: nothing of B', !(await residue(['Marigold', 'Bartholomew'])).length, await residue(['Marigold', 'Bartholomew']));
    await go(A); await p.click('#own-copy'); await sleep(80); await p.click('#b-reset'); await sleep(200);
    ck(w + ' D5: Clear (confirmed): nothing of the previous state in the DOM', !(await residue(['Zebulon', 'Quixote', 'Lunchtime'])).length, await residue(['Zebulon', 'Quixote', 'Lunchtime']));
    // D7: the WHOLE URL is capped at 2,000 (not just the fragment)
    { const t = await p.evaluate(() => { const pre = (location.origin + location.pathname + '#').length, n = 2000 - pre; return { pre, fit: !!MILLVIEW.linkFor('x'.repeat(n)), over: MILLVIEW.linkFor('x'.repeat(n + 1)) }; });
      ck(w + ' D7: MILLVIEW.linkFor allows exactly 2,000 characters in total and refuses 2,001', t.fit && t.over === null, t); }
    { // a state whose fragment is under LIM.frag but whose full URL here is over 2,000 -> refused with the fallback text
      // (PM 03:48 receive cap: a received link over 2,000 in total no longer opens, so the over-cap state is reached the way a sender would: open it with an
      //  empty title while the whole URL is still under 2,000, take a copy, then type a 40-character title, which pushes it over.)
      const pre = await p.evaluate(() => (location.origin + location.pathname + '#').length); let st = null, st0 = null;
      for (let k = 1; k <= 126 && !st; k++) { const people = []; for (let i = 0; i < 6; i++) people.push(['Person ' + i, []]);
        for (let j = 0; j < k; j++) people[j % 6][1].push([Math.floor(j / 6) % 7, String(Math.floor(j / 42) * 3 + 8).padStart(2, '0') + ':00', String(Math.floor(j / 42) * 3 + 9).padStart(2, '0') + ':00']);
        const c0 = mk(people, { t: '' }), f0 = T.encode(c0), c = JSON.parse(JSON.stringify(c0)); c.t = 'T'.repeat(40); const f = T.encode(c);
        if (f && f0 && f.length + pre > 2000 && f.length <= T.LIM.frag && f0.length + pre <= 2000) { st = c; st0 = c0; } }
      if (!st) ck(w + ' D7: test state (under 2,000 without a title, over with a 40-character title) found', false, null);
      if (st) { await go(st0); await p.click('#own-copy'); await sleep(100); await typeInto(p, '#t', 'T'.repeat(40)); await sleep(100); await p.click('#b-share'); await sleep(150); const t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, link: document.getElementById('linkbox').hidden ? '' : document.getElementById('link').value, fb: !document.getElementById('fbwrap').hidden }));
        ck(w + ' D7: a state over 2,000 characters in total (fragment under its own limit) is refused: tooLongLink + fallback text, no link', t.toast === C.tooLongLink && !t.link && t.fb, t); }
      else ck(w + ' D7: could build an over-cap state', false, pre); }
    ck(w + ' D1–D7/KS-1r: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  // PM 03:48 (audit 04:00): the WHOLE received URL is capped at 2,000 with the shared MILLVIEW.linkFor before decode (as in Sack, Even Up, Care Rota).
  // Normal path /mill/the-same-hour/ under a long *.localhost origin (Chrome resolves *.localhost to this server; hostnames up to 253) and a long path (throwaway
  // server, nested dirs + symlink to this tree): 1999 and 2000 open; 2001 and 2040 show this piece's bad-link message and nothing received.
  { const fsx = require('fs'), osx = require('os'), pathx = require('path'), { spawn } = require('child_process'), REPO = pathx.resolve(__dirname, '../..');
    const X = require('../../mill/the-same-hour/tsh.js'), CX = require('vm').runInNewContext(fsx.readFileSync(__dirname + '/../../mill/the-same-hour/copy.js', 'utf8') + ';COPY');
    const MARK = 'Zqxd7', em = '\u{1F600}', E = (k, ch) => ch.repeat(k);
    const pickF = (gen, lo, hi) => { for (let k = 0; k < 400; k++) { const f = gen(k); if (f && f.length >= lo && f.length <= hi) return f; } return null; };
    const BIG = pickF(k => { const pp = []; for (let j = 0; j < 6; j++) { const iv = []; for (let d = 0; d < Math.min(k, 21); d++) iv.push({ id: 100 + j * 30 + d, d: d % 7, s: String(8 + (d >> 3) * 4).padStart(2, '0') + ':00', e: String(9 + (d >> 3) * 4).padStart(2, '0') + ':00' }); pp.push({ id: j + 1, n: 'P' + j + E(20, em), iv }); } return X.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: MARK + ' dinner', p: pp, next: 400 }); }, 1760, 1960), SMALL = X.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: MARK + ' dinner', p: [{ id: 1, n: 'Rae', iv: [{ id: 2, d: 0, s: '18:00', e: '20:00' }] }, { id: 3, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 });
    const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 });
    const openAt = async url => { await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300);
      return p.evaluate((MARK, bad) => { const t = document.body.innerText; return { len: location.href.length, opened: t.includes(MARK) && !t.includes(bad), bad: t.includes(bad) && !t.includes(MARK) }; }, MARK, CX.badLink); };
    const port = H.includes(':') ? ':' + H.split(':').pop() : '', PATH = '/mill/the-same-hour/', fixed = (SCHEME + '://').length + port.length + PATH.length + 1 + BIG.length;
    const hostOf = n => { const labels = []; let left = n - 10; while (left > 0) { const k = Math.min(63, left > 63 ? left - 1 : left); labels.push('a'.repeat(k)); left -= k + 1; } const h = labels.join('.') + '.localhost'; if (h.length !== n) throw new Error('host ' + h.length + ' != ' + n); return h; };
    const normal = {}, maxN = fixed + 253;
    for (const want of [1999, 2000, 2001, 2040]) { const total = Math.min(want, maxN); const r = await openAt(SCHEME + '://' + hostOf(total - fixed) + port + PATH + '#' + BIG); r.want = want; normal[want] = r; }
    const root = fsx.mkdtempSync(osx.tmpdir() + '/d7-the-same-hour-'); const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', root], { stdio: ['ignore', 'pipe', 'pipe'] }); const long = {};
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
    const QM = 'Qzmk7x', QQ = '?q=' + QM, PATHQ = '/mill/the-same-hour/';
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
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); const fq = await p.evaluate(() => TSH.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: 'Zqv dinner', p: [{ id: 1, n: 'Rae', iv: [{ id: 2, d: 0, s: '18:00', e: '20:00' }] }, { id: 3, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 }));
    const SEE = 'Zqv dinner', PRE = null, STEPS = ['#own-copy', '#b-share'], SEND = null;
    const snd = await runQ(BASE + QQ, null, SEND, []), rcv = await runQ(BASE + QQ + '#' + fq, SEE, PRE, STEPS);
    const rootq = fsq.mkdtempSync(osq.tmpdir() + '/q-the-same-hour-'), srvq = spawnq('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1', '--directory', rootq], { stdio: ['ignore', 'pipe', 'pipe'] }); let l2002 = null;
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
    await open(BASE); const fq = await p.evaluate(() => TSH.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: 'Dinner', p: [{ id: 1, n: 'Rae', iv: [{ id: 2, d: 0, s: '18:00', e: '20:00' }] }, { id: 3, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 })), F = '#' + fq;
    await open(BASE + QQ + '#' + fq); await at('open received link', true, F);
    const c = await clickIf('#own-copy'); await sleep(200); await at('take a copy', c, '');
    await p.focus('#t'); await p.keyboard.press('End'); await p.keyboard.type('x'); await sleep(150); await at('edit', (await p.$eval('#t', e => e.value)) === 'Dinnerx', '');
    await clickIf('#b-share'); await sleep(300); const lk = await val('#link'); await at('make link', /^https?:\/\/[^?]*#/.test(lk), '');
    const r = await clickIf('#b-reset'); await sleep(250); await at('reset', r, '');
    ck('PM 04:57 query-strip (' + QN + '): ' + steps.map(x => x.step).join(' -> ') + ': every step happened; location.search empty, no marker in location.href, location.hash as expected after each', steps.length >= 5 && steps.every(x => x.did && x.search === '' && !x.mark && x.hashOk), steps.map(x => Object.assign({}, x, { hash: x.hash.slice(0, 60), exp: x.exp && x.exp.slice(0, 60) })));
    ck('PM 04:57 query-strip (' + QN + '): no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  // Hardening (PM 05:52): displayed zone IDs break only after '/' or '_' (an empty <wbr>, display only). At 320: "America/Los_Angeles" never breaks
  // mid-word, and when squeezed it breaks at the slash or underscore. Copied text, the link, selections and accessible names contain no inserted character.
  { const s = await session(H, IP), { p } = s; await p.setViewport({ width: 320, height: 900 }); const ZID = 'America/Los_Angeles', BAD = /[\u200B\u200C\u200D\u2060\u00AD\uFEFF]/;
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const f = await p.evaluate(Z => TSH.encode({ w: '2026-10-19', z: Z, n: '60', u: 'min', t: 'Dinner', p: [{ id: 1, n: 'Rae', iv: [{ id: 2, d: 0, s: '18:00', e: '20:00' }] }, { id: 3, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 }), ZID);
    await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(350); await p.click('#astext'); await sleep(200); // table view, so its caption is on screen
    // Every on-screen place the zone ID appears: zone line, proposal line, proposal zone, table caption
    const SITES = ['#zone span', '#prop-h', '#prop-z', 'caption'];
    const probe = await p.evaluate((SITES, ZID) => SITES.map(sel => { const e = document.querySelector(sel); if (!e) return { sel, missing: true };
      const tc = e.textContent, wb = [...e.querySelectorAll('wbr')].map(w => (w.previousSibling && w.previousSibling.textContent || '').slice(-1));
      const r = document.createRange(); r.selectNodeContents(e); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r); const sel2 = sl.toString(); sl.removeAllRanges();
      return { sel, has: tc.includes(ZID), tc, inner: e.innerText.replace(/\n/g, ' '), selText: sel2, wbrAfter: wb, label: e.getAttribute('aria-label') || '' }; }), SITES, ZID);
    // 320 wrap: (a) as rendered; (b) squeezed to its widest part, so it MUST break inside it. Each part between '/' and '_' stays on one line.
    const wrap = await p.evaluate((SITES, ZID) => SITES.map(sel => { const e = document.querySelector(sel); if (!e) return { sel, missing: true };
      const lines = () => { const tn = [], w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) tn.push(n); let txt = '', map = []; tn.forEach(t => { for (let i = 0; i < t.data.length; i++) { map.push([t, i]); txt += t.data[i]; } });
        const at = txt.indexOf(ZID); if (at < 0) return null; const tops = []; for (let k = 0; k < ZID.length; k++) { const [t, i] = map[at + k], r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const b = [...r.getClientRects()].filter(x => x.width > 0)[0]; tops.push(b ? Math.round(b.top) : null); }
        const breaks = []; for (let k = 1; k < ZID.length; k++) if (tops[k] !== null && tops[k - 1] !== null && tops[k] > tops[k - 1] + 2) breaks.push(k);
        return { breaks, after: breaks.map(k => ZID[k - 1]), ok: breaks.every(k => ZID[k - 1] === '/' || ZID[k - 1] === '_') }; };
      const asIs = lines(), old = e.style.cssText;
      // squeeze: as wide as the widest of "(America/", "Los_", "Angeles)" as rendered, glued punctuation included (+2px), so the whole ID can't fit on one line but each part can
      const seg = (() => { const tn = [], w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) tn.push(n); const map = []; let txt = ''; tn.forEach(t => { for (let i = 0; i < t.data.length; i++) { map.push([t, i]); txt += t.data[i]; } }); const at = txt.indexOf(ZID); let a0 = at, a1 = at + ZID.length; while (a0 > 0 && !/\s/.test(txt[a0 - 1])) a0--; while (a1 < txt.length && !/\s/.test(txt[a1])) a1++; // whole glued word, e.g. "(America/Los_Angeles)"
        let mx = 0, st0 = a0;
        for (let k = a0 + 1; k <= a1; k++) if (k === a1 || (k > at && k <= at + ZID.length && /[\/_]/.test(txt[k - 1]))) { let wsum = 0; for (let j = st0; j < k; j++) { const [t, i] = map[j], r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); wsum += r.getBoundingClientRect().width; } mx = Math.max(mx, wsum); st0 = k; } return mx; })();
      e.style.setProperty('display', 'block'); e.style.setProperty('width', Math.ceil(seg + 2) + 'px'); const squeezed = lines(); e.style.cssText = old;
      return { sel, asIs, squeezed, sw: document.documentElement.scrollWidth }; }), SITES, ZID);
    // copied text, the link and accessible names
    await p.click('#own-copy'); await sleep(200); await stubClip(p, true); await p.click('#b-copy'); await sleep(150); const clip = await p.evaluate(() => window.__clip || '');
    await stubClip(p, true); await p.click('#b-share'); await sleep(200); const link = await p.evaluate(() => document.getElementById('link').value);
    const ax = JSON.stringify(await p.accessibility.snapshot({ interestingOnly: false }) || {});
    ck('hardening 05:52: zone ID shown with a break opportunity after "/" and "_" in the zone line, proposal line, proposal zone and table caption (an empty <wbr>; text unchanged)', probe.every(x => !x.missing && x.has && x.wbrAfter.includes('/') && x.wbrAfter.includes('_') && x.tc.includes(ZID) && !BAD.test(x.tc)), probe);
    ck('hardening 05:52: no inserted character in text, rendered text, a selection copy or aria-labels of those places', probe.every(x => !BAD.test(x.tc + x.inner + x.selText + x.label) && x.selText.replace(/\s+/g, ' ').includes(ZID)), probe.map(x => ({ sel: x.sel, selText: x.selText })));
    ck('hardening 05:52: copied text and the link carry the zone ID with no inserted character', clip.includes(ZID) && !BAD.test(clip) && /^https?:\/\/[^?\s]*#h1\./.test(link) && !BAD.test(link) && !/%E2%80%8B|%C2%AD|%E2%81%A0/i.test(link), { clip: clip.slice(0, 300), link: link.slice(0, 120) });
    ck('hardening 05:52: accessible names (full tree) contain no inserted character and keep "' + ZID + '" whole', !BAD.test(ax) && ax.includes(ZID), ax.length);
    ck('hardening 05:52: 320 wrap: "America/Los_Angeles" never breaks mid-word; squeezed below its width it breaks only after "/" or "_"; no sideways scroll', wrap.every(x => !x.missing && x.asIs && x.asIs.ok && x.squeezed && x.squeezed.ok && x.squeezed.breaks.length >= 1 && x.sw <= 320), wrap);
    ck('hardening 05:52: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})();
