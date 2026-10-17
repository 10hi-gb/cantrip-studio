// node tests/browser/local-review-check.js <unzipped dir> <http base, e.g. http://127.0.0.1:8810> <full sha>
// LOCALHOST-PREVIEW check of a build-local-review.py zip: hub + every shipped piece at 320/390/1280 over http
// (CSP meta present, app boots, no request leaves the local origin, no sideways scroll, no page/CSP errors,
// build-info commit == sha), then the same pages over file:// (does the piece boot?).
const puppeteer = require('puppeteer-core'), fs = require('fs'), path = require('path');
const [DIR, BASE, SHA] = process.argv.slice(2);
const PIECES = ['before-you-go', 'one-less-trip', 'one-small-ask', 'split-the-sack'].filter(p => fs.existsSync(path.join(DIR, 'mill', p, 'index.html')));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  async function visit(url, w) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); const reqs = [], errs = [];
    p.on('request', r => reqs.push(r.url())); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.setViewport({ width: w, height: 800 }); await p.goto(url, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 300));
    const t = await p.evaluate(() => ({ csp: (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '', h1: (document.querySelector('h1') || {}).textContent || '', title: document.title,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, build: window.MILL_BUILD || null, hubLinks: document.querySelectorAll('a[href$="/"]').length, btns: document.querySelectorAll('button').length }));
    await ctx.close(); return { t, reqs, errs };
  }
  const pages = [['hub', '/mill/']].concat(PIECES.map(p => [p, '/mill/' + p + '/']));
  for (const w of [320, 390, 1280]) for (const [name, u] of pages) {
    const { t, reqs, errs } = await visit(BASE + u, w); const origin = new URL(BASE).origin;
    const ext = reqs.filter(r => !r.startsWith(origin + '/') && !r.startsWith('data:'));
    const errsReal = errs.filter(e => !/Cross-Origin-Opener-Policy/.test(e));
    ck(`http ${w} ${name}: CSP meta (connect-src 'none', no frame-ancestors), boots, no external requests, no sideways scroll, no errors`,
      /connect-src 'none'/.test(t.csp) && !/frame-ancestors|report-uri|sandbox/.test(t.csp) && t.h1.trim() && (name === 'hub' || t.btns > 0) && !ext.length && t.sw <= t.cw && !errsReal.length, { csp: t.csp.slice(0, 40), h1: t.h1, ext, sw: t.sw, cw: t.cw, errs: errsReal });
    if (name === 'hub') ck(`http ${w} hub: build-info commit = ${SHA.slice(0, 12)}, label localhost-preview`, t.build && t.build.commit === SHA && t.build.label === 'localhost-preview, not a deployed pin', t.build);
  }
  const fileRes = {};
  for (const [name, u] of pages) {
    const { t, errs } = await visit('file://' + path.resolve(DIR) + u + 'index.html', 390); const fontsBlocked = errs.filter(e => /font|woff/i.test(e)).length;
    const boots = !!t.h1.trim() && (name === 'hub' ? t.hubLinks >= PIECES.length : t.btns > 0 && t.title.includes('Cantrip'));
    fileRes[name] = { boots, fontsBlocked, errs: errs.slice(0, 3) }; ck(`file:// ${name}: recorded (boots=${boots})`, true, fileRes[name]);
  }
  await b.close();
  fs.writeFileSync('/tmp/local-review-file-results.json', JSON.stringify(fileRes, null, 1));
  const bad = rows.filter(r => !r.ok); console.log(JSON.stringify(rows, null, 1)); console.log(bad.length ? 'FAIL ' + bad.map(r => r.name).join(', ') : 'PASS ' + rows.length + ' checks');
  process.exit(bad.length ? 1 : 0);
})();
