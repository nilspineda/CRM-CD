import { supabase } from "../../../lib/supabase";

const userSelect = `
  id,
  email,
  full_name,
  role_key,
  permissions,
  invited_at,
  created_at,
  updated_at,
  role:roles(key, label, permissions)
`;

export const usuariosService = {
  async getRoles() {
    const { data, error } = await supabase
      .from("roles")
      .select("key, label, permissions, sort_order")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select(userSelect)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async inviteUser(payload) {
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: payload,
    });

    if (error) throw error;
    return data;
  },

  async updateUserAccess(userId, payload) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select(userSelect)
      .single();

    if (error) throw error;
    return data;
  },

  async updateRolePermissions(roleKey, permissions) {
    const { data, error } = await supabase
      .from("roles")
      .update({
        permissions: permissions,
        updated_at: new Date().toISOString(),
      })
      .eq("key", roleKey)
      .select("key, label, permissions, sort_order")
      .single();

    if (error) throw error;
    return data;
  },

  async getRoleByKey(roleKey) {
    const { data, error } = await supabase
      .from("roles")
      .select("key, label, permissions, sort_order, is_system")
      .eq("key", roleKey)
      .single();

    if (error) throw error;
    return data;
  },
};