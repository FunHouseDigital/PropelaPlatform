# Deployment Guide

## Overview

Propela Platform is a React single-page application built with Vite. It is deployed as static files served by nginx inside a Docker container.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker and Docker Compose (for containerized deployment)

## Environment Variables

All client-side environment variables must be prefixed with `VITE_`. Vite reads these values while `npm run build` runs and embeds them in the static browser bundle; changing container runtime environment variables after the image is built does not change the application. Treat every `VITE_` value as public. Never pass a Supabase service-role key or database password through a `VITE_` variable, Docker build argument, or frontend hosting setting.

| Variable                     | Description                                                                               | Default                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `VITE_APP_TITLE`             | Application title                                                                         | `Propela Platform`                                              |
| `VITE_APP_VERSION`           | Application version                                                                       | `0.0.0`                                                         |
| `VITE_API_URL`               | Backend API base URL                                                                      | `http://localhost:3001/api`                                     |
| `VITE_SENTRY_DSN`            | Sentry error tracking DSN                                                                 | (empty)                                                         |
| `VITE_ENABLE_SERVICE_WORKER` | Enable/disable service worker                                                             | `true`                                                          |
| `VITE_ENABLE_ANALYTICS`      | Enable/disable analytics                                                                  | `false`                                                         |
| `VITE_ENVIRONMENT`           | Optional environment override (`development`, `staging`, `production`, or a custom label) | Vite production build: `production`; development: `development` |
| `VITE_LOG_LEVEL`             | Optional logging override (`debug`, `info`, `warn`, `error`)                              | Vite production build: `error`; development: `debug`            |
| `VITE_FEATURE_FLAGS`         | Comma-separated feature flags; include `SUPABASE_BACKEND` only at cutover                 | (empty)                                                         |
| `VITE_SUPABASE_URL`          | Public Supabase project URL used by the browser client                                    | (empty)                                                         |
| `VITE_SUPABASE_ANON_KEY`     | Public, RLS-constrained Supabase anonymous key                                            | (empty)                                                         |

Copy `.env.example` to `.env` and adjust the public build values for your environment. Docker Compose reads that file for `build.args`; it is not injected into the final nginx container. Vercel reads the same `VITE_` names from project environment settings during its build.

## Local Development

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

## Docker Build

### Build the image

```bash
# Docker Compose sources the public VITE_ build arguments from .env.
docker compose build

# Equivalent explicit build (values shown are placeholders).
docker build \
  --build-arg VITE_ENVIRONMENT=production \
  --build-arg VITE_LOG_LEVEL=error \
  --build-arg VITE_FEATURE_FLAGS=SUPABASE_BACKEND \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=public-anon-key \
  -t propela-platform .
```

Only public browser configuration belongs in these arguments. Do not add service-role or database-password arguments. The Docker build runs `npm run build:vercel`, so the same required-config guard used by Vercel and CI rejects an image build when `SUPABASE_BACKEND` is enabled without both public Supabase values.

### Run with Docker

```bash
docker run -p 8080:80 propela-platform
```

The application will be available at `http://localhost:8080`.

### Docker Compose (local)

```bash
docker compose up --build
```

This maps port 8080 on your host to port 80 in the container. Compose reads public `VITE_` values from `.env` and passes them as image build arguments. The resulting nginx container serves static files and does not receive `.env` at runtime; rebuild the image whenever a public frontend value changes.

## CI/CD Pipeline

The project uses GitHub Actions (`.github/workflows/ci.yml`) with three jobs:

1. **Lint** - Runs ESLint across the source code
2. **Test** - Runs the Vitest test suite
3. **Build** - Builds the production bundle (depends on lint and test passing)

The pipeline triggers on:

- Push to `main` branch
- Pull requests targeting `main`

Build artifacts are uploaded and retained for 7 days.

## Production Deployment

### Nginx Configuration

The included `nginx.conf` provides:

- **Gzip compression** for text, CSS, JavaScript, JSON, and SVG
- **SPA routing** via `try_files $uri $uri/ /index.html`
- **Cache headers** - immutable caching for hashed assets in `/assets/`, no-cache for `index.html` and `sw.js`
- **Security headers** - factored into `security-headers.conf` and `include`d once (see below)

### Security headers / Content-Security-Policy

All security headers and the Content-Security-Policy live in a single file,
`security-headers.conf`, which is the **single source of truth**. `nginx.conf`
`include`s it at the server scope and re-includes it inside every `location`
block that sets its own `add_header` (the `/assets/`, `= /index.html` and
`= /sw.js` cache blocks).

> **Why the re-include:** nginx's `add_header` is not additive across context
> levels — the moment a `location` declares any `add_header`, it stops
> inheriting the server-level ones. Re-including the shared file in those blocks
> keeps the policy defined exactly once while making sure no served response
> goes out without the headers. The SPA fallback `location /` has no
> `add_header`, so it inherits the headers from the server scope.

In the Docker image the snippet is placed at `/etc/nginx/security-headers.conf`
(copied by the `Dockerfile`; bind-mounted read-only by `docker-compose.yml`). It
is deliberately kept **outside** `/etc/nginx/conf.d/` so nginx's default
`include /etc/nginx/conf.d/*.conf;` does not try to load it as a standalone
server block.

Headers emitted: `X-Frame-Options`, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS) and
`Content-Security-Policy`.

#### Fonts

The app uses the **Poppins** webfont. `index.html` loads the stylesheet from
`https://fonts.googleapis.com` and the font files from `https://fonts.gstatic.com`.
We chose the **allowlist** approach (over self-hosting): the CSP explicitly
permits those two origins (`style-src`/`font-src`/`connect-src`) and the
`preconnect`/`dns-prefetch` hints in `index.html` are kept. The CSP and
`index.html` must stay in sync — the `securityHeaders.test.js` test enforces
this (if you ever drop the Google Fonts `<link>`, also remove the origins from
the CSP, and vice-versa). Self-hosting Poppins under `public/` and reverting the
CSP font origins to `'self'` remains a valid future hardening step.

#### Scoped `connect-src` for Supabase and environment services (IMPORTANT)

Both nginx (`security-headers.conf`) and Vercel (`vercel.json`) must emit the same strict CSP. Supabase browser and realtime traffic is deliberately limited to `https://*.supabase.co` and `wss://*.supabase.co`; keep both scoped entries and never replace them with broad `https:`, `wss:`, or `*` sources. The production verifier enforces this policy on `/` and `/nurses`.

Because this is a static build, API and Sentry hosts are also build/deployment specific. The checked-in policy contains placeholders that must be replaced consistently in **both** hosting configurations before go-live:

| Placeholder                  | Replace with                                               | Notes                                                                                                         |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `https://api.example.com`    | Your `VITE_API_URL` origin (scheme + host[:port], no path) | e.g. `https://api.propela.io`. For local Docker against `http://localhost:3001`, use `http://localhost:3001`. |
| `https://sentry.example.com` | Your Sentry ingest origin from `VITE_SENTRY_DSN`           | Remove this entry entirely if you do not use Sentry.                                                          |

`https://fonts.googleapis.com` and `https://fonts.gstatic.com` in `connect-src` are required so the **service worker** (`public/sw.js`) can re-fetch fonts for its stale-while-revalidate cache. Leave them while the Google Fonts link is present. After replacing optional API/Sentry placeholders, keep the nginx and Vercel CSP values identical and do **not** broaden `connect-src` to a scheme wildcard.

`Strict-Transport-Security` only has an effect when the response is served over
HTTPS. This container listens on plain `:80` behind the TLS-terminating load
balancer (see Architecture below); the edge forwards the header to the browser
over HTTPS. It is harmless over plain HTTP (e.g. local `docker compose`).

### Health Check

The Docker container includes a health check that verifies nginx is responding on port 80.

A status page is available at `/status` showing:

- Application version and build info
- Environment name
- Network connectivity status
- Service worker status
- localStorage usage

### Current production follow-up order

The Vercel production site is live and has been observed with the Supabase backend
and valid public browser configuration. `main` includes merged PR #49's production
mode/log-level inference fix. The repository bundle contains migration
`0008_nurse_owner_invariants.sql`; its presence in source does not establish that
it has been applied to production. The latest bounded read-only probe reached the
required `nurses` and `profiles` columns and reported "no anonymous rows
observed." This observation does not establish RLS denial because either table
could be empty. Auth settings did not confirm public signups disabled. Disable
public signups and rerun the local verifiers before authorized testing. For a new
environment, migrations must
still be applied before enabling `SUPABASE_BACKEND`. For the current live
follow-up, use this non-mutating-first sequence:

1. **Confirm the current Vercel deployment contains merged PR #49.** Production
   builds infer `VITE_ENVIRONMENT=production` and `VITE_LOG_LEVEL=error` when no
   explicit overrides are set.
2. **Run the application read-only verifier.** Use
   `npm run verify:production -- --url https://app.example.com`, set
   `PRODUCTION_URL`, or manually dispatch **Verify production**. It performs
   bounded GET checks of `/` and `/nurses` plus the HTTP-to-HTTPS redirect.
3. **Run the Supabase read-only verifier locally.** It is intentionally
   operator-run only; there is no secret-bearing GitHub workflow. Set
   `SUPABASE_VERIFY_URL` to the production Supabase origin. Load
   `SUPABASE_VERIFY_ANON_KEY` from a pre-provisioned secure environment, or use a
   masked shell prompt as shown in `docs/GO_LIVE.md`; then run
   `npm run verify:supabase-production` and unset the key.
4. **Have an authorized operator confirm migration 0008.** Verify production has
   applied migrations through `0008_nurse_owner_invariants.sql`, including the
   nurse owner invariant and version trigger. Neither read-only verifier proves
   this database state.
5. **Run authorized nurse behavior checks with disposable records.** Exercise
   create/read/refresh/update/delete as Superadmin, Admin, and Recruiter; produce
   and reject a stale-version update; confirm delete and already-deleted
   convergence; and confirm RLS denial for missing-profile and non-operational
   roles. Remove temporary records and role profiles afterward.

The Supabase verifier sends only bounded unauthenticated GET requests. It checks
that auth settings report public signups disabled and that the selected `nurses`
and `profiles` columns are reachable; for successful empty responses it reports
only "no anonymous rows observed." This observation does not prove RLS denial
because the tables may be empty. RLS enforcement requires an authorized test with
known existing or disposable rows. It prints no anon key, rows, response bodies, request
headers, cookies, query strings, or raw backend errors.

This probe is operational evidence only. It cannot establish requirements involving
authenticated sessions, application failure handling, telemetry, store isolation,
migration 0008, authenticated policies, CRUD, optimistic concurrency, or delete
behavior. Those remain authorized operator checks.

### Production checklist

- [ ] Current Vercel deployment contains merged PR #49
- [ ] Application and Supabase read-only verifiers both pass
- [ ] Authorized operator confirms migration 0008 is applied in production
- [ ] Disposable Superadmin/Admin/Recruiter CRUD checks pass
- [ ] Stale-version conflict, delete convergence, and RLS-denial checks pass
- [ ] Disposable records and temporary role profiles are removed
- [ ] Set `VITE_ENABLE_ANALYTICS=true` only if analytics are approved
- [ ] Configure `VITE_API_URL` and optional `VITE_SENTRY_DSN` for production
- [ ] Keep nginx and Vercel CSP values aligned, with scoped `https://*.supabase.co` and `wss://*.supabase.co`
- [ ] Ensure the Docker health check is monitored where Docker hosting is used
- [ ] Configure TLS termination, log aggregation, and deployment rollback monitoring

## Architecture

```
                   +------------------+
                   |  Load Balancer   |
                   |  (TLS/SSL)       |
                   +--------+---------+
                            |
                   +--------v---------+
                   |  Docker          |
                   |  +-----------+   |
                   |  | nginx     |   |
                   |  | (port 80) |   |
                   |  +-----------+   |
                   |  | dist/     |   |
                   |  | (static)  |   |
                   |  +-----------+   |
                   +------------------+
```

The application is a fully static SPA. All routing is handled client-side. The nginx server serves the built files and falls back to `index.html` for all unmatched routes to support client-side routing.
