// Two Versions — review skeleton. All visible strings live in COPY (placeholder; Writing Bot owns words).
// Rendering uses textContent only. Tokens live in the URL fragment (#i= / #r=), never sent as URL path/query.
'use strict';
const LIMITS = { MOMENT_MAX_BYTES: 200, ACCOUNT_MAX_BYTES: 4000, TTL_DAYS: 7 };
const COPY = {
  // Locked v1 strings from Writing Bot (VISITOR-COPY.md). Swap here only.
  title: 'Two Versions',
  intro: 'Remember the same moment. See what each of you kept.',
  how: 'You write your version. They write theirs without seeing yours. Then you both see both.',
  expiryEntry: 'Everything is deleted 7 days after you submit.',
  start: 'Start',
  momentLabel: 'The moment', momentHint: 'One shared memory. A trip, a first meeting, a dinner.', momentPh: 'The night the power went out',
  yourLabel: 'Your version', yourHint: "Write what you remember. They won't see it until they've written theirs.",
  left: (n) => `${n} left`, over: "That's over the limit. Trim it a little.",
  senderSubmit: 'Submit and get the link', noEdit: "You can't edit after you submit.",
  sentHeading: 'Now send it.', inviteLabel: 'Their link', inviteHint: 'Send this to the person who was there.',
  share: 'Share link', copy: 'Copy link', returnLabel: 'Your link',
  returnHint: "Save this one now. It's how you get back to see both versions, and it can't be recovered if you lose it.",
  returnCopy: 'Copy your link', leaveWarn: "Without your link, you can't get back here.",
  linkWarn: 'Anyone with this link can see what it opens. Keep it to yourself.',
  missingReturn: "Your link is the only way back. Without it, this exchange can't be opened from your side.",
  copied: 'Link copied.', copyFail: "Couldn't copy. The link is selected.", shareCancel: 'Not sent. The link is still here.',
  shareErr: "Couldn't share from here. Copy the link instead.", shared: "Shared. They'll see it when they open it.",
  shareText: 'Someone wants your version of a moment.',
  waitHeading: 'Waiting for their version.', waitBody: 'Nothing shows up here until they submit. Check back, or refresh.',
  refresh: 'Refresh', inviteAgain: 'Copy their link again', notYet: 'Not yet.',
  waitDeleted: (d) => `Deleted on ${d}.`,
  recHeading: 'Someone wants your version.', recBody: "Write what you remember. You'll see theirs after you submit.",
  recDeleted: (d) => `Everything here is deleted on ${d}.`,
  recConfirm: 'Submitting locks both versions and shows you theirs.', recSubmit: 'Submit and see both', saving: 'Saving…',
  revealHeading: 'Two versions.', yours: 'Yours', theirs: 'Theirs', revealDeleted: (d) => `Both versions are deleted on ${d}.`,
  startOwn: 'Start one of your own',
  invalidHeading: "This link doesn't open anything.", invalidBody: 'It may be incomplete, or the exchange was deleted after 7 days.',
  saveFailed: "Didn't save. Your writing is still here.", tryAgain: 'Try again',
  netDrop: 'Lost the connection. Your writing is still here. Try again.', saved: 'Saved.',
  already: 'This version was already submitted.', seeBoth: 'See both', tooMany: 'Too many tries. Wait a minute and try again.',
  unknown: 'Something went wrong. Your writing is still here. Try again.',
  aboutLabel: 'How this works',
  about: "Your moment and both versions are stored on our server so the other person can read them. Neither of you sees the other's version until both are in. Everything is deleted 7 days after the sender submits, whether or not the other person has written theirs. Anyone holding a link can open what it opens, and lost links can't be recovered. While you write, a draft is kept in this browser until you submit.",
};

const app = document.getElementById('app');
const enc = new TextEncoder();
const bytes = (s) => enc.encode(s).length;
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') n.textContent = v; else if (k === 'on') for (const [e, f] of Object.entries(v)) n.addEventListener(e, f);
    else if (k in n) n[k] = v; else n.setAttribute(k, v);
  }
  for (const c of kids) if (c) n.append(c);
  return n;
}
const render = (...nodes) => { app.replaceChildren(...nodes); const h = app.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus(); } };
const fmtDate = (sec) => new Date(sec * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const base = () => location.origin + '/two-versions/';
function newSecret() { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

async function api(path, body) {
  let res;
  try {
    res = await fetch('/two-versions/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch { return { ok: false, error: 'network' }; }
  let data = null; try { data = await res.json(); } catch {}
  return data || { ok: false, error: res.status === 429 ? 'rate_limited' : 'server' };
}
function errText(e) {
  return { network: COPY.netDrop, rate_limited: COPY.tooMany, server: COPY.saveFailed }[e] || (/too_long|too_large/.test(e) ? COPY.over : COPY.unknown);
}

function field(label, hint, max, value, multi, ph, onInput) {
  const id = 'f' + Math.random().toString(36).slice(2);
  const input = multi ? el('textarea', { id, value }) : el('input', { id, type: 'text', value });
  if (ph) input.placeholder = ph;
  const count = el('p', { className: 'small', 'aria-live': 'polite' });
  const upd = () => { const left = max - bytes(input.value); count.textContent = left < 0 ? COPY.over : COPY.left(left); count.className = 'small' + (left < 0 ? ' over' : ''); onInput && onInput(); };
  input.addEventListener('input', upd); upd();
  return { node: el('div', {}, el('label', { htmlFor: id, text: label }), hint ? el('p', { className: 'hint', text: hint }) : null, input, count), input, ok: () => input.value.trim() && bytes(input.value) <= max, empty: () => !input.value.trim() };
}
function linkBlock(label, hint, url, copyLabel, withShare, status) {
  const box = el('p', { className: 'linkbox', text: url });
  const copyBtn = el('button', { className: 'secondary', text: copyLabel, on: { click: async () => {
    try { await navigator.clipboard.writeText(url); status.textContent = COPY.copied; }
    catch { const r = document.createRange(); r.selectNodeContents(box); getSelection().removeAllRanges(); getSelection().addRange(r); status.textContent = COPY.copyFail; }
  } } });
  const shareBtn = withShare && navigator.share ? el('button', { text: COPY.share, on: { click: async () => {
    try { await navigator.share({ title: COPY.title, text: COPY.shareText, url }); status.textContent = COPY.shared; }
    catch (e) { status.textContent = e && e.name === 'AbortError' ? COPY.shareCancel : COPY.shareErr; }
  } } }) : null;
  return el('section', {}, el('h2', { text: label }), el('p', { className: 'hint', text: hint }), box, shareBtn, copyBtn);
}

const about = () => el('details', {}, el('summary', { text: COPY.aboutLabel }), el('p', { className: 'small', text: COPY.about }));
let leaveGuard = false;
window.addEventListener('beforeunload', (e) => { if (leaveGuard) { e.preventDefault(); e.returnValue = ''; } });
// Invite link is kept in the sender's own browser (client only) so the waiting screen can offer it again.
const inviteKey = (ret) => 'tv-invite-' + ret.slice(0, 10);

// ---- Sender
function senderEntry() {
  leaveGuard = false;
  if (store.get('tv-sender-draft')) return senderStart();
  render(el('h1', { text: COPY.title }), el('p', { text: COPY.intro }), el('p', { text: COPY.how }), el('p', { className: 'small', text: COPY.expiryEntry }),
    el('button', { text: COPY.start, on: { click: senderStart } }), about());
}
function senderStart() {
  const KEY = 'tv-sender-draft';
  const d = store.get(KEY) || { moment: '', account: '', secret: newSecret() };
  if (!d.secret) d.secret = newSecret();
  const save = () => store.set(KEY, { moment: mf.input.value, account: af.input.value, secret: d.secret });
  const mf = field(COPY.momentLabel, COPY.momentHint, LIMITS.MOMENT_MAX_BYTES, d.moment, false, COPY.momentPh, save);
  const af = field(COPY.yourLabel, COPY.yourHint, LIMITS.ACCOUNT_MAX_BYTES, d.account, true, '', save);
  save();
  const status = el('p', { className: 'status', role: 'status' });
  let failed = false;
  const btn = el('button', { text: COPY.senderSubmit, on: { click: async () => {
    if (!mf.ok() || !af.ok()) { (mf.ok() ? af : mf).input.focus(); return; }
    btn.disabled = true; status.textContent = COPY.saving;
    const r = await api('create', { secret: d.secret, moment: mf.input.value, account: af.input.value });
    btn.disabled = false;
    if (!r.ok) { status.textContent = errText(r.error); btn.textContent = COPY.tryAgain; failed = true; return; } // text stays in field + localStorage
    store.del(KEY);
    store.set(inviteKey(r.ret), { invite: r.invite });
    senderLinks(r.invite, r.ret, r.already_submitted ? COPY.already : failed ? COPY.saved : '');
  } } });
  render(el('h1', { text: COPY.title }), el('p', { className: 'small', text: COPY.expiryEntry }),
    mf.node, af.node, el('p', { className: 'small', text: COPY.noEdit }), btn, status, about());
}
function senderLinks(invite, ret, note) {
  leaveGuard = true; // browser's own "leave site?" prompt; inline warning below carries the words
  const status = el('p', { className: 'status', role: 'status', text: note || '' });
  render(el('h1', { text: COPY.sentHeading }), status,
    linkBlock(COPY.inviteLabel, COPY.inviteHint, base() + '#i=' + invite, COPY.copy, true, status),
    linkBlock(COPY.returnLabel, COPY.returnHint, base() + '#r=' + ret, COPY.returnCopy, false, status),
    el('p', { className: 'small', text: COPY.linkWarn }),
    el('p', { className: 'small', text: COPY.leaveWarn }), el('p', { className: 'small', text: COPY.missingReturn }), about());
}

// ---- Token views
function failure(heading, body) {
  render(el('h1', { text: heading }), el('p', { text: body }), el('button', { text: COPY.startOwn, on: { click: () => { leaveGuard = false; location.hash = ''; senderEntry(); } } }));
}
function handleErr(r, status) {
  if (r.error === 'invalid' || r.error === 'expired') return failure(COPY.invalidHeading, COPY.invalidBody);
  if (status) status.textContent = errText(r.error); else failure(COPY.title, errText(r.error));
}
function reveal(v) {
  render(el('h1', { text: COPY.revealHeading }), el('p', { className: 'moment', text: v.moment }),
    el('div', { className: 'pair' },
      el('article', { className: 'account' }, el('h2', { text: COPY.yours }), el('div', { text: v.yours })),
      el('article', { className: 'account' }, el('h2', { text: COPY.theirs }), el('div', { text: v.theirs }))),
    el('p', { className: 'small', text: COPY.revealDeleted(fmtDate(v.expires_at)) }),
    el('button', { text: COPY.startOwn, on: { click: () => { leaveGuard = false; location.hash = ''; senderEntry(); } } }));
}
async function returnView(token, again) {
  const r = await api('read', { token });
  if (!r.ok) return handleErr(r);
  if (r.both_submitted) return reveal(r);
  const status = el('p', { className: 'status', role: 'status', text: again ? COPY.notYet : '' });
  const inv = store.get(inviteKey(token));
  const again2 = inv && inv.invite ? el('button', { className: 'secondary', text: COPY.inviteAgain, on: { click: async () => {
    const url = base() + '#i=' + inv.invite;
    try { await navigator.clipboard.writeText(url); status.textContent = COPY.copied; } catch { status.textContent = COPY.copyFail; status.append(el('p', { className: 'linkbox', text: url })); }
  } } }) : null;
  render(el('h1', { text: COPY.waitHeading }), el('p', { className: 'moment', text: r.moment }), el('p', { text: COPY.waitBody }),
    el('button', { text: COPY.refresh, on: { click: () => returnView(token, true) } }), again2, status,
    el('p', { className: 'small', text: COPY.waitDeleted(fmtDate(r.expires_at)) }), about());
}
async function inviteView(token) {
  const r = await api('read', { token });
  if (!r.ok) return handleErr(r);
  if (r.both_submitted) return reveal(r);
  const KEY = 'tv-rdraft-' + token.slice(0, 10);
  const af = field(COPY.yourLabel, '', LIMITS.ACCOUNT_MAX_BYTES, (store.get(KEY) || {}).account || '', true, '', () => store.set(KEY, { account: af.input.value }));
  const status = el('p', { className: 'status', role: 'status' });
  const btn = el('button', { text: COPY.recSubmit, on: { click: async () => {
    if (!af.ok()) { af.input.focus(); return; }
    btn.disabled = true; status.textContent = COPY.saving;
    const s = await api('respond', { token, account: af.input.value });
    btn.disabled = false;
    if (!s.ok) { btn.textContent = COPY.tryAgain; return handleErr(s, status); } // writing stays in the field and localStorage
    store.del(KEY);
    if (s.already_submitted) return render(el('h1', { text: COPY.title }), el('p', { text: COPY.already }), el('button', { text: COPY.seeBoth, on: { click: () => reveal(s) } }));
    reveal(s);
  } } });
  render(el('h1', { text: COPY.recHeading }), el('p', { className: 'moment', text: r.moment }), el('p', { text: COPY.recBody }),
    el('p', { className: 'small', text: COPY.recDeleted(fmtDate(r.expires_at)) }), af.node, el('p', { className: 'small', text: COPY.recConfirm }), btn, status, about());
}

function route() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('i')) return inviteView(p.get('i'));
  if (p.get('r')) return returnView(p.get('r'));
  senderEntry();
}
window.addEventListener('hashchange', route);
route();
