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
//
// Later hardening:
//  • Per-host PATH validation. Host-only allowlisting still let anyone call
//    /api/proxy?url=…/lat/<any>/lon/<any>/dist/150 with arbitrary coordinates.
//    Every distinct coordinate pair is a distinct edge-cache key, so s-maxage
//    gives no protection against a deliberate cache-busting loop: that burns
//    Vercel invocations and spends OVERHEAD's reputation with the upstreams,
//    since every request carries our User-Agent from Vercel's egress IPs.
//  • dist is capped at the app's own 150 nm so nobody can request
//    continent-sized queries through us.
//  • Origin/Referer speed bump — see isAllowedCaller().

const https = require('https');
const { URL } = require('url');

// Only these upstream hosts may be proxied.
//   cache — Cache-Control for that host, tuned to how fast its data changes:
//           aircraft & ISS move, so a short TTL; place names and route data
//           effectively never change, so a long one.
//   path  — the ONLY shapes of pathname this host will forward. Anything else
//           is rejected with 403, exactly like an off-list host.
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
// value here. A 150 nm query is what the app asks for; anything larger is someone
// using the proxy to pull a far bigger slice of adsb.lol than OVERHEAD ever needs.
function distWithinLimit(pathname) {
  const m = /\/dist\/(\d+(?:\.\d+)?)$/.exec(pathname);
  if (!m) return true;                       // not an aircraft URL; nothing to cap
  return parseFloat(m[1]) <= MAX_DIST_NM;
}

// Origin/Referer speed bump. Deliberately permissive: a request with NEITHER header
// is allowed, because the app's own Worker fetches may not send one and file:// sends
// Origin: null. This only turns away casual hotlinking from another site's pages — it
// is not a security control, and it must never block OVERHEAD's own traffic.
const CALLER_HOSTS = new Set(['overhead.world', 'www.overhead.world', 'localhost', '127.0.0.1']);
function isAllowedCaller(req) {
  const raw = req.headers.origin || req.headers.referer;
  if (!raw || raw === 'null') return true;                 // absent/opaque -> allow
  try {
    // A Worker created from a blob: URL reports a referrer like
    // "blob:https://overhead.world/<uuid>" — strip the prefix before parsing, or
    // the app's own aircraft fetches would be rejected.
    const u = new URL(raw.replace(/^blob:/, ''));
    if (CALLER_HOSTS.has(u.hostname)) return true;
    if (/\.vercel\.app$/.test(u.hostname)) return true;    // preview deployments
    return false;
  } catch { return true; }                                 // unparseable -> allow
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  if (!isAllowedCaller(req)) { res.status(403).send('Caller not allowed'); return; }

  const urlParam = req.query.url;
  if (!urlParam) { res.status(400).send('Missing ?url='); return; }

  let upstream;
  try { upstream = new URL(urlParam); }
  catch { res.status(400).send('Bad ?url='); return; }

  if (upstream.protocol !== 'https:' || !Object.prototype.hasOwnProperty.call(ALLOW, upstream.hostname)) {
    res.status(403).send('Host not allowed');
    return;
  }

  const rule = ALLOW[upstream.hostname];
  if (!rule.path.test(upstream.pathname)) {
    res.status(403).send('Path not allowed for this host');
    return;
  }
  if (!distWithinLimit(upstream.pathname)) {
    res.status(403).send('Requested radius exceeds ' + MAX_DIST_NM + ' nm');
    return;
  }

  const cacheControl = rule.cache;

  return new Promise((resolve) => {
    const opts = { headers: { 'User-Agent': 'OVERHEAD/10.1 (+https://overhead.world)', 'Accept': 'application/json' }, timeout: 15000 };
    const r = https.get(upstream, opts, (up) => {
      // Never cache a throttle response as if it were data — if the upstream is
      // rate-limiting us (420/429), tell Vercel's edge not to store it.
      const throttled = up.statusCode === 420 || up.statusCode === 429;
      res.writeHead(up.statusCode || 502, {
        'Content-Type': 'application/json',
        'Cache-Control': throttled ? 'no-store' : cacheControl,
      });
      // A socket error partway through the body would otherwise be an unhandled
      // 'error' event on the response stream, which takes the whole function down.
      // Headers are already sent by this point, so all we can do is end the
      // response cleanly and let the client treat it as a failed fetch.
      up.on('error', () => { try { res.end(); } catch (_) {} resolve(); });
      up.pipe(res);
      up.on('end', resolve);
    });
    r.on('timeout', () => { r.destroy(); });
    r.on('error', (e) => { if (!res.headersSent) res.status(502).send('Upstream error: ' + e.message); resolve(); });
  });
};
