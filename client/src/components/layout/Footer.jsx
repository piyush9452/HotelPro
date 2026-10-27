import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from '../common/Logo';
import { HOTEL } from '../../utils/constants';

const COLUMNS = [
  { title: 'Stay', links: [{ to: '/rooms', label: 'Rooms & Suites' }, { to: '/rooms?category=suite', label: 'Suites' }, { to: '/rooms?category=family', label: 'Family rooms' }, { to: '/my-bookings', label: 'Manage booking' }] },
  { title: 'Hotel', links: [{ to: '/about', label: 'About us' }, { to: '/contact', label: 'Contact' }, { to: '/privacy', label: 'Privacy policy' }, { to: '/terms', label: 'Terms & conditions' }] },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-navy-200">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">
            Timeless hospitality on the Mumbai waterfront. Thoughtful rooms, attentive service and memorable stays since 1998.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="font-sans text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">{col.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}><Link to={l.to} className="text-navy-200 transition hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="font-sans text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" /><span>{HOTEL.address}</span></li>
            <li className="flex gap-2.5"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" /><a href={`tel:${HOTEL.phone.replace(/\s/g, '')}`} className="hover:text-white">{HOTEL.phone}</a></li>
            <li className="flex gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" aria-hidden="true" /><a href={`mailto:${HOTEL.email}`} className="hover:text-white">{HOTEL.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} HotelPro Hotels & Resorts. All rights reserved.</p>
          <p>Check-in from {HOTEL.checkIn} · Check-out by {HOTEL.checkOut}</p>
        </div>
      </div>
    </footer>
  );
}
