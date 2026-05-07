// filepath: src/lib/utils.js
// Utilidades para formateo de moneda y fechas

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const formatCurrency = (value) => {
  if (value == null) return "$0";
  return currencyFormatter.format(value);
};

export const formatDate = (date) => {
  if (!date) return "";
  return dateFormatter.format(new Date(date));
};

export const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateRange = (type) => {
  const today = new Date();
  let start, end;

  switch (type) {
    case "today":
      start = new Date(today.setHours(0, 0, 0, 0));
      end = new Date(today.setHours(23, 59, 59, 999));
      break;
    case "week":
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "prevMonth":
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = null;
      end = null;
  }

  return { start, end };
};

export const calculateIVA = (valorBase, incluyeIVA, porcentajeIVA = 19) => {
  if (!valorBase || valorBase <= 0) {
    return { base: 0, iva: 0, total: 0 };
  }

  const base = parseFloat(valorBase);
  const porcentaje = incluyeIVA ? parseFloat(porcentajeIVA || 19) : 0;

  if (!incluyeIVA || porcentaje <= 0) {
    return {
      base: Math.round(base),
      iva: 0,
      total: Math.round(base),
    };
  }

  const iva = base * (porcentaje / 100);
  return {
    base: Math.round(base),
    iva: Math.round(iva),
    total: Math.round(base + iva),
  };
};

export const getTipoCuentaLabel = (tipo) => {
  const labels = {
    caja: "Caja",
    banco: "Banco",
    billetera_digital: "Billetera Digital",
    ahorro: "Ahorro",
    efectivo: "Efectivo",
    otra: "Otra",
  };
  return labels[tipo] || tipo;
};

export const getTipoMovimientoLabel = (tipo) => {
  return TIPO_MOVIMIENTO_LABELS[tipo] || tipo;
};

// Mapa de etiquetas para tipos de movimiento (clave -> etiqueta legible)
export const TIPO_MOVIMIENTO_LABELS = {
  factura_venta: "Factura de venta",
  pago_iva: "PAGO DE IVA",
  pago_ica: "PAGO DE ICA",
  pago_factura_electronica: "Pago de Factura Electronica",
  pago_facturas_remision: "Pago Facturas Remision",
  servicios_agua_1p: "SERVICIOS PUBLICOS 1 PISO - AGUA",
  servicios_luz_1p: "SERVICIOS PUBLICOS 1 PISO - LUZ",
  servicios_gas_1p: "SERVICIOS PUBLICOS 1 PISO - GAS",
  arriendo_2p: "ARRIENDO 2 PISO",
  arriendo_1p: "ARRIENDO 1 PISO",
  servicios_agua_2p: "SERVICIOS PUBLICOS 2 PISO - AGUA",
  servicios_luz_2p: "SERVICIOS PUBLICOS 2 PISO - LUZ",
  servicios_gas_2p: "SERVICIOS PUBLICOS 2 PISO - GAS",
  domicilios: "DOMICILIOS",
  insumos: "INSUMOS",
  movistar_celulares: "MOVISTAR- CELULARES",
  movistar_internet: "MOVISTAR INTERNET",
  mojica_impresiones: "MOJICA IMPRESIONES DIGITALES",
  impresion_litografia: "IMPRESIÓN LITOGRAFIA",
  acabados: "ACABADOS",
  pago_dias_trabajo: "PAGO X DIAS DE TRABAJO",
  pago_nomina_javier: "PAGO DE NOMINA JAVIER",
  seguridad_social: "SEGURIDAD SOCIAL",
  creditos_bancos: "CREDITOS - BANCOS",
  gastos_familia_moreno: "GASTOS FAMILIA MORENO PINEDA",
  montajes_litograficos: "MONTAJES LITOGRAFICOS",
  compra_herramienta: "COMPRA DE HERRAMIENTA",
  pago_nomina_carolina: "PAGO DE NOMINA CAROLINA",
  pago_nomina_nils: "PAGO DE NOMINA NILS",
  pago_nomina_edinson: "PAGO DE NOMINA EDINSON",
  pago_nomina_jerson: "PAGO DE NOMINA JERSON",
  pago_nomina_yurley: "PAGO DE NOMINA YURLEY",
  insumos_acrilicos: "INSUMOS ACRILICOS",
  insumos_adhesivos_lonas: "INSUMOS ADHESIVOS Y LONAS",
  insumos_electricos: "INSUMOS ELECTRICOS",
  insumos_mdf: "INSUMOS MDF",
  servicio_indriver: "SERVICIO DE INDRIVER",
  servicio_contable: "SERVICIO CONTABLE",
  insumo_plotter: "INSUMO PLOTTER",
  cuatro_x_mil: "4x1000",
  manejo_tarjeta: "MANEJO DE TARJETA",
  "SERVICIOS PUBLICOS 1 PISO - AGUA": "servicios_agua_1p",
  "SERVICIOS PUBLICOS 1 PISO - LUZ": "servicios_luz_1p",
  "SERVICIOS PUBLICOS 1 PISO - GAS": "servicios_gas_1p",
  "ARRIENDO 2 PISO": "arriendo_2p",
  "ARRIENDO 1 PISO": "arriendo_1p",
  "SERVICIOS PUBLICOS 2 PISO - AGUA": "servicios_agua_2p",
  "SERVICIOS PUBLICOS 2 PISO - LUZ": "servicios_luz_2p",
  "SERVICIOS PUBLICOS 2 PISO - GAS": "servicios_gas_2p",
  DOMICILIOS: "domicilios",
  INSUMOS: "insumos",
  "MOVISTAR- CELULARES": "movistar_celulares",
  "MOVISTAR INTERNET": "movistar_internet",
  "MOJICA IMPRESIONES DIGITALES": "mojica_impresiones",
  "IMPRESIÓN LITOGRAFIA": "impresion_litografia",
  ACABADOS: "acabados",
  "PAGO X DIAS DE TRABAJO": "pago_dias_trabajo",
  "PAGO DE NOMINA JAVIER": "pago_nomina_javier",
  "SEGURIDAD SOCIAL": "seguridad_social",
  "CREDITOS - BANCOS": "creditos_bancos",
  "GASTOS FAMILIA MORENO PINEDA": "gastos_familia_moreno",
  "MONTAJES LITOGRAFICOS": "montajes_litograficos",
  "COMPRA DE HERRAMIENTA": "compra_herramienta",
  "PAGO DE NOMINA CAROLINA": "pago_nomina_carolina",
  "PAGO DE NOMINA NILS": "pago_nomina_nils",
  "PAGO DE NOMINA EDINSON": "pago_nomina_edinson",
  "PAGO DE NOMINA JERSON": "pago_nomina_jerson",
  "PAGO DE NOMINA YURLEY": "pago_nomina_yurley",
  "INSUMOS ACRILICOS": "insumos_acrilicos",
  "INSUMOS ADHESIVOS Y LONAS": "insumos_adhesivos_lonas",
  "INSUMOS ELECTRICOS": "insumos_electricos",
  "INSUMOS MDF": "insumos_mdf",
  "SERVICIO DE INDRIVER": "servicio_indriver",
  "SERVICIO CONTABLE": "servicio_contable",
  "INSUMO PLOTTER": "insumo_plotter",
  "4x1000": "cuatro_x_mil",
  "MANEJO DE TARJETA": "manejo_tarjeta",
};

const CANONICAL_TIPOS_MOVIMIENTO = new Set(
  Object.keys(TIPO_MOVIMIENTO_LABELS).filter((key) => /^[a-z0-9_]+$/.test(key)),
);

// Invertir mapeo para reconocer cuando la BD almacena la etiqueta legible
const _invertLabels = Object.keys(TIPO_MOVIMIENTO_LABELS).reduce((acc, key) => {
  acc[TIPO_MOVIMIENTO_LABELS[key]] = key;
  return acc;
}, {});

export const normalizeTipoMovimiento = (valor) => {
  if (!valor) return valor;

  if (CANONICAL_TIPOS_MOVIMIENTO.has(valor)) return valor;

  const mapped = TIPO_MOVIMIENTO_LABELS[valor];
  if (mapped && CANONICAL_TIPOS_MOVIMIENTO.has(mapped)) return mapped;

  if (
    _invertLabels[valor] &&
    CANONICAL_TIPOS_MOVIMIENTO.has(_invertLabels[valor])
  ) {
    return _invertLabels[valor];
  }

  return valor; // no conocido, devolver tal cual
};

export const getEstadoLabel = (estado) => {
  const key = (estado || "").toLowerCase();
  const labels = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    parcial: "Parcial",
    pago_parcial: "Parcial",
    anulado: "Anulado",
  };
  return labels[key] || estado;
};

export const getEstadoColor = (estado) => {
  const key = (estado || "").toLowerCase();
  const colors = {
    pendiente:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    pagado:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    parcial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    pago_parcial:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    anulado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return (
    colors[estado] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
  );
};

export const getSumableIva = (movimiento) => {
  if (!movimiento?.incluye_iva) return 0;
  return movimiento.valor_iva || 0;
};

export const getEffectiveIvaPercentage = (movimiento) => {
  if (!movimiento?.incluye_iva) return 0;
  return movimiento.porcentaje_iva || 19;
};

export const getBaseAntesIva = (movimiento) => {
  return movimiento?.valor_base || movimiento?.valor_total || 0;
};

export const getValor125 = (movimiento) => {
  if (
    !["factura_venta", "pago_factura_electronica"].includes(
      movimiento?.tipo_movimiento,
    )
  )
    return 0;
  return Math.round(getBaseAntesIva(movimiento) * 0.0125);
};

// Calcular base, IVA e ICA para una factura
// Regla: si la factura es electrónica (prefijo 'FE'), se aplica IVA 19% sobre la base.
// Se asume que `valor_total` es el valor final (incluye IVA cuando aplica).
export const computeFacturaTaxes = (factura) => {
  const valorTotal = Number(factura?.valor_total) || 0;
  const esElectronica = (factura?.prefijo || "").toUpperCase() === "FE";
  let base = valorTotal;
  let iva = 0;
  if (esElectronica) {
    base = Math.round((valorTotal / 1.19) * 100) / 100; // mantener 2 decimales
    iva = Math.round((valorTotal - base) * 100) / 100;
  }
  // ICA = 1.25% sobre la base (antes de IVA) - solo para facturas electrónicas
  const ica = esElectronica ? Math.round(base * 0.0125 * 100) / 100 : 0;
  return {
    base: Math.round(base),
    iva: Math.round(iva),
    ica: Math.round(ica),
  };
};

export const isIngreso = (tipo) =>
  [
    "factura_venta",
    "pago_factura_electronica",
    "pago_facturas_remision",
  ].includes(tipo);

// Normalizar un objeto (solo propiedades string) a mayúsculas
export const toUpperAll = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") out[key] = val.toUpperCase();
    else if (val && typeof val === "object") out[key] = toUpperAll(val);
    else out[key] = val;
  }
  return out;
};

export const isEgreso = (tipo) =>
  [
    "pago_iva",
    "pago_ica",
    "servicios_agua_1p",
    "servicios_luz_1p",
    "servicios_gas_1p",
    "arriendo_2p",
    "arriendo_1p",
    "servicios_agua_2p",
    "servicios_luz_2p",
    "servicios_gas_2p",
    "domicilios",
    "insumos",
    "movistar_celulares",
    "movistar_internet",
    "mojica_impresiones",
    "impresion_litografia",
    "acabados",
    "pago_dias_trabajo",
    "pago_nomina_javier",
    "seguridad_social",
    "creditos_bancos",
    "gastos_familia_moreno",
    "montajes_litograficos",
    "compra_herramienta",
    "pago_nomina_carolina",
    "pago_nomina_nils",
    "pago_nomina_edinson",
    "pago_nomina_jerson",
    "pago_nomina_yurley",
    "insumos_acrilicos",
    "insumos_adhesivos_lonas",
    "insumos_electricos",
    "insumos_mdf",
    "servicio_indriver",
    "servicio_contable",
    "insumo_plotter",
  ].includes(tipo);
