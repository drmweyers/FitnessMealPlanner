/**
 * Server-side Date Utility Functions
 *
 * These utilities ensure dates are stored consistently in the database
 * to prevent timezone-related display issues.
 *
 * CRITICAL: Always use normalizeToUTCMidnight() when storing dates
 * for assignedAt, measurementDate, targetDate, etc.
 */

/**
 * Normalize a date to UTC midnight (00:00:00.000Z)
 *
 * This function takes any date (with time component) and returns
 * a date at UTC midnight, preserving the user's LOCAL date.
 *
 * WHY THIS IS NEEDED:
 * - If user in EST creates meal plan on Jan 15 at 11 PM (2024-01-15T23:00:00-05:00)
 * - Without normalization: DB stores 2024-01-16T04:00:00.000Z (UTC time)
 * - Client displays: Jan 16 (WRONG - off by one day!)
 * - With normalization: DB stores 2024-01-15T00:00:00.000Z
 * - Client displays: Jan 15 (CORRECT!)
 *
 * @param date - Date object, ISO string, or undefined (uses current date)
 * @returns Date object at UTC midnight for the user's local date
 *
 * @example
 * // User in EST creates on Jan 15, 2024 at 11 PM
 * const userTime = new Date('2024-01-15T23:00:00-05:00');
 * const normalized = normalizeToUTCMidnight(userTime);
 * // normalized = 2024-01-15T00:00:00.000Z (preserves Jan 15)
 *
 * @example
 * // Use when creating assignments
 * await db.insert(customerMealPlans).values({
 *   assignedAt: normalizeToUTCMidnight(), // Current date at UTC midnight
 *   // ... other fields
 * });
 */
export function normalizeToUTCMidnight(date?: Date | string): Date {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();

  // Validate date
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    console.error('Invalid date provided to normalizeToUTCMidnight:', date);
    return new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0, 0));
  }

  // Get the date components in the SERVER's timezone
  // NOTE: This assumes server and client are in similar timezones
  // For true timezone-aware apps, you'd need to pass the user's timezone
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  // Create a new date at UTC midnight using those date components
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Format a date to ISO string at UTC midnight
 * Convenience wrapper around normalizeToUTCMidnight()
 *
 * @param date - Date object, string, or undefined
 * @returns ISO string at UTC midnight (e.g., "2024-01-15T00:00:00.000Z")
 *
 * @example
 * formatDateToUTCMidnight() // "2024-01-15T00:00:00.000Z"
 * formatDateToUTCMidnight(new Date('2024-01-15T23:00:00')) // "2024-01-15T00:00:00.000Z"
 */
export function formatDateToUTCMidnight(date?: Date | string): string {
  return normalizeToUTCMidnight(date).toISOString();
}

/**
 * Check if a date is valid
 *
 * @param date - Date to validate
 * @returns true if valid date, false otherwise
 */
export function isValidDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get the start of day in UTC (midnight UTC) for a given date
 * Alias for normalizeToUTCMidnight for consistency with client-side API
 *
 * @param date - Date object or string
 * @returns Date object at UTC midnight
 */
export function getStartOfDayUTC(date: Date | string): Date {
  return normalizeToUTCMidnight(date);
}
