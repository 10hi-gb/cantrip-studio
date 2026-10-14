// Every piece's h1 at 320/390/768/1024/1440: no word split across lines, no horizontal overflow. Optional 3rd arg: piece; 4th: hash.
const { open } = require('./qa-lib');
const H = process.argv[2], only = process.argv[3], hash = process.argv[4] || '';
const SL = 'bad-on-purpose one-across annual-review here-it-comes monster-mouth our-knock eyes-closed score-this this-light wishbone cheers where-you-paused a-plant-from-this wear-this fogged-over catch-this-yawn taste-like-this until-then permission-slip dont-mention-it ask-me-at-four broken-telephone not-on-the-screen'.split(' ');
(async () => { const { b, p } = await open(H, '172.66.45.46'); const out = []; p.on('dialog', d => d.dismiss().catch(() => {}));
  for (const s of SL) { if (only && s !== only) continue;
    for (const w of (process.env.WS ? process.env.WS.split(',').map(Number) : [320, 390, 768, 1024, 1440])) { await p.setViewport({ width: w, height: 900 }); await p.goto('about:blank'); await p.goto('https://' + H + '/' + s + '/' + (hash ? '#' + hash : ''), { waitUntil: 'networkidle0' }); await new Promise(r => setTimeout(r, 400));
      const m = await p.evaluate(() => { const h = document.querySelector('h1'); if (!h) return null; const words = []; const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        let n; while ((n = tw.nextNode())) { const re = /\S+/g; let x; while ((x = re.exec(n.data))) { const r = document.createRange(); r.setStart(n, x.index); r.setEnd(n, x.index + x[0].length);
          const rs = [...r.getClientRects()].filter(q => q.width > 0.5); const tops = [...new Set(rs.map(q => Math.round(q.top)))]; words.push({ w: x[0], lines: tops.length, rects: rs.map(q => [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]) }); } }
        const hb = h.getBoundingClientRect(), cs = getComputedStyle(h); return { text: h.innerText.replace(/\n/g, ' / '), fs: cs.fontSize, ow: cs.overflowWrap, wb: cs.wordBreak, split: words.filter(x => x.lines > 1).map(x => x.w), words, sw: document.documentElement.scrollWidth, iw: innerWidth, h1Right: Math.round(hb.right) }; });
      if (!m) { out.push({ s, w, none: true }); continue; }
      m.ok = !m.split.length && m.sw <= m.iw && m.h1Right <= m.iw; out.push({ s, w, ...m });
      if (only) await p.screenshot({ path: `/workspace/qa-title-${s}${hash ? '-recv' : ''}-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(700, (await p.evaluate(() => Math.ceil(document.querySelector('h1').getBoundingClientRect().bottom + 40)))) } });
    } }
  const fails = out.filter(r => !r.none && !r.ok); console.log(JSON.stringify({ fails: fails.map(f => ({ s: f.s, w: f.w, text: f.text, split: f.split, fs: f.fs, sw: f.sw })), checked: out.length, noH1: out.filter(r => r.none).map(r => r.s + '@' + r.w), detail: only ? out.map(r => ({ w: r.w, fs: r.fs, ow: r.ow, text: r.text, words: r.words, sw: r.sw })) : undefined }, null, 1)); await b.close(); })();
