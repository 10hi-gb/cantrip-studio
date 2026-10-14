// Wear This reference shape library (Creative). IDs match SHAPES.md. viewBox 0 0 200 400.
const WT_C={c1:'#2346D8',c2:'#F2492A',c3:'#FFC02E',c4:'#3FBF97',c5:'#6B2D7A',c6:'#1D1B26'};
const WT_SKIN={k1:'#F6D7C3',k2:'#E8B896',k3:'#C98E66',k4:'#9C6644',k5:'#6E4630',k6:'#43291C'};
const K='stroke="#1D1B26" stroke-width="3" stroke-linejoin="round"';
const hi=c=>(c==='#FFC02E'||c==='#3FBF97')?'#1D1B26':'#FFFFFF';
const WT={
 head:{
  h1:c=>`<path d="M66 62 C64 26 136 22 134 60 C126 44 104 40 88 46 C80 48 72 54 66 62Z" fill="${c}" ${K}/>`,
  h2:c=>`<path d="M64 60 C60 22 140 22 136 60 L142 130 L120 128 L128 70 C116 46 84 46 72 70 L80 128 L58 130Z" fill="${c}" ${K}/>`,
  h3:c=>`<g fill="${c}" ${K}>${[[70,44],[88,30],[108,28],[128,40],[138,60],[62,62],[80,22],[120,24]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="17"/>`).join('')}</g>`,
  h4:c=>`<path d="M64 58 C62 18 138 18 136 58Z" fill="${c}" ${K}/><rect x="60" y="52" width="80" height="14" rx="6" fill="${c}" ${K}/><path d="M72 52v14M84 52v14M96 52v14M108 52v14M120 52v14M132 52v14" stroke="${hi(c)}" stroke-width="2"/><circle cx="100" cy="18" r="8" fill="${c}" ${K}/>`,
  h5:c=>`<g transform="translate(0 -14)"><path d="M70 50 C70 20 130 20 130 50Z" fill="${c}" ${K}/><path d="M52 64 L70 46 L130 46 L148 64Z" fill="${c}" ${K}/><path d="M70 50h60" stroke="${hi(c)}" stroke-width="3"/></g>`,
  h6:c=>`<path d="M62 74 C56 20 144 20 138 74 C130 54 70 54 62 74Z" fill="${c}" ${K}/><path d="M132 66 l22 14 l-10 6 l6 16 l-18 -12Z" fill="${c}" ${K}/><path d="M74 40 q26 -10 52 0" stroke="${hi(c)}" stroke-width="3" fill="none" stroke-dasharray="4 5"/>`},
 top:{
  t1:c=>`<path d="M62 104 L42 128 L56 144 L66 134 L66 214 L134 214 L134 134 L144 144 L158 128 L138 104 L116 98 Q100 112 84 98Z" fill="${c}" ${K}/>`,
  t2:c=>`<path d="M62 104 L36 196 L54 200 L66 140 L66 214 L134 214 L134 140 L146 200 L164 196 L138 104 L116 98 Q100 112 84 98Z" fill="${c}" ${K}/><path d="M68 132h64M67 152h66M67 172h66M67 192h66" stroke="${hi(c)}" stroke-width="6"/>`,
  t3:c=>`<path d="M80 100 Q100 76 120 100" fill="${c}" ${K}/><path d="M62 104 L36 196 L54 200 L66 140 L66 216 L134 216 L134 140 L146 200 L164 196 L138 104 L116 98 Q100 112 84 98Z" fill="${c}" ${K}/><path d="M78 176 h44 v24 h-44Z" fill="none" stroke="${hi(c)}" stroke-width="3"/><path d="M94 104v22M106 104v22" stroke="${hi(c)}" stroke-width="3"/>`,
  t4:c=>`<path d="M66 104 L66 214 L134 214 L134 104 Q100 116 66 104Z" fill="#FFFFFF" ${K}/><path d="M62 104 L36 196 L54 200 L66 140 L66 216 L94 216 L92 108 L84 98Z M138 104 L164 196 L146 200 L134 140 L134 216 L108 216 L110 108 L116 98Z" fill="${c}" ${K}/><circle cx="88" cy="150" r="3" fill="${hi(c)}"/><circle cx="88" cy="175" r="3" fill="${hi(c)}"/>`,
  t5:c=>`<path d="M62 104 L36 196 L54 200 L66 140 L66 214 L134 214 L134 140 L146 200 L164 196 L138 104 L116 98 L100 112 L84 98Z" fill="${c}" ${K}/><path d="M84 98 L92 120 L100 112 L108 120 L116 98" fill="#FFFFFF" ${K}/><path d="M100 114v98" stroke="#1D1B26" stroke-width="2"/>${[132,152,172,192].map(y=>`<circle cx="104" cy="${y}" r="2.6" fill="${hi(c)}"/>`).join('')}`,
  t6:c=>`<path d="M58 102 L30 198 L52 204 L62 146 L60 220 L140 220 L138 146 L148 204 L170 198 L142 102 L116 94 Q100 108 84 94Z" fill="${c}" ${K}/><path d="M61 130h78M61 156h78M61 182h78M61 206h78" stroke="${hi(c)}" stroke-width="2.5"/><path d="M100 100v120" stroke="#1D1B26" stroke-width="2.5"/>`},
 bottom:{
  b1:c=>`<path d="M66 210 L134 210 L136 350 L106 350 L100 240 L94 350 L64 350Z" fill="${c}" ${K}/><path d="M100 212v28" stroke="${hi(c)}" stroke-width="2" stroke-dasharray="3 3"/>`,
  b2:c=>`<path d="M66 210 L134 210 L138 270 L106 272 L100 240 L94 272 L62 270Z" fill="${c}" ${K}/>`,
  b3:c=>`<path d="M68 208 L132 208 L152 316 L48 316Z" fill="${c}" ${K}/><path d="M80 230 l-10 80M100 230v84M120 230 l10 80" stroke="${hi(c)}" stroke-width="2" opacity=".6"/>`,
  b4:c=>`<path d="M66 210 L134 210 L148 350 L106 350 L100 246 L94 350 L52 350Z" fill="${c}" ${K}/>`,
  b5:c=>`<path d="M74 150 L126 150 L128 212 L72 212Z" fill="${c}" ${K}/><path d="M74 152 L66 104 M126 152 L134 104" stroke="${c}" stroke-width="7"/><path d="M66 210 L134 210 L136 350 L106 350 L100 240 L94 350 L64 350Z" fill="${c}" ${K}/><rect x="86" y="164" width="28" height="20" rx="3" fill="none" stroke="${hi(c)}" stroke-width="2.5"/>`,
  b6:c=>`<path d="M64 210 L136 210 L138 338 L106 340 L100 240 L94 340 L62 338Z" fill="${c}" ${K}/><path d="M62 338h32v12h-32ZM106 338h32v12h-32Z" fill="${c}" ${K}/><path d="M118 220v100" stroke="${hi(c)}" stroke-width="3"/><path d="M82 220v100" stroke="${hi(c)}" stroke-width="3"/>`},
 shoes:{
  s1:c=>`<g ${K}><path d="M62 344 h32 l4 18 h-44 q-2 -10 8 -18Z" fill="${c}"/><path d="M106 344 h32 q10 8 8 18 h-44Z" fill="${c}"/><path d="M54 362h44v8h-44ZM102 362h44v8h-44Z" fill="#FFFFFF"/></g>`,
  s2:c=>`<g ${K}><path d="M64 320 h30 v42 h-40 q0 -12 10 -14Z" fill="${c}"/><path d="M106 320 h30 v28 q10 2 10 14 h-40Z" fill="${c}"/><path d="M54 362h40v8h-40ZM106 362h40v8h-40Z" fill="#1D1B26"/></g>`,
  s3:c=>`<g ${K}><path d="M56 364h40v6h-40ZM104 364h40v6h-40Z" fill="#C9A77C"/><path d="M64 364 l8 -16 l8 16 M70 356 h16 M112 364 l8 -16 l8 16 M118 356 h16" fill="none" stroke="${c}" stroke-width="6"/></g>`,
  s4:c=>`<g ${K}><path d="M60 350 h34 v14 h-42 q0 -10 8 -14Z" fill="${c}"/><path d="M106 350 h34 q8 4 8 14 h-42Z" fill="${c}"/><path d="M66 356h20M114 356h20" stroke="${hi(c)}" stroke-width="3"/></g>`,
  s5:c=>`<g ${K}><path d="M62 300 h34 v66 h-44 q0 -10 10 -12Z" fill="${c}"/><path d="M104 300 h34 v54 q10 2 10 12 h-44Z" fill="${c}"/><path d="M68 310 v40M112 310 v40" stroke="#FFFFFF" stroke-width="4" opacity=".55"/></g>`,
  s6:c=>`<g ${K}><ellipse cx="76" cy="360" rx="26" ry="12" fill="${c}"/><ellipse cx="124" cy="360" rx="26" ry="12" fill="${c}"/><path d="M58 354 q18 -14 36 0M106 354 q18 -14 36 0" fill="#FFFFFF"/></g>`}
};
function wtDoll(o){ // o={skin,head:[id,col],top,bottom,shoes}; any slot may be null
  const s=WT_SKIN[o.skin||'k3'],g=(slot)=>o[slot]?`<g class="wt-wear">${WT[slot][o[slot][0]](WT_C[o[slot][1]])}</g>`:'';
  const back=o.head&&o.head[0]==='h2'?g('head'):'';
  return `<svg viewBox="0 0 200 400" role="img">${back}
  <g ${K}><rect x="88" y="86" width="24" height="20" fill="${s}"/><path d="M62 104 L38 196 L54 200 L68 140Z M138 104 L162 196 L146 200 L132 140Z" fill="${s}"/><rect x="66" y="100" width="68" height="114" rx="20" fill="${s}"/>
  <path d="M68 210 L98 210 L96 352 L70 352Z M102 210 L132 210 L130 352 L104 352Z" fill="${s}"/><circle cx="100" cy="62" r="32" fill="${s}"/></g>
  <circle cx="89" cy="62" r="3.5" fill="#1D1B26"/><circle cx="111" cy="62" r="3.5" fill="#1D1B26"/><path d="M90 76 q10 8 20 0" fill="none" stroke="#1D1B26" stroke-width="3" stroke-linecap="round"/>
  ${o.bottom&&o.bottom[0]==='b5'?g('top')+g('bottom'):g('bottom')+g('top')}${g('shoes')}${back?'':g('head')}</svg>`;
}
const WT_THUMB={head:'40 0 120 120',top:'26 84 148 148',bottom:'40 200 120 160',shoes:'44 296 112 80'};
function wtThumb(slot,id,col){return `<svg viewBox="${WT_THUMB[slot]}" aria-hidden="true">${WT[slot][id](WT_C[col])}</svg>`}
