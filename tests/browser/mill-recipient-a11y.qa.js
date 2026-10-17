// node tests/browser/mill-recipient-a11y.qa.js <host[:port]> <ip> [scheme] — every recipient view stays readable + usable (ENGINEER SELF-CHECK)
// Shared MILLVIEW.readOnly: no inert, no aria-hidden, no aria-disabled region. Per piece @320/390/1280: facts in the accessibility
// snapshot, Tab reaches the real actions (BYG Call/Text, TSH DST error link), a REAL pointer click (mouse move/down/up on the box)
// reaches Call/Text with its tel:/sms: href (navigation intercepted), read-only form controls disabled, data-ro-keep enabled.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { recipientAccess, mouseAt, W, sleep, session, result, errsOf } = require('./mill-common');
// QA KS-1r (all pieces): every in-page error/anchor link in a recipient view must LAND: real click and Enter both move focus off
// <body> to the target (or its focusable read-only wrapper) and leave it inside the viewport.
const anchors = p => p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].filter(a => a.getAttribute('href').length > 1 && a.getClientRects().length && !a.closest('[hidden]')).map((a, i) => { a.dataset.anc = String(i); return { i, href: a.getAttribute('href'), text: a.textContent.slice(0, 60) }; }));
const landed = p => p.evaluate(() => { const a = document.activeElement; if (!a || a === document.body || a.tagName === 'A' && a.dataset.anc) return { ok: false, id: a && (a.id || a.tagName) }; const r = a.getBoundingClientRect();
  return { ok: r.bottom > 0 && r.top < innerHeight && r.height > 0, id: a.id || a.className, name: a.getAttribute('aria-label') || (a.getAttribute('aria-labelledby') && document.getElementById(a.getAttribute('aria-labelledby')) ? document.getElementById(a.getAttribute('aria-labelledby')).textContent : ''), hash: location.hash.slice(0, 12), tabindex: a.getAttribute('tabindex'), top: Math.round(r.top) }; });
const M = (slug) => `${SCHEME}://${H}/mill/${slug}/`;
const ctrls = p => p.evaluate(() => ({ roEnabled: [...document.querySelectorAll('[data-ro-was]')].filter(e => !e.disabled).map(e => e.id || e.tagName), keepDisabled: [...document.querySelectorAll('[data-ro-keep]')].filter(e => e.disabled).map(e => e.id || e.tagName), roCount: document.querySelectorAll('[data-ro-was]').length }));
const CASES = [
  { slug: 'before-you-go', make: () => { const st = BYG.blank(); st.k = 'Used bike'; st.by = 'Jo'; st.f.place.v = 'Corner of 5th and Main'; st.f.contact.v = '555-0134'; st.f.bring.a = 'Cash, exact'; st.f.bring.c = true; return BYG.encode(st); },
    facts: ['Corner of 5th and Main', 'Cash, exact', 'Call 555-0134', 'Text 555-0134'], tabTo: ['#call', '#sms', '#own-copy'], clicks: [['#call', 'tel:5550134'], ['#sms', 'sms:5550134']], ro: true },
  { slug: 'one-less-trip', make: () => MILL.pack('t', 1, { h: ['Ana', 'Ben'], r: [[0, 'Oat milk', '2', 'carton', 'Corner Co-op'], [1, 'Stamps', '1', 'book', 'Post office']], m: [] }),
    facts: ['Corner Co-op', 'Oat milk', 'Stamps', 'Post office'], tabTo: ['#own-copy', '#b-copy'], clicks: [['#b-copy', null]], ro: true },
  { slug: 'the-same-hour', make: () => TSH.encode({ w: '2026-10-19', z: 'America/New_York', n: '60', u: 'min', t: '', p: [{ id: 1, n: 'Rae', iv: [{ id: 3, d: 0, s: '18:00', e: '20:00' }] }, { id: 2, n: 'Sol', iv: [{ id: 4, d: 0, s: '19:00', e: '21:00' }] }], next: 5 }),
    facts: ['Rae', 'Sol', '19:00'], tabTo: ['#pick-0', '#b-copy'], clicks: [['#pick-0', null]], ro: true },
  { slug: 'the-same-hour', tag: ' DST error link', make: () => TSH.encode({ w: '2026-10-26', z: 'America/New_York', n: '60', u: 'min', t: '', p: [{ id: 1, n: 'Ana', iv: [{ id: 3, d: 6, s: '01:30', e: '03:00' }] }, { id: 2, n: 'Ben', iv: [{ id: 4, d: 6, s: '00:00', e: '04:00' }] }], next: 5 }),
    facts: ['Ana', 'Ben', '01:30 happens twice'], tabTo: ['#fix-l a'], clicks: [], ro: true, anchorsMin: 1 },
  { slug: 'split-the-sack', make: () => SACKLINK.encode({ n: 'Rice', u: 'lb', c: '$', q: '25', i: '0.5', p: '31.47', f: '2.99', b: 'p', x: -1, h: [['Ana', '8'], ['Unit 2B', '7.5'], ['Bao & Linh', '6']] }),
    facts: ['Rice', 'Ana', 'Unit 2B', 'Bao & Linh'], tabTo: ['#pick', '#change'], clicks: [['#change', null]], ro: true, prep: async p => { await p.select('#pick', '0'); await sleep(100); } },
  { slug: 'one-small-ask', make: () => ASK.encodeAsk({ w: 'Water plants', e: 10, u: 'min', d: 'Sat', s: '09:00', t: '10:00', h: '', f: 'Ana', o: 'Bo' }),
    facts: ['Water plants', 'Ana'], tabTo: ['#c-y'], clicks: [['#c-y', null]], ro: false },
];
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) for (const c of CASES) {
    const s = await session(H, IP); const { p } = s; await p.setViewport({ width: w, height: 900 });
    await p.goto(M(c.slug), { waitUntil: 'load' }); await sleep(150); const f = await p.evaluate(c.make);
    await p.goto('about:blank'); await p.goto(M(c.slug) + '#' + f, { waitUntil: 'load' }); await sleep(300);
    if (c.prep) await c.prep(p);
    const name = w + ' ' + c.slug + (c.tag || '');
    const a = await recipientAccess(p, { facts: c.facts, tabTo: c.tabTo });
    ck(name + ': no inert / aria-hidden on facts; facts in the accessibility snapshot; Tab reaches ' + c.tabTo.join(' '), a.ok, a);
    for (const [sel, href] of c.clicks) { const r = await recipientAccess(p, { click: sel }); ck(name + ': real pointer click on ' + sel + (href ? ' resolves to ' + href : ' reaches the control'), r.clicked && (href ? r.clicked.href === href : !!(r.clicked.id || r.clicked.href)), r.clicked); }
    const as = await anchors(p);
    const h0 = await p.evaluate(() => location.hash.slice(0, 12));
    for (const an of as) for (const how of ['click', 'Enter']) {
      await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
      if (how === 'click') await mouseAt(p, '[data-anc="' + an.i + '"]'); else { await p.focus('[data-anc="' + an.i + '"]'); await p.evaluate(() => window.scrollTo(0, 0)); await p.focus('[data-anc="' + an.i + '"]'); await p.keyboard.press('Enter'); await sleep(150); }
      const l = await landed(p); ck(name + ': in-page link ' + an.href + ' (' + how + ') lands focus on a named target in the viewport', l.ok && (!l.tabindex || l.name) && l.hash === h0, Object.assign({ an }, l)); }
    if (c.anchorsMin) ck(name + ': has its in-page error links', as.length >= c.anchorsMin, as);
    const k = await ctrls(p); ck(name + ': read-only form controls disabled' + (c.ro ? ' (readOnly applied)' : '') + '; data-ro-keep controls enabled', !k.roEnabled.length && !k.keepDisabled.length && (!c.ro || k.roCount > 0), k);
    ck(name + ': no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();
  }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
