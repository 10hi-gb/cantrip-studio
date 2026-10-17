'use strict';
// Split the Sack: pure math. ONE bulk item, integer minor units (cents), quantities as integer milli-units.
// REMAINDER RULE (documented): each row's exact share is a rational number of cents. Every row gets the floor; the
// leftover cents (always fewer than the number of rows) go one each to the rows with the largest dropped fraction.
// Ties go in list order: households in the order entered, then the "unallocated" row last. Done separately for the
// goods price and for the fee (each is its own largest-remainder pass, so a row's total is within 2 cents of
// (requested ÷ package) × (price + fee) and the columns add exactly). Totals always equal price + fee exactly, including the unallocated row.
(function (root, factory) { var m = factory(); if (typeof module === 'object' && module.exports) module.exports = m; else root.SACK = m; })(this, function () {
  var QSCALE = 1000;          // quantities are integer thousandths of the unit
  var MAX_CENTS = 1e11;       // $1,000,000,000.00 ceiling per money field
  var MAX_QTY = 1e12;         // 1e9 units (in thousandths)
  var MIN_H = 2, MAX_H = 8;
  function err(code, field) { return { ok: false, error: code, field: field }; }
  // Decimal string/number -> integer with `scale` decimals. Rejects NaN, Infinity, negatives, exponents, too many decimals.
  function parseDec(v, places) {
    if (typeof v === 'number') { if (!Number.isFinite(v)) return null; v = String(v); }
    if (typeof v !== 'string') return null;
    var s = v.trim(); var m = /^(\d{1,13})(?:\.(\d*))?$/.exec(s) || /^()\.(\d+)$/.exec(s);
    if (!m) return null; var frac = m[2] || '';
    if (frac.length > places) { if (/[^0]/.test(frac.slice(places))) return null; frac = frac.slice(0, places); }
    while (frac.length < places) frac += '0';
    var n = Number((m[1] || '0') + frac); return Number.isSafeInteger(n) ? n : null;
  }
  function parseQty(v) { return parseDec(v, 3); }        // -> thousandths
  function parseMoney(v) { return parseDec(v, 2); }      // -> cents
  function fmtQty(q) { var s = String(Math.floor(q / QSCALE)), f = String(q % QSCALE).padStart(3, '0').replace(/0+$/, ''); return f ? s + '.' + f : s; }
  function fmtMoney(c, sym) { var neg = c < 0; c = Math.abs(c); return (neg ? '-' : '') + (sym == null ? '' : sym) + Math.floor(c / 100) + '.' + String(c % 100).padStart(2, '0'); }
  // Largest remainder over integer weights. total, weights: non-negative safe integers; sum(weights) > 0. BigInt inside.
  function allocate(total, weights) { return allocateX(total, weights).shares; }
  function allocateX(total, weights) {
    var W = 0n; weights.forEach(function (w) { W += BigInt(w); });
    if (W === 0n) return { shares: weights.map(function () { return 0; }), extra: weights.map(function () { return 0; }) };
    var T = BigInt(total), base = [], rem = [], used = 0n;
    weights.forEach(function (w, i) { var p = T * BigInt(w); base[i] = p / W; rem[i] = p % W; used += base[i]; });
    var left = Number(T - used), order = weights.map(function (_, i) { return i; });
    order.sort(function (a, b) { return rem[a] === rem[b] ? a - b : (rem[b] > rem[a] ? 1 : -1); });
    var extra = weights.map(function () { return 0; });
    for (var k = 0; k < left; k++) { base[order[k]] += 1n; extra[order[k]] = 1; }
    return { shares: base.map(Number), extra: extra };
  }
  // input: { pkgQty, inc, price, fee, feeBasis:'proportional'|'equal', requests:[qty...], assignTo: index|-1 }
  //   assignTo: optional explicit choice to give the whole unallocated quantity (and its cost) to one household.
  //   FEE (PM scope call (b), 2026-10-16 9:44 PM PT; replaces the earlier "unallocated carries no fee" rule):
  //   proportional (default) = by quantity over ALL rows including the unallocated row, which shows its item cost plus fee share;
  //   equal = equally among households that take some (qty > 0); the unallocated row carries none. Equal with a fee > 0 and no
  //   household taking any -> status 'nobasis' (complete:false; the UI shows errorFeeNoBasis). Each a separate largest-remainder pass.
  //   pkgQty/inc/requests: decimal strings or finite numbers in units; price/fee: integer cents.
  function compute(inp) {
    if (!inp || typeof inp !== 'object') return err('input');
    var reqs = inp.requests;
    if (!Array.isArray(reqs) || reqs.length < MIN_H) return err('tooFew', 'requests');
    if (reqs.length > MAX_H) return err('tooMany', 'requests');
    var Q = parseQty(inp.pkgQty), inc = parseQty(inp.inc);
    if (Q == null || Q <= 0 || Q > MAX_QTY) return err('qty', 'pkgQty');
    if (inc == null || inc <= 0 || inc > Q) return err('inc', 'inc');
    if (Q % inc !== 0) return err('pkgNotMultiple', 'pkgQty');
    var price = inp.price, fee = inp.fee == null ? 0 : inp.fee;
    if (!Number.isSafeInteger(price) || price < 0 || price > MAX_CENTS) return err('money', 'price');
    if (!Number.isSafeInteger(fee) || fee < 0 || fee > MAX_CENTS) return err('money', 'fee');
    var basis = inp.feeBasis == null ? 'proportional' : inp.feeBasis;
    if (basis !== 'proportional' && basis !== 'equal') return err('basis', 'feeBasis');
    var r = [];
    for (var i = 0; i < reqs.length; i++) {
      var q = parseQty(reqs[i]); if (q == null || q > MAX_QTY) return err('qty', 'requests.' + i);
      if (q % inc !== 0) return err('increment', 'requests.' + i); r.push(q);
    }
    var R = r.reduce(function (a, b) { return a + b; }, 0);
    var unQty = Q - R, shortage = R > Q ? R - Q : 0;
    var base = { ok: true, pkgQty: Q, inc: inc, price: price, fee: fee, feeBasis: basis, requested: R, households: r.length };
    if (shortage) { base.status = 'over'; base.shortage = shortage; base.complete = false; return base; }
    var a = inp.assignTo == null ? -1 : inp.assignTo;
    if (!Number.isInteger(a) || a < -1 || a >= r.length) return err('assign', 'assignTo');
    var take = r.slice(), assigned = false;
    if (a >= 0 && unQty > 0) { take[a] += unQty; unQty = 0; assigned = true; }
    var wts = take.concat([unQty]);                      // last row = unallocated
    var g = allocateX(price, wts), fx;
    if (basis === 'equal') {
      var takers = take.map(function (q) { return q > 0 ? 1 : 0; });
      if (!takers.some(Boolean)) { if (fee > 0) { base.status = 'nobasis'; base.complete = false; base.shortage = 0; return base; } fx = { shares: wts.map(function () { return 0; }), extra: wts.map(function () { return 0; }) }; }
      else fx = allocateX(fee, takers.concat([0]));
    } else fx = allocateX(fee, wts);
    var rows = wts.map(function (q, k) { return { qty: q, requested: k < r.length ? r[k] : 0, goods: g.shares[k], fee: fx.shares[k], total: g.shares[k] + fx.shares[k], extraCents: g.extra[k] + fx.extra[k], unallocated: k === r.length }; });
    base.assigned = assigned ? a : -1;
    base.rows = rows.slice(0, r.length); base.unallocated = rows[r.length];
    base.status = unQty > 0 ? 'under' : 'exact'; base.unallocatedBeforeAssign = Q - R; base.complete = true; base.total = price + fee; base.shortage = 0;
    return base;
  }
  return { QSCALE: QSCALE, MIN_H: MIN_H, MAX_H: MAX_H, parseQty: parseQty, parseMoney: parseMoney, fmtQty: fmtQty, fmtMoney: fmtMoney, allocate: allocate, allocateX: allocateX, compute: compute };
});
