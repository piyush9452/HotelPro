import toast from 'react-hot-toast';
import { ConfirmDialog } from '../common/Modal';
import { Alert } from '../common/Feedback';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/format';

export default function CancelBookingDialog({ booking, open, onClose, onCancelled }) {
  const preview = booking.cancellationPreview;
  const currency = booking.pricing.currency;

  const confirm = async (reason) => {
    try {
      const res = await bookingService.cancel(booking._id, reason);
      toast.success(res.message || 'Booking cancelled');
      onCancelled?.(res.data);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={confirm}
      tone="danger"
      title="Cancel this booking?"
      confirmLabel="Yes, cancel booking"
      cancelLabel="Keep booking"
      reasonLabel="Reason for cancelling (optional)"
      description={`Booking ${booking.reference} will be cancelled and the rooms released. This cannot be undone.`}
    >
      {preview && booking.paymentStatus === 'paid' && (
        <Alert tone={preview.fee > 0 ? 'warning' : 'success'} className="mt-4">
          {preview.fee > 0 ? (
            <>
              Because check-in is inside the free-cancellation window, a fee of <strong>{formatCurrency(preview.fee, currency, { decimals: 2 })}</strong> (one night) applies. You will be refunded{' '}
              <strong>{formatCurrency(preview.refundAmount, currency, { decimals: 2 })}</strong>.
            </>
          ) : (
            <>You are within the free cancellation window. A full refund of <strong>{formatCurrency(preview.refundAmount, currency, { decimals: 2 })}</strong> will be issued.</>
          )}
        </Alert>
      )}
    </ConfirmDialog>
  );
}
