import { Link, useSearchParams } from 'react-router-dom';
import { CalendarX, ChevronRight } from 'lucide-react';
import { BookingStatusBadge, PaymentStatusBadge } from '../components/common/Badge';
import Button from '../components/common/Button';
import { EmptyState, ErrorState, Skeleton } from '../components/common/Feedback';
import Pagination from '../components/common/Pagination';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { bookingService } from '../services/bookingService';
import { formatCurrency, formatDate, guestsLabel, pluralize } from '../utils/format';

const TABS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past stays' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: '', label: 'All' },
];

export default function MyBookings() {
  useDocumentTitle('My bookings');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'upcoming';
  const page = Number(params.get('page')) || 1;
  const { data, meta, loading, error, reload } = useAsync(() => bookingService.my({ status, page, limit: 8 }), [status, page]);

  const setTab = (value) => setParams(value === 'upcoming' ? {} : { status: value });

  return (
    <div className="container-page py-10 pb-20">
      <h1 className="text-4xl text-navy-950">My bookings</h1>
      <p className="mt-2 text-navy-600">View, pay for or cancel your reservations.</p>

      <div role="tablist" aria-label="Booking filters" className="mt-8 flex gap-1 overflow-x-auto border-b border-beige-200">
        {TABS.map((t) => (
          <button
            key={t.label}
            role="tab"
            type="button"
            aria-selected={status === t.value}
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${status === t.value ? 'border-gold-500 text-navy-950' : 'border-transparent text-navy-500 hover:text-navy-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : !data?.length ? (
          <EmptyState
            icon={CalendarX}
            title={status === 'upcoming' ? 'No upcoming stays' : 'No bookings here yet'}
            description="When you book a room it will appear here."
            action={<Button to="/rooms">Find a room</Button>}
          />
        ) : (
          <ul className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
            {data.map((b) => (
              <li key={b._id}>
                <Link to={`/bookings/${b._id}`} className="card flex flex-col gap-4 p-4 transition hover:shadow-lift sm:flex-row sm:items-center">
                  {b.roomSnapshot?.image && <img src={b.roomSnapshot.image} alt="" className="h-36 w-full rounded-xl object-cover sm:h-24 sm:w-36" loading="lazy" />}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <BookingStatusBadge status={b.status} />
                      <PaymentStatusBadge status={b.paymentStatus} />
                      <span className="font-mono text-xs text-navy-500">{b.reference}</span>
                    </div>
                    <h2 className="mt-2 text-xl text-navy-950">{b.roomSnapshot?.name}</h2>
                    <p className="mt-1 text-sm text-navy-600">
                      {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {pluralize(b.nights, 'night')} · {guestsLabel(b)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="font-serif text-xl font-semibold text-navy-950">{formatCurrency(b.pricing.total, b.pricing.currency)}</p>
                    <span className="inline-flex items-center text-sm font-medium text-gold-700">
                      {b.status === 'pending' ? 'Complete payment' : 'View details'} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={meta?.totalPages} onPageChange={(p) => setParams({ ...(status !== 'upcoming' ? { status } : {}), page: String(p) })} />
      </div>
    </div>
  );
}
