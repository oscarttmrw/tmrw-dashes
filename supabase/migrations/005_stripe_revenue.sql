-- Stripe revenue at line-item granularity, plus the product → category map that
-- classifies it. Replaces the hand-maintained Net/Gross workbook sheets as the
-- primary revenue feed; financial_revenue stays for reconciliation.
--
-- The revenue ladder, mirroring the CH Summary workbook:
--   gross_amount    list price before discounts (the workbook's RRP gross)
--   discount_amount coupons / comped value
--   charged_amount  gross - discount. The workbook calls this "Net", and it is
--                   what the dashboard's Net tile shows.
--   stripe_fee      allocated Stripe processing fee
--   net_after_fee   charged - fee (the export's own NET_LINE_AMOUNT)
-- Ex-GST net is derived in the dashboard as net / 1.1, matching the workbook's
-- "Net / 11" GST convention. Values are in DOLLARS.
--
-- mapping_category and revenue_class are deliberately NOT stored here — they are
-- joined from product_category_map at read time, so re-uploading the Mapping tab
-- re-categorises history with no backfill.
create table if not exists stripe_revenue_lines (
  id                     bigserial     primary key,
  batch_id               uuid          references upload_log(id) on delete cascade,
  transaction_date       date          not null,
  product_id             text,
  product_name           text          not null,
  gross_amount           numeric(14,2) not null default 0,
  discount_amount        numeric(14,2) not null default 0,
  charged_amount         numeric(14,2) not null default 0,
  stripe_fee             numeric(14,2) not null default 0,
  net_after_fee          numeric(14,2) not null default 0,
  coupon_name            text,
  -- Present only on the 57-column "Line Items" export; null on the 8-column CSV.
  line_id                text,
  transaction_id         text,
  record_type            text,
  is_refund              boolean       not null default false,
  is_subscription_charge boolean,
  billing_reason         text,
  quantity               numeric(12,2),
  currency               text,
  member_email           text,
  subscription_id        text,
  subscription_status    text,
  inserted_at            timestamptz   not null default now()
);

create index if not exists idx_stripe_revenue_lines_date on stripe_revenue_lines (transaction_date);
create index if not exists idx_stripe_revenue_lines_product on stripe_revenue_lines (product_name);
create index if not exists idx_stripe_revenue_lines_product_id on stripe_revenue_lines (product_id);

-- Product → revenue-category map, from the workbook's Mapping tab. Full-replaced
-- on every upload so removing a row in the sheet removes it here.
--
-- Two lookup keys per row: product_id (exact, used when the export carries it)
-- and product_name_key (lower/trimmed, the fallback for the 8-column CSV).
create table if not exists product_category_map (
  id               bigserial   primary key,
  batch_id         uuid        references upload_log(id) on delete cascade,
  product_id       text,
  product_name_key text,
  product_name     text,
  category         text        not null,
  revenue_class    text        not null check (revenue_class in ('recurring', 'one_off')),
  inserted_at      timestamptz not null default now()
);

create index if not exists idx_product_category_map_product_id on product_category_map (product_id);
create index if not exists idx_product_category_map_name_key on product_category_map (product_name_key);

-- Match the RLS convention from migration 001. The policy is dropped first so
-- the whole migration is safe to re-run (create policy has no IF NOT EXISTS).
alter table stripe_revenue_lines enable row level security;
drop policy if exists "service role full access" on stripe_revenue_lines;
create policy "service role full access" on stripe_revenue_lines
  for all using (true) with check (true);

alter table product_category_map enable row level security;
drop policy if exists "service role full access" on product_category_map;
create policy "service role full access" on product_category_map
  for all using (true) with check (true);
