// Mill browser self-check helpers, built on qa-lib.js (same open/storage/netCheck patterns).
const { open, storage: qaStorage, netCheck } = require('./qa-lib');
// qa-lib storage() needs a secure context (caches/serviceWorker). Use it on https; on local http use the same fields, guarded.
async function storage(p) {
  if (await p.evaluate(() => window.isSecureContext)) return qaStorage(p);
  return p.evaluate(async () => ({ cookie: document.cookie, ls: Object.keys(localStorage), ss: Object.keys(sessionStorage),
    idb: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : 'n/a', caches: [], sw: 0, insecureLocal: true,
    undef: /undefined|\{\w+\}/.test(document.body.innerText) }));
}
const W = process.env.MILL_W ? process.env.MILL_W.split(',').map(Number) : [320, 390, 1280];
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

// Typed-text audit (QA D5/N3, Joshua 23:52): every occurrence of a sender-typed seed in VISIBLE text, aria-label,
// aria-description, title, aria-describedby targets, live regions (role=status/alert/log, aria-live), <option> labels,
// the toast and any extra strings (copied text) must sit inside curly quotes
// “seed”. Returns {ok, hits:[{where, ctx}]}. Form control values are not scanned (an editor shows raw text by design).
// Seeds should be distinct per field so a seed never appears inside another quoted value.
function unquotedIn(str, seed) {
  const out = []; let i = str.indexOf(seed);
  while (i >= 0) { const before = str[i - 1], after = str[i + seed.length]; if (!(before === '\u201C' && after === '\u201D')) out.push(str.slice(Math.max(0, i - 30), i + seed.length + 30)); i = str.indexOf(seed, i + 1); }
  return out;
}
const QMARKS = /[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g;
async function typedAudit(p, seeds, extra = {}) {
  const got = await p.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
    const attrs = []; document.querySelectorAll('[aria-label],[aria-description],[title]').forEach(e => { ['aria-label', 'aria-description', 'title'].forEach(a => { const v = e.getAttribute(a); if (v) attrs.push([a + '@' + (e.id || e.tagName), v]); }); });
    const opts = [...document.querySelectorAll('option')].map(o => ['option@' + (o.parentElement.id || ''), o.textContent]);
    const t = document.getElementById('toast');
    // screen-reader-only text (PM 23:52): aria-describedby targets and every live region, visible or not
    const desc = []; document.querySelectorAll('[aria-describedby]').forEach(e => e.getAttribute('aria-describedby').split(/\s+/).forEach(id => { const d = id && document.getElementById(id); if (d && d.textContent) desc.push(['describedby@' + (e.id || e.tagName) + '>' + id, d.textContent]); }));
    document.querySelectorAll('[aria-live],[role=status],[role=alert],[role=log]').forEach(e => { if (e.textContent) desc.push(['live@' + (e.id || e.tagName), e.textContent]); });
    attrs.push(...desc);
    return { visible: document.body.innerText, attrs, opts, toast: t && vis(t) ? t.textContent : '', title: document.title };
  });
  const hits = [];
  const all = [['visible', got.visible], ['toast', got.toast], ['document.title', got.title], ...got.attrs, ...got.opts, ...Object.entries(extra).map(([w, v]) => [w, String(v || '')])];
  // PM Q1 (anti-spoof): a seed carrying “ ” „ ‟ « » must never be shown with those marks (they would close the frame);
  // it must appear as its display form (marks -> ") inside “…”.
  seeds = seeds.flatMap(seed => { const shown = String(seed).replace(QMARKS, '"'); if (shown === seed) return [seed];
    all.forEach(([w, v]) => { if (v.includes(seed)) hits.push({ where: w, seed, ctx: 'raw quote marks shown (spoofable): ' + v.slice(Math.max(0, v.indexOf(seed) - 30), v.indexOf(seed) + seed.length + 30) }); });
    if (!all.some(([, v]) => v.includes('\u201C' + shown + '\u201D'))) hits.push({ where: 'anywhere', seed, ctx: 'display form not found: \u201C' + shown + '\u201D' });
    return [shown]; });
  for (const seed of seeds) {
    unquotedIn(got.visible, seed).forEach(ctx => hits.push({ where: 'visible', seed, ctx }));
    unquotedIn(got.toast, seed).forEach(ctx => hits.push({ where: 'toast', seed, ctx }));
    unquotedIn(got.title, seed).forEach(ctx => hits.push({ where: 'document.title', seed, ctx }));
    got.attrs.concat(got.opts).forEach(([w, v]) => unquotedIn(v, seed).forEach(ctx => hits.push({ where: w, seed, ctx })));
    Object.entries(extra).forEach(([w, v]) => unquotedIn(String(v || ''), seed).forEach(ctx => hits.push({ where: w, seed, ctx })));
  }
  return { ok: !hits.length, hits: hits.slice(0, 20), n: hits.length, all: hits };
}

// Recipient accessibility (QA BYG N1 / TSH KS-1, Joshua 23:57): read-only must never mean inert or aria-hidden.
// facts: strings that must be exposed by the accessibility tree; tabTo: selectors Tab must reach; click: selector that a
// REAL pointer click (mouse move + down + up on its box) must activate (click event reaches it, default not prevented).
async function mouseAt(p, sel) {
  const h = await p.$(sel); if (!h) return null; await h.evaluate(e => e.scrollIntoView({ block: 'center' })); const b = await h.boundingBox(); if (!b) return null;
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(30); await p.mouse.up(); await sleep(120); return b;
}
async function recipientAccess(p, { facts = [], tabTo = [], click = null, maxTabs = 80 } = {}) {
  const out = {};
  out.inert = await p.evaluate(() => [...document.querySelectorAll('[inert]')].filter(e => !e.hidden && getComputedStyle(e).display !== 'none').map(e => e.id || e.tagName));
  out.ariaHidden = await p.evaluate(f => [...document.querySelectorAll('[aria-hidden=true]')].filter(e => f.some(x => e.textContent.includes(x))).map(e => e.id || e.className), facts);
  const snap = await p.accessibility.snapshot({ interestingOnly: false }); const names = [];
  (function walk(n) { if (!n) return; if (n.name) names.push(String(n.name)); if (n.value) names.push(String(n.value)); (n.children || []).forEach(walk); })(snap);
  const all = names.join('\n'); out.missingAx = facts.filter(f => !all.includes(f));
  await p.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  const seen = new Set(); for (let i = 0; i < maxTabs; i++) { await p.keyboard.press('Tab'); const id = await p.evaluate(() => { const a = document.activeElement; return a ? (a.id ? '#' + a.id : '') + '|' + (a.getAttribute('href') || '') + '|' + a.tagName : ''; }); seen.add(id); }
  out.unreached = []; for (const sel of tabTo) { const ok = await p.evaluate((sel, seen) => { const els = [...document.querySelectorAll(sel)]; return els.length > 0 && els.every(e => seen.some(s => (e.id && s.startsWith('#' + e.id + '|')) || (!e.id && e.getAttribute('href') && s.split('|')[1] === e.getAttribute('href')))); }, sel, [...seen]); if (!ok) out.unreached.push(sel); }
  if (click) {
    // record that the real click reached the control (with its href); then cancel tel:/sms: navigation so the test page stays put
    await p.evaluate(sel => { window.__clk = null; document.addEventListener('click', ev => { const t = ev.target.closest(sel); if (!t) return; window.__clk = { href: t.getAttribute('href') || '', id: t.id, tag: t.tagName }; if (/^(tel|sms):/.test(t.getAttribute('href') || '')) ev.preventDefault(); }, true); }, click);
    out.box = await mouseAt(p, click); out.clicked = await p.evaluate(() => window.__clk);
  }
  out.ok = !out.inert.length && !out.ariaHidden.length && !out.missingAx.length && !out.unreached.length && (!click || !!(out.clicked && (out.clicked.href || out.clicked.id)));
  return out;
}
module.exports = { recipientAccess, mouseAt, typedAudit, unquotedIn, sameTabBadLink, reallyHidden, textOverlap, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result };
