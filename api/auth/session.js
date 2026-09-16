const { createHmac, timingSafeEqual } = require('node:crypto');

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function fromBase64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is not configured (needs at least 16 characters).');
  }
  return secret;
}

function bearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim();
}

function verifySessionToken(token) {
  if (!token) return false;
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return false;
    const expected = createHmac('sha256', getAuthSecret()).update(body).digest('base64url');
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const payload = JSON.parse(fromBase64url(body));
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const ok = verifySessionToken(bearerToken(req));
    return json(res, ok ? 200 : 401, { ok });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Session check failed';
    return json(res, 500, { error: message });
  }
};
