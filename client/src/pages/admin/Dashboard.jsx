import { Link } from 'react-router-dom';
import { BedDouble, CalendarCheck, CalendarClock, CalendarX, ChevronRight, IndianRupee, Percent, Users } from 'lucide-react';
import AdminPageHeader from '../../components/dashboard/AdminPageHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import { BreakdownBars, ChartCard, ColumnChart, SERIES, TrendChart } from '../../components/dashboard/Charts';
import { BookingStatusBadge, PaymentStatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { ErrorState, Skeleton } from '../../components/common/Feedback';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminService';
import { BOOKING_STATUS } from '../../utils/constants';
import { formatCurrency, formatDate, titleCase } from '../../utils/format';

export default function Dashboard() {
  useDocumentTitle('Admin dashboard');
  const { data, loading, error, reload } = useAsync(() => adminService.dashboard(), []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const { kpis, revenue, trend, occupancyForecast, recentBookings, bookingsByStatus, paymentSummary } = data;
  const money = (v) => formatCurrency(v, revenue.currency);
  const statusItems = Object.keys(BOOKING_STATUS).map((s) => ({ label: BOOKING_STATUS[s].label, value: bookingsByStatus[s] || 0 }));

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Live overview of bookings, occupancy and verified revenue."
        actions={<Button variant="outline" size="sm" onClick={reload} loading={loading}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard accent label="Net verified revenue" value={money(revenue.net)} hint={`${money(revenue.gross)} captured · ${money(revenue.refunds)} refunded`} icon={IndianRupee} />
        <KpiCard label="Total bookings" value={kpis.totalBookings} hint={`${kpis.completedBookings} completed stays · ${kpis.registeredGuests} registered guests`} icon={CalendarCheck} />
        <KpiCard label="Confirmed upcoming" value={kpis.confirmedBookings} hint={`${kpis.checkedIn} guests checked in`} icon={CalendarCheck} />
        <KpiCard label="Awaiting payment" value={kpis.pendingBookings} hint="Holds expire automatically" icon={CalendarClock} />
        <KpiCard label="Occupied tonight" value={`${kpis.occupiedTonight} / ${kpis.totalUnits}`} hint={`${kpis.occupancyRate}% occupancy`} icon={Percent} />
        <KpiCard label="Available tonight" value={kpis.availableTonight} hint="Units not held by any booking" icon={BedDouble} />
        <KpiCard label="Room types" value={kpis.activeRoomTypes} hint={`${kpis.categories} categories · ${kpis.inactiveRoomTypes} inactive`} icon={BedDouble} />
        <KpiCard label="Cancelled" value={kpis.cancelledBookings} hint={`${kpis.expiredBookings} more expired unpaid`} icon={CalendarX} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Verified payments (gross)"
          subtitle="Amount confirmed by the gateway per day, before refunds, last 30 days"
          rows={trend}
          columns={[{ key: 'date', label: 'Date', format: (d) => formatDate(d) }, { key: 'revenue', label: 'Revenue', format: money }]}
        >
          <TrendChart data={trend} dataKey="revenue" name="Revenue" color={SERIES.gold} valueFormatter={money} />
        </ChartCard>
        <ChartCard
          title="New bookings"
          subtitle="Bookings created per day, last 30 days"
          rows={trend}
          columns={[{ key: 'date', label: 'Date', format: (d) => formatDate(d) }, { key: 'bookings', label: 'Bookings' }]}
        >
          <ColumnChart data={trend} dataKey="bookings" name="Bookings" />
        </ChartCard>
        <ChartCard
          title="Occupancy forecast"
          subtitle="Share of room units held (confirmed and pending), next 7 nights"
          rows={occupancyForecast}
          columns={[{ key: 'date', label: 'Night', format: (d) => formatDate(d) }, { key: 'held', label: 'Held' }, { key: 'available', label: 'Available' }, { key: 'rate', label: 'Occupancy %' }]}
        >
          <ColumnChart data={occupancyForecast} dataKey="rate" name="Occupancy" valueFormatter={(v) => `${v}%`} yDomain={[0, 100]} />
        </ChartCard>
        <section className="card p-5">
          <h2 className="mb-4 font-sans text-base font-semibold text-navy-950">Bookings by status</h2>
          <BreakdownBars items={statusItems} />
          {paymentSummary.length > 0 && (
            <div className="mt-6 border-t border-beige-200 pt-4">
              <h3 className="mb-2 font-sans text-sm font-semibold text-navy-900">Payment records</h3>
              <ul className="grid gap-2 text-sm sm:grid-cols-2">
                {paymentSummary.map((p) => (
                  <li key={p.status} className="flex justify-between rounded-lg bg-beige-50 px-3 py-2">
                    <span className="text-navy-600">{titleCase(p.status)} ({p.count})</span>
                    <span className="font-semibold text-navy-900">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-sans text-base font-semibold text-navy-950">Recent bookings</h2>
          <Link to="/admin/bookings" className="inline-flex items-center text-sm font-medium text-gold-700 hover:underline">View all <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th scope="col">Reference</th><th scope="col">Guest</th><th scope="col">Room</th><th scope="col">Stay</th><th scope="col">Status</th><th scope="col">Payment</th><th scope="col" className="text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-beige-200">
              {recentBookings.length ? recentBookings.map((b) => (
                <tr key={b._id} className="hover:bg-beige-50">
                  <td><Link to={`/admin/bookings/${b._id}`} className="font-mono text-xs font-semibold text-navy-900 hover:underline">{b.reference}</Link></td>
                  <td>{b.guest.firstName} {b.guest.lastName}<span className="block text-xs text-navy-500">{b.user?.email}</span></td>
                  <td>{b.roomSnapshot?.name}</td>
                  <td className="whitespace-nowrap">{formatDate(b.checkIn, { short: true })} → {formatDate(b.checkOut, { short: true })}</td>
                  <td><BookingStatusBadge status={b.status} /></td>
                  <td><PaymentStatusBadge status={b.paymentStatus} /></td>
                  <td className="text-right font-medium">{formatCurrency(b.pricing.total, b.pricing.currency)}</td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="py-10 text-center text-navy-500"><Users className="mx-auto mb-2 h-6 w-6 text-navy-300" aria-hidden="true" />No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
