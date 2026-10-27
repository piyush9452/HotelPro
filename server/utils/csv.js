// Prefixing cells that start with formula characters stops spreadsheet apps
// from executing them (CSV injection).
const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','),
  );
  return [header, ...lines].join('\n');
}
