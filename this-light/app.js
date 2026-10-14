'use strict';
// This Light. COPY from copy.js verbatim. City id is the only thing in the link. No geolocation, no IP lookup, no weather API, no network.
var TL = (function () {
  var RAD = Math.PI / 180;
  // NOAA-style solar position (accurate to ~0.1–0.5° for this purpose).
  function sun(date, lat, lon) {
    var jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
    var lam = L0 + C - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * RAD);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60, eps = eps0 + 0.00256 * Math.cos((125.04 - 1934.136 * T) * RAD);
    var dec = Math.asin(Math.sin(eps * RAD) * Math.sin(lam * RAD)) / RAD;
    var y = Math.pow(Math.tan(eps * RAD / 2), 2);
    var eot = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
    var utcMin = (date.getTime() / 60000) % 1440; if (utcMin < 0) utcMin += 1440;
    var tst = (utcMin + eot + 4 * lon) % 1440; if (tst < 0) tst += 1440;
    var ha = tst / 4 - 180;
    var cz = Math.sin(lat * RAD) * Math.sin(dec * RAD) + Math.cos(lat * RAD) * Math.cos(dec * RAD) * Math.cos(ha * RAD);
    var elev = 90 - Math.acos(Math.max(-1, Math.min(1, cz))) / RAD;
    return { elev: elev, ha: ha, dec: dec };
  }
  // Max/min elevation over the 24 h around now → polar day/night detection.
  function dayRange(date, lat, lon) { var mx = -99, mn = 99; for (var i = -48; i <= 48; i++) { var e = sun(new Date(date.getTime() + i * 15 * 60000), lat, lon).elev; if (e > mx) mx = e; if (e < mn) mn = e; } return { max: mx, min: mn }; }
  function phase(elev, range) {
    if (range && range.min > -0.833) return 'polarDay';
    if (range && range.max < -0.833) return 'polarNight';
    return elev < -18 ? 'night' : elev < -12 ? 'astroTwilight' : elev < -6 ? 'nauticalTwilight' : elev < -0.833 ? 'civilTwilight' : elev < 6 ? 'golden' : 'day';
  }
  // Clear-sky color impression by elevation: flat chip, interpolated between authored stops.
  var STOPS = [[-90, [10, 14, 28]], [-18, [14, 20, 40]], [-12, [28, 38, 74]], [-6, [62, 90, 140]], [-2, [178, 120, 128]], [1, [236, 150, 90]], [6, [240, 190, 110]], [15, [170, 205, 232]], [40, [120, 175, 228]], [90, [96, 160, 226]]];
  function color(elev) {
    for (var i = 1; i < STOPS.length; i++) if (elev <= STOPS[i][0]) { var a = STOPS[i - 1], b = STOPS[i], t = (elev - a[0]) / (b[0] - a[0]); return '#' + a[1].map(function (v, k) { return ('0' + Math.round(v + (b[1][k] - v) * t).toString(16)).slice(-2); }).join('').toUpperCase(); }
    return '#60A0E2';
  }
  function ck(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return ('00000' + (h & 0xffffff).toString(16)).slice(-6); }
  function encode(id) { return '1.' + id + '.' + ck('1.' + id); }
  function decode(frag, cities) {
    frag = String(frag || '').replace(/^#/, ''); if (!frag || frag.length > 40) return null;
    var m = /^1\.([a-z]{3})\.([0-9a-f]{6})$/.exec(frag); if (!m || ck('1.' + m[1]) !== m[2]) return null;
    return cities.filter(function (c) { return c[0] === m[1]; })[0] || null;
  }
  return { sun: sun, dayRange: dayRange, phase: phase, color: color, encode: encode, decode: decode };
})();
if (typeof module !== 'undefined') module.exports = TL;

if (typeof document !== 'undefined') (function () {
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  Array.prototype.forEach.call(document.querySelectorAll('[data-c]'), function (n) { n.textContent = COPY[n.getAttribute('data-c')]; });
  $('search').placeholder = COPY.citySearch;
  Array.prototype.forEach.call(document.querySelectorAll('[data-dial]'), function (n) { n.textContent = COPY.dial[n.getAttribute('data-dial')]; });
  function toast(m) { var t = $('toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2800); }
  var sel = null, timer = 0, shown = false;
  function norm(s) { return String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ø/g, 'o').replace(/æ/g, 'ae').replace(/ß/g, 'ss').replace(/[łı]/g, function (c) { return c === 'ł' ? 'l' : 'i'; }).replace(/đ/g, 'd'); }
  function utcOffset(tz) { try { var p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value.replace('GMT', 'UTC').replace('-', '−') : ''; } catch (e) { return ''; } }
  function renderList() {
    var q = norm($('search').value.trim()), host = $('list'); host.textContent = '';
    var hits = CITIES.filter(function (c) { return !q || norm(c[1]).indexOf(q) >= 0 || norm(c[2]).indexOf(q) >= 0; });
    hits.forEach(function (c, i) {
      var li = document.createElement('li'); li.setAttribute('role', 'option'); li.tabIndex = 0; li.setAttribute('aria-selected', sel && sel[0] === c[0] ? 'true' : 'false');
      var no = document.createElement('span'); no.className = 'no'; no.textContent = ('0' + (CITIES.indexOf(c) + 1)).slice(-2); li.appendChild(no);
      li.appendChild(document.createTextNode(c[1])); var tz = document.createElement('span'); tz.className = 'tz'; tz.textContent = utcOffset(c[5]); li.appendChild(tz);
      var choose = function () { sel = c; renderList(); if (shown) show(); else $('msg').textContent = ''; };
      li.onclick = choose; li.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } };
      host.appendChild(li);
    });
    $('msg').textContent = hits.length ? '' : COPY.noMatch;
  }
  $('search').addEventListener('input', renderList);
  function show() {
    if (!sel) { $('search').focus(); return; }
    shown = true; var now = new Date(), s = TL.sun(now, sel[3], sel[4]), r = TL.dayRange(now, sel[3], sel[4]), ph = TL.phase(s.elev, r), hex = TL.color(s.elev);
    document.documentElement.style.setProperty('--tl-chip', hex); $('card').classList.remove('tl-card--empty');
    $('phase').textContent = COPY.phases[ph]; $('hex').textContent = hex; $('alt').textContent = fill(COPY.dial.alt, { deg: (Math.round(s.elev) < 0 ? '−' : '') + Math.abs(Math.round(s.elev)) });
    var t = new Intl.DateTimeFormat(undefined, { timeZone: sel[5], hour: 'numeric', minute: '2-digit' }).format(now), day = new Intl.DateTimeFormat(undefined, { timeZone: sel[5], weekday: 'long' }).format(now);
    $('time').textContent = fill(COPY.localTime, { day: day, time: t, city: sel[1] });
    $('chip').setAttribute('aria-label', COPY.phases[ph] + ', ' + hex);
    $('dial-label').textContent = sel[1];
    var x = 180 + Math.max(-1, Math.min(1, s.ha / 180)) * 160, y = 170 - Math.max(-12, s.elev) / 90 * 150;
    $('sun').setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    $('share').hidden = false; $('compare').hidden = false;
    clearInterval(timer); timer = setInterval(show, 60000);
  }
  $('show').onclick = show;
  $('compare').onclick = function () { $('note').hidden = true; history.replaceState(null, '', location.pathname); $('search').value = ''; renderList(); $('search').focus(); };
  $('share').onclick = function () {
    var link = location.origin + location.pathname + '#' + TL.encode(sel[0]);
    var cp = function () { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(function () { toast(COPY.copied); }, function () { window.prompt(COPY.share, link); }); else window.prompt(COPY.share, link); };
    if (navigator.share) navigator.share({ title: COPY.title, text: fill(COPY.shareText, { city: sel[1] }), url: link }).then(function () {}, function (e) { if (e && e.name === 'AbortError') toast(COPY.shareCancel); else cp(); }); else cp();
  };
  var h = location.hash;
  $('lede').textContent = COPY.invitation;
  if (h && h !== '#') {
    var c = TL.decode(h, CITIES);
    if (c) { sel = c; $('note').textContent = fill(COPY.receiverNote, { city: c[1] }); $('note').hidden = false; renderList(); show(); }
    else { $('note').textContent = COPY.badLink; $('note').hidden = false; renderList(); }
  } else renderList();
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
