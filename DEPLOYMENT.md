# Deployment Guide

## Overview

Propela Platform is a React single-page application built with Vite. It is deployed as static files served by nginx inside a Docker container.

## Prerequisites

- Node.js 20+
- npm 9+
- Docker and Docker Compose (for containerized deployment)

## Environment Variables

All client-side environment variables must be prefixed with `VITE_`:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_APP_TITLE` | Application title | `Propela Platform` |
| `VITE_APP_VERSION` | Application version | `0.0.0` |
| `VITE_API_URL` | Backend API base URL | `http://localhost:3001/api` |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | (empty) |
| `VITE_ENABLE_SERVICE_WORKER` | Enable/disable service worker | `true` |
| `VITE_ENABLE_ANALYTICS` | Enable/disable analytics | `false` |
| `VITE_ENVIRONMENT` | Environment name (`development`, `staging`, `production`) | `development` |
| `VITE_LOG_LEVEL` | Logging level (`debug`, `info`, `warn`, `error`) | `debug` |
| `VITE_FEATURE_FLAGS` | Comma-separated feature flags | (empty) |

Copy `.env.example` to `.env` and adjust values for your environment.

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
docker build -t propela-platform .
```

### Run with Docker

```bash
docker run -p 8080:80 propela-platform
```

The application will be available at `http://localhost:8080`.

### Docker Compose (local)

```bash
docker compose up --build
```

This maps port 8080 on your host to port 80 in the container and reads environment variables from your `.env` file.

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

#### Per-environment `connect-src` (IMPORTANT)

Because this is a static build, the API and Sentry hosts are baked in at build
time and are environment-specific. `security-headers.conf` ships with
**placeholder** origins in `connect-src` that you MUST adjust before going live:

| Placeholder | Replace with | Notes |
|-------------|--------------|-------|
| `https://api.example.com` | Your `VITE_API_URL` origin (scheme + host[:port], no path) | e.g. `https://api.propela.io`. For local Docker against `http://localhost:3001`, use `http://localhost:3001`. |
| `https://sentry.example.com` | Your Sentry ingest origin from `VITE_SENTRY_DSN` | Remove this entry entirely if you do not use Sentry. |

The `https://fonts.googleapis.com` / `https://fonts.gstatic.com` entries in
`connect-src` are required so the **service worker** (`public/sw.js`) can
re-fetch the fonts for its stale-while-revalidate cache (a SW's `fetch()` is
governed by `connect-src`). Leave them as long as the Google Fonts `<link>` is
present. Do **not** broaden `connect-src` back to the wildcard `https:`.

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

### Production Checklist

- [ ] Set `VITE_ENVIRONMENT=production`
- [ ] Set `VITE_LOG_LEVEL=error`
- [ ] Configure `VITE_API_URL` to the production API endpoint
- [ ] Set `VITE_SENTRY_DSN` for error tracking
- [ ] Set `VITE_ENABLE_ANALYTICS=true` if analytics are desired
- [ ] Review and adjust the Content-Security-Policy `connect-src` in `security-headers.conf` for your environment: replace the `https://api.example.com` / `https://sentry.example.com` placeholders with your real API and Sentry origins (or remove Sentry if unused) — see "Security headers / Content-Security-Policy" above
- [ ] Ensure the Docker healthcheck endpoint is monitored
- [ ] Configure a reverse proxy or load balancer in front of the container
- [ ] Set up TLS/SSL termination at the load balancer level
- [ ] Configure log aggregation from the container

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
