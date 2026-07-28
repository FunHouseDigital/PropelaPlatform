import { describe, expect, it } from 'vitest';

import { validateMigrationBundle } from './check-migrations.mjs';

const SOURCES = [
  { file: '0001_first.sql', content: 'CREATE TABLE first (id text);\n' },
  { file: '0002_second.sql', content: 'ALTER TABLE first ENABLE ROW LEVEL SECURITY;\n' },
];

function section({ file, content }) {
  return `-- >>> BEGIN migrations/${file} >>>\n\n${content}\n-- <<< END migrations/${file} <<<`;
}

function bundle({ preamble = '', between = '', after = '', sources = SOURCES } = {}) {
  return `${preamble}${section(sources[0])}\n${between}\n${section(sources[1])}${after}`;
}

describe('migration bundle section boundaries', () => {
  it('permits the documented comment-only preamble and whitespace outside sections', () => {
    const candidate = bundle({
      preamble: '-- Generated migration bundle\n/* source files remain authoritative */\n\n',
      between: '\n\t',
      after: '\n\n-- end of generated bundle\n',
    });
    expect(validateMigrationBundle(candidate, SOURCES)).toEqual([]);
  });

  it.each([
    ['before', { preamble: "SELECT 'injected-before';\n" }],
    ['between', { between: "SELECT 'injected-between';" }],
    ['after', { after: "\nSELECT 'injected-after';" }],
  ])('rejects executable SQL %s ordered migration sections', (_position, placement) => {
    expect(validateMigrationBundle(bundle(placement), SOURCES)).toContain(
      'Migration bundle contains executable SQL outside migration sections',
    );
  });

  it('continues to reject changed migration content', () => {
    const changed = bundle({
      sources: [
        { ...SOURCES[0], content: 'CREATE TABLE changed (id text);\n' },
        SOURCES[1],
      ],
    });
    expect(validateMigrationBundle(changed, SOURCES)).toContain(
      "Migration bundle content differs from '0001_first.sql'",
    );
  });

  it('continues to reject migration sections in the wrong order', () => {
    const reversed = `${section(SOURCES[1])}\n\n${section(SOURCES[0])}`;
    const problems = validateMigrationBundle(reversed, SOURCES);
    expect(problems).toContain(
      "Migration bundle section 1 must be '0001_first.sql' but markers are '0002_second.sql'/'0002_second.sql'",
    );
    expect(problems).toContain(
      "Migration bundle section 2 must be '0002_second.sql' but markers are '0001_first.sql'/'0001_first.sql'",
    );
  });
});
