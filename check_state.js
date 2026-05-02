import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://pkzfupthpckfhalfjimb.supabase.co";
const supabaseKey = "sb_publishable_rcwv6CD9ozcTbMO7QIMkkw_mAwWVmNn";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("facturas").select("numero_factura, estado").in("estado", ["pendiente", "pago_parcial", "pagado", "cartera"]);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
