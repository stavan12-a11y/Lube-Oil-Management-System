const { createHmac, timingSafeEqual } = require('node:crypto');
const { neon, neonConfig } = require('@neondatabase/serverless');

neonConfig.fetchConnectionCache = true;

const STATE_ROW_ID = 'singleton';

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

function isAuthorized(req) {
  try {
    return verifySessionToken(bearerToken(req));
  } catch {
    return false;
  }
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured on Vercel.');
  }
  return neon(url);
}

async function ensureSchema() {
  const sql = getSql();
  await sql`
    create table if not exists public.app_state (
      id text primary key,
      data jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    )
  `;
}

module.exports = async function handler(req, res) {
  if (!isAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`
        select data, updated_at
        from public.app_state
        where id = ${STATE_ROW_ID}
        limit 1
      `;
      const row = rows[0];
      let data = row?.data ?? null;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          data = null;
        }
      }
      return json(res, 200, {
        data,
        updatedAt: row?.updated_at ?? null,
      });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const data = body?.data;
      if (!data || typeof data !== 'object') {
        return json(res, 400, { error: 'Missing data payload' });
      }

      const updatedAt = new Date().toISOString();
      await sql`
        insert into public.app_state (id, data, updated_at)
        values (${STATE_ROW_ID}, ${data}, ${updatedAt})
        on conflict (id) do update
        set data = excluded.data,
            updated_at = excluded.updated_at
      `;
      return json(res, 200, { ok: true, updatedAt });
    }

    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    console.error('api/data error:', message);
    return json(res, 500, { error: message });
  }
};
