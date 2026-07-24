/**
 * useExport — the single gate that EVERY data-export (and the Integrations
 * import) path must call. It:
 *
 *   1. checks the current user is authenticated AND has the required module
 *      permission via usePermissions().can(module), reading the LIVE role
 *      matrix from settings;
 *   2. writes an audit-log entry for EVERY attempt — allowed (EXPORT) and
 *      denied (EXPORT_DENIED) — using the existing audit infrastructure
 *      (AppContext.updateAuditLog -> storage.saveAuditLog), so entries appear
 *      in the existing Audit Trail UI (AuditLogTable) with no extra wiring; and
 *   3. only runs the caller's download when allowed; otherwise it blocks the
 *      download and surfaces a clear error (returned for inline display, plus a
 *      toast).
 *
 * Enforcement lives HERE, in the handler path, so hiding/disabling buttons is
 * pure defense-in-depth — a force-called handler still cannot bypass the check.
 *
 * Module mapping (mirrors src/lib/permissions.js ROUTE_PERMISSIONS):
 *   - Reports / Export Center / Analytics report builders -> 'Analytics'
 *   - Audit log export, Integrations import/export        -> 'Settings'
 *   - Notification history export                         -> null (auth-only:
 *       a user's own notification log is low-sensitivity, so any signed-in user
 *       may export it; the attempt is still audited)
 *   - Document templates that embed a real nurse record   -> 'Nurses'
 */
import { useCallback } from 'react';

import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { buildExportAuditEntry, EXPORT_DENIED_MESSAGE } from '../lib/exportGuard';
import { getAuditLog } from '../lib/storage';
import { usePermissions } from './usePermissions';

export function useExport() {
  const { can, isAuthenticated } = usePermissions();
  const { currentUser } = useAuth();
  const { updateAuditLog, addToast } = useAppContext();

  /**
   * Pure predicate used to hide/disable export controls (defense in depth + UX).
   * @param {string|null} module
   * @returns {boolean}
   */
  const canExport = useCallback(
    (module) => isAuthenticated && can(module),
    [isAuthenticated, can]
  );

  /**
   * Run an export/import through the gate.
   *
   * @param {object} options
   * @param {string|null} options.module - permission module required (null = auth-only)
   * @param {string} [options.entityType] - data type being exported (audit entityType)
   * @param {string} [options.format] - file format for the audit details (CSV/JSON/TXT)
   * @param {number|null} [options.recordCount] - record count for the audit details
   * @param {Record<string, unknown>|null} [options.filters] - active filters for the audit details
   * @param {string} [options.verb] - "export" (default) or "import"
   * @param {string} [options.action] - override allowed action name
   * @param {string} [options.deniedAction] - override denied action name
   * @param {string} [options.deniedMessage] - override the user-facing error
   * @param {Function} performAction - the actual download/import work; only run when allowed
   * @returns {{allowed:boolean, error:string|null, entry:object}}
   */
  const runExport = useCallback(
    (options, performAction) => {
      const opts = options || {};
      const module = opts.module ?? null;
      const userName = currentUser?.name || currentUser?.email || 'Unknown user';
      const allowed = isAuthenticated && can(module);

      const entry = buildExportAuditEntry({
        allowed,
        user: userName,
        entityType: opts.entityType,
        module,
        format: opts.format,
        recordCount: opts.recordCount,
        filters: opts.filters,
        action: opts.action,
        deniedAction: opts.deniedAction,
        verb: opts.verb,
      });

      // Prepend to the freshest persisted log so rapid successive attempts are
      // never dropped due to a stale closure over context state.
      const current = getAuditLog();
      updateAuditLog([entry, ...current]);

      if (!allowed) {
        const message = opts.deniedMessage || EXPORT_DENIED_MESSAGE;
        if (typeof addToast === 'function') {
          addToast({ severity: 'warning', title: 'Export blocked', message });
        }
        return { allowed: false, error: message, entry };
      }

      try {
        if (typeof performAction === 'function') performAction();
      } catch (err) {
        // The permission check passed and is audited as EXPORT; surface any
        // failure from the download itself to the caller for inline display.
        return { allowed: true, error: err?.message || 'Export failed', entry };
      }
      return { allowed: true, error: null, entry };
    },
    [isAuthenticated, can, currentUser, updateAuditLog, addToast]
  );

  return { runExport, canExport };
}

export default useExport;
