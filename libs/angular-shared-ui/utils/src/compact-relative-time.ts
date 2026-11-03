const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function formatCompactRelativeTime(updatedAt: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));
  if (seconds >= MONTH) return '1m+ ago';
  if (seconds >= WEEK) return `${Math.floor(seconds / WEEK)}w ago`;
  if (seconds >= DAY) return `${Math.floor(seconds / DAY)}d ${Math.floor(seconds % DAY / HOUR)}h ago`;
  if (seconds >= HOUR) return `${Math.floor(seconds / HOUR)}h ago`;
  if (seconds >= MINUTE) return `${Math.floor(seconds / MINUTE)}min ago`;
  return 'just now';
}
