// filepath: src/features/movimientos/pages/MovimientosPage.jsx
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
const PAGE_SIZE = 30;

export default function MovimientosPage() {
  const currentMonth = formatDateInput(new Date()).slice(0, 7);
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
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const queryClient = useQueryClient();

  const getMonthRange = (value) => {
    const [year, month] = (value || currentMonth).split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      fechaInicio: start.toISOString().split("T")[0],
      fechaFin: end.toISOString().split("T")[0],
    };
  };

  const { data: tiposData = [] } = useQuery({
    queryKey: ["movimientos", "tipos"],
    queryFn: movimientosService.getTiposMovimientoDisponibles,
    staleTime: Infinity,
  });

  const { data: movimientosData = [], isLoading } = useQuery({
    queryKey: ["movimientos", filtros, mesFiltro],
    queryFn: () =>
      movimientosService.getAll({
        ...filtros,
        ...getMonthRange(mesFiltro),
      }),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["movimientos", "logs", logsPage],
    queryFn: () =>
      movimientosService.getLogs({
        page: logsPage,
        pageSize: LOGS_PAGE_SIZE,
      }),
    initialData: { data: [], count: 0 },
  });

  const crearMutate = useMutation({
    mutationFn: movimientosService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => movimientosService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movimientos"] });
    },
  });

  const tiposMovimiento = useMemo(
    () => (tiposData.length > 0 ? tiposData : ["factura_venta"]),
    [tiposData],
  );

  const movimientosFiltrados = useMemo(() => {
    return movimientosData.filter((movimiento) =>
      tiposMovimiento.includes(movimiento.tipo_movimiento),
    );
  }, [movimientosData, tiposMovimiento]);

  const totalPages = Math.ceil(movimientosFiltrados.length / PAGE_SIZE);
  const movimientosPaginados = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return movimientosFiltrados.slice(start, start + PAGE_SIZE);
  }, [movimientosFiltrados, page]);

  const stats = useMemo(() => {
    const calc = {
      totalPagado: 0,
      cantidad: movimientosFiltrados.length,
      pendientes: 0,
    };
    movimientosFiltrados.forEach((m) => {
      if (m.estado === "pendiente") calc.pendientes += 1;
      if (m.estado === "pagado") calc.totalPagado += Math.abs(m.valor_total || 0);
    });
    return calc;
  }, [movimientosFiltrados]);

  const logs = logsData?.data || [];
  const logsCount = logsData?.count || 0;
  const logsTotalPages = Math.max(1, Math.ceil(logsCount / LOGS_PAGE_SIZE));

  const handleSave = async (movimientoData) => {
    try {
      if (movimientoEditando) {
        await actualizarMutate.mutateAsync({
          id: movimientoEditando.id,
          data: movimientoData,
        });
      } else {
        await crearMutate.mutateAsync(movimientoData);
      }
      setModalOpen(false);
      setMovimientoEditando(null);
      setPage(1);
      setLogsPage(1);
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
    setPage(1);
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
    setPage(1);
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
      rows: movimientosFiltrados,
    });
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

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLogsPageChange = (newPage) => setLogsPage(newPage);

  const isMutating = crearMutate.isPending || actualizarMutate.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
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
            disabled={isLoading || movimientosFiltrados.length === 0}
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
              onChange={(e) => { setMesFiltro(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              name="tipoMovimiento"
              value={filtros.tipoMovimiento}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Todos los movimientos</option>
              {tiposMovimiento.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {getTipoMovimientoLabel(tipo)}
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
              <option value="fecha_asc">M��s antiguos primero</option>
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

      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase min-w-[200px]">
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
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : movimientosPaginados.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay movimientos para mostrar
                  </td>
                </tr>
              ) : (
                movimientosPaginados.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-slate-50">
                    <td className="px-3 md:px-4 py-3 text-sm text-slate-700">
                      {formatDate(movimiento.fecha)}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm text-slate-700 min-w-[200px] max-w-[250px]" title={getTipoMovimientoLabel(movimiento.tipo_movimiento)}>
                      <span className="block truncate">{getTipoMovimientoLabel(movimiento.tipo_movimiento)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm text-slate-700">
                      {movimiento.cuentas_financieras?.nombre || "-"}
                    </td>
                    <td className="px-3 md:px-4 py-3 text-sm text-slate-700 text-right font-medium">
                      {formatCurrency(movimiento.valor_total)}
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                          movimiento.estado,
                        )}`}
                      >
                        {getEstadoLabel(movimiento.estado)}
                      </span>
                    </td>
                    <td className="px-3 md:px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(movimiento)}
                          disabled={isMutating}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
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
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-600">
              Mostrando {((page - 1) * PAGE_SIZE) + 1} -{" "}
              {Math.min(page * PAGE_SIZE, movimientosFiltrados.length)} de{" "}
              {movimientosFiltrados.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setMovimientoEditando(null);
        }}
        title={
          movimientoEditando ? "Editar Movimiento" : "Nuevo Movimiento"
        }
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