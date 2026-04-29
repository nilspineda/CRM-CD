// filepath: src/features/facturas/pages/FacturasPage.jsx
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const PAGE_SIZE = 20;

const ESTADOS_FILTRO = [
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

export default function FacturasPage() {
  const range = getDateRange("month");
  const currentMonth = formatDateInput(range.start).slice(0, 7);
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
  const queryClient = useQueryClient();

  const getMonthRange = (value) => {
    if (!value) return getDateRange("month");
    const [year, month] = value.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start, end };
  };

  const { data: clientesData = [], isLoading: clientesLoading } = useQuery({
    queryKey: ["clientes"],
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

  const crearMutate = useMutation({
    mutationFn: facturasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
    },
  });

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => facturasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
    },
  });

  const clientesMap = useMemo(
    () => new Map(clientesData.map((cliente) => [cliente.nit, cliente])),
    [clientesData],
  );

  const cuentasMap = useMemo(
    () => new Map(cuentasData.map((cuenta) => [cuenta.id, cuenta])),
    [cuentasData],
  );

  const facturasEnriquecidas = useMemo(() => {
    return (facturasData || []).map((factura) => {
      const cliente = clientesMap.get(factura.cliente_nit);
      const cuenta = cuentasMap.get(factura.cuenta_id);
      return {
        ...factura,
        cliente_nombre: cliente?.nombre || factura.cliente_nombre || "",
        cuenta_nombre: cuenta?.nombre || factura.cuenta_nombre || "",
      };
    });
  }, [facturasData, clientesMap, cuentasMap]);

  const totalPages = Math.ceil(facturasEnriquecidas.length / PAGE_SIZE);
  const facturasPaginadas = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return facturasEnriquecidas.slice(start, start + PAGE_SIZE);
  }, [facturasEnriquecidas, page]);

  const getFiltrosActivos = () => {
    const monthRange = getMonthRange(mesResumen || currentMonth);
    return {
      ...filtros,
      fechaInicio: formatDateInput(monthRange.start),
      fechaFin: formatDateInput(monthRange.end),
    };
  };

  const openFacturaModal = (factura = null) => {
    setErrors({});
    if (factura) {
      setFacturaForm({
        cliente_nit: factura.cliente_nit || "",
        prefijo: factura.prefijo || "FE",
        numero_factura: factura.numero_factura || "",
        fecha_pago: formatDateInput(factura.fecha_pago || new Date()),
        valor_total: String(factura.valor_total || ""),
        observaciones: factura.observaciones || "",
      });
    } else {
      setFacturaForm(emptyFacturaForm);
    }
    setSelectedFactura(factura);
    setFacturaModalOpen(true);
  };

  const closeFacturaModal = () => {
    setFacturaModalOpen(false);
    setSelectedFactura(null);
    setFacturaForm(emptyFacturaForm);
    setErrors({});
  };

  const handleFacturaSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!facturaForm.cliente_nit) nextErrors.cliente_nit = "El NIT es obligatorio";
    if (!facturaForm.numero_factura) nextErrors.numero_factura = "El número es obligatorio";
    if (!facturaForm.valor_total || Number(facturaForm.valor_total) <= 0) {
      nextErrors.valor_total = "El valor debe ser mayor a 0";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      const payload = {
        ...facturaForm,
        valor_total: Number(facturaForm.valor_total),
      };
      if (selectedFactura) {
        await actualizarMutate.mutateAsync({ id: selectedFactura.id, data: payload });
      } else {
        await crearMutate.mutateAsync(payload);
      }
      closeFacturaModal();
    } catch (error) {
      console.error("Error guardando factura:", error);
      alert(error.message || "Error al guardar la factura");
    }
  };

  const openEstadoModal = (factura) => {
    setSelectedFactura(factura);
    setEstadoForm({
      estado: factura.estado || "pendiente",
      fecha_pago: formatDateInput(factura.fecha_pago || new Date()),
      cuenta_id: factura.cuenta_id || "",
      observaciones: factura.observaciones || "",
    });
    setEstadoModalOpen(true);
  };

  const closeEstadoModal = () => {
    setEstadoModalOpen(false);
    setSelectedFactura(null);
    setEstadoForm(emptyEstadoForm);
  };

  const handleEstadoSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFactura) return;

    try {
      const payload = {
        ...selectedFactura,
        ...estadoForm,
        valor_total: selectedFactura.valor_total,
      };
      await actualizarMutate.mutateAsync({ id: selectedFactura.id, data: payload });
      closeEstadoModal();
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert(error.message || "Error al actualizar el estado");
    }
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
        { header: "Número", value: (f) => `${f.prefijo || ""}-${f.numero_factura || ""}` },
        { header: "Fecha", value: (f) => formatDate(f.fecha_pago) },
        { header: "Cliente", value: (f) => f.cliente_nit },
        { header: "Nombre", value: (f) => f.cliente_nombre },
        { header: "Valor", value: (f) => f.valor_total || 0 },
        { header: "Estado", value: (f) => getEstadoLabel(f.estado) },
      ],
      rows: facturasEnriquecidas,
    });
  };

  const handlePageChange = (newPage) => setPage(newPage);

  const isMutating = crearMutate.isPending || actualizarMutate.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">
            Facturación
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Control de facturas y remisiones
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button variant="outline" onClick={handleExport} disabled={isLoading || facturasEnriquecidas.length === 0} className="shrink-0">
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button onClick={() => openFacturaModal()} className="shrink-0">
            <Plus size={16} className="mr-1 sm:mr-2" />
            Nueva Factura
          </Button>
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                name="busqueda"
                placeholder="Buscar por número, cliente o cuenta..."
                value={filtros.busqueda}
                onChange={handleFiltroChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <input
              type="month"
              value={mesResumen}
              onChange={(e) => { setMesResumen(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_FILTRO.map((est) => (
                <option key={est.value} value={est.value}>{est.label}</option>
              ))}
            </select>
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100">
              Limpiar
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Número</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading || clientesLoading || cuentasLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : facturasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No hay facturas para mostrar
                  </td>
                </tr>
              ) : (
                facturasPaginadas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 font-medium">
                      {factura.prefijo}-{factura.numero_factura}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700">
                      {formatDate(factura.fecha_pago)}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700">
                      <div>{factura.cliente_nit}</div>
                      <div className="text-xs text-slate-500">{factura.cliente_nombre}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-slate-700 text-right font-medium">
                      {formatCurrency(factura.valor_total)}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(factura.estado)}`}>
                        {getEstadoLabel(factura.estado)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEstadoModal(factura)} disabled={isMutating} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50">
                          <CheckCircle2 size={16} />
                        </button>
                        <button onClick={() => openFacturaModal(factura)} disabled={isMutating} className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50">
                          <Receipt size={16} />
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
              Mostrando {((page - 1) * PAGE_SIZE) + 1} - {Math.min(page * PAGE_SIZE, facturasEnriquecidas.length)} de {facturasEnriquecidas.length}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all">
                Anterior
              </button>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-slate-400 transition-all">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={facturaModalOpen} onClose={closeFacturaModal} title={selectedFactura ? "Editar Factura" : "Nueva Factura"} size="lg">
        <form onSubmit={handleFacturaSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={facturaForm.prefijo} onChange={(e) => setFacturaForm(prev => ({ ...prev, prefijo: e.target.value }))}>
              {PREFIJOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
            <Input label="Número" value={facturaForm.numero_factura} onChange={(e) => setFacturaForm(prev => ({ ...prev, numero_factura: e.target.value }))} error={errors.numero_factura} required />
          </div>
          <Input label="NIT Cliente" value={facturaForm.cliente_nit} onChange={(e) => setFacturaForm(prev => ({ ...prev, cliente_nit: e.target.value }))} error={errors.cliente_nit} required />
          <Input label="Fecha" type="date" value={facturaForm.fecha_pago} onChange={(e) => setFacturaForm(prev => ({ ...prev, fecha_pago: e.target.value }))} />
          <Input label="Valor Total" type="number" value={facturaForm.valor_total} onChange={(e) => setFacturaForm(prev => ({ ...prev, valor_total: e.target.value }))} error={errors.valor_total} required />
          <Textarea label="Observaciones" value={facturaForm.observaciones} onChange={(e) => setFacturaForm(prev => ({ ...prev, observaciones: e.target.value }))} rows={3} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeFacturaModal}>Cancelar</Button>
            <Button type="submit" disabled={isMutating}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={estadoModalOpen} onClose={closeEstadoModal} title="Cambiar Estado" size="md">
        <form onSubmit={handleEstadoSubmit} className="space-y-4">
          <Select label="Estado" value={estadoForm.estado} onChange={(e) => setEstadoForm(prev => ({ ...prev, estado: e.target.value }))}>
            {ESTADOS_FILTRO.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
          <Input label="Fecha de Pago" type="date" value={estadoForm.fecha_pago} onChange={(e) => setEstadoForm(prev => ({ ...prev, fecha_pago: e.target.value }))} />
          <div className="text-sm text-slate-600">
            Valor: <strong>{selectedFactura ? formatCurrency(selectedFactura.valor_total) : "-"}</strong>
          </div>
          <Textarea label="Observaciones" value={estadoForm.observaciones} onChange={(e) => setEstadoForm(prev => ({ ...prev, observaciones: e.target.value }))} rows={2} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeEstadoModal}>Cancelar</Button>
            <Button type="submit" disabled={isMutating}>Actualizar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}