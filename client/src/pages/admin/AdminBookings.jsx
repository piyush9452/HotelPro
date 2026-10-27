import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import DataTable from '../../components/dashboard/DataTable';
import SearchInput from '../../components/dashboard/SearchInput';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { adminService } from '../../services/adminService';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function AdminBookings() {
  useDocumentTitle('Bookings');
  const [filters, setFilters, key] = useQueryFilters({ q: '', status: '', paymentStatus: '', from: '', to: '', dateField: 'checkIn', room: '', user: '' });
  const { data, meta, loading, error, reload } = useAsync(() => adminService.bookings({ ...filters, limit: 20 }), [key]);
  const anyFilter = filters.q || filters.status || filters.paymentStatus || filters.from || filters.to || filters.room || filters.user;

  const columns = [
    { key: 'reference', label: 'Reference', render: (b) => <Link to={`/admin/bookings/${b._id}`} className="font-mono text-xs font-semibold text-navy-900 hover:underline">{b.reference}</Link> },
    { key: 'guest', label: 'Guest', render: (b) => <>{b.guest.firstName} {b.guest.lastName}<span className="block text-xs text-navy-500">{b.guest.email}</span></> },
    { key: 'room', label: 'Room', render: (b) => <>{b.roomSnapshot?.name}<span className="block text-xs text-navy-500">{b.rooms} room(s) · {b.adults + b.children} guests</span></> },
    { key: 'stay', label: 'Stay', render: (b) => <span className="whitespace-nowrap">{formatDate(b.checkIn, { short: true })} → {formatDate(b.checkOut, { short: true })}</span> },
    { key: 'status', label: 'Status', render: (b) => <BookingStatusBadge status={b.status} /> },
    { key: 'payment', label: 'Payment', render: (b) => <PaymentStatusBadge status={b.paymentStatus} /> },
    { key: 'total', label: 'Total', className: 'text-right', render: (b) => formatCurrency(b.pricing.total, b.pricing.currency) },
    { key: 'created', label: 'Created', render: (b) => <span className="text-xs whitespace-nowrap text-navy-500">{formatDateTime(b.createdAt)}</span> },
  ];

  return (
    <>
      <AdminPageHeader title="Bookings" description="Search, filter and manage every reservation." />
      <div className="card mb-5 space-y-3 p-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={filters.q} onSearch={(q) => setFilters({ q })} placeholder="Reference, guest name, email or phone" />
          <select className="field w-auto" aria-label="Booking status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
            <option value="">All statuses</option>
            {Object.entries(BOOKING_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <select className="field w-auto" aria-label="Payment status" value={filters.paymentStatus} onChange={(e) => setFilters({ paymentStatus: e.target.value })}>
            <option value="">All payments</option>
            {Object.entries(PAYMENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-navy-500">Date type
            <select className="field mt-1 w-auto" value={filters.dateField} onChange={(e) => setFilters({ dateField: e.target.value })}>
              <option value="checkIn">Check-in date</option>
              <option value="createdAt">Booking date</option>
            </select>
          </label>
          <label className="text-xs text-navy-500">From<input type="date" className="field mt-1 w-auto" value={filters.from} onChange={(e) => setFilters({ from: e.target.value })} /></label>
          <label className="text-xs text-navy-500">To<input type="date" className="field mt-1 w-auto" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilters({ to: e.target.value })} /></label>
          {anyFilter && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ q: '', status: '', paymentStatus: '', from: '', to: '', room: '', user: '' })}>
              <X className="h-4 w-4" aria-hidden="true" /> Clear filters
            </Button>
          )}
        </div>
        {(filters.room || filters.user) && <p className="text-xs text-navy-500">Showing bookings for a single {filters.room ? 'room type' : 'guest'}.</p>}
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} empty={{ title: 'No bookings match', description: anyFilter ? 'Try clearing some filters.' : 'Bookings will appear here as guests reserve rooms.' }} />
      <Pagination page={filters.page} totalPages={meta?.totalPages} total={meta?.total} label="bookings" onPageChange={(page) => setFilters({ page })} />
    </>
  );
}
