// Security/privacy headers for every /two-versions/* response.
export async function onRequest(ctx) {
  const res = await ctx.next();
  const r = new Response(res.body, res);
  r.headers.set('Referrer-Policy', 'no-referrer');
  r.headers.set('Cache-Control', 'no-store');
  r.headers.set('X-Content-Type-Options', 'nosniff');
  r.headers.set('X-Robots-Tag', 'noindex, nofollow');
  r.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  return r;
}
