# Propela Ops — Supabase Go-Live Runbook

Ordered steps to take Propela Ops live on Supabase for **exactly two full-access
superadmins** (Vuyo, Aya). Public sign-ups stay **OFF**.

- **Supabase project URL:** `https://erlmsfxpwskufxmmeztg.supabase.co`
- **Backend cutover is flag-gated** by `SUPABASE_BACKEND`. Until it is ON, the app
  keeps using the legacy localStorage backend — so this can be prepared safely and
  flipped when ready.

> ## SECURITY — READ FIRST
> - **NEVER commit or paste the `service_role` key or the database password** into
>   the repo, chat, tickets, or the SQL Editor. They grant full, RLS-bypassing access.
> - The **only** Supabase values that belong in the frontend are the **project URL**
>   and the **public `anon` key** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
> - Only **two** accounts will exist (Vuyo, Aya), both Superadmin. **Public sign-ups
>   are disabled** so no one else can self-register.
> - The `service_role` key is used **only** locally/CI for the one-time seed step and
>   is passed via environment variables — never persisted.

---

## Step A — Apply the schema

1. Open the [Supabase SQL Editor](https://erlmsfxpwskufxmmeztg.supabase.co) →
   **SQL Editor** → **New query**.
2. Paste the **entire** contents of [`supabase/bundled_migration.sql`](../supabase/bundled_migration.sql).
3. Click **Run**.

This creates all tables, triggers, the `profiles` table + `current_role_name()`
helper, the `handle_new_user()` auto-provision trigger, and all RLS policies. It is
re-runnable. No secret is shared with anyone to do this.

> The individual files in `supabase/migrations/` are the source of truth;
> `bundled_migration.sql` is generated from them for one-paste convenience.

---

## Step B — Auth setup (disable sign-ups, create the two users)

1. **Disable public sign-ups:** Supabase Dashboard → **Authentication** →
   **Providers / Settings** → turn **"Allow new users to sign up"** **OFF**.
2. **Create the two users:** Authentication → **Users** → **Add user** (create each
   with a password):
   - `Vuyo@propela.co`
   - `Aya@propela.co`

On creation, the `handle_new_user()` trigger auto-inserts a least-privilege
`Read-only` profile for each — so no account is ever left with a NULL role.

---

## Step C — Promote the two accounts to Superadmin

Back in the **SQL Editor**, paste and run
[`supabase/promote_superadmins.sql`](../supabase/promote_superadmins.sql):

```sql
insert into profiles (user_id, role)
select id, 'Superadmin'
from auth.users
where lower(email) in ('vuyo@propela.co', 'aya@propela.co')
on conflict (user_id) do update set role = 'Superadmin';
```

Email matching is case-insensitive but must match the accounts created in Step B.
Superadmin has the **same full access as Admin** on every table.

---

## Step D — Seed data (local/CI, service_role key)

Run the seed migration **locally** (or in CI) with the two server-only env vars set.
**Do not commit or paste these values.** Get the `service_role` key from Supabase →
**Project Settings** → **API**.

> **SECURITY:** the `service_role` key bypasses RLS. **Never commit or paste it**
> into the repo, chat, tickets, or the SQL Editor. Pass it only via an environment
> variable for this one-time step. These vars are **not** `VITE_`-prefixed, so they
> never reach the browser bundle.

### Recommended for launch — start clean apart from the live nurses

For the **"start clean apart from the live nurses"** cutover, seed **ONLY the 7 live
nurses** and leave everything else empty. Set `MIGRATE_DOMAINS=nurses`:

```bash
MIGRATE_DOMAINS=nurses \
SUPABASE_URL="https://erlmsfxpwskufxmmeztg.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key — DO NOT COMMIT>" \
npm run migrate:seed
```

> **NOTE:** `npm run migrate:seed` first bundles the migration script (via
> esbuild) into `scripts/dist/migrate-seed.mjs`, then runs that bundle under
> Node. Bundling resolves the app's extension-less relative imports so the
> script runs under plain `node` (its `node_modules` deps stay external).

With this, **everything else stays EMPTY** — facilities, placements, documents,
communications, reports, etc. — and can be added later. In particular, **facilities
will be added alongside CVs**. The script logs exactly which domain(s) it will
migrate before it starts.

`MIGRATE_DOMAINS` is a **comma-separated** list of **case-sensitive** domain names
(e.g. `nurses` or `nurses,cohorts`). If any name is not a valid domain, the script
prints the list of valid names and **exits without contacting the database**.

### Migrate everything instead

To migrate **all** domains, simply **omit** `MIGRATE_DOMAINS` (the default,
unchanged behavior):

```bash
SUPABASE_URL="https://erlmsfxpwskufxmmeztg.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service_role key — DO NOT COMMIT>" \
npm run migrate:seed
```

The script fails fast if either required variable is missing and exits non-zero on
any per-domain count mismatch.

---

## Step E — Vercel env vars (frontend, public values only)

In the Vercel project → **Settings** → **Environment Variables**, set for
**Production**:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://erlmsfxpwskufxmmeztg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the public **anon** key (Supabase → Project Settings → API) |

Then **Redeploy**. These are the only Supabase values that belong in the frontend.

---

## Step F — Cut over to the Supabase backend

The Data_Layer routes to Supabase only when the `SUPABASE_BACKEND` feature flag is
ON. Enable it in Vercel → **Environment Variables** (Production):

| Variable | Value |
|----------|-------|
| `VITE_FEATURE_FLAGS` | `SUPABASE_BACKEND` |

(If other flags are already set, append comma-separated, e.g.
`SUPABASE_BACKEND,DARK_MODE`.) Then **Redeploy**.

**Instant fallback:** to revert to the legacy localStorage backend, remove
`SUPABASE_BACKEND` from `VITE_FEATURE_FLAGS` (flip OFF) and redeploy. No data change
is needed to fall back.

---

## Post-cutover smoke check

1. Sign in as `Vuyo@propela.co` and `Aya@propela.co`; confirm full access.
2. Confirm no one can self-register (sign-ups OFF).
3. Confirm seeded data is visible and edits persist.
