import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import { ChartCard, ColumnChart, SERIES, TrendChart } from '../../components/dashboard/Charts';
import DataTable from '../../components/dashboard/DataTable';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { ErrorState, Skeleton } from '../../components/common/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useQueryFilters } from '../../hooks/useQueryFilters';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import { BOOKING_STATUS } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime, titleCase } from '../../utils/format';

const TYPES = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'bookings', label: 'Bookings' },
  { value: 'occupancy', label: 'Occupancy' },
  { value: 'cancellations', label: 'Cancellations' },
];

function Summary({ type, summary }) {
  const money = (v) => formatCurrency(v, summary.currency || 'INR');
  const cards = {
    revenue: [['Net revenue', money(summary.net)], ['Gross captured', money(summary.gross)], ['Refunded', money(summary.refunds)], ['Verified payments', summary.payments]],
    bookings: [['Bookings created', summary.total], ['Confirmed value', money(summary.confirmedValue)], ['Confirmed', summary.byStatus?.confirmed || 0], ['Cancelled', summary.byStatus?.cancelled || 0]],
    occupancy: [['Average occupancy', `${summary.averageOccupancyRate}%`], ['Room nights sold', summary.roomNights], ['Units in inventory', summary.totalUnits]],
    cancellations: [['Cancellations', summary.cancelled], ['Cancellation rate', `${summary.cancellationRate}%`], ['Refunds issued', money(summary.refunds)], ['Fees retained', money(summary.feesRetained)], ['By guests', summary.byGuest], ['By hotel', summary.byHotel], ['Expired unpaid', summary.expiredUnpaid]],
  }[type];
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([l, v], i) => <KpiCard key={l} label={l} value={v} accent={i === 0} />)}</div>;
}

const TABLES = {
  revenue: [
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'payments', label: 'Payments' },
    { key: 'gross', label: 'Gross', className: 'text-right', render: (r) => formatCurrency(r.gross) },
    { key: 'refunds', label: 'Refunds', className: 'text-right', render: (r) => formatCurrency(r.refunds) },
    { key: 'net', label: 'Net', className: 'text-right', render: (r) => formatCurrency(r.net) },
  ],
  bookings: [
    { key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'guest', label: 'Guest' },
    { key: 'room', label: 'Room' },
    { key: 'stay', label: 'Stay', render: (r) => `${formatDate(r.checkIn, { short: true })} → ${formatDate(r.checkOut, { short: true })}` },
    { key: 'status', label: 'Status', render: (r) => <BookingStatusBadge status={r.status} /> },
    { key: 'paymentStatus', label: 'Payment', render: (r) => <PaymentStatusBadge status={r.paymentStatus} /> },
    { key: 'total', label: 'Total', className: 'text-right', render: (r) => formatCurrency(r.total) },
  ],
  occupancy: [
    { key: 'date', label: 'Night', render: (r) => formatDate(r.date) },
    { key: 'occupied', label: 'Occupied (confirmed)' },
    { key: 'heldIncludingPending', label: 'Held incl. pending' },
    { key: 'totalUnits', label: 'Units' },
    { key: 'occupancyRate', label: 'Occupancy', render: (r) => `${r.occupancyRate}%` },
  ],
  cancellations: [
    { key: 'reference', label: 'Reference', render: (r) => <span className="font-mono text-xs">{r.reference}</span> },
    { key: 'guest', label: 'Guest' },
    { key: 'cancelledAt', label: 'Cancelled', render: (r) => formatDateTime(r.cancelledAt) },
    { key: 'cancelledBy', label: 'By', render: (r) => titleCase(r.cancelledBy || '') },
    { key: 'reason', label: 'Reason' },
    { key: 'fee', label: 'Fee', className: 'text-right', render: (r) => formatCurrency(r.fee) },
    { key: 'refund', label: 'Refund', className: 'text-right', render: (r) => formatCurrency(r.refund) },
  ],
};

export default function Reports() {
  useDocumentTitle('Reports');
  const [filters, setFilters, key] = useQueryFilters({ type: 'revenue', from: '', to: '' });
  const { data, loading, error, reload } = useAsync(() => adminService.reports({ type: filters.type, from: filters.from, to: filters.to }), [key]);
  const [exporting, setExporting] = useState(false);
  const report = data?.type === filters.type ? data : null;

  const exportCsv = async () => {
    setExporting(true);
    try {
      await adminService.downloadReport({ type: filters.type, from: filters.from, to: filters.to });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const rowsWithKey = report?.rows.map((r, i) => ({ ...r, _id: r.reference || r.date || i }));

  return (
    <>
      <AdminPageHeader
        title="Reports"
        description="Revenue counts only payments verified by the gateway, net of processed refunds."
        actions={<Button variant="outline" onClick={exportCsv} loading={exporting} disabled={!report}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</Button>}
      />
      <div className="card mb-6 flex flex-wrap items-end gap-4 p-4">
        <div role="tablist" aria-label="Report type" className="flex flex-wrap gap-1 rounded-xl bg-beige-100 p-1">
          {TYPES.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={filters.type === t.value} onClick={() => setFilters({ type: t.value, from: '', to: '' })} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${filters.type === t.value ? 'bg-white text-navy-950 shadow-sm' : 'text-navy-600 hover:text-navy-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="text-xs text-navy-500">From<input type="date" className="field mt-1 w-auto" value={filters.from || report?.range.from || ''} onChange={(e) => setFilters({ from: e.target.value })} /></label>
        <label className="text-xs text-navy-500">To<input type="date" className="field mt-1 w-auto" value={filters.to || report?.range.to || ''} onChange={(e) => setFilters({ to: e.target.value })} /></label>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !report ? (
        <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-72" /></div>
      ) : (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`}>
          <p className="text-sm text-navy-500">{formatDate(report.range.from)} – {formatDate(report.range.to)}</p>
          <Summary type={report.type} summary={report.summary} />
          {report.type === 'revenue' && (
            <ChartCard title="Net revenue by day" subtitle="Verified payments minus processed refunds">
              <TrendChart data={report.rows} dataKey="net" name="Net revenue" color={SERIES.gold} valueFormatter={(v) => formatCurrency(v)} />
            </ChartCard>
          )}
          {report.type === 'occupancy' && (
            <ChartCard title="Occupancy by night" subtitle="Confirmed and in-house stays as a share of active inventory">
              <ColumnChart data={report.rows} dataKey="occupancyRate" name="Occupancy" valueFormatter={(v) => `${v}%`} yDomain={[0, 100]} />
            </ChartCard>
          )}
          {report.type === 'bookings' && Object.keys(report.summary.byStatus).length > 0 && (
            <div className="card flex flex-wrap gap-x-6 gap-y-2 p-5 text-sm">
              {Object.entries(report.summary.byStatus).map(([s, n]) => <span key={s}><span className="text-navy-500">{BOOKING_STATUS[s]?.label || s}:</span> <strong>{n}</strong></span>)}
            </div>
          )}
          <DataTable columns={TABLES[report.type]} rows={rowsWithKey} empty={{ title: 'No data in this period' }} />
        </div>
      )}
    </>
  );
}
