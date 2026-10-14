'use strict';
// Shared link/text helpers (Batch B). Pure; no network, no storage.
var L = (function () {
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function b64e(s) { var b = new TextEncoder().encode(s), t = ''; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { var t = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  // Strip bidi controls, control chars (optionally keep \n), collapse spaces, NFC, cap in code points.
  function clean(s, max, keepNl) {
    s = String(s == null ? '' : s).normalize('NFC').replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g, '');
    s = keepNl ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
               : s.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
    return max ? Array.from(s).slice(0, max).join('') : s;
  }
  function len(s) { return Array.from(String(s)).length; }
  // Sealed fragment: base64url(UTF-8 of fields joined by \u001f) + "." + 6-hex FNV checksum.
  function seal(fields) { var p = b64e(fields.map(String).join('\u001f')); return p + '.' + ck(p); }
  function unseal(frag, maxLen) {
    try {
      frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > maxLen) return null;
      var m = /^([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(frag); if (!m || ck(m[1]) !== m[2]) return null;
      return b64d(m[1]).split('\u001f');
    } catch (e) { return null; }
  }
  // Single-pass template fill: values are never re-scanned for {keys}.
  function fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? String(v[k]) : m; }); }
  return { ck: ck, clean: clean, len: len, seal: seal, unseal: unseal, fill: fill, b64e: b64e, b64d: b64d };
})();
if (typeof module !== 'undefined') module.exports = L;
if (typeof document !== 'undefined') {
  L.$ = function (id) { return document.getElementById(id); };
  L.bind = function () { Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { var v = n.getAttribute('data-c').split('.').reduce(function (o, k) { return o && o[k]; }, COPY); if (typeof v === 'string') n.textContent = v; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ph]'), function (n) { n.placeholder = COPY[n.getAttribute('data-ph')]; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-al]'), function (n) { n.setAttribute('aria-label', COPY[n.getAttribute('data-al')]); }); };
  L.toast = function (m) { var t = L.$('toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(L.toast.h); L.toast.h = setTimeout(function () { t.hidden = true; }, 2800); };
  L.link = function (frag) { return location.origin + location.pathname + '#' + frag; };
  // navigator.share -> clipboard -> prompt. A cancelled share is reported as not sent.
  // navigator.share -> clipboard -> visible selectable link (#linkbox) with COPY.copyFail. A cancelled share is reported as not sent.
  L.share = function (url, title, text) {
    var box = L.$('linkbox');
    var manual = function () { if (box) { box.hidden = false; var i = box.querySelector('input'); i.value = url; i.focus(); i.select(); } L.toast(COPY.copyFail || COPY.copied); };
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { L.toast(COPY.copied); }, manual); else manual(); };
    if (navigator.share) navigator.share({ title: title, text: text, url: url }).then(function () {}, function (e) { if (e && e.name === 'AbortError') L.toast(COPY.shareCancel); else cp(); }); else cp();
  };
  L.plural = function (o, n) { return L.fill(n === 1 ? o.one : o.other, { n: n }); };
  L.chrome = function () { window.addEventListener('error', function () { var m = L.$('err'); if (m && COPY.error) { m.textContent = COPY.error; m.hidden = false; } });
    var r = L.$('rm'); if (r && L.reduce && COPY.reducedMotion) { r.textContent = COPY.reducedMotion; r.hidden = false; } };
  L.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  L.clearHash = function () { if (location.hash) history.replaceState(null, '', location.pathname); };
}
