// @ts-check
import { expect, test } from '@playwright/test';
import fc from 'fast-check';

import {
  configureLegacyContext,
  configureSupabaseContext,
  makeNurseRow,
  NurseMockBackend,
} from '../nurseMockBackend.js';

const PROPERTY_SEED = 20260624;
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 767, height: 568 },
  { width: 768, height: 568 },
  { width: 1280, height: 720 },
];

const LAYOUT_DIMENSIONS_ARBITRARY = fc.record({
  width: fc.integer({ min: 320, max: 1600 }),
  height: fc.integer({ min: 568, max: 1200 }),
  dynamicContent: fc.constantFrom('expanded-sections', 'validation-growth'),
});

function rect(value) {
  return {
    top: value.top,
    right: value.right,
    bottom: value.bottom,
    left: value.left,
    width: value.width,
    height: value.height,
  };
}

async function collectGeometry(action) {
  return action.evaluate((button) => {
    const dialog = button.closest('[role="dialog"], [role="alertdialog"]');
    if (!dialog) throw new Error('Primary action has no dialog ancestor');
    const toRect = (value) => ({
      top: value.top,
      right: value.right,
      bottom: value.bottom,
      left: value.left,
      width: value.width,
      height: value.height,
    });
    const scrollOwners = [];
    for (const element of dialog.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
        scrollOwners.push({
          tag: element.tagName,
          className: element.className,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
          scrollTop: element.scrollTop,
          maxScrollTop: element.scrollHeight - element.clientHeight,
        });
      }
    }
    const transformedAncestors = [];
    for (let node = dialog.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.transform !== 'none') {
        transformedAncestors.push({
          tag: node.tagName,
          className: node.className,
          transform: style.transform,
        });
      }
    }
    return {
      action: toRect(button.getBoundingClientRect()),
      dialog: toRect(dialog.getBoundingClientRect()),
      viewport: { width: innerWidth, height: innerHeight },
      visualViewport: {
        width: window.visualViewport?.width ?? innerWidth,
        height: window.visualViewport?.height ?? innerHeight,
      },
      scrollOwners,
      transformedAncestors,
    };
  });
}

async function expectActionReachable(dialog, action, { expectedDraft } = {}) {
  await expect(action).toHaveCount(1);
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined))
    );
  });
  const before = await collectGeometry(action);

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
    if (!dialogElement) throw new Error('Primary action has no dialog ancestor');
    const actionRect = button.getBoundingClientRect();
    const dialogRect = dialogElement.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width ?? innerWidth;
    const viewportHeight = window.visualViewport?.height ?? innerHeight;
    const epsilon = 0.5;
    const points = [
      [actionRect.left + actionRect.width * 0.25, actionRect.top + actionRect.height * 0.25],
      [actionRect.right - actionRect.width * 0.25, actionRect.top + actionRect.height * 0.25],
      [actionRect.left + actionRect.width * 0.25, actionRect.bottom - actionRect.height * 0.25],
      [actionRect.right - actionRect.width * 0.25, actionRect.bottom - actionRect.height * 0.25],
      [actionRect.left + actionRect.width / 2, actionRect.top + actionRect.height / 2],
    ];
    const hitTests = points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return {
        x,
        y,
        exposed: hit === button || Boolean(hit && button.contains(hit)),
        hit: hit?.tagName ?? null,
        hitText: hit?.textContent?.trim().slice(0, 80) ?? null,
      };
    });
    return {
      action: {
        top: actionRect.top,
        right: actionRect.right,
        bottom: actionRect.bottom,
        left: actionRect.left,
        width: actionRect.width,
        height: actionRect.height,
      },
      dialog: {
        top: dialogRect.top,
        right: dialogRect.right,
        bottom: dialogRect.bottom,
        left: dialogRect.left,
        width: dialogRect.width,
        height: dialogRect.height,
      },
      frameBounded:
        dialogRect.top >= -epsilon &&
        dialogRect.left >= -epsilon &&
        dialogRect.right <= viewportWidth + epsilon &&
        dialogRect.bottom <= viewportHeight + epsilon,
      actionComplete:
        actionRect.width > 0 &&
        actionRect.height > 0 &&
        actionRect.top >= Math.max(0, dialogRect.top) - epsilon &&
        actionRect.left >= Math.max(0, dialogRect.left) - epsilon &&
        actionRect.right <= Math.min(viewportWidth, dialogRect.right) + epsilon &&
        actionRect.bottom <= Math.min(viewportHeight, dialogRect.bottom) + epsilon,
      exposed: hitTests.every(({ exposed }) => exposed),
      hitTests,
      focusedWhenEnabled: button.disabled || document.activeElement === button,
    };
  });

  if (expectedDraft) {
    await expect(dialog.getByLabel(expectedDraft.label)).toHaveValue(expectedDraft.value);
  }

  expect(
    { before, after },
    `Property seed ${PROPERTY_SEED}; geometry counterexample ${JSON.stringify({ before, after }, null, 2)}`
  ).toEqual({
    before: expect.objectContaining({
      action: expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    }),
    after: expect.objectContaining({
      frameBounded: true,
      actionComplete: true,
      exposed: true,
      focusedWhenEnabled: true,
    }),
  });

  expect(before.action.width).toBeGreaterThan(0);
  expect(before.action.height).toBeGreaterThan(0);
  return { before, after };
}

async function expectNoHorizontalOverflow(page, dialog) {
  const geometry = await dialog.evaluate((element) => {
    const scrollRegion = element.querySelector('[data-nurse-card-scroll-region="true"]');
    if (!scrollRegion) throw new Error('Nurse dialog has no scroll region');

    const measure = (node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
      overflow: node.scrollWidth - node.clientWidth,
    });
    const expandedSections = [...scrollRegion.querySelectorAll('button[aria-expanded="true"]')].map(
      (toggle) => ({
        name: toggle.textContent?.trim() ?? '',
        ...measure(toggle.parentElement),
      })
    );
    const rightEdgeOffenders = [...document.body.querySelectorAll('*')]
      .map((node) => {
        const bounds = node.getBoundingClientRect();
        return {
          tag: node.tagName,
          className: typeof node.className === 'string' ? node.className : '',
          text: node.textContent?.trim().slice(0, 80) ?? '',
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        };
      })
      .filter(({ right }) => right > innerWidth + 1)
      .sort((left, right) => right.right - left.right)
      .slice(0, 10);

    return {
      viewportWidth: innerWidth,
      documentElement: measure(document.documentElement),
      body: measure(document.body),
      dialog: measure(element),
      scrollRegion: measure(scrollRegion),
      expandedSections,
      rightEdgeOffenders,
    };
  });

  const epsilon = 1;
  expect(
    geometry,
    `Unexpected horizontal overflow at 320x568: ${JSON.stringify(geometry, null, 2)}`
  ).toEqual(
    expect.objectContaining({
      viewportWidth: 320,
      documentElement: expect.objectContaining({ overflow: expect.any(Number) }),
      body: expect.objectContaining({ overflow: expect.any(Number) }),
      dialog: expect.objectContaining({ overflow: expect.any(Number) }),
      scrollRegion: expect.objectContaining({ overflow: expect.any(Number) }),
    })
  );
  expect(
    geometry.documentElement.scrollWidth,
    `Document overflow diagnostics: ${JSON.stringify(geometry, null, 2)}`
  ).toBeLessThanOrEqual(geometry.documentElement.clientWidth + epsilon);
  expect(geometry.body.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + epsilon);
  expect(geometry.dialog.scrollWidth).toBeLessThanOrEqual(geometry.dialog.clientWidth + epsilon);
  expect(geometry.scrollRegion.scrollWidth).toBeLessThanOrEqual(
    geometry.scrollRegion.clientWidth + epsilon
  );
  expect(geometry.expandedSections.length).toBeGreaterThan(0);
  for (const section of geometry.expandedSections) {
    expect(section.scrollWidth, `${section.name} overflows horizontally`).toBeLessThanOrEqual(
      section.clientWidth + epsilon
    );
  }

  await expect(page.locator('html')).toHaveJSProperty('scrollLeft', 0);
}

async function openCreate(page) {
  await page.goto('/nurses');
  await page.getByRole('button', { name: 'Add Nurse' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Nurse' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openEdit(page, name = 'Emily Plaatjies') {
  await page.goto('/nurses');
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByRole('dialog', { name })).toBeVisible();
  return page.getByRole('dialog').last();
}

async function expandAllSections(dialog) {
  const collapsed = dialog.getByRole('button', { expanded: false });
  while ((await collapsed.count()) > 0) await collapsed.first().click();
}

async function installSubmitCounter(dialog) {
  await dialog.locator('form').evaluate((form) => {
    window.__nurseGeometrySubmitCount = 0;
    form.addEventListener('submit', () => {
      window.__nurseGeometrySubmitCount += 1;
    });
  });
}

async function expectSubmitCount(page, expected) {
  await expect.poll(() => page.evaluate(() => window.__nurseGeometrySubmitCount)).toBe(expected);
}

// **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 2.4**
test.describe('Property 1: nurse primary actions remain geometrically reachable', () => {
  test.setTimeout(120_000);
  for (const viewport of VIEWPORTS) {
    test(`create overflow is reachable at ${viewport.width}x${viewport.height}`, async ({
      context,
      page,
    }) => {
      await configureLegacyContext(context, 'Admin');
      await page.setViewportSize(viewport);
      const dialog = await openCreate(page);
      await dialog.getByLabel('Preferred name').fill(`Draft ${viewport.width}x${viewport.height}`);

      const overflow = await dialog.evaluate((element) =>
        [...element.querySelectorAll('*')].some((node) => node.scrollHeight > node.clientHeight + 1)
      );
      expect(overflow).toBe(true);
      await installSubmitCounter(dialog);
      await expectActionReachable(dialog, dialog.getByRole('button', { name: 'Create nurse' }), {
        expectedDraft: {
          label: 'Preferred name',
          value: `Draft ${viewport.width}x${viewport.height}`,
        },
      });

      if (viewport.width === 320 && viewport.height === 568) {
        const action = dialog.getByRole('button', { name: 'Create nurse' });
        await action.click();
        await expectSubmitCount(page, 1);
        await expect(dialog.getByText('Full name is required.')).toBeVisible();
        await action.focus();
        await page.keyboard.press('Enter');
        await expectSubmitCount(page, 2);
      }
    });
  }

  test('create resize and validation growth preserve the draft and action geometry', async ({
    context,
    page,
  }) => {
    await configureLegacyContext(context, 'Admin');
    await page.setViewportSize({ width: 1280, height: 720 });
    const dialog = await openCreate(page);
    await dialog.getByLabel('Preferred name').fill('Draft survives resize');
    await page.setViewportSize({ width: 320, height: 568 });
    await dialog.getByRole('button', { name: 'Create nurse' }).click();
    await expect(dialog.getByText('Full name is required.')).toBeVisible();
    await expectActionReachable(dialog, dialog.getByRole('button', { name: 'Create nurse' }), {
      expectedDraft: { label: 'Preferred name', value: 'Draft survives resize' },
    });
  });

  test('touch activation invokes the create command exactly once at 320x568', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      hasTouch: true,
    });
    try {
      await configureLegacyContext(context, 'Admin');
      const page = await context.newPage();
      const dialog = await openCreate(page);
      await dialog.getByLabel('Preferred name').fill('Touch draft');
      await installSubmitCounter(dialog);
      const action = dialog.getByRole('button', { name: 'Create nurse' });
      await expectActionReachable(dialog, action, {
        expectedDraft: { label: 'Preferred name', value: 'Touch draft' },
      });
      await action.tap();
      await expectSubmitCount(page, 1);
      await expect(dialog.getByText('Full name is required.')).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('edit action is reachable with every section expanded at 320x568', async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-geometry-edit', fullName: 'Emily Plaatjies' }),
    ]);
    await configureSupabaseContext(context, { backend, role: 'Admin' });
    await page.setViewportSize({ width: 320, height: 568 });
    const dialog = await openEdit(page);
    await dialog.getByLabel('Full name').fill('Emily Plaatjies edited');
    await expandAllSections(dialog);
    await expectNoHorizontalOverflow(page, dialog);
    await expectActionReachable(dialog, dialog.getByRole('button', { name: 'Save changes' }), {
      expectedDraft: { label: 'Full name', value: 'Emily Plaatjies edited' },
    });
    const writesBeforeSave = backend.writes().length;
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog.getByText(/Base version 2.*Saved/)).toBeVisible();
    expect(backend.writes()).toHaveLength(writesBeforeSave + 1);
  });

  for (const width of [767, 768]) {
    test(`edit breakpoint geometry remains reachable at ${width}x568`, async ({
      context,
      page,
    }) => {
      const backend = new NurseMockBackend([
        makeNurseRow({ id: `nurse-edit-${width}`, fullName: `Breakpoint Nurse ${width}` }),
      ]);
      await configureSupabaseContext(context, { backend, role: 'Admin' });
      await page.setViewportSize({ width, height: 568 });
      const dialog = await openEdit(page, `Breakpoint Nurse ${width}`);
      await dialog.getByLabel('Preferred name').fill(`Dirty at ${width}`);
      await expandAllSections(dialog);
      await expectActionReachable(dialog, dialog.getByRole('button', { name: 'Save changes' }), {
        expectedDraft: { label: 'Preferred name', value: `Dirty at ${width}` },
      });
    });
  }

  test(`fixed-seed generated overflowing layouts (seed ${PROPERTY_SEED})`, async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-generated-edit', fullName: 'Emily Plaatjies' }),
    ]);
    await configureSupabaseContext(context, { backend, role: 'Admin' });
    for (const overlay of ['create', 'edit']) {
      await fc.assert(
        fc.asyncProperty(LAYOUT_DIMENSIONS_ARBITRARY, async (generated) => {
          await page.setViewportSize({ width: generated.width, height: generated.height });
          const dialog = overlay === 'create' ? await openCreate(page) : await openEdit(page);
          if (overlay === 'create') {
            await dialog.getByLabel('Preferred name').fill('Generated draft');
            if (generated.dynamicContent === 'validation-growth') {
              await dialog.getByRole('button', { name: 'Create nurse' }).click();
              await expect(dialog.getByText('Full name is required.')).toBeVisible();
            }
          } else {
            await dialog.getByLabel('Full name').fill('Generated edit draft');
            if (generated.dynamicContent === 'expanded-sections') await expandAllSections(dialog);
          }
          const action = dialog.getByRole('button', {
            name: overlay === 'create' ? 'Create nurse' : 'Save changes',
          });
          await expectActionReachable(dialog, action, {
            expectedDraft: {
              label: overlay === 'create' ? 'Preferred name' : 'Full name',
              value: overlay === 'create' ? 'Generated draft' : 'Generated edit draft',
            },
          });
          await page.keyboard.press('Escape');
          const confirmation = page.getByRole('alertdialog');
          if (await confirmation.isVisible().catch(() => false)) {
            const discard = confirmation.getByRole('button', {
              name: /Discard and close|Confirm discard/,
            });
            if (await discard.count()) await discard.click();
          }
        }),
        { seed: PROPERTY_SEED, numRuns: 2, verbose: true }
      );
    }
  });

  test('recoverable save failure and Retry growth stay inside the edit scroll region', async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-geometry-failure', fullName: 'Geometry Failure Nurse' }),
    ]);
    const normalHandle = backend.handle.bind(backend);
    let failedPatch = false;
    backend.handle = async (route, role) => {
      const request = route.request();
      if (
        !failedPatch &&
        request.method() === 'PATCH' &&
        new URL(request.url()).pathname === '/rest/v1/nurses'
      ) {
        failedPatch = true;
        await route.fulfill({
          status: 503,
          headers: {
            'access-control-allow-origin': '*',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ code: 'PGRST000', message: 'Temporary geometry test failure.' }),
        });
        return;
      }
      await normalHandle(route, role);
    };

    await configureSupabaseContext(context, { backend, role: 'Admin' });
    await page.setViewportSize({ width: 320, height: 568 });
    const dialog = await openEdit(page, 'Geometry Failure Nurse');
    await dialog.getByLabel('Full name').fill('Preserved failure draft');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    const alert = dialog.getByRole('alert');
    await expect(alert).toContainText('Could not save nurse');
    await expect(dialog.getByRole('button', { name: 'Retry save' })).toBeVisible();
    await expectActionReachable(dialog, dialog.getByRole('button', { name: 'Save changes' }), {
      expectedDraft: { label: 'Full name', value: 'Preserved failure draft' },
    });
    const sameScrollRegion = await dialog.evaluate((element) => {
      const failure = element.querySelector('[role="alert"]');
      const section = [...element.querySelectorAll('button')].find(
        (button) => button.textContent?.trim() === 'Personal Information'
      );
      return Boolean(
        failure?.closest('[data-nurse-card-scroll-region="true"]') &&
        failure.closest('[data-nurse-card-scroll-region="true"]') ===
          section?.closest('[data-nurse-card-scroll-region="true"]')
      );
    });
    expect(sameScrollRegion).toBe(true);
  });

  test('two-session conflict growth shares the edit scroll range and preserves reachability', async ({
    browser,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-geometry-conflict', fullName: 'Geometry Conflict Nurse' }),
    ]);
    const contextA = await browser.newContext({ viewport: { width: 320, height: 568 } });
    const contextB = await browser.newContext({ viewport: { width: 320, height: 568 } });
    try {
      await configureSupabaseContext(contextA, { backend, role: 'Admin' });
      await configureSupabaseContext(contextB, { backend, role: 'Recruiter' });
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();
      const [dialogA, dialogB] = await Promise.all([
        openEdit(pageA, 'Geometry Conflict Nurse'),
        openEdit(pageB, 'Geometry Conflict Nurse'),
      ]);
      await dialogA.getByLabel('Preferred name').fill('Committed by A');
      await dialogA.getByRole('button', { name: 'Save changes' }).click();
      await expect(dialogA.getByText(/Base version 2.*Saved/)).toBeVisible();

      await dialogB.getByLabel('Full name').fill('Preserved stale draft');
      await dialogB.getByRole('button', { name: 'Save changes' }).click();
      await expect(dialogB.getByText('This nurse changed after you opened it')).toBeVisible();
      await dialogB.getByRole('button', { name: 'Review differences' }).click();
      await expect(dialogB.getByRole('columnheader', { name: 'Latest saved' })).toBeVisible();
      await expectActionReachable(dialogB, dialogB.getByRole('button', { name: 'Save changes' }), {
        expectedDraft: { label: 'Full name', value: 'Preserved stale draft' },
      });

      const sharedScrollOwner = await dialogB.evaluate((element) => {
        const alert = element.querySelector('[role="alert"]');
        const sectionButton = [...element.querySelectorAll('button')].find(
          (button) => button.textContent?.trim() === 'Personal Information'
        );
        const scrollOwner = (node) => {
          for (
            let current = node?.parentElement;
            current && current !== element;
            current = current.parentElement
          ) {
            if (/(auto|scroll)/.test(getComputedStyle(current).overflowY)) return current;
          }
          return null;
        };
        return Boolean(
          alert &&
          sectionButton &&
          scrollOwner(alert) &&
          scrollOwner(alert) === scrollOwner(sectionButton)
        );
      });
      expect(sharedScrollOwner).toBe(true);

      await dialogB.getByRole('button', { name: 'Keep editing' }).click();
      await expect(dialogB.getByRole('button', { name: 'Save changes' })).toBeEnabled();
      await expectActionReachable(dialogB, dialogB.getByRole('button', { name: 'Save changes' }), {
        expectedDraft: { label: 'Full name', value: 'Preserved stale draft' },
      });
    } finally {
      await Promise.allSettled([contextA.close(), contextB.close()]);
    }
  });
});
