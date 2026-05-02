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
const CUENTA_BANCOLOMBIA_FRAGMENTO = FACTURAS_CONFIG.CUENTA_AUTOMATICA_FE_FRAGMENTO;

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

  // Múltiples líneas de pago para pago_parcial
  const [lineasPago, setLineasPago] = useState([
    { fecha: formatDateInput(new Date()), valor: "" },
  ]);

  const { data: cuentasData = [] } = useQuery({
    queryKey: ["cuentas"],
    queryFn: cuentasService.getAll,
    enabled: isOpen, // Only fetch when modal is open
  });

  const cuentaBancolombia = useMemo(() => {
    const normalize = (s) =>
      String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const fragmento = normalize(CUENTA_BANCOLOMBIA_FRAGMENTO);
    const nombreObjetivo = normalize(CUENTA_BANCOLOMBIA_OBJETIVO);
    return cuentasData.find((c) => {
      const n = normalize(c.nombre);
      return n === nombreObjetivo || n.includes(fragmento);
    }) || null;
  }, [cuentasData]);

  useEffect(() => {
    if (factura && isOpen) {
      setEstadoForm({
        estado: factura.estado || "pendiente",
        fecha_pago: formatDateInput(factura.fecha_pago || new Date()),
        cuenta_id: factura.cuenta_id || "",
        observaciones: factura.observaciones || "",
        valor_pagado: "",
        fecha_proximo_pago: formatDateInput(factura.fecha_proximo_pago || ""),
      });
      // Siempre empezar con una línea vacía
      setLineasPago([{ fecha: formatDateInput(new Date()), valor: "" }]);
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
          // Sumar todas las líneas de pago + abono previo acumulado
          const abonadoPrevio = (factura.estado === "pago_parcial") ? (Number(factura.valor_pagado) || 0) : 0;
          const totalLineas = lineasPago.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
          valorPagado = abonadoPrevio + totalLineas;
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

      // Persistir historial de pagos en observaciones como JSON estructurado
      if (estadoForm.estado === "pago_parcial") {
        const lineasValidas = lineasPago.filter(l => Number(l.valor) > 0);
        if (lineasValidas.length > 0) {
          // Parsear historial previo
          let historialPrevio = [];
          try {
            const obs = factura.observaciones || "";
            const match = obs.match(/\[HISTORIAL\](.*?)\[\/HISTORIAL\]/s);
            if (match) historialPrevio = JSON.parse(match[1]);
          } catch (_) { /* ignorar */ }

          const nuevasLineas = lineasValidas.map(l => ({
            fecha: l.fecha,
            valor: Number(l.valor),
            ts: new Date().toISOString(),
          }));
          const historialActualizado = [...historialPrevio, ...nuevasLineas];

          // Limpiar observaciones previas de historial y añadir nuevo bloque
          const obsBase = (factura.observaciones || "").replace(/\[HISTORIAL\].*?\[\/HISTORIAL\]/s, "").trim();
          const userObs = estadoForm.observaciones.replace(/\[HISTORIAL\].*?\[\/HISTORIAL\]/s, "").trim();
          payload.observaciones = `${userObs || obsBase}[HISTORIAL]${JSON.stringify(historialActualizado)}[\/HISTORIAL]`;
        }
      }

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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pagos a registrar</label>
              <button
                type="button"
                onClick={() => setLineasPago((prev) => [...prev, { fecha: formatDateInput(new Date()), valor: "" }])}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                <span className="text-base leading-none">+</span> Añadir pago
              </button>
            </div>
            <div className="space-y-2">
              {lineasPago.map((linea, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={linea.fecha}
                    onChange={(e) => setLineasPago((prev) => prev.map((l, i) => i === idx ? { ...l, fecha: e.target.value } : l))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={linea.valor}
                    onChange={(e) => setLineasPago((prev) => prev.map((l, i) => i === idx ? { ...l, valor: e.target.value } : l))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 dark:text-slate-100"
                  />
                  {lineasPago.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineasPago((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Próximo pago */}
            <div className="pt-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha Próximo Pago</label>
              <input
                type="date"
                value={estadoForm.fecha_proximo_pago}
                onChange={(e) => setEstadoForm((prev) => ({ ...prev, fecha_proximo_pago: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
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
        {/* Desglose financiero */}
        {factura && (() => {
          const valorTotal = factura.valor_total || 0;
          const abonadoPrevio = (factura.estado === "pago_parcial" && estadoForm.estado === "pago_parcial")
            ? Number(factura.valor_pagado) || 0
            : 0;
          const nuevoAbono = lineasPago.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);
          const totalAbonado = abonadoPrevio + nuevoAbono;
          const pendiente = Math.max(0, valorTotal - totalAbonado);

          return estadoForm.estado === "pago_parcial" ? (
            <>
              {/* Botón rápido para completar el pago */}
              {factura.estado === "pago_parcial" && (
                <button
                  type="button"
                  onClick={() => setEstadoForm((prev) => ({ ...prev, estado: "pagado" }))}
                  className="w-full py-2 px-4 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                >
                  ✓ Completar pago (marcar como pagado)
                </button>
              )}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Valor total factura</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(valorTotal)}</span>
                </div>
                {abonadoPrevio > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Abonado anteriormente</span>
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(abonadoPrevio)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {abonadoPrevio > 0 ? "Nuevo abono" : "Abono"}
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">{nuevoAbono > 0 ? formatCurrency(nuevoAbono) : "—"}</span>
                </div>
                {abonadoPrevio > 0 && nuevoAbono > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total abonado</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(totalAbonado)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center px-4 py-2.5 ${
                  pendiente === 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                }`}>
                  <span className={`text-sm font-semibold ${
                    pendiente === 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                  }`}>Pendiente por pagar</span>
                  <span className={`text-sm font-bold ${
                    pendiente === 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                  }`}>{pendiente === 0 ? "✓ Saldado" : formatCurrency(pendiente)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Valor: <strong>{formatCurrency(valorTotal)}</strong>
            </div>
          );
        })()}
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
