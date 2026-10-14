'use strict';
// Where You Paused. Timing comes only from input events inside the textarea; nothing leaves the page except a link the visitor shares.
var WP = (function () {
  var MAXC = 200, MAXM = 12, MAXDS = 99, THRESH = 1000;
  function cps(s) { return Array.from(s).length; }
  // Strip bidi/control chars (keep \n) and remap mark indices to the cleaned text.
  function clean(text, marks) {
    var out = '', map = [], i = 0;
    for (i = 0; i < text.length; i++) { map[i] = out.length; var c = text[i]; if (/[\u202A-\u202E\u2066-\u2069\u200E\u200F]/.test(c)) continue; if (/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/.test(c)) c = ' '; if (c === '\r') continue; out += c; }
    map[text.length] = out.length;
    var arr = Array.from(out); if (arr.length > MAXC) out = arr.slice(0, MAXC).join('');
    var seen = {}, ms = [];
    (marks || []).forEach(function (m) { var j = map[m[0]]; if (j == null || j <= 0 || j > out.length || seen[j]) return; if (/[\uDC00-\uDFFF]/.test(out[j] || '')) return; seen[j] = 1; ms.push([j, Math.max(10, Math.min(MAXDS, m[1] | 0)), m[0]]); });
    ms.sort(function (a, b) { return a[0] - b[0]; });
    return { text: out, marks: ms.slice(0, MAXM) };
  }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function b64e(s) { var b = new TextEncoder().encode(s), t = ''; for (var i = 0; i < b.length; i++) t += String.fromCharCode(b[i]); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { var t = atob(s.replace(/-/g, '+').replace(/_/g, '/')), b = new Uint8Array(t.length); for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); }
  function encode(d) { var c = clean(d.text, d.marks); var p = b64e('1~' + c.marks.map(function (m) { return m[0] + ':' + m[1]; }).join(',') + '~' + c.text); return p + '.' + ck(p); }
  function decode(f) {
    try {
      f = String(f || '').replace(/^#/, ''); if (!f || f.length > 1200) return null;
      var m = /^([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f); if (!m || ck(m[1]) !== m[2]) return null;
      var s = b64d(m[1]), a = s.indexOf('~'), b = s.indexOf('~', a + 1); if (s.slice(0, a) !== '1' || b < 0) return null;
      var text = s.slice(b + 1), ms = s.slice(a + 1, b); if (!text.trim() || cps(text) > MAXC) return null;
      var marks = []; if (ms) { var parts = ms.split(','); if (parts.length > MAXM) return null; for (var i = 0; i < parts.length; i++) { var q = /^(\d{1,3}):(\d{1,2})$/.exec(parts[i]); if (!q) return null; var ix = +q[1], ds = +q[2]; if (ix < 1 || ix > text.length || ds < 10 || ds > MAXDS || (i && ix <= marks[i - 1][0])) return null; marks.push([ix, ds]); } }
      var c = clean(text, marks); if (c.text !== text || c.marks.length !== marks.length) return null;
      return c;
    } catch (e) { return null; }
  }
  // Pure tracker so it can be tested in node: feed events with timestamps.
  function Tracker() { this.marks = []; this.last = 0; this.skip = true; }
  Tracker.prototype.reset = function () { this.marks = []; this.last = 0; this.skip = true; };
  Tracker.prototype.interrupt = function () { this.skip = true; };
  // kind: 'insert' | 'paste' | 'delete' | 'other'; pos = selectionStart, end = selectionEnd, ins = inserted length, now = ms
  Tracker.prototype.edit = function (kind, pos, end, ins, now) {
    var removed = end - pos, delta = ins - removed, ms = [];
    this.marks.forEach(function (m) { if (m[0] <= pos) ms.push(m); else if (m[0] > end) ms.push([m[0] + delta, m[1]]); });
    this.marks = ms;
    if (kind === 'insert' && !this.skip && this.last && now - this.last >= THRESH && pos > 0 && this.marks.length < MAXM) {
      var ds = Math.min(MAXDS, Math.round((now - this.last) / 100)), at = pos;
      this.marks = this.marks.filter(function (m) { return m[0] !== at; }); this.marks.push([at, ds]); this.marks.sort(function (a, b) { return a[0] - b[0]; });
    }
    this.skip = kind === 'paste'; this.last = now;
  };
  return { clean: clean, encode: encode, decode: decode, Tracker: Tracker, cps: cps, MAXC: MAXC, MAXM: MAXM };
})();
if (typeof module !== 'undefined') module.exports = WP;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  var ed = $('ed'), tr = new WP.Tracker(), composing = false, doc = null, timers = [];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tst(m) { var t = $('tst'); t.textContent = m; t.hidden = false; clearTimeout(tst.h); tst.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function count() { var left = WP.MAXC - WP.cps(ed.value); $('count').textContent = fill(COPY.counter, { n: Math.max(0, left) }); }
  function note(s) { $('enote').textContent = s; }
  ed.addEventListener('compositionstart', function () { composing = true; });
  ed.addEventListener('compositionend', function () { composing = false; tr.interrupt(); tr.last = performance.now(); });
  ed.addEventListener('beforeinput', function (e) {
    var t = e.inputType || '', pos = ed.selectionStart, end = ed.selectionEnd, data = e.data || '';
    if (composing || e.isComposing) return;
    var kind = /^insertFrom(Paste|Drop)/.test(t) ? 'paste' : /^insert(Text|LineBreak|Paragraph|ReplacementText)?$/.test(t) ? 'insert' : /^delete/.test(t) ? 'delete' : 'other';
    if (kind === 'insert' || kind === 'paste') {
      var addLen = kind === 'paste' ? ((e.dataTransfer && e.dataTransfer.getData('text/plain')) || '').length : (t === 'insertText' || t === 'insertReplacementText' ? data.length || 1 : 1);
      var addCp = kind === 'paste' ? WP.cps((e.dataTransfer && e.dataTransfer.getData('text/plain')) || '') : (WP.cps(data) || 1);
      if (WP.cps(ed.value) - WP.cps(ed.value.slice(pos, end)) + addCp > WP.MAXC) { e.preventDefault(); note(COPY.tooLong); return; }
      if (kind === 'paste') note(COPY.pasteNote);
      tr.edit(kind, pos, end, addLen, performance.now());
    } else if (kind === 'delete') {
      var a = pos, b = end; if (a === b) { if (/Backward/.test(t)) a = Math.max(0, a - 1); else b = b + 1; }
      tr.edit('delete', a, b, 0, performance.now());
    } else { tr.edit('other', pos, end, 0, performance.now()); tr.interrupt(); }
  });
  ed.addEventListener('input', function () {
    // Fallback guard if a browser skipped beforeinput: hard cap.
    var arr = Array.from(ed.value); if (arr.length > WP.MAXC) { ed.value = arr.slice(0, WP.MAXC).join(''); note(COPY.tooLong); }
    tr.marks = tr.marks.filter(function (m) { return m[0] <= ed.value.length; }); count();
  });
  // Moving the caret by click/arrows breaks the timing chain.
  ['mousedown', 'keydown'].forEach(function (ev) { ed.addEventListener(ev, function (e) { if (ev === 'mousedown' || /^(Arrow|Home|End|Page)/.test(e.key)) tr.interrupt(); }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && ed.value && $('v-proof').hidden) { tr.interrupt(); note(COPY.interrupted); } });
  function fmt(ds) { return (ds / 10).toFixed(1) + 's'; }
  function render(d, opts) {
    var proof = $('proof'); proof.textContent = ''; proof.classList.toggle('wp-replaying', !!opts.replay);
    var line = document.createElement('span'); line.className = 'wp-line'; proof.appendChild(line);
    var nodes = [], p = 0;
    d.marks.forEach(function (m, i) {
      line.appendChild(document.createTextNode(d.text.slice(p, m[0]))); p = m[0];
      var c = document.createElement('span'); c.className = 'wp-caret'; line.appendChild(c);
      var mg = document.createElement('span'); mg.className = 'wp-margin'; mg.appendChild(document.createTextNode(fmt(m[1])));
      if (opts.edit) { var b = document.createElement('button'); b.textContent = COPY.removeMark; b.setAttribute('aria-label', COPY.removeMark); b.onclick = function () { doc.marks = doc.marks.filter(function (x) { return x !== m; }); tr.marks = tr.marks.filter(function (x) { return x[0] !== m[2]; }); render(doc, opts); }; mg.appendChild(b); }
      proof.appendChild(mg); nodes.push([c, mg]);
    });
    line.appendChild(document.createTextNode(d.text.slice(p)));
    place(nodes); $('rmall').hidden = !d.marks.length; return nodes;
  }
  function place(nodes) {
    var pr = $('proof').getBoundingClientRect(), lastBottom = -1e9;
    nodes.forEach(function (n) { var top = n[0].getBoundingClientRect().top - pr.top; top = Math.max(top, lastBottom + 4); n[1].style.top = top + 'px'; lastBottom = top + n[1].getBoundingClientRect().height; });
  }
  function replay(d) {
    timers.forEach(clearTimeout); timers = [];
    var proof = $('proof'); proof.textContent = ''; proof.classList.add('wp-replaying');
    var line = document.createElement('span'); line.className = 'wp-line'; proof.appendChild(line);
    var cur = document.createElement('span'); cur.className = 'wp-cursor'; line.appendChild(cur);
    var chars = Array.from(d.text), at = 0, idx = 0, mi = 0, t = 300, step = Math.max(25, Math.min(60, 4000 / chars.length));
    var pending = [];
    for (var k = 0; k <= chars.length; k++) {
      while (mi < d.marks.length && d.marks[mi][0] === idx) { (function (m) { t += Math.min(4000, m[1] * 100); timers.push(setTimeout(function () { var c = document.createElement('span'); c.className = 'wp-caret is-new'; line.insertBefore(c, cur); var mg = document.createElement('span'); mg.className = 'wp-margin'; mg.textContent = fmt(m[1]); proof.appendChild(mg); pending.push([c, mg]); place(pending); }, t)); })(d.marks[mi]); mi++; }
      if (k === chars.length) break;
      (function (ch) { t += step; timers.push(setTimeout(function () { line.insertBefore(document.createTextNode(ch), cur); place(pending); }, t)); })(chars[k]);
      idx += chars[k].length;
    }
    timers.push(setTimeout(function () { render(d, {}); }, t + 600));
  }
  function showEdit() {
    timers.forEach(clearTimeout); $('v-edit').hidden = false; $('v-proof').hidden = true; $('title').textContent = COPY.title; $('privacy').hidden = false; count();
  }
  $('preview').onclick = function () {
    if (!ed.value.trim()) { note(COPY.empty); ed.focus(); return; }
    doc = WP.clean(ed.value, tr.marks);
    $('v-edit').hidden = true; $('v-proof').hidden = false; $('title').textContent = COPY.previewHeading;
    $('pexplain').textContent = COPY.explainer; $('rnote').hidden = true; $('pactions').hidden = false; $('ractions').hidden = true;
    render(doc, { edit: true }); $('share').focus();
  };
  $('edit').onclick = function () { showEdit(); ed.focus(); };
  $('rmall').onclick = function () { doc.marks = []; tr.marks = []; render(doc, { edit: true }); };
  window.addEventListener('resize', function () { if (doc && !$('v-proof').hidden) render(doc, { edit: !$('pactions').hidden }); });
  $('share').onclick = function () {
    var link = location.origin + location.pathname + '#' + WP.encode(doc);
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { tst(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') tst(COPY.shareCancel); else cp(); }); else cp();
  };
  $('back').onclick = function () { timers.forEach(clearTimeout); doc = null; ed.value = ''; tr.reset(); note(''); history.replaceState(null, '', location.pathname); showEdit(); ed.focus(); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = WP.decode(h);
    if (r) {
      doc = r; $('v-edit').hidden = true; $('v-proof').hidden = false; $('title').textContent = COPY.title; $('pexplain').textContent = COPY.receiverIntro;
      $('pactions').hidden = true; $('ractions').hidden = false; $('rnote').hidden = false; $('privacy').hidden = true;
      if (reduce) render(r, {}); else replay(r);
    } else { showEdit(); note(COPY.badLink); }
  } else showEdit();
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
