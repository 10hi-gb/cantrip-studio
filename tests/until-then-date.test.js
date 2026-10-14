// node tests/until-then-date.test.js — C049 date line: year shown only when the moment is outside the opener's current year
const UT = require('../until-then/app.js'), as = require('assert');
const now = Date.UTC(2026, 9, 14, 5, 0), same = Date.UTC(2026, 11, 24, 18, 0), next = Date.UTC(2027, 0, 2, 18, 0);
const a = UT.fmt(same, now, 'en-US', 'America/Los_Angeles'), b = UT.fmt(next, now, 'en-US', 'America/Los_Angeles'), c = UT.fmt(next, now, 'en-GB', 'Europe/London');
console.log(a + ' | ' + b + ' | ' + c); as.ok(!/2026/.test(a)); as.ok(/2027/.test(b)); as.ok(/2027/.test(c));
// New Year's Eve edge: 31 Dec 2026 23:30 PT is already 2027 in London, so only London shows a year
const nye = Date.UTC(2027, 0, 1, 7, 30); as.ok(!/202/.test(UT.fmt(nye, now, 'en-US', 'America/Los_Angeles'))); as.ok(/2027/.test(UT.fmt(nye, now, 'en-GB', 'Europe/London')));
console.log('PASS');
