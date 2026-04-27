// filepath: src/components/ui/Table.jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200/60">
      <table className="min-w-full divide-y divide-slate-200/60">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200/60">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500">
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TablePagination({ page, totalPages, onPageChange }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 bg-slate-50">
      <div className="text-sm text-slate-600">
        Página {page} de {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
