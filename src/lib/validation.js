/**
 * validation.js — the single, framework-agnostic input validation &
 * sanitization utility for the whole app.
 *
 * Every form's submit/save handler routes its validation and text
 * sanitization through this module so the rules live in exactly one place.
 * Do NOT re-introduce bespoke per-component checks (e.g. `if (!form.email)
 * return;` truthiness guards) — call the helpers here instead. This mirrors
 * the existing src/lib/ precedent (csv.js, secureRandom.js, exportGuard.js) of
 * keeping correctness/security-sensitive logic out of components.
 *
 * Two complementary concerns are handled here:
 *
 *   1. SANITIZATION (data hygiene) — `sanitizeText()` coerces a value to a
 *      string, strips control characters, normalizes whitespace and enforces a
 *      length cap *before the value is written to state/storage*. This keeps
 *      persisted (and later CSV-exported) data clean. It is COMPLEMENTARY to
 *      Fix #5: csv.js still neutralizes spreadsheet formula injection at export
 *      time; this utility stops oversized/garbage input from being stored in
 *      the first place. The two do not overlap and neither replaces the other.
 *
 *   2. VALIDATION (input correctness + protocol safety) — `validateEmail`,
 *      `validateUrl`, `validateNumber`, `validateRequired`, `validateLength`
 *      reject malformed input. `validateUrl` enforces a protocol allowlist
 *      (http/https by default) so `javascript:`, `data:`, `file:` and other
 *      dangerous/oblique schemes can never be persisted as a webhook /
 *      integration endpoint.
 *
 * NOTE: React escapes rendered output by default and the app has no
 * dangerouslySetInnerHTML sinks, so this module is deliberately NOT about
 * HTML-escaping for display — it does not encode `<`, `>`, `&` etc. Doing so
 * would double-escape on screen. The job here is input correctness, protocol
 * safety and storage hygiene only.
 */

/**
 * Sensible default length caps, exported so forms can opt into a shared scale
 * instead of inventing ad-hoc numbers. Generous enough to never truncate a
 * legitimate value, tight enough to stop abuse / runaway payloads.
 */
export const MAX_LENGTHS = {
  NAME: 120,
  EMAIL: 254, // RFC 5321 maximum length of an email address
  URL: 2048, // de-facto browser URL length limit
  SHORT_TEXT: 200, // single-line free text (subjects, locations, platforms…)
  LONG_TEXT: 5000, // multi-line free text (notes, message bodies…)
};

/** Default cap applied by sanitizeText when the caller does not specify one. */
const DEFAULT_MAX_LENGTH = MAX_LENGTHS.LONG_TEXT;

/**
 * RFC-ish email check: a non-empty local part, an `@`, a domain with at least
 * one dot and a 2+ char TLD, and no whitespace anywhere. Deliberately stricter
 * than "contains an @" but not a full RFC 5322 parser (which is impractical and
 * rejects almost nothing useful). Catches the real-world mistakes: missing
 * domain, missing TLD, stray spaces, multiple @.
 */
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

/**
 * Coerce a value to a clean, storage-safe string.
 *
 * Steps, in order:
 *   1. null/undefined -> '' (so callers never store the literal "null").
 *   2. Strip control characters (C0 range 0x00–0x1F and DEL 0x7F). When
 *      `allowNewlines` is true, newlines and tabs are preserved (and CRLF/CR
 *      are normalized to LF) because they are meaningful in textareas; all
 *      other control chars are still removed.
 *   3. Trim leading/trailing whitespace (unless `trim` is false).
 *   4. Cap length to `maxLength` (characters).
 *
 * The `trim` option exists for "live" inline editors that persist on every
 * keystroke (e.g. CohortCard / acquisition detail panes). Trimming on each
 * keystroke would make it impossible to type a space between words, so those
 * call sites pass `{ trim: false }` to keep control-char stripping + length
 * capping while leaving interior/edge whitespace alone during editing.
 *
 * @param {*} value any value; coerced to string
 * @param {object} [opts]
 * @param {number} [opts.maxLength] max length in characters (default LONG_TEXT)
 * @param {boolean} [opts.allowNewlines] keep \n / \t (for multi-line fields)
 * @param {boolean} [opts.trim] trim leading/trailing whitespace (default true)
 * @returns {string} a control-char-stripped, length-capped (and by default
 *   trimmed) string
 */
export function sanitizeText(value, { maxLength = DEFAULT_MAX_LENGTH, allowNewlines = false, trim = true } = {}) {
  if (value === null || value === undefined) return '';
  let str = String(value);

  if (allowNewlines) {
    // Normalize CRLF / lone CR to LF, then strip every control char except
    // tab (0x09) and newline (0x0A).
    // eslint-disable-next-line no-control-regex -- intentionally targeting C0 control chars
    str = str.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  } else {
    // Single-line field: strip ALL control characters.
    // eslint-disable-next-line no-control-regex -- intentionally targeting C0 control chars + DEL
    str = str.replace(/[\u0000-\u001F\u007F]/g, '');
  }

  if (trim) {
    str = str.trim();
  }

  if (typeof maxLength === 'number' && maxLength >= 0 && str.length > maxLength) {
    str = str.slice(0, maxLength);
  }
  return str;
}

/**
 * True when a value is "present": a non-blank string, a non-empty array, or
 * any non-null/undefined scalar. Whitespace-only strings count as empty.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function validateRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * True when the value's string length is within [min, max].
 *
 * @param {*} value coerced to string ('' for null/undefined)
 * @param {object} [opts]
 * @param {number} [opts.min] inclusive minimum length (default 0)
 * @param {number} [opts.max] inclusive maximum length (default Infinity)
 * @returns {boolean}
 */
export function validateLength(value, { min = 0, max = Infinity } = {}) {
  const len = value === null || value === undefined ? 0 : String(value).length;
  return len >= min && len <= max;
}

/**
 * RFC-ish email format check (see EMAIL_RE). Trims first; empty -> false.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function validateEmail(value) {
  if (typeof value !== 'string') return false;
  const str = value.trim();
  if (str.length === 0 || str.length > MAX_LENGTHS.EMAIL) return false;
  return EMAIL_RE.test(str);
}

/**
 * Validate a URL by parsing it with the URL API and enforcing a protocol
 * allowlist. This is the protocol-safety gate for webhook / integration
 * endpoints: only schemes in `protocols` are accepted, so `javascript:`,
 * `data:`, `file:`, `blob:`, etc. are rejected even though the browser's
 * `type="url"` attribute would happily accept some of them.
 *
 * @param {*} value
 * @param {object} [opts]
 * @param {string[]} [opts.protocols] allowed schemes WITHOUT the trailing ':'
 *   (default ['http', 'https'])
 * @returns {boolean}
 */
export function validateUrl(value, { protocols = ['http', 'https'] } = {}) {
  if (typeof value !== 'string') return false;
  const str = value.trim();
  if (str.length === 0 || str.length > MAX_LENGTHS.URL) return false;

  let parsed;
  try {
    parsed = new URL(str);
  } catch {
    return false; // not an absolute, parseable URL
  }

  // url.protocol is e.g. "https:" — strip the trailing colon and compare
  // case-insensitively against the allowlist.
  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  const allowed = protocols.map((p) => p.toLowerCase());
  return allowed.includes(scheme);
}

/**
 * Validate a number (optionally bounded / integer-only).
 *
 * Accepts a number or a numeric string. Empty string, null, undefined, NaN and
 * non-numeric strings all fail. `min`/`max` are inclusive.
 *
 * @param {*} value
 * @param {object} [opts]
 * @param {number} [opts.min] inclusive lower bound
 * @param {number} [opts.max] inclusive upper bound
 * @param {boolean} [opts.integer] require an integer
 * @returns {boolean}
 */
export function validateNumber(value, { min, max, integer = false } = {}) {
  if (value === null || value === undefined || value === '') return false;
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) return false;
  if (integer && !Number.isInteger(num)) return false;
  if (typeof min === 'number' && num < min) return false;
  if (typeof max === 'number' && num > max) return false;
  return true;
}

/**
 * Produce the error message for a single field given its rule set, or `null`
 * when the field is valid. Used by `validateForm`; exported for callers that
 * want to validate one field at a time.
 *
 * Supported rules (all optional):
 *   - label:     {string}  human name used in messages (default "This field")
 *   - required:  {boolean} must be present (see validateRequired)
 *   - email:     {boolean} must pass validateEmail
 *   - url:       {boolean|{protocols}} must pass validateUrl
 *   - number:    {boolean|{min,max,integer}} must pass validateNumber
 *   - minLength: {number}  minimum string length
 *   - maxLength: {number}  maximum string length
 *
 * Optional empty fields short-circuit to valid (so an optional email left
 * blank is fine, but a filled-in malformed one is rejected).
 *
 * @param {*} value
 * @param {object} rules
 * @returns {string|null}
 */
export function getFieldError(value, rules = {}) {
  const label = rules.label || 'This field';

  const empty =
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  if (rules.required && empty) {
    return `${label} is required.`;
  }
  // Optional + empty: nothing else to check.
  if (empty) return null;

  if (rules.email && !validateEmail(value)) {
    return `${label} must be a valid email address.`;
  }

  if (rules.url) {
    const urlOpts = typeof rules.url === 'object' ? rules.url : undefined;
    if (!validateUrl(value, urlOpts)) {
      const protos = (urlOpts && urlOpts.protocols) || ['http', 'https'];
      return `${label} must be a valid ${protos.join('/')} URL.`;
    }
  }

  if (rules.number) {
    const numOpts = typeof rules.number === 'object' ? rules.number : {};
    if (!validateNumber(value, numOpts)) {
      const bounds = [];
      if (typeof numOpts.min === 'number') bounds.push(`min ${numOpts.min}`);
      if (typeof numOpts.max === 'number') bounds.push(`max ${numOpts.max}`);
      const boundStr = bounds.length ? ` (${bounds.join(', ')})` : '';
      return `${label} must be a valid${numOpts.integer ? ' whole' : ''} number${boundStr}.`;
    }
  }

  if (typeof rules.minLength === 'number' && !validateLength(value, { min: rules.minLength })) {
    return `${label} must be at least ${rules.minLength} characters.`;
  }

  if (typeof rules.maxLength === 'number' && !validateLength(value, { max: rules.maxLength })) {
    return `${label} must be ${rules.maxLength} characters or fewer.`;
  }

  return null;
}

/**
 * Tiny schema runner: validate a `values` object against a `schema` mapping of
 * field -> rules (see getFieldError). Returns `{ valid, errors }` where
 * `errors` maps each invalid field to its first error message.
 *
 * @param {Record<string, *>} values
 * @param {Record<string, object>} schema
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateForm(values, schema) {
  const errors = {};
  for (const [field, rules] of Object.entries(schema)) {
    const error = getFieldError(values ? values[field] : undefined, rules);
    if (error) errors[field] = error;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
