import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import GuestSelector from './GuestSelector';
import Button from '../common/Button';
import { addDays, todayDateOnly } from '../../utils/dates';

/** Hero booking search. Submits to the rooms page with the stay in the URL. */
export default function SearchForm({ initial = {}, className = '' }) {
  const navigate = useNavigate();
  const [stay, setStay] = useState({
    checkIn: initial.checkIn || addDays(todayDateOnly(), 1),
    checkOut: initial.checkOut || addDays(todayDateOnly(), 3),
  });
  const [guests, setGuests] = useState({ adults: initial.adults || 2, children: initial.children || 0, rooms: initial.rooms || 1 });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!stay.checkIn || !stay.checkOut) {
      setError('Please choose your check-in and check-out dates');
      return;
    }
    setError('');
    const params = new URLSearchParams({ ...stay, adults: guests.adults, children: guests.children, rooms: guests.rooms, availableOnly: 'true' });
    navigate(`/rooms?${params}`);
  };

  return (
    <form onSubmit={submit} className={`rounded-2xl bg-white/95 p-3 shadow-lift backdrop-blur ${className}`} aria-label="Search available rooms">
      <div className="grid gap-3 md:grid-cols-[2fr_1.2fr_auto]">
        <DateRangePicker variant="hero" checkIn={stay.checkIn} checkOut={stay.checkOut} onChange={setStay} />
        <GuestSelector variant="hero" {...guests} onChange={setGuests} align="right" />
        <Button type="submit" size="lg" className="h-auto min-h-14 md:px-8">
          <Search className="h-5 w-5" aria-hidden="true" /> Check availability
        </Button>
      </div>
      {error && <p role="alert" className="px-2 pt-2 text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}
