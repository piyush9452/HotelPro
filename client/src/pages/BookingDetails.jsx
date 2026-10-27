import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, Printer } from 'lucide-react';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import PriceSummary from '../components/booking/PriceSummary';
import PaymentPanel from '../components/booking/PaymentPanel';
import CancelBookingDialog from '../components/booking/CancelBookingDialog';
import Button from '../components/common/Button';
import { BookingStatusBadge, PaymentStatusBadge } from '../components/common/Badge';
import { Alert, ErrorState, Spinner } from '../components/common/Feedback';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { bookingService } from '../services/bookingService';
import { HOTEL } from '../utils/constants';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../utils/format';
import NotFound from './NotFound';

export default function BookingDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const { data: booking, loading, error, status, reload } = useAsync(() => bookingService.get(id), [id]);
  useDocumentTitle(booking ? `Booking ${booking.reference}` : 'Booking details');

  if (status === 404 || status === 400) return <NotFound title="Booking not found" message="We couldn’t find this booking in your account." />;
  if (error) return <div className="container-page py-16"><ErrorState message={error} onRetry={reload} /></div>;
  if (loading && !booking) return <Spinner className="py-32" />;

  const b = booking;
  const justConfirmed = params.get('confirmed') === '1' && b.status === 'confirmed';
  const canPay = b.status === 'pending' && b.paymentStatus === 'unpaid';
  const canCancel = b.cancellationPreview?.allowed;

  return (
    <div className="container-page py-8 pb-20">
      <Link to="/my-bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950 print:hidden">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My bookings
      </Link>

      {justConfirmed && (
        <div className="mt-6 rounded-2xl bg-navy-950 p-8 text-center text-white">
          <CircleCheck className="mx-auto h-12 w-12 text-gold-400" aria-hidden="true" />
          <h1 className="mt-4 text-3xl sm:text-4xl">Your stay is confirmed</h1>
          <p className="mt-2 text-navy-200">A confirmation has been sent to {b.guest.email}. We look forward to welcoming you.</p>
          <p className="mt-5 inline-block rounded-xl bg-white/10 px-5 py-3">
            <span className="block text-xs tracking-widest text-gold-400 uppercase">Booking reference</span>
            <span className="font-mono text-2xl font-semibold tracking-wider">{b.reference}</span>
          </p>
        </div>
      )}

      <div className="mt-6 mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {!justConfirmed && <h1 className="text-3xl text-navy-950">Booking {b.reference}</h1>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            <PaymentStatusBadge status={b.paymentStatus} />
            <span className="text-sm text-navy-500">Booked {formatDateTime(b.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" /> Print</Button>
          {canCancel && <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>Cancel booking</Button>}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {canPay && <div className="print:hidden"><PaymentPanel booking={b} onConfirmed={() => reload()} onExpired={reload} /></div>}
          {b.status === 'expired' && (
            <Alert tone="warning" title="This booking expired">
              Payment wasn’t completed within the hold period, so the rooms were released.{' '}
              {b.paymentStatus !== 'unpaid' ? 'Any payment received has been refunded.' : ''}{' '}
              <Link to={`/rooms/${b.room?._id || ''}`} className="font-semibold underline">Book again</Link>
            </Alert>
          )}
          {b.status === 'cancelled' && (
            <Alert tone="info" title={`Cancelled on ${formatDateTime(b.cancellation?.cancelledAt)}`}>
              {b.cancellation?.reason && <p>Reason: {b.cancellation.reason}</p>}
              {b.cancellation?.refundAmount > 0 && (
                <p>
                  Refund: {formatCurrency(b.cancellation.refundAmount, b.pricing.currency, { decimals: 2 })}
                  {b.cancellation.fee > 0 && ` (cancellation fee ${formatCurrency(b.cancellation.fee, b.pricing.currency, { decimals: 2 })})`} · {titleCase(b.paymentStatus)}
                </p>
              )}
            </Alert>
          )}

          <section className="card p-6">
            <h2 className="text-xl text-navy-950">Guest details</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-navy-500">Name</dt><dd className="font-medium text-navy-900">{b.guest.firstName} {b.guest.lastName}</dd></div>
              <div><dt className="text-navy-500">Email</dt><dd className="font-medium break-all text-navy-900">{b.guest.email}</dd></div>
              <div><dt className="text-navy-500">Phone</dt><dd className="font-medium text-navy-900">{b.guest.phone}</dd></div>
              <div><dt className="text-navy-500">Special requests</dt><dd className="font-medium text-navy-900">{b.guest.specialRequests || '—'}</dd></div>
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="text-xl text-navy-950">Your stay</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-navy-500">Check-in</dt><dd className="font-medium text-navy-900">{formatDate(b.checkIn)} from {HOTEL.checkIn}</dd></div>
              <div><dt className="text-navy-500">Check-out</dt><dd className="font-medium text-navy-900">{formatDate(b.checkOut)} by {HOTEL.checkOut}</dd></div>
              <div><dt className="text-navy-500">Hotel</dt><dd className="font-medium text-navy-900">{HOTEL.address}</dd></div>
              <div><dt className="text-navy-500">Contact</dt><dd className="font-medium text-navy-900">{HOTEL.phone}</dd></div>
            </dl>
          </section>

          {b.payments?.length > 0 && (
            <section className="card p-6">
              <h2 className="text-xl text-navy-950">Payments</h2>
              <ul className="mt-4 divide-y divide-beige-200 text-sm">
                {b.payments.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-navy-900">{formatCurrency(p.amount, p.currency, { decimals: 2 })} · {p.provider === 'mock' ? 'Development mock gateway' : 'Razorpay'}</p>
                      <p className="text-xs text-navy-500">{p.paymentId || p.orderId} · {formatDateTime(p.verifiedAt || p.createdAt)}</p>
                    </div>
                    <span className="text-xs font-semibold text-navy-700 uppercase">{titleCase(p.status)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside>
          <BookingSummaryCard
            room={{ id: b.room?.isActive ? b.room._id : undefined, name: b.roomSnapshot.name, category: b.roomSnapshot.category, image: b.roomSnapshot.image }}
            stay={{ checkIn: b.checkIn.slice(0, 10), checkOut: b.checkOut.slice(0, 10), nights: b.nights, adults: b.adults, children: b.children, rooms: b.rooms }}
          >
            <PriceSummary quote={{ ...b.pricing, nights: b.nights, rooms: b.rooms }} compact title="Price paid" />
          </BookingSummaryCard>
        </aside>
      </div>

      {canCancel && <CancelBookingDialog booking={b} open={cancelOpen} onClose={() => setCancelOpen(false)} onCancelled={() => reload()} />}
    </div>
  );
}
