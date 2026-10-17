// node tests/browser/mill-sender-typed.qa.js <host[:port]> <ip> [scheme] — QA local-7b5ceeb D14 class, all pieces (ENGINEER SELF-CHECK)
// The SENDER's own editor views quote typed text too: previews, validation messages, buttons, aria (label, describedby, live),
// options, toasts and copy text. (OLT sender: mill-olt.qa.js HOST audit; Sack: mill-sack.qa.js D14; TSH: in the TSH D3 commit.)
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, W, sleep, session, result, errsOf, typeInto } = require('./mill-common');
const M = (slug) => `${SCHEME}://${H}/mill/${slug}/`;
const val = (p, sel) => p.$eval(sel, e => e.value != null ? e.value : e.textContent);
const CASES = [
  { slug: 'before-you-go', seeds: ['Zqx bike', 'Zqx corner', 'Zqx lock?', 'Zqx Jo', 'Zqx cash'],
    fill: async p => { await typeInto(p, '#pickup', 'Zqx bike'); await typeInto(p, '#f-place', 'Zqx corner'); await typeInto(p, '#by', 'Zqx Jo'); await typeInto(p, '#a-bring', 'Zqx cash'); await p.click('#ok-bring'); await typeInto(p, '#own-in', 'Zqx lock?'); await p.keyboard.press('Enter'); await sleep(80);
      await typeInto(p, '#own-in', 'Zqx lock?'); await p.keyboard.press('Enter'); await sleep(80); },
    extra: async p => ({ copied: await val(p, '#text'), print: await val(p, '#printq') }) },
  { slug: 'one-small-ask', seeds: ['Zqx favor', 'Zqx porch', 'Zqx Dana', 'Zqx Sam'],
    fill: async p => { await p.waitForSelector('#f-w'); await typeInto(p, '#f-w', 'Zqx favor'); await typeInto(p, '#f-h', 'Zqx porch'); await typeInto(p, '#f-f', 'Zqx Dana'); await typeInto(p, '#f-o', 'Zqx Sam'); await p.keyboard.press('Tab'); await sleep(120); },
    extra: async p => ({ copied: await val(p, '#text') }) },
];
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) for (const c of CASES) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.resolve() } }); });
    await p.goto(M(c.slug), { waitUntil: 'load' }); await sleep(150); await c.fill(p);
    const a = await typedAudit(p, c.seeds, await c.extra(p));
    ck(w + ' ' + c.slug + ' sender editor: typed text quoted everywhere it is shown (screen, aria, describedby, live, toast, copy text)', a.ok, a);
    ck(w + ' ' + c.slug + ' no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
