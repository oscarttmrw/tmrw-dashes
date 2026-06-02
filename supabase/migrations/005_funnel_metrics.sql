-- GHL funnel metrics — monthly summary from the GoHighLevel CRM (delivered on
-- the "Funnel Metrics" sheet of the marketing workbook). One row per month.
-- Counts are integers; value is in DOLLARS; win_pct / call_conversion_rate are
-- percentages (e.g. 11.40 = 11.4%).
create table if not exists funnel_metrics (
  id                    bigserial    primary key,
  batch_id              uuid         references upload_log(id) on delete cascade,
  month                 date         not null,
  total_leads           integer,
  booked_calls          integer,
  held_calls            integer,
  won_opportunities     integer,
  won_value             numeric(14,2),
  win_pct               numeric(6,2),
  call_conversion_rate  numeric(6,2),
  showed_appointments   integer,
  no_show_appointments  integer,
  upcoming_appointments integer,
  inserted_at           timestamptz  not null default now(),
  -- one row per month; lets re-uploads upsert instead of duplicating
  unique (month)
);

create index if not exists idx_funnel_metrics_month on funnel_metrics (month);

-- Match the RLS convention from migration 001
alter table funnel_metrics enable row level security;
create policy "service role full access" on funnel_metrics
  for all using (true) with check (true);
