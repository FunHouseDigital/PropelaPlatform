# Production Auth Session Expiry Bugfix Design

## Overview

This bugfix removes the split-brain authentication decision that can occur after a successful Supabase sign-in. Today, `RequireAuth` trusts the session held by `AuthContext`, while every nurse repository operation independently calls `auth.getSession()`. `AppProvider` also begins Supabase hydration while it is outside and above `AuthProvider`, so nurse loading is not sequenced behind authentication readiness. In a clean browser, those paths can observe different moments in session establishment: the route can accept the session returned by sign-in while the nurse path reports no session and preserves an `AUTH` failure.

The fix will introduce one authoritative session-readiness contract owned by `SupabaseAuthProvider`. Both route guarding and nurse authorization will consume the same readiness snapshot and active-session gateway. Nurse operations will stop performing an independent immediate `auth.getSession()` read. The shared public Supabase client will continue to persist and auto-refresh sessions and to attach the current JWT to PostgREST requests; Postgres RLS remains the authorization authority.

The change is limited to authentication sequencing, epoch-aware request isolation, protected-domain exposure, and provider-owned expiry/invalidation transitions. It does not change nurse payloads, adapter selection, RLS policies, optimistic-concurrency/version checks, manual retry rules, or legacy storage behavior.

## Glossary

- **Bug_Condition (C)**: Supabase mode is enabled; a clean or newly re-authenticated browser has a successful sign-in session accepted by `AuthContext`; and a nurse operation is rejected because an independent session read does not recognize that same active session.
- **Property (P)**: The route guard and nurse operation resolve authentication from one readiness contract, so an active session accepted after sign-in authorizes the nurse request while absent, expired, invalid, or server-rejected sessions still fail closed.
- **Preservation**: Behavior outside the inconsistent-session condition remains observationally unchanged, including legacy mode, active existing sessions, Supabase refresh/JWT behavior, RLS decisions, server-confirmed nurse state, and all nurse CRUD/concurrency workflows.
- **Session_Readiness**: An immutable snapshot published by `SupabaseAuthProvider`: `{ status, session, userId, authEpoch }`, where `status` is `initializing`, `active`, `signedOut`, or `expired`.
- **Active_Session_Gateway**: A stable `requireActiveSession()` function backed by the latest `Session_Readiness` snapshot. It waits only for provider-owned initial hydration or an in-progress provider-owned sign-in, then returns the active identity or a normalized `AUTH` failure. It does not initiate an independent session lookup for a nurse operation.
- **Auth_Epoch**: A monotonic identifier advanced once when a session is initially established or a successful explicit sign-in is accepted, including repeated sign-in. An ordinary same-user `TOKEN_REFRESHED` event updates the session without creating a new epoch; recovery from a server-invalidated boundary advances the epoch so late rejected work cannot invalidate or commit into the recovered session.
- **Route_Guard**: `RequireAuth` in `src/components/layout/RequireAuth.jsx`, which decides whether protected content can render.
- **Nurse_Repository**: `createNurseRepository` in `src/lib/nurses/nurseRepository.js`, which validates inputs, authorizes a nurse operation, and delegates to the selected data-layer operations.
- **Public_Supabase_Client**: The memoized anon-key client in `src/lib/supabaseClient.js`; it persists sessions, auto-refreshes tokens, attaches the current JWT, and remains constrained by RLS.
- **Server_Confirmed_State**: Nurse list/detail/mutation state accepted only from a successful Supabase response and managed by `nurseController`.

## Bug Details

### Bug Condition

The bug manifests when Supabase sign-in establishes an active session in `AuthContext`, but nurse loading or a later nurse operation makes a second, independently timed `auth.getSession()` decision and receives no usable session. The route and nurse repository therefore disagree about whether the same application context is authenticated.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type NurseOperationAttempt
  OUTPUT: boolean

  RETURN input.supabaseBackendEnabled = true
         AND input.signInResult.error = null
         AND input.authContextSession = input.signInResult.session
         AND isSessionExpired(input.authContextSession) = false
         AND input.routeGuardDecision = "allow"
         AND input.nurseAuthorizationSource = "independent getSession"
         AND input.nurseAuthorizationDecision = "AUTH rejection"
END FUNCTION
```

### Evidence from the Current Implementation

1. `SupabaseAuthProvider.signIn` in `src/context/AuthContext.jsx` eagerly accepts `data.session` with `setSession(data.session)`, and `RequireAuth` reads that context session.
2. `createNurseRepository` defaults `readSession` to `getSession` from `src/lib/auth.js` and invokes it before every Supabase nurse operation. This is a second authentication observation independent of `AuthContext` state.
3. `src/App.jsx` currently renders `AppProvider` outside `AuthProvider`. Consequently, `AppProvider` cannot consume auth readiness when it constructs the default nurse controller/repository or starts data hydration.
4. `AppProvider` starts all Supabase domain loads from a mount effect, including nurses, without an auth-readiness dependency. That effect does not rerun merely because sign-in later succeeds.
5. The nurse UI deliberately does not offer automatic retry for an `AUTH` list error, and the controller preserves the failed/server-confirmed state. This explains why an early inconsistent rejection can remain visible after navigation or another sign-in.
6. `getSupabaseClient()` is memoized and configured with `persistSession: true` and `autoRefreshToken: true`, while the adapter relies on that client to attach JWTs. There is no evidence of a second production client in the inspected path.
7. Existing tests cover context hydration, route guarding, independent repository authorization, RLS denial, and nurse workflow preservation separately. They do not cover the clean-browser sequence from successful sign-in through the first nurse request using the real provider composition.

### Most Plausible Root Cause

**Evidence-supported structural cause:** route guarding and nurse authorization use two different session-observation paths, and nurse hydration is not sequenced behind provider readiness. This permits contradictory decisions and leaves an early `AUTH` result unreconciled.

**Timing hypothesis:** in the reported clean-browser production sequence, the independent `auth.getSession()` call ran before the newly returned sign-in session was observable through that lookup path, even though `AuthContext` had already accepted `data.session`. The exact Supabase SDK/storage scheduling mechanism is not proven by the repository alone and must not be presented as established fact.

**Repeated-sign-in hypothesis:** because `AppProvider` is mounted above `AuthProvider`, its initial nurse hydration is independent of auth transitions and its mount effect does not automatically create a new nurse load after sign-in. The existing non-retryable `AUTH` state can therefore survive a second sign-in until another operation is explicitly initiated. This is strongly supported by control flow, but the exact production event ordering still requires an exploratory regression test.

### Examples

- **Clean browser, first sign-in**: `/nurses` redirects to `/login`; sign-in returns active session `S1`; `RequireAuth` allows `/nurses`; the nurse repository independently reads `null`; actual result is `Authentication required`, while expected result is one RLS-constrained list request using the public client under `S1`.
- **Repeated sign-in**: after the inconsistent `AUTH` result, sign-in returns active session `S2`; the next user-initiated nurse load again reads no session through the independent path; actual result repeats the expiry message, while expected behavior is authorization from the new shared readiness epoch.
- **Existing normal-browser session**: initial hydration returns an unexpired session and nurse loading succeeds. The fix must preserve this path without signing out, replacing, or invalidating the session.
- **True expiry edge case**: the readiness snapshot contains a session whose `expires_at` has passed and no refreshed session has arrived. Both the route guard and nurse gateway must reject it; no nurse request may be issued from that expired snapshot.
- **Server rejection edge case**: local readiness is active, but Supabase rejects the attached JWT with 401. The adapter must still return `AUTH`, preserve server-confirmed nurse state, expose no denied rows, and perform no automatic retry.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Feature-off mode continues to use hardened legacy authentication and local nurse storage without creating a Supabase client, reading a Supabase session, or sending a Supabase nurse request.
- A genuinely absent or locally expired session blocks protected routes and nurse database operations.
- Supabase 401/invalid-JWT responses remain `AUTH`; 403/`42501` RLS responses remain `FORBIDDEN`.
- The memoized public Supabase client remains the only frontend client and continues `persistSession`, `autoRefreshToken`, URL-session detection, and automatic Bearer JWT attachment. Application code does not copy a token into nurse arguments, state, telemetry, logs, or non-auth persistence.
- RLS remains authoritative. Client-side role/profile checks are UI gating only and cannot turn a denied request into success.
- Existing valid normal-browser sessions remain active and are not signed out or invalidated by readiness reconciliation.
- Nurse list and detail views accept only successful Supabase results in feature-on mode; localStorage or bundled sample nurses are never used as an error fallback.
- Authentication, permission, validation, network, conflict, and unknown failures preserve the last server-confirmed nurse state and any established draft behavior.
- Nurse create, read, update, pipeline, delete, refresh, conflict, collision, validation, retry, version advancement, pagination, and concurrency semantics remain unchanged.
- Emily Plaatjies is read-only verification data for this bugfix: an authorized production read must continue to observe exactly one row, assigned owner metadata, and version `2`; verification must not mutate the row.

**Scope:**
All inputs where the route and repository already agree on readiness are preservation inputs. This includes:
- feature-off legacy sessions and local CRUD;
- Supabase initial hydration with an existing valid session;
- token refresh events for the same signed-in principal;
- sign-out, missing-session, and genuinely expired-session flows;
- active-session requests accepted or denied by RLS;
- every nurse result after authentication has been resolved.

The fix changes only which in-memory authority answers “is this application session ready?” and when Supabase-mode hydration may begin. It does not make frontend session state an authorization substitute for the server.

## Hypothesized Root Cause

1. **Dual Session Authorities (evidence)**: `RequireAuth` reads `AuthContext.session`, while `nurseRepository.activeUser()` calls `auth.getSession()` independently.
   - The two reads can represent different points in session establishment.
   - Current unit tests mock these paths independently and therefore cannot prove cross-layer consistency.

2. **Authentication-Independent Data Hydration (evidence)**: `AppProvider` is above `AuthProvider` and begins Supabase domain hydration from its own mount effect.
   - Nurse loading can start before authentication is ready.
   - The hydration effect has no successful-sign-in or auth-epoch dependency.

3. **Clean-Browser Session Visibility Timing (hypothesis)**: immediately after first sign-in, the session returned by `signInWithPassword` may be available to the provider before a separate `getSession()` lookup returns it in the observed production timing.
   - The implementation proves the two observations exist, not why the second returned no session.
   - No change should depend on undocumented storage timing; removing the second authority avoids that dependency.

4. **Sticky AUTH State after Sign-In (evidence plus event-order hypothesis)**: the controller correctly retains failed state, and `AUTH` is not an automatically retryable list error.
   - This preservation is desirable for real failures.
   - Without an auth-aware first-load boundary, an inconsistent pre-ready failure can remain after one or more successful sign-ins.

5. **Not the Primary Cause (evidence)**: the inspected data path uses a memoized Supabase client with automatic refresh and JWT attachment.
   - The design must preserve this client behavior rather than manually transferring access tokens or introducing another client.

## Correctness Properties

**Expected-behavior predicate:**
```
FUNCTION expectedBehavior(result)
  INPUT: result of type NurseOperationAuthorizationResult
  OUTPUT: boolean

  RETURN result.routeDecision = "allow"
         AND result.nurseDecision = "authorized"
         AND result.routeAuthEpoch = result.nurseAuthEpoch
         AND result.routeUserId = result.nurseUserId
         AND result.independentGetSessionCalls = 0
         AND result.publicClientRequestCount = 1
         AND result.requestAuthorizationIsManagedBySupabaseClient = true
         AND result.acceptedNurseState = result.rlsAuthorizedServerResponse
         AND result.exposedCredentialFragments = 0
END FUNCTION
```

Property 1: Bug Condition - Shared Readiness Authorizes First and Repeated Sign-In

_For any_ clean-browser or repeated-sign-in event ordering where Supabase sign-in succeeds with an unexpired session and `Session_Readiness` is active, the route guard and the next nurse operation SHALL resolve the same user and auth epoch from the shared contract, the nurse repository SHALL make no independent `getSession()` call, and the operation SHALL proceed once through the public RLS-constrained client.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Bug Session and Nurse Behavior

_For any_ input where the bug condition does NOT hold, the fixed flow SHALL produce the same externally observable route, error classification, adapter selection, server-confirmed state transition, manual-retry behavior, and CRUD/concurrency outcome as the original flow, while preserving automatic token refresh, public-client JWT attachment, RLS authority, credential confidentiality, legacy behavior, and existing active sessions.

**Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9**

Property 3: Expiry and Invalid-Credential Fail Closed

_For any_ absent, malformed, locally expired, or server-rejected session, the shared readiness contract and nurse data path SHALL return an `AUTH` outcome, SHALL not expose denied nurse data or mutate server-confirmed state, SHALL issue no request when readiness is locally unavailable, and SHALL not schedule an automatic retry; a later request is permitted only after successful sign-in and a user-driven route load or operation.

**Validates: Requirements 3.2, 3.4, 3.6**

Property 4: Server Authority and Nurse Workflow Preservation

_For any_ authorized nurse operation sequence containing reads, creates, updates, pipeline changes, deletes, refreshes, conflicts, collisions, validation failures, retries, RLS denials, or concurrent version changes, the fixed authentication wiring SHALL accept state only from successful server responses and SHALL preserve the established owner, version, draft, conflict, retry, and failure-state invariants.

**Validates: Requirements 3.3, 3.6, 3.7, 3.8, 3.9**

## Fix Implementation

### Session-Readiness Contract

`SupabaseAuthProvider` will be the single owner of session establishment and readiness.

```
TYPE SessionReadiness = {
  status: "initializing" | "active" | "signedOut" | "expired",
  session: Session | null,
  userId: string | null,
  authEpoch: integer
}

FUNCTION requireActiveSession()
  IF readiness.status = "initializing" THEN
    AWAIT providerOwnedHydrationOrSignIn
  END IF

  snapshot := latestReadinessSnapshot
  IF snapshot.status != "active"
     OR snapshot.userId is blank
     OR isSessionExpired(snapshot.session) THEN
    RETURN { error: AUTH, session: null, userId: null, authEpoch: snapshot.authEpoch }
  END IF

  RETURN {
    error: null,
    session: snapshot.session,
    userId: snapshot.userId,
    authEpoch: snapshot.authEpoch
  }
END FUNCTION
```

Contract invariants:

1. Initial `auth.getSession()` is performed only as provider-owned hydration, never as per-operation nurse authorization.
2. A successful `signIn` commits the returned session to the latest readiness reference before the sign-in promise resolves and before navigation is allowed.
3. The React state and imperative gateway are updated from the same commit function, avoiding a state-render lag between them.
4. `onAuthStateChange` is the continuing source for `SIGNED_OUT`, `TOKEN_REFRESHED`, and externally initiated session changes.
5. A duplicate `SIGNED_IN` callback for the session already committed by the explicit sign-in synchronizes state but does not double-advance `authEpoch`.
6. A repeated explicit successful sign-in advances `authEpoch` even for the same user, so a prior rejected operation cannot bind the next operation to stale readiness.
7. A same-principal token refresh replaces the session in the snapshot without signing out, reloading nurse state, or advancing an ordinary active epoch. A refresh that recovers a server-invalidated boundary advances the epoch. If no refreshed session arrives before `expires_at`, a provider-owned wall-clock deadline publishes `expired`; each new session replaces the deadline and stale callbacks are ignored.
8. The contract returns identity metadata for owner attribution but never asks nurse code to read, persist, log, or attach the access token.
9. A server-confirmed 401/`AUTH` invokes `invalidateSession({ userId, authEpoch })`. It publishes `expired` only when the supplied boundary is still current, so a late old-epoch 401 cannot invalidate a newer session. Gateway/local-validation `AUTH` results do not invoke this path.
10. Once invalidated or expired, route readiness and all protected operations fail closed without a network request until a newer successful sign-in or refresh establishes readiness.

### Changes Required

**File**: `src/context/AuthContext.jsx`

**Functions**: `SupabaseAuthProvider`, `signIn`, auth hydration/state-change handling, exported context value

**Specific Changes**:
1. Add `Session_Readiness` state plus a latest-snapshot reference and provider-owned pending-readiness promise.
2. Centralize all hydration, sign-in, refresh, and sign-out updates in one commit function.
3. Expose `readiness` and stable `requireActiveSession()` in the Supabase context contract; expose inert legacy-compatible values in `SIGNED_OUT_DEFAULT` and `LegacyAuthProvider` without touching Supabase.
4. Commit successful `data.session` before resolving `signIn`; keep role lookup separate from session authority and preserve RLS as authoritative.
5. Preserve `onAuthStateChange`, automatic token refresh, existing error normalization, and sign-out clearing.

**File**: `src/App.jsx`

**Function**: `App`

**Specific Changes**:
1. Compose `AuthProvider` outside `AppProvider` so data orchestration can consume the readiness contract.
2. Keep `BrowserRouter`, route definitions, legacy route behavior, and feature selection unchanged.
3. Verify provider reordering does not recreate either provider during ordinary navigation.

**File**: `src/context/AppContext.jsx`

**Function**: `AppProvider`

**Specific Changes**:
1. Consume the shared auth readiness only in Supabase mode.
2. Construct the Supabase nurse repository/controller with the stable `requireActiveSession` dependency instead of the module-default independent session reader. Preserve the current initialized legacy controller when the flag is off.
3. Gate initial Supabase hydration until readiness is active; do not send nurse or unrelated protected-domain requests while readiness is `initializing`, `signedOut`, or `expired`.
4. Track first-load/auth epoch so clean-browser sign-in can initiate the first route/data load once, repeated sign-in makes the next user-driven load eligible, and token refresh does not duplicate loads.
5. Do not add background retries after `AUTH`, `FORBIDDEN`, network, or data failures. Existing explicit refresh/manual retry boundaries remain; the only timer is the provider-owned local `expires_at` deadline and it never issues a data request.
6. Keep the controller instance stable during token refresh and ordinary rerenders. Advance its execution boundary for every `{ userId, authEpoch }` change so old-epoch work is detached from deduplication and ignored on completion; preserve same-user confirmed state and drafts, and clear them only for a different principal.
7. Principal-gate every protected top-level domain value and every async slice, not only nurses. A new principal sees neutral values until that principal's successful response is accepted; replacement failures expose only the new failure metadata, and late prior-principal responses cannot commit.

**File**: `src/lib/nurses/nurseRepository.js`

**Function**: `createNurseRepository`, `activeUser`

**Specific Changes**:
1. Rename/generalize the injected dependency from `readSession` to the shared active-session gateway contract.
2. In Supabase mode, obtain `{ userId, authEpoch, error }` from that gateway; remove the production default path that calls `auth.getSession()` for every nurse operation.
3. Preserve local expiry/user-ID validation as defense in depth, but run it on the gateway snapshot rather than a second SDK lookup.
4. Continue delegating all database work to `nurseOps`/the public client. Do not pass or manually attach an access token.
5. Leave validation order, pagination, owner assignment, telemetry allowlist, create ambiguity handling, update/version checks, and delete outcomes unchanged.

**File**: `src/components/layout/RequireAuth.jsx`

**Function**: `RequireAuth`

**Specific Changes**:
1. Base loading, allow, and redirect decisions on `Session_Readiness.status` from the same contract used by nurse authorization.
2. Preserve loading UI during provider initialization and preserve redirect state for signed-out/expired sessions.
3. Do not call `auth.getSession()` or create a second expiry authority.

**Files**: focused tests under `src/context/__tests__/`, `src/components/layout/__tests__/`, `src/lib/nurses/__tests__/`, `src/pages/__tests__/`, and `tests/e2e/journeys/`

**Specific Changes**:
1. Add cross-layer tests rather than only independently mocked guard/repository tests.
2. Retain existing tests as preservation coverage; update injected dependency names without weakening assertions.
3. Add deterministic clean-browser and repeated-sign-in journeys with no pre-seeded session.
4. Ensure test diagnostics redact tokens and never snapshot a complete session credential.

### State and Sequence Design

**Clean-browser first sign-in:**

```
Browser -> AuthProvider: hydrate
AuthProvider -> Session_Readiness: initializing -> signedOut
Route_Guard -> Login: redirect
User -> AuthProvider: signIn(credentials)
Supabase Auth -> AuthProvider: session S1
AuthProvider -> Session_Readiness: commit active(S1, epoch E1)
AuthProvider -> Login: success
Login -> /nurses: navigate
Route_Guard -> Session_Readiness: allow E1
AppProvider/Nurse_Repository -> Active_Session_Gateway: require E1
Active_Session_Gateway -> Nurse_Repository: userId, E1
Nurse_Repository -> Public_Supabase_Client: list nurses
Public_Supabase_Client -> Postgres RLS: request with client-managed JWT
Postgres RLS -> Nurse_Controller: authorized rows or empty result
```

**True expiry/server invalidation:**

```
Session_Readiness -> Route/Nurse: expired => redirect/AUTH, no local request
OR
Session_Readiness(active) -> Public Client -> Supabase: request
Supabase -> Adapter: 401 invalid/expired JWT
Adapter -> Nurse_Controller: AUTH, no accepted data/mutation, no automatic retry
```

**Token refresh:**

```
Supabase auto-refresh -> onAuthStateChange(TOKEN_REFRESHED, S2)
AuthProvider -> Session_Readiness: active(S2, same principal, same explicit sign-in epoch)
Next nurse request -> same public client with client-managed refreshed JWT
```

## Testing Strategy

### Validation Approach

Testing follows two phases. First, a deterministic exploratory test must reproduce the contradictory decisions on unfixed code and record only safe state labels/call counts. Second, the fixed code must satisfy shared-readiness properties and all existing preservation suites. Production verification is read-only, credential-safe, and performed only after local and mocked-browser checks pass.

### Exploratory Bug Condition Checking

**Goal**: Surface the clean-browser and repeated-sign-in counterexamples before implementation, confirm the dual-authority/event-order diagnosis, and distinguish an early hydration failure from a later SDK session-read failure.

**Test Plan**: Build an integration harness with real `AuthProvider`/`AppProvider`/routing composition and a deterministic fake Supabase auth client. The fake returns a valid session from sign-in while controlling when an independent `getSession()` becomes observable. Run against unfixed code, then preserve the counterexample as a regression test that passes only after both consumers use shared readiness.

**Test Cases**:
1. **Clean Browser First Sign-In**: start with no persisted session, visit `/nurses`, sign in successfully, and assert the first nurse list succeeds instead of rendering the expiry error (fails on unfixed controlled ordering).
2. **Provider/Repository Agreement**: after sign-in, assert the route and repository use the same user/epoch and that no per-operation `auth.getSession()` call occurs (fails on unfixed code).
3. **Repeated Sign-In**: create the prior inconsistent `AUTH` state, complete another successful sign-in in the same browser context, trigger the next nurse load, and assert authorized server data replaces the error (fails on unfixed controlled ordering).
4. **Existing Session Control**: seed a valid normal-browser session and confirm initial hydration/list succeeds both before and after the fix.

**Expected Counterexamples**:
- `RequireAuth` renders protected content while `nurseRepository` returns `AUTH`.
- A nurse session read occurs independently after `AuthContext` has accepted sign-in.
- Nurse hydration begins while shared auth readiness is not active.
- The failed nurse state remains after successful sign-in because no auth-aware load boundary is crossed.

If the unfixed integration test does not reproduce any contradictory ordering, retain the proven structural issue but revise the timing hypothesis before implementation; do not invent an SDK explanation.

### Fix Checking

**Goal**: Verify every bug-condition input uses one readiness authority and produces the correct RLS-constrained request/result.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := runSignInAndNurseOperationWithSharedReadiness(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Executable property-based test**: use the existing `fast-check` harness with at least 100 runs. Generate sequences from `HYDRATE_NONE`, `SIGN_IN_SUCCESS(session,user)`, duplicate `SIGNED_IN`, `TOKEN_REFRESHED`, `NURSE_OPERATION`, and repeated `SIGN_IN_SUCCESS`. Generate callback/promise ordering around sign-in. For every operation after an active sign-in, assert guard/gateway agreement, one repository authorization, zero independent session reads, and one public-client operation. Include shrunk counterexamples in failures but redact generated token values.

### Preservation Checking

**Goal**: Verify non-bug inputs retain current routing, expiry, RLS, data-authority, and nurse-workflow outcomes.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  original := observeOriginalBehavior(input)
  fixed := observeFixedBehavior(input)
  ASSERT equivalentExceptForSessionAuthorityWiring(original, fixed)
END FOR
```

**Testing Approach**: Reuse the current property suites for nurse authorization, backend isolation, unconfirmed-state isolation, version safety, manual retry, delete convergence, pagination, telemetry, and adapter exclusivity. Add a model-based readiness property that generates absent, active, refreshed, expired, signed-out, 401, 403, and `42501` outcomes.

**Test Cases**:
1. **True Expiry Preservation**: past `expires_at` yields route redirect and repository `AUTH`, with no nurse request.
2. **Auto-Refresh Preservation**: `TOKEN_REFRESHED` replaces the snapshot; the next request succeeds through the same public client without manual JWT handling or controller recreation.
3. **Existing Session Preservation**: initial valid hydration permits nurse access and does not sign out or invalidate the session.
4. **RLS Preservation**: active local readiness plus 403/`42501` returns `FORBIDDEN`, no denied data, no mutation, and no fallback.
5. **Server-Rejected Credential**: active local readiness plus 401 returns `AUTH`, preserves confirmed state, and causes no automatic retry.
6. **Legacy Preservation**: feature-off generated operation sequences never touch Supabase and retain local authentication/storage behavior.
7. **State Authority Preservation**: failures never replace accepted nurse list/detail/drafts; successes use exact server-returned rows.
8. **CRUD/Concurrency Preservation**: all existing create ambiguity, collision, update/pipeline version, conflict/rebase, delete convergence, and manual retry tests remain green.
9. **Credential Confidentiality**: generated token strings do not appear in rendered output, errors, controller state, nurse records, telemetry events, console captures, or non-auth storage.

### Unit Tests

- `AuthContext`: readiness transitions for no session, existing session, successful sign-in, duplicate auth callback, repeated sign-in, token refresh, sign-out, and expiry; assert sign-in commits readiness before its promise resolves.
- `RequireAuth`: `initializing` shows loading, `active` allows, and `signedOut`/`expired` redirect using the shared status.
- `nurseRepository`: active gateway authorizes all operations without `auth.getSession`; absent/expired/error gateway blocks; server 401 and RLS denial remain categorized by the adapter.
- `AppContext`: no Supabase load before active readiness; first active epoch permits one initial hydration; token refresh does not duplicate it; explicit refresh after repeated sign-in uses the new epoch; controller identity remains stable.
- `Login`: successful navigation occurs only after the provider has committed active readiness.

### Property-Based Tests

- **Property 1 executable test**: generated clean/repeated sign-in event schedules always produce route/repository agreement and no independent session read.
- **Property 2 executable test**: generated feature modes, active-existing sessions, refreshes, and nurse operation sequences preserve adapter, outcome, and state invariants.
- **Property 3 executable test**: generated absent/expired/malformed/401 sessions fail closed, preserve confirmed state, and do not auto-retry.
- **Property 4 executable test**: rerun and extend generated nurse authorization/workflow sequences to prove authentication rewiring cannot alter version, conflict, draft, retry, RLS, or server-authority semantics.
- Use at least 100 runs through `src/test/pbt.js`; pin a seed only when reproducing a failure and retain the shrunk event sequence without credential material.

### Integration Tests

- Render the actual provider/router hierarchy with a deterministic fake Supabase client and exercise `/nurses` from no session through sign-in and first list response.
- Repeat sign-in in the same browser context after a controlled failed authorization, manually trigger the next nurse load, and verify server-confirmed data appears without another inconsistent `AUTH` result.
- Verify an existing hydrated session still lists nurses and a same-principal refresh continues on the same public client.
- Verify a locally active session followed by server 401/403 preserves displayed confirmed data, shows the correct error, and emits no retry.
- Verify feature-off navigation and nurse operations use only local storage.

### Focused Browser Regression Tests

1. Add a Playwright journey that begins with a genuinely empty storage state rather than `configureSupabaseContext`, intercepts sign-in and auth-state traffic, then verifies the first `/nurses` GET follows successful sign-in and returns a deterministic row.
2. Assert no nurse request occurs before sign-in readiness becomes active.
3. Assert the request uses the public client authentication path by checking only that an authorization header is present and is not the anon key; never attach the header value to assertion messages, traces, screenshots, or logs.
4. In the same browser context, reproduce a controlled `AUTH` failure, complete a second successful sign-in, trigger Refresh/route load, and verify exactly one next request succeeds.
5. Keep existing nurse-management Playwright journeys unchanged as CRUD/concurrency/legacy preservation coverage.

### Production-Safe Verification

Production checks must be staged and read-only:

1. Run the full unit/property/integration suite and deterministic Playwright regression against mocked Supabase before deployment.
2. Run `npm run build:vercel`, `npm run verify:production -- --url https://propela-platform.vercel.app`, and the existing anonymous Supabase verifier with approved environment-provided public inputs. Do not place credentials in command arguments, output, screenshots, or artifacts.
3. In a clean ephemeral browser context, use an approved non-privileged verification account to visit `/nurses`, sign in once, and confirm the first list completes without `Authentication required`. Inspect only request count/status and the presence—not the value—of client-managed authorization.
4. Sign out, sign in again in the same ephemeral context, manually refresh `/nurses`, and confirm the next list succeeds once without a repeated expiry error. Do not create, update, pipeline-move, or delete a nurse.
5. In a separate existing normal-browser session, perform a read-only nurse-list refresh and confirm the session remains active.
6. With authorized read-only access, verify Emily Plaatjies has exactly one returned row, non-null owner assignment, and version `2`. Record booleans/count/version only; do not record owner identity, JWTs, full response bodies, or other nurse fields.
7. Verify anonymous access still returns no nurse/profile rows and that RLS denial remains categorized correctly in non-production deterministic tests; do not attempt destructive production RLS probes.
8. Monitor aggregate `AUTH`, `FORBIDDEN`, list success, and request-count outcomes using the existing privacy-safe telemetry allowlist. Never add session IDs, user IDs, emails, JWTs, nurse fields, or raw error causes.
9. If clean-browser auth failures increase, request counts duplicate, existing sessions are invalidated, or any nurse mutation/state regression appears, halt rollout and revert the application change. No database migration or data rollback is required by this design.
