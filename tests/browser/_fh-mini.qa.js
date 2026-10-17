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
    // ---------- QA local-82c4667 H18 (PM 08:31, Joshua frame rule 1a): every in-bar label sits inside its own bar, fully drawn and readable, on every frame
    // of the slide-in from t=0 (QA's frame sampling: pause every animation and seek), then the end state, plus reduced motion; 320/390/1280. QA's worst glyph
    // pixel: the label is drawn once in a marker colour and once transparent; glyph pixels = pixels that differ; each one's background is read from the
    // transparent shot and compared with the label's real colour. Glyph-pixel count against the settled count catches any clipping (H15).
    { const HCASES = { tinyCheck: { title: 'Tiny', helpers: [['Ana', 10], ['Ben', 480]], tasks: [['Wab3', 5], ['Sweep the path', 5], ['Greenhouse-Greenhouse10', 120], ['rake rake rake', 480], ['Weed', 15]], mode: 'check', assign: [0, 0, 0, 0, 0] },
        tiny1: { title: 'Tiny', helpers: [['Ana', 480]], tasks: [['Sweep', 1], ['Wipe', 2], ['Rake', 3], ['Haul everything left', 474]], mode: 'suggest' }, narrow: QST };
      const lum = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); }, cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const INBAR = () => [...document.querySelectorAll('#rolls .sticks > .stick, #plank .sticks > .stick')].map((s, k) => ({ s, k })).filter(o => !o.s.classList.contains('out')).flatMap(({ s, k }) => ['t', 'm'].map(part => { const e = s.querySelector('.' + part), rg = document.createRange(); rg.selectNodeContents(e);
        const rs = [...rg.getClientRects()].filter(x => x.width > 0), b = s.getBoundingClientRect(), T = s.closest('.track').getBoundingClientRect(); if (!rs.length) return null;
        const r = { l: Math.min(...rs.map(x => x.left)), r: Math.max(...rs.map(x => x.right)), t: Math.min(...rs.map(x => x.top)), b: Math.max(...rs.map(x => x.bottom)) };
        return { k, part, txt: e.textContent, color: getComputedStyle(e).color, r, bar: { l: b.left, r: b.right, t: b.top, b: b.bottom }, track: { l: T.left, r: T.right }, rad: parseFloat(getComputedStyle(s).borderTopRightRadius) || 0 }; })).filter(Boolean);
      // two shots of every track that holds an in-bar label (marker colour / transparent), decoded on a canvas page; per label: glyph pixels and their worst contrast
      const glyphFrame = async (p, q) => { const tracks = await p.evaluate(() => [...document.querySelectorAll('#rolls .track, #plank .track')].map((t, i) => ({ i, n: t.querySelectorAll('.stick:not(.out)').length })).filter(x => x.n).map(x => x.i)), res = [];
        for (const ti of tracks) { const clip = await p.evaluate(ti => { const t = [...document.querySelectorAll('#rolls .track, #plank .track')][ti]; t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: r.width, height: r.height, scale: 1 }; }, ti);
          const labs = (await p.evaluate(INBAR)).map(l => ({ ...l, ti: null })), mine = await p.evaluate(ti => { const t = [...document.querySelectorAll('#rolls .track, #plank .track')][ti]; return [...document.querySelectorAll('#rolls .sticks > .stick, #plank .sticks > .stick')].map((s, k) => t.contains(s) ? k : -1).filter(k => k >= 0); }, ti);
          const here = labs.filter(l => mine.includes(l.k)), sx = await p.evaluate(() => [scrollX, scrollY]), c = await p.target().createCDPSession(), shot = async () => (await c.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false })).data;
          const sheet = col => p.evaluate(col => { if (!window.__qaH18) { window.__qaH18 = new CSSStyleSheet(); document.adoptedStyleSheets = [...document.adoptedStyleSheets, window.__qaH18]; } window.__qaH18.replaceSync(col ? `.stick:not(.out) .t,.stick:not(.out) .t *,.stick:not(.out) .m{color:${col}!important;-webkit-text-fill-color:${col}!important;text-shadow:none!important}` : ''); }, col); // constructed sheet: the page's CSP refuses inline <style>
          const paint = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          await p.bringToFront(); await sheet('#FF00FF'); await paint(); const A = await shot(); await sheet('transparent'); await paint(); const B = await shot(); await sheet(''); await c.detach();
          const boxes = here.map(l => ({ x: l.r.l + sx[0] - clip.x, y: l.r.t + sx[1] - clip.y, w: l.r.r - l.r.l, h: l.r.b - l.r.t, fg: l.color.match(/[\d.]+/g).slice(0, 3).map(Number) }));
          const px = await q.evaluate(async (A, B, boxes, cw) => { const dec = async d => { const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode(); const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const x = cv.getContext('2d'); x.drawImage(im, 0, 0); return { d: x.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height }; };
            const a = await dec(A), b = await dec(B), dpr = a.w / cw;
            return boxes.map(bx => { const out = []; for (let y = Math.max(0, Math.floor((bx.y - 3) * dpr)); y < Math.min(a.h, Math.ceil((bx.y + bx.h + 3) * dpr)); y++) for (let x = Math.max(0, Math.floor((bx.x - 3) * dpr)); x < Math.min(a.w, Math.ceil((bx.x + bx.w + 3) * dpr)); x++) { const i = (y * a.w + x) * 4;
              if (Math.max(Math.abs(a.d[i] - b.d[i]), Math.abs(a.d[i + 1] - b.d[i + 1]), Math.abs(a.d[i + 2] - b.d[i + 2])) > 60) out.push([b.d[i], b.d[i + 1], b.d[i + 2]]); } return out; }); }, A, B, boxes, clip.width);
          here.forEach((l, j) => { const crs = px[j].map(bg => cr(boxes[j].fg, bg)).sort((x, y) => x - y); res.push({ k: l.k, part: l.part, txt: l.txt, n: crs.length, worst: crs.length ? +crs[0].toFixed(2) : 0, low: crs.filter(x => x < 4.5).length,
            inBar: l.r.l >= l.bar.l - 0.5 && l.r.r <= l.bar.r - Math.min(l.rad, 2) + 0.5, inTrack: l.r.l >= l.track.l - 0.5 && l.r.r <= l.track.r + 0.5, gapR: +(l.bar.r - l.r.r).toFixed(1) }); }); }
        return res; };
      for (const w of [320, 390, 1280]) { const s = await session(H, IP), { p, b } = s, q = await b.newPage(); await p.setViewport({ width: w, height: 900, deviceScaleFactor: 2 }); await q.setViewport({ width: 400, height: 300, deviceScaleFactor: 2 }); const sum = [];
        for (const [cn, st] of Object.entries(HCASES)) { const bad = []; let ends = null, worst = 99, labels = 0;
          for (const motion of ['no-preference', 'reduce']) { await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]); await p.goto('about:blank'); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await fillQ(p, st);
            await p.evaluate(() => { document.getElementById('b-split').click(); document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); });
            const ts = motion === 'reduce' ? ['reduced'] : [0, 25, 50, 75, 100, 250, 'end'], fr = {};
            for (const t of ts) { await p.evaluate(t => document.getAnimations().forEach(a => { if (t === 'end' || t === 'reduced') a.finish(); else { a.pause(); a.currentTime = t; } }), t); await sleep(60);
              const g = await glyphFrame(p, q), geo = await p.evaluate(FRAME); fr[t] = g; if (t === 'end') ends = g;
              if (t === 'reduced' && motion === 'reduce' && await p.evaluate(() => document.getAnimations().length)) bad.push('reduced: animations still running');
              geo.forEach(x => { if (Math.abs(x.bw - x.want) > 1) bad.push(t + ' #' + x.k + ' bar ' + x.bw.toFixed(1) + ' vs ' + x.want + ' (H14)'); if (x.m && (x.m.r > x.tw + 0.5 || x.m.l < -0.5)) bad.push(t + ' #' + x.k + ' "' + x.mTxt + '" outside its card (H15)'); });
              g.forEach(l => { labels++; worst = Math.min(worst, l.worst);
                if (!l.inBar) bad.push(t + ' #' + l.k + l.part + ' "' + l.txt + '" past its bar (' + l.gapR + 'px)'); if (!l.inTrack) bad.push(t + ' #' + l.k + l.part + ' "' + l.txt + '" cut by the track');
                if (l.worst < 4.5) bad.push(t + ' #' + l.k + l.part + ' "' + l.txt + '" worst glyph pixel ' + l.worst + ':1 (' + l.low + ' of ' + l.n + ' px < 4.5)'); }); }
            if (ends) Object.entries(fr).forEach(([t, g]) => g.forEach(l => { const e = ends.find(x => x.k === l.k && x.part === l.part); if (e && l.n < e.n * 0.97) bad.push(t + ' #' + l.k + l.part + ' "' + l.txt + '" ' + l.n + ' of ' + e.n + ' glyph px drawn'); })); }
          sum.push(cn + ' ' + worst.toFixed(2)); ck(w + ' ' + cn + ` QA H18 (PM 08:31, frame rule 1a): at 0/25/50/75/100/250 ms, the end state and reduced motion every in-bar name and minutes label is inside its own bar and the card, every glyph pixel drawn (vs settled) and >= 4.5:1 on what is under it (${labels} label-frames, worst glyph pixel ${worst.toFixed(2)}:1); bars to scale on every frame`, !bad.length && labels > 0, { n: bad.length, first: bad.slice(0, 8) }); }
        ck(w + ' QA H18 block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); } }

  }
  process.exit(result(rows));
})();
