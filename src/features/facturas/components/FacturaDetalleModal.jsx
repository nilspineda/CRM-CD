import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../../../components/ui/Modal";
import { formatCurrency, formatDate, computeFacturaTaxes } from "../../../lib/utils";
import { facturasService } from "../services/facturasService";

const ESTADO_STYLES = {
  pagado: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  pago_parcial: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  pendiente: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
  anulado: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

const ESTADO_LABELS = {
  pagado: "Pagado",
  pago_parcial: "Pago Parcial",
  pendiente: "Pendiente",
  anulado: "Anulado",
};

function parseHistorial(observaciones) {
  try {
    const match = (observaciones || "").match(/\[HISTORIAL\](.*?)\[\/HISTORIAL\]/s);
    if (match) return JSON.parse(match[1]);
  } catch (_) { /* ignorar */ }
  return null;
}

function parseObservaciones(observaciones) {
  return (observaciones || "").replace(/\[HISTORIAL\].*?\[\/HISTORIAL\]/s, "").trim();
}

function diasHasta(fechaStr) {
  if (!fechaStr) return null;
  const fecha = new Date(fechaStr + "T00:00:00");
  if (isNaN(fecha.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function InfoRow({ label, value, className = "" }) {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${className}`}>
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 text-right">{value}</span>
    </div>
  );
}

export default function FacturaDetalleModal({ isOpen, onClose, factura }) {
  const queryClient = useQueryClient();
  const [historialLocal, setHistorialLocal] = useState(null);
  const [editandoIdx, setEditandoIdx] = useState(null);
  const [fechaEditada, setFechaEditada] = useState("");

  // Inicializar historial desde factura
  useEffect(() => {
    if (factura) {
      setHistorialLocal(parseHistorial(factura.observaciones));
      setEditandoIdx(null);
    }
  }, [factura]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => facturasService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facturas"] });
    },
  });

  if (!factura) return null;

  const taxes = computeFacturaTaxes(factura);
  const estado = factura.estado || "pendiente";
  const esParcial = estado === "pago_parcial";
  const valorAbonado = Number(factura.valor_pagado) || 0;
  const valorPendiente = esParcial
    ? Math.max(0, (factura.valor_total || 0) - valorAbonado)
    : estado === "pagado" ? 0 : (factura.valor_total || 0);

  const obsUsuario = parseObservaciones(factura.observaciones);
  const diasProximo = diasHasta(factura.fecha_proximo_pago);

  // Guardar fecha editada de un abono
  const handleSaveFecha = async (idx) => {
    if (!historialLocal) return;
    const actualizado = historialLocal.map((p, i) =>
      i === idx ? { ...p, fecha: fechaEditada } : p
    );
    setHistorialLocal(actualizado);
    setEditandoIdx(null);

    // Persistir en observaciones
    const obsBase = obsUsuario;
    const nuevaObs = `${obsBase}[HISTORIAL]${JSON.stringify(actualizado)}[\/HISTORIAL]`;
    try {
      await updateMutation.mutateAsync({
        id: factura.id,
        data: { ...factura, observaciones: nuevaObs },
      });
    } catch (err) {
      console.error("Error guardando fecha:", err);
    }
  };

  const handleStartEdit = (idx, fechaActual) => {
    setEditandoIdx(idx);
    setFechaEditada(fechaActual || "");
  };

  // Marcar/desmarcar un abono como aplicado (confirmado)
  const handleToggleConfirmado = async (idx) => {
    if (!historialLocal) return;
    const actualizado = historialLocal.map((p, i) =>
      i === idx ? { ...p, confirmado: !p.confirmado } : p
    );
    setHistorialLocal(actualizado);
    const obsBase = parseObservaciones(factura.observaciones);
    const nuevaObs = `${obsBase}[HISTORIAL]${JSON.stringify(actualizado)}[\/HISTORIAL]`;
    try {
      await updateMutation.mutateAsync({
        id: factura.id,
        data: { ...factura, observaciones: nuevaObs },
      });
    } catch (err) {
      console.error("Error confirmando abono:", err);
      // Revertir en caso de error
      setHistorialLocal(historialLocal);
    }
  };

  const isSaving = updateMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura ${factura.prefijo}-${factura.numero_factura}`}
      size="md"
    >
      <div className="space-y-5">
        {/* Estado + próximo pago */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${ESTADO_STYLES[estado] || ESTADO_STYLES.pendiente}`}>
            {ESTADO_LABELS[estado] || estado}
          </span>
          {esParcial && factura.fecha_proximo_pago && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Próximo pago:</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                {formatDate(factura.fecha_proximo_pago)}
              </span>
              {diasProximo !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  diasProximo < 0
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    : diasProximo <= 3
                    ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                    : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                }`}>
                  {diasProximo < 0 ? `Vencido hace ${Math.abs(diasProximo)}d` : `${diasProximo}d restantes`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Datos generales */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Información general
          </h3>
          <InfoRow label="Cliente" value={factura.cliente_nombre || factura.cliente_nit} />
          <InfoRow label="NIT" value={factura.cliente_nit} />
          <InfoRow label="Fecha" value={formatDate(factura.fecha_pago || factura.fecha_creacion)} />
          {factura.cuenta_nombre && (
            <InfoRow label="Cuenta" value={factura.cuenta_nombre} />
          )}
          {obsUsuario && (
            <InfoRow label="Observaciones" value={obsUsuario} />
          )}
        </div>

        {/* Valores */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Desglose de valores
          </h3>
          <InfoRow label="Base gravable" value={formatCurrency(taxes.base)} />
          {taxes.ica > 0 && <InfoRow label="ICA (1.25%)" value={formatCurrency(taxes.ica)} />}
          {taxes.iva > 0 && <InfoRow label="IVA (19%)" value={formatCurrency(taxes.iva)} />}
          <InfoRow label="Total factura" value={formatCurrency(factura.valor_total)} className="font-semibold" />
        </div>

        {/* Historial de pagos */}
        <div>
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Historial de pagos
          </h3>

          {historialLocal && historialLocal.length > 0 ? (
            <div className="space-y-2">
              {historialLocal.map((pago, idx) => {
                const dias = diasHasta(pago.fecha);
                const enEdicion = editandoIdx === idx;
                const confirmado = !!pago.confirmado;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-colors ${
                      confirmado
                        ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                        : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${
                            confirmado
                              ? "text-green-700 dark:text-green-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}>
                            Abono #{idx + 1}
                          </p>
                          {confirmado && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                              ✓ Aplicado
                            </span>
                          )}
                        </div>

                        {enEdicion ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="date"
                              value={fechaEditada}
                              onChange={(e) => setFechaEditada(e.target.value)}
                              className="px-2 py-1 text-xs border border-amber-400 dark:border-amber-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <button
                              onClick={() => handleSaveFecha(idx)}
                              disabled={isSaving || !fechaEditada}
                              className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {isSaving ? "..." : "✓"}
                            </button>
                            <button
                              onClick={() => setEditandoIdx(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {pago.fecha ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(pago.fecha)}
                                {dias !== null && (
                                  <span className={`ml-2 font-semibold ${
                                    dias < 0 ? "text-red-500" : dias === 0 ? "text-green-500" : "text-blue-500"
                                  }`}>
                                    {dias < 0 ? `Hace ${Math.abs(dias)}d` : dias === 0 ? "Hoy" : `En ${dias}d`}
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Sin fecha</p>
                            )}
                            <button
                              onClick={() => handleStartEdit(idx, pago.fecha)}
                              className="text-[10px] text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 underline transition-colors"
                            >
                              editar
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <p className={`text-sm font-bold ${
                          confirmado
                            ? "text-green-700 dark:text-green-300"
                            : "text-amber-700 dark:text-amber-300"
                        }`}>
                          {formatCurrency(pago.valor)}
                        </p>
                        {/* Botón confirmar/desconfirmar */}
                        <button
                          onClick={() => handleToggleConfirmado(idx)}
                          disabled={isSaving}
                          title={confirmado ? "Desmarcar como aplicado" : "Marcar como aplicado"}
                          className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                            confirmado
                              ? "border-green-400 dark:border-green-600 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400"
                          }`}
                        >
                          <span>{confirmado ? "✓" : "○"}</span>
                          <span>{confirmado ? "Aplicado" : "Confirmar"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Totales */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400">Total abonado</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(historialLocal.reduce((s, p) => s + p.valor, 0))}
                  </p>
                </div>
                {esParcial && (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400">Saldo pendiente</p>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">
                      {formatCurrency(valorPendiente)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : estado === "pagado" ? (
            <div className="flex items-center justify-between p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Pago completo</p>
                {factura.fecha_pago && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(factura.fecha_pago)}</p>
                )}
              </div>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">
                {formatCurrency(factura.valor_total)}
              </p>
            </div>
          ) : esParcial && valorAbonado > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Abono registrado</p>
                  {factura.fecha_pago && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(factura.fecha_pago)}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{formatCurrency(valorAbonado)}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex justify-between items-center">
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">Saldo pendiente</span>
                <span className="text-sm font-bold text-red-700 dark:text-red-300">{formatCurrency(valorPendiente)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              Sin pagos registrados
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
