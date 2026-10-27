import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { AdminRoute, GuestOnlyRoute, ProtectedRoute, ScrollToTop } from './components/common/RouteGuards';
import { FullPageSpinner } from './components/common/Feedback';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetails from './pages/RoomDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Booking from './pages/Booking';
import BookingDetails from './pages/BookingDetails';
import MyBookings from './pages/MyBookings';
import Profile from './pages/Profile';
import Contact from './pages/Contact';
import About from './pages/About';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

// The admin area is split into its own chunk; guests never download it.
const AdminLayout = lazy(() => import('./components/layout/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminRooms = lazy(() => import('./pages/admin/AdminRooms'));
const RoomEditor = lazy(() => import('./pages/admin/RoomEditor'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminBookingDetail = lazy(() => import('./pages/admin/AdminBookingDetail'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Messages = lazy(() => import('./pages/admin/Messages'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="rooms/:id" element={<RoomDetails />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="reset-password" element={<ResetPassword />} />

            <Route element={<GuestOnlyRoute />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="booking/:roomId" element={<Booking />} />
              <Route path="bookings/:id" element={<BookingDetails />} />
              <Route path="my-bookings" element={<MyBookings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="rooms/new" element={<RoomEditor />} />
            <Route path="rooms/:id" element={<RoomEditor />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="messages" element={<Messages />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
