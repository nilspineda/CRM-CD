import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageCircle, Wallet, AlertCircle } from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import { facturasService } from "../../facturas/services/facturasService";
import { clientesService } from "../../clientes/services/clientesService";
import CambiarEstadoModal from "../../facturas/components/CambiarEstadoModal";
import FacturaModal from "../../facturas/components/FacturaModal";
import FacturaDetalleModal from "../../facturas/components/FacturaDetalleModal";
import Button from "../../../components/ui/Button";
import { formatCurrency, formatDate, formatDateInput, getDateRange } from "../../../lib/utils";

export default function CarteraPage() {
  const [query, setQuery] = useState("");
  const [mesResumen, setMesResumen] = useState("");
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const getMonthRange = (value) => {
    if (!value) return getDateRange("month");
    const [year, month] = value.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  };

  const { data: facturasData = [], isLoading: facturasLoading } = useQuery({
    queryKey: ["facturas", "cartera", mesResumen],
    queryFn: () => {
      let filtros = { estado: "cartera" };
      if (mesResumen) {
        const monthRange = getMonthRange(mesResumen);
        filtros.fechaInicio = formatDateInput(monthRange.start);
        filtros.fechaFin = formatDateInput(monthRange.end);
      }
      return facturasService.getAll(filtros);
    },
  });

  const { data: clientesData = [], isLoading: clientesLoading } = useQuery({
    queryKey: ["clientes", "minimal"],
    queryFn: clientesService.getAll,
    staleTime: 10 * 60 * 1000, // clientes cambian poco, cachear 10 min
  });

  const clientesMap = useMemo(() => {
    const map = new Map();
    clientesData.forEach((c) => map.set(c.nit, c));
    return map;
  }, [clientesData]);

  const carteraEnriquecida = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let result = facturasData.map((factura) => {
      const cliente = clientesMap.get(factura.cliente_nit);

      let fechaObjetivo =
        factura.estado === "pago_parcial"
          ? factura.fecha_proximo_pago
          : factura.fecha_pago;

      if (!fechaObjetivo) {
        // Fallback si no hay fecha definida
        fechaObjetivo = factura.fecha_pago || factura.fecha_creacion;
      }

      const fechaObjDate = new Date(fechaObjetivo + "T00:00:00");
      let diasRestantes = null;
      let vencida = false;

      if (!Number.isNaN(fechaObjDate.getTime())) {
        const diffTime = fechaObjDate.getTime() - hoy.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diasRestantes < 0) vencida = true;
      }

      const valorPendiente =
        factura.estado === "pago_parcial"
          ? (Number(factura.valor_total) || 0) -
            (Number(factura.valor_pagado) || 0)
          : Number(factura.valor_total) || 0;

      return {
        ...factura,
        cliente_nombre: cliente?.nombre || factura.cliente_nombre || "",
        telefono: cliente?.telefono || "",
        dias_restantes: diasRestantes,
        vencida,
        valor_pendiente: valorPendiente,
        valor_abonado:
          factura.estado === "pago_parcial"
            ? Number(factura.valor_pagado) || 0
            : 0,
        fecha_objetivo: fechaObjetivo,
      };
    });

    // Filtro a prueba de fallos: asegurarse de que no haya pagadas ni anuladas, y que haya valor pendiente
    result = result.filter(
      (f) =>
        f.estado !== "pagado" &&
        f.estado !== "anulado" &&
        f.valor_pendiente > 0,
    );

    if (query) {
      const text = query.toLowerCase();
      result = result.filter(
        (f) =>
          String(f.numero_factura).toLowerCase().includes(text) ||
          String(f.cliente_nombre).toLowerCase().includes(text) ||
          String(f.cliente_nit).toLowerCase().includes(text),
      );
    }

    // Ordenar: vencidas primero (por días más negativos), luego por días restantes
    result.sort((a, b) => {
      if (a.dias_restantes === null && b.dias_restantes === null) return 0;
      if (a.dias_restantes === null) return 1;
      if (b.dias_restantes === null) return -1;
      return a.dias_restantes - b.dias_restantes;
    });

    return result;
  }, [facturasData, clientesMap, query]);

  const totalCartera = useMemo(() => {
    return carteraEnriquecida.reduce(
      (sum, item) => sum + item.valor_pendiente,
      0,
    );
  }, [carteraEnriquecida]);

  const getWhatsAppUrl = (factura) => {
    if (!factura.telefono) return null;

    const digits = String(factura.telefono).replace(/\D/g, "");
    if (!digits) return null;

    const normalized =
      digits.length === 10 && !digits.startsWith("57") ? `57${digits}` : digits;

    const numero = `${factura.prefijo}-${factura.numero_factura}`;
    const diasText = factura.vencida
      ? `tiene <b>${Math.abs(factura.dias_restantes)} días</b> de vencimiento`
      : `vence en ${factura.dias_restantes} días`;

    const text = `Hola, te recordamos que tienes un compromiso de pago de la factura ${numero} pendiente por valor de ${formatCurrency(factura.valor_pendiente)}. La factura ${diasText}.`;

    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  };

  const isLoading = facturasLoading || clientesLoading;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Cartera
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Gestión de facturas pendientes y cobros
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <Button
            onClick={() => {
              setSelectedFactura(null);
              setFacturaModalOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            Nueva
          </Button>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Mes:
            </label>
            <input
              type="month"
              value={mesResumen}
              onChange={(e) => setMesResumen(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
            {mesResumen && (
              <button
                onClick={() => setMesResumen("")}
                className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              >
                Ver todo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
              <Wallet className="text-amber-600 dark:text-amber-400 w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Total en Cartera
              </p>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(totalCartera)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número o cliente..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 table-fixed">
            <thead className="bg-slate-50 dark:bg-slate-800 hidden sm:table-header-group">
              <tr>
                <th className="w-[15%] px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Factura
                </th>
                <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Cliente
                </th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Próximo Pago
                </th>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Días
                </th>
                <th className="w-[12%] px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Abonado
                </th>
                <th className="w-[12%] px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Pendiente
                </th>
                <th className="w-[17%] px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando cartera...
                  </td>
                </tr>
              ) : carteraEnriquecida.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay facturas pendientes en cartera
                  </td>
                </tr>
              ) : (
                carteraEnriquecida.map((factura) => {
                  const wsUrl = getWhatsAppUrl(factura);
                  return (
                    <tr
                      key={factura.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <td data-label="Factura" className="px-3 sm:px-4 py-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {/* Número clickeable → abre resumen */}
                          <button
                            onClick={() => {
                              setSelectedFactura(factura);
                              setDetalleModalOpen(true);
                            }}
                            className="font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:underline transition-colors"
                            title="Ver resumen de factura"
                          >
                            {factura.prefijo}-{factura.numero_factura}
                          </button>
                          {/* Botón editar */}
                          <button
                            onClick={() => {
                              setSelectedFactura(factura);
                              setFacturaModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                            title="Editar factura"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>
                        </div>
                        {factura.estado === "pago_parcial" && (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            Pago Parcial
                          </span>
                        )}
                      </td>
                      <td data-label="Cliente" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        <div className="font-medium truncate">
                          {factura.cliente_nombre}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {factura.cliente_nit}
                        </div>
                      </td>
                      <td data-label="Próximo Pago" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-center">
                        {factura.fecha_objetivo ? (
                          <div>
                            <div>{formatDate(factura.fecha_objetivo)}</div>
                            {factura.estado === "pago_parcial" && (
                              <div className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">
                                próximo pago
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td data-label="Días" className="px-3 sm:px-4 py-3 text-center">
                        {factura.dias_restantes === null ? (
                          <span className="text-sm text-slate-400">-</span>
                        ) : factura.vencida ? (
                          <div className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                            <AlertCircle size={12} />
                            {Math.abs(factura.dias_restantes)}d vencida
                          </div>
                        ) : factura.dias_restantes <= 3 ? (
                          <span className="inline-flex text-xs font-bold px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                            ⚠ {factura.dias_restantes}d
                          </span>
                        ) : (
                          <span className="inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {factura.dias_restantes}d
                          </span>
                        )}
                      </td>
                      {/* Abonado */}
                      <td data-label="Abonado" className="px-3 sm:px-4 py-3 text-sm text-right font-medium">
                        {factura.valor_abonado > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatCurrency(factura.valor_abonado)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      {/* Pendiente */}
                      <td data-label="Pendiente" className="px-3 sm:px-4 py-3 text-sm text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(factura.valor_pendiente)}
                      </td>
                      <td data-label="Acción" className="px-3 sm:px-4 py-3 text-center">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                          {wsUrl ? (
                            <a
                              href={wsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-500/40 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-medium w-full sm:w-auto"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <MessageCircle size={16} />
                              <span className="hidden sm:inline">
                                Recordatorio
                              </span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              Sin teléfono
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFactura(factura);
                              setEstadoModalOpen(true);
                            }}
                            className="w-full sm:w-auto px-3 py-1.5"
                          >
                            Cambiar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CambiarEstadoModal
        isOpen={estadoModalOpen}
        onClose={() => {
          setEstadoModalOpen(false);
          setSelectedFactura(null);
        }}
        factura={selectedFactura}
      />

      <FacturaModal
        isOpen={facturaModalOpen}
        onClose={() => {
          setFacturaModalOpen(false);
          setSelectedFactura(null);
        }}
        factura={selectedFactura}
      />

      <FacturaDetalleModal
        isOpen={detalleModalOpen}
        onClose={() => {
          setDetalleModalOpen(false);
          setSelectedFactura(null);
        }}
        factura={selectedFactura}
      />
    </div>
  );
}
