import { Link } from 'react-router-dom';
import { CalendarDays, Moon, Users } from 'lucide-react';
import { CATEGORY_LABELS } from '../../utils/constants';
import { formatDate, guestsLabel, pluralize } from '../../utils/format';

/** Room + stay summary shown during checkout and on booking details. */
export default function BookingSummaryCard({ room, stay, children }) {
  return (
    <div className="card overflow-hidden">
      {room.image && <img src={room.image} alt="" className="h-44 w-full object-cover" />}
      <div className="p-5">
        <p className="eyebrow">{CATEGORY_LABELS[room.category] || room.category}</p>
        <h3 className="mt-1 text-xl text-navy-950">
          {room.id ? <Link to={`/rooms/${room.id}`} className="hover:underline">{room.name}</Link> : room.name}
        </h3>
        <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
          <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-gold-700" aria-hidden="true" />{formatDate(stay.checkIn)} → {formatDate(stay.checkOut)}</li>
          <li className="flex items-center gap-2.5"><Moon className="h-4 w-4 text-gold-700" aria-hidden="true" />{pluralize(stay.nights, 'night')}</li>
          <li className="flex items-center gap-2.5"><Users className="h-4 w-4 text-gold-700" aria-hidden="true" />{guestsLabel(stay)}</li>
        </ul>
        {children && <div className="mt-5 border-t border-beige-200 pt-5">{children}</div>}
      </div>
    </div>
  );
}
