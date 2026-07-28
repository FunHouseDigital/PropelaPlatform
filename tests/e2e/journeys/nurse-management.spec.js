// @ts-check
import { expect, test } from '@playwright/test';

import {
  configureLegacyContext,
  configureSupabaseContext,
  makeNurseRow,
  NurseMockBackend,
} from '../nurseMockBackend.js';

const BUNDLED_SAMPLE_NAMES = [
  'Emily Plaatjies',
  'Sibonisiwe Peaceful Khoza',
  'Nompumelelo Gcobo',
  'Anathi Tanaboti',
  'Webson Madawo',
  'Milton Mutanga',
  'Estelle Jade Gurney',
];

async function openNurse(page, name) {
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.getByRole('dialog', { name })).toBeVisible();
}

async function expectOperationalControls(page, name) {
  await expect(page.getByRole('button', { name: 'Add Nurse' }).first()).toBeVisible();
  await openNurse(page, name);
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete nurse' })).toBeVisible();
  await expect(page.getByLabel('Pipeline stage')).toBeEnabled();
}

test.describe('deterministic nurse management journeys', () => {
  test('flag-on empty state excludes local samples and CRUD survives refresh with version advancement', async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend();
    const localSamples = BUNDLED_SAMPLE_NAMES.map((fullName, index) => ({
      id: `local-sample-${index}`,
      fullName,
    }));
    await configureSupabaseContext(context, { backend, role: 'Admin', localNurses: localSamples });

    await page.goto('/nurses');

    await expect(page.getByRole('heading', { name: 'Nurse Database' })).toBeVisible();
    await expect(page.getByText('No nurses yet')).toBeVisible();
    await expect(page.getByText('0 nurses')).toBeVisible();
    for (const sampleName of BUNDLED_SAMPLE_NAMES) {
      await expect(page.getByText(sampleName, { exact: true })).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'Add Nurse' }).first().click();
    const createDialog = page.getByRole('dialog', { name: 'Add Nurse' });
    await createDialog.getByLabel('Full name').fill('Deterministic Remote Nurse');
    await createDialog.getByLabel('Preferred name').fill('Deterministic');
    await createDialog.getByLabel('Email').fill('remote.nurse@example.test');
    await createDialog.getByRole('button', { name: 'Create nurse' }).click();

    await expect(createDialog).toBeHidden();
    await expect(page.getByText('Deterministic Remote Nurse', { exact: true })).toBeVisible();
    expect(backend.rows.size).toBe(1);

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByText('Deterministic Remote Nurse', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Deterministic Remote Nurse', { exact: true })).toBeVisible();

    await openNurse(page, 'Deterministic Remote Nurse');
    await expect(page.getByText('Base version 1')).toBeVisible();
    await page.getByLabel('Full name').fill('Deterministic Remote Nurse Updated');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(/Base version 2.*Saved/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).last().click();

    await page.reload();
    await expect(
      page.getByText('Deterministic Remote Nurse Updated', { exact: true })
    ).toBeVisible();
    await openNurse(page, 'Deterministic Remote Nurse Updated');
    await page.getByRole('button', { name: 'Record Metadata' }).click();
    await expect(
      page.getByText('Version').locator('..').getByText('2', { exact: true })
    ).toBeVisible();

    const storedLocalNames = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('propela_ops_v2_nurses') || '[]').map(
        (nurse) => nurse.fullName
      )
    );
    expect(storedLocalNames).toEqual(BUNDLED_SAMPLE_NAMES);
  });

  test('two sessions preserve the stale draft and surface save conflict UX', async ({
    browser,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-concurrent', fullName: 'Concurrent Nurse' }),
    ]);
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    try {
      await configureSupabaseContext(contextA, { backend, role: 'Admin' });
      await configureSupabaseContext(contextB, { backend, role: 'Recruiter' });
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      await Promise.all([pageA.goto('/nurses'), pageB.goto('/nurses')]);
      await Promise.all([
        openNurse(pageA, 'Concurrent Nurse'),
        openNurse(pageB, 'Concurrent Nurse'),
      ]);
      await expect(pageA.getByText('Base version 1')).toBeVisible();
      await expect(pageB.getByText('Base version 1')).toBeVisible();

      await pageA.getByLabel('Preferred name').fill('Saved by session A');
      await pageA.getByRole('button', { name: 'Save changes' }).click();
      await expect(pageA.getByText(/Base version 2.*Saved/)).toBeVisible();

      await pageB.getByLabel('Full name').fill('Session B local draft');
      await pageB.getByRole('button', { name: 'Save changes' }).click();
      await expect(pageB.getByText('This nurse changed after you opened it')).toBeVisible();
      await expect(pageB.getByLabel('Full name')).toHaveValue('Session B local draft');
      await expect(pageB.getByRole('button', { name: 'Apply my edits to latest' })).toBeVisible();
      await expect(pageB.getByRole('button', { name: 'Discard my edits' })).toBeVisible();
      expect(backend.get('nurse-concurrent')?.full_name).toBe('Concurrent Nurse');
      expect(backend.get('nurse-concurrent')?.preferred_name).toBe('Saved by session A');
      expect(backend.get('nurse-concurrent')?.version).toBe(2);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });

  test('stale and already-deleted delete outcomes require safe convergence', async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-delete', fullName: 'Delete Outcome Nurse' }),
    ]);
    await configureSupabaseContext(context, { backend, role: 'Superadmin' });

    await page.goto('/nurses');
    await openNurse(page, 'Delete Outcome Nurse');
    await expect(page.getByText('Base version 1')).toBeVisible();

    backend.updateExternally('nurse-delete', { attributes: { city: 'Updated elsewhere' } });
    await page.getByRole('button', { name: 'Delete nurse' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete nurse' }).click();

    const conflictDialog = page.getByRole('alertdialog');
    await expect(conflictDialog).toContainText('changed after these details were loaded');
    await expect(conflictDialog.getByRole('button', { name: 'Reload Details' })).toBeVisible();
    await expect(conflictDialog.getByRole('button', { name: 'Delete nurse' })).toHaveCount(0);
    await conflictDialog.getByRole('button', { name: 'Reload Details' }).click();
    await expect(page.getByText('Base version 2')).toBeVisible();

    backend.deleteExternally('nurse-delete');
    await page.getByRole('button', { name: 'Delete nurse' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete nurse' }).click();

    await expect(page.getByText('This nurse was already deleted.')).toBeVisible();
    await expect(page.getByText('Delete Outcome Nurse', { exact: true })).toHaveCount(0);
    expect(backend.rows.size).toBe(0);
  });

  for (const role of ['Admin', 'Superadmin', 'Recruiter']) {
    test(`${role} sees the current nurse operational control matrix`, async ({ context, page }) => {
      const name = `${role} Matrix Nurse`;
      const backend = new NurseMockBackend([
        makeNurseRow({ id: `nurse-${role.toLowerCase()}`, fullName: name }),
      ]);
      await configureSupabaseContext(context, { backend, role });

      await page.goto('/nurses');
      await expectOperationalControls(page, name);
    });
  }

  test('a signed-in user with no profile is denied the nurse UI and cannot mutate', async ({
    context,
    page,
  }) => {
    const backend = new NurseMockBackend([
      makeNurseRow({ id: 'nurse-no-profile', fullName: 'Hidden Nurse' }),
    ]);
    await configureSupabaseContext(context, { backend, role: null });

    await page.goto('/nurses');

    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Nurse' })).toHaveCount(0);
    await expect(page.getByText('Hidden Nurse', { exact: true })).toHaveCount(0);
    expect(backend.writes()).toHaveLength(0);
  });

  test('flag-off bundled initialization and localStorage edits survive refresh', async ({
    context,
    page,
  }) => {
    await configureLegacyContext(context, 'Admin');

    await page.goto('/nurses');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const nurses = JSON.parse(localStorage.getItem('propela_ops_v2_nurses') || '[]');
          return nurses.length;
        })
      )
      .toBe(7);

    await page.reload();
    await expect(page.getByText('7 nurses')).toBeVisible();
    for (const sampleName of BUNDLED_SAMPLE_NAMES) {
      await expect(page.getByText(sampleName, { exact: true })).toBeVisible();
    }

    await openNurse(page, 'Emily Plaatjies');
    await page.getByLabel('Full name').fill('Emily Plaatjies Local Edit');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText(/Base version 2.*Saved/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).last().click();

    await page.reload();
    await expect(page.getByText('Emily Plaatjies Local Edit', { exact: true })).toBeVisible();
    await expect(page.getByText('Emily Plaatjies', { exact: true })).toHaveCount(0);
    const persisted = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('propela_ops_v2_nurses') || '[]').find(
        (nurse) => nurse.id === 'nurse-001'
      )
    );
    expect(persisted.fullName).toBe('Emily Plaatjies Local Edit');
    expect(persisted.version).toBe(2);
  });
});
