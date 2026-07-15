# Handoff — Dan's dashboard changes

> **How to use this:** start a Claude Code session on branch
> `claude/code-review-dashboard-lxfeu2` and say: *"Read HANDOFF.md and continue."*

---

## 0. Supabase connection

`.mcp.json` configures a **write-enabled** Supabase MCP server for project
`jacrioszqpkehizbiqbg`, authed via the `SUPABASE_ACCESS_TOKEN` env var (set in
the Claude Code environment settings, not the repo). It loads at session start.

If Supabase tools aren't available: confirm the env var is named exactly
`SUPABASE_ACCESS_TOKEN`, its value is the raw PAT (`sbp_…`, no quotes), and the
session was started after saving it.

⚠️ Write access is ON (production). Don't improvise schema changes.
**The user should rotate the PAT now that the migration pass is done.**

---

## 1. Migrations — ALL APPLIED ✅

Migrations `006` → `011` have all been run against production (by the user, in
the Supabase SQL Editor). Files live in `supabase/migrations/`:
- `006_reconcile_schema` — documents the 7 hand-made tables; added `plan_targets.ltv_assumed`.
- `007_drop_legacy_tables` — dropped `organisations`, `countries`.
- `008_revenue_line_items` — `product_category_map` (51 rows) + `stripe_line_items`.
- `009_zendesk_schema` — rebuilt `zendesk_data` typed.
- `010_hubspot_milestones` — HubSpot milestone + re-test columns.
- `011_twilio_messages` — `twilio_messages` (inbound-message source).

Optional re-verify (read-only): `select count(*) from product_category_map;` (→ 51),
and confirm `twilio_messages`, `stripe_line_items` exist.

---

## 2. Status against Dan's list

| Item | Status |
|---|---|
| 2 a i–iv (product/category/recurring mapping) | ✅ Done |
| 2 b (keep visualisations) | ✅ Done · auto-pull from Snowflake 🔜 (Dan doing security review) |
| 3 a (Zendesk schema) | ✅ Done |
| 3 b i, iii, iv, v, vi | ✅ Done (populate on Zendesk upload) |
| 3 b ii (inbound messages) | ✅ Done — via **Twilio** source (Support §02); populates on Twilio upload |
| 3 b vii (reopen rate) | ⛔ No reopens column in the export — locked until one exists |
| 3 b viii (heatmap) | ✅ heatmap done · ⛔ staffing overlay (no roster/schedule source exists) |
| 3 b ix (volume by reason/tag) | ✅ Done (needs tags column in export) |
| 3 c (CSAT summary + dashboards) | ✅ Done — aggregate CSAT on scorecard + Members. Per-member CSAT NOT requested (would need a Zendesk↔member join key). |
| 4 a (casebook from HubSpot) | ✅ Done — **active customers only** (excludes churned) |
| 4 b (created-date registration) | 🟡 Validation chart live on Members §01 (operational feed vs HubSpot Create Date); Dan validating before switch |
| 5 (prove it works) | ⛔ Waiting on Geet's clean dataset |

---

## 3. What's left (all external — needs data/decisions, not code)

- **Uploads to populate dashboards:** real Stripe Integrated export (verify revenue
  totals), Zendesk export, Twilio export, HubSpot Contacts + operational data.
- **After Stripe verified:** retire the legacy two-sheet `financial_revenue`
  upload from the UI (awaiting user go-ahead).
- **Snowflake auto-pull (2b):** security review + creds (Dan, in progress).
- **Prove-it-works (5):** Geet's dataset (currently 65k rows / 22 members — data-quality issue).
- **4b switch:** once Dan validates HubSpot Create Date, flip the Members
  `newMembers` calc to count contacts by `create_date` (note: may need to filter
  to customers, since the raw count includes leads).

## 4. Notes / decisions already made
- Revenue "net" = **CHARGED** (post-discount), not net-of-fees. Confirmed.
- Casebook = **active customers only**. Confirmed by Dan.
- Body of Twilio messages is **not stored** (PII).

## 5. Git
- Branch: `claude/code-review-dashboard-lxfeu2` (push here; never main without instruction).
- Builds clean (`npm run build`). Verify with `npx tsc --noEmit` + `npm run build`
  after changes; push after each committed unit.
- FYI: `TMRW_GHL` and `Meta_Ads` MCP integrations exist in-session — a possible
  future path to pull GHL/Meta via API instead of CSV.
