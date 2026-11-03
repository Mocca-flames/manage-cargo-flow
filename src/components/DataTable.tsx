import type { ReactNode } from 'react';

export interface Column<T> { header: string; cell: (row: T) => ReactNode }

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  empty?: string;
}

export function DataTable<T>({ rows, columns, rowKey, empty = 'Nothing to show.' }: Props<T>) {
  if (rows.length === 0) return <p className='muted'>{empty}</p>;
  return (
    <div className='table-wrap'>
      <table className='table'>
        <thead>
          <tr>{columns.map((c) => <th key={c.header}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((c) => <td key={c.header}>{c.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
