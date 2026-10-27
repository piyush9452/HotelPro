import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import Button from '../common/Button';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/rooms', label: 'Rooms & Suites' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function UserMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-beige-100';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-beige-200 bg-white py-1 pr-3 pl-1 text-sm font-medium text-navy-800 hover:border-navy-200"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-semibold text-gold-400">
          {user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
        </span>
        <span className="max-w-[8rem] truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4 text-navy-400" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-beige-200 bg-white p-1.5 shadow-lift">
          <div className="border-b border-beige-200 px-3 pt-1.5 pb-2.5">
            <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-navy-500">{user.email}</p>
          </div>
          <div className="pt-1.5" onClick={() => setOpen(false)}>
            {isAdmin && (
              <Link role="menuitem" to="/admin" className={item}><LayoutDashboard className="h-4 w-4" /> Admin dashboard</Link>
            )}
            <Link role="menuitem" to="/my-bookings" className={item}><CalendarDays className="h-4 w-4" /> My bookings</Link>
            <Link role="menuitem" to="/profile" className={item}><User className="h-4 w-4" /> Profile</Link>
            <button role="menuitem" type="button" onClick={onLogout} className={`${item} text-red-700 hover:bg-red-50`}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('You have been signed out');
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `relative py-2 text-sm font-medium transition-colors ${isActive ? 'text-navy-950 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-gold-500' : 'text-navy-600 hover:text-navy-950'}`;

  return (
    <header className={`sticky top-0 z-40 border-b transition-all ${scrolled ? 'border-beige-200 bg-white/95 shadow-sm backdrop-blur' : 'border-transparent bg-beige-50/90 backdrop-blur'}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-navy-900 focus:px-3 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <nav className="container-page flex h-16 items-center justify-between gap-6" aria-label="Main">
        <Logo />
        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.to}><NavLink to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink></li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <UserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
          ) : (
            <>
              <Button variant="ghost" size="sm" to="/login">Sign in</Button>
              <Button variant="primary" size="sm" to="/rooms">Book now</Button>
            </>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-navy-800 hover:bg-beige-100 md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-beige-200 bg-white md:hidden">
          <ul className="container-page space-y-1 py-4">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.end} className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-base font-medium ${isActive ? 'bg-beige-100 text-navy-950' : 'text-navy-700'}`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li className="my-2 border-t border-beige-200" aria-hidden="true" />
            {user ? (
              <>
                {isAdmin && <li><Link to="/admin" className="block rounded-lg px-3 py-2.5 text-base text-navy-700">Admin dashboard</Link></li>}
                <li><Link to="/my-bookings" className="block rounded-lg px-3 py-2.5 text-base text-navy-700">My bookings</Link></li>
                <li><Link to="/profile" className="block rounded-lg px-3 py-2.5 text-base text-navy-700">Profile</Link></li>
                <li><button type="button" onClick={handleLogout} className="block w-full rounded-lg px-3 py-2.5 text-left text-base text-red-700">Sign out</button></li>
              </>
            ) : (
              <li className="flex gap-3 pt-1">
                <Button variant="outline" block to="/login">Sign in</Button>
                <Button block to="/register">Create account</Button>
              </li>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
