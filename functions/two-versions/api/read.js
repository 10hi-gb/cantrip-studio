// POST {token} -> role-scoped view. Return token = sender view; invite token = recipient view.
import { wrap, err, json, sha256, TOKEN_RE, now, view } from './_lib.js';
export async function lookup(db, token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return { e: err(404, 'invalid') };
  const [ih, rh] = [await sha256('invite|' + token), await sha256('return|' + token)];
  const row = await db.prepare('SELECT *, CASE WHEN return_hash = ? THEN \'sender\' ELSE \'recipient\' END AS role FROM tv_exchange WHERE invite_hash = ? OR return_hash = ?').bind(rh, ih, rh).first();
  if (!row) return { e: err(404, 'invalid') };
  if (row.expires_at <= now()) {
    await db.prepare('DELETE FROM tv_exchange WHERE id = ?').bind(row.id).run();
    return { e: err(410, 'expired') };
  }
  return { row };
}
export const onRequest = (ctx) => wrap(ctx, 'read', async (b) => {
  const { row, e } = await lookup(ctx.env.TV_DB, b.token);
  if (e) return e;
  return json(200, view(row, row.role));
});
