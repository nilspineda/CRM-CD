import { supabase } from "../../../lib/supabase";
import {
  getSumableIva,
  getValor125,
  isEgreso,
  isIngreso,
} from "../../../lib/utils";

const normalizeMovimiento = (movimiento) => ({
  ...movimiento,
  descripcion:
    movimiento.descripcion?.trim() ||
    movimiento.observaciones?.trim() ||
    movimiento.tipo_movimiento ||
    "Movimiento financiero",
  categoria_id: movimiento.categoria_id || null,
  cliente_proveedor: movimiento.cliente_proveedor || null,
  observaciones: movimiento.observaciones || null,
  valor_total: Number(movimiento.valor_total) || 0,
  estado: movimiento.estado || "pendiente",
  updated_at: movimiento.updated_at || new Date().toISOString(),
});

const getMovimientoImpacto = (movimiento) => {
  if (!movimiento || movimiento.estado !== "pagado") return 0;
  return -Math.abs(movimiento.valor_total || 0);
};

const applyCuentaImpacto = async (cuentaId, impacto) => {
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

export const movimientosService = {
  async getTiposMovimientoDisponibles() {
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .select("tipo_movimiento")
      .order("tipo_movimiento", { ascending: true });

    if (error) throw error;

    return Array.from(
      new Set((data || []).map((row) => row.tipo_movimiento).filter(Boolean)),
    );
  },

  // Obtener todos los movimientos con filtros
  async getAll(filtros = {}) {
    let query = supabase.from("movimientos_financieros").select(`
        *,
        cuentas_financieras(nombre),
        categorias_financieras(nombre)
      `);

    const ordenarPor = filtros.ordenarPor || "fecha_desc";
    const [orderBy, orderDir] = ordenarPor.split("_");
    query = query.order(orderBy, { ascending: orderDir === "asc" });

    // Aplicar filtros
    if (filtros.fechaInicio) {
      query = query.gte("fecha", filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      query = query.lte("fecha", filtros.fechaFin);
    }
    if (filtros.cuentaId) {
      query = query.eq("cuenta_id", filtros.cuentaId);
    }
    if (filtros.tipoMovimiento) {
      query = query.eq("tipo_movimiento", filtros.tipoMovimiento);
    }
    if (filtros.estado) {
      if (filtros.estado === "cartera") {
        query = query.in("estado", ["pendiente", "parcial"]);
      } else {
        query = query.eq("estado", filtros.estado);
      }
    }
    if (filtros.busqueda) {
      query = query.ilike("descripcion", `%${filtros.busqueda}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Obtener un movimiento por ID
  async getById(id) {
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .select(
        `
        *,
        cuentas_financieras(nombre),
        categorias_financieras(nombre)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear movimiento
  async create(movimiento) {
    const datos = normalizeMovimiento(movimiento);

    const { data, error } = await supabase
      .from("movimientos_financieros")
      .insert([datos])
      .select();

    if (error) throw error;
    await applyCuentaImpacto(data[0].cuenta_id, getMovimientoImpacto(data[0]));
    return data[0];
  },

  // Actualizar movimiento
  async update(id, movimiento) {
    const anterior = await this.getById(id);
    const datos = {
      ...normalizeMovimiento(movimiento),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("movimientos_financieros")
      .update(datos)
      .eq("id", id)
      .select();

    if (error) throw error;
    await applyCuentaImpacto(
      anterior.cuenta_id,
      -getMovimientoImpacto(anterior),
    );
    await applyCuentaImpacto(data[0].cuenta_id, getMovimientoImpacto(data[0]));
    return data[0];
  },

  // Anular movimiento
  async anular(id) {
    const anterior = await this.getById(id);
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .update({ estado: "anulado", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;
    await applyCuentaImpacto(
      anterior.cuenta_id,
      -getMovimientoImpacto(anterior),
    );
    return data[0];
  },

  // Obtener estadísticas
  async getEstadisticas(fechaInicio, fechaFin) {
    let query = supabase
      .from("movimientos_financieros")
      .select(
        "tipo_movimiento, valor_total, valor_base, valor_iva, incluye_iva, estado",
      )
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .eq("estado", "pagado");

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      ingresos: 0,
      egresos: 0,
      iva: 0,
      valor125: 0,
      facturas: 0,
    };

    data.forEach((m) => {
      if (isIngreso(m.tipo_movimiento)) {
        stats.ingresos += m.valor_total || 0;
      } else if (isEgreso(m.tipo_movimiento)) {
        stats.egresos += m.valor_total || 0;
      }
      stats.iva += getSumableIva(m);
      if (isIngreso(m.tipo_movimiento)) stats.valor125 += getValor125(m);
      if (
        ["factura_venta", "pago_factura_electronica"].includes(
          m.tipo_movimiento,
        )
      ) {
        stats.facturas += 1;
      }
    });

    return stats;
  },

  // Obtener movimientos por cuenta
  async getByCuenta(cuentaId) {
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .select("*")
      .eq("cuenta_id", cuentaId)
      .order("fecha", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getFacturas(filtros = {}) {
    return this.getAll({
      ...filtros,
      tipoMovimiento: "factura_venta",
    });
  },

  async getLogs({ page = 1, pageSize = 30 } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const buildQuery = () =>
      supabase
        .from("movimientos_financieros_logs")
        .select("*", { count: "exact" });

    let result = await buildQuery()
      .order("created_at", { ascending: false })
      .range(from, to);

    // Compatibilidad por si la columna de fecha del log se llama distinto.
    if (result.error?.code === "42703") {
      result = await buildQuery()
        .order("fecha_hora", { ascending: false })
        .range(from, to);
    }

    if (result.error) throw result.error;

    return {
      data: result.data || [],
      count: result.count || 0,
    };
  },

  async getIva(fechaInicio, fechaFin) {
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .select(
        `
        id,
        fecha,
        numero_factura,
        tipo_movimiento,
        descripcion,
        cliente_proveedor,
        valor_base,
        valor_iva,
        incluye_iva,
        porcentaje_iva,
        valor_total,
        estado,
        cuentas_financieras(nombre)
      `,
      )
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .neq("estado", "anulado")
      .order("fecha", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getReporteFinanciero(fechaInicio, fechaFin) {
    const { data, error } = await supabase
      .from("movimientos_financieros")
      .select(
        `
        id,
        fecha,
        tipo_movimiento,
        descripcion,
        valor_base,
        valor_total,
        valor_iva,
        incluye_iva,
        porcentaje_iva,
        estado,
        cuentas_financieras(nombre)
      `,
      )
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin)
      .neq("estado", "anulado")
      .order("fecha", { ascending: false });

    if (error) throw error;
    return data;
  },
};
