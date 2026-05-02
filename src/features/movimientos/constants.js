export const TIPOS_MOVIMIENTO_BANCARIOS = [
  { value: "factura_venta", label: "Factura de venta", category: "Ingresos" },
  {
    value: "pago_factura_electronica",
    label: "Pago de Factura Electronica",
    category: "Ingresos",
  },
  {
    value: "pago_facturas_remision",
    label: "Pago Facturas Remision",
    category: "Ingresos",
  },

  { value: "pago_iva", label: "PAGO DE IVA", category: "Impuestos" },
  { value: "pago_ica", label: "PAGO DE ICA", category: "Impuestos" },

  {
    value: "servicios_agua_1p",
    label: "SERVICIOS PUBLICOS 1 PISO - AGUA",
    category: "Servicios Públicos 1P",
  },
  {
    value: "servicios_luz_1p",
    label: "SERVICIOS PUBLICOS 1 PISO - LUZ",
    category: "Servicios Públicos 1P",
  },
  {
    value: "servicios_gas_1p",
    label: "SERVICIOS PUBLICOS 1 PISO - GAS",
    category: "Servicios Públicos 1P",
  },

  {
    value: "servicios_agua_2p",
    label: "SERVICIOS PUBLICOS 2 PISO - AGUA",
    category: "Servicios Públicos 2P",
  },
  {
    value: "servicios_luz_2p",
    label: "SERVICIOS PUBLICOS 2 PISO - LUZ",
    category: "Servicios Públicos 2P",
  },
  {
    value: "servicios_gas_2p",
    label: "SERVICIOS PUBLICOS 2 PISO - GAS",
    category: "Servicios Públicos 2P",
  },

  { value: "arriendo_2p", label: "ARRIENDO 2 PISO", category: "Arriendos" },
  { value: "arriendo_1p", label: "ARRIENDO 1 PISO", category: "Arriendos" },

  {
    value: "pago_nomina_javier",
    label: "PAGO DE NOMINA JAVIER",
    category: "Nómina",
  },
  {
    value: "pago_nomina_carolina",
    label: "PAGO DE NOMINA CAROLINA",
    category: "Nómina",
  },
  {
    value: "pago_nomina_nils",
    label: "PAGO DE NOMINA NILS",
    category: "Nómina",
  },
  {
    value: "pago_nomina_edinson",
    label: "PAGO DE NOMINA EDINSON",
    category: "Nómina",
  },
  {
    value: "pago_nomina_jerson",
    label: "PAGO DE NOMINA JERSON",
    category: "Nómina",
  },
  {
    value: "pago_nomina_yurley",
    label: "PAGO DE NOMINA YURLEY",
    category: "Nómina",
  },
  {
    value: "pago_dias_trabajo",
    label: "PAGO X DIAS DE TRABAJO",
    category: "Nómina",
  },
  { value: "seguridad_social", label: "SEGURIDAD SOCIAL", category: "Nómina" },

  { value: "insumos", label: "INSUMOS", category: "Insumos y Materiales" },
  {
    value: "insumos_acrilicos",
    label: "INSUMOS ACRILICOS",
    category: "Insumos y Materiales",
  },
  {
    value: "insumos_adhesivos_lonas",
    label: "INSUMOS ADHESIVOS Y LONAS",
    category: "Insumos y Materiales",
  },
  {
    value: "insumos_electricos",
    label: "INSUMOS ELECTRICOS",
    category: "Insumos y Materiales",
  },
  {
    value: "insumos_mdf",
    label: "INSUMOS MDF",
    category: "Insumos y Materiales",
  },
  {
    value: "insumo_plotter",
    label: "INSUMO PLOTTER",
    category: "Insumos y Materiales",
  },
  {
    value: "mojica_impresiones",
    label: "MOJICA IMPRESIONES DIGITALES",
    category: "Insumos y Materiales",
  },
  {
    value: "impresion_litografia",
    label: "IMPRESIÓN LITOGRAFIA",
    category: "Insumos y Materiales",
  },
  {
    value: "montajes_litograficos",
    label: "MONTAJES LITOGRAFICOS",
    category: "Insumos y Materiales",
  },
  { value: "acabados", label: "ACABADOS", category: "Insumos y Materiales" },
  {
    value: "compra_herramienta",
    label: "COMPRA DE HERRAMIENTA",
    category: "Insumos y Materiales",
  },

  { value: "domicilios", label: "DOMICILIOS", category: "Servicios y Otros" },
  {
    value: "movistar_celulares",
    label: "MOVISTAR- CELULARES",
    category: "Servicios y Otros",
  },
  {
    value: "movistar_internet",
    label: "MOVISTAR INTERNET",
    category: "Servicios y Otros",
  },
  {
    value: "servicio_indriver",
    label: "SERVICIO DE INDRIVER",
    category: "Servicios y Otros",
  },
  {
    value: "servicio_contable",
    label: "SERVICIO CONTABLE",
    category: "Servicios y Otros",
  },
  {
    value: "gastos_familia_moreno",
    label: "GASTOS FAMILIA MORENO PINEDA",
    category: "Servicios y Otros",
  },
  {
    value: "creditos_bancos",
    label: "CREDITOS - BANCOS",
    category: "Servicios y Otros",
  },
];

export const CATEGORY_ORDER = [
  "Ingresos",
  "Impuestos",
  "Servicios Públicos 1P",
  "Servicios Públicos 2P",
  "Arriendos",
  "Nómina",
  "Insumos y Materiales",
  "Servicios y Otros",
];

export const TIPOS_MOVIMIENTO_BANCARIOS_VALUES = TIPOS_MOVIMIENTO_BANCARIOS.map(
  (tipo) => tipo.value,
);

// Tipos de movimiento sin ingresos (solo egresos para restar de cuentas)
export const TIPOS_MOVIMIENTO_EGRESOS = TIPOS_MOVIMIENTO_BANCARIOS.filter(
  (tipo) => tipo.category !== "Ingresos",
);

export const CATEGORY_ORDER_EGRESOS = [
  "Impuestos",
  "Servicios Públicos 1P",
  "Servicios Públicos 2P",
  "Arriendos",
  "Nómina",
  "Insumos y Materiales",
  "Servicios y Otros",
];
