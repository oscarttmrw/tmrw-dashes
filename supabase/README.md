# Database

The dashboard runs on Supabase (Postgres). Everything is written by server-side
API routes using the **service role** key. RLS is on for every table and the
anon key can read nothing — the browser never talks to these tables directly.

## Which migration file to run

| Situation | What to run |
|---|---|
| Existing / production database | `005_document_existing_schema.sql` — it is a **pure no-op**, safe to run any time |
| Fresh or rebuilt database | `005_document_existing_schema.sql` **alone** — it is complete and self-contained |
| Retiring the two dead tables | `006_drop_legacy_tables.sql` — read its header first, it is the only destructive file |
| Anything else | Nothing. `001`–`004` are historical record only |

> **Never run `001_create_tables.sql`.** Its second line is
> `drop table if exists upload_log cascade`, and because every data table has a
> foreign key to `upload_log`, that one statement would cascade and destroy the
> whole database. It is kept only as the record of how things started.

`005` exists because the migration folder had drifted from the live database:
six tables the app depends on were created by hand in the SQL editor and never
written down, and four more were rebuilt with typed columns while `001`/`002`
still described them as `jsonb` blobs. `005` was reconstructed from the code
that reads and writes each table, and is now the single source of truth.

## Tables

Ingest tables — written by a processor in `src/lib/processors/`, read by
`/api/data/latest`:

| Table | Holds | Write strategy |
|---|---|---|
| `meta_ads` | Daily paid Meta performance (campaign totals) | dateRangeReplace on `date` |
| `social_followers` | Follower snapshot per platform | upsert on `(date, platform)` |
| `social_views` | Daily engagement per platform | upsert on `(date, platform)` |
| `hubspot_contacts` | Member lifecycle + clinical milestones | fullReplace |
| `ghl_opportunities` | GoHighLevel sales pipeline | upsert on `opportunity_id` |
| `operational_data` | Daily ops counters | upsert on `date` |
| `stripe_data` | Stripe invoices | upsert on `stripe_invoice_id` |
| `zendesk_data` | Support tickets | upsert on `zendesk_ticket_id` |
| `tableau_data` | Per-member measure events | fullReplace |
| `pelagonia_data` | Pelagonia opportunities + appointments | dateRangeReplace on `pelagonia_created_at` |
| `financial_revenue` | Daily net + gross revenue by line | replace per `revenue_type` |

Supporting tables:

| Table | Holds |
|---|---|
| `upload_log` | One row per ingest batch — the audit trail. Read by `/admin/upload-history` |
| `plan_targets` | Admin-entered monthly targets, one row per month |
| `priorities_log` | EOS weekly priorities, append-only |

### Unique constraints are load-bearing

The upsert strategies in `src/lib/upload-strategies.ts` pass `onConflict`, which
**requires** a matching unique constraint to exist. If one is missing, the
upsert fails or silently duplicates rows. The constraints are listed in the
header of `005`; don't drop one without changing the write strategy to match.

## Privacy notes

Two things are deliberate and worth preserving:

- **`hubspot_contacts` has no name, email, or phone column.**
  `hubspot-contacts-processor.ts` holds a `PII_LC` blocklist and strips those
  fields from the HubSpot export before anything reaches the database. Don't add
  them back.
- **`meta_ads` is campaign-level only** — spend, impressions, clicks per day. No
  person-level data lands in it.

Because health data is *sensitive information* under the Australian Privacy Act,
check the Supabase project's region before adding any new member-level source.

## Adding a new source

1. Add the table to `005` (or a new numbered migration if the table is new).
2. Write a processor in `src/lib/processors/` that returns canonical rows.
3. Register it in `src/lib/ingest/pipeline.ts` — `SOURCE_TABLE`,
   `SOURCE_DATE_COLUMN`, `SOURCE_PROCESSOR`, and `applyWriteStrategy`.
4. Add it to `SOURCE_TABLE` / `SOURCE_ORDER_COLUMN` / the `sources` array in
   `src/app/api/data/latest/route.ts` so the dashboard reads it.
5. Add its schema to `src/lib/config/data-sources.ts` for column validation.

Registering it in `pipeline.ts` wires up **both** the manual CSV upload and the
automated `/api/data/ingest` endpoint at once — they share that module, so
there is only one place to change.
