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

### Go-live order

Perform production activation in this order. Do not point smoke tests at production until the read-only verifier passes.

1. **Apply database migrations through `0008_nurse_owner_invariants.sql`.** Confirm the schema, version trigger, ownership invariants, and RLS policies are current before enabling browser traffic.
2. **Configure public Supabase build values.** Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the production build environment. The anon key is public but remains constrained by RLS; never use the service-role key or database password in the frontend.
3. **Enable the backend intentionally.** Add `SUPABASE_BACKEND` to `VITE_FEATURE_FLAGS` only after the migrations and public configuration are ready.
4. **Build and deploy the production static bundle.** Explicitly setting `VITE_ENVIRONMENT=production` and `VITE_LOG_LEVEL=error` is recommended for deployment clarity, but Vite production builds now infer those safe defaults when either value is omitted. Build after all public values are set. For Vercel, configure any explicit overrides in the Production environment and deploy through the normal production branch flow. For Docker, rebuild the image with Compose build arguments and deploy behind TLS termination.
5. **Run the read-only unauthenticated verifier.** Use `npm run verify:production -- --url https://app.example.com`, set `PRODUCTION_URL`, or manually dispatch the **Verify production** GitHub workflow with the HTTPS origin. It performs bounded GET checks of `/` and `/nurses` plus the HTTP-to-HTTPS redirect; it does not authenticate or mutate data.
6. **Run authenticated smoke tests manually.** With dedicated test accounts and non-sensitive test records, verify the Admin/Superadmin/Recruiter role matrix, nurse create/read/update/delete behavior, optimistic-concurrency conflicts, and RLS denials. Remove test records when finished.

### Production checklist

- [ ] Complete the six go-live steps above in order
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
