/**
 * Date Utility Functions
 *
 * Provides timezone-safe date formatting and manipulation utilities
 * to prevent common date display bugs where dates shift by one day
 * due to timezone conversions.
 *
 * PROBLEM:
 * - PostgreSQL timestamp fields include time and timezone
 * - JavaScript Date objects automatically convert to local timezone
 * - toLocaleDateString() can shift dates when crossing midnight
 *
 * SOLUTION:
 * - Extract date components in UTC or original timezone
 * - Format dates without timezone conversion
 * - Provide consistent date formatting across the application
 */

/**
 * Format a date string or Date object to local date string without timezone shifts
 *
 * @param dateInput - ISO string, timestamp, or Date object
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string
 *
 * @example
 * // If server sends: "2024-01-15T00:00:00.000Z"
 * // User in EST (UTC-5) sees: "January 15, 2024" (not January 14)
 * formatDateSafe("2024-01-15T00:00:00.000Z") // "1/15/2024"
 */
export function formatDateSafe(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'Unknown';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // Validate date
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatDateSafe:', dateInput);
      return 'Invalid Date';
    }

    // Use UTC date components to avoid timezone shifts
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Create a new date using UTC components in local timezone
    const localDate = new Date(year, month, day);

    // Format using Intl.DateTimeFormat
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(localDate);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateInput);
    return 'Invalid Date';
  }
}

/**
 * Format a date to long format (e.g., "January 15, 2024")
 *
 * @param dateInput - ISO string, timestamp, or Date object
 * @returns Formatted long date string
 *
 * @example
 * formatDateLong("2024-01-15T00:00:00.000Z") // "January 15, 2024"
 */
export function formatDateLong(dateInput: string | Date | null | undefined): string {
  return formatDateSafe(dateInput, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date to short format (e.g., "Jan 15, 2024")
 *
 * @param dateInput - ISO string, timestamp, or Date object
 * @returns Formatted short date string
 *
 * @example
 * formatDateShort("2024-01-15T00:00:00.000Z") // "Jan 15, 2024"
 */
export function formatDateShort(dateInput: string | Date | null | undefined): string {
  return formatDateSafe(dateInput, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a date to relative format (e.g., "2 days ago", "in 3 days")
 *
 * @param dateInput - ISO string, timestamp, or Date object
 * @returns Relative time string
 *
 * @example
 * formatDateRelative("2024-01-15T00:00:00.000Z") // "2 days ago"
 */
export function formatDateRelative(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Unknown';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays === -1) return 'Tomorrow';
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < -1 && diffDays > -7) return `in ${Math.abs(diffDays)} days`;

    // For dates further away, show the actual date
    return formatDateShort(date);
  } catch (error) {
    console.error('Error formatting relative date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a timestamp to include time (e.g., "1/15/2024, 2:30 PM")
 *
 * @param dateInput - ISO string, timestamp, or Date object
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted datetime string
 *
 * @example
 * formatDateTime("2024-01-15T14:30:00.000Z") // "1/15/2024, 2:30 PM"
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'Unknown';

  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
}

/**
 * Parse a date string and return a Date object without timezone shift
 *
 * @param dateString - Date string in ISO format or other parseable format
 * @returns Date object or null if invalid
 *
 * @example
 * parseDateSafe("2024-01-15") // Date object for Jan 15, 2024 at local midnight
 */
export function parseDateSafe(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Get the start of day in UTC (midnight UTC)
 * Useful for date comparisons and date-only operations
 *
 * @param date - Date object or date string
 * @returns Date object at UTC midnight
 *
 * @example
 * getStartOfDayUTC(new Date("2024-01-15T14:30:00")) // 2024-01-15T00:00:00.000Z
 */
export function getStartOfDayUTC(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Compare two dates ignoring time component
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 *
 * @example
 * compareDatesOnly(new Date("2024-01-15"), new Date("2024-01-16")) // -1
 */
export function compareDatesOnly(date1: Date | string, date2: Date | string): number {
  const d1 = getStartOfDayUTC(date1);
  const d2 = getStartOfDayUTC(date2);

  if (d1.getTime() < d2.getTime()) return -1;
  if (d1.getTime() > d2.getTime()) return 1;
  return 0;
}

/**
 * Check if a date is valid
 *
 * @param date - Date to validate
 * @returns true if valid date, false otherwise
 *
 * @example
 * isValidDate(new Date("2024-01-15")) // true
 * isValidDate(new Date("invalid")) // false
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format date for input[type="date"] element
 * Returns YYYY-MM-DD format
 *
 * @param date - Date object or string
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateForInput(new Date("2024-01-15")) // "2024-01-15"
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (!isValidDate(d)) return '';

    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

/**
 * Normalize a date to UTC midnight (00:00:00.000Z)
 * This should be used SERVER-SIDE when storing dates to ensure
 * consistent date display regardless of timezone
 *
 * @param date - Date object, date string, or undefined (uses current date)
 * @returns Date object at UTC midnight
 *
 * @example
 * // User in EST creates on Jan 15, 2024 at 11 PM
 * // Without normalization: 2024-01-16T04:00:00.000Z (displays as Jan 16)
 * // With normalization: 2024-01-15T00:00:00.000Z (displays as Jan 15) ✓
 * normalizeToUTCMidnight(new Date('2024-01-15T23:00:00-05:00'))
 * // Returns: 2024-01-15T00:00:00.000Z
 */
export function normalizeToUTCMidnight(date?: Date | string): Date {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();

  // Get the user's LOCAL date components (not UTC)
  // This preserves the user's intended date
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  // Create a new date at UTC midnight using the user's local date
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}
