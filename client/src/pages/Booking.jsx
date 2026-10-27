import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import PriceSummary from '../components/booking/PriceSummary';
import PaymentPanel from '../components/booking/PaymentPanel';
import Steps from '../components/booking/Steps';
import Button from '../components/common/Button';
import { Alert, ErrorState, Spinner } from '../components/common/Feedback';
import { Input, Textarea } from '../components/common/FormControls';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useStayParams } from '../hooks/useStayParams';
import { applyServerErrors, getErrorMessage } from '../services/api';
import { bookingService } from '../services/bookingService';
import { roomService } from '../services/roomService';

// One idempotency key per stay selection, so a double click or a page refresh
// after submitting never creates a second booking.
function useIdempotencyKey(scope) {
  return useMemo(() => {
    const storageKey = `hp-booking-key:${scope}`;
    let key = sessionStorage.getItem(storageKey);
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem(storageKey, key);
    }
    return key;
  }, [scope]);
}

export default function Booking() {
  useDocumentTitle('Complete your booking');
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stay, query } = useStayParams();
  const [booking, setBooking] = useState(null);
  const idempotencyKey = useIdempotencyKey(`${roomId}?${query}`);

  const room = useAsync(() => roomService.get(roomId), [roomId]);
  const quote = useAsync(
    () => roomService.availability({ roomId, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    [roomId, query],
    { enabled: stay.valid && !booking },
  );

  const [firstName, ...rest] = (user?.name || '').split(' ');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { firstName, lastName: rest.join(' '), email: user?.email || '', phone: user?.phone || '', specialRequests: '', agree: false },
  });

  useEffect(() => {
    if (!stay.valid) toast.error('Please choose your dates first');
  }, [stay.valid]);

  const onSubmit = async ({ agree, ...guest }) => {
    try {
      const res = await bookingService.create({
        roomId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: stay.adults,
        children: stay.children,
        rooms: stay.rooms,
        guest,
        idempotencyKey,
      });
      setBooking(res.data);
      if (res.data.status !== 'pending') navigate(`/bookings/${res.data._id}`, { replace: true });
      else toast.success(res.message);
    } catch (err) {
      if (!applyServerErrors(err, (name, e) => setError(name.replace(/^guest\./, ''), e))) toast.error(getErrorMessage(err));
      quote.reload();
    }
  };

  const onConfirmed = (confirmed) => {
    sessionStorage.removeItem(`hp-booking-key:${roomId}?${query}`);
    navigate(`/bookings/${confirmed._id}?confirmed=1`, { replace: true });
  };

  if (!stay.valid) {
    return (
      <div className="container-page py-16">
        <Alert tone="warning" title="Choose your stay dates">
          We need your check-in and check-out dates to prepare your booking. <Link to={`/rooms/${roomId}`} className="font-semibold underline">Back to the room</Link>
        </Alert>
      </div>
    );
  }
  if (room.error) return <div className="container-page py-16"><ErrorState message={room.error} onRetry={room.reload} /></div>;
  if (room.loading) return <Spinner className="py-32" />;

  const r = room.data;
  const pricing = booking?.pricing ? { ...booking.pricing, nights: booking.nights, rooms: booking.rooms } : quote.data?.quote;
  const unavailable = !booking && quote.data && !quote.data.isAvailable;

  return (
    <div className="container-page py-8 pb-20">
      <Link to={`/rooms/${roomId}?${query}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to room
      </Link>
      <div className="mt-4 mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl text-navy-950 sm:text-4xl">{booking ? 'Confirm & pay' : 'Your details'}</h1>
        <Steps steps={['Guest details', 'Payment', 'Confirmation']} current={booking ? 1 : 0} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {quote.error && <Alert tone="error">{quote.error}</Alert>}
          {unavailable && (
            <Alert tone="warning" title="These rooms are no longer available">
              {quote.data.capacityIssue || 'Someone may have just booked the last room for your dates.'}{' '}
              <Link to={`/rooms?${query}&availableOnly=true`} className="font-semibold underline">See available rooms</Link>
            </Alert>
          )}

          {booking ? (
            <PaymentPanel booking={booking} onConfirmed={onConfirmed} onExpired={() => navigate(`/bookings/${booking._id}`)} />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-6" noValidate>
              <div>
                <h2 className="text-xl text-navy-950">Guest information</h2>
                <p className="mt-1 text-sm text-navy-500">Who is staying? We’ll send the confirmation to this email.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="First name" required autoComplete="given-name" error={errors.firstName?.message} {...register('firstName', { required: 'First name is required', maxLength: { value: 60, message: 'Too long' } })} />
                <Input label="Last name" required autoComplete="family-name" error={errors.lastName?.message} {...register('lastName', { required: 'Last name is required', maxLength: { value: 60, message: 'Too long' } })} />
                <Input label="Email" type="email" required autoComplete="email" error={errors.email?.message} {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />
                <Input label="Phone" type="tel" required autoComplete="tel" error={errors.phone?.message} {...register('phone', { required: 'Phone is required', pattern: { value: /^\+?[0-9\s-]{7,20}$/, message: 'Enter a valid phone number' } })} />
              </div>
              <Textarea label="Special requests" hint="Optional. E.g. high floor, late arrival, dietary needs. Requests are subject to availability." rows={3} maxLength={500} error={errors.specialRequests?.message} {...register('specialRequests', { maxLength: { value: 500, message: 'Keep requests under 500 characters' } })} />
              <div>
                <label className="flex items-start gap-2.5 text-sm text-navy-700">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-navy-900" aria-invalid={errors.agree ? true : undefined} {...register('agree', { required: 'Please accept the terms to continue' })} />
                  <span>
                    I agree to the <Link to="/terms" target="_blank" className="font-medium text-gold-700 underline">terms & conditions</Link> and the cancellation policy (free up to 48 hours before check-in).
                  </span>
                </label>
                {errors.agree && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{errors.agree.message}</p>}
              </div>
              <Button type="submit" size="lg" block loading={isSubmitting} disabled={unavailable || quote.loading || Boolean(quote.error)}>
                Continue to payment
              </Button>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <BookingSummaryCard
            room={{ id: r._id, name: r.name, category: r.category, image: r.images?.[0]?.url }}
            stay={{ checkIn: stay.checkIn, checkOut: stay.checkOut, nights: stay.nights, adults: stay.adults, children: stay.children, rooms: stay.rooms }}
          >
            {quote.loading && !pricing ? <Spinner label="Calculating price…" className="py-4" /> : <PriceSummary quote={pricing} compact />}
          </BookingSummaryCard>
        </aside>
      </div>
    </div>
  );
}
