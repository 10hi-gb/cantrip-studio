'use strict';
// C137 Permission Slip — ["s1", id, to, from, reason]; the serial is a local hash of the payload (decorative).
var PS = (function (L) {
  var NMAX = 24, RMAX = 80, FRAG = 900, IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
  function encode(o) { return L.seal(['s1', o.id, L.clean(o.to, NMAX), L.clean(o.from, NMAX), L.clean(o.why, RMAX)]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a || a.length !== 5 || a[0] !== 's1' || !/^p\d{1,2}$/.test(a[1])) return null;
    var o = { id: a[1], to: L.clean(a[2], NMAX), from: L.clean(a[3], NMAX), why: L.clean(a[4], RMAX) }; if (o.to !== a[2] || o.from !== a[3] || o.why !== a[4]) return null;
    o.known = IDS.indexOf(o.id) >= 0; return o; }
  function serial(o) { var s = [o.id, o.to, o.from, o.why].join('|'), h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return String(h % 1000000).padStart(6, '0'); }
  // Pre-share guard (C088 approach): how many reason code points must go for the encoded link to fit FRAG. 0 = fits.
  function overBy(o) { var w = Array.from(L.clean(o.why, RMAX)), n = 0; while (n < w.length && encode({ id: o.id, to: o.to, from: o.from, why: w.slice(0, w.length - n).join('') }).length > FRAG) n++; return encode({ id: o.id, to: o.to, from: o.from, why: w.slice(0, w.length - n).join('') }).length > FRAG ? w.length + 1 : n; }
  return { overBy: overBy, FRAG: FRAG, IDS: IDS, NMAX: NMAX, RMAX: RMAX, encode: encode, decode: decode, serial: serial };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = PS;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var cur = { id: 'p5', to: '', from: '', why: '' }, torn = false, recv = null;
  function names(o) { var a = []; if (o.to) a.push(L.clean($('to').labels[0].textContent).replace(/\s*\(.*\)$/, '') + ': ' + o.to); if (o.from) a.push(L.clean($('from').labels[0].textContent).replace(/\s*\(.*\)$/, '') + ': ' + o.from); return a.join(' · '); }
  function paint(o) {
    var P = COPY.permissions[o.id]; $('perm').textContent = P ? P.title : ''; $('fine').textContent = P ? P.fine : COPY.unknownPermission;
    $('names').textContent = names(o); $('because').textContent = o.why ? L.fill('{why}', { why: o.why }) : ''; $('serial').textContent = L.fill(COPY.serial, { serial: PS.serial(o) });
    $('ticket').setAttribute('aria-label', P ? L.fill(COPY.slipAlt, { title: P.title }) + (torn || recv ? '' : ' ' + COPY.tearHint) : COPY.unknownPermission);
  }
  // picks
  PS.IDS.forEach(function (id) { var b = document.createElement('button'); b.type = 'button'; b.className = 'ps-pick'; b.textContent = COPY.permissions[id].title;
    b.onclick = function () { cur.id = id; sync(); }; b.dataset.id = id; $('picks').appendChild(b); });
  function sync() { [].forEach.call($('picks').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.id === cur.id)); }); read(); paint(cur); }
  function read() { cur.to = L.clean($('to').value, PS.NMAX); cur.from = L.clean($('from').value, PS.NMAX); cur.why = L.clean($('why').value, PS.RMAX); }
  ['to', 'from', 'why'].forEach(function (id) { $(id).addEventListener('input', function () { if (torn) untear(); var o = L.len(L.clean($('why').value)) - PS.RMAX; $('wmsg').textContent = o > 0 ? L.plural(COPY.reasonTooLong, o) : ''; read(); paint(cur); }); });
  ['to', 'from'].forEach(function (id) { $(id).maxLength = PS.NMAX * 2; });
  // tear: button, Enter/Space on the ticket, or a downward drag past a threshold
  function tear() {
    if (torn || recv) return; if (L.len(L.clean($('why').value)) > PS.RMAX) { $('why').focus(); return; }
    read(); var ob = PS.overBy(cur); if (ob > 0) { $('wmsg').textContent = L.plural(COPY.reasonTooLong, ob); $('why').focus(); return; }
    torn = true; var t = $('ticket'); if (!L.reduce) t.classList.add('is-tearing');
    setTimeout(function () { t.classList.remove('is-tearing'); t.classList.add('ps-torn');
      var n1 = $('next1'); n1.classList.remove('is-ghost'); n1.classList.add('ps-torn', 'ps-stub'); n1.textContent = ''; var s = document.createElement('p'); s.className = 'ps-stubtxt'; s.textContent = COPY.stub; n1.appendChild(s);
      $('rip').textContent = COPY.torn; $('acts-make').hidden = true; $('acts-torn').hidden = false; $('hint').hidden = true; paint(cur); $('share').focus(); }, L.reduce ? 0 : 650);
  }
  function untear() { torn = false; var t = $('ticket'); t.classList.remove('ps-torn'); var n1 = $('next1'); n1.className = 'ps-ticket ps-ticket--lime is-ghost'; n1.textContent = ''; $('rip').textContent = ''; $('acts-make').hidden = false; $('acts-torn').hidden = true; $('hint').hidden = false; $('linkbox').hidden = true; }
  $('tear').onclick = tear;
  $('ticket').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tear(); } });
  var y0 = null; function dragEnd(e) { if (y0 != null && e.clientY - y0 > 60) { y0 = null; tear(); } }
  $('ticket').addEventListener('pointerdown', function (e) { if (torn || recv) return; e.preventDefault(); y0 = e.clientY; try { $('ticket').setPointerCapture(e.pointerId); } catch (x) {} });
  $('ticket').addEventListener('pointermove', dragEnd);
  $('ticket').addEventListener('pointerup', function (e) { dragEnd(e); y0 = null; }); $('ticket').addEventListener('pointercancel', function () { y0 = null; });
  $('share').onclick = function () { var ob = PS.overBy(cur); if (ob > 0) { untear(); $('wmsg').textContent = L.plural(COPY.reasonTooLong, ob); $('why').focus(); return; } L.share(L.link(PS.encode(cur)), COPY.title, COPY.shareText); };
  // local image: draw the ticket on a canvas
  function save() {
    try { var o = recv || cur, P = COPY.permissions[o.id], c = document.createElement('canvas'), W = 900, Hh = 600; c.width = W; c.height = Hh; var x = c.getContext('2d');
      x.fillStyle = '#FF3D8B'; x.fillRect(0, 0, W, Hh); x.strokeStyle = '#1A1A2E'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, Hh - 8);
      x.fillStyle = '#D7263D'; x.font = '700 22px "Space Mono", monospace'; x.fillText(L.fill(COPY.serial, { serial: PS.serial(o) }), W - 230, 46);
      x.fillStyle = '#1A1A2E'; x.font = '40px "Bowlby One SC", Impact, sans-serif';
      function wrap(t, y, lh, max) { var w = t.split(' '), line = ''; w.forEach(function (s) { var tt = line ? line + ' ' + s : s; if (x.measureText(tt).width > max && line) { x.fillText(line, 40, y); y += lh; line = s; } else line = tt; }); if (line) x.fillText(line, 40, y); return y + lh; }
      var y = wrap(P ? P.title : COPY.unknownPermission, 110, 46, W - 80); x.font = '22px "Space Mono", monospace'; y = wrap(P ? P.fine : '', y + 6, 30, W - 80);
      x.font = '700 22px "Space Mono", monospace'; if (names(o)) y = wrap(names(o), y + 10, 30, W - 80); x.font = 'italic 22px "Space Mono", monospace'; if (o.why) y = wrap(o.why, y, 30, W - 80);
      x.font = '700 18px "Space Mono", monospace'; wrap(COPY.admitOne, Hh - 96, 24, W - 80); x.font = '18px "Space Mono", monospace'; wrap(COPY.ticketFooter, Hh - 60, 24, W - 80);
      if (recv) { x.save(); x.translate(W - 170, Hh - 120); x.rotate(-.18); x.strokeStyle = '#D7263D'; x.lineWidth = 6; x.strokeRect(-10, -42, 180, 60); x.fillStyle = '#D7263D'; x.font = '40px "Bowlby One SC", Impact, sans-serif'; x.fillText(COPY.given, 0, 0); x.restore(); }
      c.toBlob(function (bl) { if (!bl) return L.toast(COPY.saveFail); var u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = 'permission-slip.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); L.toast(COPY.saved); });
    } catch (e) { L.toast(COPY.saveFail); }
  }
  $('save').onclick = save; $('save2').onclick = save;
  $('take').onclick = function () { $('rip').textContent = COPY.taken; $('take').hidden = true; };
  $('again').onclick = function () { L.clearHash(); location.reload(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = PS.decode(h); $('maker').hidden = true; $('acts-make').hidden = true; $('hint').hidden = true; $('acts-recv').hidden = false; $('next1').hidden = true; $('next2').hidden = true;
    if (r) { recv = r; $('head').textContent = r.from ? L.fill(COPY.receiverIntro, { from: r.from }) : COPY.receiverIntroAnon; $('lede').textContent = r.known ? '' : COPY.unknownPermission;
      $('ticket').classList.add('ps-torn'); paint(r); if (r.known) { var g = document.createElement('span'); g.className = 'ps-given'; g.textContent = COPY.given; $('ticket').appendChild(g); } else { $('take').hidden = true; $('save2').hidden = true; } }
    else { $('head').textContent = COPY.badLink; $('lede').textContent = ''; $('roll').hidden = true; $('take').hidden = true; $('save2').hidden = true; }
  } else sync();
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
