# Implementation Plan

- [x] 1. Write the reproducible cross-layer bug-condition integration test
  - **Property 1: Bug Condition** - Shared Readiness Authorizes First and Repeated Sign-In
  - **CRITICAL**: Write and run this test against the unfixed code before changing application behavior; its failure is the expected result and confirms the production bug condition.
  - Add a focused integration harness under `src/pages/__tests__/productionAuthSessionExpiry.integration.test.jsx` that renders the real `AuthProvider`, `AppProvider`, route guard, login flow, and `/nurses` data path with a deterministic fake public Supabase client.
  - Start with no persisted session; make provider hydration return no session, make sign-in return an unexpired session, and hold an independent `getSession()` observation at `null` to reproduce `isBugCondition(input)` from the design.
  - Assert the expected behavior encoded by `expectedBehavior(result)`: the protected route and nurse request resolve the same user and auth epoch, the first RLS-constrained nurse list runs exactly once, server-returned rows or an empty result are accepted, and no expired-session message appears.
  - Extend the same harness to create the prior inconsistent `AUTH` state, complete a second successful sign-in, invoke the next user-driven nurse load, and assert that the new active epoch authorizes exactly one request instead of repeating the rejection.
  - Assert that no nurse request starts before authentication is active, no per-operation independent `auth.getSession()` call is made after sign-in, and diagnostics record only readiness labels, epochs, and call counts—not sessions or tokens.
  - Run the focused integration test on the unfixed code, retain the safely redacted failing counterexample/event sequence, and do not weaken the assertions or fix application code as part of this task.
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Add shared-readiness preservation property coverage
  - **Property 2: Preservation** - Non-Bug Session and Nurse Behavior
  - Retain and extend the fast-check suites under `src/lib/nurses/__tests__/` and the shared `src/test/pbt.js` harness with at least 100 generated cases per property.
  - Cover non-bug schedules for feature-off legacy mode, active-session hydration, same-principal refresh, authorized and RLS-denied requests, adapter selection, request counts, error classifications, server-confirmed state, manual retry, and nurse CRUD/concurrency outcomes.
  - Assert feature-off schedules remain Supabase-inert, existing active sessions remain valid, the public client remains responsible for authorization headers, and nurse operations do not expose token-shaped values in results, telemetry, or state.
  - Keep repository authorization, creation, pagination, telemetry, ambiguous-create, backend-isolation, lifecycle, delete-convergence, and version-safety properties passing with the shared active-session gateway.
  - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 3. Add fail-closed authentication and route regression coverage
  - **Property 3: Preservation** - Expiry and Invalid Credentials Fail Closed
  - Extend `src/context/__tests__/AuthContext.test.jsx` for active hydration, explicit and repeated sign-in epochs, duplicate callbacks, same-principal refresh, sign-out, local expiry deadlines, deferred-event ordering, and stale server-invalidation guards.
  - Extend `src/components/layout/__tests__/RequireAuth.test.jsx` and the Supabase integration coverage so `initializing` renders loading, `active` allows protected content, and `signedOut` or `expired` redirects while preserving the requested location.
  - Extend `src/context/__tests__/AppContext.supabase.test.jsx` and repository/data-layer tests to assert locally unavailable readiness issues no protected request, server 401 remains `AUTH`, 403/`42501` remains `FORBIDDEN`, failures preserve server-confirmed state, denied rows stay hidden, and no automatic retry is scheduled.
  - Assert stale old-epoch responses and invalidations cannot alter the current session or protected state, and credential fragments remain absent from rendered output and diagnostics.
  - _Requirements: 3.2, 3.4, 3.6_

- [x] 4. Add server-authority and nurse-workflow regression coverage
  - **Property 4: Preservation** - Server Authority and Nurse Workflow Invariants
  - Keep legacy AppContext and nurse regression tests proving feature-off authentication and local CRUD do not create a Supabase client, request a Supabase session, or send a Supabase nurse request.
  - Update repository and data-layer tests for the injected `requireActiveSession` gateway while retaining validation order, pagination, owner assignment, telemetry allowlisting, create ambiguity, optimistic concurrency, version safety, and delete-result assertions.
  - Add principal- and epoch-isolation coverage in `src/lib/nurses/__tests__/nurseController.principalIsolation.test.js`, including ignored prior-principal completions, detached old-epoch work, and same-user confirmed-state/draft preservation.
  - Retain RLS and server-authority coverage proving only successful Supabase responses change accepted state, rejected responses never expose or mutate nurse data, and no localStorage or bundled-sample fallback is used.
  - Keep the nurse controller/repository property and regression suites passing for list, detail, create, update, pipeline, delete, refresh, conflict, collision, validation, retry, pagination, and concurrent-version workflows.
  - _Requirements: 3.1, 3.3, 3.6, 3.7, 3.8, 3.9_

- [x] 5. Implement the shared authentication-readiness fix

  - [x] 5.1 Add provider-owned session readiness and the active-session gateway
    - In `src/context/AuthContext.jsx`, add the immutable `{ status, session, userId, authEpoch }` readiness snapshot, a latest-snapshot ref, and a provider-owned pending readiness boundary for initial hydration or an in-progress explicit sign-in.
    - Centralize hydration, explicit sign-in, auth callbacks, refresh, expiry evaluation, and sign-out in one commit path that updates the React state and imperative snapshot together.
    - Expose a stable `requireActiveSession()` that waits only for provider-owned readiness work, returns `{ session, userId, authEpoch, error }`, and never performs a nurse-operation-specific SDK lookup.
    - Commit a successful sign-in session before resolving the sign-in promise; advance the epoch once per successful explicit sign-in, suppress duplicate `SIGNED_IN` advancement, and keep the epoch stable for same-principal `TOKEN_REFRESHED` events.
    - Publish inert readiness/gateway values from `SIGNED_OUT_DEFAULT` and `LegacyAuthProvider` without touching Supabase; preserve role lookup as UI gating and keep RLS authoritative.
    - _Bug_Condition: `isBugCondition(input)` where a successful active sign-in is accepted by AuthContext but an independent nurse session read rejects it_
    - _Expected_Behavior: `expectedBehavior(result)` requires route/gateway user and epoch agreement with no independent session read_
    - _Preservation: Existing-session, refresh, sign-out, expiry, legacy, confidentiality, and RLS behaviors from the design_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.4, 3.5_

  - [x] 5.2 Compose providers so data hydration can consume auth readiness
    - In `src/App.jsx`, place `AuthProvider` outside `AppProvider` while retaining `ErrorBoundary`, `BrowserRouter`, route definitions, feature selection, and legacy route behavior.
    - Add a provider-composition assertion proving ordinary navigation and token refresh do not remount either provider or recreate application state.
    - _Bug_Condition: `isBugCondition(input)` includes auth-independent AppProvider hydration and disagreeing route/repository observations_
    - _Expected_Behavior: both protected routing and nurse orchestration consume the provider-owned readiness epoch_
    - _Preservation: Router structure, RBAC, feature selection, and provider state survive ordinary navigation_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.5, 3.8_

  - [x] 5.3 Make AppContext hydration auth-aware and inject the shared gateway
    - In `src/context/AppContext.jsx`, consume `readiness` and `requireActiveSession` only in Supabase mode and construct the Supabase nurse repository/controller with that stable dependency; keep the initialized feature-off controller and local storage path unchanged.
    - Gate protected Supabase hydration while readiness is `initializing`, `signedOut`, or `expired`; start the first active-epoch hydration once and prevent duplicate loads on rerender or same-user token refresh.
    - Keep controller identity stable across refreshes and ordinary rerenders; after repeated explicit sign-in, make the next user-driven load use the new epoch without adding a timer, background retry, or automatic retry after any failure.
    - On principal change, prevent prior-principal nurse rows from rendering until a successful response for the new principal is accepted; never substitute local or bundled nurse records in Supabase mode.
    - _Bug_Condition: `isBugCondition(input)` where nurse hydration starts outside authentication readiness or remains bound to an inconsistent AUTH result_
    - _Expected_Behavior: the first and next user-driven nurse loads resolve the same active user/epoch as the route and accept only the RLS-authorized response_
    - _Preservation: Controller identity, drafts, confirmed state, manual retry, legacy state, and unrelated domain behavior from the design_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5, 3.6, 3.8_

  - [x] 5.4 Inject the gateway into the nurse repository and remove per-operation independent session reads
    - In `src/lib/nurses/nurseRepository.js`, replace the `readSession` production dependency with the shared active-session gateway contract and remove the default import/path that calls `auth.getSession()` for each list, detail, create, save, or delete.
    - In Supabase mode, authorize from `{ userId, authEpoch, session, error }`; retain user-ID and local-expiry defense-in-depth checks against that snapshot and return normalized `AUTH` without calling `nurseOps` when unavailable.
    - Continue delegating all requests to `nurseOps` and the memoized public Supabase client; never pass, copy, persist, log, or manually attach an access token.
    - Preserve input-validation order, pagination consistency, owner assignment, telemetry allowlisting, create retry/collision handling, optimistic concurrency, and mutation outcomes.
    - _Bug_Condition: `isBugCondition(input)` identifies `nurseAuthorizationSource = "independent getSession"` followed by `AUTH`_
    - _Expected_Behavior: `independentGetSessionCalls = 0`, one gateway authorization, and one public-client request for each eligible operation_
    - _Preservation: Existing repository operation semantics and RLS/client authorization remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 3.4, 3.7, 3.8, 3.9_

  - [x] 5.5 Make the route guard consume the shared readiness status
    - In `src/components/layout/RequireAuth.jsx`, base loading, allow, and redirect decisions on `Session_Readiness.status` from `useAuth()` rather than deriving a second authority from raw session state.
    - Preserve the loading indicator during `initializing`, protected content for `active`, and redirect state for `signedOut` or `expired`; keep the feature-off bypass unchanged.
    - Ensure the guard performs no SDK session read and uses the same active user/epoch snapshot available to nurse authorization.
    - _Bug_Condition: `isBugCondition(input)` requires the route to allow while a separate nurse authority rejects the same application context_
    - _Expected_Behavior: route and nurse decisions agree on readiness, user, and epoch_
    - _Preservation: Existing loading, redirect, requested-location, and legacy bypass behavior_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.5_

  - [x] 5.6 Add the credential-safe read-only verification summary helper and unit coverage
    - Add the pure `summarizeEmilyReadOnly(rows)` helper in `scripts/nurse-read-only-verification.mjs`; keep it free of network, filesystem, environment, authentication, and mutation I/O.
    - Return only the approved frozen summary fields: `exactly_one`, `owner_assigned`, `version_valid`, and `current_version`.
    - Add `scripts/nurse-read-only-verification.test.js` fixtures proving the single Emily Plaatjies row reports version `2`, sensitive owner/credential/nurse fields are excluded, and duplicate, missing-owner, or invalid-version inputs fail closed.
    - Keep create, update, pipeline, and delete capabilities outside the helper contract; do not add credential-bearing production automation or production execution paths.
    - _Preservation: Read-only Emily summary and credential-confidentiality requirements from the design_
    - _Requirements: 3.4, 3.7, 3.9_

  - [x] 5.7 Verify the original bug-condition test now passes
    - **Property 1: Expected Behavior** - Shared Readiness Authorizes First and Repeated Sign-In
    - Re-run the exact integration/property test from task 1 without replacing it or relaxing its assertions.
    - Confirm clean-browser and repeated-sign-in schedules use one active user/epoch, make zero per-operation `getSession()` calls, issue exactly one eligible public-client nurse request, accept only the RLS-authorized response, and expose no credential fragments.
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.8 Verify the preservation property and regression suites pass
    - **Property 2: Preservation** - Non-Bug Session and Nurse Behavior
    - **Property 3: Preservation** - Expiry and Invalid Credentials Fail Closed
    - **Property 4: Preservation** - Server Authority and Nurse Workflow Invariants
    - Run the implemented property and focused regression coverage from tasks 2 through 4 against the completed shared-readiness implementation.
    - Confirm legacy routing/storage, existing active sessions, refresh, real expiry, 401/403/RLS behavior, confidentiality, server-confirmed state, manual retries, and nurse CRUD/concurrency outcomes remain preserved.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [x] 5.9 Harden auth epochs, server invalidation, protected-domain isolation, and wall-clock expiry
    - Capture `{ userId, authEpoch }` for every nurse operation, advance controller execution boundaries on repeated same-user sign-in, detach old dedupe handles, ignore old-epoch completions, and preserve same-user confirmed state/drafts while clearing on principal change.
    - Add `invalidateSession({ userId, authEpoch })` to the provider contract and invoke it only for server-returned `AUTH`; block all later protected network work until newer sign-in/refresh and ignore stale invalidations.
    - Principal-gate all protected AppContext top-level values and async slices, including replacement-hydration failures, and reject late prior-principal commits.
    - Schedule provider-owned `expires_at` deadlines with replacement/cancellation generation guards for hydration, sign-in, refresh, invalidation, and sign-out.
    - Add focused deferred hydration/sign-in/callback, old-epoch response, server-401, all-domain principal exposure, and stale-expiry-timer regression tests.
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 3.5, 3.6, 3.8, 3.9_

- [x] 6. Add and run the focused browser regression journey
  - Add `tests/e2e/journeys/production-auth-session-expiry.spec.js` using an empty storage state and deterministic intercepted Supabase auth/data boundaries rather than a pre-seeded session helper.
  - Verify no nurse request occurs before active readiness; after one successful sign-in, verify the first `/nurses` GET occurs once and renders the deterministic server row without `Authentication required` or the expired-session message.
  - In the same browser context, create a controlled `AUTH` result, complete a second successful sign-in, invoke the next user-driven refresh or route load, and verify exactly one request succeeds under the new epoch.
  - Check only that client-managed authorization is present and differs from the anon key; never include its value in assertion messages, traces, screenshots, or logs.
  - Run this journey together with existing `nurse-management.spec.js` and `nurse-pipeline.spec.js` to preserve browser-level CRUD/concurrency behavior.
  - _Requirements: 2.1, 2.2, 2.3, 3.3, 3.4, 3.5, 3.6, 3.8, 3.9_

- [x] 7. Checkpoint - Complete local automated validation
  - Run the focused Vitest suites for AuthContext, AppContext, RequireAuth, cross-layer auth gating, nurse repository/authorization, principal isolation, confidentiality, and the credential-safe read-only summary helper.
  - Run all fast-check properties with at least 100 generated cases and the full non-watch Vitest suite with `npm test`.
  - Run the deterministic local Playwright journeys for production auth-session expiry, nurse management, and nurse pipeline behavior using intercepted local fixtures only.
  - Run `npm run lint`, `npm run build:vercel`, `npm run check:migrations`, the migration checker tests, and `git diff --check` as local static/build/migration consistency gates.
  - Confirm the focused suites, property suites, full Vitest suite, deterministic Playwright journeys, lint, build, migration checks, and diff checks pass using local automated gates only.
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
