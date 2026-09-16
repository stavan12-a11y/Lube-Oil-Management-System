const { createHmac, timingSafeEqual } = require('node:crypto');

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET is not configured (needs at least 16 characters).');
  }
  return secret;
}

function getTeamCredentials() {
  const username = process.env.TEAM_USERNAME ?? process.env.VITE_APP_USERNAME ?? 'admin';
  const password = process.env.TEAM_PASSWORD ?? process.env.VITE_APP_PASSWORD;
  if (!password) {
    throw new Error('TEAM_PASSWORD is not configured on the server.');
  }
  return { username, password };
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyTeamLogin(identifier, password) {
  const { username, password: expected } = getTeamCredentials();
  return safeEqual(identifier.trim(), username) && safeEqual(password, expected);
}

function createSessionToken() {
  const payload = { v: 1, exp: Date.now() + TOKEN_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getAuthSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const identifier = String(body?.identifier ?? '');
    const password = String(body?.password ?? '');

    if (!verifyTeamLogin(identifier, password)) {
      return json(res, 401, { error: 'Incorrect username or password.' });
    }

    const token = createSessionToken();
    return json(res, 200, { ok: true, token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return json(res, 500, { error: message });
  }
};
