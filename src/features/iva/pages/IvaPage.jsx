import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  FileText,
  Download,
} from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { movimientosService } from "../../movimientos/services/movimientosService";
import {
  formatCurrency,
  formatDate,
  getDateRange,
  getEffectiveIvaPercentage,
  getTipoMovimientoLabel,
  getSumableIva,
  getValor125,
  isEgreso,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";

export default function IvaPage() {
  const range = getDateRange("month");
  const [filtros, setFiltros] = useState({
    fechaInicio: range.start.toISOString().split("T")[0],
    fechaFin: range.end.toISOString().split("T")[0],
  });

  const { data: movimientos = [], isLoading: loading } = useQuery({
    queryKey: ["iva", filtros.fechaInicio, filtros.fechaFin],
    queryFn: () => movimientosService.getIva(filtros.fechaInicio, filtros.fechaFin),
  });

  const resumen = useMemo(() => {
    return movimientos.reduce(
      (acc, mov) => {
        const iva = getSumableIva(mov);
        if (isEgreso(mov.tipo_movimiento)) {
          acc.descontable += iva;
        } else {
          acc.generado += iva;
        }
        return acc;
      },
      { generado: 0, descontable: 0 },
    );
  }, [movimientos]);

  const ivaPorPagar = resumen.generado - resumen.descontable;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleExport = () => {
    exportToExcel({
      fileName: "control-iva",
      sheetName: "IVA",
      columns: [
        { header: "Fecha", value: (mov) => formatDate(mov.fecha) },
        {
          header: "Movimiento",
          value: (mov) => mov.numero_factura || mov.descripcion || "",
        },
        {
          header: "Tipo",
          value: (mov) => getTipoMovimientoLabel(mov.tipo_movimiento),
        },
        {
          header: "Cliente/Proveedor",
          value: (mov) => mov.cliente_proveedor || "",
        },
        {
          header: "Cuenta",
          value: (mov) => mov.cuentas_financieras?.nombre || "",
        },
        {
          header: "Base",
          value: (mov) => mov.valor_base || mov.valor_total || 0,
        },
        { header: "% IVA", value: (mov) => getEffectiveIvaPercentage(mov) },
        { header: "IVA", value: (mov) => getSumableIva(mov) },
        { header: "1.25% es ICA", value: (mov) => getValor125(mov) },
        { header: "Total", value: (mov) => mov.valor_total || 0 },
      ],
      rows: movimientos,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Control de IVA
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Resumen tributario calculado desde Supabase
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={TrendingUp}
          label="IVA generado"
          value={formatCurrency(resumen.generado)}
          tone="blue"
        />
        <StatCard
          icon={TrendingDown}
          label="IVA descontable"
          value={formatCurrency(resumen.descontable)}
          tone="green"
        />
        <StatCard
          icon={Calculator}
          label="IVA por pagar"
          value={formatCurrency(ivaPorPagar)}
          tone={ivaPorPagar >= 0 ? "amber" : "green"}
        />
        <StatCard
          icon={FileText}
          label="Movimientos"
          value={movimientos.length}
          tone="slate"
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
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              name="fechaFin"
              type="date"
              value={filtros.fechaFin}
              onChange={handleFilterChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Movimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Base
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  IVA
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  1.25% es ICA
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando IVA...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay movimientos con IVA
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3">
                      <span className="sm:hidden text-xs text-slate-500 mr-1">
                        Fecha:
                      </span>
                      {formatDate(mov.fecha)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-800">
                      <p className="font-medium">
                        {mov.numero_factura || mov.descripcion}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mov.cliente_proveedor ||
                          mov.cuentas_financieras?.nombre ||
                          ""}
                      </p>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-slate-700">
                      {getTipoMovimientoLabel(mov.tipo_movimiento)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-700">
                      {formatCurrency(mov.valor_base || 0)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right font-semibold text-slate-800">
                      {getEffectiveIvaPercentage(mov)}% -{" "}
                      {formatCurrency(getSumableIva(mov))}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-700">
                      {formatCurrency(getValor125(mov))}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-700">
                      {formatCurrency(mov.valor_total || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
          <p className="text-base sm:text-xl font-bold text-slate-800 truncate">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
