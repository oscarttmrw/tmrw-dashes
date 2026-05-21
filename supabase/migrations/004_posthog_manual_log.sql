-- PostHog manual inputs: latest-wins log keyed by insertion time.
-- Mirrors the priorities_log pattern (jsonb blob, read most recent row).
create table if not exists posthog_manual_log (
  id              bigserial primary key,
  registrations   integer,
  churned_members integer,
  total_casebook  integer,
  uploaded_by     text,
  uploaded_at     timestamptz not null default now()
);

create index if not exists posthog_manual_log_uploaded_at_idx
  on posthog_manual_log (uploaded_at desc);
