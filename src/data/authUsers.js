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
 * Demo credentials:
 *   Superadmins (full access to everything):
 *     - Vuyo@propela.co  / PropelaH
 *     - Aya@propela.co   / PropelaH
 *   Role demo accounts (password: Propela123!):
 *     - admin@propela.co.za    (Admin)
 *     - james@propela.co.za    (Manager)
 *     - priya@propela.co.za    (Recruiter)
 *     - sarah@propela.co.za    (Read-only)
 */

// SHA-256("PropelaH")
const HASH_PROPELAH = '254a2bd816f78a82e76078582dbd91429e88afb6c2e08b022bfab908ce53e554';
// SHA-256("Propela123!")
const HASH_DEMO = 'fc5b9ec55812fb2112a68c9c0ccad5bacb33f6b4de166b4dc53367692df071d5';

export const AUTH_USERS = [
  { id: 'user-superadmin-vuyo', name: 'Vuyo Mahlangu', email: 'Vuyo@propela.co', role: 'Superadmin', passwordHash: HASH_PROPELAH },
  { id: 'user-superadmin-aya', name: 'Aya Nkosi', email: 'Aya@propela.co', role: 'Superadmin', passwordHash: HASH_PROPELAH },
  { id: 'user-1', name: 'Aya Nkosi', email: 'admin@propela.co.za', role: 'Admin', passwordHash: HASH_DEMO },
  { id: 'user-2', name: 'James Okafor', email: 'james@propela.co.za', role: 'Manager', passwordHash: HASH_DEMO },
  { id: 'user-3', name: 'Priya Sharma', email: 'priya@propela.co.za', role: 'Recruiter', passwordHash: HASH_DEMO },
  { id: 'user-5', name: 'Sarah Williams', email: 'sarah@propela.co.za', role: 'Read-only', passwordHash: HASH_DEMO },
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
