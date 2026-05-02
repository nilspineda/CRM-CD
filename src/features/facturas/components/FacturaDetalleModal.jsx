import Modal from "../../../components/ui/Modal";
import { formatCurrency, formatDate, computeFacturaTaxes } from "../../../lib/utils";

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

/** Parsea el historial de pagos guardado en observaciones */
function parseHistorial(observaciones) {
  try {
    const match = (observaciones || "").match(/\[HISTORIAL\](.*?)\[\/HISTORIAL\]/s);
    if (match) return JSON.parse(match[1]);
  } catch (_) { /* ignorar */ }
  return null;
}

/** Extrae las observaciones del usuario, sin el bloque de historial */
function parseObservaciones(observaciones) {
  return (observaciones || "").replace(/\[HISTORIAL\].*?\[\/HISTORIAL\]/s, "").trim();
}

/** Días restantes desde hoy hasta una fecha */
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
  if (!factura) return null;

  const taxes = computeFacturaTaxes(factura);
  const estado = factura.estado || "pendiente";
  const esParcial = estado === "pago_parcial";
  const valorAbonado = Number(factura.valor_pagado) || 0;
  const valorPendiente = esParcial
    ? Math.max(0, (factura.valor_total || 0) - valorAbonado)
    : estado === "pagado" ? 0 : (factura.valor_total || 0);

  // Parsear historial de pagos
  const historialParsed = parseHistorial(factura.observaciones);
  const obsUsuario = parseObservaciones(factura.observaciones);

  // Días restantes para próximo pago
  const diasProximo = diasHasta(factura.fecha_proximo_pago);

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

          {historialParsed && historialParsed.length > 0 ? (
            <div className="space-y-2">
              {historialParsed.map((pago, idx) => {
                const dias = diasHasta(pago.fecha);
                const esFuturo = dias !== null && dias > 0;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        Abono #{idx + 1}
                        {esFuturo && (
                          <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                            (programado)
                          </span>
                        )}
                      </p>
                      {pago.fecha && (
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
                      )}
                    </div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(pago.valor)}
                    </p>
                  </div>
                );
              })}

              {/* Totales del historial */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400">Total abonado</p>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(historialParsed.reduce((s, p) => s + p.valor, 0))}
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
            // Fallback: no hay historial parseado pero sí valor_pagado
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
