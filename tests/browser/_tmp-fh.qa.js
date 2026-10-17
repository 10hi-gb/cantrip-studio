// node tests/browser/mill-five-hands.qa.js <host[:port]> <ip> [scheme] — Five Hands r1c @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Validation UX (field errors, "Fix N things to continue", first error focused; -10/0/2.5/-5 refused, 0-minute helper fine, caps,
// duplicates, 12/5 row limits), worked example (Suggest exact rolls + bench + sheet), the simple-rule line on every Suggest,
// the stamp under every card / inside every copied card / bench text / sheet / recipient, short-handed + change summary +
// benchExplain, Check mode (never moves, refuses -10, over-by on a 0-minute helper), roll scale + phone meter, print (sheet only,
// one page), link (warning before the link, 1,000-char fragment cap, recipient read-only + Make my own copy, bad/old links),
// typedAudit incl. the PM Q1 spoof case, self-hosted fonts, no storage / no network / no CSP errors, no sideways scroll.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, mouseAt, errsOf, W, sleep, session, overflow, typeInto, storage, netCheck, result } = require('./mill-common');
const fs = require('fs'), vm = require('vm');
const C = vm.runInNewContext(fs.readFileSync(__dirname + '/../../mill/five-hands/copy.js', 'utf8') + ';COPY');
const FH = require('../../mill/five-hands/fh.js'), M = require('../../mill/shared/core.js');
const pdfPages = buf => { const f = require('os').tmpdir() + '/fh-print-' + process.pid + '.pdf'; fs.writeFileSync(f, buf); const m = /Pages:\s+(\d+)/.exec(require('child_process').execFileSync('pdfinfo', [f]).toString()); fs.unlinkSync(f); return m ? +m[1] : -1; };
const BASE = `${SCHEME}://${H}/mill/five-hands/`;
const mk = a => a.map(x => ({ name: x[0], min: x[1] }));
const HS = [['Ana', 120], ['Ben', 60], ['Chen', 90], ['Dee', 0], ['Eli', 45]];
const TS = [['Pull tomato cages', 40], ['Turn compost bed A', 30], ['Turn compost bed B', 30], ['Rake paths', 45], ['Cover raised beds', 25], ['Clean and oil tools', 20], ['Haul yard bags to curb', 35], ['Fix gate latch', 15], ['Empty rain barrels', 20]];
const TITLE = 'Garden cleanup, Saturday';
const ZEROHEAD = C.zeroHead; // Writer N12
const clipStub = () => { window.__clip = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); };
const on = p => p.evaluate(() => [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join());
// fill the form: add rows with the real Add buttons, then set values (input events fire like typing)
async function fill(p, title, tasks, helpers) {
  await p.evaluate((title, tasks, helpers) => {
    const set = (e, v) => { e.value = v == null ? '' : String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.getElementById('f-title'), title);
    [['tasks', 'add-task', tasks], ['helpers', 'add-helper', helpers]].forEach(([host, add, list]) => { const h = document.getElementById(host);
      while (h.children.length > Math.max(1, list.length)) h.lastElementChild.querySelector('.fh-rm').click();
      while (h.children.length < list.length) document.getElementById(add).click();
      list.forEach((x, i) => { const ins = h.children[i].querySelectorAll('input'); set(ins[0], x[0]); set(ins[1], x[1]); }); });
  }, title, tasks, helpers);
}
const split = async p => { await p.click('#b-split'); await sleep(200); };
const state = p => p.evaluate(() => ({ h: document.getElementById('s2-h').textContent, tally: document.getElementById('tally').textContent, rule: getComputedStyle(document.getElementById('rule')).display !== 'none' ? document.getElementById('rule').textContent : '',
  change: document.getElementById('change').hidden ? '' : document.getElementById('change').textContent, over: document.getElementById('over').hidden ? '' : document.getElementById('over').textContent,
  cards: [...document.querySelectorAll('#rolls article')].map(a => ({ label: a.getAttribute('aria-label'), tab: a.querySelector('.tab').textContent, load: a.querySelector('.load').textContent, btn: a.querySelector('button').textContent, sticks: [...a.querySelectorAll('.stick')].map(s => s.querySelector('.t').textContent + ' ' + s.querySelector('.m').textContent + (s.classList.contains('over') ? ' over' : '')), stamp: a.querySelector('.stampline').textContent, overtag: (a.querySelector('.overtag') || {}).textContent || '', zero: a.classList.contains('zero') })),
  benchH: document.getElementById('bench-h').hidden ? '' : document.getElementById('bench-h').textContent, bench: [...document.querySelectorAll('#plank .stick')].map(s => s.textContent), benchEmpty: (document.querySelector('#plank .empty') || {}).textContent || '',
  explain: document.getElementById('bench-explain').hidden ? '' : document.getElementById('bench-explain').textContent, benchBtn: !document.getElementById('b-bench').hidden,
  sheetH: document.getElementById('sheet-h').textContent, sheet: [...document.querySelectorAll('#sheet-t tbody tr')].map(r => [...r.cells].map(c => c.textContent).join(' | ')), sheetStamp: document.getElementById('sheet-stamp').textContent, sheetRule: document.getElementById('sheet-rule').textContent, sheetNote: document.getElementById('sheet-note').textContent,
  on: [...document.querySelectorAll('section')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id).join(), active: document.activeElement && document.activeElement.id }));
const errs = p => p.evaluate(() => ({ msgs: [...document.querySelectorAll('#form .errmsg')].filter(e => !e.hidden).map(e => e.textContent), inv: [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.id), btn: document.getElementById('b-split').textContent, dis: document.getElementById('b-split').getAttribute('aria-disabled'), active: document.activeElement.id, s2: document.getElementById('s2').classList.contains('on') }));

// ---- Creative design check 5f127ab (items 1–6) helpers: Creative's reference data, S4 assignment, pixel sampling of a screenshot
const CTITLE = 'Community garden cleanup, Saturday';
const CHK = { 'Rake paths': 'Ana', 'Haul yard bags to curb': 'Ana', 'Turn compost bed A': 'Ben', 'Turn compost bed B': 'Ben', 'Clean and oil tools': 'Ben', 'Pull tomato cages': 'Chen', 'Fix gate latch': 'Dee', 'Cover raised beds': 'Eli' };
async function checkS4(p) { await p.evaluate(CHK => { const m = document.getElementById('m-check'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelectorAll('#check-rows select').forEach(s => { const lab = document.querySelector(`label[for="${s.id}"]`).textContent, t = Object.keys(CHK).find(k => lab === 'Who does “' + k + '”?');
    s.value = t ? [...s.options].find(o => o.textContent === '“' + CHK[t] + '”').value : ''; }); }, CHK); }
// sample page pixels (CSS px, viewport coords) from a real screenshot, decoded on a blank page's canvas
async function pixels(p, b, pts) { const sc = await p.evaluate(() => [scrollX, scrollY]); pts = pts.map(([x, y]) => [x + sc[0], y + sc[1]]); const png = await p.screenshot({ encoding: 'base64', fullPage: true }), dpr = await p.evaluate(() => devicePixelRatio), q = await b.newPage();
  const out = await q.evaluate(async (png, pts, dpr) => { const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return pts.map(([X, Y]) => [...x.getImageData(Math.round(X * dpr), Math.round(Y * dpr), 1, 1).data].slice(0, 3)); }, png, pts, dpr); await q.close(); return out; }
const near = (c, t, d = 14) => c.every((v, i) => Math.abs(v - t[i]) <= d);
const RED = [174, 47, 27]; // --fh-over #AE2F1B (QA H6/H7: same hue as --red #C8361F, darker)
const lum = c => { const v = c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
// Check mode; who[i] is the helper name for task i ('' = bench)
async function checkAll(p, who) { await p.evaluate(who => { const m = document.getElementById('m-check'); m.checked = true; m.dispatchEvent(new Event('change', { bubbles: true }));
  [...document.querySelectorAll('#check-rows select')].forEach((s, i) => { const o = [...s.options].find(o => o.textContent === '“' + who[i] + '”'); s.value = o ? o.value : ''; s.dispatchEvent(new Event('change', { bubbles: true })); }); }, who); }
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info: ok ? undefined : info });
  // ---------- QA local-11d8017 H15 (PM 07:39) / H14 / H16 / H17
  { const setv = (p, sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); const pr = e.tagName === 'SELECT' ? HTMLSelectElement.prototype : e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(pr, 'value').set.call(e, v); e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, sel, String(v));
    const clickq = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
    const fillQ = async (p, st) => { await setv(p, '#f-title', st.title);
      for (const [kind, list] of [['task', st.tasks], ['helper', st.helpers]]) { let n = await p.$$eval('#' + kind + 's > .row', r => r.length); while (n < list.length) { await clickq(p, '#add-' + kind); n++; }
        const ids = await p.$$eval('#' + kind + 's > .row', r => r.map(x => x.dataset.id)); for (let i = 0; i < list.length; i++) { await setv(p, '#n-' + ids[i], list[i][0]); await setv(p, '#m-' + ids[i], list[i][1]); } }
      if (st.mode === 'check') { await clickq(p, '#m-check'); await p.evaluate(() => document.getElementById('m-check').dispatchEvent(new Event('change')));
        const tids = await p.$$eval('#tasks > .row', r => r.map(x => x.dataset.id)), hids = await p.$$eval('#helpers > .row', r => r.map(x => x.dataset.id));
        for (let i = 0; i < (st.assign || []).length; i++) await setv(p, '#a-' + tids[i], st.assign[i] < 0 ? '' : hids[st.assign[i]]); } };
    // QA's exact H15 repro (narrowclip.js): Check mode, Ana 10 + Ben 480, 12 hyphenated 25-36-character tasks all on Ana
    const nameOf = n => { let s = ''; while (s.length < n) s += (s ? '-' : '') + 'Greenhouse'; return s.slice(0, n).replace(/-$/, 'x'); };
    const MINS = [5, 15, 120, 480], LENS = Array.from({ length: 12 }, (_, i) => 25 + i), QT = LENS.map((n, i) => [nameOf(n).slice(0, n - String(i).length) + i, MINS[(n + 1) % 4]]);
    const QST = { title: 'Sweep', helpers: [['Ana', 10], ['Ben', 480]], tasks: QT, mode: 'check', assign: QT.map(() => 0) };
    // one frame: every label (out labels and in-bar names/minutes) and bar; positions relative to its track; opacity chain of each label
    const FRAME = () => [...document.querySelectorAll('#rolls .track, #plank .track')].map(tr => { const T = tr.getBoundingClientRect(), sc = tr.querySelector('.sticks'), W = sc.clientWidth;
      return [...tr.querySelectorAll('.stick')].map((s, i) => { const out = s.classList.contains('out'), b = s.getBoundingClientRect(), m = s.querySelector('.m'), t = s.querySelector('.t');
        const rr = e => { const rg = document.createRange(); rg.selectNodeContents(e); const rs = [...rg.getClientRects()].filter(x => x.width > 0); if (!rs.length) return null; return { l: Math.min(...rs.map(x => x.left)) - T.left, r: Math.max(...rs.map(x => x.right)) - T.left, t: Math.min(...rs.map(x => x.top)) - T.top }; };
        let op = 1; for (let x = m; x && x !== document.body; x = x.parentElement) op *= parseFloat(getComputedStyle(x).opacity);
        const mm = +s.style.getPropertyValue('--m'), scv = +s.style.getPropertyValue('--sc'), want = Math.max(3, mm / scv * W);
        return { k: i, out, cls: s.className, m: rr(m), t: rr(t), mTxt: m.textContent, op: +op.toFixed(3), tw: T.width, bw: b.width, want: +want.toFixed(2) }; }); }).flat();
    for (const w of [320, 390, 1280]) { const s = await session(H, IP), { p } = s; await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
      await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, QST); await clickq(p, '#b-split'); await sleep(30);
      // freeze every animation on the page and step it through the slide-in: 0, 50, 125, 250, 375, 450 ms, then the end state
      const frames = [];
      for (const t of [0, 50, 125, 250, 375, 450, 'end']) { await p.evaluate(t => document.getAnimations().forEach(a => { if (t === 'end') a.finish(); else { a.pause(); a.currentTime = t; } }), t); await sleep(60); frames.push({ t, f: await p.evaluate(FRAME) }); }
      const end = frames[frames.length - 1].f, bad = [];
      frames.forEach(({ t, f }) => f.forEach((x, i) => { const e = end[i];
        if (!x.m) { bad.push(t + ' #' + i + ' minutes not rendered'); return; }
        if (x.m.r > x.tw + 0.5 || x.m.l < -0.5) bad.push(t + ' #' + i + ' "' + x.mTxt + '" cut by the card edge (' + x.m.l.toFixed(1) + '..' + x.m.r.toFixed(1) + ' of ' + x.tw.toFixed(0) + ')');
        if (Math.abs(x.m.l - e.m.l) > 0.5 || Math.abs(x.m.t - e.m.t) > 0.5 || (x.t && e.t && Math.abs(x.t.l - e.t.l) > 0.5)) bad.push(t + ' #' + i + ' label not at its final place (dx ' + (x.m.l - e.m.l).toFixed(1) + ')');
        if (x.op < 1) bad.push(t + ' #' + i + ' label opacity ' + x.op);
        if (Math.abs(x.bw - x.want) > 1) bad.push(t + ' #' + i + ' bar ' + x.bw.toFixed(1) + 'px, minutes say ' + x.want); }));
      const outs = end.filter(x => x.out), maxR = Math.max(...end.map(x => x.m ? x.m.r - x.tw : -99));
      ck(w + ` QA H15 (PM 07:39), normal motion, QA repro (Ana 10 / Ben 480, 12 hyphenated tasks on Ana): at 0/50/125/250/375/450 ms and the end state every minutes label is inside its card, at its final place, fully opaque (${end.length} sticks, ${outs.length} outside labels; closest minutes end ${maxR.toFixed(1)}px from the card edge)`, !bad.length && outs.length > 0, { problems: bad.length, cutByEdge: bad.filter(x => /cut by/.test(x)).slice(0, 10), endState: bad.filter(x => /^end/.test(x)).slice(0, 6), first: bad.slice(0, 4) });
      const h14 = frames.every(({ f }) => f.every(x => Math.abs(x.bw - x.want) <= 1));
      ck(w + ' QA H14, normal motion: every bar width = its minutes / scale x track (±1px, 3px floor) on every sampled frame', h14, frames.map(({ t, f }) => t + ': ' + f.filter(x => Math.abs(x.bw - x.want) > 1).map(x => x.bw.toFixed(1) + '/' + x.want).join(',')));
      // outside label 8px after its bar where it sits on the bar's row (end state)
      const gap = await p.evaluate(() => [...document.querySelectorAll('#rolls .stick.out:not(.below):not(.under):not(.split)')].map(s => { const b = s.getBoundingClientRect(), l = s.querySelector('.lab').getBoundingClientRect(); return +(l.left - b.right).toFixed(1); }));
      ck(w + ` QA H15: an outside label on its bar's row starts 8px after the bar (${gap.join('/') || 'none on the row'})`, gap.every(g => Math.abs(g - 8) <= 1), gap);
      // reduced motion: same layout and limits
      await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, QST); await clickq(p, '#b-split'); await sleep(300);
      const rf = await p.evaluate(FRAME), rbad = rf.filter(x => !x.m || x.m.r > x.tw + 0.5 || x.m.l < -0.5 || Math.abs(x.bw - x.want) > 1);
      ck(w + ' QA H15/H14, reduced motion: every minutes label inside its card, bars proportional; same label places as the motion end state', !rbad.length && rf.length === end.length && rf.every((x, i) => Math.abs(x.m.l - end[i].m.l) <= 0.5), { rbad, d: rf.map((x, i) => x.m && end[i].m ? +(x.m.l - end[i].m.l).toFixed(1) : null) });
      if (w === 390) { await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]); await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, QST); await clickq(p, '#b-split'); await sleep(900);
        const y = await p.evaluate(() => { const a = [...document.querySelectorAll('#rolls article.helper')][0]; a.scrollIntoView({ block: 'center' }); return 0; }); await sleep(150);
        const a = await p.$('#rolls article.helper'); if (process.env.FH_SHOTS) await a.screenshot({ path: process.env.FH_SHOTS + '/H15-390-motion.png' }); }
      ck(w + ' QA H15 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
    // H16: 320, Tab into a filled field -> selected text uses the piece's ::selection (ink highlight, chalk text); ring's yellow keeps ink on both sides
    { const s = await session(H, IP), { p } = s; await p.setViewport({ width: 320, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, { title: 'Garden cleanup, Saturday', helpers: [['Ana', 60], ['Ben', 60]], tasks: [['Rake paths', 30]] });
      const lum = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }, cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }, rgbv = x => x.match(/[\d.]+/g).slice(0, 3).map(Number);
      const res = [];
      for (const sel of ['#f-title', '#tasks .row input', '#helpers .row input']) { await p.evaluate(sel => document.querySelector(sel).focus(), sel); await p.keyboard.down('Shift'); await p.keyboard.press('Tab'); await p.keyboard.up('Shift'); await p.keyboard.press('Tab'); if (await p.evaluate(() => document.activeElement.selectionEnd === document.activeElement.selectionStart)) { await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control'); }
        const r = await p.evaluate(sel => { const e = document.activeElement, cs = getComputedStyle(e, '::selection'), tmp = document.createElement('span'); tmp.style.color = 'var(--focus)'; document.body.append(tmp); const y = getComputedStyle(tmp).color; tmp.style.color = 'var(--ink)'; const ink = getComputedStyle(tmp).color; tmp.remove();
          return { id: e.id, match: e.matches(sel), selLen: (e.selectionEnd || 0) - (e.selectionStart || 0), fv: e.matches(':focus-visible'), bg: cs.backgroundColor, fg: cs.color, yellow: y, ink, pl: getComputedStyle(e).paddingLeft }; }, sel);
        const opaque = !/rgba\(.*,\s*0\)/.test(r.bg) && r.bg !== 'transparent';
        r.textOnSel = opaque ? +cr(rgbv(r.fg), rgbv(r.bg)).toFixed(2) : null; r.yellowVsSel = opaque ? +cr(rgbv(r.yellow), rgbv(r.bg)).toFixed(2) : null; r.yellowVsText = opaque ? +cr(rgbv(r.yellow), rgbv(r.fg)).toFixed(2) : null; res.push(r); }
      ck('320 QA H16: Tab into a filled title (then Ctrl+A: a textarea keeps its caret) / task / helper field: the selection is the piece\'s ink (#1F2124) with chalk text, selected text >= 4.5:1, the ring\'s yellow >= 3:1 against the highlight (' + res.map(r => r.textOnSel + '/' + r.yellowVsSel).join(', ') + ')', res.every(r => r.match && r.fv && r.selLen > 0 && r.bg === r.ink && r.textOnSel >= 4.5 && r.yellowVsSel >= 3), res);
      ck('320 QA H16 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
    // H17: QA's emoji/flag set; a space-free word with emoji (and its closing quote) breaks only when it can't fit its own line; text/names unchanged
    { const FL = '🇫🇷🇩🇪🇮🇹', EM = '🌱🌻🪴🧤';
      // QA's emojiwrap.js set for Check; Suggest refuses its over-cap title/helper, so it gets the same words within the caps
      const EST = mode => ({ title: mode === 'check' ? 'Garden day ' + FL + ' ' + EM + ' with the whole street together' : 'Garden day ' + FL + ' ' + EM + ' together', helpers: [['Zoë ' + FL, 60], ['Ana' + EM, 120], [mode === 'check' ? 'Bartholomew-Smythe ' + FL + FL : 'Bart-Smythe ' + FL, 60]], tasks: [['Plant the beds ' + EM + EM, 50], ['Weed by the shed ' + FL + FL + FL, 30], [mode === 'check' ? 'Rake ' + FL + ' paths and the long front border' : 'Rake ' + FL + ' the front border', 20], ['Water' + EM + FL, 15]], mode, assign: mode === 'check' ? [0, 1, 2, 0] : undefined });
      for (const w of [320, 390, 641]) for (const mode of ['suggest', 'check']) { const s = await session(H, IP), { p } = s; await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, EST(mode)); await clickq(p, '#b-split'); await sleep(400);
        const v = await p.evaluate(() => { const out = [], seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' }), walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, words = 0;
          // a "word" = a space-free run across text nodes of one typed value
          for (const ty of document.querySelectorAll('.mill-typed')) { if (!ty.getClientRects().length || ty.closest('.fh-vh')) continue; const tw = document.createTreeWalker(ty, NodeFilter.SHOW_TEXT), chars = []; let t;
            while ((t = tw.nextNode())) for (const g of seg.segment(t.data)) { const rg = document.createRange(); rg.setStart(t, g.index); rg.setEnd(t, g.index + g.segment.length); const rs = [...rg.getClientRects()].filter(x => x.width > 0); chars.push({ g: g.segment, top: rs.length ? Math.round(rs[0].top) : null, w: rs.length ? rs[0].width : 0 }); }
            let box = ty; while (box && getComputedStyle(box).display.startsWith('inline')) box = box.parentElement; const bs = getComputedStyle(box), room = box.clientWidth - parseFloat(bs.paddingLeft) - parseFloat(bs.paddingRight);
            let a = 0; for (let i = 0; i <= chars.length; i++) { if (i === chars.length || /\s/.test(chars[i].g)) { const word = chars.slice(a, i); if (word.some(c => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(c.g))) { words++; const tops = new Set(word.map(c => c.top).filter(x => x !== null)), wid = word.reduce((z, c) => z + c.w, 0);
                  if (tops.size > 1 && wid <= room + 0.5) out.push({ word: word.map(c => c.g).join(''), wid: +wid.toFixed(1), room: +room.toFixed(1) }); } a = i + 1; } } }
          return { out, words, text: [...document.querySelectorAll('.mill-typed')].map(e => e.textContent).filter(x => /🌱|🇫/.test(x)) }; });
        const ax = await (await p.target().createCDPSession()).send('Accessibility.getFullAXTree'), axn = ax.nodes.filter(n => n.name && /🌱|🇫/.test(n.name.value) && !/StaticText|InlineTextBox/.test(n.role.value)).map(n => n.name.value);
        const exactTxt = v.text.every(x => !/\s{2}/.test(x)) && axn.every(x => !/\u200B|\u2060/.test(x)) && v.text.some(x => x === '“Plant the beds ' + EM + EM + '”');
        ck(w + ' ' + mode + ` QA H17: an emoji / flag word (with its closing quote) never breaks inside when it fits its own line (${v.words} emoji words checked); typed text and accessible names unchanged`, !v.out.length && v.words > 0 && exactTxt, { out: v.out, text: v.text.slice(0, 4), dbg: await p.evaluate(() => [document.getElementById('s2').className, [...document.querySelectorAll('.errmsg')].filter(e => !e.hidden).map(e => e.textContent), document.querySelectorAll('.mill-typed').length]) });
        if (w === 390 && mode === 'check' && process.env.FH_SHOTS) { const e = await p.evaluateHandle(() => [...document.querySelectorAll('.mill-typed')].find(x => x.textContent.startsWith('“Plant the beds')).closest('li,.row,.fh-check-row,div')); await e.asElement().evaluate(x => x.scrollIntoView({ block: 'center' })); await sleep(100); await e.asElement().screenshot({ path: process.env.FH_SHOTS + '/H17-390-check.png' }); }
        ck(w + ' ' + mode + ' QA H17 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); } } }
  process.exit(result(rows));
})();
