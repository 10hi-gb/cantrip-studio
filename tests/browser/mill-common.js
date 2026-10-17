// Mill browser self-check helpers, built on qa-lib.js (same open/storage/netCheck patterns).
const { open, storage: qaStorage, netCheck } = require('./qa-lib');
// qa-lib storage() needs a secure context (caches/serviceWorker). Use it on https; on local http use the same fields, guarded.
async function storage(p) {
  if (await p.evaluate(() => window.isSecureContext)) return qaStorage(p);
  return p.evaluate(async () => ({ cookie: document.cookie, ls: Object.keys(localStorage), ss: Object.keys(sessionStorage),
    idb: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : 'n/a', caches: [], sw: 0, insecureLocal: true,
    undef: /undefined|\{\w+\}/.test(document.body.innerText) }));
}
const W = [320, 390, 1280];
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function session(host, ip, opts = {}) {
  const s = await open(host, ip); s.p.setDefaultTimeout(15000);
  s.p.on('dialog', d => (opts.dialog === 'dismiss' ? d.dismiss() : d.accept()).catch(() => {}));
  // share-cancel path: emulate a share sheet the visitor closes (AbortError). Real devices show the sheet; headless has none.
  if (opts.shareCancel) await s.p.evaluateOnNewDocument(() => { navigator.share = (a) => { window.__shareArg = a; return Promise.reject(new DOMException('cancel', 'AbortError')); }; });
  return s;
}
async function overflow(p) { return p.evaluate(() => { const w = document.documentElement.clientWidth, bad = []; document.querySelectorAll('body *').forEach(e => { if (e.closest('.sk-scroll,[data-scroll]')) return; const r = e.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && e.offsetParent !== null) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.right)); }); return { sw: document.documentElement.scrollWidth, w, bad: bad.slice(0, 8) }; }); }
async function typeInto(p, sel, text) { await p.focus(sel); await p.$eval(sel, e => { e.select && e.select(); }); await p.keyboard.press('Backspace'); if (text) await p.keyboard.type(String(text)); }
async function tabReach(p, ids, max = 120) { // keyboard: Tab through the page and record which ids get focus
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const seen = new Set(); for (let i = 0; i < max; i++) { await p.keyboard.press('Tab'); const id = await p.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.getAttribute('data-k') || '')); if (id) seen.add(id); }
  return ids.filter(x => !seen.has(x));
}
// QA N1 (all pieces): fill -> make a link -> open it in the SAME tab -> open a bad link in the same tab -> no visible error
// (every error element really hidden or empty, nothing aria-invalid). fill(p) fills the sender form; link(p) returns the made URL.
async function sameTabBadLink(p, { fill, link, bad, errSel }) {
  await fill(p); const url = await link(p); const frag = (url || '').split('#')[1];
  await p.evaluate(() => history.replaceState(null, '', location.pathname)); await p.evaluate(f => { location.hash = f; }, frag); await sleep(250);
  const opened = await p.evaluate(() => location.hash.length > 5);
  await p.evaluate(b => { location.hash = b; }, bad); await sleep(250);
  const vis = await p.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.textContent.trim() && e.getClientRects().length).map(e => (e.id || e.className) + ':' + e.textContent.trim().slice(0, 40)), errSel);
  const rh = await reallyHidden(p, [errSel]); const inv = await p.evaluate(() => [...document.querySelectorAll('[aria-invalid=true]')].map(e => e.id));
  return { ok: !!frag && opened && !vis.length && !inv.length && (rh.ok || !vis.length), frag: !!frag, opened, vis, inv };
}
function result(rows) { const bad = rows.filter(r => !r.ok); console.log(JSON.stringify(rows, null, 1)); console.log(bad.length ? 'FAIL ' + bad.map(r => r.name).join(', ') : 'PASS ' + rows.length + ' checks'); return bad.length ? 1 : 0; }
// Local http only: Chrome logs that COOP is ignored on an untrustworthy origin. Not a page error; never filtered on https.
function errsOf(s, scheme) { return s.errs.filter(e => !(scheme === 'http' && /Cross-Origin-Opener-Policy header has been ignored/.test(e))); }
// Text-level overlap: measures the painted text (Range rects) of every element matching sel and reports pairs whose text boxes intersect.
async function textOverlap(p, sel) { return p.evaluate(sel => { const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null && e.textContent.trim()); const boxes = els.map(e => { const r = document.createRange(); r.selectNodeContents(e); return { id: e.id || e.className, rs: [...r.getClientRects()] }; });
  const bad = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) for (const a of boxes[i].rs) for (const b of boxes[j].rs) if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) bad.push(boxes[i].id + '×' + boxes[j].id);
  return [...new Set(bad)]; }, sel); }
// Actual rendered hiddenness (not just the attribute): computed display none OR zero box, AND absent from the accessibility tree.
async function reallyHidden(p, selectors) {
  const out = {};
  for (const sel of selectors) {
    const hs = await p.$$(sel); if (!hs.length) { out[sel] = { ok: true, absent: true }; continue; }
    const res = [];
    for (const h of hs) {
      const v = await h.evaluate(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { display: cs.display, w: r.width, h: r.height, rects: e.getClientRects().length }; });
      const snap = await p.accessibility.snapshot({ root: h, interestingOnly: false }).catch(() => null);
      const inTree = !!(snap && (snap.name || (snap.children && snap.children.length) || (snap.role && snap.role !== 'none' && snap.role !== 'generic')));
      res.push({ ...v, inTree, ok: (v.display === 'none' || v.rects === 0 || (v.w === 0 && v.h === 0)) && !inTree });
    }
    out[sel] = { ok: res.every(x => x.ok), res };
  }
  return { ok: Object.values(out).every(x => x.ok), out };
}
module.exports = { sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result };
