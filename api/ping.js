module.exports = function handler(_req, res) {
  res.status(200).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, route: 'ping' }));
};
