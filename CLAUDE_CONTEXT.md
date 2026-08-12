# TMRW Operating Dashboard — Agent Handoff Context

> Give this file to the next Claude Code session at the start of the conversation.
> Working directory: `/home/user/tmrw-dashes`
> Rewritten against `src/` as of the Dan-data implementation (Aug 2026). **`src/` is the only
> source of truth** — if this file and the code disagree, the code is right and this file is stale.

---

## What This Project Is

A Next.js 14 internal operating dashboard for **TMRW Health** (a longevity / preventative health
company). It replaces manual spreadsheet reporting with a live, data-connected dashboard. Data
enters via CSV/XLSX upload through `/admin/upload`; a Snowflake daily pipeline is the future target.
Invite-only, protected by Supabase Auth.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, `src/` directory |
| Styling | Tailwind CSS, design tokens in `src/app/globals.css` |
| Auth | Supabase SSR (`@supabase/ssr`) — PKCE flow |
| Database | Supabase (Postgres), typed columns per source |
| Hosting | Vercel |
| Charts | Recharts |
| Parsing | PapaParse (CSV), `xlsx` (workbooks) |
| Verification | `tsx` scripts under `scripts/` |

---

## Data Sources (16 upload keys)

Registered in `src/lib/config/data-sources.ts` (`dataSourceSchemas`, line ~560).

| Source key | Table | Write strategy | Date column | Notes |
|---|---|---|---|---|
| `tableau` | `tableau_data` | fullReplace | — | |
| `hubspot_contacts` | `hubspot_contacts` | fullReplace | — | ~434-col export, ~31 mapped |
| `ghl_opportunities` | `ghl_opportunities` | upsert `opportunity_id` | `created_on` | |
| `operational_data` | `operational_data` | upsert `date` | `date` | xlsx, `Sheet2`, Excel serials |
| `stripe` | `stripe_data` | upsert `stripe_invoice_id` | `created` | Invoice-level (legacy) |
| **`stripe_revenue`** | `stripe_revenue_lines` | dateRangeReplace `transaction_date` | `transaction_date` | **Line-item level — primary revenue feed** |
| **`product_category_map`** | `product_category_map` | fullReplace | — | Workbook Mapping tab; routes by sheet name |
| `zendesk` | `zendesk_data` | upsert `zendesk_ticket_id` | — | Explore report export (legacy) |
| **`zendesk_tickets`** | `zendesk_tickets` | dateRangeReplace `created_at` | `created_at` | **Warehouse extract — powers /support** |
| `meta_ads` | `meta_ads` | dateRangeReplace `date` | `date` | Accepts **both** the day-level sheet and the per-ad warehouse extract |
| **`marketing_daily`** | `marketing_daily` | upsert `date` | `date` | Integrated Slack + PostHog metrics |
| `social_followers` | `social_followers` | upsert `date,platform` | `date` | Date stamped at upload |
| `social_views` | `social_views` | upsert `date,platform` | `date` | |
| `pelagonia` | `pelagonia_data` | dateRangeReplace | `pelagonia_created_at` | |
| `financial_revenue_net` | `financial_revenue` | delete-by-`revenue_type` + insert | `date` | Manual workbook sheet |
| `financial_revenue_gross` | `financial_revenue` | same | `date` | Manual workbook sheet |

Column validation is **case-insensitive** on both client and server. A required column may be a
single name or an array of accepted variants (`validateRequiredColumns`, data-sources.ts ~line 610).
Auto-detection returns `null` unless **exactly one** schema fully validates, so schemas must stay
mutually distinguishable — `stripe` vs `stripe_revenue` and `zendesk` vs `zendesk_tickets` are
deliberately disjoint on their required columns.

### Adding a data source — 9 steps the code enforces

Miss any one and data silently never arrives:

1. `src/lib/types/data-sources.ts` — add to `DataSourceName`.
2. `src/lib/config/data-sources.ts` — the `CsvSchema` + register in `dataSourceSchemas`; a
   `DataSourceConfig` (label, `exportSteps`, `poweredMetrics`) in `dataSourceConfigs`.
3. `src/lib/processors/<name>-processor.ts` — return `ProcessorResult`, export a
   `process…ToCanonical` alias, lc-normalise headers first.
4. A Supabase migration — typed columns, `batch_id uuid references upload_log(id) on delete cascade`,
   any unique constraint the write strategy needs, RLS + the `"service role full access"` policy.
5. `src/app/api/data/upload/route.ts` — `SourceKey`, `SOURCE_TABLE`, `SOURCE_DATE_COLUMN`,
   `SOURCE_PROCESSOR`, **and a `case` in `applyWriteStrategy`** (the switch has no `default`, so a
   missing case writes nothing and still reports success).
6. `src/app/api/data/latest/route.ts` — `SourceKey`, `SOURCE_TABLE`, `SOURCE_ORDER_COLUMN`, `sources`.
7. `src/lib/context/data-context.tsx` — `DashboardData`, `emptyLastRefresh`, `defaultData`, and the
   `asRows(body.<key>)` line in `refresh()`.
8. `src/app/(dashboard)/admin/upload/page.tsx` — `SourceKey`, `VALID_SOURCES`, `DATE_COL` (**raw
   header name**, not canonical), `REFRESH_KEY`, and `SHEET_NAME_TO_SOURCE` if it routes by sheet.
9. `src/components/dashboard/data-source-badge.tsx` — add the key so the badge isn't neutral.

---

## Analytics modules (`src/lib/analytics/`)

Pure functions over `CanonicalRow[]`. Pages import these rather than computing inline, so a page and
its printable report can't drift.

- **`revenue-metrics.ts`** — the revenue ladder, category rollups, recurring split, unmapped
  products, reconciliation against the manual workbook.
- **`support-metrics.ts`** — ticket volume, channel mix, response-time stats, queues, backlog.
- **`marketing-metrics.ts`** — Meta spend metrics, call funnel with source provenance, campaign
  breakdown, monthly detail.

### The revenue ladder (mirrors Dan's CH Summary workbook)

```
gross      list price before discounts (RRP)
discount   coupons / comped value
charged    gross − discount   ← the workbook calls this "Net", and it is what
                                the dashboard's Net tile shows
fee        allocated Stripe processing fee
net        charged − fee (the export's NET_LINE_AMOUNT)
exGstNet   charged / 1.1, matching the workbook's "Tax = Net / 11"
```

**Category and recurring/one-off are resolved at read time**, joining `product_category_map`, not
stamped at upload. Re-uploading the Mapping tab therefore re-categorises all history with no
backfill, and a product that falls out of the map surfaces as `Unmapped` rather than being frozen
into whatever the map said on ingest day.

One-off = Joining Fee Revenue, Attach products - Off-the-shelf supplements, Attach products -
Advanced tests. Everything else recurring. Overridable per product via an optional `Revenue Class`
column on the Mapping tab.

**Recurring % is measured against TOTAL gross**, so recurring + one-off + unmapped sums to 100% and
the figure can never be flattered by an unmapped product. `recurringPctOfClassified` is available as
a secondary and is shown only where something is unmapped.

### Timezone: this is load-bearing

Warehouse extracts land in **UTC**; the business reports in **Australia/Sydney**. Bucketing UTC
timestamps by their UTC date under-counts — 1–5 Aug 2026 reads 260 tickets in Sydney and 253 in UTC,
and July reads 1,098 vs 1,095. Always route timestamped values through `sydneyDayKey` from
`src/lib/utils/period.ts`. Date-only columns (`transaction_date`, `date`) are compared as day
strings and need no conversion.

---

## Period toolkit (`src/lib/utils/period.ts`)

The comparison primitives every page shares. `previousPeriod()` in the date picker only shifts by
range length, which is wrong for partial months — Aug 1–12 would compare against Jul 20–31.

```ts
sydneyDayKey / sydneyMonthKey    // YYYY-MM-DD / YYYY-MM in Sydney
weekToDate(ref)                  // Monday 00:00 → ref
fullWeek(ref)                    // the Mon–Sun week containing ref
previousWeekSameSpan(range)      // same weekdays, −7d (NOT the preceding 7 days)
samePeriodLastMonth(range)       // Aug 1–12 → Jul 1–12, day clamped
samePeriodLastYear(range)
fullMonth(ref) / trailingMonths(n, ref)
eachDay(range) / dayCount(range) / atDayStart / atDayEnd
inRange / inRangeSydney / localDayKey
deltaPct(current, previous)      // shared; null when there's no baseline
```

`DateRange` is defined here (not in the picker) so server-safe utils can use it; the picker
re-exports it for back-compat.

`src/lib/utils/stats.ts` — `median`, `percentile`, `mean`, `finiteValues`. **Computes over present
values only**: Zendesk records a first-response time on 628 of 3,309 tickets, so zero-filling would
report a near-zero median on almost every window.

---

## Dashboard pages

Two patterns coexist. **Use pattern A for anything new.**

**A — narrative / live.** `page.tsx` (Home), `financial`, `marketing`, `support`, `support/report`.
`'use client'`; `useDashboardData()`; `useState<DateRangePickerValue>`; `<Breadcrumb>` +
`<DateRangePicker>` header; `<NarrativeSection>` blocks; shared `MetricTile` / `LockedTile` /
`LockedCard` / `Column` from `@/components/dashboard/metric-tile`; every metric in a `useMemo` for
each window; sparklines via `bucketByDay` → `TileChart`.

**B — classic / demo.** `members`, `clinical`, `retention`. `<SectionHeading>` + shared `MetricCard`
+ `ChartPeriodToggle` over **hardcoded module-level arrays**. These pages still carry a `DEMO` nav
tag and are the remaining rebuild candidates.

### Section maps

- **`/financial`** — 01 Plan vs Actual, 02 Revenue Headlines *(manual workbook)*, **03 The Revenue
  Ladder, 04 Recurring vs One-Off, 05 Attach Products, 06 Does It Tie Out?** *(Stripe line items)*,
  07–17 the pre-existing manual-workbook sections.
- **`/support`** — 01 Volume, 02 Channel, 03 Response Time, 04 Queue, 05 What We Still Can't See.
  `/support/report` is the four-page printable version, same analytics module, PDF via
  `html2canvas` + `jsPDF`.
- **`/marketing`** — **01 This Week, 02 Which Way Is It Moving?, 03 The Monthly Detail**, then 04–09
  the pre-existing sections.

### Shared components (`src/components/dashboard/`)

`MetricTile` (with `delta`, `secondaryDelta`, `footnote`), `LockedTile`, `LockedCard`, `Column`,
`NarrativeSection`, `TmrwBarChart` (grouped / stacked / percent-stacked / highlighted bars),
`TmrwLineChart`, `TmrwAreaChart` (always stacked), `TileChart` + bucketing helpers, `Sparkline`,
`TrendIndicator` (takes a **number** percent), `StatusDot`, `DataSourceBadge`, `AlertCard`,
`DateRangePicker`.

### House rule: missing data must read as missing

A `null` metric renders a locked tile naming the column that would fill it, or `not instr.` in
italics — never a `0`. Cart starts is the canonical example: a zero would claim nobody started a
checkout when the truth is it isn't instrumented. Where a figure falls back to a second-choice
source (calls booked: Slack → Meta pixel → GHL), the tile states which source it used, because those
count different things.

---

## Verification

Four `tsx` scripts run the **real** processors, analytics and page components over an actual export
and assert the results. 81 numeric checks + 32 render checks, all passing against the 6 Aug 2026 files.

```bash
npm run verify:revenue   -- --dir <folder>   # or --no-assert for a newer export
npm run verify:support   -- --dir <folder>
npm run verify:marketing -- --dir <folder>
npm run verify:render    -- --dir <folder>   # server-renders the pages with real rows
```

`verify:render` matters because of a gap the other checks leave: `tsc` proves the types line up and
`next build` prerenders every page, but **only ever with empty data** — so a crash that appears once
rows are present slips through both. It renders each page twice, once with the real export and once
empty, and asserts the locked/`not instr.` states actually appear rather than silently becoming
zeros. It needs `tsconfig.smoke.json`, which redirects `@/lib/context/data-context` to
`scripts/__mocks__/data-context.tsx`.

Key figures they lock in:

| Check | Expected |
|---|---|
| Stripe gross, 8-col export | A$670,206.86 over 3,636 lines |
| Unmapped, name matching | 19 names / 88 lines / A$13,533.61 = 2.02% |
| Unmapped, **product-id** matching | 4 names / 16 lines / A$1,973.12 = **0.44%** |
| Recurring % of total, Jun / Jul 2026 | 93.47% / 89.29% |
| Zendesk 1–5 Aug vs 1–5 Jul (Sydney) | 260 vs 100, +160% |
| Zendesk monthly Feb–Jul | 62 / 190 / 496 / 751 / 452 / 1,098 |
| WhatsApp resolution, Aug vs Jul window | median 16.6h vs 76.8h; p90 46.2h vs 149.3h |
| SMS resolution | median 33.5h vs 94.1h; p90 50.7h |
| Meta Jun 2026 | A$30,058 · 521,799 impr · 1,019 leads · CPL A$29.50 · CTR 2.84% |
| Meta Jul 2026 | A$35,166 · 470,662 impr · 779 leads · CPL A$45.14 · CTR 2.00% |

Also asserted: `samePeriodLastMonth` resolves 1–5 Aug to 1–5 Jul; `previousWeekSameSpan` from a
Monday lands on the previous Monday; and un-instrumented metrics stay `null` rather than becoming 0.

`npm run build` must pass clean. The `/api/data/history` prerender warning is pre-existing and benign.

---

## Supabase Schema

| Migration | Adds |
|---|---|
| `001_create_tables.sql` | `upload_log`, `tableau_data`, `hubspot_data`, `stripe_data`, `zendesk_data`, `priorities_log` (all `row_data jsonb`) |
| `002_add_meta_pelagonia.sql` | `meta_data`, `pelagonia_data` (jsonb) |
| `003_audit_columns.sql` | `upload_log`: `uploaded_by`, `data_period_from/to`, `data_period_label`, `file_name` |
| `004_financial_revenue.sql` | `financial_revenue` (first typed table) |
| `005_stripe_revenue.sql` | `stripe_revenue_lines`, `product_category_map` |
| `006_zendesk_tickets.sql` | `zendesk_tickets` |
| `007_meta_campaign_marketing_daily.sql` | campaign columns on `meta_ads` (nullable); `marketing_daily` |

**Known gap:** the canonical tables `hubspot_contacts`, `ghl_opportunities`, `operational_data`,
`meta_ads`, `social_followers`, `social_views` and `plan_targets` have **no DDL in this repo** — they
were created directly in Supabase. `meta_data` (002) is orphaned; the code uses `meta_ads`. The
`row_data jsonb` tables from 001/002 predate the flat typed columns the processors now write. Worth
writing a catch-up migration.

All tables: RLS enabled with `"service role full access" for all using (true) with check (true)`.
API routes use the service-role client.

---

## Data Context (`src/lib/context/data-context.tsx`)

`DashboardData` has two halves:

- **Legacy demo-shaped arrays** — `members`, `transactions`, `tickets`, `clinicians`, `metaAds`,
  `pelagoniaOpportunities`, `manualMetrics`, `rocks`, `alerts`. Populated **only in demo mode**;
  empty in `actual`. Pattern-B pages still read these.
- **Canonical arrays** (`CanonicalRow[]` = `Record<string, unknown>[]`) — `meta_ads`,
  `marketing_daily`, `social_followers`, `social_views`, `stripe`, `stripe_revenue`,
  `product_category_map`, `hubspot`, `pelagonia`, `tableau`, `zendesk`, `zendesk_tickets`,
  `hubspot_contacts`, `ghl_opportunities`, `operational_data`, `plan_targets`, `financial_revenue`.

Also exposes `loading`, `error`, `refresh()`, `resetToDemo()`, `switchToActual()`, `hasActualData`,
`derivedCAC`, `lastRefresh` (+ `lastRefreshed` alias).

`refresh()` does a single `fetch('/api/data/latest')` on mount and assigns each body key through
`asRows()`. There is **no** `updateSource` and **no** localStorage caching — earlier docs described
both; neither exists.

---

## Auth

- **`src/middleware.ts`** — MUST live at `src/middleware.ts`, not project root (`src/` layout).
- Clients: `lib/supabase/client.ts` (browser), `server.ts` (server components / routes),
  `service.ts` → exported as `createServiceClient`, always imported as
  `import { createServiceClient as createClient }`.
- Invite flow: `/api/admin/invite` → Supabase invite email with `token_hash` → `/auth/callback`
  (`verifyOtp`) → `/auth/update-password` → sets `onboarded: true`.
- Middleware gate uses strict `user.user_metadata.onboarded === false` so legacy users pass.
- Redirects after login / password set use `window.location.href = '/'` (full navigation, so cookies
  are picked up), never `router.push`.
- Supabase invite template must be:
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite`

Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(server only — must **not** be `NEXT_PUBLIC_`).

---

## Gotchas

- **`tsc` has no explicit `target`**, so it defaults to ES5: spreading a `Map`/`Set` iterator is a
  compile error. Use `Array.from(...)`, matching the existing pages.
- Recharts `data` props need `as object[]` or `as Record<string, unknown>[]`.
- The upload page re-serialises every sheet through `Papa.unparse` before POSTing, so **Excel date
  cells reach processors as serial strings** like `"45992"`. Use `parseSpreadsheetDate` from
  `_date-helpers.ts` — its plain-number-string branch must run before the native `Date` fallback,
  because `new Date("45992")` reads 45992 as a year.
- Australian `DD/MM/YYYY` dates must go through `parseAusDate`; V8 leans toward US `MM/DD/YYYY`.
- Never call `createClient()` at component body level on a page that might prerender — only inside
  event handlers or `useEffect`.
- `formatTrend` in `utils/format.ts` returns a *string*; `TrendIndicator` wants a *number*. Use
  `deltaPct`.

---

## What's Not Done

1. **`/members`, `/clinical`, `/retention`** are still hardcoded demo arrays (`DEMO` nav tag). Same
   treatment as `/support` would make them live.
2. **Catch-up migration** for the tables created directly in Supabase (see the schema gap above).
3. **Unmapped Stripe products** — 19 names / ~2% of gross under name matching. Two fixes, both
   easy: add them to the Mapping tab, and/or switch to the 57-column Line Items export where
   `PRODUCT_ID` cuts it to 0.44%. The Financial page's §06 panel lists exactly what to add.
4. **`marketing_daily` has no data yet.** The schema, upload card and page are ready; Dan needs to
   produce the sheet. `exportSteps` on the source spells out the exact header row.
5. **Zendesk extract is missing four columns** that would unlock CSAT, per-agent load, tags and
   reopens — each is one extra column on the existing extract, no new integration. `/support` §05
   names them.
6. **Snowflake pipeline** — `NEXT_PUBLIC_SNOWFLAKE_EXPORT_URL` has a dormant auto-fetch in
   `data-context.tsx`.
7. **HubSpot/GHL extract** is known-janky per Dan; calls-booked currently prefers Slack, then Meta,
   then GHL.
8. No global error toast; upload errors surface in the card only.

---

## Git

Remote: `oscarttmrw/tmrw-dashes`. Do not push to `main` without explicit instruction.
