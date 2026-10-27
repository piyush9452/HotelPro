import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FullPageSpinner } from './Feedback';

/** Requires a signed-in user; remembers where to return after login. */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children ?? <Outlet />;
}

/** UI-level guard only; the API enforces admin access on every request. */
export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children ?? <Outlet />;
}

/** Keeps signed-in users away from login/register. */
export function GuestOnlyRoute({ children }) {
  const { isAuthenticated, isAdmin, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={location.state?.from || (isAdmin ? '/admin' : '/')} replace />;
  return children ?? <Outlet />;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
