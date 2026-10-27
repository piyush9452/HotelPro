import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import PageHero from '../components/common/PageHero';
import RoomCard, { RoomCardSkeleton } from '../components/rooms/RoomCard';
import RoomFilters from '../components/rooms/RoomFilters';
import DateRangePicker from '../components/booking/DateRangePicker';
import GuestSelector from '../components/booking/GuestSelector';
import Pagination from '../components/common/Pagination';
import Button from '../components/common/Button';
import { EmptyState, ErrorState } from '../components/common/Feedback';
import { Modal } from '../components/common/Modal';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { roomService } from '../services/roomService';
import { SORT_OPTIONS } from '../utils/constants';
import { isDateOnly, nightsBetween } from '../utils/dates';
import { guestsLabel, pluralize } from '../utils/format';

const list = (v) => (v ? v.split(',').filter(Boolean) : []);
const int = (v, d) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : d);

function readFilters(params) {
  return {
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    adults: int(params.get('adults'), 2),
    children: Math.max(0, Number(params.get('children')) || 0),
    rooms: int(params.get('rooms'), 1),
    category: list(params.get('category')),
    amenities: list(params.get('amenities')),
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    capacity: params.get('capacity') || '',
    sort: params.get('sort') || 'popularity',
    availableOnly: params.get('availableOnly') === 'true',
    page: int(params.get('page'), 1),
  };
}

export default function Rooms() {
  useDocumentTitle('Rooms & Suites');
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = useMemo(() => readFilters(params), [params]);
  const hasStay = isDateOnly(filters.checkIn) && isDateOnly(filters.checkOut) && nightsBetween(filters.checkIn, filters.checkOut) > 0;

  const update = (patch, { resetPage = true } = {}) => {
    const next = { ...filters, ...patch };
    if (resetPage && !('page' in patch)) next.page = 1;
    const out = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (Array.isArray(value)) {
        if (value.length) out.set(key, value.join(','));
      } else if (value !== '' && value !== false && value !== null && value !== undefined) {
        if (key === 'page' && value === 1) continue;
        if (key === 'sort' && value === 'popularity') continue;
        out.set(key, String(value));
      }
    }
    setParams(out, { replace: false });
  };

  const meta = useAsync(() => roomService.meta(), []);
  const rooms = useAsync(
    () =>
      roomService.list({
        page: filters.page,
        sort: filters.sort,
        category: filters.category.join(','),
        amenities: filters.amenities.join(','),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        capacity: filters.capacity,
        ...(hasStay
          ? { checkIn: filters.checkIn, checkOut: filters.checkOut, adults: filters.adults, children: filters.children, rooms: filters.rooms, availableOnly: filters.availableOnly ? 'true' : undefined }
          : {}),
      }),
    [params.toString()],
  );

  const reset = () => {
    const keep = new URLSearchParams();
    for (const k of ['checkIn', 'checkOut', 'adults', 'children', 'rooms']) if (params.get(k)) keep.set(k, params.get(k));
    setParams(keep);
  };

  const stayQuery = hasStay
    ? `?${new URLSearchParams({ checkIn: filters.checkIn, checkOut: filters.checkOut, adults: filters.adults, children: filters.children, rooms: filters.rooms })}`
    : '';
  const total = rooms.meta?.total ?? 0;

  return (
    <>
      <PageHero
        eyebrow="Accommodation"
        title="Rooms & Suites"
        subtitle="Choose your dates to see live availability and the full price of your stay."
        image="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=2000&q=70"
      />

      <div className="container-page -mt-8 pb-20">
        {/* Stay search bar */}
        <div className="card relative z-20 grid gap-3 p-4 md:grid-cols-[1.6fr_1.2fr_auto] md:items-center">
          <DateRangePicker checkIn={filters.checkIn} checkOut={filters.checkOut} onChange={(stay) => update(stay)} />
          <GuestSelector adults={filters.adults} children={filters.children} rooms={filters.rooms} onChange={(g) => update(g)} />
          <label className={`flex items-center gap-2 text-sm whitespace-nowrap ${hasStay ? 'text-navy-700' : 'text-navy-300'}`}>
            <input type="checkbox" className="h-4 w-4 accent-navy-900" checked={filters.availableOnly} disabled={!hasStay} onChange={(e) => update({ availableOnly: e.target.checked })} />
            Available only
          </label>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-24">
              <RoomFilters filters={filters} meta={meta.data} onChange={update} onReset={reset} />
            </div>
          </aside>

          <section aria-labelledby="results-heading">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="results-heading" className="font-sans text-lg font-semibold text-navy-950" aria-live="polite">
                  {rooms.loading ? 'Searching…' : `${pluralize(total, 'room type')} found`}
                </h2>
                {hasStay && (
                  <p className="text-sm text-navy-500">
                    {pluralize(nightsBetween(filters.checkIn, filters.checkOut), 'night')} · {guestsLabel(filters)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
                </Button>
                <label htmlFor="sort" className="sr-only">Sort rooms</label>
                <select id="sort" className="field h-9 w-auto py-1.5" value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {rooms.error ? (
              <ErrorState message={rooms.error} onRetry={rooms.reload} />
            ) : rooms.loading && !rooms.data ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <RoomCardSkeleton key={i} />)}</div>
            ) : !rooms.data?.length ? (
              <EmptyState
                icon={SearchX}
                title="No rooms match your search"
                description={filters.availableOnly ? 'Everything matching your filters is booked for these dates. Try different dates or fewer filters.' : 'Try removing some filters or widening your price range.'}
                action={<Button variant="outline" onClick={reset}>Clear filters</Button>}
              />
            ) : (
              <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${rooms.loading ? 'opacity-60 transition' : ''}`}>
                {rooms.data.map((room) => <RoomCard key={room._id} room={room} search={stayQuery} />)}
              </div>
            )}

            <Pagination page={filters.page} totalPages={rooms.meta?.totalPages} total={rooms.loading ? undefined : total} label="room types" onPageChange={(page) => { update({ page }, { resetPage: false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </section>
        </div>
      </div>

      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter rooms" footer={<Button onClick={() => setFiltersOpen(false)}>Show {pluralize(total, 'result')}</Button>}>
        <RoomFilters filters={filters} meta={meta.data} onChange={update} onReset={reset} />
      </Modal>
    </>
  );
}
