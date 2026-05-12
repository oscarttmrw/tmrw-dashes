# TMRW Operating Dashboard — Agent Handoff Context

> Give this file to the next Claude Code session at the start of the conversation.
> Working directory: `/home/user/tmrw-dashes`
> Active branch: `claude/implement-mvp-spec-tpdhK`

---

## What This Project Is

A Next.js 14 internal operating dashboard for **TMRW Health** (a longevity/preventative health company). It replaces manual spreadsheet reporting with a live, data-connected dashboard. Data enters via CSV upload (manual for now; Snowflake daily pipeline is the future target). The dashboard is invite-only, protected by Supabase Auth.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, `src/` directory |
| Styling | Tailwind CSS v3, custom design tokens in `src/app/globals.css` |
| Auth | Supabase SSR (`@supabase/ssr`) — PKCE flow |
| Database | Supabase (Postgres) |
| Hosting | Vercel |
| Charts | Recharts |
| CSV parsing | PapaParse (client + server), XLSX (xlsx package) |

---

## Repository Structure

```
src/
├── app/
│   ├── layout.tsx                    # Bare root layout — NO AppShell
│   ├── login/page.tsx                # Auth page (no AppShell)
│   ├── auth/
│   │   ├── callback/route.ts         # Handles OAuth code + token_hash invite/recovery
│   │   └── update-password/page.tsx  # Set password on invite (onboarded gate)
│   ├── (dashboard)/                  # Route group — all pages wrapped in AppShell
│   │   ├── layout.tsx                # Renders <AppShell>
│   │   ├── page.tsx                  # Scorecard (home)
│   │   ├── financial/page.tsx
│   │   ├── members/page.tsx          # Acquisition
│   │   ├── clinical/page.tsx         # Delivery
│   │   ├── retention/page.tsx
│   │   ├── support/page.tsx
│   │   ├── marketing/page.tsx
│   │   ├── eos/page.tsx
│   │   ├── board-pack/page.tsx
│   │   ├── strategy/page.tsx
│   │   ├── team/page.tsx
│   │   └── admin/
│   │       ├── page.tsx              # Admin hub
│   │       ├── upload/page.tsx       # CSV upload with confirmation modal
│   │       ├── upload-history/page.tsx # Upload audit log table
│   │       ├── registry/page.tsx     # Data source registry (static + live upload data)
│   │       ├── settings/page.tsx     # Demo/Actual mode toggle + invite link
│   │       ├── invite/page.tsx       # Invite user by email
│   │       └── manual/page.tsx       # Manual metric entry
│   └── api/
│       ├── admin/invite/route.ts     # POST — Supabase admin invite
│       ├── data/
│       │   ├── upload/route.ts       # POST multipart/form-data — parse + persist CSV
│       │   ├── latest/route.ts       # GET — latest complete batch per source
│       │   └── history/route.ts      # GET — upload_log rows (audit trail)
│       └── priorities/route.ts       # GET/POST — EOS weekly priorities
│
├── middleware.ts                     # CRITICAL: lives at src/middleware.ts (not project root)
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── top-bar.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── metric-card.tsx
│   │   ├── data-source-badge.tsx     # Coloured badge per source key
│   │   ├── section-heading.tsx
│   │   └── ...
│   └── ui/                           # shadcn/ui primitives (badge, button, dialog, etc.)
│
├── lib/
│   ├── context/data-context.tsx      # Central data store (DataProvider, useDashboardData)
│   ├── config/
│   │   ├── navigation.ts             # Nav items (add new pages here)
│   │   └── data-sources.ts           # CSV schemas + export steps + powered metrics per source
│   ├── processors/                   # One processor per source — parse CSV → typed data
│   │   ├── tableau-processor.ts
│   │   ├── hubspot-processor.ts
│   │   ├── stripe-processor.ts
│   │   ├── zendesk-processor.ts
│   │   ├── meta-processor.ts
│   │   └── pelagonia-processor.ts
│   ├── types/
│   │   ├── index.ts                  # Re-exports Member, Transaction, Ticket, Clinician, Alert, Rock
│   │   ├── member.ts
│   │   ├── transaction.ts
│   │   ├── ticket.ts
│   │   ├── meta.ts                   # MetaAdRow
│   │   ├── pelagonia.ts              # PelagoniaRow
│   │   └── data-sources.ts           # DataSourceName union, CsvSchema, DataSourceConfig
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (createBrowserClient)
│   │   ├── server.ts                 # Server component client (createServerClient + cookies)
│   │   └── service.ts                # Service role client (bypasses RLS)
│   ├── upload-strategies.ts          # fullReplaceStrategy, dateRangeReplaceStrategy, upsertStrategy
│   └── utils/
│       └── metric-source.ts          # metricSourceMap + getMetricsPoweredBy(sourceKey)
│
└── data/mock/                        # Mock data for demo mode
```

---

## Supabase Schema

All three migrations must be applied (user has run all three):

### `001_create_tables.sql`
```sql
upload_log (id uuid PK, source text, record_count int, status text, error text, uploaded_at timestamptz)
tableau_data  (id, batch_id → upload_log.id, row_data jsonb, inserted_at)
hubspot_data  (same structure)
stripe_data   (same structure)
zendesk_data  (same structure)
priorities_log (id, week_of date, data jsonb, uploaded_at)
```

### `002_add_meta_pelagonia.sql`
```sql
meta_data      (id, batch_id → upload_log.id, row_data jsonb, inserted_at)
pelagonia_data (same structure)
```

### `003_audit_columns.sql`
```sql
ALTER TABLE upload_log ADD COLUMN IF NOT EXISTS
  uploaded_by text, data_period_from date, data_period_to date,
  data_period_label text, file_name text;
```

All tables have RLS enabled with a "service role full access" policy. The service role key is used in all API routes.

---

## Data Sources

Six CSV-upload sources, each with a processor, schema, and write strategy:

| Source key | Table | Write strategy | Date col for detection |
|---|---|---|---|
| `tableau` | `tableau_data` | fullReplace | `Created At` (from processed data) |
| `hubspot` | `hubspot_data` | fullReplace | `created at` |
| `stripe` | `stripe_data` | dateRangeReplace on `created` | `created` |
| `zendesk` | `zendesk_data` | upsert on `ID` | `created at` |
| `meta` | `meta_data` | dateRangeReplace on `Reporting Starts` | `Reporting Starts` / `Reporting Ends` |
| `pelagonia` | `pelagonia_data` | fullReplace | `created at` |

Column validation is **case-insensitive** on both client and server (normalise to `.toLowerCase().trim()` before comparing).

---

## Data Flow Architecture

### Upload flow (as of latest session)
1. User drops / selects file on an upload card
2. **Client-side only**: file is parsed locally (PapaParse / XLSX) to validate columns, detect date range, and build in-memory typed data
3. Modal opens — shows file name, row count, auto-detected date range (editable), period label (editable), uploaded-by (pre-filled from `supabase.auth.getUser()`)
4. On **Confirm**: client POSTs the raw file via `FormData` to `/api/data/upload` with audit fields
5. API parses the file server-side, validates, writes to Supabase, marks `upload_log` complete
6. On API success: client calls `updateSource(sourceKey, parsedData)` to update in-memory state + localStorage
7. On API failure: error shown in card, in-memory state NOT updated

### `updateSource` (data-context.tsx)
- **Only** updates in-memory `useState` + `localStorage`. Does NOT call any API. This was a deliberate fix — the old version had a silent fire-and-forget fetch which caused data to appear saved when it wasn't.

### On page load
- `DataProvider` fetches `/api/data/latest` which returns the newest complete batch per source from Supabase
- Falls back to `localStorage` if server is unavailable
- Default mode is `'actual'` (not demo)

---

## Auth Architecture

### Key files
- **`src/middleware.ts`** — MUST be at `src/middleware.ts`, NOT project root (project uses `src/` directory structure)
- **`src/lib/supabase/server.ts`** — server component / API route client
- **`src/lib/supabase/client.ts`** — browser client (`createBrowserClient`)
- **`src/lib/supabase/service.ts`** — service role client for API routes (bypasses RLS)

### Middleware matcher
Protects everything except: `_next/static`, `_next/image`, static assets, `/login`, `/auth/callback`, `/auth/update-password`.

### Invite flow
1. Admin POSTs to `/api/admin/invite` with `{ email }` — no password required (trusted users only)
2. Supabase sends invite email with `token_hash`
3. User clicks link → hits `/auth/callback` which calls `verifyOtp({ token_hash, type: 'invite' })` → redirects to `/auth/update-password`
4. On that page, user sets password → `updateUser({ password, data: { onboarded: true } })` → redirect to `/`
5. Middleware gate: if `user.user_metadata.onboarded === false`, redirect to `/auth/update-password`. Uses strict `=== false` (not `!== true`) so legacy users (undefined metadata) pass through.

### Redirects
- After login: `window.location.href = '/'` (full navigation — NOT `router.push` — to ensure cookies are picked up)
- After update-password: `window.location.href = '/'` (same reason)

### Supabase email template
The invite email template MUST be set to:
```
You've been invited to create a login for TMRW's Dashboards!
Accept the invite here: {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite
```
(The default `{{ .ConfirmationURL }}` does NOT route through `/auth/callback` correctly.)

---

## Data Context (`src/lib/context/data-context.tsx`)

```ts
interface DashboardData {
  members: Member[]
  transactions: Transaction[]
  tickets: Ticket[]
  clinicians: Clinician[]
  metaAds: MetaAdRow[]
  pelagoniaOpportunities: PelagoniaRow[]
  manualMetrics: ManualMetrics
  rocks: Rock[]
  alerts: Alert[]
  isUsingMockData: boolean
  dataMode: 'demo' | 'actual'
  lastRefreshed: Record<string, string | null>  // per source ISO timestamp
}

// Context also exposes:
derivedCAC: number | null   // totalMetaSpend / customerCount
hasActualData: boolean
isLoading: boolean
resetToDemo(): void         // switches to demo/mock data
switchToActual(): void      // restores from localStorage/API
updateSource(key, Partial<DashboardData>): void   // in-memory + localStorage ONLY
```

Demo mode: triggered from `/admin/settings`. Shows a sticky amber banner. Demo data lives in `src/data/mock/`.

---

## Design System

All tokens defined in `src/app/globals.css` as CSS custom properties. Key tokens:

```
--color-dash-bg            # Page background
--color-dash-surface       # Card background
--color-dash-surface-alt   # Table headers, secondary surfaces
--color-dash-border        # Default border
--color-dash-border-strong # Hover/active border
--color-dash-text          # Primary text
--color-dash-text-secondary
--color-dash-text-muted
--color-dash-text-inverse  # Text on red bg
--color-dash-red           # #8B0000 — primary action colour
--color-dash-red-light     # #8B000015 — drag-over backgrounds etc.
--color-status-green / -light
--color-status-amber / -light
--color-status-red / -light
--color-src-hubspot / src-stripe / src-zendesk / src-manual / src-tableau
```

All dashboard pages use `'use client'`. No server components in the `(dashboard)` group currently.

---

## Navigation (`src/lib/config/navigation.ts`)

Add new pages here. Structure:
```ts
{ label: string, href: string, icon: LucideIcon, section: 'home' | 'operations' | 'management' | 'admin' }
```

Current admin links: Data Upload, Upload History, Data Registry, Settings.

---

## Known Patterns & Gotchas

### TypeScript
- Recharts `data=` props must be cast to `object[]` to avoid TS union type errors
- `CookieOptions` must be imported from `@supabase/ssr` when typing the `setAll` callback in server/middleware clients
- `createServiceClient` is the export name from `service.ts` — always import as `import { createServiceClient as createClient }`

### Charts
- All Recharts bar/line chart `data` props: `data={myArray as object[]}`
- Chart wrapper components live in `src/components/dashboard/tmrw-area-chart.tsx` and `tmrw-line-chart.tsx`

### Supabase prerender errors
- Never call `createClient()` at component body level on pages that might prerender
- Call it inside event handlers or `useEffect` only

### Upload page modal
- Modal renders inside `UploadCard` with `fixed inset-0 z-50` — works because no ancestor has CSS transform
- `currentUserEmail` is fetched at page level via `supabase.auth.getUser()` and passed as prop

### Data source badge (`src/components/dashboard/data-source-badge.tsx`)
- Accepts `source: 'hubspot' | 'stripe' | 'zendesk' | 'manual' | 'tableau' | 'meta' | 'pelagonia'`
- Add new sources here when adding new data integrations

---

## Supabase Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server/API only
```

Set in Vercel dashboard AND `.env.local` for local dev. The service role key must NOT be prefixed `NEXT_PUBLIC_`.

Supabase URL config:
- Site URL: `https://your-vercel-domain.vercel.app`
- Redirect URLs: `https://your-vercel-domain.vercel.app/auth/callback`

---

## What's Working (as of handoff)

- ✅ Full auth flow: invite → set password → login → protected dashboard
- ✅ 6 data sources uploadable: Tableau, HubSpot, Stripe, Zendesk, Meta, Pelagonia
- ✅ Upload confirmation modal with audit metadata capture
- ✅ Data persists to Supabase per-source tables via appropriate write strategy
- ✅ `/admin/upload-history` — full audit log with filters
- ✅ `/admin/registry` — live last-upload data from upload_log
- ✅ Drag-and-drop on upload cards with global drag detection
- ✅ Case-insensitive column validation (client + server)
- ✅ Demo/actual mode toggle in settings
- ✅ Derived CAC (Meta spend ÷ customer count)
- ✅ All Vercel builds pass cleanly

---

## What's Not Done / Possible Next Steps

These are informed guesses based on what exists — not confirmed by the user:

1. **Dashboard pages showing real data** — Most dashboard pages (financial, marketing, members, etc.) likely still show empty states or partial data. The processors and context are wired; the page-level metric calculations and chart components may need connecting to the new sources (Meta, Pelagonia).

2. **Marketing page** — currently shows `1.52 kB` which suggests minimal implementation. Meta and Pelagonia data should power this page.

3. **Acquisition page** (`/members`) — should show CAC, Meta funnel metrics, Pelagonia pipeline metrics alongside member data.

4. **Clinicians data** — `clinicians: Clinician[]` exists in context but the Tableau processor is the only thing that can populate it. May need a dedicated source or HubSpot enrichment.

5. **Snowflake daily pipeline** — The target architecture. `NEXT_PUBLIC_SNOWFLAKE_EXPORT_URL` env var already has a dormant auto-fetch in `data-context.tsx` at lines 302–347. Activating it requires pointing the env var at a real export endpoint.

6. **Registry page cleanup** — static `lastSync` fields on non-uploadable sources (Oracle, GA4, etc.) are still hardcoded. The `metricsUnlocked` counts are also static and may be inaccurate.

7. **Mobile nav** — the mobile sidebar (`mobile-nav.tsx`) may not include the new Upload History nav item if it has its own static list.

8. **Error surfacing at the page level** — upload errors show in the card; there's no global error toast/notification system.

9. **`/admin/manual` page** — manual metric entry exists but may need expansion as more metrics are tracked.

---

## Git

Branch: `claude/implement-mvp-spec-tpdhK`
Remote: `oscarttmrw/tmrw-dashes` on GitHub

All commits push to the branch above. Do NOT push to main without explicit instruction.

Latest commit: `ea2b694` — Audit trail, confirmation modal, upload history, and registry live data
