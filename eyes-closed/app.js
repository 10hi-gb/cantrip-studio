'use strict';
// Eyes Closed. COPY from copy.js verbatim. Drawing (simplified) + prompt travel only in the URL fragment; attempts strip is memory-only.
var EC = (function () {
  var GRID = 255, FRAG_MAX = 1800, OWN_MAX = 40, MAX_STROKES = 60;
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var a = pts[0], b = pts[pts.length - 1], dmax = 0, idx = 0, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    for (var i = 1; i < pts.length - 1; i++) { var d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > dmax) { dmax = d; idx = i; } }
    if (dmax <= eps) return [a, b];
    return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  }
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]*$/.test(s)) throw 0; s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function clean(s) { return String(s || '').replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
  // strokes: arrays of [x,y] in 0..800. Prompt: {i: presetIndex} or {t: text}
  function packStrokes(strokes, eps) {
    var out = [Math.min(strokes.length, MAX_STROKES)];
    strokes.slice(0, MAX_STROKES).forEach(function (s) {
      var q = rdp(s.map(function (p) { return [Math.round(p[0] / 800 * GRID), Math.round(p[1] / 800 * GRID)]; }), eps).slice(0, 255);
      out.push(q.length); q.forEach(function (p) { out.push(Math.max(0, Math.min(GRID, p[0])), Math.max(0, Math.min(GRID, p[1]))); });
    });
    return new Uint8Array(out);
  }
  function encode(strokes, prompt) {
    var pp = prompt.t != null ? 't' + b64u(new TextEncoder().encode(clean(prompt.t))) : 'i' + (prompt.i | 0);
    for (var eps = 0.6; eps <= 6; eps += 0.6) {
      var f = '1.' + pp + '.' + b64u(packStrokes(strokes, eps));
      if (f.length <= FRAG_MAX) return f;
    }
    return null;
  }
  function decode(frag, nPrompts) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > FRAG_MAX) return null;
    var p = frag.split('.'); if (p.length !== 3 || p[0] !== '1') return null;
    try {
      var prompt;
      if (/^i\d{1,2}$/.test(p[1])) { var i = +p[1].slice(1); if (i >= nPrompts) return null; prompt = { i: i }; }
      else if (p[1][0] === 't') { var t = clean(new TextDecoder('utf-8', { fatal: true }).decode(unb64u(p[1].slice(1)))); if (!t || Array.from(t).length > OWN_MAX) return null; prompt = { t: t }; }
      else return null;
      var u = unb64u(p[2]), k = 0, n = u[k++], strokes = [];
      if (!n || n > MAX_STROKES) return null;
      for (var s = 0; s < n; s++) { var m = u[k++]; if (!m || k + m * 2 > u.length) return null; var st = []; for (var j = 0; j < m; j++) { st.push([u[k++] / GRID * 800, u[k++] / GRID * 800]); } strokes.push(st); }
      if (k !== u.length) return null;
      return { prompt: prompt, strokes: strokes };
    } catch (e) { return null; }
  }
  return { rdp: rdp, encode: encode, decode: decode, clean: clean, OWN_MAX: OWN_MAX, FRAG_MAX: FRAG_MAX };
})();
if (typeof module !== 'undefined') module.exports = EC;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('own').placeholder = COPY.ownPlaceholder; $('prompts').setAttribute('aria-label', COPY.promptLabel);
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function panel(id) { ['p-pick', 'p-draw', 'p-reveal', 'p-after', 'p-recv-after', 'p-bad'].forEach(function (x) { $(x).hidden = x !== id; }); }
  var cv = $('cv'), g = cv.getContext('2d'), curtain = $('curtain');
  var BOARD = '#22302B', CHALK = '#F1EEE6';
  var prompt = { i: 0 }, strokes = [], cur = null, drawing = false, attempts = [], link = '', kb = { x: 400, y: 400, down: false };
  function promptText(p, lower) { var t = p.t != null ? p.t : COPY.prompts[p.i]; return lower && p.t == null ? t.charAt(0).toLowerCase() + t.slice(1) : t; }
  function paintBoard(c, w) { c.fillStyle = BOARD; c.fillRect(0, 0, w, w); }
  function chalk(c, ss, w, upto) {
    c.strokeStyle = CHALK; c.lineCap = 'round'; c.lineJoin = 'round'; var sc = w / 800, total = 0;
    ss.forEach(function (s) {
      c.lineWidth = 9 * sc; c.globalAlpha = 0.92; c.beginPath();
      for (var i = 0; i < s.length; i++) { if (upto != null && total > upto) break; var x = s[i][0] * sc, y = s[i][1] * sc; if (i) { total += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); c.lineTo(x, y); } else c.moveTo(x, y); }
      if (s.length === 1) c.lineTo(s[0][0] * sc + 0.1, s[0][1] * sc);
      c.stroke(); c.globalAlpha = 0.35; c.lineWidth = 3 * sc; c.stroke(); c.globalAlpha = 1;
    });
  }
  function totalLen(ss) { var t = 0; ss.forEach(function (s) { for (var i = 1; i < s.length; i++) t += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); }); return t; }
  function curtainDown(txt) { curtain.classList.remove('is-up'); $('curtain-txt').textContent = txt || ''; }
  function curtainUp() { curtain.classList.add('is-up'); }
  function revealAnim(ss, done) {
    curtainUp(); paintBoard(g, 800);
    if (RM.matches) { chalk(g, ss, 800); return done && done(); }
    var L = totalLen(ss) || 1, t0 = null;
    var step = function (now) { if (t0 == null) t0 = now; var k = Math.min(1, (now - t0 - 500) / 1400); paintBoard(g, 800); if (k > 0) chalk(g, ss, 800, L * k); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
    requestAnimationFrame(step);
  }

  // ---- pick
  function buildPrompts() {
    var host = $('prompts'); host.textContent = '';
    COPY.prompts.concat([COPY.writeOwn]).forEach(function (t, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ec-chip'; b.textContent = t;
      var on = i < COPY.prompts.length ? prompt.t == null && prompt.i === i : prompt.t != null; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.onclick = function () { if (i < COPY.prompts.length) { prompt = { i: i }; $('own').hidden = true; } else { prompt = { t: '' }; $('own').hidden = false; $('own').focus(); } buildPrompts(); };
      host.appendChild(b);
    });
  }
  function pick() { state = 'pick'; $('lede').textContent = COPY.invitation; $('msg').textContent = ''; strokes = []; paintBoard(g, 800); curtainDown(''); buildPrompts(); panel('p-pick'); }
  $('own').addEventListener('input', function () { var n = Array.from(EC.clean($('own').value)).length; $('own-msg').textContent = n > EC.OWN_MAX ? fill(COPY.ownTooLong, { n: n - EC.OWN_MAX }) : ''; });
  $('cover').onclick = function () {
    if (prompt.t != null) { var t = EC.clean($('own').value); if (!t) { $('own').focus(); return; } if (Array.from(t).length > EC.OWN_MAX) return; prompt = { t: t }; }
    startDraw();
  };
  // ---- draw hidden
  var state = 'pick';
  function startDraw() {
    state = 'draw'; strokes = []; drawing = true; paintBoard(g, 800); curtainDown(promptText(prompt));
    $('prompt-big').textContent = promptText(prompt); $('lede').textContent = ''; $('msg').textContent = ''; panel('p-draw'); cv.focus({ preventScroll: true });
  }
  function pos(e) { var r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(800, (e.clientX - r.left) * 800 / r.width)), Math.max(0, Math.min(800, (e.clientY - r.top) * 800 / r.height))]; }
  // The curtain covers the board, so ink is recorded but never visible while drawing.
  curtain.style.pointerEvents = 'none';
  cv.addEventListener('pointerdown', function (e) { if (!drawing) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} cur = [pos(e)]; strokes.push(cur); e.preventDefault(); });
  cv.addEventListener('pointermove', function (e) { if (!cur) return; var p = pos(e), q = cur[cur.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 3 && cur.length < 2000) cur.push(p); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { cur = null; }); });
  cv.addEventListener('keydown', function (e) {
    if (!drawing) return; var d = e.shiftKey ? 40 : 14;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (kb.down) { kb.down = false; cur = null; } else { kb.down = true; cur = [[kb.x, kb.y]]; strokes.push(cur); } return; }
    var mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]; if (!mv) return; e.preventDefault();
    kb.x = Math.max(0, Math.min(800, kb.x + mv[0])); kb.y = Math.max(0, Math.min(800, kb.y + mv[1])); if (kb.down && cur) cur.push([kb.x, kb.y]);
  });
  $('undo').onclick = function () { strokes.pop(); };
  $('clear').onclick = function () { strokes = []; };
  $('done').onclick = function () {
    if (!strokes.length) { $('msg').textContent = COPY.emptyDone; return; }
    drawing = false; kb.down = false; cur = null; $('msg').textContent = ''; $('prompt-rev').textContent = promptText(prompt); panel('p-reveal'); $('peek').focus();
  };
  $('peek').onclick = function () {
    state = 'after';
    revealAnim(strokes, function () { $('msg').textContent = COPY.revealLine; });
    attempts.push(strokes.map(function (s) { return s.slice(); })); renderStrip();
    var f = EC.encode(strokes, prompt); link = f ? location.origin + location.pathname + '#' + f : '';
    $('link-msg').textContent = f ? '' : COPY.tooLong; $('share').disabled = !f;
    $('prompt-after').textContent = promptText(prompt); panel('p-after');
  };
  $('again').onclick = startDraw;
  function renderStrip() {
    var host = $('strip'); host.textContent = '';
    attempts.forEach(function (ss, i) {
      var f = document.createElement('figure'), c = document.createElement('canvas'); c.width = 240; c.height = 240; paintBoard(c.getContext('2d'), 240); chalk(c.getContext('2d'), ss, 240);
      c.setAttribute('role', 'img'); c.setAttribute('aria-label', '#' + (i + 1)); f.appendChild(c); var cap = document.createElement('figcaption'); cap.textContent = '#' + (i + 1); f.appendChild(cap); host.appendChild(f);
    });
    $('attempts').hidden = attempts.length < 2;
  }
  $('share').onclick = function () {
    if (!link) return;
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, text: fill(COPY.shareText, { prompt: promptText(prompt, true) }), url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };
  function save(ss, p) {
    try {
      var c = document.createElement('canvas'); c.width = 1080; c.height = 1200; var x = c.getContext('2d');
      x.fillStyle = '#0E0B10'; x.fillRect(0, 0, 1080, 1200); x.fillStyle = BOARD; x.fillRect(60, 60, 960, 960); var t = document.createElement('canvas'); t.width = 960; t.height = 960; paintBoard(t.getContext('2d'), 960); chalk(t.getContext('2d'), ss, 960); x.drawImage(t, 60, 60);
      x.strokeStyle = '#D9B26A'; x.lineWidth = 3; x.strokeRect(50, 50, 980, 980);
      x.fillStyle = CHALK; x.font = 'italic 54px "Instrument Serif",serif'; x.fillText(promptText(p), 60, 1110); x.fillStyle = '#A9A39A'; x.font = '22px "Space Grotesk",sans-serif'; x.fillText(COPY.title + ' · Cantrip Studio', 60, 1160);
      c.toBlob(function (b) { if (!b) return toast(COPY.saveFail); var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'eyes-closed.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); toast(COPY.saved); }, 'image/png');
    } catch (e) { toast(COPY.saveFail); }
  }
  $('save').onclick = function () { save(strokes, prompt); };
  // ---- receiver
  var R = null;
  $('save2').onclick = function () { save(R.strokes, R.prompt); };
  $('try').onclick = function () { history.replaceState(null, '', location.pathname); prompt = R.prompt; attempts = []; renderStrip(); startDraw(); };
  function route() {
    var h = location.hash;
    if (!h || h === '#') return pick();
    R = EC.decode(h, COPY.prompts.length);
    if (!R) { state = 'bad'; $('lede').textContent = COPY.badLink; paintBoard(g, 800); curtainDown(''); panel('p-bad'); return; }
    state = 'recv'; paintBoard(g, 800); curtainDown(promptText(R.prompt));
    $('lede').textContent = fill(COPY.receiverIntro, { prompt: promptText(R.prompt, true) }); $('prompt-rev').textContent = promptText(R.prompt);
    panel('p-reveal'); $('peek').textContent = COPY.receiverPrimary;
    $('peek').onclick = function () { revealAnim(R.strokes, function () { $('msg').textContent = COPY.revealLine; }); panel('p-recv-after'); };
  }
  window.addEventListener('hashchange', function () { location.reload(); });
  route();
})();
