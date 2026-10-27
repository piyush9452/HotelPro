import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import DataTable from '../../components/dashboard/DataTable';
import Badge, { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { ErrorState, Spinner } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { useUserStatusToggle } from './AdminUsers';

export default function AdminUserDetail() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useAsync(() => adminService.user(id), [id]);
  const toggle = useUserStatusToggle(reload);
  useDocumentTitle(data?.user?.name || 'User');

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  const { user, bookings, stats } = data;

  return (
    <>
      <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-950"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All users</Link>
      <AdminPageHeader
        title={user.name}
        description={`${user.email} · ${user.phone}`}
        actions={user._id !== me._id && user.role !== 'admin' && (
          <Button variant={user.isActive ? 'danger' : 'primary'} size="sm" onClick={() => toggle.open(user)}>{user.isActive ? 'Deactivate account' : 'Reactivate account'}</Button>
        )}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={user.role === 'admin' ? 'gold' : 'navy'}>{user.role === 'admin' ? 'Admin' : 'Guest'}</Badge>
        {user.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>}
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Bookings" value={stats.total} />
        <KpiCard label="Total spent" value={formatCurrency(stats.spent)} />
        <KpiCard label="Last sign-in" value={<span className="text-xl">{formatDateTime(user.lastLoginAt)}</span>} hint={`Joined ${formatDateTime(user.createdAt)}`} />
      </div>
      <h2 className="mb-3 font-sans text-base font-semibold text-navy-950">Booking history</h2>
      <DataTable
        rows={bookings}
        columns={[
          { key: 'ref', label: 'Reference', render: (b) => <Link to={`/admin/bookings/${b._id}`} className="font-mono text-xs font-semibold hover:underline">{b.reference}</Link> },
          { key: 'room', label: 'Room', render: (b) => b.roomSnapshot?.name },
          { key: 'stay', label: 'Stay', render: (b) => `${formatDate(b.checkIn, { short: true })} → ${formatDate(b.checkOut, { short: true })}` },
          { key: 'status', label: 'Status', render: (b) => <BookingStatusBadge status={b.status} /> },
          { key: 'pay', label: 'Payment', render: (b) => <PaymentStatusBadge status={b.paymentStatus} /> },
          { key: 'total', label: 'Total', className: 'text-right', render: (b) => formatCurrency(b.pricing.total, b.pricing.currency) },
        ]}
        empty={{ title: 'No bookings yet' }}
      />
      {toggle.dialog}
    </>
  );
}
