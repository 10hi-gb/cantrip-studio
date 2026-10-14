'use strict';
// C199 Don't Mention It — ["d1", missionId, firstName]; optional return card is a separate link: ["d1r", "done"|"dontAsk"]. Nothing is reported.
var DM = (function (L) {
  var NMAX = 20, FRAG = 300, IDS = []; for (var i = 1; i <= 20; i++) IDS.push('m' + i);
  function encode(id, name) { return L.seal(['d1', id, L.clean(name, NMAX)]); }
  function encodeCard(k) { return L.seal(['d1r', k]); }
  function decode(f) { var a = L.unseal(f, FRAG); if (!a) return null;
    if (a[0] === 'd1r' && a.length === 2 && (a[1] === 'done' || a[1] === 'dontAsk')) return { card: a[1] };
    if (a[0] !== 'd1' || a.length !== 3 || !/^m\d{1,2}$/.test(a[1])) return null; var n = L.clean(a[2], NMAX); if (!n || n !== a[2]) return null;
    return { id: a[1], name: n, known: IDS.indexOf(a[1]) >= 0 }; }
  return { FRAG: FRAG, IDS: IDS, NMAX: NMAX, encode: encode, encodeCard: encodeCard, decode: decode };
})(typeof L !== 'undefined' ? L : require('./lib.js'));
if (typeof module !== 'undefined') module.exports = DM;

if (typeof document !== 'undefined') (function () {
  var $ = L.$; L.bind(); L.chrome();
  var sel = 'm2', state = null;
  var btns = DM.IDS.map(function (id, i) { var b = document.createElement('button'); b.type = 'button'; b.className = 'dm-mission'; b.setAttribute('role', 'radio'); b.textContent = COPY.missions[id]; b.dataset.id = id;
    b.onclick = function () { pick(id); };
    b.onkeydown = function (e) { var j = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: 19 }[e.key]; if (j == null) return; e.preventDefault(); j = (j + 20) % 20; pick(DM.IDS[j]); btns[j].focus(); };
    $('missions').appendChild(b); return b; });
  function pick(id) { sel = id; btns.forEach(function (b) { var on = b.dataset.id === id; b.setAttribute('aria-checked', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; }); }
  pick(sel);
  $('shuffle').onclick = function () { var r = new Uint8Array(1); crypto.getRandomValues(r); var id = DM.IDS[r[0] % 20]; pick(id); btns[DM.IDS.indexOf(id)].scrollIntoView({ block: 'nearest' }); };
  $('name').addEventListener('input', function () { var o = L.len(L.clean($('name').value)) - DM.NMAX; $('nmsg').textContent = o > 0 ? L.plural(COPY.nameTooLong, o) : ''; $('linkbox').hidden = true; });
  function fill(id, name, known) { $('dhead').textContent = L.fill(COPY.dossierHeading, { name: name }); $('mission').textContent = known ? COPY.missions[id] : COPY.unknownMission; }
  function show(n) { [1, 2, 3].forEach(function (k) { var p = $('p' + k), vis = k <= n; if (vis && p.hidden && !L.reduce) p.classList.add('is-new'); p.hidden = !vis; }); }
  $('accept').onclick = function () {
    var n = L.clean($('name').value); if (!n) { $('nmsg').textContent = COPY.nameEmpty; $('name').focus(); return; } if (L.len(n) > DM.NMAX) { $('name').focus(); return; }
    state = { id: sel, name: n }; fill(sel, n, true); $('maker-b').hidden = true; $('file').hidden = false; show(3); if (!L.reduce) $('file').classList.add('is-unfolding'); $('share').focus();
  };
  $('edit').onclick = function () { $('file').hidden = true; $('file').classList.remove('is-unfolding'); $('maker-b').hidden = false; $('linkbox').hidden = true; };
  $('share').onclick = function () { L.share(L.link(DM.encode(state.id, state.name)), COPY.title, COPY.shareText); };
  function card(k) { L.share(L.link(DM.encodeCard(k)), COPY.title, k === 'done' ? COPY.doneCardText : COPY.dontAskCardText); }
  $('done').onclick = function () { card('done'); }; $('dontask').onclick = function () { card('dontAsk'); };
  var h = location.hash;
  if (h && h !== '#') {
    var r = DM.decode(h); $('maker-a').hidden = true; $('maker-b').hidden = true; $('lede').textContent = '';
    if (r && r.card) { $('head').textContent = COPY.title; $('card').hidden = false; $('cardtext').textContent = r.card === 'done' ? COPY.doneCardText : COPY.dontAskCardText; }
    else if (r) {
      $('head').textContent = COPY.receiverIntro; $('closed').hidden = false; $('cname').textContent = r.name; fill(r.id, r.name, r.known); $('p3make').hidden = true; $('p3recv').hidden = false;
      $('unfold0').onclick = function () { $('closed').hidden = true; $('file').hidden = false; show(1); $('u1').hidden = false; $('unfold1').focus(); };
      $('unfold1').onclick = function () { $('u1').hidden = true; show(2); $('u2').hidden = false; $('unfold2').focus(); };
      $('unfold2').onclick = function () { $('u2').hidden = true; show(3); $('done').focus(); };
    } else $('head').textContent = COPY.badLink;
  }
})();
