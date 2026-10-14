// node tests/browser/knock-audio.qa.js <base-url> [ip] — C051 audio: at 320/390/1280 with a real (CDP) touch tap on the door and the
// browser's DEFAULT autoplay policy: AudioContext is "running" after the tap, a knock was scheduled, the sound-on dot shows,
// audio-unlock.js is served 200 as JS, and no audio file / off-site request is made (the knock is synthesized).
const puppeteer = require('/workspace/oct13tools/node_modules/puppeteer-core'); const fs = require('fs');
(async () => { const base = process.argv[2], ip = process.argv[3], host = new URL(base).host; const args = ['--no-sandbox']; if (ip) args.push(`--host-resolver-rules=MAP ${host} ${ip}`);
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', timeout: 120000, protocolTimeout: 240000, args });
  const out = { fails: [], res: {} };
  for (const w of [320, 390, 1280]) { const p = await b.newPage(); p.setDefaultTimeout(60000); await p.setCacheEnabled(false); const reqs = [];
    p.on('response', r => reqs.push({ u: r.url(), s: r.status(), t: (r.headers()['content-type'] || '') }));
    await p.setViewport({ width: w, height: w < 600 ? 800 : 800, hasTouch: w < 600, isMobile: w < 600 });
    await p.goto(base + 'our-knock/', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.__okAudio && document.readyState === 'complete');
    const before = await p.evaluate(() => window.__okAudio());
    const door = await p.$('#door, .ok-door'); const bb = await door.boundingBox(); const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
    if (w < 600) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
    await new Promise(r => setTimeout(r, 600));
    const after = await p.evaluate(() => Object.assign(window.__okAudio(), { dot: !!document.querySelector('.ok-fine.is-sound-on, .ok-sound.is-live') }));
    const ul = reqs.find(r => /audio-unlock\.js$/.test(r.u)); const media = reqs.filter(r => /^audio\/|^video\//.test(r.t) || /\.(wav|mp3|ogg|m4a|aac)(\?|$)/.test(r.u)); const off = reqs.filter(r => !r.u.startsWith('https://' + host) && !r.u.startsWith(base) && !r.u.startsWith('data:') && !r.u.startsWith('blob:'));
    const r = { before: before.state, after, unlockJs: ul ? ul.s + ' ' + ul.t : 'missing', mediaRequests: media.length, offsite: off.map(o => o.u) }; out.res[w] = r;
    if (after.state !== 'running') out.fails.push(w + ' ctx not running'); if (!(after.scheduled >= 0)) out.fails.push(w + ' no knock scheduled'); if (!after.dot) out.fails.push(w + ' no sound-on dot');
    if (!ul || ul.s !== 200 || !/javascript/.test(ul.t)) out.fails.push(w + ' audio-unlock.js not served'); if (off.length) out.fails.push(w + ' offsite'); await p.close(); }
  const a = fs.readFileSync(__dirname + '/../../shared/audio-unlock.js'), c = fs.readFileSync(__dirname + '/../../our-knock/audio-unlock.js'); out.helperCopyIdentical = a.equals(c); if (!out.helperCopyIdentical) out.fails.push('our-knock/audio-unlock.js differs from shared/');
  console.log(JSON.stringify(out, null, 1)); await b.close(); process.exit(out.fails.length ? 1 : 0); })();
