import { Link } from 'react-router-dom';
import { BedDouble, Maximize2, Users } from 'lucide-react';
import Badge from '../common/Badge';
import { Skeleton } from '../common/Feedback';
import { amenityIcon } from './amenityIcons';
import { BED_LABELS, CATEGORY_LABELS } from '../../utils/constants';
import { formatCurrency, pluralize } from '../../utils/format';

export default function RoomCard({ room, search = '' }) {
  const availability = room.availability;
  const href = `/rooms/${room._id}${search}`;
  const image = room.images?.[0];

  return (
    <article className="group card relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={href} className="relative block aspect-[4/3] overflow-hidden bg-beige-200" tabIndex={-1} aria-hidden="true">
        {image ? (
          <img src={image.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-300"><BedDouble className="h-10 w-10" /></div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-navy-900 shadow-sm">
          {CATEGORY_LABELS[room.category] || room.category}
        </span>
        {room.featured && <span className="absolute top-3 right-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-semibold text-navy-950">Featured</span>}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl text-navy-950">
          <Link to={href} className="after:absolute after:inset-0 focus:outline-none">
            <span className="relative">{room.name}</span>
          </Link>
        </h3>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-600">
          <li className="flex items-center gap-1.5"><Users className="h-4 w-4 text-gold-700" aria-hidden="true" />Up to {room.maxAdults + room.maxChildren} guests</li>
          <li className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-gold-700" aria-hidden="true" />{room.beds > 1 ? `${room.beds} beds` : BED_LABELS[room.bedType]}</li>
          {room.size ? <li className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-gold-700" aria-hidden="true" />{room.size} sq ft</li> : null}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Highlights">
          {room.amenities.slice(0, 4).map((a) => {
            const Icon = amenityIcon(a);
            return (
              <li key={a} className="inline-flex items-center gap-1.5 rounded-full bg-beige-100 px-2.5 py-1 text-xs text-navy-700">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />{a}
              </li>
            );
          })}
          {room.amenities.length > 4 && <li className="rounded-full px-1 py-1 text-xs text-navy-500">+{room.amenities.length - 4} more</li>}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="font-serif text-2xl font-semibold text-navy-950">{formatCurrency(room.pricePerNight)}</p>
            <p className="text-xs text-navy-500">per night, before taxes</p>
            {availability?.quote && (
              <p className="mt-1 text-xs font-medium text-navy-700">
                {formatCurrency(availability.quote.total, availability.quote.currency)} total for {pluralize(availability.quote.nights, 'night')}
              </p>
            )}
          </div>
          {availability && (
            availability.isAvailable ? (
              <Badge tone={availability.availableUnits <= 2 ? 'amber' : 'green'}>
                {availability.availableUnits <= 2 ? `Only ${availability.availableUnits} left` : 'Available'}
              </Badge>
            ) : (
              <Badge tone="red">{availability.capacityIssue ? 'Too many guests' : 'Sold out'}</Badge>
            )
          )}
        </div>
      </div>
    </article>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2"><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-6 w-24 rounded-full" /></div>
        <Skeleton className="mt-4 h-8 w-28" />
      </div>
    </div>
  );
}
