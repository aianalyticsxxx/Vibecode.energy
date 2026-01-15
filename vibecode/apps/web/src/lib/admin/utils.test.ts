import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatRelativeTime, formatNumber, truncate } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2024-06-20'));
    expect(result).toContain('2024');
    expect(result).toContain('Jun');
    expect(result).toContain('20');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });
});

describe('formatNumber', () => {
  it('returns number as-is for small values', () => {
    expect(formatNumber(123)).toBe('123');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with K', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10K');
  });

  it('formats millions with M', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10M');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});
