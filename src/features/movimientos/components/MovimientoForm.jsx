// filepath: src/features/movimientos/components/MovimientoForm.jsx
import { useState, useEffect } from 'react';
import Input, { Select, Textarea } from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { cuentasService } from '../../cuentas/services/cuentasService';
import { calculateIVA, isEgreso } from '../../../lib/utils';

const TIPOS_MOVIMIENTO = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'factura_venta', label: 'Factura de Venta' },
  { value: 'gasto', label: 'Gasto' },
  { value: 'compra', label: 'Compra' },
  { value: 'pago', label: 'Pago' },
];

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'QR', label: 'QR' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'mixto', label: 'Mixto' },
];

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'anulado', label: 'Anulado' },
];

export default function MovimientoForm({ movimiento, initialData = {}, onSave, onCancel }) {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    numero_factura: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo_movimiento: initialData.tipo_movimiento || 'ingreso',
    cuenta_id: '',
    categoria_id: '',
    cliente_proveedor: '',
    descripcion: '',
    valor_total: 0,
    incluye_iva: initialData.incluye_iva ?? false,
    porcentaje_iva: initialData.porcentaje_iva || 0,
    estado: initialData.estado || 'pendiente',
    metodo_pago: 'transferencia',
    observaciones: '',
  });

  useEffect(() => {
    loadCuentas();
  }, []);

  useEffect(() => {
    if (movimiento) {
      setFormData({
        numero_factura: movimiento.numero_factura || '',
        fecha: movimiento.fecha || new Date().toISOString().split('T')[0],
        tipo_movimiento: movimiento.tipo_movimiento || 'ingreso',
        cuenta_id: movimiento.cuenta_id || '',
        categoria_id: movimiento.categoria_id || '',
        cliente_proveedor: isEgreso(movimiento.tipo_movimiento) ? '' : movimiento.cliente_proveedor || '',
        descripcion: movimiento.descripcion || '',
        valor_total: movimiento.incluye_iva ? movimiento.valor_base || movimiento.valor_total || 0 : movimiento.valor_total || 0,
        incluye_iva: movimiento.incluye_iva ?? false,
        porcentaje_iva: movimiento.incluye_iva ? movimiento.porcentaje_iva || 19 : 0,
        estado: movimiento.estado || 'pendiente',
        metodo_pago: movimiento.metodo_pago || 'transferencia',
        observaciones: movimiento.observaciones || '',
      });
    }
  }, [movimiento]);

  const loadCuentas = async () => {
    try {
      const data = await cuentasService.getActivas();
      setCuentas(data);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };

      if (name === 'tipo_movimiento' && isEgreso(newValue)) {
        updated.cliente_proveedor = '';
        updated.numero_factura = '';
      }

      if (name === 'incluye_iva') {
        updated.porcentaje_iva = newValue ? prev.porcentaje_iva || 19 : 0;
      }
      
      // Recalcular IVA cuando cambia valor_total, incluye_iva o porcentaje_iva
      if (name === 'valor_total' || name === 'incluye_iva' || name === 'porcentaje_iva') {
        const ivaCalc = calculateIVA(
          name === 'valor_total' ? newValue : updated.valor_total,
          updated.incluye_iva,
          updated.porcentaje_iva
        );
        updated.valor_base = ivaCalc.base;
        updated.valor_iva = ivaCalc.iva;
      }
      
      return updated;
    });
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida';
    if (!formData.tipo_movimiento) newErrors.tipo_movimiento = 'El tipo es requerido';
    if (!formData.cuenta_id) newErrors.cuenta_id = 'La cuenta es requerida';
    if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es requerida';
    if (!formData.valor_total || formData.valor_total <= 0) newErrors.valor_total = 'El valor debe ser mayor a 0';
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

  // Calcular IVA para mostrar
  const porcentajeIva = formData.incluye_iva ? formData.porcentaje_iva || 19 : 0;
  const ivaCalculado = calculateIVA(formData.valor_total, formData.incluye_iva, porcentajeIva);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isEgreso(formData.tipo_movimiento) && (
          <Input
            label="Número de factura"
            name="numero_factura"
            value={formData.numero_factura}
            onChange={handleChange}
            placeholder="FAC-001"
          />
        )}
        
        <Input
          label="Fecha"
          name="fecha"
          type="date"
          value={formData.fecha}
          onChange={handleChange}
          error={errors.fecha}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo de movimiento"
          name="tipo_movimiento"
          value={formData.tipo_movimiento}
          onChange={handleChange}
          error={errors.tipo_movimiento}
          required
        >
          {TIPOS_MOVIMIENTO.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
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
          {cuentas.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>
      </div>

      {!isEgreso(formData.tipo_movimiento) && (
        <Input
          label="Cliente / Proveedor (opcional)"
          name="cliente_proveedor"
          value={formData.cliente_proveedor}
          onChange={handleChange}
          placeholder="Nombre del cliente o proveedor"
        />
      )}

      <Input
        label="Descripción"
        name="descripcion"
        value={formData.descripcion}
        onChange={handleChange}
        error={errors.descripcion}
        placeholder="Descripción del movimiento..."
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label={formData.incluye_iva ? 'Valor antes de IVA' : 'Valor total'}
          name="valor_total"
          type="number"
          value={formData.valor_total}
          onChange={handleChange}
          error={errors.valor_total}
          placeholder="0"
          required
        />
        
        <Select
          label="¿Incluye IVA?"
          name="incluye_iva"
          value={formData.incluye_iva.toString()}
          onChange={(e) => handleChange({ target: { name: 'incluye_iva', value: e.target.value === 'true', type: 'checkbox' } })}
        >
          <option value="false">No</option>
          <option value="true">Sí</option>
        </Select>

        <Input
          label="% IVA"
          name="porcentaje_iva"
          type="number"
          value={porcentajeIva}
          onChange={handleChange}
          disabled={!formData.incluye_iva}
        />
      </div>

      {/* Mostrar cálculo de IVA */}
      {formData.valor_total > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <p className="text-sm font-medium text-gray-700 mb-2">Desglose del IVA:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div>
              <p className="text-gray-500">Base</p>
              <p className="font-semibold">${ivaCalculado.base.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <p className="text-gray-500">IVA ({porcentajeIva}%)</p>
              <p className="font-semibold">${ivaCalculado.iva.toLocaleString('es-CO')}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold">${ivaCalculado.total.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Estado"
          name="estado"
          value={formData.estado}
          onChange={handleChange}
        >
          {ESTADOS.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </Select>

        <Select
          label="Método de pago"
          name="metodo_pago"
          value={formData.metodo_pago}
          onChange={handleChange}
        >
          {METODOS_PAGO.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      </div>

      <Textarea
        label="Observaciones"
        name="observaciones"
        value={formData.observaciones}
        onChange={handleChange}
        placeholder="Observaciones adicionales..."
        rows={2}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? 'Guardando...' : movimiento ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
