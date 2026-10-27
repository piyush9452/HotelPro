import { useId, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table2 } from 'lucide-react';

// Validated with the dataviz palette checker against the light card surface
// (lightness band, chroma floor, CVD separation, contrast: all pass).
export const SERIES = { navy: '#3d63b8', gold: '#b08a1e' };
const GRID = '#eee4d3';
const AXIS_TEXT = { fill: '#6079ab', fontSize: 12 };

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
export const compactNumber = (v) => compact.format(v);

function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-beige-200 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="font-semibold text-navy-900">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-1 flex items-center gap-2 text-navy-700">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          {p.name}: <span className="font-semibold text-navy-950">{valueFormatter ? valueFormatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Card wrapper with a title and a table view so no value is chart-only. */
export function ChartCard({ title, subtitle, rows, columns, children, height = 260 }) {
  const [table, setTable] = useState(false);
  const id = useId();
  return (
    <section className="card p-5" aria-labelledby={id}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="font-sans text-base font-semibold text-navy-950">{title}</h2>
          {subtitle && <p className="text-xs text-navy-500">{subtitle}</p>}
        </div>
        {rows && (
          <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-navy-600 hover:bg-beige-100">
            <Table2 className="h-3.5 w-3.5" aria-hidden="true" /> {table ? 'Chart' : 'Table'}
          </button>
        )}
      </div>
      {table && rows ? (
        <div className="overflow-auto" style={{ maxHeight: height }}>
          <table className="table-base">
            <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-beige-200">
              {rows.map((r, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key}>{c.format ? c.format(r[c.key]) : r[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </section>
  );
}

const shortDay = (d) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));

/** Single-series column chart (counts per day, occupancy %, …). */
export function ColumnChart({ data, dataKey, name, color = SERIES.navy, valueFormatter, xKey = 'date', yDomain }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tickFormatter={shortDay} tick={AXIS_TEXT} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
        <YAxis tick={AXIS_TEXT} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={compactNumber} domain={yDomain} width={48} />
        <Tooltip cursor={{ fill: 'rgba(15,29,58,0.05)' }} content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={shortDay} />} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Single-series trend: 2px line over a 10% wash, crosshair tooltip. */
export function TrendChart({ data, dataKey, name, color = SERIES.gold, valueFormatter, xKey = 'date' }) {
  const gradientId = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey={xKey} tickFormatter={shortDay} tick={AXIS_TEXT} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
        <YAxis tick={AXIS_TEXT} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={48} />
        <Tooltip cursor={{ stroke: '#94a6cc', strokeWidth: 1 }} content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={shortDay} />} />
        <Area type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Labelled horizontal bars for a categorical breakdown (e.g. bookings by status). */
export function BreakdownBars({ items, color = SERIES.navy }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-navy-700">{i.label}</span>
            <span className="font-semibold text-navy-950 tabular-nums">{i.value}</span>
          </div>
          <div className="h-2.5 rounded-full bg-beige-100" title={`${i.label}: ${i.value}`}>
            <div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: color, minWidth: i.value ? 6 : 0 }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
