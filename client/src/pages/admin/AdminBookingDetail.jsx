import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, LogIn, LogOut, UserX, XCircle } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import PriceSummary from '../../components/booking/PriceSummary';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Alert, ErrorState, Spinner } from '../../components/common/Feedback';
import { ConfirmDialog } from '../../components/common/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatCurrency, formatDate, formatDateTime, guestsLabel, pluralize, titleCase } from '../../utils/format';

const ACTIONS = {
  confirmed: [
    { status: 'checked_in', label: 'Check in', icon: LogIn, tone: 'primary' },
    { status: 'no_show', label: 'Mark no-show', icon: UserX, tone: 'outline' },
    { status: 'cancelled', label: 'Cancel & refund', icon: XCircle, tone: 'danger' },
  ],
  pending: [{ status: 'cancelled', label: 'Cancel booking', icon: XCircle, tone: 'danger' }],
  checked_in: [{ status: 'checked_out', label: 'Check out', icon: LogOut, tone: 'primary' }],
};

function Info({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-navy-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words text-navy-900">{children}</dd>
    </div>
  );
}

export default function AdminBookingDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => adminService.booking(id), [id]);
  const [action, setAction] = useState(null);
  useDocumentTitle(data ? `Booking ${data.booking.reference}` : 'Booking');

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  const { booking: b, payments, auditTrail } = data;

  const runAction = async (note) => {
    try {
      const res = await adminService.setBookingStatus(b._id, action.status, note);
      toast.success(res.message);
      setAction(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <>
      <Link to="/admin/bookings" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All bookings</Link>
      <AdminPageHeader
        title={`Booking ${b.reference}`}
        description={`Created ${formatDateTime(b.createdAt)}`}
        actions={(ACTIONS[b.status] || []).map((a) => (
          <Button key={a.status} variant={a.tone} size="sm" onClick={() => setAction(a)}><a.icon className="h-4 w-4" aria-hidden="true" /> {a.label}</Button>
        ))}
      />
      <div className="mb-6 flex flex-wrap gap-2"><BookingStatusBadge status={b.status} /><PaymentStatusBadge status={b.paymentStatus} /></div>
      {b.paymentStatus === 'refund_pending' && <Alert tone="warning" className="mb-6" title="Refund pending">The refund could not be completed automatically. Please process it in the payment gateway dashboard.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 font-sans text-base font-semibold text-navy-950">Stay</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Info label="Room">{b.room ? <Link to={`/admin/rooms/${b.room._id}`} className="hover:underline">{b.roomSnapshot.name}</Link> : b.roomSnapshot.name} <span className="font-mono text-xs text-navy-500">{b.roomSnapshot.roomNumber}</span></Info>
              <Info label="Dates">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</Info>
              <Info label="Length">{pluralize(b.nights, 'night')}</Info>
              <Info label="Guests">{guestsLabel(b)}</Info>
              <Info label="Hold expires">{b.status === 'pending' ? formatDateTime(b.expiresAt) : '—'}</Info>
              <Info label="Confirmed">{formatDateTime(b.confirmedAt)}</Info>
            </dl>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 font-sans text-base font-semibold text-navy-950">Guest</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Name">{b.guest.firstName} {b.guest.lastName}</Info>
              <Info label="Email"><a href={`mailto:${b.guest.email}`} className="hover:underline">{b.guest.email}</a></Info>
              <Info label="Phone"><a href={`tel:${b.guest.phone}`} className="hover:underline">{b.guest.phone}</a></Info>
              <Info label="Account">{b.user ? <Link to={`/admin/users/${b.user._id}`} className="hover:underline">{b.user.name} ({b.user.email})</Link> : '—'}</Info>
              <div className="sm:col-span-2"><Info label="Special requests">{b.guest.specialRequests || '—'}</Info></div>
            </dl>
          </section>
          {b.cancellation?.cancelledAt && (
            <section className="card p-6">
              <h2 className="mb-4 font-sans text-base font-semibold text-navy-950">Cancellation</h2>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Info label="Cancelled">{formatDateTime(b.cancellation.cancelledAt)}</Info>
                <Info label="By">{b.cancellation.cancelledBy?.name || titleCase(b.cancellation.byRole)} ({b.cancellation.byRole})</Info>
                <Info label="Reason">{b.cancellation.reason || '—'}</Info>
                <Info label="Fee">{formatCurrency(b.cancellation.fee || 0, b.pricing.currency, { decimals: 2 })}</Info>
                <Info label="Refund">{formatCurrency(b.cancellation.refundAmount || 0, b.pricing.currency, { decimals: 2 })}</Info>
              </dl>
            </section>
          )}
          <section className="card p-6">
            <h2 className="mb-4 font-sans text-base font-semibold text-navy-950">Payments</h2>
            {payments.length ? (
              <ul className="divide-y divide-beige-200 text-sm">
                {payments.map((p) => (
                  <li key={p._id} className="py-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{formatCurrency(p.amount, p.currency, { decimals: 2 })} via {p.provider === 'mock' ? 'development mock' : 'Razorpay'}</span>
                      <span className="text-xs font-semibold uppercase">{titleCase(p.status)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-navy-500">order {p.orderId}{p.paymentId ? ` · payment ${p.paymentId}` : ''}</p>
                    <p className="text-xs text-navy-500">
                      {p.verifiedAt ? `Verified ${formatDateTime(p.verifiedAt)} via ${p.verifiedVia}` : `Created ${formatDateTime(p.createdAt)}`}
                      {p.failedAttempts ? ` · ${p.failedAttempts} failed attempt(s)${p.failureReason ? `: ${p.failureReason}` : ''}` : ''}
                      {p.refund?.amount ? ` · refund ${formatCurrency(p.refund.amount, p.currency)} (${p.refund.status})` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-navy-500">No payment attempts yet.</p>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5"><PriceSummary quote={{ ...b.pricing, nights: b.nights, rooms: b.rooms }} title="Price snapshot" compact /></section>
          <section className="card p-5">
            <h2 className="mb-3 font-sans text-base font-semibold text-navy-950">History</h2>
            <ol className="space-y-3 border-l-2 border-beige-200 pl-4 text-sm">
              {[...b.statusHistory].reverse().map((h, i) => (
                <li key={i}>
                  <p className="font-medium text-navy-900">{titleCase(h.status)}</p>
                  <p className="text-xs text-navy-500">{formatDateTime(h.at)}{h.by?.name ? ` · ${h.by.name}` : ''}</p>
                  {h.note && <p className="text-xs text-navy-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          </section>
          {auditTrail.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-sans text-base font-semibold text-navy-950">Admin audit trail</h2>
              <ul className="space-y-2 text-xs">
                {auditTrail.map((a) => <li key={a._id}><span className="font-semibold">{a.action}</span> by {a.actor?.name || 'system'} · {formatDateTime(a.createdAt)}</li>)}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title={action ? `${action.label}?` : ''}
        description={action?.status === 'cancelled' ? 'The guest will be notified and any payment refunded in full (hotel-initiated cancellation). The rooms return to inventory.' : `Booking ${b.reference} will be marked as ${titleCase(action?.status || '')}. This is recorded in the audit log.`}
        confirmLabel={action?.label}
        tone={action?.tone === 'danger' ? 'danger' : 'primary'}
        reasonLabel="Note (optional, saved to history)"
      />
    </>
  );
}
