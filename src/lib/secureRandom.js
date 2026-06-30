/**
 * secureRandom.js — cryptographically secure token / key / secret generation.
 *
 * Every security-sensitive value in the app (API keys, webhook signing secrets)
 * routes through this single module so we NEVER rely on `Math.random()`, which
 * is predictable and low-entropy and therefore unsafe for secrets. All output
 * is derived from the Web Crypto API (`crypto.getRandomValues`), following the
 * precedent already established in this repo:
 *   - src/lib/exportGuard.js  → generateAuditId() (crypto.randomUUID / getRandomValues)
 *   - src/data/authUsers.js   → sha256Hex()       (crypto.subtle.digest)
 *
 * Keep bespoke key/secret logic out of components — call the helpers here.
 */

/**
 * Return `length` cryptographically secure random bytes as a Uint8Array.
 *
 * Source preference mirrors generateAuditId():
 *   1. crypto.getRandomValues()  — the primary CSPRNG source.
 *   2. crypto.randomUUID()       — also CSPRNG-backed; used only to derive bytes
 *      on the rare runtime that exposes randomUUID but not getRandomValues.
 *
 * If NO Web Crypto source exists at all we deliberately fail closed by throwing,
 * rather than degrading to `Math.random()` (or any predictable value) for a
 * secret. Failing closed is the safe fallback: better to refuse than to mint a
 * guessable key. (Web Crypto is available in every browser and Node 18+, so the
 * throw effectively never fires in supported environments.)
 *
 * @param {number} length number of bytes to generate
 * @returns {Uint8Array}
 */
function secureRandomBytes(length) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint8Array(length));
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const bytes = new Uint8Array(length);
    let filled = 0;
    while (filled < length) {
      const hex = crypto.randomUUID().replace(/-/g, ''); // 32 hex chars = 16 random bytes
      for (let i = 0; i + 1 < hex.length && filled < length; i += 2) {
        bytes[filled++] = parseInt(hex.slice(i, i + 2), 16);
      }
    }
    return bytes;
  }
  throw new Error('Web Crypto API unavailable: refusing to generate an insecure secret.');
}

/**
 * Generate `length` lowercase hex characters from secure random bytes.
 *
 * Bias-free by construction: each random byte (0x00–0xFF) maps to exactly two
 * hex characters via a direct, lossless 1:1 encoding, so every hex symbol is
 * equally likely. We generate ceil(length / 2) bytes and trim to `length`.
 *
 * @param {number} length number of hex characters to return
 * @returns {string}
 */
export function randomHex(length) {
  const bytes = secureRandomBytes(Math.ceil(length / 2));
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex.slice(0, length);
}

/** Default token charset: 36 lowercase-alphanumeric chars (0-9a-z). */
const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a random token of `length` characters drawn uniformly from
 * `alphabet`, with an optional `prefix`.
 *
 * Bias-free via rejection sampling: a random byte (0–255) is mapped to the
 * alphabet only when it falls below `maxUnbiased` — the largest multiple of the
 * alphabet length that fits in a byte. Bytes in the leftover high tail are
 * discarded and re-drawn. This yields a uniform distribution even when the
 * alphabet length does not evenly divide 256 (e.g. 36), avoiding the modulo
 * bias that a naive `byte % alphabet.length` would introduce.
 *
 * @param {object} [opts]
 * @param {string} [opts.prefix] literal prefix prepended to the token
 * @param {number} [opts.length] number of random characters (excludes prefix)
 * @param {string} [opts.alphabet] characters to sample from (2–256 long)
 * @returns {string}
 */
export function randomToken({ prefix = '', length = 24, alphabet = DEFAULT_ALPHABET } = {}) {
  const n = alphabet.length;
  if (n < 2 || n > 256) {
    throw new Error('randomToken alphabet length must be between 2 and 256.');
  }
  const maxUnbiased = Math.floor(256 / n) * n;
  let out = '';
  while (out.length < length) {
    // Over-draw a little to amortise the cost of rejected bytes.
    const batch = secureRandomBytes(length - out.length + 8);
    for (let i = 0; i < batch.length && out.length < length; i++) {
      const byte = batch[i];
      if (byte < maxUnbiased) {
        out += alphabet[byte % n];
      }
    }
  }
  return prefix + out;
}

/**
 * Generate a public API key: `pk_live_` + 32 hex chars (128 bits of entropy).
 *
 * The `pk_live_` prefix is preserved intentionally so maskKey()/truncateKey()
 * keep displaying correctly; renaming key prefixes is explicitly Fix #10.
 *
 * @returns {string}
 */
export function generateApiKey() {
  return 'pk_live_' + randomHex(32);
}

/**
 * Generate a webhook signing secret: `whsec_` + 24 lowercase-alphanumeric chars.
 *
 * Preserves the original `whsec_` prefix, length (24) and charset (36-char
 * 0-9a-z) so the UI is unchanged; only the randomness source is upgraded.
 *
 * @returns {string}
 */
export function generateWebhookSecret() {
  return randomToken({ prefix: 'whsec_', length: 24, alphabet: DEFAULT_ALPHABET });
}
