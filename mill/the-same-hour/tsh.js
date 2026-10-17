'use strict';
// The Same Hour — model. Pure functions; no storage, no network, no clock reads except where the UI passes a date in.
// Times: local wall-clock HH:MM on a date in ONE explicit IANA zone -> absolute instants (ms). Gap (spring-forward) and
// ambiguous (fall-back) local times are rejected, never moved. Each person's own intervals are merged (overlapping or
// touching) before intersecting. Intersections are open: an end meeting a start is a touch, not an overlap.
// A day with no entries for a person is UNKNOWN, never free; unknown people never join an intersection.
(function (root, factory) { var m = factory(root.MILL || (typeof require === 'function' ? require('../shared/core.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.TSH = m; })(this, function (M) {
  var LIM = { pMin: 2, pMax: 6, name: 24, title: 40, ivPer: 21, minMax: 1440, hrMax: 24, frag: 2000 }; // frag: decode limit; the app caps origin+path+fragment at 2,000 (QA D7)
  // Cap: origin+path+fragment ≤ 2,000 chars. Not a literal full-URL cap. An appended ?query is ignored; pieces never generate a query, and no visitor content is ever in a query string (never parsed, shown or echoed).
  var DAY = 864e5, MIN = 6e4;
  var fmts = {};
  // QA local-715aa3a D1: current IANA names and their legacy aliases both work; links and the picker always use the current
  // (canonical) name. Browsers' Intl lists can return either form (Chrome/Node return the legacy ICU ids).
  var RENAMED = { 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu', 'Europe/Kiev': 'Europe/Kyiv', 'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
    'America/Catamarca': 'America/Argentina/Catamarca', 'America/Cordoba': 'America/Argentina/Cordoba', 'America/Jujuy': 'America/Argentina/Jujuy', 'America/Mendoza': 'America/Argentina/Mendoza',
    'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Rangoon': 'Asia/Yangon', 'America/Godthab': 'America/Nuuk', 'Atlantic/Faeroe': 'Atlantic/Faroe', 'Pacific/Enderbury': 'Pacific/Kanton',
    'Pacific/Truk': 'Pacific/Chuuk', 'Pacific/Ponape': 'Pacific/Pohnpei', 'America/Indianapolis': 'America/Indiana/Indianapolis', 'America/Louisville': 'America/Kentucky/Louisville',
    'America/Coral_Harbour': 'America/Atikokan', 'Asia/Dacca': 'Asia/Dhaka', 'Asia/Thimbu': 'Asia/Thimphu', 'Asia/Ulan_Bator': 'Asia/Ulaanbaatar', 'Asia/Macao': 'Asia/Macau',
    'Asia/Chongqing': 'Asia/Shanghai', 'Asia/Kashgar': 'Asia/Urumqi', 'Europe/Uzhgorod': 'Europe/Kyiv', 'Europe/Zaporozhye': 'Europe/Kyiv', 'Asia/Ujung_Pandang': 'Asia/Makassar' };
  // QA D1-r: the backward-link names browsers' Intl may carry (US/*, Etc/UTC…) map to one canonical name; anything else Intl
  // accepts is canonicalized through resolvedOptions().timeZone when that lands on a picker name (canonical()).
  var BACKWARD = { 'US/Pacific': 'America/Los_Angeles', 'US/Eastern': 'America/New_York', 'US/Central': 'America/Chicago', 'US/Mountain': 'America/Denver',
    'US/Alaska': 'America/Anchorage', 'US/Hawaii': 'Pacific/Honolulu', 'US/Arizona': 'America/Phoenix', 'US/Aleutian': 'America/Adak', 'US/East-Indiana': 'America/Indiana/Indianapolis',
    'US/Indiana-Starke': 'America/Indiana/Knox', 'US/Michigan': 'America/Detroit', 'US/Samoa': 'Pacific/Pago_Pago', 'US/Pacific-New': 'America/Los_Angeles',
    'Etc/UTC': 'UTC', 'Etc/UCT': 'UTC', 'UCT': 'UTC', 'Etc/Universal': 'UTC', 'Universal': 'UTC', 'Etc/Zulu': 'UTC', 'Zulu': 'UTC', 'Etc/GMT': 'UTC', 'GMT': 'UTC', 'Etc/Greenwich': 'UTC', 'Greenwich': 'UTC', 'GMT0': 'UTC', 'GMT+0': 'UTC', 'GMT-0': 'UTC', 'Etc/GMT0': 'UTC', 'Etc/GMT+0': 'UTC', 'Etc/GMT-0': 'UTC' };
  Object.keys(BACKWARD).forEach(function (k) { if (!RENAMED[k]) RENAMED[k] = BACKWARD[k]; });
  var LEGACY = {}; Object.keys(RENAMED).forEach(function (k) { if (!LEGACY[RENAMED[k]]) LEGACY[RENAMED[k]] = k; });
  function canon(z) { return typeof z === 'string' && RENAMED[z] ? RENAMED[z] : z; }
  // full canonicalization for names arriving in links: table first, then the picker, then Intl's own resolution
  var CANON = {}; function canonical(z) { if (typeof z !== 'string' || !z || z.length > 64 || !/^[A-Za-z0-9_+\-\/]+$/.test(z)) return null; if (z in CANON) return CANON[z];
    var c = canon(z), list = zones(), out = null; if (list.indexOf(c) >= 0) out = c;
    else if (intlOk(z)) { var r = ''; try { r = new Intl.DateTimeFormat('en-US', { timeZone: z }).resolvedOptions().timeZone; } catch (e) {} r = canon(r); if (list.indexOf(r) >= 0) out = r; }
    CANON[z] = out; return out; }
  function intlOk(z) { try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch (e) { return false; } }
  var ZL = null; function zones() { if (ZL) return ZL.slice(); var z = []; try { z = Intl.supportedValuesOf('timeZone').slice(); } catch (e) {} if (z.indexOf('UTC') < 0) z.push('UTC');
    var seen = {}; ZL = []; z.forEach(function (k) { var c = canon(k); if (!seen[c] && (c === k || intlOk(c))) { seen[c] = 1; ZL.push(c); } else if (!seen[c] && !seen[k]) { seen[k] = 1; ZL.push(k); } }); ZL.sort(); return ZL.slice(); }
  function validZone(z) { var c = canonical(z); return !!c && intlOk(zid(c)); }
  // the id Intl is given: the canonical name when the engine knows it, else its legacy alias
  var ZID = {}; function zid(z) { if (!(z in ZID)) ZID[z] = intlOk(z) ? z : (LEGACY[z] && intlOk(LEGACY[z]) ? LEGACY[z] : z); return ZID[z]; }
  function fmt(z) { if (!fmts[z]) fmts[z] = new Intl.DateTimeFormat('en-US', { timeZone: zid(z), hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }); return fmts[z]; }
  // wall clock of instant t in zone z, expressed as a UTC-epoch number (ms)
  function wall(t, z) { var p = {}; fmt(z).formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; }); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second); }
  function off(t, z) { return wall(t, z) - Math.floor(t / 1000) * 1000; }
  function parseDate(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null; var t = Date.UTC(+m[1], +m[2] - 1, +m[3]); var d = new Date(t); if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3] || +m[1] < 1970 || +m[1] > 2100) return null; return t; }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  // 'HH:MM' -> minutes; allowEnd lets '24:00' mean the end of the day. Also accepts H:MM.
  function parseTime(s, allowEnd) { var m = /^\s*(\d{1,2}):([0-5]\d)\s*$/.exec(String(s == null ? '' : s)); if (!m) return null; var h = +m[1], mi = +m[2]; if (h === 24 && mi === 0 && allowEnd) return 1440; if (h > 23) return null; return h * 60 + mi; }
  function hhmm(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  // local date (UTC-epoch of its midnight) + minutes -> {ok,t} | {ok:false,why:'gap'|'ambiguous'}
  function resolve(dayT, min, z) {
    var L = dayT + min * MIN, seen = {}, out = [];
    [L - 14 * 36e5, L, L + 14 * 36e5].forEach(function (g) { var o = off(g, z), t = L - o; if (!seen[t] && wall(t, z) === L) { seen[t] = 1; out.push(t); } });
    if (!out.length) return { ok: false, why: 'gap' };
    if (out.length > 1) return { ok: false, why: 'ambiguous' };
    return { ok: true, t: out[0] };
  }
  function blank(wk) { return { w: wk || '', z: '', n: '60', u: 'min', t: '', p: [{ id: 1, n: '', iv: [] }, { id: 2, n: '', iv: [] }], next: 3 }; }
  function durMin(st) { var s = String(st.n == null ? '' : st.n).trim(); if (!/^\d{1,4}$/.test(s)) return null; var n = +s; if (n < 1) return null; if (st.u === 'hr') return n > LIM.hrMax ? null : n * 60; return n > LIM.minMax ? null : n; }
  function days(st) { var w = parseDate(st.w); if (w === null) return null; var a = []; for (var i = 0; i < 7; i++) a.push(w + i * DAY); return a; }
  function zoneInfo(t, z) {
    var o = off(t, z) / MIN, sg = o < 0 ? '\u2212' : '+', a = Math.abs(o), offs = sg + (Math.floor(a / 60) < 10 ? '0' : '') + Math.floor(a / 60) + ':' + (a % 60 < 10 ? '0' : '') + (a % 60), abbr = '';
    try { new Intl.DateTimeFormat('en-US', { timeZone: zid(z), timeZoneName: 'short' }).formatToParts(new Date(t)).forEach(function (x) { if (x.type === 'timeZoneName') abbr = x.value; }); } catch (e) {}
    return { zone: z, abbr: abbr, offset: offs, minutes: o };
  }
  // clock changes whose local date falls inside the week: [{t, dayIndex, from:'02:00 EDT', to:'01:00 EST'}]
  function changes(st) {
    var ds = days(st); if (!ds || !validZone(st.z)) return [];
    var z = st.z, lo = ds[0] - 14 * 36e5, hi = ds[6] + DAY + 14 * 36e5, res = [];
    for (var t = lo; t < hi; t += 36e5) {
      if (off(t, z) !== off(t + 36e5, z)) {
        var a = t, b = t + 36e5; while (b - a > MIN) { var mid = a + Math.floor((b - a) / 2 / MIN) * MIN; if (mid === a) mid = a + MIN; if (off(mid, z) === off(a, z)) a = mid; else b = mid; }
        var o1 = off(a, z), o2 = off(b, z), localDay = Math.floor((b + o1) / DAY) * DAY, idx = ds.indexOf(localDay);
        if (idx >= 0) { var i1 = zoneInfo(a, z), i2 = zoneInfo(b, z); res.push({ t: b, day: idx, from: hhmm(Math.round(((b + o1) % DAY) / MIN)) + (i1.abbr ? ' ' + i1.abbr : ''), to: hhmm(Math.round(((b + o2) % DAY) / MIN)) + (i2.abbr ? ' ' + i2.abbr : '') }); }
      }
    }
    return res;
  }
  // merge sorted [a,b] list; touching or overlapping pieces join. Each output keeps the list of source indexes.
  function mergeIv(list) { var s = list.slice().sort(function (x, y) { return x.a - y.a || x.b - y.b; }), out = []; s.forEach(function (x) { var l = out[out.length - 1]; if (l && x.a <= l.b) { if (x.b > l.b) l.b = x.b; l.src.push(x.src); } else out.push({ a: x.a, b: x.b, src: [x.src] }); }); return out; }
  // intersect two merged lists. Open overlaps -> 'pos', closed-only meetings -> 'touch' points.
  function cross(A, B) { var pos = [], touch = []; A.forEach(function (x) { B.forEach(function (y) { var a = Math.max(x.a, y.a), b = Math.min(x.b, y.b); if (b > a) pos.push({ a: a, b: b }); else if (b === a) touch.push(a); }); }); return { pos: pos, touch: touch }; }
  function interAll(sets) {
    // positive overlaps across all sets, plus touch instants where the closed intersection is a single point
    var cur = sets[0].map(function (x) { return { a: x.a, b: x.b }; }), touches = [];
    for (var i = 1; i < sets.length; i++) {
      var r = cross(cur, sets[i]); // touches found at this step: the point must lie in every remaining set too (closed)
      r.touch.forEach(function (t) { var ok = true; for (var j = i + 1; j < sets.length; j++) if (!sets[j].some(function (x) { return x.a <= t && t <= x.b; })) ok = false; if (ok) touches.push(t); });
      // a touch can also arise later between an existing positive piece and a later set: handled by cross on the next step
      cur = r.pos;
    }
    var uniq = {}; touches = touches.filter(function (t) { if (uniq[t] || cur.some(function (x) { return x.a <= t && t <= x.b; })) return false; uniq[t] = 1; return true; }).sort(function (a, b) { return a - b; });
    return { pos: cur.sort(function (a, b) { return a.a - b.a; }), touch: touches };
  }
  // Validate + compute. Returns {state, errors:[{f, code, vars}], ...}
  function compute(st) {
    var errs = [], z = st.z, ds = days(st), dm = durMin(st), people = st.p || [];
    var tooMany = people.length > LIM.pMax;
    if (!ds) errs.push({ f: 'w', code: 'weekMissing' });
    if (!validZone(z)) errs.push({ f: 'z', code: 'zoneMissing' });
    if (dm === null) errs.push({ f: 'n', code: 'durationInvalid' });
    if (M.len(M.strip(st.t)) > LIM.title) errs.push({ f: 't', code: 'titleTooLong', n: M.len(M.strip(st.t)) - LIM.title });
    var P = people.slice(0, LIM.pMax).map(function (p, pi) {
      var nm = M.strip(p.n), o = { id: p.id, i: pi, name: nm, byDay: [[], [], [], [], [], [], []], entries: [] };
      if (!nm) errs.push({ f: 'p' + p.id, code: 'personEmpty' }); else if (M.len(nm) > LIM.name) errs.push({ f: 'p' + p.id, code: 'personTooLong', n: M.len(nm) - LIM.name });
      (p.iv || []).forEach(function (v, vi) {
        var sBlank = !String(v.s || '').trim(), eBlank = !String(v.e || '').trim(); if (sBlank && eBlank) return;
        var s = parseTime(v.s, false), e = parseTime(v.e, true), bad = false, d = +v.d;
        if (s === null) { errs.push({ f: 'v' + v.id + 's', code: 'timeInvalid', pid: p.id }); bad = true; }
        if (e === null) { errs.push({ f: 'v' + v.id + 'e', code: 'timeInvalid', pid: p.id }); bad = true; }
        if (!bad && e <= s) { errs.push({ f: 'v' + v.id + 'e', code: 'intervalOrder', pid: p.id }); bad = true; }
        if (bad || !ds || !validZone(z) || !(d >= 0 && d < 7)) return;
        var ra = resolve(ds[d], s, z), rb = e === 1440 ? resolve(ds[d] + DAY, 0, z) : resolve(ds[d], e, z);
        if (!ra.ok) { errs.push({ f: 'v' + v.id + 's', code: ra.why === 'gap' ? 'dstGap' : 'dstAmbiguous', time: hhmm(s), day: d, pid: p.id }); bad = true; }
        if (!rb.ok) { errs.push({ f: 'v' + v.id + 'e', code: rb.why === 'gap' ? 'dstGap' : 'dstAmbiguous', time: hhmm(e % 1440), day: e === 1440 ? d + 1 : d, pid: p.id }); bad = true; }
        if (bad) return;
        o.byDay[d].push({ a: ra.t, b: rb.t, src: { id: v.id, s: hhmm(s), e: hhmm(e) } });
      });
      if ((p.iv || []).length > LIM.ivPer) errs.push({ f: 'p' + p.id, code: 'tooManyTimes' });
      return o;
    });
    var res = { errors: errs, people: P, days: ds, dur: dm, tooMany: tooMany, changes: changes(st) };
    if (!validZone(z)) { res.state = 'nozone'; return res; }
    if (people.length < LIM.pMin || !people.some(function (p) { return M.strip(p.n) || (p.iv || []).some(function (v) { return String(v.s || '').trim() || String(v.e || '').trim(); }); })) { res.state = 'empty'; return res; }
    if (errs.length || tooMany) { res.state = 'fix'; return res; }
    // per person per day: merge (for the day rows); and across the whole week (QA D2 / PM b: a window over midnight,
    // e.g. Mon 22:00-24:00 + Tue 00:00-02:00, is ONE 4-hour span, labelled with both days).
    P.forEach(function (p) { p.merged = p.byDay.map(mergeIv); p.week = mergeIv([].concat.apply([], p.byDay)); });
    var starts = []; for (var si = 0; si <= 7; si++) starts.push(dayStart(ds[0] + si * DAY, z));
    var dayOf = function (t) { for (var k = 6; k >= 0; k--) if (t >= starts[k]) return k; return 0; };
    var allKnown = ds.map(function (dt, di) { return P.every(function (p) { return p.merged[di].length; }); });
    var spans = [], wtouch = [];
    if (P.length) { var X = interAll(P.map(function (p) { return p.week; }));
      for (var i0 = 0; i0 < 7; i0++) { if (!allKnown[i0] || (i0 && allKnown[i0 - 1])) continue; var j0 = i0; while (j0 < 6 && allKnown[j0 + 1]) j0++; // a run of days where everyone said something
        var lo = starts[i0], hi = starts[j0 + 1];
        X.pos.forEach(function (x) { var a = Math.max(x.a, lo), b = Math.min(x.b, hi); if (b > a) { var len = Math.round((b - a) / MIN); spans.push({ a: a, b: b, len: len, day: dayOf(a), endDay: dayOf(b - 1), ok: len >= dm }); } });
        X.touch.forEach(function (t) { if (t >= lo && t <= hi) wtouch.push(t); }); } }
    var dayRes = ds.map(function (dt, di) {
      var known = P.filter(function (p) { return p.merged[di].length; }), unknown = P.filter(function (p) { return !p.merged[di].length; });
      var r = { i: di, date: dt, known: known.map(function (p) { return p.i; }), unknown: unknown.map(function (p) { return p.i; }), options: [], short: [], maybe: [], touch: [] };
      if (!known.length) { r.kind = 'allUnknown'; return r; }
      if (!unknown.length) {
        r.kind = 'all'; spans.forEach(function (x) { if (x.day === di) (x.ok ? r.options : r.short).push(x); });
        r.touch = wtouch.filter(function (t) { return dayOf(t) === di; }); return r;
      }
      r.kind = 'partial';
      if (known.length >= 2) { var y = interAll(known.map(function (p) { return p.merged[di]; })); y.pos.forEach(function (s) { var len = Math.round((s.b - s.a) / MIN); if (len >= dm) r.maybe.push({ a: s.a, b: s.b, len: len, day: di }); }); }
      return r;
    });
    res.dayRes = dayRes; res.starts = starts;
    res.options = [].concat.apply([], dayRes.map(function (d) { return d.options; }));
    res.short = [].concat.apply([], dayRes.map(function (d) { return d.short; }));
    res.maybe = [].concat.apply([], dayRes.map(function (d) { return d.maybe; }));
    res.touches = dayRes.some(function (d) { return d.touch.length; });
    res.closest = res.short.slice().sort(function (a, b) { return b.len - a.len || a.a - b.a; })[0] || null;
    res.unknownPeople = P.filter(function (p) { return p.merged.some(function (m) { return !m.length; }); }).map(function (p) { return p.i; });
    res.state = res.options.length ? 'found' : 'none';
    return res;
  }
  // instant of local midnight of day dt (UTC-epoch of the local date); if midnight is skipped, the first valid minute
  function dayStart(dt, z) { for (var m = 0; m <= 120; m += 30) { var r = resolve(dt, m, z); if (r.ok) return r.t - m * MIN; if (r.why === 'ambiguous') return dt - off(dt, z); } return dt - off(dt, z); }
  // local wall-clock minutes-of-day of instant t relative to day dt
  function localMin(t, dt, z) { return Math.round((wall(t, z) - dt) / MIN); }
  // axis window [startHour, endHour] fitted to entered data; whole hours, at least 6h, within 0..24
  function windowOf(res, z) {
    var lo = 24, hi = 0; if (!res.dayRes) return [8, 20];
    res.people.forEach(function (p) { p.merged.forEach(function (list, di) { list.forEach(function (x) { var a = localMin(x.a, res.days[di], z), b = localMin(x.b, res.days[di], z); lo = Math.min(lo, Math.floor(a / 60)); hi = Math.max(hi, Math.ceil(b / 60)); }); }); });
    if (lo >= hi) return [8, 20];
    while (hi - lo < 6) { if (lo > 0) lo--; if (hi - lo < 6 && hi < 24) hi++; }
    return [lo, Math.min(24, hi)];
  }
  // ---- fragment #h1
  function encode(st) {
    var o = { w: st.w, z: canonical(st.z) || st.z, n: String(st.n), u: st.u, t: M.strip(st.t), p: st.p.map(function (p) { return [M.strip(p.n), (p.iv || []).filter(function (v) { return String(v.s || '').trim() || String(v.e || '').trim(); }).map(function (v) { return [+v.d, String(v.s || '').trim(), String(v.e || '').trim()]; })]; }) };
    var f = M.pack('h', 1, o); return f.length > LIM.frag ? '' : f;
  }
  function decode(h) {
    var u = M.unpack(h, 'h', 1, LIM.frag); if (!u.ok) return u.why === 'otherTag' ? { ok: false, why: 'bad' } : u;
    var d = u.data, s = function (x, max) { return typeof x === 'string' && M.len(x) <= max; };
    if (!s(d.w, 10) || !s(d.z, 64) || !s(d.n, 4) || (d.u !== 'min' && d.u !== 'hr') || !s(d.t, LIM.title) || !Array.isArray(d.p) || d.p.length > LIM.pMax) return { ok: false, why: 'bad' };
    if (d.w && parseDate(d.w) === null) return { ok: false, why: 'bad' };
    if (d.z && !validZone(d.z)) return { ok: false, why: 'bad' };
    var st = { w: d.w, z: canonical(d.z) || d.z, n: d.n, u: d.u, t: d.t, p: [], next: 1 }, okAll = true;
    d.p.forEach(function (pp) {
      if (!Array.isArray(pp) || pp.length !== 2 || !s(pp[0], LIM.name) || !Array.isArray(pp[1]) || pp[1].length > LIM.ivPer) { okAll = false; return; }
      var p = { id: st.next++, n: pp[0], iv: [] };
      pp[1].forEach(function (v) { if (!Array.isArray(v) || v.length !== 3 || !(Number.isInteger(v[0]) && v[0] >= 0 && v[0] < 7) || !s(v[1], 5) || !s(v[2], 5) || !/^[0-9:]*$/.test(v[1] + v[2])) { okAll = false; return; } p.iv.push({ id: st.next++, d: v[0], s: v[1], e: v[2] }); });
      st.p.push(p);
    });
    if (!okAll) return { ok: false, why: 'bad' };
    while (st.p.length < LIM.pMin) st.p.push({ id: st.next++, n: '', iv: [] });
    return { ok: true, data: st };
  }
  return { LIM: LIM, zones: zones, validZone: validZone, canon: canonical, dayStart: dayStart, wall: wall, off: off, parseDate: parseDate, iso: iso, parseTime: parseTime, hhmm: hhmm, resolve: resolve, blank: blank, durMin: durMin, days: days, zoneInfo: zoneInfo, changes: changes, mergeIv: mergeIv, interAll: interAll, compute: compute, localMin: localMin, windowOf: windowOf, encode: encode, decode: decode };
});
