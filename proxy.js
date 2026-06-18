// OVERHEAD — local CORS proxy (v9, hardened)
// Standalone Node server (no dependencies), the local-dev twin of api/proxy.js.
//   http://localhost:3001/?url=<encoded upstream URL>
//
// v9: same allowlist + caching + identifying User-Agent as the Vercel function,
// so dev behaves like production. Only OVERHEAD's own data hosts are proxied;
// anything else is rejected (no open relay).
//
// Run:  node proxy.js      (leave it running alongside `npx serve .`)
// Stop: Ctrl-C

const http  = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;

const ALLOW = {
  'api.adsb.lol':                 's-maxage=10, stale-while-revalidate=20',
  'nominatim.openstreetmap.org':  's-maxage=86400, stale-while-revalidate=604800',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let target;
  try { target = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('url'); }
  catch { target = null; }
  if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing ?url='); return; }

  let upstreamUrl;
  try { upstreamUrl = new URL(target); }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad ?url='); return; }

  if (upstreamUrl.protocol !== 'https:' || !Object.prototype.hasOwnProperty.call(ALLOW, upstreamUrl.hostname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Host not allowed'); return;
  }

  const opts = { headers: { 'User-Agent': 'OVERHEAD/9.5 (+https://overhead.world)', 'Accept': 'application/json' }, timeout: 15000 };
  const upstreamReq = https.get(upstreamUrl, opts, (upstream) => {
    res.writeHead(upstream.statusCode || 502, {
      'Content-Type': 'application/json',
      'Cache-Control': ALLOW[upstreamUrl.hostname],
    });
    upstream.pipe(res);
  });
  upstreamReq.on('timeout', () => { upstreamReq.destroy(); });
  upstreamReq.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Upstream error: ' + e.message);
  });
});

server.listen(PORT, () => {
  console.log(`OVERHEAD proxy running on http://localhost:${PORT}`);
  console.log('Allowlisted hosts only: api.adsb.lol, nominatim.openstreetmap.org');
  console.log('Leave this window open. Ctrl-C to stop.');
});
