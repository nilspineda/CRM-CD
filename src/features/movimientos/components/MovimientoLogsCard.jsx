import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { Download } from "lucide-react";

const DEFAULT_PAGE_SIZE = 50;

const getLogDateTime = (log) => log.created_at || log.fecha_hora || log.fecha;
const getLogUser = (log, fallbackUser) =>
  log.usuario_email ||
  log.user_email ||
  log.usuario ||
  log.user_name ||
  log.created_by ||
  fallbackUser ||
  "Sistema";
const getLogAction = (log) =>
  log.accion || log.action || log.tipo_accion || "Movimiento";
const getLogDetail = (log) => {
  if (log.detalle) return log.detalle;
  if (log.descripcion) return log.descripcion;
  if (log.observaciones) return log.observaciones;
  return "Sin detalle";
};

export default function MovimientoLogsCard({
  logs = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageChange,
  selectedMonth = "",
  onMonthChange,
  onDownload,
  downloading = false,
  currentUserLabel = "Sistema",
  title = "Logs de movimientos",
}) {
  const showPagination = totalPages > 1;

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0">
        {error && (
          <div className="px-4 sm:px-6 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">
            Error cargando logs: {error.message || String(error)}. Revisa la
            consola para más detalles.
          </div>
        )}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {totalCount} registros
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {onMonthChange && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => onMonthChange(event.target.value)}
                className="px-2 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-100"
              />
            )}
            {onDownload && (
              <Button
                variant="outline"
                onClick={onDownload}
                disabled={downloading || loading || logs.length === 0}
                className="shrink-0"
              >
                <Download size={14} className="mr-1" />
                Descargar
              </Button>
            )}
            <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Página {page} de {totalPages}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Acción
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay logs para mostrar
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={
                      log.id ||
                      `${getLogDateTime(log)}-${getLogAction(log)}-${getLogUser(log)}`
                    }
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {getLogDateTime(log)
                        ? new Date(getLogDateTime(log)).toLocaleString(
                            "es-CO",
                            {
                              dateStyle: "short",
                              timeStyle: "short",
                            },
                          )
                        : "-"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {getLogUser(log, currentUserLabel)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                      {getLogAction(log)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                      {getLogDetail(log)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showPagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {Math.min((page - 1) * pageSize + 1, totalCount)} -{" "}
              {Math.min(page * pageSize, totalCount)} de {totalCount}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
