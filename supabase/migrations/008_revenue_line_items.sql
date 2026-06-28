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
