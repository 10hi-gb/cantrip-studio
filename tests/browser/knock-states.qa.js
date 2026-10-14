// node tests/browser/knock-states.qa.js <base-url> [ip] — C051 rework at 320/390/1280: the five states (s1 sender, s2 gate, s3 your turn,
// s4 opened, s5 missed), keyboard-only paths (recipient answer + sender "Copy me" recording), AudioContext running after the gate,
// note never under the open door, no horizontal overflow, malformed links -> badLink.
const puppeteer = require('/workspace/oct13tools/node_modules/puppeteer-core');
const sleep = t => new Promise(r => setTimeout(r, t));
(async () => { const base = process.argv[2], ip = process.argv[3], U = base + 'our-knock/'; const args = ['--no-sandbox']; if (ip) args.push(`--host-resolver-rules=MAP ${new URL(base).host} ${ip}`);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', timeout: 120000, protocolTimeout: 240000, args });
  const out = { fails: [], res: {} }; const F = m => out.fails.push(m);
  const note = Buffer.from('Took you long enough.').toString('base64url');
  for (const w of [320, 390, 1280]) { const p = await b.newPage(); p.setDefaultTimeout(60000); await p.setCacheEnabled(false); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.setViewport({ width: w, height: w < 600 ? 844 : 900 }); const r = out.res[w] = {};
    const go = async h => { await p.goto('about:blank'); await p.goto(U + (h || ''), { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.readyState === 'complete' && document.getElementById('h').textContent); await sleep(200); };
    const snap = () => p.evaluate(() => { const v = id => { const e = document.getElementById(id); return e && !e.hidden && e.offsetParent !== null; };
      return { h: document.getElementById('h').textContent, lede: document.getElementById('lede').textContent, status: document.getElementById('status').textContent, phrase: v('phrase') ? document.getElementById('phrase').textContent : '',
        modes: v('modes'), gate: v('gate'), plate: v('plate') ? document.getElementById('plate-b').textContent : '', door: document.getElementById('door').className, studs: document.querySelectorAll('.ok-stud').length,
        on: document.querySelectorAll('.ok-stud.is-on').length, miss: document.querySelectorAll('.ok-stud.is-miss').length, ticks: document.querySelectorAll('.ok-tick').length, done: document.getElementById('rail').classList.contains('is-done'),
        hear: v('hear2'), sw: document.documentElement.scrollWidth, iw: innerWidth, rail: document.getElementById('rail').getAttribute('aria-label') }; });
    // s1
    await go(); r.s1 = await snap(); if (!r.s1.modes || r.s1.plate !== COPY_PAD || r.s1.studs !== 7) F(w + ' s1');
    // s2 gate
    await go('#k1.s.n.' + note); r.s2 = await snap(); if (!r.s2.gate || r.s2.on !== 0 || r.s2.studs !== 7) F(w + ' s2');
    // keyboard: gate has focus -> Enter
    r.gateFocused = await p.evaluate(() => document.activeElement.id); await p.keyboard.press('Enter'); await sleep(400); r.audio = await p.evaluate(() => window.__okAudio());
    if (r.audio.state !== 'running' || !(r.audio.scheduled >= 5)) F(w + ' audio not running/scheduled after gate');
    await p.waitForFunction(() => document.getElementById('door').classList.contains('is-turn'), { timeout: 15000 }); r.s3 = await snap(); r.turnFocus = await p.evaluate(() => document.activeElement.id);
    if (r.s3.status !== 'Your turn.' || r.s3.plate !== 'Two bits?' || r.s3.on !== 5) F(w + ' s3');
    await sleep(350); await p.keyboard.press('Space'); await sleep(600); await p.keyboard.press('Space');
    await p.waitForFunction(() => document.getElementById('door').classList.contains('is-open'), { timeout: 5000 }).catch(() => {}); await sleep(1200);
    r.s4 = await snap(); r.note = await p.evaluate(() => { const n = document.getElementById('note-out').getBoundingClientRect(), d = document.getElementById('door').getBoundingClientRect(); const ox = Math.max(0, Math.min(n.right, d.right) - Math.max(n.left, d.left)), oy = Math.max(0, Math.min(n.bottom, d.bottom) - Math.max(n.top, d.top));
      return { text: document.getElementById('note-out').textContent, overlap: Math.round(ox * oy), note: [n.left, n.top, n.width, n.height].map(Math.round), door: [d.left, d.top, d.width, d.height].map(Math.round) }; });
    if (!r.s4.door.includes('is-open') || !r.s4.done || r.s4.phrase !== 'Shave and a haircut, two bits!' || r.note.text !== 'Took you long enough.' || r.note.overlap > 0) F(w + ' s4');
    await p.screenshot({ path: `/workspace/qa-knock-rework-s4-${w}.png` });
    // s5 miss: one knock only (off by one -> "So close. One more.")
    await go('#k1.s'); await p.click('#gate'); await p.waitForFunction(() => document.getElementById('door').classList.contains('is-turn'), { timeout: 15000 }); await sleep(350); await p.keyboard.press('Space');
    await p.waitForFunction(() => !document.getElementById('f-miss').hidden, { timeout: 8000 }).catch(() => {}); r.s5 = await snap();
    if (r.s5.h !== 'Not quite. Try again.' || r.s5.lede !== 'So close. One more.' || r.s5.miss !== 2 || r.s5.ticks !== 1 || !r.s5.hear) F(w + ' s5');
    await p.screenshot({ path: `/workspace/qa-knock-rework-s5-${w}.png` });
    // sender keyboard path: Copy me, record 4 knocks with Space, auto-stop, Close the door, link
    await go(); await p.focus('.ok-mode'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); r.mode = await p.evaluate(() => document.activeElement.textContent.slice(0, 7));
    await p.focus('#door'); for (const d of [0, 500, 300, 300]) { await sleep(d); await p.keyboard.press('Space'); } await sleep(1900);
    r.rec = await snap(); await p.focus('#closeDoor'); await p.keyboard.press('Enter'); await sleep(200);
    r.shareShown = await p.evaluate(() => !document.getElementById('f-share').hidden && document.activeElement.id); if (r.mode !== 'Copy me' || r.rec.studs !== 8 || r.shareShown !== 'share') F(w + ' sender keyboard path');
    // D1: "Knock again" after Close the door + Send clears the note and all local state
    await go(); await p.type('#note', 'Blue gate.'); await p.click('#closeDoor'); await sleep(150); await p.click('#share').catch(() => {}); await sleep(500); await p.click('#again'); await sleep(200);
    r.reset = await p.evaluate(() => ({ note: document.getElementById('note').value, noteMsg: document.getElementById('note-msg').textContent, msg: document.getElementById('msg').textContent, linkHidden: document.getElementById('linkbox').hidden, link: document.getElementById('linkbox').value,
      make: !document.getElementById('f-make').hidden, share: !document.getElementById('f-share').hidden, modes: !document.getElementById('modes').hidden, studs: document.querySelectorAll('.ok-stud').length, closeEnabled: !document.getElementById('closeDoor').disabled, hash: location.hash, open: document.getElementById('door').classList.contains('is-open'), noteOut: document.getElementById('note-out').textContent }));
    if (r.reset.note !== '' || r.reset.noteMsg || r.reset.msg || !r.reset.linkHidden || r.reset.link || !r.reset.make || r.reset.share || !r.reset.modes || r.reset.studs !== 7 || r.reset.hash || r.reset.open || r.reset.noteOut) F(w + ' D1 Knock again did not reset local state');
    // D1b: Copy me recording in progress, then Knock again -> no stale recording/rail
    await p.focus('.ok-mode'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.focus('#door'); for (const d of [0, 400, 300, 300]) { await sleep(d); await p.keyboard.press('Space'); } await sleep(1900); await p.type('#note', 'x'); await p.click('#redo'); await sleep(200);
    r.reset2 = await p.evaluate(() => ({ note: document.getElementById('note').value, studs: document.querySelectorAll('.ok-stud').length, closeDisabled: document.getElementById('closeDoor').disabled }));
    if (r.reset2.note !== '' || r.reset2.studs !== 0 || !r.reset2.closeDisabled) F(w + ' D1b redo did not reset recording');
    // D2: lamp shade never overlaps the note text with an 80-character note (also at 320x640)
    for (const hgt of w === 320 ? [640, 844] : [w < 600 ? 844 : 900]) { await p.setViewport({ width: w, height: hgt });
      const long = Buffer.from('Blue gate, third step, under the pot with the fern. Knock twice and wait for me!'.slice(0, 80)).toString('base64url');
      await go('#k1.s.n.' + long); await p.click('#gate'); await p.waitForFunction(() => document.getElementById('door').classList.contains('is-turn'), { timeout: 15000 }); await sleep(350); await p.keyboard.press('Space'); await sleep(600); await p.keyboard.press('Space'); await sleep(1500);
      const L = await p.evaluate(() => { const lamp = document.querySelector('.ok-behind .lamp').getBoundingClientRect(), sh = { l: lamp.left - 14, r: lamp.left + 16, t: lamp.bottom - 2, b: lamp.bottom + 14 }; const rg = document.createRange(); const n = document.getElementById('note-out'); rg.selectNodeContents(n);
        let ov = 0; for (const q of rg.getClientRects()) ov += Math.max(0, Math.min(q.right, sh.r) - Math.max(q.left, sh.l)) * Math.max(0, Math.min(q.bottom, sh.b) - Math.max(q.top, sh.t));
        const d = document.getElementById('door').getBoundingClientRect(), nb = n.getBoundingClientRect(), bh = n.parentNode.getBoundingClientRect(); const dov = Math.max(0, Math.min(nb.right, d.right) - Math.max(nb.left, d.left)) * Math.max(0, Math.min(nb.bottom, d.bottom) - Math.max(nb.top, d.top));
        return { len: [...n.textContent].length, open: document.getElementById('door').classList.contains('is-open'), shadeNoteOverlap: Math.round(ov), doorNoteOverlap: Math.round(dov), clipped: nb.top < bh.top || nb.bottom > bh.bottom, shadeBottom: Math.round(sh.b), noteTop: Math.round(nb.top) }; });
      r['lamp' + hgt] = L; if (!L.open || L.len !== 80 || L.shadeNoteOverlap > 0 || L.doorNoteOverlap > 0 || L.clipped) F(w + 'x' + hgt + ' D2 lamp/door overlaps or clips the 80-char note');
      await p.screenshot({ path: `/workspace/qa-knock-lamp-${w}x${hgt}.png` }); }
    // overflow in every state measured
    for (const k of ['s1', 's2', 's3', 's4', 's5', 'rec']) if (r[k].sw > r[k].iw) F(w + ' overflow ' + k);
    // bad links
    r.bad = []; for (const h of ['#k2.s', '#k1.c.1o', '#k1.s.n.!!', '#k1.s.' + 'a'.repeat(420), '#<img src=x onerror=alert(1)>']) { await go(h); const s = await snap(); r.bad.push(s.lede === 'This door didn\'t come through. Ask them to send it again.'); }
    if (r.bad.some(x => !x)) F(w + ' badLink'); r.errs = errs; if (errs.length) F(w + ' page errors'); await p.close(); }
  console.log(JSON.stringify(out, null, 1)); await b.close(); process.exit(out.fails.length ? 1 : 0); })();
const COPY_PAD = 'Knock here';
