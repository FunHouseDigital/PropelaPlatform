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
- **Security headers** - X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy

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
- [ ] Review and adjust Content-Security-Policy in `nginx.conf` for your domain
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
