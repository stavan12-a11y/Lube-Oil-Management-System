# Lube Oil Management System

A lubrication and oil-analysis compliance dashboard for tracking every piece
of oil-lubricated equipment across a plant — pumps, compressors, turbines,
gearboxes, hydraulic units, and more.

The app tracks each equipment item's lubricant, its oil-sampling schedule,
lab analysis results, and any corrective actions taken when a sample comes
back abnormal. It is seeded with realistic demo data on first load so you can
see exactly how it behaves; replace it with real equipment whenever you're
ready (or keep using **Reset demo** in the header to restore the seed).

## Features

- **Equipment fleet grid** — every asset is a card showing tag, type,
  lubricant grade, a colour-coded status accent, and the next sample due date.
- **Detail view** — editable specs (type, lubricant, sampling interval,
  criticality), an active sample workflow, and full archived sample history.
- **Sample workflow** — record the sample date, lab report #, and lab
  readings (viscosity, TAN, water content, ISO 4406 cleanliness, ferrous
  wear, flash point). Normal samples progress through a 4-step
  collect → lab → report → file workflow. Abnormal samples switch to a
  corrective-action log (oil change, filter replacement, seal repair, etc.)
  until resolved.
- **Right sidebar** — sampling schedule (overdue / due soon) and equipment
  awaiting corrective action.
- **Summary KPI cards** — fleet-wide compliance rate, overdue/due-soon
  counts, abnormal-result counts, and average lab turnaround time. Every card
  drills into a filtered equipment list.
- **Change history** — full audit trail of every edit, with before → after
  values, scoped per-equipment or fleet-wide.
- **CSV export** — per-equipment reports, fleet register, KPI-filtered
  lists, and compliance-rate trend, all from the header/detail pages.
- **Reset to demo** — restore the bundled demo program at any time.

## Demo data

On first run (or after **Reset demo**) the dashboard is seeded with six
equipment items that exercise every status the app supports:

| Tag | Status | What it shows |
|-----|--------|----------------|
| `P-101A` (Boiler Feed Pump) | 🟢 Normal & filed | Full audit history, including a past abnormal result that was corrected |
| `C-201` (Air Compressor) | 🟡 Sample in progress | A workflow partway through collect → lab → report → file |
| `GB-301` (Main Gearbox) | 🔴 Abnormal — action required | High wear metals + water content, corrective actions logged, unresolved |
| `TB-401` (Steam Turbine) | 🟢 status, ⚠️ overdue | Last sample was normal but the next round is now overdue |
| `HY-601` (Hydraulic Power Unit) | 🟢 status, due soon | Next sample due within the warning window |
| `BL-701` (Cooling Tower Fan) | ⚪ Never sampled | Brand-new equipment awaiting its first baseline sample |

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Neon Postgres + Vercel serverless API (optional cloud mode)
- Vitest for compliance-logic unit tests

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build       # type-check and build for production
npm run preview     # preview the production build
npm run test         # run unit tests
```

## Login & cloud sync

The app supports two modes, selected automatically from environment variables:

### Local mode (default, no backend)

Without cloud mode the app runs entirely in the browser:

- A single static login gates the app — defaults `admin` / `lube-oil-2026`
  (override with `VITE_APP_USERNAME` / `VITE_APP_PASSWORD`).
- Data persists per-browser to `localStorage`. Use **Reset demo** in the
  header to reload the bundled demo program.

### Cloud mode (shared team data)

Set `VITE_CLOUD_MODE=true` plus server env vars on Vercel (`DATABASE_URL`,
`TEAM_USERNAME`, `TEAM_PASSWORD`, `AUTH_SECRET`). Everyone who signs in sees
the same equipment program; edits sync every ~20 seconds between users. See
**[docs/NEON_SETUP.md](docs/NEON_SETUP.md)** for step-by-step setup (no
coding required).

## Deploy on Vercel

1. Connect this repo to Vercel.
2. Set environment variables (Production):
   - `VITE_CLOUD_MODE` = `true`
   - `DATABASE_URL`, `TEAM_USERNAME`, `TEAM_PASSWORD`, `AUTH_SECRET` (see
     [docs/NEON_SETUP.md](docs/NEON_SETUP.md))
   - Or for local-only testing: `VITE_APP_USERNAME` and `VITE_APP_PASSWORD`
3. Deploy — `vercel.json` configures API routes and SPA rewrites.

## Key compliance rules

- **Next due date = last sample date + sampling interval (days)**, configured
  per equipment (`samplingIntervalDays`).
- Equipment is flagged **due soon** within 15 days of its due date
  (`WARNING_WINDOW_DAYS` in `src/lib/helpers.ts`) and **overdue** once the
  due date passes.
- Equipment that has never been sampled shows an upcoming due date (not
  overdue) until a first baseline sample is recorded.
- **Compliant** = most recent sample was normal *and* the next sample is not
  overdue.

## Replacing the demo data

All seed data lives in `src/lib/demo.ts` (`createDemoEquipment`). Replace it
with your real fleet, or just start adding equipment through the **Add
equipment** button — the demo seed is only used the very first time the app
loads (or after **Reset demo**).
