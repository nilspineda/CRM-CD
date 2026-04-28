import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Plus,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import Card, { CardContent } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Modal from "../../../components/ui/Modal";
import Badge from "../../../components/ui/Badge";
import Input, { Select, Textarea } from "../../../components/ui/Input";
import { clientesService } from "../../clientes/services/clientesService";
import { cuentasService } from "../../cuentas/services/cuentasService";
import { facturasService } from "../services/facturasService";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  getDateRange,
  getEstadoColor,
  getEstadoLabel,
} from "../../../lib/utils";
import { exportToExcel } from "../../../lib/exportExcel";

const PAGE_SIZE = 50;

const ESTADOS_FILTRO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "pagado", label: "Pagado" },
];

const ESTADOS_FACTURA = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "pagado", label: "Pagado" },
];

const PREFIJOS = [
  { value: "FE", label: "FE - Factura electrónica" },
  { value: "RM", label: "RM - Remisión" },
];

const emptyFacturaForm = {
  cliente_nit: "",
  prefijo: "FE",
  numero_factura: "",
  fecha_pago: formatDateInput(new Date()),
  valor_total: "",
  observaciones: "",
};

const emptyEstadoForm = {
  estado: "pendiente",
  fecha_pago: formatDateInput(new Date()),
  cuenta_id: "",
  observaciones: "",
};

const calcularValorFinal = (prefijo, valorBase) => {
  const base = Number(valorBase) || 0;
  if (prefijo === "FE") {
    // ICA = base * 1.25%, luego IVA = (base + ICA) * 19%
    const ica = base * 0.0125;
    const iva = (base + ica) * 0.19;
    return Math.round(base + ica + iva);
  }
  return Math.round(base);
};

const calcularDesglose = (prefijo, valorTotal) => {
  const total = Number(valorTotal) || 0;
  if (prefijo === "FE") {
    // Para FE: total = base + ica + iva, con ica = base*0.0125, iva = (base+ica)*0.19
    const factor = 1 + 0.0125 + 0.19 * (1 + 0.0125); // 1.204875
    const base = total / factor;
    const ica = base * 0.0125;
    const iva = (base + ica) * 0.19;
    return {
      base: Math.round(base),
      ica: Math.round(ica),
      iva: Math.round(iva),
      total: Math.round(base + ica + iva),
    };
  }
  // RM (u otros): no aplica impuestos, asumimos total = base
  const base = total;
  return { base: Math.round(base), ica: 0, iva: 0, total: Math.round(base) };
};

const getMonthRange = (value) => {
  if (!value) return getDateRange("month");
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
};

export default function FacturasPage() {
  const range = getDateRange("month");
  const currentMonth = formatDateInput(range.start).slice(0, 7);
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [facturaModalOpen, setFacturaModalOpen] = useState(false);
  const [estadoModalOpen, setEstadoModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [facturaForm, setFacturaForm] = useState(emptyFacturaForm);
  const [estadoForm, setEstadoForm] = useState(emptyEstadoForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [mesResumen, setMesResumen] = useState(currentMonth);
  const [filtros, setFiltros] = useState({
    fechaInicio: formatDateInput(range.start),
    fechaFin: formatDateInput(range.end),
    estado: "",
    busqueda: "",
    ordenarPor: "fecha_creacion_desc",
  });

  const getFiltrosActivos = (baseFiltros = filtros, mes = mesResumen) => {
    const monthRange = getMonthRange(mes || currentMonth);
    return {
      ...baseFiltros,
      fechaInicio: formatDateInput(monthRange.start),
      fechaFin: formatDateInput(monthRange.end),
    };
  };

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    loadFacturas(getFiltrosActivos());
  }, [filtros.estado, filtros.busqueda, filtros.ordenarPor, mesResumen]);

  const loadContext = async () => {
    try {
      const [clientesData, cuentasData] = await Promise.all([
        clientesService.getAll(),
        cuentasService.getActivas(),
      ]);
      setClientes(clientesData || []);
      setCuentas(cuentasData || []);
    } catch (error) {
      console.error("Error cargando contexto de facturas:", error);
    }
  };

  const loadFacturas = async (overrideFiltros = filtros) => {
    try {
      setLoading(true);
      const data = await facturasService.getAll(overrideFiltros);
      setFacturas(data || []);
      setPage(1);
    } catch (error) {
      console.error("Error cargando facturas:", error);
    } finally {
      setLoading(false);
    }
  };

  const clientesMap = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.nit, cliente])),
    [clientes],
  );

  const cuentasMap = useMemo(
    () => new Map(cuentas.map((cuenta) => [cuenta.id, cuenta])),
    [cuentas],
  );

  const facturasVisibles = useMemo(() => {
    const busqueda = filtros.busqueda.trim().toLowerCase();
    let items = facturas.map((factura) => {
      const cliente = clientesMap.get(factura.cliente_nit);
      const cuenta = cuentasMap.get(factura.cuenta_id);
      return {
        ...factura,
        cliente_nombre: cliente?.nombre || factura.cliente_nombre || "",
        cuenta_nombre: cuenta?.nombre || factura.cuenta_nombre || "",
      };
    });

    if (busqueda) {
      items = items.filter((factura) => {
        const numeroFinal =
          `${factura.prefijo || ""}-${factura.numero_factura || ""}`.toLowerCase();
        return (
          numeroFinal.includes(busqueda) ||
          (factura.cliente_nombre || "").toLowerCase().includes(busqueda) ||
          (factura.cliente_nit || "").toLowerCase().includes(busqueda) ||
          (factura.cuenta_nombre || "").toLowerCase().includes(busqueda)
        );
      });
    }

    items.sort((a, b) => {
      switch (filtros.ordenarPor) {
        case "fecha_creacion_asc":
          return (
            new Date(a.fecha_creacion || 0) - new Date(b.fecha_creacion || 0)
          );
        case "valor_total_asc":
          return (a.valor_total || 0) - (b.valor_total || 0);
        case "valor_total_desc":
          return (b.valor_total || 0) - (a.valor_total || 0);
        default:
          return (
            new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0)
          );
      }
    });

    return items;
  }, [facturas, clientesMap, cuentasMap, filtros.busqueda, filtros.ordenarPor]);

  const totalPages = Math.max(
    1,
    Math.ceil(facturasVisibles.length / PAGE_SIZE),
  );
  const facturasPagina = facturasVisibles.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => {
    return facturasVisibles.reduce(
      (acc, factura) => {
        const desglose = calcularDesglose(factura.prefijo, factura.valor_total);
        acc.total += factura.valor_total || 0;
        acc.iva += desglose.iva || 0;
        acc.ica += desglose.ica || 0;
        if (factura.estado === "pagado") acc.pagadas += 1;
        if (
          factura.estado === "pendiente" ||
          factura.estado === "pago_parcial"
        ) {
          acc.pendientes += 1;
        }
        return acc;
      },
      { total: 0, iva: 0, ica: 0, pagadas: 0, pendientes: 0 },
    );
  }, [facturasVisibles]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenFacturaModal = (factura = null) => {
    setSelectedFactura(factura);
    setErrors({});
    setFacturaForm(
      factura
        ? {
            cliente_nit: factura.cliente_nit || "",
            prefijo: factura.prefijo || "FE",
            numero_factura: factura.numero_factura || "",
            fecha_pago: factura.fecha_pago || formatDateInput(new Date()),
            valor_total: factura.valor_total ?? "",
            observaciones: factura.observaciones || "",
          }
        : emptyFacturaForm,
    );
    setFacturaModalOpen(true);
  };

  const handleOpenEstadoModal = (factura) => {
    setSelectedFactura(factura);
    setErrors({});
    setEstadoForm({
      estado: factura.estado || "pendiente",
      fecha_pago: factura.fecha_pago || formatDateInput(new Date()),
      cuenta_id: factura.cuenta_id || "",
      observaciones: factura.observaciones || "",
    });
    setEstadoModalOpen(true);
  };

  const handleCloseModals = () => {
    setFacturaModalOpen(false);
    setEstadoModalOpen(false);
    setSelectedFactura(null);
    setErrors({});
  };

  const handleSaveFactura = async (event) => {
    event.preventDefault();
    const nuevosErrores = {};

    if (!facturaForm.cliente_nit)
      nuevosErrores.cliente_nit = "Seleccione un cliente";
    if (!facturaForm.prefijo) nuevosErrores.prefijo = "Seleccione un prefijo";
    if (!facturaForm.numero_factura)
      nuevosErrores.numero_factura = "Ingrese el número";
    if (!facturaForm.fecha_pago)
      nuevosErrores.fecha_pago = "La fecha de pago es obligatoria";
    if (!facturaForm.valor_total || Number(facturaForm.valor_total) <= 0) {
      nuevosErrores.valor_total = "El valor debe ser mayor a cero";
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrors(nuevosErrores);
      return;
    }

    try {
      const payload = {
        cliente_nit: facturaForm.cliente_nit,
        prefijo: facturaForm.prefijo,
        numero_factura: facturaForm.numero_factura,
        fecha_pago: facturaForm.fecha_pago,
        valor_total: calcularValorFinal(
          facturaForm.prefijo,
          facturaForm.valor_total,
        ),
        observaciones: facturaForm.observaciones || null,
        estado: selectedFactura?.estado || "pendiente",
        fecha_creacion: selectedFactura?.fecha_creacion,
        cuenta_id: selectedFactura?.cuenta_id || null,
      };

      if (selectedFactura) {
        await facturasService.update(selectedFactura.id, payload);
      } else {
        await facturasService.create(payload);
      }

      handleCloseModals();
      loadFacturas(getFiltrosActivos());
    } catch (error) {
      console.error("Error guardando factura:", error);
      alert(error.message || "No se pudo guardar la factura.");
    }
  };

  const handleSaveEstado = async (event) => {
    event.preventDefault();
    const nuevosErrores = {};

    if (!estadoForm.estado) nuevosErrores.estado = "Seleccione un estado";
    if (estadoForm.estado === "pagado" && !estadoForm.cuenta_id) {
      nuevosErrores.cuenta_id = "Seleccione la cuenta de ingreso";
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrors(nuevosErrores);
      return;
    }

    try {
      await facturasService.cambiarEstado(selectedFactura.id, estadoForm);
      handleCloseModals();
      loadFacturas(getFiltrosActivos());
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert(error.message || "No se pudo actualizar el estado.");
    }
  };

  const handleExport = () => {
    const filtrosReporte = [
      `Mes: ${mesResumen || currentMonth}`,
      `Estado: ${filtros.estado || "Todos"}`,
      `Búsqueda: ${filtros.busqueda || "Todas"}`,
      `Orden: ${filtros.ordenarPor || "fecha_creacion_desc"}`,
    ].join(" | ");

    exportToExcel({
      fileName: `facturas_${mesResumen || currentMonth}`,
      sheetName: "Facturas",
      columns: [
        { header: "NIT", value: (factura) => factura.cliente_nit || "" },
        { header: "Cliente", value: (factura) => factura.cliente_nombre || "" },
        {
          header: "Factura",
          value: (factura) =>
            `${factura.prefijo || ""}-${factura.numero_factura || ""}`,
        },
        {
          header: "Fecha creación",
          value: (factura) => formatDate(factura.fecha_creacion),
        },
        {
          header: "Fecha pago",
          value: (factura) => formatDate(factura.fecha_pago),
        },
        {
          header: "Días para el pago",
          value: (factura) => factura.dias_faltantes ?? "",
        },
        {
          header: "Estado",
          value: (factura) => getEstadoLabel(factura.estado),
        },
        { header: "Cuenta", value: (factura) => factura.cuenta_nombre || "" },
        { header: "Valor", value: (factura) => factura.valor_total || 0 },
        { header: "Filtros aplicados", value: () => filtrosReporte },
        {
          header: "Observaciones",
          value: (factura) => factura.observaciones || "",
        },
      ],
      rows: facturasVisibles,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Facturas
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Cartera, clientes por NIT, prefijos FE/RM y control de estados
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || facturasVisibles.length === 0}
            className="shrink-0"
          >
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button onClick={() => handleOpenFacturaModal()} className="shrink-0">
            <Plus size={16} className="mr-1 sm:mr-2" />
            Añadir factura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={Receipt}
          label="Facturas"
          value={facturasVisibles.length}
          tone="blue"
        />
        <StatCard
          icon={Wallet}
          label="Total cartera"
          value={formatCurrency(stats.total)}
          tone="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Pagadas"
          value={stats.pagadas}
          tone="emerald"
        />
        <StatCard
          icon={Wallet}
          label="IVA total"
          value={formatCurrency(stats.iva)}
          tone="blue"
        />
        <StatCard
          icon={Wallet}
          label="ICA total"
          value={formatCurrency(stats.ica)}
          tone="slate"
        />
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                name="busqueda"
                value={filtros.busqueda}
                onChange={handleFilterChange}
                placeholder="Buscar NIT, cliente, factura o cuenta..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Input
              label="Mes"
              type="month"
              value={mesResumen}
              onChange={(event) =>
                setMesResumen(event.target.value || currentMonth)
              }
            />
            <Select
              name="estado"
              value={filtros.estado}
              onChange={handleFilterChange}
            >
              {ESTADOS_FILTRO.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </Select>
            <Select
              name="ordenarPor"
              value={filtros.ordenarPor}
              onChange={handleFilterChange}
            >
              <option value="fecha_creacion_desc">Más recientes primero</option>
              <option value="fecha_creacion_asc">Más antiguas primero</option>
              <option value="valor_total_desc">Mayor valor primero</option>
              <option value="valor_total_asc">Menor valor primero</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  NIT
                </th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Cliente
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Factura
                </th>
                <th className="w-[11%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Creación
                </th>
                <th className="w-[11%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Pago
                </th>
                <th className="w-[6%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Días
                </th>
                <th className="w-[11%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Estado
                </th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Base
                </th>
                <th className="w-[7%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  ICA 1.25%
                </th>
                <th className="w-[7%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  IVA 19%
                </th>
                <th className="w-[7%] px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando facturas...
                  </td>
                </tr>
              ) : facturasPagina.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay facturas para mostrar
                  </td>
                </tr>
              ) : (
                facturasPagina.map((factura) => (
                  <tr
                    key={factura.id}
                    className="hover:bg-slate-50 align-middle"
                  >
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center font-medium break-all">
                      {factura.cliente_nit || "-"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center">
                      <div className="font-medium truncate">
                        {factura.cliente_nombre || "-"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenFacturaModal(factura)}
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        aria-label={`Editar factura ${factura.numero_final || `${factura.prefijo || ""}-${factura.numero_factura || ""}`}`}
                      >
                        {factura.numero_final ||
                          `${factura.prefijo || ""}-${factura.numero_factura || ""}`}
                      </button>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center whitespace-nowrap">
                      {formatDate(factura.fecha_creacion)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center whitespace-nowrap">
                      {formatDate(factura.fecha_pago)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-center font-medium">
                      {factura.dias_faltantes ?? "-"}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Badge className={getEstadoColor(factura.estado)}>
                          {getEstadoLabel(factura.estado)}
                        </Badge>
                      </div>
                    </td>
                    {(() => {
                      const desglose = calcularDesglose(
                        factura.prefijo,
                        factura.valor_total,
                      );
                      return (
                        <>
                          <td className="px-3 sm:px-4 py-3 text-center font-medium text-slate-800 whitespace-nowrap">
                            {formatCurrency(desglose.base || 0)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-700 whitespace-nowrap">
                            {formatCurrency(desglose.ica || 0)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-center text-slate-700 whitespace-nowrap">
                            {formatCurrency(desglose.iva || 0)}
                          </td>
                        </>
                      );
                    })()}
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenFacturaModal(factura)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleOpenEstadoModal(factura)}
                        >
                          Cambiar estado
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Página {page} de {totalPages} · {facturasVisibles.length} registros
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={facturaModalOpen}
        onClose={handleCloseModals}
        title={selectedFactura ? "Editar factura" : "Añadir factura"}
        size="lg"
      >
        <form onSubmit={handleSaveFactura} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Cliente"
              value={facturaForm.cliente_nit}
              onChange={(event) =>
                setFacturaForm((prev) => ({
                  ...prev,
                  cliente_nit: event.target.value,
                }))
              }
              error={errors.cliente_nit}
              required
            >
              <option value="">Seleccionar cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.nit} value={cliente.nit}>
                  {cliente.nit} - {cliente.nombre}
                </option>
              ))}
            </Select>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 flex items-center">
              El NIT se toma automáticamente desde el cliente seleccionado.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Prefijo"
              value={facturaForm.prefijo}
              onChange={(event) =>
                setFacturaForm((prev) => ({
                  ...prev,
                  prefijo: event.target.value,
                }))
              }
              error={errors.prefijo}
              required
            >
              {PREFIJOS.map((prefijo) => (
                <option key={prefijo.value} value={prefijo.value}>
                  {prefijo.label}
                </option>
              ))}
            </Select>

            <Input
              label="Número de factura"
              value={facturaForm.numero_factura}
              onChange={(event) =>
                setFacturaForm((prev) => ({
                  ...prev,
                  numero_factura: event.target.value,
                }))
              }
              error={errors.numero_factura}
              placeholder="001"
              required
            />

            <Input
              label="Número final"
              value={`${facturaForm.prefijo || ""}-${facturaForm.numero_factura || ""}`}
              disabled
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Fecha de creación"
              value={
                selectedFactura?.fecha_creacion
                  ? formatDate(selectedFactura.fecha_creacion)
                  : formatDate(new Date())
              }
              disabled
            />
            <Input
              label="Fecha de pago"
              type="date"
              value={facturaForm.fecha_pago}
              onChange={(event) =>
                setFacturaForm((prev) => ({
                  ...prev,
                  fecha_pago: event.target.value,
                }))
              }
              error={errors.fecha_pago}
              required
            />
            <Input
              label="Valor base"
              type="number"
              value={facturaForm.valor_total}
              onChange={(event) =>
                setFacturaForm((prev) => ({
                  ...prev,
                  valor_total: event.target.value,
                }))
              }
              error={errors.valor_total}
              placeholder="0"
              required
            />

            <Input
              label="Valor total a guardar"
              value={formatCurrency(
                calcularValorFinal(
                  facturaForm.prefijo,
                  facturaForm.valor_total,
                ),
              )}
              disabled
            />
          </div>

          <Textarea
            label="Observaciones"
            value={facturaForm.observaciones}
            onChange={(event) =>
              setFacturaForm((prev) => ({
                ...prev,
                observaciones: event.target.value,
              }))
            }
            placeholder="Observaciones opcionales..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseModals}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={estadoModalOpen}
        onClose={handleCloseModals}
        title="Cambiar estado de factura"
        size="lg"
      >
        <form onSubmit={handleSaveEstado} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={estadoForm.estado}
              onChange={(event) =>
                setEstadoForm((prev) => ({
                  ...prev,
                  estado: event.target.value,
                }))
              }
              error={errors.estado}
              required
            >
              {ESTADOS_FACTURA.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </Select>

            <Select
              label="Cuenta donde entra el ingreso"
              value={estadoForm.cuenta_id}
              onChange={(event) =>
                setEstadoForm((prev) => ({
                  ...prev,
                  cuenta_id: event.target.value,
                }))
              }
              error={errors.cuenta_id}
              required={estadoForm.estado === "pagado"}
            >
              <option value="">Seleccionar cuenta</option>
              {cuentas.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Fecha de pago"
            type="date"
            value={estadoForm.fecha_pago}
            onChange={(event) =>
              setEstadoForm((prev) => ({
                ...prev,
                fecha_pago: event.target.value,
              }))
            }
            required={estadoForm.estado === "pagado"}
          />

          <Textarea
            label="Observaciones"
            value={estadoForm.observaciones}
            onChange={(event) =>
              setEstadoForm((prev) => ({
                ...prev,
                observaciones: event.target.value,
              }))
            }
            placeholder="Observaciones opcionales..."
            rows={3}
          />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Al marcarla como pagada, el valor se sumará automáticamente a la
            cuenta seleccionada.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseModals}>
              Cancelar
            </Button>
            <Button type="submit">Actualizar estado</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${tones[tone] || tones.blue}`}>
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
