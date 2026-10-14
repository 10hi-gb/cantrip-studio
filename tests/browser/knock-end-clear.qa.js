// Results go to argv[3] (default /workspace/qa-knock-end-<host8>.json), rewritten after every case so an interrupted run still leaves data.
const OUT=process.argv[3]||'/workspace/qa-knock-end-'+String(process.argv[2]).slice(0,8)+'.json';
// C051 end state: knock the right rhythm for real, then measure note text rect vs the swung door's rect.
const { open } = require('./qa-lib');(async()=>{const H=process.argv[2];const {b,p,errs}=await open(H,'172.66.45.46');const res=[];
await p.goto('https://'+H+'/our-knock/',{waitUntil:'load'});const L={def:await p.evaluate(()=>OK.encode([300,300,300],'')),long:await p.evaluate(()=>OK.encode([300,300,300],'Blue gate after practice. Pneumonoultramicroscopicsilicovolcanoconiosis, bring i'))};
for(const [w,h] of [[320,700],[390,844],[768,1024],[1024,768],[1280,800]])for(const k of ['def','long']){await p.setViewport({width:w,height:h});await p.goto('about:blank');await p.goto('https://'+H+'/our-knock/#'+L[k],{waitUntil:'networkidle0'});await new Promise(r=>setTimeout(r,500));
 const d=await p.$('#door');await d.evaluate(e=>e.scrollIntoView({block:'center'}));const bb=await d.boundingBox();let real=false;
 for(let t=0;t<3&&!real;t++){for(let i=0;i<4;i++){await p.mouse.click(bb.x+bb.width/2,bb.y+bb.height/2);if(i<3)await new Promise(r=>setTimeout(r,300));}await new Promise(r=>setTimeout(r,2600));real=await p.evaluate(()=>document.getElementById('door').classList.contains('is-open'));}
 await new Promise(r=>setTimeout(r,1500));
 const m=await p.evaluate(()=>{const be=document.getElementById('behind'),door=document.getElementById('door');const r=document.createRange();r.selectNodeContents(be);const rs=[...r.getClientRects()];const t={l:Math.min(...rs.map(x=>x.left)),t:Math.min(...rs.map(x=>x.top)),r:Math.max(...rs.map(x=>x.right)),b:Math.max(...rs.map(x=>x.bottom))};
  // door's painted extent: projected corners of the rotated element
  const dr=door.getBoundingClientRect();const ov=Math.max(0,Math.min(t.r,dr.right)-Math.max(t.l,dr.left))*Math.max(0,Math.min(t.b,dr.bottom)-Math.max(t.t,dr.top));
  const R=o=>[Math.round(o.left??o.l),Math.round(o.top??o.t),Math.round((o.right??o.r)-(o.left??o.l)),Math.round((o.bottom??o.b)-(o.top??o.t))];
  return {head:document.getElementById('h').textContent,note:be.textContent.slice(0,40),noteRect:R(t),doorRect:R(dr),gapPx:Math.round(t.l-dr.right),overlapArea:Math.round(ov),sw:document.documentElement.scrollWidth,iw:innerWidth}});
 await p.screenshot({path:`/workspace/qa-knock-end-${k}-${w}.png`});res.push({w,h,k,real,...m});require('fs').writeFileSync(OUT,JSON.stringify({partial:true,res,errs},null,1));console.error(w,k,real,JSON.stringify(m));}
{const J=JSON.stringify({fails:res.filter(r=>!r.real||r.overlapArea>0||r.sw>r.iw),res,errs},null,1);require('fs').writeFileSync(OUT,J);console.log(J);}await b.close()})();
