'use strict';
// C205 Not on the Screen. Fragment: "n1.cA.cB" — version + two distinct validated color IDs (c1–c8), max 12 chars.
// Only stripes are ever drawn: there is no code path that computes or paints a mixed color.
var NOS = (function () {
  var IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], VER = 'n1', FRAG = 12, WEDGES = 24;
  function encode(a, b) { if (IDS.indexOf(a) < 0 || IDS.indexOf(b) < 0 || a === b) return null; return VER + '.' + a + '.' + b; }
  // -> {a,b} | {old:true} | null
  function decode(f) {
    f = String(f || '').replace(/^#/, ''); if (!f || f.length > FRAG) return null;
    var m = /^n(\d{1,2})\.(c[1-8])\.(c[1-8])$/.exec(f); if (!m) { return /^n\d{1,2}\./.test(f) && !/^n1\./.test(f) ? { old: true } : null; }
    if ('n' + m[1] !== VER) return { old: true }; if (m[2] === m[3]) return null; return { a: m[2], b: m[3] };
  }
  // wedge paths for a unit disc centred at 0,0 (alternating a/b)
  function wedges(n) { var out = []; for (var i = 0; i < n; i++) { var t0 = i / n * 2 * Math.PI - Math.PI / 2, t1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2;
    out.push({ d: 'M0 0 L' + Math.cos(t0).toFixed(5) + ' ' + Math.sin(t0).toFixed(5) + ' A1 1 0 0 1 ' + Math.cos(t1).toFixed(5) + ' ' + Math.sin(t1).toFixed(5) + ' Z', k: i % 2 }); } return out; }
  return { IDS: IDS, VER: VER, FRAG: FRAG, WEDGES: WEDGES, encode: encode, decode: decode, wedges: wedges };
})();
if (typeof module !== 'undefined') module.exports = NOS;
if (typeof document !== 'undefined') (function () {
  var $ = L.$, P = NOS_PALETTE; L.bind(); L.chrome();
  var picks = [], recv = false, NS = 'http://www.w3.org/2000/svg';
  var name = function (id) { return COPY.colors[id]; }, alt = function (id) { return COPY.colorAlt[id]; };
  function show(id) { ['v-pick', 'v-recv', 'v-disc'].forEach(function (v) { $(v).hidden = v !== id; }); }
  // ---- picker: 8 toggle buttons, roving tabindex, arrows move, Enter/Space toggles ----
  var grid = $('grid'), btns = NOS.IDS.map(function (id, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'nos-chip'; b.dataset.id = id; b.tabIndex = i ? -1 : 0;
    var sw = document.createElement('span'); sw.className = 'nos-sw'; sw.style.background = P[id]; sw.setAttribute('aria-hidden', 'true'); b.appendChild(sw);
    var t = document.createElement('span'); t.className = 'nos-chip-name'; t.textContent = name(id); b.appendChild(t);
    b.addEventListener('click', function () { toggle(id); });
    b.addEventListener('keydown', function (e) { var k = e.key, j = i, cols = window.innerWidth < 560 ? 4 : 8;
      if (k === 'ArrowRight') j = (i + 1) % 8; else if (k === 'ArrowLeft') j = (i + 7) % 8; else if (k === 'ArrowDown') j = (i + cols) % 8; else if (k === 'ArrowUp') j = (i + 8 - cols) % 8; else if (k === 'Home') j = 0; else if (k === 'End') j = 7; else return;
      e.preventDefault(); btns[i].tabIndex = -1; btns[j].tabIndex = 0; btns[j].focus(); });
    grid.appendChild(b); return b; });
  function toggle(id) { var k = picks.indexOf(id); if (k >= 0) picks.splice(k, 1); else { if (picks.length === 2) picks.shift(); picks.push(id); } paintPick(); }
  function paintPick() {
    btns.forEach(function (b) { var on = picks.indexOf(b.dataset.id) >= 0; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on);
      b.setAttribute('aria-label', L.fill(COPY.colorAria, { color: name(b.dataset.id), state: on ? COPY.selected : COPY.notSelected })); });
    var cl = $('clears'); cl.textContent = '';
    picks.forEach(function (id) { var c = document.createElement('button'); c.type = 'button'; c.className = 'nos-link'; c.textContent = L.fill(COPY.clearOne, { color: name(id) }); c.onclick = function () { toggle(id); }; cl.appendChild(c); });
    if (picks.length === 2) { var c2 = document.createElement('button'); c2.type = 'button'; c2.className = 'nos-link'; c2.textContent = COPY.clearAll; c2.onclick = function () { picks = []; paintPick(); btns[0].focus(); }; cl.appendChild(c2); }
    $('pair').textContent = picks.length === 2 ? L.fill(COPY.pairLine, { a: name(picks[0]), b: name(picks[1]) }) : '';
    $('make').disabled = picks.length !== 2; $('pmsg').textContent = picks.length === 2 ? '' : COPY.needTwo;
    drawDisc($('mini'), picks[0], picks[1] || picks[0], picks.length === 2);
  }
  // ---- the disc: alternating wedges only ----
  function drawDisc(svg, a, b, full) { svg.textContent = ''; svg.setAttribute('viewBox', '-1.06 -1.06 2.12 2.12');
    var bg = document.createElementNS(NS, 'circle'); bg.setAttribute('r', '1.04'); bg.setAttribute('class', 'nos-rim'); svg.appendChild(bg);
    if (a) NOS.wedges(NOS.WEDGES).forEach(function (w) { var p = document.createElementNS(NS, 'path'); p.setAttribute('d', w.d); p.setAttribute('fill', full || !w.k ? P[w.k ? b : a] : 'none'); svg.appendChild(p); });
    var hub = document.createElementNS(NS, 'circle'); hub.setAttribute('r', '.045'); hub.setAttribute('class', 'nos-hub'); svg.appendChild(hub); }
  function openDisc(a, b) { picks = [a, b]; show('v-disc'); var A = name(a), B = name(b);
    $('dhead').textContent = L.fill(COPY.discHeading, { a: A, b: B }); drawDisc($('disc'), a, b, true);
    $('disc').setAttribute('aria-label', L.fill(COPY.discAlt, { a: alt(a), b: alt(b) }));
    $('paperColors').textContent = L.fill(COPY.paperColors, { a: A, b: B }); $('spinReduce').hidden = !L.reduce; $('dhead').focus(); }
  $('make').onclick = function () { if (picks.length !== 2) { $('pmsg').textContent = COPY.needTwo; return; } if (picks[0] === picks[1]) { $('pmsg').textContent = COPY.sameColor; return; }
    history.replaceState(null, '', location.pathname + '#' + NOS.encode(picks[0], picks[1])); openDisc(picks[0], picks[1]); };
  $('share').onclick = function () { var f = NOS.encode(picks[0], picks[1]); if (!f) return; L.share(L.link(f), COPY.title, L.fill(COPY.shareText, { a: name(picks[0]), b: name(picks[1]) })); };
  $('again').onclick = function () { $('disc').scrollIntoView({ block: 'center', behavior: L.reduce ? 'auto' : 'smooth' }); $('disc').focus(); };
  $('change').onclick = function () { L.clearHash(); recv = false; show('v-pick'); paintPick(); $('lede').textContent = COPY.invitation; btns[0].focus(); };
  function reset() { L.clearHash(); recv = false; picks = []; $('lede').textContent = COPY.invitation; show('v-pick'); paintPick(); btns[0].focus(); }
  $('reset').onclick = reset; $('mine').onclick = reset;
  var h = location.hash, r = h && h !== '#' ? NOS.decode(h) : undefined;
  if (r && r.a) { recv = true; picks = [r.a, r.b]; show('v-recv'); $('lede').textContent = COPY.receiverIntro; drawDisc($('rmini'), r.a, r.b, true);
    $('rpair').textContent = L.fill(COPY.pairLine, { a: name(r.a), b: name(r.b) }); $('see').onclick = function () { openDisc(r.a, r.b); }; }
  else { show('v-pick'); paintPick(); if (r === undefined) $('lede').textContent = COPY.invitation; else { $('lede').textContent = r && r.old ? COPY.oldVersion : COPY.badLink; } }
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
