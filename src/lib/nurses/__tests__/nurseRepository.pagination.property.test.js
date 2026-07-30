import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import {
  createNurseRepository,
  LIST_CONSISTENCY_ERROR,
  NURSE_REPOSITORY_PAGE_SIZE,
} from '../nurseRepository';

/**
 * Property 3: All-or-error pagination integrity
 *
 * **Validates: Requirements 1.8–1.12**
 */

const NUM_RUNS = 100;
const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const PAGE_FAILURE = Object.freeze({
  code: 'NETWORK',
  message: 'Generated page failure',
});

function nurses(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
  }));
}

function consistentPages(items, reportedTotal) {
  const pageCount = Math.max(
    1,
    Math.ceil(reportedTotal / NURSE_REPOSITORY_PAGE_SIZE),
  );
  return Array.from({ length: pageCount }, (_, index) => ({
    data: items.slice(
      index * NURSE_REPOSITORY_PAGE_SIZE,
      (index + 1) * NURSE_REPOSITORY_PAGE_SIZE,
    ),
    error: null,
    total: reportedTotal,
  }));
}

function acceptedScenario(kind, nonce, total) {
  const expectedNurses = nurses(`${kind}-${nonce}`, total);
  return {
    kind,
    pages: consistentPages(expectedNurses, total),
    expectedCalls: Math.max(
      1,
      Math.ceil(total / NURSE_REPOSITORY_PAGE_SIZE),
    ),
    expectedNurses,
    total,
    valid: true,
  };
}

const successfulSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({ min: 0, max: NURSE_REPOSITORY_PAGE_SIZE }),
  })
  .map(({ nonce, total }) => acceptedScenario('successful', nonce, total));

const completeSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({
      min: NURSE_REPOSITORY_PAGE_SIZE + 1,
      max: NURSE_REPOSITORY_PAGE_SIZE * 3,
    }),
  })
  .map(({ nonce, total }) => acceptedScenario('complete', nonce, total));

const failedSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({
      min: NURSE_REPOSITORY_PAGE_SIZE + 1,
      max: NURSE_REPOSITORY_PAGE_SIZE * 3,
    }),
    failureOffset: fc.nat(),
  })
  .map(({ nonce, total, failureOffset }) => {
    const allNurses = nurses(`failed-${nonce}`, total);
    const pageCount = Math.ceil(total / NURSE_REPOSITORY_PAGE_SIZE);
    const failurePage = 2 + (failureOffset % (pageCount - 1));
    const pages = consistentPages(allNurses, total);
    pages[failurePage - 1] = {
      data: [],
      error: PAGE_FAILURE,
      total,
    };
    return {
      kind: 'failed',
      pages,
      expectedCalls: failurePage,
      expectedError: PAGE_FAILURE,
      valid: false,
    };
  });

const duplicatedSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({ min: 2, max: NURSE_REPOSITORY_PAGE_SIZE * 3 }),
  })
  .map(({ nonce, total }) => {
    const duplicated = nurses(`duplicated-${nonce}`, total);
    duplicated[duplicated.length - 1] = duplicated[0];
    return {
      kind: 'duplicated',
      pages: consistentPages(duplicated, total),
      expectedCalls: Math.ceil(total / NURSE_REPOSITORY_PAGE_SIZE),
      valid: false,
    };
  });

const oversizedSequenceArbitrary = fc.uuid().map((nonce) => ({
  kind: 'oversized',
  pages: [
    {
      data: nurses(
        `oversized-${nonce}`,
        NURSE_REPOSITORY_PAGE_SIZE + 1,
      ),
      error: null,
      total: NURSE_REPOSITORY_PAGE_SIZE + 1,
    },
  ],
  expectedCalls: 1,
  valid: false,
}));

const totalChangingSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({
      min: NURSE_REPOSITORY_PAGE_SIZE + 1,
      max: NURSE_REPOSITORY_PAGE_SIZE * 2,
    }),
    totalDelta: fc.integer({ min: 1, max: NURSE_REPOSITORY_PAGE_SIZE }),
  })
  .map(({ nonce, total, totalDelta }) => {
    const pages = consistentPages(nurses(`total-changing-${nonce}`, total), total);
    pages[1] = { ...pages[1], total: total + totalDelta };
    return {
      kind: 'total-changing',
      pages,
      expectedCalls: 2,
      valid: false,
    };
  });

const shortSequenceArbitrary = fc
  .record({
    nonce: fc.uuid(),
    total: fc.integer({ min: 1, max: NURSE_REPOSITORY_PAGE_SIZE * 3 }),
  })
  .map(({ nonce, total }) => ({
    kind: 'short',
    pages: consistentPages(nurses(`short-${nonce}`, total - 1), total),
    expectedCalls: Math.ceil(total / NURSE_REPOSITORY_PAGE_SIZE),
    valid: false,
  }));

const sequenceSuiteArbitrary = fc.record({
  successful: successfulSequenceArbitrary,
  failed: failedSequenceArbitrary,
  duplicated: duplicatedSequenceArbitrary,
  oversized: oversizedSequenceArbitrary,
  totalChanging: totalChangingSequenceArbitrary,
  short: shortSequenceArbitrary,
  complete: completeSequenceArbitrary,
});

function createRepositoryFor(pages) {
  const list = vi.fn(async ({ page }) =>
    pages[page - 1] ?? {
      data: [],
      error: null,
      total: pages[0]?.total ?? 0,
    },
  );

  return {
    list,
    repository: createNurseRepository({
      operations: { list },
      supabase: true,
      requireActiveSession: async () => ({
        session: {
          user: { id: OWNER_ID },
          access_token: 'property-test-session',
          expires_at: Math.floor(Date.now() / 1000) + 3_600,
        },
        error: null,
      }),
      sessionExpired: () => false,
    }),
  };
}

async function verifyScenario(scenario) {
  const { list, repository } = createRepositoryFor(scenario.pages);
  const result = await repository.listAll();

  expect(list).toHaveBeenCalledTimes(scenario.expectedCalls);
  for (const [{ page, pageSize }] of list.mock.calls) {
    expect(page).toBeGreaterThanOrEqual(1);
    expect(pageSize).toBe(NURSE_REPOSITORY_PAGE_SIZE);
    expect(pageSize).toBeLessThanOrEqual(100);
  }

  if (scenario.valid) {
    expect(result).toEqual({
      status: 'ok',
      nurses: scenario.expectedNurses,
      total: scenario.total,
    });
    return;
  }

  expect(result.status, scenario.kind).toBe('error');
  expect(result, scenario.kind).not.toHaveProperty('nurses');
  expect(result, scenario.kind).not.toHaveProperty('total');
  if (scenario.expectedError) {
    expect(result.error).toBe(scenario.expectedError);
  } else {
    expect(result.error).toMatchObject({ code: LIST_CONSISTENCY_ERROR });
  }
}

describe('Property 3: All-or-error pagination integrity', () => {
  it('accepts only complete consistent aggregates and never exposes a partial list', async () => {
    await fc.assert(
      fc.asyncProperty(sequenceSuiteArbitrary, async (sequenceSuite) => {
        for (const scenario of Object.values(sequenceSuite)) {
          await verifyScenario(scenario);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
