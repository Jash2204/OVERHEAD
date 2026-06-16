// OVERHEAD — local CORS proxy
// Standalone Node server (no dependencies) that the app calls as source #2:
//   http://localhost:3001/?url=<encoded upstream URL>
// It fetches the upstream URL server-side (no browser CORS) and pipes JSON back.
// This is the local-dev twin of the Vercel serverless function in api/proxy.js.
//
// Run:  node proxy.js      (leave it running alongside `npx serve .`)
// Stop: Ctrl-C

const http  = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let target;
  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    target = reqUrl.searchParams.get('url');
  } catch { target = null; }

  if (!target) { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Missing ?url='); return; }

  let upstreamUrl;
  try { upstreamUrl = new URL(target); }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain' }); res.end('Bad ?url='); return; }

  const client = upstreamUrl.protocol === 'http:' ? http : https;

  const upstreamReq = client.get(upstreamUrl, { timeout: 15000 }, (upstream) => {
    res.writeHead(upstream.statusCode || 502, { 'Content-Type': 'application/json' });
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
  console.log('Leave this window open. Ctrl-C to stop.');
});
