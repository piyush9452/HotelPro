import { Link } from 'react-router-dom';

export default function Logo({ light = false, to = '/' }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="HotelPro home">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 ring-1 ring-gold-500/40">
        <span className="font-serif text-lg font-bold text-gold-400">H</span>
      </span>
      <span className={`font-serif text-xl font-semibold tracking-wide ${light ? 'text-white' : 'text-navy-900'}`}>
        Hotel<span className={light ? 'text-gold-400' : 'text-gold-700'}>Pro</span>
      </span>
    </Link>
  );
}
