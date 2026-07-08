# Handoff — Supabase migrations + Dan's dashboard changes

> **How to use this:** start a **fresh** Claude Code session on branch
> `claude/code-review-dashboard-lxfeu2` and say: *"Read HANDOFF.md and continue."*
> A fresh session is required because the Supabase MCP server only loads at
> session start (it was added after the previous session began).

---

## 0. First — confirm the Supabase MCP connection

The repo has `.mcp.json` configuring a **read-only** Supabase MCP server for
project `jacrioszqpkehizbiqbg`. It authenticates via the `SUPABASE_ACCESS_TOKEN`
environment variable (set in the Claude Code environment settings, not in the repo).

Check that Supabase tools are available (e.g. a "list tables" / "execute sql"
tool). If they are **not**:
- Confirm the env var is named exactly `SUPABASE_ACCESS_TOKEN`.
- Confirm its value is the raw PAT (starts `sbp_`) with **no surrounding quotes**.
- Confirm you started a brand-new session after saving the token.

If tools load, run a `select` (e.g. `select count(*) from upload_log`) to prove
the connection before doing anything else.

---

## 1. Apply the migrations (006 → 010, in order)

The migration files are in `supabase/migrations/`:
- `006_reconcile_schema.sql` — documents the 7 hand-made tables; adds missing `plan_targets.ltv_assumed`.
- `007_drop_legacy_tables.sql` — drops `organisations`, `countries` (confirmed empty).
- `008_revenue_line_items.sql` — `product_category_map` (seeded, 51 rows) + `stripe_line_items`.
- `009_zendesk_schema.sql` — rebuilds `zendesk_data` typed (empty table, safe drop).
- `010_hubspot_milestones.sql` — adds HubSpot milestone + re-test columns.

**The MCP server is READ-ONLY, so it cannot apply these.** Two options:
- **Recommended (prod-safe):** the user runs each file's SQL in the Supabase
  SQL Editor, in order. Claude then verifies (section 2).
- **If the user wants Claude to apply them directly:** edit `.mcp.json` to
  remove `--read-only`, use a PAT with write scope, restart the session, then
  apply each migration via the MCP execute-SQL / apply-migration tool in order.

---

## 2. Verify after applying

Run these read-only checks (via MCP):
```sql
select count(*) from product_category_map;          -- expect 51
select column_name from information_schema.columns
  where table_name = 'plan_targets' and column_name = 'ltv_assumed';  -- expect 1 row
select count(*) from information_schema.columns
  where table_name = 'zendesk_data' and column_name = 'channel';      -- expect 1 (typed rebuild landed)
select count(*) from information_schema.columns
  where table_name = 'hubspot_contacts'
    and column_name in ('hubspot_record_id','escript_sent_at','retest_dashboard_published_date'); -- expect 3
select to_regclass('public.organisations'), to_regclass('public.countries'); -- expect null, null
```

---

## 3. Remaining work from Dan's list (needs data/inputs)

| Item | Status | Blocked on |
|---|---|---|
| #1 Revenue (Stripe line items) | Built + wired | User uploads a real **Stripe Integrated** export via Admin → Data Upload; verify totals vs a trusted number, then retire the legacy two-sheet `financial_revenue` upload from the UI. |
| #2a/b Zendesk schema + Support page | Built (schema + processor + per-channel SLA + rebuilt Support page) | A real **Zendesk export** to confirm exact column names (channel/"Via", reopens, inbound messages, replies, tags). Metrics render empty until upload. |
| #2c CSAT → member detail | Summary CSAT done | A **join key** (requester email or Oracle/HubSpot ID) in the Zendesk export + OK to store it (PII is stripped today). |
| #3 HubSpot casebook + created-date | Casebook count done | created-date-as-registration deferred per Dan (validate first). |
| #4 "Prove it works" milestones | Schema (migration 010) + processor done | The milestone export **sample + backfilled data**; confirm eScript should be a date (kept boolean `escript_sent` + new `escript_sent_at`). |
| Snowflake auto-pull | Deferred | Security review + connection creds. |

## 4. Open decisions for the user
1. **Casebook definition** — currently counts *all* member contacts cumulatively; switch to *active-only* (exclude churned)?  (Members page, `totalCasebook`.)
2. **Retire legacy `financial_revenue` two-sheet upload** once line items verified — yes/no?
3. Net = CHARGED (post-discount) — **already confirmed**, no action.

## 5. Git
- Branch: `claude/code-review-dashboard-lxfeu2` (push here; never to main without instruction).
- Everything builds clean (`npm run build`). Commits so far cover migrations 006–010,
  the revenue source + Financial rewire, Zendesk schema + Support rebuild, HubSpot
  milestones, and the `.mcp.json` config.
- FYI: `TMRW_GHL` and `Meta_Ads` MCP integrations are available in-session — a
  possible future path to pull GHL/Meta via API instead of CSV.
