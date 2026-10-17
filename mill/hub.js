'use strict';
// Mill review hub: renders hub.json (same origin, built into the deploy as JS data — no fetch, connect-src stays 'none').
(function () {
  var D = window.MILL_HUB, $ = function (id) { return document.getElementById(id); };
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function field(dl, k, v) { dl.appendChild(el('dt', null, k)); var dd = el('dd'); if (typeof v === 'string') dd.textContent = v; else dd.appendChild(v); dl.appendChild(dd); return dd; }
  // Self-check is recorded with the piece's git tree id; MILL_BUILD (written at deploy) carries the served tree ids. If they differ, say so.
  function engineer(p) {
    var e = p.engineer; if (!e || typeof e === 'string') return e || 'Not built yet.';
    var t = 'ENGINEER SELF-CHECK on pin ' + e.pin + ' (commit ' + e.commit.slice(0, 8) + '): ' + e.result + ' Not QA.', B = window.MILL_BUILD, slug = (p.path || '').replace(/\/$/, '');
    if (B && B.trees) t += B.trees[slug] === e.tree ? ' Same piece files as this deployed build (commit ' + B.commit.slice(0, 8) + ').' : ' Piece files changed since this check; this build (commit ' + B.commit.slice(0, 8) + ') awaits a fresh self-check.';
    return t;
  }
  if (!D) return;
  $('title').textContent = D.title; $('note').textContent = D.note;
  D.sharedLimits.forEach(function (t) { $('shared').appendChild(el('li', null, t)); });
  D.pieces.forEach(function (p) {
    var li = el('li', 'hub-row'), h = el('h2'), a = el(p.path ? 'a' : 'span', null, p.name); if (p.path) a.href = p.path; h.appendChild(a); h.appendChild(el('span', 'hub-score', p.score)); li.appendChild(h);
    li.appendChild(el('p', 'hub-meta', p.id + ' · Wave ' + p.wave));
    var dl = el('dl');
    var src = el('ul'); if (p.sources.length) p.sources.forEach(function (u) { var l = el('li'), x = el('a', null, u.replace(/^https:\/\/www\.reddit\.com\/r\/ClaudeAI\/comments\/1x2srd4\/[^/]*\/?/, 'r/ClaudeAI 1x2srd4 › ')); x.href = u; x.rel = 'noreferrer noopener'; l.appendChild(x); src.appendChild(l); }); else src.appendChild(el('li', null, 'No direct comment in the source thread.'));
    field(dl, 'Source', src);
    var lim = el('ul'); p.limits.forEach(function (t) { lim.appendChild(el('li', null, t)); }); field(dl, 'Limitations', lim);
    var rv = p.path ? el('a', null, 'Open ' + p.name) : el('span', null, 'Not deployed yet'); if (p.path) rv.href = p.path; field(dl, 'Review link', rv);
    field(dl, 'ENGINEER SELF-CHECK', engineer(p));
    field(dl, 'QA status', p.qa).className = 'hub-qa' + (/passed/i.test(p.qa) ? ' is-pass' : '');
    li.appendChild(dl); $('list').appendChild(li);
  });
})();
