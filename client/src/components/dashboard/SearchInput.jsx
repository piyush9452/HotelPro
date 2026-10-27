import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

/** Debounced search box that commits to the parent after typing pauses. */
export default function SearchInput({ value, onSearch, placeholder = 'Search…', label = 'Search' }) {
  const [text, setText] = useState(value || '');
  const debounced = useDebounce(text, 400);
  useEffect(() => setText(value || ''), [value]);
  useEffect(() => {
    if ((debounced || '') !== (value || '')) onSearch(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return (
    <div className="relative min-w-56 flex-1">
      <label className="sr-only" htmlFor="admin-search">{label}</label>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden="true" />
      <input id="admin-search" type="search" className="field pl-9" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} maxLength={100} />
    </div>
  );
}
