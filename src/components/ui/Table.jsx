import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Table({ columns, data, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200/60 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200/60 dark:divide-slate-700">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500 dark:text-slate-400">
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors' : ''}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
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
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Página {page} de {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
