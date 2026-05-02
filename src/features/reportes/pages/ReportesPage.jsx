import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar,
  FileSpreadsheet,
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
import { facturasService } from "../../facturas/services/facturasService";
import {
  formatCurrency,
  formatDate,
  getTipoMovimientoLabel,
  getSumableIva,
  getValor125,
  isIngreso,
  isEgreso,
  computeFacturaTaxes,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";

// ─── helpers ──────────────────────────────────────────────────────────────────

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const monthRange = (year, month) => {
  // month: 0-indexed
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(end.getDate())}`,
  };
};

const yearRange = (year) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

// ─── Export helpers ────────────────────────────────────────────────────────────

const COLS_MOVIMIENTOS = [
  { header: "Fecha", value: (r) => formatDate(r.fecha) },
  { header: "Tipo", value: (r) => getTipoMovimientoLabel(r.tipo_movimiento) },
  { header: "Descripcion", value: (r) => r.descripcion || "" },
  { header: "Cuenta", value: (r) => r.cuentas_financieras?.nombre || "" },
  { header: "Valor", value: (r) => r.valor_total || 0 },
  { header: "IVA", value: (r) => getSumableIva(r) },
  { header: "ICA 1.25%", value: (r) => (isIngreso(r.tipo_movimiento) ? getValor125(r) : 0) },
  { header: "Estado", value: (r) => r.estado || "" },
];

const COLS_FACTURAS = [
  { header: "Numero", value: (r) => `${r.prefijo}-${r.numero_factura}` },
  { header: "Cliente", value: (r) => r.cliente_nombre || r.cliente_nit || "" },
  { header: "Fecha", value: (r) => formatDate(r.fecha_pago || r.fecha_creacion) },
  { header: "Estado", value: (r) => r.estado || "" },
  { header: "Valor Total", value: (r) => r.valor_total || 0 },
  { header: "Valor Pagado", value: (r) => r.valor_pagado || 0 },
  { header: "Valor Pendiente", value: (r) => Math.max(0, (r.valor_total || 0) - (r.valor_pagado || 0)) },
  { header: "ICA 1.25%", value: (r) => computeFacturaTaxes(r).ica },
  { header: "IVA", value: (r) => computeFacturaTaxes(r).iva },
  { header: "Observaciones", value: (r) => r.observaciones || "" },
];

const COLS_CONSOLIDADO = [
  { header: "Mes", value: (r) => r.mes },
  { header: "Ingresos Movimientos", value: (r) => r.ingresos },
  { header: "Egresos", value: (r) => r.egresos },
  { header: "Ingresos Facturas", value: (r) => r.ingresoFacturas },
  { header: "IVA", value: (r) => r.iva },
  { header: "ICA 1.25%", value: (r) => r.ica },
  { header: "Facturas Emitidas", value: (r) => r.numFacturas },
  { header: "Facturas Cobradas", value: (r) => r.facturasCobradas },
  { header: "Cartera Pendiente", value: (r) => r.cartera },
];

// ─── Chart tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg">
        <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2 capitalize">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [loading, setLoading] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [facturas, setFacturas] = useState([]);

  // Años disponibles: 3 años atrás hasta hoy
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).reverse();
  const mesesDisponibles = Array.from({ length: 12 }, (_, i) => i);

  // ── Cargar datos del mes seleccionado ──
  useEffect(() => {
    const range = monthRange(selectedYear, selectedMonth);
    const load = async () => {
      setLoading(true);
      try {
        const [movs, facts] = await Promise.all([
          movimientosService.getReporteFinanciero(range.start, range.end),
          facturasService.getAll({ fechaInicio: range.start, fechaFin: range.end }),
        ]);
        setMovimientos(movs);
        setFacturas(facts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedYear, selectedMonth]);

  // ── Resumen del mes ──
  const reporte = useMemo(() => {
    const res = { ingresos: 0, egresos: 0, iva: 0, valor125: 0 };
    movimientos.forEach((mov) => {
      const valor = mov.valor_total || 0;
      const tipo = mov.tipo_movimiento || "";
      if (isEgreso(tipo)) res.egresos += valor;
      else res.ingresos += valor;
      res.iva += getSumableIva(mov);
      if (isIngreso(tipo)) res.valor125 += getValor125(mov);
    });
    // sumar facturas del mes
    facturas.forEach((f) => {
      const taxes = computeFacturaTaxes(f);
      res.iva += taxes.iva;
      res.valor125 += taxes.ica;
      if (f.estado === "pagado" || f.estado === "pago_parcial") {
        res.ingresos += Number(f.valor_pagado) || Number(f.valor_total) || 0;
      }
    });
    return res;
  }, [movimientos, facturas]);

  const chartData = useMemo(() => {
    const byMonth = {};
    movimientos.forEach((mov) => {
      const [y, m] = mov.fecha.split("-");
      const key = `${MESES[parseInt(m, 10) - 1]} ${y}`;
      if (!byMonth[key]) byMonth[key] = { name: key, Ingresos: 0, Gastos: 0 };
      const valor = mov.valor_total || 0;
      const tipo = mov.tipo_movimiento || "";
      if (isEgreso(tipo)) byMonth[key].Gastos += valor;
      else if (isIngreso(tipo)) byMonth[key].Ingresos += valor;
    });
    return Object.values(byMonth);
  }, [movimientos]);

  // ── Descarga: mes completo (movimientos + facturas en hojas) ──
  const handleExportMes = () => {
    const label = `${MESES[selectedMonth]}-${selectedYear}`;
    exportToExcel({
      fileName: `reporte-${label}`,
      sheetName: "Movimientos",
      columns: COLS_MOVIMIENTOS,
      rows: movimientos,
    });
    // segunda "hoja" como archivo aparte para facturas
    setTimeout(() => {
      exportToExcel({
        fileName: `facturas-${label}`,
        sheetName: "Facturas",
        columns: COLS_FACTURAS,
        rows: facturas,
      });
    }, 400);
  };

  // ── Descarga: consolidado anual (1 fila por mes) ──
  const handleExportAnual = async () => {
    setLoadingExport(true);
    try {
      const range = yearRange(selectedYear);
      const [allMovs, allFacts] = await Promise.all([
        movimientosService.getReporteFinanciero(range.start, range.end),
        facturasService.getAll({ fechaInicio: range.start, fechaFin: range.end }),
      ]);

      const resumenPorMes = Array.from({ length: 12 }, (_, i) => ({
        mes: `${MESES[i]} ${selectedYear}`,
        ingresos: 0,
        egresos: 0,
        iva: 0,
        ica: 0,
        ingresoFacturas: 0,
        numFacturas: 0,
        facturasCobradas: 0,
        cartera: 0,
      }));

      allMovs.forEach((mov) => {
        const m = parseInt(mov.fecha.split("-")[1], 10) - 1;
        if (m < 0 || m > 11) return;
        const valor = mov.valor_total || 0;
        const tipo = mov.tipo_movimiento || "";
        if (isEgreso(tipo)) resumenPorMes[m].egresos += valor;
        else resumenPorMes[m].ingresos += valor;
        resumenPorMes[m].iva += getSumableIva(mov);
        if (isIngreso(tipo)) resumenPorMes[m].ica += getValor125(mov);
      });

      allFacts.forEach((f) => {
        const fecha = f.fecha_pago || f.fecha_creacion;
        if (!fecha) return;
        const m = parseInt(fecha.split("-")[1], 10) - 1;
        if (m < 0 || m > 11) return;
        const taxes = computeFacturaTaxes(f);
        resumenPorMes[m].numFacturas += 1;
        resumenPorMes[m].iva += taxes.iva;
        resumenPorMes[m].ica += taxes.ica;
        if (f.estado === "pagado") {
          resumenPorMes[m].ingresoFacturas += Number(f.valor_total) || 0;
          resumenPorMes[m].facturasCobradas += 1;
        } else if (f.estado === "pago_parcial") {
          const abonado = Number(f.valor_pagado) || 0;
          resumenPorMes[m].ingresoFacturas += abonado;
          resumenPorMes[m].cartera += Math.max(0, (f.valor_total || 0) - abonado);
        } else if (f.estado === "pendiente") {
          resumenPorMes[m].cartera += Number(f.valor_total) || 0;
        }
      });

      // Fila de totales
      const totals = resumenPorMes.reduce(
        (acc, r) => ({
          mes: "TOTAL ANUAL",
          ingresos: acc.ingresos + r.ingresos,
          egresos: acc.egresos + r.egresos,
          iva: acc.iva + r.iva,
          ica: acc.ica + r.ica,
          ingresoFacturas: acc.ingresoFacturas + r.ingresoFacturas,
          numFacturas: acc.numFacturas + r.numFacturas,
          facturasCobradas: acc.facturasCobradas + r.facturasCobradas,
          cartera: acc.cartera + r.cartera,
        }),
        { mes: "", ingresos: 0, egresos: 0, iva: 0, ica: 0, ingresoFacturas: 0, numFacturas: 0, facturasCobradas: 0, cartera: 0 }
      );

      exportToExcel({
        fileName: `consolidado-anual-${selectedYear}`,
        sheetName: "Consolidado",
        columns: COLS_CONSOLIDADO,
        rows: [...resumenPorMes, totals],
      });

      // También exportar detalle de movimientos del año
      setTimeout(() => {
        exportToExcel({
          fileName: `movimientos-${selectedYear}`,
          sheetName: "Movimientos",
          columns: COLS_MOVIMIENTOS,
          rows: allMovs,
        });
      }, 400);

      setTimeout(() => {
        exportToExcel({
          fileName: `facturas-${selectedYear}`,
          sheetName: "Facturas",
          columns: COLS_FACTURAS,
          rows: allFacts,
        });
      }, 800);
    } catch (e) {
      console.error(e);
      alert("Error al generar el reporte anual");
    } finally {
      setLoadingExport(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Reportes
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Indicadores financieros y descargas por período
          </p>
        </div>
      </div>

      {/* Filtros + Descargas */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Filtro por mes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" />
                Reporte mensual
              </h3>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 flex-1"
                >
                  {mesesDisponibles.map((m) => (
                    <option key={m} value={m}>{MESES[m]}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleExportMes}
                disabled={loading || (movimientos.length === 0 && facturas.length === 0)}
                className="w-full sm:w-auto gap-2"
              >
                <FileSpreadsheet size={15} />
                Descargar {MESES[selectedMonth]} {selectedYear}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Descarga 2 archivos: movimientos y facturas del mes
              </p>
            </div>

            {/* Consolidado anual */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-4 md:pt-0 md:pl-6">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Download size={16} className="text-amber-500" />
                Consolidado anual
              </h3>
              <div className="flex gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                onClick={handleExportAnual}
                disabled={loadingExport}
                className="w-full sm:w-auto gap-2"
              >
                <FileSpreadsheet size={15} />
                {loadingExport ? "Generando..." : `Consolidado ${selectedYear}`}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Descarga 3 archivos: resumen mensual, movimientos y facturas del año completo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs del mes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp}
          label={`Ingresos · ${MESES[selectedMonth]}`}
          value={formatCurrency(reporte.ingresos)}
          tone="green"
          loading={loading}
        />
        <StatCard
          icon={TrendingDown}
          label={`Egresos · ${MESES[selectedMonth]}`}
          value={formatCurrency(reporte.egresos)}
          tone="red"
          loading={loading}
        />
        <StatCard
          icon={DollarSign}
          label="ICA 1.25%"
          value={formatCurrency(reporte.valor125)}
          tone="amber"
          loading={loading}
        />
        <StatCard
          icon={BarChart3}
          label="Movimientos"
          value={movimientos.length}
          tone="slate"
          loading={loading}
        />
      </div>

      {/* Gráfico */}
      {!loading && movimientos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos vs Gastos — {MESES[selectedMonth]} {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(v) =>
                      v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de facturas del mes */}
      {!loading && facturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Facturas — {MESES[selectedMonth]} {selectedYear}</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  {["Número", "Cliente", "Fecha", "Estado", "Total", "Pagado", "Pendiente"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {facturas.map((f) => {
                  const pendiente = Math.max(0, (f.valor_total || 0) - (f.valor_pagado || 0));
                  return (
                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-100">{f.prefijo}-{f.numero_factura}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{f.cliente_nombre || f.cliente_nit}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatDate(f.fecha_pago || f.fecha_creacion)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          f.estado === "pagado" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : f.estado === "pago_parcial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : f.estado === "anulado" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                        }`}>{f.estado}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-slate-800 dark:text-slate-100">{formatCurrency(f.valor_total)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(f.valor_pagado || (f.estado === "pagado" ? f.valor_total : 0))}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(f.estado === "pagado" ? 0 : pendiente)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && movimientos.length === 0 && facturas.length === 0 && (
        <Card>
          <CardContent className="text-center text-slate-500 dark:text-slate-400 py-16">
            Sin datos para {MESES[selectedMonth]} {selectedYear}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, loading }) {
  const tones = {
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    red: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    slate: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`p-2 rounded-lg shrink-0 ${tones[tone]}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{label}</p>
          <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
            {loading ? <span className="text-slate-400">—</span> : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
