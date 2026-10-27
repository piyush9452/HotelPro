// Stay dates travel as "YYYY-MM-DD" strings. They are converted to *local*
// Date objects only for calendar widgets, so no timezone shifting can occur.

const pad = (n) => String(n).padStart(2, '0');

export const toDateOnly = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function fromDateOnly(value) {
  if (!value) return undefined;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Boolean(fromDateOnly(value));

export function addDays(value, days) {
  const date = typeof value === 'string' ? fromDateOnly(value) : new Date(value);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

export const todayDateOnly = () => toDateOnly(new Date());

export function nightsBetween(checkIn, checkOut) {
  const a = fromDateOnly(checkIn);
  const b = fromDateOnly(checkOut);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86_400_000);
}
