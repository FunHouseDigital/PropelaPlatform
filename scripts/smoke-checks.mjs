#!/usr/bin/env node
/**
 * CI smoke checks (Task 12.3).
 *
 * This standalone script performs the checks that require a *built* bundle and
 * is intended to run in CI AFTER `npm run build` (or `npm run build:vercel`):
 *
 *   - Scans the shipped runtime bundle and asserts no service_role key or
 *     database-password reference leaks into it (Req 7.2, 10.6).
 *   - Detects an ACTUAL leaked Supabase service_role JWT in ANY emitted file
 *     (including hidden source maps) by decoding JWT payloads.
 *
 * The purely-static checks (`.env` gitignored, RLS + indexes on every domain
 * table, `vercel.json` SPA rewrite + HTTPS redirect) are implemented as Vitest
 * tests (see src/lib/__tests__/deployment-smoke.test.js) so they run in the
 * existing suite without a build step. This script focuses on the checks that
 * genuinely need the build output.
 *
 * --- Why two tiers of scanning -------------------------------------------
 * The build emits `sourcemap: 'hidden'` maps for error tracking. Those maps
 * embed the ORIGINAL source, including security comments that legitimately
 * mention the words "service_role" / "DB password" (e.g. "never bundle the
 * service_role key"). Flagging those English mentions would be a false
 * positive. So:
 *   - Forbidden IDENTIFIERS (env-var names, the bare `service_role` token) are
 *     scanned only in the shipped runtime assets (.js/.css/.html/.json, NOT
 *     .map) — minified shipped code strips comments, so any occurrence there is
 *     a genuine problem.
 *   - An actual leaked KEY is caught everywhere: every JWT-shaped token in every
 *     emitted file is decoded, and any token whose payload role is
 *     `service_role` fails the build regardless of file type.
 *
 * Usage:
 *   npm run build && npm run smoke
 *
 * Exits non-zero when a secret is detected or when `dist/` is missing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const distDir = join(repoRoot, 'dist');

/** File extensions that are shipped to and executed by the browser. */
const RUNTIME_EXTS = new Set(['.js', '.css', '.html', '.json', '.mjs', '.cjs']);

/**
 * Forbidden identifiers that must never appear in the SHIPPED runtime bundle.
 * These are secret env-var names and the bare `service_role` token; minified
 * runtime code contains no comments, so any hit here is a real leak.
 */
const FORBIDDEN_IDENTIFIERS = [
  { label: 'service_role token', re: /service_role/ },
  { label: 'SERVICE_ROLE_KEY reference', re: /SERVICE_ROLE_KEY/ },
  { label: 'SUPABASE_SERVICE_ROLE_KEY reference', re: /SUPABASE_SERVICE_ROLE_KEY/ },
  {
    label: 'database password reference',
    re: /(SUPABASE_DB_PASSWORD|DB_PASSWORD|DATABASE_PASSWORD)/,
  },
];

/** JWT shape: header.payload.signature, all base64url. */
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

/** Recursively collect all file paths under a directory. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Decode a JWT payload; return the parsed object or null. */
function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** True when the token is a Supabase service_role JWT (privilege-escalating). */
function isServiceRoleJwt(token) {
  const payload = decodeJwtPayload(token);
  return !!payload && payload.role === 'service_role';
}

function main() {
  if (!existsSync(distDir)) {
    console.error(
      'smoke-checks: FAILED — dist/ not found. Run `npm run build` before the smoke checks.',
    );
    process.exit(1);
  }

  const files = walk(distDir);
  const findings = [];

  for (const file of files) {
    const rel = file.replace(repoRoot + '/', '');
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue; // binary/unreadable asset
    }

    const isRuntime = RUNTIME_EXTS.has(extname(file)) && !file.endsWith('.map');

    // Tier 1: forbidden identifiers in shipped runtime assets only.
    if (isRuntime) {
      for (const { label, re } of FORBIDDEN_IDENTIFIERS) {
        if (re.test(content)) findings.push({ file: rel, label });
      }
    }

    // Tier 2: an actual leaked service_role JWT anywhere (incl. source maps).
    const matches = content.match(JWT_RE) || [];
    for (const token of matches) {
      if (isServiceRoleJwt(token)) {
        findings.push({ file: rel, label: 'leaked service_role JWT' });
      }
    }
  }

  if (findings.length > 0) {
    console.error(
      `smoke-checks: FAILED — potential secret(s) found in ${findings.length} location(s):`,
    );
    for (const f of findings) console.error(`  - [${f.label}] in ${f.file}`);
    process.exit(1);
  }

  console.log(
    `smoke-checks: OK — scanned ${files.length} emitted file(s); no service_role ` +
      'key or database-password leak found in the shipped bundle.',
  );
  process.exit(0);
}

main();
