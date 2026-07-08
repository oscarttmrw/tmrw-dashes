-- ============================================================================
-- APPLY_006-010.sql — consolidated migration bundle (generated from 006–010)
-- Run this in the Supabase SQL Editor for project jacrioszqpkehizbiqbg.
-- Every statement is idempotent; running the whole file is prod-safe.
-- Order matters: 006 → 007 → 008 → 009 → 010 (preserved below).
-- ============================================================================

-- ▼▼▼ 006_reconcile_schema.sql ▼▼▼
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

-- ▲▲▲ end 006_reconcile_schema.sql ▲▲▲

-- ▼▼▼ 007_drop_legacy_tables.sql ▼▼▼
-- 007_drop_legacy_tables.sql
-- Remove tables that no migration and no application code reference. Confirmed
-- empty (0 rows) and unrecognised — leftover experiments, not part of this app.
drop table if exists organisations;
drop table if exists countries;

-- ▲▲▲ end 007_drop_legacy_tables.sql ▲▲▲

-- ▼▼▼ 008_revenue_line_items.sql ▼▼▼
-- 008_revenue_line_items.sql
-- New revenue source: Stripe invoice line items, sourced from Snowflake.
-- Replaces the two-sheet Net/Gross financial_revenue upload — each line now
-- carries BOTH gross and net, so the dashboard derives the gross/net split,
-- the product-category breakdown, and the recurring/non-recurring split from a
-- single row. Amounts are in DOLLARS.

-- ---------------------------------------------------------------------------
-- product_category_map — product name -> revenue category -> recurring flag.
-- Seeded from the TMRW product mapping workbook. recurring is a property of the
-- category but stored per-row for convenient joins. Re-running re-seeds.
-- ---------------------------------------------------------------------------
create table if not exists product_category_map (
  product_name text primary key,
  category     text not null check (category in (
    'subscription','joining_fee','supplements','peptides',
    'tmrw_stacks','advanced_tests','appointments'
  )),
  recurring    boolean not null,
  updated_at   timestamptz not null default now()
);

alter table product_category_map enable row level security;
drop policy if exists "service role full access" on product_category_map;
create policy "service role full access" on product_category_map
  for all using (true) with check (true);

insert into product_category_map (product_name, category, recurring) values
  ('7-Keto DHEA Capsule 25mg 60 x Capsules', 'supplements', true),
  ('Advanced Gut Microbiome Test', 'advanced_tests', false),
  ('Advanced Hormone Test', 'advanced_tests', false),
  ('Alex Peptide Protocol', 'peptides', true),
  ('Arctic Cod Liver Oil Capsules', 'supplements', true),
  ('Arctic Cod Liver Oil Liquid', 'supplements', true),
  ('Baseline Plan', 'subscription', true),
  ('Better TMRW Medical Plan', 'subscription', true),
  ('Bifido Complex', 'supplements', true),
  ('BioScreen Faecan Microbial Analysis', 'advanced_tests', false),
  ('BrainScan Blood Test', 'advanced_tests', false),
  ('Buffered Magnesium Glycinate', 'supplements', true),
  ('Clinician Recommended Plan', 'subscription', true),
  ('D3 + MK-7', 'supplements', true),
  ('Digest Premium', 'supplements', true),
  ('Florencia (Cinzia) Sibo Basic Test', 'advanced_tests', false),
  ('GHK-Cu 10mg/mL 5ml Vial Injection Vial', 'peptides', true),
  ('HCG 3750iu/ml 5ml', 'peptides', true),
  ('Humanli Membership', 'subscription', true),
  ('Initial Appointment - Dr Chris Chappel', 'appointments', false),
  ('Joining Fee - Evolve Membership', 'joining_fee', false),
  ('Ketone Ester Drink', 'supplements', true),
  ('Liposomal Methyl B12', 'supplements', true),
  ('Micronised Creatine Monohydrate', 'supplements', true),
  ('Mounjaro 10mg/0.6ml', 'peptides', true),
  ('Mounjaro 12.5mg/0.6ml', 'peptides', true),
  ('Mounjaro KwikPen 2.5mg/week 2.4mL pen Injection Pen', 'peptides', true),
  ('Naltrexone HCL 1.5mg Capsule', 'peptides', true),
  ('Nicholas Monthly Membership + Gi360', 'advanced_tests', false),
  ('OneMRI Full-Body Scan', 'advanced_tests', false),
  ('Orthoplex Glycine Powder', 'supplements', true),
  ('Paul Hines Peptide Therapy', 'peptides', true),
  ('Primoteston Depot 250mg/ml x12 pre-filled Syringe', 'peptides', true),
  ('Pro8-50 Plus', 'supplements', true),
  ('ProBiosis', 'supplements', true),
  ('ProdromeScan Blood Test', 'advanced_tests', false),
  ('ProOmega Capsules', 'supplements', true),
  ('ProOmega Liquid', 'supplements', true),
  ('Sleep, designed by Doctors', 'tmrw_stacks', true),
  ('Sleep, designed by Doctors (Prescription)', 'tmrw_stacks', true),
  ('Tadalafil 5mg Tablet', 'supplements', true),
  ('Testosterone 30mg Troche', 'peptides', true),
  ('TMRW Daily Sachets - Monthly supply', 'supplements', true),
  ('TMRW Daily Sachets - Quarterly (3-month supply)', 'supplements', true),
  ('TMRW Joining Fee', 'joining_fee', false),
  ('TMRW Monthly Fee', 'subscription', true),
  ('TMRW Monthly Membership (No Pods)', 'subscription', true),
  ('Tru Niagen 300mg', 'supplements', true),
  ('VIP Clinician Treatment', 'advanced_tests', false),
  ('Vitaly: Orthoplex + Probiotics', 'supplements', true),
  ('Your Personalised Supplement Precision Pods', 'subscription', true)
on conflict (product_name) do update
  set category = excluded.category,
      recurring = excluded.recurring,
      updated_at = now();

-- ---------------------------------------------------------------------------
-- stripe_line_items — raw Stripe invoice line items from the Snowflake export.
-- Full-replace on each upload (the export is cumulative-to-date), so there is
-- no natural per-line unique key to upsert on.
-- ---------------------------------------------------------------------------
create table if not exists stripe_line_items (
  id                   bigserial primary key,
  batch_id             uuid references upload_log(id) on delete cascade,
  transaction_date     date not null,
  product_name         text not null,
  gross_line_amount    numeric(14,2),
  discount_line_amount numeric(14,2),
  charged_line_amount  numeric(14,2),
  allocated_stripe_fee numeric(14,2),
  net_line_amount      numeric(14,2),
  coupon_name          text,
  inserted_at          timestamptz not null default now()
);

create index if not exists idx_stripe_line_items_date    on stripe_line_items (transaction_date);
create index if not exists idx_stripe_line_items_product on stripe_line_items (product_name);

alter table stripe_line_items enable row level security;
drop policy if exists "service role full access" on stripe_line_items;
create policy "service role full access" on stripe_line_items
  for all using (true) with check (true);

-- ▲▲▲ end 008_revenue_line_items.sql ▲▲▲

-- ▼▼▼ 009_zendesk_schema.sql ▼▼▼
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

-- ▲▲▲ end 009_zendesk_schema.sql ▲▲▲

-- ▼▼▼ 010_hubspot_milestones.sql ▼▼▼
-- 010_hubspot_milestones.sql
-- Add the member-journey milestone fields from Dan's new HubSpot CRM export
-- ("prove it works" dataset). hubspot_contacts is a full-replace source, so
-- adding columns is additive — existing rows read null until the next upload.
--
-- Notes:
--   * escript_sent_at is a DATE (the export now carries "eScript Sent At"),
--     kept alongside the legacy boolean escript_sent for back-compat.
--   * hubspot_record_id stores the export's "Record ID" — a stable member key
--     for later linking (e.g. CSAT → member).

alter table hubspot_contacts
  add column if not exists hubspot_record_id                 text,
  add column if not exists escript_sent_at                   timestamptz,
  add column if not exists blood_requisition_sent_date       timestamptz,
  add column if not exists blood_dashboard_published_date    timestamptz,
  add column if not exists xp_shipped_date                   timestamptz,
  add column if not exists epi_results_received_date         timestamptz,
  add column if not exists pp_shipped_date                   timestamptz,
  add column if not exists medical_plan_sent_at              timestamptz,
  add column if not exists retest_blood_requisition_sent_date timestamptz,
  add column if not exists retest_blood_results_received_date timestamptz,
  add column if not exists retest_epi_results_back_date      timestamptz,
  add column if not exists retest_dashboard_published_date   timestamptz;

-- ▲▲▲ end 010_hubspot_milestones.sql ▲▲▲

