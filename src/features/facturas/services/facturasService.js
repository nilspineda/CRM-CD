import { supabase } from "../../../lib/supabase";
import { cuentasService } from "../../cuentas/services/cuentasService";

const hoy = () => new Date().toISOString().split("T")[0];

const parseFecha = (value) => {
  if (!value) return null;
  const fecha = new Date(value);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const calcularDias = (fechaCreacion, fechaPago) => {
  const inicio = parseFecha(fechaCreacion);
  const fin = parseFecha(fechaPago);
  if (!inicio || !fin) return null;
  const diff = Math.ceil((fin.getTime() - inicio.getTime()) / 86400000);
  return diff < 0 ? 0 : diff;
};

const agregarCamposDerivados = (factura) => ({
  ...factura,
  dias_faltantes: calcularDias(factura.fecha_creacion, factura.fecha_pago),
  numero_final: `${factura.prefijo || ""}-${factura.numero_factura || ""}`,
});

const validarUnicidad = async (prefijo, numeroFactura, excludeId = null) => {
  let query = supabase
    .from("facturas")
    .select("id")
    .eq("prefijo", prefijo)
    .eq("numero_factura", numeroFactura);

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;
  if (data.length > 0) {
    throw new Error("La combinación prefijo + número de factura ya existe.");
  }
};

const ajustarCuenta = async (cuentaId, impacto) => {
  if (!cuentaId || !impacto) return;

  const { data: cuenta, error: cuentaError } = await supabase
    .from("cuentas_financieras")
    .select("saldo_actual")
    .eq("id", cuentaId)
    .single();

  if (cuentaError) throw cuentaError;

  const { error } = await supabase
    .from("cuentas_financieras")
    .update({
      saldo_actual: (cuenta.saldo_actual || 0) + impacto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cuentaId);

  if (error) throw error;
};

const sanitizeFacturaPayload = (factura = {}) => {
  const payload = {
    cliente_nit: factura.cliente_nit ?? null,
    prefijo: factura.prefijo ?? null,
    numero_factura: factura.numero_factura ?? null,
    fecha_creacion: factura.fecha_creacion ?? null,
    fecha_pago: factura.fecha_pago ?? null,
    valor_total:
      factura.valor_total == null ? null : Number(factura.valor_total) || 0,
    valor_pagado:
      factura.valor_pagado == null ? null : Number(factura.valor_pagado) || 0,
    fecha_proximo_pago: factura.fecha_proximo_pago ?? null,
    estado: factura.estado ?? null,
    observaciones: factura.observaciones ?? null,
    cuenta_id: factura.cuenta_id ?? null,
  };

  return payload;
};

export const facturasService = {
  async getAll(filtros = {}) {
    let query = supabase
      .from("facturas")
      .select(
        "id,cliente_nit,prefijo,numero_factura,fecha_creacion,fecha_pago,fecha_proximo_pago,valor_total,valor_pagado,estado,observaciones,cuenta_id,updated_at"
      )
      .order("fecha_creacion", { ascending: false });

    if (filtros.fechaInicio)
      query = query.gte("fecha_creacion", filtros.fechaInicio);
    if (filtros.fechaFin) query = query.lte("fecha_creacion", filtros.fechaFin);

    if (filtros.estado) {
      if (filtros.estado === "cartera") {
        query = query.in("estado", ["pendiente", "pago_parcial"]);
      } else {
        query = query.eq("estado", filtros.estado);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(agregarCamposDerivados);
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return agregarCamposDerivados(data);
  },

  async create(factura) {
    const payload = {
      ...sanitizeFacturaPayload(factura),
      fecha_creacion: factura.fecha_creacion || hoy(),
      estado: factura.estado || "pendiente",
      observaciones: factura.observaciones || null,
      cuenta_id: factura.cuenta_id || null,
    };

    await validarUnicidad(payload.prefijo, payload.numero_factura);

    const { data, error } = await supabase
      .from("facturas")
      .insert([payload])
      .select();

    if (error) throw error;
    return agregarCamposDerivados(data[0]);
  },

  async update(id, factura) {
    const anterior = await this.getById(id);
    const merged = { ...anterior, ...factura };
    const payload = {
      ...sanitizeFacturaPayload(merged),
      observaciones: merged.observaciones || null,
      cuenta_id: merged.cuenta_id || null,
      updated_at: new Date().toISOString(),
    };

    await validarUnicidad(payload.prefijo, payload.numero_factura, id);

    const { data, error } = await supabase
      .from("facturas")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) throw error;

    const actualizado = data[0];
    if (anterior.estado === "pagado" && actualizado.estado !== "pagado") {
      await ajustarCuenta(anterior.cuenta_id, -(anterior.valor_total || 0));
    }
    if (anterior.estado !== "pagado" && actualizado.estado === "pagado") {
      await ajustarCuenta(actualizado.cuenta_id, actualizado.valor_total || 0);
    }
    if (
      anterior.estado === "pagado" &&
      actualizado.estado === "pagado"
    ) {
      if (anterior.cuenta_id !== actualizado.cuenta_id) {
        await ajustarCuenta(anterior.cuenta_id, -(anterior.valor_total || 0));
        await ajustarCuenta(actualizado.cuenta_id, actualizado.valor_total || 0);
      } else if (anterior.valor_total !== actualizado.valor_total) {
        const diff = (actualizado.valor_total || 0) - (anterior.valor_total || 0);
        await ajustarCuenta(actualizado.cuenta_id, diff);
      }
    }

    return agregarCamposDerivados(actualizado);
  },

  async cambiarEstado(id, datos) {
    const factura = await this.getById(id);
    const payload = {
      estado: datos.estado,
      fecha_pago: datos.fecha_pago !== undefined ? datos.fecha_pago : factura.fecha_pago,
      fecha_proximo_pago: datos.fecha_proximo_pago !== undefined ? datos.fecha_proximo_pago : factura.fecha_proximo_pago,
      valor_pagado: datos.valor_pagado !== undefined ? datos.valor_pagado : factura.valor_pagado,
      observaciones: datos.observaciones !== undefined ? datos.observaciones : factura.observaciones,
      cuenta_id: datos.cuenta_id !== undefined ? datos.cuenta_id : factura.cuenta_id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("facturas")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) throw error;

    const actualizada = data[0];
    if (factura.estado !== "pagado" && actualizada.estado === "pagado") {
      await ajustarCuenta(actualizada.cuenta_id, actualizada.valor_total || 0);
    }
    if (factura.estado === "pagado" && actualizada.estado !== "pagado") {
      await ajustarCuenta(factura.cuenta_id, -(factura.valor_total || 0));
    }

    return agregarCamposDerivados(actualizada);
  },

  async getClientes() {
    const { data, error } = await supabase
      .from("clientes")
      .select("nit,nombre")
      .order("nombre");
    if (error) throw error;
    return data || [];
  },

  async getCuentas() {
    return cuentasService.getActivas();
  },
};
