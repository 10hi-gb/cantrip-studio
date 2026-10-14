'use strict';
// C200 Ask Me At Four — ["a1", promise, name, "<utc ms>"]; voluntary reply link ["a1w", "<utc ms>"]. One instant, shown in the opener's zone.
var AM = (function (L) {
  var PMAX = 60, NMAX = 20, FRAG = 500, WIN = 48 * 36e5, AT = 10 * 6e4;
  function instant(v) { var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v || ''); if (!m) return NaN; var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0); return d.getMonth() === +m[2] - 1 ? d.getTime() : NaN; }
  function check(t, now) { if (!isFinite(t) || t <= now) return 'past'; if (t - now > WIN) return 'late'; return ''; }
  function state(t, now) { return now < t ? 'before' : now < t + AT ? 'at' : 'expired'; }
  function encode(p, n, t) { return L.seal(['a1', L.clean(p, PMAX), L.clean(n, NMAX), String(t)]); }
  function encodeWill(t) { return L.seal(['a1w', String(t)]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a) return null;
    if (a[0] === 'a1w' && a.length === 2 && /^\d{13}$/.test(a[1])) return { will: true, t: +a[1] };
    if (a[0] !== 'a1' || a.length !== 4 || !/^\d{13}$/.test(a[3])) return null; var p = L.clean(a[1], PMAX), n = L.clean(a[2], NMAX);
    if (!p || p !== a[1] || n !== a[2]) return null; return { promise: p, name: n, t: +a[3] }; }
  function fmt(t) { return new Date(t).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }); }
  function angle(t) { var d = new Date(t); return ((d.getHours() % 12) + d.getMinutes() / 60) * 30; }
  function ics(o, title) { // local file only; DTSTART in UTC, 15 minutes, no alarm
    var z = function (t) { return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }, esc = function (s) { return s.replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cantrip Studio//Ask Me At Four//EN', 'BEGIN:VEVENT', 'UID:' + o.t + '-' + Math.random().toString(36).slice(2) + '@cantrip.local', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(o.t), 'DTEND:' + z(o.t + 15 * 6e4), 'SUMMARY:' + esc(title), 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n'); }
  return { FRAG: FRAG, PMAX: PMAX, NMAX: NMAX, instant: instant, check: check, state: state, encode: encode, encodeWill: encodeWill, decode: decode, fmt: fmt, angle: angle, ics: ics };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = AM;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '', cur = null, timer = 0;
  $('zone').textContent = L.fill(COPY.timezoneLine, { zone: zone });
  function dial(t, p) { var tm = $('timer'); tm.style.setProperty('--am-angle', AM.angle(t) + 'deg'); tm.setAttribute('aria-label', L.fill(COPY.dialAria, { localTime: AM.fmt(t) })); $('lpr').textContent = p || ''; $('lt').textContent = AM.fmt(t); }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  (function () { var d = new Date(Date.now() + 3 * 36e5); d.setMinutes(0, 0, 0); $('when').value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':00'; })();
  function away() { var t = AM.instant($('when').value), c = AM.check(t, Date.now()); $('wmsg').textContent = c === 'past' ? COPY.pastTime : c === 'late' ? COPY.tooLate : '';
    if (!c) { var m = Math.round((t - Date.now()) / 6e4); $('away').textContent = m < 60 ? L.plural(COPY.minutesAway, Math.max(1, m)) : L.plural(COPY.hoursAway, Math.round(m / 60)); dial(t, L.clean($('promise').value, AM.PMAX)); } else $('away').textContent = ''; }
  $('when').addEventListener('input', away); $('when').addEventListener('change', away);
  $('promise').addEventListener('input', function () { var o = L.len(L.clean($('promise').value)) - AM.PMAX; $('pmsg').textContent = o > 0 ? L.plural(COPY.promiseTooLong, o) : ''; away(); $('made').hidden = true; });
  $('name').maxLength = AM.NMAX * 2;
  $('wind').onclick = function () {
    var p = L.clean($('promise').value); if (!p) { $('pmsg').textContent = COPY.promiseEmpty; $('promise').focus(); return; } if (L.len(p) > AM.PMAX) { $('promise').focus(); return; }
    var t = AM.instant($('when').value), c = AM.check(t, Date.now()); if (c) { away(); $('when').focus(); return; }
    cur = { promise: p, name: L.clean($('name').value, AM.NMAX), t: t }; dial(t, p); $('made').hidden = false; $('share').focus();
  };
  $('share').onclick = function () { L.share(L.link(AM.encode(cur.promise, cur.name, cur.t)), COPY.title, L.fill(COPY.shareText, { localTime: AM.fmt(cur.t) })); };
  function saveIcs() { try { var title = cur.name ? L.fill(COPY.icsTitle, { name: cur.name, promise: cur.promise }) : L.fill(COPY.icsTitleAnon, { promise: cur.promise });
      var bl = new Blob([AM.ics(cur, title)], { type: 'text/calendar' }), u = URL.createObjectURL(bl), a = document.createElement('a'); a.href = u; a.download = 'ask-me-at-four.ics'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); L.toast(COPY.icsSaved); } catch (e) { L.toast(COPY.error); } }
  $('ics').onclick = saveIcs; $('ics2').onclick = saveIcs;
  $('will').onclick = function () { L.share(L.link(AM.encodeWill(cur.t)), COPY.title, L.fill(COPY.willAskText, { localTime: AM.fmt(cur.t) })); };
  function recvState() { clearTimeout(timer); var s = AM.state(cur.t, Date.now()), lt = AM.fmt(cur.t);
    $('rstate').textContent = s === 'before' ? L.fill(COPY.beforeTime, { localTime: lt }) : s === 'at' ? COPY.atTime : L.fill(COPY.expired, { localTime: lt });
    var dg = $('ding'); if (s === 'at') { if (dg.hidden) { dg.hidden = false; dg.textContent = COPY.ding; if (!L.reduce) $('timer').classList.add('is-ding'); } } else dg.hidden = true;
    if (s !== 'expired') timer = setTimeout(recvState, Math.min(2147483647, Math.max(500, (s === 'before' ? cur.t : cur.t + 6e5) - Date.now()))); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && cur && !$('recv').hidden) recvState(); });
  var h = location.hash;
  if (h && h !== '#') {
    var r = AM.decode(h); $('maker').hidden = true;
    if (r && r.will) { $('lede').textContent = COPY.willAskIntro; cur = { t: r.t, promise: '' }; dial(r.t, ''); $('msg').textContent = L.fill(COPY.willAskText, { localTime: AM.fmt(r.t) }); }
    else if (r) { cur = r; var lt = AM.fmt(r.t); $('lede').textContent = r.name ? L.fill(COPY.receiverIntro, { name: r.name, localTime: lt }) : L.fill(COPY.receiverIntroAnon, { localTime: lt });
      $('recv').hidden = false; $('rpromise').textContent = L.fill(COPY.receiverPromise, { promise: r.promise }); dial(r.t, r.promise); recvState(); }
    else { $('lede').textContent = COPY.badLink; $('timer').hidden = true; }
  } else away();
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
