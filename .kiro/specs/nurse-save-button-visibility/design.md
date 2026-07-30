# Nurse Save Button Visibility Bugfix Design

## Overview

The nurse create and edit overlays are rendered below a permanently transformed `PageTransition` ancestor, so their `position: fixed` boxes are not reliably anchored to the browser viewport. Each overlay then has a second, local sizing defect: `ResponsiveModal` estimates the create body height with a hard-coded header subtraction, while `NurseCard` lets dynamically growing conflict/error content compete with its scroll body and uses a non-wrapping action row that is wider than a 320 px viewport.

The correction will be limited to overlay placement and layout. Both nurse overlays will escape transformed page ancestors through a shared body portal and use the same three-region invariant: a viewport-bounded flex-column frame, a `min-height: 0` scrolling content region, and a non-shrinking action region. The create and edit DOM/control order, controlled drafts, focus behavior, action labels and callbacks, permissions, authentication/RLS behavior, server-confirmed CRUD/version semantics, and feature-off localStorage behavior remain unchanged.

## Glossary

- **Bug_Condition (C)**: A nurse create or edit interface is open at 100% zoom in a viewport at least 320×568 CSS pixels, and its rendered content is taller than the interface's available block size.
- **Property (P)**: The active interface remains bounded by the visual viewport and its complete primary action is visible and unobscured either continuously in a stable action region or after an ordinary scroll; an enabled action remains focusable and activatable.
- **Preservation**: For inputs outside the bug condition, and for all non-layout workflow behavior, the fixed implementation produces the same observable UI, callback, state, authorization, and persistence outcomes as the original implementation.
- **Overlay_Root**: The fixed-position backdrop and dialog host. It must be portaled to `document.body` so `PageTransition` cannot become its fixed-position containing block.
- **Viewport_Frame**: The white dialog container whose block size is capped by the visual viewport (`100dvh`, with a `100vh` fallback) minus intentional outer gutters.
- **Scroll_Region**: The sole vertically scrolling middle region, with `min-block-size: 0`, `flex: 1 1 auto`, and `overflow-y: auto`.
- **Action_Region**: The non-shrinking bottom region containing `Create nurse` or `Save changes` and their existing sibling actions.
- **Reachable**: The complete action rectangle lies inside the viewport and dialog bounds, is not covered at representative interior hit-test points, and, when enabled, can receive focus and activation without changing browser zoom.
- **`PageTransition`**: `src/components/ui/PageTransition.jsx`; its `animate-page-enter` class retains `transform: translateY(0)` because the animation uses `forwards`, thereby establishing a containing block for descendant fixed-position overlays.
- **`ResponsiveModal`**: `src/components/ui/ResponsiveModal.jsx`; the shared modal used by `NurseCreateModal`, confirmation dialogs, and delete dialogs.
- **`NurseCreateModal`**: `src/components/nurses/NurseCreateModal.jsx`; the controlled create form and `Create nurse` action.
- **`NurseCard`**: `src/components/nurses/NurseCard.jsx`; the custom nurse detail/edit dialog and `Save changes` action.

## Bug Details

### Bug Condition

The bug is input-defined rather than failure-defined so the same condition can be evaluated before and after the correction. It applies when either nurse form must accommodate more vertical content than its viewport-bounded frame can show at once, including after resize or dynamic validation, error, or conflict expansion.

**Formal Specification:**

```text
FUNCTION isBugCondition(input)
  INPUT: input of type NurseOverlayLayoutInput
  OUTPUT: boolean

  supportedViewport := input.viewportWidthCssPx >= 320
                       AND input.viewportHeightCssPx >= 568
  supportedOverlay := input.interfaceType IN [CREATE_NURSE, EDIT_NURSE]
  normalZoom := input.browserZoomPercent = 100
  contentOverflows := input.renderedContentBlockSize > input.availableFrameBlockSize

  RETURN input.interfaceOpen
         AND supportedViewport
         AND supportedOverlay
         AND normalZoom
         AND contentOverflows
END FUNCTION
```

### Confirmed Layout Chain

```text
Layout
  └─ PageTransition (.animate-page-enter; retained transform)
      └─ NurseDatabase
          ├─ NurseCreateModal
          │   └─ ResponsiveModal fixed Overlay_Root
          └─ NurseCard fixed Overlay_Root
```

Because neither overlay is portaled, the transformed `PageTransition` is the fixed-position containing block. The overlays therefore inherit page-box placement instead of being isolated from page height and scroll position.

Within that chain:

1. `ResponsiveModal` mobile mode uses a fixed `h-full` frame but a non-flex body with `maxHeight: calc(100vh - 65px)`. Its header is at least about 77 px high (44 px minimum close target, 32 px vertical padding, and border), so the body can extend beyond a 568 px frame even before dynamic browser viewport changes are considered. Desktop mode separately uses an arbitrary `70vh` body cap rather than sizing header and body as one bounded frame.
2. `NurseCard` uses `max-h-[calc(100vh-3rem)]` but does not clip the frame and does not explicitly give the scrolling flex child `min-h-0`. Save conflicts and save errors are siblings outside the current `.flex-1.overflow-y-auto` region. Expanded conflict tables and error controls can therefore consume or overflow the frame instead of participating in its scroll range.
3. The `NurseCard` action row and both child groups are non-wrapping. At 320 px viewport width, the outer horizontal gutters leave a 288 px dialog and roughly 256 px inside the footer; Delete/metadata plus Cancel/Save have a combined minimum width well above that. `Save changes` can consequently overflow the right viewport edge even if the vertical frame is otherwise correct.
4. Both implementations use `100vh`, which can exceed the current visual viewport when mobile browser chrome changes. The layout has no dynamic-viewport fallback pair.

### Examples

- **Create, 320×568:** The create modal is opened at 100% zoom. The transformed page wrapper becomes the fixed containing block, and the mobile body subtracts 65 px although the rendered header is taller. Scrolling the body to its maximum can leave part of `Create nurse` below the visual viewport. Expected: the body alone scrolls and the complete action remains in the bounded action region.
- **Edit, 320×568:** A nurse is changed so `Save changes` is enabled. The footer's non-wrapping groups exceed the available inline size and can push the primary action beyond the right edge. Expected: groups wrap/stack at widths below 768 px without reordering controls, and the complete action remains visible.
- **Edit conflict expansion:** A stale save displays the conflict alert, then `Review differences` expands its table. The conflict panel is outside the current scroll region and competes with the header/body/footer height. Expected: conflict and error content is the first content in the same scrolling middle region, while the action region remains stable.
- **Resize, 1280×720 to 320×568:** Entered create or edit values remain in the controlled draft, but the overlay's current viewport assumptions are recalculated inconsistently. Expected: no unmount or draft reset occurs; the frame recomputes against the new visual viewport and the action remains reachable.
- **Non-overflow desktop case:** A short confirmation dialog at 1280×720 already fits. Expected: heading, message, buttons, order, focus behavior, and close semantics remain unchanged.

## Expected Behavior

### Expected-Behavior Predicate

```text
FUNCTION expectedBehavior(result)
  INPUT: result of type NurseOverlayLayoutResult
  OUTPUT: boolean

  frameBounded := result.frameRect.top >= 0
                  AND result.frameRect.left >= 0
                  AND result.frameRect.bottom <= result.visualViewportHeight
                  AND result.frameRect.right <= result.visualViewportWidth

  actionComplete := result.actionCount = 1
                    AND result.actionRect.width > 0
                    AND result.actionRect.height > 0
                    AND result.actionRect fully inside result.frameRect
                    AND result.actionRect fully inside result.visualViewportRect

  actionExposed := all sampled interior points of result.actionRect
                   hit result.action or one of its descendants

  ordinaryPath := result.actionInitiallyVisible
                  OR result.actionVisibleAfterOrdinaryScrollToEnd

  enabledBehavior := IF result.actionEnabled
                     THEN result.actionFocusable
                          AND result.actionVisibleWhenFocused
                          AND result.activationInvokesExistingCommandExactlyOnce
                     ELSE result.activationInvokesNoCommand

  RETURN frameBounded
         AND actionComplete
         AND actionExposed
         AND ordinaryPath
         AND enabledBehavior
         AND result.draftValuesUnchangedByLayout
END FUNCTION
```

### Preservation Requirements

**Unchanged Behaviors:**

- Keep each existing heading, notice, form field, conflict control, secondary action, and primary action exactly once and in the same relative DOM and keyboard order.
- Keep `Create nurse` inside the same form submission path and keep `Save changes` connected to the same `onSave` callback; do not change labels, validation, disabled-state expressions, duplicate-request guards, retry eligibility, cancel/discard outcomes, or successful-close behavior.
- Keep create/edit drafts controlled by the existing controller and preserve values through resize, validation rejection, request failure, and conflict handling.
- Keep modal roles, accessible names, focus trap/restoration behavior already supplied by `ResponsiveModal`, first-invalid-field focus, visible focus indication, Escape handling, and nested confirmation/delete dialog containment.
- Keep the current mobile breakpoint below 768 CSS pixels and desktop layout at or above 768 CSS pixels. Responsive footer wrapping may consume additional rows below 768 px, but control order must not change.
- Keep authentication readiness, active-session use, UI permissions, RLS enforcement, server-confirmed CRUD/version/conflict behavior, and feature-off localStorage routing entirely outside this change.

**Scope:**

All inputs that do not satisfy the overflow condition must remain behaviorally unchanged. In particular, the correction must not alter:

- Data normalization, derived scores/statuses, mutation payloads, record identifiers, owner metadata, Base_Version, or accepted server results.
- Permission decisions that make primary actions absent or disabled.
- Mouse, touch, keyboard, Cancel, Escape, retry, conflict-resolution, delete, and close commands.
- The Supabase feature-on path, RLS outcomes, or the legacy feature-off sample/localStorage path.

## Hypothesized Root Cause

Static inspection confirms the following high-confidence causes; exploratory browser tests must reproduce them on the unfixed revision before implementation and re-hypothesize if their counterexamples disagree.

1. **Transformed fixed-position containing block**: `PageTransition` retains a transform after its entry animation, and both nurse overlays render below it without a portal.
   - `position: fixed; inset: 0` is consequently relative to the transformed page wrapper rather than reliably to the viewport.
   - Body scroll locking in `ResponsiveModal` can make content positioned outside the visible portion of that containing block impossible to recover through page scrolling.

2. **Create frame uses an incorrect fixed subtraction**: `ResponsiveModal` assumes a 65 px mobile header while its minimum close target and padding make the actual header taller.
   - The shell is not a flex-column clipping boundary.
   - The desktop `70vh` body cap and mobile `calc(100vh - 65px)` are independent guesses rather than a single frame calculation.

3. **Edit dynamic content is outside the scroll owner**: `ConflictPanel` and the save-error notice sit between the fixed header and current scroll body as separate flex children.
   - Expanded differences and failure controls do not increase the scroll region's `scrollHeight`.
   - The frame lacks `overflow: hidden`, and the scroll body lacks an explicit `min-height: 0` contract, allowing child overflow to escape or displace the footer.

4. **Edit action row exceeds narrow inline space**: the footer and its left/right groups do not wrap or stack.
   - At 320 px, the available footer width cannot contain all current controls on one line.
   - This is an inline-overflow defect in addition to the vertical scroll defect.

5. **Layout viewport units are used where visual viewport units are required**: `100vh` does not follow dynamic mobile browser chrome in all supported browsers.
   - A `100vh` fallback followed by `100dvh` is needed so supported modern browsers use the visual viewport while older browsers retain bounded behavior.

## Correctness Properties

Property 1: Bug Condition - Primary Nurse Actions Remain Geometrically Reachable

_For any_ open create or edit interface at 100% zoom with viewport width at least 320 CSS pixels and height at least 568 CSS pixels, and for any content state whose rendered block size exceeds the available frame height—including supported resize pairs and validation, failure, conflict-review, or section expansion—the fixed interface SHALL satisfy `expectedBehavior`: its frame is contained by the visual viewport; its sole applicable primary action has a positive, complete rectangle inside both frame and viewport; representative interior points are not covered; the action is either continuously visible in the stable action region or becomes visible through an ordinary finite scroll; and an enabled focused action is visible and invokes the pre-existing command exactly once.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Layout Nurse Workflow Equivalence

_For any_ input where the bug condition does not hold, and for any create/edit interaction whose outcome is not determined by overlay geometry, the fixed implementation SHALL produce the same result as the original implementation: the same controls in the same relative DOM/focus order; the same controlled draft values, validation, action state, callbacks, request count, payloads, permission decisions, focus/close outcomes, server-confirmed records and versions, RLS denial behavior, and feature-off localStorage behavior. For overflowing inputs, these semantics SHALL also remain equal except that the primary action is now reachable.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

## Fix Implementation

### Changes Required

Assuming exploratory tests confirm the analysis, implement only the following layout changes.

**Shared overlay placement and sizing**

**Files**: `src/components/ui/ResponsiveModal.jsx`, a small shared body-portal helper under `src/components/ui/`, and the existing shared stylesheet only if fallback declarations cannot be expressed without conflicting utilities.

1. **Escape transformed page ancestors**
   - Render modal overlay roots into `document.body` with one shared portal helper.
   - Use the helper for `ResponsiveModal` and the complete `NurseCard` overlay, including loading/error states; React context and event propagation remain intact.
   - Do not change z-index, role, accessible naming, close callbacks, or focus effects.

2. **Adopt one bounded-frame contract**
   - Make each white dialog frame a flex column with `min-block-size: 0` and `overflow: hidden`.
   - Cap frame block size with `calc(100vh - gutter)` as fallback, followed by `calc(100dvh - gutter)` for the visual viewport.
   - Use zero block gutter for the full-screen mobile `ResponsiveModal`, the existing desktop modal gutter, and the existing 3 rem `NurseCard` vertical gutter.
   - Remove `ResponsiveModal`'s inline `70vh` and `calc(100vh - 65px)` body estimates.

3. **Expose explicit body modes without changing existing consumers**
   - Keep the default `ResponsiveModal` body as `min-h-0 flex-1 overflow-y-auto p-4` so confirmation/delete dialogs retain their existing DOM and behavior.
   - Add a narrowly scoped contained-body mode for complex forms; this mode supplies `min-h-0 flex-1 overflow-hidden` and delegates scrolling to the child's named scroll region. Avoid ambiguous conflicting utility overrides.

**Create form**

**File**: `src/components/nurses/NurseCreateModal.jsx`

4. **Create a stable action region inside the existing form**
   - Keep the existing `<form>`, `handleSubmit`, `formRef`, fields, and button order.
   - In contained-body mode, make the form a full-height `min-h-0` flex column.
   - Wrap the introduction, error notice, and fieldset in one `min-h-0 flex-1 overflow-y-auto` region with the existing padding.
   - Keep Retry, Retry with a new ID, Cancel, and `Create nurse` as the final form children, but make their existing action wrapper non-shrinking with an opaque background and border. Its current `flex-wrap` behavior already supports narrow widths.
   - First-invalid-field focus will naturally scroll the new region; do not add imperative scroll or state reset logic.

**Edit panel**

**File**: `src/components/nurses/NurseCard.jsx`

5. **Put every growing edit element in one scroll region**
   - Preserve the header as the first non-shrinking region and footer as the last non-shrinking region.
   - Place `ConflictPanel`, the save-error notice, and all accordion `Section` elements—still in that order—inside one `min-h-0 flex-1 overflow-y-auto` middle region.
   - Add `overflow-hidden` to the frame so no child can paint beyond its rounded viewport boundary.

6. **Contain the 320 px footer without reordering controls**
   - Below 768 px, stack/wrap the existing left metadata/delete group before the existing Cancel/Save group and let the action group use the available width; at 768 px and above, retain the current single-row arrangement.
   - Keep `Cancel` before `Save changes`, keep Delete/Base version before both, and do not alter any disabled expression or callback.
   - Add only the `min-w-0`/wrapping constraints needed to prevent the header and footer's intrinsic content from widening the dialog.

**Tests only**

**Files**: `src/components/ui/__tests__/ResponsiveModal.test.jsx`, `src/components/nurses/__tests__/NurseCreateModal.test.jsx`, `src/components/nurses/__tests__/NurseCard.test.jsx`, and a focused Playwright spec under `tests/e2e/journeys/`.

7. **Add layout-contract and semantic-preservation coverage**
   - Component tests verify portal placement, retained roles/order/callbacks, contained-body structure, unchanged disabled states, and dynamic-content ancestry under the single scroll region.
   - Playwright tests provide actual browser geometry, scrolling, resize, focus, and hit-testing coverage.
   - Do not alter application data/controller code or production network/storage behavior.

## Testing Strategy

### Validation Approach

Use two phases. First run focused geometry tests against the unfixed revision to capture the create and edit counterexamples and confirm which root causes manifest in Chromium. Then implement the layout-only correction and run the same tests as fix checks, followed by existing nurse component, workflow, deterministic Supabase, and feature-off journeys as preservation checks.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples on unfixed code and confirm the portal, height-chain, dynamic-content, and narrow-footer analysis.

**Test Plan**: Add the geometry helper and focused tests first. Record the frame/action rectangles, fixed containing-block evidence, discovered scroll ancestors, maximum scroll offsets, and hit-test results. A failure where the action rectangle crosses the viewport, remains outside after maximum scroll, or is hit-tested as another element is a valid counterexample.

**Test Cases**:

1. **Create at minimum viewport**: Open `Add Nurse` at 320×568, prove form overflow, scroll to the end, and measure `Create nurse` (expected to fail on unfixed code).
2. **Create after resize and validation growth**: Fill controlled values at 1280×720, resize to 320×568, trigger deterministic validation content, assert values, then measure reachability (may fail on unfixed code).
3. **Edit at minimum viewport**: Open a seeded nurse at 320×568, make the draft dirty, expand all sections, and measure `Save changes` in both axes (expected to expose footer overflow on unfixed code).
4. **Edit conflict growth**: Use the existing two-session mock backend to create a stale version, expand `Review differences`, and measure the disabled conflict-state action and the scroll range (expected to expose dynamic-content overflow on unfixed code).

**Expected Counterexamples**:

- `PageTransition` is the containing block observed above an unportaled fixed overlay.
- The create frame/body bottom exceeds `window.innerHeight` because the body subtraction is smaller than the real header.
- The edit action's `right` exceeds `window.innerWidth` at 320 px.
- Expanded conflict/error content is not included in the element that owns vertical scroll, or the footer/action leaves the frame.

### Fix Checking

**Goal**: Verify Property 1 for all selected supported viewports and dynamic states.

**Pseudocode:**

```text
FOR ALL input WHERE isBugCondition(input) DO
  result := renderFixedNurseOverlay(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Executable DOM geometry/scroll oracle:**

```js
async function expectActionReachable(page, dialog, action) {
  const before = await action.evaluate((button) => {
    const dialogElement = button.closest('[role="dialog"], [role="alertdialog"]');
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const isScrollable = (element) => {
      const style = getComputedStyle(element);
      return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    };
    const scrollables = [];
    for (let node = button.parentElement; node && dialogElement?.contains(node); node = node.parentElement) {
      if (isScrollable(node)) scrollables.push(node);
    }
    return {
      action: rect(button),
      dialog: rect(dialogElement),
      scrollableAncestors: scrollables.length,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });

  await dialog.evaluate((element) => {
    for (const node of element.querySelectorAll('*')) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
        node.scrollTop = node.scrollHeight - node.clientHeight;
      }
    }
  });
  if (await action.isEnabled()) await action.focus();

  const after = await action.evaluate((button) => {
    const dialogElement = button.closest('[role="dialog"], [role="alertdialog"]');
    const actionRect = button.getBoundingClientRect();
    const dialogRect = dialogElement.getBoundingClientRect();
    const epsilon = 0.5;
    const points = [
      [actionRect.left + 2, actionRect.top + 2],
      [actionRect.right - 2, actionRect.top + 2],
      [actionRect.left + 2, actionRect.bottom - 2],
      [actionRect.right - 2, actionRect.bottom - 2],
      [actionRect.left + actionRect.width / 2, actionRect.top + actionRect.height / 2],
    ];
    const exposed = points.every(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit === button || button.contains(hit);
    });
    return {
      frameBounded:
        dialogRect.top >= -epsilon &&
        dialogRect.left >= -epsilon &&
        dialogRect.right <= innerWidth + epsilon &&
        dialogRect.bottom <= innerHeight + epsilon,
      actionComplete:
        actionRect.width > 0 &&
        actionRect.height > 0 &&
        actionRect.top >= Math.max(0, dialogRect.top) - epsilon &&
        actionRect.left >= Math.max(0, dialogRect.left) - epsilon &&
        actionRect.right <= Math.min(innerWidth, dialogRect.right) + epsilon &&
        actionRect.bottom <= Math.min(innerHeight, dialogRect.bottom) + epsilon,
      exposed,
      focusedWhenEnabled: button.disabled || document.activeElement === button,
    };
  });

  expect(before.action.width).toBeGreaterThan(0);
  expect(before.action.height).toBeGreaterThan(0);
  expect(after).toEqual({
    frameBounded: true,
    actionComplete: true,
    exposed: true,
    focusedWhenEnabled: true,
  });
}
```

The final implementation may expose semantic `data-*` markers for the frame, scroll region, and action region if computed-style discovery proves ambiguous; such markers must not alter DOM order or accessibility.

### Deterministic Playwright Viewport Tests

Add a focused spec, for example `tests/e2e/journeys/nurse-action-reachability.spec.js`, using the existing `configureLegacyContext`, `configureSupabaseContext`, `NurseMockBackend`, and `makeNurseRow` fixtures.

```js
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 767, height: 568 },
  { width: 768, height: 568 },
  { width: 1280, height: 720 },
];

for (const viewport of VIEWPORTS) {
  test(`create action is reachable at ${viewport.width}x${viewport.height}`, async ({ context, page }) => {
    await configureLegacyContext(context, 'Admin');
    await page.setViewportSize(viewport);
    await page.goto('/nurses');
    await page.getByRole('button', { name: 'Add Nurse' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Add Nurse' });
    await dialog.getByLabel('Full name').fill('Viewport Draft');
    await expectActionReachable(page, dialog, dialog.getByRole('button', { name: 'Create nurse' }));
  });
}

test('create resize and validation growth preserve draft and reachability', async ({ context, page }) => {
  await configureLegacyContext(context, 'Admin');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/nurses');
  await page.getByRole('button', { name: 'Add Nurse' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Nurse' });
  await dialog.getByLabel('Preferred name').fill('Draft survives resize');
  await page.setViewportSize({ width: 320, height: 568 });
  await dialog.getByRole('button', { name: 'Create nurse' }).click();
  await expect(dialog.getByText('Full name is required.')).toBeVisible();
  await expect(dialog.getByLabel('Preferred name')).toHaveValue('Draft survives resize');
  await expectActionReachable(page, dialog, dialog.getByRole('button', { name: 'Create nurse' }));
});

test('edit action remains reachable with expanded content at 320x568', async ({ context, page }) => {
  await configureLegacyContext(context, 'Admin');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/nurses');
  await page.getByText('Emily Plaatjies', { exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Emily Plaatjies' });
  await page.getByLabel('Full name').fill('Emily Plaatjies edited');
  for (const toggle of await dialog.getByRole('button', { expanded: false }).all()) {
    await toggle.click();
  }
  await expectActionReachable(page, dialog, dialog.getByRole('button', { name: 'Save changes' }));
});
```

Add a fourth deterministic test by adapting the existing two-session conflict journey: set both pages to 320×568, save session A, submit the stale draft in session B, expand `Review differences`, assert `Save changes` is fully visible but disabled, choose `Keep editing`, then assert the enabled action remains reachable. The mock backend fixes all data and versions, so no production service or timing-dependent fixture is required.

Run Playwright as a single test execution (not watch mode):

```bash
npx playwright test tests/e2e/journeys/nurse-action-reachability.spec.js --project=chromium
```

### Preservation Checking

**Goal**: Verify Property 2: layout changes do not alter outputs for non-bug inputs or workflow semantics for any input.

**Pseudocode:**

```text
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT observableWorkflowTrace(originalImplementation, input)
         = observableWorkflowTrace(fixedImplementation, input)
END FOR

FOR ALL input WHERE isBugCondition(input) DO
  ASSERT nonLayoutWorkflowTrace(originalImplementation, input)
         = nonLayoutWorkflowTrace(fixedImplementation, input)
END FOR
```

**Testing Approach**: Preserve existing component/controller tests as the semantic oracle. Compare ordered controls, draft values, callback counts/arguments, disabled states, request logs, accepted records, and versions. Do not use screenshots alone for reachability; rectangles, scroll extents, focus, and hit testing are the executable oracle.

**Test Cases**:

1. **DOM and focus order**: Capture enabled control accessible names before and after the correction; assert equal order and exactly one primary action. Tab/Shift+Tab through create and edit at 320×568 and verify focused controls are visible.
2. **Create semantics**: Re-run first-invalid focus, duplicate-submit suppression, failure/collision retry, controlled-draft preservation, and committed-close tests.
3. **Edit semantics**: Re-run dirty explicit save, pending disablement, discard confirmation, conflict/rebase, retry, permission, delete, and detail-state tests.
4. **Server-backed preservation**: Re-run deterministic nurse management journeys to preserve active-session, RLS, server-confirmed CRUD/version, and conflict behavior.
5. **Feature-off preservation**: Re-run the legacy journey and assert seven-sample initialization, localStorage persistence, and zero Supabase nurse requests.

### Unit Tests

- `ResponsiveModal`: overlay is a child of `document.body`; dialog remains named; default body is the sole scroll region; contained mode is bounded; close, Escape, initial focus, focus trap, and focus restoration remain unchanged.
- `NurseCreateModal`: fields and actions retain order; action wrapper is outside the create scroll region but inside the same form; submit, Cancel, retry, validation focus, draft preservation, and disabled states are unchanged.
- `NurseCard`: conflict/error/sections share one scroll region; header/footer are non-shrinking; footer uses mobile wrapping and desktop row classes; callbacks and disabled expressions are unchanged.

### Property-Based Tests

- With `fast-check`, generate viewport widths in `[320, 1600]`, heights in `[568, 1200]`, overlay type, and dynamic-content state; render browser cases from a fixed seed and apply the geometry oracle. Keep the seed and failing counterexample in test output.
- Generate supported before/after viewport pairs, fill a deterministic create/edit draft, resize, and assert every controlled value plus action reachability.
- Generate permission, pending, failure, and conflict states and assert that the layout never changes the primary action's absent/enabled/disabled result or invokes a mutation merely because the action becomes visible.

### Integration Tests

- Full create flow at 320×568: scroll form content, keyboard-focus the stable action, create once, and verify the committed record.
- Full edit flow at 320×568: expand sections, retain a dirty draft through resize, save once, and verify the server-returned greater version.
- Two-session conflict at 320×568: expand the differences table, preserve the stale draft and disabled action, keep editing/rebase through existing controls, and verify no automatic retry.
- Existing feature-on and feature-off nurse journeys to ensure portal/layout changes do not affect auth, RLS, CRUD, versioning, localStorage, or request routing.
