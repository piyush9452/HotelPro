import { EmptyState, ErrorState, Skeleton } from '../common/Feedback';

/** Table shell with loading, error and empty states. `columns`: { key, label, render, className }. */
export default function DataTable({ columns, rows, loading, error, onRetry, empty, rowKey = '_id' }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading && !rows) return <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!rows?.length) return <EmptyState title={empty?.title || 'Nothing here yet'} description={empty?.description} action={empty?.action} />;
  return (
    <div className={`card overflow-hidden ${loading ? 'opacity-60 transition' : ''}`}>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.className}>{c.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-beige-200 bg-white">
            {rows.map((row) => (
              <tr key={row[rowKey]} className="hover:bg-beige-50">
                {columns.map((c) => <td key={c.key} className={c.className}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
