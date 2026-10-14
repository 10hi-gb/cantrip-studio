const puppeteer = require('puppeteer-core');
exports.open = async (host, ip) => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', `--host-resolver-rules=MAP ${host} ${ip}`, '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); const reqs = [], errs = [];
  p.on('request', r => reqs.push(r.method() + ' ' + r.url()));
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return { b, p, reqs, errs };
};
exports.storage = async (p) => p.evaluate(async () => ({
  cookie: document.cookie, ls: Object.keys(localStorage), ss: Object.keys(sessionStorage),
  idb: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : 'n/a',
  caches: (await caches.keys().catch(() => [])), sw: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
  undef: /undefined|\{\w+\}/.test(document.body.innerText), meta: [...document.querySelectorAll('meta,title')].map(m => m.outerHTML).join('\n')
}));
exports.netCheck = (reqs, host, needles) => {
  const bad = reqs.filter(r => { const u = new URL(r.split(' ')[1]); return (u.protocol.startsWith('http') && u.host !== host) || u.search || needles.some(n => r.includes(n)) || !r.startsWith('GET'); });
  return { total: reqs.length, offending: bad };
};
