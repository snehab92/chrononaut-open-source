/**
 * Timezone-safe date utilities
 *
 * These functions use local timezone instead of UTC to avoid
 * issues where toISOString() returns the wrong date near midnight.
 */

/**
 * Get a date string in YYYY-MM-DD format using local timezone.
 * This is a safe alternative to date.toISOString().split("T")[0]
 * which uses UTC and can return the wrong date near midnight.
 *
 * @param date - Date object (defaults to now)
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format using local timezone.
 *
 * @returns Today's date string in YYYY-MM-DD format
 */
export function getToday(): string {
  return getLocalDateString(new Date());
}

/**
 * Parse a YYYY-MM-DD string to a Date object at midnight local time.
 * This ensures the date is interpreted in the local timezone.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to midnight local time
 */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Format a date for display (e.g., "Monday, December 23, 2024")
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = parseDateString(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a date for short display (e.g., "Dec 23")
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Short formatted date string
 */
export function formatDateShort(dateStr: string): string {
  const date = parseDateString(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a date string represents today
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the date is today
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

/**
 * Check if a date string is in the future
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the date is after today
 */
export function isFuture(dateStr: string): boolean {
  return dateStr > getToday();
}

/**
 * Get the previous day's date string
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Previous day's date string
 */
export function getPreviousDay(dateStr: string): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

/**
 * Get the next day's date string
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Next day's date string
 */
export function getNextDay(dateStr: string): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
}
