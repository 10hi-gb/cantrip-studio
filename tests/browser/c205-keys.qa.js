// node tests/browser/c205-keys.qa.js <base-url> [host ip]  — C205 QA r527 regressions at 320/390/1024:
// (1) colour labels never break inside a word; (2) two colours can be picked with Tab/Enter/Space only; arrows still move.
const puppeteer = require('/workspace/oct13tools/node_modules/puppeteer-core');
(async () => { const base = process.argv[2], ip = process.argv[3]; const args = ['--no-sandbox']; if (ip) args.push(`--host-resolver-rules=MAP ${new URL(base).host} ${ip}`);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', timeout: 120000, protocolTimeout: 240000, args });
  const p = await b.newPage(); p.setDefaultTimeout(60000); const out = { fails: [], res: {} };
  for (const w of [320, 390, 1024]) { await p.setViewport({ width: w, height: 800 }); await p.goto('about:blank'); await p.goto(base + 'not-on-the-screen/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.querySelectorAll('.ns-key').length === 8);
    const labels = await p.evaluate(() => [...document.querySelectorAll('.ns-key .lbl')].map(l => { const r = document.createRange(); r.selectNodeContents(l); return { t: l.textContent, lines: r.getClientRects().length, over: l.scrollWidth > l.clientWidth + 1, kw: l.closest('.ns-key').getBoundingClientRect().width, lw: l.getBoundingClientRect().width }; }));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    // keyboard: Tab to first colour, Enter, then only Tab/Space to reach and pick a second
    await p.evaluate(() => document.activeElement && document.activeElement.blur()); let k = 0;
    while (k++ < 20 && !(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('ns-key')))) await p.keyboard.press('Tab');
    await p.keyboard.press('Enter'); const f2 = await p.evaluate(() => document.activeElement.dataset.id);
    await p.keyboard.press('Space'); const picked = await p.evaluate(() => [...document.querySelectorAll('.ns-key[aria-pressed=true]')].map(x => x.dataset.id));
    let t = 0; while (t++ < 25 && !(await p.evaluate(() => document.activeElement.id === 'make'))) await p.keyboard.press('Tab');
    const makeReached = await p.evaluate(() => document.activeElement.id === 'make' && !document.activeElement.disabled); await p.keyboard.press('Enter'); const hash = await p.evaluate(() => location.hash);
    // arrows still work on a fresh page
    await p.goto('about:blank'); await p.goto(base + 'not-on-the-screen/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.querySelectorAll('.ns-key').length === 8);
    await p.focus('.ns-key'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); const arrowAt = await p.evaluate(() => document.activeElement.dataset.id);
    const r = { labels: labels.map(l => l.t + ':' + l.lines + (l.over ? ':OVER' : '')), sw, f2, picked, makeReached, hash, arrowAt }; out.res[w] = r;
    if (labels.some(l => l.lines !== 1 || l.over)) out.fails.push(w + ' label wraps/overflows'); if (sw > w) out.fails.push(w + ' page overflow');
    if (picked.length !== 2 || !makeReached || !/^#v1\.c[1-8]\.c[1-8]$/.test(hash)) out.fails.push(w + ' Tab/Enter/Space pick failed'); if (arrowAt !== 'c3') out.fails.push(w + ' arrows broken'); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); process.exit(out.fails.length ? 1 : 0); })();
