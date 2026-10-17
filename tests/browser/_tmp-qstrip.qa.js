// node tests/browser/mill-even-up.qa.js <host[:port]> <ip> [scheme] — Even Up @320/390/1280 (ENGINEER SELF-CHECK, localhost-preview)
// Flows (brief test, odd cent, excluded + weighted, invalid input, payer removed + in-page error link), copy / copy failure,
// share cancel, recipient read-only (recipientAccess), typedAudit incl. the PM Q1 spoof case, malformed links, reset,
// no storage / no network, the 2,000-char origin+path+fragment cap, toast reset on route change, 320 fit, print.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, sameTabBadLink, mouseAt, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result, reallyHidden } = require('./mill-common');
const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../../mill/even-up/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/even-up/`;
const SP = 'Milk\u201D from \u201CYour bank', G = '\u00ABBank\u00BB \u201Ex\u201F', SE = 'Rent\u201D paid by \u201CLandlord', SW = '\u00ABFee\u00BB \u201Esent\u201F'; // distinct seeds: names, event, what
async function press(p, sel, key = 'Enter') { await p.focus(sel); await p.keyboard.press(key); await sleep(40); }
async function addX(p, what, amt, payer, mode, inc) { // inc: {personId: true | weight string}
  await typeInto(p, '#f-what', what); await typeInto(p, '#f-amt', amt); if (payer) await p.select('#f-payer', String(payer));
  await press(p, mode === 'w' ? '#m-w' : '#m-e');
  const ids = await p.$$eval('#chips .eu-chip', bs => bs.map(b => [b.id.slice(2), b.getAttribute('aria-pressed') === 'true']));
  for (const [id, on] of ids) { const want = inc[id] != null; if (want !== on) await press(p, '#c-' + id, 'Space'); if (want && mode === 'w') await typeInto(p, '#w-' + id, String(inc[id])); }
  await press(p, '#f-add');
}
const view = p => p.evaluate(() => ({
  transfers: [...document.querySelectorAll('#transfers li')].map(li => li.textContent.replace(/^\d+/, '')), settleH: document.getElementById('settle-h').textContent, check: document.getElementById('settle-check').textContent,
  tokens: [...document.querySelectorAll('#rods .eu-rod-row')].map(r => r.querySelector('.eu-name').textContent + ' ' + r.querySelector('.eu-rod').dataset.side + ' ' + r.querySelector('.eu-fig').textContent),
  tape: [...document.querySelectorAll('#xs .eu-x')].map(x => x.innerText.replace(/\n(Edit|Remove)/g, '')), net: document.getElementById('net').innerText, fix: document.getElementById('fix').hidden ? '' : document.getElementById('fix-t').textContent,
  copyDis: document.getElementById('b-copy').disabled, nums: [...document.querySelectorAll('#lines .eu-link-num')].map(n => n.textContent), links: document.querySelectorAll('#lines .eu-link').length, hash: location.hash, toast: document.getElementById('toast').hidden ? '' : document.getElementById('toast').textContent }));
const fill = async p => {
  await typeInto(p, '#ev', 'Cabin weekend'); await typeInto(p, '#p-1', 'Ade'); await typeInto(p, '#p-2', 'Ben'); await press(p, '#p-add'); await p.keyboard.type('Cy');
  await addX(p, 'Firewood', '30', 1, 'e', { 1: 1, 2: 1, 3: 1 });
};
const clipStub = fail => () => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return window.__clipFail ? Promise.reject(new Error('no')) : Promise.resolve(); } } }); };
async function fits(p) { return p.evaluate(() => { const w = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('button,label,select,input,.eu-chip,.eu-token,.eu-transfers li,.eu-x-h,.eu-name').forEach(e => { if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return; const r = e.getBoundingClientRect();
    if (r.right > w + 1 || r.left < -1) bad.push('edge:' + (e.id || e.className)); if (e.tagName !== 'INPUT' && e.tagName !== 'SELECT' && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') bad.push('clip:' + (e.id || e.className));
    if ((e.tagName === 'BUTTON') && e.scrollWidth > e.clientWidth + 1) bad.push('btnclip:' + (e.id || e.textContent)); });
  return bad.slice(0, 10); }); }
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  // ---------- PM 04:57 query strip: replaceState writes origin + path (+ #fragment) only. Load and hashchange keep path + #fragment; edit, reset and
  // Start my own write the path only; Make a link drops a query too. Before each action a ?q=<marker> is put back (replaceState, no event) so each
  // writer is checked on its own: location.search is '' and the marker is nowhere in location.href afterwards.
  { const s = await session(H, IP), { p } = s; await p.setViewport({ width: 390, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    const MK = 'qzMARK' + Date.now().toString(36), PATH = new URL(BASE).pathname; await p.goto(BASE, { waitUntil: 'load' });
    const fa = await p.evaluate(() => MILL.pack('e', 1, { e: 'Zqv trip', c: 0, p: ['Ade', 'Ben', 'Cy'], x: [['Groceries', 1000, 0, 0, [0, 1, 2]]] })), fb = await p.evaluate(() => MILL.pack('e', 1, { e: 'Second', c: 0, p: ['Dee', 'Eli'], x: [['Taxi', 2000, 0, 0, [0, 1]]] }));
    const loc = () => p.evaluate(() => ({ href: location.href, search: location.search, hash: location.hash, path: location.pathname, origin: location.origin }));
    const putQ = (hash) => p.evaluate((q, h) => history.replaceState(null, '', location.pathname + '?q=' + q + (h ? '#' + h : '')), MK, hash);
    const okL = (l, frag) => l.search === '' && !l.href.includes(MK) && l.path === PATH && l.href === l.origin + l.path + (frag ? '#' + frag : '');
    const steps = [];
    await p.goto('about:blank'); await p.goto(BASE + '?q=' + MK + '#' + fa, { waitUntil: 'load' }); await sleep(350);
    let l = await loc(), seen = await p.evaluate(() => document.body.innerText.includes('Zqv')); steps.push(['load ?q=<marker>#link -> path + #fragment', okL(l, fa) && seen, l]);
    await putQ(fa); await p.evaluate(f => { location.hash = f; }, fb); await sleep(350); l = await loc(); seen = await p.evaluate(() => document.body.innerText.includes('Second'));
    steps.push(['hashchange to another link -> path + #new fragment', okL(l, fb) && seen, l]);
    await putQ(fb); await press(p, '#own-copy'); await sleep(250); l = await loc(); steps.push(['Start my own -> path only', okL(l, ''), l]);
    await putQ(''); await p.focus('#ev'); await p.keyboard.type('x'); await sleep(200); l = await loc(); steps.push(['edit (event name) -> path only', okL(l, ''), l]);
    await putQ(''); await p.evaluate(() => document.getElementById('b-share').click()); await sleep(300); l = await loc(); const made = await p.$eval('#link', e => e.value).catch(() => '');
    steps.push(['Make a link -> path only; the link made carries no ? and no marker', okL(l, '') && /#/.test(made) && !made.includes('?') && !made.includes(MK), Object.assign({ made: made.slice(0, 80) }, l)]);
    await putQ(''); await p.evaluate(() => document.getElementById('b-reset').click()); await sleep(300); l = await loc(); steps.push(['Clear (reset) -> path only', okL(l, ''), l]);
    for (const [nm, ok, info] of steps) ck('PM 04:57 query strip: ' + nm + '; location.search is "" and the marker is not in location.href', ok, info);
    ck('PM 04:57 query strip: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close(); }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
