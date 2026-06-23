import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('buildInfo module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports buildInfo object with expected shape', async () => {
    const { buildInfo } = await import('../buildInfo');

    expect(buildInfo).toHaveProperty('version');
    expect(buildInfo).toHaveProperty('buildTimestamp');
    expect(buildInfo).toHaveProperty('gitCommit');
  });

  it('version is a string', async () => {
    const { buildInfo } = await import('../buildInfo');

    expect(typeof buildInfo.version).toBe('string');
    expect(buildInfo.version.length).toBeGreaterThan(0);
  });

  it('buildTimestamp is a string', async () => {
    const { buildInfo } = await import('../buildInfo');

    expect(typeof buildInfo.buildTimestamp).toBe('string');
    expect(buildInfo.buildTimestamp.length).toBeGreaterThan(0);
  });

  it('gitCommit is a string', async () => {
    const { buildInfo } = await import('../buildInfo');

    expect(typeof buildInfo.gitCommit).toBe('string');
    expect(buildInfo.gitCommit.length).toBeGreaterThan(0);
  });

  it('uses build-time defined values', async () => {
    const { buildInfo } = await import('../buildInfo');

    // In test environment, these are set via vitest.config.js define
    expect(buildInfo.version).toBe('0.0.0');
    expect(buildInfo.buildTimestamp).toBe('test-build-timestamp');
    expect(buildInfo.gitCommit).toBe('test-commit-hash');
  });

  it('exports default as buildInfo', async () => {
    const module = await import('../buildInfo');

    expect(module.default).toBe(module.buildInfo);
  });
});
