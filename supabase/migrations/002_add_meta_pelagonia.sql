-- =============================================================================
-- ⚠️  SUPERSEDED — HISTORICAL RECORD ONLY. DO NOT RUN THIS FILE.
-- =============================================================================
--
-- Both tables created here have since changed:
--
--   meta_data      → RETIRED. Replaced by `meta_ads` (typed daily campaign
--                    metrics). Dropped in 006_drop_legacy_tables.sql.
--   pelagonia_data → REBUILT with typed columns. The `row_data jsonb`
--                    definition below is no longer correct.
--
-- The current schema lives in 005_document_existing_schema.sql. For a fresh
-- database, run that file alone. See supabase/README.md.
--
-- Nothing below has been modified — it is kept as the historical record.
-- =============================================================================

-- Add Meta for Business and Pelagonia (GoHighLevel) data tables
-- Run this in Supabase SQL Editor after deploying the code changes.

create table if not exists meta_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

create table if not exists pelagonia_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

alter table meta_data      enable row level security;
alter table pelagonia_data enable row level security;

create policy "service role full access" on meta_data      for all using (true) with check (true);
create policy "service role full access" on pelagonia_data for all using (true) with check (true);
