/**
 * Supabase client module.
 *
 * Instantiates a single shared `supabase-js` client from the validated
 * frontend configuration. Only the public, RLS-constrained values are ever
 * referenced here:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * The privileged service_role key and the database password are NEVER read,
 * imported, or referenced in this module (Req 7.2). All transport is over
 * HTTPS: Supabase project URLs are https, and this module additionally guards
 * against a non-https URL so no Data_Domain request is ever attempted over an
 * insecure connection (Req 10.1).
 *
 * Import-safety: creating the client requires configuration to be present, and
 * the `SUPABASE_BACKEND` feature flag defaults OFF, so merely importing this
 * module in the legacy `localStorage` path must never throw. The client is
 * therefore created lazily and memoized: nothing happens at import time; the
 * client is only constructed on the first call to `getSupabaseClient()`.
 */

import { createClient } from '@supabase/supabase-js';

import { validateSupabaseConfig } from './config';

// Memoized singleton — created on first use, reused thereafter (Req 7.1).
let client = null;

/**
 * Returns the shared `supabase-js` client, creating it on first use and
 * returning the same instance on every subsequent call.
 *
 * The client is configured with only the public Supabase URL and anon key.
 * `supabase-js` automatically attaches the authenticated session's JWT as a
 * Bearer token to every request, so callers do not manage tokens directly
 * (Req 3.7, 10.1).
 *
 * @throws {Error} when required configuration (`VITE_SUPABASE_URL` or
 *   `VITE_SUPABASE_ANON_KEY`) is missing/empty, or when the configured URL is
 *   not an HTTPS endpoint.
 * @returns {import('@supabase/supabase-js').SupabaseClient} the shared client.
 */
export function getSupabaseClient() {
  if (client) {
    return client;
  }

  const { ok, missing } = validateSupabaseConfig();
  if (!ok) {
    throw new Error(
      `Supabase client cannot be created: missing configuration ${missing.join(', ')}`,
    );
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Enforce HTTPS-only transport (Req 10.1). Supabase URLs are https by
  // default; reject anything else rather than transmit over an insecure link.
  if (!/^https:\/\//i.test(url)) {
    throw new Error('Supabase URL must use HTTPS (Req 10.1)');
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}

/**
 * Resets the memoized client. Intended for tests that need to re-evaluate the
 * client with a different configuration; not used by application code.
 */
export function resetSupabaseClient() {
  client = null;
}

export default getSupabaseClient;
