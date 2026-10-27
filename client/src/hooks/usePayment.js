import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getErrorCode, getErrorMessage } from '../services/api';
import { loadRazorpay, paymentService } from '../services/paymentService';

/**
 * Drives checkout for a pending booking. The booking is only marked paid after
 * the server verifies the gateway signature; nothing here trusts the browser.
 */
export function usePayment({ booking, onConfirmed, onNotHonoured }) {
  const [config, setConfig] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [mockOrder, setMockOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentService
      .config()
      .then((res) => setConfig(res.data))
      .catch(() => setConfig({ enabled: false }));
  }, []);

  const verify = useCallback(
    async ({ orderId, paymentId, signature }) => {
      try {
        const res = await paymentService.verify({ bookingId: booking._id, orderId, paymentId, signature });
        toast.success(res.message || 'Payment confirmed!');
        onConfirmed?.(res.data.booking);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
        if (getErrorCode(err) === 'BOOKING_NOT_HONOURED') onNotHonoured?.();
      }
    },
    [booking?._id, onConfirmed, onNotHonoured],
  );

  const reportFailure = useCallback(
    (orderId, reason) => paymentService.reportFailure({ bookingId: booking._id, orderId, reason }).catch(() => {}),
    [booking?._id],
  );

  const pay = useCallback(async () => {
    setError('');
    setProcessing(true);
    try {
      const { data: order } = await paymentService.createOrder(booking._id);

      if (order.isMock) {
        setMockOrder(order);
        return;
      }

      const Razorpay = await loadRazorpay();
      await new Promise((resolve) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amountMinor,
          currency: order.currency,
          order_id: order.orderId,
          name: 'HotelPro',
          description: `Booking ${order.bookingReference}`,
          prefill: order.prefill,
          theme: { color: '#0f1d3a' },
          handler: async (resp) => {
            await verify({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
            resolve();
          },
          modal: {
            ondismiss: () => {
              reportFailure(order.orderId, 'Checkout closed before payment');
              toast('Payment cancelled. Your rooms stay on hold until the timer runs out.', { icon: 'ℹ️' });
              resolve();
            },
          },
        });
        checkout.on('payment.failed', (resp) => {
          reportFailure(order.orderId, resp?.error?.description || 'Payment failed');
          setError(resp?.error?.description || 'Your payment failed. Please try again.');
        });
        checkout.open();
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  }, [booking?._id, verify, reportFailure]);

  // Development mock gateway: simulates the hosted checkout's outcome.
  const completeMock = useCallback(
    async (outcome) => {
      if (!mockOrder) return;
      setProcessing(true);
      try {
        const { data } = await paymentService.mockCheckout(mockOrder.orderId, outcome);
        if (data.status === 'success') {
          setMockOrder(null);
          await verify({ orderId: data.orderId, paymentId: data.paymentId, signature: data.signature });
        } else {
          await reportFailure(mockOrder.orderId, data.reason);
          setMockOrder(null);
          setError(`${data.reason}. You can try again.`);
          toast.error('Payment failed (simulated)');
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setProcessing(false);
      }
    },
    [mockOrder, verify, reportFailure],
  );

  const cancelMock = useCallback(() => {
    if (mockOrder) reportFailure(mockOrder.orderId, 'Checkout closed before payment');
    setMockOrder(null);
  }, [mockOrder, reportFailure]);

  return { config, processing, error, pay, mockOrder, completeMock, cancelMock };
}
