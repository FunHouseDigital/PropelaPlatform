// @ts-check

export const E2E_SUPABASE_URL = 'https://e2e.supabase.invalid';
export const E2E_USER_ID = '11111111-1111-4111-8111-111111111111';

const FEATURE_FLAG_KEY = 'propela_feature_flags_override';
const SUPABASE_SESSION_KEY = 'sb-e2e-auth-token';
const LOCAL_NURSES_KEY = 'propela_ops_v2_nurses';
const LOCAL_AUTH_KEY = 'propela_ops_v2_authSession';
const FIXED_NOW = '2026-01-15T10:00:00.000Z';

const ROLE_PERMISSIONS = Object.freeze({
  Superadmin: { Nurses: true },
  Admin: { Nurses: true },
  Recruiter: { Nurses: true },
});

const SCORECARD_FIELDS = Object.freeze({
  hospitalExp: 0,
  sancStatus: 0,
  qualifications: 0,
  specialisation: 0,
  financialReadiness: 0,
  motivation: 0,
  passport: 0,
});

function jsonHeaders(total) {
  return {
    'access-control-allow-origin': '*',
    'access-control-expose-headers': 'content-range',
    'content-type': 'application/json',
    'content-range': `0-${Math.max(0, total - 1)}/${total}`,
  };
}

function parseFilter(searchParams, field) {
  const value = searchParams.get(field);
  return value?.startsWith('eq.') ? decodeURIComponent(value.slice(3)) : null;
}

function responseBody(request, rows) {
  const accept = request.headers().accept || '';
  if (accept.includes('application/vnd.pgrst.object')) return rows[0] ?? null;
  return rows;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function makeNurseRow({
  id = 'nurse-e2e-001',
  ownerId = E2E_USER_ID,
  fullName = 'Remote Test Nurse',
  preferredName = 'Remote',
  version = 1,
  attributes = {},
} = {}) {
  return {
    id,
    owner_id: ownerId,
    full_name: fullName,
    preferred_name: preferredName,
    pipeline_stage: 'Applied',
    readiness_status: 'Not Ready',
    cohort_assigned: null,
    oet_status: 'Not Started',
    final_score: 0,
    tier: '',
    email: '',
    scorecard_fields: clone(SCORECARD_FIELDS),
    additional_certifications: [],
    communication_log: [],
    attributes: {
      nextAction: '',
      flags: 0,
      contactNumber: '',
      gender: '',
      ageGroup: '',
      province: '',
      city: '',
      registeredWithSANC: '',
      registeredNurseInSA: '',
      sancNumber: '',
      sancAPCExpiry: '',
      sancAPCStatus: '',
      highestQualification: '',
      qualificationInstitution: '',
      yearsOfClinicalExperience: '',
      primaryClinicalSpecialty: '',
      employmentStatus: '',
      currentEmployer: '',
      validPassport: '',
      passportExpiryDate: '',
      efSetScore: 0,
      efSetLevel: '',
      englishPts: 0,
      cvScore: 0,
      shortlistDecision: '',
      agreementSigned: false,
      commitmentFeeStatus: '',
      source: '',
      motivations: '',
      questions: '',
      notesFlags: '',
      photoURL: '',
      submittedAt: '2026-01-15',
      nextActionDueDate: '',
      lastContacted: '',
      ...attributes,
    },
    version,
    created_at: FIXED_NOW,
    updated_at: FIXED_NOW,
  };
}

export class NurseMockBackend {
  constructor(rows = []) {
    this.rows = new Map(rows.map((row) => [row.id, clone(row)]));
    this.requests = [];
  }

  get(id) {
    const row = this.rows.get(id);
    return row ? clone(row) : null;
  }

  updateExternally(id, patch = {}) {
    const current = this.rows.get(id);
    if (!current) throw new Error(`Cannot update missing mock nurse ${id}`);
    const next = {
      ...current,
      ...clone(patch),
      attributes: { ...current.attributes, ...(patch.attributes || {}) },
      version: current.version + 1,
      updated_at: '2026-01-15T10:01:00.000Z',
    };
    this.rows.set(id, next);
    return clone(next);
  }

  deleteExternally(id) {
    this.rows.delete(id);
  }

  writes() {
    return this.requests.filter(
      ({ method, table }) => table === 'nurses' && ['POST', 'PATCH', 'DELETE'].includes(method)
    );
  }

  async handle(route, role) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const table = url.pathname.startsWith('/rest/v1/')
      ? url.pathname.slice('/rest/v1/'.length)
      : null;

    this.requests.push({ method, path: url.pathname, table, query: url.search });

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      return;
    }

    if (url.pathname.startsWith('/auth/v1/')) {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(1),
        body: JSON.stringify({}),
      });
      return;
    }

    if (!table) {
      await route.fulfill({ status: 404, headers: jsonHeaders(0), body: '{}' });
      return;
    }

    if (table === 'profiles') {
      const rows = role ? [{ role }] : [];
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(rows.length),
        body: JSON.stringify(responseBody(request, rows)),
      });
      return;
    }

    if (table === 'settings') {
      const rows = [{ id: 'settings-e2e', rolePermissions: ROLE_PERMISSIONS }];
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(1),
        body: JSON.stringify(responseBody(request, rows)),
      });
      return;
    }

    if (table === 'onboarding_state') {
      const rows = [
        {
          id: 'onboarding-e2e',
          currentStep: 0,
          completedSteps: [],
          isComplete: true,
          skipped: false,
          role: role || '',
          preferences: {},
        },
      ];
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(1),
        body: JSON.stringify(responseBody(request, rows)),
      });
      return;
    }

    if (table !== 'nurses') {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(0),
        body: JSON.stringify(responseBody(request, [])),
      });
      return;
    }

    if (!role) {
      await route.fulfill({
        status: 403,
        headers: jsonHeaders(0),
        body: JSON.stringify({ code: '42501', message: 'permission denied' }),
      });
      return;
    }

    const id = parseFilter(url.searchParams, 'id');
    const baseVersionValue = parseFilter(url.searchParams, 'version');
    const baseVersion = baseVersionValue === null ? null : Number(baseVersionValue);

    if (method === 'GET') {
      let rows = id ? [this.rows.get(id)].filter(Boolean) : [...this.rows.values()];
      const range = request.headers().range;
      if (range && !id) {
        const [start, end] = range.split('-').map(Number);
        rows = rows.slice(start, end + 1);
      }
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(this.rows.size),
        body: JSON.stringify(responseBody(request, rows.map(clone))),
      });
      return;
    }

    if (method === 'POST') {
      const raw = request.postDataJSON();
      const input = Array.isArray(raw) ? raw[0] : raw;
      if (this.rows.has(input.id)) {
        await route.fulfill({
          status: 409,
          headers: jsonHeaders(0),
          body: JSON.stringify({ code: '23505', message: 'duplicate key' }),
        });
        return;
      }
      const committed = {
        ...clone(input),
        version: 1,
        created_at: FIXED_NOW,
        updated_at: FIXED_NOW,
      };
      this.rows.set(committed.id, committed);
      await route.fulfill({
        status: 201,
        headers: jsonHeaders(1),
        body: JSON.stringify(responseBody(request, [clone(committed)])),
      });
      return;
    }

    const current = id ? this.rows.get(id) : null;
    const versionMatches = current && (baseVersion === null || current.version === baseVersion);

    if (method === 'PATCH') {
      if (!versionMatches) {
        await route.fulfill({ status: 200, headers: jsonHeaders(0), body: '[]' });
        return;
      }
      const patch = request.postDataJSON();
      const committed = {
        ...current,
        ...clone(patch),
        attributes: patch.attributes
          ? { ...current.attributes, ...clone(patch.attributes) }
          : current.attributes,
        version: current.version + 1,
        updated_at: '2026-01-15T10:02:00.000Z',
      };
      this.rows.set(id, committed);
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(1),
        body: JSON.stringify(responseBody(request, [clone(committed)])),
      });
      return;
    }

    if (method === 'DELETE') {
      if (!versionMatches) {
        await route.fulfill({ status: 200, headers: jsonHeaders(0), body: '[]' });
        return;
      }
      this.rows.delete(id);
      await route.fulfill({
        status: 200,
        headers: jsonHeaders(1),
        body: JSON.stringify(responseBody(request, [clone(current)])),
      });
      return;
    }

    await route.fulfill({ status: 405, headers: jsonHeaders(0), body: '{}' });
  }
}

export async function configureSupabaseContext(
  context,
  { backend, role = 'Admin', userId = E2E_USER_ID, localNurses = [] }
) {
  await context.addInitScript(
    ({ featureFlagKey, sessionKey, localNursesKey, roleName, id, samples }) => {
      try {
        const marker = 'propela_e2e_supabase_initialized';
        if (sessionStorage.getItem(marker)) return;
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem(marker, 'true');
        localStorage.setItem(featureFlagKey, JSON.stringify({ SUPABASE_BACKEND: true }));
        localStorage.setItem(localNursesKey, JSON.stringify(samples));
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            access_token: 'e2e-access-token',
            refresh_token: 'e2e-refresh-token',
            expires_in: 3600,
            expires_at: 4102444800,
            token_type: 'bearer',
            user: {
              id,
              email: 'operator@example.test',
              user_metadata: { name: roleName || 'No profile' },
            },
          })
        );
      } catch {
        // addInitScript also runs for the initial opaque about:blank document.
      }
    },
    {
      featureFlagKey: FEATURE_FLAG_KEY,
      sessionKey: SUPABASE_SESSION_KEY,
      localNursesKey: LOCAL_NURSES_KEY,
      roleName: role,
      id: userId,
      samples: localNurses,
    }
  );
  await context.route(`${E2E_SUPABASE_URL}/**`, (route) => backend.handle(route, role));
}

export async function configureLegacyContext(context, role = 'Admin') {
  await context.addInitScript(
    ({ featureFlagKey, authKey, roleName }) => {
      try {
        const marker = 'propela_e2e_legacy_initialized';
        if (sessionStorage.getItem(marker)) return;
        localStorage.clear();
        sessionStorage.clear();
        sessionStorage.setItem(marker, 'true');
        localStorage.setItem(featureFlagKey, JSON.stringify({ SUPABASE_BACKEND: false }));
        localStorage.setItem(
          'propela_ops_v2_onboardingState',
          JSON.stringify({
            currentStep: 0,
            completedSteps: [],
            isComplete: true,
            skipped: false,
            role: roleName,
            preferences: {},
          })
        );
        sessionStorage.setItem(
          authKey,
          JSON.stringify({
            id: 'legacy-e2e-user',
            name: 'Legacy E2E Operator',
            email: 'legacy@example.test',
            role: roleName,
          })
        );
      } catch {
        // addInitScript also runs for the initial opaque about:blank document.
      }
    },
    { featureFlagKey: FEATURE_FLAG_KEY, authKey: LOCAL_AUTH_KEY, roleName: role }
  );
}
