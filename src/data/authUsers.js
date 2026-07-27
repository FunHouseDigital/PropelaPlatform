/**
 * Authentication credential store for Propela Ops.
 *
 * NOTE: Propela Ops is a front-end-only demo application with no backend; all
 * data (including these credentials) lives in the browser. Passwords are stored
 * as SHA-256 hashes rather than plaintext so the source does not leak the raw
 * secrets, but this is NOT a substitute for real server-side authentication.
 * When a backend is introduced, authentication MUST move server-side.
 *
 * Each account's `role` maps to a key in `settings.rolePermissions`, so the
 * effective permissions are driven by the live settings (editable in the
 * Settings > User Management screen), not by anything hardcoded here.
 *
 * Credentials — Propela Ops is operated by exactly two superadmins:
 *   Superadmins (full access to everything):
 *     - Vuyo@propela.co  / PropelaH
 *     - Aya@propela.co   / PropelaH
 */

// SHA-256("PropelaH")
const HASH_PROPELAH = '254a2bd816f78a82e76078582dbd91429e88afb6c2e08b022bfab908ce53e554';

export const AUTH_USERS = [
  { id: 'user-superadmin-vuyo', name: 'Vuyo Pakade', email: 'Vuyo@propela.co', role: 'Superadmin', passwordHash: HASH_PROPELAH },
  { id: 'user-superadmin-aya', name: 'Aya Yokwana', email: 'Aya@propela.co', role: 'Superadmin', passwordHash: HASH_PROPELAH },
];

/**
 * Compute the SHA-256 hex digest of a string using the Web Crypto API.
 * @param {string} value
 * @returns {Promise<string>} lowercase hex digest
 */
export async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Find an auth user by email (case-insensitive).
 * @param {string} email
 * @returns {object|undefined}
 */
export function findAuthUserByEmail(email) {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return AUTH_USERS.find((u) => u.email.toLowerCase() === normalized);
}
