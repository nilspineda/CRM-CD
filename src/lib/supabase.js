// filepath: src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!supabaseUrl || !supabaseKey) {
  console.error("⚠️ Faltan las variables de entorno de Supabase");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Lee la sesión desde localStorage en cada carga (evita round-trip a la API)
    persistSession: true,
    // Renueva el token automáticamente antes de que expire
    autoRefreshToken: true,
    // Necesario para OAuth / magic links
    detectSessionInUrl: true,
  },
});
