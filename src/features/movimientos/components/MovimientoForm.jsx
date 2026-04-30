import { useEffect, useState } from "react";
import Input, { Select, Textarea } from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { cuentasService } from "../../cuentas/services/cuentasService";
import { movimientosService } from "../services/movimientosService";
import { getTipoMovimientoLabel, isIngreso } from "../../../lib/utils";
import { TIPOS_MOVIMIENTO_BANCARIOS, CATEGORY_ORDER } from "../constants";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
];

const tiposPorCategoria = {};
TIPOS_MOVIMIENTO_BANCARIOS.forEach((tipo) => {
  if (!tiposPorCategoria[tipo.category]) {
    tiposPorCategoria[tipo.category] = [];
  }
  tiposPorCategoria[tipo.category].push(tipo);
});

export default function MovimientoForm({
  movimiento,
  initialData = {},
  onSave,
  onCancel,
}) {
  const [cuentas, setCuentas] = useState([]);
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    tipo_movimiento: initialData.tipo_movimiento || "servicios_agua_1p",
    cuenta_id: initialData.cuenta_id || "",
    valor_total: initialData.valor_total || 0,
    estado: initialData.estado || "pendiente",
    descripcion: initialData.descripcion || "",
    observaciones: initialData.observaciones || "",
  });

  useEffect(() => {
    loadCuentas();
    loadTiposMovimiento();
  }, []);

  useEffect(() => {
    if (movimiento) {
      setFormData({
        fecha: movimiento.fecha || new Date().toISOString().split("T")[0],
        tipo_movimiento: movimiento.tipo_movimiento || "servicios_agua_1p",
        cuenta_id: movimiento.cuenta_id || "",
        valor_total: movimiento.valor_total || 0,
        estado: movimiento.estado || "pendiente",
        descripcion: movimiento.descripcion || "",
        observaciones: movimiento.observaciones || "",
      });
    }
  }, [movimiento]);

  const loadCuentas = async () => {
    try {
      const data = await cuentasService.getActivas();
      setCuentas(data || []);
    } catch (error) {
      console.error("Error cargando cuentas:", error);
    }
  };

  const loadTiposMovimiento = async () => {
    try {
      const data = await movimientosService.getTiposMovimientoDisponibles();
      setTiposMovimiento(data || []);
    } catch (error) {
      console.error("Error cargando tipos de movimiento:", error);
      setTiposMovimiento(TIPOS_MOVIMIENTO_BANCARIOS.map((t) => t.value));
    }
  };

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    const newValue = type === "number" ? Number(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fecha) newErrors.fecha = "La fecha es requerida";
    if (!formData.tipo_movimiento)
      newErrors.tipo_movimiento = "El tipo es requerido";
    if (!formData.cuenta_id) newErrors.cuenta_id = "La cuenta es requerida";
    if (!formData.descripcion?.trim()) {
      newErrors.descripcion = "La descripcion es requerida";
    }
    if (!formData.valor_total || Number(formData.valor_total) <= 0) {
      newErrors.valor_total = "El valor debe ser mayor a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cuentaSeleccionada = cuentas.find(
    (cuenta) => cuenta.id === formData.cuenta_id,
  );
  const saldoActualCuenta = cuentaSeleccionada?.saldo_actual || 0;
  const valor = Number(formData.valor_total) || 0;
  const esIngreso = isIngreso(formData.tipo_movimiento);
  const impacto = formData.estado === "pagado"
    ? (esIngreso ? valor : -valor)
    : 0;
  const saldoDespues = saldoActualCuenta + impacto;

  const tiposConocidos = new Set(
    TIPOS_MOVIMIENTO_BANCARIOS.map((t) => t.value),
  );
  const tiposExtras = tiposMovimiento.filter((t) => !tiposConocidos.has(t));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Fecha"
          name="fecha"
          type="date"
          value={formData.fecha}
          onChange={handleChange}
          error={errors.fecha}
          required
        />

        <Select
          label="Tipo de movimiento"
          name="tipo_movimiento"
          value={formData.tipo_movimiento}
          onChange={handleChange}
          error={errors.tipo_movimiento}
          required
        >
          {CATEGORY_ORDER.map((categoria) => {
            const tipos = tiposPorCategoria[categoria];
            if (!tipos) return null;
            return (
              <optgroup key={categoria} label={categoria}>
                {tipos.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
          {tiposExtras.length > 0 && (
            <optgroup label="Otros">
              {tiposExtras.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {getTipoMovimientoLabel(tipo)}
                </option>
              ))}
            </optgroup>
          )}
        </Select>

        <Select
          label="Cuenta financiera"
          name="cuenta_id"
          value={formData.cuenta_id}
          onChange={handleChange}
          error={errors.cuenta_id}
          required
        >
          <option value="">Seleccionar cuenta</option>
          {cuentas.map((cuenta) => (
            <option key={cuenta.id} value={cuenta.id}>
              {cuenta.nombre} — {cuenta.saldo_actual?.toLocaleString("es-CO", { style: "currency", currency: "COP" })}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Valor"
          name="valor_total"
          type="number"
          value={formData.valor_total}
          onChange={handleChange}
          error={errors.valor_total}
          placeholder="0"
          required
        />

        <Select
          label="Estado"
          name="estado"
          value={formData.estado}
          onChange={handleChange}
        >
          {ESTADOS.map((estado) => (
            <option key={estado.value} value={estado.value}>
              {estado.label}
            </option>
          ))}
        </Select>
      </div>

      <Input
        label="Descripción"
        name="descripcion"
        value={formData.descripcion}
        onChange={handleChange}
        error={errors.descripcion}
        placeholder="Descripción del movimiento"
        required
      />

      {cuentaSeleccionada && formData.estado === "pagado" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <p className="font-medium text-slate-800">
            Saldo actual de la cuenta
          </p>
          <p>{cuentaSeleccionada.nombre}</p>
          <p>
            Saldo actual:{" "}
            {saldoActualCuenta.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
            })}
          </p>
          <p className={esIngreso ? "text-green-600" : "text-red-600"}>
            {esIngreso ? "+" : "−"}{" "}
            {valor.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
            })}
          </p>
          <p className="font-semibold text-slate-800">
            Saldo después:{" "}
            {saldoDespues.toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
            })}
          </p>
        </div>
      )}

      <Textarea
        label="Observaciones"
        name="observaciones"
        value={formData.observaciones}
        onChange={handleChange}
        placeholder="Observaciones adicionales..."
        rows={3}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Guardando..." : movimiento ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
