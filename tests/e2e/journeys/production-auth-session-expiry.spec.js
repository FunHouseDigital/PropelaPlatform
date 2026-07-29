// @ts-check
import { expect, test } from '@playwright/test';

import {
  E2E_SUPABASE_URL,
  E2E_USER_ID,
  makeNurseRow,
  NurseMockBackend,
} from '../nurseMockBackend.js';

const FEATURE_FLAG_KEY = 'propela_feature_flags_override';
const PUBLIC_ANON_KEY = 'e2e-public-anon-key';

function authResponse(suffix) {
  return {
    access_token: `e2e-session-${suffix}`,
    refresh_token: `e2e-refresh-${suffix}`,
    expires_in: 3600,
    expires_at: 4102444800,
    token_type: 'bearer',
    user: {
      id: E2E_USER_ID,
      email: 'operator@example.test',
      user_metadata: { name: 'Admin' },
    },
  };
}

async function configureCleanAuthJourney(context, backend, observations) {
  await context.addInitScript((featureFlagKey) => {
    try {
      const marker = 'propela_e2e_auth_expiry_initialized';
      if (sessionStorage.getItem(marker)) return;
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem(marker, 'true');
      localStorage.setItem(featureFlagKey, JSON.stringify({ SUPABASE_BACKEND: true }));
    } catch {
      // The initial opaque document has no storage access.
    }
  }, FEATURE_FLAG_KEY);

  await context.route(`${E2E_SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/auth/v1/token' && request.method() === 'POST') {
      observations.signIns += 1;
      await route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify(authResponse(observations.signIns)),
      });
      return;
    }

    if (url.pathname === '/rest/v1/nurses' && request.method() === 'GET') {
      const authorization = request.headers().authorization;
      const ordinalMatch = /^Bearer e2e-session-(\d+)$/.exec(authorization ?? '');
      observations.nurseRequests += 1;
      observations.finalNurseSessionOrdinal = ordinalMatch ? Number(ordinalMatch[1]) : null;
      observations.authorizationPresent = typeof authorization === 'string';
      observations.authorizationIsPublicAnon = authorization === `Bearer ${PUBLIC_ANON_KEY}`;
      if (observations.failNextNurseRequest) {
        observations.failNextNurseRequest = false;
        await route.fulfill({
          status: 401,
          headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
          body: JSON.stringify({ code: 'PGRST301', message: 'JWT expired' }),
        });
        return;
      }
    }

    await backend.handle(route, 'Admin');
  });
}

test('clean and repeated sign-in share readiness with nurse authorization', async ({
  context,
  page,
}) => {
  const backend = new NurseMockBackend([
    makeNurseRow({ id: 'nurse-session-ready', fullName: 'Session Ready Nurse' }),
  ]);
  const observations = {
    signIns: 0,
    nurseRequests: 0,
    finalNurseSessionOrdinal: null,
    authorizationPresent: false,
    authorizationIsPublicAnon: true,
    failNextNurseRequest: false,
  };
  await configureCleanAuthJourney(context, backend, observations);

  await page.goto('/nurses');
  await expect(page.getByTestId('login-screen')).toBeVisible();
  expect(observations.nurseRequests).toBe(0);

  await page.getByLabel('Email').fill('operator@example.test');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByText('Session Ready Nurse', { exact: true })).toBeVisible();
  expect(observations.nurseRequests).toBe(1);
  expect(observations.authorizationPresent).toBe(true);
  expect(observations.authorizationIsPublicAnon).toBe(false);
  await expect(page.getByText('Authentication required')).toHaveCount(0);
  await expect(page.getByText('Your session has expired. Please sign in again.')).toHaveCount(0);

  observations.failNextNurseRequest = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('login-screen')).toBeVisible();
  await expect(page.getByText('Session Ready Nurse', { exact: true })).toHaveCount(0);
  expect(observations.nurseRequests).toBe(2);

  await page.getByLabel('Email').fill('operator@example.test');
  await page.getByLabel('Password').fill('test-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Nurse Database' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
  await page.getByRole('button', { name: 'Refresh' }).click();

  await expect
    .poll(() => observations.nurseRequests, { message: 'current-epoch nurse request count' })
    .toBe(3);
  await expect(page.getByText('Session Ready Nurse', { exact: true })).toBeVisible();
  await expect(page.getByText('Your session has expired. Please sign in again.')).toHaveCount(0);
  expect(observations.signIns).toBe(2);
  expect(observations.finalNurseSessionOrdinal).toBe(2);
  expect(backend.writes()).toHaveLength(0);
});
