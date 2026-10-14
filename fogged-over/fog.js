// Builds the wipe mask from simplified polylines (normalized 0..1 coords). Reference implementation.
function foMask(el,lines,width){
  const r=el.getBoundingClientRect(),W=r.width,H=r.height,sw=width||Math.max(16,Math.min(W,H*4/3)*0.028);
  // drawing space is a fixed 4:3 box, centered in the pane (no stretching between devices)
  const k=Math.min(W/4,H/3),bw=4*k,bh=3*k,ox=(W-bw)/2,oy=(H-bh)/2;
  const d=lines.map(l=>'M'+l.map(([x,y])=>`${(ox+x*bw).toFixed(1)} ${(oy+y*bh).toFixed(1)}`).join(' L')).join(' ');
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}'><path d='${d}' fill='none' stroke='black' stroke-width='${sw}' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  const u=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  el.style.setProperty('--fo-wipe',u);
  el.style.webkitMaskImage=`${u}, linear-gradient(#000 0 0)`;el.style.maskImage=`${u}, linear-gradient(#000 0 0)`;
  el.style.webkitMaskComposite='xor';el.style.maskComposite='exclude';el.style.maskRepeat='no-repeat';el.style.webkitMaskRepeat='no-repeat';
}
// heart + "hi"
const FO_DEMO=[[[.30,.42],[.27,.33],[.31,.27],[.37,.28],[.40,.35],[.43,.28],[.49,.27],[.53,.33],[.50,.42],[.40,.55],[.30,.42]],
 [[.62,.28],[.62,.55]],[[.62,.42],[.66,.38],[.70,.39],[.71,.45],[.71,.55]],[[.78,.40],[.78,.55]],[[.78,.31],[.78,.32]]];
