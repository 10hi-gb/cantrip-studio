// POST {token, account} with the INVITE token. Atomic conditional UPDATE: only the first accepted response
// wins; later/duplicate calls never overwrite and get already_submitted.
import { LIMITS, wrap, err, json, cleanText, sha256, TOKEN_RE, now, view } from './_lib.js';
export const onRequest = (ctx) => wrap(ctx, 'submit', async (b) => {
  if (typeof b.token !== 'string' || !TOKEN_RE.test(b.token)) return err(404, 'invalid');
  const a = cleanText(b.account, LIMITS.ACCOUNT_MAX_BYTES);
  if (a.error) return err(a.error === 'too_long' ? 413 : 400, 'account_' + a.error, { max_bytes: LIMITS.ACCOUNT_MAX_BYTES });
  const db = ctx.env.TV_DB;
  const ih = await sha256('invite|' + b.token);
  const t = now();
  const res = await db.prepare(
    'UPDATE tv_exchange SET recipient_text = ?, recipient_at = ? WHERE invite_hash = ? AND recipient_text IS NULL AND expires_at > ?'
  ).bind(a.text, t, ih, t).run();
  const row = await db.prepare('SELECT * FROM tv_exchange WHERE invite_hash = ?').bind(ih).first();
  if (!row) return err(404, 'invalid');
  if (row.expires_at <= t) return err(410, 'expired');
  return json(res.meta.changes ? 201 : 200, { ...view(row, 'recipient'), already_submitted: !res.meta.changes });
});
