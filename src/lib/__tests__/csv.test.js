import { describe, expect, it } from 'vitest';

import { escapeCsvField, toCsv } from '../csv';

describe('escapeCsvField — formula-injection neutralization', () => {
  it('prefixes a leading "=" with a single quote', () => {
    expect(escapeCsvField('=1+1')).toBe("'=1+1");
  });

  it('prefixes a leading "+" (e.g. phone numbers)', () => {
    expect(escapeCsvField('+44 20 7946 0958')).toBe("'+44 20 7946 0958");
  });

  it('prefixes a leading "-"', () => {
    expect(escapeCsvField('-2')).toBe("'-2");
  });

  it('prefixes a leading "@"', () => {
    expect(escapeCsvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('neutralizes a HYPERLINK formula payload (prefixed + quoted)', () => {
    // Leading "=" -> formula prefix; contains commas and quotes -> RFC-4180
    // quoting with doubled inner quotes. The ' stays inside the cell.
    expect(escapeCsvField('=HYPERLINK("http://evil","click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""click"")"'
    );
  });

  it('neutralizes a classic command-execution payload', () => {
    // Contains no comma/quote/newline, so only the formula prefix is applied.
    expect(escapeCsvField("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1");
  });

  it('prefixes a leading tab (0x09) and quotes the whitespace', () => {
    // Leading tab is both a formula trigger and leading whitespace, so the
    // value is prefixed AND quoted.
    expect(escapeCsvField('\tcalc')).toBe('"\'\tcalc"');
  });

  it('prefixes a leading carriage return (0x0D) and quotes it', () => {
    // CR is a formula trigger and also forces RFC-4180 quoting.
    expect(escapeCsvField('\rfoo')).toBe('"\'\rfoo"');
  });

  it('does NOT prefix when the trigger char is not first', () => {
    expect(escapeCsvField('a=1+1')).toBe('a=1+1');
    expect(escapeCsvField('total -2')).toBe('total -2');
  });
});

describe('escapeCsvField — RFC-4180 quoting', () => {
  it('quotes and keeps a value containing a comma', () => {
    expect(escapeCsvField('Smith, John')).toBe('"Smith, John"');
  });

  it('quotes and doubles embedded double-quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes a value containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes a value containing a carriage return', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });

  it('quotes values with leading or trailing whitespace', () => {
    expect(escapeCsvField(' leading')).toBe('" leading"');
    expect(escapeCsvField('trailing ')).toBe('"trailing "');
  });

  it('keeps the formula prefix INSIDE the quotes when both apply', () => {
    // =a,b -> prefix to '=a,b -> quote because of comma -> "'=a,b"
    expect(escapeCsvField('=a,b')).toBe('"\'=a,b"');
  });
});

describe('escapeCsvField — benign passthrough', () => {
  it('passes ordinary names unchanged', () => {
    expect(escapeCsvField('Jane Doe')).toBe('Jane Doe');
  });

  it('passes dates, numbers and emails unchanged', () => {
    expect(escapeCsvField('2026-06-30')).toBe('2026-06-30');
    expect(escapeCsvField(5000)).toBe('5000');
    expect(escapeCsvField('nurse@example.com')).toBe('nurse@example.com');
  });

  it('coerces null/undefined to an empty string', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('coerces numbers and booleans to their string form', () => {
    expect(escapeCsvField(0)).toBe('0');
    expect(escapeCsvField(false)).toBe('false');
  });
});

describe('toCsv', () => {
  it('builds a document with headers and rows', () => {
    const csv = toCsv(
      [
        ['Jane Doe', 'Placed'],
        ['John Roe', 'Screening'],
      ],
      { headers: ['Name', 'Stage'] }
    );
    expect(csv).toBe('Name,Stage\nJane Doe,Placed\nJohn Roe,Screening');
  });

  it('escapes header cells too (formula-prefixing headers)', () => {
    const csv = toCsv([['x']], { headers: ['=evil'] });
    expect(csv).toBe("'=evil\nx");
  });

  it('keeps columns intact when a cell contains a comma (no row bleed)', () => {
    const csv = toCsv([['Smith, John', '42']], { headers: ['Name', 'Score'] });
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('"Smith, John",42');
  });

  it('neutralizes an injection payload inside a data row', () => {
    const csv = toCsv([["=cmd|'/c calc'!A1", 'ok']], { headers: ['A', 'B'] });
    expect(csv).toBe("A,B\n'=cmd|'/c calc'!A1,ok");
  });

  it('works without a headers option', () => {
    expect(
      toCsv([
        ['a', 'b'],
        ['c', 'd'],
      ])
    ).toBe('a,b\nc,d');
  });

  it('handles an empty row set', () => {
    expect(toCsv([], { headers: ['A', 'B'] })).toBe('A,B');
    expect(toCsv([])).toBe('');
  });
});
