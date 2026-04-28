// filepath: src/features/movimientos/pages/MovimientosPage.jsx
import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Search,
  TrendingDown,
  DollarSign,
  Download,
} from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { movimientosService } from "../services/movimientosService";
import {
  TIPOS_MOVIMIENTO_BANCARIOS,
  TIPOS_MOVIMIENTO_BANCARIOS_VALUES,
} from "../constants";
import {
  formatCurrency,
  formatDate,
  getTipoMovimientoLabel,
  getEstadoLabel,
  getEstadoColor,
  formatDateInput,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";
import MovimientoForm from "../components/MovimientoForm";

const LOGS_PAGE_SIZE = 30;

export default function MovimientosPage() {
  const currentMonth = formatDateInput(new Date()).slice(0, 7);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState(null);
  const [mesFiltro, setMesFiltro] = useState(currentMonth);
  const [filtros, setFiltros] = useState({
    cuentaId: "",
    tipoMovimiento: "",
    estado: "",
    busqueda: "",
    ordenarPor: "fecha_desc",
  });
  const [stats, setStats] = useState({
    totalPagado: 0,
    cantidad: 0,
    pendientes: 0,
  });
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsCount, setLogsCount] = useState(0);

  const getMonthRange = (value) => {
    const [year, month] = (value || currentMonth).split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      fechaInicio: start.toISOString().split("T")[0],
      fechaFin: end.toISOString().split("T")[0],
    };
  };

  useEffect(() => {
    loadMovimientos();
  }, [filtros, mesFiltro]);

  useEffect(() => {
    loadLogs(logsPage);
  }, [logsPage]);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const data = await movimientosService.getAll({
        ...filtros,
        ...getMonthRange(mesFiltro),
      });
      const bancarios = (data || []).filter((movimiento) =>
        TIPOS_MOVIMIENTO_BANCARIOS_VALUES.includes(movimiento.tipo_movimiento),
      );
      setMovimientos(bancarios);

      const statsCalc = {
        totalPagado: 0,
        cantidad: bancarios.length,
        pendientes: 0,
      };
      bancarios.forEach((m) => {
        if (m.estado === "pendiente") {
          statsCalc.pendientes += 1;
        }
        if (m.estado === "pagado") {
          statsCalc.totalPagado += Math.abs(m.valor_total || 0);
        }
      });
      setStats(statsCalc);
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (movimientoData) => {
    try {
      if (movimientoEditando) {
        await movimientosService.update(movimientoEditando.id, movimientoData);
      } else {
        await movimientosService.create(movimientoData);
      }
      setModalOpen(false);
      setMovimientoEditando(null);
      loadMovimientos();
      if (logsPage === 1) {
        loadLogs(1);
      } else {
        setLogsPage(1);
      }
    } catch (error) {
      console.error("Error guardando movimiento:", error);
      alert(
        `Error al guardar el movimiento: ${error.message || "Revise los datos e intente nuevamente"}`,
      );
    }
  };

  const handleEdit = (movimiento) => {
    setMovimientoEditando(movimiento);
    setModalOpen(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFiltros({
      cuentaId: "",
      tipoMovimiento: "",
      estado: "",
      busqueda: "",
      ordenarPor: "fecha_desc",
    });
    setMesFiltro(currentMonth);
  };

  const handleExport = () => {
    exportToExcel({
      fileName: "movimientos-financieros",
      sheetName: "Movimientos",
      columns: [
        { header: "Fecha", value: (mov) => formatDate(mov.fecha) },
        {
          header: "Tipo",
          value: (mov) => getTipoMovimientoLabel(mov.tipo_movimiento),
        },
        {
          header: "Cuenta",
          value: (mov) => mov.cuentas_financieras?.nombre || "",
        },
        { header: "Total", value: (mov) => mov.valor_total || 0 },
        { header: "Estado", value: (mov) => getEstadoLabel(mov.estado) },
        { header: "Observaciones", value: (mov) => mov.observaciones || "" },
      ],
      rows: movimientos,
    });
  };

  const loadLogs = async (pageToLoad = 1) => {
    try {
      setLogsLoading(true);
      setLogsError("");
      const { data, count } = await movimientosService.getLogs({
        page: pageToLoad,
        pageSize: LOGS_PAGE_SIZE,
      });
      setLogs(data || []);
      setLogsCount(count || 0);
    } catch (error) {
      console.error("Error cargando logs de movimientos:", error);
      if (error?.code === "42P01") {
        setLogsError(
          "La tabla de logs no existe en Supabase. Crea movimientos_financieros_logs para habilitar esta vista.",
        );
      } else {
        setLogsError("No fue posible cargar los logs de movimientos.");
      }
      setLogs([]);
      setLogsCount(0);
    } finally {
      setLogsLoading(false);
    }
  };

  const getLogDateTime = (log) => log.created_at || log.fecha_hora || log.fecha;
  const getLogUser = (log) =>
    log.usuario_email ||
    log.user_email ||
    log.usuario ||
    log.user_name ||
    log.created_by ||
    "Sistema";
  const getLogAction = (log) =>
    log.accion || log.action || log.tipo_accion || "Movimiento";
  const getLogDetail = (log) => {
    if (log.detalle) return log.detalle;
    if (log.descripcion) return log.descripcion;
    if (log.observaciones) return log.observaciones;
    return "Sin detalle";
  };
  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const logsTotalPages = Math.max(1, Math.ceil(logsCount / LOGS_PAGE_SIZE));

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Movimientos Bancarios
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Solo egresos y movimientos de caja o banco
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Mes seleccionado: {mesFiltro}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || movimientos.length === 0}
            className="shrink-0"
          >
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button
            onClick={() => {
              setMovimientoEditando(null);
              setModalOpen(true);
            }}
            className="shrink-0"
          >
            <Plus size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Movimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg shrink-0">
                <TrendingDown className="text-red-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Movimientos</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">
                  {stats.cantidad}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg shrink-0">
                <DollarSign className="text-orange-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Total pagado</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">
                  {formatCurrency(stats.totalPagado)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-slate-100 rounded-lg shrink-0">
                <TrendingDown className="text-slate-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Pendientes</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">
                  {stats.pendientes}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 items-end">
            <div className="sm:col-span-2 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                name="busqueda"
                placeholder="Buscar..."
                value={filtros.busqueda}
                onChange={handleFilterChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              name="tipoMovimiento"
              value={filtros.tipoMovimiento}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Todos los movimientos</option>
              {TIPOS_MOVIMIENTO_BANCARIOS.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
            <select
              name="ordenarPor"
              value={filtros.ordenarPor}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="fecha_desc">Más recientes primero</option>
              <option value="fecha_asc">Más antiguos primero</option>
              <option value="valor_total_desc">Mayor valor primero</option>
              <option value="valor_total_asc">Menor valor primero</option>
            </select>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100"
            >
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de movimientos */}
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Cuenta
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay movimientos
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3">
                      <span className="md:hidden text-xs text-slate-500 mr-1">
                        Fecha:
                      </span>
                      <span className="text-sm text-slate-800">
                        {formatDate(mov.fecha)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="md:hidden text-xs text-slate-500 mr-1">
                        Cuenta:
                      </span>
                      <span className="text-sm text-slate-600">
                        {mov.cuentas_financieras?.nombre || "-"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {getTipoMovimientoLabel(mov.tipo_movimiento)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <span className="md:hidden text-xs text-slate-500 mr-1">
                        Valor:
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {formatCurrency(mov.valor_total)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(mov.estado)}`}
                      >
                        {getEstadoLabel(mov.estado)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(mov)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold hidden sm:table-footer-group">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right">
                  TOTAL PAGADO:
                </td>
                <td className="px-4 py-3 text-right text-slate-800">
                  {formatCurrency(stats.totalPagado)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="w-full overflow-hidden">
        <CardContent className="p-3 sm:p-4 md:p-6 border-b border-slate-200">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Logs de movimientos
              </h2>
              <p className="text-sm text-slate-600">
                Registro detallado de fecha, hora y usuario por cada accion.
              </p>
            </div>
          </div>
        </CardContent>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Fecha y hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Accion
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Movimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {logsLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Cargando logs...
                  </td>
                </tr>
              ) : logsError ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-amber-700 bg-amber-50"
                  >
                    {logsError}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No hay logs registrados.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={
                      log.id || `${getLogDateTime(log)}-${log.movimiento_id}`
                    }
                  >
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {formatDateTime(getLogDateTime(log))}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700">
                      {getLogUser(log)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {getLogAction(log)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      ID: {log.movimiento_id || log.movimientoId || "-"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-600">
                      {getLogDetail(log)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!logsError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Pagina {logsPage} de {logsTotalPages} · {logsCount} registros
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
                disabled={logsPage === 1 || logsLoading}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLogsPage((prev) => Math.min(logsTotalPages, prev + 1))
                }
                disabled={logsPage >= logsTotalPages || logsLoading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMovimientoEditando(null);
        }}
        title={movimientoEditando ? "Editar Movimiento" : "Nuevo Movimiento"}
        size="lg"
      >
        <MovimientoForm
          movimiento={movimientoEditando}
          onSave={handleSave}
          onCancel={() => {
            setModalOpen(false);
            setMovimientoEditando(null);
          }}
        />
      </Modal>
    </div>
  );
}
