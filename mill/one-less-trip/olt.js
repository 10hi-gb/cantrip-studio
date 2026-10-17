'use strict';
// One Less Trip: pure model. 2–6 households, up to 30 item rows {owner, item, qty, unit, stop}. Regroups rows by stop in
// first-entered order (grouping only, never a route). Every source row lands exactly once: on one stop ticket, in the
// unknown-stop tray, or held back (invalid). Rows merge ONLY when the visitor presses Merge, and only if item name AND unit match
// exactly after trimming, collapsing spaces and lower-casing. Merged lines keep every owner + quantity.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../shared/core.js'));
  else root.OLT = factory(root.MILL);
})(this, function (M) {
  var LIM = { hhMin: 2, hhMax: 6, rows: 30, name: 24, item: 40, unit: 16, stop: 40, qtyMax: 100000 }, FRAG_MAX = 2000;
  function norm(s) { return M.strip(s).replace(/\s+/g, ' ').toLowerCase(); }
  function mkey(item, unit) { return norm(item) + '\u0000' + norm(unit); }
  // quantity: plain decimal, up to 3 places, > 0, <= qtyMax. Returned as integer thousandths.
  function parseQty(s) {
    s = M.strip(s); var m = /^(\d{1,9})(?:\.(\d{1,3}))?$/.exec(s) || /^()\.(\d{1,3})$/.exec(s); if (!m) return { ok: false, why: 'nan' };
    var v = (m[1] ? parseInt(m[1], 10) : 0) * 1000 + (m[2] ? parseInt((m[2] + '00').slice(0, 3), 10) : 0);
    if (v <= 0) return { ok: false, why: 'zero' }; if (v > LIM.qtyMax * 1000) return { ok: false, why: 'big' }; return { ok: true, v: v };
  }
  function fmtQty(t) { var w = Math.floor(t / 1000), f = t % 1000; return f ? w + '.' + String(f + 1000).slice(1).replace(/0+$/, '') : String(w); }
  function tag(i) { return 'r' + (i < 9 ? '0' : '') + (i + 1); }
  function blank() { return { h: [{ id: 1, name: '' }, { id: 2, name: '' }], r: [], m: [], next: 3 }; }
  // Household problems (list-level).
  function householdErrors(st) {
    var out = [], seen = {};
    if (st.h.length < LIM.hhMin) out.push({ why: 'tooFew' }); if (st.h.length > LIM.hhMax) out.push({ why: 'tooMany' });
    st.h.forEach(function (h) { var n = norm(h.name); if (!n) out.push({ id: h.id, why: 'empty' }); else if (M.len(M.strip(h.name)) > LIM.name) out.push({ id: h.id, why: 'long', over: M.len(M.strip(h.name)) - LIM.name }); else if (seen[n]) out.push({ id: h.id, why: 'dup' }); seen[n] = 1; });
    return out;
  }
  // Validate one row's fields (form or stored row). Returns {} or {field: why}.
  function rowErrors(st, r) {
    var e = {}, h = null; st.h.forEach(function (x) { if (x.id === r.o) h = x; });
    if (!h || !norm(h.name)) e.o = 'missing';
    if (!M.strip(r.i)) e.i = 'empty'; else if (M.len(M.strip(r.i)) > LIM.item) e.i = 'long';
    if (typeof r.q !== 'number' || !(r.q > 0) || r.q > LIM.qtyMax * 1000 || r.q % 1) e.q = 'zero';
    if (M.len(M.strip(r.u)) > LIM.unit) e.u = 'long'; if (M.len(M.strip(r.s)) > LIM.stop) e.s = 'long';
    return e;
  }
  function ownerName(st, id) { for (var i = 0; i < st.h.length; i++) if (st.h[i].id === id) return M.strip(st.h[i].name); return ''; }
  function compute(st) {
    var rows = st.r.map(function (r, i) { var e = rowErrors(st, r); return { id: r.id, idx: i, tag: tag(i), row: r, err: e, ok: !Object.keys(e).length, owner: ownerName(st, r.o), stopKey: norm(r.s), key: mkey(r.i, r.u) }; });
    var byId = {}; rows.forEach(function (x) { byId[x.id] = x; });
    // effective merge groups: valid members only, same stop + same key as first valid member, >= 2 members, disjoint
    var groupOf = {}, groups = [];
    st.m.forEach(function (g) {
      var mem = g.map(function (id) { return byId[id]; }).filter(function (x) { return x && x.ok && !groupOf[x.id]; });
      if (mem.length) { var f = mem[0]; mem = mem.filter(function (x) { return x.stopKey === f.stopKey && x.key === f.key; }); }
      mem.sort(function (a, b) { return a.idx - b.idx; });
      if (mem.length >= 2) { var gi = groups.length; groups.push(mem); mem.forEach(function (x) { groupOf[x.id] = gi + 1; }); }
    });
    var stops = [], stopIdx = {}, unknown = { name: null, lines: [], rows: [] }, held = [];
    rows.forEach(function (x) {
      if (!x.ok) { held.push(x); return; }
      var bucket;
      if (!x.stopKey) bucket = unknown; else { if (!(x.stopKey in stopIdx)) { stopIdx[x.stopKey] = stops.length; stops.push({ key: x.stopKey, name: M.strip(x.row.s).replace(/\s+/g, ' '), n: stops.length + 1, lines: [], rows: [] }); } bucket = stops[stopIdx[x.stopKey]]; }
      bucket.rows.push(x);
      var g = groupOf[x.id];
      if (g && groups[g - 1][0] !== x) return; // later member: folded into the group's line
      var mem = g ? groups[g - 1] : [x];
      bucket.lines.push({ lk: (g ? 'g' : 'r') + x.id, merged: !!g, item: M.strip(x.row.i), unit: M.strip(x.row.u), key: x.key, q: mem.reduce(function (a, y) { return a + y.row.q; }, 0),
        traces: mem.map(function (y) { return { id: y.id, owner: y.owner, tag: y.tag, q: y.row.q, unit: M.strip(y.row.u) }; }), kept: null });
    });
    // merge offers + kept-separate notes, per bucket
    stops.concat([unknown]).forEach(function (b) {
      b.offers = [];
      var byKey = {}; b.lines.forEach(function (l) { (byKey[l.key] = byKey[l.key] || []).push(l); });
      Object.keys(byKey).forEach(function (k) { var ls = byKey[k]; if (ls.length >= 2) b.offers.push({ key: k, stopKey: b.key || '', lines: ls, ids: [].concat.apply([], ls.map(function (l) { return l.traces.map(function (t) { return t.id; }); })) }); });
      b.lines.forEach(function (l, i) { for (var j = 0; j < i; j++) { var o = b.lines[j]; if (norm(o.item) === norm(l.item) && norm(o.unit) !== norm(l.unit)) { l.kept = { unit1: l.unit, unit2: o.unit }; break; } } });
    });
    var placed = stops.reduce(function (a, s) { return a + s.rows.length; }, 0);
    return { rows: rows, stops: stops, unknown: unknown, held: held, hhErr: householdErrors(st), ledger: { inn: rows.length, placed: placed, aside: unknown.rows.length, held: held.length } };
  }
  // Explicit merge: all valid rows at that stop with exactly that key join one group.
  function merge(st, stopKey, key) {
    var c = compute(st), b = stopKey ? c.stops.filter(function (s) { return s.key === stopKey; })[0] : c.unknown; if (!b) return false;
    var ids = b.rows.filter(function (x) { return x.key === key; }).map(function (x) { return x.id; }); if (ids.length < 2) return false;
    st.m = st.m.filter(function (g) { return !g.some(function (id) { return ids.indexOf(id) >= 0; }); }); st.m.push(ids); return true;
  }
  function unmerge(st, anyId) { var n = st.m.length; st.m = st.m.filter(function (g) { return g.indexOf(anyId) < 0; }); return st.m.length < n; }
  function removeRow(st, id) { st.r = st.r.filter(function (r) { return r.id !== id; }); st.m = st.m.map(function (g) { return g.filter(function (x) { return x !== id; }); }).filter(function (g) { return g.length >= 2; }); }
  function removeHousehold(st, id) { st.h = st.h.filter(function (h) { return h.id !== id; }); st.r.forEach(function (r) { if (r.o === id) r.o = null; }); }
  function canShare(st) { var c = compute(st); return c.rows.length > 0 && !c.held.length && !c.hhErr.length; }
  function qtyUnit(q, u) { return fmtQty(q) + (u ? ' ' + u : ''); }
  function text(st, C) {
    var c = compute(st), L = [C.shareText, ''];
    function lines(b) { b.lines.forEach(function (l) {
      if (l.merged) L.push('[ ] ' + M.fill(C.mergedLine, { item: l.item, qty: fmtQty(l.q), unit: l.unit }).replace(/  +/g, ' ') + ' — ' + M.fill(C.mergedTrace, { traces: l.traces.map(function (t) { return M.fill(C.traceLine, { owner: t.owner, qty: fmtQty(t.q), unit: t.unit }).trim() + ' (' + t.tag + ')'; }).join(', ') }));
      else { var t = l.traces[0]; L.push('[ ] ' + l.item + ' — ' + M.fill(C.traceLine, { owner: t.owner, qty: fmtQty(t.q), unit: t.unit }).trim() + ' (' + t.tag + ')'); }
    }); }
    c.stops.forEach(function (s) { L.push((s.n < 10 ? '0' : '') + s.n + ' · ' + M.fill(C.stopTicket, { stop: s.name })); lines(s); L.push(''); });
    if (c.unknown.lines.length) { L.push('? · ' + C.unknownStop + ' — ' + C.unknownStopHint); lines(c.unknown); L.push(''); }
    L.push(C.notOrdered, C.allSourceNote, '', C.printFooter);
    return L.join('\n');
  }
  // Link "#t1.<b64url>.<ck>": {h:[names], r:[[ownerIdx,item,qty,unit,stop]], m:[[rowIdx..]]}. Only for a fully valid list.
  function encode(st) {
    if (!canShare(st)) return null; var hi = {}; st.h.forEach(function (h, i) { hi[h.id] = i; }); var ri = {}; st.r.forEach(function (r, i) { ri[r.id] = i; });
    var c = compute(st), groups = []; c.stops.concat([c.unknown]).forEach(function (b) { b.lines.forEach(function (l) { if (l.merged) groups.push(l.traces.map(function (t) { return ri[t.id]; })); }); });
    var f = M.pack('t', 1, { h: st.h.map(function (h) { return M.strip(h.name); }), r: st.r.map(function (r) { return [hi[r.o], M.strip(r.i), fmtQty(r.q), M.strip(r.u), M.strip(r.s)]; }), m: groups });
    return f.length <= FRAG_MAX ? f : '';
  }
  function decode(frag) {
    var u = M.unpack(frag, 't', 1, FRAG_MAX); if (!u.ok) return u; var d = u.data, bad = { ok: false, why: 'bad' };
    if (!d || Array.isArray(d) || Object.keys(d).sort().join() !== 'h,m,r' || !Array.isArray(d.h) || !Array.isArray(d.r) || !Array.isArray(d.m)) return bad;
    if (d.h.length < LIM.hhMin || d.h.length > LIM.hhMax || d.r.length < 1 || d.r.length > LIM.rows) return bad;
    if (d.h.some(function (n) { return typeof n !== 'string'; })) return bad;
    var st = { h: d.h.map(function (n, i) { return { id: i + 1, name: M.strip(n) }; }), r: [], m: [], next: 0 }, id = d.h.length + 1;
    for (var i = 0; i < d.r.length; i++) {
      var x = d.r[i]; if (!Array.isArray(x) || x.length !== 5 || typeof x[0] !== 'number' || x[0] % 1 || x[0] < 0 || x[0] >= d.h.length || [1, 2, 3, 4].some(function (k) { return typeof x[k] !== 'string'; })) return bad;
      var q = parseQty(x[2]); if (!q.ok) return bad; st.r.push({ id: id++, o: x[0] + 1, i: M.strip(x[1]), q: q.v, u: M.strip(x[3]), s: M.strip(x[4]) });
    }
    var used = {};
    for (i = 0; i < d.m.length; i++) {
      var g = d.m[i]; if (!Array.isArray(g) || g.length < 2) return bad;
      for (var j = 0; j < g.length; j++) { if (typeof g[j] !== 'number' || g[j] % 1 || g[j] < 0 || g[j] >= st.r.length || used[g[j]]) return bad; used[g[j]] = 1; }
      var a = st.r[g[0]]; if (g.some(function (k) { var r = st.r[k]; return mkey(r.i, r.u) !== mkey(a.i, a.u) || norm(r.s) !== norm(a.s); })) return bad;
      st.m.push(g.map(function (k) { return st.r[k].id; }));
    }
    st.next = id; if (!canShare(st)) return bad;
    return { ok: true, data: st };
  }
  return { LIM: LIM, FRAG_MAX: FRAG_MAX, norm: norm, mkey: mkey, parseQty: parseQty, fmtQty: fmtQty, tag: tag, blank: blank, householdErrors: householdErrors, rowErrors: rowErrors, compute: compute, merge: merge, unmerge: unmerge, removeRow: removeRow, removeHousehold: removeHousehold, canShare: canShare, qtyUnit: qtyUnit, text: text, encode: encode, decode: decode };
});
