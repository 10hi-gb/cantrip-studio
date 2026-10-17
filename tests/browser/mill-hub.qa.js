// node tests/browser/mill-hub.qa.js <host[:port]> <ip> [scheme] — hub renders every piece on a phone (ENGINEER SELF-CHECK)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { W, sleep, session, result, errsOf } = require('./mill-common');
const HUB = require('../../mill/hub.json');
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) { const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 800 }); await p.goto(`${SCHEME}://${H}/mill/`, { waitUntil: 'load' }); await sleep(200);
    const t = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, rows: [...document.querySelectorAll('.hub-row')].map(r => ({ name: r.querySelector('h2').textContent, txt: r.innerText, link: !!r.querySelector('h2 a'), right: Math.round(r.getBoundingClientRect().right), wide: [...r.querySelectorAll('*')].some(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1) })), body: document.body.innerText }));
    ck(w + ' hub: every hub.json piece rendered, no sideways scroll, nothing past the edge', t.rows.length === HUB.pieces.length && t.sw <= t.cw && !t.rows.some(r => r.wide), { n: t.rows.length, sw: t.sw, cw: t.cw, wide: t.rows.filter(r => r.wide).map(r => r.name) });
    ck(w + ' hub: no "Awaiting QA" anywhere', !/Awaiting QA/i.test(t.body), null);
    for (const pc of HUB.pieces) { const r = t.rows.find(x => x.name.startsWith(pc.name)); if (!r) { ck(w + ' ' + pc.id + ' rendered', false, pc.name); continue; }
      if (pc.path) ck(w + ' ' + pc.id + ' NOT READY + local QA full SHA, LOCALHOST-PREVIEW, report path' + (pc.qaDeployed ? ' + deployed pin 83a2ebcd FAIL with commit' : ''), r.txt.includes('NOT READY') && r.txt.includes(pc.qaLocal.sha) && r.txt.includes('LOCALHOST-PREVIEW') && r.txt.includes(pc.qaLocal.report) && (!pc.qaDeployed || (r.txt.includes('Pin 83a2ebcd FAIL') && r.txt.includes('d37121e7f446865ae3e7e930042ffb1582390070'))), r.txt);
      else ck(w + ' ' + pc.id + ' QUEUED, NOT BUILT: no link, no review link, no self-check', r.txt.includes('QUEUED, NOT BUILT') && !r.link && !/Review link|SELF-CHECK|Open /.test(r.txt), r.txt); }
    ck(w + ' hub: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
