import { supabase } from "../../../lib/supabase";

export const clientesService = {
  async getAll() {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("nombre");

    if (error) throw error;
    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(cliente) {
    const { data, error } = await supabase
      .from("clientes")
      .insert([cliente])
      .select();

    if (error) throw error;
    return data[0];
  },

  async update(id, cliente) {
    const { data, error } = await supabase
      .from("clientes")
      .update({ ...cliente, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  async delete(id) {
    const { data, error } = await supabase
      .from("clientes")
      .update({ estado: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  async getFacturasPorCliente(clienteId) {
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha_creacion", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
