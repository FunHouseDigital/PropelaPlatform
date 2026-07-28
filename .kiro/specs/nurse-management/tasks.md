# Implementation Plan: Nurse Management

## Overview

Implement the approved nurse-management design in the repository's existing JavaScript/JSX stack. The plan first isolates persistence modes and establishes a validated nurse model boundary, then adds record-level repository and controller behavior, wires create/detail/edit/delete UI flows, and finishes with automated cross-mode and concurrency coverage. Each step must build on the prior contracts, preserve server-confirmed state until persistence succeeds, and leave the feature-off localStorage workflow unchanged.

## Tasks

- [x] 1. Establish persistence-mode boundaries
  - [x] 1.1 Separate application storage migration from domain seeding and guard nurse seeding by feature mode
    - Refactor `src/App.jsx` and `src/lib/storage.js` so required auth/key migrations still run in both modes while bundled domain seeds run under the existing legacy-mode conditions only.
    - Preserve the current seven-nurse initialization behavior exactly when `SUPABASE_BACKEND` is off, and prevent Supabase-mode nurse reads, failures, or refreshes from invoking localStorage or seed fallback.
    - _Requirements: 1.3, 1.4, 1.6, 10.2, 10.3, 10.8, 10.9_

  - [x] 1.2 Extend the feature-routed data-layer facade with explicit record-level nurse operations
    - Add stable JavaScript bindings for nurse list, detail, create, version-gated update, pipeline change, and delete while retaining immutable adapter selection at module initialization.
    - Keep whole-collection compatibility APIs for existing consumers, but prevent the new Supabase nurse workflow from using `saveCollection('nurses', ...)` or switching adapters after failures.
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 10.1, 10.7_

  - [x]* 1.3 Write the property test for immutable adapter exclusivity
    - **Property 2: Immutable adapter exclusivity**
    - Generate operation sequences in both feature modes and assert that only the module-selected adapter receives calls, including failure paths.
    - **Validates: Requirements 1.1, 1.2, 1.6, 10.1, 10.7**

  - [x]* 1.4 Write the property test for legacy persistence, atomic failure, and store independence
    - **Property 17: Legacy persistence, failure atomicity, and store independence**
    - Exercise legacy initialization/round trips, simulated storage failures, and distinct remote/local datasets without copying or fallback.
    - **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9**

- [x] 2. Implement the nurse model boundary and pure workflow helpers
  - [x] 2.1 Create the nurse codec with strict row validation and explicit field allowlists
    - Add `src/lib/dataLayer/nurseCodec.js` (or the reconciled equivalent) to decode snake_case Supabase rows into the established camelCase model and encode create/update rows.
    - Implement typed-column and metadata precedence, nullable/default normalization, finite numeric conversion, validated JSONB structures, the exact attributes allowlist, and complete-operation rejection for malformed rows or unsupported fields.
    - Exclude `id`, `owner_id`, `version`, `created_at`, and `updated_at` from update patches; keep migration-time and runtime mappings aligned with `src/lib/migration/transform.js`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [x] 2.2 Add blank-draft, validation, derived-field, and conflict-rebase helpers
    - Create pure JavaScript helpers for a seed-independent blank create draft, stable `nurse-${crypto.randomUUID()}` identity, create/update normalization, and field-level validation using existing constants and validation utilities.
    - Apply the required option sets, numeric bounds, text sanitization, certification/communication rules, and authoritative calculation helpers before persistence.
    - Add a pure field-diff/rebase helper that copies only locally changed supported fields onto the latest committed nurse and adopts its version without writing.
    - _Requirements: 3.2, 3.3, 4.9, 4.10, 5.5, 6.11, 6.12, 6.13, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15_

  - [x]* 2.3 Write the property test for nurse codec safety and round trips
    - **Property 5: Nurse codec boundary safety and round trip**
    - Generate valid nurses, arbitrary extra keys, malformed rows, and metadata mutations; assert mapping fidelity, allowlist enforcement, metadata precedence, and all-or-nothing failure.
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12**

  - [x]* 2.4 Write the property test for field-level conflict rebasing
    - **Property 12: Field-level conflict rebase preserves intent**
    - Generate original, local, and latest nurse values and assert that only local edits are rebased, the latest version is adopted, and no persistence call occurs.
    - **Validates: Requirements 6.9, 6.11, 6.12, 6.13, 6.14, 6.15**

  - [x]* 2.5 Write the property test for invalid and unsupported input
    - **Property 15: Invalid or unsupported input causes no write**
    - Generate invalid names, emails, enums, numbers, arrays, communication entries, free text, unknown fields, and metadata changes; assert draft/state preservation and zero writes.
    - **Validates: Requirements 4.9, 4.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12**

  - [x]* 2.6 Write the property test for derived nurse values
    - **Property 16: Derived fields equal authoritative helper outputs**
    - Generate valid pipeline and score inputs and compare readiness, CV score, final score, and tier against the existing calculation helpers.
    - **Validates: Requirements 8.13, 8.14, 8.15**

- [x] 3. Build adapter and repository record workflows
  - [x] 3.1 Make both adapters satisfy the nurse-specific record contracts
    - Apply the nurse codec to every Supabase list/detail/create/update/delete result and write payload, including decoded current rows on conflicts.
    - Require valid identifiers and base versions for update/delete, distinguish deleted, conflict, already-deleted, and not-found outcomes, and keep the shared adapter timeout/error mapping.
    - Preserve camelCase localStorage representation and last-successful data on storage failures while implementing equivalent record-level outcomes in the storage adapter.
    - _Requirements: 1.2, 1.5, 4.1, 4.2, 4.7, 4.8, 4.11, 6.1, 6.2, 6.3, 6.8, 6.18, 7.3, 7.4, 7.6, 7.7, 7.8, 9.8, 10.4, 10.5, 10.6_

  - [x] 3.2 Implement the nurse repository with complete pagination and idempotent create
    - Add `src/lib/nurses/nurseRepository.js` (or equivalent) over the selected facade with categorized list/read/create/save/remove result contracts.
    - Aggregate pages of at most 100 rows only when totals are consistent, identifiers are unique, and the distinct count equals the reported total; reject and discard every partial or inconsistent aggregate.
    - Require an active authenticated user for Supabase operations, assign `owner_id` from the session, retain a create draft ID, and implement read-before-retry handling for ambiguous create outcomes and verified collisions.
    - Gate updates/deletes by identifier and base version, return authoritative committed rows, and emit only privacy-safe operation metadata.
    - _Requirements: 1.8, 1.9, 1.10, 1.11, 1.12, 3.4, 3.6, 3.9, 3.10, 3.11, 3.12, 3.13, 6.1, 6.2, 6.3, 6.6, 6.7, 6.8, 7.3, 7.4, 9.1, 9.4, 9.5, 9.6, 9.8, 9.10, 9.12_

  - [x]* 3.3 Write the property test for all-or-error pagination
    - **Property 3: All-or-error pagination integrity**
    - Generate successful, failed, duplicated, oversized, total-changing, short, and complete page sequences and accept only complete consistent aggregates.
    - **Validates: Requirements 1.8, 1.9, 1.10, 1.11, 1.12**

  - [x]* 3.4 Write the property test for create identity, ownership, defaults, and confirmation
    - **Property 6: Create identity, ownership, defaults, and confirmation**
    - Assert blank drafts contain no sample content, owner IDs come from authenticated users, unauthenticated creates issue no request, and only returned committed rows enter state.
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.13**

  - [x]* 3.5 Write the property test for ambiguous create retry idempotency
    - **Property 7: Ambiguous create retry is idempotent**
    - Generate ambiguous outcomes, matching committed rows, and genuine collisions; assert read-before-insert, stable identity, and exactly one committed nurse.
    - **Validates: Requirements 3.3, 3.8, 3.9, 3.10, 3.11, 3.12, 3.14**

  - [x]* 3.6 Write the property test for version-gated mutation safety
    - **Property 10: Version-gated mutation safety and pipeline rollback**
    - Generate missing/stale identifiers and versions, duplicate activations, successful mutations, and failed pipeline changes; assert no ungated write and exact rollback values.
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 6.16, 6.17, 6.20, 6.21, 7.3, 7.4**

  - [x]* 3.7 Write the property test for authentication and RLS denials
    - **Property 18: Authentication or RLS denial cannot become client success**
    - Generate absent, invalid, expired, and forbidden session outcomes and assert categorized failure, unchanged confirmed state/draft, and no fabricated local success.
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**

  - [x]* 3.8 Write the property test for privacy-safe telemetry
    - **Property 19: Privacy-safe operation telemetry**
    - Generate arbitrary sensitive nurse payloads and raw failures and assert emitted events contain only the approved operation metadata allowlist.
    - **Validates: Requirement 9.12**

- [x] 4. Add the server-confirmed nurse controller and context API
  - [x] 4.1 Implement the nurse controller state machine and commands
    - Create a reducer/controller (or nurse-specific provider) for accepted list/total, loading/error/stale state, selected ID, authoritative detail, original base, local draft, create/save/delete progress, and visible decision states.
    - Deduplicate refreshes, ignore stale detail responses, preserve accepted data and drafts during pending/failure/conflict states, and mutate committed list/detail data only from successful repository results.
    - Implement create confirmation, version advancement, field-level conflict choices, not-found cleanup, delete convergence, and retry rules without automatic retries.
    - _Requirements: 1.5, 1.7, 1.12, 2.1, 2.2, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 3.5, 3.6, 3.7, 3.8, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15, 6.16, 6.17, 6.18, 6.19, 6.20, 6.21, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 9.7, 9.9, 9.10, 9.11, 9.13_

  - [x] 4.2 Expose the nurse slice and record commands through application context
    - Integrate the controller with `AppContext` while preserving the public `nurses` array consumed by unrelated pages.
    - Expose `refreshNurses`, `retryNurses`, `openNurse`, `createNurse`, `saveNurse`, `changeNursePipeline`, and `deleteNurse` without routing Supabase mutations through the existing optimistic whole-collection updater.
    - Keep feature-off behavior backed exclusively by the storage adapter and avoid breaking other domain slices.
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.2, 2.8, 3.6, 5.1, 6.6, 7.6, 10.1, 10.2, 10.4, 10.5_

  - [x]* 4.3 Write the property test for backend-source isolation and confirmed-state fidelity
    - **Property 1: Backend-source isolation and confirmed-state fidelity**
    - Generate local samples, accepted remote lists, empty responses, and remote failures; assert every displayed nurse has remote provenance and failures do not change confirmed state or call local sources.
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.7, 2.10**

  - [x]* 4.4 Write the property test for accepted-list lifecycle and single-flight refresh
    - **Property 4: Accepted-list lifecycle and single-flight refresh**
    - Generate pending, failed, retried, refreshed, empty, and filter-no-match transitions and assert total/list preservation, request deduplication, and stale-state clearing.
    - **Validates: Requirements 2.2, 2.5, 2.6, 2.8, 2.9, 2.10, 2.11, 2.12**

  - [x]* 4.5 Write the property test for unconfirmed state transitions
    - **Property 8: No unconfirmed state transition**
    - Generate all mutation outcome categories and assert committed state/draft isolation until confirmed persistence or explicit discard.
    - **Validates: Requirements 1.5, 1.12, 3.5, 3.8, 5.5, 5.6, 6.4, 6.5, 6.9, 6.19, 7.5, 7.9, 7.10, 7.11, 7.12, 9.7, 9.9, 9.13**

  - [x]* 4.6 Write the property test for authoritative detail and draft isolation
    - **Property 9: Authoritative detail and draft isolation**
    - Generate selection changes, late detail responses, edits, saves, and cancel decisions; assert only the newest selected response establishes the base and no autosave occurs.
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9, 5.10, 5.13**

  - [x]* 4.7 Write the property test for successful version advancement
    - **Property 11: Successful update advances the authoritative version**
    - Generate successful committed updates and assert matching list/detail replacement plus greater returned version adoption as base and original.
    - **Validates: Requirements 6.6, 6.7**

  - [x]* 4.8 Write the property test for delete outcome convergence
    - **Property 13: Delete outcome convergence and fresh stale retry**
    - Generate deleted, conflict, already-deleted, duplicate-confirmation, reload, and fresh-confirmation sequences and assert the exact convergence rules.
    - **Validates: Requirements 7.5, 7.6, 7.7, 7.8, 7.12, 7.13, 7.14, 7.15**

  - [x]* 4.9 Write the property test for manual retry draft preservation
    - **Property 14: Manual retry preserves draft identity and values**
    - Generate recoverable create/update failures and retries; assert no automatic request, unchanged values, and stable create ID except after verified collision handling.
    - **Validates: Requirements 3.3, 3.5, 3.8, 3.9, 3.12, 6.4, 6.19, 6.20, 6.21, 9.10**

- [x] 5. Implement nurse list and create experiences
  - [x] 5.1 Refactor the nurse page to consume only the shared nurse controller
    - Remove direct `getNurses`/`saveNurses` imports and local authoritative nurse state from `NurseDatabase.jsx`; render controller list/total/loading/error/stale state across gallery, pipeline, and cohort views.
    - Add header and empty-state Add Nurse affordances, initial skeleton/progress, persistent categorized errors with Retry, refresh progress, and distinct empty-table versus filter-no-match copy and actions.
    - Select nurses by ID and trigger authoritative detail reads rather than passing a list snapshot as the editable base.
    - _Requirements: 1.3, 1.4, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 2.11, 2.12, 3.1, 5.1_

  - [x] 5.2 Create the accessible Add Nurse modal and retry-safe form
    - Implement `NurseCreateModal.jsx` using the blank draft factory, stable draft ID, inline errors, first-invalid-field focus, and read-only exclusion of authoritative metadata.
    - Disable duplicate submission, preserve every field through failures, expose permitted manual retries/collision retry, and close only after the controller receives a committed result.
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.7, 3.8, 3.12, 3.13, 4.13, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 9.10, 9.11_

  - [x]* 5.3 Write component tests for list, empty, refresh, and create states
    - Test no false empty state during loading, genuine empty Supabase data with no samples, filter no-match behavior, stale refresh retention, role-gated Add controls, validation focus, successful committed create, duplicate-submit prevention, and draft-preserving failures/retries.
    - _Requirements: 1.3, 1.4, 1.7, 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 3.1, 3.5, 3.6, 3.7, 3.8, 8.12, 9.3_

- [x] 6. Implement authoritative detail, save, pipeline, conflict, and delete UI
  - [x] 6.1 Refactor NurseCard into an explicit detail edit session
    - Load authoritative detail before enabling controls; maintain original base, base version, and local draft separately from shared committed state.
    - Remove debounced/autosave persistence and add explicit Save/Cancel with dirty-discard confirmation, pending states, read-only metadata, inline categorized failures, not-found handling, and retry/close actions.
    - Present persistent field-difference conflict UI with review, rebase, confirmed discard, and keep-editing choices; require another explicit save after rebase.
    - _Requirements: 4.13, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 6.4, 6.6, 6.7, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 6.15, 6.18, 6.19, 6.20, 6.21, 9.11_

  - [x] 6.2 Add accessible discard and delete confirmation dialogs
    - Create or adapt modal components that trap/focus correctly, name the nurse, warn safely about related database records, and issue no action on cancel.
    - Handle pending delete, confirmed deletion, stale conflict with Reload Details/Cancel only, already-deleted convergence, safe database-rule errors, authentication/permission failures, and manual retry for recoverable failures.
    - _Requirements: 5.8, 5.9, 5.10, 6.14, 6.15, 7.1, 7.2, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 9.11_

  - [x] 6.3 Route pipeline changes through the versioned nurse command
    - Update `PipelineView` integration to submit identifier, base version, stage, and helper-derived readiness status through the controller rather than replacing/saving the collection.
    - Disable duplicate moves per nurse, restore the exact prior stage/readiness on failure or conflict, and present actionable reload/rebase feedback before any new explicit move.
    - _Requirements: 1.2, 5.6, 6.2, 6.3, 6.5, 6.16, 6.17, 6.18, 6.19, 6.20, 6.21, 8.13, 9.13_

  - [x]* 6.4 Write component tests for detail, conflict, pipeline, and delete workflows
    - Cover authoritative detail loading/late-response/not-found/retry, local-only edits, explicit save/cancel, dirty confirmation, save conflict choices, successful version advancement, pipeline rollback, and every delete result category.
    - Include keyboard/focus behavior and assert decision-requiring failures remain visible rather than relying only on toasts.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 5.13, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10, 6.16, 6.17, 6.18, 6.19, 7.1, 7.2, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 9.11_

- [x] 7. Enforce operational permissions, ownership, and safe observability
  - [x] 7.1 Add reusable nurse permission and telemetry helpers and wire them into commands
    - Derive expected operational UI controls from the existing authenticated role model while keeping all adapter/RLS failures authoritative.
    - Implement allowlisted nurse operation events containing operation, outcome, backend, duration, retry count, and optional request ID only; never include payloads, identities, tokens, raw errors, or clinical content.
    - Use the helpers from list/create/edit/pipeline/delete flows without converting hidden controls into an authorization decision.
    - _Requirements: 3.1, 9.2, 9.3, 9.6, 9.7, 9.10, 9.11, 9.12, 9.13_

  - [x] 7.2 Add database ownership invariants for nurse creation and updates
    - Add or amend the relevant Supabase migration so nurse inserts require/set `owner_id = auth.uid()` and updates cannot change `owner_id`, without preventing policy-authorized operational users from updating another user's nurse.
    - Keep browser requests on the public client/session JWT, preserve existing RLS role policy intent and version trigger, and add migration-level verification for the owner invariant.
    - _Requirements: 3.4, 4.10, 9.1, 9.2, 9.4, 9.6_

  - [x]* 7.3 Write adapter and authorization integration tests
    - Extend fake-Supabase coverage for camelCase decoding, generated create ID/owner encoding, version-gated update and delete outcomes, timeout mapping, no-session behavior, forbidden RLS responses, and owner immutability.
    - Verify database-rule failures remain safely categorized and server-confirmed state does not change on denied operations.
    - _Requirements: 3.4, 3.13, 4.1, 4.2, 4.10, 6.8, 7.7, 7.8, 7.9, 7.10, 7.11, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 8. Complete integration and cross-mode regression coverage
  - [x] 8.1 Wire the complete nurse workflow and remove obsolete split-source paths
    - Connect facade, adapters, repository, controller/context, page, create modal, detail card, pipeline view, and dialogs so no Supabase nurse action is orphaned or routed through storage/whole-collection persistence.
    - Preserve compatible shared `nurses` reads for unrelated pages, reconcile exports/imports with the current tree, and ensure refresh reflects confirmed create/update/delete results in both selected modes.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.12, 3.14, 6.6, 7.6, 10.1, 10.2, 10.4, 10.5, 10.8, 10.9_

  - [x]* 8.2 Write cross-layer nurse integration tests
    - Test an empty Supabase table without storage/seed calls, complete multi-page aggregation above 100 rows, record-level CRUD through context, refresh persistence, conflict/current-row decoding, already-deleted handling, and failure-state atomicity.
    - Test matching legacy record-level commands against the current localStorage representation and initialization behavior.
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 1.11, 1.12, 2.12, 3.14, 4.8, 6.6, 6.8, 7.6, 7.7, 7.8, 9.13, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x]* 8.3 Implement deterministic Playwright nurse CRUD and concurrency journeys
    - Cover flag-on empty state with no sample names, create/refresh, detail edit/save/refresh with version advancement, two-session stale save, stale/already-deleted delete, and the current Admin/Superadmin/Recruiter/no-profile authorization matrix.
    - Add a flag-off journey proving bundled nurse initialization and localStorage edits survive refresh unchanged; use an isolated test backend or deterministic mock, never production data.
    - _Requirements: 1.3, 2.3, 3.1, 3.6, 3.14, 5.1, 6.6, 6.8, 7.6, 7.7, 7.8, 9.2, 9.3, 9.6, 10.2, 10.3, 10.5, 10.8, 10.9_

  - [x]* 8.4 Add final legacy and feature-mode regression tests
    - Assert `initializeData`, `getNurses`, and `saveNurses` preserve established flag-off semantics, storage failures leave the last persisted collection intact, and mode changes never merge/reconcile nurse stores.
    - Run the automated single-execution checks with `npm test`, `npm run lint`, and `npm run build`, fixing any nurse-management regressions without altering unrelated behavior.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for a faster MVP; all unmarked implementation tasks are required.
- Property tests should use fast-check with at least 100 generated cases per property and live in separate test files where parallel execution could otherwise create edit conflicts.
- Use JavaScript/JSX throughout, matching the existing Vite/React codebase; TypeScript notation in the design documents contracts only.
- Keep Supabase and legacy stores independent. Do not migrate, merge, seed, or fall back between them.
- Reconcile recommended filenames with the current branch before editing, but retain the approved design boundaries and granular requirement traceability.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "7.2"] },
    { "id": 1, "tasks": ["1.2", "2.3", "2.4", "2.5", "2.6"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["1.3", "1.4", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2"] },
    { "id": 7, "tasks": ["4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 8, "tasks": ["5.1", "5.2", "6.1", "6.2", "6.3", "7.1"] },
    { "id": 9, "tasks": ["5.3", "6.4", "7.3"] },
    { "id": 10, "tasks": ["8.1"] },
    { "id": 11, "tasks": ["8.2", "8.3", "8.4"] }
  ]
}
```
