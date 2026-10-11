// Two Versions API core. Tokens travel only in JSON POST bodies (never URLs), and are stored as SHA-256 hashes.
export const LIMITS = {
  MOMENT_MAX_BYTES: 200,
  ACCOUNT_MAX_BYTES: 4000,
  BODY_MAX_BYTES: 12000,
  TTL_SECONDS: 7 * 24 * 3600,               // 7 days from creation, same before and after reveal
  RATE: { create: 5, submit: 10, read: 60 }, // per IP per 60s window
  GLOBAL: { create: 120, submit: 240, read: 1200 }, // all visitors per 60s window (backstop)
};
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export async function derive(secret, label) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode('two-versions:' + label)));
}
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 256-bit base64url
export const bytes = (s) => enc.encode(s).length;
export const now = () => Math.floor(Date.now() / 1000);

export function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
export const err = (status, code, extra = {}) => json(status, { ok: false, error: code, ...extra });

export async function readBody(request) {
  if (request.method !== 'POST') return { error: err(405, 'method') };
  const len = Number(request.headers.get('content-length') || '0');
  if (len > LIMITS.BODY_MAX_BYTES) return { error: err(413, 'too_large') };
  const buf = await request.arrayBuffer();
  if (buf.byteLength > LIMITS.BODY_MAX_BYTES) return { error: err(413, 'too_large') };
  try {
    const b = JSON.parse(new TextDecoder().decode(buf));
    if (!b || typeof b !== 'object') throw 0;
    return { body: b };
  } catch { return { error: err(400, 'bad_json') }; }
}

export function cleanText(v, max) {
  if (typeof v !== 'string') return { error: 'missing' };
  const t = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (!t) return { error: 'empty' };
  if (bytes(t) > max) return { error: 'too_long', max_bytes: max };
  return { text: t };
}

// Real cleanup: delete expired exchanges and rate rows on access (bounded batch).
export async function sweep(db) {
  const t = now();
  await db.batch([
    db.prepare('DELETE FROM tv_exchange WHERE id IN (SELECT id FROM tv_exchange WHERE expires_at <= ? LIMIT 200)').bind(t),
    db.prepare('DELETE FROM tv_rate WHERE k IN (SELECT k FROM tv_rate WHERE expires_at <= ? LIMIT 500)').bind(t),
  ]);
}

// Fixed-window rate limit keyed by a hash of IP + kind + minute (raw IP is never stored).
export async function rateLimited(ctx, kind) {
  const ip = ctx.request.headers.get('cf-connecting-ip') || 'unknown';
  const win = Math.floor(Date.now() / 60000);
  const k = await sha256(`tv-rate|${kind}|${win}|${ip}`);
  const g = `global|${kind}|${win}`;
  const sql = 'INSERT INTO tv_rate (k, n, expires_at) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n';
  const db = ctx.env.TV_DB;
  const [a, b] = await db.batch([db.prepare(sql).bind(k, (win + 2) * 60), db.prepare(sql).bind(g, (win + 2) * 60)]);
  const n1 = a.results?.[0]?.n || 0, n2 = b.results?.[0]?.n || 0;
  return n1 > LIMITS.RATE[kind] || n2 > LIMITS.GLOBAL[kind];
}
export const tooMany = () => new Response(JSON.stringify({ ok: false, error: 'rate_limited', retry_after: 60 }), {
  status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60', 'cache-control': 'no-store' },
});

export async function wrap(ctx, kind, fn) {
  try {
    if (!ctx.env.TV_DB) return err(503, 'unavailable');
    const { body, error } = await readBody(ctx.request);
    if (error) return error;
    if (await rateLimited(ctx, kind)) return tooMany();
    ctx.waitUntil(sweep(ctx.env.TV_DB).catch(() => {}));
    return await fn(body);
  } catch (e) {
    console.log('tv api error', kind, e && e.name); // never log bodies, tokens or text
    return err(500, 'server');
  }
}

// Build the view a given role may see. Counterpart text only when both are in.
export function view(row, role) {
  const both = row.recipient_text != null;
  const v = { ok: true, role, moment: row.moment, both_submitted: both, expires_at: row.expires_at, created_at: row.created_at };
  if (role === 'sender') {
    v.yours = row.sender_text;
    if (both) v.theirs = row.recipient_text;
  } else {
    v.recipient_submitted = both;
    if (both) { v.yours = row.recipient_text; v.theirs = row.sender_text; }
  }
  return v;
}
