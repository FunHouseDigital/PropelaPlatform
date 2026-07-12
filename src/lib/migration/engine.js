/**
 * Migration engine (Tasks 11.1, 11.2, 11.3).
 *
 * Pure, database-agnostic orchestration for the seed-data migration. It speaks
 * the `supabase-js` query-builder dialect
 * (`client.from(table).upsert(rows, { onConflict }).select()`), so the SAME code
 * runs against the real service-role client (from the `.mjs` entrypoint) and
 * against the in-memory `FakeSupabaseClient` used by the property/unit tests —
 * no live database required for testing.
 *
 * Responsibilities:
 *   - Transform each domain's seed source into rows and upsert them keyed on the
 *     primary key (`onConflict: 'id'`) so re-runs create no duplicates
 *     (Req 5.8, 11.7 — idempotent).
 *   - Insert in referential-integrity order: independent tables before dependent
 *     ones (placements → nurses/facilities, documents → nurses) (Req 5.4).
 *   - Treat each domain's rows as an all-or-none set. A PostgREST bulk upsert is
 *     a single `INSERT ... ON CONFLICT` statement, which Postgres executes
 *     atomically: if any row violates a constraint the whole statement rolls
 *     back and nothing for that set is committed. On such a failure the engine
 *     reports the failing record id + violated constraint (Req 5.5).
 *   - Report `{ sourceCount, loadedCount, failedCount }` per domain (Req 5.6) and
 *     mark the whole migration FAILED when any domain's loaded count does not
 *     equal its source count (Req 5.7).
 */

import { getDomain, listDomainNames } from '../dataLayer/domains';
import { sourceIds, toRows } from './transform';

/**
 * Domains that reference other domains via foreign keys and therefore must be
 * loaded AFTER their referenced (independent) tables (Req 5.4):
 *   - placements → nurses, facilities
 *   - documents  → nurses
 */
export const DEPENDENT_DOMAINS = Object.freeze(['placements', 'documents']);

/**
 * Produce a referential-integrity-safe insertion order: every independent domain
 * first (in registry order), then the dependent domains. This guarantees a
 * referenced table's rows exist before a referencing table is loaded (Req 5.4).
 *
 * @returns {string[]} Domain names in a safe insertion order.
 */
export function migrationOrder() {
  const names = listDomainNames();
  const dependents = new Set(DEPENDENT_DOMAINS);
  const independent = names.filter((n) => !dependents.has(n));
  const dependent = names.filter((n) => dependents.has(n));
  return [...independent, ...dependent];
}

/**
 * Extract the offending record id from a PostgREST/driver error, if the driver
 * surfaced it (our `.mjs` wrapper and the test fakes place it in `details`).
 */
function extractFailingId(error) {
  if (!error) return null;
  if (typeof error.details === 'string' && error.details) return error.details;
  if (typeof error.failingId === 'string') return error.failingId;
  return null;
}

/**
 * Migrate a single domain as an all-or-none set.
 *
 * @param {object} client supabase-js-style client (real or fake).
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @param {unknown} source Array | object | null.
 * @returns {Promise<DomainResult>}
 */
export async function migrateDomain(client, domain, source) {
  const rows = toRows(domain, source);
  const sourceCount = sourceIds(domain, source).length;

  // Nothing to load: a trivially successful, idempotent no-op.
  if (rows.length === 0) {
    return {
      domain: domain.name,
      table: domain.table,
      sourceCount,
      loadedCount: 0,
      failedCount: sourceCount,
      failures: [],
    };
  }

  const { data, error } = await client
    .from(domain.table)
    .upsert(rows, { onConflict: domain.primaryKey })
    .select();

  if (error) {
    // Atomic statement failed ⇒ the entire related set rolled back; report the
    // failing record and the violated constraint (Req 5.5).
    return {
      domain: domain.name,
      table: domain.table,
      sourceCount,
      loadedCount: 0,
      failedCount: sourceCount,
      failures: [
        {
          id: extractFailingId(error),
          constraint: error.constraint ?? error.code ?? null,
          message: error.message ?? String(error),
        },
      ],
    };
  }

  const loadedCount = Array.isArray(data) ? data.length : 0;
  return {
    domain: domain.name,
    table: domain.table,
    sourceCount,
    loadedCount,
    failedCount: Math.max(0, sourceCount - loadedCount),
    failures: [],
  };
}

/**
 * Run the full migration across all domains in referential-integrity order.
 *
 * @param {object} params
 * @param {object} params.client supabase-js-style client (real or fake).
 * @param {Record<string, unknown>} params.sources domainName → source data.
 * @param {string[]} [params.order] Optional explicit order (defaults to
 *   {@link migrationOrder}).
 * @returns {Promise<MigrationReport>}
 */
export async function runMigration({ client, sources, order = migrationOrder() }) {
  const domains = [];
  let failed = false;

  for (const name of order) {
    const domain = getDomain(name);
    if (!domain) continue;
    const source = Object.prototype.hasOwnProperty.call(sources, name)
      ? sources[name]
      : domain.kind === 'collection'
        ? []
        : null;

    const result = await migrateDomain(client, domain, source);
    domains.push(result);

    // Req 5.7: any per-domain count mismatch fails the whole migration.
    if (result.loadedCount !== result.sourceCount) failed = true;
  }

  return { failed, domains };
}

/**
 * Render a human-readable migration report (per-domain counts + overall status).
 * Used by the CLI entrypoint for operator/CI output (Req 5.6, 5.7).
 *
 * @param {MigrationReport} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = [];
  lines.push('Seed-data migration report');
  lines.push('==========================');
  let totalSource = 0;
  let totalLoaded = 0;
  let totalFailed = 0;

  for (const d of report.domains) {
    totalSource += d.sourceCount;
    totalLoaded += d.loadedCount;
    totalFailed += d.failedCount;
    const mark = d.loadedCount === d.sourceCount ? 'OK  ' : 'FAIL';
    lines.push(
      `[${mark}] ${d.domain} (${d.table}): ` +
        `source=${d.sourceCount} loaded=${d.loadedCount} failed=${d.failedCount}`,
    );
    for (const f of d.failures) {
      lines.push(
        `        ! record=${f.id ?? '<unknown>'} ` +
          `constraint=${f.constraint ?? '<unknown>'} — ${f.message}`,
      );
    }
  }

  lines.push('--------------------------');
  lines.push(
    `TOTAL source=${totalSource} loaded=${totalLoaded} failed=${totalFailed}`,
  );
  lines.push(`STATUS: ${report.failed ? 'FAILED' : 'SUCCESS'}`);
  return lines.join('\n');
}

/**
 * @typedef {object} DomainFailure
 * @property {string|null} id         The failing record id (when known).
 * @property {string|null} constraint The violated constraint / error code.
 * @property {string}      message    The driver error message.
 *
 * @typedef {object} DomainResult
 * @property {string} domain
 * @property {string} table
 * @property {number} sourceCount
 * @property {number} loadedCount
 * @property {number} failedCount
 * @property {DomainFailure[]} failures
 *
 * @typedef {object} MigrationReport
 * @property {boolean} failed
 * @property {DomainResult[]} domains
 */
