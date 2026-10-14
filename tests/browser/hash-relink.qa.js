// One tab per piece: truncated → full → different valid → empty hash. Each state must equal a fresh open of the same URL.
const { open } = require('./qa-lib');
const H = process.argv[2], only = process.argv[3];
const G = {
  'annual-review': `Promise.all(['Alpha','Bravo'].map(n=>AR.encode({name:n,period:'2026',rev:'',extra:'',closer:0,moments:[0,1,2].map(i=>({cat:i,frame:0,rating:0,text:n+' moment '+i}))})))`,
  'here-it-comes': `[HIC.encode('lob','Alpha note'),HIC.encode('lob','Bravo note')]`,
  'our-knock': `[OK.encode([300,300,300],'Alpha note'),OK.encode([200,500,200,500],'Bravo note')]`,
  'cheers': `[CH.encode('Alpha toast'),CH.encode('Bravo toast')]`,
  'one-across': `[OA.encode('KITCHEN','Alpha clue',12345),OA.encode('GARDEN','Bravo clue',999)]`,
  'eyes-closed': `[EC.encode([[[100,100],[400,400],[700,120]]],{t:'Alpha cat'}),EC.encode([[[100,700],[400,100]]],{t:'Bravo dog'})]`,
  'score-this': `[1,2].map(k=>ST.encode([1,2,3].map(p=>ST.ids(COPY,p)[k])))`,
  'this-light': `[TL.encode('tok'),TL.encode('rey')]`,
  'wishbone': `[WB.encode({side:'l',names:['Alpha','Ann']}),WB.encode({side:'r',names:['Bravo','Bob']})]`,
  'where-you-paused': `[WP.encode({text:'Alpha message here',marks:[]}),WP.encode({text:'Bravo message there',marks:[]})]`,
  'a-plant-from-this': `[PL.encode('Alpha phrase','Alpha note'),PL.encode('Bravo phrase','Bravo note')]`,
  'wear-this': `[WTM.encode(WTM.blank()),WTM.encode({head:{s:2,c:3},top:{s:2,c:2},bottom:{s:2,c:4},shoes:{s:2,c:5},k:5})]`,
  'fogged-over': `[FO.encode([[[.1,.1],[.9,.9]]]),FO.encode([[[.1,.9],[.9,.1]],[[.5,.1],[.5,.9]]])]`,
  'catch-this-yawn': `[CY.encode('Alpha yawn'),CY.encode('Bravo yawn')]`,
  'taste-like-this': `[TT.encode({sweet:1,salt:2,heat:3},'Alpha soup'),TT.encode({sweet:3,salt:0,heat:1},'Bravo pie')]`,
  'until-then': `[UT.encode('Alpha lamp',Date.now()+864e5),UT.encode('Bravo lamp',Date.now()+2*864e5)]`,
  'permission-slip': `[PS.encode({id:'p1',to:'Ann',from:'Alpha',why:'Alpha reason'}),PS.encode({id:'p2',to:'Bob',from:'Bravo',why:'Bravo reason'})]`,
  'dont-mention-it': `[DM.encode('m1','Alpha'),DM.encode('m2','Bravo')]`,
  'not-on-the-screen': `[NOS.encode('c1','c4'),NOS.encode('c6','c3')]`,
  'ask-me-at-four': `[AM.encode('Alpha promise','Ann',Date.now()+36e5),AM.encode('Bravo promise','Bob',Date.now()+72e5)]`,
};
const norm = t => t.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
(async () => {
  const { b, p } = await open(H, '172.66.45.46'); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('dialog', d => d.dismiss().catch(() => {}));
  const q = await b.newPage(); q.on('dialog', d => d.dismiss().catch(() => {})); q.on('pageerror', e => errs.push('fresh: ' + e)); p.setDefaultTimeout(20000); q.setDefaultTimeout(20000); await q.setRequestInterception?.(false); const out = [];
  await p.setViewport({ width: 390, height: 844 }); await q.setViewport({ width: 390, height: 844 });
  const snap = async pg => { await new Promise(r => setTimeout(r, 1500)); const pre = await pg.evaluate(() => document.body.innerText); for (const id of ['read', 'reveal']) await pg.$eval('#' + id, e => e.offsetParent && e.click()).catch(() => {}); await new Promise(r => setTimeout(r, 2500)); const o = await pg.evaluate(() => ({ text: document.body.innerText, url: location.href, fp: document.body.innerText + [...document.querySelectorAll('svg')].map(e => e.outerHTML).join('') + [...document.querySelectorAll('canvas')].map(c => { try { return c.toDataURL(); } catch (e) { return ''; } }).join('') + [...document.querySelectorAll('[style]')].map(e => e.getAttribute('style')).join('') })); o.text = pre; return o; };
  for (const s of Object.keys(G)) { if (only && s !== only) continue;
    try {
    const base = 'https://' + H + '/' + s + '/';
    await p.goto('about:blank'); await p.goto(base, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 400));
    const [A, B] = await p.evaluate(`(async()=>await (${G[s]}))()`); const bad = await p.evaluate(() => COPY.badLink);
    const steps = [['truncated', A.slice(0, Math.floor(A.length * 0.6))], ['full', A], ['other', B], ['empty', '']];
    const row = { s, steps: {} };
    for (const [name, h] of steps) {
      await p.bringToFront(); await p.goto(base + '#' + h).catch(() => {}); const got = await snap(p);
      await q.bringToFront(); await q.goto('about:blank'); await q.goto(base + '#' + h, { waitUntil: 'load' }); const fresh = await snap(q);
      const st = { same: norm(got.fp) === norm(fresh.fp), // compared after the settle wait so typing/replay animations have finished
      badShown: got.text.includes(bad), len: got.text.length };
      st.ok = st.same && (name === 'truncated' ? st.badShown : !st.badShown);
      if (!st.same) { const A1 = norm(got.fp), B1 = norm(fresh.fp); let i = 0; while (i < A1.length && A1[i] === B1[i]) i++; st.diff = [A1.slice(Math.max(0, i - 80), i + 120), B1.slice(Math.max(0, i - 80), i + 120)]; }
      st.text = got.fp; row.steps[name] = st;
    }
    row.distinct = row.steps.full.text !== row.steps.other.text && row.steps.full.text !== row.steps.empty.text; for (const v of Object.values(row.steps)) delete v.text; row.ok = Object.values(row.steps).every(x => x.ok) && row.distinct;
    out.push(row); console.error(s, row.ok ? 'OK' : JSON.stringify(row.steps));
    } catch (e) { out.push({ s, ok: false, steps: {}, error: String(e).slice(0, 200) }); console.error(s, 'ERROR', String(e).slice(0, 200)); }
  }
  // full vs other must differ (content actually swapped) — recheck in one tab
  console.log(JSON.stringify({ fails: out.filter(r => !r.ok), pieces: out.length, summary: out.map(r => r.s + ': ' + Object.entries(r.steps).map(([k, v]) => k + '=' + (v.ok ? 'ok' : 'FAIL')).join(' ')), errs }, null, 1));
  await b.close();
})();
