-- 009_zendesk_schema.sql
-- Rebuild zendesk_data as a typed support table that powers the new Support
-- metrics Dan asked for: per-channel volume / SLAs, created-vs-solved, reopen
-- rate, inbound messages, and volume by reason/tag. zendesk_data is empty
-- (0 rows) so a drop+recreate is safe and resolves the earlier jsonb-vs-typed
-- ambiguity. Upserts dedupe on zendesk_ticket_id.

drop table if exists zendesk_data cascade;

create table zendesk_data (
  id                            bigserial primary key,
  batch_id                      uuid references upload_log(id) on delete cascade,
  zendesk_ticket_id             text not null unique,
  zendesk_created_at            timestamptz,
  solved_at                     timestamptz,
  updated_at                    timestamptz,
  status                        text,
  priority                      text,
  channel                       text,       -- Zendesk "Via" / channel (email, chat, voice, web, ...)
  ticket_type                   text,       -- Zendesk "Ticket type"
  ticket_reason                 text,       -- about / first tag — Dan: "volume by ticket reason or tag"
  tags                          text,       -- raw tag list
  assignee                      text,
  group_name                    text,
  subject                       text,
  first_reply_time_minutes      integer,
  full_resolution_time_minutes  integer,
  requester_wait_time_minutes   integer,
  replies                       integer,    -- agent replies on the ticket
  inbound_messages              integer,    -- inbound customer messages — Dan: "separate from ticket count"
  reopens                       integer,    -- reopen count — Dan: "reopen rate"
  satisfaction_score            integer,
  inserted_at                   timestamptz not null default now()
);

create index if not exists idx_zendesk_created  on zendesk_data (zendesk_created_at);
create index if not exists idx_zendesk_solved   on zendesk_data (solved_at);
create index if not exists idx_zendesk_channel  on zendesk_data (channel);

alter table zendesk_data enable row level security;
drop policy if exists "service role full access" on zendesk_data;
create policy "service role full access" on zendesk_data
  for all using (true) with check (true);
