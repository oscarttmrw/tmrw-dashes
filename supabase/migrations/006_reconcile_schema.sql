-- 006_reconcile_schema.sql
-- Brings the migration history in line with tables that were created by hand in
-- the Supabase dashboard and never committed. Mirrors the LIVE column types and
-- constraints captured from information_schema on 2026-06-28.
--
-- Safe to run against the live database:
--   * every CREATE TABLE uses IF NOT EXISTS, so existing populated tables are
--     left untouched (this file only "creates" them for a from-scratch rebuild).
--   * the RLS/policy block is idempotent (drop policy if exists → create).
--   * the ONLY change this applies to the live DB is adding the missing
--     plan_targets.ltv_assumed column (see note below).

-- ---------------------------------------------------------------------------
-- meta_ads — daily Meta Ads aggregate (one row per day)
-- ---------------------------------------------------------------------------
create table if not exists meta_ads (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid references upload_log(id) on delete cascade,
  date                date not null unique,
  spend               numeric,
  impressions         integer,
  ctr                 numeric,
  clicks              integer,
  landing_page_views  integer,
  cost_per_lpv        numeric,
  conversions_leads   integer,
  cost_per_conversion numeric,
  video_views         integer,
  post_engagements    integer,
  inserted_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- social_followers — follower snapshots stamped with the upload date
-- ---------------------------------------------------------------------------
create table if not exists social_followers (
  id          bigserial primary key,
  batch_id    uuid references upload_log(id) on delete cascade,
  date        date not null,
  platform    text not null,
  followers   numeric,
  notes       text,
  inserted_at timestamptz not null default now(),
  unique (date, platform)
);

-- ---------------------------------------------------------------------------
-- social_views — daily per-platform view/engagement aggregate
-- ---------------------------------------------------------------------------
create table if not exists social_views (
  id               bigserial primary key,
  batch_id         uuid references upload_log(id) on delete cascade,
  date             date not null,
  platform         text not null,
  page_views       numeric,
  video_views      numeric,
  post_engagements numeric,
  inserted_at      timestamptz not null default now(),
  unique (date, platform)
);

-- ---------------------------------------------------------------------------
-- hubspot_contacts — canonical HubSpot contact snapshot (full-replace source)
-- ---------------------------------------------------------------------------
create table if not exists hubspot_contacts (
  id                                  bigserial primary key,
  batch_id                            uuid not null references upload_log(id) on delete cascade,
  inserted_at                         timestamptz not null default now(),
  lifecycle_stage                     text,
  customer_type                       text,
  customer_entered_at                 timestamptz,
  close_date                          timestamptz,
  create_date                         timestamptz,
  membership_status                   text,
  membership_start_date               timestamptz,
  churn_date                          timestamptz,
  churn_reason                        text,
  cancel_at_period_end                boolean,
  stripe_subscription_id              text,
  subscription_type                   text,
  subscription_renewal_date           timestamptz,
  oracle_member_id                    text,
  escript_sent                        boolean,
  health_story_status                 text,
  health_story_completed_date         timestamptz,
  customised_pods_sent                boolean,
  cp_order_date                       timestamptz,
  cp_shipped_date                     timestamptz,
  personalised_pods_shipped           boolean,
  blood_results_received              boolean,
  blood_draw_date                     timestamptz,
  blood_dashboard_published           boolean,
  clinician_review_ready_date         timestamptz,
  results_available_date              timestamptz,
  results_extracted_to_oracle         boolean,
  epigenetics_dashboard_unlocked      boolean,
  epigenetics_dashboard_unlocked_date timestamptz,
  dashboard_unlocked                  boolean,
  dashboard_unlocked_date             timestamptz,
  last_activity_date                  timestamptz,
  last_test_date                      timestamptz
);

-- ---------------------------------------------------------------------------
-- ghl_opportunities — GoHighLevel opportunities (dedup by opportunity_id)
-- ---------------------------------------------------------------------------
create table if not exists ghl_opportunities (
  opportunity_id                text primary key,
  contact_id                    text,
  pipeline                      text,
  pipeline_id                   text,
  stage                         text,
  pipeline_stage_id             text,
  status                        text,
  source                        text,
  lead_value                    numeric,
  assigned                      text,
  created_on                    timestamptz,
  updated_on                    timestamptz,
  lost_reason_id                text,
  lost_reason_name              text,
  days_since_last_stage_change  integer,
  days_since_last_status_change integer,
  days_since_last_update        integer,
  batch_id                      uuid not null references upload_log(id) on delete cascade,
  inserted_at                   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- operational_data — daily operational counts (upsert by date)
-- ---------------------------------------------------------------------------
create table if not exists operational_data (
  date                  date primary key,
  customers_registered  integer default 0,
  total_casebook        integer default 0,
  pod_created           integer default 0,
  pod_dispatched        integer default 0,
  churned_members       integer default 0,
  batch_id              uuid not null references upload_log(id) on delete cascade,
  inserted_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- plan_targets — admin-managed monthly targets (upsert by month)
-- ---------------------------------------------------------------------------
create table if not exists plan_targets (
  month                date primary key,
  registrations_target integer,
  gross_revenue_target numeric,
  net_revenue_target   numeric,
  mrr_target           numeric,
  ltv_assumed          numeric,
  updated_at           timestamptz not null default now()
);

-- The live plan_targets table predates the ltv_assumed field that
-- POST /api/plan-targets now writes, so saving a target currently errors with
-- "column ltv_assumed does not exist". This is the one real change 006 applies
-- to the live DB.
alter table plan_targets add column if not exists ltv_assumed numeric;

-- ---------------------------------------------------------------------------
-- RLS — match the "service role full access" convention from migration 001.
-- Idempotent so it is safe whether or not the table already had RLS/policy.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'meta_ads','social_followers','social_views','hubspot_contacts',
    'ghl_opportunities','operational_data','plan_targets'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "service role full access" on %I', t);
    execute format(
      'create policy "service role full access" on %I for all using (true) with check (true)',
      t
    );
  end loop;
end $$;
