# Move the dashboard from a single browser to shared Neon cloud data

**You do not need to write code.** Follow these steps in order. The app code is already in the repo — you only create accounts and paste a few values into Vercel.

**Time:** about 20–30 minutes.

---

## What you are setting up

| Service | What it does | Cost |
|---------|----------------|------|
| **Neon** | Stores your equipment fleet + oil sample data | Free |
| **Vercel** | Hosts the website + small API (already using this) | Free |

Your team still opens the **same dashboard URL** and signs in with **username + password**.

---

## Step 1 — Create a Neon database (5 min)

1. Go to **[neon.tech](https://neon.tech)** and sign up (GitHub login is fine).
2. Click **New Project**.
   - Name: `lube-oil-management-system` (or anything you like)
   - Region: pick one close to you (e.g. US East)
3. After creation, open **Dashboard → Connection details**.
4. Copy the **connection string** that starts with `postgresql://...`
   - Use the **pooled** connection string if Neon offers one (recommended for Vercel).

Keep this tab open — you will need the connection string in Step 3.

---

## Step 2 — Create the database table (2 min)

1. In Neon, open **SQL Editor**.
2. Open the file [`neon/schema.sql`](../neon/schema.sql) from this repo (or copy from GitHub).
3. Paste into the SQL Editor and click **Run**.

You should see “Success” — one table `app_state` is created.

---

## Step 3 — Add secrets in Vercel (10 min)

1. Go to **[vercel.com](https://vercel.com)** → your lube oil dashboard project.
2. Open **Settings → Environment Variables**.
3. Add these variables (for **Production**, and optionally Preview):

| Variable name | Value | Notes |
|---------------|-------|-------|
| `VITE_CLOUD_MODE` | `true` (optional) | Force cloud mode; otherwise auto-detected once `DATABASE_URL`, `TEAM_PASSWORD`, and `AUTH_SECRET` are all set (checked via `/api/health`) |
| `DATABASE_URL` | `postgresql://...` from Step 1 | **Server only** — Neon connection string |
| `TEAM_USERNAME` | e.g. `lube-admin` | Login username for your team |
| `TEAM_PASSWORD` | choose a strong password | Login password — share via team password manager |
| `AUTH_SECRET` | long random string | See below |

**Generate AUTH_SECRET:** open [random.org/strings](https://www.random.org/strings/) and create one string of 32+ characters, or run this in any terminal:

```bash
openssl rand -base64 32
```

4. Go to **Deployments** → click **⋯** on the latest deployment → **Redeploy** (so new env vars take effect).

---

## Step 4 — Test

1. Open your Vercel URL.
2. Sign in with `TEAM_USERNAME` / `TEAM_PASSWORD`.
3. Confirm your equipment data appears (starts from the bundled demo program on first login).
4. Make a small edit, refresh the page — change should still be there.

---

## Handoff checklist (for when you leave the team)

Leave your team these items in a shared doc or password manager:

- [ ] Dashboard URL (Vercel link)
- [ ] Team username + password (`TEAM_USERNAME` / `TEAM_PASSWORD`)
- [ ] Neon project login (who owns the account)
- [ ] Vercel project login (who owns the account)
- [ ] This file: `docs/NEON_SETUP.md`

The site keeps working as long as Vercel and Neon accounts stay active (both free at this scale).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Incorrect username or password” | Check `TEAM_USERNAME` and `TEAM_PASSWORD` in Vercel env vars; redeploy |
| Blank dashboard after login | Run `neon/schema.sql`; check `DATABASE_URL` is correct |
| Changes don’t appear for teammate | Normal — updates sync every ~20 seconds, or refresh the page |

---

## Need help?

Ask whoever maintains the GitHub repo to check the latest deployment logs in Vercel → **Functions** tab for `/api/auth/login` and `/api/data`.
