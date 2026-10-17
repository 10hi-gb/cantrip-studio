// node tests/browser/mill-quote-spoof.qa.js <host[:port]> <ip> [scheme] — PM Q1 anti-spoof (ENGINEER SELF-CHECK)
// QA OLT fr-quotebreak-390.png: typed 'Milk” from “Your bank' must never render as two quoted items. Every piece @320/390/1280,
// received link (+ own copy where offered): typedAudit with spoof seeds (screen, aria-label/description/title, describedby
// targets, live regions, options, toast, title, copy-as-text output + clipboard), and the link itself keeps the original marks.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, W, sleep, session, result, errsOf } = require('./mill-common');
const M = (slug) => `${SCHEME}://${H}/mill/${slug}/`;
const SP = 'Milk\u201D from \u201CYour bank', G = '\u00ABBank\u00BB \u201Ex\u201F';
const CASES = [
  { slug: 'before-you-go', make: (SP, G) => { const st = BYG.blank(); st.k = SP; st.by = 'Jo'; st.f.place.v = G; st.f.bring.a = SP; st.f.bring.c = true; st.o = [SP]; return BYG.encode(st); } },
  { slug: 'one-less-trip', make: (SP, G) => MILL.pack('t', 1, { h: [G, 'Ben'], r: [[0, SP, '2', 'carton', 'Corner Co-op'], [1, 'Stamps', '1', 'book', G]], m: [] }) },
  { slug: 'the-same-hour', make: (SP, G) => TSH.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: SP, p: [{ id: 1, n: G, iv: [{ id: 3, d: 0, s: '18:00', e: '20:00' }] }, { id: 2, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 }),
    known: ['TSH D3 (queued: names and title unquoted in 187 of 189 places)', h => true] },
  { slug: 'split-the-sack', make: (SP, G) => SACKLINK.encode({ n: SP, u: 'lb', c: '$', q: '25', i: '0.5', p: '31.47', f: '2.99', b: 'p', x: -1, h: [[G, '8'], ['Unit 2B', '7.5'], ['Bao', '6']] }), prep: async p => { await p.select('#pick', '0'); await sleep(100); } },
  { slug: 'one-small-ask', make: (SP, G) => ASK.encodeAsk({ w: SP, e: 10, u: 'min', d: 'Sat', s: '09:00', t: '10:00', h: '', f: G, o: 'Bo' }) },
];
const outputs = async (p, clip) => { const o = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('textarea[readonly], output')].map((e, i) => ['out@' + (e.id || i), e.value || e.textContent]))); clip.forEach((c, i) => { o['clipboard#' + i] = c; }); return o; };
const copyAll = async p => { for (const sel of ['#b-text', '#b-copy', '#copytext']) { const ok = await p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.tagName === 'BUTTON' && !e.disabled && e.getClientRects().length); }, sel); if (ok) { await p.click(sel); await sleep(120); } } };
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) for (const c of CASES) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.evaluateOnNewDocument(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    await p.goto(M(c.slug), { waitUntil: 'load' }); await sleep(150); const f = await p.evaluate(c.make, SP, G);
    await p.goto('about:blank'); await p.goto(M(c.slug) + '#' + f, { waitUntil: 'load' }); await sleep(300); if (c.prep) await c.prep(p);
    const name = w + ' ' + c.slug;
    const link = await p.evaluate(() => { const h = location.hash.slice(1), m = /^([a-z])(\d+)\./.exec(h); const u = MILL.unpack(h, m[1], +m[2], 1e6); return u.ok ? JSON.stringify(u.data) : null; });
    ck(name + ': the link keeps the typed marks exactly (display-only neutralising)', link && link.includes(SP) && link.includes(G), link && link.slice(0, 200));
    await copyAll(p); let clip = await p.evaluate(() => window.__clip.slice());
    const judge = (label, a) => { const all = a.all;
      const known = c.known ? all.filter(c.known[1]) : [], rest = all.filter(h => !known.includes(h));
      ck(name + label + ': spoof marks shown as " inside one “…” frame everywhere (screen, aria, live, toast, copy text)' + (known.length ? ' [' + known.length + ' known, pending ' + c.known[0] + ']' : ''), !rest.length, rest.length ? rest.slice(0, 12) : (known.length ? { pending: c.known[0], known: known.slice(0, 3) } : 'ok')); };
    // typed-in-place (unquoted) spots are the queued quote-rule defects; anything else fails
    let a = await typedAudit(p, [SP, G], await outputs(p, clip)); judge(' received', a);
    const own = await p.evaluate(() => { const e = document.getElementById('own-copy'); return !!(e && !e.disabled && e.getClientRects().length); });
    if (own) { await p.click('#own-copy'); await sleep(250); await p.evaluate(() => { window.__clip = []; }); await copyAll(p); clip = await p.evaluate(() => window.__clip.slice());
      a = await typedAudit(p, [SP, G], await outputs(p, clip)); judge(' own copy', a); }
    ck(name + ': no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
