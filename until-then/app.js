'use strict';
// C049 Until Then — fragment carries the label and ONE UTC instant (ms): ["u1", label, "1792201200000"]. Shown in the opener's local time.
var UT = (function (L) {
  var LMAX = 60, FRAG = 400, YEAR = 365 * 864e5, MIN_T = Date.UTC(2020, 0, 1), MAX_T = Date.UTC(2100, 0, 1);
  // Maker's wall time in the maker's zone -> one instant. JS Date resolves a spring-forward gap forward and a fall-back overlap to the earlier instant.
  function instant(dateStr, timeStr) {
    var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || ''), t = /^(\d{2}):(\d{2})$/.exec(timeStr || ''); if (!d || !t) return NaN;
    var x = new Date(+d[1], +d[2] - 1, +d[3], +t[1], +t[2], 0, 0); return x.getFullYear() === +d[1] && x.getMonth() === +d[2] - 1 ? x.getTime() : NaN;
  }
  function check(t, now) { if (!isFinite(t)) return 'invalid'; if (t <= now) return 'past'; if (t - now > YEAR) return 'far'; return ''; }
  function encode(label, t) { return L.seal(['u1', L.clean(label, LMAX), String(t)]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a || a.length !== 3 || a[0] !== 'u1' || !/^\d{13}$/.test(a[2])) return null;
    var lab = L.clean(a[1], LMAX), t = +a[2]; if (!lab || lab !== a[1] || t < MIN_T || t > MAX_T) return null; return { label: lab, t: t }; }
  // Opener's locale and zone; the year is added whenever the moment is not in the opener's current year.
  function fmt(t, now, loc, tz) { var o = { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }; if (tz) o.timeZone = tz;
    var y = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: tz }); if (y.format(new Date(t)) !== y.format(new Date(now == null ? Date.now() : now))) o.year = 'numeric';
    return new Intl.DateTimeFormat(loc, o).format(new Date(t)); }
  return { FRAG: FRAG, LMAX: LMAX, instant: instant, check: check, encode: encode, decode: decode, fmt: fmt };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = UT;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var root = $('root'), state = null, timer = 0, MAXT = 2147483647;
  var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  var abbr = (new Date().toLocaleTimeString(undefined, { timeZoneName: 'short' }).split(' ').pop()) || '';
  $('zone').textContent = L.fill(COPY.zoneLine, { zone: zone + (abbr && abbr !== zone ? ' (' + abbr + ')' : '') });
  // default: tomorrow, same hour, rounded
  (function () { var n = new Date(Date.now() + 864e5); n.setMinutes(0, 0, 0); var p = function (x) { return (x < 10 ? '0' : '') + x; };
    $('d').value = n.getFullYear() + '-' + p(n.getMonth() + 1) + '-' + p(n.getDate()); $('t').value = p(n.getHours()) + ':00'; })();
  function setRoom(on) { $('room').setAttribute('aria-label', L.fill(on ? COPY.lampAltOn : COPY.lampAltOff, { label: state.label })); }
  function render(recipient) {
    clearTimeout(timer); var on = Date.now() < state.t, when = UT.fmt(state.t);
    $('form').hidden = true; $('label').hidden = false; $('label').textContent = state.label; $('date').hidden = false;
    root.classList.toggle('is-out', !on); root.classList.remove('is-going-out');
    $('date').textContent = on ? L.fill(recipient ? COPY.litLineRecipient : COPY.litLine, { localDateTime: when }) : L.fill(COPY.offLine, { localDateTime: when });
    $('msg').textContent = on ? '' : L.fill(COPY.offSub, { label: state.label }); setRoom(on);
    if (on) arm(recipient);
  }
  // one timeout to the instant (capped and re-armed), plus a re-check when the tab becomes visible. No countdown text.
  function arm(recipient) { var ms = state.t - Date.now(); timer = setTimeout(function () { if (Date.now() < state.t) return arm(recipient); goOut(recipient); }, Math.min(MAXT, Math.max(0, ms))); }
  function goOut(recipient) {
    if (L.reduce) return render(recipient);
    $('msg').textContent = COPY.dimming; root.classList.add('is-going-out'); root.classList.add('is-out');
    setTimeout(function () { render(recipient); }, 2000);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state && !root.classList.contains('is-going-out')) render(isRecipient); });
  $('lab').addEventListener('input', function () { var o = L.len(L.clean($('lab').value)) - UT.LMAX; $('lmsg').textContent = o > 0 ? L.plural(COPY.labelTooLong, o) : ''; });
  $('light').onclick = function () {
    var lab = L.clean($('lab').value), o = L.len(lab) - UT.LMAX; $('wmsg').textContent = '';
    if (!lab) { $('lmsg').textContent = COPY.labelEmpty; $('lab').focus(); return; } if (o > 0) { $('lab').focus(); return; }
    var t = UT.instant($('d').value, $('t').value), c = UT.check(t, Date.now());
    if (c === 'past' || c === 'invalid') { $('wmsg').textContent = COPY.pastTime; return; } if (c === 'far') { $('wmsg').textContent = COPY.tooFar; return; }
    state = { label: lab, t: t }; $('intro').hidden = true; $('light').hidden = true; $('send').hidden = false; render(false);
  };
  $('send').onclick = function () { L.share(L.link(UT.encode(state.label, state.t)), COPY.title, COPY.shareText); };
  $('again').onclick = function () { L.clearHash(); location.reload(); };
  var isRecipient = false, h = location.hash;
  if (h && h !== '#') { var r = UT.decode(h); $('light').hidden = true; $('again').hidden = false;
    if (r) { isRecipient = true; state = r; $('intro').textContent = COPY.receiverIntro; render(true); }
    else { $('intro').textContent = COPY.badLink; $('form').hidden = true; root.classList.add('is-out'); } }
})();
