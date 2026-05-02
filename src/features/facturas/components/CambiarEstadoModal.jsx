import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/ui/Button";
import Input, { Select } from "../../../components/ui/Input";
import { cuentasService } from "../../cuentas/services/cuentasService";
import { facturasService } from "../services/facturasService";
import { formatDateInput, formatCurrency } from "../../../lib/utils";
import { FACTURAS_CONFIG } from "../../../lib/appConfig";
import { useAuth } from "../../auth/AuthProvider";
import { canPerform, PERMISSIONS } from "../../auth/permissions";

const ESTADOS_FILTRO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pago_parcial", label: "Pago parcial" },
  { value: "pagado", label: "Pagado" },
];

const CUENTA_BANCOLOMBIA_OBJETIVO = FACTURAS_CONFIG.CUENTA_AUTOMATICA_FE_NOMBRE;

export default function CambiarEstadoModal({ isOpen, onClose, factura }) {
  const { access } = useAuth();
  const queryClient = useQueryClient();

  const [estadoForm, setEstadoForm] = useState({
    estado: "pendiente",
    fecha_pago: formatDateInput(new Date()),
    cuenta_id: "",
    observaciones: "",
    valor_pagado: "",
    fecha_proximo_pago: "",
  });

  const { data: cuentasData = [] } = useQuery({
    queryKey: ["cuentas"],
    queryFn: cuentasService.getAll,
    enabled: isOpen, // Only fetch when modal is open
  });

  const cuentaBancolombia = useMemo(() => {
    return cuentasData.find(
      (c) => c.nombre.toLowerCase() === CUENTA_BANCOLOMBIA_OBJETIVO.toLowerCase()
    );
  }, [cuentasData]);

  useEffect(() => {
    if (factura && isOpen) {
      setEstadoForm({
        estado: factura.estado || "pendiente",
        fecha_pago: formatDateInput(factura.fecha_pago || new Date()),
        cuenta_id: factura.cuenta_id || "",
        observaciones: factura.observaciones || "",
        valor_pagado: factura.valor_pagado || "",
        fecha_proximo_pago: formatDateInput(factura.fecha_proximo_pago || ""),
      });
    }
  }, [factura, isOpen]);

  const actualizarMutate = useMutation({
    mutationFn: ({ id, data }) => facturasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
      onClose();
    },
  });

  const handleEstadoSubmit = async (e) => {
    e.preventDefault();
    if (!factura) return;
    if (!canPerform(access, PERMISSIONS.FACTURAS_CHANGE_STATE)) return;

    try {
      const esPagado = estadoForm.estado === "pagado";
      const esRemision = factura.prefijo === "RM";
      const esElectronica = factura.prefijo === "FE";

      let cuentaId = factura.cuenta_id || null;
      let valorPagado = null;
      let fechaProximoPago = null;

      if (!esPagado) {
        cuentaId = null;
        if (estadoForm.estado === "pago_parcial") {
          valorPagado = Number(estadoForm.valor_pagado) || 0;
          fechaProximoPago = estadoForm.fecha_proximo_pago || null;
          if (esRemision || esElectronica) {
              if (esRemision && estadoForm.cuenta_id) cuentaId = estadoForm.cuenta_id;
              if (esElectronica && cuentaBancolombia?.id) cuentaId = cuentaBancolombia.id;
          }
        }
      } else if (esRemision) {
        if (!estadoForm.cuenta_id) {
          alert("Selecciona la cuenta para cargar el dinero de la remisión.");
          return;
        }
        cuentaId = estadoForm.cuenta_id;
      } else if (esElectronica) {
        if (!cuentaBancolombia?.id) {
          alert(
            `No se encontró la cuenta ${CUENTA_BANCOLOMBIA_OBJETIVO}. Crea o renombra esa cuenta para continuar.`
          );
          return;
        }
        cuentaId = cuentaBancolombia.id;
      }

      const payload = {
        ...factura,
        ...estadoForm,
        cuenta_id: cuentaId,
        valor_pagado: valorPagado,
        fecha_proximo_pago: fechaProximoPago,
        valor_total: factura.valor_total,
      };

      await actualizarMutate.mutateAsync({
        id: factura.id,
        data: payload,
      });
    } catch (error) {
      console.error("Error actualizando estado:", error);
      alert(error.message || "Error al actualizar el estado");
    }
  };

  const isMutating = actualizarMutate.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Estado"
      size="md"
    >
      <form onSubmit={handleEstadoSubmit} className="space-y-4">
        <Select
          label="Estado"
          value={estadoForm.estado}
          onChange={(e) =>
            setEstadoForm((prev) => ({ ...prev, estado: e.target.value }))
          }
        >
          {ESTADOS_FILTRO.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </Select>
        <Input
          label="Fecha de Pago"
          type="date"
          value={estadoForm.fecha_pago}
          onChange={(e) =>
            setEstadoForm((prev) => ({ ...prev, fecha_pago: e.target.value }))
          }
        />
        {estadoForm.estado === "pago_parcial" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valor Abonado"
              type="number"
              value={estadoForm.valor_pagado}
              onChange={(e) =>
                setEstadoForm((prev) => ({ ...prev, valor_pagado: e.target.value }))
              }
            />
            <Input
              label="Fecha Próximo Pago"
              type="date"
              value={estadoForm.fecha_proximo_pago}
              onChange={(e) =>
                setEstadoForm((prev) => ({ ...prev, fecha_proximo_pago: e.target.value }))
              }
            />
          </div>
        )}
        {factura?.prefijo === "RM" && (estadoForm.estado === "pagado" || estadoForm.estado === "pago_parcial") && (
          <div>
            <Select
              label="Cuenta a cargar"
              value={estadoForm.cuenta_id}
              onChange={(e) =>
                setEstadoForm((prev) => ({ ...prev, cuenta_id: e.target.value }))
              }
              required
            >
              <option value="">Seleccionar cuenta</option>
              {cuentasData.map((cuenta) => (
                <option key={cuenta.id} value={cuenta.id}>
                  {cuenta.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}
        {factura?.prefijo === "FE" && (estadoForm.estado === "pagado" || estadoForm.estado === "pago_parcial") && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
            Factura electrónica: el dinero se cargará automáticamente a{" "}
            <strong>
              {cuentaBancolombia?.nombre || CUENTA_BANCOLOMBIA_OBJETIVO}
            </strong>
            .
          </div>
        )}
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Valor:{" "}
          <strong>
            {factura ? formatCurrency(factura.valor_total) : "-"}
          </strong>
        </div>
        <Input
          label="Observaciones"
          value={estadoForm.observaciones}
          onChange={(e) =>
            setEstadoForm((prev) => ({
              ...prev,
              observaciones: e.target.value,
            }))
          }
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isMutating}>
            Actualizar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
