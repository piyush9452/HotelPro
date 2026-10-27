import './helpers/env.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice } from '../utils/pricing.js';
import { checkInInstant, eachNight, nightsBetween, parseDateOnly, todayInTimezone } from '../utils/dates.js';
import { cancellationTerms, generateReference } from '../services/bookingService.js';
import { capacityProblem } from '../services/stayService.js';
import { toCsv } from '../utils/csv.js';

describe('pricing', () => {
  it('computes subtotal, taxes, fees and total', () => {
    const p = calculatePrice({ nightlyRate: 4999.99, nights: 3, rooms: 2, taxRate: 0.12, serviceFeeRate: 0.03 });
    assert.equal(p.subtotal, 29999.94);
    assert.equal(p.taxes, 3599.99);
    assert.equal(p.serviceFee, 900);
    assert.equal(p.total, 34499.93);
  });
});

describe('dates', () => {
  it('parses only real calendar dates', () => {
    assert.ok(parseDateOnly('2028-02-29'));
    assert.equal(parseDateOnly('2027-02-29'), null);
    assert.equal(parseDateOnly('2027-1-5'), null);
    assert.equal(parseDateOnly('not a date'), null);
  });

  it('counts nights and enumerates them', () => {
    const a = parseDateOnly('2027-03-30');
    const b = parseDateOnly('2027-04-02');
    assert.equal(nightsBetween(a, b), 3);
    assert.deepEqual(eachNight(a, b).map((d) => d.toISOString().slice(0, 10)), ['2027-03-30', '2027-03-31', '2027-04-01']);
  });

  it('evaluates "today" in the hotel timezone', () => {
    const lateUtc = new Date('2027-01-01T20:00:00Z'); // 01:30 on Jan 2 in India
    assert.equal(todayInTimezone('Asia/Kolkata', lateUtc).toISOString().slice(0, 10), '2027-01-02');
    assert.equal(todayInTimezone('America/New_York', lateUtc).toISOString().slice(0, 10), '2027-01-01');
  });

  it('converts local check-in time to UTC', () => {
    const at = checkInInstant(parseDateOnly('2027-01-10'), 'Asia/Kolkata', 14);
    assert.equal(at.toISOString(), '2027-01-10T08:30:00.000Z');
  });
});

describe('capacity rules', () => {
  const room = { name: 'Deluxe', maxAdults: 2, maxChildren: 1, inventory: 4 };
  it('accepts guests that fit and explains those that do not', () => {
    assert.equal(capacityProblem(room, { adults: 4, children: 2, rooms: 2 }), null);
    assert.match(capacityProblem(room, { adults: 3, children: 0, rooms: 1 }), /adult/);
    assert.match(capacityProblem(room, { adults: 1, children: 2, rooms: 1 }), /child/);
    assert.match(capacityProblem(room, { adults: 1, children: 0, rooms: 2 }), /at least one adult/);
    assert.match(capacityProblem(room, { adults: 6, children: 0, rooms: 6 }), /at most|exist/);
  });
});

describe('cancellation policy', () => {
  const booking = (daysAhead, paymentStatus = 'paid') => {
    const checkIn = new Date(Date.UTC(2027, 0, 10));
    return {
      checkIn,
      nights: 2,
      paymentStatus,
      pricing: { total: 1000 },
      now: new Date(checkIn.getTime() - daysAhead * 86_400_000),
    };
  };

  it('refunds fully outside the free window, charges one night inside it', () => {
    const early = booking(5);
    assert.deepEqual(
      [cancellationTerms(early, { byRole: 'user', now: early.now }).fee, cancellationTerms(early, { byRole: 'user', now: early.now }).refundAmount],
      [0, 1000],
    );
    const late = booking(1);
    const terms = cancellationTerms(late, { byRole: 'user', now: late.now });
    assert.equal(terms.fee, 500);
    assert.equal(terms.refundAmount, 500);
  });

  it('always refunds fully when the hotel cancels, and nothing is owed when unpaid', () => {
    const late = booking(1);
    assert.equal(cancellationTerms(late, { byRole: 'admin', now: late.now }).refundAmount, 1000);
    const unpaid = booking(1, 'unpaid');
    assert.equal(cancellationTerms(unpaid, { byRole: 'user', now: unpaid.now }).refundAmount, 0);
  });

  it('blocks guest cancellation after check-in time', () => {
    const past = booking(-1);
    assert.equal(cancellationTerms(past, { byRole: 'user', now: past.now }).allowed, false);
  });
});

describe('misc', () => {
  it('generates readable unique booking references', () => {
    const refs = new Set(Array.from({ length: 500 }, () => generateReference(new Date('2027-05-04T00:00:00Z'))));
    assert.equal(refs.size, 500);
    for (const r of refs) assert.match(r, /^HP270504-[A-HJ-NP-Z2-9]{6}$/);
  });

  it('escapes CSV and neutralises formulas', () => {
    const csv = toCsv([{ a: '=HYPERLINK("x")', b: 'hello, "world"' }], [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }]);
    assert.equal(csv, 'A,B\n"\'=HYPERLINK(""x"")","hello, ""world"""');
  });
});
