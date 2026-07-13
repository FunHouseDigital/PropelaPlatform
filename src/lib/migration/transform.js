/**
 * Seed → row transform (Task 11.1).
 *
 * Pure, dependency-light logic that turns a seed object from `src/data/*` into a
 * database row shaped for the Supabase schema (`supabase/migrations/*`). It is
 * intentionally free of any I/O or secrets so it can be unit/property tested
 * against an in-memory store without a live database (Task 11.4/11.5).
 *
 * ---------------------------------------------------------------------------
 * Mapping approach (documented per Task 11.1)
 * ---------------------------------------------------------------------------
 * The transform is driven entirely by the domain registry
 * (`src/lib/dataLayer/domains.js`), which declares, per domain:
 *   - `table`         the Postgres table name
 *   - `kind`          'collection' (array of records) or 'singleton' (one object)
 *   - `typedColumns`  snake_case columns that are filtered/sorted/joined
 *   - `jsonbColumns`  JSONB detail columns (nested structures / catch-all)
 *
 * Column ↔ source-field resolution:
 *   1. The record's own `id` is preserved verbatim as the primary key (Req 5.3),
 *      never regenerated, so cross-domain references stay valid (Req 11.7).
 *   2. For each typed/JSONB column, the source field name defaults to the
 *      camelCase form of the snake_case column (`pipeline_stage` ← `pipelineStage`).
 *   3. Where the seed field name does not follow that convention, a per-domain
 *      override map ({@link FIELD_OVERRIDES}) supplies the exact source field
 *      (e.g. documents `doc_type` ← `type`, facilities `name` ← `organisationName`).
 *   4. Everything not consumed by a typed/named-JSONB column is placed verbatim
 *      into the domain's catch-all JSONB column (`attributes` for collections,
 *      `value`/`detail` where that is the only JSONB column). This preserves the
 *      remainder of the object for exact round-trips (Req 11.1) and forward
 *      compatibility. Columns the schema does not define (e.g. placements'
 *      denormalized display fields, which have no catch-all column) are dropped
 *      on purpose so the row matches the table exactly.
 *
 * Singletons (settings, sync_status, …) have no `id` in the seed, so a stable id
 * equal to the domain name is synthesized (idempotent across re-runs) and the
 * whole object is stored under the `value` JSONB column.
 *
 * Metadata columns (`owner_id`, `version`, `created_at`, `updated_at`) are left
 * unset so the database applies its defaults / the bump_version trigger — except
 * where a typed column intentionally maps a source timestamp (e.g. audit_log
 * `created_at` ← `timestamp`).
 */

/** Convert a snake_case column name to its camelCase seed-field counterpart. */
export function snakeToCamel(str) {
  return String(str).replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Per-domain source-field overrides for columns whose seed field name does not
 * match the default snake→camel conversion. Keyed by domain name, then column.
 * @type {Record<string, Record<string, string>>}
 */
export const FIELD_OVERRIDES = Object.freeze({
  // Facilities seed uses `organisationName`/`healthcareGroup`, not `name`/`groupName`.
  facilities: { name: 'organisationName', group_name: 'healthcareGroup' },
  // Documents seed uses `type` for the document type.
  documents: { doc_type: 'type' },
  // Audit log seed uses `user`/`timestamp` for the actor and event time.
  auditLog: { actor: 'user', created_at: 'timestamp' },
});

/**
 * Determine the catch-all JSONB column for a domain — the sink that receives all
 * seed fields not mapped to a typed or named JSONB column. Preference order:
 * `attributes` (collections), then `value` (singletons), then `detail` (the
 * single JSONB column on audit_log). Returns null when the domain declares only
 * specific named JSONB columns and no catch-all (e.g. placements), in which case
 * unmapped fields are intentionally dropped.
 *
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @returns {string|null}
 */
export function getCatchAllColumn(domain) {
  const jsonb = domain.jsonbColumns || [];
  if (jsonb.includes('attributes')) return 'attributes';
  if (jsonb.includes('value')) return 'value';
  if (jsonb.length === 1 && jsonb[0] === 'detail') return 'detail';
  return null;
}

/** Resolve the seed source-field name for a given column of a domain. */
function sourceFieldFor(domain, column) {
  const overrides = FIELD_OVERRIDES[domain.name] || {};
  return overrides[column] || snakeToCamel(column);
}

/**
 * Transform a single collection record into a DB row.
 *
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @param {Record<string, unknown>} obj Seed object (must carry a primary key).
 * @returns {Record<string, unknown>} Row keyed by DB column names.
 */
export function transformCollectionRecord(domain, obj) {
  const row = {};
  const consumed = new Set();

  // 1) Preserve the primary key verbatim (Req 5.3, 11.7).
  row[domain.primaryKey] = obj[domain.primaryKey];
  consumed.add(domain.primaryKey);

  // 2) Typed columns.
  for (const column of domain.typedColumns || []) {
    const field = sourceFieldFor(domain, column);
    consumed.add(field);
    row[column] = obj[field] === undefined ? null : obj[field];
  }

  const catchAll = getCatchAllColumn(domain);

  // 3) Named JSONB columns (everything except the catch-all sink).
  for (const column of domain.jsonbColumns || []) {
    if (column === catchAll) continue;
    const field = sourceFieldFor(domain, column);
    consumed.add(field);
    if (obj[field] !== undefined) row[column] = obj[field];
    // Absent → let the DB default (`{}`/`[]`) apply.
  }

  // 4) Remaining fields → catch-all JSONB column (when the schema defines one).
  if (catchAll) {
    const remainder = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!consumed.has(key)) remainder[key] = value;
    }
    row[catchAll] = remainder;
  }

  return row;
}

/**
 * Transform a singleton seed object into its single DB row. A stable id equal to
 * the domain name is used so re-runs upsert the same row (idempotent), and the
 * entire object is stored under the `value` JSONB column.
 *
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @param {Record<string, unknown>|null} obj
 * @returns {Record<string, unknown>}
 */
export function transformSingleton(domain, obj) {
  const catchAll = getCatchAllColumn(domain) || 'value';
  return { [domain.primaryKey]: domain.name, [catchAll]: obj ?? {} };
}

/**
 * Transform a domain's whole source into the array of rows to upsert.
 * Collections map each element; singletons produce zero or one row.
 *
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @param {unknown} source Array (collection) or object/null (singleton).
 * @returns {Record<string, unknown>[]}
 */
export function toRows(domain, source) {
  if (domain.kind === 'collection') {
    const list = Array.isArray(source) ? source : [];
    return list.map((obj) => transformCollectionRecord(domain, obj));
  }
  // Singleton: null/undefined ⇒ nothing to migrate.
  if (source == null) return [];
  return [transformSingleton(domain, source)];
}

/**
 * Extract the source-record identifiers for a domain's source (used by the
 * migration identity checks / Property 5). Collections use each record's primary
 * key; singletons use the synthesized domain-name id when present.
 *
 * @param {import('../dataLayer/domains').DomainConfig} domain
 * @param {unknown} source
 * @returns {string[]}
 */
export function sourceIds(domain, source) {
  if (domain.kind === 'collection') {
    const list = Array.isArray(source) ? source : [];
    return list.map((obj) => obj[domain.primaryKey]);
  }
  return source == null ? [] : [domain.name];
}
