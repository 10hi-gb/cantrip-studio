'use strict';
// C087 Wear This — four independent slots; the link carries only IDs: "w1.h3c2.t1c4.b2c1.s5c3.k3" (h0 = empty slot).
var WT = (function (L) {
  var SLOTS = ['head', 'top', 'bottom', 'shoes'], LET = { head: 'h', top: 't', bottom: 'b', shoes: 's' };
  var COLORS = { c1: '#2346D8', c2: '#F2492A', c3: '#FFC02E', c4: '#3FBF97', c5: '#6B2D7A', c6: '#1D1B26' };
  var SKIN = { k1: '#F6D7BF', k2: '#E8B894', k3: '#C98D62', k4: '#A86B45', k5: '#7A4A2E', k6: '#4E2E1C' };
  var DEF = { head: 'h1c6', top: 't1c1', bottom: 'b1c1', shoes: 's1c6' };
  function blank() { return { head: { s: 1, c: 6 }, top: { s: 1, c: 1 }, bottom: { s: 1, c: 1 }, shoes: { s: 1, c: 6 }, k: 3 }; }
  function encode(o) { return L.seal(['w1', SLOTS.map(function (k) { var v = o[k]; return LET[k] + (v ? v.s + 'c' + v.c : '0'); }).join('.') + '.k' + o.k]); }
  // Returns {o, unknown} or null. Unknown/invalid IDs within a valid sealed link -> slot empty + unknown=true.
  function decode(f) {
    var a = L.unseal(f, 120); if (!a || a.length !== 2 || a[0] !== 'w1') return null;
    var parts = a[1].split('.'); if (parts.length !== 5) return null;
    var o = {}, unknown = false;
    for (var i = 0; i < 4; i++) {
      var k = SLOTS[i], p = parts[i]; if (p[0] !== LET[k]) return null;
      var m = /^[a-z]([1-6])c([1-6])$/.exec(p);
      if (p === LET[k] + '0') o[k] = null; else if (m) o[k] = { s: +m[1], c: +m[2] }; else { o[k] = null; unknown = true; }
    }
    var km = /^k([1-6])$/.exec(parts[4]); o.k = km ? +km[1] : 3; if (!km) unknown = true;
    return { o: o, unknown: unknown };
  }
  return { SLOTS: SLOTS, LET: LET, COLORS: COLORS, SKIN: SKIN, blank: blank, encode: encode, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = WT;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var P = typeof PENDING !== 'undefined' ? PENDING : {}, NAMES = COPY.items || P.items, CN = COPY.colors || P.colors, SK = COPY.skin || P.skin;
  var INK = '#1D1B26', o = WT.blank(), recv = false;
  // ---- shapes (fixed, body-neutral doll; viewBox 200x400) ----
  var SH = {
    h: [null,
      function (c) { return '<path d="M68 58 Q70 22 100 20 Q132 22 133 58 Q126 40 100 38 Q76 40 68 58Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M66 60 Q64 18 100 18 Q138 18 135 60 L140 128 Q126 132 122 112 L122 62 Q100 44 78 62 L78 112 Q74 132 60 128Z" fill="' + c + '"/>'; },
      function (c) { return '<g fill="' + c + '"><circle cx="100" cy="30" r="22"/><circle cx="76" cy="40" r="16"/><circle cx="124" cy="40" r="16"/><circle cx="68" cy="58" r="10"/><circle cx="132" cy="58" r="10"/></g>'; },
      function (c) { return '<path d="M66 54 Q66 16 100 16 Q134 16 134 54Z" fill="' + c + '"/><rect x="62" y="48" width="76" height="12" rx="5" fill="' + c + '" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/><circle cx="100" cy="13" r="7" fill="' + c + '"/>'; },
      function (c) { return '<path d="M74 44 Q76 16 100 16 Q124 16 126 44Z" fill="' + c + '"/><path d="M52 52 Q100 34 148 52 L140 60 Q100 46 60 60Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M64 66 Q60 16 100 16 Q140 16 136 66 Q120 46 100 46 Q80 46 64 66Z" fill="' + c + '"/><path d="M128 58 Q148 70 142 92 L132 88 Q136 72 124 64Z" fill="' + c + '"/><path d="M70 34 Q100 24 130 34" stroke="#fff" stroke-width="3" fill="none"/>'; }],
    t: [null,
      function (c) { return '<path d="M66 100 L134 100 L158 132 L142 144 L134 132 L134 212 L66 212 L66 132 L58 144 L42 132Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M66 100 L134 100 L156 196 L142 200 L134 140 L134 212 L66 212 L66 140 L58 200 L44 196Z" fill="' + c + '"/><g stroke="#fff" stroke-width="5"><path d="M66 126h68M66 152h68M66 178h68M66 204h68"/></g>'; },
      function (c) { return '<path d="M64 98 L136 98 L158 198 L142 202 L134 146 L136 216 L64 216 L66 146 L58 202 L42 198Z" fill="' + c + '"/><path d="M76 98 Q100 126 124 98" fill="none" stroke="#fff" stroke-width="4"/><rect x="80" y="170" width="40" height="22" rx="6" fill="none" stroke="#fff" stroke-width="3"/>'; },
      function (c) { return '<path d="M66 100 L134 100 L134 212 L66 212Z" fill="#fff"/><path d="M64 98 L94 98 L94 214 L64 214 L60 200 L44 196 L66 100Z M106 98 L136 98 L156 196 L140 200 L136 214 L106 214Z" fill="' + c + '"/><g fill="#fff"><circle cx="88" cy="130" r="3"/><circle cx="88" cy="160" r="3"/><circle cx="88" cy="190" r="3"/></g>'; },
      function (c) { return '<path d="M66 100 L134 100 L156 196 L142 200 L134 140 L134 212 L66 212 L66 140 L58 200 L44 196Z" fill="' + c + '"/><path d="M100 100 L100 212" stroke="#fff" stroke-width="3"/><path d="M84 100 L100 116 L116 100" fill="#fff"/><g fill="#fff"><circle cx="106" cy="134" r="3"/><circle cx="106" cy="160" r="3"/><circle cx="106" cy="186" r="3"/></g>'; },
      function (c) { return '<path d="M60 96 L140 96 L162 198 L144 204 L138 150 L140 218 L60 218 L62 150 L56 204 L38 198Z" fill="' + c + '"/><g stroke="#fff" stroke-width="3" fill="none"><path d="M60 126h80M58 156h84M58 186h84"/><path d="M100 96v122"/></g>'; }],
    b: [null,
      function (c) { return '<path d="M68 210 L132 210 L130 350 L106 350 L100 250 L94 350 L70 350Z" fill="' + c + '"/><path d="M100 214v30" stroke="#fff" stroke-width="2"/>'; },
      function (c) { return '<path d="M68 210 L132 210 L134 270 L104 270 L100 246 L96 270 L66 270Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M70 210 L130 210 L150 318 L50 318Z" fill="' + c + '"/><path d="M66 300 L134 300" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/>'; },
      function (c) { return '<path d="M68 210 L132 210 L146 352 L106 352 L100 252 L94 352 L54 352Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M74 140 L126 140 L126 210 L132 210 L130 350 L106 350 L100 250 L94 350 L70 350 L68 210 L74 210Z" fill="' + c + '"/><path d="M74 140 L66 100 M126 140 L134 100" stroke="' + c + '" stroke-width="8"/><rect x="88" y="156" width="24" height="18" rx="3" fill="none" stroke="#fff" stroke-width="3"/>'; },
      function (c) { return '<path d="M66 208 L134 208 L132 340 Q120 352 106 340 L100 250 L94 340 Q80 352 68 340Z" fill="' + c + '"/><path d="M66 218h68" stroke="#fff" stroke-width="4"/><path d="M72 336h22M106 336h22" stroke="#fff" stroke-width="4"/>'; }],
    s: [null,
      function (c) { return '<path d="M66 350 L96 350 L98 372 L58 372 Q58 358 66 350Z M104 350 L134 350 Q142 358 142 372 L102 372Z" fill="' + c + '"/><path d="M58 368h40M102 368h40" stroke="#fff" stroke-width="4"/>'; },
      function (c) { return '<path d="M68 318 L96 318 L98 374 L56 374 Q56 360 68 352Z M104 318 L132 318 L132 352 Q144 360 144 374 L102 374Z" fill="' + c + '"/>'; },
      function (c) { return '<path d="M60 366h38v8H60zM102 366h38v8h-38z" fill="' + c + '"/><path d="M68 366 L80 352 L92 366 M108 366 L120 352 L132 366" stroke="' + c + '" stroke-width="5" fill="none"/>'; },
      function (c) { return '<path d="M64 354 L96 354 L98 372 L58 372 Q58 360 64 354Z M104 354 L136 354 Q142 360 142 372 L102 372Z" fill="' + c + '"/><path d="M70 358h18M112 358h18" stroke="#fff" stroke-width="3"/>'; },
      function (c) { return '<path d="M66 300 L98 300 L98 376 L54 376 Q54 360 66 352Z M102 300 L134 300 L134 352 Q146 360 146 376 L102 376Z" fill="' + c + '"/><path d="M66 312h32M102 312h32" stroke="#fff" stroke-width="3"/>'; },
      function (c) { return '<path d="M60 358 Q60 348 78 348 Q98 348 98 362 L98 374 L60 374Z M102 362 Q102 348 122 348 Q140 348 140 358 L140 374 L102 374Z" fill="' + c + '"/><circle cx="76" cy="354" r="6" fill="#fff"/><circle cx="124" cy="354" r="6" fill="#fff"/>'; }]
  };
  var ORDER = ['bottom', 'shoes', 'top', 'head']; // overalls bib draws over top: special-cased below
  function body(skin) { return '<g fill="' + skin + '" stroke="' + INK + '" stroke-width="2.5"><rect x="88" y="84" width="24" height="22" rx="6"/><path d="M66 100 L134 100 L156 196 L140 200 L132 140 L132 212 L68 212 L68 140 L60 200 L44 196Z"/><path d="M70 208 L130 208 L128 356 L104 356 L100 250 L96 356 L72 356Z"/><path d="M62 356h36v14H58z M102 356h36l4 14h-40z"/><circle cx="100" cy="58" r="32"/></g><g fill="' + INK + '"><circle cx="89" cy="58" r="3.5"/><circle cx="111" cy="58" r="3.5"/></g><path d="M90 72 Q100 80 110 72" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'; }
  function piece(slot, v) { return v ? '<g class="pc" data-slot="' + slot + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round">' + SH[WT.LET[slot]][v.s](WT.COLORS['c' + v.c]) + '</g>' : ''; }
  function itemName(slot, v) { return v ? L.fill(P.colorItem || '{color} {item}', { color: CN['c' + v.c], item: NAMES[WT.LET[slot] + v.s] }) : COPY.nothing; }
  function render(drop) {
    var bibTop = o.bottom && o.bottom.s === 5, svg = '<rect x="0" y="376" width="200" height="6" rx="3" fill="rgba(29,27,38,.15)"/>' + body(WT.SKIN['k' + o.k]);
    svg += piece('shoes', o.shoes) + (bibTop ? piece('top', o.top) + piece('bottom', o.bottom) : piece('bottom', o.bottom) + piece('top', o.top)) + piece('head', o.head);
    var d = $('doll'); d.innerHTML = svg; // markup is built only from fixed shapes + validated numeric IDs, never visitor text
    if (drop) { var g = d.querySelector('.pc[data-slot="' + drop + '"]'); if (g && !L.reduce) g.classList.add('drop'); }
    d.setAttribute('aria-label', L.fill(COPY.dollAlt, { head: itemName('head', o.head), top: itemName('top', o.top), bottom: itemName('bottom', o.bottom), shoes: itemName('shoes', o.shoes) }));
    syncControls();
  }
  // ---- controls: per slot a radiogroup of shapes + a radiogroup of colors; roving tabindex; arrows move, Enter/Space puts on ----
  var panels = {};
  function radiogroup(host, items, isOn, onPick, label) {
    host.setAttribute('role', 'radiogroup'); host.setAttribute('aria-label', label);
    items.forEach(function (it, i) { var b = it.el; b.setAttribute('role', 'radio'); b.type = 'button';
      b.onclick = function () { onPick(it.v); };
      b.onkeydown = function (e) { var k = e.key, n = items.length, j = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[k];
        if (j != null) { e.preventDefault(); j = (j + n) % n; items.forEach(function (x) { x.el.tabIndex = -1; }); items[j].el.tabIndex = 0; items[j].el.focus(); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); onPick(it.v); } };
      host.appendChild(b); });
    host._items = items; host._isOn = isOn;
  }
  function buildSlot(slot) {
    var L1 = WT.LET[slot], sec = document.createElement('section'); sec.className = 'wt-slot'; sec.dataset.slot = slot; sec.id = 'slot-' + slot;
    var tab = document.createElement('h2'); tab.className = 'wt-tab'; tab.textContent = COPY.slots[slot]; tab.id = 'tab-' + slot; sec.appendChild(tab);
    var opts = document.createElement('div'); opts.className = 'wt-opts';
    var items = [1, 2, 3, 4, 5, 6].map(function (s) { var b = document.createElement('button'); b.className = 'wt-opt'; b.dataset.on = COPY.selected;
      b.innerHTML = '<svg viewBox="' + ({ h: '40 8 120 80', t: '36 92 128 130', b: '44 200 112 160', s: '50 296 100 84' })[L1] + '" aria-hidden="true"><g stroke="' + INK + '" stroke-width="3">' + SH[L1][s]('#6B6880') + '</g></svg>';
      var t = document.createElement('span'); t.textContent = NAMES[L1 + s]; b.appendChild(t); b.setAttribute('aria-label', L.fill(COPY.choiceAria, { slot: COPY.slots[slot], item: NAMES[L1 + s] })); return { el: b, v: s }; });
    radiogroup(opts, items, function (v) { return o[slot] && o[slot].s === v; }, function (v) { o[slot] = { s: v, c: o[slot] ? o[slot].c : 1 }; changed(slot); }, COPY.slots[slot]);
    sec.appendChild(opts);
    var sw = document.createElement('div'); sw.className = 'wt-sw';
    var cit = [1, 2, 3, 4, 5, 6].map(function (c) { var b = document.createElement('button'); b.style.background = WT.COLORS['c' + c]; b.setAttribute('aria-label', CN['c' + c]); b.title = CN['c' + c]; return { el: b, v: c }; });
    radiogroup(sw, cit, function (v) { return o[slot] && o[slot].c === v; }, function (v) { o[slot] = { s: o[slot] ? o[slot].s : 1, c: v }; changed(slot); }, COPY.slots[slot] + ' · ' + (P.colorLabel || ''));
    var off = document.createElement('button'); off.className = 'wt-off'; off.type = 'button'; off.textContent = COPY.clearSlot; off.onclick = function () { o[slot] = null; changed(slot); }; sw.appendChild(off);
    sec.appendChild(sw); panels[slot] = { sec: sec, opts: opts, sw: sw };
    return sec;
  }
  function syncGroup(g) { var on = -1; g._items.forEach(function (it, i) { var a = g._isOn(it.v); it.el.setAttribute('aria-checked', String(a)); if (a) on = i; });
    var foc = g._items.some(function (it) { return it.el === document.activeElement; }); if (!foc) g._items.forEach(function (it, i) { it.el.tabIndex = i === (on < 0 ? 0 : on) ? 0 : -1; }); }
  function syncControls() { WT.SLOTS.forEach(function (s) { if (!panels[s]) return; syncGroup(panels[s].opts); syncGroup(panels[s].sw); }); if (skinG) syncGroup(skinG); }
  function changed(slot) { render(slot); $('linkbox').hidden = true; status(); }
  function status() { var n = WT.SLOTS.filter(function (s) { return !o[s]; }).length; $('msg').textContent = n === 4 ? COPY.empty : n ? L.plural(COPY.partial, n) : ''; }
  $('rail-l').appendChild(buildSlot('head')); $('rail-l').appendChild(buildSlot('top')); $('rail-r').appendChild(buildSlot('bottom')); $('rail-r').appendChild(buildSlot('shoes'));
  // mobile drawer tabs
  WT.SLOTS.forEach(function (s, i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = COPY.slots[s]; b.setAttribute('aria-controls', 'slot-' + s);
    b.onclick = function () { activate(s); }; $('tabs').appendChild(b); });
  function activate(s) { WT.SLOTS.forEach(function (x, i) { panels[x].sec.classList.toggle('is-active', x === s); $('tabs').children[i].setAttribute('aria-selected', String(x === s)); }); }
  activate('head');
  var skinG = $('skin'); var sk = [1, 2, 3, 4, 5, 6].map(function (k) { var b = document.createElement('button'); b.style.background = WT.SKIN['k' + k]; b.setAttribute('aria-label', SK['k' + k]); return { el: b, v: k }; });
  radiogroup(skinG, sk, function (v) { return o.k === v; }, function (v) { o.k = v; render(); }, P.skinLabel || '');
  $('shuffle').onclick = function () { var r = new Uint8Array(9); crypto.getRandomValues(r); WT.SLOTS.forEach(function (s, i) { o[s] = { s: 1 + r[i] % 6, c: 1 + r[i + 4] % 6 }; }); render('head'); status(); };
  $('send').onclick = function () { L.share(L.link(WT.encode(o)), COPY.title, COPY.shareText); };
  function save() {
    try { var xml = new XMLSerializer().serializeToString($('doll')).replace('<svg', '<svg width="600" height="1200"'), img = new Image();
      img.onload = function () { var c = document.createElement('canvas'); c.width = 600; c.height = 1200; var x = c.getContext('2d'); x.fillStyle = '#FFF6E5'; x.fillRect(0, 0, 600, 1200); x.drawImage(img, 0, 0, 600, 1200);
        c.toBlob(function (b) { if (!b) return L.toast(COPY.saveFail); var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'wear-this.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); L.toast(COPY.saved); }); };
      img.onerror = function () { L.toast(COPY.saveFail); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); } catch (e) { L.toast(COPY.saveFail); }
  }
  $('save').onclick = save; $('save2').onclick = save;
  function setRecv(on) { recv = on; $('root').classList.toggle('is-recv', on); $('make-actions').hidden = on; $('recv-actions').hidden = !on; $('hint').hidden = on; $('meet').hidden = on; }
  $('mine').onclick = function () { L.clearHash(); o = WT.blank(); setRecv(false); $('lede').textContent = COPY.invitation; render(); status(); };
  $('edit').onclick = function () { L.clearHash(); setRecv(false); $('lede').textContent = COPY.invitation; status(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = WT.decode(h);
    if (r) { o = r.o; setRecv(true); $('lede').textContent = COPY.receiverIntro; if (r.unknown) $('msg').textContent = COPY.unknownItem; }
    else { $('lede').textContent = COPY.badLink; }
  }
  render(); if (!recv && !(h && h !== '#')) status();
})();
