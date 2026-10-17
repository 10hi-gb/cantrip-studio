'use strict';
// Five Hands narrow r1c core: port of Creative's proto five_hands_alloc.py r1d validate()/suggest()/check(). Pure: no DOM,
// no storage, no network. Whole minutes only. validate(): tasks 1..480 min (> 0), helpers 0..480 min, 1..12 tasks,
// 1..5 helpers, names non-empty, within caps and unique (case-insensitive). suggest() AND check() both refuse invalid input
// (the reference Check accepted -10; that bug is not ported). Conservation (given out + bench = work) is checked on every result.
(function (root, factory) { var m = factory(root.MILL || (typeof require === 'function' ? require('../shared/core.js') : null)); if (typeof module === 'object' && module.exports) module.exports = m; else root.FH = m; })(this, function (M) {
  var LIM = { tasks: 12, helpers: 5, taskMin: 1, helperMin: 0, maxMin: 480, task: 40, helper: 24, title: 60, frag: 1000 };
  function whole(m, lo) { return typeof m === 'number' && Number.isInteger(m) && m >= lo && m <= LIM.maxMin; }
  // UI text -> minutes: digits only ("45"); anything else (−10, 2.5, 1e2, "") -> NaN so validate() reports it
  function minutes(s) { var t = String(s == null ? '' : s).trim(); return /^\d{1,4}$/.test(t) ? parseInt(t, 10) : NaN; }
  // -> [{f:'task'|'helper'|'tasks'|'helpers'|'title', i, code, n?, name?}]
  function validate(helpers, tasks, title) { var e = [];
    if (title !== undefined) { var tl = M.len(M.strip(title)); if (!tl) e.push({ f: 'title', code: 'sessionEmpty' }); else if (tl > LIM.title) e.push({ f: 'title', code: 'sessionTooLong', n: tl - LIM.title }); }
    if (!Array.isArray(tasks) || tasks.length < 1) e.push({ f: 'tasks', code: 'taskEmpty', i: 0 }); else if (tasks.length > LIM.tasks) e.push({ f: 'tasks', code: 'tooManyTasks' });
    if (!Array.isArray(helpers) || helpers.length < 1) e.push({ f: 'helpers', code: 'helperEmpty', i: 0 }); else if (helpers.length > LIM.helpers) e.push({ f: 'helpers', code: 'tooManyHelpers' });
    (tasks || []).forEach(function (t, i) { var n = M.len(M.strip(t.name)); if (!n) e.push({ f: 'task', i: i, code: 'taskEmpty' }); else if (n > LIM.task) e.push({ f: 'task', i: i, code: 'taskTooLong', n: n - LIM.task });
      if (!whole(t.min, LIM.taskMin)) e.push({ f: 'taskMin', i: i, code: 'taskMinutesInvalid' }); });
    (helpers || []).forEach(function (h, i) { var n = M.len(M.strip(h.name)); if (!n) e.push({ f: 'helper', i: i, code: 'helperEmpty' }); else if (n > LIM.helper) e.push({ f: 'helper', i: i, code: 'helperTooLong', n: n - LIM.helper });
      if (!whole(h.min, LIM.helperMin)) e.push({ f: 'helperMin', i: i, code: 'helperMinutesInvalid' }); });
    [['task', tasks || [], 'taskDuplicate'], ['helper', helpers || [], 'helperDuplicate']].forEach(function (k) { var seen = {};
      k[1].forEach(function (x, i) { var low = M.strip(x.name).toLowerCase(); if (!low) return; if (low in seen) e.push({ f: k[0], i: i, code: k[2], name: M.strip(k[1][seen[low]].name) }); else seen[low] = i; }); });
    return e; }
  function guard(helpers, tasks) { var e = validate(helpers, tasks); if (e.length) { var err = new Error('invalid: ' + e.map(function (x) { return x.code; }).join(',')); err.errors = e; throw err; } }
  // Suggest (proto r1d): tasks by minutes desc (ties: input order); each to the helper with the most minutes left who can fit
  // it whole (ties: input order); 0-minute helpers get nothing; unfitted -> bench. Returns assign[i] = helper index or -1.
  function suggest(helpers, tasks) { guard(helpers, tasks);
    var rem = helpers.map(function (h) { return h.min; }), assign = tasks.map(function () { return -1; });
    tasks.map(function (t, i) { return i; }).sort(function (a, b) { return tasks[b].min - tasks[a].min || a - b; }).forEach(function (i) { var m = tasks[i].min, best = -1;
      helpers.forEach(function (h, j) { if (h.min > 0 && rem[j] >= m && (best < 0 || rem[j] > rem[best])) best = j; });
      if (best >= 0) { assign[i] = best; rem[best] -= m; } });
    return result(helpers, tasks, assign, 'suggest'); }
  // Check (proto r1d sums only, never moves anything) — validates first, and validates the assignment itself.
  function check(helpers, assign, tasks) { guard(helpers, tasks);
    if (!Array.isArray(assign) || assign.length !== tasks.length || !assign.every(function (a) { return Number.isInteger(a) && a >= -1 && a < helpers.length; })) { var err = new Error('invalid: assign'); err.errors = [{ f: 'assign', code: 'assign' }]; throw err; }
    return result(helpers, tasks, assign, 'check'); }
  function result(helpers, tasks, assign, mode) {
    var rows = helpers.map(function (h) { return { name: h.name, cap: h.min, load: 0, items: [] }; }), bench = [];
    tasks.forEach(function (t, i) { var a = assign[i]; if (a >= 0) { rows[a].items.push({ name: t.name, min: t.min, i: i }); rows[a].load += t.min; } else bench.push({ name: t.name, min: t.min, i: i }); });
    if (mode === 'suggest') { var byRule = function (a, b) { return b.min - a.min || a.i - b.i; }; rows.forEach(function (r) { r.items.sort(byRule); }); bench.sort(byRule); } // proto order: as the rule placed them
    rows.forEach(function (r) { r.over = Math.max(0, r.load - r.cap); r.spare = Math.max(0, r.cap - r.load);
      var at = 0; r.items.forEach(function (it) { var end = at + it.min, past = Math.max(0, end - Math.max(at, r.cap)); it.overMin = Math.min(it.min, past); at = end; }); });
    var work = tasks.reduce(function (s, t) { return s + t.min; }, 0), avail = helpers.reduce(function (s, h) { return s + h.min; }, 0);
    var given = rows.reduce(function (s, r) { return s + r.load; }, 0), benchMin = bench.reduce(function (s, t) { return s + t.min; }, 0);
    var spares = rows.filter(function (r) { return r.cap > 0 && r.spare > 0; });
    var noneFits = bench.length > 0 && spares.length > 0 && bench.every(function (t) { return spares.every(function (r) { return r.spare < t.min; }); });
    var sc = Math.max(1, Math.max.apply(null, rows.map(function (r) { return Math.max(r.cap, r.load); })));
    return { mode: mode, assign: assign.slice(), rows: rows, bench: bench, work: work, available: avail, given: given, benchMin: benchMin, conserved: given + benchMin === work, over: rows.filter(function (r) { return r.over > 0; }), spares: spares, benchExplain: noneFits, scale: sc }; }
  // ---- text outputs (C = Writer COPY). PM: typed names (helpers, tasks, session title) quoted everywhere; Writer's
  // templates verbatim — values in “{x}” slots are framed by the template (fill() neutralises their marks), others get M.quote.
  var Q = function (s) { return M.raw(M.quote(M.strip(s))); };
  function cardText(C, title, r) { if (!r.items.length && r.cap === 0) return M.fill(C.cardTextNoTasks, { name: Q(r.name), title: M.strip(title) });
    var t = M.fill(C.cardText, { name: Q(r.name), title: M.strip(title), taskLines: M.raw(r.items.map(function (it) { return M.fill(C.cardTaskLine, { task: M.strip(it.name), m: it.min }); }).join('\n')), load: r.load, cap: r.cap });
    return r.items.length ? t : t.replace(':\n\n=', ':\n='); } // copy gap: no Writer string for "minutes but no task"; drop the empty task-lines line
  function benchText(C, title, res) { return M.fill(C.benchText, { title: M.strip(title), lines: M.raw(res.bench.map(function (t) { return M.fill(C.benchLine, { task: M.strip(t.name), m: t.min }); }).join('\n')), stamp: C.stamp }); }
  // ---- optional sheet link "#fh1.<b64url JSON>.<ck>": title, task names + minutes, first names + minutes, who does what, mode. Nothing else.
  var TAG = 'fh', VER = 1;
  function encode(title, helpers, tasks, res) { var o = { t: M.strip(title), h: helpers.map(function (h) { return [M.strip(h.name), h.min]; }), k: tasks.map(function (t) { return [M.strip(t.name), t.min]; }), a: res.assign, m: res.mode === 'check' ? 'c' : 's' };
    var head = TAG + VER + '.' + M.b64e(JSON.stringify(o)); return head + '.' + M.ck(head); }
  function decode(frag) { var f = String(frag == null ? '' : frag).replace(/^#/, ''); if (!f) return { ok: false, why: 'empty' }; if (f.length > LIM.frag) return { ok: false, why: 'bad' };
    var m = /^([a-z]{2})(\d{1,3})\.([A-Za-z0-9_-]+)\.([0-9a-f]{6})$/.exec(f); if (!m || m[1] !== TAG || M.ck(m[1] + m[2] + '.' + m[3]) !== m[4]) return { ok: false, why: 'bad' }; if (+m[2] !== VER) return { ok: false, why: 'oldVersion' };
    var o; try { o = JSON.parse(M.b64d(m[3])); } catch (e) { return { ok: false, why: 'bad' }; }
    if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).sort().join() !== 'a,h,k,m,t' || typeof o.t !== 'string' || M.strip(o.t) !== o.t || (o.m !== 's' && o.m !== 'c') || !Array.isArray(o.h) || !Array.isArray(o.k)) return { ok: false, why: 'bad' };
    var pair = function (x) { return Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && M.strip(x[0]) === x[0]; };
    if (!o.h.every(pair) || !o.k.every(pair)) return { ok: false, why: 'bad' };
    var helpers = o.h.map(function (x) { return { name: x[0], min: x[1] }; }), tasks = o.k.map(function (x) { return { name: x[0], min: x[1] }; });
    if (validate(helpers, tasks, o.t).length) return { ok: false, why: 'bad' };
    var res; try { res = check(helpers, o.a, tasks); } catch (e) { return { ok: false, why: 'bad' }; }
    if (o.m === 's') { var s = suggest(helpers, tasks); if (s.assign.join() !== o.a.join()) return { ok: false, why: 'bad' }; res.mode = 'suggest'; }
    return { ok: true, data: { title: o.t, helpers: helpers, tasks: tasks, res: res } }; }
  return { LIM: LIM, minutes: minutes, validate: validate, suggest: suggest, check: check, result: result, cardText: cardText, benchText: benchText, encode: encode, decode: decode };
});
