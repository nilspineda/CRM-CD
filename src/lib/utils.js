// filepath: src/lib/utils.js
// Utilidades para formateo de moneda y fechas

export const formatCurrency = (value) => {
  if (value == null) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
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
  const labels = {
    pago_iva: "PAGO DE IVA",
    pago_ica: "PAGO DE ICA",
    pago_factura_electronica: "Pago de Factura Electronica",
    pago_facturas_remision: "Pago Factuiras Remision",
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
  };
  return labels[tipo] || tipo;
};

export const getEstadoLabel = (estado) => {
  const labels = {
    pendiente: "Pendiente",
    pagado: "Pagado",
    parcial: "Parcial",
    anulado: "Anulado",
  };
  return labels[estado] || estado;
};

export const getEstadoColor = (estado) => {
  const colors = {
    pendiente: "bg-yellow-100 text-yellow-800",
    pagado: "bg-green-100 text-green-800",
    parcial: "bg-blue-100 text-blue-800",
    anulado: "bg-red-100 text-red-800",
  };
  return colors[estado] || "bg-gray-100 text-gray-800";
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
  if (movimiento?.tipo_movimiento !== "pago_factura_electronica") return 0;
  return Math.round(getBaseAntesIva(movimiento) * 0.0125);
};

export const isIngreso = (tipo) =>
  ["pago_factura_electronica", "pago_facturas_remision"].includes(tipo);

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
