// node tests/browser/mill-sack.qa.js <host[:port]> <ip> [scheme]  — Split the Sack full flow at 320/390/1280 (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const COPYV2 = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/split-the-sack/copy.js', 'utf8') + ';COPY');
const COPY = COPYV2;
const M_fill = (t, name) => t.replace('{name}', name);
const BASE = `${SCHEME}://${H}/mill/split-the-sack/`;
// QA all9 W-2/W-3/W-4: worst rendered contrast of a text run against every background pixel under its glyph boxes (the text itself is hidden for the background shot)
const lum = c => { const v = c.map(x => x / 255).map(x => x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4)); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const crOf = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
async function textCR(p, b, sel) {
  const runs = await p.evaluate(sel => { const sh = new CSSStyleSheet(); sh.replaceSync('.qa-tx,.qa-tx *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;transition:none!important;text-decoration-color:transparent!important}'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh];
    return [...document.querySelectorAll(sel)].filter(e => e.checkVisibility()).map(e => { const rg = document.createRange(); rg.selectNodeContents(e); const c = getComputedStyle(e), col = c.color, fs = c.fontSize, fw = c.fontWeight; let op = 1; for (let a = e; a; a = a.parentElement) op *= +getComputedStyle(a).opacity;
      const rs = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1).map(r => [r.left + scrollX, r.top + scrollY, r.right + scrollX, r.bottom + scrollY]); return { e, t: e.textContent.trim().slice(0, 40), color: col, op, fs, fw, rs }; }).map(r => { r.e.classList.add('qa-tx'); delete r.e; return r; }); }, sel); // colours read for every run before any text is hidden
  await new Promise(r => setTimeout(r, 60));
  const png = await p.screenshot({ encoding: 'base64', fullPage: true }), dpr = await p.evaluate(() => devicePixelRatio);
  await p.evaluate(() => { document.querySelectorAll('.qa-tx').forEach(e => e.classList.remove('qa-tx')); document.adoptedStyleSheets = document.adoptedStyleSheets.slice(0, -1); });
  const q = await b.newPage(); const px = await q.evaluate(async (png, runs, dpr) => { const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return runs.map(r => { const all = []; r.rs.forEach(([l, t, rr, bb]) => { const L = Math.ceil(l * dpr), T = Math.ceil(t * dpr), W = Math.max(1, Math.floor(rr * dpr) - L), H = Math.max(1, Math.floor(bb * dpr) - T), d = x.getImageData(L, T, W, H).data; for (let i = 0; i < d.length; i += 4) all.push(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); });
      return [...new Set(all)].map(v => [v >> 16 & 255, v >> 8 & 255, v & 255]); }); }, png, runs, dpr); await q.close();
  return runs.map((r, i) => { const m = r.color.match(/[\d.]+/g).map(Number), col = m.slice(0, 3), a = (m.length > 3 ? m[3] : 1) * r.op; let worst = 99, bg = null; px[i].forEach(c => { const k = crOf(col.map((v, j) => a * v + (1 - a) * c[j]), c); /* text alpha x ancestor opacity, composited over each pixel */ if (k < worst) { worst = k; bg = c; } });
    return { t: r.t, color: r.color, op: +r.op.toFixed(2), fs: r.fs, fw: r.fw, n: px[i].length, worst: +worst.toFixed(2), bg }; }); }
// QA local-b8da1ad W-8a (PM 08:24): Tab through every stop; for each, the 3px focus ring (offset 2px) must be drawn along ≥95% of its straight run on all four sides,
// and the ring colour ≥3:1 against everything next to it: the gap between ring and control (ground / group edge / neighbouring button), the ground outside the ring,
// and the control's own fill (all sampled from rendered pixels).
async function ringWalk(p, b, max = 60) { const out = []; await p.evaluate(() => { window.scrollTo(0, 0); const d = document.createElement('span'); d.tabIndex = -1; document.body.prepend(d); d.focus(); d.blur(); d.remove(); });
  let first = null;
  for (let i = 0; i < max; i++) { await p.keyboard.press('Tab'); await new Promise(r => setTimeout(r, 30));
    const f = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), c = getComputedStyle(e);
      return { id: e.id || (e.tagName + '.' + e.className).slice(0, 40), name: (e.textContent || e.value || '').trim().slice(0, 30), fv: e.matches(':focus-visible'), os: c.outlineStyle, ow: parseFloat(c.outlineWidth), oo: parseFloat(c.outlineOffset), oc: c.outlineColor, rad: parseFloat(c.borderTopLeftRadius) || 0, l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    if (!f) break; if (first === f.id) break; first = first || f.id; await new Promise(r => setTimeout(r, 30));
    const g = await p.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom, scrollX, scrollY]; }); [f.l, f.t, f.r, f.b] = g;
    const m = (f.ow || 3) + (f.oo || 2) + 6, clip = { x: Math.max(0, Math.floor(f.l - m)) + g[4], y: Math.max(0, Math.floor(f.t - m)) + g[5], width: Math.ceil(f.r - f.l + 2 * m), height: Math.ceil(f.b - f.t + 2 * m) };
    const png = await p.screenshot({ encoding: 'base64', clip, captureBeyondViewport: false }), ox = clip.x - g[4], oy = clip.y - g[5];
    const o = f.oo || 2, w = f.ow || 3, cm = f.rad + o + w + 2, pts = []; // [kind, x, y] in viewport coords: ring mid-line, gap, outside, fill
    for (let x = Math.ceil(f.l + cm); x < f.r - cm; x++) for (const [y, s] of [[f.t, -1], [f.b, 1]]) pts.push(['ring', x, y + s * (o + w / 2)], ['gap', x, y + s * (o / 2)], ['out', x, y + s * (o + w + .5)], ['fill', x, y - s * 2]);
    for (let y = Math.ceil(f.t + cm); y < f.b - cm; y++) for (const [x, s] of [[f.l, -1], [f.r, 1]]) pts.push(['ring', x + s * (o + w / 2), y], ['gap', x + s * (o / 2), y], ['out', x + s * (o + w + .5), y], ['fill', x - s * 2, y]);
    const q = await b.newPage(); const px = await q.evaluate(async (png, pts, ox, oy) => { const im = new Image(); im.src = 'data:image/png;base64,' + png; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data;
      return pts.map(([k, X, Y]) => { const i = (Math.floor(Y - oy) * c.width + Math.floor(X - ox)) * 4; return [k, d[i], d[i + 1], d[i + 2]]; }); }, png, pts, ox, oy); await q.close();
    const RC = f.oc.match(/\d+/g).slice(0, 3).map(Number), near = (a, b2) => Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]) <= 40;
    const ring = px.filter(x => x[0] === 'ring'), hit = ring.filter(x => near(x.slice(1), RC)).length; let worst = 99, worstWith = null;
    for (const x of px) if (x[0] !== 'ring') { const k = crOf(RC, x.slice(1)); if (k < worst) { worst = k; worstWith = x; } }
    out.push({ id: f.id, name: f.name, fv: f.fv, outline: f.os + ' ' + f.ow + 'px ' + f.oc + ' +' + f.oo, ringPx: ring.length, drawn: hit, pct: +(100 * hit / Math.max(1, ring.length)).toFixed(1), worst: +worst.toFixed(2), worstWith }); }
  return out; }
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  // QA local-b8da1ad W-8a / PM 08:24: every Tab stop in the sender form and the received view shows its whole focus ring (≥95% of the ring's straight run drawn,
  // from rendered pixels) at ≥3:1 against the gap, the ground outside and the control's fill, at 320/390/1280
  for (const w of [320, 390, 1280]) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
    await p.evaluate(() => Promise.all([document.fonts.ready, ...document.getAnimations().map(a => a.finished)])); const sender = await ringWalk(p, s.b);
    const st = { n: 'Rice', u: 'kilograms-ish', c: '$', q: '10', i: '1', p: '20.03', f: '1.00', b: 'p', x: -1, h: Array.from({ length: 7 }, (_, i) => ['Home ' + (i + 1), '1']) };
    const f = await p.evaluate(o => SACKLINK.encode(o), st); await p.goto('about:blank'); await p.goto(BASE + '#' + f, { waitUntil: 'load' }); await sleep(300); await p.evaluate(() => Promise.all([document.fonts.ready, ...document.getAnimations().map(a => a.finished)]));
    const recv = await ringWalk(p, s.b); await p.select('#pick', '0'); await sleep(150); const picked = await ringWalk(p, s.b);
    await p.focus('#change'); await p.keyboard.press('Enter'); await sleep(250); const change = await ringWalk(p, s.b);
    const all = sender.map(r => Object.assign(r, { view: 'sender' })).concat(recv.map(r => Object.assign(r, { view: 'received' })), picked.map(r => Object.assign(r, { view: 'received, picked' })), change.map(r => Object.assign(r, { view: 'change my amount' }))), bad = all.filter(r => !r.fv || r.pct < 95 || r.worst < 3);
    ck(w + ' QA W-8a (PM 08:24): every Tab stop (' + sender.length + ' sender, ' + recv.length + '/' + picked.length + ' received (before/after a pick), ' + change.length + ' change-my-amount, incl. By amount / Equally per household) shows ≥95% of its focus ring at ≥3:1 against everything next to it (worst ' + Math.min(...all.map(r => r.worst)).toFixed(2) + ':1, least drawn ' + Math.min(...all.map(r => r.pct)) + '%)',
      sender.some(r => r.id === 'bp') && sender.some(r => r.id === 'be') && recv.length > 0 && !bad.length, { bad, all: all.map(r => r.view + ' ' + r.id + ' ' + r.pct + '% ' + r.worst) });
    ck(w + ' QA W-8a: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  rows.forEach(r => console.log(r.ok ? 'ok ' : 'FAIL', r.name, r.ok ? '' : JSON.stringify(r.info)));
  process.exit(0);
})();
