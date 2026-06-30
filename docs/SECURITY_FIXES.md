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
| 6 | Input validation / sanitization on all forms | [x] | this PR |
| 7 | _TBD_ (next on backlog: security headers / Content-Security-Policy) | [ ] | — |
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

> **NEXT: Fix #7** — security headers / Content-Security-Policy. Confirm the
> exact scope against the team's security backlog before starting.
