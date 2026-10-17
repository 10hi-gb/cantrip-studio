'use strict';
// Care Rota r1c core: parse a pasted plan and check it against the needed days. Port of Creative's proto
// care_rota_check.py r1d (parse/check), plus the build rules: a line with two needs, or "and" between names, is TO FIX
// and never placed. Pure: no DOM, no storage, no network. Dates are ISO Y-M-D; weekdays come from date math only
// (UTC epoch days), so a DST change (Sun Nov 1 2026) can never shift a day.
(function (root, factory) { var m = factory(root.MILL || (typeof require === 'function' ? require('../shared/core.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.CR = m; })(this, function (M) {
  var LIM = { days: 28, needs: 4, lines: 60, forName: 40, org: 24, other: 16, notes: 200, url: 2000, name: 40 }; // name: helper-name cap, the same at parse and in a received link (QA C7)
  var DAY = 864e5, WDN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], WDS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MOS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WDF = { mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1, wed: 2, weds: 2, wednesday: 2, thu: 3, thur: 3, thurs: 3, thursday: 3, fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6 };
  var MONF = {}; [['jan', 'january'], ['feb', 'february'], ['mar', 'march'], ['apr', 'april'], ['may', 'may'], ['jun', 'june'], ['jul', 'july'], ['aug', 'august'], ['sep', 'september'], ['oct', 'october'], ['nov', 'november'], ['dec', 'december']].forEach(function (p, i) { MONF[p[0]] = i + 1; MONF[p[1]] = i + 1; }); MONF.sept = 9;
  var NUM = /^\d{1,2}(st|nd|rd|th)?$/;
  // fixed synonyms (Creative §5): meal/food -> Dinner; lift/drive -> Ride; dog walk/walk/dog -> Dog walk
  var FIXED = { dinner: ['dinner', 'meal', 'food'], ride: ['ride', 'lift', 'drive'], walk: ['dog walk', 'walk', 'dog'] };
  // name separators (QA C3): a whole word and/or, & + (ASCII and full-width) ➕ and /, spaced or not. A comma counts when it sits
  // between two name words. Any of them -> TO FIX (tagTwoNames), never placed, never folded into one name.
  // C9 half-spaced joiner, PM ruling narrowed 04:38 (QA C10): a name word is a joiner ONLY when it starts with lowercase "or" or
  // "and" directly followed by an uppercase letter ("orBen", "andBen"). All-caps words (ANDERSON, ORTIZ, ORR, ORLANDO, ANDREWS) and
  // the Or/OR/And/AND spellings ("Ana OrBen", "Ana ORBen") are never joiners: one helper, placed as typed.
  var HALF = /^(?:or|and)\p{Lu}/u;
  var JOIN = { and: 1, or: 1, '&': 1, '+': 1, '\uFF06': 1, '\uFF0B': 1, '\u2795': 1, '/': 1 };
  // ---- dates ----
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return null; var t = Date.UTC(+m[1], +m[2] - 1, +m[3]); var d = new Date(t); return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null; }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function wday(t) { return (new Date(t).getUTCDay() + 6) % 7; } // Mon=0
  function dayNum(t) { return new Date(t).getUTCDate(); }
  function monNum(t) { return new Date(t).getUTCMonth() + 1; }
  function d2(t) { return WDS[wday(t)] + ' ' + MOS[monNum(t) - 1] + ' ' + dayNum(t); } // proto d2: "Wed Oct 21"
  function range(first, last) { var a = parseISO(first), b = parseISO(last); if (a == null || b == null || b < a) return null; var out = []; for (var t = a; t <= b; t += DAY) out.push(t); return out; }
  // ---- needs ----
  // need: { key, label, rule: every|weekdays|these|except, days: [Mon=0..Sun=6 or ISO strings] }
  function ruleOn(n, t) { var w = wday(t), hit = (n.days || []).some(function (x) { return typeof x === 'number' ? x === w : parseISO(x) === t; });
    if (n.rule === 'every') return true; if (n.rule === 'weekdays') return w < 5; if (n.rule === 'these') return hit; if (n.rule === 'except') return !hit; return false; }
  function synonyms(needs) { var syn = {}; needs.forEach(function (n) { var words = (FIXED[n.key] || []).slice(); var lab = M.strip(n.label).toLowerCase().replace(/[:,–]/g, ' ').replace(/\s+/g, ' ').trim(); if (lab) words.push(lab); words.forEach(function (w) { if (!(w in syn)) syn[w] = n.label; }); });
    ['dinner', 'ride', 'walk'].forEach(function (k) { if (!needs.some(function (n) { return n.key === k; })) FIXED[k].forEach(function (w) { if (!(w in syn)) syn[w] = { off: k }; }); }); return syn; }
  // ---- parse (proto r1d, exact) + build rules ----
  function tokens(raw) { return String(raw).trim().replace(/[:\u2013]/g, ' ').replace(/,/g, ' , ').replace(/[&+\uFF06\uFF0B\u2795]/g, ' $& ').replace(/\/(?!\d)|(?<!\d)\//g, ' / ').split(' - ').join(' ').split(/\s+/).filter(Boolean); }
  // "Name: day need" (planHint shape; QA C4 / Audience condition 2): words before the first colon are the helper's name, even a
  // month word (May, Jan, June, April) — when they hold no digit, no weekday and no need word. Otherwise the colon is just a space.
  function colonName(raw, syn) { var m = /^([^:]*):(.*)$/.exec(String(raw)); if (!m || /\d/.test(m[1]) || !m[2].trim()) return 0; var lt = tokens(m[1]), low = lt.map(function (w) { return w.toLowerCase(); });
    if (!lt.length || low.some(function (l) { return l in WDF; })) return 0; var j = ' ' + low.join(' ') + ' ';
    if (Object.keys(syn).some(function (k) { return j.indexOf(' ' + k + ' ') >= 0; })) return 0; return lt.length; }
  function parse(raw, syn) {
    var t = tokens(raw), low = t.map(function (w) { return w.toLowerCase(); }), used = t.map(function () { return false; }), nd = null, extra = null;
    var nLock = colonName(raw, syn), lock = t.map(function (w, i) { return i < nLock; }); // locked = the "Name:" words: never a need, day or month
    var free = function (a, b) { for (var k = a; k < b; k++) if (used[k] || lock[k]) return false; return true; };
    var phrases = Object.keys(syn).sort(function (a, b) { return b.split(' ').length - a.split(' ').length; });
    for (var pi = 0; pi < phrases.length && nd === null; pi++) { var pw = phrases[pi].split(' '), n = pw.length;
      for (var i = 0; i + n <= low.length; i++) { if (free(i, i + n) && low.slice(i, i + n).join(' ') === pw.join(' ')) { nd = syn[phrases[pi]]; for (var k = i; k < i + n; k++) used[k] = true; break; } } }
    // build rule: a second need word left in the line -> two needs (organizer splits it); never folded into the name
    if (nd !== null) for (var pj = 0; pj < phrases.length && !extra; pj++) { var qw = phrases[pj].split(' '), m2 = qw.length;
      for (var j = 0; j + m2 <= low.length; j++) if (free(j, j + m2) && low.slice(j, j + m2).join(' ') === qw.join(' ')) { extra = syn[phrases[pj]]; break; } }
    var wd = null, num = null, mon = null;
    low.forEach(function (l, i) { if (used[i] || lock[i]) return; if (/^\d{1,2}\/\d{1,2}$/.test(l) && num === null) { var p = l.split('/'); mon = +p[0]; num = +p[1]; used[i] = true; return; } if (NUM.test(l) && num === null) { num = parseInt(l, 10); used[i] = true; } });
    var monC = []; low.forEach(function (l, i) { if (used[i] || lock[i]) return; if (l in WDF && wd === null) { wd = WDF[l]; used[i] = true; return; }
      if (l in MONF && [i - 1, i + 1].some(function (j) { return j >= 0 && j < low.length && NUM.test(low[j]); })) monC.push(i); });
    // a month counts only next to the day number; two such months ("May 13 Nov dinner"): the line's first word is the name
    if (monC.length > 1 && monC[0] === 0) monC.shift(); if (monC.length && mon === null) { mon = MONF[low[monC[0]]]; used[monC[0]] = true; }
    var rest = t.map(function (w, i) { return used[i] ? null : w; }).filter(function (w) { return w !== null; });
    var isSep = function (w) { return JOIN[w.toLowerCase()] || w === ','; }, real = rest.filter(function (w) { return !isSep(w); });
    var joined = rest.some(function (w) { return JOIN[w.toLowerCase()]; }) || rest.some(function (w, i) { return w === ',' && rest.slice(0, i).some(function (x) { return !isSep(x); }) && rest.slice(i + 1).some(function (x) { return !isSep(x); }); })
      || (nLock > 0 && t.some(function (w, i) { return i >= nLock && !used[i] && !isSep(w); })) // a name before the colon AND another after it
      // PM C9 (03:48): <name> <space> or|and<Capitalised name> with no space ("Ana orBen", "Ana andBen") is two names. "Anaor Ben",
      // "AnaorBen" and lowercase "Ana orben" stay one helper as typed; Orla, Andrea, Corey, Igor, Leonor never match (needs a name before it).
      || real.some(function (w, i) { return i > 0 && HALF.test(w); });
    return { wd: wd, num: num, mon: mon, need: nd, extra: extra, name: real.join(' '), twoNames: !!joined };
  }
  function needLabel(x) { return typeof x === 'string' ? x : null; }
  // ---- check (proto r1d) ----
  function check(cfg, lines) {
    var days = range(cfg.first, cfg.last) || [], needs = cfg.needs || [], syn = synonyms(needs);
    var needSet = {}, needList = []; days.forEach(function (t) { needs.forEach(function (n) { if (ruleOn(n, t)) { needSet[t + '|' + n.label] = 1; needList.push([t, n.label]); } }); });
    var got = {}, gotOrder = [], issues = [], notneeded = [], dups = [], readas = [], rows = [];
    lines.forEach(function (raw, idx) { if (!String(raw).trim()) return; var line = M.strip(raw), p = parse(line, syn), row = { n: idx + 1, line: line, p: p };
      rows.push(row);
      var need = needLabel(p.need);
      if (p.need === null || !p.name) { row.result = 'couldntRead'; issues.push({ kind: 'couldntRead', line: line }); return; }
      if (p.extra !== null) { row.result = 'toFix'; issues.push({ kind: 'twoNeeds', line: line }); return; }
      if (p.twoNames) { row.result = 'toFix'; issues.push({ kind: 'twoNames', line: line }); return; }
      if (M.len(p.name) > LIM.name) { row.result = 'toFix'; issues.push({ kind: 'nameTooLong', line: line, max: LIM.name }); return; }
      var cand = days.filter(function (t) { return (p.num === null || dayNum(t) === p.num) && (p.mon === null || monNum(t) === p.mon) && (p.wd === null || wday(t) === p.wd); });
      if (p.num !== null && p.wd !== null && !cand.length) { var mm = days.filter(function (t) { return dayNum(t) === p.num && (p.mon === null || monNum(t) === p.mon); });
        if (mm.length) { row.result = 'toFix'; row.day = mm[0]; issues.push({ kind: 'wrongWeekday', line: line, t: mm[0], weekday: WDN[wday(mm[0])], typedWeekday: WDN[p.wd], name: p.name }); return; } }
      if (cand.length !== 1) { if (cand.length) { row.result = 'ambiguous'; issues.push({ kind: 'ambiguous', line: line, n: cand.length }); } else { row.result = 'toFix'; issues.push({ kind: 'noDay', line: line }); } return; }
      var d = cand[0]; row.day = d; row.need = need || FIXED_LABEL(p.need); row.name = p.name;
      var r = { line: line, t: d, need: row.need, name: p.name, onlyWeekday: p.num === null && p.wd !== null ? WDN[p.wd] : null }; readas.push(r);
      if (need === null || !needSet[d + '|' + need]) { row.result = 'notNeeded'; notneeded.push(r); return; }
      var key = d + '|' + need, lst = got[key] || (got[key] = [], gotOrder.push(key), got[key]);
      if (lst.some(function (x) { return x.toLowerCase() === p.name.toLowerCase(); })) { row.result = 'duplicate'; dups.push(r); return; }
      lst.push(p.name); row.result = 'placed'; row.key = key; });
    rows.forEach(function (row) { if (row.result === 'placed' && got[row.key].length > 1) row.result = 'double'; });
    var gaps = needList.filter(function (k) { return !got[k[0] + '|' + k[1]]; });
    var dbl = needList.filter(function (k) { var g = got[k[0] + '|' + k[1]]; return g && g.length > 1; }).map(function (k) { return { t: k[0], need: k[1], names: got[k[0] + '|' + k[1]] }; });
    var covered = needList.filter(function (k) { return got[k[0] + '|' + k[1]]; }).length;
    // per helper (first-seen order), their placed need-days in day order
    var helpers = [], hk = {}; rows.forEach(function (row) { if ((row.result === 'placed' || row.result === 'double') && !hk[row.name.toLowerCase()]) { hk[row.name.toLowerCase()] = { name: row.name, items: [] }; helpers.push(hk[row.name.toLowerCase()]); } });
    needList.forEach(function (k) { (got[k[0] + '|' + k[1]] || []).forEach(function (nm) { var h = hk[nm.toLowerCase()]; if (h) h.items.push({ t: k[0], need: k[1] }); }); });
    return { days: days, needs: needs, needList: needList, needSet: needSet, got: got, gaps: gaps, dbl: dbl, covered: covered, issues: issues, notneeded: notneeded, dups: dups, readas: readas, rows: rows, helpers: helpers };
  }
  function FIXED_LABEL(x) { return x && x.off ? { dinner: 'Dinner', ride: 'Ride', walk: 'Dog walk' }[x.off] : String(x); }
  function tally(r) { return { needed: r.needList.length, covered: r.covered, gaps: r.gaps.length, double: r.dbl.length, toFix: r.issues.length, notNeeded: r.notneeded.length, duplicate: r.dups.length }; }
  function summary(r) { var t = tally(r); return t.needed + ' needed · ' + t.covered + ' covered · ' + t.gaps + ' gaps · ' + t.double + ' double · ' + t.toFix + ' to fix · ' + t.notNeeded + ' not needed · ' + t.duplicate + ' duplicate lines'; }
  // ---- stamp: date, time and the device zone label ("Fri Oct 16, 10:04 PM PDT") ----
  function stampTime(now, tz) { var o = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }; if (tz) o.timeZone = tz;
    var p = {}; new Intl.DateTimeFormat('en-US', o).formatToParts(new Date(now)).forEach(function (x) { p[x.type] = x.value; });
    return p.weekday + ' ' + p.month + ' ' + p.day + ', ' + p.hour + ':' + p.minute + ' ' + p.dayPeriod + ' ' + p.timeZoneName; }
  // ---- outputs (C = Writer COPY) ----
  // PM (Left or Right ruling, 02:34): typed names stay quoted everywhere, copy text included. Writer's v2 templates stay
  // verbatim; only the substituted typed values (helper names, who it's for, organizer, an "Other" need label) get the
  // shared quote rule (core MILL.quote: typed “ ” „ ‟ « » shown as " inside the frame). Notes are framed by the template.
  var Q = function (s) { return M.raw(M.quote(M.strip(s))); };
  function needOf(cfg, label) { var n = (cfg.needs || []).find(function (x) { return x.label === label; }); return n && n.key === 'other' ? M.quote(label) : label; }
  function stampText(C, r, cfg) { return M.fill(C.stamp, { datetime: r.stamp, org: Q(cfg.org) }); }
  function stillOpen(C, r, cfg) { var st = stampText(C, r, cfg);
    if (!r.gaps.length) return M.fill(C.stillOpenNone, { for: Q(cfg.forName), stamp: M.raw(st) });
    return M.fill(C.stillOpenText, { for: Q(cfg.forName), org: Q(cfg.org), lines: M.raw(r.gaps.map(function (k) { return M.fill(C.stillOpenLine, { date: d2(k[0]), need: M.raw(needOf(cfg, k[1])) }); }).join('\n')), stamp: M.raw(st) }); }
  function handoff(C, r, cfg, h) { var o = Q(cfg.org), by = {}, order = []; h.items.forEach(function (it) { if (!by[it.t]) { by[it.t] = []; order.push(it.t); } if (by[it.t].indexOf(it.need) < 0) by[it.t].push(it.need); });
    order.sort(function (a, b) { return a - b; });
    var mine = {}; h.items.forEach(function (it) { mine[it.need] = 1; });
    var notes = ''; (cfg.needs || []).forEach(function (n) { var note = M.strip(n.note || ''); if (note && mine[n.label]) notes += M.fill(C.handoffNoteLine, { need: M.raw(needOf(cfg, n.label)), org: o, note: note }); });
    var ev = M.strip(cfg.noteAll || ''); if (ev) notes += M.fill(C.handoffEveryoneNoteLine, { org: o, note: ev });
    return M.fill(C.handoffText, { name: Q(h.name), for: Q(cfg.forName), org: o, dayLines: M.raw(order.map(function (t) { return M.fill(C.handoffDayLine, { date: d2(t), needs: M.raw(by[t].map(function (x) { return needOf(cfg, x); }).join(' + ')) }); }).join('\n')), noteLines: M.raw(notes), stamp: M.raw(stampText(C, r, cfg)) }); }
  // household sheet: per day, each helper with their needs (or nothing planned)
  function sheet(r) { return r.days.map(function (t) { var who = [], wk = {}; r.needs.forEach(function (n) { (r.got[t + '|' + n.label] || []).forEach(function (nm) { var k = nm.toLowerCase(); if (!wk[k]) { wk[k] = { name: nm, needs: [] }; who.push(wk[k]); } wk[k].needs.push(n.label); }); }); return { t: t, who: who }; }); }
  // head.std(label) -> true for Writer's own need names (Dinner / Ride / Dog walk); anything else was typed and is quoted
  function sheetText(C, s, head) { var std = head.std || function () { return true; }, nl = function (n) { return std(n) ? n : M.quote(n); };
    var lines = [M.fill(C.sheetHeading, { for: Q(head.forName) }), M.fill(C.sheetRange, { first: d2(parseISO(head.first)), last: d2(parseISO(head.last)) })];
    s.forEach(function (d) { lines.push(d2(d.t) + ': ' + (d.who.length ? d.who.map(function (w) { return M.fill(C.sheetLine, { name: Q(w.name), needs: M.raw(w.needs.map(nl).join(' + ')) }); }).join(' · ') : C.sheetNothing)); });
    lines.push(M.fill(C.stamp, { datetime: head.stamp, org: Q(head.org) })); lines.push(M.fill(C.sheetChangeNote, { org: Q(head.org) })); return lines.join('\n'); }
  // ---- optional household-sheet link "#cr2.<b64url JSON>.<ck>": the sheet only (for, org, days, names + needs, stamp). No notes, no plan. ----
  var TAG = 'cr', VER = 2;
  function encodeSheet(r, cfg) { var o = { f: M.strip(cfg.forName), o: M.strip(cfg.org), a: cfg.first, b: cfg.last, s: r.stamp, d: sheet(r).map(function (d) { return d.who.map(function (w) { return [w.name, w.needs]; }); }) };
    var head = TAG + VER + '.' + M.b64e(JSON.stringify(o)); return head + '.' + M.ck(head); }
  function decodeSheet(frag) { var f = String(frag == null ? '' : frag).replace(/^#/, ''); if (!f) return { ok: false, why: 'empty' }; if (f.length > LIM.url) return { ok: false, why: 'bad' };
    var m = /^([a-z]{2})(\d{1,3})\.([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f); if (!m || M.ck(m[1] + m[2] + '.' + m[3]) !== m[4] || m[1] !== TAG) return { ok: false, why: 'bad' }; if (+m[2] !== VER) return { ok: false, why: 'oldVersion' };
    var o; try { o = JSON.parse(M.b64d(m[3])); } catch (e) { return { ok: false, why: 'bad' }; }
    var s = function (x, max) { return typeof x === 'string' && M.len(x) <= max && M.strip(x) === x; };
    if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).sort().join() !== 'a,b,d,f,o,s' || !s(o.f, LIM.forName) || !o.f || !s(o.o, LIM.org) || !o.o || !s(o.s, 60) || !o.s) return { ok: false, why: 'bad' };
    var days = range(o.a, o.b); if (!days || days.length > LIM.days || !Array.isArray(o.d) || o.d.length !== days.length) return { ok: false, why: 'bad' };
    for (var i = 0; i < o.d.length; i++) { if (!Array.isArray(o.d[i]) || o.d[i].length > LIM.lines) return { ok: false, why: 'bad' };
      for (var j = 0; j < o.d[i].length; j++) { var w = o.d[i][j]; if (!Array.isArray(w) || w.length !== 2 || !s(w[0], LIM.name) || !w[0] || !Array.isArray(w[1]) || !w[1].length || w[1].length > LIM.needs || !w[1].every(function (x) { return s(x, LIM.other) && x; })) return { ok: false, why: 'bad' }; } }
    return { ok: true, data: { forName: o.f, org: o.o, first: o.a, last: o.b, stamp: o.s, sheet: days.map(function (t, i) { return { t: t, who: o.d[i].map(function (w) { return { name: w[0], needs: w[1] }; }) }; }) } }; }
  // ---- validation of the form ----
  function errors(cfg, lines) { var e = []; var fl = M.len(M.strip(cfg.forName)), ol = M.len(M.strip(cfg.org));
    if (!fl) e.push({ f: 'for', code: 'forEmpty' }); else if (fl > LIM.forName) e.push({ f: 'for', code: 'forTooLong', n: fl - LIM.forName });
    if (!ol) e.push({ f: 'org', code: 'orgEmpty' }); else if (ol > LIM.org) e.push({ f: 'org', code: 'orgTooLong', n: ol - LIM.org });
    var a = parseISO(cfg.first), b = parseISO(cfg.last); if (a == null || b == null) e.push({ f: 'first', code: 'dateMissing' }); else if (b < a) e.push({ f: 'last', code: 'dateOrder' }); else if ((b - a) / DAY + 1 > LIM.days) e.push({ f: 'last', code: 'tooManyDays' });
    var needs = cfg.needs || []; if (needs.length > LIM.needs) e.push({ f: 'needs', code: 'tooManyNeeds' });
    var days = range(cfg.first, cfg.last);
    needs.forEach(function (n) { if (n.key === 'other') { var l = M.len(M.strip(n.label)); if (!l) e.push({ f: 'need-other', code: 'otherEmpty' }); else if (l > LIM.other) e.push({ f: 'need-other', code: 'otherTooLong', n: l - LIM.other }); }
      var nl = M.len(M.strip(n.note || '')); if (nl > LIM.notes) e.push({ f: 'note-' + n.key, code: 'notesTooLong', n: nl - LIM.notes });
      if (days && days.length <= LIM.days && !days.some(function (t) { return ruleOn(n, t); })) e.push({ f: 'need-' + n.key, code: 'needNoDays', need: n.label }); });
    var al = M.len(M.strip(cfg.noteAll || '')); if (al > LIM.notes) e.push({ f: 'note-all', code: 'notesTooLong', n: al - LIM.notes });
    var nonEmpty = lines.filter(function (l) { return String(l).trim(); }); if (!nonEmpty.length) e.push({ f: 'plan', code: 'planEmpty' }); else if (nonEmpty.length > LIM.lines) e.push({ f: 'plan', code: 'planTooManyLines' });
    return e; }
  return { LIM: LIM, WDN: WDN, WDS: WDS, parseISO: parseISO, iso: iso, wday: wday, d2: d2, range: range, ruleOn: ruleOn, synonyms: synonyms, parse: parse, check: check, tally: tally, summary: summary, stampTime: stampTime, stampText: stampText, stillOpen: stillOpen, handoff: handoff, sheet: sheet, sheetText: sheetText, encodeSheet: encodeSheet, decodeSheet: decodeSheet, errors: errors };
});
