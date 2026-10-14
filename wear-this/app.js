'use strict';
// C087 Wear This — four independent slots; the link carries only IDs: "w1.h3c2.t1c4.b2c1.s5c3.k3" (h0 = empty slot).
var WTM = (function (L) {
  var SLOTS = ['head', 'top', 'bottom', 'shoes'], LET = { head: 'h', top: 't', bottom: 'b', shoes: 's' };
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
  return { SLOTS: SLOTS, LET: LET, blank: blank, encode: encode, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = WTM;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var INK = '#1D1B26', o = WTM.blank(), recv = false;
  function sid(slot, v) { return WTM.LET[slot] + v.s; }
  function itemName(slot, v) { return v ? L.fill(COPY.itemAlt, { color: COPY.colorAlt['c' + v.c], item: COPY.items[slot][sid(slot, v)].alt }) : COPY.emptySlotAlt[slot]; }
  function render(drop) {
    var q = { skin: 'k' + o.k }; WTM.SLOTS.forEach(function (s) { q[s] = o[s] ? [sid(s, o[s]), 'c' + o[s].c] : null; });
    var d = $('doll'); d.innerHTML = '<rect x="0" y="376" width="200" height="6" rx="3" fill="rgba(29,27,38,.15)"/>' + wtDoll(q).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); // Creative doll.js: fixed shapes + validated IDs only, never visitor text
    if (drop) { var g = d.querySelector('.wt-wear'); if (g && !L.reduce) g.classList.add('drop'); }
    d.setAttribute('aria-label', L.fill(COPY.dollAlt, { skin: COPY.toneSkin['k' + o.k], head: itemName('head', o.head), top: itemName('top', o.top), bottom: itemName('bottom', o.bottom), shoes: itemName('shoes', o.shoes) }));
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
    var L1 = WTM.LET[slot], sec = document.createElement('section'); sec.className = 'wt-slot'; sec.dataset.slot = slot; sec.id = 'slot-' + slot;
    var tab = document.createElement('h2'); tab.className = 'wt-tab'; tab.textContent = COPY.slots[slot]; tab.id = 'tab-' + slot; sec.appendChild(tab);
    var opts = document.createElement('div'); opts.className = 'wt-opts';
    var items = [1, 2, 3, 4, 5, 6].map(function (s) { var b = document.createElement('button'); b.className = 'wt-opt'; b.dataset.on = COPY.selected;
      b.innerHTML = wtThumb(slot, L1 + s, 'c6');
      var t = document.createElement('span'); t.textContent = COPY.items[slot][L1 + s].name; b.appendChild(t); b.setAttribute('aria-label', L.fill(COPY.choiceAria, { slot: COPY.slots[slot], item: COPY.items[slot][L1 + s].name })); return { el: b, v: s }; });
    radiogroup(opts, items, function (v) { return o[slot] && o[slot].s === v; }, function (v) { o[slot] = { s: v, c: o[slot] ? o[slot].c : 1 }; changed(slot); }, COPY.slots[slot]);
    sec.appendChild(opts);
    var sw = document.createElement('div'); sw.className = 'wt-sw';
    var cit = [1, 2, 3, 4, 5, 6].map(function (c) { var b = document.createElement('button'); b.style.background = WT_C['c' + c]; b.setAttribute('aria-label', L.fill(COPY.colorAria, { color: COPY.colors['c' + c] })); b.title = COPY.colors['c' + c]; return { el: b, v: c }; });
    radiogroup(sw, cit, function (v) { return o[slot] && o[slot].c === v; }, function (v) { o[slot] = { s: o[slot] ? o[slot].s : 1, c: v }; changed(slot); }, COPY.slots[slot] + ' · ' + COPY.colorLabel);
    var off = document.createElement('button'); off.className = 'wt-off'; off.type = 'button'; off.textContent = COPY.clearSlot; off.setAttribute('aria-label', COPY.clearSlot + ': ' + COPY.emptySlot[slot]); off.onclick = function () { o[slot] = null; changed(slot); }; sw.appendChild(off);
    sec.appendChild(sw); panels[slot] = { sec: sec, opts: opts, sw: sw };
    return sec;
  }
  function syncGroup(g) { var on = -1; g._items.forEach(function (it, i) { var a = g._isOn(it.v); it.el.setAttribute('aria-checked', String(a)); if (a) on = i; });
    var foc = g._items.some(function (it) { return it.el === document.activeElement; }); if (!foc) g._items.forEach(function (it, i) { it.el.tabIndex = i === (on < 0 ? 0 : on) ? 0 : -1; }); }
  function syncControls() { WTM.SLOTS.forEach(function (s) { if (!panels[s]) return; syncGroup(panels[s].opts); syncGroup(panels[s].sw); }); if (skinG) syncGroup(skinG); }
  function changed(slot) { render(slot); $('linkbox').hidden = true; status(); }
  function status() { var n = WTM.SLOTS.filter(function (s) { return !o[s]; }).length; $('msg').textContent = n === 4 ? COPY.empty : n ? L.plural(COPY.partial, n) : ''; }
  $('rail-l').appendChild(buildSlot('head')); $('rail-l').appendChild(buildSlot('top')); $('rail-r').appendChild(buildSlot('bottom')); $('rail-r').appendChild(buildSlot('shoes'));
  // mobile drawer tabs
  WTM.SLOTS.forEach(function (s, i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = COPY.slots[s]; b.setAttribute('aria-controls', 'slot-' + s);
    b.onclick = function () { activate(s); }; $('tabs').appendChild(b); });
  function activate(s) { WTM.SLOTS.forEach(function (x, i) { panels[x].sec.classList.toggle('is-active', x === s); $('tabs').children[i].setAttribute('aria-selected', String(x === s)); }); }
  activate('head');
  var skinG = $('skin'); var sk = [1, 2, 3, 4, 5, 6].map(function (k) { var b = document.createElement('button'); b.style.background = WT_SKIN['k' + k]; b.setAttribute('aria-label', COPY.skinTones['k' + k]); return { el: b, v: k }; });
  radiogroup(skinG, sk, function (v) { return o.k === v; }, function (v) { o.k = v; render(); }, COPY.skinLabel);
  $('shuffle').onclick = function () { var r = new Uint8Array(9); crypto.getRandomValues(r); WTM.SLOTS.forEach(function (s, i) { o[s] = { s: 1 + r[i] % 6, c: 1 + r[i + 4] % 6 }; }); render('head'); status(); };
  $('send').onclick = function () { L.share(L.link(WTM.encode(o)), COPY.title, COPY.shareText); };
  function save() {
    try { var xml = new XMLSerializer().serializeToString($('doll')).replace('<svg', '<svg width="600" height="1200"'), img = new Image();
      img.onload = function () { var c = document.createElement('canvas'); c.width = 600; c.height = 1200; var x = c.getContext('2d'); x.fillStyle = '#FFF6E5'; x.fillRect(0, 0, 600, 1200); x.drawImage(img, 0, 0, 600, 1200);
        c.toBlob(function (b) { if (!b) return L.toast(COPY.saveFail); var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'wear-this.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); L.toast(COPY.saved); }); };
      img.onerror = function () { L.toast(COPY.saveFail); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); } catch (e) { L.toast(COPY.saveFail); }
  }
  $('save').onclick = save; $('save2').onclick = save;
  function setRecv(on) { recv = on; $('root').classList.toggle('is-recv', on); $('make-actions').hidden = on; $('recv-actions').hidden = !on; $('hint').hidden = on; $('meet').hidden = on; }
  $('mine').onclick = function () { L.clearHash(); o = WTM.blank(); setRecv(false); $('lede').textContent = COPY.invitation; render(); status(); };
  $('edit').onclick = function () { L.clearHash(); setRecv(false); $('lede').textContent = COPY.invitation; status(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = WTM.decode(h);
    if (r) { o = r.o; setRecv(true); $('lede').textContent = COPY.receiverIntro; if (r.unknown) $('msg').textContent = COPY.unknownItem; }
    else { $('lede').textContent = COPY.badLink; }
  }
  render(); if (!recv && !(h && h !== '#')) status();
})();
