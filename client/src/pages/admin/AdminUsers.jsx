import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import DataTable from '../../components/dashboard/DataTable';
import SearchInput from '../../components/dashboard/SearchInput';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';

export function useUserStatusToggle(onDone) {
  const [target, setTarget] = useState(null);
  const confirm = async (reason) => {
    try {
      const res = await adminService.setUserStatus(target._id, !target.isActive, reason);
      toast.success(res.message);
      setTarget(null);
      onDone?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const dialog = (
    <ConfirmDialog
      open={Boolean(target)}
      onClose={() => setTarget(null)}
      onConfirm={confirm}
      title={target?.isActive ? 'Deactivate account?' : 'Reactivate account?'}
      description={target?.isActive ? `${target?.name} will be signed out everywhere and won’t be able to sign in. Their bookings remain valid.` : `${target?.name} will be able to sign in again.`}
      confirmLabel={target?.isActive ? 'Deactivate' : 'Reactivate'}
      tone={target?.isActive ? 'danger' : 'primary'}
      reasonLabel="Reason (saved to the audit log)"
    />
  );
  return { open: setTarget, dialog };
}

export default function AdminUsers() {
  useDocumentTitle('Users');
  const { user: me } = useAuth();
  const [filters, setFilters, key] = useQueryFilters({ q: '', role: '', status: '' });
  const { data, meta, loading, error, reload } = useAsync(() => adminService.users({ ...filters, limit: 20 }), [key]);
  const toggle = useUserStatusToggle(reload);

  const columns = [
    { key: 'name', label: 'Name', render: (u) => <Link to={`/admin/users/${u._id}`} className="font-semibold text-navy-900 hover:underline">{u.name}</Link> },
    { key: 'email', label: 'Contact', render: (u) => <>{u.email}<span className="block text-xs text-navy-500">{u.phone}</span></> },
    { key: 'role', label: 'Role', render: (u) => <Badge tone={u.role === 'admin' ? 'gold' : 'navy'}>{u.role === 'admin' ? 'Admin' : 'Guest'}</Badge> },
    { key: 'bookings', label: 'Bookings', render: (u) => u.bookingCount },
    { key: 'status', label: 'Status', render: (u) => (u.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Deactivated</Badge>) },
    { key: 'joined', label: 'Joined', render: (u) => <span className="text-xs text-navy-500">{formatDateTime(u.createdAt)}</span> },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      className: 'text-right',
      render: (u) =>
        u._id === me._id || u.role === 'admin' ? null : (
          <Button variant={u.isActive ? 'outline' : 'primary'} size="sm" onClick={() => toggle.open(u)}>{u.isActive ? 'Deactivate' : 'Reactivate'}</Button>
        ),
    },
  ];

  return (
    <>
      <AdminPageHeader title="Guests & users" description="Registered accounts and their booking activity." />
      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput value={filters.q} onSearch={(q) => setFilters({ q })} placeholder="Name, email or phone" />
        <select className="field w-auto" aria-label="Role" value={filters.role} onChange={(e) => setFilters({ role: e.target.value })}>
          <option value="">All roles</option><option value="user">Guests</option><option value="admin">Admins</option>
        </select>
        <select className="field w-auto" aria-label="Status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">Any status</option><option value="active">Active</option><option value="inactive">Deactivated</option>
        </select>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} empty={{ title: 'No users found' }} />
      <Pagination page={filters.page} totalPages={meta?.totalPages} total={meta?.total} label="users" onPageChange={(page) => setFilters({ page })} />
      {toggle.dialog}
    </>
  );
}
