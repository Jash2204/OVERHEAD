const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const urlParam = req.query.url;
  if (!urlParam) {
    res.status(400).send('Missing ?url=');
    return;
  }

  return new Promise((resolve) => {
    https.get(urlParam, (upstream) => {
      res.writeHead(upstream.statusCode, { 'Content-Type': 'application/json' });
      upstream.pipe(res);
      upstream.on('end', () => resolve());
    }).on('error', (e) => {
      res.status(502).send('Upstream error: ' + e.message);
      resolve();
    });
  });
};
