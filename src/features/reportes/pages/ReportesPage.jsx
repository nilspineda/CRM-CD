import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Download,
} from "lucide-react";
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
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { movimientosService } from "../../movimientos/services/movimientosService";
import {
  formatCurrency,
  getDateRange,
  getTipoMovimientoLabel,
  getSumableIva,
  getValor125,
  isIngreso,
  isEgreso,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg">
        <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2 capitalize">{label}</p>
        {payload.map((entry, index) => (
          <p
            key={index}
            style={{ color: entry.color }}
            className="text-sm font-medium"
          >
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportesPage() {
  const range = getDateRange("month");
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [filtros, setFiltros] = useState({
    fechaInicio: range.start.toISOString().split("T")[0],
    fechaFin: range.end.toISOString().split("T")[0],
  });

  useEffect(() => {
    loadReporte();
  }, [filtros]);

  const loadReporte = async () => {
    try {
      setLoading(true);
      const data = await movimientosService.getReporteFinanciero(
        filtros.fechaInicio,
        filtros.fechaFin,
      );
      setMovimientos(data);
    } catch (error) {
      console.error("Error cargando reportes:", error);
    } finally {
      setLoading(false);
    }
  };

  const reporte = useMemo(() => {
    const resumen = {
      ingresos: 0,
      egresos: 0,
      iva: 0,
      valor125: 0,
      porTipo: {},
      porCuenta: {},
    };

    movimientos.forEach((mov) => {
      const valor = mov.valor_total || 0;
      const tipo = mov.tipo_movimiento || "otro";
      const cuenta = mov.cuentas_financieras?.nombre || "Sin cuenta";

      if (isEgreso(tipo)) resumen.egresos += valor;
      else resumen.ingresos += valor;

      resumen.iva += getSumableIva(mov);
      if (isIngreso(tipo)) resumen.valor125 += getValor125(mov);
      resumen.porTipo[tipo] = (resumen.porTipo[tipo] || 0) + valor;
      resumen.porCuenta[cuenta] = (resumen.porCuenta[cuenta] || 0) + valor;
    });

    return resumen;
  }, [movimientos]);

  const chartData = useMemo(() => {
    const dataByMonth = {};

    const sortedMovimientos = [...movimientos].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha),
    );

    sortedMovimientos.forEach((mov) => {
      // Usamos UTC para evitar desfasajes por zona horaria
      const [year, month] = mov.fecha.split("-");
      const date = new Date(Date.UTC(year, month - 1, 1));
      const monthYear = date.toLocaleDateString("es-CO", {
        month: "short",
        year: "numeric",
      });

      if (!dataByMonth[monthYear]) {
        dataByMonth[monthYear] = {
          name: monthYear,
          Ingresos: 0,
          Gastos: 0,
        };
      }

      const valor = mov.valor_total || 0;
      const tipo = mov.tipo_movimiento || "otro";

      if (isEgreso(tipo)) {
        dataByMonth[monthYear].Gastos += valor;
      } else if (isIngreso(tipo)) {
        dataByMonth[monthYear].Ingresos += valor;
      }
    });

    return Object.values(dataByMonth);
  }, [movimientos]);


  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleExport = () => {
    const rows = [
      {
        seccion: "Indicadores",
        concepto: "Ingresos",
        valor: reporte.ingresos,
        participacion: "",
      },
      {
        seccion: "Indicadores",
        concepto: "Egresos",
        valor: reporte.egresos,
        participacion: "",
      },
      {
        seccion: "Indicadores",
        concepto: "IVA",
        valor: reporte.iva,
        participacion: "",
      },
      {
        seccion: "Indicadores",
        concepto: "1.25% es ICA",
        valor: reporte.valor125,
        participacion: "",
      },
      ...Object.entries(reporte.porTipo).map(([tipo, valor]) => ({
        seccion: "Por tipo de movimiento",
        concepto: getTipoMovimientoLabel(tipo),
        valor,
        participacion:
          reporte.ingresos + reporte.egresos
            ? `${Math.round((valor / (reporte.ingresos + reporte.egresos)) * 100)}%`
            : "0%",
      })),
      ...Object.entries(reporte.porCuenta).map(([cuenta, valor]) => ({
        seccion: "Por cuenta financiera",
        concepto: cuenta,
        valor,
        participacion:
          reporte.ingresos + reporte.egresos
            ? `${Math.round((valor / (reporte.ingresos + reporte.egresos)) * 100)}%`
            : "0%",
      })),
    ];

    exportToExcel({
      fileName: "reportes-financieros",
      sheetName: "Reportes",
      columns: [
        { header: "Seccion", value: (row) => row.seccion },
        { header: "Concepto", value: (row) => row.concepto },
        { header: "Valor", value: (row) => row.valor },
        { header: "Participacion", value: (row) => row.participacion },
      ],
      rows,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Reportes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Indicadores financieros calculados desde Supabase
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={loading || movimientos.length === 0}
          className="shrink-0"
        >
          <Download size={16} className="mr-1 sm:mr-2" />
          Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={TrendingUp}
          label="Ingresos"
          value={formatCurrency(reporte.ingresos)}
          tone="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Egresos"
          value={formatCurrency(reporte.egresos)}
          tone="red"
        />
        <StatCard
          icon={BarChart3}
          label="Movimientos"
          value={movimientos.length}
          tone="slate"
        />
        <StatCard
          icon={DollarSign}
          label="1.25% es ICA"
          value={formatCurrency(reporte.valor125)}
          tone="amber"
        />
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              name="fechaInicio"
              type="date"
              value={filtros.fechaInicio}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 dark:text-slate-100"
            />
            <input
              name="fechaFin"
              type="date"
              value={filtros.fechaFin}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="text-center text-slate-500 dark:text-slate-400 py-12">
            Cargando reportes...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {movimientos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos vs Gastos por Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        dy={10}
                        className="capitalize"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value >= 1000000)
                            return `$${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000)
                            return `$${(value / 1000).toFixed(0)}k`;
                          return `$${value}`;
                        }}
                      />
                      <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: "#f1f5f9" }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar
                        dataKey="Ingresos"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                      <Bar
                        dataKey="Gastos"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={60}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            <ResumenTable
              title="Por tipo de movimiento"
              data={reporte.porTipo}
              labelFormatter={getTipoMovimientoLabel}
            />
            <ResumenTable
              title="Por cuenta financiera"
              data={reporte.porCuenta}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ResumenTable({ title, data, labelFormatter = (value) => value }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, [, value]) => sum + value, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto mobile-card-table">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800 hidden sm:table-header-group">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Concepto
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Valor
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                Participacion
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                >
                  Sin datos en el periodo
                </td>
              </tr>
            ) : (
              rows.map(([label, value]) => (
                <tr key={label} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-3 sm:px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {labelFormatter(label)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-800 dark:text-slate-100">
                    {formatCurrency(value)}
                  </td>
                  <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-600 dark:text-slate-400">
                    {total ? Math.round((value / total) * 100) : 0}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
