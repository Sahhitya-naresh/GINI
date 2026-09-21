/**
 * Date utility functions for Outreach Flow
 */

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds business days (Monday-Friday) to a given date.
 */
export function addBusinessDays(startDate: string | Date, daysToAdd: number): string {
  const date = typeof startDate === 'string' && startDate ? new Date(startDate + 'T12:00:00') : new Date();
  
  if (isNaN(date.getTime())) {
    const today = new Date();
    return addBusinessDays(today, daysToAdd);
  }

  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a lead's next send date is on or before today
 */
export function isLeadDueForNextSend(nextSendDate: string): boolean {
  if (!nextSendDate) return true;
  const todayStr = getTodayDateString();
  return nextSendDate <= todayStr;
}

/**
 * Formats a date string nicely for UI display
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
