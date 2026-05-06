// filepath: src/features/facturas/pages/FacturasPage.jsx
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  Plus,
  Receipt,
  Search,
  Wallet,
  Clock,
} from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import Input, { Select, Textarea } from "../../../components/ui/Input";
import { clientesService } from "../../clientes/services/clientesService";
import { cuentasService } from "../../cuentas/services/cuentasService";
import { facturasService } from "../services/facturasService";
import { movimientosService } from "../../movimientos/services/movimientosService";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getDateRange,
  getEstadoColor,
  getEstadoLabel,
} from "../../../lib/utils";
import { computeFacturaTaxes } from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";
import { FACTURAS_CONFIG } from "../../../lib/appConfig";
import { useAuth } from "../../auth/AuthProvider";
import { canPerform, PERMISSIONS } from "../../auth/permissions";
import MovimientoLogsCard from "../../movimientos/components/MovimientoLogsCard";
import CambiarEstadoModal from "../components/CambiarEstadoModal";
import FacturaModal from "../components/FacturaModal";
import FacturaDetalleModal from "../components/FacturaDetalleModal";

const PAGE_SIZE = 20;
const LOGS_PAGE_SIZE = 50;

const ESTADOS_FILTRO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "pagado", label: "Pagado" },
];

const PREFIJOS = [
  { value: "FE", label: "FE - Factura electrónica" },
  { value: "RM", label: "RM - Remisión" },
];

const CUENTA_BANCOLOMBIA_OBJETIVO = FACTURAS_CONFIG.CUENTA_AUTOMATICA_FE_NOMBRE;
const CUENTA_BANCOLOMBIA_FRAGMENTO = FACTURAS_CONFIG.CUENTA_AUTOMATICA_FE_FRAGMENTO;

const emptyFacturaForm = {
  cliente_nit: "",
  prefijo: "FE",
  numero_factura: "",
  fecha_pago: formatDateInput(new Date()),
  valor_total: "",
  observaciones: "",
};

export default function FacturasPage() {
  const { access, user, profile } = useAuth();
  const range = getDateRange("month");
  const currentMonthStr = `${range.start.getFullYear()}-${String(
    range.start.getMonth() + 1
  ).padStart(2, "0")}`;
  
  const [filtros, setFiltros] = useState({
    fechaInicio: formatDateInput(range.start),
    fechaFin: formatDateInput(range.end),
    estado: "",
    busqueda: "",
    ordenarPor: "fecha_creacion_desc",
  });
  
  const [mesResumen, setMesResumen] = useState(currentMonthStr);
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [logsMonth, setLogsMonth] = useState(currentMonthStr);

  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);

  const queryClient = useQueryClient();
  const currentUserLabel = profile?.full_name || user?.email || "Sistema";

  const getMonthRange = (value) => {
    if (!value) return getDateRange("month");
    const [year, month] = value.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  };

  const { data: clientesData = [], isLoading: clientesLoading } = useQuery({
    queryKey: ["clientes", "minimal"],
    queryFn: clientesService.getAll,
  });

  const { data: cuentasData = [], isLoading: cuentasLoading } = useQuery({
    queryKey: ["cuentas", "activas"],
    queryFn: cuentasService.getActivas,
  });

  const { data: facturasData = [], isLoading } = useQuery({
    queryKey: ["facturas", filtros, mesResumen],
    queryFn: () => {
      const monthRange = getMonthRange(mesResumen || currentMonth);
      return facturasService.getAll({
        ...filtros,
        fechaInicio: formatDateInput(monthRange.start),
        fechaFin: formatDateInput(monthRange.end),
      });
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["facturas", "logs", logsPage, logsMonth],
    queryFn: () =>
      movimientosService.getLogs({
        page: logsPage,
        pageSize: LOGS_PAGE_SIZE,
        month: logsMonth,
      }),
    initialData: { data: [], count: 0 },
  });

  const crearMutate = useMutation({
    mutationFn: facturasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => facturasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const clientesMap = useMemo(
    () => new Map(clientesData.map((cliente) => [cliente.nit, cliente])),
    [clientesData],
  );

  const openFacturaModal = (factura = null) => {
    setSelectedFactura(factura);
    setFacturaModalOpen(true);
  };

  const closeFacturaModal = () => {
    setFacturaModalOpen(false);
    setSelectedFactura(null);
  };

  const cuentasMap = useMemo(
    () => new Map(cuentasData.map((cuenta) => [cuenta.id, cuenta])),
    [cuentasData],
  );

  const cuentaBancolombia = useMemo(() => {
    const normalize = (text) =>
      String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const fragmento = normalize(CUENTA_BANCOLOMBIA_FRAGMENTO);
    const nombreObjetivo = normalize(CUENTA_BANCOLOMBIA_OBJETIVO);
    return (
      cuentasData.find((cuenta) => {
        const nombre = normalize(cuenta.nombre);
        return nombre === nombreObjetivo || nombre.includes(fragmento);
      }) || null
    );
  }, [cuentasData]);

  const facturasEnriquecidas = useMemo(() => {
    let result = (facturasData || []).map((factura) => {
      const cliente = clientesMap.get(factura.cliente_nit);
      const cuenta = cuentasMap.get(factura.cuenta_id);
      return {
        ...factura,
        cliente_nombre: cliente?.nombre || factura.cliente_nombre || "",
        cuenta_nombre: cuenta?.nombre || factura.cuenta_nombre || "",
      };
    });

    if (filtros.busqueda) {
      const term = filtros.busqueda.toLowerCase();
      result = result.filter(
        (f) =>
          String(f.numero_factura).toLowerCase().includes(term) ||
          String(f.cliente_nombre).toLowerCase().includes(term) ||
          String(f.cliente_nit).toLowerCase().includes(term) ||
          String(f.cuenta_nombre).toLowerCase().includes(term)
      );
    }

    return result;
  }, [facturasData, clientesMap, cuentasMap, filtros.busqueda]);

const statsFacturacion = useMemo(() => {
    let total = 0;
    let pagado = 0;
    let pendiente = 0;

    facturasEnriquecidas.forEach((f) => {
      if (f.estado === "anulado") return;
      const est = (f.estado || "").toLowerCase();
      const val = Number(f.valor_total) || 0;
      total += val;
      if (est === "pagado") {
        pagado += val;
      } else if (est === "pago_parcial") {
        const abonado = Number(f.valor_pagado) || 0;
        pagado += abonado;
        pendiente += (val - abonado);
      } else {
        pendiente += val;
      }
    });

    return { total, pagado, pendiente };
  }, [facturasEnriquecidas]);

  const totalPages = Math.ceil(facturasEnriquecidas.length / PAGE_SIZE);
  const facturasPaginadas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return facturasEnriquecidas.slice(start, start + PAGE_SIZE);
  }, [facturasEnriquecidas, page]);

  const logs = logsData?.data || [];
  const logsCount = logsData?.count || 0;
  const logsTotalPages = Math.max(1, Math.ceil(logsCount / LOGS_PAGE_SIZE));

  const getFiltrosActivos = () => {
    const monthRange = getMonthRange(mesResumen || currentMonth);
    return {
      ...filtros,
      fechaInicio: formatDateInput(monthRange.start),
      fechaFin: formatDateInput(monthRange.end),
    };
  };

  const openEstadoModal = (factura) => {
    if (!canPerform(access, PERMISSIONS.FACTURAS_CHANGE_STATE)) return;
    setSelectedFactura(factura);
    setEstadoModalOpen(true);
  };

  const closeEstadoModal = () => {
    setEstadoModalOpen(false);
    setSelectedFactura(null);
  };



  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFiltros({
      fechaInicio: formatDateInput(range.start),
      fechaFin: formatDateInput(range.end),
      estado: "",
      busqueda: "",
      ordenarPor: "fecha_creacion_desc",
    });
    setMesResumen(currentMonth);
    setPage(1);
  };

  const handleExport = () => {
    exportToExcel({
      fileName: "facturas",
      sheetName: "Facturas",
      columns: [
        {
          header: "Número",
          value: (f) => `${f.prefijo || ""}-${f.numero_factura || ""}`,
        },
        { header: "Fecha", value: (f) => formatDate(f.fecha_pago) },
        { header: "Cliente", value: (f) => f.cliente_nit },
        { header: "Nombre", value: (f) => f.cliente_nombre },
        { header: "Base", value: (f) => computeFacturaTaxes(f).base || 0 },
        { header: "ICA", value: (f) => computeFacturaTaxes(f).ica || 0 },
        { header: "IVA", value: (f) => computeFacturaTaxes(f).iva || 0 },
        { header: "Valor", value: (f) => f.valor_total || 0 },
        { header: "Estado", value: (f) => getEstadoLabel(f.estado) },
      ],
      rows: facturasEnriquecidas,
    });
  };

  const handlePageChange = (newPage) => setPage(newPage);
  const handleLogsPageChange = (newPage) => setLogsPage(newPage);

  const handleDownloadLogs = async () => {
    if (!logsCount) return;

    const { data } = await movimientosService.getLogs({
      page: 1,
      pageSize: Math.max(logsCount, 1),
      month: logsMonth,
    });

    exportToExcel({
      fileName: `logs-facturas-${logsMonth || currentMonth}`,
      sheetName: "Logs",
      columns: [
        { header: "Fecha", value: (log) => log.created_at || log.fecha_hora || log.fecha || "" },
        { header: "Usuario", value: (log) => log.usuario_email || log.user_email || log.usuario || log.user_name || log.created_by || currentUserLabel },
        { header: "Acción", value: (log) => log.accion || log.action || log.tipo_accion || "Movimiento" },
        { header: "Detalle", value: (log) => log.detalle || log.descripcion || log.observaciones || "Sin detalle" },
      ],
      rows: data || [],
    });
  };

  const isMutating = crearMutate.isPending || actualizarMutate.isPending;
  const canCreateFactura = canPerform(access, PERMISSIONS.FACTURAS_CREATE);
  const canEditFactura = canPerform(access, PERMISSIONS.FACTURAS_EDIT);
  const canChangeFacturaState = canPerform(
    access,
    PERMISSIONS.FACTURAS_CHANGE_STATE,
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Facturación
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
            Control de facturas y remisiones
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading || facturasEnriquecidas.length === 0}
            className="shrink-0"
          >
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          {canCreateFactura && (
            <Button onClick={() => openFacturaModal()} className="shrink-0">
              <Plus size={16} className="mr-1 sm:mr-2" />
              Nueva Factura
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
              <Receipt className="text-blue-600 dark:text-blue-400 w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total facturado del mes</p>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(statsFacturacion.total)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg shrink-0">
              <CheckCircle2 className="text-green-600 dark:text-green-400 w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total cobrado (Pagado)</p>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(statsFacturacion.pagado)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4 sm:p-5">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg shrink-0">
              <Clock className="text-amber-600 dark:text-amber-400 w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400">Total pendiente (Cartera)</p>
              <p className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {formatCurrency(statsFacturacion.pendiente)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="sm:col-span-2 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                name="busqueda"
                placeholder="Buscar por número, cliente o cuenta..."
                value={filtros.busqueda}
                onChange={handleFiltroChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <input
              type="month"
              value={mesResumen}
              onChange={(e) => {
                setMesResumen(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_FILTRO.map((est) => (
                <option key={est.value} value={est.value}>
                  {est.label}
                </option>
              ))}
            </select>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/50"
            >
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800 hidden sm:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Número
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Base
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  ICA
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  IVA
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Cuenta
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Valor
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Pendiente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading || clientesLoading || cuentasLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    Cargando...
                  </td>
                </tr>
              ) : facturasPaginadas.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No hay facturas para mostrar
                  </td>
                </tr>
              ) : (
                facturasPaginadas.map((factura) => {
                  const taxes = computeFacturaTaxes(factura);
                  return (
                    <tr
                      key={factura.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700 dark:bg-slate-800"
                    >
                      <td data-label="Número" className="px-3 sm:px-4 py-3 text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedFactura(factura);
                            setDetalleModalOpen(true);
                          }}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline font-medium transition-colors"
                        >
                          {factura.prefijo}-{factura.numero_factura}
                        </button>
                      </td>
                      <td data-label="Fecha" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {formatDate(factura.fecha_pago)}
                      </td>
                      <td data-label="Cliente" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        <div>{factura.cliente_nit}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {factura.cliente_nombre}
                        </div>
                      </td>
                      <td data-label="Base" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right font-medium">
                        {formatCurrency(taxes.base)}
                      </td>
                      <td data-label="ICA" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right font-medium">
                        {formatCurrency(taxes.ica)}
                      </td>
                      <td data-label="IVA" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right font-medium">
                        {formatCurrency(taxes.iva)}
                      </td>
                      <td data-label="Cuenta" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-left">
                        {factura.cuenta_nombre || <span className="text-slate-400 dark:text-slate-500 italic">No asignada</span>}
                      </td>
                      <td data-label="Valor" className="px-3 sm:px-4 py-3 text-sm text-slate-700 dark:text-slate-300 text-right font-medium">
                        {formatCurrency(factura.valor_total)}
                      </td>
                      <td data-label="Pendiente" className="px-3 sm:px-4 py-3 text-sm text-right font-medium">
                        {(factura.estado || "").toLowerCase() === "pagado" ? (
                          <span className="text-green-600 dark:text-green-400">$0</span>
                        ) : (factura.estado || "").toLowerCase() === "pago_parcial" ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatCurrency(
                              Math.max(0, (factura.valor_total || 0) - (factura.valor_pagado || 0))
                            )}
                          </span>
                        ) : (factura.estado || "").toLowerCase() === "anulado" ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(factura.valor_total)}
                          </span>
                        )}
                      </td>
                      <td data-label="Estado" className="px-3 sm:px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(factura.estado)}`}
                        >
                          {getEstadoLabel(factura.estado)}
                        </span>
                      </td>
                      <td data-label="Acciones" className="px-3 sm:px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {canChangeFacturaState && (
                            <button
                              onClick={() => openEstadoModal(factura)}
                              disabled={isMutating}
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {canEditFactura && (
                            <button
                              onClick={() => openFacturaModal(factura)}
                              disabled={isMutating}
                              className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
                            >
                              <Receipt size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Mostrando {(page - 1) * PAGE_SIZE + 1} -{" "}
              {Math.min(page * PAGE_SIZE, facturasEnriquecidas.length)} de{" "}
              {facturasEnriquecidas.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 hover:border-slate-400 transition-all"
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

      <FacturaModal
        isOpen={facturaModalOpen}
        onClose={closeFacturaModal}
        factura={selectedFactura}
      />

      <CambiarEstadoModal
        isOpen={estadoModalOpen}
        onClose={closeEstadoModal}
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
