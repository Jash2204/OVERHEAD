// OVERHEAD — Vercel serverless CORS proxy (v9, hardened)
// Reached by the app as:  /api/proxy?url=<encoded upstream URL>
//
// v9 changes:
//  • Allowlist — only OVERHEAD's own data hosts may be proxied. Previously this
//    forwarded ANY url=, which let strangers use the deploy as an open relay
//    (SSRF / abuse). Now anything off the list is rejected with 403.
//  • Edge caching — responses carry Cache-Control so Vercel's edge serves many
//    concurrent users in the same area from one upstream call (fast + cheap,
//    and gentle on adsb.lol / Nominatim rate limits during traffic spikes).
//  • Identifying User-Agent — Nominatim's usage policy requires one.

const https = require('https');
const http  = require('http');
const { URL } = require('url');

// Only these upstream hosts may be proxied.
const ALLOW = {
  'api.adsb.lol':                 's-maxage=10, stale-while-revalidate=20',
  'nominatim.openstreetmap.org':  's-maxage=86400, stale-while-revalidate=604800',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const urlParam = req.query.url;
  if (!urlParam) { res.status(400).send('Missing ?url='); return; }

  let upstream;
  try { upstream = new URL(urlParam); }
  catch { res.status(400).send('Bad ?url='); return; }

  if (upstream.protocol !== 'https:' || !Object.prototype.hasOwnProperty.call(ALLOW, upstream.hostname)) {
    res.status(403).send('Host not allowed');
    return;
  }

  const cacheControl = ALLOW[upstream.hostname];

  return new Promise((resolve) => {
    const opts = { headers: { 'User-Agent': 'OVERHEAD/9.5 (+https://overhead.world)', 'Accept': 'application/json' }, timeout: 15000 };
    const r = https.get(upstream, opts, (up) => {
      res.writeHead(up.statusCode || 502, {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
      });
      up.pipe(res);
      up.on('end', resolve);
    });
    r.on('timeout', () => { r.destroy(); });
    r.on('error', (e) => { if (!res.headersSent) res.status(502).send('Upstream error: ' + e.message); resolve(); });
  });
};
