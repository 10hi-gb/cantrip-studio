// node tests/browser/design-fit.qa.js <base-url> [host ip] — design-check C050/C087 regressions at 390x844 and 1440x900.
// C050: page never scrolls sideways; "Grow it" visible on entry; grown plant has leaves, every leaf + the whole plant sit inside the sheet (viewBox).
// C087: no sideways scroll in maker or recipient; on mobile the tab drawer + active slot start inside the first screen; "Take it off" is one line.
const puppeteer = require('/workspace/oct13tools/node_modules/puppeteer-core');
(async () => { const base = process.argv[2], ip = process.argv[3]; const args = ['--no-sandbox']; if (ip) args.push(`--host-resolver-rules=MAP ${new URL(base).host} ${ip}`);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', timeout: 120000, protocolTimeout: 240000, args });
  const p = await b.newPage(); p.setDefaultTimeout(30000); const out = { fails: [], res: {} }; const F = m => out.fails.push(m);
  const go = async u => { await p.goto('about:blank'); await p.goto(u, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 1200)); };
  const sw = () => p.evaluate(() => document.documentElement.scrollWidth);
  for (const [w, h] of [[390, 844], [1440, 900]]) { await p.setViewport({ width: w, height: h }); const R = out.res[w] = {};
    // ---- C050
    await go(base + 'a-plant-from-this/'); R.plantEntrySW = await sw();
    R.growTop = await p.evaluate(() => { const g = [...document.querySelectorAll('button')].find(x => /^Grow it/i.test(x.textContent.trim())); return g ? g.getBoundingClientRect().bottom : -1; });
    if (R.plantEntrySW > w) F(w + ' plant entry sideways'); if (R.growTop < 0 || R.growTop > h) F(w + ' Grow it below fold');
    const hash = await p.evaluate(() => PL.encode('the kitchen on Sunday mornings', 'Water it with compliments.'));
    for (const st of ['grown', 'recv']) {
      if (st === 'grown') { const ins = await p.$$('input,textarea'); const vals = ['the kitchen on Sunday mornings', 'Water it with compliments.']; let i = 0; for (const el of ins) if (await el.isVisible() && i < 2) { await el.click({ clickCount: 3 }); await el.type(vals[i++]); }
        await p.evaluate(() => [...document.querySelectorAll('button')].find(x => /^Grow it/i.test(x.textContent.trim())).click()); }
      else { await go(base + 'a-plant-from-this/#' + hash); await p.evaluate(() => { const o = [...document.querySelectorAll('button')].find(x => /^(See it|Watch it|Show me)/i.test(x.textContent.trim()) && x.offsetParent); if (o) o.click(); }); }
      try { await p.waitForFunction(() => document.querySelector('.pv-stage svg').childElementCount > 0, { timeout: 8000 }); } catch (e) { F(w + ' ' + st + ' plant never grew'); continue; }
      await new Promise(r => setTimeout(r, 4500));
      const g = await p.evaluate(() => { const svg = document.querySelector('.pv-stage svg'); if (!svg) return null; const vb = svg.viewBox.baseVal; const sr = svg.getBoundingClientRect(); const sx = sr.width / vb.width, sy = sr.height / vb.height;
        const leaves = [...svg.querySelectorAll('[class*=leaf]')].filter(e => e.tagName === 'path'); const inside = r => r.left >= sr.left - 1 && r.right <= sr.right + 1 && r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1;
        const plant = svg.lastElementChild.getBoundingClientRect(); const lr = leaves.map(l => l.getBoundingClientRect());
        const spread = lr.length ? Math.max(...lr.map(r => r.left)) - Math.min(...lr.map(r => r.left)) : 0;
        return { leaves: leaves.length, outside: lr.filter(r => !inside(r)).length, plantInside: inside(plant), spread: Math.round(spread), sw: document.documentElement.scrollWidth }; });
      R['plant_' + st] = g; if (!g) { F(w + ' ' + st + ' no svg'); continue; }
      if (g.leaves < 1) F(w + ' ' + st + ' no leaves'); if (g.outside) F(w + ' ' + st + ' leaves outside sheet'); if (!g.plantInside) F(w + ' ' + st + ' plant overflows sheet');
      if (g.spread < 20) F(w + ' ' + st + ' leaves piled in one spot'); if (g.sw > w) F(w + ' ' + st + ' sideways'); }
    // ---- C087
    await go(base + 'wear-this/'); const m = await p.evaluate(() => { const t = document.querySelector('.wt-tabs'), a = document.querySelector('.wt-slot.is-active') || document.querySelector('.wt-slot');
      const off = document.querySelector('.wt-off'); const rg = document.createRange(); rg.selectNodeContents(off);
      return { sw: document.documentElement.scrollWidth, tabsTop: t && getComputedStyle(t).display !== 'none' ? t.getBoundingClientRect().top : null, slotTop: a.getBoundingClientRect().top, offLines: rg.getClientRects().length }; });
    R.wearMake = m; if (m.sw > w) F(w + ' wear maker sideways'); if (m.offLines !== 1) F(w + ' Take it off wraps');
    if (w < 900 && (m.tabsTop === null || m.tabsTop > h || m.slotTop > h)) F(w + ' mobile drawer below first screen');
    const wh = await p.evaluate(() => WTM.encode({ head: { s: 2, c: 3 }, top: { s: 2, c: 2 }, bottom: { s: 2, c: 4 }, shoes: { s: 2, c: 5 }, k: 5 }));
    await go(base + 'wear-this/#' + wh); const r = await p.evaluate(() => ({ recv: document.getElementById('root').classList.contains('is-recv'), sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, ...[...document.querySelectorAll('main, main *')].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => Math.ceil(e.getBoundingClientRect().right))),
      doll: Math.round(document.querySelector('.wt-dollwrap').getBoundingClientRect().width) }));
    R.wearRecv = r; if (!r.recv) F(w + ' recipient state not reached'); if (r.sw > w) F(w + ' wear recipient sideways'); if (w < 900 && r.doll < 0.8 * Math.min(w - 40, 330)) F(w + ' recipient card shrunk'); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); process.exit(out.fails.length ? 1 : 0); })();
