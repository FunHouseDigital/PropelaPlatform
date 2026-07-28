import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as supabaseAdapter from '../../dataLayer/supabaseAdapter';
import { createNurseRepository } from '../nurseRepository';
import { createBlankNurseDraft } from '../nurseWorkflow';

/**
 * Property 18: Authentication or RLS denial cannot become client success
 *
 * For any nurse operation with no session, an expired or invalid session, or a
 * valid session denied by RLS, the repository reports AUTH or FORBIDDEN,
 * preserves the draft and server-confirmed state, and never exposes a success
 * result. Frontend control visibility has no bearing on the authoritative
 * session and RLS decisions.
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
 */

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const DRAFT_UUID = '11111111-1111-4111-8111-111111111111';
const DENIAL_SCENARIOS = Object.freeze([
  {
    name: 'absent session',
    expectedCode: 'AUTH',
    requestExpected: false,
    session: 'absent',
  },
  {
    name: 'invalid session read',
    expectedCode: 'AUTH',
    requestExpected: false,
    session: 'invalid',
  },
  {
    name: 'expired session',
    expectedCode: 'AUTH',
    requestExpected: false,
    session: 'expired',
  },
  {
    name: 'invalid session response',
    driverError: { status: 401, message: 'Invalid JWT' },
    expectedCode: 'AUTH',
    requestExpected: true,
    session: 'active',
  },
  {
    name: 'expired session response',
    driverError: { status: 401, message: 'JWT token expired' },
    expectedCode: 'AUTH',
    requestExpected: true,
    session: 'active',
  },
  {
    name: 'RLS HTTP denial',
    driverError: { status: 403, message: 'Insufficient permission' },
    expectedCode: 'FORBIDDEN',
    requestExpected: true,
    session: 'active',
  },
  {
    name: 'RLS database denial',
    driverError: { code: '42501', message: 'row-level security policy denied request' },
    expectedCode: 'FORBIDDEN',
    requestExpected: true,
    session: 'active',
  },
]);

const safeTextArbitrary = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '), {
    minLength: 1,
    maxLength: 40,
  })
  .map((characters) => characters.join('').trim() || 'Nurse');

const generatedCaseArbitrary = fc.record({
  operation: fc.constantFrom('list', 'detail', 'create', 'update', 'pipeline', 'delete'),
  roleControlsVisible: fc.boolean(),
  token: fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-'), {
      minLength: 8,
      maxLength: 48,
    })
    .map((characters) => characters.join('')),
  baseVersion: fc.integer({ min: 1, max: 10_000 }),
  draftName: safeTextArbitrary,
  confirmedState: fc.uniqueArray(
    fc.record({
      id: fc.uuid().map((uuid) => `nurse-${uuid}`),
      fullName: safeTextArbitrary,
      version: fc.integer({ min: 1, max: 10_000 }),
    }),
    { maxLength: 12, selector: (nurse) => nurse.id },
  ),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sessionResult(scenario, token) {
  if (scenario.session === 'absent') return { session: null, error: null };
  if (scenario.session === 'invalid') {
    return {
      session: null,
      error: { status: 401, message: 'Invalid session token' },
    };
  }
  return {
    session: {
      user: { id: OWNER_ID },
      access_token: token,
      expires_at: scenario.session === 'expired' ? 1 : 4_102_444_800,
    },
    error: null,
  };
}

class DenyingSupabaseClient {
  constructor(error, token) {
    this.error = error;
    this.token = token;
    this.requests = [];
  }

  from(table) {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      range: () => builder,
      order: () => builder,
      maybeSingle: () => builder,
      then: (resolve) => {
        this.requests.push({ table, token: this.token });
        resolve({
          data: {
            id: 'nurse-fabricated-success',
            full_name: 'Must not become local success',
            version: 99,
          },
          error: this.error,
          count: 1,
        });
      },
    };
    return builder;
  }
}

function validDraft(fullName) {
  return {
    ...createBlankNurseDraft({
      now: new Date('2026-03-10T12:00:00.000Z'),
      randomUUID: () => DRAFT_UUID,
    }),
    fullName,
  };
}

function operations() {
  return {
    list: supabaseAdapter.listNurses,
    get: supabaseAdapter.getNurse,
    create: supabaseAdapter.createNurse,
    update: supabaseAdapter.updateNurse,
    remove: supabaseAdapter.deleteNurse,
  };
}

function invoke(repo, operation, draft, baseVersion) {
  switch (operation) {
    case 'list':
      return repo.listAll();
    case 'detail':
      return repo.get(draft.id);
    case 'create':
      return repo.create(draft);
    case 'update':
      return repo.save(draft.id, draft, baseVersion);
    case 'pipeline':
      return repo.save(
        draft.id,
        { pipelineStage: 'Screening', readinessStatus: 'In Progress' },
        baseVersion,
      );
    case 'delete':
      return repo.remove(draft.id, baseVersion);
    default:
      throw new Error(`Unsupported generated nurse operation: ${operation}`);
  }
}

afterEach(() => {
  supabaseAdapter.__setClientFactory(null);
});

describe('nurseRepository authorization denials (Property 18)', () => {
  it('keeps every generated operation failed and state-preserving across session and RLS denials', async () => {
    await fc.assert(
      fc.asyncProperty(generatedCaseArbitrary, async (generated) => {
        for (const scenario of DENIAL_SCENARIOS) {
          const draft = validDraft(generated.draftName);
          const state = {
            confirmedState: clone(generated.confirmedState),
            draft,
            roleControlsVisible: generated.roleControlsVisible,
          };
          const before = clone(state);
          const client = new DenyingSupabaseClient(scenario.driverError, generated.token);
          const clientFactory = vi.fn(() => client);
          supabaseAdapter.__setClientFactory(clientFactory);

          const readSession = vi.fn(async () => sessionResult(scenario, generated.token));
          const repo = createNurseRepository({
            operations: operations(),
            supabase: true,
            readSession,
            sessionExpired: () => scenario.session === 'expired',
          });

          const result = await invoke(
            repo,
            generated.operation,
            state.draft,
            generated.baseVersion,
          );

          expect(result, scenario.name).toMatchObject({
            status: 'error',
            error: { code: scenario.expectedCode },
          });
          expect(result, scenario.name).not.toHaveProperty('nurse');
          expect(result, scenario.name).not.toHaveProperty('nurses');
          expect(result, scenario.name).not.toHaveProperty('deleted');
          expect(state, scenario.name).toEqual(before);
          expect(readSession, scenario.name).toHaveBeenCalledTimes(1);

          if (scenario.requestExpected) {
            expect(clientFactory, scenario.name).toHaveBeenCalledTimes(1);
            expect(client.requests, scenario.name).toEqual([
              { table: 'nurses', token: generated.token },
            ]);
          } else {
            expect(clientFactory, scenario.name).not.toHaveBeenCalled();
            expect(client.requests, scenario.name).toEqual([]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
