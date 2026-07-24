# Security Hardening Tracker

A rolling checklist of the 10 security fixes being applied to Propela Ops. Each
fix is branched off the previous fix's branch and opened as a PR against it.

| #   | Fix                                                                | Status | PR  |
| --- | ------------------------------------------------------------------ | ------ | --- |
| 1   | Authentication scaffold                                            | [x]    | #28 |
| 2   | Role-based authorization                                           | [x]    | #28 |
| 3   | Export gating + audit logging                                      | [x]    | #29 |
| 4   | Secure random key/secret generation (Web Crypto)                   | [x]    | #30 |
| 5   | CSV (formula) injection neutralization in all CSV exports          | [x]    | #31 |
| 6   | Input validation / sanitization on all forms                       | [x]    | #32 |
| 7   | HTTP security headers / Content-Security-Policy hardening          | [x]    | #33 |
| 8   | Login rate-limiting / account lockout                              | [x]    | #34 |
| 9   | Move auth session out of localStorage (in-memory + sessionStorage) | [x]    | #35 |
| 10  | Key prefix renaming / rotation                                     | [x]    | #36 |

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
   formula prefix lands _inside_ the quotes so it stays in the cell.

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

## Fix #8 — login rate-limiting / account lockout (done)

Before this fix, `AuthContext.login()` ran an unbounded credential check on
every attempt: no throttling, no lockout, and no record of failed attempts, so
nothing slowed down or recorded repeated online password guesses against the
sign-in form.

### Policy (all named constants in `src/lib/loginThrottle.js`)

- **Threshold:** lock an email after **`MAX_FAILED_ATTEMPTS = 5`** _consecutive_
  failed attempts.
- **Cooldown:** **`LOCKOUT_DURATION_MS = 15 minutes`** from the failure that
  tripped the lock.
- **Reset:** a **successful** sign-in clears that email's entry entirely; a
  failure that occurs **after** a cooldown has fully elapsed starts a fresh
  streak (the expired lock is "forgiven", so a single post-cooldown mistake
  does not instantly re-lock).
- **Keying:** tracked per **normalized email** (`trim().toLowerCase()` — the
  exact normalization `findAuthUserByEmail` uses), so casing/whitespace variants
  cannot dodge the counter.

### Pure, testable module + where state lives

`src/lib/loginThrottle.js` holds the logic as **pure functions** (mirroring the
`exportGuard.js` precedent — no React, no clock reads, no storage access). Every
decision takes the current state + email + an injected `now`, so tests are
deterministic:

- `evaluateAttempt(state, email, now)` → `{ allowed, lockedUntil, remainingMs, remainingMinutes, failures }`
- `recordFailure(state, email, now)` → next state (pure, no mutation)
- `recordSuccess(state, email)` → next state with the entry removed
- `pruneExpired(state, now)` → housekeeping that drops fully-expired locks while
  keeping active locks and in-progress streaks
- plus `normalizeEmail`, `getEntry`, `remainingLockMs`, `remainingLockMinutes`,
  and `buildLoginAuditEntry`.

State is persisted via new storage helpers **`getLoginThrottle` /
`saveLoginThrottle`** (`src/lib/storage.js`) under the
**`propela_ops_loginThrottle`** localStorage key. It stores **only counters +
timestamps** per email — `{ failures, firstFailureAt, lastFailureAt, lockedUntil }`
— **never a password or hash**.

> **Key-hashing choice:** the map is keyed by the plaintext normalized email,
> not a hash. Hashing was considered and intentionally skipped: it would force
> the module to become async (Web Crypto), breaking deterministic tests, and
> buys nothing in a client-only app where the emails are non-secret (the audit
> log and seed data already store identities in the same localStorage) and an
> attacker with the bundle already has the account list.

### Wiring into `AuthContext.login()` (hashing + success path unchanged)

The SHA-256 hashing and `authUsers.js` scheme are untouched. `login()` now:

1. **Checks the throttle first** via `evaluateAttempt` — _before_ any user
   lookup or hashing. If the email is locked it returns immediately with a
   clear, generic-but-actionable message
   (`"Too many attempts. Try again in N minutes."`) plus `locked`/`lockedUntil`,
   and performs **no credential comparison**.
2. On a **failed** comparison (unknown email **or** wrong password — handled by
   one identical path), records a failure, persists, and re-evaluates: if that
   failure tripped the lock it surfaces the lockout message; otherwise it keeps
   the existing generic `"Invalid email or password."` wording.
3. On **success**, clears the email's throttle entry, then proceeds with the
   unchanged session-persistence path.

A crypto/environment failure is **not** counted as a credential failure.

**No user enumeration:** unknown emails and known-email-wrong-password are
throttled identically, share the same messages, and the attempted email is
tracked regardless of whether the account exists. The audit `details` never
distinguish the two.

### Audit logging (reuses the Fix #3 infrastructure — no new UI)

Attempts are recorded in the existing audit log so they appear in the Audit
Trail (`AuditLogTable`) with zero new wiring. `buildLoginAuditEntry` produces the
standard audit shape and adds three action constants:

| Action             | Severity   | When                                                               |
| ------------------ | ---------- | ------------------------------------------------------------------ |
| `LOGIN_FAILED`     | `warning`  | a failed credential comparison (below threshold)                   |
| `LOGIN_LOCKED_OUT` | `critical` | an attempt blocked by an active lock, or the failure that trips it |
| `LOGIN_SUCCESS`    | `info`     | a successful sign-in                                               |

Entries use `entityType: 'auth'`, `entityId: 'login'`, `ipAddress: 'client'`
(the same no-backend placeholder as `exportGuard.js`'s `CLIENT_IP`), and record
the **attempted email** as `user`. **No password or hash is ever logged.**

Because `AuthContext` is intentionally decoupled from `AppContext` (and the
Login page can render outside `AppProvider`), the entry is written **straight to
storage** via `getAuditLog`/`saveAuditLog` rather than `AppContext.updateAuditLog`.
`AppContext` reads the persisted log into its in-memory state on the next load,
so lockout/failure events **surface in the Audit Trail on next load**. Audit
writes are wrapped in `try/catch` so auditing can never block or break sign-in,
and the resilient signed-out `useAuth()` fallback is preserved (it also exposes
the read-only `getLockStatus`).

### Login UI (`pages/Login.jsx`)

When locked, the page shows the cooldown message in the existing
`role="alert"` box with a **live `m:ss` countdown**, disables the submit button
(labelled `Locked — m:ss`), and re-enables it automatically when the cooldown
elapses. It also reflects a pre-existing lock for the typed email on load (via
`getLockStatus`) so the control starts disabled without needing a fresh failed
attempt. The Fix #6 validation, the `role="alert"` box and the success-redirect
logic are all unchanged.

### Honest no-backend caveat

Propela Ops is front-end-only. This throttle state lives in `localStorage`, so
an attacker can **read the bundled password hashes directly or clear
`localStorage`** to wipe the counters — it is therefore **trivially bypassable**
and is **not** a real brute-force / online-guessing defense. It is included as
(1) defense-in-depth against casual/opportunistic guessing and (2) the correct
UX and the exact pattern that **MUST be re-implemented and enforced
server-side** (per-account **and** per-IP, with a real client IP) the moment a
backend is introduced. This mirrors the same honest framing in `authUsers.js`
and `exportGuard.js` (`CLIENT_IP`). No backend, no real per-IP limiting, no
CAPTCHA and no new heavyweight dependency were introduced.

### Tests

`src/lib/__tests__/loginThrottle.test.js` (dependency-free, deterministic via an
injected fixed `now`) covers: the threshold boundary (no lock at 4, lock at 5),
lockout active vs expired, the post-cooldown fresh-streak behaviour, success
resetting both a partial streak and an active lock, purity/no-mutation, the
`unknown-vs-known email` parity (identical entries, identical remaining time),
normalization, the remaining-time helpers, `pruneExpired`, and the audit-entry
shape/severity with an assertion that no `password`/`hash` leaks into the entry.
The tests fail if the threshold, cooldown, reset or enumeration-parity regress.
Existing tests stay green (full suite passes).

Auth (#1/#2), export gating/audit (#3), key generation (#4), CSV escaping (#5),
form validation (#6) and the nginx headers/CSP (#7) are all unchanged.

## Fix #9 — move the auth session out of localStorage (done)

Before this fix, the signed-in user's identity lived in **`localStorage`** under
`propela_ops_authSession` (via `storage.js`'s `getAuthSession` / `saveAuthSession`
/ `clearAuthSession`). `localStorage` is **shared across every tab** for the
origin and **persists until explicitly cleared**, so an XSS payload could read
the identity token from _any_ tab and it **survived tab/browser close** — a large
blast radius for token/identity theft. This fix relocates that session to
**in-memory (source of truth) + `sessionStorage` (a refresh-survival mirror)**.

### What moved (and what deliberately did NOT)

- **Moved:** only the **auth session** (`propela_ops_authSession`). It is now held
  in a module-level in-memory variable in **`src/lib/sessionStore.js`**, mirrored
  to `sessionStorage` for same-tab refresh survival. The stored shape is
  unchanged — only the non-sensitive identity fields `{ id, name, email, role }`,
  **never a password/hash**.
- **Stayed in `localStorage` on purpose:**
  - **`propela_ops_loginThrottle`** (Fix #8 lockout counters). These are
    **anti-abuse state, not a secret/identity token**. Moving them to
    `sessionStorage` would let an attacker **reset an active lockout by simply
    closing the tab** (sessionStorage is per-tab, cleared on close), weakening
    Fix #8. Keeping them in `localStorage` means a lockout **survives tab close**
    as intended. `getLoginThrottle` / `saveLoginThrottle` are unchanged.
  - **`propela_ops_userSessions`** — seeded Audit-Trail _demo_ data (not the real
    auth session), left untouched.
  - All other bulk app data (nurses, settings, audit log, integrations, …) stays
    in `localStorage` — out of scope here.

### The session store (`src/lib/sessionStore.js`)

A small, dependency-free, unit-testable module (mirroring the `exportGuard.js` /
`loginThrottle.js` "pure logic in `lib/`" precedent):

- `getSession()` — returns the in-memory session; when memory is empty (e.g. a
  fresh page load re-created the module) it hydrates from the `sessionStorage`
  mirror. In-memory is always the **source of truth** (a tampered mirror is
  ignored while memory holds a value).
- `setSession(user)` — updates in-memory first, then best-effort mirrors to
  `sessionStorage`. A falsy value clears the session.
- `clearSession()` — clears in-memory, the mirror, and (defensively) any lingering
  legacy `localStorage` copy so a logout can never leave a token behind.
- `migrateLegacyAuthSession()` — the one-time migration (below).

**Every** `sessionStorage`/`localStorage` access is wrapped in `try/catch` behind
`null`-returning safe accessors, so the store **falls back to in-memory-only**
and never throws when web storage is unavailable or blocked (tests / SSR / Safari
private mode / storage disabled).

### One-time migration off `localStorage`

On init, `migrateLegacyAuthSession()` checks for a legacy `propela_ops_authSession`
entry in `localStorage`; if present it **copies it into the new store and deletes
the `localStorage` key** so no stale identity token is left behind in the
higher-risk store. This keeps a currently-signed-in user signed in across the
upgrade **within the same tab**. It runs both **eagerly** (first line of
`initializeData()` in `storage.js`) and **lazily** (via `getSession()`, which
`AuthProvider` calls while seeding `currentUser` on its initial render), so the
key is purged regardless of load order. The migration is idempotent, tolerates an
unparseable legacy value (removes it without adopting it), and never throws.

### Rewire without changing the public interface

`storage.js`'s `getAuthSession` / `saveAuthSession` / `clearAuthSession` keep the
**same names and signatures** and simply delegate to
`getSession` / `setSession` / `clearSession`. `AuthContext` is therefore almost
untouched: `AuthProvider` still seeds `currentUser` via `getAuthSession()`,
`login()` still calls `saveAuthSession(sessionUser)`, `logout()` still calls
`clearAuthSession()`, and the resilient signed-out `useAuth()` fallback is
unchanged. **The Fix #8 throttle wiring, the audit logging and the SHA-256
hashing were not touched.** `ProtectedRoute` / `RequirePermission` (which only
read `isAuthenticated` / `currentUser`) behave identically.

### Intended, security-positive behaviour change

- A **page refresh within the same tab keeps the user signed in** (served from the
  `sessionStorage` mirror).
- **Opening a new tab, or reopening after the tab was closed, now requires
  re-login** — the session is no longer shared across tabs and no longer survives
  tab close. This is deliberate: it shrinks the XSS token-theft window and removes
  cross-tab exposure.
- `logout()` still clears the session **everywhere** (in-memory + mirror + any
  legacy `localStorage` copy).

### Honest caveat (mirrors `authUsers.js` / `exportGuard.js` / `loginThrottle.js`)

This is a **blast-radius reduction, not a fix**. `sessionStorage` is still plain
**JavaScript-readable by any script running in the tab**, so in-page XSS can still
read the session **while the tab is open**. Propela Ops is front-end-only with
**no backend**, so `httpOnly`, `Secure`, `SameSite` cookies — the only mechanism
that actually keeps a session token out of reach of page scripts — are impossible
here. What this change _does_ buy: no cross-tab exposure, no persistence past tab
close, a shorter theft window, and in-memory as the source of truth. **Full
mitigation of token theft MUST be done server-side with httpOnly cookies once a
backend exists.** Do not overstate it.

### Tests

`src/lib/__tests__/sessionStore.test.js` (dependency-free; jsdom provides
`sessionStorage`/`localStorage`) covers: the set/get/clear roundtrip; that the
session mirrors to `sessionStorage` and is **never** written to `localStorage`;
in-memory remaining the source of truth against a tampered mirror; the mirror
surviving a **simulated reload** (`vi.resetModules()` + re-import → fresh in-memory
instance re-hydrates from the persisted mirror); the **legacy-`localStorage`
migration** moving the value **and deleting** the `localStorage` key (plus
idempotency and unparseable-value handling); and the **graceful in-memory-only
fallback** when `sessionStorage` access throws. The tests fail if migration/key
removal, the mirror, or the fallback regress. The full suite stays green and no
auth-flow enumeration tests were added (Fix #8 behaviour is preserved).

Auth (#1/#2), export gating/audit (#3), key generation (#4), CSV escaping (#5),
form validation (#6), the nginx headers/CSP (#7) and the login throttle/lockout
(#8 — including keeping its counters in `localStorage`) are all unchanged.

## Fix #10 — versioned key prefix + one-time rotation across both stores (done)

Every value the app persists used the flat, unversioned `propela_ops_` prefix in
both web-storage surfaces. There was no way to namespace against key collisions
with another app on the same origin, and no clean way to invalidate/upgrade a
storage schema in future. This final fix introduces a **versioned prefix**
(`propela_ops_v2_`) and a **one-time, idempotent rotation** that migrates every
existing value from the legacy prefix to the new one — across **both**
`localStorage` and `sessionStorage` — leaving nothing behind under the stale
namespace.

### Single source of truth (`src/lib/storageKeys.js`)

The prefix/version now lives in exactly one small shared module that both
`storage.js` and `sessionStore.js` import — the literal is no longer hardcoded in
more than that module:

- `STORAGE_PREFIX_VERSION = 'v2'`
- `STORAGE_PREFIX = 'propela_ops_v2_'` (derived from the version)
- `LEGACY_STORAGE_PREFIXES = ['propela_ops_']`
- `withPrefix(key)` and the generic `rotateStorageKeys(store)` helper.

The file header documents the version history and the rule for future rotations
(push the old prefix onto `LEGACY_STORAGE_PREFIXES` and bump the version).

### One-time rotation across BOTH stores

`rotateStorageKeys(store)` **enumerates keys generically** (`length` / `key(i)`)
— it does **not** rely on the seed list, so helper-only keys (`reportTemplates`,
`notificationPreferences`, `recentSearches`, `savedViews`, `recentlyViewed`, …)
rotate too. For each key under a legacy prefix it **copies the value to the
new-prefixed key only if the new key is not already set** (never clobbers newer
data), then **removes the legacy key**. It is wrapped in `try/catch` per key and
**never throws** — it degrades to a no-op when a store is unavailable. It is
**idempotent**: after a full rotation every key is under `STORAGE_PREFIX`, so a
second run finds nothing to do.

> **The double-prefix trap:** `propela_ops_v2_` itself *begins with* the legacy
> `propela_ops_`, so rotation explicitly **skips keys already under the current
> prefix** — otherwise a `v2` key would be re-prefixed into
> `propela_ops_v2_v2_…`. This is covered by a dedicated test.

Wiring (`initializeData()` in `storage.js`, plus the lazy auth path):

1. `migrateLegacyAuthSession()` runs **first** so any auth token in
   `localStorage` (current OR legacy prefix) is moved into the session store
   **before** the bulk `localStorage` rotation — otherwise rotation would simply
   re-prefix an identity token that must never live in `localStorage`.
2. `rotateStorageKeys(localStorage)` — bulk app data **and** the Fix #8
   `loginThrottle` counters.
3. `rotateSessionStoreMirror()` (exported by `sessionStore.js`) — rotates the
   `sessionStorage` auth-session mirror via the same shared helper. This also
   runs on the **lazy** path (`getSession()` → `hydrateFromPersistence()`), which
   `AuthProvider` triggers during its first render, before `initializeData()`'s
   effect fires — so a pre-#10 mirror is found under the new key regardless of
   load order.

### Logical keys, shapes and values are unchanged

`getData` / `setData` / `removeData` keep **identical `(key)` signatures** — only
the physical prefix they prepend changed. Logical key names stay the same
(`'nurses'` is still `'nurses'`), every typed helper behaves identically, and no
stored JSON shape or value was touched. `getAuthSession` / `saveAuthSession` /
`clearAuthSession`, `ProtectedRoute` and `useAuth()` are unchanged.

### Preserving the #8 / #9 placement decisions

- **`loginThrottle` stays in `localStorage`** and is rotated **there**
  (`propela_ops_loginThrottle` → `propela_ops_v2_loginThrottle`), so an **active
  lockout survives the upgrade** and still survives tab close — it is **not**
  moved to `sessionStorage` (that would let an attacker reset a lockout by
  closing the tab, weakening Fix #8).
- **The auth session stays in-memory + `sessionStorage`.** The mirror key is
  rotated (`propela_ops_authSession` → `propela_ops_v2_authSession`) so a
  **currently-signed-in user stays signed in across the upgrade within the same
  tab**, and the pre-#9 legacy `localStorage` auth key is still migrated + purged
  (now across the current and all legacy prefixes). The throttle logic, audit
  logging and SHA-256 hashing are untouched. The seeded
  `propela_ops_userSessions` demo data is rotated like any other key (its
  semantics are unchanged).

### Honest framing — namespacing/hygiene, NOT a security control

A versioned prefix buys **collision avoidance, clean schema upgrades, and the
ability to invalidate an old schema version** — it does **not encrypt anything**
and it is **not an XSS boundary**. Both `localStorage` and `sessionStorage`
remain plain JavaScript-readable by any script in the tab. Only a real backend
issuing `httpOnly`, `Secure`, `SameSite` cookies fully mitigates token/identity
theft, and that remains a server-side task once a backend exists. This mirrors
the same caveat in `authUsers.js` / `sessionStore.js` / `loginThrottle.js`. Do
not overstate it.

### Tests

`src/lib/__tests__/storageKeys.test.js` (dependency-free; jsdom) covers: the
shared prefix constants and the double-prefix guard; the generic helper's
copy-old→new + delete-old behaviour on an isolated store; idempotency; the
**no-clobber** rule (never overwrites a value already under the new prefix while
still deleting the legacy key); graceful no-throw fallback when the store is
`null`, when enumeration throws, and when a per-key access throws; rotation
across the **real** `localStorage` and `sessionStorage`; and the full-upgrade
path via `initializeData()` proving a **signed-in session survives** (mirror
rotated) and an **active `loginThrottle` lockout survives** (rotated in
`localStorage`, not moved to `sessionStorage`), with no key left under the stale
prefix. `storage.test.js` and `sessionStore.test.js` were updated to the
versioned prefix/key (asserting against the shared `STORAGE_PREFIX` so they track
future bumps), with the migration tests using an explicit legacy key. No
auth-flow enumeration tests were added (Fix #8 behaviour preserved). The full
suite stays green.

Auth (#1/#2), export gating/audit (#3), key generation (#4), CSV escaping (#5),
form validation (#6), the nginx headers/CSP (#7), the login throttle/lockout
(#8) and the in-memory + sessionStorage session model (#9) are all unchanged.

## Series complete — all 10 security fixes landed

All 10 hardening fixes are done: (1) authentication scaffold, (2) role-based
authorization, (3) export gating + audit logging, (4) secure random key/secret
generation via Web Crypto, (5) CSV formula-injection neutralization, (6) input
validation/sanitization, (7) HTTP security headers / CSP, (8) login
rate-limiting / account lockout, (9) moving the auth session out of
`localStorage` (in-memory + `sessionStorage`), and (10) versioned key prefix +
rotation.

**Standing recommendation (the real long-term fix):** Propela Ops is
front-end-only, so several of these controls are necessarily
client-side/best-effort. **Move authentication, session and rate-limit
enforcement server-side once a backend exists** — issue the session as an
`httpOnly`, `Secure`, `SameSite` cookie (out of reach of page scripts) and
enforce login throttling/lockout on the server per-account **and** per-IP with a
real client IP. That is what actually mitigates token theft and online password
guessing; everything the front-end can do here is defense-in-depth on top of it.
