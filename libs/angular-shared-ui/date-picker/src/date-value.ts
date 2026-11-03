export type DateMode = 'year' | 'month-year' | 'day-month-year';
export type DateViewMode = 'day' | 'month' | 'year';

export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}(-\d{2})?(-\d{2})?$/.test(value)) return null;
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return year >= 1 && date.getFullYear() === year && date.getMonth() === month - 1 &&
    date.getDate() === day ? date : null;
}

export function formatCalendarDate(value: string): string {
  const date = parseCalendarDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    ...(value.length >= 7 ? { month: 'long' } : {}),
    ...(value.length === 10 ? { day: 'numeric' } : {})
  }).format(date);
}
