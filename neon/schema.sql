-- ---------------------------------------------------------------------------
-- Lube Oil Management System — Neon Postgres setup
-- Run once in Neon: SQL Editor → paste → Run
-- ---------------------------------------------------------------------------

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
