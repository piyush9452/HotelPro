import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import SearchInput from '../../components/dashboard/SearchInput';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/common/Feedback';
import Pagination from '../../components/common/Pagination';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const TONES = { new: 'amber', read: 'navy', resolved: 'green' };

export default function Messages() {
  useDocumentTitle('Messages');
  const [filters, setFilters, key] = useQueryFilters({ q: '', status: '' });
  const { data, meta, loading, error, reload, setData } = useAsync(() => adminService.messages({ ...filters, limit: 15 }), [key]);
  const [busy, setBusy] = useState(null);

  const setStatus = async (m, status) => {
    setBusy(m._id);
    try {
      const res = await adminService.setMessageStatus(m._id, status);
      setData((list) => list.map((x) => (x._id === m._id ? res.data : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <AdminPageHeader title="Messages" description="Enquiries submitted through the contact form." />
      <div className="mb-5 flex flex-wrap gap-3">
        <SearchInput value={filters.q} onSearch={(q) => setFilters({ q })} placeholder="Name, email or subject" />
        <select className="field w-auto" aria-label="Status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
          <option value="">All</option><option value="new">New</option><option value="read">Read</option><option value="resolved">Resolved</option>
        </select>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-64" /> : !data?.length ? (
        <EmptyState icon={Mail} title="No messages" description="Contact form submissions will appear here." />
      ) : (
        <ul className="space-y-4">
          {data.map((m) => (
            <li key={m._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><h2 className="font-sans text-base font-semibold text-navy-950">{m.subject}</h2><Badge tone={TONES[m.status]}>{m.status}</Badge></div>
                  <p className="mt-1 text-sm text-navy-600">{m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-gold-700 hover:underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ''}</p>
                  <p className="text-xs text-navy-500">{formatDateTime(m.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  {m.status !== 'read' && m.status !== 'resolved' && <Button variant="outline" size="sm" loading={busy === m._id} onClick={() => setStatus(m, 'read')}>Mark read</Button>}
                  {m.status !== 'resolved' ? <Button size="sm" loading={busy === m._id} onClick={() => setStatus(m, 'resolved')}>Resolve</Button> : <Button variant="ghost" size="sm" onClick={() => setStatus(m, 'new')}>Reopen</Button>}
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-navy-800">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={filters.page} totalPages={meta?.totalPages} total={meta?.total} label="messages" onPageChange={(page) => setFilters({ page })} />
    </>
  );
}
