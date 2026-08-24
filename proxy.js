// OVERHEAD — local CORS proxy (v9, hardened)
// Standalone Node server (no dependencies), the local-dev twin of api/proxy.js.
//   http://localhost:3001/?url=<encoded upstream URL>
//
// v9: same allowlist + caching + identifying User-Agent as the Vercel function,
// so dev behaves like production. Only OVERHEAD's own data hosts are proxied;
// anything else is rejected (no open relay).
//
// Later hardening (mirrors api/proxy.js so dev keeps matching prod):
//  • Per-host PATH validation, so the proxy can't be used to pull arbitrary
//    coordinates or continent-sized queries through OVERHEAD's identity.
//  • dist capped at the app's own 150 nm.
//  • Origin/Referer speed bump.
//  • Error handlers on the upstream response stream.
//
// Run:  node proxy.js      (leave it running alongside `npx serve .`)
// Stop: Ctrl-C

const http  = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;

// Only these upstream hosts may be proxied.
//   cache — Cache-Control for that host, tuned to how fast its data changes.
//   path  — the ONLY shapes of pathname this host will forward; anything else 403s.
const MAX_DIST_NM = 150;   // must match buildPlaneSources() in index.html
const ALLOW = {
  'api.adsb.lol': {
    cache: 's-maxage=25, stale-while-revalidate=60',
    path:  /^\/v2\/lat\/-?\d+(?:\.\d+)?\/lon\/-?\d+(?:\.\d+)?\/dist\/\d+(?:\.\d+)?$/,
  },
  'api.wheretheiss.at': {
    cache: 's-maxage=5,  stale-while-revalidate=15',
    path:  /^\/v1\/satellites\/25544$/,
  },
  'nominatim.openstreetmap.org': {
    cache: 's-maxage=86400, stale-while-revalidate=604800',
    path:  /^\/(reverse|search)$/,
  },
  // Static route dataset (callsign -> origin/destination). Same operator as the
  // live aircraft feed, and the data effectively never changes, so it gets the same
  // long TTL as Nominatim. Added so enrichRoute() can stop calling it directly.
  'vrs-standing-data.adsb.lol': {
    cache: 's-maxage=86400, stale-while-revalidate=604800',
    path:  /^\/routes\/[A-Za-z0-9]{1,4}\/[A-Za-z0-9]{1,12}\.json$/,
  },
};

// Extra guard for the aircraft feed: the path regex accepts any dist, so cap the
// value here. 150 nm is what the app asks for; anything larger is someone using the
// proxy to pull a far bigger slice of adsb.lol than OVERHEAD ever needs.
function distWithinLimit(pathname) {
  const m = /\/dist\/(\d+(?:\.\d+)?)$/.exec(pathname);
  if (!m) return true;                       // not an aircraft URL; nothing to cap
  return parseFloat(m[1]) <= MAX_DIST_NM;
}

// Origin/Referer speed bump. Deliberately permissive: a request with NEITHER header
// is allowed, because the app's own Worker fetches may not send one and file:// sends
// Origin: null. This only turns away casual hotlinking — it is not a security
// control, and it must never block OVERHEAD's own traffic.
const CALLER_HOSTS = new Set(['overhead.world', 'www.overhead.world', 'localhost', '127.0.0.1']);
function isAllowedCaller(req) {
  const raw = req.headers.origin || req.headers.referer;
  if (!raw || raw === 'null') return true;                 // absent/opaque -> allow
  try {
    // A Worker created from a blob: URL reports a referrer like
    // "blob:http://localhost:3000/<uuid>" — strip the prefix before parsing, or the
    // app's own aircraft fetches would be rejected.
    const u = new URL(raw.replace(/^blob:/, ''));
    if (CALLER_HOSTS.has(u.hostname)) return true;
    if (/\.vercel\.app$/.test(u.hostname)) return true;    // preview deployments
    return false;
  } catch { return true; }                                 // unparseable -> allow
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (!isAllowedCaller(req)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Caller not allowed'); return;
  }

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

  const rule = ALLOW[upstreamUrl.hostname];
  if (!rule.path.test(upstreamUrl.pathname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' }); res.end('Path not allowed for this host'); return;
  }
  if (!distWithinLimit(upstreamUrl.pathname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Requested radius exceeds ' + MAX_DIST_NM + ' nm'); return;
  }

  const opts = { headers: { 'User-Agent': 'OVERHEAD/10.1 (+https://overhead.world)', 'Accept': 'application/json' }, timeout: 15000 };
  const upstreamReq = https.get(upstreamUrl, opts, (upstream) => {
    // Mirror the Vercel function: don't cache a 420/429 throttle response as data.
    const throttled = upstream.statusCode === 420 || upstream.statusCode === 429;
    res.writeHead(upstream.statusCode || 502, {
      'Content-Type': 'application/json',
      'Cache-Control': throttled ? 'no-store' : rule.cache,
    });
    // A socket error partway through the body would otherwise be an unhandled
    // 'error' event on the response stream and take the whole server down. Headers
    // are already sent by this point, so end cleanly and let the client see a
    // failed fetch.
    upstream.on('error', () => { try { res.end(); } catch (_) {} });
    upstream.pipe(res);
  });
  upstreamReq.on('timeout', () => { upstreamReq.destroy(); });
  upstreamReq.on('error', (e) => {
    // If headers already went out we cannot write a status line or a body — doing so
    // throws ERR_HTTP_HEADERS_SENT. End the response instead.
    if (res.headersSent) { try { res.end(); } catch (_) {} return; }
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Upstream error: ' + e.message);
  });
});

server.listen(PORT, () => {
  console.log(`OVERHEAD proxy running on http://localhost:${PORT}`);
  console.log('Allowlisted hosts only: api.adsb.lol, api.wheretheiss.at, nominatim.openstreetmap.org, vrs-standing-data.adsb.lol');
  console.log(`Path-validated per host; aircraft dist capped at ${MAX_DIST_NM} nm.`);
  console.log('Leave this window open. Ctrl-C to stop.');
});
