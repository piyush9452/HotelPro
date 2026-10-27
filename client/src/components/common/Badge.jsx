import { BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import { titleCase } from '../../utils/format';

const TONES = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  navy: 'bg-navy-50 text-navy-800 ring-navy-600/20',
  gray: 'bg-gray-100 text-gray-700 ring-gray-500/20',
  gold: 'bg-gold-100 text-gold-800 ring-gold-600/30',
};

export default function Badge({ tone = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }) {
  const s = BOOKING_STATUS[status] || { label: titleCase(status), tone: 'gray' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: titleCase(status), tone: 'gray' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
