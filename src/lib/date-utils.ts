/**
 * Parse a YYYY-MM-DD date string without timezone issues.
 * Using new Date("2026-01-25") interprets as UTC midnight,
 * which can display as wrong day in local timezone.
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Format a date string for display without timezone issues.
 */
export function formatDateDisplay(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateString(dateStr);
  return date.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Check if a date string represents an overdue date.
 */
export function isDateOverdue(dateStr: string): boolean {
  const due = parseDateString(dateStr);
  due.setHours(23, 59, 59, 999);
  return due < new Date();
}

/**
 * Check if a date string is within N days from now.
 */
export function isDateWithinDays(dateStr: string, days: number): boolean {
  const due = parseDateString(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays >= 0;
}
