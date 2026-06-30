# Security Hardening Tracker

A rolling checklist of the 10 security fixes being applied to Propela Ops. Each
fix is branched off the previous fix's branch and opened as a PR against it.

| # | Fix | Status | PR |
|---|-----|--------|----|
| 1 | Authentication scaffold | [x] | #28 |
| 2 | Role-based authorization | [x] | #28 |
| 3 | Export gating + audit logging | [x] | #29 |
| 4 | Secure random key/secret generation (Web Crypto) | [x] | #30 |
| 5 | CSV (formula) injection neutralization in all CSV exports | [x] | this PR |
| 6 | Input validation / sanitization on all forms | [ ] | — |
| 7 | _TBD_ | [ ] | — |
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

> **NEXT: Fix #6** — input validation / sanitization on all forms.
