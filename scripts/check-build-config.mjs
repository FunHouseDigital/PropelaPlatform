#!/usr/bin/env node
/**
 * Build-time required-config guard (Task 12.2, Req 7.3, 8.10).
 *
 * Fails the build (non-zero exit) when a required `VITE_` config value is
 * absent, so a broken configuration can never be deployed.
 *
 * -------------------------------------------------------------------------
 * WHY THIS IS GATED (and does NOT break the default `npm run build`)
 * -------------------------------------------------------------------------
 * The `SUPABASE_BACKEND` feature flag defaults OFF: the app happily runs on the
 * legacy `localStorage` path with NO Supabase env vars. Requiring the Supabase
 * vars unconditionally would break every legacy-path build (local dev, existing
 * CI, preview deploys that never touch Supabase).
 *
 * So the strict requirement for the Supabase vars is only enforced when the
 * build is *intended* to run against the Supabase backend. That intent is
 * signalled by ANY of the following (checked in order):
 *
 *   1. REQUIRE_SUPABASE=1            — explicit opt-in for this guard.
 *   2. VITE_FEATURE_FLAGS contains   — the build ships with the SUPABASE_BACKEND
 *      the token `SUPABASE_BACKEND`    flag ON, so it must have working config.
 *   3. VERCEL_ENV=production         — Vercel production deployments are treated
 *      (i.e. a production deploy)      as backend-intended by default.
 *
 * When none of these signals is present the guard is a NO-OP and exits 0, so
 * `npm run build` (default) and legacy-path builds are never blocked.
 *
 * When a signal IS present, the guard requires every name in
 * REQUIRED_SUPABASE_CONFIG (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) to be a
 * non-empty (non-whitespace) string, and exits non-zero listing each missing
 * one otherwise.
 *
 * This guard intentionally requires ONLY the public, RLS-constrained frontend
 * Supabase vars. It must never reference (or require) the service_role key or
 * the database password — those secrets never belong in a frontend build.
 *
 * Wiring: referenced by the `build:vercel` npm script and by `vercel.json`'s
 * buildCommand: `node scripts/check-build-config.mjs && vite build`.
 */

/**
 * Required public Supabase configuration variable names (mirrors
 * REQUIRED_SUPABASE_CONFIG in src/lib/config.js).
 * @type {string[]}
 */
export const REQUIRED_SUPABASE_CONFIG = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

/**
 * Decide whether this build is intended to use the Supabase backend, and thus
 * whether the required Supabase config must be enforced.
 *
 * @param {Record<string, string | undefined>} env process-like env map.
 * @returns {{ required: boolean, reason: string }}
 */
export function isSupabaseRequired(env) {
  if (env.REQUIRE_SUPABASE === '1' || env.REQUIRE_SUPABASE === 'true') {
    return { required: true, reason: 'REQUIRE_SUPABASE is set' };
  }

  const flags = env.VITE_FEATURE_FLAGS || '';
  const hasFlag = flags
    .split(',')
    .map((f) => f.trim())
    .includes('SUPABASE_BACKEND');
  if (hasFlag) {
    return {
      required: true,
      reason: 'VITE_FEATURE_FLAGS includes SUPABASE_BACKEND',
    };
  }

  if (env.VERCEL_ENV === 'production') {
    return { required: true, reason: 'VERCEL_ENV is production' };
  }

  return { required: false, reason: 'Supabase backend not intended for this build' };
}

/**
 * Compute the list of required config values that are missing/empty.
 *
 * @param {Record<string, string | undefined>} env process-like env map.
 * @returns {string[]} names of missing required vars (empty when all present).
 */
export function findMissingConfig(env) {
  return REQUIRED_SUPABASE_CONFIG.filter((name) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim() === '';
  });
}

/**
 * Run the guard against an env map.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ ok: boolean, enforced: boolean, reason: string, missing: string[] }}
 */
export function checkBuildConfig(env) {
  const { required, reason } = isSupabaseRequired(env);
  if (!required) {
    return { ok: true, enforced: false, reason, missing: [] };
  }
  const missing = findMissingConfig(env);
  return { ok: missing.length === 0, enforced: true, reason, missing };
}

// ---- CLI entrypoint -------------------------------------------------------
// Only execute when run directly (not when imported by tests).
const isMain =
  process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMain) {
  const result = checkBuildConfig(process.env);

  if (!result.enforced) {
    console.log(
      `check-build-config: Supabase config not enforced (${result.reason}). ` +
        'Skipping strict guard so the legacy-path build proceeds.',
    );
    process.exit(0);
  }

  if (result.ok) {
    console.log(
      `check-build-config: OK — required Supabase config present ` +
        `(${result.reason}).`,
    );
    process.exit(0);
  }

  console.error(
    `check-build-config: FAILED — Supabase backend is intended for this ` +
      `build (${result.reason}) but required configuration is missing:`,
  );
  for (const name of result.missing) {
    console.error(`  - ${name} is absent or empty`);
  }
  console.error(
    '\nSet these environment variables (public, RLS-constrained frontend ' +
      'values) before building, or unset the backend signal to build the ' +
      'legacy path. NEVER supply the service_role key or DB password here.',
  );
  process.exit(1);
}
