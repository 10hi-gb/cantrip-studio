'use strict';
// Mill shared core: text sanitising, versioned fragment codec, plural/template helpers. Pure; no storage, no network.
(function (root, factory) { var m = factory(); if (typeof module === 'object' && module.exports) module.exports = m; else root.MILL = m; })(this, function () {
  function strip(s) { return String(s == null ? '' : s).replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function len(s) { return Array.from(String(s)).length; }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function b64e(s) { var b = new TextEncoder().encode(s), t = ''; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { var t = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  // Fragment = <tag><version>.<base64url(JSON)>.<6-hex checksum over everything before the last dot>
  function pack(tag, ver, obj) { var head = tag + ver + '.' + b64e(JSON.stringify(obj)); return head + '.' + ck(head); }
  // returns {ok:true,data} | {ok:false,why:'empty'|'tooLong'|'bad'|'oldVersion'|'otherTag'}
  function unpack(frag, tag, ver, max) {
    var f = String(frag == null ? '' : frag).replace(/^#/, '');
    if (!f) return { ok: false, why: 'empty' };
    if (f.length > max) return { ok: false, why: 'tooLong' };
    var m = /^([a-z])(\d{1,3})\.([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f);
    if (!m) return { ok: false, why: 'bad' };
    if (ck(m[1] + m[2] + '.' + m[3]) !== m[4]) return { ok: false, why: 'bad' };
    if (m[1] !== tag) return { ok: false, why: 'otherTag', tag: m[1] };
    if (+m[2] !== ver) return { ok: false, why: 'oldVersion' };
    try { var d = JSON.parse(b64d(m[3])); if (!d || typeof d !== 'object') return { ok: false, why: 'bad' }; return { ok: true, data: d }; } catch (e) { return { ok: false, why: 'bad' }; }
  }
  // fill: a value dropped into a quoted slot (“{name}” or "{name}") is display-neutralised (PM Q1: typed quote marks can't
  // close the frame). raw(s) opts a pre-built value out (e.g. a list already joined with ”, “ separators).
  function fill(t, v) { return String(t).replace(/\{(\w+)\}/g, function (a, k, off, str) { if (!v || v[k] == null) return a; var x = v[k];
    if (typeof x === 'object' && x.__millRaw != null) return String(x.__millRaw); x = String(x);
    return /[\u201C"]/.test(str.charAt(off - 1)) && /[\u201D"]/.test(str.charAt(off + a.length)) ? unquote(x) : x; }); }
  function raw(s) { return { __millRaw: String(s == null ? '' : s) }; }
  function plural(o, n, v) { var t = typeof o === 'string' ? o : (n === 1 ? o.one : o.other); var x = { n: n }; for (var k in v) x[k] = v[k]; return fill(t, x); }
  // The ONE typed-text rule for every Mill piece: someone else's typed text is shown in curly quotes (plain-text places use
  // this directly; DOM places use MILLVIEW.typed, which calls it).
  // PM Q1 (anti-spoof): sender-typed curly double quotes and guillemets become a straight " BEFORE wrapping, so
  // 'Milk” from “Your bank' shows as “Milk" from "Your bank”, never as two quoted items. Display only: links and stored
  // values keep the original characters.
  function unquote(s) { return String(s == null ? '' : s).replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"'); }
  function quote(s) { return '\u201C' + unquote(s) + '\u201D'; }
  return { quote: quote, unquote: unquote, raw: raw, strip: strip, len: len, ck: ck, b64e: b64e, b64d: b64d, pack: pack, unpack: unpack, fill: fill, plural: plural };
});
