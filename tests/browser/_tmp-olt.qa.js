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
  // ---- rendered-pixel contrast (QA all9 method): text colour x opacity chain composited over the background as rendered with every glyph made
  // transparent (gradients, textures, shadows included). Sampled in the glyph band of each line box (middle 60% of its height, 1px in from each
  // side, so line-box padding and pill corners the glyphs never touch are left out). Returns the median-background ratio and the worst-pixel ratio.
  const rgbOf = s => s.match(/[\d.]+/g).slice(0, 4).map(Number), lumA = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const crA = (a, b) => { const x = lumA(a), y = lumA(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // QA W-6b (PM 08:26): full = QA's band B: each line's rect grown to the computed line-height, clamped to its block, full width (not the middle 60%); darkest pixel.
  async function renderedContrast(s, p, sel, full) {
    const vw = p.viewport(), H = await p.evaluate(() => document.documentElement.scrollHeight); await p.setViewport({ width: vw.width, height: Math.min(H, 8000) }); await p.evaluate(() => scrollTo(0, 0)); await sleep(200);
    const items = await p.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && getComputedStyle(e).visibility === 'visible' && e.textContent.trim()).map(e => { const rg = document.createRange(); rg.selectNodeContents(e);
      const rects = [...rg.getClientRects()].filter(x => x.width > 1 && x.height > 1).map(x => ({ x: x.left, y: x.top, w: x.width, h: x.height })); let blk = e; while (blk && /^inline/.test(getComputedStyle(blk).display)) blk = blk.parentElement; const bb = blk.getBoundingClientRect(), lhs = getComputedStyle(e).lineHeight, lh = lhs === 'normal' ? 0 : parseFloat(lhs); let a = 1; for (let x = e; x; x = x.parentElement) a *= parseFloat(getComputedStyle(x).opacity);
      return { txt: e.textContent.trim().slice(0, 40), el: e.id ? '#' + e.id : (e.parentElement.closest('[id]') ? e.parentElement.closest('[id]').id + '>' : '') + e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''), rects, lh, blk: [bb.top, bb.bottom], color: getComputedStyle(e).color, a, size: getComputedStyle(e).fontSize }; }), sel);
    await p.evaluate(full => { window.__rcFull = !!full; window.__rco = []; window.__rc = []; document.querySelectorAll('*').forEach(e => { window.__rc.push([e, e.style.getPropertyValue('color'), e.style.getPropertyPriority('color'), e.style.getPropertyValue('text-shadow'), e.style.getPropertyPriority('text-shadow')]); e.style.setProperty('color', 'transparent', 'important'); e.style.setProperty('text-shadow', 'none', 'important'); }); if (window.__rcFull) document.querySelectorAll('*').forEach(e => { window.__rco.push([e, e.style.getPropertyValue('outline-color'), e.style.getPropertyPriority('outline-color')]); e.style.setProperty('outline-color', 'transparent', 'important'); }); }, full);
    await sleep(150); const png = await p.screenshot({ encoding: 'base64' });
    await p.evaluate(() => { window.__rco.forEach(([e, c, cp]) => { if (c) e.style.setProperty('outline-color', c, cp); else e.style.removeProperty('outline-color'); }); window.__rc.forEach(([e, c, cp, t, tp]) => { if (c) e.style.setProperty('color', c, cp); else e.style.removeProperty('color'); if (t) e.style.setProperty('text-shadow', t, tp); else e.style.removeProperty('text-shadow'); }); delete window.__rc; });
    const dp = await s.b.newPage(); const px = await dp.evaluate(async (b64, items, full) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      return items.map(it => { const out = []; it.rects.forEach(r => { const gg = full && it.lh > r.h ? (it.lh - r.h) / 2 : 0, ya = full ? Math.max(r.y - gg, it.blk[0]) : r.y + r.h * .2, yb = full ? Math.min(r.y + r.h + gg, it.blk[1]) : r.y + r.h * .8; const x0 = Math.max(0, Math.round(full ? r.x : r.x + 1)), y0 = Math.max(0, Math.round(ya)), w = Math.max(1, Math.min(c.width - x0, Math.round(full ? r.w : r.w - 2))), h = Math.max(1, Math.min(c.height - y0, Math.round(yb) - y0)); const d = g.getImageData(x0, y0, w, h).data; for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]); }); return out; }); }, png, items, full);
    await dp.close(); await p.setViewport(vw); await sleep(150);
    return items.map((it, k) => { const bg = px[k]; if (!bg.length) return Object.assign(it, { med: null, worst: null }); const L = bg.map(lumA), ord = L.map((v, i) => i).sort((a, b) => L[a] - L[b]), med = bg[ord[ord.length >> 1]];
      const c = rgbOf(it.color), al = (c[3] === undefined ? 1 : c[3]) * it.a, comp = b => [0, 1, 2].map(i => c[i] * al + b[i] * (1 - al)), r = b => crA(comp(b), b);
      const worst = Math.min(...[...new Set(ord.map(i => bg[i].join()))].map(sv => r(sv.split(',').map(Number))));
      return { txt: it.txt, el: it.el, size: it.size, color: it.color, a: +it.a.toFixed(3), med: med.join(','), ratioMed: +r(med).toFixed(2), ratioP5: +r(bg[ord[Math.floor(ord.length * .05)]]).toFixed(2), ratioWorst: +worst.toFixed(2), worstPx: bg[ord[0]].join(','), n: bg.length }; }); }
// ...
  // ---------- QA W-6 / W-6b / W-6c (local-68e592f): every grey line on the counter (#progress, .olt-meta, strip, fine print, every --olt-mute text) >= 4.5:1
  // and every ticket number (34px bold, large: >= 3:1; the tray's "?" included) against the DARKEST rendered pixel in QA's band B, in every state: short / long
  // list, with and without the set-aside tray, received / own / ticked / link shown, at 320/390/1280, plus a list-length sweep (1-8 rows) because the counter
  // speckle lands differently under the belt as the page grows. Also: the belt's outer shadow reaches less far than the gap to the first text under it.
  { const W24 = 'Pneumonoultramicroscopic', HY = 'twenty-two-year-old', FL = 'Ana \u{1F1F3}\u{1F1FF}\u{1F1EF}\u{1F1F5} \u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}', cut = (x, n) => [...x].slice(0, n).join('');
    const long = { h: [{ id: 1, name: 'Wolfeschlegelsteinhausen' }, { id: 2, name: cut('Anne-Marie-Louise-Ottoline', 24) }, { id: 3, name: cut('Bartholomew Quatermaine', 24) }, { id: 4, name: cut(FL, 24) }], r: [], m: [], next: 5 };
    [[W24 + ' ' + HY, W24 + ' Supermarket'], ['Oat milk', 'Corner shop ' + HY], [FL + ' gift', 'Mother-in-law\u2019s ' + W24], [W24, W24]].forEach(([i, x], k) => long.r.push({ id: long.next++, o: 1 + (k % 4), i: cut(i, 40), q: 2, u: cut('kilograms-ish', 16), s: cut(x, 40) }));
    const short = { h: [{ id: 1, name: 'Sam' }, { id: 2, name: 'Jo' }], r: [{ id: 3, o: 1, i: 'Milk', q: 1, u: 'L', s: 'Shop' }], m: [], next: 4 };   // QA fix-w6b.js fixtures
    const withTray = st => { const t = JSON.parse(JSON.stringify(st)); t.r.push({ id: t.next++, o: 1, i: t.r.length > 1 ? 'Batteries ' + W24.slice(0, 20) : 'Stamps', q: t.r.length > 1 ? 4 : 2, u: t.r.length > 1 ? 'AA' : '', s: '' }); return t; };
    const sized = n => { const t = { h: [{ id: 1, name: 'Sam' }, { id: 2, name: 'Jo' }], r: [], m: [], next: 3 }; for (let k = 0; k < n; k++) t.r.push({ id: t.next++, o: 1 + (k % 2), i: ['Milk', 'Eggs', 'Rice', 'Soap', 'Tea', 'Bread', 'Jam', 'Oats'][k], q: 1, u: '', s: ['Shop', 'Post office', 'Market'][k % 3] }); return t; };
    const lum = c => { const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
    const table = {};
    for (const w of [320, 390, 1280]) { const s = await session(H, IP), { p } = s; await p.setViewport({ width: w, height: w === 1280 ? 900 : w === 390 ? 844 : 700 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      const enc = st => p.evaluate(st => OLT.encode(st), st);
      const F = { short: await enc(short), long: await enc(long), 'short+tray': await enc(withTray(short)), 'long+tray': await enc(withTray(long)) };
      const runs = [];
      for (const fx of Object.keys(F)) for (const v of ['received', 'own', 'received, all ticked', 'own, 2 ticked + link']) runs.push([fx + ', ' + v, F[fx], v]);
      for (let n = 1; n <= 8; n++) runs.push(['sweep ' + n + ' row(s), received', await enc(sized(n)), 'received'], ['sweep ' + n + ' row(s), own', await enc(sized(n)), 'own']);
      const fails = [], reach = [];
      for (const [nm, frag, v] of runs) { await p.goto('about:blank'); await p.goto(BASE + '#' + frag, { waitUntil: 'load' }); await sleep(250);
        if (/own/.test(v)) { await p.click('#own-copy'); await sleep(200); }
        if (/ticked/.test(v)) { await p.evaluate(n => [...document.querySelectorAll('.olt-check')].slice(0, n).forEach(c => c.click()), /all/.test(v) ? 99 : 2); await sleep(250); }
        if (/link/.test(v)) { await p.evaluate(() => { const b = document.getElementById('b-share'); if (b && !b.disabled) b.click(); }); await sleep(300); }
        const mute = await p.evaluate(() => { const want = getComputedStyle(document.getElementById('progress')).color; document.querySelectorAll('[data-w6b]').forEach(e => e.removeAttribute('data-w6b'));
          document.querySelectorAll('body *').forEach(e => { if (getComputedStyle(e).color === want && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest(':disabled,[aria-disabled=true]')) e.setAttribute('data-w6b', ''); }); return want; });
        // shadow reach vs the gap to the first text line under the belt (computed, independent of where the speckle lands)
        const sh = await p.evaluate(() => { const b = document.getElementById('belt'); if (!b || !b.getClientRects().length) return null; const bs = getComputedStyle(b).boxShadow, br = b.getBoundingClientRect();
          const outer = bs.split(/,(?![^(]*\))/).map(x => x.trim()).filter(x => !/inset/.test(x)).map(x => { const n = x.replace(/rgba?\([^)]*\)/, '').trim().split(/\s+/).map(parseFloat); return { y: n[1] || 0, blur: n[2] || 0, spread: n[3] || 0 }; });
          const r = Math.max(0, ...outer.map(o => o.y + o.blur + o.spread)); let nx = b.nextElementSibling; while (nx && (!nx.getClientRects().length || nx.hidden)) nx = nx.nextElementSibling;
          const rg = document.createRange(); let top = null; if (nx) { rg.selectNodeContents(nx); const rs = [...rg.getClientRects()].filter(q => q.height > 1); if (rs.length) { const lh = parseFloat(getComputedStyle(nx).lineHeight) || rs[0].height; top = rs[0].top - Math.max(0, (lh - rs[0].height) / 2); } }
          return { reach: r, next: nx ? nx.id || nx.className : null, gap: top === null ? null : +(top - br.bottom).toFixed(1) }; });
        if (sh && sh.gap !== null) reach.push(sh);
        const r = await renderedContrast(s, p, '.olt-strip a, .olt-strip span, .olt-meta, .olt-fine, #notes, [data-w6b], .olt-num', true);
        for (const x of r) { const big = /olt-num/.test(x.el || '') || parseFloat(x.size) >= 24, need = big ? 3 : 4.5; const k = (/olt-num/.test(x.el || '') ? (x.txt === '?' ? 'tray "?"' : 'ticket ' + x.txt) : x.el === '#progress' || /picked up/.test(x.txt) ? '#progress' : 'other grey');
          const key = nm.replace(/^sweep.*/, 'list-length sweep 1-8'); table[k] = table[k] || {}; table[k][key] = table[k][key] || {}; table[k][key][w] = Math.min(table[k][key][w] || 99, x.ratioWorst);
          if (x.ratioWorst < need) fails.push(nm + ': ' + (x.el || '') + ' "' + x.txt.slice(0, 24) + '" ' + x.size + ' worst ' + x.ratioWorst + ' @' + x.worstPx + ' (needs ' + need + ')'); } }
      const prog = runs.length, minGap = Math.min(...reach.map(x => x.gap)), maxReach = Math.max(...reach.map(x => x.reach));
      ck(w + ` QA W-6b/W-6c: ${prog} states (short/long, with/without the tray, received/own/ticked/link, 1-8-row sweep): every grey line >= 4.5:1 and every ticket number (tray "?" included) >= 3:1 against the darkest pixel in QA's band B`, !fails.length, fails.slice(0, 12));
      ck(w + ` QA W-6b: the belt's outer shadow reaches ${maxReach}px below it, less than the gap to the first text line under it in every state (min ${minGap}px)`, reach.length > 0 && maxReach < minGap, reach.filter(x => x.reach >= x.gap).slice(0, 6));
      ck(w + ' QA W-6b/W-6c block: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
    if (process.env.OLT_W6_LOG) require('fs').writeFileSync(process.env.OLT_W6_LOG, JSON.stringify(table)); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
