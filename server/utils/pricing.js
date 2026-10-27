import { env } from '../config/env.js';

export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

// The single source of truth for what a stay costs. Never accept prices from clients.
export function calculatePrice({
  nightlyRate,
  nights,
  rooms,
  taxRate = env.hotel.taxRate,
  serviceFeeRate = env.hotel.serviceFeeRate,
  currency = env.hotel.currency,
}) {
  const subtotal = round2(nightlyRate * nights * rooms);
  const taxes = round2(subtotal * taxRate);
  const serviceFee = round2(subtotal * serviceFeeRate);
  const total = round2(subtotal + taxes + serviceFee);
  return { nightlyRate, nights, rooms, subtotal, taxRate, taxes, serviceFeeRate, serviceFee, total, currency };
}

export const toMinorUnits = (amount) => Math.round(amount * 100);
