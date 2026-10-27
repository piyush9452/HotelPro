import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import DataTable from '../../components/dashboard/DataTable';
import Pagination from '../../components/common/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { adminService } from '../../services/adminService';
import { formatDateTime } from '../../utils/format';

const describe = (details) => {
  if (!details) return '—';
  return Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ');
};

export default function AuditLogs() {
  useDocumentTitle('Audit log');
  const [filters, setFilters, key] = useQueryFilters({ entityType: '' });
  const { data, meta, loading, error, reload } = useAsync(() => adminService.auditLogs({ ...filters, limit: 25 }), [key]);

  return (
    <>
      <AdminPageHeader title="Audit log" description="Every administrative change, who made it and when." />
      <div className="mb-5">
        <select className="field w-auto" aria-label="Entity type" value={filters.entityType} onChange={(e) => setFilters({ entityType: e.target.value })}>
          <option value="">All entities</option><option value="Booking">Bookings</option><option value="Room">Rooms</option><option value="User">Users</option><option value="ContactMessage">Messages</option>
        </select>
      </div>
      <DataTable
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: 'No audit entries yet' }}
        columns={[
          { key: 'when', label: 'When', render: (l) => <span className="text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</span> },
          { key: 'actor', label: 'Admin', render: (l) => l.actor?.name || 'System' },
          { key: 'action', label: 'Action', render: (l) => <span className="font-mono text-xs">{l.action}</span> },
          { key: 'entity', label: 'Entity', render: (l) => l.entityType },
          { key: 'details', label: 'Details', render: (l) => <span className="block max-w-md truncate text-xs text-navy-600" title={describe(l.details)}>{describe(l.details)}</span> },
          { key: 'ip', label: 'IP', render: (l) => <span className="font-mono text-xs text-navy-500">{l.ip || '—'}</span> },
        ]}
      />
      <Pagination page={filters.page} totalPages={meta?.totalPages} total={meta?.total} label="entries" onPageChange={(page) => setFilters({ page })} />
    </>
  );
}
