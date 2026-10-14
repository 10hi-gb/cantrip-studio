'use strict';
// Annual Review of You (A′ Formal Review). COPY from copy.js verbatim. Review lives only in the URL fragment / local export.
// Ratings, rating label and doc title come from COPY (Writing Bot).
var RATINGS = (typeof COPY !== 'undefined' ? COPY : global.COPY).ratings;
var AR = (function () {
  var CAT_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'], CLOSER_IDS = ['c1', 'c2', 'c3', 'c4', 'c5'];
  var CAP = { name: 60, period: 40, rev: 60, moment: 240, extra: 80, total: 1400, url: 2000 };
  var enc = new TextEncoder();
  function bytes(s) { return enc.encode(s).length; }
  function clean(s, max) { s = String(s == null ? '' : s).replace(/[\u202A-\u202E\u2066-\u2069]/g, '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim(); return s; }
  function cleanMoment(s) { return clean(s).replace(/[.\s]+$/, ''); }
  function b64u(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('b64'); s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function pipe(u8, T) { var cs = new T('deflate-raw'); var w = cs.writable.getWriter(); w.write(u8).catch(function () {}); w.close().catch(function () {}); return new Response(cs.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  // Payload: {n,p,r,m:[[cat,frame,rating,text]],c,x}. Category/frame/closer/rating stored as ints (append-only lists; set version s=1).
  function payload(R) { return JSON.stringify({ s: 1, n: R.name, p: R.period, r: R.rev, m: R.moments.map(function (m) { return [m.cat, m.frame, m.rating, m.text]; }), c: R.closer, x: R.extra }); }
  function check(R) {
    var e = [];
    if (!R.name || bytes(R.name) > CAP.name) e.push('name'); if (bytes(R.period) > CAP.period) e.push('period'); if (bytes(R.rev) > CAP.rev) e.push('rev');
    if (bytes(R.extra) > CAP.extra) e.push('extra');
    if (!Array.isArray(R.moments) || R.moments.length < 3 || R.moments.length > 5) e.push('count');
    (R.moments || []).forEach(function (m, i) {
      if (!m.text || bytes(m.text) > CAP.moment) e.push('m' + i);
      if (!(m.cat >= 0 && m.cat < 8 && m.frame >= 0 && m.frame < 3 && m.rating >= 0 && m.rating < RATINGS.length)) e.push('ix' + i);
    });
    if (!(R.closer >= 0 && R.closer < 5)) e.push('closer');
    if (bytes(payload(R)) > CAP.total) e.push('total');
    return e;
  }
  function encode(R) {
    var raw = enc.encode(payload(R));
    return pipe(raw, CompressionStream).then(function (d) { return d.length < raw.length ? 'd' + b64u(d) : 'r' + b64u(raw); }, function () { return 'r' + b64u(raw); });
  }
  function decode(frag) {
    frag = String(frag || '').replace(/^#/, '');
    if (!frag || frag.length > CAP.url) return Promise.resolve(null);
    var kind = frag[0], body;
    try { body = unb64u(frag.slice(1)); } catch (e) { return Promise.resolve(null); }
    var p = kind === 'r' ? Promise.resolve(body) : kind === 'd' ? pipe(body, DecompressionStream) : Promise.reject();
    return p.then(function (u8) {
      if (u8.length > CAP.total * 1.1) return null;
      var o = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(u8));
      if (!o || o.s !== 1 || !Array.isArray(o.m)) return null;
      var R = { name: clean(o.n), period: clean(o.p), rev: clean(o.r), extra: clean(o.x), closer: o.c | 0,
        moments: o.m.map(function (a) { return { cat: a[0] | 0, frame: a[1] | 0, rating: a[2] | 0, text: cleanMoment(a[3]) }; }) };
      return check(R).length ? null : R;
    }).catch(function () { return null; });
  }
  function line(R, m) { return COPY_REF().categories[CAT_IDS[m.cat]].frames[m.frame].replace(/\{(name|moment)\}/g, function (_, k) { return k === 'name' ? R.name : m.text; }); }
  var COPY_REF = function () { return typeof COPY !== 'undefined' ? COPY : global.COPY; };
  return { CAT_IDS: CAT_IDS, CLOSER_IDS: CLOSER_IDS, CAP: CAP, bytes: bytes, clean: clean, cleanMoment: cleanMoment, payload: payload, check: check, encode: encode, decode: decode, line: line };
})();
if (typeof module !== 'undefined') module.exports = AR;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var RM = matchMedia('(prefers-reduced-motion: reduce)');
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  function show(id) { ['loading', 's-start', 's-moments', 's-recv', 'review-form', 's-bad'].forEach(function (x) { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }
  function el(tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; }
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('f-period').placeholder = COPY.periodPlaceholder; $('f-rev').placeholder = COPY.reviewerPlaceholder; $('f-extra').placeholder = COPY.closerExtraPlaceholder;
  $('req').textContent = COPY.defaultMoments + ' · ' + COPY.limit;

  var R = { name: '', period: '', rev: '', extra: '', closer: 0, moments: [] };
  var link = '';
  function blankMoment(i) { return { cat: [1, 2, 3, 6, 4][i % 5], frame: 0, rating: i % RATINGS.length, text: '' }; }

  // ---------- start ----------
  $('s-start').addEventListener('submit', function (e) {
    e.preventDefault();
    R.name = AR.clean($('f-name').value); R.period = AR.clean($('f-period').value) || COPY.periodPlaceholder; R.rev = AR.clean($('f-rev').value);
    if (!R.name) { $('start-msg').textContent = COPY.nameLabel; $('f-name').focus(); return; }
    while (R.moments.length < COPY.defaultMoments) R.moments.push(blankMoment(R.moments.length));
    renderMoments(); show('s-moments');
  });

  // ---------- moments ----------
  function chipRow(labels, sel, onPick, label) {
    var g = el('div'); g.setAttribute('role', 'group'); g.setAttribute('aria-label', label);
    labels.forEach(function (t, i) { var b = el('button', 'ar-chip', t); b.type = 'button'; b.setAttribute('aria-pressed', i === sel ? 'true' : 'false'); b.onclick = function () { onPick(i); }; g.appendChild(b); });
    return g;
  }
  function renderMoments() {
    var host = $('moments'); host.textContent = '';
    R.moments.forEach(function (m, i) {
      var box = el('div', 'ar-entry');
      if (R.moments.length > COPY.defaultMoments) { var x = el('button', 'ar-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove moment ' + (i + 1)); x.onclick = function () { R.moments.splice(i, 1); renderMoments(); }; box.appendChild(x); }
      var f = el('div', 'ar-field'); var lab = el('label', null, (i + 1) + ' · ' + COPY.momentHint); lab.htmlFor = 'm' + i; f.appendChild(lab);
      var inp = el('input'); inp.id = 'm' + i; inp.maxLength = 300; inp.autocomplete = 'off'; inp.value = m.text; inp.placeholder = COPY.momentPrompts[i % COPY.momentPrompts.length];
      f.appendChild(inp); box.appendChild(f);
      var warn = el('p', 'ar-warn'); warn.setAttribute('role', 'status'); box.appendChild(warn);
      box.appendChild(el('p', 'ar-label', COPY.categoryLabel));
      box.appendChild(chipRow(AR.CAT_IDS.map(function (id) { return COPY.categories[id].heading; }), m.cat, function (k) { m.cat = k; m.frame = 0; renderMoments(); focusChip(i); }, COPY.categoryLabel));
      box.appendChild(el('p', 'ar-label', COPY.ratingLabel.replace(/:$/, '')));
      box.appendChild(chipRow(RATINGS, m.rating, function (k) { m.rating = k; renderMoments(); }, COPY.ratingLabel));
      var pv = el('div', 'ar-moment ar-preview'); pv.appendChild(el('div', 'no', '↳')); var pb = el('div', 'body'); pb.appendChild(el('div', 'cat', COPY.categories[AR.CAT_IDS[m.cat]].heading));
      var pl = el('p', 'line'); pb.appendChild(pl); var dw = el('button', 'ar-chip', COPY.differentWording); dw.type = 'button'; dw.onclick = function () { m.frame = (m.frame + 1) % 3; upd(); }; pb.appendChild(dw); pv.appendChild(pb); box.appendChild(pv);
      function upd() {
        m.text = AR.cleanMoment(inp.value);
        pl.textContent = AR.line({ name: R.name }, { cat: m.cat, frame: m.frame, text: m.text || '…' });
        var b = AR.bytes(m.text), w = '';
        if (b > AR.CAP.moment) w = fill(COPY.momentTooLong, { n: b - AR.CAP.moment }); else if (b > 160) w = COPY.momentSoft;
        else if (m.text && R.name && m.text.toLowerCase().indexOf(R.name.toLowerCase()) === 0) w = COPY.momentNudge;
        warn.textContent = w; meter();
      }
      inp.addEventListener('input', upd); upd();
      host.appendChild(box);
    });
    $('add').disabled = R.moments.length >= COPY.maxMoments;
    var ch = $('closers'); ch.textContent = '';
    ch.appendChild(chipRow(AR.CLOSER_IDS.map(function (id) { return COPY.closers[id]; }), R.closer, function (k) { R.closer = k; renderMoments(); }, COPY.overall));
    meter();
  }
  function focusChip(i) { var b = $('moments').children[i] && $('moments').children[i].querySelector('[aria-pressed=true]'); if (b) b.focus(); }
  function meter() {
    R.extra = AR.clean($('f-extra').value);
    var b = AR.bytes(AR.payload(R)), pct = Math.min(100, b / AR.CAP.total * 100);
    $('meter').querySelector('i').style.width = pct + '%'; $('meter').classList.toggle('over', b > AR.CAP.total);
    $('m-msg').textContent = b > AR.CAP.total ? COPY.tooLongLink : '';
  }
  $('f-extra').addEventListener('input', meter);
  $('add').onclick = function () { if (R.moments.length < COPY.maxMoments) { R.moments.push(blankMoment(R.moments.length)); renderMoments(); $('m' + (R.moments.length - 1)).focus(); } };
  $('back-start').onclick = function () { show('s-start'); };
  $('s-moments').addEventListener('submit', function (e) {
    e.preventDefault(); meter();
    var filled = R.moments.filter(function (m) { return m.text; }).length;
    if (filled < 3) { $('m-msg').textContent = COPY.tooFew; return; }
    var keep = R.moments.filter(function (m) { return m.text; }); var errs = AR.check(Object.assign({}, R, { moments: keep }));
    if (errs.indexOf('total') >= 0) { $('m-msg').textContent = COPY.tooLongLink; return; }
    if (errs.length) { var over = 0; keep.forEach(function (m) { over = Math.max(over, AR.bytes(m.text) - AR.CAP.moment); }); $('m-msg').textContent = over > 0 ? fill(COPY.momentTooLong, { n: over }) : COPY.tooLongLink; return; }
    R.moments = keep;
    AR.encode(R).then(function (f) {
      link = f.length <= AR.CAP.url ? location.origin + location.pathname + '#' + f : '';
      renderReview(R, true);
    });
  });

  // ---------- review render ----------
  var typingToken = 0;
  function renderReview(Rv, sender) {
    show('review-form');
    $('prev-h').hidden = !sender; $('sender-actions').hidden = !sender; $('recv-actions').hidden = sender;
    $('sender-fine').textContent = sender ? COPY.privacy + ' ' + COPY.saveHint : '';
    $('share').disabled = sender && !link; if (sender && !link) $('sender-fine').textContent = COPY.tooLongLink;
    $('r-title').textContent = fill(COPY.docTitle, { name: Rv.name }); $('r-period').textContent = Rv.period; $('r-rev').textContent = Rv.rev || '—';
    var host = $('r-moments'); host.textContent = '';
    var old = $('review-form').querySelector('.ar-stamp'); if (old) old.remove();
    $('r-overall').textContent = '';
    var lines = Rv.moments.map(function (m, i) {
      var d = el('div', 'ar-moment'); d.appendChild(el('div', 'no', String(i + 1))); var b = el('div', 'body');
      b.appendChild(el('div', 'cat', COPY.categories[AR.CAT_IDS[m.cat]].heading));
      var p = el('p', 'line', AR.line(Rv, m)); b.appendChild(p);
      var lab = el('span', 'ar-label', COPY.ratingLabel + ' '); lab.style.display = 'inline'; b.appendChild(lab); b.appendChild(el('span', 'ar-rate', RATINGS[m.rating]));
      d.appendChild(b); host.appendChild(d); return p;
    });
    var tok = ++typingToken;
    var step = function (i) {
      if (tok !== typingToken) return;
      if (i >= lines.length) return finish();
      var p = lines[i];
      if (RM.matches) return step(i + 1);
      p.style.setProperty('--chars', Math.min(p.textContent.length, 140)); p.classList.add('is-typing');
      var done = false, go = function () { if (done) return; done = true; p.classList.remove('is-typing'); step(i + 1); };
      p.addEventListener('animationend', go, { once: true }); setTimeout(go, Math.min(p.textContent.length, 140) * 18 + 400);
    };
    var finish = function () {
      var o = $('r-overall'); var bld = el('b', null, COPY.closers[AR.CLOSER_IDS[Rv.closer]]); o.appendChild(bld); if (Rv.extra) o.appendChild(document.createTextNode(' ' + Rv.extra));
      var s = el('div', 'ar-stamp is-thunk', COPY.stamp); s.setAttribute('aria-hidden', 'true'); $('review-form').appendChild(s);
    };
    step(0);
  }
  $('edit').onclick = function () { typingToken++; renderMoments(); show('s-moments'); };
  $('share').onclick = function () {
    if (!link) { toast(COPY.tooLongLink); return; }
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.linkReady, link); }); else window.prompt(COPY.linkReady, link); };
    if (navigator.share) navigator.share({ title: COPY.previewTitle, url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };

  // ---------- export (canvas 2D redraw) ----------
  function wrap(g, t, x, y, w, lh) { var line = ''; t.split(' ').forEach(function (word) { var tt = line ? line + ' ' + word : word; if (g.measureText(tt).width > w && line) { g.fillText(line, x, y); y += lh; line = word; } else line = tt; }); if (line) { g.fillText(line, x, y); y += lh; } return y; }
  function exportPNG(Rv) {
    try {
      var W = 1080, H = 1350, c = el('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
      g.fillStyle = '#5E6B6A'; g.fillRect(0, 0, W, H); g.fillStyle = '#F3C9CF'; g.save(); g.translate(60, 50); g.rotate(0.02); g.fillRect(0, 0, 960, 1250); g.restore();
      g.fillStyle = '#F6E9A6'; g.fillRect(50, 40, 980, 1260);
      g.strokeStyle = 'rgba(46,74,138,.45)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(90, 40); g.lineTo(90, 1300); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#2E4A8A'; g.font = '700 18px "Archivo Narrow",Arial'; g.fillText('FORM 193-R · ANNUAL REVIEW', 120, 90); g.fillText('PERSONNEL FILE', 840, 90); g.fillRect(120, 102, 880, 4);
      g.font = '700 46px "Archivo Narrow",Arial'; var y = wrap(g, (fill(COPY.docTitle, { name: Rv.name })).toUpperCase(), 120, 166, 880, 50);
      g.font = '600 15px "Archivo Narrow",Arial'; g.fillText((COPY.periodLabel + ': ').toUpperCase(), 120, y + 14); g.fillText((COPY.reviewerLabel + ': ').toUpperCase(), 580, y + 14);
      g.fillStyle = '#26303F'; g.font = '22px "Courier Prime",monospace'; wrap(g, Rv.period, 120, y + 44, 440, 26); wrap(g, Rv.rev || '—', 580, y + 44, 420, 26); y += 90;
      Rv.moments.forEach(function (m, i) {
        var top = y; g.fillStyle = '#2E4A8A'; g.font = '700 30px "Archivo Narrow",Arial'; g.fillText(String(i + 1), 132, y + 40);
        g.font = '700 16px "Archivo Narrow",Arial'; g.fillText(COPY.categories[AR.CAT_IDS[m.cat]].heading.toUpperCase(), 186, y + 30);
        g.fillStyle = '#26303F'; g.font = '21px "Courier Prime",monospace'; var yy = wrap(g, AR.line(Rv, m), 186, y + 60, 800, 27);
        g.font = '16px "Courier Prime",monospace'; g.fillText(COPY.ratingLabel + ' ' + RATINGS[m.rating], 186, yy + 6); y = yy + 26;
        g.strokeStyle = '#2E4A8A'; g.lineWidth = 2; g.strokeRect(120, top + 6, 880, y - top - 6); g.beginPath(); g.moveTo(170, top + 6); g.lineTo(170, y); g.stroke(); y += 10;
      });
      g.fillStyle = '#2E4A8A'; g.font = '600 15px "Archivo Narrow",Arial'; g.fillText(COPY.overall.toUpperCase(), 120, y + 30);
      g.fillStyle = '#26303F'; g.font = '700 22px "Courier Prime",monospace'; y = wrap(g, COPY.closers[AR.CLOSER_IDS[Rv.closer]] + (Rv.extra ? ' ' + Rv.extra : ''), 120, y + 60, 880, 28);
      g.save(); g.translate(820, Math.min(1220, y + 60)); g.rotate(-0.16); g.strokeStyle = '#C42B1C'; g.lineWidth = 6; g.strokeRect(-130, -50, 260, 80); g.fillStyle = '#C42B1C'; g.font = '700 56px "Archivo Narrow",Arial'; g.textAlign = 'center'; g.fillText(COPY.stamp, 0, 10); g.restore();
      c.toBlob(function (b) {
        if (!b) return toast(COPY.saveFail);
        var u = URL.createObjectURL(b), a = el('a'); a.href = u; a.download = 'annual-review.png'; a.title = fill(COPY.altExport, { name: Rv.name, reviewer: Rv.rev || '—' }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); toast(COPY.saved);
      }, 'image/png');
    } catch (e) { toast(COPY.saveFail); }
  }
  var recvR = null;
  $('save').onclick = function () { exportPNG(R); }; $('save2').onclick = function () { exportPNG(recvR); };
  $('read').onclick = function () { renderReview(recvR, false); };

  function route() {
    var h = location.hash;
    if (!h || h === '#') { show('s-start'); return; }
    show('loading');
    AR.decode(h).then(function (Rv) { if (!Rv) return show('s-bad'); recvR = Rv; $('recv-body').textContent = fill(COPY.recipientBody, { reviewer: Rv.rev || '—' }); show('s-recv'); });
  }
  window.addEventListener('hashchange', route);
  route();
})();
