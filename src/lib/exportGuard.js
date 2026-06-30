/**
 * Export guard — shared, framework-agnostic helpers that every data-export
 * (and the Integrations import) path in the app routes through so that:
 *
 *   1. exports are gated behind authentication + the LIVE role-permission
 *      matrix (enforced in the handler, not merely by hiding buttons), and
 *   2. every attempt — allowed AND denied — is recorded in the existing audit
 *      log so it shows up in the Audit Trail with no extra wiring.
 *
 * The React glue lives in `useExport()` (src/hooks/useExport.js); this module
 * holds the pure functions so they can be unit-tested in isolation.
 *
 * NOTE on `ipAddress`: Propela Ops is a front-end-only demo with no backend, so
 * there is no server request to attribute to a real client IP. Audit entries
 * created here use the literal `'client'` to make that explicit. When a backend
 * is introduced the export MUST be authorized AND audited server-side, where
 * the real request IP can be captured.
 */

/** Audit `action` values written for export/import attempts. */
export const EXPORT_ACTION = 'EXPORT';
export const EXPORT_DENIED_ACTION = 'EXPORT_DENIED';
export const IMPORT_ACTION = 'IMPORT';
export const IMPORT_DENIED_ACTION = 'IMPORT_DENIED';

/** Placeholder IP for client-only (no-backend) audit entries. */
export const CLIENT_IP = 'client';

/** Standard user-facing message shown when an export is blocked. */
export const EXPORT_DENIED_MESSAGE = "You don't have permission to export this data.";

/**
 * Generate a unique id for an audit entry using the Web Crypto API.
 *
 * Prefers `crypto.randomUUID()`; falls back to `crypto.getRandomValues()` so we
 * never rely on `Math.random()` for identifiers. The final string fallback only
 * runs in environments without Web Crypto at all (not browsers/Node 18+).
 *
 * @returns {string}
 */
export function generateAuditId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `audit-${Date.now()}`;
}

/**
 * Reduce a filters object to a short, human-readable list of the *active*
 * filters (ignoring empty / "All" sentinel values used across the export UIs).
 *
 * @param {Record<string, unknown>|null|undefined} filters
 * @returns {string[]} e.g. ["stage=Placed", "cohort=Jan 2025"]
 */
export function summarizeFilters(filters) {
  if (!filters || typeof filters !== 'object') return [];
  return Object.entries(filters)
    .filter(([, value]) => {
      if (value == null) return false;
      const str = String(value).trim();
      return str !== '' && str.toLowerCase() !== 'all';
    })
    .map(([key, value]) => `${key}=${value}`);
}

/**
 * Build a human-readable `details` string for an export/import audit entry.
 *
 * @param {object} args
 * @param {boolean} args.allowed
 * @param {string} args.entityType
 * @param {string} [args.format]
 * @param {number|null} [args.recordCount]
 * @param {Record<string, unknown>|null} [args.filters]
 * @param {string|null} [args.module]
 * @param {string} [args.verb] - "export" (default) or "import"
 * @returns {string}
 */
export function buildExportDetails({
  allowed,
  entityType,
  format,
  recordCount,
  filters,
  module,
  verb = 'export',
}) {
  const fmt = format ? String(format).toUpperCase() : 'CSV';
  const countPart =
    typeof recordCount === 'number'
      ? `${recordCount} record${recordCount === 1 ? '' : 's'}`
      : 'data';
  const activeFilters = summarizeFilters(filters);
  const filterPart = activeFilters.length ? ` (filters: ${activeFilters.join(', ')})` : '';
  const noun = entityType || 'data';

  if (allowed) {
    const action = verb === 'import' ? 'Imported' : 'Exported';
    return `${action} ${countPart} of ${noun} as ${fmt}${filterPart}`;
  }
  const moduleName = module || 'this data';
  const action = verb === 'import' ? 'Blocked import' : 'Blocked export';
  return `${action} of ${noun} as ${fmt}${filterPart} — insufficient permission for ${moduleName}`;
}

/**
 * Build an audit-log entry for an export/import attempt, matching the existing
 * audit entry shape:
 *   { id, timestamp, user, action, entityType, entityId, ipAddress, details, severity }
 *
 * @param {object} args
 * @param {boolean} args.allowed - outcome of the permission check
 * @param {string} args.user - current user's name/email
 * @param {string} [args.entityType] - the data type being exported
 * @param {string|null} [args.module] - permission module that gated the action
 * @param {string} [args.format] - file format (CSV/JSON/TXT...)
 * @param {number|null} [args.recordCount] - number of records in the payload
 * @param {Record<string, unknown>|null} [args.filters] - active filters
 * @param {string} [args.action] - override the allowed action name
 * @param {string} [args.deniedAction] - override the denied action name
 * @param {string} [args.verb] - "export" (default) or "import"
 * @returns {{id:string,timestamp:string,user:string,action:string,entityType:string,entityId:string,ipAddress:string,details:string,severity:string}}
 */
export function buildExportAuditEntry({
  allowed,
  user,
  entityType = 'data',
  module = null,
  format = 'CSV',
  recordCount = null,
  filters = null,
  action,
  deniedAction,
  verb = 'export',
}) {
  const defaultAllowed = verb === 'import' ? IMPORT_ACTION : EXPORT_ACTION;
  const defaultDenied = verb === 'import' ? IMPORT_DENIED_ACTION : EXPORT_DENIED_ACTION;

  return {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    user: user || 'Unknown user',
    action: allowed ? action || defaultAllowed : deniedAction || defaultDenied,
    entityType: entityType || 'data',
    entityId: module || verb,
    ipAddress: CLIENT_IP,
    details: buildExportDetails({ allowed, entityType, format, recordCount, filters, module, verb }),
    severity: allowed ? 'info' : 'warning',
  };
}
