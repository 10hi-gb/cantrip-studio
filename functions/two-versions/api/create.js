// POST {secret, moment, account} -> {invite, ret}. secret is a client-generated 256-bit sender capability.
// Idempotent: the exchange id is sha256(secret); invite/return tokens are HMAC-derived from it, so a retry
// returns the same links and never creates a second exchange. INSERT OR IGNORE makes it atomic.
import { LIMITS, wrap, err, json, cleanText, sha256, derive, TOKEN_RE, now } from './_lib.js';
export const onRequest = (ctx) => wrap(ctx, 'create', async (b) => {
  if (typeof b.secret !== 'string' || !TOKEN_RE.test(b.secret)) return err(400, 'bad_secret');
  const m = cleanText(b.moment, LIMITS.MOMENT_MAX_BYTES);
  if (m.error) return err(m.error === 'too_long' ? 413 : 400, 'moment_' + m.error, { max_bytes: LIMITS.MOMENT_MAX_BYTES });
  const a = cleanText(b.account, LIMITS.ACCOUNT_MAX_BYTES);
  if (a.error) return err(a.error === 'too_long' ? 413 : 400, 'account_' + a.error, { max_bytes: LIMITS.ACCOUNT_MAX_BYTES });
  const id = await sha256('sender|' + b.secret);
  const invite = await derive(b.secret, 'invite');
  const ret = await derive(b.secret, 'return');
  const t = now();
  const db = ctx.env.TV_DB;
  const res = await db.prepare(
    'INSERT OR IGNORE INTO tv_exchange (id, invite_hash, return_hash, moment, sender_text, created_at, expires_at) VALUES (?,?,?,?,?,?,?)'
  ).bind(id, await sha256('invite|' + invite), await sha256('return|' + ret), m.text, a.text, t, t + LIMITS.TTL_SECONDS).run();
  let already = false;
  if (!res.meta.changes) {
    const row = await db.prepare('SELECT expires_at FROM tv_exchange WHERE id = ?').bind(id).first();
    if (!row || row.expires_at <= t) return err(410, 'expired');
    already = true; // stored text is unchanged; no edits after submit
  }
  return json(already ? 200 : 201, { ok: true, already_submitted: already, invite, ret });
});
