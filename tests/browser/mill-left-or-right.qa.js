// node tests/browser/mill-left-or-right.qa.js <host[:port]> <ip> [scheme] — Left or Right (P018 original) @320/390/1280
// ENGINEER SELF-CHECK, localhost-preview. Synthetic input only: this is NOT a real switch / dwell / head-pointer check.
// Flows (tap by key + pointer with the release-inside guard, one-switch auto-scan never picks, two-switch step-scan, hold
// with early-release cancel, 2-question queue, ask again, answers list + copy), send-the-answer-back copy + failure,
// make a link + share cancel, recipient read-only (recipientAccess), typedAudit incl. the PM Q1 spoof case on every
// screen + copied text, malformed links, reset, no storage / no network, the 2,000-char URL cap, keyboard reach, 320 fit
// (30-char answers, long single word), required line + limit banner on every screen, banned-claim grep, print, reduced motion.
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
    if (r.right > w + 1 || r.left < -1) bad.push('edge:' + (e.id || e.className || e.tagName)); if (!/INPUT|SELECT|TEXTAREA/.test(e.tagName) && e.scrollWidth > e.clientWidth + 1 && e.clientWidth) bad.push('clip:' + (e.id || e.className || e.tagName) + ' ' + e.scrollWidth + '>' + e.clientWidth); });
  document.querySelectorAll('.half').forEach(h => { if (h.getClientRects().length && (h.scrollWidth > h.clientWidth + 1 || h.scrollHeight > h.clientHeight + 1)) bad.push('half:' + h.id + ' ' + h.scrollWidth + 'x' + h.scrollHeight + '>' + h.clientWidth + 'x' + h.clientHeight); });
  return { bad: bad.slice(0, 10), sw: document.documentElement.scrollWidth, w }; }); }
// accessibility tree: every name/value (for "no soft hyphen anywhere") and the in-order text under one element
async function axAll(p) { const snap = await p.accessibility.snapshot({ interestingOnly: false }); const out = []; (function walk(n) { if (!n) return; if (n.name) out.push(String(n.name)); if (n.value) out.push(String(n.value)); (n.children || []).forEach(walk); })(snap); return out; }
async function axText(p, sel) { const h = await p.$(sel); const snap = await p.accessibility.snapshot({ root: h, interestingOnly: false }); const out = [];
  (function walk(n) { if (!n) return; if (n.role === 'StaticText' || n.role === 'text') { out.push(n.name || ''); return; } (n.children || []).forEach(walk); })(snap); return out.join('').replace(/\s+/g, ' ').trim(); }
async function axName(p, sel) { const h = await p.$(sel); const snap = await p.accessibility.snapshot({ root: h, interestingOnly: false }); return snap ? snap.name : null; }
// long-word state of one half / the chosen answer: size, generated hyphenated copy, the CSS that forbids bare splits,
// and whether the unbroken text would overflow at the current size (so a break is only ever taken when it must be)
const lw = (p, id) => p.evaluate(id => { const a = document.getElementById(id), cs = getComputedStyle(a), af = getComputedStyle(a, '::after'), src = a.querySelector('.lr-shy-src');
  const pr = document.createElement('span'); pr.className = 'lr-probe'; pr.textContent = a.textContent; a.appendChild(pr); const raw = pr.offsetWidth; a.removeChild(pr);
  const avail = a.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  return { fs: parseFloat(cs.fontSize), shy: a.classList.contains('lr-shy'), v: a.getAttribute('data-v'), text: a.textContent, ow: cs.overflowWrap, wb: cs.wordBreak, hy: cs.hyphens, afHy: af.hyphens, afOw: af.overflowWrap, afWb: af.wordBreak, srcSr: !!(src && src.classList.contains('lr-sr')), rawW: Math.round(raw), avail: Math.round(avail), over: a.scrollWidth > a.clientWidth + 1 }; }, id);
const noBareSplit = x => x.ow === 'normal' && x.wb === 'normal' && x.hy === 'manual' && !x.over && (!x.shy || (x.afHy === 'manual' && x.afOw === 'normal' && x.afWb === 'normal' && x.srcSr));
const shyOk = (x, word) => x.shy && x.fs === 24 && x.rawW > x.avail && x.v.includes('\u00AD') && x.v.replace(/\u00AD/g, '') === x.text && x.v.split(' ').every(t => !t.includes('\u00AD') || t.replace(/\u00AD/g, '').length > 1) && !x.text.includes('\u00AD') && x.text === '\u201C' + word + '\u201D';
(async () => {
  const rows = []; const ck = (name, ok, info) => rows.push({ name, ok: !!ok, info });
  for (const w of W) {
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
    let axi = await axText(p, '#recv-intro'), vis = await p.$eval('#recv-intro .mill-typed', e => ({ t: e.textContent, d: getComputedStyle(e).display, v: getComputedStyle(e).visibility, w: e.getBoundingClientRect().width }));
    ck(w + ' PM: sender name quoted in receiverIntro — visible marks and in the a11y tree: 2 questions from: “Maya”', axi === '2 questions from: “Maya”' && vis.t === '“Maya”' && vis.d !== 'none' && vis.v === 'visible' && vis.w > 0, { axi, vis });
    const ra = await recipientAccess(p, { facts: ['“Maya”', '“What should we eat tonight?”', '“Pizza”', '“Tacos”', '“Park or library?”', '“Library”', C.limitBanner], tabTo: ['#home', '#r-go', '#reset'], click: '#r-go' });
    ck(w + ' recipientAccess: no inert, no aria-hidden facts, facts in the a11y tree, Tab reaches the link + buttons, real click works', ra.ok, ra);
    await sleep(200); t = await p.evaluate(() => ({ scr: ['s1', 's2', 's3'].find(id => !document.getElementById(id).hidden), from: document.getElementById('b-from').textContent, hint: document.getElementById('hint').textContent }));
    ck(w + ' recipient "Show it big": the sender\'s method comes with the link (hold 2 s), fromLine "From: “Maya” · 1 of 2"', t.scr === 's2' && t.from === 'From: “Maya” · 1 of 2' && t.hint === 'Hold a side for 2 seconds to pick it.', t);
    axi = await axText(p, '#b-from'); ck(w + ' PM: board From line keeps the quoted name in the a11y tree: From: “Maya” · 1 of 2', axi === 'From: “Maya” · 1 of 2', axi);
    await press(p, '#b-back'); await press(p, '#reset'); await sleep(150);
    t = await p.evaluate(() => ({ hash: location.hash, ed: document.getElementById('edit').hidden, recv: document.getElementById('recv').hidden, q: document.getElementById('q-0').value, from: document.getElementById('from').value, dis: document.getElementById('q-0').disabled, toast: document.getElementById('toast').textContent, f: document.activeElement.id }));
    ck(w + ' Start over on a received link: fragment cleared, blank editable page, resetDone, focus on the question', !t.hash && !t.ed && t.recv && !t.q && !t.from && !t.dis && t.toast === C.resetDone && t.f === 'q-0', t);
    // receiverIntroOne: one question, quoted name on screen + a11y tree; board halves name the quoted answer + quoted emoji
    const one = await p.evaluate(() => MILL.pack('l', 1, { f: 'Maya', m: 0, k: 0, s: 0, e: 20, d: 15, q: [['What should we eat tonight?', 'Pizza', 'Tacos', '\u{1F355}', '']] }));
    await p.goto('about:blank'); await p.goto(BASE + '#' + one, { waitUntil: 'load' }); await sleep(300);
    axi = await axText(p, '#recv-intro'); t = await p.$eval('#recv-intro', e => ({ t: e.textContent, typed: e.querySelector('.mill-typed') && e.querySelector('.mill-typed').textContent }));
    ck(w + ' PM: receiverIntroOne with the quoted name, visible and in the a11y tree: A question from: “Maya”', t.t === 'A question from: “Maya”' && t.typed === '“Maya”' && axi === t.t, { t, axi });
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
    await press(p, '#reset'); await fillQ(p, 0, 'W'.repeat(80), "Grandmother's", 'Watch a movie at home'); await fillQ(p, 1, 'Two?', 'Abcdefghijklmnopqrstuvwxyzabcd', 'x y');
    f = await fits(p); ck(w + ' editor fits (80-char question, 30-char answers)', !f.bad.length && f.sw <= f.w, f);
    await press(p, '#go'); await sleep(200); f = await fits(p); let L1 = await lw(p, 'h-l-a'), R1 = await lw(p, 'h-r-a');
    ck(w + ' board fits: “Grandmother\'s” / “Watch a movie at home” never past their half', !f.bad.length && f.sw <= f.w, { f, L1, R1 });
    // Creative 2026-10-17 long words: same size on both halves, ≥ 24px, breaks only at spaces; a word breaks only once 24px is reached and the unbroken word is wider than the tile, then at a soft hyphen (visible hyphen), never a bare split
    ck(w + ' long word “Grandmother\'s”: both halves the same size, ≥ 24px, no bare split' + (w === 1280 ? '; unbroken above the floor' : '; at 320/390 it is wider than the tile even at 24px, so it takes one hyphenated break at the floor'),
      L1.fs === R1.fs && L1.fs >= 24 && noBareSplit(L1) && noBareSplit(R1) && !R1.shy && (w === 1280 ? (!L1.shy && L1.fs > 24) : shyOk(L1, "Grandmother's")), { L1, R1 });
    const nm = await axName(p, '#h-l'), ax1 = await axAll(p);
    ck(w + ' long word: accessible name of the half is clean (no soft hyphen) and quoted; no soft hyphen anywhere in the a11y tree', nm === 'LEFT: “Grandmother\'s”' && !ax1.some(x => x.includes('\u00AD')), { nm, shy: ax1.filter(x => x.includes('\u00AD')) });
    // refit on resize / orientation change: narrow -> wide -> narrow gives the same result as a fresh render
    const w2 = w === 1280 ? 390 : 1280; await p.setViewport({ width: w2, height: 900 }); await sleep(250); const Lw = await lw(p, 'h-l-a'); await p.setViewport({ width: w, height: 900 }); await p.evaluate(() => window.dispatchEvent(new Event('orientationchange'))); await sleep(250); const Lb = await lw(p, 'h-l-a');
    ck(w + ' long word: the fit re-runs on resize/orientation change (' + w + '→' + w2 + '→' + w + ')', Lw.fs !== L1.fs && Lb.fs === L1.fs && Lb.shy === L1.shy && Lb.v === L1.v && noBareSplit(Lw) && noBareSplit(Lb), { L1, Lw, Lb });
    // the guard after a pick is visible: buttons at reduced opacity for 500ms, then full
    await p.keyboard.press('Enter'); await sleep(40); let g1 = await p.evaluate(() => ({ g: document.getElementById('s3').classList.contains('lr-guard'), o: [...document.querySelectorAll('#s3 .btn')].filter(b => b.getClientRects().length).map(b => +getComputedStyle(b).opacity) }));
    await sleep(700); let g2 = await p.evaluate(() => ({ g: document.getElementById('s3').classList.contains('lr-guard'), o: [...document.querySelectorAll('#s3 .btn')].filter(b => b.getClientRects().length).map(b => +getComputedStyle(b).opacity) }));
    ck(w + ' post-pick guard visible: chosen-screen buttons below full opacity at once, back to full after 500ms', g1.g && g1.o.length >= 3 && g1.o.every(o => o < 1) && !g2.g && g2.o.every(o => o === 1), { g1, g2 });
    f = await fits(p); ck(w + ' chosen “Grandmother\'s” fits', !f.bad.length && f.sw <= f.w, f);
    await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await press(p, '#c-again'); await sleep(150); await p.keyboard.press('Enter'); await sleep(30);
    g1 = await p.evaluate(() => ({ g: document.getElementById('s3').classList.contains('lr-guard'), o: [...document.querySelectorAll('#s3 .btn')].filter(b => b.getClientRects().length).map(b => +getComputedStyle(b).opacity), tr: getComputedStyle(document.getElementById('c-next')).transitionDuration }));
    await sleep(700); g2 = await p.evaluate(() => [...document.querySelectorAll('#s3 .btn')].filter(b => b.getClientRects().length).map(b => +getComputedStyle(b).opacity)); await p.emulateMediaFeatures([]);
    ck(w + ' reduced motion: the guard still shows (instant 0.45), then full', g1.g && g1.o.every(o => o === 0.45) && g1.tr === '0s' && g2.every(o => o === 1), { g1, g2 });
    await press(p, '#c-next'); await sleep(200); f = await fits(p); ck(w + ' board with a 30-letter single word fits', !f.bad.length && f.sw <= f.w, f);
    L1 = await lw(p, 'h-l-a'); R1 = await lw(p, 'h-r-a'); ck(w + ' 30-letter word: same size both halves, no bare split', L1.fs === R1.fs && noBareSplit(L1) && noBareSplit(R1), { L1, R1 });
    // a 20-character single word: hyphenated only below the floor; clean name, clean copy
    await press(p, '#b-back'); await sleep(150); await press(p, '#reset'); await p.evaluate(() => { window.__clip = []; Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__clip.push(String(t)); return Promise.resolve(); } } }); });
    await fillQ(p, 0, 'How was it?', 'Superextraordinarily', 'Fine'); await press(p, '#go'); await sleep(200); L1 = await lw(p, 'h-l-a'); R1 = await lw(p, 'h-r-a'); f = await fits(p);
    ck(w + ' 20-char word “Superextraordinarily”: both halves the same size; ' + (w === 1280 ? 'unbroken above the floor' : 'hyphenated break only at the 24px floor (soft hyphen at the break, visible hyphen), never a bare split'),
      !f.bad.length && L1.fs === R1.fs && noBareSplit(L1) && noBareSplit(R1) && (w === 1280 ? !L1.shy && L1.fs > 24 : shyOk(L1, 'Superextraordinarily')), { L1, R1, f });
    const nm2 = await axName(p, '#h-l'), ax2 = await axAll(p);
    ck(w + ' 20-char word: accessible name "LEFT: “Superextraordinarily”" has no soft hyphen; none anywhere in the a11y tree', nm2 === 'LEFT: “Superextraordinarily”' && !ax2.some(x => x.includes('\u00AD')), nm2);
    await p.keyboard.press('Enter'); await sleep(700); const CA = await lw(p, 'c-a'); const cax = await axText(p, '#c-a'), ax3 = await axAll(p);
    ck(w + ' chosen 20-char word: no bare split, a11y text “Superextraordinarily” clean, no soft hyphen in the tree', noBareSplit(CA) && (!CA.shy || shyOk(CA, 'Superextraordinarily')) && cax === '“Superextraordinarily”' && !ax3.some(x => x.includes('\u00AD')), { CA, cax });
    await press(p, '#c-send'); await sleep(150); const clip = await p.evaluate(() => window.__clip.join('\n'));
    ck(w + ' copied answer text: quoted, no soft hyphen', clip.includes('“Superextraordinarily”') && !clip.includes('\u00AD'), clip);
    ck(w + ' cap/fit: no page errors', !errsOf(s, SCHEME).length, errsOf(s, SCHEME)); await s.b.close();

    // ---------- keyboard reach
    s = await session(H, IP); p = s.p; await p.setViewport({ width: w, height: 900 }); await p.goto(BASE, { waitUntil: 'load' }); await sleep(150); await fillQ(p, 0, 'A?', 'b', 'c'); await fillQ(p, 1, 'D?', 'e', 'f'); await setMode(p, 'switch');
    let miss = await tabReach(p, ['home', 'from', 'q-0', 'l-0', 'le-0', 'r-0', 're-0', 'rm-0', 'q-1', 'add', 'm-tap', 'm-switch', 'm-hold', 'key', 'scan', 'every', 'go', 'mk', 'reset'], 80);
    ck(w + ' keyboard: Tab reaches every editor control', !miss.length, miss);
    await setMode(p, 'tap'); await press(p, '#go'); await sleep(100); miss = await tabReach(p, ['h-l', 'h-r', 'b-back'], 8); ck(w + ' keyboard: board Tab order reaches left, right, then Back (no trap)', !miss.length, miss);
    await press(p, '#b-back'); await sleep(100); ck(w + ' Back to the questions returns to the editor with focus on Show it big', (await p.evaluate(() => document.activeElement.id)) === 'go' && (await scr(p)) === 's1', null);
    await s.b.close();
  }
  process.exit(result(rows));
})().catch(e => { console.error(e); process.exit(2); });
