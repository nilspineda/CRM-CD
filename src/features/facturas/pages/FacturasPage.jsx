import { useEffect, useMemo, useState } from 'react';
import { Receipt, Search, Clock, CheckCircle2, DollarSign, Download, Plus } from 'lucide-react';
import Card, { CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { movimientosService } from '../../movimientos/services/movimientosService';
import { formatCurrency, formatDate, getDateRange, getEffectiveIvaPercentage, getEstadoColor, getEstadoLabel, getSumableIva, getValor125 } from '../../../lib/utils';
import { exportToExcel } from '../../../lib/exportExcel';
import MovimientoForm from '../../movimientos/components/MovimientoForm';

export default function FacturasPage() {
  const range = getDateRange('month');
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [filtros, setFiltros] = useState({
    fechaInicio: range.start.toISOString().split('T')[0],
    fechaFin: range.end.toISOString().split('T')[0],
    estado: '',
    busqueda: '',
    ordenarPor: 'fecha_desc',
  });

  useEffect(() => {
    loadFacturas();
  }, [filtros]);

  const loadFacturas = async () => {
    try {
      setLoading(true);
      const data = await movimientosService.getFacturas(filtros);
      setFacturas(data);
    } catch (error) {
      console.error('Error cargando facturas:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return facturas.reduce(
      (acc, factura) => {
        acc.total += factura.valor_total || 0;
        acc.iva += getSumableIva(factura);
        acc.valor125 += getValor125(factura);
        if (factura.estado === 'pagado') acc.pagadas += 1;
        if (factura.estado === 'pendiente' || factura.estado === 'parcial') acc.pendientes += 1;
        return acc;
      },
      { total: 0, iva: 0, valor125: 0, pagadas: 0, pendientes: 0 }
    );
  }, [facturas]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (facturaData) => {
    try {
      if (selectedFactura) {
        await movimientosService.update(selectedFactura.id, {
          ...facturaData,
          tipo_movimiento: 'factura_venta',
        });
      } else {
        await movimientosService.create({
          ...facturaData,
          tipo_movimiento: 'factura_venta',
        });
      }
      handleCloseModal();
      loadFacturas();
    } catch (error) {
      console.error('Error guardando factura:', error);
      alert(`Error al guardar la factura: ${error.message || 'Revise los datos e intente nuevamente'}`);
    }
  };

  const handleOpenModal = (factura = null) => {
    setSelectedFactura(factura);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFactura(null);
  };

  const handleExport = () => {
    exportToExcel({
      fileName: 'facturas',
      sheetName: 'Facturas',
      columns: [
        { header: 'Fecha', value: (factura) => formatDate(factura.fecha) },
        { header: 'Factura', value: (factura) => factura.numero_factura || '' },
        { header: 'Cliente', value: (factura) => factura.cliente_proveedor || '' },
        { header: 'Descripcion', value: (factura) => factura.descripcion || '' },
        { header: 'Base', value: (factura) => factura.valor_base || factura.valor_total || 0 },
        { header: '% IVA', value: (factura) => getEffectiveIvaPercentage(factura) },
        { header: 'IVA', value: (factura) => getSumableIva(factura) },
        { header: '1.25%', value: (factura) => getValor125(factura) },
        { header: 'Total', value: (factura) => factura.valor_total || 0 },
        { header: 'Estado', value: (factura) => getEstadoLabel(factura.estado) },
      ],
      rows: facturas,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Facturas</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Facturas de venta registradas en Supabase</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button variant="outline" onClick={handleExport} disabled={loading || facturas.length === 0} className="shrink-0">
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button onClick={() => handleOpenModal()} className="shrink-0">
            <Plus size={16} className="mr-1 sm:mr-2" />
            Añadir factura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <StatCard icon={Receipt} label="Facturas" value={facturas.length} tone="blue" />
        <StatCard icon={DollarSign} label="Total facturado" value={formatCurrency(stats.total)} tone="green" />
        <StatCard icon={CheckCircle2} label="Pagadas" value={stats.pagadas} tone="emerald" />
        <StatCard icon={Clock} label="Pendientes" value={stats.pendientes} tone="amber" />
        <StatCard icon={DollarSign} label="1.25%" value={formatCurrency(stats.valor125)} tone="slate" />
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="busqueda"
                value={filtros.busqueda}
                onChange={handleFilterChange}
                placeholder="Buscar factura o cliente..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <input name="fechaInicio" type="date" value={filtros.fechaInicio} onChange={handleFilterChange} className="px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            <input name="fechaFin" type="date" value={filtros.fechaFin} onChange={handleFilterChange} className="px-3 py-2 text-sm border border-slate-300 rounded-lg" />
            <select name="estado" value={filtros.estado} onChange={handleFilterChange} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
              <option value="">Todos los estados</option>
              <option value="cartera">Cartera (Pendientes y Parciales)</option>
              <option value="pagado">Pagado</option>
              <option value="anulado">Anulado</option>
            </select>
            <select name="ordenarPor" value={filtros.ordenarPor} onChange={handleFilterChange} className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white">
              <option value="fecha_desc">Más recientes primero</option>
              <option value="fecha_asc">Más antiguos primero</option>
              <option value="valor_total_desc">Mayor valor primero</option>
              <option value="valor_total_asc">Menor valor primero</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Factura</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">IVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">1.25%</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Cargando facturas...</td></tr>
              ) : facturas.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No hay facturas para mostrar</td></tr>
              ) : (
                facturas.map((factura) => (
                  <tr key={factura.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3"><span className="sm:hidden text-xs text-slate-500 mr-1">Fecha:</span>{formatDate(factura.fecha)}</td>
                    <td 
                      className="px-3 sm:px-4 py-3 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={() => handleOpenModal(factura)}
                    >
                      {factura.numero_factura || '-'}
                    </td>
                    <td 
                      className="px-3 sm:px-4 py-3 text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      onClick={() => handleOpenModal(factura)}
                    >
                      {factura.cliente_proveedor || factura.descripcion}
                    </td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-700">{getEffectiveIvaPercentage(factura)}% - {formatCurrency(getSumableIva(factura))}</td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right text-slate-700">{formatCurrency(getValor125(factura))}</td>
                    <td className="px-3 sm:px-4 py-3 sm:text-right font-semibold text-slate-800">{formatCurrency(factura.valor_total)}</td>
                    <td className="px-3 sm:px-4 py-3"><Badge className={getEstadoColor(factura.estado)}>{getEstadoLabel(factura.estado)}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={selectedFactura ? "Detalles de la factura" : "Añadir factura"} size="lg">
        <MovimientoForm
          movimiento={selectedFactura}
          initialData={{ tipo_movimiento: 'factura_venta', incluye_iva: true, porcentaje_iva: 19, estado: 'pendiente' }}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`p-2 rounded-lg shrink-0 ${tones[tone]}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm text-slate-600">{label}</p>
          <p className="text-base sm:text-xl font-bold text-slate-800 truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
