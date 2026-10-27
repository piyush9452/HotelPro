import { formatCurrency, pluralize } from '../../utils/format';

/** Itemised price breakdown, always rendered from server-calculated numbers. */
export default function PriceSummary({ quote, title = 'Price details', compact = false }) {
  if (!quote) return null;
  const c = quote.currency || 'INR';
  const row = 'flex justify-between gap-4 text-sm';
  return (
    <div className={compact ? '' : 'rounded-xl bg-beige-50 p-4'}>
      {title && <h3 className="mb-3 font-sans text-sm font-semibold text-navy-900">{title}</h3>}
      <dl className="space-y-2">
        <div className={row}>
          <dt className="text-navy-600">
            {formatCurrency(quote.nightlyRate, c)} × {pluralize(quote.nights, 'night')}
            {quote.rooms > 1 ? ` × ${pluralize(quote.rooms, 'room')}` : ''}
          </dt>
          <dd className="font-medium text-navy-900">{formatCurrency(quote.subtotal, c, { decimals: 2 })}</dd>
        </div>
        <div className={row}>
          <dt className="text-navy-600">Taxes ({Math.round((quote.taxRate ?? 0) * 100)}%)</dt>
          <dd className="font-medium text-navy-900">{formatCurrency(quote.taxes, c, { decimals: 2 })}</dd>
        </div>
        <div className={row}>
          <dt className="text-navy-600">Service fee ({Math.round((quote.serviceFeeRate ?? 0) * 100)}%)</dt>
          <dd className="font-medium text-navy-900">{formatCurrency(quote.serviceFee, c, { decimals: 2 })}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-beige-300 pt-3">
          <dt className="font-semibold text-navy-950">Total</dt>
          <dd className="font-serif text-xl font-semibold text-navy-950">{formatCurrency(quote.total, c, { decimals: 2 })}</dd>
        </div>
      </dl>
    </div>
  );
}
