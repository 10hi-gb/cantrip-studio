// node tests/mill/sack-link.test.js — Split the Sack fragment: round-trip, caps, malformed handling
const assert = require('assert'); const L = require('../../mill/split-the-sack/link.js'), M = require('../../mill/shared/core.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', n, name); };
const base = { n: 'Jasmine rice', u: 'lb', c: '$', q: '25', i: '0.5', p: '31.47', f: '2.00', b: 'p', x: -1, h: [['Ana', '8'], ['Ben', '8.5'], ['Cy', '6']] };
t('round trip exact', () => { const f = L.encode(base); assert.ok(f.startsWith('s1.')); const d = L.decode('#' + f); assert.ok(d.ok); assert.deepEqual(d.data, base); });
t('worst-case emoji at every cap fits FRAG_MAX', () => { const E = k => '😀'.repeat(k); const st = { ...base, n: E(40), u: E(16), c: E(3), q: '999999999.999', i: '0.001', p: '999999999.99', f: '999999999.99', h: Array.from({ length: 8 }, (_, i) => [E(23) + i, '0']) }; const f = L.encode(st); assert.ok(f, 'encodes'); assert.ok(f.length <= L.FRAG_MAX, f.length + ' > ' + L.FRAG_MAX); assert.ok(L.decode(f).ok); console.log('   worst-case length', f.length, 'cap', L.FRAG_MAX); });
t('unfinished states do not encode (shortage, dup names, empty name, 1 household)', () => { assert.equal(L.encode({ ...base, h: [['A', '20'], ['B', '20']] }), null); assert.equal(L.encode({ ...base, h: [['A', '1'], ['a', '1']] }), null); assert.equal(L.encode({ ...base, h: [['', '1'], ['B', '1']] }), null); assert.equal(L.encode({ ...base, h: [['A', '1']] }), null); assert.equal(L.encode({ ...base, n: 'x'.repeat(41) }), null); });
t('malformed: empty, truncated, bad checksum, oversize, wrong tag, old version, extra key, bad JSON', () => {
  const f = L.encode(base); assert.equal(L.decode('').why, 'empty'); assert.equal(L.decode(f.slice(0, 50)).ok, false);
  assert.equal(L.decode(f.slice(0, -1) + (f.endsWith('0') ? '1' : '0')).why, 'bad'); assert.equal(L.decode('s1.' + 'A'.repeat(2100) + '.aaaaaa').why, 'tooLong');
  assert.equal(L.decode(M.pack('a', 1, base)).why, 'otherTag'); assert.equal(L.decode(M.pack('s', 2, base)).why, 'oldVersion');
  assert.equal(L.decode(M.pack('s', 1, { ...base, z: 1 })).why, 'bad'); assert.equal(L.decode(M.pack('s', 1, [1, 2])).why, 'bad');
  const head = 's1.' + M.b64e('{not json'); assert.equal(L.decode(head + '.' + M.ck(head)).why, 'bad');
  assert.equal(L.decode(M.pack('s', 1, { ...base, h: [['A', '20'], ['B', '20']] })).why, 'bad'); // forged over-allocation
  assert.equal(L.decode(M.pack('s', 1, { ...base, x: 0, h: [['A', '20'], ['B', '5']] })).why, 'bad'); // assign with nothing unclaimed
});
t('control/bidi chars stripped on decode', () => { const d = L.decode(L.encode({ ...base, n: 'Rice\u202E\u0007bag' })); assert.equal(d.data.n, 'Rice bag'); });
// Unit cap counts like the editor: grapheme clusters (ZWJ sequences, flags, keycaps, tag flags, skin tones = 1 each)
const EMO = ['👨‍👩‍👧‍👦', '🏳️‍🌈', '🇯🇵', '🇺🇦', '👩🏽‍💻', '😀', '❤️', '🧑‍🤝‍🧑', '🇬🇧', '👍🏿', '🐈‍⬛', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '1️⃣', '🫶', '🇨🇦', '🦊'];
t('unit cap: 16 emoji incl. ZWJ, flag, tag-flag and keycap sequences round-trip; a 17th character is refused; abcdefghijklmnop unchanged', () => {
  const u = EMO.join(''); assert.equal(L.unitLen(u), 16); assert.ok([...u].length > 16 && u.length > 16, 'more than 16 code points / code units');
  const f = L.encode({ ...base, u }); assert.ok(f, 'encodes'); const d = L.decode(f); assert.ok(d.ok); assert.equal(d.data.u, u);
  assert.equal(L.encode({ ...base, u: u + 'x' }), null); assert.equal(L.check({ ...base, u: u + '🇫🇷' }), 'unit'); assert.equal(L.decode(M.pack('s', 1, { ...base, u: u + 'x' })).why, 'bad');
  assert.equal(L.decode(L.encode({ ...base, u: 'abcdefghijklmnop' })).data.u, 'abcdefghijklmnop'); assert.equal(L.encode({ ...base, u: 'abcdefghijklmnopq' }), null);
  assert.equal(L.unitLen('😀'.repeat(16)), 16); assert.equal(L.check({ ...base, u: '😀'.repeat(17) }), 'unit');
});
t('unit cap: the no-Intl.Segmenter fallback counts the same clusters', () => { const g = L._approxGraphemes(EMO.join('')); assert.deepEqual(g, EMO); assert.equal(L._approxGraphemes('e\u0301abc').length, 4); assert.equal(L._approxGraphemes('abcdefghijklmnop').length, 16); });
console.log('PASS ' + n + ' tests');
