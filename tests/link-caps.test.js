// node tests/link-caps.test.js — worst-case (4-byte emoji at every capped field) encoded length vs receiver cap, per piece
const E = n => '😀'.repeat(n), T = String(Date.now() + 864e5).padStart(13, '0'), rows = [];
const r = (id, name, f, cap, dec) => { const ok = f.length <= cap && (!dec || !!dec('#' + f)); rows.push({ id, name, len: f.length, cap, ok }); };
const PL = require('../a-plant-from-this/app.js'); r('C050', 'phrase 60 + note 80 emoji', PL.encode(E(60), E(80)), PL.FRAG, PL.decode);
const PS = require('../permission-slip/app.js'); r('C137', 'to 24 + from 24 + reason 80 emoji, p10', PS.encode({ id: 'p10', to: E(24), from: E(24), why: E(80) }), PS.FRAG, PS.decode);
const AM = require('../ask-me-at-four/app.js'); r('C200', 'promise 60 + name 20 emoji', AM.encode(E(60), E(20), T), AM.FRAG, AM.decode);
const CY = require('../catch-this-yawn/app.js'); r('C092', 'caption 40 emoji', CY.encode(E(40)), CY.FRAG, CY.decode);
const DM = require('../dont-mention-it/app.js'); r('C199', 'name 20 emoji, m20', DM.encode('m20', E(20)), DM.FRAG, DM.decode);
const TT = require('../taste-like-this/app.js'); r('C095', 'dish 40 emoji', TT.encode({ sweet: 3, salt: 3, heat: 3 }, E(40)), TT.FRAG, TT.decode);
const UT = require('../until-then/app.js'); r('C049', 'label 60 emoji', UT.encode(E(60), T), UT.FRAG, UT.decode);
const HIC = require('../here-it-comes/app.js'); r('here-it-comes', 'note 60 emoji', HIC.encode(HIC.TYPES[0].id || HIC.TYPES[0], E(60)), HIC.FRAG_MAX);
const WB = require('../wishbone/app.js'); r('wishbone', 'names 24 + 24 emoji', WB.encode({ side: 'l', names: [E(24), E(24)] }), 300);
const WP = require('../where-you-paused/app.js'); r('where-you-paused', 'text 200 emoji, 12 marks', WP.encode({ text: E(200), marks: Array.from({ length: 12 }, (_, i) => [1 + i * 2 * 15, 99]) }), 1200);
const OA = require('../one-across/app.js'); r('one-across', 'answer 12 + clue 80 emoji', OA.encode('ABCDEFGHIJKL', E(80), 0xffffffff), OA.FRAG_MAX);
const OK = require('../our-knock/app.js'); r('our-knock', '12 knocks + note 80 emoji', OK.encode(Array(11).fill(2550), E(80)), OK.FRAG_MAX);
const FO = require('../fogged-over/app.js'); { const lines = []; let k = 0; for (let i = 0; i < 120; i++) { const n = i < 60 ? 3 : 2, l = []; for (let j = 0; j < n; j++, k++) l.push([((k * 37) % 256) / 255, ((k * 91) % 256) / 255]); lines.push(l); } r('C102', '300 points / 120 lines', FO.encode(lines), FO.FRAG, FO.decode); }
r('C200 reply', 'will-ask link', AM.encodeWill(T), AM.FRAG, AM.decode); r('C199 card', 'dontAsk card', DM.encodeCard('dontAsk'), DM.FRAG, DM.decode); r('C092 return', 'return link', CY.encodeReturn(), CY.FRAG, CY.decode);
// C137 specifics: maximal emoji slip fits, round-trips exactly, and the pre-share guard reports 0
{ const o = { id: 'p10', to: E(24), from: E(24), why: E(80) }, f = PS.encode(o), d = PS.decode('#' + f); require('assert').ok(d && d.to === E(24) && d.from === E(24) && d.why === E(80)); require('assert').equal(PS.overBy(o), 0); console.log('C137 max emoji slip: ' + f.length + ' chars (cap ' + PS.FRAG + '), round-trip exact, overBy 0'); }
const WTM = require('../wear-this/app.js'); r('C087', 'all slots s9 c6 k6', WTM.encode({ head: { s: 9, c: 6 }, top: { s: 9, c: 6 }, bottom: { s: 9, c: 6 }, shoes: { s: 9, c: 6 }, k: 6 }), 120);
const ST = require('../score-this/app.js'); { const C = require('vm').runInNewContext(require('fs').readFileSync(__dirname + '/../score-this/copy.js', 'utf8') + ';COPY'), lng = [1, 2, 3].map(p => ST.ids(C, p).sort((a, b) => b.length - a.length)[0]); r('score-this', 'longest sound id per panel', ST.encode(lng), 120, f => ST.decode(f, C)); }
console.table(rows); const bad = rows.filter(x => !x.ok); if (bad.length) { console.log('FAIL', bad.map(x => x.id).join(' ')); process.exit(1); } console.log('PASS');
