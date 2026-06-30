import { describe, expect, it } from 'vitest';

import {
  getFieldError,
  MAX_LENGTHS,
  sanitizeText,
  validateEmail,
  validateForm,
  validateLength,
  validateNumber,
  validateRequired,
  validateUrl,
} from '../validation';

describe('sanitizeText', () => {
  it('coerces null/undefined to an empty string', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('trims leading/trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
    expect(sanitizeText('\t  spaced \n')).toBe('spaced');
  });

  it('strips control characters from single-line text', () => {
    expect(sanitizeText('a\u0000b\u0007c\u001Fd')).toBe('abcd');
    expect(sanitizeText('line1\nline2')).toBe('line1line2'); // newline is a control char here
    expect(sanitizeText('tab\there')).toBe('tabhere');
  });

  it('strips the DEL character (0x7F)', () => {
    expect(sanitizeText('foo\u007Fbar')).toBe('foobar');
  });

  it('preserves newlines and tabs when allowNewlines is set', () => {
    expect(sanitizeText('line1\nline2', { allowNewlines: true })).toBe('line1\nline2');
    expect(sanitizeText('a\tb', { allowNewlines: true })).toBe('a\tb');
  });

  it('normalizes CRLF and lone CR to LF when allowNewlines is set', () => {
    expect(sanitizeText('a\r\nb\rc', { allowNewlines: true })).toBe('a\nb\nc');
  });

  it('still strips other control chars even when allowNewlines is set', () => {
    expect(sanitizeText('a\u0000\nb', { allowNewlines: true })).toBe('a\nb');
  });

  it('caps length to maxLength', () => {
    expect(sanitizeText('abcdef', { maxLength: 3 })).toBe('abc');
  });

  it('preserves edge whitespace when trim is false (live editors)', () => {
    expect(sanitizeText('John ', { trim: false })).toBe('John ');
    expect(sanitizeText('  ab  ', { trim: false })).toBe('  ab  ');
  });

  it('still strips control chars and caps length when trim is false', () => {
    expect(sanitizeText('a\u0000b ', { trim: false })).toBe('ab ');
    expect(sanitizeText('abcdef', { trim: false, maxLength: 3 })).toBe('abc');
  });

  it('does not alter benign values within the cap', () => {
    expect(sanitizeText('Jane Doe', { maxLength: 120 })).toBe('Jane Doe');
    expect(sanitizeText('user@example.com')).toBe('user@example.com');
  });

  it('coerces numbers to their string form', () => {
    expect(sanitizeText(42)).toBe('42');
  });
});

describe('validateRequired', () => {
  it('rejects null, undefined and blank strings', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });

  it('rejects empty arrays but accepts populated ones', () => {
    expect(validateRequired([])).toBe(false);
    expect(validateRequired(['x'])).toBe(true);
  });

  it('accepts non-blank strings and scalars', () => {
    expect(validateRequired('hi')).toBe(true);
    expect(validateRequired(0)).toBe(true);
    expect(validateRequired(false)).toBe(true);
  });
});

describe('validateLength', () => {
  it('enforces min and max bounds inclusively', () => {
    expect(validateLength('abc', { min: 3, max: 3 })).toBe(true);
    expect(validateLength('ab', { min: 3 })).toBe(false);
    expect(validateLength('abcd', { max: 3 })).toBe(false);
  });

  it('treats null/undefined as length 0', () => {
    expect(validateLength(null, { min: 1 })).toBe(false);
    expect(validateLength(undefined, { max: 5 })).toBe(true);
  });
});

describe('validateEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('first.last+tag@sub.domain.co.za')).toBe(true);
    expect(validateEmail('  trimmed@example.com  ')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(validateEmail('plainstring')).toBe(false);
    expect(validateEmail('no-at-sign.com')).toBe(false);
    expect(validateEmail('missing@tld')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@@example.com')).toBe(false);
    expect(validateEmail('user @example.com')).toBe(false);
    expect(validateEmail('user@example .com')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(123)).toBe(false);
  });

  it('rejects addresses longer than the RFC maximum', () => {
    const huge = 'a'.repeat(MAX_LENGTHS.EMAIL) + '@example.com';
    expect(validateEmail(huge)).toBe(false);
  });
});

describe('validateUrl — protocol allowlist', () => {
  it('accepts http and https by default', () => {
    expect(validateUrl('https://example.com/webhook')).toBe(true);
    expect(validateUrl('http://example.com')).toBe(true);
    expect(validateUrl('  https://example.com  ')).toBe(true);
  });

  it('rejects javascript: URLs', () => {
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects data: URLs', () => {
    expect(validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects file: and other non-allowlisted schemes', () => {
    expect(validateUrl('file:///etc/passwd')).toBe(false);
    expect(validateUrl('ftp://example.com')).toBe(false);
    expect(validateUrl('blob:https://example.com/uuid')).toBe(false);
  });

  it('rejects values that are not absolute, parseable URLs', () => {
    expect(validateUrl('not a url')).toBe(false);
    expect(validateUrl('example.com')).toBe(false); // no scheme
    expect(validateUrl('')).toBe(false);
    expect(validateUrl(null)).toBe(false);
  });

  it('honours a custom protocol allowlist', () => {
    expect(validateUrl('ftp://example.com', { protocols: ['ftp'] })).toBe(true);
    expect(validateUrl('https://example.com', { protocols: ['ftp'] })).toBe(false);
  });
});

describe('validateNumber', () => {
  it('accepts numbers and numeric strings', () => {
    expect(validateNumber(5)).toBe(true);
    expect(validateNumber('5')).toBe(true);
    expect(validateNumber('  42  ')).toBe(true);
    expect(validateNumber(-3.5)).toBe(true);
  });

  it('rejects non-numeric / empty values', () => {
    expect(validateNumber('')).toBe(false);
    expect(validateNumber('abc')).toBe(false);
    expect(validateNumber(null)).toBe(false);
    expect(validateNumber(undefined)).toBe(false);
    expect(validateNumber(NaN)).toBe(false);
    expect(validateNumber(Infinity)).toBe(false);
  });

  it('enforces min/max bounds inclusively', () => {
    expect(validateNumber(5, { min: 0, max: 10 })).toBe(true);
    expect(validateNumber(-1, { min: 0 })).toBe(false);
    expect(validateNumber(11, { max: 10 })).toBe(false);
    expect(validateNumber(0, { min: 0, max: 0 })).toBe(true);
  });

  it('enforces integer-only when requested', () => {
    expect(validateNumber(3, { integer: true })).toBe(true);
    expect(validateNumber(3.5, { integer: true })).toBe(false);
    expect(validateNumber('7', { integer: true })).toBe(true);
  });
});

describe('getFieldError', () => {
  it('returns null for a valid value', () => {
    expect(getFieldError('Jane', { label: 'Name', required: true, maxLength: 10 })).toBeNull();
  });

  it('flags a missing required field', () => {
    expect(getFieldError('', { label: 'Name', required: true })).toBe('Name is required.');
  });

  it('skips checks for an optional empty field', () => {
    expect(getFieldError('', { label: 'Email', email: true })).toBeNull();
  });

  it('flags a malformed optional email that is filled in', () => {
    expect(getFieldError('nope', { label: 'Email', email: true })).toBe(
      'Email must be a valid email address.'
    );
  });

  it('flags a bad URL with the allowed protocols in the message', () => {
    expect(getFieldError('javascript:alert(1)', { label: 'URL', url: true })).toBe(
      'URL must be a valid http/https URL.'
    );
  });

  it('flags an out-of-range number', () => {
    expect(getFieldError(99, { label: 'Reach', number: { min: 0, max: 10 } })).toBe(
      'Reach must be a valid number (min 0, max 10).'
    );
  });

  it('flags an over-length value', () => {
    expect(getFieldError('abcdef', { label: 'Code', maxLength: 3 })).toBe(
      'Code must be 3 characters or fewer.'
    );
  });
});

describe('validateForm', () => {
  const schema = {
    name: { label: 'Name', required: true, maxLength: 120 },
    email: { label: 'Email', required: true, email: true },
    url: { label: 'URL', url: true },
    reach: { label: 'Reach', number: { min: 0, integer: true } },
  };

  it('reports valid for a clean payload', () => {
    const result = validateForm(
      { name: 'Jane', email: 'jane@example.com', url: 'https://x.com', reach: 5 },
      schema
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('collects an error per invalid field', () => {
    const result = validateForm(
      { name: '', email: 'bad', url: 'javascript:1', reach: -2 },
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.url).toBeDefined();
    expect(result.errors.reach).toBeDefined();
  });

  it('allows optional fields to be omitted', () => {
    const result = validateForm({ name: 'Jane', email: 'jane@example.com' }, schema);
    expect(result.valid).toBe(true);
  });
});
