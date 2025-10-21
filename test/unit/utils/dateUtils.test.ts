/**
 * Unit Tests for Date Utility Functions
 *
 * Tests the timezone-safe date formatting utilities to ensure
 * dates display correctly without timezone conversion bugs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDateSafe,
  formatDateLong,
  formatDateShort,
  formatDateRelative,
  formatDateTime,
  parseDateSafe,
  getStartOfDayUTC,
  compareDatesOnly,
  isValidDate,
  formatDateForInput
} from '../../../client/src/utils/dateUtils';

describe('formatDateSafe', () => {
  it('formats valid date string correctly', () => {
    const result = formatDateSafe('2024-01-15T00:00:00.000Z');
    expect(result).toBe('1/15/2024');
  });

  it('formats Date object correctly', () => {
    const date = new Date('2024-01-15T00:00:00.000Z');
    const result = formatDateSafe(date);
    expect(result).toBe('1/15/2024');
  });

  it('handles null input gracefully', () => {
    const result = formatDateSafe(null);
    expect(result).toBe('Unknown');
  });

  it('handles undefined input gracefully', () => {
    const result = formatDateSafe(undefined);
    expect(result).toBe('Unknown');
  });

  it('handles invalid date string', () => {
    const result = formatDateSafe('invalid-date');
    expect(result).toBe('Invalid Date');
  });

  it('extracts UTC date components to avoid timezone shift', () => {
    // This date is at UTC midnight on January 15
    // In EST (UTC-5), this would be 7 PM on January 14
    // But we want to display it as January 15
    const result = formatDateSafe('2024-01-15T00:00:00.000Z');
    expect(result).toBe('1/15/2024');
  });

  it('handles dates near timezone boundaries', () => {
    // 11:59 PM on January 14 UTC
    // In PST (UTC-8), this is 3:59 PM on January 14
    // Should still show as January 14
    const result = formatDateSafe('2024-01-14T23:59:59.999Z');
    expect(result).toBe('1/14/2024');
  });

  it('accepts custom format options', () => {
    const result = formatDateSafe('2024-01-15T00:00:00.000Z', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatDateLong', () => {
  it('formats date in long format', () => {
    const result = formatDateLong('2024-01-15T00:00:00.000Z');
    expect(result).toBe('January 15, 2024');
  });

  it('handles null input', () => {
    const result = formatDateLong(null);
    expect(result).toBe('Unknown');
  });

  it('handles invalid date', () => {
    const result = formatDateLong('invalid');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatDateShort', () => {
  it('formats date in short format', () => {
    const result = formatDateShort('2024-01-15T00:00:00.000Z');
    expect(result).toBe('Jan 15, 2024');
  });

  it('handles null input', () => {
    const result = formatDateShort(null);
    expect(result).toBe('Unknown');
  });
});

describe('formatDateRelative', () => {
  beforeEach(() => {
    // Mock current date to 2024-01-17 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-17T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Today" for today\'s date', () => {
    const result = formatDateRelative('2024-01-17T12:00:00.000Z');
    expect(result).toBe('Today');
  });

  it('shows "Yesterday" for yesterday\'s date', () => {
    const result = formatDateRelative('2024-01-16T12:00:00.000Z');
    expect(result).toBe('Yesterday');
  });

  it('shows "Tomorrow" for tomorrow\'s date', () => {
    const result = formatDateRelative('2024-01-18T12:00:00.000Z');
    expect(result).toBe('Tomorrow');
  });

  it('shows "X days ago" for recent past dates', () => {
    const result = formatDateRelative('2024-01-14T12:00:00.000Z');
    expect(result).toBe('3 days ago');
  });

  it('shows "in X days" for near future dates', () => {
    const result = formatDateRelative('2024-01-20T12:00:00.000Z');
    expect(result).toBe('in 3 days');
  });

  it('shows actual date for dates beyond 7 days', () => {
    const result = formatDateRelative('2024-01-01T12:00:00.000Z');
    expect(result).toBe('Jan 1, 2024');
  });

  it('handles null input', () => {
    const result = formatDateRelative(null);
    expect(result).toBe('Unknown');
  });
});

describe('formatDateTime', () => {
  it('formats datetime with time component', () => {
    const result = formatDateTime('2024-01-15T14:30:00.000Z');
    // Result will vary by timezone, but should include time
    expect(result).toMatch(/\d{1,2}:\d{2}/); // Contains time
    expect(result).toMatch(/AM|PM/); // Contains AM/PM
  });

  it('handles null input', () => {
    const result = formatDateTime(null);
    expect(result).toBe('Unknown');
  });

  it('handles invalid date', () => {
    const result = formatDateTime('invalid');
    expect(result).toBe('Invalid Date');
  });
});

describe('parseDateSafe', () => {
  it('parses valid date string', () => {
    const result = parseDateSafe('2024-01-15T00:00:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getUTCFullYear()).toBe(2024);
    expect(result?.getUTCMonth()).toBe(0); // January is 0
    expect(result?.getUTCDate()).toBe(15);
  });

  it('returns null for null input', () => {
    const result = parseDateSafe(null);
    expect(result).toBeNull();
  });

  it('returns null for undefined input', () => {
    const result = parseDateSafe(undefined);
    expect(result).toBeNull();
  });

  it('returns null for invalid date string', () => {
    const result = parseDateSafe('invalid-date');
    expect(result).toBeNull();
  });
});

describe('getStartOfDayUTC', () => {
  it('returns UTC midnight for a date', () => {
    const date = new Date('2024-01-15T14:30:45.123Z');
    const result = getStartOfDayUTC(date);

    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
  });

  it('handles date string input', () => {
    const result = getStartOfDayUTC('2024-01-15T14:30:45.123Z');

    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCDate()).toBe(15);
  });

  it('preserves the date when already at UTC midnight', () => {
    const date = new Date('2024-01-15T00:00:00.000Z');
    const result = getStartOfDayUTC(date);

    expect(result.getTime()).toBe(date.getTime());
  });
});

describe('compareDatesOnly', () => {
  it('returns -1 when first date is before second', () => {
    const result = compareDatesOnly(
      '2024-01-14T23:59:59.999Z',
      '2024-01-15T00:00:00.000Z'
    );
    expect(result).toBe(-1);
  });

  it('returns 1 when first date is after second', () => {
    const result = compareDatesOnly(
      '2024-01-16T00:00:00.000Z',
      '2024-01-15T23:59:59.999Z'
    );
    expect(result).toBe(1);
  });

  it('returns 0 when dates are on same day (ignoring time)', () => {
    const result = compareDatesOnly(
      '2024-01-15T08:00:00.000Z',
      '2024-01-15T20:00:00.000Z'
    );
    expect(result).toBe(0);
  });

  it('handles Date objects', () => {
    const date1 = new Date('2024-01-15T08:00:00.000Z');
    const date2 = new Date('2024-01-15T20:00:00.000Z');
    const result = compareDatesOnly(date1, date2);
    expect(result).toBe(0);
  });
});

describe('isValidDate', () => {
  it('returns true for valid Date object', () => {
    const date = new Date('2024-01-15T00:00:00.000Z');
    expect(isValidDate(date)).toBe(true);
  });

  it('returns false for invalid Date object', () => {
    const date = new Date('invalid');
    expect(isValidDate(date)).toBe(false);
  });

  it('returns false for non-Date values', () => {
    expect(isValidDate('2024-01-15')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate(123456789)).toBe(false);
  });
});

describe('formatDateForInput', () => {
  it('formats date for HTML input[type="date"]', () => {
    const result = formatDateForInput(new Date('2024-01-15T00:00:00.000Z'));
    expect(result).toBe('2024-01-15');
  });

  it('handles date string input', () => {
    const result = formatDateForInput('2024-01-15T14:30:00.000Z');
    expect(result).toBe('2024-01-15');
  });

  it('returns empty string for null input', () => {
    const result = formatDateForInput(null);
    expect(result).toBe('');
  });

  it('returns empty string for undefined input', () => {
    const result = formatDateForInput(undefined);
    expect(result).toBe('');
  });

  it('returns empty string for invalid date', () => {
    const result = formatDateForInput('invalid');
    expect(result).toBe('');
  });

  it('pads single-digit months and days', () => {
    const result = formatDateForInput(new Date('2024-01-05T00:00:00.000Z'));
    expect(result).toBe('2024-01-05');
  });
});

describe('Edge Cases', () => {
  it('handles leap year dates correctly', () => {
    const result = formatDateSafe('2024-02-29T00:00:00.000Z');
    expect(result).toBe('2/29/2024');
  });

  it('handles year boundaries correctly', () => {
    const result = formatDateSafe('2024-12-31T23:59:59.999Z');
    expect(result).toBe('12/31/2024');
  });

  it('handles month boundaries correctly', () => {
    const result = formatDateSafe('2024-01-31T23:59:59.999Z');
    expect(result).toBe('1/31/2024');
  });

  it('handles very old dates', () => {
    const result = formatDateSafe('1900-01-01T00:00:00.000Z');
    expect(result).toBe('1/1/1900');
  });

  it('handles far future dates', () => {
    const result = formatDateSafe('2099-12-31T00:00:00.000Z');
    expect(result).toBe('12/31/2099');
  });
});
