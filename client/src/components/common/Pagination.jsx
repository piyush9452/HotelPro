import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function Pagination({ page, totalPages, onPageChange, total, label = 'results' }) {
  if (!totalPages || totalPages <= 1) {
    return total !== undefined ? <p className="mt-6 text-sm text-navy-500">{total} {label}</p> : null;
  }
  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition';
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
      {total !== undefined && <p className="text-sm text-navy-500">Page {page} of {totalPages} · {total} {label}</p>}
      <ul className="flex items-center gap-1">
        <li>
          <button type="button" className={`${btn} text-navy-700 hover:bg-navy-50 disabled:opacity-40`} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
        </li>
        {pageList(page, totalPages).map((p) =>
          typeof p === 'string' ? (
            <li key={p} className="px-1 text-navy-400" aria-hidden="true">…</li>
          ) : (
            <li key={p}>
              <button
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${p === page ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-navy-50'}`}
              >
                {p}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={`${btn} text-navy-700 hover:bg-navy-50 disabled:opacity-40`} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
