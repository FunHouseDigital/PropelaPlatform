# Implementation Plan

- [x] 1. Add failing nurse-action geometry reproduction tests
  - **Property 1: Bug Condition** - Primary Nurse Actions Remain Geometrically Reachable
  - **CRITICAL**: Write and run this property-based exploration test against the unfixed code before modifying application components. Its failure is required evidence of the bug; do not weaken the geometry oracle or change production code in this task.
  - Create `tests/e2e/journeys/nurse-action-reachability.spec.js` using `configureLegacyContext`, `configureSupabaseContext`, `NurseMockBackend`, and `makeNurseRow` from `tests/e2e/nurseMockBackend.js`.
  - Implement a reusable browser oracle for `expectedBehavior(result)` that records and asserts: exactly one applicable primary action; positive frame/action rectangles; frame and action containment within the visual viewport; representative interior-point hit testing; scrollable ancestors and maximum scroll offsets; visibility after an ordinary finite scroll; focus and focus visibility when enabled; exactly one existing command invocation; and unchanged controlled draft values.
  - Scope generated inputs to `isBugCondition(input)`: an open create or edit interface at 100% zoom, viewport width `>= 320`, viewport height `>= 568`, and rendered content taller than the available frame. Use a fixed `fast-check` seed, report the seed and shrunk counterexample, and generate widths in `[320, 1600]`, heights in `[568, 1200]`, overlay type, resize pairs, and deterministic dynamic-content states.
  - Include deterministic checks at `320x568`, `375x667`, `767x568`, `768x568`, and `1280x720` for: create overflow; create resize from `1280x720` to `320x568` with retained draft and validation growth; edit overflow with all sections expanded; and a two-session stale-save conflict at `320x568` with expanded `Review differences`, disabled conflict action, `Keep editing`, and restored enabled reachability.
  - Assert horizontal and vertical geometry to reproduce the 320 px edit-footer overflow. Assert that create content has an attainable scroll path and that edit conflict/error/section content contributes to the same scroll range.
  - Record the transformed fixed-position containing block, frame/body/action rectangles, discovered scroll owners, maximum scroll positions, and hit-test failures for every counterexample.
  - Run `npx playwright test tests/e2e/journeys/nurse-action-reachability.spec.js --project=chromium` once. Expect the unfixed create minimum-viewport and edit narrow-footer cases to fail; document the exact counterexamples for comparison in task 3.5.
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4_

- [x] 2. Add component and accessibility preservation property tests
  - **Property 2: Preservation** - Non-Layout Nurse Workflow Equivalence
  - **IMPORTANT**: Complete this observation-first task on the unfixed code before implementation. For inputs where `isBugCondition(input)` is false and outcomes independent of geometry, capture the current observable behavior and verify the new tests pass.
  - Extend `src/components/ui/__tests__/ResponsiveModal.test.jsx` to preserve one-instance rendering, role and accessible name, control order, close button, Escape handling, initial focus, Tab/Shift+Tab containment, nested dialog containment, and focus restoration.
  - Extend `src/components/nurses/__tests__/NurseCreateModal.test.jsx` to preserve field/action order and labels; first-invalid-field focus; submit, Cancel, Retry, and Retry-with-new-ID callback counts/arguments; enabled, disabled, and pending states; duplicate-submit suppression; draft retention after validation/failure; and successful close behavior.
  - Extend `src/components/nurses/__tests__/NurseCard.test.jsx` and `src/components/nurses/__tests__/NurseDetailWorkflow.test.jsx` to preserve conflict/error/section order; Delete/Base version before Cancel/Save; Cancel before `Save changes`; focus behavior; save/delete/cancel/conflict callbacks; permission and pending states; request counts; drafts; and version/conflict outcomes.
  - Add fixed-seed `fast-check` cases for non-overflow sizes and permission, pending, validation, retryable-failure, and conflict states. Assert layout visibility never changes action presence or enabled state and never invokes a mutation.
  - Run `npx vitest run src/components/ui/__tests__/ResponsiveModal.test.jsx src/components/nurses/__tests__/NurseCreateModal.test.jsx src/components/nurses/__tests__/NurseCard.test.jsx src/components/nurses/__tests__/NurseDetailWorkflow.test.jsx`; all preservation tests must pass on the unfixed revision.
  - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9, 3.11_

- [x] 3. Implement viewport-bounded nurse overlays

  - [x] 3.1 Add a shared body portal and viewport-bounded modal frame
    - Add one shared body-portal helper under `src/components/ui/` and render the complete `ResponsiveModal` overlay root into `document.body`, preserving React context/event propagation and existing z-index, role, accessible name, close callbacks, and focus effects.
    - Refactor the white dialog frame to a `min-h-0` flex column with `overflow-hidden`. Cap block size with a `100vh` fallback followed by `100dvh`, using zero block gutter for the full-screen mobile modal and the existing desktop gutter.
    - Remove the independent `70vh` and `calc(100vh - 65px)` body estimates.
    - Keep the default modal body as `min-h-0 flex-1 overflow-y-auto p-4`. Add a narrowly scoped contained-body mode using `min-h-0 flex-1 overflow-hidden` so complex children can own their scroll region without conflicting utility classes.
    - Add `ResponsiveModal.test.jsx` assertions for body portal placement, bounded frame styles/classes, default and contained body contracts, and unchanged role/name/focus/close behavior.
    - _Bug_Condition: `isBugCondition(input)` where overflowing modal content is rendered below transformed `PageTransition`_
    - _Expected_Behavior: `expectedBehavior(result)` requires the frame and complete primary action to remain inside the visual viewport_
    - _Preservation: Keep default confirmation/delete modal DOM order, accessibility, focus behavior, callbacks, and close semantics_
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.3_

  - [x] 3.2 Split the create form into stable scroll and action regions
    - Opt `src/components/nurses/NurseCreateModal.jsx` into the contained `ResponsiveModal` body while retaining the existing `<form>`, `handleSubmit`, `formRef`, and submission path.
    - Make the form a full-height `min-h-0` flex column. Place the introduction, error notice, and fieldset in one `min-h-0 flex-1 overflow-y-auto` content region with the existing padding.
    - Keep Retry, Retry with a new ID, Cancel, and `Create nurse` as the final form children in their existing relative DOM/keyboard order. Make their existing wrapper a non-shrinking, opaque, bordered action region and retain its current narrow-width wrapping.
    - Add structural tests proving the action region is outside the sole create scroll region but remains inside the same form; re-run submission, validation-focus, retry, pending, draft-preservation, and callback tests.
    - _Bug_Condition: `isBugCondition(input)` for overflowing create content after initial render, resize, validation, or failure growth_
    - _Expected_Behavior: `expectedBehavior(result)` provides an ordinary scroll path while `Create nurse` remains complete, unobscured, focusable, and exactly-once activatable when enabled_
    - _Preservation: Keep fields, labels, validation, controlled drafts, disabled expressions, callbacks, retries, and control order_
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.2, 3.3, 3.9, 3.11_

  - [x] 3.3 Portal the edit panel and unify its scrolling content
    - Render the complete `src/components/nurses/NurseCard.jsx` overlay, including loading and error states, through the shared body portal.
    - Apply the viewport-frame contract with `min-h-0`, `overflow-hidden`, the existing 3 rem vertical gutter, and `100vh` fallback followed by `100dvh`. Keep the header first and non-shrinking and the footer last and non-shrinking.
    - Move `ConflictPanel`, the save-error notice, and every accordion `Section`—in the existing order—into one `min-h-0 flex-1 overflow-y-auto` middle region.
    - Below 768 px, stack or wrap the Delete/Base-version group before the Cancel/Save group, let the action group consume the available width, and add only necessary `min-w-0` constraints. At and above 768 px, retain the current single-row layout. Keep Cancel before `Save changes` and do not alter callbacks or disabled expressions.
    - Extend `NurseCard.test.jsx` to assert body portal placement; common scroll-region ancestry for conflict, error, and sections; non-shrinking header/footer; mobile wrapping and desktop row contracts; unchanged control order; and unchanged callback/disabled behavior.
    - _Bug_Condition: `isBugCondition(input)` for overflowing edit content, conflict/error expansion, or the 320 px non-wrapping footer_
    - _Expected_Behavior: `expectedBehavior(result)` keeps the frame bounded and the complete `Save changes` rectangle inside both frame and viewport with an ordinary scroll path_
    - _Preservation: Keep dynamic-content/control order, action labels, draft state, permissions, callbacks, and version/conflict semantics_
    - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.8, 3.9, 3.11_

  - [x] 3.4 Run focused component and accessibility fix checks
    - Run `npx vitest run src/components/ui/__tests__/ResponsiveModal.test.jsx src/components/nurses/__tests__/NurseCreateModal.test.jsx src/components/nurses/__tests__/NurseCard.test.jsx src/components/nurses/__tests__/NurseDetailWorkflow.test.jsx`.
    - Verify portal/frame/scroll/action structure passes while dialogs remain uniquely named, controls remain in observed DOM/focus order, Tab and Shift+Tab remain trapped, focused controls scroll into view, Escape/Cancel outcomes remain unchanged, and focus returns to the invoker.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 3.5 Re-run the bug-condition property as the fix check
    - **Property 1: Expected Behavior** - Primary Nurse Actions Remain Geometrically Reachable
    - Re-run the same `tests/e2e/journeys/nurse-action-reachability.spec.js` and unchanged oracle from task 1; do not replace it with weaker post-fix assertions.
    - Run `npx playwright test tests/e2e/journeys/nurse-action-reachability.spec.js --project=chromium` and require all fixed-seed generated cases and deterministic viewport boundaries to pass.
    - Confirm resize pairs, validation/failure/conflict growth, expanded sections, 320 px footer wrapping, scroll-to-end, focus visibility, hit testing, exactly-once activation, and create/edit draft retention.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Re-run the preservation property after the fix
    - **Property 2: Preservation** - Non-Layout Nurse Workflow Equivalence
    - Re-run the unchanged fixed-seed component/property tests from task 2; do not write replacement tests.
    - Require controls, DOM/focus order, labels, drafts, validation, enabled/disabled states, callbacks, mutation counts/arguments, permission outcomes, close/focus behavior, and conflict/version outcomes to match the unfixed baseline except for corrected geometry.
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9, 3.11_

- [x] 4. Run nurse, authentication, persistence, and legacy regression suites
  - Run all nurse component/page tests: `npx vitest run src/components/nurses/__tests__ src/pages/__tests__/NurseDatabase.test.jsx`.
  - Run nurse controller, repository, permission, version, retry, and authoritative-state tests: `npx vitest run src/lib/nurses/__tests__`.
  - Run authentication/session-readiness tests: `npx vitest run src/components/layout/__tests__/RequireAuth.test.jsx src/context/__tests__/AuthContext.test.jsx src/pages/__tests__/productionAuthSessionExpiry.integration.test.jsx src/pages/__tests__/supabaseAuthGating.integration.test.jsx src/lib/nurses/__tests__/productionAuthSessionExpiry.property.test.js`.
  - Run Supabase, RLS, and server-confirmed-state tests: `npx vitest run src/context/__tests__/AppContext.supabase.test.jsx src/lib/__tests__/supabaseClient.test.js src/lib/dataLayer/__tests__/supabaseAdapter.test.js src/lib/dataLayer/__tests__/supabaseAdapter.property.test.js src/lib/dataLayer/__tests__/nurseAuthorization.integration.test.js src/lib/dataLayer/__tests__/nurseCrossLayer.integration.test.js src/lib/dataLayer/__tests__/nurseOwnerInvariant.test.js src/lib/dataLayer/__tests__/rlsPolicyCoverage.test.js src/lib/dataLayer/__tests__/sessionToken.property.test.js`.
  - Run legacy mode and storage preservation tests: `npx vitest run src/context/__tests__/AppContext.legacy.test.jsx src/lib/dataLayer/__tests__/legacyPersistence.property.test.js src/lib/dataLayer/__tests__/nurseModeRegression.test.js src/lib/dataLayer/__tests__/storageAdapter.test.js`. Require seven-sample initialization under existing conditions, localStorage persistence, unchanged legacy authentication outcome, and zero Supabase nurse requests.
  - Run deterministic nurse/auth/legacy browser journeys: `npx playwright test tests/e2e/journeys/nurse-management.spec.js tests/e2e/journeys/nurse-pipeline.spec.js tests/e2e/journeys/production-auth-session-expiry.spec.js --project=chromium`. Require Emily after clean sign-in, Loyiso persistence across sign-out/sign-in, unchanged explicit mutations/version/conflicts, and the feature-off localStorage path.
  - Fix only regressions introduced by portal/layout/test changes; do not alter nurse controllers, authentication, authorization, Supabase adapters, RLS behavior, mutation semantics, or legacy storage behavior.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [x] 5. Run the complete quality gate
  - Run the non-watch unit suite with `npm test`.
  - Run static analysis with `npm run lint`.
  - Run the production bundle with `npm run build`.
  - Re-run `npx playwright test tests/e2e/journeys/nurse-action-reachability.spec.js --project=chromium` after any quality-gate fix that touches overlay or nurse files.
  - Require all commands to pass with no skipped bug-condition or preservation checks.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

## Correctness Property Traceability

| Correctness property | Exploration/baseline | Implementation | Final verification | Requirements |
|---|---|---|---|---|
| Property 1: Bug Condition - Primary Nurse Actions Remain Geometrically Reachable | Task 1 | Tasks 3.1-3.3 | Tasks 3.4-3.5, 5 | 1.1, 1.2, 2.1, 2.2, 2.3, 2.4 |
| Property 2: Preservation - Non-Layout Nurse Workflow Equivalence | Task 2 | Tasks 3.1-3.3 | Tasks 3.4, 3.6, 4, 5 | 3.1-3.11 |
