// filepath: src/features/cuentas/services/cuentasService.js
import { supabase } from "../../../lib/supabase";

export const cuentasService = {
  // Obtener todas las cuentas
  async getAll() {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .select("id,nombre,tipo_cuenta,saldo_inicial,saldo_actual,estado,updated_at")
      .order("nombre");

    if (error) throw error;
    return data;
  },

  // Obtener cuentas activas
  async getActivas() {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .select("id,nombre,tipo_cuenta,saldo_inicial,saldo_actual,estado,updated_at")
      .eq("estado", true)
      .order("nombre");

    if (error) throw error;
    return data;
  },

  // Obtener una cuenta por ID
  async getById(id) {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Crear cuenta
  async create(cuenta) {
    const saldoInicial = Number(cuenta.saldo_inicial) || 0;
    const payload = {
      ...cuenta,
      saldo_inicial: saldoInicial,
      saldo_actual:
        cuenta.saldo_actual == null
          ? saldoInicial
          : Number(cuenta.saldo_actual) || 0,
    };

    const { data, error } = await supabase
      .from("cuentas_financieras")
      .insert([payload])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Actualizar cuenta
  async update(id, cuenta) {
    const { data: cuentaActual, error: cuentaActualError } = await supabase
      .from("cuentas_financieras")
      .select("saldo_inicial, saldo_actual")
      .eq("id", id)
      .single();

    if (cuentaActualError) throw cuentaActualError;

    const saldoInicialAnterior = Number(cuentaActual?.saldo_inicial) || 0;
    const saldoActualAnterior = Number(cuentaActual?.saldo_actual) || 0;
    const saldoInicialNuevo = Number(cuenta.saldo_inicial) || 0;
    const deltaSaldoInicial = saldoInicialNuevo - saldoInicialAnterior;

    const payload = {
      ...cuenta,
      saldo_inicial: saldoInicialNuevo,
      saldo_actual: saldoActualAnterior + deltaSaldoInicial,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("cuentas_financieras")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Eliminar cuenta (soft delete - inactivar)
  async delete(id) {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .update({ estado: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Activar cuenta
  async activate(id) {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .update({ estado: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Obtener saldo total de todas las cuentas
  async getSaldoTotal() {
    const { data, error } = await supabase
      .from("cuentas_financieras")
      .select("saldo_actual")
      .eq("estado", true);

    if (error) throw error;
    return data.reduce((sum, c) => sum + (c.saldo_actual || 0), 0);
  },
};
