import { describe, it, expect } from 'vitest';
import { formatDate, formatNumber, formatCurrency } from '../formatUtils';

describe('formatDate', () => {
  const testDate = new Date('2024-03-15T12:00:00Z');

  it('formats date in English locale', () => {
    const result = formatDate(testDate, 'en');
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats date in Spanish locale', () => {
    const result = formatDate(testDate, 'es');
    expect(result).toContain('marzo');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('accepts custom date format options', () => {
    const result = formatDate(testDate, 'en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    expect(result).toContain('Mar');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('handles string date input', () => {
    const result = formatDate('2024-06-20', 'en');
    expect(result).toContain('June');
    expect(result).toContain('2024');
  });

  it('handles numeric timestamp input', () => {
    const timestamp = new Date('2024-01-01').getTime();
    const result = formatDate(timestamp, 'en');
    expect(result).toContain('2024');
  });
});

describe('formatNumber', () => {
  it('formats number in English locale', () => {
    const result = formatNumber(1234567.89, 'en');
    expect(result).toBe('1,234,567.89');
  });

  it('formats number in Spanish locale', () => {
    const result = formatNumber(1234567.89, 'es');
    // Spanish uses comma for decimal separator; grouping may vary by environment
    expect(result).toContain(',89');
  });

  it('formats with custom options', () => {
    const result = formatNumber(0.756, 'en', {
      style: 'percent',
    });
    expect(result).toContain('76');
  });

  it('formats integer without decimals by default', () => {
    const result = formatNumber(42, 'en');
    expect(result).toBe('42');
  });

  it('formats large numbers with grouping', () => {
    const result = formatNumber(1000000, 'en');
    expect(result).toBe('1,000,000');
  });
});

describe('formatCurrency', () => {
  it('formats USD in English locale', () => {
    const result = formatCurrency(1234.56, 'USD', 'en');
    expect(result).toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('formats EUR in Spanish locale', () => {
    const result = formatCurrency(1234.56, 'EUR', 'es');
    // The result contains the amount with comma as decimal separator and EUR symbol
    expect(result).toContain('1234,56');
    expect(result).toContain('\u20AC');
  });

  it('formats GBP in English locale', () => {
    const result = formatCurrency(99.99, 'GBP', 'en');
    expect(result).toContain('99.99');
  });

  it('handles zero amount', () => {
    const result = formatCurrency(0, 'USD', 'en');
    expect(result).toContain('$');
    expect(result).toContain('0.00');
  });

  it('handles negative amounts', () => {
    const result = formatCurrency(-50.25, 'USD', 'en');
    expect(result).toContain('50.25');
  });
});
