// node tests/telephone-tokens.test.js — C201 word matching: case/punctuation-insensitive, repeat-aware, emoji/symbols count as words
const B = require('../broken-telephone/app.js'), as = require('assert'), n = (a, b) => B.lcs(B.tokens(a), B.tokens(b)).n;
as.deepEqual(B.tokens('🐶🍕🎉'), ['🐶', '🍕', '🎉']); as.equal(n('🐶🍕🎉', '🐶🍕🎉'), 3);
as.equal(n('❤ ok', '❤️ OK!'), 2); as.equal(n('👍🏽', '👍'), 0); as.equal(n('🇫🇷 🇩🇪', '🇩🇪 🇫🇷'), 1);
as.equal(n('Go home now', 'go, home NOW'), 3); as.equal(n('the the cat', 'the cat'), 2); as.deepEqual(B.tokens("It's well-known."), ['its', 'wellknown']);
as.equal(B.tokens('नमस्ते दुनिया').length, 2); as.equal(B.tokens('  ...  ').length, 0);
console.log('PASS');
