import { useState } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import Popover from '../common/Popover';
import { guestsLabel } from '../../utils/format';

function Stepper({ label, hint, value, min, max, onChange }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <p className="text-sm font-semibold text-navy-900">{label}</p>
        {hint && <p className="text-xs text-navy-500">{hint}</p>}
      </div>
      <div className="flex items-center gap-3" role="group" aria-label={label}>
        <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-700 hover:border-navy-500 disabled:opacity-30" aria-label={`Decrease ${label.toLowerCase()}`}>
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} className="flex h-8 w-8 items-center justify-center rounded-full border border-navy-200 text-navy-700 hover:border-navy-500 disabled:opacity-30" aria-label={`Increase ${label.toLowerCase()}`}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Adults / children / rooms selector. Each room needs at least one adult. */
export default function GuestSelector({ adults, children, rooms, onChange, variant = 'default', maxRooms = 5, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const set = (patch) => {
    const next = { adults, children, rooms, ...patch };
    if (next.rooms > next.adults) next.rooms = next.adults;
    onChange(next);
  };

  const trigger =
    variant === 'hero'
      ? 'w-full rounded-xl border border-beige-200 bg-white px-4 py-3 text-left hover:border-navy-300'
      : 'field flex items-center gap-2 text-left';

  return (
    <div className="relative">
      <button type="button" className={trigger} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        {variant === 'hero' ? (
          <span className="flex items-center gap-3">
            <Users className="h-5 w-5 shrink-0 text-gold-700" aria-hidden="true" />
            <span>
              <span className="block text-[11px] font-semibold tracking-wider text-navy-500 uppercase">Guests & rooms</span>
              <span className="block text-sm font-semibold text-navy-900">{guestsLabel({ adults, children, rooms })}</span>
            </span>
          </span>
        ) : (
          <>
            <Users className="h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
            <span className="truncate">{guestsLabel({ adults, children, rooms })}</span>
          </>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="w-80 max-w-[calc(100vw-2rem)]" align={align}>
        <div role="dialog" aria-label="Choose guests and rooms" className="divide-y divide-beige-200">
          <Stepper label="Adults" hint="Ages 13+" value={adults} min={1} max={20} onChange={(v) => set({ adults: v })} />
          <Stepper label="Children" hint="Ages 0–12" value={children} min={0} max={10} onChange={(v) => set({ children: v })} />
          <Stepper label="Rooms" hint="At least one adult per room" value={rooms} min={1} max={Math.min(maxRooms, adults)} onChange={(v) => set({ rooms: v })} />
        </div>
        <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-lg bg-navy-900 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Done
        </button>
      </Popover>
    </div>
  );
}
