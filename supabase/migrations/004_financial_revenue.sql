-- Financial revenue from the Stripe workbook (Net Revenue + Gross Revenue (RRP) sheets).
-- Long format: one row per day per revenue_type. Values are in DOLLARS.
-- Only daily rows are stored — monthly subtotals, blank rows, and the grand-total
-- row from the workbook are derived in the dashboard, never persisted.
create table if not exists financial_revenue (
  id              bigserial    primary key,
  date            date         not null,
  revenue_type    text         not null check (revenue_type in ('net', 'gross')),
  membership      numeric(14,2) not null default 0,
  joining_fees    numeric(14,2) not null default 0,
  tmrw_stacks     numeric(14,2) not null default 0,
  supplements     numeric(14,2) not null default 0,
  peptides        numeric(14,2) not null default 0,
  advanced_tests  numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  inserted_at     timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),
  -- one row per day per type; lets re-uploads upsert instead of duplicating
  unique (date, revenue_type)
);

create index if not exists idx_financial_revenue_date on financial_revenue (date);

-- Match the RLS convention from migration 001
alter table financial_revenue enable row level security;
create policy "service role full access" on financial_revenue
  for all using (true) with check (true);
