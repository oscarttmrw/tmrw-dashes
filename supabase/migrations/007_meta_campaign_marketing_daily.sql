-- 1. Campaign-level columns on meta_ads.
--
-- The warehouse Meta extract is one row per ad per day rather than one row per
-- day, so it carries campaign / ad set / ad identity plus reach, leads and pixel
-- conversions. All added nullable: existing day-level rows keep working with
-- nulls, and every tile that sums over meta_ads is unaffected by the finer
-- granularity. The dateRangeReplace write strategy on `date` already handles
-- re-uploading a window at either granularity.
alter table meta_ads add column if not exists ad_id                   text;
alter table meta_ads add column if not exists campaign_name           text;
alter table meta_ads add column if not exists ad_set_name             text;
alter table meta_ads add column if not exists ad_name                 text;
alter table meta_ads add column if not exists campaign_objective      text;
alter table meta_ads add column if not exists reach                   integer;
alter table meta_ads add column if not exists pixel_custom_conversions integer;
alter table meta_ads add column if not exists frequency               numeric(12,4);
alter table meta_ads add column if not exists inline_link_click_ctr   numeric(12,4);

create index if not exists idx_meta_ads_campaign on meta_ads (campaign_name);

-- 2. Integrated marketing daily metrics.
--
-- The numbers Meta cannot supply: calls booked/held/closed off Slack
-- notifications, and landing/checkout funnel counts off PostHog.
--
-- Only `date` is NOT NULL. Every metric is nullable and stays null when absent,
-- so the dashboard can distinguish "not instrumented yet" from a real zero —
-- cart starts especially, which the current reporting flags as uninstrumented.
create table if not exists marketing_daily (
  id                     bigserial   primary key,
  batch_id               uuid        references upload_log(id) on delete cascade,
  date                   date        not null,
  -- Calls. Meta's attributed number and the Slack-logged number are kept
  -- separate rather than reconciled: they count different things (Meta counts
  -- attributed bookings, Slack counts every call a clinician logged), and the
  -- gap between them is itself worth seeing.
  calls_booked_meta      integer,
  calls_booked_slack     integer,
  calls_held             integer,
  closes                 integer,
  -- Signups, plus the expected figure so the tile can show actual vs expected.
  signups                integer,
  signups_expected       integer,
  -- PostHog funnel.
  landing_checkout_views integer,
  checkout_cart_views    integer,
  cart_starts            integer,
  checkout_abandonments  integer,
  conversions            integer,
  inserted_at            timestamptz not null default now(),
  -- One row per day, so a re-upload upserts instead of duplicating.
  unique (date)
);

create index if not exists idx_marketing_daily_date on marketing_daily (date);

-- Match the RLS convention from migration 001
alter table marketing_daily enable row level security;
create policy "service role full access" on marketing_daily
  for all using (true) with check (true);
