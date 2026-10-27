import { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { CalendarDays } from 'lucide-react';
import Popover from '../common/Popover';
import { fromDateOnly, nightsBetween, toDateOnly } from '../../utils/dates';
import { formatDate, pluralize } from '../../utils/format';

function useIsWide() {
  const query = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/**
 * Check-in / check-out picker. Value and onChange use "YYYY-MM-DD" strings.
 */
export default function DateRangePicker({ checkIn, checkOut, onChange, error, className = '', variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const wide = useIsWide();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = { from: fromDateOnly(checkIn), to: fromDateOnly(checkOut) };
  const nights = nightsBetween(checkIn, checkOut);

  const handleSelect = (range) => {
    const next = { checkIn: range?.from ? toDateOnly(range.from) : '', checkOut: range?.to ? toDateOnly(range.to) : '' };
    if (next.checkIn && next.checkOut && next.checkIn === next.checkOut) next.checkOut = '';
    onChange(next);
    if (next.checkIn && next.checkOut) setOpen(false);
  };

  const trigger =
    variant === 'hero'
      ? 'w-full rounded-xl border border-beige-200 bg-white px-4 py-3 text-left hover:border-navy-300'
      : `field flex items-center gap-2 text-left ${error ? 'field-error' : ''}`;

  return (
    <div className={`relative ${className}`}>
      <button type="button" className={trigger} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        {variant === 'hero' ? (
          <span className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" />
            <span className="grid grid-cols-2 gap-6">
              <span>
                <span className="block text-[11px] font-semibold tracking-wider text-navy-500 uppercase">Check-in</span>
                <span className="block text-sm font-semibold text-navy-900">{checkIn ? formatDate(checkIn) : 'Add date'}</span>
              </span>
              <span>
                <span className="block text-[11px] font-semibold tracking-wider text-navy-500 uppercase">Check-out</span>
                <span className="block text-sm font-semibold text-navy-900">{checkOut ? formatDate(checkOut) : 'Add date'}</span>
              </span>
            </span>
          </span>
        ) : (
          <>
            <CalendarDays className="h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
            <span className={checkIn ? 'text-navy-900' : 'text-navy-400'}>
              {checkIn ? formatDate(checkIn, { short: true }) : 'Check-in'} — {checkOut ? formatDate(checkOut, { short: true }) : 'Check-out'}
            </span>
            {nights > 0 && <span className="ml-auto text-xs text-navy-500">{pluralize(nights, 'night')}</span>}
          </>
        )}
      </button>
      {error && <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      <Popover open={open} onClose={() => setOpen(false)} className="w-max max-w-[calc(100vw-2rem)]">
        <div role="dialog" aria-label="Choose your stay dates">
          <p className="mb-2 text-sm text-navy-600">
            {!checkIn ? 'Select your check-in date' : !checkOut ? 'Now select your check-out date' : `${pluralize(nights, 'night')} selected`}
          </p>
          <DayPicker
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={wide ? 2 : 1}
            disabled={{ before: today }}
            startMonth={today}
            defaultMonth={selected.from || today}
            resetOnSelect
            min={1}
            max={30}
          />
          <div className="mt-2 flex justify-between gap-2 border-t border-beige-200 pt-3">
            <button type="button" className="text-sm font-medium text-navy-600 underline-offset-2 hover:underline" onClick={() => onChange({ checkIn: '', checkOut: '' })}>
              Clear dates
            </button>
            <button type="button" className="text-sm font-semibold text-navy-900 underline-offset-2 hover:underline" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      </Popover>
    </div>
  );
}
