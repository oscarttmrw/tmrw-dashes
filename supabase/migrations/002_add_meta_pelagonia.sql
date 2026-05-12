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
