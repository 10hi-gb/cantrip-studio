'use strict';
// C205 Not on the Screen. Fragment "#v1.cA.cB": version + two distinct validated color IDs (c1–c8). Longest valid = 8 chars; >16 rejected.
// Only stripes are ever drawn: no code path computes or paints a mixed color. Disc = ONE SVG of 36 × 10° wedges (Creative §2).
var NOS = (function () {
  var IDS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'], VER = 'v1', FRAG = 16, WEDGES = 36;
  function encode(a, b) { if (IDS.indexOf(a) < 0 || IDS.indexOf(b) < 0 || a === b) return null; return VER + '.' + a + '.' + b; }
  // -> {a,b} | {old:true} | null
  function decode(f) {
    f = String(f || '').replace(/^#/, ''); if (!f || f.length > FRAG) return null;
    var m = /^v(\d+)\.(c[1-8])\.(c[1-8])$/.exec(f);
    if (!m) return /^v\d+\./.test(f) && !/^v1\./.test(f) ? { old: true } : null;
    if ('v' + m[1] !== VER) return { old: true }; if (m[2] === m[3]) return null; return { a: m[2], b: m[3] };
  }
  // sector i spans [i*10°, (i+1)*10°] clockwise from 12 o'clock, radius 100; even = A, odd = B
  function wedges(n) { var out = []; for (var i = 0; i < n; i++) { var t0 = i / n * 2 * Math.PI - Math.PI / 2, t1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2;
    out.push({ d: 'M0 0L' + (100 * Math.cos(t0)).toFixed(3) + ' ' + (100 * Math.sin(t0)).toFixed(3) + 'A100 100 0 0 1 ' + (100 * Math.cos(t1)).toFixed(3) + ' ' + (100 * Math.sin(t1)).toFixed(3) + 'Z', k: i % 2 }); } return out; }
  return { IDS: IDS, VER: VER, FRAG: FRAG, WEDGES: WEDGES, encode: encode, decode: decode, wedges: wedges };
})();
if (typeof module !== 'undefined') module.exports = NOS;
if (typeof document !== 'undefined') (function () {
  var $ = L.$, P = NOS_PALETTE, NS = 'http://www.w3.org/2000/svg'; L.bind(); L.chrome();
  var picks = [], name = function (id) { return COPY.colors[id]; }, alt = function (id) { return COPY.colorAlt[id]; };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function show(id) { ['v-pick', 'v-recv', 'v-disc'].forEach(function (v) { $(v).hidden = v !== id; }); }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  if (reduce) { $('rm').textContent = COPY.reducedMotion; $('rm').hidden = false; }
  // ---- the disc: one SVG, built once per pair; spinning only rotates the element ----
  var disc = $('disc'), shown = '';
  function drawDisc(a, b) { var key = a + b; if (key === shown) return; shown = key; disc.textContent = '';
    var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '-100 -100 200 200'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    if (a && b) NOS.wedges(NOS.WEDGES).forEach(function (w) { var p = document.createElementNS(NS, 'path'); p.setAttribute('d', w.d); p.setAttribute('fill', P[w.k ? b : a]); p.setAttribute('shape-rendering', 'geometricPrecision'); svg.appendChild(p); });
    disc.appendChild(svg);
    disc.setAttribute('aria-label', a && b ? L.fill(COPY.discAlt, { a: alt(a), b: alt(b) }) : COPY.pickHeading); }
  function chips(box, a, b) { box.textContent = ''; [a, b].forEach(function (id) { var i = el('i'); i.style.background = P[id]; i.setAttribute('aria-hidden', 'true'); box.appendChild(i); box.appendChild(document.createTextNode(name(id))); }); }
  // ---- spin: drag / flick / keys, real dt, friction ω·e^(−1.6dt), cap 50°/s (< Creative's 60 limit), stop < 2°/s ----
  var th = 0, w = 0, raf = 0, last = 0, ease = null, CAP = 50, drag = null;
  function setRot() { disc.style.setProperty('--ns-rot', (th % 360).toFixed(2) + 'deg'); }
  function loop(t) { var dt = Math.min(0.1, (t - last) / 1000); last = t; raf = 0;
    if (ease) { var k = Math.min(1, (t - ease.t0) / 200), e = 1 - Math.pow(1 - k, 3); th = ease.from + (ease.to - ease.from) * e; if (k >= 1) ease = null; }
    else if (!drag) { th += w * dt; w *= Math.exp(-1.6 * dt); if (Math.abs(w) < 2) w = 0; }
    setRot(); if (ease || (w && !drag)) raf = requestAnimationFrame(loop); }
  function kick() { if (reduce || document.hidden || raf) return; last = performance.now(); raf = requestAnimationFrame(loop); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; w = 0; ease = null; }
  function ang(e) { var r = disc.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
  disc.addEventListener('pointerdown', function (e) { if (reduce) return; stop(); drag = { a: ang(e), t: performance.now(), v: 0 }; disc.classList.add('is-drag'); try { disc.setPointerCapture(e.pointerId); } catch (x) {} });
  disc.addEventListener('pointermove', function (e) { if (!drag) return; var a = ang(e), d = a - drag.a; if (d > 180) d -= 360; if (d < -180) d += 360;
    var t = performance.now(), dt = Math.max(0.001, (t - drag.t) / 1000); th += d; drag.v = 0.7 * drag.v + 0.3 * (d / dt); drag.a = a; drag.t = t; setRot(); });
  function up() { if (!drag) return; var v = performance.now() - drag.t > 120 ? 0 : drag.v; drag = null; disc.classList.remove('is-drag'); w = Math.max(-CAP, Math.min(CAP, v)); kick(); }
  disc.addEventListener('pointerup', up); disc.addEventListener('pointercancel', up); disc.addEventListener('lostpointercapture', up);
  disc.addEventListener('keydown', function (e) { if (reduce) return; var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') { e.preventDefault(); w = 0; ease = { from: th, to: th + (k === 'ArrowRight' ? 10 : -10), t0: performance.now() }; kick(); }
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); ease = null; w = CAP; kick(); } });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  // ---- picker: 8 keys, roving tabindex, arrows move, Enter/Space toggles ----
  var keys = $('keys'), btns = NOS.IDS.map(function (id, i) {
    var b = el('button', 'ns-key'); b.type = 'button'; b.dataset.id = id; b.tabIndex = i ? -1 : 0;
    var cap = el('span', 'cap'); cap.style.setProperty('--k', P[id]); cap.setAttribute('aria-hidden', 'true'); b.appendChild(cap); b.appendChild(el('span', 'lbl', name(id)));
    b.addEventListener('click', function () { toggle(id); });
    b.addEventListener('keydown', function (e) { var k = e.key, j = i, cols = keys.offsetWidth < 330 ? 4 : 4;
      if (k === 'ArrowRight') j = (i + 1) % 8; else if (k === 'ArrowLeft') j = (i + 7) % 8; else if (k === 'ArrowDown') j = (i + cols) % 8; else if (k === 'ArrowUp') j = (i + 8 - cols) % 8; else if (k === 'Home') j = 0; else if (k === 'End') j = 7; else return;
      e.preventDefault(); btns[i].tabIndex = -1; btns[j].tabIndex = 0; btns[j].focus(); });
    keys.appendChild(b); return b; });
  function focusKey(j) { btns.forEach(function (b, n) { b.tabIndex = n === j ? 0 : -1; }); btns[j].focus(); }
  // QA r527: after the first pick, move focus to the next unpicked colour so Tab/Enter/Space alone can pick two (arrows still work).
  function toggle(id) { var k = picks.indexOf(id), added = k < 0; if (k >= 0) picks.splice(k, 1); else { if (picks.length === 2) picks.shift(); picks.push(id); } paintPick();
    var i = NOS.IDS.indexOf(id); if (added && picks.length === 1 && document.activeElement === btns[i]) { for (var n = 1; n < 8; n++) { var j = (i + n) % 8; if (picks.indexOf(NOS.IDS[j]) < 0) { focusKey(j); break; } } } }
  function paintPick() {
    btns.forEach(function (b) { var n = picks.indexOf(b.dataset.id), on = n >= 0; b.setAttribute('aria-pressed', String(on)); b.firstChild.setAttribute('data-n', on ? String(n + 1) : '');
      b.setAttribute('aria-label', L.fill(COPY.colorAria, { color: name(b.dataset.id), state: on ? COPY.selected : COPY.notSelected })); });
    var cl = $('clears'); cl.textContent = '';
    picks.forEach(function (id) { var c = el('button', 'ns-link', L.fill(COPY.clearOne, { color: name(id) })); c.type = 'button'; c.onclick = function () { toggle(id); }; cl.appendChild(c); });
    if (picks.length === 2) { var c2 = el('button', 'ns-link', COPY.clearAll); c2.type = 'button'; c2.onclick = function () { picks = []; paintPick(); btns[0].focus(); }; cl.appendChild(c2); }
    $('make').disabled = picks.length !== 2; $('pmsg').textContent = picks.length === 2 ? L.fill(COPY.pairLine, { a: name(picks[0]), b: name(picks[1]) }) : COPY.needTwo;
    stop(); th = 0; setRot(); drawDisc(picks[0], picks[1]); $('caption').textContent = picks.length === 2 ? COPY.discHint : ''; }
  function openDisc(a, b) { picks = [a, b]; show('v-disc'); var A = name(a), B = name(b); drawDisc(a, b);
    $('dhead').textContent = L.fill(COPY.discHeading, { a: A, b: B }); chips($('dchips'), a, b); $('caption').textContent = COPY.discHint;
    var how = $('v-disc').querySelector('.ns-spin'); how.textContent = COPY.spinHow + ' ' + (reduce ? COPY.spinReduce : COPY.noAuto);
    $('paperColors').textContent = L.fill(COPY.paperColors, { a: A, b: B }); $('dhead').focus(); }
  var st = $('steps'); COPY.paperSteps.split('\n').forEach(function (s) { st.appendChild(el('li', null, s.replace(/^\d+\.\s*/, ''))); });
  $('make').onclick = function () { if (picks.length !== 2) { $('pmsg').textContent = COPY.needTwo; return; } if (picks[0] === picks[1]) { $('pmsg').textContent = COPY.sameColor; return; }
    history.replaceState(null, '', location.pathname + '#' + NOS.encode(picks[0], picks[1])); openDisc(picks[0], picks[1]); };
  $('share').onclick = function () { var f = NOS.encode(picks[0], picks[1]); if (!f) return; L.share(L.link(f), COPY.title, L.fill(COPY.shareText, { a: name(picks[0]), b: name(picks[1]) })); };
  $('again').onclick = function () { disc.scrollIntoView({ block: 'center', behavior: 'auto' }); disc.focus(); };
  function toPick() { L.clearHash(); show('v-pick'); $('lede').textContent = COPY.invitation; paintPick(); btns[0].focus(); }
  $('change').onclick = toPick; $('reset').onclick = function () { picks = []; toPick(); }; $('mine').onclick = function () { picks = []; toPick(); };
  var h = location.hash, r = h && h !== '#' ? NOS.decode(h) : undefined;
  if (r && r.a) { picks = [r.a, r.b]; show('v-recv'); $('lede').textContent = COPY.receiverIntro; drawDisc(r.a, r.b); chips($('rchips'), r.a, r.b); $('caption').textContent = COPY.discHint;
    $('rpair').textContent = L.fill(COPY.pairLine, { a: name(r.a), b: name(r.b) }); $('see').onclick = function () { openDisc(r.a, r.b); }; }
  else { show('v-pick'); paintPick(); $('lede').textContent = r === undefined ? COPY.invitation : (r && r.old ? COPY.oldVersion : COPY.badLink); }
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
