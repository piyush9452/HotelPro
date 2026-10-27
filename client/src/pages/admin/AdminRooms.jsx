import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarDays, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import DataTable from '../../components/dashboard/DataTable';
import SearchInput from '../../components/dashboard/SearchInput';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Pagination from '../../components/common/Pagination';
import { ConfirmDialog } from '../../components/common/Modal';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { getErrorMessage } from '../../services/api';
import { roomService } from '../../services/roomService';
import { CATEGORY_LABELS } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

export default function AdminRooms() {
  useDocumentTitle('Manage rooms');
  const [filters, setFilters, key] = useQueryFilters({ q: '', category: '', status: '' });
  const { data, meta, loading, error, reload } = useAsync(() => roomService.adminList({ ...filters, limit: 15 }), [key]);
  const [confirm, setConfirm] = useState(null);

  const toggleActive = async (room) => {
    try {
      if (room.isActive) {
        const res = await roomService.remove(room._id);
        toast.success(res.message);
      } else {
        await roomService.update(room._id, { isActive: true });
        toast.success(`${room.name} is bookable again`);
      }
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };
  const deletePermanently = async (room) => {
    try {
      await roomService.remove(room._id, { permanent: true });
      toast.success('Room deleted');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Room',
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.images?.[0] ? <img src={r.images[0].url} alt="" className="h-11 w-16 rounded-md object-cover" /> : <div className="h-11 w-16 rounded-md bg-beige-200" />}
          <div>
            <Link to={`/admin/rooms/${r._id}`} className="font-semibold text-navy-900 hover:underline">{r.name}</Link>
            <p className="font-mono text-xs text-navy-500">{r.roomNumber}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', render: (r) => CATEGORY_LABELS[r.category] },
    { key: 'price', label: 'Price / night', render: (r) => formatCurrency(r.pricePerNight) },
    { key: 'capacity', label: 'Capacity', render: (r) => `${r.maxAdults} + ${r.maxChildren}` },
    { key: 'inventory', label: 'Units', render: (r) => r.inventory },
    { key: 'status', label: 'Status', render: (r) => (r.isActive ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Inactive</Badge>) },
    {
      key: 'actions',
      label: <span className="sr-only">Actions</span>,
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" to={`/admin/rooms/${r._id}`} aria-label={`Edit ${r.name}`}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" to={`/admin/bookings?room=${r._id}`} aria-label={`Bookings for ${r.name}`}><CalendarDays className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'toggle', room: r })} aria-label={r.isActive ? `Deactivate ${r.name}` : `Activate ${r.name}`}>
            <Power className={`h-4 w-4 ${r.isActive ? 'text-emerald-600' : 'text-navy-400'}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm({ type: 'delete', room: r })} aria-label={`Delete ${r.name}`}><Trash2 className="h-4 w-4 text-red-600" /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title="Rooms" description="Room types, pricing, capacity and inventory." actions={<Button to="/admin/rooms/new"><Plus className="h-4 w-4" aria-hidden="true" /> Add room</Button>} />
      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput value={filters.q} onSearch={(q) => setFilters({ q })} placeholder="Search name or room number" />
        <select className="field w-auto" aria-label="Category" value={filters.category} onChange={(e) => setFilters({ category: e.target.value })}>
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="field w-auto" aria-label="Status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} empty={{ title: 'No rooms found', action: <Button to="/admin/rooms/new">Add your first room</Button> }} />
      <Pagination page={filters.page} totalPages={meta?.totalPages} total={meta?.total} label="rooms" onPageChange={(page) => setFilters({ page })} />

      <ConfirmDialog
        open={confirm?.type === 'toggle'}
        onClose={() => setConfirm(null)}
        title={confirm?.room?.isActive ? 'Deactivate room?' : 'Activate room?'}
        description={confirm?.room?.isActive ? `${confirm?.room?.name} will be hidden from guests and cannot be booked. Existing bookings stay valid.` : `${confirm?.room?.name} will become visible and bookable.`}
        confirmLabel={confirm?.room?.isActive ? 'Deactivate' : 'Activate'}
        tone={confirm?.room?.isActive ? 'danger' : 'primary'}
        onConfirm={async () => { await toggleActive(confirm.room); setConfirm(null); }}
      />
      <ConfirmDialog
        open={confirm?.type === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete room permanently?"
        description={`This permanently removes ${confirm?.room?.name}. Rooms that have ever been booked cannot be deleted; deactivate them instead.`}
        confirmLabel="Delete permanently"
        tone="danger"
        onConfirm={async () => { await deletePermanently(confirm.room); setConfirm(null); }}
      />
    </>
  );
}
