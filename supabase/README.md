# Supabase migrations

This directory holds the in-repo database artifacts for the **supabase-online-platform**
feature. The SQL under `migrations/` is the authoritative, version-controlled
definition of the Postgres schema, triggers, roles, and Row Level Security (RLS)
policies that back Propela Ops once the `SUPABASE_BACKEND` feature flag is enabled.

> The one-time creation of the Supabase project (and setting its env vars) is a
> **manual operator step** performed in the Supabase dashboard. The migrations in
> this folder are the reproducible artifact that is applied *to* that project.

## Migration files (apply in order)

| Order | File | Purpose |
|------:|------|---------|
| 1 | `0001_core_schema.sql` | Core tables: `nurses`, `facilities`, `cohorts`, `placements`, `documents`, `audit_log` (common columns + typed/JSONB, FKs, filter indexes). |
| 2 | `0002_bump_version_trigger.sql` | `bump_version()` function + `BEFORE UPDATE` triggers on the core tables (optimistic-concurrency token). |
| 3 | `0003_profiles_and_roles.sql` | `profiles` table (`Recruiter`/`Admin`) + `current_role_name()` helper. |
| 4 | `0004_core_rls.sql` | Enables RLS + Admin/Recruiter policies on core tables and `profiles`. |
| 5 | `0005_remaining_schema.sql` | Tables for every remaining domain in `src/lib/dataLayer/domains.js` + their `bump_version` triggers. |
| 6 | `0006_remaining_rls.sql` | Enables RLS + Admin-only / per-user / operational policies on the remaining tables. |

The files are numbered so they apply deterministically in order.

## Applying the migrations (Supabase CLI)

Prerequisites: the [Supabase CLI](https://supabase.com/docs/guides/cli) and a
Supabase project you have created in the dashboard.

```bash
# 1. Link this repo to your Supabase project (one-time; run from the repo root).
#    Grab the project ref from the dashboard URL / project settings.
supabase link --project-ref <your-project-ref>

# 2. Push every migration in supabase/migrations/ to the linked project.
supabase db push
```

For a local development database:

```bash
supabase start          # boots a local Postgres + Studio
supabase db reset       # applies all migrations from scratch to the local DB
```

> **Do not** run these migrations against a live production project without
> reviewing them first. The DDL is written to be re-runnable
> (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`,
> `DROP TRIGGER/POLICY IF EXISTS` before create), but RLS changes affect access
> immediately.

## Schema conventions

- **Common columns** on every domain table: `id text PRIMARY KEY` (preserves seed
  IDs), `owner_id uuid REFERENCES auth.users(id)`, `version integer`,
  `created_at`, `updated_at`.
- **Hybrid relational + JSONB**: fields that are filtered/sorted/joined are typed
  columns with indexes; nested structures live in JSONB (`attributes` for
  collections, `value` for singletons) for exact write-then-read round-trips.
- **`bump_version()`** advances `version` and `updated_at` on every `UPDATE`
  (including manual edits in the Supabase table editor), which powers
  optimistic-concurrency conflict detection in the Data_Layer.
- **RLS is deny-by-default**: enabled on every table. Admin-only domains have only
  an Admin policy; per-user domains scope rows to `owner_id = auth.uid()`;
  operational domains grant Admin full access + Recruiter operational access.

## Sanity check

`scripts/check-migrations.mjs` (in the repo root `scripts/` dir) verifies that
every domain declared in `src/lib/dataLayer/domains.js` has a corresponding
`CREATE TABLE` in these migrations and that RLS is enabled for it. Run:

```bash
node scripts/check-migrations.mjs
```

This is a static text check only — it never connects to a database.


## Running the RLS & integration test suites

The property/unit suite (`npx vitest run`) is fully self-contained: property tests
use an in-memory fake client and the RLS coverage test only scans these migration
files statically. Neither opens a network connection.

Two additional suites exercise a **real** database and are therefore SKIPPED by
default (`describe.skipIf`). They run only when the `SUPABASE_TEST_*` environment
variables are present, so they never fail or hang the default test run:

| Suite | File | What it verifies |
|-------|------|------------------|
| Live RLS policy | `src/lib/dataLayer/__tests__/rlsPolicy.live.test.js` | Role matrix (Recruiter vs Admin), deny-by-default, no-role denial, anon-key stays RLS-constrained. |
| Live integration | `src/lib/dataLayer/__tests__/supabase.integration.live.test.js` | Real read/write through the adapter, `bump_version` trigger, and manual-edit visibility. |

The always-on static counterpart is
`src/lib/dataLayer/__tests__/rlsPolicyCoverage.test.js`, which asserts the policy
shape of every domain table (admin-only, per-user, operational) directly from the
SQL in this folder.

### Steps

```bash
# 1. Boot a local Supabase stack and apply every migration from scratch.
supabase start
supabase db reset

# 2. Export the connection env (values are printed by `supabase start`).
export SUPABASE_TEST_URL="http://127.0.0.1:54321"
export SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key>"
export SUPABASE_TEST_ANON_KEY="<anon key>"        # optional; recommended for RLS tests

# 3. Run the live suites (now un-skipped).
npx vitest run src/lib/dataLayer/__tests__/rlsPolicy.live.test.js \
               src/lib/dataLayer/__tests__/supabase.integration.live.test.js
```

The `service_role` key is used only to provision test users and seed/clean rows;
all RLS assertions are made through per-user anon clients so enforcement is
observed exactly as the browser would experience it. These secrets must live only
in the local shell / CI secrets — never in `.env` committed to the repo.
