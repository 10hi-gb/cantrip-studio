'use strict';
// C092 Catch This Yawn — link carries only the optional caption: ["y1", caption]; the voluntary return link is ["y1r", ""].
var CY = (function (L) {
  var CMAX = (typeof COPY !== 'undefined' && COPY.captionMax) || 40, FRAG = 400;
  function encode(c) { return L.seal(['y1', L.clean(c, CMAX)]); }
  function encodeReturn() { return L.seal(['y1r', '']); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a || a.length !== 2) return null; var c = L.clean(a[1], CMAX);
    if (a[0] === 'y1' && c === a[1]) return { kind: 'yawn', caption: c }; if (a[0] === 'y1r' && a[1] === '') return { kind: 'return' }; return null; }
  return { FRAG: FRAG, CMAX: CMAX, encode: encode, encodeReturn: encodeReturn, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = CY;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var ch = $('char'), CYCLE = 4600, askT = 0;
  function play(on) { ch.classList.remove('is-paused'); if (L.reduce) { ch.classList.add('cy-still'); ch.classList.remove('cy-idle', 'is-yawning'); $('still').hidden = false; return; } ch.classList.toggle('is-yawning', on); ch.classList.toggle('cy-idle', !on); }
  function pp(btn) { var p = !ch.classList.contains('is-paused'); ch.classList.toggle('is-paused', p); btn.textContent = p ? COPY.resume : COPY.pause; btn.setAttribute('aria-pressed', String(p)); }
  $('pp').onclick = function () { pp($('pp')); }; $('pp2').onclick = function () { pp($('pp2')); };
  if (L.reduce) { $('pp').hidden = true; }
  // Soft cap: typing stops at CMAX code points (no error); a visible counter shows what's left.
  function over() { return 0; }
  function capIn() { var i = $('caption'), a = Array.from(i.value); if (a.length > CY.CMAX) { i.value = a.slice(0, CY.CMAX).join(''); }
    $('ccount').textContent = L.fill(COPY.captionCounter, { n: CY.CMAX - Array.from(i.value).length }); $('cap').textContent = L.clean(i.value, CY.CMAX); $('linkbox').hidden = true; }
  $('caption').addEventListener('input', capIn); capIn();
  $('send').onclick = function () { if (over() > 0) { $('caption').focus(); return; } L.share(L.link(CY.encode($('caption').value)), COPY.title, COPY.shareText); };
  function toMaker() { L.clearHash(); clearTimeout(askT); ['acts-recv', 'ask', 'acts-after'].forEach(function (i) { $(i).hidden = true; }); $('maker').hidden = false; $('acts-make').hidden = false;
    $('lede').textContent = COPY.invitation; $('msg').textContent = ''; $('caption').value = ''; $('cap').textContent = ''; play(true); }
  $('mine').onclick = toMaker;
  $('watch').onclick = function () { $('watch').hidden = true; if (!L.reduce) $('pp2').hidden = false; play(true);
    askT = setTimeout(function () { $('ask').hidden = false; }, L.reduce ? 0 : CYCLE); };
  // Only the visitor's own answer is shown; nothing is detected or reported.
  $('yes').onclick = function () { $('ask').hidden = true; $('msg').textContent = COPY.caughtReply; $('acts-after').hidden = false; $('ret').hidden = false; };
  $('no').onclick = function () { $('ask').hidden = true; $('msg').textContent = COPY.notCaughtReply; $('acts-after').hidden = false; $('ret').hidden = true; };
  $('ret').onclick = function () { L.share(L.link(CY.encodeReturn()), COPY.title, COPY.returnShareText); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = CY.decode(h); $('maker').hidden = true; $('acts-make').hidden = true;
    if (r && r.kind === 'yawn') { $('lede').textContent = COPY.receiverIntro; $('cap').textContent = r.caption; $('acts-recv').hidden = false; }
    else if (r) { $('lede').textContent = COPY.returnIntro; $('acts-after').hidden = false; play(true); }
    else { $('lede').textContent = COPY.badLink; $('acts-after').hidden = false; }
  } else play(true);
})();
// A new link opened in this tab (hash change) re-reads it from scratch: same state as a fresh open, no stacked timers/audio. replaceState never fires this.
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('hashchange', function () { location.reload(); });
