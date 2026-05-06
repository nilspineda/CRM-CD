import { supabase } from "../../../lib/supabase";

export const clientesService = {
  async getPaginated({ page = 1, pageSize = 20, search = "" }) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("clientes")
      .select("id,nit,nombre,telefono,correo,responsable,direccion,estado", {
        count: "exact",
      })
      .order("nombre");

    if (search.trim()) {
      const searchClean = search.replace(/\s/g, "");
      query = query.or(
        `nit.ilike.%${searchClean}%,nit.ilike.%${search}%,nombre.ilike.%${search}%,telefono.ilike.%${search}%,telefono.ilike.%${searchClean}%,correo.ilike.%${search}%,responsable.ilike.%${search}%`,
      );
    }

    const { data, error, count } = await query.range(from, to);
    console.log('[clientes] search:', search, 'results:', data?.length, 'error:', error);

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  async getStats() {
    const { count: activos, error: errorActivos } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("estado", true);

    const { count: inactivos, error: errorInactivos } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("estado", false);

    if (errorActivos) throw errorActivos;
    if (errorInactivos) throw errorInactivos;

return { activos: activos || 0, inactivos: inactivos || 0 };
  },

  async getAll() {
    const { data, error } = await supabase
      .from("clientes")
      .select("id,nit,nombre,telefono,correo,responsable,direccion,estado")
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

  async getUpcomingBirthdays(limit = 10) {
    const { data, error } = await supabase
      .from("clientes_proximos_cumpleanos")
      .select("id,nombre,responsable,next_birthday,days_until")
      .order("days_until", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const { data, error } = await supabase
        .from("clientes")
        .update({ ...cliente, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select();

      clearTimeout(timeoutId);

      if (error) throw error;
      return data[0];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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
