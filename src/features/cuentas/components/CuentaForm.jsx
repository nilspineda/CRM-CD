// filepath: src/features/cuentas/components/CuentaForm.jsx
import { useState, useEffect } from 'react';
import Input, { Select, Textarea } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const TIPOS_CUENTA = [
  { value: 'caja', label: 'Caja' },
  { value: 'banco', label: 'Banco' },
  { value: 'billetera_digital', label: 'Billetera Digital' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otra', label: 'Otra' },
];

export default function CuentaForm({ cuenta, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: '',
    tipo_cuenta: 'caja',
    descripcion: '',
    saldo_inicial: 0,
    estado: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (cuenta) {
      setFormData({
        nombre: cuenta.nombre || '',
        tipo_cuenta: cuenta.tipo_cuenta || 'caja',
        descripcion: cuenta.descripcion || '',
        saldo_inicial: cuenta.saldo_inicial || 0,
        estado: cuenta.estado ?? true,
      });
    }
  }, [cuenta]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    // Limpiar error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    if (!formData.tipo_cuenta) {
      newErrors.tipo_cuenta = 'El tipo de cuenta es requerido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre de la cuenta"
        name="nombre"
        value={formData.nombre}
        onChange={handleChange}
        error={errors.nombre}
        placeholder="Ej: Caja Principal"
        required
      />

      <Select
        label="Tipo de cuenta"
        name="tipo_cuenta"
        value={formData.tipo_cuenta}
        onChange={handleChange}
        error={errors.tipo_cuenta}
      >
        <option value="">Seleccionar tipo</option>
        {TIPOS_CUENTA.map(tipo => (
          <option key={tipo.value} value={tipo.value}>
            {tipo.label}
          </option>
        ))}
      </Select>

      <Input
        label="Saldo inicial"
        name="saldo_inicial"
        type="number"
        value={formData.saldo_inicial}
        onChange={handleChange}
        placeholder="0"
      />

      <Textarea
        label="Descripción (opcional)"
        name="descripcion"
        value={formData.descripcion}
        onChange={handleChange}
        placeholder="Descripción adicional de la cuenta..."
        rows={2}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Guardando...' : cuenta ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
