/**
 * Get current timestamp as Date object for Drizzle timestamp columns
 * Drizzle with { mode: 'timestamp' } expects Date objects and converts to Unix seconds
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}

/**
 * Convert a Date object to Unix timestamp in seconds
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert Unix timestamp (seconds) to Date object
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}
