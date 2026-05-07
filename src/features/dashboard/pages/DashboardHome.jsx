// filepath: src/features/dashboard/pages/DashboardHome.jsx
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  DollarSign,
  Clock,
  ArrowRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card, {
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import { cuentasService } from "../../cuentas/services/cuentasService";
import { movimientosService } from "../../movimientos/services/movimientosService";
import { clientesService } from "../../clientes/services/clientesService";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getDateRange,
  getTipoMovimientoLabel,
  getEstadoLabel,
  getEstadoColor,
  isIngreso,
  isEgreso,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";

const chartTooltipStyle = {
  backgroundColor: "white",
  border: "1px solid rgb(226 232 240)",
  borderRadius: "0.75rem",
  boxShadow: "0 10px 15px -3px rgb(15 23 42 / 0.1)",
  padding: "0.75rem",
};

const buildMonthlyChart = (movimientos) => {
  const year = new Date().getFullYear();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, index, 1));
    return {
      name: date.toLocaleDateString("es-CO", {
        month: "short",
        year: "numeric",
      }),
      Ingresos: 0,
      Gastos: 0,
    };
  });

  [...(movimientos || [])]
    .filter((mov) => mov?.fecha && mov.estado === "pagado")
    .forEach((mov) => {
      const date = new Date(`${mov.fecha}T00:00:00`);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;

      const monthIndex = date.getMonth();
      const valor = Math.abs(mov.valor_total || 0);

      if (isIngreso(mov.tipo_movimiento)) {
        months[monthIndex].Ingresos += valor;
      } else if (isEgreso(mov.tipo_movimiento)) {
        months[monthIndex].Gastos += valor;
      }
    });

  return months;
};

const buildAccountsChart = (cuentas) =>
  [...(cuentas || [])]
    .map((cuenta) => ({
      name: cuenta.nombre,
      saldo: Number(cuenta.saldo_actual) || 0,
    }))
    .sort((a, b) => b.saldo - a.saldo);

const DashboardTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div style={chartTooltipStyle}>
      <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p
            key={entry.name}
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    </div>
  );
};

export default function DashboardHome() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [cuentaDetalleOpen, setCuentaDetalleOpen] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [movimientosPage, setMovimientosPage] = useState(1);
  const [cuentaMovimientosMes, setCuentaMovimientosMes] = useState("");
  const MOVIMIENTOS_PAGE_SIZE = 20;

  const getMonthRange = (monthStr) => {
    if (!monthStr) {
      const start = new Date("2000-01-01");
      const end = new Date("2100-12-31");
      return { start, end };
    }
    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  };

  const getYearRange = (monthStr) => {
    if (!monthStr) {
      const start = new Date("2000-01-01");
      const end = new Date("2100-12-31");
      return { start, end };
    }
    const year = Number(monthStr.split("-")[0]);
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return { start, end };
  };

  const mesResumen = getMonthRange(selectedMonth);
  const anioResumen = getYearRange(selectedMonth);

  const { data: cuentasData = [], isLoading: cuentasLoading } = useQuery({
    queryKey: ["cuentas", "todas"],
    queryFn: cuentasService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: movimientosData = [], isLoading: movimientosLoading } =
    useQuery({
      queryKey: [
        "movimientos",
        formatDateInput(anioResumen.start),
        formatDateInput(anioResumen.end),
      ],
      queryFn: () =>
        movimientosService.getAll({
          fechaInicio: formatDateInput(anioResumen.start),
          fechaFin: formatDateInput(anioResumen.end),
          ordenarPor: "fecha_desc",
          skipJoin: true,
        }),
      staleTime: 5 * 60 * 1000,
    });

  const {
    data: statsData = {
      ingresos: 0,
      egresos: 0,
      iva: 0,
      facturas: 0,
      valor125: 0,
    },
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["movimientos", "stats", anioResumen.start.toISOString()],
    queryFn: () =>
      movimientosService.getEstadisticas(
        formatDateInput(anioResumen.start),
        formatDateInput(anioResumen.end),
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: birthdays = [], isLoading: birthdaysLoading } = useQuery({
    queryKey: ["clientes", "cumpleanos"],
    queryFn: () => clientesService.getUpcomingBirthdays(10),
    staleTime: 10 * 60 * 1000,
  });

  const getCuentaMovimientosRange = (monthStr) => {
    if (!monthStr) return { fechaInicio: "2000-01-01", fechaFin: "2100-12-31" };
    const [year, month] = monthStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return {
      fechaInicio: formatDateInput(start),
      fechaFin: formatDateInput(end),
    };
  };

  const { data: cuentaMovimientos = [], isLoading: cuentaMovimientosLoading } =
    useQuery({
      queryKey: [
        "movimientos",
        "cuenta",
        cuentaSeleccionada?.id,
        cuentaMovimientosMes,
      ],
      queryFn: () =>
        movimientosService.getAll({
          cuentaId: cuentaSeleccionada?.id,
          ...getCuentaMovimientosRange(cuentaMovimientosMes),
          ordenarPor: "fecha_desc",
        }),
      enabled: !!cuentaSeleccionada?.id,
    });

  const loading =
    cuentasLoading || movimientosLoading || statsLoading || birthdaysLoading;

  const movimientosPaginados = useMemo(() => {
    const start = (movimientosPage - 1) * MOVIMIENTOS_PAGE_SIZE;
    return movimientosData.slice(start, start + MOVIMIENTOS_PAGE_SIZE);
  }, [movimientosData, movimientosPage]);

  const movimientosTotalPages = Math.ceil(
    movimientosData.length / MOVIMIENTOS_PAGE_SIZE,
  );

  const saldoTotal = useMemo(
    () => cuentasData.reduce((sum, c) => sum + (c.saldo_actual || 0), 0),
    [cuentasData],
  );

  const stats = useMemo(
    () => ({ ...statsData, saldoTotal }),
    [statsData, saldoTotal],
  );

  const monthlyChartData = useMemo(() => {
    const months = buildMonthlyChart(movimientosData);
    // Nota: Las facturas pagadas ya vienen en movimientosData como tipo factura_venta (pagadas)
    // así que no necesitamos sumar facturas separadas aquí si se maneja correctamente en movimientos.
    return months;
  }, [movimientosData]);

  const accountsChartData = useMemo(
    () => buildAccountsChart(cuentasData),
    [cuentasData],
  );

  const handleExport = () => {
    const rows = [
      {
        seccion: "Indicadores",
        concepto: "Ingresos del mes",
        detalle: "",
        valor: stats.ingresos,
      },
      {
        seccion: "Indicadores",
        concepto: "Egresos del mes",
        detalle: "",
        valor: stats.egresos,
      },
      {
        seccion: "Indicadores",
        concepto: "IVA por pagar",
        detalle: "",
        valor: stats.iva,
      },
      {
        seccion: "Indicadores",
        concepto: "Saldo total disponible",
        detalle: "",
        valor: stats.saldoTotal,
      },
      ...cuentasData.map((cuenta) => ({
        seccion: "Saldo por cuenta",
        concepto: cuenta.nombre,
        detalle: cuenta.tipo_cuenta?.replace("_", " ") || "",
        valor: cuenta.saldo_actual || 0,
      })),
      ...movimientosRecientes.map((mov) => ({
        seccion: "Movimientos recientes",
        concepto: mov.descripcion,
        detalle: `${formatDate(mov.fecha)} - ${getTipoMovimientoLabel(mov.tipo_movimiento)}`,
        valor: mov.valor_total || 0,
      })),
    ];

    exportToExcel({
      fileName: "dashboard",
      sheetName: "Dashboard",
      columns: [
        { header: "Seccion", value: (row) => row.seccion },
        { header: "Concepto", value: (row) => row.concepto },
        { header: "Detalle", value: (row) => row.detalle },
        { header: "Valor", value: (row) => row.valor },
      ],
      rows,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">
          Cargando dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Resumen financiero{" "}
            {selectedMonth ? `(${selectedMonth})` : "(Histórico total)"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
            {selectedMonth && (
              <button
                onClick={() => setSelectedMonth("")}
                className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              >
                Ver todo
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["cuentas"] });
                queryClient.invalidateQueries({ queryKey: ["movimientos"] });
              }}
              className="shrink-0"
              title="Actualizar saldos"
            >
              <RefreshCw size={15} />
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              className="shrink-0 w-full sm:w-auto"
            >
              <Download size={16} className="mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <TrendingUp className="text-green-600 dark:text-green-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Ingresos totales
              </p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(stats.ingresos)}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-500 mt-1">
                Movimientos pagados {selectedMonth ? "del mes" : "históricos"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 rounded-lg shrink-0">
              <TrendingDown className="text-red-600 dark:text-red-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Gastos totales
              </p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(stats.egresos)}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-500 mt-1">
                Movimientos pagados {selectedMonth ? "del mes" : "históricos"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
              <DollarSign className="text-amber-600 dark:text-amber-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                IVA por pagar
              </p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(stats.iva)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
              <FileText className="text-amber-600 dark:text-amber-400 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                ICA (1.25%)
              </p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(stats.valor125)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Ingresos vs Gastos por mes
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 sm:h-80 md:h-96">
            {monthlyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No hay datos suficientes para graficar el año en curso.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} barCategoryGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip content={<DashboardTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="Ingresos"
                    fill="#22c55e"
                    name="Ingresos"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Egresos"
                    fill="#ef4444"
                    name="Gastos"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumen y movimientos recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Saldo por cuenta */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Saldo por Cuenta
              </CardTitle>
              <Link
                to="/cuentas"
                className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {cuentasData.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">
                  No hay cuentas registradas
                </p>
              ) : (
                cuentasData
                  .sort((a, b) => (b.saldo_actual || 0) - (a.saldo_actual || 0))
                  .map((cuenta) => (
                    <div
                      key={cuenta.id}
                      className={`flex items-center justify-between p-3 sm:p-4 rounded-lg cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors ${
                        cuenta.estado === false
                          ? "bg-slate-50/50 dark:bg-slate-700/20 opacity-60"
                          : "bg-slate-50 dark:bg-slate-700/50"
                      }`}
                      onClick={() => {
                        setCuentaSeleccionada(cuenta);
                        setCuentaDetalleOpen(true);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate hover:text-amber-600 dark:hover:text-amber-400">
                          {cuenta.nombre}
                          {cuenta.estado === false && (
                            <span className="ml-2 text-xs text-slate-400">
                              (inactiva)
                            </span>
                          )}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 capitalize">
                          {cuenta.tipo_cuenta?.replace("_", " ")}
                        </p>
                      </div>
                      <p
                        className={`font-semibold text-sm sm:text-base shrink-0 ml-2 ${
                          (cuenta.saldo_actual || 0) < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {formatCurrency(cuenta.saldo_actual)}
                      </p>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  Total disponible
                </p>
                <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {formatCurrency(stats.saldoTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movimientos recientes */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Últimos Movimientos
              </CardTitle>
              <Link
                to="/movimientos"
                className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
              >
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {movimientosPaginados.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4 text-sm">
                  No hay movimientos registrados
                </p>
              ) : (
                movimientosPaginados.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                          isIngreso(mov.tipo_movimiento)
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                        }`}
                      >
                        {isIngreso(mov.tipo_movimiento) ? (
                          <TrendingUp
                            size={14}
                            className="text-green-600 dark:text-green-400"
                          />
                        ) : (
                          <TrendingDown
                            size={14}
                            className="text-red-600 dark:text-red-400"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-100 text-sm truncate">
                          {mov.descripcion}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(mov.fecha)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold text-sm sm:text-base shrink-0 ml-2 ${
                        isIngreso(mov.tipo_movimiento)
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatCurrency(mov.valor_total)}
                    </p>
                  </div>
                ))
              )}
            </div>
            {movimientosTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setMovimientosPage((p) => Math.max(1, p - 1))}
                  disabled={movimientosPage === 1}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Página {movimientosPage} de {movimientosTotalPages}
                </span>
                <button
                  onClick={() =>
                    setMovimientosPage((p) =>
                      Math.min(movimientosTotalPages, p + 1),
                    )
                  }
                  disabled={movimientosPage === movimientosTotalPages}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      {/* <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Próximos cumpleaños
          </CardTitle>
        </CardHeader>
        <CardContent>
          {birthdaysLoading ? (
            <div className="text-sm text-slate-500">Cargando...</div>
          ) : birthdays.length === 0 ? (
            <div className="text-sm text-slate-500">
              No hay cumpleaños próximos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="text-xs text-slate-600 dark:text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Empresa</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-right">Días</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {birthdays.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <td className="px-3 py-2 text-sm">
                        {b.responsable || "-"}
                      </td>
                      <td className="px-3 py-2 text-sm">{b.nombre || b.nit}</td>
                      <td className="px-3 py-2 text-sm">{b.next_birthday}</td>
                      <td className="px-3 py-2 text-sm text-right">
                        {b.days_until}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card> */}
      {/* <Card className="w-full">
        <CardContent className="p-3 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3 sm:mb-4">
            Acciones rápidas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Link
              to="/movimientos"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:bg-slate-200"
            >
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <FileText
                  size={18}
                  className="text-amber-600 dark:text-amber-400"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                Nuevo Movimiento
              </span>
            </Link>
            <Link
              to="/cuentas"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:bg-slate-200"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                Ver Cuentas
              </span>
            </Link>
            <Link
              to="/cartera"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:bg-slate-200"
            >
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Clock
                  size={18}
                  className="text-orange-600 dark:text-orange-400"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                Cartera
              </span>
            </Link>
            <Link
              to="/reportes"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:bg-slate-200"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign
                  size={18}
                  className="text-green-600 dark:text-green-400"
                />
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                Reporte IVA
              </span>
            </Link>
          </div>
        </CardContent>
      </Card> */}

      <Modal
        isOpen={cuentaDetalleOpen}
        onClose={() => {
          setCuentaDetalleOpen(false);
          setCuentaSeleccionada(null);
          setMovimientosPage(1);
          setCuentaMovimientosMes("");
        }}
        title={cuentaSeleccionada?.nombre || "Detalle de Cuenta"}
        size="xl"
      >
        {cuentaSeleccionada && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tipo
                </p>
                <p className="font-medium text-slate-800 dark:text-slate-100 capitalize">
                  {cuentaSeleccionada.tipo_cuenta?.replace("_", " ")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saldo Actual
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(cuentaSeleccionada.saldo_actual)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Estado
                </p>
                <p
                  className={`font-medium ${cuentaSeleccionada.estado === false ? "text-red-600" : "text-green-600"}`}
                >
                  {cuentaSeleccionada.estado === false ? "Inactiva" : "Activa"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Banco
                </p>
                <p className="text-slate-800 dark:text-slate-100">
                  {cuentaSeleccionada.banco || "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                  Movimientos
                </h4>
                <input
                  type="month"
                  value={cuentaMovimientosMes}
                  onChange={(e) => {
                    setCuentaMovimientosMes(e.target.value);
                    setMovimientosPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg"
                />
              </div>

              {cuentaMovimientosLoading ? (
                <p className="text-slate-500">Cargando movimientos...</p>
              ) : cuentaMovimientos.length === 0 ? (
                <p className="text-slate-500 text-center py-4">
                  No hay movimientos
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          <th className="px-2 py-2 text-left">Fecha</th>
                          <th className="px-2 py-2 text-left">Tipo</th>
                          <th className="px-2 py-2 text-left">Descripción</th>
                          <th className="px-2 py-2 text-right">Valor</th>
                          <th className="px-2 py-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuentaMovimientos
                          .slice(
                            (movimientosPage - 1) * 20,
                            movimientosPage * 20,
                          )
                          .map((mov) => (
                            <tr
                              key={mov.id}
                              className="border-b border-slate-100 dark:border-slate-700"
                            >
                              <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                                {formatDate(mov.fecha)}
                              </td>
                              <td className="px-2 py-2 text-slate-800 dark:text-slate-200">
                                {getTipoMovimientoLabel(mov.tipo_movimiento)}
                              </td>
                              <td className="px-2 py-2 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                {mov.descripcion}
                              </td>
                              <td
                                className={`px-2 py-2 text-right font-medium ${isIngreso(mov.tipo_movimiento) ? "text-green-600" : "text-red-600"}`}
                              >
                                {formatCurrency(mov.valor_total)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${getEstadoColor(mov.estado)}`}
                                >
                                  {getEstadoLabel(mov.estado)}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {cuentaMovimientos.length > 20 && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() =>
                          setMovimientosPage((p) => Math.max(1, p - 1))
                        }
                        disabled={movimientosPage === 1}
                        className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {movimientosPage} /{" "}
                        {Math.ceil(cuentaMovimientos.length / 20)}
                      </span>
                      <button
                        onClick={() =>
                          setMovimientosPage((p) =>
                            Math.min(
                              Math.ceil(cuentaMovimientos.length / 20),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          movimientosPage >=
                          Math.ceil(cuentaMovimientos.length / 20)
                        }
                        className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
