// filepath: src/features/cuentas/pages/CuentasPage.jsx
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  Wallet,
  Search,
  TrendingUp,
  Download,
} from "lucide-react";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import { cuentasService } from "../services/cuentasService";
import { movimientosService } from "../../movimientos/services/movimientosService";
import {
  formatCurrency,
  formatDateInput,
  getTipoCuentaLabel,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";
import CuentaForm from "../components/CuentaForm";
import MovimientoLogsCard from "../../movimientos/components/MovimientoLogsCard";
import { useAuth } from "../../auth/AuthProvider";

const PAGE_SIZE = 20;
const LOGS_PAGE_SIZE = 50;

export default function CuentasPage() {
  const { user, profile } = useAuth();
  const currentMonth = formatDateInput(new Date()).slice(0, 7);
  const [modalOpen, setModalOpen] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [logsMonth, setLogsMonth] = useState(currentMonth);
  const queryClient = useQueryClient();
  const currentUserLabel = profile?.full_name || user?.email || "Sistema";

  const { data: cuentas = [], isLoading } = useQuery({
    queryKey: ["cuentas"],
    queryFn: cuentasService.getAll,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["cuentas", "logs", logsPage, logsMonth],
    queryFn: () =>
      movimientosService.getLogs({
        page: logsPage,
        pageSize: LOGS_PAGE_SIZE,
        month: logsMonth,
      }),
    initialData: { data: [], count: 0 },
  });

  const crearMutate = useMutation({
    mutationFn: cuentasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => cuentasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const eliminarMutate = useMutation({
    mutationFn: cuentasService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const activarMutate = useMutation({
    mutationFn: cuentasService.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const cuentasFiltradas = useMemo(() => {
    return cuentas.filter((cuenta) => {
      const matchesSearch = cuenta.nombre
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesEstado =
        filtroEstado === "todos"
          ? true
          : filtroEstado === "activa"
            ? cuenta.estado
            : !cuenta.estado;
      return matchesSearch && matchesEstado;
    });
  }, [cuentas, searchTerm, filtroEstado]);

  const totalPages = Math.ceil(cuentasFiltradas.length / PAGE_SIZE);
  const cuentasPaginadas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return cuentasFiltradas.slice(start, start + PAGE_SIZE);
  }, [cuentasFiltradas, page]);

  const totalCuentas = useMemo(() => cuentas.length, [cuentas]);
  const getTotalCuenta = (cuenta) => Number(cuenta?.saldo_actual) || 0;
  const saldoTotalCuentas = useMemo(
    () => cuentas.reduce((sum, c) => sum + getTotalCuenta(c), 0),
    [cuentas],
  );

  const logs = logsData?.data || [];
  const logsCount = logsData?.count || 0;
  const logsTotalPages = Math.max(1, Math.ceil(logsCount / LOGS_PAGE_SIZE));

  const handleSave = async (cuentaData) => {
    try {
      if (cuentaEditando) {
        await actualizarMutate.mutateAsync({
          id: cuentaEditando.id,
          data: cuentaData,
        });
      } else {
        await crearMutate.mutateAsync(cuentaData);
      }
      setModalOpen(false);
      setCuentaEditando(null);
    } catch (error) {
      console.error("Error guardando cuenta:", error);
      alert("Error al guardar la cuenta");
    }
  };

  const handleEdit = (cuenta) => {
    setCuentaEditando(cuenta);
    setModalOpen(true);
  };

  const handleDelete = async (cuenta) => {
    if (!confirm(`¿Está seguro de inactivar la cuenta "${cuenta.nombre}"?`)) {
      return;
    }
    try {
      await eliminarMutate.mutateAsync(cuenta.id);
    } catch (error) {
      console.error("Error eliminando cuenta:", error);
    }
  };

  const handleActivate = async (cuenta) => {
    try {
      await activarMutate.mutateAsync(cuenta.id);
    } catch (error) {
      console.error("Error activando cuenta:", error);
    }
  };

  const handleExport = () => {
    exportToExcel({
      fileName: "cuentas-financieras",
      sheetName: "Cuentas",
      columns: [
        { header: "Nombre", value: (cuenta) => cuenta.nombre },
        {
          header: "Tipo",
          value: (cuenta) => getTipoCuentaLabel(cuenta.tipo_cuenta),
        },
        {
          header: "Saldo inicial",
          value: (cuenta) => cuenta.saldo_inicial || 0,
        },
        { header: "Saldo actual", value: (cuenta) => cuenta.saldo_actual || 0 },
        {
          header: "Estado",
          value: (cuenta) => (cuenta.estado ? "Activa" : "Inactiva"),
        },
        { header: "Descripcion", value: (cuenta) => cuenta.descripcion || "" },
      ],
      rows: cuentasFiltradas,
    });
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleLogsPageChange = (newPage) => {
    setLogsPage(newPage);
  };

  const handleDownloadLogs = async () => {
    if (!logsCount) return;

    const { data } = await movimientosService.getLogs({
      page: 1,
      pageSize: Math.max(logsCount, 1),
      month: logsMonth,
    });

    exportToExcel({
      fileName: `logs-cuentas-${logsMonth || currentMonth}`,
      sheetName: "Logs",
      columns: [
        {
          header: "Fecha",
          value: (log) => log.created_at || log.fecha_hora || log.fecha || "",
        },
        {
          header: "Usuario",
          value: (log) =>
            log.usuario_email ||
            log.user_email ||
            log.usuario ||
            log.user_name ||
            log.created_by ||
            currentUserLabel,
        },
        {
          header: "Acción",
          value: (log) =>
            log.accion || log.action || log.tipo_accion || "Movimiento",
        },
        {
          header: "Detalle",
          value: (log) =>
            log.detalle ||
            log.descripcion ||
            log.observaciones ||
            "Sin detalle",
        },
      ],
      rows: data || [],
    });
  };

  const isMutating =
    crearMutate.isPending ||
    actualizarMutate.isPending ||
    eliminarMutate.isPending ||
    activarMutate.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Cuentas Financieras
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Administra tus cuentas bancarias, cajas y billeteras
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || cuentasFiltradas.length === 0}
            className="shrink-0"
          >
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button
            onClick={() => {
              setCuentaEditando(null);
              setModalOpen(true);
            }}
            className="shrink-0"
          >
            <Plus size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Cuenta</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Wallet className="text-blue-600 dark:text-blue-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Numero de Cuentas
              </p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                {totalCuentas}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Saldo Total
              </p>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(saldoTotalCuentas)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative min-w-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar cuentas..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setPage(1);
              }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white dark:bg-slate-800 min-w-35"
            >
              <option value="todos">Todos</option>
              <option value="activa">Activas</option>
              <option value="inactiva">Inactivas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800 hidden sm:table-header-group">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Nombre
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Tipo
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Saldo Actual
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Total
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Estado
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 sm:px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : cuentasPaginadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 sm:px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay cuentas que mostrar
                  </td>
                </tr>
              ) : (
                cuentasPaginadas.map((cuenta) => (
                  <tr
                    key={cuenta.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Nombre
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                          {cuenta.nombre}
                        </p>
                        {cuenta.descripcion && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {cuenta.descripcion}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(cuenta.tipo_cuenta)}`}
                      >
                        <span className="sm:hidden mr-1">📁</span>
                        {getTipoCuentaLabel(cuenta.tipo_cuenta)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">
                        Actual:
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(cuenta.saldo_actual)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="sm:hidden text-xs text-slate-500 dark:text-slate-400 mr-1">
                        Total:
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">
                        {formatCurrency(getTotalCuenta(cuenta))}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <Badge variant={cuenta.estado ? "success" : "default"}>
                        {cuenta.estado ? "Activa" : "Inactiva"}
                      </Badge>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(cuenta)}
                          disabled={isMutating}
                          className="p-1.5 sm:p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg disabled:opacity-50"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {cuenta.estado ? (
                          <button
                            onClick={() => handleDelete(cuenta)}
                            disabled={isMutating}
                            className="p-1.5 sm:p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                            title="Inactivar"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(cuenta)}
                            disabled={isMutating}
                            className="p-1.5 sm:p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg disabled:opacity-50"
                            title="Activar"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(page * PAGE_SIZE, cuentasFiltradas.length)} de{" "}
              {cuentasFiltradas.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      <MovimientoLogsCard
        logs={logs}
        loading={logsLoading || isLoading}
        page={logsPage}
        totalPages={logsTotalPages}
        totalCount={logsCount}
        pageSize={LOGS_PAGE_SIZE}
        onPageChange={handleLogsPageChange}
        selectedMonth={logsMonth}
        onMonthChange={(month) => {
          setLogsMonth(month);
          setLogsPage(1);
        }}
        onDownload={handleDownloadLogs}
        downloading={logsLoading}
        currentUserLabel={currentUserLabel}
        title="Logs de movimientos"
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCuentaEditando(null);
        }}
        title={cuentaEditando ? "Editar Cuenta" : "Nueva Cuenta"}
        size="md"
      >
        <CuentaForm
          cuenta={cuentaEditando}
          onSave={handleSave}
          onCancel={() => {
            setModalOpen(false);
            setCuentaEditando(null);
          }}
        />
      </Modal>
    </div>
  );
}

function getTipoColor(tipo) {
  const colors = {
    caja: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    banco: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    billetera_digital:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    ahorro:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    efectivo:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
    otra: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  };
  return colors[tipo] || colors.otra;
}
