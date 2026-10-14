'use strict';
// One Across. COPY from copy.js (verbatim). Puzzle lives only in the URL fragment. No storage, no network.
var OA = (function () {
  var MIN = 3, MAX = 12, CLUE_MAX = 80, FRAG_MAX = 480;
  // Normalization: NFKD, strip combining marks, uppercase, keep A–Z only. Ligatures like Æ/ß are expanded by explicit map.
  var EXP = { 'Æ': 'AE', 'æ': 'AE', 'Œ': 'OE', 'œ': 'OE', 'ß': 'SS', 'Ø': 'O', 'ø': 'O', 'Ł': 'L', 'ł': 'L', 'Đ': 'D', 'đ': 'D', 'Þ': 'TH', 'þ': 'TH' };
  function norm(s) {
    s = String(s || '').replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[ÆæŒœßØøŁłĐđÞþ]/g, function (c) { return EXP[c]; });
    var n = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    var out = n.replace(/[^A-Z]/g, '');
    return { v: out, dropped: out.length !== n.replace(/\s/g, '').length, accents: n !== s.toUpperCase() };
  }
  function cpLen(s) { return Array.from(s).length; }
  function cleanClue(s) { return String(s || '').replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function b64u(bytes) { var s = ''; bytes.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]*$/.test(s)) throw 0; s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function seal(f) { return f + '.' + ck(f); }
  function unseal(f) { var i = f.lastIndexOf('.'); if (i < 0) return null; var body = f.slice(0, i); return /^[0-9a-f]{6}$/.test(f.slice(i + 1)) && ck(body) === f.slice(i + 1) ? body : null; }
  function stream(seed, n) { var x = seed >>> 0 || 1, o = []; for (var i = 0; i < n; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; o.push(x & 255); } return o; }
  // Scramble = spoiler friction only; anyone with the link can reverse it (and the copy says so).
  function encode(answer, clue, seed) {
    var ks = stream(seed, answer.length), bytes = [];
    for (var i = 0; i < answer.length; i++) bytes.push(answer.charCodeAt(i) ^ ks[i]);
    var frag = '1.' + (seed >>> 0).toString(16).padStart(8, '0') + '.' + b64u(bytes) + '.' + b64u(Array.from(new TextEncoder().encode(clue)));
    return seal(frag);
  }
  function decode(frag) {
    frag = String(frag || '').replace(/^#/, '');
    if (!frag || frag.length > FRAG_MAX) return null;
    frag = unseal(frag); if (!frag) return null; // truncated/clipped links fail the checksum
    var p = frag.split('.'); if (p.length !== 4 || p[0] !== '1' || !/^[0-9a-f]{8}$/.test(p[1])) return null;
    try {
      var seed = parseInt(p[1], 16), sc = unb64u(p[2]), ks = stream(seed, sc.length), a = '';
      for (var i = 0; i < sc.length; i++) a += String.fromCharCode(sc[i] ^ ks[i]);
      if (!/^[A-Z]{3,12}$/.test(a)) return null;
      var clue = cleanClue(new TextDecoder('utf-8', { fatal: true }).decode(unb64u(p[3])));
      if (!clue || cpLen(clue) > CLUE_MAX) return null;
      return { answer: a, clue: clue };
    } catch (e) { return null; }
  }
  return { norm: norm, cleanClue: cleanClue, cpLen: cpLen, encode: encode, decode: decode, MIN: MIN, MAX: MAX, CLUE_MAX: CLUE_MAX, FRAG_MAX: FRAG_MAX };
})();
if (typeof module !== 'undefined') module.exports = OA;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2600); }
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('clue').placeholder = COPY.cluePlaceholder;
  function cells(host, n, letters, cls) {
    host.textContent = '';
    for (var i = 0; i < n; i++) { var c = document.createElement('div'); c.className = 'oa-cell' + (cls && cls[i] ? ' ' + cls[i] : ''); c.style.setProperty('--i', i);
      if (i === 0) { var s = document.createElement('span'); s.className = 'n'; s.textContent = '1'; c.appendChild(s); }
      c.appendChild(document.createTextNode(letters && letters[i] || '')); host.appendChild(c); }
  }
  function show(id) { ['loading', 's-make', 's-solve', 's-bad'].forEach(function (x) { $(x).hidden = x !== id; }); }

  // ---------- maker ----------
  var link = '';
  function validate() {
    var a = OA.norm($('ans').value), msgs = [], ok = true;
    if (a.dropped) msgs.push(COPY.badChars);
    if (a.v.length < OA.MIN) { if ($('ans').value) msgs.push(COPY.tooShort); ok = false; }
    if (a.v.length > OA.MAX) { msgs.push(fill(COPY.tooLong, { n: a.v.length - OA.MAX })); ok = false; }
    if (a.accents && a.v.length) msgs.push(COPY.normalized);
    $('ans-msg').textContent = msgs.join(' ');
    var clue = OA.cleanClue($('clue').value), cl = OA.cpLen(clue), cmsg = '';
    $('clue-n').textContent = cl + '/' + OA.CLUE_MAX;
    if (cl > OA.CLUE_MAX) { cmsg = fill(COPY.clueTooLong, { n: cl - OA.CLUE_MAX }); ok = false; } else cmsg = COPY.clueHint;
    $('clue-msg').textContent = cmsg;
    cells($('preview'), Math.max(OA.MIN, Math.min(OA.MAX, a.v.length || OA.MIN)));
    $('made').hidden = true;
    return ok ? { a: a.v, clue: clue } : null;
  }
  $('ans').addEventListener('input', validate); $('clue').addEventListener('input', validate);
  $('make').onclick = function () {
    var r = validate(); if (!r) { $('ans').focus(); return; }
    if (!r.clue) { $('clue-msg').textContent = COPY.clueEmpty; $('clue').focus(); return; }
    var seed = crypto.getRandomValues(new Uint32Array(1))[0];
    var frag = OA.encode(r.a, r.clue, seed);
    if (frag.length > OA.FRAG_MAX) { $('clue-msg').textContent = fill(COPY.clueTooLong, { n: Math.max(1, Math.ceil((frag.length - OA.FRAG_MAX) * 3 / 4 / 4)) }); return; }
    link = location.origin + location.pathname + '#' + frag;
    $('made-clue').textContent = '';
    var b = document.createElement('b'); b.textContent = '1A'; $('made-clue').appendChild(b); $('made-clue').appendChild(document.createTextNode(r.clue + ' ' + fill(COPY.lengthShown, { n: r.a.length })));
    $('linkbox').textContent = link; $('try').href = '#' + frag; $('made').hidden = false; $('share').focus();
  };
  $('share').onclick = function () {
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };

  // ---------- solver ----------
  var P = null, solved = false;
  function paint(cls) {
    var v = $('entry').value, pos = Math.min($('entry').selectionStart || v.length, P.answer.length - 1);
    var c = cls || []; if (!solved && document.activeElement === $('entry')) c[pos] = (c[pos] ? c[pos] + ' ' : '') + 'is-active';
    cells($('row'), P.answer.length, v.split(''), c);
  }
  function onEntry(e) {
    if (e && e.isComposing) return; // wait for IME composition to finish
    var el = $('entry'), n = OA.norm(el.value).v.slice(0, P.answer.length);
    if (n !== el.value) { el.value = n; }
    var last = $('row').children[Math.max(0, n.length - 1)]; paint();
    if (last && n.length) { var c = $('row').children[n.length - 1]; c.classList.add('just-typed'); }
    $('solve-msg').textContent = '';
  }
  function startSolve(p) {
    P = p; solved = false; show('s-solve'); $('row').setAttribute('aria-label', '1 Across, ' + p.answer.length + ' letters');
    $('clue-text').textContent = p.clue; $('clue-side').textContent = p.clue + ' ' + fill(COPY.lengthShown, { n: p.answer.length });
    $('clue-len').textContent = fill(COPY.lengthShown, { n: p.answer.length });
    var el = $('entry'); el.value = ''; el.maxLength = 48; el.disabled = false;
    $('solve-actions').hidden = false; $('after').hidden = true; $('solve-h').textContent = COPY.receiverHeader; $('row').classList.remove('is-solved');
    paint(); el.focus({ preventScroll: true });
  }
  $('entry').addEventListener('input', onEntry);
  $('entry').addEventListener('compositionend', function () { onEntry(); });
  ['focus', 'blur', 'keyup', 'click', 'select'].forEach(function (ev) { $('entry').addEventListener(ev, function () { if (P && !solved) paint(); }); });
  $('entry').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('check').click(); } });
  // Tap a square to jump: the transparent input covers the row; map x → index.
  $('entry').addEventListener('pointerup', function (e) {
    var r = $('row').getBoundingClientRect(), i = Math.max(0, Math.min(P.answer.length - 1, Math.floor((e.clientX - r.left) / (r.width / P.answer.length))));
    var el = $('entry'), v = el.value; i = Math.min(i, v.length); setTimeout(function () { el.setSelectionRange(i, Math.min(v.length, i + 1)); paint(); }, 0);
  });
  $('check').onclick = function () {
    var v = $('entry').value;
    if (v === P.answer) {
      solved = true; $('entry').blur(); $('entry').disabled = true; paint(); $('row').classList.add('is-solved');
      $('solve-h').textContent = COPY.solved; $('solve-msg').textContent = COPY.solvedSub; $('solve-actions').hidden = true; $('after').hidden = false; $('back').focus();
      return;
    }
    var cls = []; for (var i = 0; i < P.answer.length; i++) cls[i] = v[i] ? (v[i] === P.answer[i] ? 'is-ok' : 'is-wrong') : '';
    cells($('row'), P.answer.length, v.split(''), cls);
    $('row').classList.remove('is-shake'); void $('row').offsetWidth; $('row').classList.add('is-shake');
    $('solve-msg').textContent = cls.indexOf('is-ok') >= 0 ? COPY.wrong : COPY.wrongNoHints;
  };
  $('reveal').onclick = function () {
    if (!window.confirm(COPY.revealConfirm)) return;
    solved = true; $('entry').value = P.answer; $('entry').disabled = true; paint();
    $('solve-msg').textContent = fill(COPY.revealed, { answer: P.answer }); $('solve-actions').hidden = true; $('after').hidden = false;
  };
  $('back').onclick = function (e) { e.preventDefault(); history.replaceState(null, '', location.pathname); route(); };

  function route() {
    var h = location.hash;
    if (!h || h === '#') { show('s-make'); validate(); return; }
    var p = OA.decode(h); if (p) startSolve(p); else show('s-bad');
  }
  window.addEventListener('hashchange', route);
  route();
})();
