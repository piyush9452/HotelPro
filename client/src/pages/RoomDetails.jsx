import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BedDouble, Clock, Eye, Maximize2, ShieldCheck, Users } from 'lucide-react';
import RoomGallery from '../components/rooms/RoomGallery';
import { amenityIcon } from '../components/rooms/amenityIcons';
import DateRangePicker from '../components/booking/DateRangePicker';
import GuestSelector from '../components/booking/GuestSelector';
import PriceSummary from '../components/booking/PriceSummary';
import Button from '../components/common/Button';
import { Alert, ErrorState, Skeleton, Spinner } from '../components/common/Feedback';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useStayParams } from '../hooks/useStayParams';
import { roomService } from '../services/roomService';
import { BED_LABELS, CATEGORY_LABELS, HOTEL } from '../utils/constants';
import { formatCurrency } from '../utils/format';
import NotFound from './NotFound';

export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stay, setStay, query } = useStayParams();
  const room = useAsync(() => roomService.get(id), [id]);
  const availability = useAsync(
    () => roomService.availability({ roomId: id, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    [id, stay.checkIn, stay.checkOut, stay.adults, stay.children, stay.rooms],
    { enabled: stay.valid },
  );
  useDocumentTitle(room.data?.name || 'Room details');

  if (room.status === 404 || room.status === 400) return <NotFound title="Room not found" message="This room doesn’t exist or is no longer available." />;
  if (room.error) return <div className="container-page py-16"><ErrorState message={room.error} onRetry={room.reload} /></div>;
  if (room.loading || !room.data) {
    return (
      <div className="container-page space-y-4 py-10" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="aspect-[16/9] w-full" />
      </div>
    );
  }

  const r = room.data;
  const a = stay.valid ? availability.data : null;
  const canBook = stay.valid && a?.isAvailable && !availability.loading && !availability.error;

  const bookNow = () => {
    if (canBook) navigate(`/booking/${r._id}?${query}`);
  };

  return (
    <div className="container-page py-8 pb-20">
      <Link to={`/rooms${stay.valid ? `?${query}` : ''}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All rooms
      </Link>

      <div className="mt-4 mb-6">
        <p className="eyebrow">{CATEGORY_LABELS[r.category]}</p>
        <h1 className="mt-1 text-4xl text-navy-950">{r.name}</h1>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <RoomGallery images={r.images} name={r.name} />

          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Users, label: 'Capacity', value: `${r.maxAdults} adults${r.maxChildren ? `, ${r.maxChildren} child${r.maxChildren > 1 ? 'ren' : ''}` : ''}` },
              { icon: BedDouble, label: 'Beds', value: r.beds > 1 ? `${r.beds} × ${BED_LABELS[r.bedType].replace(/ beds?$/, '')}` : BED_LABELS[r.bedType] },
              r.size ? { icon: Maximize2, label: 'Size', value: `${r.size} sq ft` } : null,
              r.view ? { icon: Eye, label: 'View', value: r.view } : null,
            ]
              .filter(Boolean)
              .map(({ icon: Icon, label, value }) => (
                <li key={label} className="card p-4">
                  <Icon className="h-5 w-5 text-gold-700" aria-hidden="true" />
                  <p className="mt-2 text-xs text-navy-500">{label}</p>
                  <p className="text-sm font-semibold text-navy-900">{value}</p>
                </li>
              ))}
          </ul>

          <section className="mt-10">
            <h2 className="text-2xl text-navy-950">About this room</h2>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-navy-700">{r.description}</p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl text-navy-950">Amenities & facilities</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {r.amenities.map((name) => {
                const Icon = amenityIcon(name);
                return (
                  <li key={name} className="flex items-center gap-3 text-sm text-navy-700">
                    <span className="rounded-lg bg-beige-100 p-2 text-gold-700"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                    {name}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <Clock className="h-5 w-5 text-gold-700" aria-hidden="true" />
              <h3 className="mt-2 font-sans text-sm font-semibold text-navy-900">Check-in & check-out</h3>
              <p className="mt-1 text-sm text-navy-600">Check-in from {HOTEL.checkIn}. Check-out by {HOTEL.checkOut}.</p>
            </div>
            <div className="card p-5">
              <ShieldCheck className="h-5 w-5 text-gold-700" aria-hidden="true" />
              <h3 className="mt-2 font-sans text-sm font-semibold text-navy-900">Cancellation policy</h3>
              <p className="mt-1 text-sm text-navy-600">Free cancellation up to 48 hours before check-in. Later cancellations are charged one night.</p>
            </div>
          </section>
        </div>

        {/* Booking widget */}
        <aside aria-label="Book this room">
          <div className="card sticky top-24 p-6">
            <p>
              <span className="font-serif text-3xl font-semibold text-navy-950">{formatCurrency(r.pricePerNight)}</span>
              <span className="text-sm text-navy-500"> / night</span>
            </p>
            <div className="mt-5 space-y-3">
              <DateRangePicker checkIn={stay.checkIn} checkOut={stay.checkOut} onChange={setStay} />
              <GuestSelector adults={stay.adults} children={stay.children} rooms={stay.rooms} onChange={setStay} maxRooms={Math.min(5, r.inventory)} align="right" />
            </div>

            <div className="mt-5" aria-live="polite">
              {!stay.valid ? (
                <p className="rounded-lg bg-beige-100 px-3 py-2.5 text-sm text-navy-600">Select your dates to check availability and see the total price.</p>
              ) : availability.loading ? (
                <Spinner label="Checking availability…" className="py-6" />
              ) : availability.error ? (
                <Alert tone="error">{availability.error}</Alert>
              ) : a && !a.isAvailable ? (
                <Alert tone="warning" title={a.capacityIssue ? 'Too many guests for this room' : 'Not available for these dates'}>
                  {a.capacityIssue || (a.availableUnits > 0 ? `Only ${a.availableUnits} room(s) left. Reduce the number of rooms or change dates.` : 'Try different dates or another room type.')}
                </Alert>
              ) : a ? (
                <>
                  <p className="mb-3 text-sm font-medium text-emerald-700">
                    ✓ Available{a.availableUnits <= 3 ? ` (only ${a.availableUnits} left)` : ''}
                  </p>
                  <PriceSummary quote={a.quote} />
                </>
              ) : null}
            </div>

            <Button block size="lg" className="mt-5" onClick={bookNow} disabled={!canBook}>
              Book now
            </Button>
            <p className="mt-3 text-center text-xs text-navy-500">You won’t be charged until you confirm payment.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
