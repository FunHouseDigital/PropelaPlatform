import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(resolve(ROOT, ...parts), 'utf8');

const workflow = read('.github', 'workflows', 'production-verify.yml');
const dockerfile = read('Dockerfile');
const compose = read('docker-compose.yml');
const packageJson = JSON.parse(read('package.json'));

describe('manual production verification workflow', () => {
  it('is manual-only and requires a production_url input', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:\s*$/m);
    expect(workflow).toMatch(/production_url:\s*\n\s+description:/);
    expect(workflow).toMatch(/production_url:[\s\S]*?required:\s*true/);
    expect(workflow).not.toMatch(/^\s*(push|pull_request|schedule):/m);
  });

  it('only checks out, sets up Node, and runs the dependency-free verifier', () => {
    expect(workflow.match(/^\s*- (?:name:|uses:)/gm)).toHaveLength(3);
    expect(workflow).toContain('uses: actions/checkout@v4');
    expect(workflow).toContain('uses: actions/setup-node@v4');
    expect(workflow).toContain('run: npm run verify:production');
    expect(workflow).toContain('PRODUCTION_URL: ${{ inputs.production_url }}');
    expect(workflow).not.toMatch(/npm (ci|install)|deploy|curl|wget/i);
    expect(packageJson.scripts['verify:production']).toBe(
      'node scripts/verify-production.mjs',
    );
  });
});

describe('Docker public build configuration safety', () => {
  const publicBuildVars = [
    'VITE_ENVIRONMENT',
    'VITE_LOG_LEVEL',
    'VITE_FEATURE_FLAGS',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ];

  it.each(publicBuildVars)('declares and exports %s in the build stage', (name) => {
    expect(dockerfile).toMatch(new RegExp(`^ARG ${name}(?:=|$)`, 'm'));
    expect(dockerfile).toMatch(new RegExp(`^ENV ${name}=\\$\\{${name}\\}$`, 'm'));
  });

  it.each(publicBuildVars)('passes %s from .env through build.args', (name) => {
    expect(compose).toContain(`        ${name}: ` + '${' + name + '}');
  });

  it('builds through the config guard so enabled Supabase images cannot bypass validation', () => {
    expect(dockerfile).toMatch(/^RUN npm run build:vercel$/m);
    expect(dockerfile).not.toMatch(/^RUN npm run build$/m);
    expect(packageJson.scripts['build:vercel']).toContain(
      'node scripts/check-build-config.mjs',
    );
  });

  it('does not pass a runtime env_file to the static nginx image', () => {
    expect(compose).not.toMatch(/^\s*env_file:/m);
  });

  it('never exposes privileged Supabase or database credentials as frontend build args', () => {
    const containerConfig = `${dockerfile}\n${compose}`;
    expect(containerConfig).not.toMatch(/service[_-]?role/i);
    expect(containerConfig).not.toMatch(/(?:supabase_)?db[_-]?password/i);
    expect(containerConfig).not.toMatch(/database[_-]?password/i);
  });
});
