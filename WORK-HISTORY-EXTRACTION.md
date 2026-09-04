# Work history extraction — `oscarttmrw/tmrw-dashes`

Raw extraction pass. Grounded in `git log` (full history, all branches, un-shallowed),
commit diffs, `package.json`, `next.config.mjs`, `supabase/migrations/`, `CLAUDE_CONTEXT.md`,
`HANDOFF.md`, `supabase/README.md`, `.mcp.json`, and the GitHub PR list (#1–#11).
No resume language. Inferences flagged.

## Extraction notes that apply to every entry below

- **The repo has no README.** Project purpose comes from `CLAUDE_CONTEXT.md` (committed
  12 May 2026, rewritten 12 Aug 2026), `supabase/README.md`, and `HANDOFF.md`.
- **No CI.** There is no `.github/` directory, no `vercel.json`, and no test framework
  (`jest`/`vitest`/`playwright`) on any branch. Deployment target is Vercel per
  `CLAUDE_CONTEXT.md` and repeated "Vercel build" commit messages, but nothing in the repo
  configures it — it is configured in the Vercel dashboard, outside version control.
- **Authorship is the central inference problem.** 158 of 168 commits are authored
  `Claude <noreply@anthropic.com>` — i.e. written by Claude Code agent sessions, on
  `claude/*`-prefixed branches. The 10 commits authored `oscarttmrw
  <oscar@startmytomorrow.com>` are *all* merge commits (PRs #1–#10). Every one of the 11
  PRs was opened by `oscarttmrw`. See per-entry role notes.
- **`main` is stale relative to the work.** `origin/main` HEAD is `79c0ee3` (29 May 2026).
  All work from 30 May to 26 Aug 2026 (~55 commits) lives on unmerged feature branches;
  PR #11 has been open since 14 Aug 2026. Whether that later work is "shipped" depends on
  whether these branches were deployed as Vercel previews — the repo does not say.
- **A local clone may be shallow.** The default clone here arrived shallow (77 commits,
  4 grafted roots); `git fetch --unshallow` reveals 168 commits and 26 remote branches.
  Any prior extraction against the shallow clone would have missed May 11–12 and all
  June–August work.

---

### TMRW Operating Dashboard (`tmrw-dashes`) — whole project

- **Role (inferred from git history):** Project owner / director and sole human on the
  repo, working via Claude Code agent sessions. Evidence: single human identity
  (`oscarttmrw`) across the entire history; all 11 PRs opened by that account; all 10
  human-authored commits are PR merges; no other contributor, reviewer, or commenter
  appears anywhere. The *code* was written by agent sessions (158 commits), so this is
  ownership and direction of AI-executed work — specification, review, merge, and
  production database operations — rather than hand-authored implementation. **Inferred,
  medium-high confidence** for the shape of the role; the split between human-authored
  specification and agent-authored code cannot be quantified from the repo, because the
  prompts and conversations are not committed.
- **Problem:** Per `CLAUDE_CONTEXT.md`: an internal operating dashboard for TMRW Health
  (a longevity / preventative-health company) to "replace manual spreadsheet reporting
  with a live, data-connected dashboard." Data arrives as CSV/XLSX exports uploaded by
  hand; a Snowflake daily pipeline is named as the future target. Invite-only, internal.
- **Delivered (evidenced by commits/code):** A deployed-by-Vercel Next.js 14 App Router
  application with: Supabase-Auth invite-only access (invite → set password → PKCE
  session → middleware-gated routes); an admin upload pipeline that parses CSV and
  multi-sheet XLSX client-side for validation and server-side for persistence,
  auto-detects which of 16 registered sources a file is, and writes typed Postgres
  columns via per-source write strategies (fullReplace / dateRangeReplace / upsert on a
  declared conflict key); an `upload_log` audit trail with uploader, file name and data
  period, surfaced at `/admin/upload-history` and `/admin/registry`; 18 source processors;
  three pure analytics modules (revenue / support / marketing); a shared period-comparison
  toolkit with Australia/Sydney day bucketing; and 21 dashboard pages of which Home,
  Financial, Marketing and Support run on real uploaded data. Also: admin-entered monthly
  plan targets, an EOS priorities store, and a printable/PDF support report.
- **Stack (from actual dependencies/config):** TypeScript 5.9 (strict, `noEmit`, no
  explicit `target` so ES5), Next.js 14.2 App Router with `src/`, React 18.3, Tailwind CSS
  v4 (`@tailwindcss/postcss`), Radix UI primitives + shadcn-style `components/ui`,
  Recharts 3.7 (plus a `@tremor/react` dependency), framer-motion, lucide-react, cmdk,
  Supabase (`@supabase/supabase-js`, `@supabase/ssr`) as Postgres + Auth, PapaParse for
  CSV, SheetJS `xlsx` for workbooks, `html2canvas` + `jspdf` for PDF export, Cloudinary
  (allow-listed in `next.config.mjs`) for brand assets, `tsx` for verification scripts,
  Vercel for hosting, and a read/write Supabase MCP server (`.mcp.json`, project
  `jacrioszqpkehizbiqbg`) used for the migration pass.
- **Scale/complexity:** 168 commits over 3.5 months; 26 remote branches; 11 PRs. 155
  tracked files on `main`, 177 on the most advanced branch (~27,000 lines under
  `src/` + `scripts/`). 16 registered upload sources → 18 processors → ~20 Postgres
  tables; 7 committed migrations on the PR-#11 branch plus 6 more (`006`–`011`) applied to
  production and documented in `HANDOFF.md`; 8 API routes; ~50 components; 21 pages. One
  source (HubSpot Contacts) is a ~434-column export of which ~31 columns are mapped.
  `CLAUDE_CONTEXT.md` documents a 9-step checklist required to add one data source, each
  step being a place where a miss causes silent data loss.
- **Outcomes:** **None recorded.** The repo contains no adoption, usage, time-saved, or
  business-impact figure anywhere. The many precise numbers in `CLAUDE_CONTEXT.md` and the
  PR #11 body (A$670,206.86 Stripe gross over 3,636 lines; 3,309 Zendesk tickets; Meta
  spend/CPL by month) are **assertions locked into verification scripts about a specific
  test dataset** — they describe the data the tool reports, not an outcome of building it.
  `HANDOFF.md` records a status table against a stakeholder's ("Dan's") request list, which
  is the closest thing to a delivery record: most items ✅, four blocked on missing source
  columns or external data.
- **Timeframe (first commit → last commit):** 11 May 2026 → 26 Aug 2026.
- **Notes/uncertainty:** Company/stakeholder names appear in commit messages ("Dan's
  design", "Daniel's 5-section narrative framework", "Geet's clean dataset"), implying
  internal stakeholders who reviewed output outside GitHub — no review activity is
  recorded in the repo. `.mcp.json` contains a live Supabase project ref and expects a
  personal access token from the environment; `HANDOFF.md` notes write access was ON
  against production and asks for the token to be rotated. Unknown from the repo: user
  count, whether it reached production use, and whether the June–August branches deployed.

---

### Phase 1 — MVP: scaffold, auth, upload pipeline, and the jsonb→typed-column cutover

- **Role (inferred from git history):** Director/reviewer of agent-authored work; merged
  PRs #1–#9 personally. Commit messages are written in a plan-execution register ("PR 1.1
  … PR 2.6", "Task 1 … Task 7"), which suggests a human-agreed plan being executed step by
  step rather than exploratory solo coding. **Inferred.**
- **Problem:** Stand up the dashboard end to end: an authenticated internal app that can
  ingest the company's real exports and persist them, replacing spreadsheets.
- **Delivered (evidenced by commits/code):** Initial scaffold across 7 commits on 11 May
  (infrastructure, auth, components, mock data, engines, processors, 12+ dashboard pages);
  Vercel build errors fixed to a clean build (12 May); `middleware.ts` relocated to `src/`
  for the `src/` layout; login + Supabase invite system with `/auth/callback` `verifyOtp`
  and an `onboarded` metadata gate; dashboard pages moved into a `(dashboard)` route group;
  six upload sources (Tableau, HubSpot, Stripe, Zendesk, Meta, Pelagonia/GoHighLevel) with
  schemas, drag-and-drop upload, case-insensitive header validation, a confirmation modal
  capturing audit metadata, upload history and a data registry; migrations `001`–`003`
  (`upload_log` + per-source `row_data jsonb` tables + audit columns, RLS on every table).
  Then a deliberate architecture change over PRs #2/#4: canonical typed column schemas
  per source, processors rewritten to typed output, processor execution moved server-side,
  `/api/data/latest` rewritten to read typed columns, and the frontend cut over to hydrate
  from Supabase with `localStorage` caching dropped. Closed with a processor audit
  (PR #6) extracting `parseAusDate`/`parseAusDateTime` into `_date-helpers.ts` and applying
  Australian `DD/MM/YYYY` parsing across all six processors, a schema audit against real
  exports (PR #8), a revenue-scaling bug fix (`/100` removed from the Total Revenue tile),
  removal of dead code (`entity-linker`, `pii-stripper`, orphaned `SnowflakeExport` type),
  a PII-clean Stripe schema, and Phase-2 navigation locked off.
- **Stack (from actual dependencies/config):** As the umbrella entry, minus the later
  additions (`tsx`, `html2canvas`/`jspdf`, Cloudinary, MCP). Storage at this stage is
  `row_data jsonb` per source, then typed columns from PR #2 onward.
- **Scale/complexity:** ~60 commits in 5 days (11–15 May); 9 PRs merged in ~48 hours
  (13–14 May), several of them stacked on the same long-lived base branch
  (`claude/implement-mvp-spec-tpdhK`) rather than on `main`; 145–148 tracked files; three
  hotfix PRs (#3, #5, #9) each fixing a crash or wrong value introduced by the PR before
  it. `CLAUDE_CONTEXT.md` was written in this phase explicitly as agent-handoff
  documentation.
- **Outcomes:** None recorded, beyond `CLAUDE_CONTEXT.md`'s "What's Working" checklist
  (full auth flow, 6 sources uploadable, audit log, demo/actual toggle, "all Vercel builds
  pass cleanly"). No usage or impact figures.
- **Timeframe (first commit → last commit):** 11 May 2026 → 15 May 2026.
- **Notes/uncertainty:** The rapid hotfix cadence (fix → merge → discover → fix) is
  directly evidenced in the PR titles and is worth reading as real integration friction,
  not polish. Whether the "real exports" driving the schema audits were production data or
  samples is not stated in the repo.

---

### Phase 2 — Ads/social schema rebuild, XLSX handling, and brand application

- **Role (inferred from git history):** Same pattern; this phase was worked on
  `claude/rebuild-ads-social-schema-bK3Ow`, `claude/apply-tmrw-branding-lVp7r` and
  `claude/add-posthog-manual-inputs-XVrW5` and reached `main` without individual PRs.
  **Inferred.**
- **Problem:** The Meta/social/Stripe schemas as first written did not match the real
  exports; marketing data arrived as multi-sheet Excel workbooks with title rows, and some
  metrics (PostHog product analytics) had no export at all.
- **Delivered (evidenced by commits/code):** Meta Ads / Social Organic / Stripe schemas
  rebuilt; `social_organic` split into two sources, `social_followers` (snapshot, no date
  column) and `social_views`; XLSX parsing that skips leading title/blank rows and
  auto-detects source with per-sheet date pickers; header matching normalised across the
  validator and processors; upload-history white-screen fix on unknown source values;
  TMRW brand assets applied; PostHog values enterable by hand in Settings and wired into
  dashboard counts and the Clinical pipeline.
- **Stack (from actual dependencies/config):** Adds real reliance on `xlsx` (SheetJS) for
  multi-sheet workbooks alongside PapaParse.
- **Scale/complexity:** ~12 commits over 19–21 May; 146–148 files.
- **Outcomes:** None recorded.
- **Timeframe (first commit → last commit):** 19 May 2026 → 21 May 2026.
- **Notes/uncertainty:** "Phase 2" is the commit messages' own label ("Phase 2: metric
  rewiring, social organic surfacing, smart-drop upload"), so the phase boundary here is
  evidenced rather than inferred.

---

### Phase 3 — Backend foundations, dashboard rebuild, date filtering, plan targets (PR A/B/C/D series)

- **Role (inferred from git history):** Director/reviewer; opened and merged PR #10, which
  bundled four separately-branched workstreams (`pr-a-backend-foundations`,
  `pr-b-dashboard-redesign`, `pr-c-date-filter-charts`, `pr-d-plan-targets`). The
  disciplined A.1–A.11 / B.1–B.10 / C.1–C.8 / D.1–D.3 numbering across 34 commits in one
  day indicates an agreed written plan executed in sequence. **Inferred.**
- **Problem:** The dashboard needed to run on the company's actual source systems
  (HubSpot Contacts, GoHighLevel opportunities, a daily operational workbook, Meta ads,
  social, Stripe invoices) and to answer period questions ("vs last period", "vs plan")
  rather than show static tiles.
- **Delivered (evidenced by commits/code):** *A* — processors and schemas for
  `hubspot_contacts`, `ghl_opportunities` and `operational_data`; upload and latest routes
  extended; source-detection schemas tightened to prevent false matches; a manual source
  override dropdown; the Stripe processor and schema matched to the Invoice CSV format;
  `[object Object]` error display fixed. *B* — data context extended to the new sources;
  brand fonts and the Syringe Red palette added to `globals.css`; home Dashboard rewritten
  against the new schemas with real formulas in a stakeholder-specified section order;
  `meta_ads` / `social_followers` / `social_views` wired through context, routes and
  dashboard; a multi-sheet upload page that auto-routes the TMRW Marketing workbook to
  three sources by sheet name; `/marketing` rewritten with an engagement-trend chart.
  *C* — a `DateRangePicker` with preset chips, previous-period comparison, and
  calendar-month-aware shifting for month-aligned ranges; a `TileChart` sparkline plus
  day-bucketing helpers; both wired into Home and Marketing tiles with vs-previous deltas;
  Registrations and Monthly Churn switched to the `operational_data` daily roll-up; a
  North Star bar (Total Casebook, Pods Dispatched). *D* — `/api/plan-targets` (GET/POST,
  session-authed, upsert by month), a Plan Targets entry form in Settings with
  previous-month history, and vs-plan progress plus a daily-target reference line on
  headline tiles. Then a design/financial pass 26–28 May: cumulative-target charts, CYTD
  throughput, a 13-section Financial summary rebuilt to a stakeholder's design, migration
  `004_financial_revenue.sql` (the first typed table committed as DDL) with a Net+Gross
  workbook upload pipeline, an Excel-serial date-parsing fix, an LTV-assumed plan-target
  field, and a Marketing rebuild with a spend section, funnel, CAC trend and per-platform
  social.
- **Stack (from actual dependencies/config):** Unchanged framework; adds `financial_revenue`
  (typed, `unique (date, revenue_type)`) and the `plan_targets` table (created directly in
  Supabase, no DDL in the repo at this point).
- **Scale/complexity:** ~54 commits, 24–29 May; 34 of them on 24 May alone; four parallel
  branches merged through a single PR (#10); files 148 → 155. Sources grew from 6 to ~13.
- **Outcomes:** None recorded.
- **Timeframe (first commit → last commit):** 24 May 2026 → 29 May 2026.
- **Notes/uncertainty:** This is the last work merged to `main`. Several commits in this
  phase are visibly design-iteration on a stakeholder's spec (four consecutive commits
  adjusting one funnel's labels and alignment), which is evidence of a review loop
  happening outside GitHub.

---

### Phase 4 — Mobile/nav overhaul, real-data page rebuilds, and two unmerged UX experiments

- **Role (inferred from git history):** Same; all of this sits on unmerged branches
  (`great-einstein-8SviY`, `tender-allen-AepED`, `boss-changes-triage-LOcww`,
  `gallant-fermi-m7u0vm`) with no PR opened, so no merge decision is recorded. **Inferred.**
- **Problem:** Narrow-viewport layouts were broken; several pages still ran on hardcoded
  demo arrays; and — from branch name `boss-changes-triage` — a round of stakeholder
  change requests needed triaging.
- **Delivered (evidenced by commits/code):** Mobile overflow fixes and a mobile-first nav
  overhaul with an editorial design pass; a tool-wide date filter wired through Dashboard,
  Marketing and Financial; the dead HubSpot Record-ID source removed; GHL monthly funnel
  metrics ingested and wired to Dashboard and Marketing tiles; Financial section 8 wired
  to plan targets (Actual vs Plan); the MRR tile unlocked as MRR (Gross); marketing funnel
  step-conversion percentages with an expandable Booked breakdown; `/members` rebuilt on
  real data with Retention folded in and mock data dropped; `/clinical` (Delivery) rebuilt
  on real data with clinical outputs and velocity. Separately, two exploratory redesigns
  that never merged: "Pulse" (an animated, insight-first dashboard —
  `src/components/pulse/*`, `src/lib/pulse/*`, ~14 new components incl. count-up,
  funnel-flow, health-ring, heatmap) and "Observatory" (a sidebar-less shell with a live
  ticker, a statistical `/lab` page and an "analyst's brief").
- **Stack (from actual dependencies/config):** framer-motion carries the Pulse animation
  work; otherwise unchanged.
- **Scale/complexity:** ~13 commits, 29 May – 10 Jun; the Pulse/Observatory branch adds 18
  files (173 tracked) on top of `main`.
- **Outcomes:** None recorded. Note that `CLAUDE_CONTEXT.md` (Aug) still lists
  `/members`, `/clinical` and `/retention` as hardcoded demo pages — so the real-data
  rebuilds on `boss-changes-triage-LOcww` were **not** carried into the later mainline of
  work. That is direct evidence of abandoned/superseded work, not an inference.
- **Timeframe (first commit → last commit):** 29 May 2026 → 10 Jun 2026.
- **Notes/uncertainty:** Pulse and Observatory are, on the evidence, discarded design
  explorations — two commits, no PR, never referenced again. Treat them as exploration,
  not shipped functionality.

---

### Phase 5 — Schema reconciliation via Supabase MCP, and the stakeholder request round

- **Role (inferred from git history):** Director plus **hands-on database operator**: the
  `HANDOFF.md` on `claude/code-review-dashboard-lxfeu2` records that migrations `006`–`011`
  "have all been run against production (by the user, in the Supabase SQL Editor)", and
  `.mcp.json` was added and then switched from read-only to write access. This is the one
  phase where the repo evidences the human performing production operations directly, not
  just merging. **Directly evidenced by committed docs**, unusually for this repo.
- **Problem:** Two stated problems. (1) The migration folder had drifted badly from the
  live database — seven tables the app depends on had been created by hand in the SQL
  editor and never written down, and four more had been rebuilt with typed columns while
  `001`/`002` still described them as `jsonb` blobs. (2) A stakeholder ("Dan") had issued a
  numbered list of data requests (revenue mapping, Zendesk support metrics, CSAT, casebook
  definition, registration-date source) that `HANDOFF.md` tracks item by item.
- **Delivered (evidenced by commits/code):** A read-only Supabase MCP server config, later
  write-enabled; migration `006` reconciling the uncommitted live tables into schema
  (plus `plan_targets.ltv_assumed`); `007` dropping two dead tables (`organisations`,
  `countries`); `008` adding `product_category_map` (51 rows) and `stripe_line_items`;
  `009` rebuilding `zendesk_data` with typed per-channel columns; `010` adding HubSpot
  member-journey milestone and re-test columns; `011` adding a `twilio_messages` source for
  inbound-message-by-channel. On top of the schema: a Stripe line-items revenue source with
  product-category mapping powering the Financial page (Appointments plus a true recurring
  split); total casebook counted from HubSpot contacts (active customers only, excluding
  churned); `/support` rebuilt on real Zendesk data against a stakeholder's nine specified
  metrics; aggregate CSAT surfaced on the scorecard and Members; a registration-source
  comparison chart (operational feed vs HubSpot Create Date) built as a validation view
  before switching the definition. Also `HANDOFF.md` and an apply+verify runbook for the
  migrations, both committed.
- **Stack (from actual dependencies/config):** Adds the Supabase MCP server
  (`@supabase/mcp-server-supabase`, project ref `jacrioszqpkehizbiqbg`,
  `SUPABASE_ACCESS_TOKEN` from the environment) as the tool used to inspect and change the
  live schema.
- **Scale/complexity:** ~15 commits, 28 Jun – 15 Jul; 6 migrations applied to production;
  171 tracked files; `HANDOFF.md` tracks 15 numbered stakeholder items to a status.
- **Outcomes:** No impact metrics. `HANDOFF.md`'s status table is the record: most items
  done; four explicitly blocked and *why* — reopen rate has no column in the Zendesk
  export, the staffing overlay has no roster source, per-member CSAT would need a
  Zendesk↔member join key, and "prove it works" waits on a clean dataset (noted as a
  data-quality problem: 65k rows for 22 members).
- **Timeframe (first commit → last commit):** 28 Jun 2026 → 15 Jul 2026.
- **Notes/uncertainty:** Migration numbering diverges between branches — `HANDOFF.md`
  describes `006`–`011` applied to production, while the later PR-#11 branch commits files
  numbered `005`–`007` with different contents, and the `snowflake-supabase-pipeline`
  branch has yet another `005`/`006` pair. Reconstructing the true production schema
  history from this repo alone is not possible; the live database is the only authority.

---

### Phase 6 — Documented database schema + automated ingest endpoint (single unmerged branch)

- **Role (inferred from git history):** Sole author of the agent session; no PR, one
  commit, never merged. **Inferred.**
- **Problem:** Stated in the commit body: the migration folder had drifted from the live
  database, and `001_create_tables.sql` opens with `drop table if exists upload_log
  cascade` — which, given every data table has an FK to `upload_log`, would cascade and
  destroy the whole database if anyone ran it. Also the first step toward replacing manual
  upload with an automated pull.
- **Delivered (evidenced by commits/code):** `005_document_existing_schema.sql` —
  a complete, self-contained, fully `if not exists`-guarded schema reconstructed from the
  processors that write each table and the route that reads them, so it is a no-op against
  production and sufficient to stand up a fresh database; `006_drop_legacy_tables.sql` as
  the one deliberately destructive file; warning headers marking `001`/`002` superseded;
  `supabase/README.md` documenting every table, its write strategy, and why the unique
  constraints are load-bearing (the upsert strategies pass `onConflict`, which silently
  misbehaves without a matching constraint); and `src/app/api/data/ingest/route.ts` +
  `src/lib/ingest/pipeline.ts`, an automated ingest endpoint.
- **Stack (from actual dependencies/config):** Unchanged.
- **Scale/complexity:** 1 commit, 5 new files, 160 tracked files.
- **Outcomes:** None recorded. The branch was never merged and the ingest endpoint is not
  referenced from `CLAUDE_CONTEXT.md`'s Aug rewrite, which still describes the Snowflake
  pipeline as a dormant future target.
- **Timeframe (first commit → last commit):** 7 Aug 2026 (single commit).
- **Notes/uncertainty:** This branch's `005`/`006` collide by number with the PR-#11
  branch's migrations. Whether the ingest endpoint was ever exercised is not evidenced.

---

### Phase 7 — "Dan's data round": revenue ladder, support analytics, marketing comparisons, verification harness (PR #11, open)

- **Role (inferred from git history):** Director/reviewer; opened PR #11 on 14 Aug and
  kept pushing to it through 26 Aug. The PR body is an unusually detailed technical
  argument — it corrects two figures in the previously agreed plan and explains why —
  which indicates the work was specified against a written plan and verified against
  supplied extracts. **Inferred.**
- **Problem:** A stakeholder supplied three new warehouse extracts (6 Aug 2026) —
  Stripe revenue, Zendesk tickets, Meta ads — in a new export generation (uppercase
  snake_case headers, `*_YYYYMMDDHHMM.csv` filenames) that matched none of the registered
  schemas. `/support` was ~140 lines of hardcoded demo arrays with a fake 2.8×/8.5× scale
  factor on its only real computation. And no page could express "same period last month",
  which the stakeholder had flagged as the most important comparison.
- **Delivered (evidenced by commits/code):** A shared period toolkit (`period.ts`
  promoted from dead code to the common dependency: `samePeriodLastMonth`,
  `previousWeekSameSpan`, `weekToDate`, `sydneyDayKey`, a single shared `deltaPct`) plus
  `stats.ts` (median/percentile/mean over present values only, because Zendesk records a
  first-response time on 628 of 3,309 tickets and zero-filling would report a near-zero
  median). Three pure analytics modules over canonical rows so a page and its printable
  report cannot drift. Revenue: a `stripe_revenue` line-item source and a
  `product_category_map` source, plus four new Financial sections — a six-rung revenue
  ladder (gross → discount → charged → fee → net → ex-GST), a three-way recurring/one-off/
  unmapped split that always sums to 100%, attach products, and a reconciliation panel
  against the hand-maintained workbook with a RECONCILED/INVESTIGATE badge. Categories
  resolve at read time by joining the map, so re-uploading the Mapping tab re-categorises
  all history and a dropped product surfaces as `Unmapped` rather than freezing. Support:
  a `zendesk_tickets` source and five live sections (volume, channel, response time, queue,
  and an explicit "what we still can't see"), plus `/support/report`, a four-page printable
  version with PDF export. Marketing: `meta_ads` extended to accept both the day-level
  sheet and the per-ad warehouse extract, a new `marketing_daily` source, a weekly strip
  (WTD / last week / same week last month), CPL and cost-per-call trends, monthly detail
  and per-campaign breakdown. Migrations `005`–`007`. Five `tsx` verification scripts run
  the real processors, analytics, source matching and page components over an actual
  export and assert 113 checks. `CLAUDE_CONTEXT.md` rewritten against the current `src/`.
  Two incidental pre-existing bug fixes: the Meta processor's bare `new Date()` silently
  transposing day and month on `DD/MM/YYYY` sheets, and the Zendesk processor reading only
  `lc['id']` although its schema advertised `Ticket ID`. Late commits (18 and 26 Aug) add
  guardrails for a real failure mode — wrong source, right file — and stop the upload UI
  reporting failures as success.
- **Stack (from actual dependencies/config):** Adds `tsx` as the only devDependency and
  `tsconfig.smoke.json` (redirecting the data context to a mock) so pages can be
  server-rendered with real rows; `html2canvas` + `jspdf` used for the report PDF.
- **Scale/complexity:** 13 commits, 12–26 Aug; PR #11 is +6,283 / −1,401 across 43 files;
  177 tracked files. 113 assertions across 5 scripts (81 numeric + 5 source-detection + 32
  render checks). Sources reach 16; processors 18.
- **Outcomes:** No business-impact figure. What *is* recorded is verification evidence:
  113 checks passing against the 6 Aug 2026 extracts, and the claim that "every figure on
  all four pages of Dan's support PDF reproduces exactly." Two quantified corrections are
  recorded as findings of this work: the agreed plan's recurring-% acceptance figures
  (95.2% Jun / 89.4% Jul) were wrong — an exploratory script had read the Mapping tab's
  *formula* cells as literal text, mis-classifying five one-off products — with the correct
  figures 93.47% / 89.29%; and switching from name matching to `PRODUCT_ID` matching cuts
  unmapped revenue from 2.02% to 0.44% of gross. Also recorded: UTC-vs-Sydney bucketing
  changes ticket counts by a real margin (260 vs 253 for 1–5 Aug; 1,098 vs 1,095 for July).
  These are properties of the data and the fixes, not outcomes of adoption.
- **Timeframe (first commit → last commit):** 12 Aug 2026 → 26 Aug 2026.
- **Notes/uncertainty:** **PR #11 is still open** (last updated 26 Aug 2026, mergeable,
  1 comment, no reviews). Nothing in this phase is on `main`, and the PR body states it
  needs three migrations run by hand before it shows real numbers. `marketing_daily` has
  the schema, upload card and page but no data. So "delivered" here means merged-ready and
  verified against a supplied dataset — not demonstrably in production use.
