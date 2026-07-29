# Propela Ops — Supabase Go-Live Runbook

Ordered steps to take Propela Ops live on Supabase for **exactly two full-access
superadmins** (Vuyo, Aya). Public sign-ups stay **OFF**.

**Current production state:** the Vercel production site is live and has been
observed serving a Supabase-enabled bundle with valid public configuration.
`main` now includes the production-mode correction from merged PR #49. Confirm
that Vercel has redeployed that merge before accepting the cutover. The repository
contains migrations through `0008_nurse_owner_invariants.sql`, but repository
parity and the read-only checks below do **not** establish that migration 0008 is
applied in the production database. The latest bounded read-only check reached
both required tables and reported "no anonymous rows observed." That observation
does not establish RLS denial because either table could be empty. Auth settings
did not confirm signups disabled. Disabling public signups and rerunning both local
verifiers is therefore the immediate production blocker; no authenticated or
mutating check was attempted.

- **Supabase project URL:** `https://erlmsfxpwskufxmmeztg.supabase.co`
- **Backend cutover is flag-gated** by `SUPABASE_BACKEND`. Until it is ON, the app
  keeps using the legacy localStorage backend — so this can be prepared safely and
  flipped when ready.

> ## SECURITY — READ FIRST
>
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

| Variable                 | Value                                                       |
| ------------------------ | ----------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://erlmsfxpwskufxmmeztg.supabase.co`                  |
| `VITE_SUPABASE_ANON_KEY` | the public **anon** key (Supabase → Project Settings → API) |

Then **Redeploy**. These are the only Supabase values that belong in the frontend.

---

## Step F — Cut over to the Supabase backend

The Data_Layer routes to Supabase only when the `SUPABASE_BACKEND` feature flag is
ON. Enable it in Vercel → **Environment Variables** (Production):

| Variable             | Value              |
| -------------------- | ------------------ |
| `VITE_FEATURE_FLAGS` | `SUPABASE_BACKEND` |

(If other flags are already set, append comma-separated, e.g.
`SUPABASE_BACKEND,DARK_MODE`.) Then **Redeploy**.

**Instant fallback:** to revert to the legacy localStorage backend, remove
`SUPABASE_BACKEND` from `VITE_FEATURE_FLAGS` (flip OFF) and redeploy. No data change
is needed to fall back.

---

## Current post-cutover verification checklist

Run the checks in this order against the current Vercel production deployment.
They are intentionally split between unauthenticated read-only evidence and
operator-authorized database/application evidence.

### 1. Run both read-only verifiers

First verify the deployed SPA, routing, cache policy, HTTPS redirect, and security
headers:

```bash
npm run verify:production -- --url https://your-production-app.example
```

Then verify the production Supabase public boundary locally. The verifier is
operator-run only; there is no secret-bearing GitHub workflow. Set the non-secret
URL, read the public anon key with a masked prompt, export it for the verifier,
and unset it immediately afterward:

```bash
export SUPABASE_VERIFY_URL="https://erlmsfxpwskufxmmeztg.supabase.co"
read -rsp "Supabase production anon key: " SUPABASE_VERIFY_ANON_KEY
echo
export SUPABASE_VERIFY_ANON_KEY
npm run verify:supabase-production
unset SUPABASE_VERIFY_ANON_KEY
```

A pre-provisioned secure environment that exports `SUPABASE_VERIFY_ANON_KEY` is
also acceptable; run the verifier and unset the key afterward. Never place the
key in an inline command assignment, command argument, log, ticket, or document.

The Supabase verifier uses only bounded unauthenticated GET requests. It checks
that public signups report disabled and that the required `nurses` columns
(`id`, `owner_id`, `version`) and `profiles` columns (`user_id`, `role`) are
reachable. For successful empty responses it reports only "no anonymous rows
observed." This observation does not prove RLS denial because the tables may be
empty. RLS enforcement requires an authorized test with known existing or
disposable rows. The verifier never prints response bodies, rows, request headers,
query strings, raw backend errors, or the anon key.

This probe is operational evidence only. It cannot establish requirements involving
authenticated sessions, application failure handling, telemetry, store isolation,
migration 0008, authenticated policies, CRUD, optimistic concurrency, or delete
behavior.

### 2. Complete the authorized production checks

Only after both read-only verifiers pass, an authorized operator must:

- confirm production has applied migrations through
  `0008_nurse_owner_invariants.sql`, including the nurse ownership invariant and
  version trigger;
- using disposable records and approved temporary role profiles, exercise nurse
  create, authoritative read/refresh, update, and delete as **Superadmin**,
  **Admin**, and **Recruiter**;
- create a two-session stale-version update and confirm the stale write is
  rejected without overwriting the newer record;
- verify successful delete convergence and the already-deleted/stale-delete
  outcome;
- confirm denied anonymous, missing-profile, and non-operational-role requests do
  not become client success, regardless of visible frontend controls; and
- remove every disposable nurse and temporary role profile after evidence is
  recorded.

These authorized checks remain the evidence for migration 0008's ownership
trigger, authenticated role policies, nurse CRUD, optimistic concurrency, delete
convergence, and RLS denial. Neither read-only verifier can prove those behaviors.

### Acceptance checklist

- [ ] Current Vercel production deployment contains merged PR #49
- [ ] `npm run verify:production` passes against the live application origin
- [ ] `npm run verify:supabase-production` passes against the production Supabase origin
- [ ] Authorized operator confirms migration `0008_nurse_owner_invariants.sql` is applied
- [ ] Disposable Superadmin/Admin/Recruiter nurse CRUD checks pass
- [ ] Stale-version conflict, delete convergence, and authenticated RLS-denial checks pass
- [ ] Disposable records and temporary role profiles are removed
