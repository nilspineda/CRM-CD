// filepath: src/features/cuentas/services/cuentasService.js
import { supabase } from '../../../lib/supabase';

export const cuentasService = {
  // Obtener todas las cuentas
  async getAll() {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .select('*')
      .order('nombre');
    
    if (error) throw error;
    return data;
  },

  // Obtener cuentas activas
  async getActivas() {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .select('*')
      .eq('estado', true)
      .order('nombre');
    
    if (error) throw error;
    return data;
  },

  // Obtener una cuenta por ID
  async getById(id) {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Crear cuenta
  async create(cuenta) {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .insert([cuenta])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Actualizar cuenta
  async update(id, cuenta) {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .update({ ...cuenta, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Eliminar cuenta (soft delete - inactivar)
  async delete(id) {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .update({ estado: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Activar cuenta
  async activate(id) {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .update({ estado: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  // Obtener saldo total de todas las cuentas
  async getSaldoTotal() {
    const { data, error } = await supabase
      .from('cuentas_financieras')
      .select('saldo_actual')
      .eq('estado', true);
    
    if (error) throw error;
    return data.reduce((sum, c) => sum + (c.saldo_actual || 0), 0);
  }
};