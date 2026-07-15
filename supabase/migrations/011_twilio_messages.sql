-- 011_twilio_messages.sql
-- Twilio message extract — powers "inbound messages by channel" (Dan #3b-ii),
-- which is a separate feed from Zendesk tickets. One row per message.
-- The message Body is intentionally NOT stored (member PII / health content);
-- we keep only the metadata needed for volume/cost metrics.

create table if not exists twilio_messages (
  id           bigserial primary key,
  batch_id     uuid references upload_log(id) on delete cascade,
  channel      text,          -- MOBILE / whatsapp / ... (normalised lowercase)
  status       text,          -- delivered / failed / ...
  sent_at      timestamptz,   -- SentDate (ISO-8601 with offset)
  direction    text,          -- 'inbound' | 'outbound' (normalised)
  num_segments integer,
  error_code   integer,
  price        numeric(12,4), -- Twilio charge (usually negative)
  price_unit   text,
  tags         text,
  inserted_at  timestamptz not null default now()
);

create index if not exists idx_twilio_sent      on twilio_messages (sent_at);
create index if not exists idx_twilio_direction on twilio_messages (direction);
create index if not exists idx_twilio_channel   on twilio_messages (channel);

alter table twilio_messages enable row level security;
drop policy if exists "service role full access" on twilio_messages;
create policy "service role full access" on twilio_messages
  for all using (true) with check (true);
