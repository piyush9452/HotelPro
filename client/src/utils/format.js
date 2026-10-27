import { fromDateOnly } from './dates';

const currencyFormatters = new Map();

export function formatCurrency(amount, currency = 'INR', { decimals } = {}) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  const key = `${currency}-${decimals}`;
  if (!currencyFormatters.has(key)) {
    currencyFormatters.set(
      key,
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals ?? 0,
        maximumFractionDigits: decimals ?? 2,
      }),
    );
  }
  return currencyFormatters.get(key).format(Number(amount));
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Formats a stay date ("YYYY-MM-DD" or the API's midnight-UTC ISO string). */
export function formatDate(value, { short = false } = {}) {
  const date = fromDateOnly(value);
  if (!date) return '—';
  return (short ? shortDateFmt : dateFmt).format(date);
}

/** Formats a real instant (createdAt, paidAt…) in the viewer's timezone. */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFmt.format(date);
}

export const pluralize = (count, singular, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

export const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function guestsLabel({ adults = 0, children = 0, rooms }) {
  const parts = [pluralize(adults, 'adult')];
  if (children) parts.push(pluralize(children, 'child', 'children'));
  if (rooms) parts.push(pluralize(rooms, 'room'));
  return parts.join(' · ');
}
