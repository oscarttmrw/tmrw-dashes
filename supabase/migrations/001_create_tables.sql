-- =============================================================================
-- ⚠️  SUPERSEDED — HISTORICAL RECORD ONLY. DO NOT RUN THIS FILE.
-- =============================================================================
--
-- DANGER: line 2 below is `drop table if exists upload_log cascade`. Because
-- every data table carries a foreign key to upload_log, that single statement
-- would CASCADE and destroy the entire dashboard database. Running this file
-- against production is unrecoverable without a restore.
--
-- This file also no longer describes reality. Four of the tables it creates
-- (tableau_data, stripe_data, zendesk_data, and hubspot_data) were later
-- rebuilt with typed columns or retired entirely, so the `row_data jsonb`
-- definitions below are wrong.
--
-- The current schema lives in 005_document_existing_schema.sql. For a fresh
-- database, run that file alone. See supabase/README.md.
--
-- Nothing below has been modified — it is kept exactly as applied, as the
-- historical record of how the database was first created.
-- =============================================================================

-- Drop old flat table if it exists
drop table if exists upload_log cascade;

-- Upload log: metadata only, one row per upload batch
create table upload_log (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,
  record_count  integer not null default 0,
  status        text not null default 'pending',  -- pending | complete | failed
  error         text,
  uploaded_at   timestamptz not null default now()
);

-- Per-source data tables, rows reference the batch they came from
create table tableau_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

create table hubspot_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

create table stripe_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

create table zendesk_data (
  id          bigserial primary key,
  batch_id    uuid not null references upload_log(id) on delete cascade,
  row_data    jsonb not null,
  inserted_at timestamptz not null default now()
);

-- Priorities stored separately (not file-upload-based)
create table priorities_log (
  id          bigserial primary key,
  week_of     date not null,
  data        jsonb not null,
  uploaded_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table upload_log       enable row level security;
alter table tableau_data     enable row level security;
alter table hubspot_data     enable row level security;
alter table stripe_data      enable row level security;
alter table zendesk_data     enable row level security;
alter table priorities_log   enable row level security;

-- Service role can do everything
create policy "service role full access" on upload_log       for all using (true) with check (true);
create policy "service role full access" on tableau_data     for all using (true) with check (true);
create policy "service role full access" on hubspot_data     for all using (true) with check (true);
create policy "service role full access" on stripe_data      for all using (true) with check (true);
create policy "service role full access" on zendesk_data     for all using (true) with check (true);
create policy "service role full access" on priorities_log   for all using (true) with check (true);
