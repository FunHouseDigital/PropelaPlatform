# Security Hardening Tracker

A rolling checklist of the 10 security fixes being applied to Propela Ops. Each
fix is branched off the previous fix's branch and opened as a PR against it.

| # | Fix | Status | PR |
|---|-----|--------|----|
| 1 | Authentication scaffold | [x] | #28 |
| 2 | Role-based authorization | [x] | #28 |
| 3 | Export gating + audit logging | [x] | #29 |
| 4 | Secure random key/secret generation (Web Crypto) | [x] | #30 |
| 5 | CSV (formula) injection neutralization in all CSV exports | [x] | #31 |
| 6 | Input validation / sanitization on all forms | [x] | #32 |
| 7 | HTTP security headers / Content-Security-Policy hardening | [x] | #33 |
| 8 | _TBD_ | [ ] | — |
| 9 | _TBD_ | [ ] | — |
| 10 | Key prefix renaming / rotation | [ ] | — |

## Fix #5 — CSV formula injection (done)

A single shared, framework-agnostic CSV utility lives at `src/lib/csv.js`
(`escapeCsvField(value)` + `toCsv(rows, { headers })`). Every CSV export path
routes through it; no component builds CSV with its own escaping anymore.

`escapeCsvField` does two things, in order:

1. **Formula-injection neutralization (OWASP):** a cell whose first character is
   `=`, `+`, `-`, `@`, tab (`0x09`) or carriage return (`0x0D`) is prefixed with
   a single quote (`'`) so spreadsheets treat it as literal text instead of a
   formula. Applied to header cells too.
2. **RFC-4180 quoting:** values containing `,`, `"`, `\n`, `\r` (or surrounding
   whitespace) are wrapped in double quotes with embedded quotes doubled. The
   formula prefix lands *inside* the quotes so it stays in the cell.

Benign values (names, dates, numbers, emails) export unchanged. Export gating
and audit logging from Fix #3 are unchanged. JSON exports are out of scope.

Routed sites: `analytics/ReportBuilder.jsx`, `reports/ReportBuilder.jsx`,
`reports/ExportCenter.jsx` (CSV branch only), `settings/IntegrationSettings.jsx`
(also switched from a `data:` URI to a Blob download), `audit/AuditLogTable.jsx`,
`notifications/NotificationHistory.jsx`.

## Fix #6 — input validation / sanitization on all forms (done)

A single shared, framework-agnostic validation/sanitization utility lives at
`src/lib/validation.js` (mirroring the `csv.js` / `secureRandom.js` /
`exportGuard.js` precedent — plain JS, no zod/yup/formik/react-hook-form). It
exposes small composable helpers:

- `sanitizeText(value, { maxLength, allowNewlines, trim })` — coerce to string,
  strip control characters (C0 `0x00–0x1F` + DEL `0x7F`; newlines/tabs kept when
  `allowNewlines`), trim (skippable for live inline editors so typing isn't
  broken), and length-cap.
- `validateRequired`, `validateLength`, `validateEmail` (RFC-ish, not just a
  `@` check), `validateUrl(value, { protocols })` (parses with the URL API and
  enforces an http/https allowlist — rejects `javascript:`, `data:`, `file:`,
  `blob:`, …), `validateNumber(value, { min, max, integer })`.
- `getFieldError(value, rules)` + a tiny `validateForm(values, schema)` runner
  returning `{ valid, errors }`.
- `MAX_LENGTHS` constants (NAME/EMAIL/URL/SHORT_TEXT/LONG_TEXT).

This is about **input correctness, protocol safety and storage hygiene** — NOT
HTML-escaping for display (React already escapes; there are no
`dangerouslySetInnerHTML` sinks, so no output double-escaping was added). It is
**complementary to Fix #5**: csv.js still neutralizes spreadsheet formula
injection at export time; this fix stops bad/oversized input from being stored
in the first place. The CSV escaping, export gating/audit (#3), key generation
(#4) and auth (#1/#2) are unchanged.

Every form's submit/save handler now routes through the util — the old ad-hoc
truthiness guards (e.g. `if (!name || !email) return;`) were removed, and
invalid submissions are blocked with an accessible inline `role="alert"` error
following each component's existing UX. Wired sites: `pages/Login.jsx`,
`settings/UserManagement.jsx`, `settings/OrganizationSettings.jsx`,
`settings/IntegrationSettings.jsx` (webhook endpoint protocol allowlist),
`settings/PipelineConfiguration.jsx`, `integrations/WebhookConfig.jsx`
(URL protocol allowlist), `acquisition/{CommunityTrack,EventsTrack,
OrganisationsTrack,ReferralTrack,OutreachLogEntry}.jsx`,
`communications/{CommunicationLog,EmailTemplates,AutomatedAlerts}.jsx`,
`reports/ScheduledReports.jsx`, `automations/{RuleBuilder,ScheduledActions}.jsx`,
`cohorts/CohortCard.jsx`, `nurses/NurseCard.jsx`. Live inline editors persist
through their existing `update*` funnels, now sanitizing string values
(control-char strip + length cap, `trim:false` to keep typing usable).

Focused unit tests for every helper (valid + invalid cases, incl.
`javascript:`/`data:` URL rejection, control-char stripping and whitespace
trimming) live at `src/lib/__tests__/validation.test.js`.

## Fix #7 — HTTP security headers / Content-Security-Policy (done)

The app is a static Vite SPA served by nginx in Docker. The previous config had
a correct-but-incomplete header set, copy-pasted verbatim into four blocks, with
a CSP that (a) blocked the app's own Google Fonts, (b) used over-broad
`connect-src 'self' https:` / `img-src 'self' data: https:`, and (c) was missing
several recommended headers/directives. This fix corrects and hardens it.

### Single source of truth + the `add_header` inheritance gotcha

All security headers + the CSP now live once in **`security-headers.conf`**.
`nginx.conf` `include`s it at the server scope and re-includes it inside each
`location` that sets its own `add_header` (`/assets/`, `= /index.html`,
`= /sw.js`). This is required because nginx drops inherited `add_header`
directives as soon as a block declares its own — so the cache blocks would
otherwise serve responses with **no** security headers. The SPA fallback
`location /` has no `add_header` and inherits from the server scope. The snippet
is shipped to `/etc/nginx/security-headers.conf` (Dockerfile `COPY` +
docker-compose bind-mount), kept outside `conf.d/` so nginx's
`include conf.d/*.conf;` doesn't load it as a standalone server block. The
existing gzip, SPA routing and per-location `Cache-Control` behaviour are
unchanged.

### Final Content-Security-Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://api.example.com https://sentry.example.com https://fonts.googleapis.com https://fonts.gstatic.com;
worker-src 'self';
frame-ancestors 'self';
base-uri 'self';
form-action 'self';
object-src 'none'
```

- **`script-src 'self'` stays strict** — no `'unsafe-inline'`/`'unsafe-eval'`.
  The production `dist/index.html` has no inline `<script>` (the runtime is an
  external chunk), so this is correct and must be preserved.
- **`style-src` keeps `'unsafe-inline'`** — required: recharts injects inline
  `style=""` attributes at runtime and Tailwind/React rely on inline styles.
- **`connect-src` / `img-src` are no longer blanket `https:`** — `img-src` is
  `'self' data:` (`data:` retained for Vite-inlined assets <4kb and inline
  SVGs); `connect-src` lists only the legitimate origins.
- **Added hardening**: `frame-ancestors 'self'`, `base-uri 'self'`,
  `form-action 'self'`, `object-src 'none'`, `worker-src 'self'` (PWA SW), plus
  the `Permissions-Policy` (camera/microphone/geolocation/etc. disabled) and
  `Strict-Transport-Security` headers.

### Font-hosting decision

Chose the **allowlist** approach (the task's documented "minimum"): explicitly
permit `https://fonts.googleapis.com` (`style-src`) and `https://fonts.gstatic.com`
(`font-src`) and keep the `preconnect`/`dns-prefetch` hints in `index.html`.
Self-hosting Poppins under `public/` (which would let the CSP stay `'self'`-only
for fonts) was not done here because the build sandbox cannot fetch the font
binaries; it remains a valid future hardening step. The CSP and `index.html`
font references are kept consistent and the policy test enforces that.

### Per-environment `connect-src`

The API and Sentry hosts are environment-specific in a static build, so
`connect-src` ships with clearly-commented **placeholders**
(`https://api.example.com`, `https://sentry.example.com`) that deployers replace
(or remove Sentry if unused) — see DEPLOYMENT.md. The
`fonts.googleapis.com`/`fonts.gstatic.com` entries in `connect-src` are present
so the service worker (`public/sw.js`) can re-fetch fonts for its
stale-while-revalidate cache (a SW's `fetch()` is governed by `connect-src`).

### Policy test

`src/lib/__tests__/securityHeaders.test.js` (dependency-free; reads `nginx.conf`,
`security-headers.conf` and `index.html` as text) guards the invariants: every
served location carries the headers via the shared include; `script-src` has
neither `unsafe-inline` nor `unsafe-eval`; `object-src 'none'`,
`frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`,
`worker-src 'self'` are present; `connect-src`/`img-src` are not the wildcard
`https:`; and the CSP font origins are consistent with `index.html`. It fails if
anyone reintroduces a wildcard source, weakens `script-src`, or de-syncs the
fonts.

Auth (#1/#2), export gating/audit (#3), key generation (#4), CSV escaping (#5)
and form validation (#6) are unchanged and continue to function under the
tightened CSP (Blob-based CSV downloads, the SW and `manifest.json` all load).


> **NEXT: Fix #8** — to be confirmed against the team's security backlog before
> starting. The tracker still lists #8/#9 as TBD and #10 as "Key prefix
> renaming / rotation". Strong candidates to confirm for #8: **login
> rate-limiting / account lockout**, or **moving auth/session state out of
> `localStorage`** (e.g. to in-memory + httpOnly cookie semantics) to reduce
> XSS token-theft risk. Pick one and verify scope with the team first.
