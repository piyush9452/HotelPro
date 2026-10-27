import { describe, expect, it } from 'vitest';
import { addDays, fromDateOnly, isDateOnly, nightsBetween, toDateOnly } from '../utils/dates';
import { formatCurrency, formatDate, guestsLabel, pluralize } from '../utils/format';
import { passwordStrength } from '../utils/validation';

describe('date helpers', () => {
  it('round-trips date-only strings without timezone drift', () => {
    expect(toDateOnly(fromDateOnly('2026-12-31'))).toBe('2026-12-31');
    expect(fromDateOnly('2026-11-20T00:00:00.000Z').getDate()).toBe(20);
  });
  it('counts nights across month and DST boundaries', () => {
    expect(nightsBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(nightsBetween('2026-03-07', '2026-03-10')).toBe(3);
    expect(nightsBetween('2026-03-10', '2026-03-07')).toBe(-3);
  });
  it('validates and shifts dates', () => {
    expect(isDateOnly('2026-02-28')).toBe(true);
    expect(isDateOnly('2026-2-8')).toBe(false);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('formatting', () => {
  it('formats rupees and stay dates', () => {
    expect(formatCurrency(124840)).toBe('₹1,24,840');
    expect(formatCurrency(null)).toBe('—');
    expect(formatDate('2026-11-20')).toMatch(/20 Nov,? 2026/);
  });
  it('builds readable guest labels', () => {
    expect(guestsLabel({ adults: 2, children: 1, rooms: 1 })).toBe('2 adults · 1 child · 1 room');
    expect(pluralize(3, 'night')).toBe('3 nights');
  });
});

describe('password strength', () => {
  it('scores stronger passwords higher', () => {
    expect(passwordStrength('abc')).toBeLessThan(passwordStrength('Holiday2026!'));
    expect(passwordStrength('Holiday2026!')).toBe(4);
  });
});
