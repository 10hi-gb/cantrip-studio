'use strict';
// Cheers. The toast lives only in the link (sealed). No receipt to the sender: clinking makes no request.
var CH = (function () {
  var MAX = 48, FRAG_MAX = 260;
  function strip(s) { return String(s == null ? '' : s).replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function len(s) { return Array.from(s).length; }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function b64e(s) { var b = new TextEncoder().encode(s), t = ''; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { var t = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  function encode(toast) { var p = b64e('1~' + strip(toast)); return p + '.' + ck(p); }
  function decode(f) {
    try {
      f = String(f || '').replace(/^#/, ''); if (!f || f.length > FRAG_MAX) return null;
      var m = /^([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f); if (!m || ck(m[1]) !== m[2]) return null;
      var s = b64d(m[1]); if (s.slice(0, 2) !== '1~') return null; var t = strip(s.slice(2)); if (len(t) > MAX) return null;
      return { toast: t };
    } catch (e) { return null; }
  }
  // Etch (decoration only; the full toast is also shown as real text). Wrap by width units — wide glyphs (emoji, CJK) = 2,
  // others = 1 — at most W units per line and N lines; words longer than a line break by grapheme; anything left over is cut with "…".
  var EW = 9, EN = 3;
  function graphemes(t) { if (typeof Intl !== 'undefined' && Intl.Segmenter) return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(t), function (x) { return x.segment; }); return Array.from(t); }
  function gw(g) { return /\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/u.test(g) ? 2.4 : 1; }
  function lines(t) {
    var out = [], cur = [], cw = 0, cut = false;
    function push() { out.push(cur.join('')); cur = []; cw = 0; }
    var words = strip(t).split(' ').filter(Boolean);
    for (var k = 0; k < words.length && !cut; k++) {
      var g = graphemes(words[k]), w = g.reduce(function (a, x) { return a + gw(x); }, 0);
      if (cur.length && cw + 1 + w <= EW) { cur.push(' '); cw += 1; }
      else if (cur.length) { push(); if (out.length === EN) { cut = true; break; } }
      for (var q = 0; q < g.length; q++) { var x = gw(g[q]); if (cw + x > EW) { push(); if (out.length === EN) { cut = true; break; } } cur.push(g[q]); cw += x; }
    }
    if (!cut && cur.length) push();
    if (cut && out.length) { var last = graphemes(out[EN - 1]), lw = last.reduce(function (a, x) { return a + gw(x); }, 0); while (last.length && lw + 1 > EW) lw -= gw(last.pop()); out[EN - 1] = last.join('').replace(/ $/, '') + '…'; }
    return out;
  }
  // Characters over the limit: text cap (48 code points) AND encoded-link cap (260), so the maker can never produce a link the receiver rejects.
  function overBy(t) { t = strip(t); var a = Array.from(t), over = a.length - MAX; if (over > 0) return over; var n = 0; while (n < a.length && encode(a.slice(0, a.length - n).join('')).length > FRAG_MAX) n++; return n; }
  return { MAX: MAX, FRAG_MAX: FRAG_MAX, overBy: overBy, strip: strip, len: len, encode: encode, decode: decode, lines: lines };
})();
if (typeof module !== 'undefined') module.exports = CH;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('toast-in').placeholder = COPY.toastPlaceholder;
  var scene = $('scene'), muted = false, ac = null, current = '';
  function tst(m) { var t = $('tst'); t.textContent = m; t.hidden = false; clearTimeout(tst.h); tst.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function etch(side, text) {
    var g = $('etch' + side); while (g.firstChild) g.removeChild(g.firstChild);
    var ls = CH.lines(text), y0 = 100 - (ls.length - 1) * 9;
    ls.forEach(function (l, i) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('class', 'ch-etch'); t.setAttribute('x', '75'); t.setAttribute('y', String(y0 + i * 18)); t.setAttribute('text-anchor', 'middle');
      t.textContent = l;
      g.appendChild(t);
    });
  }
  // The toast as readable text (and for screen readers): plain textContent, bidi-isolated, hidden when empty.
  function said(t) { var e = $('said'); e.textContent = t || ''; e.hidden = !t; }
  function show(ids, on) { ids.forEach(function (i) { $(i).hidden = !on; }); }
  function maker() {
    current = ''; said(''); scene.className = 'ch-scene'; $('gl').classList.add('ch-glass--solo'); $('gr').hidden = true; etch('l', ''); etch('r', '');
    $('title').textContent = COPY.title; $('title').classList.remove('ch-title--long'); $('lede').textContent = COPY.invitation; $('lede').hidden = false;
    $('toast-in').value = ''; $('fmsg').textContent = ''; $('field').hidden = false; $('fine').textContent = COPY.privacy;
    show(['raise'], true); show(['share', 'clink', 'back', 'mute'], false); $('barno').hidden = false;
    if (location.hash) history.replaceState(null, '', location.pathname);
  }
  function check() {
    var t = CH.strip($('toast-in').value), over = CH.overBy(t);
    $('fmsg').textContent = over > 0 ? fill(COPY.toastTooLong, { n: over }) : ''; etch('l', over > 0 ? '' : t); return over > 0 ? null : t;
  }
  $('toast-in').addEventListener('input', function () { check(); if (!$('share').hidden) { $('share').hidden = true; $('raise').hidden = false; scene.classList.remove('is-raised'); } });
  $('raise').onclick = function () { var t = check(); if (t === null) { $('toast-in').focus(); return; } current = t; scene.classList.add('is-raised'); $('raise').hidden = true; $('share').hidden = false; $('share').focus(); };
  $('share').onclick = function () {
    if (CH.overBy(current) > 0) { check(); return; }
    var link = location.origin + location.pathname + '#' + CH.encode(current);
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { tst(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') tst(COPY.shareCancel); else cp(); }); else cp();
  };
  function clinkSound() {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      var now = ac.currentTime + 0.38, out = ac.createGain(); out.gain.value = 0.12; out.connect(ac.destination);
      [[2600, 1], [2614, 0.6], [3900, 0.5], [3921, 0.3]].forEach(function (p) { var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = p[0]; g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(p[1], now + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6); o.connect(g); g.connect(out); o.start(now); o.stop(now + 0.65); });
    } catch (e) {}
  }
  $('mute').onclick = function () { muted = !muted; $('mute').setAttribute('aria-pressed', String(muted)); $('mute').textContent = muted ? COPY.unmute : COPY.mute; };
  $('clink').onclick = function () { scene.classList.remove('is-raised'); scene.classList.add('is-clinked'); clinkSound(); $('title').textContent = COPY.clinked; $('title').classList.remove('ch-title--long'); show(['clink'], false); show(['back'], true); $('fine').textContent = ''; $('back').focus(); };
  $('back').onclick = maker;
  function receiver(r) {
    scene.className = 'ch-scene is-raised'; $('gl').classList.remove('ch-glass--solo'); $('gr').hidden = false; etch('l', r.toast); etch('r', ''); said(r.toast);
    $('title').textContent = COPY.receiverIntro; $('title').classList.add('ch-title--long'); $('lede').hidden = true; $('field').hidden = true;
    show(['raise', 'share', 'back'], false); show(['clink', 'mute'], true); $('barno').hidden = true; $('fine').textContent = COPY.soundHint;
  }
  var h = location.hash;
  if (h && h !== '#') { var r = CH.decode(h); if (r) receiver(r); else { maker(); $('lede').textContent = COPY.badLink; history.replaceState(null, '', location.pathname + h); } }
  else maker();
})();
