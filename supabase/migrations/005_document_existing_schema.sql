-- =============================================================================
-- 005 — Authoritative schema for every table the dashboard actually uses.
-- =============================================================================
--
-- WHY THIS FILE EXISTS
--
-- Migrations 001–004 had drifted badly from the live database:
--
--   * Six tables used by the app had no migration at all — they were created
--     by hand in the Supabase SQL editor and never written down:
--       meta_ads, social_followers, social_views,
--       hubspot_contacts, ghl_opportunities, operational_data, plan_targets
--
--   * Four tables were REBUILT with typed columns after 001/002 were written.
--     001/002 still describe them as single `row_data jsonb` blobs, which is
--     no longer true:
--       tableau_data, stripe_data, zendesk_data, pelagonia_data
--     The app reads typed columns from these (event_date, stripe_invoice_id,
--     zendesk_ticket_id, pelagonia_created_at), so the old definitions are
--     actively wrong, not merely incomplete.
--
-- This file is the single source of truth for the CURRENT shape of the
-- database. It was reconstructed from the code that reads and writes each
-- table — every column below is one that a processor in
-- src/lib/processors/ writes, or that src/app/api/data/latest/route.ts reads.
--
-- HOW TO APPLY IT
--
--   Existing database (production):  run this file. It is a pure no-op —
--     every statement is `if not exists` guarded, so nothing is created,
--     altered, or dropped. Running it changes no data. Its value is as a
--     written record and as a safety net for anything half-created by hand.
--
--   Fresh / rebuilt database:  run THIS FILE ALONE. Do not run 001–004
--     first. This file is complete and self-contained; 001–004 are kept only
--     as historical record and 001 in particular is destructive (see the
--     warning at the top of that file).
--
-- CONVENTIONS
--
--   batch_id      nullable, references upload_log(id). Nullable so a row can
--                 outlive the batch that created it, matching 004.
--   unique keys   present only where the app relies on them. The upload
--                 strategies in src/lib/upload-strategies.ts use
--                 `onConflict` for upsert sources, and a matching unique
--                 constraint is REQUIRED for those upserts to work:
--                   ghl_opportunities   → opportunity_id
--                   operational_data    → date
--                   stripe_data         → stripe_invoice_id
--                   zendesk_data        → zendesk_ticket_id
--                   social_followers    → (date, platform)
--                   social_views        → (date, platform)
--                   plan_targets        → month
--                   financial_revenue   → (date, revenue_type)   [in 004]
--                 Sources using fullReplace or dateRangeReplace deliberately
--                 have NO unique key: meta_ads, pelagonia_data,
--                 tableau_data, hubspot_contacts.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- upload_log — one row per ingest batch (CSV upload or automated sync).
-- Consolidates 001 + the 003 audit columns into one definition.
-- -----------------------------------------------------------------------------
create table if not exists upload_log (
  id                uuid         primary key default gen_random_uuid(),
  source            text         not null,
  record_count      integer      not null default 0,
  status            text         not null default 'pending',  -- pending | in_progress | complete | failed
  error             text,
  uploaded_at       timestamptz  not null default now(),
  -- audit columns (added by 003)
  uploaded_by       text,
  data_period_from  date,
  data_period_to    date,
  data_period_label text,
  file_name         text
);

-- Present for databases created by 001 before 003 was applied.
alter table upload_log
  add column if not exists uploaded_by       text,
  add column if not exists data_period_from  date,
  add column if not exists data_period_to    date,
  add column if not exists data_period_label text,
  add column if not exists file_name         text;

create index if not exists idx_upload_log_source_status
  on upload_log (source, status, uploaded_at desc);


-- -----------------------------------------------------------------------------
-- meta_ads — daily aggregate paid Meta performance.
-- Written by src/lib/processors/meta-processor.ts
-- Upload strategy: dateRangeReplace on `date` (no unique key by design).
-- NOTE: campaign-level totals only. No person-level data lands here.
-- -----------------------------------------------------------------------------
create table if not exists meta_ads (
  id                  bigserial     primary key,
  batch_id            uuid          references upload_log(id) on delete set null,
  date                date          not null,
  spend               numeric(14,2),
  impressions         integer,
  ctr                 numeric(10,4),
  clicks              integer,
  landing_page_views  integer,
  cost_per_lpv        numeric(14,4),
  conversions_leads   integer,
  cost_per_conversion numeric(14,4),
  video_views         integer,
  post_engagements    integer,
  inserted_at         timestamptz   not null default now()
);

create index if not exists idx_meta_ads_date on meta_ads (date desc);


-- -----------------------------------------------------------------------------
-- social_followers — follower-count snapshot per platform, stamped with the
-- date the sheet was uploaded.
-- Written by src/lib/processors/social-followers-processor.ts
-- Upload strategy: upsert on (date, platform) — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists social_followers (
  id          bigserial    primary key,
  batch_id    uuid         references upload_log(id) on delete set null,
  date        date         not null,
  platform    text         not null,
  followers   numeric(14,0),
  notes       text,
  inserted_at timestamptz  not null default now(),
  unique (date, platform)
);

create index if not exists idx_social_followers_date on social_followers (date desc);


-- -----------------------------------------------------------------------------
-- social_views — daily per-platform engagement counts.
-- Written by src/lib/processors/social-views-processor.ts
-- Upload strategy: upsert on (date, platform) — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists social_views (
  id               bigserial    primary key,
  batch_id         uuid         references upload_log(id) on delete set null,
  date             date         not null,
  platform         text         not null,
  page_views       numeric(14,0),
  video_views      numeric(14,0),
  post_engagements numeric(14,0),
  inserted_at      timestamptz  not null default now(),
  unique (date, platform)
);

create index if not exists idx_social_views_date on social_views (date desc);


-- -----------------------------------------------------------------------------
-- hubspot_contacts — member lifecycle / clinical-journey milestones.
-- Written by src/lib/processors/hubspot-contacts-processor.ts, which reads the
-- full ~434-column HubSpot export and keeps only the columns below.
--
-- PRIVACY: the processor holds a PII_LC blocklist and strips first name, last
-- name, email, and phone before anything reaches this table. There is
-- deliberately no name, email, or phone column here. Do not add one.
-- Upload strategy: fullReplace (snapshot) — no unique key by design.
-- -----------------------------------------------------------------------------
create table if not exists hubspot_contacts (
  id                                  bigserial    primary key,
  batch_id                            uuid         references upload_log(id) on delete set null,
  lifecycle_stage                     text         not null,
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
  last_test_date                      timestamptz,
  inserted_at                         timestamptz  not null default now()
);

create index if not exists idx_hubspot_contacts_create_date
  on hubspot_contacts (create_date desc);
create index if not exists idx_hubspot_contacts_lifecycle
  on hubspot_contacts (lifecycle_stage);


-- -----------------------------------------------------------------------------
-- ghl_opportunities — GoHighLevel sales pipeline.
-- Written by src/lib/processors/ghl-processor.ts
-- `source` is normalised there: anything starting "Facebook" collapses to
-- "meta" so paid-Meta attribution lines up with meta_ads.
-- Upload strategy: upsert on opportunity_id — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists ghl_opportunities (
  id                            bigserial    primary key,
  batch_id                      uuid         references upload_log(id) on delete set null,
  opportunity_id                text         not null unique,
  contact_id                    text,
  pipeline                      text,
  pipeline_id                   text,
  stage                         text,
  pipeline_stage_id             text,
  status                        text,
  source                        text,
  lead_value                    numeric(14,2),
  assigned                      text,
  created_on                    timestamptz,
  updated_on                    timestamptz,
  lost_reason_id                text,
  lost_reason_name              text,
  days_since_last_stage_change  integer,
  days_since_last_status_change integer,
  days_since_last_update        integer,
  inserted_at                   timestamptz  not null default now()
);

create index if not exists idx_ghl_opportunities_created_on
  on ghl_opportunities (created_on desc);
create index if not exists idx_ghl_opportunities_source
  on ghl_opportunities (source);


-- -----------------------------------------------------------------------------
-- operational_data — daily ops counters from TMRW_Operational_Data_Upload.xlsx
-- Written by src/lib/processors/operational-data-processor.ts
-- Columns are nullable on purpose: null means "no data yet for this future
-- date", which the dashboard renders differently from a real zero.
-- Upload strategy: upsert on date — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists operational_data (
  id                   bigserial    primary key,
  batch_id             uuid         references upload_log(id) on delete set null,
  date                 date         not null unique,
  customers_registered integer,
  total_casebook       integer,
  pod_created          integer,
  pod_dispatched       integer,
  churned_members      integer,
  inserted_at          timestamptz  not null default now()
);

create index if not exists idx_operational_data_date on operational_data (date desc);


-- -----------------------------------------------------------------------------
-- stripe_data — Stripe invoice export, keyed by invoice id.
-- Written by src/lib/processors/stripe-processor.ts
-- SUPERSEDES the `row_data jsonb` definition in 001.
-- Upload strategy: upsert on stripe_invoice_id — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists stripe_data (
  id                     bigserial    primary key,
  batch_id               uuid         references upload_log(id) on delete set null,
  stripe_invoice_id      text         not null unique,
  created                timestamptz  not null,
  effective_at           timestamptz,
  period_start           timestamptz,
  period_end             timestamptz,
  product                text,
  amount_due             numeric(14,2),
  amount_paid            numeric(14,2),
  amount_remaining       numeric(14,2),
  total                  numeric(14,2),
  total_excluding_tax    numeric(14,2),
  subtotal               numeric(14,2),
  subtotal_excluding_tax numeric(14,2),
  subscription_id        text,
  billing_reason         text,
  receipt_number         text,
  inserted_at            timestamptz  not null default now()
);

create index if not exists idx_stripe_data_created on stripe_data (created desc);


-- -----------------------------------------------------------------------------
-- zendesk_data — support tickets.
-- Written by src/lib/processors/zendesk-processor.ts
-- SUPERSEDES the `row_data jsonb` definition in 001.
-- Time fields are stored as whole minutes. status / priority are lowercased
-- but NOT constrained — the processor deliberately keeps unrecognised values
-- rather than silently dropping signal, so a check constraint would reject
-- rows the app expects to accept.
-- Upload strategy: upsert on zendesk_ticket_id — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists zendesk_data (
  id                           bigserial    primary key,
  batch_id                     uuid         references upload_log(id) on delete set null,
  zendesk_ticket_id            text         not null unique,
  zendesk_created_at           timestamptz,
  status                       text,
  priority                     text,
  assignee                     text,
  group_name                   text,
  subject                      text,
  first_reply_time_minutes     integer,
  full_resolution_time_minutes integer,
  satisfaction_score           integer,
  inserted_at                  timestamptz  not null default now()
);

create index if not exists idx_zendesk_data_created_at
  on zendesk_data (zendesk_created_at desc);


-- -----------------------------------------------------------------------------
-- tableau_data — one row per measure event, from the Tableau extract.
-- Written by src/lib/processors/tableau-processor.ts
-- SUPERSEDES the `row_data jsonb` definition in 001.
-- measure_value is intentionally text — the extract mixes numeric and
-- categorical measures in one column.
-- Upload strategy: fullReplace — no unique key by design.
-- -----------------------------------------------------------------------------
create table if not exists tableau_data (
  id            bigserial    primary key,
  batch_id      uuid         references upload_log(id) on delete set null,
  member_id     text         not null,
  measure_name  text         not null,
  measure_value text,
  case_status   text,
  person_type   text,
  event_date    timestamptz,
  inserted_at   timestamptz  not null default now()
);

create index if not exists idx_tableau_data_event_date on tableau_data (event_date desc);
create index if not exists idx_tableau_data_member on tableau_data (member_id);


-- -----------------------------------------------------------------------------
-- pelagonia_data — Pelagonia (GoHighLevel) opportunities AND appointments in
-- one flat table, discriminated by record_type.
-- Written by src/lib/processors/pelagonia-processor.ts
-- SUPERSEDES the `row_data jsonb` definition in 002.
-- Upload strategy: dateRangeReplace on pelagonia_created_at — no unique key.
-- -----------------------------------------------------------------------------
create table if not exists pelagonia_data (
  id                   bigserial    primary key,
  batch_id             uuid         references upload_log(id) on delete set null,
  pelagonia_record_id  text         not null,
  record_type          text         not null,  -- 'opportunity' | 'appointment'
  pelagonia_created_at timestamptz,
  appointment_date     timestamptz,
  status               text,
  pipeline_stage       text,
  calendar_name        text,
  source               text,
  assigned_user        text,
  value                numeric(14,2),
  inserted_at          timestamptz  not null default now()
);

create index if not exists idx_pelagonia_data_created_at
  on pelagonia_data (pelagonia_created_at desc);
create index if not exists idx_pelagonia_data_record_type
  on pelagonia_data (record_type);


-- -----------------------------------------------------------------------------
-- plan_targets — admin-entered monthly plan/budget targets.
-- Read and written by src/app/api/plan-targets/route.ts (upsert on month).
-- One row per month; `month` is always normalised to the first of the month.
-- Upload strategy: upsert on month — unique key REQUIRED.
-- -----------------------------------------------------------------------------
create table if not exists plan_targets (
  id                   bigserial    primary key,
  month                date         not null unique,  -- always YYYY-MM-01
  registrations_target numeric(14,2),
  gross_revenue_target numeric(14,2),
  net_revenue_target   numeric(14,2),
  mrr_target           numeric(14,2),
  ltv_assumed          numeric(14,2),
  updated_at           timestamptz  not null default now()
);


-- -----------------------------------------------------------------------------
-- priorities_log — EOS weekly priorities. Append-only; the app reads the most
-- recent row by uploaded_at.
-- Read and written by src/app/api/priorities/route.ts
-- -----------------------------------------------------------------------------
create table if not exists priorities_log (
  id          bigserial    primary key,
  week_of     date         not null,
  data        jsonb        not null,
  uploaded_at timestamptz  not null default now()
);

create index if not exists idx_priorities_log_uploaded_at
  on priorities_log (uploaded_at desc);


-- -----------------------------------------------------------------------------
-- financial_revenue — defined in 004; that definition is still accurate, so it
-- is not repeated here. Included in the RLS loop below so this file leaves
-- every table in a consistent state.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- Row Level Security
--
-- Every table is RLS-enabled with a single "service role full access" policy,
-- matching the convention from 001. All app access goes through the service
-- role in API routes (src/lib/supabase/service.ts), never from the browser.
-- The anon key cannot read these tables.
--
-- Postgres has no `create policy if not exists`, so the policy is created only
-- when absent. Re-running this block is safe and changes nothing.
-- =============================================================================
do $$
declare
  tbl text;
  managed text[] := array[
    'upload_log',
    'meta_ads',
    'social_followers',
    'social_views',
    'hubspot_contacts',
    'ghl_opportunities',
    'operational_data',
    'stripe_data',
    'zendesk_data',
    'tableau_data',
    'pelagonia_data',
    'plan_targets',
    'priorities_log',
    'financial_revenue'
  ];
begin
  foreach tbl in array managed loop
    -- Skip anything not present (e.g. financial_revenue if 004 was not run).
    if exists (
      select 1 from pg_tables
      where schemaname = 'public' and tablename = tbl
    ) then
      execute format('alter table public.%I enable row level security', tbl);

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = tbl
          and policyname = 'service role full access'
      ) then
        execute format(
          'create policy "service role full access" on public.%I for all using (true) with check (true)',
          tbl
        );
      end if;
    end if;
  end loop;
end $$;
