// node tests/browser/mill-left-or-right.qa.js <host[:port]> <ip> [scheme] — Left or Right (P018 original) @320/390/1280
// ENGINEER SELF-CHECK, localhost-preview. Synthetic input only: this is NOT a real switch / dwell / head-pointer check.
// Flows (tap by key + pointer with the release-inside guard, one-switch auto-scan never picks, two-switch step-scan, hold
// with early-release cancel, 2-question queue, ask again, answers list + copy), send-the-answer-back copy + failure,
// make a link + share cancel, recipient read-only (recipientAccess), typedAudit incl. the PM Q1 spoof case on every
// screen + copied text, malformed links, reset, no storage / no network, the 2,000-char URL cap, keyboard reach, 320 fit
// (30-char answers, long single word), required line + limit banner on every screen, banned-claim grep, print, reduced motion.
// QA local-372ce92: L1 line-piece sweep 320/360/390/700/1280/1440 + L2 whole-URL cap 1,999/2,000/2,001 + (a) sizes in a
// Chrome with classic scrollbars (QA's setup) run once, after the per-width loop; L3 preview emoji runs, L4 guard bar,
// (b) rendered quote contrast (screenshot pixels) and the Andika quote glyphs per width.
const H = process.argv[2], IP = process.argv[3], SCHEME = process.argv[4] || 'https';
const { typedAudit, recipientAccess, sameTabBadLink, mouseAt, errsOf, W, sleep, session, overflow, typeInto, tabReach, storage, netCheck, result } = require('./mill-common');
const fs = require('fs');
const C = require('vm').runInNewContext(fs.readFileSync(__dirname + '/../../mill/left-or-right/copy.js', 'utf8') + ';COPY');
const BASE = `${SCHEME}://${H}/mill/left-or-right/`;
const Q = '\u201C', E = '\u201D', q = s => Q + s.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"') + E;
const BANNED = /\bAAC\b|therap|speech|assistive|communication device|augmentative|accessib/i;
// distinct Q1 seeds per field (name, question, left, right)
const SN = 'Maya\u201D from \u201CBank', SQ = 'Milk\u201D from \u201CYour bank', SL = '\u00ABYes\u00BB please', SR = '\u201EStay\u201F home';
async function press(p, sel, key = 'Enter') { await p.focus(sel); await p.keyboard.press(key); await sleep(60); }
async function setVal(p, sel, v) { await p.$eval(sel, (e, v) => { e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v); }
async function fillQ(p, i, qq, l, r, le = '', re = '') { if (i > 0 && !(await p.$('#q-' + i))) await press(p, '#add'); await setVal(p, '#q-' + i, qq); await setVal(p, '#l-' + i, l); await setVal(p, '#r-' + i, r); await setVal(p, '#le-' + i, le); await setVal(p, '#re-' + i, re); }
const scr = p => p.evaluate(() => ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden));
const s3 = p => p.evaluate(() => ({ cls: document.getElementById('s3').className, a: document.getElementById('c-a').textContent, q: document.getElementById('c-q').textContent, tag: document.getElementById('c-tag').textContent, live: document.getElementById('live').textContent, f: document.activeElement.id, next: !document.getElementById('c-next').hidden, done: !document.getElementById('c-done').hidden }));
const clipStub = () => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return window.__clipFail ? Promise.reject(new Error('no')) : Promise.resolve(); } } }); };
async function setMode(p, m, o = {}) { await press(p, '#m-' + m); if (o.scan) await p.select('#scan', o.scan); if (o.key) await p.select('#key', o.key); if (o.every) await p.select('#every', String(o.every)); if (o.dwell) await p.select('#dwell', String(o.dwell)); }
async function fits(p) { return p.evaluate(() => { const w = document.documentElement.clientWidth, bad = [];
  document.querySelectorAll('button,label,select,input,textarea,p,li,h1,h2,legend,.lr-ans,.mill-typed').forEach(e => { if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden' || e.closest('.lr-sr')) return; const r = e.getBoundingClientRect();
    if (r.right > w + 1 || r.left < -1) bad.push('edge:' + (e.id || e.className || e.tagName)); if (!/INPUT|SELECT|TEXTAREA/.test(e.tagName) && !e.closest('.lr-hang') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth) bad.push('clip:' + (e.id || e.className || e.tagName) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
  document.querySelectorAll('.lr-hang').forEach(e => { if (!e.getClientRects().length) return; const box = e.closest('.half,.chosen,.qstrip').getBoundingClientRect(), rs = [];
    e.querySelectorAll('span').forEach(x => { if (!x.closest('.lr-sr')) rs.push(...x.getClientRects()); }); const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (n.parentElement.closest('.lr-sr,.lr-probe')) continue; const r = document.createRange(); r.selectNodeContents(n); rs.push(...r.getClientRects()); }
    rs.forEach(r => { if (r.width && (r.left < box.left - 1 || r.right > box.right + 1)) bad.push('hang-out:' + (e.id || e.className) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' tile ' + Math.round(box.left) + '..' + Math.round(box.right)); }); });
  document.querySelectorAll('.half').forEach(h => { if (h.getClientRects().length && (h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1)) bad.push('half:' + h.id + ' ' + h.scrollWidth + 'x' + h.scrollHeight + '>' + h.clientWidth + 'x' + h.clientHeight); });
  return { bad: bad.slice(0, 10), sw: document.documentElement.scrollWidth, w }; }); }
// accessibility tree: every name/value (for "no soft hyphen anywhere") and the in-order text under one element
async function axAll(p) { const snap = await p.accessibility.snapshot({ interestingOnly: false }); const out = []; (function walk(n) { if (!n) return; if (n.name) out.push(String(n.name)); if (n.value) out.push(String(n.value)); (n.children || []).forEach(walk); })(snap); return out; }
async function axText(p, sel) { const h = await p.$(sel); const snap = await p.accessibility.snapshot({ root: h, interestingOnly: false }); const out = [];
  (function walk(n) { if (!n) return; if (n.role === 'StaticText' || n.role === 'text') { out.push(n.name || ''); return; } (n.children || []).forEach(walk); })(snap); return out.join('').replace(/\s+/g, ' ').trim(); }
async function axName(p, sel) { const h = await p.$(sel); const snap = await p.accessibility.snapshot({ root: h, interestingOnly: false }); return snap ? snap.name : null; }
// long-word state of one half / the chosen answer (Creative r2 + QA local-372ce92 L1): rendered size, the drawn lines
// (generated content, empty alt text, white-space:pre), the line pieces the browser actually rendered (one client rect per
// line, each as wide as its piece measured alone), the kind of every break (s space, h the answer's own hyphen, a added),
// and for every added break whether its segment could have fitted alone (it must not). The clean text is .lr-sr.
const lw = (p, id) => p.evaluate(id => { const a = document.getElementById(id), cs = getComputedStyle(a), vis = a.querySelector('.lr-vis'), dt = vis.querySelector('.lr-vt');
  const qc = vis.querySelector('.lr-qc'), qo = vis.querySelector('.lr-qo'), qcr = qc.getBoundingClientRect(), rs = Array.from(dt.getClientRects()), lastTop = rs[rs.length - 1].top;
  const segs = s => Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s), x => x.segment);
  const text = a.querySelector('.lr-sr').textContent, inner = text.slice(1, -1), drawn = dt.getAttribute('data-v'), broken = a.classList.contains('lr-shy'), lines = drawn.split('\n');
  const fs = parseFloat(cs.fontSize), pw = document.createElement('span'), pr = document.createElement('span'); pw.className = 'lr-probe-w'; pr.className = 'lr-probe'; pr.style.fontSize = fs + 'px'; pw.appendChild(pr); a.appendChild(pw);
  const W = t => { pr.textContent = t; return pr.getBoundingClientRect().width; }, mo = qo.getBoundingClientRect().width, mc = qcr.width, cw = a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  // rebuild the text from the pieces: each break is a space, the answer's own hyphen, or an added hyphen
  let pos = 0, joinedOk = true; const kinds = [], cuts = [];
  lines.forEach((l, i) => { if (inner.startsWith(l, pos)) { pos += l.length; if (i < lines.length - 1) { if (inner[pos] === ' ') { pos++; kinds.push('s'); } else kinds.push('h'); } }
    else if (l.endsWith('-') && inner.startsWith(l.slice(0, -1), pos) && i < lines.length - 1) { pos += l.length - 1; kinds.push('a'); } else joinedOk = false; cuts.push(pos); });
  joinedOk = joinedOk && pos === inner.length;
  const bounds = new Set([0]); let k = 0; segs(inner).forEach(g => { k += g.length; bounds.add(k); }); const gsafe = cuts.every(c => bounds.has(c));
  // segments: runs between spaces and the answer's own hyphens; an added break must sit in one that doesn't fit alone
  const segAt = c => { let s0 = c, e0 = c; while (s0 > 0 && inner[s0 - 1] !== ' ' && !(inner[s0 - 1] === '-' && s0 - 1 > 0)) s0--; while (e0 < inner.length && inner[e0] !== ' ' && inner[e0] !== '-') e0++; if (inner[e0] === '-') e0++; return [s0, e0]; };
  const added = kinds.map((x, i) => x === 'a' ? (() => { const c = cuts[i], [s0, e0] = segAt(c), sg = inner.slice(s0, e0), w = W(sg) + (s0 === 0 ? mo : 0) + (e0 === inner.length ? mc : 0), L = t => (t.match(/\p{L}/gu) || []).length;
    return { seg: sg, w: Math.round(w * 10) / 10, cw: Math.round(cw * 10) / 10, fitsAlone: w <= cw - 1, left: L(inner.slice(s0, c)), right: L(inner.slice(c, e0)), emoji: !/\p{L}/u.test(inner[c - 1] || '') || !/\p{L}/u.test(inner[c] || '') }; })() : null).filter(Boolean);
  const pieceW = lines.map(l => Math.round(W(l) * 10) / 10), rectW = rs.map(r => Math.round(r.width * 10) / 10);
  const piecesMatch = rs.length === lines.length && rectW.every((w, i) => Math.abs(w - pieceW[i]) <= 1.5) && rs.every((r, i) => i === 0 || r.top > rs[i - 1].top + fs * 0.5);
  pw.remove(); const qs = getComputedStyle(qo), vcs = getComputedStyle(vis), al = c => { const m = c.match(/\/\s*([\d.]+)\)|rgba\([^)]*,\s*([\d.]+)\)/); return m ? +(m[1] || m[2]) : 1; };
  return { fs, broken, drawn, lines, kinds, cuts, added, rendered: rs.length, pieceW, rectW, piecesMatch, joinedOk, gsafe, closeWithLetters: qcr.top - lastTop < fs * 0.6,
    text, srHidden: !!a.querySelector('.lr-sr .mill-typed'), afterAlt: getComputedStyle(dt, '::before').content.includes('/') && getComputedStyle(qc, '::before').content.includes('/'),
    ws: getComputedStyle(vis).whiteSpace, hy: cs.hyphens || cs.webkitHyphens,
    qmFs: parseFloat(qs.fontSize) / parseFloat(vcs.fontSize), qmOp: +qs.opacity, qmA: al(qs.color), qmW: qs.fontWeight === vcs.fontWeight,
    hangO: Math.abs(parseFloat(qs.marginInlineStart || qs.marginLeft) + qo.getBoundingClientRect().width) < 1.5, hangC: Math.abs(parseFloat(getComputedStyle(qc).marginInlineEnd || getComputedStyle(qc).marginRight) + qcr.width) < 1.5 }; }, id);
// every added break: its segment can't fit alone, ≥ 4 letters each side (letters), never an added hyphen beside the answer's own
const addOk = x => x.added.every(b => !b.fitsAlone && (b.emoji || (b.left >= 4 && b.right >= 4))) && !x.lines.some(l => /-{2}$/.test(l));
const lwOk = x => x.joinedOk && x.gsafe && x.closeWithLetters && x.srHidden && x.afterAlt && x.piecesMatch && x.ws === 'pre' && x.hy !== 'auto' && addOk(x) && x.fs >= 24;
// every visible quote mark: contrast of the mark (its colour at its opacity over the first opaque background) vs that background
const qContrast = p => p.evaluate(() => { const rgb = c => { const v = c.match(/[\d.]+/g).map(Number); return /^color\(srgb/.test(c) ? [v[0] * 255, v[1] * 255, v[2] * 255, v[3]] : v; }, lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const out = []; document.querySelectorAll('.lr-qm').forEach(q => { if (!q.getClientRects().length || q.closest('.lr-sr') || !q.getBoundingClientRect().width) return; let a = 1, e = q; while (e) { a *= +getComputedStyle(e).opacity; e = e.parentElement; }
    let bgE = q.parentElement; while (bgE && (getComputedStyle(bgE).backgroundColor === 'rgba(0, 0, 0, 0)' || getComputedStyle(bgE).backgroundColor === 'transparent')) bgE = bgE.parentElement;
    const fg = rgb(getComputedStyle(q).color), bg = rgb(getComputedStyle(bgE || document.body).backgroundColor), fa = (fg[3] == null ? 1 : fg[3]) * a, mix = [0, 1, 2].map(i => fg[i] * fa + bg[i] * (1 - fa));
    const L1 = lum(mix), L2 = lum(bg); const qs = getComputedStyle(q), mfs = parseFloat(qs.fontSize), mw = +qs.fontWeight, large = mfs >= 24 || (mfs >= 18.66 && mw >= 700);
    out.push({ at: (q.closest('[id]') || {}).id, ratio: Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100, a: Math.round(a * 100) / 100, alpha: fg[3] == null ? 1 : Math.round(fg[3] * 100) / 100, size: Math.round(mfs * 10) / 10 + 'px/' + mw, large, thr: large ? 3 : 4.5, fg: mix.map(Math.round), bg: bg.slice(0, 3) }); }); return out; });
// QA local-d0ca704 L7: 4.5:1 for normal-size marks, 3:1 for large ones (the mark's own size: 24px+, or 18.66px+ bold)
const qOk = r => r.length && r.every(x => x.ratio >= (x.thr || 3));
const qMin = r => r.reduce((m, x) => (!m || x.ratio < m.ratio ? x : m), null);
// rendered pixels (QA local-372ce92 (b) / L4): decode a puppeteer PNG (8-bit RGB/RGBA, not interlaced) and take, inside a
// box, the background (the most common colour) and the ink (the pixel most unlike it); contrast is from those pixels
function png(b0) { const zlib = require('zlib'), buf = Buffer.from(b0); let o = 8, w = 0, h = 0, ct = 0; const id = [];
  while (o < buf.length) { const n = buf.readUInt32BE(o), ty = buf.toString('ascii', o + 4, o + 8), d = buf.slice(o + 8, o + 8 + n); if (ty === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (ty === 'IDAT') id.push(d); else if (ty === 'IEND') break; o += 12 + n; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(id)), st = w * bpp, px = Buffer.alloc(h * st);
  for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)], ln = raw.slice(y * (st + 1) + 1, (y + 1) * (st + 1)), cur = px.slice(y * st, (y + 1) * st), up = y ? px.slice((y - 1) * st, y * st) : Buffer.alloc(st);
    for (let x = 0; x < st; x++) { const a = x >= bpp ? cur[x - bpp] : 0, b = up[x], c = x >= bpp ? up[x - bpp] : 0, v = ln[x]; let r;
      if (f === 0) r = v; else if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1); else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); } cur[x] = r & 255; } }
  return { w, h, at: (x, y) => [px[y * st + x * bpp], px[y * st + x * bpp + 1], px[y * st + x * bpp + 2]] }; }
const lumC = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratioC = (a, b) => { const x = lumC(a), y = lumC(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
async function inkPx(p, sel, pad = 0) { const r = await p.$eval(sel, (e, pad) => { const b = e.getBoundingClientRect(); return { x: Math.max(0, b.left - pad), y: Math.max(0, b.top - pad), width: b.width + 2 * pad, height: b.height + 2 * pad }; }, pad);
  const im = png(await p.screenshot({ clip: r, captureBeyondViewport: false })), cnt = new Map(); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const k = im.at(x, y).join(','); cnt.set(k, (cnt.get(k) || 0) + 1); }
  const bg = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number); let ink = bg, best = 1;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const c = im.at(x, y), rr = ratioC(c, bg); if (rr > best) { best = rr; ink = c; } } return { bg, ink, ratio: best }; }
// the rendered contrast of every visible styled quote mark in a region: the mark's ink pixels against the pixels around it
async function qPix(p, scope) { const ids = await p.evaluate(sc => { let n = 0; return Array.from(document.querySelectorAll(sc + ' .lr-qm')).filter(q => q.getClientRects().length && q.getBoundingClientRect().width && !q.closest('.lr-sr')).map(q => { q.setAttribute('data-qpx', ++n); return n; }); }, scope);
  const out = []; for (const n of ids) { const r = await inkPx(p, `[data-qpx="${n}"]`, 0); out.push(Object.assign(await p.$eval(`[data-qpx="${n}"]`, e => { const cs = getComputedStyle(e), f = parseFloat(cs.fontSize), large = f >= 24 || (f >= 18.66 && +cs.fontWeight >= 700); return { at: e.closest('[id]').id, size: Math.round(f * 10) / 10 + 'px/' + cs.fontWeight, thr: large ? 3 : 4.5 }; }), r)); } await p.evaluate(() => document.querySelectorAll('[data-qpx]').forEach(e => e.removeAttribute('data-qpx'))); return out; }
// which font draws the styled curly quotes in the display font: the mark's rendered width against the same mark in Andika and in Shantell Sans
const quoteFace = (p, id) => p.evaluate(id => { const q = document.querySelector('#' + id + ' .lr-vis .lr-qo'), cs = getComputedStyle(q), w = q.getBoundingClientRect().width;
  const m = fam => { const e = document.createElement('span'); e.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${fam};font-size:${cs.fontSize};font-weight:${cs.fontWeight}`; e.textContent = '\u201C'; document.body.appendChild(e); const x = e.getBoundingClientRect().width; e.remove(); return x; };
  const fam = cs.fontFamily, fonts = Array.from(document.fonts).filter(f => /LR Quotes/.test(f.family)).map(f => f.family + ' ' + f.weight + ' ' + f.unicodeRange + ' ' + f.status);
  return { w: Math.round(w * 100) / 100, andika: Math.round(m('Andika') * 100) / 100, shantell: Math.round(m('"Shantell Sans"') * 100) / 100, fam, fonts, check: document.fonts.check(`${cs.fontWeight} ${cs.fontSize} "LR Quotes"`, '\u201C') }; }, id);
// preview answers are fit-drawn like the tiles (L5): their drawn lines, or nothing when the preview is hidden (< 1000px)
const pvP = async (p, id) => (await p.evaluate(id => document.getElementById(id).getClientRects().length > 0 && !!document.querySelector('#' + id + ' .lr-vt'), id)) ? (x => ({ pieces: x.lines, w: 1, lw: x }))(await lw(p, id)) : { pieces: [''], w: 0 };
// QA local-d0ca704 L5: an independent greedy reference for one fit-drawn answer, with the planner's arithmetic (widths at
// 100px scaled, marks 0.8em of the box font, avail = content box, hung marks inside the tile padding): words first-fit;
// a word too wide alone goes to its own hyphen pieces (2+ letters each side); a piece still too wide uses the drawn
// inner breaks (cuts) as forced breaks. Returns the reference lines next to the drawn ones.
const greedyRef = (p, id) => p.evaluate(id => { const a = document.getElementById(id), cs = getComputedStyle(a), fs = parseFloat(cs.fontSize), vt = a.querySelector('.lr-vt');
  const inner = a.querySelector('.lr-sr').textContent.slice(1, -1), drawn = vt.getAttribute('data-v').split('\n'), tile = id === 'c-a' ? document.getElementById('s3') : (a.closest('.half') || a.parentElement), tcs = getComputedStyle(tile);
  const pw = document.createElement('span'), pr = document.createElement('span'); pw.className = 'lr-probe-w'; pr.className = 'lr-probe'; pr.style.fontSize = '100px'; pw.appendChild(pr); a.appendChild(pw);
  const W = t => { pr.textContent = t; return pr.offsetWidth; }, qo = W('\u201C') / 100 * 0.8 * 100, qc = W('\u201D') / 100 * 0.8 * 100, r = fs / 100;
  const av = a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), full = a.clientWidth + parseFloat(tcs.paddingLeft) + parseFloat(tcs.paddingRight) - 4;
  const fits = (t, f, l) => { const w = W(t), mk = (f ? qo : 0) + (l ? qc : 0), hg = 2 * Math.max(f ? qo : 0, l ? qc : 0); return (w + mk) * r <= av - 1 && (w + hg) * r <= full - 1; };
  // the drawn inner breaks (added hyphen or between emoji): positions in inner where a drawn line ends inside a word
  let pos = 0; const cut = new Set(); drawn.forEach((l, i) => { if (i === drawn.length - 1) return; if (inner.startsWith(l, pos)) { pos += l.length; if (inner[pos] === ' ') pos++; else if (inner[pos - 1] !== '-' || inner[pos - 1] === '-' && !/\p{L}{2}$/u.test(inner.slice(0, pos - 1))) cut.add(pos); } else if (l.endsWith('-') && inner.startsWith(l.slice(0, -1), pos)) { pos += l.length - 1; cut.add(pos); } });
  const atoms = []; let off = 0;
  inner.split(' ').forEach((w, wi) => { const s0 = off, e0 = off + w.length; off = e0 + 1;
    if (fits(w, s0 === 0, e0 === inner.length)) { atoms.push({ t: w, s: s0, e: e0, j: ' ' }); return; }
    const hp = []; for (let k = 1; k < w.length - 1; k++) if (w[k] === '-' && ((w.slice(0, k).split('-').pop().match(/\p{L}/gu) || []).length >= 2) && ((w.slice(k + 1).split('-')[0].match(/\p{L}/gu) || []).length >= 2)) hp.push(k + 1);
    const bounds = [0, ...hp, w.length]; for (let b = 0; b + 1 < bounds.length; b++) { const ps = s0 + bounds[b], pe = s0 + bounds[b + 1], pc = inner.slice(ps, pe), j = b === 0 ? ' ' : '';
      if (fits(pc, ps === 0, pe === inner.length)) { atoms.push({ t: pc, s: ps, e: pe, j }); continue; }
      let q = ps; for (let k = ps + 1; k < pe; k++) if (cut.has(k)) { const tx = inner.slice(q, k), hy = /\p{L}/u.test(inner[k - 1]) && /\p{L}/u.test(inner[k]); atoms.push({ t: tx + (hy ? '-' : ''), s: q, e: k, j: q === ps ? j : '', force: true }); q = k; } atoms.push({ t: inner.slice(q, pe), s: q, e: pe, j: q === ps ? j : '' }); } });
  const out = []; let cur = null, cs0 = 0, forced = false;
  atoms.forEach(at => { const cand = cur === null ? at.t : cur + at.j + at.t;
    if (cur !== null && !forced && fits(cand, cs0 === 0, at.e === inner.length && !at.force)) cur = cand; else { if (cur !== null) out.push(cur); cur = at.t; cs0 = at.s; } forced = !!at.force; });
  out.push(cur); pw.remove(); return { drawn, ref: out, fs, av: Math.round(av * 10) / 10 }; }, id);
// QA local-d0ca704 L8: rendered ring bands from a screenshot strip through the ring (row or column): the colour runs, and the
// contrast of every ring band (ink or stitch) against each colour that touches it (1px anti-alias runs skipped)
async function ringRuns(p, clip, vertical) { const im = png(await p.screenshot({ clip, captureBeyondViewport: false })), runs = [];
  const n = vertical ? im.h : im.w, mid = vertical ? Math.floor(im.w / 2) : Math.floor(im.h / 2);
  for (let i = 0; i < n; i++) { const c = vertical ? im.at(mid, i) : im.at(i, mid), last = runs[runs.length - 1]; if (last && last.c.every((v, k) => Math.abs(v - c[k]) <= 3)) last.n++; else runs.push({ c, n: 1 }); }
  const solid = runs.filter(x => x.n >= 2), RING = [[29, 26, 22], [255, 247, 230]], isRing = c => RING.some(r => r.every((v, k) => Math.abs(v - c[k]) <= 3)), pairs = [];
  // the neighbour is the next run of a different colour (a run within 1.15:1 of the band, e.g. same-colour text
  // anti-aliased against it, is the band itself)
  solid.forEach((x, i) => { if (!isRing(x.c)) return; [-1, 1].forEach(d => { let j = i + d; while (solid[j] && ratioC(solid[j].c, x.c) < 1.15) j += d; const y = solid[j]; if (y) pairs.push({ ring: x.c.join(','), w: x.n, next: y.c.join(','), ratio: ratioC(x.c, y.c) }); }); });
  return { runs: solid.map(x => x.c.join(',') + '×' + x.n), pairs, min: pairs.length ? Math.min(...pairs.map(x => x.ratio)) : 0 }; }
// line pieces of a plain text element (the setup preview question), from the rendered position of every grapheme
const pieces = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel), out = []; let line = '', top = null; const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let t;
  while ((t = tw.nextNode())) for (const g of new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(t.data)) { const r = document.createRange(); r.setStart(t, g.index); r.setEnd(t, g.index + g.segment.length); const rt = r.getClientRects()[0]; if (!rt) continue; const y = Math.round(rt.top); if (top !== null && y > top + 4) { out.push(line); line = ''; } top = top === null || y > top + 4 ? y : top; line += g.segment; }
  out.push(line); return { pieces: out.map(x => x.trim()), w: e.clientWidth }; }, sel);
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of (process.env.MILL_ONLY_SWEEP ? [] : W)) {
    // ---------- sender: empty page, required copy, validation
    let s = await session(H, IP); let { p } = s; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub);
    await p.goto(BASE, { waitUntil: 'load' }); await sleep(250);
    let t = await p.evaluate(() => ({ title: document.title, h1: document.getElementById('title').textContent, req: document.getElementById('required').textContent, lim: document.getElementById('limit1').textContent, fair: document.getElementById('fair').textContent, priv: document.getElementById('privacy').textContent,
      rows: document.querySelectorAll('#qs .lr-q').length, h1f: getComputedStyle(document.querySelector('h1')).fontFamily, bf: getComputedStyle(document.body).fontFamily, hidden: document.querySelectorAll('[aria-hidden],[inert]').length, inline: [...document.scripts].filter(x => !x.src).length + document.querySelectorAll('[style],[onclick],[onload]').length, body: document.body.innerText }));
    ck(w + ' sender page: Writer title/requiredLine/fairHint/privacy/limitBanner exact; one question row; Shantell Sans + Andika', t.title === C.title + ' · ' + C.studioName && t.h1 === C.title && t.req === C.requiredLine && t.lim === C.limitBanner && t.fair === C.fairHint && t.priv === C.privacy && t.rows === 1 && /Shantell Sans/.test(t.h1f) && /Andika/.test(t.bf), t);
    ck(w + ' no aria-hidden / inert anywhere; no inline script, no style or on* attributes (strict CSP)', !t.hidden && !t.inline, t);
    ck(w + ' banned claims: page text has no AAC/therapy/speech/assistive/accessibility claim; "communication aid" only in the required negation', !BANNED.test(t.body) && (t.body.match(/communication aid/gi) || []).length === 1 && t.body.includes(C.requiredLine), null);
    const fontReqs = s.reqs.filter(r => /\.woff2/.test(r)); ck(w + ' fonts self-hosted (same origin, woff2)', fontReqs.length >= 1 && fontReqs.every(r => r.includes('//' + H + '/mill/left-or-right/fonts/')), fontReqs);
    await press(p, '#go'); t = await p.evaluate(() => ({ f: document.activeElement.id, eq: document.getElementById('e-q-0').textContent, el: document.getElementById('e-l-0').textContent, er: document.getElementById('e-r-0').textContent, inv: document.getElementById('q-0').getAttribute('aria-invalid'), d: document.getElementById('q-0').getAttribute('aria-describedby'), scr: ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden) }));
    ck(w + ' Show it big with nothing typed: questionEmpty + answerEmpty inline, aria-invalid + describedby, focus on the question, no board', t.f === 'q-0' && t.eq === C.questionEmpty && t.el === C.answerEmpty && t.er === C.answerEmpty && t.inv === 'true' && t.d === 'e-q-0' && t.scr === 's1', t);
    await fillQ(p, 0, 'Q'.repeat(85), 'a'.repeat(31), 'Tacos', 'ab', '\u{1F32E}'); await press(p, '#go');
    t = await p.evaluate(() => ({ eq: document.getElementById('e-q-0').textContent, el: document.getElementById('e-l-0').textContent, ee: document.getElementById('e-le-0').textContent, er: document.getElementById('e-r-0').textContent, ere: document.getElementById('e-re-0').textContent, f: document.activeElement.id }));
    ck(w + ' caps: question 85 -> "5 characters over.", answer 31 -> "1 character over.", "ab" as picture -> emojiBad; a real emoji is fine', t.eq === '5 characters over.' && t.el === '1 character over.' && t.ee === C.emojiBad && !t.er && !t.ere && t.f === 'q-0', t);
    await setVal(p, '#q-0', 'What should we eat tonight?'); t = await p.evaluate(() => ({ e: document.getElementById('e-q-0').textContent, inv: document.getElementById('q-0').getAttribute('aria-invalid') }));
    ck(w + ' typing clears that field\'s error', !t.e && !t.inv, t);
    // 2 questions, tap flow by keyboard
    await fillQ(p, 0, 'What should we eat tonight?', 'Pizza', 'Tacos', '\u{1F355}', ''); await fillQ(p, 1, 'Watch a movie now?', 'Watch a movie at home', "Grandmother's");
    t = await p.evaluate(() => ({ n: document.getElementById('qcount').textContent, leg: [...document.querySelectorAll('#qs legend')].map(l => l.textContent), rm: document.querySelectorAll('.lr-rm').length }));
    ck(w + ' queue: 2 questions, legends "1 of 2" / "2 of 2", Remove on each', t.n === '2 questions' && t.leg.join('|') === '1 of 2|2 of 2' && t.rm === 2, t);
    if (w === 1280) { t = await p.evaluate(() => ({ d: getComputedStyle(document.getElementById('preview')).display, q: document.getElementById('pv-q').textContent, l: document.getElementById('pv-l').textContent })); ck(w + ' wide: live preview of the question being edited (quoted)', t.d !== 'none' && t.q === '“Watch a movie now?”' && t.l === '“Watch a movie at home”', t); }
    await press(p, '#go'); await sleep(150);
    t = await p.evaluate(() => ({ from: document.getElementById('b-from').textContent, q: document.getElementById('b-q').textContent, la: document.getElementById('h-l').getAttribute('aria-label'), ra: document.getElementById('h-r').getAttribute('aria-label'), lt: document.getElementById('h-l').innerText.replace(/\s+/g, ' '), f: document.activeElement.id, hint: document.getElementById('hint').textContent, lim: document.getElementById('limit2').textContent, lw: document.getElementById('h-l').getBoundingClientRect().width, rw: document.getElementById('h-r').getBoundingClientRect().width, lh: document.getElementById('h-l').getBoundingClientRect().height, side: document.getElementById('h-l').getBoundingClientRect().right <= document.getElementById('h-r').getBoundingClientRect().left + 1 }));
    ck(w + ' board: "1 of 2", question + answers quoted, names "LEFT: “Pizza” “🍕”" (emoji quoted in the name) / "RIGHT: “Tacos”", emoji quoted, focus on left, tap hint, limit banner', t.from === '1 of 2' && t.q === '“What should we eat tonight?”' && t.la === 'LEFT: “Pizza” “🍕”' && t.ra === 'RIGHT: “Tacos”' && t.lt.includes('“🍕”') && t.lt.includes('“Pizza”') && t.f === 'h-l' && t.hint === C.hint.tap + ' ' + C.hint.keys && t.lim === C.limitBanner, t);
    ck(w + ' board: halves side by side (never stacked), each ≥140 wide and ≥300 tall', t.side && t.lw >= 140 && t.rw >= 140 && t.lh >= 300, t);
    let f = await fits(p); ck(w + ' board fits: nothing past the edge, no clipped answer', !f.bad.length && f.sw <= f.w, f);
    await p.keyboard.press('ArrowRight'); await sleep(40); const fr = await p.evaluate(() => document.activeElement.id); await p.keyboard.press('Enter'); await sleep(200);
    t = await s3(p); ck(w + ' → then Enter picks right: chosen screen right felt, “Tacos”, "chosen · right", live "Chosen: “Tacos”, right", focus Next', fr === 'h-r' && t.cls.includes(' r') && t.a === '“Tacos”' && t.q === '“What should we eat tonight?”' && t.tag === 'chosen · right' && t.live === 'Chosen: “Tacos”, right' && t.f === 'c-next' && t.next && !t.done, t);
    await sleep(600); await press(p, '#c-again'); await sleep(150); t = { scr: await scr(p) };
    // pointer: press left, release on right -> nothing; press + release on left -> left
    await p.evaluate(() => document.getElementById('h-l').scrollIntoView()); const bl = await (await p.$('#h-l')).boundingBox(), br = await (await p.$('#h-r')).boundingBox();
    await p.mouse.move(bl.x + bl.width / 2, bl.y + bl.height / 2); await p.mouse.down(); await p.mouse.move(br.x + br.width / 2, br.y + br.height / 2, { steps: 4 }); await p.mouse.up(); await sleep(150); t.after = await scr(p);
    await p.mouse.move(bl.x + bl.width / 2, bl.y + bl.height / 2); await p.mouse.down(); await sleep(40); await p.mouse.up(); await sleep(200); const t2 = await s3(p);
    ck(w + ' Ask again re-opens the board; pointer: press left + release on right picks nothing; press + release on left picks left', t.scr === 's2' && t.after === 's2' && t2.a === '“Pizza”' && t2.cls.includes(' l'), { t, t2 });
    // the press that picked can't press a button on the chosen screen: Space held over the pick
    await sleep(600); await press(p, '#c-next'); await sleep(150); await p.keyboard.down(' '); await sleep(30); await p.keyboard.up(' '); await sleep(250);
    t = await s3(p); ck(w + ' Next -> question 2; Space picks the focused left; its keyup doesn\'t press "Send the answer back"; last question shows done', t.a === '“Watch a movie at home”' && t.done && !t.next && t.f === 'c-send' && (await p.evaluate(() => window.__clip.length)) === 0 && (await p.$eval('#c-done', e => e.textContent)) === C.done, t);
    f = await fits(p); ck(w + ' chosen screen fits (30-char answer)', !f.bad.length && f.sw <= f.w, f);
    await sleep(500); await press(p, '#c-send'); await sleep(100);
    t = await p.evaluate(() => ({ clip: window.__clip.slice(), toast: document.getElementById('toast').textContent }));
    ck(w + ' Send the answer back (no share sheet): Writer answerText copied, quoted', t.clip[0] === '“Watch a movie at home” (left), for: “Watch a movie now?”' && t.toast === C.copied, t);
    await p.evaluate(() => { window.__clipFail = true; }); await press(p, '#c-send'); await sleep(120);
    t = await p.evaluate(() => ({ vis: !document.getElementById('c-fb').hidden, f: document.activeElement.id, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart, v: document.getElementById('c-fbt').value, ro: document.getElementById('c-fbt').readOnly, toast: document.getElementById('toast').textContent, lab: document.getElementById('l-c-fbt').textContent }));
    ck(w + ' copy failure: copyFail toast + read-only selected text box (copyTextLabel)', t.vis && t.f === 'c-fbt' && t.sel === t.v.length && t.ro && t.toast === C.copyFail && t.lab === C.copyTextLabel && t.v.startsWith('“Watch'), t);
    await p.evaluate(() => { window.__clipFail = false; }); await press(p, '#c-back'); await sleep(150);
    t = await p.evaluate(() => ({ scr: ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden), f: document.activeElement.id, lines: [...document.querySelectorAll('#ans-list li')].map(l => l.textContent), note: document.getElementById('ans-note').textContent }));
    ck(w + ' back to the questions: "Answers so far" (this visit only), one line per question, quoted, focus on the heading', t.scr === 's1' && t.f === 'ans-h' && t.note === C.answersNote && t.lines.join('|') === '1. “What should we eat tonight?”: “Pizza” (left)|2. “Watch a movie now?”: “Watch a movie at home” (left)', t);
    await press(p, '#copy-ans'); t = await p.evaluate(() => window.__clip.slice(-1)[0]);
    ck(w + ' Copy the answers: heading + lines, quoted', t === 'Answers so far\n1. “What should we eat tonight?”: “Pizza” (left)\n2. “Watch a movie now?”: “Watch a movie at home” (left)', t);
    await setVal(p, '#q-1', 'Watch a film now?'); t = await p.evaluate(() => [...document.querySelectorAll('#ans-list li')].length);
    ck(w + ' editing a question drops only that question\'s answer', t === 1, t);
    // print
    await p.emulateMediaType('print'); t = await p.evaluate(() => ({ ed: getComputedStyle(document.getElementById('edit')).display, ans: getComputedStyle(document.getElementById('answers')).display, lim: getComputedStyle(document.getElementById('limit1')).display, b: document.getElementById('copy-ans').getClientRects().length })); await p.emulateMediaType('screen');
    ck(w + ' print: editor + buttons hidden; answers + limit banner printed', t.ed === 'none' && t.ans !== 'none' && t.lim !== 'none' && t.b === 0, t);
    // remove a question
    await press(p, '#rm-0'); t = await p.evaluate(() => ({ n: document.querySelectorAll('#qs .lr-q').length, q: document.getElementById('q-0').value, rm: document.querySelectorAll('.lr-rm').length, f: document.activeElement.id }));
    ck(w + ' Remove question 1: question 2 becomes 1; the last one has no Remove', t.n === 1 && t.q === 'Watch a film now?' && !t.rm && t.f === 'q-0', t);
    for (let i = 1; i < 6; i++) await press(p, '#add'); t = await p.evaluate(() => ({ n: document.querySelectorAll('#qs .lr-q').length, dis: document.getElementById('add').disabled, c: document.getElementById('qcount').textContent }));
    ck(w + ' up to 6 questions: Add disabled at 6, tooManyQuestions shown', t.n === 6 && t.dis && t.c === '6 questions is the most.', t);
    const st0 = await storage(p); ck(w + ' sender flow: no cookies/localStorage/sessionStorage/IndexedDB/caches/SW, no {placeholders}/undefined', !st0.cookie && !st0.ls.length && !st0.ss.length && (!st0.idb.length || st0.idb === 'n/a') && !st0.caches.length && !st0.sw && !st0.undef, st0);
    ck(w + ' sender flow: no request off the page origin, no query strings, GET only', !netCheck(s.reqs, H, []).offending.length, netCheck(s.reqs, H, []).offending);
    ck(w + ' sender: no page errors (no CSP violations)', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- switch + hold input (synthetic; not a real switch / dwell check)
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    await fillQ(p, 0, 'Park or library?', 'Park', 'Library'); await setMode(p, 'switch', { every: 10 });
    t = await p.evaluate(() => ({ sw: !document.getElementById('sw-set').hidden, hold: document.getElementById('hold-set').hidden, pr: document.getElementById('m-switch').getAttribute('aria-pressed'), opts: [...document.getElementById('every').options].map(o => o.textContent).join('|'), keys: [...document.getElementById('key').options].map(o => o.textContent).join('|') }));
    ck(w + ' Switch or keys: settings shown (key, scanning, speed from Writer plurals)', t.sw && t.hold && t.pr === 'true' && t.opts === 'Every 1 second|Every 1.5 seconds|Every 2 seconds|Every 2.5 seconds|Every 3 seconds|Every 3.5 seconds|Every 4 seconds' && t.keys === 'Space|Enter|Any key', t);
    await press(p, '#go'); await sleep(100); const hi = () => p.evaluate(() => ['h-l', 'h-r'].filter(id => document.getElementById(id).classList.contains('scan')).join());
    const h0 = await hi(); await sleep(1100); const h1 = await hi(); await sleep(3200); const sc = await scr(p);
    ck(w + ' one-switch auto-scan: highlight starts left, moves on the timer, and never picks on its own (4 s, still on the board)', h0 === 'h-l' && h1 === 'h-r' && sc === 's2' && (await p.$eval('#hint', e => e.textContent)) === 'Press Space to pick the highlighted side.', { h0, h1, sc });
    await p.keyboard.press('Enter'); await sleep(80); const sc2 = await scr(p); const h2 = await hi(); await p.keyboard.press(' '); await sleep(200); t = await s3(p);
    ck(w + ' auto-scan: Enter isn\'t the switch (nothing); Space picks the highlighted side', sc2 === 's2' && t.a === (h2 === 'h-l' ? '“Park”' : '“Library”'), { sc2, h2, t });
    await sleep(600); await press(p, '#c-back'); await setMode(p, 'switch', { scan: 'step' }); t = await p.evaluate(() => ({ any: document.querySelector('#key option[value=any]').disabled, every: document.getElementById('every-f').hidden }));
    await press(p, '#go'); await sleep(100); const hint = await p.$eval('#hint', e => e.textContent); await sleep(1200); const st1 = await hi(); await p.keyboard.press('Enter'); await sleep(50); const st2 = await hi(); await p.keyboard.press(' '); await sleep(200); const t3 = await s3(p);
    ck(w + ' two-switch step-scan: no timer movement; Enter moves, Space picks; "Any key" not offered for step', t.any && t.every && hint === 'Enter moves. Space picks.' && st1 === 'h-l' && st2 === 'h-r' && t3.a === '“Library”', { t, hint, st1, st2, t3 });
    await sleep(600); await press(p, '#c-back'); await setMode(p, 'switch', { scan: 'auto', key: 'any', every: 40 }); await press(p, '#go'); await sleep(100);
    await p.keyboard.press('Tab'); await sleep(50); const tf = await p.evaluate(() => document.activeElement.id); const sc3 = await scr(p); await p.keyboard.press('Shift'); await sleep(50);
    const anyHint = await p.$eval('#hint', e => e.textContent); ck(w + ' Any key: Writer hint.switchAny on the board', anyHint === C.hint.switchAny, anyHint);
    await p.evaluate(() => document.getElementById('halves').focus()); await p.keyboard.press('KeyX'); await sleep(200); t = await s3(p);
    ck(w + ' any key: Tab/Shift never pick (Tab still moves focus); a letter key picks the highlighted side', sc3 === 's2' && tf === 'h-l' && t.a === '“Park”', { tf, sc3, t });
    await sleep(600); await press(p, '#c-back'); await setMode(p, 'hold', { dwell: 10 }); await press(p, '#go'); await sleep(100);
    t = { hint: await p.$eval('#hint', e => e.textContent) }; await p.evaluate(() => document.getElementById('h-r').scrollIntoView()); const hb = await (await p.$('#h-r')).boundingBox();
    await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2); await p.mouse.down(); await sleep(350); t.ring = await p.evaluate(() => document.getElementById('h-r').classList.contains('holding')); await p.mouse.up(); await sleep(900);
    t.scr = await scr(p); t.cancel = await p.$eval('#hint', e => e.textContent);
    ck(w + ' hold: ring shows while held; letting go at 0.35 s cancels (holdCancelled), no pick even after the hold time', t.hint === 'Hold a side for 1 second to pick it.' && t.ring && t.scr === 's2' && t.cancel === C.holdCancelled, t);
    await p.mouse.down(); await sleep(1250); t = await s3(p); await p.mouse.up(); await sleep(200);
    ck(w + ' hold: holding 1 s picks that side (right)', t.a === '“Library”' && t.cls.includes(' r'), t);
    await sleep(500); await press(p, '#c-again'); await sleep(100); await p.focus('#h-l'); await p.keyboard.down(' '); await sleep(300); await p.keyboard.up(' '); await sleep(1000); const kc = await scr(p);
    await p.keyboard.down(' '); await sleep(1200); t = await s3(p); await p.keyboard.up(' '); await sleep(300); const after = await s3(p);
    ck(w + ' hold by key: Space released early cancels; Space held 1 s picks; its keyup doesn\'t press a button', kc === 's2' && t.a === '“Park”' && after.f === 'c-send' && (await scr(p)) === 's3', { kc, t, after });
    // reduced motion: no swell
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); const an = await p.$eval('#s3', e => getComputedStyle(e).animationName); await p.emulateMediaFeatures([]);
    ck(w + ' reduced motion: the chosen screen appears without the swell', an === 'none', an);
    ck(w + ' inputs: no page errors, no storage', !errsOf(s, SCHEME).length && !(await storage(p)).ls.length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- make a link, share cancel, recipient read-only
    s = await session(H, IP, { shareCancel: true }); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    await setVal(p, '#from', 'Maya'); await fillQ(p, 0, 'What should we eat tonight?', 'Pizza', 'Tacos', '\u{1F355}'); await fillQ(p, 1, 'Park or library?', 'Park', 'Library'); await setMode(p, 'hold', { dwell: 20 });
    await press(p, '#mk'); t = await p.evaluate(() => ({ link: document.getElementById('link').value, f: document.activeElement.id, lab: document.getElementById('l-link').textContent, hash: location.hash }));
    ck(w + ' Make a link: read-only selected link box, "#l1." fragment, ≤ 2,000 chars, address bar untouched', t.f === 'link' && t.link.startsWith(BASE + '#l1.') && t.link.length <= 2000 && t.lab === C.linkLabel && !t.hash, t);
    const link = t.link; await press(p, '#send'); await sleep(150);
    t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, f: document.activeElement.id, arg: window.__shareArg }));
    ck(w + ' Send the questions -> share sheet closed: shareCancel toast, link still selected; share text has no typed text', t.toast === C.shareCancel && t.f === 'link' && t.arg && t.arg.url === link && t.arg.text === C.shareText, t);
    await setVal(p, '#q-1', 'Park or pool?'); ck(w + ' editing after making a link hides the stale link', await p.$eval('#linkbox', e => e.hidden), null);
    await p.goto('about:blank'); await p.goto(link, { waitUntil: 'load' }); await sleep(300);
    t = await p.evaluate(() => ({ intro: document.getElementById('recv-intro').textContent, items: [...document.querySelectorAll('#recv-list li')].map(l => l.innerText.replace(/\s+/g, ' ')), ed: document.getElementById('edit').hidden, dis: [...document.querySelectorAll('#edit input,#edit button,#edit select')].every(e => e.disabled), lim: document.getElementById('limit1').textContent, pv: getComputedStyle(document.getElementById('preview')).display }));
    ck(w + ' recipient: receiverIntro with “Maya”, read-only list of both questions (quoted), editor hidden + disabled, limit banner, no preview', t.intro === '2 questions from: “Maya”' && t.items[0].includes('“What should we eat tonight?”') && t.items[0].includes('LEFT: “Pizza” “🍕”') && t.items[1].includes('RIGHT: “Library”') && t.ed && t.dis && t.lim === C.limitBanner && t.pv === 'none', t);
    let axi = await axText(p, '#recv-intro'), vis = await p.$eval('#recv-intro', e => { const v = e.querySelector('.lr-vis'), q = [...v.querySelectorAll('.lr-qm')]; return { t: e.querySelector('.lr-sr').textContent, d: getComputedStyle(v).display, v: getComputedStyle(v).visibility, w: Math.min(...q.map(x => x.getBoundingClientRect().width)), marks: q.map(x => x.getAttribute('data-v')).join(''), name: v.querySelector('.lr-vt').getAttribute('data-v') }; });
    ck(w + ' PM: sender name quoted in receiverIntro — visible marks and in the a11y tree: 2 questions from: “Maya”', axi === '2 questions from: “Maya”' && vis.t === '“Maya”' && vis.d !== 'none' && vis.v === 'visible' && vis.w > 0 && vis.marks === '“”' && vis.name === 'Maya', { axi, vis });
    const ra = await recipientAccess(p, { facts: ['“Maya”', '“What should we eat tonight?”', '“Pizza”', '“Tacos”', '“Park or library?”', '“Library”', C.limitBanner], tabTo: ['#home', '#r-go', '#reset'], click: '#r-go' });
    ck(w + ' recipientAccess: no inert, no aria-hidden facts, facts in the a11y tree, Tab reaches the link + buttons, real click works', ra.ok, ra);
    await sleep(200); t = await p.evaluate(() => ({ scr: ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden), from: document.getElementById('b-from').textContent, hint: document.getElementById('hint').textContent }));
    ck(w + ' recipient "Show it big": the sender\'s method comes with the link (hold 2 s), fromLine "From: “Maya” · 1 of 2"', t.scr === 's2' && t.from === 'From: “Maya” · 1 of 2' && t.hint === 'Hold a side for 2 seconds to pick it.', t);
    axi = await axText(p, '#b-from'); ck(w + ' PM: board From line keeps the quoted name in the a11y tree: From: “Maya” · 1 of 2', axi === 'From: “Maya” · 1 of 2', axi);
    { const qc1 = (await qContrast(p)).filter(x => x.at === 'b-from'); ck(w + ' quote marks: From: “Maya” line contrast ≥ 4.5:1 (normal size; muted ink at 90% on oat); ratio ' + (qMin(qc1) || {}).ratio, qc1.length === 2 && qOk(qc1), qc1); }
    await press(p, '#b-back'); await press(p, '#reset'); await sleep(150);
    t = await p.evaluate(() => ({ hash: location.hash, ed: document.getElementById('edit').hidden, recv: document.getElementById('recv').hidden, q: document.getElementById('q-0').value, from: document.getElementById('from').value, dis: document.getElementById('q-0').disabled, toast: document.getElementById('toast').textContent, f: document.activeElement.id }));
    ck(w + ' Start over on a received link: fragment cleared, blank editable page, resetDone, focus on the question', !t.hash && !t.ed && t.recv && !t.q && !t.from && !t.dis && t.toast === C.resetDone && t.f === 'q-0', t);
    // receiverIntroOne: one question, quoted name on screen + a11y tree; board halves name the quoted answer + quoted emoji
    const one = await p.evaluate(() => MILL.pack('l', 1, { f: 'Maya', m: 0, k: 0, s: 0, e: 20, d: 15, q: [['What should we eat tonight?', 'Pizza', 'Tacos', '\u{1F355}', '']] }));
    await p.goto('about:blank'); await p.goto(BASE + '#' + one, { waitUntil: 'load' }); await sleep(300);
    axi = await axText(p, '#recv-intro'); t = await p.$eval('#recv-intro', e => ({ t: e.textContent, typed: e.querySelector('.mill-typed') && e.querySelector('.mill-typed').textContent, marks: [...e.querySelectorAll('.lr-vis .lr-qm')].map(x => x.getBoundingClientRect().width > 0 ? x.getAttribute('data-v') : '').join('') }));
    ck(w + ' PM: receiverIntroOne with the quoted name, visible and in the a11y tree: A question from: “Maya”', t.t === 'A question from: “Maya”' && t.typed === '“Maya”' && t.marks === '“”' && axi === t.t, { t, axi });
    { const qc0 = await qContrast(p); ck(w + ' quote marks: contrast ≥ 4.5:1 normal / 3:1 large on the recipient page (intro + list); lowest ' + (qMin(qc0) || {}).ratio, qOk(qc0), qc0); }
    await press(p, '#r-go'); await sleep(200); t = { from: await axText(p, '#b-from'), l: await axName(p, '#h-l'), r: await axName(p, '#h-r'), lt: await p.$eval('#h-l', e => e.innerText.replace(/\s+/g, ' ')) };
    ck(w + ' PM: board From: “Maya” · 1 of 1 in the a11y tree; half names "LEFT: “Pizza” “🍕”" / "RIGHT: “Tacos”"; quotes visible on answer and emoji', t.from === 'From: “Maya” · 1 of 1' && t.l === 'LEFT: “Pizza” “🍕”' && t.r === 'RIGHT: “Tacos”' && t.lt.includes('“🍕”') && t.lt.includes('“Pizza”'), t);
    await p.keyboard.press('Enter'); await sleep(700); t = { a: await axText(p, '#c-a'), live: await p.$eval('#live', e => e.textContent) };
    ck(w + ' PM: chosen answer quoted in the a11y tree and the live region', t.a === '“Pizza”' && t.live === 'Chosen: “Pizza”, left', t);
    await sleep(100); await press(p, '#c-send'); await sleep(150); t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, vis: !document.getElementById('c-fb').hidden, f: document.activeElement.id, sel: document.activeElement.selectionEnd - document.activeElement.selectionStart, v: document.getElementById('c-fbt').value, arg: window.__shareArg }));
    ck(w + ' Send the answer back -> share sheet closed: answerShareCancel toast, the quoted answer selected in the box below', t.toast === C.answerShareCancel && t.vis && t.f === 'c-fbt' && t.sel === t.v.length && t.v.includes('“Pizza”') && t.arg && t.arg.text === t.v, t);
    // malformed links in the same tab
    const frag = link.split('#')[1]; const bads = [['x', 'badLink'], [frag.slice(0, -1), 'badLink'], [frag.slice(0, 30), 'badLink'], [frag.replace('l1.', 'l2.'), 'badLink'], ['l1.' + 'A'.repeat(2100) + '.abcdef', 'badLink'], ['l1.%%%.000000', 'badLink'], ['e1.' + frag.slice(3), 'badLink']];
    const mk = await p.evaluate(() => { const b = { f: '', m: 0, k: 0, s: 0, e: 20, d: 15, q: [['A?', 'b', 'c', '', '']] }; const o = (k, v) => MILL.pack('l', 1, Object.assign({}, b, { [k]: v }));
      return [[MILL.pack('l', 2, b), 'oldVersion'], [o('q', []), 'badLink'], [o('q', [['A?', 'b', 'c', 'xy', '']]), 'badLink'], [o('m', 7), 'badLink'], [o('e', 13), 'badLink'], [o('q', [['A?', ' b', 'c', '', '']]), 'badLink'], [MILL.pack('l', 1, Object.assign({ z: 1 }, b)), 'badLink']]; });
    bads.push(...mk);
    for (const [b, why] of bads) { await p.evaluate(f => { location.hash = f; }, frag); await sleep(150); await p.evaluate(f => { location.hash = f; }, b); await sleep(150);
      r = await p.evaluate(() => ({ b: document.getElementById('banner').hidden ? '' : document.getElementById('banner-t').textContent, recv: document.getElementById('recv').hidden, items: document.querySelectorAll('#recv-list li').length && !document.getElementById('recv').hidden, q: document.getElementById('q-0').value, from: document.getElementById('from').value, inv: document.querySelectorAll('[aria-invalid=true]').length, scr: ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden) }));
      ck(w + ` malformed link (${b.slice(0, 14)}… len ${b.length}) -> ${why}, blank editor, nothing from the previous link`, r.b === C[why] && r.recv && !r.items && !r.q && !r.from && !r.inv && r.scr === 's1', r); }
    var r;
    const stb = await sameTabBadLink(p, { fill: async () => { await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await fillQ(p, 0, 'A?', 'b', 'c'); await press(p, '#go'); await sleep(50); await press(p, '#b-back'); }, link: async () => { await press(p, '#mk'); await sleep(100); return p.$eval('#link', e => e.value); }, bad: 'l1.zzz.000000', errSel: '.lr-err' });
    ck(w + ' same tab: link -> bad link leaves no visible field error, nothing aria-invalid', stb.ok, stb);
    // toast reset on a route change
    await p.evaluate(() => MILLVIEW.toast('x')); await p.evaluate(() => { location.hash = 'x'; }); await sleep(120); ck(w + ' a route change clears the toast', await p.$eval('#toast', e => e.hidden), null);
    ck(w + ' link/recipient: no request off origin; no storage; no page errors', !netCheck(s.reqs, H, []).offending.length && !(await storage(p)).ls.length && !errsOf(s, SCHEME).length, [netCheck(s.reqs, H, []).offending, errsOf(s, SCHEME)]); await s.b.close();

    // ---------- PM Q1 spoof: typed curly quotes / guillemets everywhere (received link, board, chosen, answers, copy, editor)
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.evaluateOnNewDocument(clipStub); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const sf = await p.evaluate((SN, SQ, SL, SR) => MILL.pack('l', 1, { f: SN, m: 0, k: 0, s: 0, e: 20, d: 15, q: [[SQ, SL, SR, '\u{1F355}', ''], ['Two?', 'x', 'y', '', '']] }), SN, SQ, SL, SR);
    await p.goto('about:blank'); await p.goto(BASE + '#' + sf, { waitUntil: 'load' }); await sleep(300);
    const outs = async () => { const c = await p.evaluate(() => window.__clip.slice()); const o = { fb1: await p.$eval('#c-fbt', e => e.value), fb2: await p.$eval('#ans-fbt', e => e.value) }; c.forEach((x, i) => { o['clip' + i] = x; }); return o; };
    let a = await typedAudit(p, [SN, SQ, SL, SR]); ck(w + ' Q1 spoof (received view): “ ” „ ‟ « » shown as " inside one “…” frame (screen, a11y names, live)', a.ok, a.hits);
    ck(w + ' Q1: the link keeps the original typed marks', await p.evaluate((SQ) => { const u = MILL.unpack(location.hash, 'l', 1, 1e6); return u.ok && u.data.q[0][0] === SQ; }, SQ), null);
    await press(p, '#r-go'); await sleep(150); a = await typedAudit(p, [SN, SQ, SL, SR]); ck(w + ' Q1 spoof (board: from line, question, halves, aria-labels)', a.ok && (await p.$eval('#b-from', e => e.textContent)) === 'From: “Maya" from "Bank” · 1 of 2', a.hits);
    f = await fits(p); ck(w + ' board with typed quotes fits', !f.bad.length, f);
    await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter'); await sleep(250); await sleep(500);
    await press(p, '#c-send'); await p.evaluate(() => { window.__clipFail = true; }); await press(p, '#c-send'); await sleep(100);
    a = await typedAudit(p, [SQ, SR], await outs()); ck(w + ' Q1 spoof (chosen screen, assertive live region, answer text copied + fallback box)', a.ok && (await p.$eval('#live', e => e.textContent)) === 'Chosen: “"Stay" home”, right', a.hits);
    await p.evaluate(() => { window.__clipFail = false; }); await press(p, '#c-back'); await press(p, '#copy-ans'); await p.evaluate(() => { window.__clipFail = true; }); await press(p, '#copy-ans'); await sleep(100);
    a = await typedAudit(p, [SN, SQ, SR], await outs()); ck(w + ' Q1 spoof (answers list, copied answers, fallback)', a.ok, a.hits);
    // sender editor: typed into the fields (values are raw in inputs by design; everything rendered from them is quoted)
    await press(p, '#reset'); await sleep(100); await setVal(p, '#from', SN); await fillQ(p, 0, SQ, SL, SR); await fillQ(p, 1, 'Two?', 'x', 'y');
    await p.focus('#l-0'); a = await typedAudit(p, w >= 1000 ? [SQ, SL, SR] : []); const rawShown = await p.evaluate((xs) => xs.filter(x => document.body.innerText.includes(x)), [SN, SQ, SL, SR]);
    ck(w + ' Q1 spoof (sender editor' + (w >= 1000 ? ': live preview quoted' : '') + '; no raw typed marks in page text)', a.ok && !rawShown.length, { hits: a.hits, rawShown });
    await press(p, '#go'); await sleep(120); await p.keyboard.press('Enter'); await sleep(250); await sleep(500); await press(p, '#c-next'); await sleep(100); await p.keyboard.press('Enter'); await sleep(700); await press(p, '#c-back');
    await p.evaluate(() => { window.__clipFail = false; window.__clip = []; }); await press(p, '#copy-ans'); a = await typedAudit(p, [SQ, SL], await outs());
    ck(w + ' Q1 spoof (sender: board → chosen → answers + copy)', a.ok && (await p.evaluate(() => window.__clip[0])).includes('1. “Milk" from "Your bank”: “"Yes" please” (left)'), a.hits);
    ck(w + ' spoof: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- 2,000-char WHOLE-URL cap; 320 fit with long single words
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
    const big = await p.evaluate(() => { const pre = location.origin + location.pathname + '#'; let best = null;
      for (let n = 1; n <= 80; n++) { const qs = Array.from({ length: 6 }, (_, i) => ['\u6C34'.repeat(Math.min(79, n)) + i, 'L' + i, 'R' + i, '', '']); const f = MILL.pack('l', 1, { f: '', m: 0, k: 0, s: 0, e: 20, d: 15, q: qs }); if (pre.length + f.length <= 2000) best = f; else break; } return best; });
    await p.goto('about:blank'); await p.goto(BASE + '#' + big, { waitUntil: 'load' }); await sleep(300);
    t = await p.evaluate(() => ({ len: location.href.length, recv: !document.getElementById('recv').hidden, n: document.querySelectorAll('#recv-list li').length }));
    ck(w + ' URL cap: a link just under 2,000 chars opens as 6 received questions', t.len <= 2000 && t.len > 1900 && t.recv && t.n === 6, t);
    await press(p, '#reset'); for (let i = 0; i < 6; i++) await fillQ(p, i, '\u6C34'.repeat(80), '\u6C34'.repeat(30), '\u6C34'.repeat(30));
    await press(p, '#mk'); await sleep(100); t = await p.evaluate(() => ({ toast: document.getElementById('toast').textContent, box: document.getElementById('linkbox').hidden, hash: location.hash, q: document.getElementById('q-5').value.length }));
    ck(w + ' URL cap: over 2,000 -> no link (tooLongLink), questions still on the page, address bar untouched', t.toast === C.tooLongLink && t.box && !t.hash && t.q === 80, t);
    // L3: the setup preview keeps an emoji run whole wherever it fits, and never splits inside an emoji
    await press(p, '#reset'); await fillQ(p, 0, 'Pizza \u{1F355}\u{1F355}\u{1F355} night?', 'Pizza \u{1F355}\u{1F355}\u{1F355} party time', '\u{1F355}'.repeat(14)); await sleep(100);
    const pvl = await pvP(p, 'pv-l'), pvr = await pvP(p, 'pv-r'), pvq = await pieces(p, '#pv-q'), RUN = '\u{1F355}\u{1F355}\u{1F355}', pvt = await p.evaluate(() => [document.getElementById('pv-l').textContent, document.getElementById('pv-r').textContent]);
    const segsOf = x => Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(x), y => y.segment);
    ck(w + ' L3 preview: ' + (w < 1000 ? 'hidden below 1000px (nothing to split)' : '“🍕🍕🍕” stays one piece (left answer, question); a run wider than the box breaks only between emoji; text unchanged'),
      w < 1000 ? !pvl.w && !(await p.evaluate(() => document.getElementById('preview').getClientRects().length)) : pvl.pieces.some(x => x.includes(RUN)) && pvq.pieces.some(x => x.includes(RUN)) && pvr.pieces.every(x => segsOf(x).every(g => g === '\u{1F355}' || g === '\u201C' || g === '\u201D')) && pvr.pieces.join('').replace(/[\u201C\u201D]/g, '') === '\u{1F355}'.repeat(14) && pvt[0] === '\u201CPizza ' + RUN + ' party time\u201D', { pvl, pvq, pvr, pvt });
    await press(p, '#reset'); await fillQ(p, 0, 'W'.repeat(80), "Grandmother's", 'Watch a movie at home'); await fillQ(p, 1, 'Two?', 'Abcdefghijklmnopqrstuvwxyzabcd', 'x y');
    f = await fits(p); ck(w + ' editor fits (80-char question, 30-char answers)', !f.bad.length && f.sw <= f.w, f);
    await press(p, '#go'); await sleep(250); f = await fits(p); let L1 = await lw(p, 'h-l-a'), R1 = await lw(p, 'h-r-a');
    ck(w + ' board fits: “Grandmother\'s” / “Watch a movie at home” never past their half (hanging marks stay inside the tile)', !f.bad.length && f.sw <= f.w, { f, L1, R1 });
    // Creative r2 long words: Grand-/mother's (dictionary break) at ≥ 24px at 320/390, unbroken at 1280; both halves one size
    ck(w + ' long word “Grandmother\'s”: ' + (w === 1280 ? 'unbroken (fits at its size)' : '“Grand-” / “mother\'s”” at ≥ 24px (dictionary break, two lines rendered)') + '; both halves the same size',
      L1.fs === R1.fs && lwOk(L1) && lwOk(R1) && (w === 1280 ? !L1.broken && L1.fs > 24 : L1.broken && L1.drawn === "Grand-\nmother's" && L1.rendered === 2), { L1, R1 });
    ck(w + ' long word: the closing mark never sits alone on a line; breaks only between graphemes; marks 0.8em, same weight, 70% as the computed colour (alpha .7, opacity 1), hanging by their own width',
      L1.closeWithLetters && R1.closeWithLetters && L1.gsafe && L1.qmFs > 0.79 && L1.qmFs < 0.81 && L1.qmOp === 1 && Math.abs(L1.qmA - 0.7) < 0.01 && L1.qmW && L1.hangO && L1.hangC && R1.hangO && R1.hangC, { L1, R1 });
    const nm = await axName(p, '#h-l'), ax1 = await axAll(p), axq = await axText(p, '#h-l-a');
    ck(w + ' long word: accessible name "LEFT: “Grandmother\'s”" (quotes, no hyphen, no soft hyphen); clean quoted text in the a11y tree; no soft hyphen anywhere', nm === 'LEFT: “Grandmother\'s”' && axq === '“Grandmother\'s”' && !ax1.some(x => x.includes('\u00AD') || /Grand-/.test(x)), { nm, axq });
    let qc = await qContrast(p); ck(w + ' quote marks: contrast ≥ 4.5:1 normal / 3:1 large on the board (tiles, From line, question), from the computed colours; lowest ' + (qMin(qc) || {}).ratio, qOk(qc), qc);
    let qp = await qPix(p, '#s2'); ck(w + ' quote marks: RENDERED contrast ≥ 4.5:1 normal / 3:1 large on the board (screenshot pixels: mark ink vs the pixels around it); lowest ' + (qMin(qp) || {}).ratio, qp.length >= 6 && qOk(qp), qp);
    let qf = await quoteFace(p, 'b-q'); ck(w + ' Creative r3: the question\'s curly quotes are drawn in Andika (LR Quotes face, U+201C/U+201D only, loaded; mark width = Andika’s, ≠ Shantell’s)', qf.check && /LR Quotes/.test(qf.fam.split(',')[0]) && Math.abs(qf.w - qf.andika) < 0.3 && Math.abs(qf.w - qf.shantell) > 0.5 && qf.fonts.some(f => /U\+201C, U\+201D|U\+201C-201D/i.test(f) && /loaded/.test(f)), qf);
    // refit on resize / orientation change: narrow -> wide -> narrow gives the same result as a fresh render
    const w2 = w === 1280 ? 390 : 1280; await p.setViewport({ width: w2, height: 900 }); await sleep(250); const Lw = await lw(p, 'h-l-a'); await p.setViewport({ width: w, height: 900 }); await p.evaluate(() => window.dispatchEvent(new Event('orientationchange'))); await sleep(250); const Lb = await lw(p, 'h-l-a');
    ck(w + ' long word: the fit re-runs on resize/orientation change (' + w + '→' + w2 + '→' + w + ')', Lw.fs !== L1.fs && Lb.fs === L1.fs && Lb.drawn === L1.drawn && lwOk(Lw) && lwOk(Lb), { L1, Lw, Lb });
    // L4, Creative option (b): during the 500ms guard the buttons look exactly as after (fill, label, border, focus ring);
    // a 3px bar in the label colour at full opacity sweeps along the inside bottom edge (linear), aria-disabled + cursor:progress
    const guardState = () => p.evaluate(() => { const b = document.getElementById('c-next'), cs = getComputedStyle(b), bar = getComputedStyle(b, '::after'), btns = Array.from(document.querySelectorAll('#s3 .btn')).filter(x => !x.hidden);
      const m = bar.transform.match(/matrix\(([^,]+)/), lum = c => { const v = c.match(/[\d.]+/g).map(Number), f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]); };
      const ratio = (a, c) => { const x = lum(a), y = lum(c); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };
      return { g: document.getElementById('s3').classList.contains('lr-guard'), focus: document.activeElement === b && b.matches(':focus-visible'), ow: cs.outlineWidth, os: cs.outlineStyle, oc: cs.outlineColor, oo: cs.outlineOffset,
        bg: cs.backgroundColor, fg: cs.color, bd: cs.borderColor + ' ' + cs.borderWidth, op: +cs.opacity, filter: cs.filter, ghost: btns.filter(x => x !== b).map(x => getComputedStyle(x).color + '|' + getComputedStyle(x).backgroundColor + '|' + getComputedStyle(x).borderColor + '|' + getComputedStyle(x).opacity).join(';'),
        contrast: ratio(cs.color, cs.backgroundColor), aria: btns.map(x => x.getAttribute('aria-disabled')), cursor: btns.map(x => getComputedStyle(x).cursor),
        bar: { content: bar.content, h: bar.height, bottom: bar.bottom, left: bar.left, right: bar.right, pos: bar.position, bgc: bar.backgroundColor, op: bar.opacity, anim: bar.animationName, dur: bar.animationDuration, ease: bar.animationTimingFunction, sx: m ? +(+m[1]).toFixed(3) : (bar.transform === 'none' ? 1 : null) } }; });
    await p.keyboard.press('Enter'); const t0 = Date.now(), gs = []; for (const at of [60, 160, 260, 360, 440]) { await sleep(Math.max(0, at - (Date.now() - t0))); gs.push(Object.assign({ at: Date.now() - t0 }, await guardState())); }
    const px1 = await inkPx(p, '#c-next'); await sleep(Math.max(0, 750 - (Date.now() - t0))); let g2 = await guardState(); const px2 = await inkPx(p, '#c-next');
    const during = gs.filter(g => g.g);
    ck(w + ' L4 guard: fill, label, border, opacity unchanged at every sampled point (' + during.map(g => g.at + 'ms').join(', ') + '); main label contrast ' + g2.contrast + ':1 throughout (≥ 4.5)',
      during.length >= 4 && during.every(g => g.bg === g2.bg && g.fg === g2.fg && g.bd === g2.bd && g.op === 1 && g.filter === 'none' && g.ghost === g2.ghost && g.contrast === g2.contrast) && g2.contrast >= 4.5, { gs, g2 });
    ck(w + ' L4 guard: rendered label contrast (screenshot pixels) during the guard equals after: ' + px1.ratio + ' vs ' + px2.ratio, Math.abs(px1.ratio - px2.ratio) < 0.05 && px1.ratio >= 4.5, { px1, px2 });
    ck(w + ' L4 guard: every button aria-disabled="true" with cursor:progress during, gone (no attribute, pointer) after', during.every(g => g.aria.length >= 3 && g.aria.every(a => a === 'true') && g.cursor.every(c => c === 'progress')) && g2.aria.every(a => a === null) && g2.cursor.every(c => c === 'pointer'), { gs: gs.map(g => [g.at, g.aria, g.cursor]), g2: [g2.aria, g2.cursor] });
    ck(w + ' L4 guard bar: 3px, inside bottom edge, label colour at full opacity, sweeps left→right over 500ms linear (scaleX rising), then gone',
      during.every(g => g.bar.h === '3px' && g.bar.bottom === '0px' && g.bar.left === '0px' && g.bar.right === '0px' && g.bar.pos === 'absolute' && g.bar.bgc === g.fg && +g.bar.op === 1 && g.bar.anim === 'lr-sweep' && g.bar.dur === '0.5s' && g.bar.ease === 'linear')
        && during.every((g, i) => i === 0 || g.bar.sx > during[i - 1].bar.sx) && during[0].bar.sx < 0.3 && during[during.length - 1].bar.sx > 0.7 && g2.bar.content === 'none', { bars: gs.map(g => [g.at, g.bar.sx, g.bar.h, g.bar.bgc]), after: g2.bar });
    ck(w + ' L4 guard: focus ring unchanged (same solid outline width, colour, offset during and after)', during.every(g => g.focus && g.os === 'solid' && parseFloat(g.ow) >= 8 && g.ow === g2.ow && g.oc === g2.oc && g.oo === g2.oo) && g2.focus, { gs: gs.map(g => [g.ow, g.oc]), g2: [g2.ow, g2.oc] });
    // presses during the guard do nothing (keyboard + click), then work
    await press(p, '#c-again'); await sleep(150); await p.keyboard.press('Enter'); await sleep(80); const sc0 = await p.evaluate(() => document.getElementById('c-a').textContent);
    await p.keyboard.press('Enter'); await sleep(40); await p.evaluate(() => document.getElementById('c-again').click()); await sleep(40); const ig = { scr: await scr(p), a: await p.evaluate(() => document.getElementById('c-a').textContent), aria: await p.evaluate(() => document.getElementById('c-next').getAttribute('aria-disabled')) };
    ck(w + ' L4 guard: Enter on Next and a click on Ask again during the 500ms are ignored (still on the chosen screen)', ig.scr === 's3' && ig.a === sc0 && ig.aria === 'true', ig); await sleep(600);
    f = await fits(p); const CG = await lw(p, 'c-a'); ck(w + ' chosen “Grandmother\'s” fits; marks styled + hanging; closing mark with letters', !f.bad.length && f.sw <= f.w && lwOk(CG) && CG.hangO && CG.hangC, { f, CG });
    qc = await qContrast(p); ck(w + ' quote marks: contrast ≥ 4.5:1 normal / 3:1 large on the chosen screen; lowest ' + (qMin(qc) || {}).ratio, qOk(qc), qc);
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await press(p, '#c-again'); await sleep(150); await p.keyboard.press('Enter');
    const r0 = Date.now(), rg = []; for (const at of [60, 250, 440]) { await sleep(Math.max(0, at - (Date.now() - r0))); rg.push(await guardState()); } await sleep(Math.max(0, 750 - (Date.now() - r0))); g2 = await guardState(); await p.emulateMediaFeatures([]);
    ck(w + ' L4 reduced motion: no sweep — the bar is a static full-width 3px line in the label colour for the 500ms, then gone; aria-disabled during; fill/label/ring unchanged',
      rg.every(g => g.g && g.bar.anim === 'none' && g.bar.sx === 1 && g.bar.h === '3px' && g.bar.bgc === g.fg && g.aria.every(a => a === 'true') && g.bg === g2.bg && g.fg === g2.fg && g.oc === g2.oc) && !g2.g && g2.bar.content === 'none' && g2.aria.every(a => a === null), { rg: rg.map(g => [g.bar, g.aria]), g2: g2.bar });
    await press(p, '#c-next'); await sleep(250); f = await fits(p); ck(w + ' board with a 30-letter single word fits', !f.bad.length && f.sw <= f.w, f);
    L1 = await lw(p, 'h-l-a'); R1 = await lw(p, 'h-r-a'); ck(w + ' 30-letter word: same size both halves, grapheme-safe, closing mark with letters', L1.fs === R1.fs && lwOk(L1) && lwOk(R1), { L1, R1 });
    // a 20-character word with no dictionary break: fallback, ≥ 4 letters each side of every break, visible hyphens
    await press(p, '#b-back'); await sleep(150); await press(p, '#reset'); await p.evaluate(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    const W20 = 'Nooooooooooooooooooo', EMO = '\u{1F9D1}\u{1F3FD}\u200D\u{1F9B3}'.repeat(7);
    await fillQ(p, 0, 'Ready to stop?', W20, 'Yes'); await fillQ(p, 1, 'Who?', EMO, 'Me'); await press(p, '#go'); await sleep(250); L1 = await lw(p, 'h-l-a'); R1 = await lw(p, 'h-r-a'); f = await fits(p);
    const dict = await p.evaluate(w => LRFIT.hyphenate(w).length, W20.toLowerCase());
    ck(w + ' 20-char word “' + W20 + '” (no dictionary break): ' + (w === 1280 ? 'unbroken' : 'fallback breaks, every line ≥ 4 letters, hyphen at each break, lines rendered as drawn') + '; both halves the same size',
      dict === 0 && !f.bad.length && L1.fs === R1.fs && lwOk(L1) && lwOk(R1) && (w === 1280 ? !L1.broken : L1.broken && L1.lines.length >= 2 && L1.lines.every((l, i) => (l.match(/\p{L}/gu) || []).length >= 4 && (i === L1.lines.length - 1 || l.endsWith('-')))), { dict, L1, R1, f });
    const nm2 = await axName(p, '#h-l'), ax2 = await axAll(p);
    ck(w + ' 20-char word: accessible name "LEFT: “' + W20 + '”" (quotes, no hyphen, no soft hyphen); none anywhere in the a11y tree', nm2 === 'LEFT: “' + W20 + '”' && !ax2.some(x => x.includes('\u00AD') || x.includes('Nooo-')), nm2);
    await p.keyboard.press('Enter'); await sleep(700); const CA = await lw(p, 'c-a'); const cax = await axText(p, '#c-a'), ax3 = await axAll(p);
    ck(w + ' chosen 20-char word: grapheme-safe, closing mark with letters, a11y text “' + W20 + '” clean, no soft hyphen in the tree', lwOk(CA) && cax === '“' + W20 + '”' && !ax3.some(x => x.includes('\u00AD')), { CA, cax });
    await sleep(100); await press(p, '#c-send'); await sleep(150); const clip = await p.evaluate(() => window.__clip.join('\n'));
    ck(w + ' copied answer text: quoted, no hyphen, no soft hyphen', clip.includes('“' + W20 + '”') && !clip.includes('\u00AD') && !clip.includes('Nooo-'), clip);
    await sleep(600); await press(p, '#c-next'); await sleep(250); L1 = await lw(p, 'h-l-a'); f = await fits(p);
    ck(w + ' emoji answer (7 × 🧑🏽‍🦳, ZWJ sequences): never split inside an emoji, no hyphen between emoji, closing mark with the last emoji', !f.bad.length && lwOk(L1) && L1.gsafe && (!L1.broken || L1.lines.every(l => !l.endsWith('-'))), { L1, f });
    ck(w + ' cap/fit: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- keyboard reach
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await fillQ(p, 0, 'A?', 'b', 'c'); await fillQ(p, 1, 'D?', 'e', 'f'); await setMode(p, 'switch');
    let miss = await tabReach(p, ['home', 'from', 'q-0', 'l-0', 'le-0', 'r-0', 're-0', 'rm-0', 'q-1', 'add', 'm-tap', 'm-switch', 'm-hold', 'key', 'scan', 'every', 'go', 'mk', 'reset'], 80);
    ck(w + ' keyboard: Tab reaches every editor control', !miss.length, miss);
    await setMode(p, 'tap'); await press(p, '#go'); await sleep(100); miss = await tabReach(p, ['h-l', 'h-r', 'b-back'], 8); ck(w + ' keyboard: board Tab order reaches left, right, then Back (no trap)', !miss.length, miss);
    await press(p, '#b-back'); await sleep(100); ck(w + ' Back to the questions returns to the editor with focus on Show it big', (await p.evaluate(() => document.activeElement.id)) === 'go' && (await scr(p)) === 's1', null);
    await s.b.close();
  }
  // ---------- QA local-372ce92, once: Chrome WITH classic scrollbars (QA's setup; puppeteer hides them by default)
  if (!process.env.MILL_SKIP_SWEEP) {
    const puppeteer = require('puppeteer-core');
    const classic = async () => { const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', ignoreDefaultArgs: ['--hide-scrollbars'], args: ['--no-sandbox', `--host-resolver-rules=MAP ${H.split(':')[0]} ${IP}`] });
      const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Cross-Origin-Opener-Policy/.test(m.text())) errs.push('console: ' + m.text()); }); p.on('dialog', d => d.accept().catch(() => {})); p.setDefaultTimeout(15000); return { b, p, errs }; };
    // L1 sweep: hyphenated, multi-word and long-word answers; the rendered line pieces from layout on the board and the chosen screen
    const SW = [['Which visit?', 'Mother-in-law visit', 'Bartholomew-Smythe'], ['Who reads?', "Grandmother's", 'Watch a movie at home'], ['Stop?', 'Nooooooooooooooooooo', 'Jean-Luc Picard-Smith'], ['Long?', 'Abcdefghijklmnopqrstuvwxyzabcd', 'Pizza \u{1F355}\u{1F355}\u{1F355} party'], ['Up?', 'Well-being', 'x-ray']];
    const VH = { 320: 760, 360: 760, 390: 844 }, sizes = {};
    for (const w of [320, 360, 390, 700, 1280, 1440]) {
      const c = await classic(), p = c.p; await p.setViewport({ width: w, height: VH[w] || 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      if (w >= 1000) { await fillQ(p, 0, 'Pizza \u{1F355}\u{1F355}\u{1F355} night?', 'Pizza \u{1F355}\u{1F355}\u{1F355} party time', 'Tacos \u{1F32E}\u{1F32E} please'); await sleep(100); const a = await pvP(p, 'pv-l'), b = await pieces(p, '#pv-q'), c2 = await pvP(p, 'pv-r');
        ck(`L3 sweep ${w} (classic scrollbars): preview keeps “🍕🍕🍕” and “🌮🌮” whole (${a.pieces.join(' / ')} | ${c2.pieces.join(' / ')})`, a.pieces.some(x => x.includes('\u{1F355}\u{1F355}\u{1F355}')) && b.pieces.some(x => x.includes('\u{1F355}\u{1F355}\u{1F355}')) && c2.pieces.some(x => x.includes('\u{1F32E}\u{1F32E}')), { a, b, c2 }); }
      for (let i = 0; i < SW.length; i++) await fillQ(p, i, ...SW[i]); await press(p, '#go'); await sleep(300); const got = [];
      for (let i = 0; i < SW.length; i++) {
        const L = await lw(p, 'h-l-a'), R = await lw(p, 'h-r-a'), f = await fits(p); await p.keyboard.press('Enter'); await sleep(650); const CA = await lw(p, 'c-a'), f3 = await fits(p);
        got.push({ q: i, L: [L.fs, L.lines.join('/'), L.kinds.join('')], R: [R.fs, R.lines.join('/'), R.kinds.join('')], C: [CA.fs, CA.lines.join('/')] });
        ck(`sweep ${w}×${VH[w] || 900} (classic scrollbars) “${SW[i][1]}” | “${SW[i][2]}”: rendered pieces = planned (${L.lines.join('/')} | ${R.lines.join('/')} @ ${L.fs}px); added breaks only in segments that can't fit alone, ≥ 4 letters a side; both halves one size; board + chosen fit`,
          lwOk(L) && lwOk(R) && lwOk(CA) && L.fs === R.fs && !f.bad.length && f.sw <= f.w && !f3.bad.length && f3.sw <= f3.w, { L, R, CA: { fs: CA.fs, lines: CA.lines, added: CA.added, piecesMatch: CA.piecesMatch, rectW: CA.rectW, pieceW: CA.pieceW }, f: f.bad, f3: f3.bad });
        if (i === 0) { const mo = R.lines.concat(L.lines); ck(`sweep ${w}: “Mother-in-law visit” breaks only at its own hyphens / the space (no added hyphen, no 1–3-letter piece split off)`, !L.added.length && L.kinds.every(k => k !== 'a') && L.lines.every(l => (l.match(/\p{L}/gu) || []).length >= 2) && !mo.some(l => /^(r|er|her)-/.test(l)), { L: L.lines, kinds: L.kinds }); }
        if (i === 1) sizes[w] = L.fs;
        if (i < SW.length - 1) { await press(p, '#c-next'); await sleep(300); }
      }
      ck(`sweep ${w}: no page errors`, !c.errs.length, c.errs); await c.b.close();
    }
    // QA local-d0ca704 L5 + L6 regressions at QA's exact cases: rendered lines = fit.js plan = a greedy reference (board,
    // chosen screen, preview); flag runs whole in the preview
    for (const w of [320, 360, 390, 700, 1280, 1440]) {
      const c = await classic(), p = c.p; await p.setViewport({ width: w, height: VH[w] || 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      const CASES = [['Who should read the bedtime story tonight?', "Grandmother's", 'Watch a movie at home'], ['Which one?', 'X-ray', 'Twenty-two-year-old cat'], ['Which trip \u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5} wins?', 'Flags \u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5} trip', 'Pizza \u{1F355}\u{1F355}\u{1F355} party time']];
      for (let i = 0; i < CASES.length; i++) await fillQ(p, i, ...CASES[i]);
      if (w >= 1000) for (let i = 0; i < CASES.length; i++) { await p.evaluate(i => document.getElementById('q-' + i).dispatchEvent(new Event('input', { bubbles: true })), i); await sleep(120);
        const L = await lw(p, 'pv-l'), R = await lw(p, 'pv-r'), gL = await greedyRef(p, 'pv-l'), gR = await greedyRef(p, 'pv-r'), pq = await pieces(p, '#pv-q');
        ck(`L5 preview ${w}: “${CASES[i][1]}” | “${CASES[i][2]}” drawn greedily (${L.lines.join('/')} | ${R.lines.join('/')} @ ${L.fs}px) = greedy reference; rendered = plan`, lwOk(L) && lwOk(R) && JSON.stringify(gL.ref) === JSON.stringify(L.lines) && JSON.stringify(gR.ref) === JSON.stringify(R.lines), { gL, gR, L: L.lines, R: R.lines });
        if (i === 2) ck(`L6 preview ${w}: the flag run “🇬🇧🇫🇷🇯🇵” stays whole in the question (${pq.pieces.join(' / ')}) and in the left answer (${L.lines.join(' / ')})`, pq.pieces.some(x => x.includes('\u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5}')) && L.lines.includes('\u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5}') || (L.lines.some(x => x.includes('\u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5}')) && pq.pieces.some(x => x.includes('\u{1F1EC}\u{1F1E7}\u{1F1EB}\u{1F1F7}\u{1F1EF}\u{1F1F5}'))), { pq, L: L.lines, nb: await p.evaluate(() => Array.from(document.querySelectorAll('#pv-q .lr-nb')).map(e => e.textContent)) }); }
      await press(p, '#go'); await sleep(300);
      for (let i = 0; i < CASES.length; i++) {
        const L = await lw(p, 'h-l-a'), R = await lw(p, 'h-r-a'), gL = await greedyRef(p, 'h-l-a'), gR = await greedyRef(p, 'h-r-a');
        ck(`L5 board ${w}×${VH[w] || 900}: “${CASES[i][1]}” | “${CASES[i][2]}” drawn greedily (${L.lines.join('/')} | ${R.lines.join('/')} @ ${L.fs}px) = greedy reference; rendered = plan`, lwOk(L) && lwOk(R) && JSON.stringify(gL.ref) === JSON.stringify(L.lines) && JSON.stringify(gR.ref) === JSON.stringify(R.lines), { gL, gR });
        if (i === 0 && w <= 390) ck(`L5 board ${w}: “Watch a movie at home” is Watch a / movie at / home (QA's case)`, R.lines.join('/') === 'Watch a/movie at/home', R.lines);
        if (i === 1 && w <= 390) ck(`L5 board ${w}: “Twenty-two-year-old cat” keeps the space break, no hyphen break where a space works (${R.lines.join('/')})`, !R.lines.includes('old cat') && R.lines[R.lines.length - 1] === 'cat' || R.lines[R.lines.length - 1] === 'year-old cat', R.lines);
        for (const side of ['l', 'r']) { await p.focus('#h-' + side); await p.keyboard.press('Enter'); await sleep(650); const A = await lw(p, 'c-a'), gA = await greedyRef(p, 'c-a');
          ck(`L5 chosen ${w}: “${CASES[i][side === 'l' ? 1 : 2]}” drawn greedily (${A.lines.join('/')} @ ${A.fs}px) = greedy reference; rendered = plan`, lwOk(A) && JSON.stringify(gA.ref) === JSON.stringify(A.lines), { gA });
          await press(p, '#c-again'); await sleep(300); }
        if (i < CASES.length - 1) { await p.focus('#h-l'); await p.keyboard.press('Enter'); await sleep(650); await press(p, '#c-next'); await sleep(300); } }
      ck(`L5/L6 ${w}: no page errors`, !c.errs.length, c.errs); await c.b.close();
    }
    // QA local-d0ca704 L7: every quote-mark location, both sides; 4.5:1 normal size, 3:1 large (the mark's own size)
    for (const w of [320, 390, 1280]) {
      const c = await classic(), p = c.p; await p.setViewport({ width: w, height: VH[w] || 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      await setVal(p, '#from', 'Maya'); await fillQ(p, 0, 'Who reads tonight?', "Grandmother's", 'Tacos', '\u{1F475}', '\u{1F32E}'); await sleep(150); const rows7 = [];
      const grab = async (where) => { const qc = await qContrast(p); qc.forEach(x => rows7.push(Object.assign({ where }, x))); return qc; };
      if (w >= 1000) await grab('preview');
      await press(p, '#go'); await sleep(300); await grab('board');
      await p.focus('#h-l'); await p.keyboard.press('Enter'); await sleep(650); await grab('chosen-left');
      await press(p, '#c-again'); await sleep(300); await p.focus('#h-r'); await p.keyboard.press('Enter'); await sleep(650); await grab('chosen-right');
      const frag = await p.evaluate(() => MILL.pack('l', 1, { f: 'Maya', m: 0, k: 0, s: 0, e: 20, d: 15, q: [['Who reads tonight?', "Grandmother's", 'Tacos', '', '']] }));
      await p.goto('about:blank'); await p.goto(BASE + '#' + frag, { waitUntil: 'load' }); await sleep(300); await grab('recipient');
      const bad = rows7.filter(x => x.ratio < x.thr), byLoc = {}; rows7.forEach(x => { const k = x.where + ' #' + x.at + ' ' + x.size; if (!byLoc[k] || x.ratio < byLoc[k].ratio) byLoc[k] = { ratio: x.ratio, thr: x.thr, alpha: x.alpha, fg: x.fg.join(','), bg: x.bg.join(',') }; });
      ck(`L7 ${w}: every quote mark meets 4.5:1 (normal) / 3:1 (large): ${Object.keys(byLoc).length} locations, lowest ${qMin(rows7).ratio} at ${qMin(rows7).where} #${qMin(rows7).at}`, rows7.length >= 10 && !bad.length && ['board', 'chosen-left', 'chosen-right', 'recipient'].every(k => rows7.some(x => x.where === k)) && rows7.some(x => x.where === 'chosen-right' && x.at === 'c-q'), { byLoc, bad });
      ck(`L7 ${w}: no page errors`, !c.errs.length, c.errs); await c.b.close();
    }
    // QA local-d0ca704 L8: every focus ring 3:1+ against every colour next to it (rendered pixels)
    for (const w of [320, 390, 1280]) {
      const c = await classic(), p = c.p; await p.setViewport({ width: w, height: VH[w] || 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      await fillQ(p, 0, 'Who reads?', "Grandmother's", 'Tacos'); await press(p, '#go'); await sleep(300); const res = {};
      const strip = async (sel, edge) => { const b = await p.$eval(sel, e => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; }); const fw = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--focus-w')));
        const m = fw + 14; if (edge === 'left') return ringRuns(p, { x: Math.max(0, b.l - m), y: b.cy - 2, width: 2 * m, height: 4 }); if (edge === 'right') return ringRuns(p, { x: b.r - m, y: b.cy - 2, width: Math.min(2 * m, w - (b.r - m)), height: 4 }); return ringRuns(p, { x: b.cx - 2, y: Math.max(0, b.t - m), width: 4, height: 2 * m }, true); };
      await p.focus('#h-l'); await p.keyboard.press('ArrowLeft').catch(() => {}); await p.focus('#h-l'); await sleep(80); res['board left tile, right edge (next to spruce)'] = await strip('#h-l', 'right'); res['board left tile, top edge (next to the oat strip)'] = await strip('#h-l', 'top');
      await p.keyboard.press('ArrowRight'); await sleep(80); res['board right tile, left edge (next to marigold)'] = await strip('#h-r', 'left'); res['board right tile, top edge'] = await strip('#h-r', 'top');
      await p.keyboard.press('Enter'); await sleep(700); res['chosen right (spruce): Send/Next main button'] = await strip('#s3 .btn:not([hidden]):focus', 'left'); await p.keyboard.press('Tab'); await sleep(60); res['chosen right (spruce): ghost button'] = await strip('#s3 .btn:focus', 'left');
      await press(p, '#c-again'); await sleep(300); await p.focus('#h-l'); await p.keyboard.press('Enter'); await sleep(700); res['chosen left (marigold): main button'] = await strip('#s3 .btn:focus', 'left'); await p.keyboard.press('Tab'); await sleep(60); res['chosen left (marigold): ghost button'] = await strip('#s3 .btn:focus', 'left');
      // switch highlight (step scan): Enter moves the highlight
      await press(p, '#c-back'); await sleep(200); await press(p, '#b-back').catch(() => {}); await sleep(200);
      await p.evaluate(() => window.scrollTo(0, 0)); await setMode(p, 'switch', { scan: 'step' }); await press(p, '#go'); await sleep(300);
      res['switch highlight, left tile, right edge'] = await strip('#h-l', 'right'); await p.keyboard.press('Enter'); await sleep(150); res['switch highlight, right tile, left edge'] = await strip('#h-r', 'left'); res['switch highlight, right tile, top edge'] = await strip('#h-r', 'top');
      const bad = Object.entries(res).filter(([k, v]) => !v.pairs.length || v.min < 3);
      ck(`L8 ${w}: every focus ring / switch highlight band is 3:1+ against every colour next to it (rendered): ` + Object.entries(res).map(([k, v]) => k + ' ' + v.min).join('; '), !bad.length, res);
      ck(`L8 ${w}: no page errors`, !c.errs.length, c.errs); await c.b.close();
    }
    // Creative pass @d0ca704: the chosen-screen question has the chosen answer's measure; short ones stay on one line, long
    // ones wrap only at spaces (greedy word wrap of the same words in the same font predicts the rendered line count), no sideways scroll
    for (const w of [320, 360, 390, 1280]) {
      const c = await classic(), p = c.p; await p.setViewport({ width: w, height: VH[w] || 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200);
      const LQ = 'Which of these would you rather do on a slow, rainy Sunday afternoon at home?';
      await fillQ(p, 0, 'Who reads?', "Grandmother's", 'Tacos'); await fillQ(p, 1, LQ, 'Bake bread', 'Board games'); await press(p, '#go'); await sleep(300);
      const cq = () => p.evaluate(() => { const q = document.getElementById('c-q'), a = document.getElementById('c-a'), vt = q.querySelector('.lr-vt'), vis = q.querySelector('.lr-vis'), rs = Array.from(vt.getClientRects()), cs = getComputedStyle(q), vcs = getComputedStyle(vis);
        const qr = q.getBoundingClientRect(), ar = a.getBoundingClientRect(), s3 = document.getElementById('s3'), s3cs = getComputedStyle(s3), content = s3.clientWidth - parseFloat(s3cs.paddingLeft) - parseFloat(s3cs.paddingRight);
        const tops = [...new Set(rs.map(r => Math.round(r.top)))], inner = vt.getAttribute('data-v'), qo = q.querySelector('.lr-qo').getBoundingClientRect().width, qc = q.querySelector('.lr-qc').getBoundingClientRect().width;
        const pw = document.createElement('span'), pr = document.createElement('span'); pw.className = 'lr-probe-w'; pr.className = 'lr-probe'; pw.appendChild(pr); q.appendChild(pw); const W = t => { pr.textContent = t; return pr.getBoundingClientRect().width; };
        const avail = q.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), words = inner.split(' '); let lines = 1, cur = words[0]; // whole-line widths (a leading space collapses in a probe); marks hang
        for (let i = 1; i < words.length; i++) { const t = cur + ' ' + words[i]; if (W(t) > avail + 0.5) { lines++; cur = words[i]; } else cur = t; }
        const longest = Math.max(...words.map(W)); pw.remove();
        return { lines: tops.length, greedy: lines, qw: Math.round(qr.width * 10) / 10, aw: Math.round(ar.width * 10) / 10, content: Math.round(content * 10) / 10, longestFits: longest <= avail, ow: vcs.overflowWrap + '/' + cs.overflowWrap, wb: vcs.wordBreak, hy: cs.hyphens, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, hangO: q.classList.contains('lr-hang') && parseFloat(getComputedStyle(q.querySelector('.lr-qo')).marginInlineStart) < 0, maxR: Math.max(...rs.map(r => r.right)), qRight: qr.right + parseFloat(s3cs.paddingRight) }; });
      await p.keyboard.press('Enter'); await sleep(650); const A = await cq(), f = await fits(p);
      ck(`chosen question ${w} (classic scrollbars): “Who reads?” on one line; its box = the chosen answer's measure (${A.qw} vs ${A.aw}, content ${A.content}); hanging quotes kept; break-word only`,
        A.lines === 1 && Math.abs(A.qw - A.aw) <= 1 && Math.abs(A.qw - A.content) <= 1 && A.hangO && /break-word/.test(A.ow) && !/anywhere/.test(A.ow) && A.wb === 'normal' && A.hy !== 'auto' && !f.bad.length && A.sw <= A.cw, { A, f: f.bad });
      await press(p, '#c-next'); await sleep(300); await p.keyboard.press('Enter'); await sleep(650); const B = await cq(), f2 = await fits(p);
      ck(`chosen question ${w}: a long question (80 chars; one line at 1280) wraps only at spaces (${B.lines} lines = greedy word wrap ${B.greedy}; every word fits the measure), same measure as the answer, no horizontal scroll`,
        (w >= 1280 || B.lines >= 2) && B.lines === B.greedy && B.longestFits && Math.abs(B.qw - B.aw) <= 1 && B.sw <= B.cw && !f2.bad.length, { B, f: f2.bad });
      ck(`chosen question ${w}: no page errors`, !c.errs.length, c.errs); await c.b.close();
    }
    // (a): the size QA measured is the size that renders: classic and overlay scrollbars give the same plan at QA's viewports
    for (const [w, h] of [[320, 760], [390, 844]]) {
      const run = async (cl) => { const c = cl ? await classic() : await session(H, IP), p = c.p; await p.setViewport({ width: w, height: h }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(200); await setVal(p, '#from', 'Maya'); await fillQ(p, 0, 'Who reads?', "Grandmother's", 'Tacos'); await press(p, '#go'); await sleep(300);
        const L = await lw(p, 'h-l-a'), R = await lw(p, 'h-r-a'), cw = await p.evaluate(() => [document.documentElement.clientWidth, document.getElementById('h-l-a').clientWidth]); await c.b.close(); return { fs: L.fs, rfs: R.fs, lines: L.lines, cw, ok: lwOk(L) && lwOk(R) }; };
      const A = await run(true), B = await run(false);
      ck(`(a) ${w}×${h}: “Grandmother's” | “Tacos” render at ${A.fs}px with classic scrollbars and ${B.fs}px without (same plan, same box width ${A.cw[1]}px; was 24.7/30.5 vs 26.8/32.6 at 372ce92)`, A.fs === B.fs && A.rfs === A.fs && A.ok && B.ok && A.lines.join('/') === "Grand-/mother's" && A.cw[1] === B.cw[1], { A, B });
    }
    // L2: the 2,000-char cap on the WHOLE received URL (shared MILLVIEW.linkFor): 1,999 and 2,000 open, 2,001 is refused
    { const c = await classic(), p = c.p; await p.setViewport({ width: 390, height: 844 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150);
      const frag = await p.evaluate(() => MILL.pack('l', 1, { f: 'Maya', m: 0, k: 0, s: 0, e: 20, d: 15, q: Array.from({ length: 6 }, (_, i) => ['Q' + i + ' ' + 'w'.repeat(76), 'Left ' + i, 'Right ' + i, '', '']) }));
      const origin = `${SCHEME}://${H}`, baseLen = (origin + '/mill/left-or-right/#' + frag).length, res = [];
      for (const n of [1999, 2000, 2001]) { const k = n - baseLen, url = origin + '/mill/' + '/'.repeat(k) + 'left-or-right/#' + frag; await p.goto('about:blank'); await p.goto(url, { waitUntil: 'load' }); await sleep(300);
        res.push(Object.assign({ n, k, fragLen: frag.length }, await p.evaluate(() => ({ len: location.href.length, recv: !document.getElementById('recv').hidden, items: document.querySelectorAll('#recv-list li').length, banner: !document.getElementById('banner').hidden ? document.getElementById('banner-t').textContent : null })))); }
      ck('L2 whole-URL cap on received links: 1,999 and 2,000 open (6 questions), 2,001 refused with the bad-link message (long path, fragment ' + frag.length + ')',
        res[0].len === 1999 && res[1].len === 2000 && res[2].len === 2001 && res[0].recv && res[0].items === 6 && res[1].recv && res[1].items === 6 && !res[2].recv && res[2].banner === C.badLink && !res[0].banner && !res[1].banner, res);
      ck('L2: no page errors', !c.errs.length, c.errs); await c.b.close(); }
  }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
