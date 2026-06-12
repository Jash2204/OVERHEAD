const http = require('http');
const https = require('https');

const PORT = 3001;

http.createServer((req, res) => {
  // CORS headers so the browser accepts the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Expect requests like: http://localhost:3001/?url=https://api.adsb.lol/...
  const urlParam = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('url');
  if (!urlParam) { res.writeHead(400); res.end('Missing ?url='); return; }

  https.get(urlParam, (upstream) => {
    res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json' });
    upstream.pipe(res);
  }).on('error', (e) => {
    res.writeHead(502); res.end('Upstream error: ' + e.message);
  });

}).listen(PORT, () => {
  console.log(`OVERHEAD proxy running on http://localhost:${PORT}`);
  console.log('Keep this window open while using the app.');
});
