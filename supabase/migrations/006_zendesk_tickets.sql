-- Zendesk inbound tickets from the warehouse extract. Distinct from the legacy
-- zendesk_data table, which holds the Explore report export (keyed on ticket ID,
-- with satisfaction scores and reply times in minutes).
--
-- This extract has no ticket ID, so there is no key to upsert on — the write
-- strategy replaces the uploaded created_at window instead.
--
-- Timestamps are stored in UTC exactly as exported. Conversion to
-- Australia/Sydney happens at display time: bucketing by UTC date under-counts,
-- because a ticket logged at 09:00 Sydney on the 1st is 23:00 UTC on the
-- previous day. Dan's report reads 260 tickets for 1-5 Aug in Sydney and 253
-- in UTC.
create table if not exists zendesk_tickets (
  id                   bigserial     primary key,
  batch_id             uuid          references upload_log(id) on delete cascade,
  channel              text          not null,
  status               text,
  direction            text,
  -- Blank on a handful of rows in the export; kept null so the queue breakdown
  -- can show an explicit unassigned bucket rather than inventing a group.
  group_name           text,
  created_at           timestamptz   not null,
  updated_at           timestamptz,
  first_reply_at       timestamptz,
  first_response_hours numeric(10,2),
  solved_at            timestamptz,
  resolution_hours     numeric(10,2),
  inserted_at          timestamptz   not null default now()
);

create index if not exists idx_zendesk_tickets_created_at on zendesk_tickets (created_at);
create index if not exists idx_zendesk_tickets_channel on zendesk_tickets (channel);
create index if not exists idx_zendesk_tickets_group on zendesk_tickets (group_name);

-- Match the RLS convention from migration 001. The policy is dropped first so
-- the whole migration is safe to re-run (create policy has no IF NOT EXISTS).
alter table zendesk_tickets enable row level security;
drop policy if exists "service role full access" on zendesk_tickets;
create policy "service role full access" on zendesk_tickets
  for all using (true) with check (true);
