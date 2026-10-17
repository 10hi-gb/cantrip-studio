'use strict';
// Even Up: pure model (no DOM, no storage, no network). One event, 2–8 people, up to 20 expenses. Every amount is an
// integer number of cents (minor units); nothing here ever uses a fractional amount of money.
//
// Per expense: share_i = floor(amount × w_i / W) (equal split: every w_i = 1). The leftover cents (amount − Σ floors,
// always fewer than the number of people in the split) go one each to the largest remainders (amount × w_i mod W);
// ties go to whoever is listed first in the event's people list. So the shares of every expense add up to its amount
// exactly, and the same input always gives the same cents.
//
// Net balance = paid − share. Balances add up to exactly zero (each valid expense adds +amount to its payer and
// −amount spread over its shares). Only valid expenses count; invalid ones are reported and left out.
//
// Settlement is a simple, deterministic way to settle, not an optimised one: people who owe (in list order) pay
// people who are owed (in list order), each payment the smaller of what the payer still owes and what the payee is
// still owed. After the list, every balance is zero. Every payment is a positive whole number of cents.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.EU = factory(root.MILL);
})(this, function (M) {
  var LIM = { pMin: 2, pMax: 8, xMax: 20, name: 24, event: 60, what: 40, amtMax: 10000000 /* $100,000.00 in cents */, wMax: 100000 /* weight 1000.00 in hundredths */ };
  var URL_MAX = 2000, VER = 1, TAG = 'e';
  // Currency is picked from a fixed list (not typed): symbol shown before the amount, two decimals each.
  var CUR = ['$', '\u20AC', '\u00A3'];
  function fold(s) { return M.strip(s).replace(/\s+/g, '').toLowerCase(); }
  function clean(s) { return M.strip(s); }
  // ---- money: integer cents only
  // Plain amount: digits with an optional . and 1–2 decimals ("12", "12.5", "12.50", ".50"). Returns {ok, v: cents} or
  // {ok:false, why: 'empty' | 'negative' | 'plain' | 'big'}.
  function parseAmount(s) {
    s = M.strip(s); if (!s) return { ok: false, why: 'empty' };
    if (/^[-\u2212\u2013]\s*[\d.,]/.test(s)) return { ok: false, why: 'negative' };
    var m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(s) || /^()\.(\d{1,2})$/.exec(s); if (!m) return { ok: false, why: 'plain' };
    var whole = m[1] ? m[1].replace(/^0+(?=\d)/, '') : '0'; if (whole.length > 9) return { ok: false, why: 'big' };
    var v = parseInt(whole, 10) * 100 + (m[2] ? parseInt((m[2] + '0').slice(0, 2), 10) : 0);
    if (v > LIM.amtMax) return { ok: false, why: 'big' }; return { ok: true, v: v };
  }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  // fmt(1234567, '$') -> "$12,345.67"; sign: '' (absolute value) or 'signed' ("+$1.00" / "−$1.00" / "$0.00")
  function fmt(c, sym, signed) {
    if (typeof c !== 'number' || c % 1 || !isFinite(c)) throw new Error('cents must be an integer');
    var a = Math.abs(c), s = (sym == null ? '$' : sym) + group(Math.floor(a / 100)) + '.' + String(a % 100 + 100).slice(1);
    return signed && c ? (c > 0 ? '+' : '\u2212') + s : s;
  }
  // Weight: plain number up to 2 decimals, stored as integer hundredths. 0 is reported separately (why 'zero').
  function parseWeight(s) {
    s = M.strip(String(s == null ? '' : s)); var m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s) || /^()\.(\d{1,2})$/.exec(s); if (!m) return { ok: false, why: 'nan' };
    var v = (m[1] ? parseInt(m[1], 10) : 0) * 100 + (m[2] ? parseInt((m[2] + '0').slice(0, 2), 10) : 0);
    if (v === 0) return { ok: false, why: 'zero', v: 0 }; if (v > LIM.wMax) return { ok: false, why: 'big' }; return { ok: true, v: v };
  }
  function fmtWeight(h) { var w = Math.floor(h / 100), f = h % 100; return f ? w + '.' + String(f + 100).slice(1).replace(/0$/, '') : String(w); }
  // ---- the split (one expense): integer cents, deterministic leftover cents
  // ids: participants in people-list order; w: matching positive integer weights. Returns [{id, c, extra}] where extra=1
  // marks a share that received one leftover cent.
  function split(amount, ids, w) {
    var W = 0, i; for (i = 0; i < ids.length; i++) W += w[i];
    if (!(W > 0) || amount < 0 || amount % 1) throw new Error('bad split');
    var out = [], used = 0;
    for (i = 0; i < ids.length; i++) { var num = amount * w[i]; out.push({ id: ids[i], c: Math.floor(num / W), rem: num % W, pos: i, extra: 0 }); used += out[i].c; }
    var left = amount - used, order = out.slice().sort(function (a, b) { return b.rem - a.rem || a.pos - b.pos; });
    for (i = 0; i < left; i++) { order[i].c += 1; order[i].extra = 1; }
    return out.map(function (x) { return { id: x.id, c: x.c, extra: x.extra }; });
  }
  // ---- state
  // st = { ev: event name, cur: index into CUR, p: [{id, name}], x: [{id, what, amt: cents, payer: personId|null,
  //        gone: name of a removed payer or '', mode: 'e'|'w', inc: [personId...], w: {personId: hundredths|NaN|0}}], next }
  function blank() { return { ev: '', cur: 0, p: [{ id: 1, name: '' }, { id: 2, name: '' }], x: [], next: 3 }; }
  function person(st, id) { for (var i = 0; i < st.p.length; i++) if (st.p[i].id === id) return st.p[i]; return null; }
  // Event/people problems. The event name is optional (blank -> Writer's title as the default). [{why: 'eventLong'|'tooFew'|'tooMany'|'empty'|'long'|'dup', id?, over?}]
  function peopleErrors(st) {
    var out = [], seen = {}, el = M.len(clean(st.ev));
    if (el > LIM.event) out.push({ why: 'eventLong', over: el - LIM.event });
    if (st.p.length < LIM.pMin) out.push({ why: 'tooFew' }); if (st.p.length > LIM.pMax) out.push({ why: 'tooMany' });
    st.p.forEach(function (p) { var k = fold(p.name), n = M.len(clean(p.name)); if (!k) out.push({ id: p.id, why: 'empty' }); else if (n > LIM.name) out.push({ id: p.id, why: 'long', over: n - LIM.name }); else if (seen[k]) out.push({ id: p.id, why: 'dup' }); if (k) seen[k] = 1; });
    if (!(st.cur >= 0 && st.cur < CUR.length && st.cur % 1 === 0)) out.push({ why: 'currency' });
    return out;
  }
  // Participants of x in people-list order (ids no longer on the list are ignored).
  function parts(st, x) { return st.p.filter(function (p) { return x.inc.indexOf(p.id) >= 0; }).map(function (p) { return p.id; }); }
  // One expense's problems: {field: why}. Fields: what, amt, payer, split.
  function expenseErrors(st, x) {
    var e = {}, wl = M.len(clean(x.what));
    if (!wl) e.what = 'empty'; else if (wl > LIM.what) e.what = 'long';
    if (typeof x.amt !== 'number' || x.amt % 1 || !isFinite(x.amt)) e.amt = 'plain'; else if (x.amt < 0) e.amt = 'negative'; else if (x.amt > LIM.amtMax) e.amt = 'big';
    if (x.payer == null || !person(st, x.payer)) e.payer = x.gone ? 'gone' : 'none';
    var ids = parts(st, x);
    if (!ids.length) e.split = 'none';
    else if (x.mode === 'w') {
      var ws = ids.map(function (id) { return x.w[id]; });
      if (ws.every(function (v) { return v === 0; })) e.split = 'weightZero';
      else if (ws.some(function (v) { return typeof v !== 'number' || v % 1 || !(v > 0) || v > LIM.wMax; })) e.split = 'weight';
    } else if (x.mode !== 'e') e.split = 'mode';
    return e;
  }
  function compute(st) {
    var net = {}, paid = {}, owe = {}; st.p.forEach(function (p) { net[p.id] = 0; paid[p.id] = 0; owe[p.id] = 0; });
    var xs = st.x.map(function (x, i) {
      var e = expenseErrors(st, x), ok = !Object.keys(e).length, r = { id: x.id, n: i + 1, x: x, err: e, ok: ok, shares: [], residual: 0, total: 0 };
      if (!ok) return r;
      var ids = parts(st, x), w = x.mode === 'w' ? ids.map(function (id) { return x.w[id]; }) : ids.map(function () { return 1; });
      r.shares = split(x.amt, ids, w); r.residual = r.shares.reduce(function (a, s) { return a + s.extra; }, 0);
      r.total = r.shares.reduce(function (a, s) { return a + s.c; }, 0);
      if (r.total !== x.amt) throw new Error('shares do not add up'); // cannot happen: split() is exact
      paid[x.payer] += x.amt; net[x.payer] += x.amt; r.shares.forEach(function (s) { owe[s.id] += s.c; net[s.id] -= s.c; });
      r.out = st.p.filter(function (p) { return ids.indexOf(p.id) < 0; }).map(function (p) { return p.id; });
      return r;
    });
    var sum = st.p.reduce(function (a, p) { return a + net[p.id]; }, 0);
    if (sum !== 0) throw new Error('balances do not sum to zero'); // cannot happen
    var balances = st.p.map(function (p) { return { id: p.id, net: net[p.id], paid: paid[p.id], share: owe[p.id] }; });
    return { xs: xs, balances: balances, sum: sum, transfers: settle(balances), bad: xs.filter(function (r) { return !r.ok; }).length, pErr: peopleErrors(st) };
  }
  // A simple deterministic settlement (see header). balances: [{id, net}] in list order with Σ net = 0.
  function settle(balances) {
    var d = [], c = [], out = [];
    balances.forEach(function (b) { if (b.net < 0) d.push({ id: b.id, left: -b.net }); else if (b.net > 0) c.push({ id: b.id, left: b.net }); });
    var i = 0, j = 0;
    while (i < d.length && j < c.length) {
      var a = Math.min(d[i].left, c[j].left); out.push({ from: d[i].id, to: c[j].id, c: a });
      d[i].left -= a; c[j].left -= a; if (!d[i].left) i++; if (!c[j].left) j++;
    }
    return out;
  }
  // Apply transfers to balances; returns the remaining net per id (all zero for a correct settlement).
  function after(balances, transfers) { var r = {}; balances.forEach(function (b) { r[b.id] = b.net; }); transfers.forEach(function (t) { r[t.from] += t.c; r[t.to] -= t.c; }); return r; }
  function canShare(st, c) { c = c || compute(st); return !c.pErr.length && !c.bad && st.x.length > 0 && st.x.length <= LIM.xMax; }
  // ---- edits
  function removePerson(st, id) {
    var p = person(st, id); if (!p || st.p.length <= LIM.pMin) return false;
    st.p = st.p.filter(function (q) { return q.id !== id; });
    st.x.forEach(function (x) { x.inc = x.inc.filter(function (k) { return k !== id; }); delete x.w[id]; if (x.payer === id) { x.payer = null; x.gone = clean(p.name); } });
    return true;
  }
  function removeExpense(st, id) { var n = st.x.length; st.x = st.x.filter(function (x) { return x.id !== id; }); return st.x.length < n; }
  // Event as shown in plain text: the typed name quoted, or Writer's title (unquoted product text) when it was left blank.
  function eventText(st, C) { var e = clean(st.ev); return e ? M.quote(e) : C.title; }
  // ---- plain-text summary (Writer summaryText); every typed value quoted
  function summary(st, C, c) {
    c = c || compute(st); var sym = CUR[st.cur], nm = function (id) { var p = person(st, id); return M.quote(clean(p ? p.name : '')); };
    var lines = c.transfers.length ? c.transfers.map(function (t) { return M.fill(C.summaryTransferLine, { from: nm(t.from), to: nm(t.to), amount: fmt(t.c, sym) }); }).join('') + M.fill(C.summaryAfter, { zero: fmt(0, sym) }) : C.summaryEven;
    return M.fill(C.summaryText, { event: eventText(st, C), currency: sym, lines: lines, policy: C.residualPolicy });
  }
  // ---- link: "#e1.<base64url JSON>.<6-hex checksum>", readable by anyone holding it.
  // JSON {e: event, c: currency index, p: [names], x: [[what, cents, payerIndex, 0|1 (equal|weighted), parts]]}
  // parts: equal -> [personIndex...] ascending; weighted -> [[personIndex, hundredths]...] ascending by index.
  function rawFragment(st) {
    if (!canShare(st)) return null; var idx = {}; st.p.forEach(function (p, i) { idx[p.id] = i; });
    return M.pack(TAG, VER, { e: clean(st.ev), c: st.cur, p: st.p.map(function (p) { return clean(p.name); }), x: st.x.map(function (x) {
      var ids = parts(st, x); return [clean(x.what), x.amt, idx[x.payer], x.mode === 'w' ? 1 : 0, x.mode === 'w' ? ids.map(function (id) { return [idx[id], x.w[id]]; }) : ids.map(function (id) { return idx[id]; })]; }) });
  }
  // prefixLen: length of origin + path + '#' this link will sit behind. The WHOLE URL must be ≤ URL_MAX.
  // Returns the fragment, '' when the full URL would be too long, or null when the event can't be shared yet.
  function encode(st, prefixLen) { var f = rawFragment(st); if (f === null) return null; return (prefixLen || 0) + f.length <= URL_MAX ? f : ''; }
  function isInt(v, lo, hi) { return typeof v === 'number' && isFinite(v) && v % 1 === 0 && v >= lo && v <= hi; }
  // Full rejection of anything malformed: wrong shape, extra keys, out-of-range numbers, duplicate/unsorted parts,
  // typed text that isn't clean, or an event that wouldn't pass validation. Returns {ok:true,data:st} | {ok:false,why}.
  function decode(frag) {
    var u = M.unpack(frag, TAG, VER, URL_MAX); if (!u.ok) return u.why === 'otherTag' ? { ok: false, why: 'bad' } : u;
    var d = u.data, bad = { ok: false, why: 'bad' };
    if (Array.isArray(d) || Object.keys(d).sort().join() !== 'c,e,p,x' || typeof d.e !== 'string' || !isInt(d.c, 0, CUR.length - 1) || !Array.isArray(d.p) || !Array.isArray(d.x)) return bad;
    if (d.p.length < LIM.pMin || d.p.length > LIM.pMax || d.x.length < 1 || d.x.length > LIM.xMax) return bad;
    if (clean(d.e) !== d.e || d.p.some(function (n) { return typeof n !== 'string' || clean(n) !== n; })) return bad;
    var st = { ev: d.e, cur: d.c, p: d.p.map(function (n, i) { return { id: i + 1, name: n }; }), x: [], next: 0 }, id = d.p.length + 1, np = d.p.length;
    for (var i = 0; i < d.x.length; i++) {
      var r = d.x[i]; if (!Array.isArray(r) || r.length !== 5 || typeof r[0] !== 'string' || clean(r[0]) !== r[0] || !isInt(r[1], 0, LIM.amtMax) || !isInt(r[2], 0, np - 1) || (r[3] !== 0 && r[3] !== 1) || !Array.isArray(r[4]) || !r[4].length || r[4].length > np) return bad;
      var x = { id: id++, what: r[0], amt: r[1], payer: r[2] + 1, gone: '', mode: r[3] ? 'w' : 'e', inc: [], w: {} }, last = -1;
      for (var j = 0; j < r[4].length; j++) {
        var q = r[4][j], k, w = 100;
        if (r[3]) { if (!Array.isArray(q) || q.length !== 2 || !isInt(q[0], 0, np - 1) || !isInt(q[1], 1, LIM.wMax)) return bad; k = q[0]; w = q[1]; }
        else { if (!isInt(q, 0, np - 1)) return bad; k = q; }
        if (k <= last) return bad; last = k; x.inc.push(k + 1); x.w[k + 1] = w;
      }
      st.x.push(x);
    }
    st.next = id; if (!canShare(st)) return bad;
    return { ok: true, data: st };
  }
  return { LIM: LIM, URL_MAX: URL_MAX, VER: VER, TAG: TAG, CUR: CUR, fold: fold, parseAmount: parseAmount, fmt: fmt, parseWeight: parseWeight, fmtWeight: fmtWeight, split: split, blank: blank, person: person, parts: parts, peopleErrors: peopleErrors, expenseErrors: expenseErrors, compute: compute, settle: settle, after: after, canShare: canShare, removePerson: removePerson, removeExpense: removeExpense, summary: summary, eventText: eventText, rawFragment: rawFragment, encode: encode, decode: decode };
});
