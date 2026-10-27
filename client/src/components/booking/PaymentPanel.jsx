import { Clock, CreditCard, FlaskConical, Lock, ShieldCheck } from 'lucide-react';
import Button from '../common/Button';
import { Alert } from '../common/Feedback';
import { Modal } from '../common/Modal';
import { usePayment } from '../../hooks/usePayment';
import { useCountdown } from '../../hooks/useCountdown';
import { formatCurrency } from '../../utils/format';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function PaymentPanel({ booking, onConfirmed, onExpired }) {
  const remaining = useCountdown(booking.expiresAt);
  const { config, processing, error, pay, mockOrder, completeMock, cancelMock } = usePayment({
    booking,
    onConfirmed,
    onNotHonoured: onExpired,
  });
  const expired = remaining === 0;
  const amount = formatCurrency(booking.pricing.total, booking.pricing.currency, { decimals: 2 });

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl text-navy-950">Payment</h2>
        {remaining !== null && !expired && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${remaining < 120 ? 'bg-red-50 text-red-700' : 'bg-gold-100 text-gold-800'}`} aria-live="polite">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Held for {mmss(remaining)}
          </span>
        )}
      </div>

      {expired ? (
        <Alert tone="warning" title="Your hold has expired" className="mt-4">
          The rooms were released because payment wasn’t completed in time. Please search again to make a new booking.
          {onExpired && (
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={onExpired}>Refresh status</Button>
            </div>
          )}
        </Alert>
      ) : (
        <>
          <p className="mt-2 text-sm text-navy-600">
            Complete payment to confirm booking <span className="font-semibold text-navy-900">{booking.reference}</span>. Your rooms are reserved while the timer runs.
          </p>

          {config?.isMock && (
            <Alert tone="warning" title="Development mode: mock payments" className="mt-4">
              Razorpay is not configured, so a simulated gateway is used. <strong>No real money is charged</strong> and no real transaction is created.
            </Alert>
          )}
          {config && !config.enabled && (
            <Alert tone="error" title="Online payment unavailable" className="mt-4">
              Online payments are not configured on this server. Please contact the hotel to complete your booking.
            </Alert>
          )}
          {error && <Alert tone="error" className="mt-4">{error}</Alert>}

          <Button block size="lg" className="mt-5" onClick={pay} loading={processing} disabled={!config?.enabled}>
            <CreditCard className="h-5 w-5" aria-hidden="true" /> Pay {amount}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-navy-500">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            {config?.isMock ? 'Simulated checkout for local development' : 'Secure checkout powered by Razorpay. We never see your card details.'}
          </p>
        </>
      )}

      <Modal
        open={Boolean(mockOrder)}
        onClose={processing ? undefined : cancelMock}
        dismissible={!processing}
        title="Mock payment gateway"
        size="sm"
      >
        <div className="flex items-start gap-3 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 p-4">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm text-amber-900">
            <strong>Development only.</strong> This simulates a payment gateway. No money moves and nothing is charged. The result is still signed and verified by the server, just like a real payment.
          </p>
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-navy-500">Order</dt><dd className="font-mono text-xs text-navy-800">{mockOrder?.orderId}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-500">Booking</dt><dd className="font-medium">{mockOrder?.bookingReference}</dd></div>
          <div className="flex justify-between"><dt className="text-navy-500">Amount</dt><dd className="font-serif text-lg font-semibold">{amount}</dd></div>
        </dl>
        <div className="mt-6 grid gap-2">
          <Button onClick={() => completeMock('success')} loading={processing} data-autofocus>
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Simulate successful payment
          </Button>
          <Button variant="outline" onClick={() => completeMock('failure')} disabled={processing}>
            Simulate failed payment
          </Button>
          <Button variant="ghost" onClick={cancelMock} disabled={processing}>
            Cancel checkout
          </Button>
        </div>
      </Modal>
    </div>
  );
}
