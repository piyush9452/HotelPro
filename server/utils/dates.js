// All stay dates are calendar dates ("YYYY-MM-DD") stored as midnight UTC.
// "Today" is evaluated in the hotel's timezone so a guest in any timezone
// sees the same rules the front desk does.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDateOnly(date) !== value) return null;
  return date;
}

export function formatDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function todayInTimezone(timezone, now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parseDateOnly(formatted);
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / DAY_MS);
}

export function eachNight(checkIn, checkOut) {
  const nights = [];
  for (let d = new Date(checkIn); d < new Date(checkOut); d = addDays(d, 1)) nights.push(d);
  return nights;
}

// Returns the instant check-in begins in the hotel's timezone, as a UTC Date.
export function checkInInstant(checkIn, timezone, hour) {
  const base = new Date(checkIn).getTime() + hour * 60 * 60 * 1000;
  const offsetMs = timezoneOffsetMs(timezone, new Date(base));
  return new Date(base - offsetMs);
}

function timezoneOffsetMs(timezone, date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - date.getTime();
}
