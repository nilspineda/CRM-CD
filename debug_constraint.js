import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Cargar variables del .env manualmente
const envLocal = fs.readFileSync(".env", "utf8");
const env = {};
envLocal.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key) env[key.trim()] = value?.trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY,
);

async function checkConstraint() {
  try {
    // Intentar insertar un registro de prueba que debería fallar
    const testMovimiento = {
      cuenta_id: "00000000-0000-0000-0000-000000000000", // fake ID
      tipo_movimiento: "test_invalido",
      fecha: new Date().toISOString().split("T")[0],
      valor_total: 100,
      estado: "pendiente",
      descripcion: "test",
    };

    const { error } = await supabase
      .from("movimientos_financieros")
      .insert([testMovimiento]);

    if (error?.message?.includes("check constraint")) {
      console.log("✓ Constraint CHECK existe y está funcionando");
      console.log("Error capturado:", error.message);
    } else if (error) {
      console.log("✗ Error diferente:", error.message);
    } else {
      console.log("✗ No hay constraint CHECK (registro se insertó)");
    }

    // Intentar con un tipo válido
    const validMovimiento = {
      cuenta_id: "00000000-0000-0000-0000-000000000000",
      tipo_movimiento: "pago_nomina_nils",
      fecha: new Date().toISOString().split("T")[0],
      valor_total: 100,
      estado: "pendiente",
      descripcion: "test válido",
    };

    const { error: error2 } = await supabase
      .from("movimientos_financieros")
      .insert([validMovimiento]);

    if (error2?.message?.includes("violates check constraint")) {
      console.log('✗ El tipo "pago_nomina_nils" NO está permitido en la BD');
      console.log("Error:", error2.message);
    } else if (error2?.message?.includes("foreign key")) {
      console.log(
        '✓ El tipo "pago_nomina_nils" SÍ está permitido (error es por FK)',
      );
    } else if (error2?.code === "PGRST116") {
      console.log('✓ El tipo "pago_nomina_nils" SÍ está permitido');
    } else {
      console.log("Resultado del test con tipo válido:");
      console.log(error2);
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkConstraint();
