import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** URL-backed filter state for admin tables. Changing any filter resets to page 1. */
export function useQueryFilters(defaults) {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) if (params.has(key)) out[key] = params.get(key);
    out.page = Number(params.get('page')) || 1;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setFilters = (patch) => {
    const next = { ...filters, ...patch };
    if (!('page' in patch)) next.page = 1;
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v === undefined || v === null || (k === 'page' && Number(v) === 1)) continue;
      if (defaults[k] !== undefined && String(defaults[k]) === String(v) && k !== 'page') continue;
      out.set(k, String(v));
    }
    setParams(out);
  };
  return [filters, setFilters, params.toString()];
}
