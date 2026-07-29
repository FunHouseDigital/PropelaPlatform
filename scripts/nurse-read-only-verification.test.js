import { describe, expect, it, vi } from 'vitest';

import { summarizeEmilyReadOnly } from './nurse-read-only-verification.mjs';

describe('Emily Plaatjies read-only verification summary', () => {
  it('reports only the approved count, owner, and version fields', () => {
    const mutation = {
      create: vi.fn(),
      update: vi.fn(),
      pipeline: vi.fn(),
      remove: vi.fn(),
    };
    const sensitiveOwner = 'private-owner-identifier';
    const credential = 'private-session-credential';
    const summary = summarizeEmilyReadOnly([
      {
        id: 'private-row-id',
        full_name: 'Emily Plaatjies',
        owner_id: sensitiveOwner,
        version: 2,
        access_token: credential,
        email: 'private@example.test',
      },
    ]);

    expect(summary).toEqual({
      exactly_one: true,
      owner_assigned: true,
      version_valid: true,
      current_version: 2,
    });
    expect(Object.keys(summary)).toEqual([
      'exactly_one',
      'owner_assigned',
      'version_valid',
      'current_version',
    ]);
    expect(JSON.stringify(summary)).not.toContain(sensitiveOwner);
    expect(JSON.stringify(summary)).not.toContain(credential);
    expect(mutation.create).not.toHaveBeenCalled();
    expect(mutation.update).not.toHaveBeenCalled();
    expect(mutation.pipeline).not.toHaveBeenCalled();
    expect(mutation.remove).not.toHaveBeenCalled();
  });

  it('fails closed for duplicates, missing ownership, and invalid versions', () => {
    expect(
      summarizeEmilyReadOnly([
        { full_name: 'Emily Plaatjies', owner_id: 'one', version: 2 },
        { full_name: 'Emily Plaatjies', owner_id: 'two', version: 2 },
      ])
    ).toEqual({
      exactly_one: false,
      owner_assigned: false,
      version_valid: false,
      current_version: null,
    });
    expect(summarizeEmilyReadOnly([{ full_name: 'Emily Plaatjies', version: 0 }])).toEqual({
      exactly_one: true,
      owner_assigned: false,
      version_valid: false,
      current_version: null,
    });
  });
});
