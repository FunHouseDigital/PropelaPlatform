/**
 * Security headers / Content-Security-Policy policy guard (Security Fix #7).
 *
 * nginx config is not exercisable by the JS unit suite, so this test reads the
 * nginx configuration FILES as text and asserts the policy invariants. It is
 * intentionally dependency-free (only node:fs / node:path + vitest) and is
 * designed to FAIL loudly if someone later:
 *   - reintroduces a wildcard source (e.g. `connect-src 'self' https:`),
 *   - weakens script-src with 'unsafe-inline' / 'unsafe-eval',
 *   - drops one of the required hardening headers/directives,
 *   - de-syncs the CSP font origins from what index.html actually loads, or
 *   - reintroduces copy-pasted header blocks instead of the shared include.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Repo root = three levels up from src/lib/__tests__/
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const NGINX_CONF = readFileSync(resolve(REPO_ROOT, 'nginx.conf'), 'utf8');
const HEADERS_CONF = readFileSync(resolve(REPO_ROOT, 'security-headers.conf'), 'utf8');
const INDEX_HTML = readFileSync(resolve(REPO_ROOT, 'index.html'), 'utf8');

const INCLUDE_DIRECTIVE = 'include /etc/nginx/security-headers.conf;';

/**
 * Parse a CSP header value into { directiveName: [sources...] }.
 */
function parseCsp(cspValue) {
  const map = {};
  for (const part of cspValue.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const name = tokens.shift();
    map[name] = tokens;
  }
  return map;
}

/**
 * Extract every `server { ... }` / `location <match> { ... }` block from an
 * nginx config using brace matching. Returns [{ label, body }].
 */
function extractBlocks(text) {
  const blocks = [];
  const re = /(location\s+[^{]+|server)\s*\{/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const label = m[1].trim().replace(/\s+/g, ' ');
    let depth = 1;
    let i = re.lastIndex;
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      i++;
    }
    blocks.push({ label, body: text.slice(re.lastIndex, i - 1) });
  }
  return blocks;
}

// Pull the single CSP value out of the shared snippet.
const cspMatch = HEADERS_CONF.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/i);
const csp = cspMatch ? parseCsp(cspMatch[1]) : {};

describe('security-headers.conf: required headers present exactly once', () => {
  const REQUIRED_HEADERS = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
    'Strict-Transport-Security',
    'Content-Security-Policy',
  ];

  it.each(REQUIRED_HEADERS)('declares %s', (header) => {
    const re = new RegExp(`add_header\\s+${header}\\b`, 'i');
    expect(re.test(HEADERS_CONF)).toBe(true);
  });

  it('defines the CSP exactly once (single source of truth)', () => {
    const occurrences = HEADERS_CONF.match(/add_header\s+Content-Security-Policy/gi) || [];
    expect(occurrences).toHaveLength(1);
  });

  it('parsed a non-empty CSP', () => {
    expect(cspMatch).not.toBeNull();
    expect(Object.keys(csp).length).toBeGreaterThan(0);
  });
});

describe('CSP: required hardening directives', () => {
  it("keeps default-src 'self'", () => {
    expect(csp['default-src']).toEqual(["'self'"]);
  });

  it("includes object-src 'none'", () => {
    expect(csp['object-src']).toEqual(["'none'"]);
  });

  it("includes frame-ancestors 'self'", () => {
    expect(csp['frame-ancestors']).toContain("'self'");
  });

  it("includes base-uri 'self'", () => {
    expect(csp['base-uri']).toContain("'self'");
  });

  it("includes form-action 'self'", () => {
    expect(csp['form-action']).toContain("'self'");
  });

  it("includes worker-src 'self' for the PWA service worker", () => {
    expect(csp['worker-src']).toContain("'self'");
  });
});

describe('CSP: script-src stays strict', () => {
  it('contains a script-src directive', () => {
    expect(csp['script-src']).toBeDefined();
  });

  it("includes 'self'", () => {
    expect(csp['script-src']).toContain("'self'");
  });

  it('does NOT allow unsafe-inline', () => {
    expect(csp['script-src']).not.toContain("'unsafe-inline'");
  });

  it('does NOT allow unsafe-eval', () => {
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
  });
});

describe('CSP: style-src keeps unsafe-inline (recharts / inline styles)', () => {
  it("includes 'self' and 'unsafe-inline'", () => {
    expect(csp['style-src']).toContain("'self'");
    expect(csp['style-src']).toContain("'unsafe-inline'");
  });
});

describe('CSP: connect-src and img-src are not blanket https:', () => {
  it("connect-src is not the wildcard 'https:' scheme", () => {
    expect(csp['connect-src']).toBeDefined();
    expect(csp['connect-src']).not.toContain('https:');
    expect(csp['connect-src']).toContain("'self'");
  });

  it("img-src is not the wildcard 'https:' scheme", () => {
    expect(csp['img-src']).toBeDefined();
    expect(csp['img-src']).not.toContain('https:');
    expect(csp['img-src']).toContain("'self'");
  });

  it('no directive uses the bare https: scheme-source wildcard', () => {
    for (const [name, sources] of Object.entries(csp)) {
      expect(sources, `${name} must not contain bare https:`).not.toContain('https:');
      expect(sources, `${name} must not contain bare http:`).not.toContain('http:');
    }
  });
});

describe('CSP <-> index.html font consistency', () => {
  const htmlUsesGoogleapis = INDEX_HTML.includes('fonts.googleapis.com');
  const htmlUsesGstatic = INDEX_HTML.includes('fonts.gstatic.com');
  const styleSrc = csp['style-src'] || [];
  const fontSrc = csp['font-src'] || [];
  const cspAllowsGoogleapis = styleSrc.some((s) => s.includes('fonts.googleapis.com'));
  const cspAllowsGstatic = fontSrc.some((s) => s.includes('fonts.gstatic.com'));

  it('if index.html links the Google Fonts stylesheet, style-src must allow it', () => {
    if (htmlUsesGoogleapis) {
      expect(cspAllowsGoogleapis).toBe(true);
    }
  });

  it('if index.html loads gstatic font files, font-src must allow it', () => {
    if (htmlUsesGstatic) {
      expect(cspAllowsGstatic).toBe(true);
    }
  });

  it('if the CSP allows the Google Fonts stylesheet origin, index.html must use it (no drift)', () => {
    if (cspAllowsGoogleapis) {
      expect(htmlUsesGoogleapis).toBe(true);
    }
  });

  it('if the CSP allows the gstatic font origin, index.html must use it (no drift)', () => {
    if (cspAllowsGstatic) {
      expect(htmlUsesGstatic).toBe(true);
    }
  });
});

describe('nginx.conf: headers applied to every served location (no add_header inheritance gap)', () => {
  const blocks = extractBlocks(NGINX_CONF);
  const serverBlock = blocks.find((b) => b.label === 'server');

  it('has a server block', () => {
    expect(serverBlock).toBeDefined();
  });

  it('includes the shared snippet at server scope (so location / inherits it)', () => {
    // server scope = everything before the first nested location *directive*
    // (anchored to line start so the word "location" in a comment is ignored).
    const firstLocationIdx = serverBlock.body.search(/^\s*location\s+\S.*\{/m);
    const serverScope =
      firstLocationIdx === -1 ? serverBlock.body : serverBlock.body.slice(0, firstLocationIdx);
    expect(serverScope).toContain(INCLUDE_DIRECTIVE);
  });

  it('re-includes the snippet in every location that sets its own add_header', () => {
    const locationBlocks = blocks.filter((b) => b.label.startsWith('location'));
    expect(locationBlocks.length).toBeGreaterThan(0);
    for (const block of locationBlocks) {
      if (/add_header/.test(block.body)) {
        expect(
          block.body.includes(INCLUDE_DIRECTIVE),
          `${block.label} sets add_header but does not re-include security-headers.conf`
        ).toBe(true);
      }
    }
  });

  it('does NOT inline a duplicate Content-Security-Policy (policy lives only in the snippet)', () => {
    expect(/add_header\s+Content-Security-Policy/i.test(NGINX_CONF)).toBe(false);
  });
});

describe('nginx.conf: existing behaviour preserved', () => {
  it('keeps SPA fallback routing', () => {
    expect(NGINX_CONF).toContain('try_files $uri $uri/ /index.html;');
  });

  it('keeps gzip enabled', () => {
    expect(NGINX_CONF).toContain('gzip on;');
  });

  it('keeps immutable caching for hashed assets', () => {
    expect(NGINX_CONF).toMatch(/location\s+\/assets\/\s*\{[\s\S]*?Cache-Control\s+"public, immutable"/);
  });

  it('keeps no-cache for index.html and the service worker', () => {
    expect(NGINX_CONF).toMatch(/location\s+=\s+\/index\.html\s*\{[\s\S]*?no-cache, no-store, must-revalidate/);
    expect(NGINX_CONF).toMatch(/location\s+=\s+\/sw\.js\s*\{[\s\S]*?no-cache, no-store, must-revalidate/);
  });
});
