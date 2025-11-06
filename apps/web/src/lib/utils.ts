/**
 * Utility functions for the web app
 */

/**
 * Format a number as currency
 * @param amount The amount to format
 * @param currency The currency code (default: GBP)
 * @param currencySymbol Optional currency symbol to use (takes precedence over currency)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'GBP', currencySymbol?: string): string {
  if (currencySymbol) {
    // Use the custom currency symbol directly
    return `${currencySymbol}${Math.abs(amount).toFixed(2)}`;
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a date
 * @param date The date to format (Date, string, or timestamp)
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number): string {
  let d: Date;
  
  if (typeof date === 'number') {
    // Handle both milliseconds and seconds timestamps
    d = new Date(date > 1000000000000 ? date : date * 1000);
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = date;
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date with time
 * @param date The date to format
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
