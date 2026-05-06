import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input, { Select, Textarea } from "../../../components/ui/Input";
import { clientesService } from "../../clientes/services/clientesService";
import { facturasService } from "../services/facturasService";
import { formatDateInput } from "../../../lib/utils";

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

export default function FacturaModal({ isOpen, onClose, factura }) {
  const queryClient = useQueryClient();

  const [facturaForm, setFacturaForm] = useState(emptyFacturaForm);
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: clientesData = [] } = useQuery({
    queryKey: ["clientes"],
    queryFn: clientesService.getAll,
    enabled: isOpen,
  });

  const clientesMap = useMemo(() => {
    return new Map(clientesData.map((c) => [c.nit, c]));
  }, [clientesData]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusqueda) return [];
    const searchLower = clienteBusqueda.toLowerCase();
    return clientesData
      .filter(
        (c) =>
          c.nit.toLowerCase().includes(searchLower) ||
          c.nombre.toLowerCase().includes(searchLower) ||
          (c.responsable && c.responsable.toLowerCase().includes(searchLower))
      )
      .slice(0, 5);
  }, [clientesData, clienteBusqueda]);

  useEffect(() => {
    if (isOpen) {
      if (factura) {
        setFacturaForm({
          prefijo: factura.prefijo || "FE",
          numero_factura: factura.numero_factura || "",
          cliente_nit: factura.cliente_nit || "",
          fecha_pago: formatDateInput(factura.fecha_pago || new Date()),
          valor_total: factura.valor_total || "",
          observaciones: factura.observaciones || "",
        });
        setClienteBusqueda("");
        setMostrarResultados(false);
        setErrors({});
      } else {
        setFacturaForm(emptyFacturaForm);
        setClienteBusqueda("");
        setMostrarResultados(false);
        setErrors({});
      }
    }
  }, [isOpen, factura]);

  const crearMutate = useMutation({
    mutationFn: facturasService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
      onClose();
    },
  });

  // Auto-fill consecutivo para RM
  useEffect(() => {
    let mounted = true;
    const tryFill = async () => {
      try {
        if (
          facturaForm.prefijo === 'RM' &&
          (!facturaForm.numero_factura || facturaForm.numero_factura === '') &&
          !factura
        ) {
          const next = await facturasService.getNextNumero('RM');
          if (mounted) setFacturaForm((prev) => ({ ...prev, numero_factura: next }));
        }
      } catch (err) {
        console.error('Error obteniendo siguiente número RM:', err);
      }
    };

    tryFill();
    return () => {
      mounted = false;
    };
  }, [facturaForm.prefijo, factura]);

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => facturasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
      onClose();
    },
  });

  const handleFacturaSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!facturaForm.cliente_nit)
      nextErrors.cliente_nit = "El cliente es obligatorio";
    if (!facturaForm.numero_factura)
      nextErrors.numero_factura = "El número es obligatorio";
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
      if (factura) {
        await actualizarMutate.mutateAsync({
          id: factura.id,
          data: payload,
        });
      } else {
        await crearMutate.mutateAsync(payload);
      }
    } catch (error) {
      console.error("Error guardando factura:", error);
      alert(error.message || "Error al guardar la factura");
    }
  };

  const isMutating = crearMutate.isPending || actualizarMutate.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={factura ? "Editar Factura" : "Nueva Factura"}
      size="lg"
    >
      <form onSubmit={handleFacturaSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo"
            value={facturaForm.prefijo}
            onChange={(e) =>
              setFacturaForm((prev) => ({ ...prev, prefijo: e.target.value }))
            }
          >
            {PREFIJOS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Input
            label="Número / Siigo"
            value={facturaForm.numero_factura}
            onChange={(e) =>
              setFacturaForm((prev) => ({
                ...prev,
                numero_factura: e.target.value,
              }))
            }
            error={errors.numero_factura}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por NIT, nombre o responsable..."
              value={clienteBusqueda}
              onChange={(e) => {
                setClienteBusqueda(e.target.value);
                setMostrarResultados(true);
              }}
              onFocus={() => clienteBusqueda && setMostrarResultados(true)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:bg-slate-800 dark:text-slate-100"
            />
            {facturaForm.cliente_nit && (
              <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cliente seleccionado:{" "}
                  <strong>
                    {clientesMap.get(facturaForm.cliente_nit)?.nombre ||
                      facturaForm.cliente_nit}
                  </strong>
                </p>
              </div>
            )}
            {mostrarResultados &&
              clienteBusqueda &&
              clientesFiltrados.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.nit}
                      type="button"
                      onClick={() => {
                        setFacturaForm((prev) => ({
                          ...prev,
                          cliente_nit: cliente.nit,
                        }));
                        setClienteBusqueda("");
                        setMostrarResultados(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 last:border-b-0 transition-colors"
                    >
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {cliente.nit} - {cliente.nombre}
                      </div>
                      {cliente.responsable && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Responsable: {cliente.responsable}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            {mostrarResultados &&
              clienteBusqueda &&
              clientesFiltrados.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-10 p-3">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay clientes que coincidan con la búsqueda
                  </p>
                </div>
              )}
          </div>
          {errors.cliente_nit && (
            <p className="text-sm text-red-500 mt-1">{errors.cliente_nit}</p>
          )}
        </div>
        <Input
          label="Fecha"
          type="date"
          value={facturaForm.fecha_pago}
          onChange={(e) =>
            setFacturaForm((prev) => ({
              ...prev,
              fecha_pago: e.target.value,
            }))
          }
        />
        <Input
          label="Valor Total"
          type="number"
          value={facturaForm.valor_total}
          onChange={(e) =>
            setFacturaForm((prev) => ({
              ...prev,
              valor_total: e.target.value,
            }))
          }
          error={errors.valor_total}
          required
        />
        <Textarea
          label="Observaciones"
          value={facturaForm.observaciones}
          onChange={(e) =>
            setFacturaForm((prev) => ({
              ...prev,
              observaciones: e.target.value,
            }))
          }
          rows={3}
        />
        <div className="flex justify-end gap-3 pt-2">
          {errors.submit && (
            <p className="text-sm text-red-500 self-center">{errors.submit}</p>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isMutating}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
