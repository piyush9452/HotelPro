import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BedDouble, CalendarDays, ChartColumn, ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/admin/users', label: 'Guests & users', icon: Users },
  { to: '/admin/reports', label: 'Reports', icon: ChartColumn },
  { to: '/admin/messages', label: 'Messages', icon: Inbox },
  { to: '/admin/audit-logs', label: 'Audit log', icon: FileText },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/');
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Logo light to="/admin" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-navy-200 hover:bg-white/5 hover:text-white'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-gold-400' : ''}`} aria-hidden="true" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link to="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> View website
        </Link>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
        <p className="truncate px-3 pt-2 text-xs text-navy-400">Signed in as {user?.email}</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-screen bg-beige-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-950 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-950 shadow-xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-3 rounded-lg p-1.5 text-navy-200 hover:bg-white/10" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-beige-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-navy-800 hover:bg-beige-100" aria-label="Open menu" aria-expanded={open}>
            <Menu className="h-6 w-6" />
          </button>
          <Logo to="/admin" />
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
