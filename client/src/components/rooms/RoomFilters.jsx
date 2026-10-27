import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Checkbox } from '../common/FormControls';
import { CATEGORY_LABELS } from '../../utils/constants';

/**
 * Sidebar filters. Price inputs commit on blur/Enter so typing doesn't trigger
 * a request per keystroke; everything else applies immediately.
 */
export default function RoomFilters({ filters, meta, onChange, onReset }) {
  const [price, setPrice] = useState({ min: filters.minPrice || '', max: filters.maxPrice || '' });
  useEffect(() => setPrice({ min: filters.minPrice || '', max: filters.maxPrice || '' }), [filters.minPrice, filters.maxPrice]);

  const toggle = (key, value) => {
    const current = new Set(filters[key]);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    onChange({ [key]: [...current] });
  };
  const commitPrice = () => onChange({ minPrice: price.min, maxPrice: price.max });

  const section = 'border-b border-beige-200 py-5 first:pt-0 last:border-0';
  const heading = 'mb-3 font-sans text-sm font-semibold text-navy-900';

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-sans text-base font-semibold text-navy-950">Filters</h2>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-medium text-gold-700 hover:underline">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset
        </button>
      </div>

      <fieldset className={section}>
        <legend className={heading}>Room category</legend>
        <div className="space-y-2.5">
          {(meta?.categories || Object.keys(CATEGORY_LABELS).map((value) => ({ value }))).map((c) => (
            <Checkbox
              key={c.value}
              checked={filters.category.includes(c.value)}
              onChange={() => toggle('category', c.value)}
              label={
                <span className="flex w-full justify-between gap-2">
                  {CATEGORY_LABELS[c.value]}
                  {c.count !== undefined && <span className="text-navy-400">{c.count}</span>}
                </span>
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={heading}>Price per night (₹)</legend>
        <form className="grid grid-cols-2 gap-2" onSubmit={(e) => { e.preventDefault(); commitPrice(); }}>
          <label className="text-xs text-navy-500">
            Min
            <input type="number" min="0" inputMode="numeric" className="field mt-1" placeholder={meta?.priceRange?.min ?? 0} value={price.min} onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value }))} onBlur={commitPrice} />
          </label>
          <label className="text-xs text-navy-500">
            Max
            <input type="number" min="0" inputMode="numeric" className="field mt-1" placeholder={meta?.priceRange?.max ?? ''} value={price.max} onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value }))} onBlur={commitPrice} />
          </label>
        </form>
      </fieldset>

      <fieldset className={section}>
        <legend className={heading}>Minimum capacity</legend>
        <div className="flex flex-wrap gap-2">
          {['', '2', '3', '4', '6'].map((v) => (
            <button
              key={v || 'any'}
              type="button"
              onClick={() => onChange({ capacity: v })}
              aria-pressed={filters.capacity === v}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${filters.capacity === v ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-200 text-navy-700 hover:border-navy-400'}`}
            >
              {v ? `${v}+ guests` : 'Any'}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={heading}>Amenities</legend>
        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {(meta?.amenities || []).map((a) => (
            <Checkbox key={a} checked={filters.amenities.includes(a)} onChange={() => toggle('amenities', a)} label={a} />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
