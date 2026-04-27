// filepath: src/features/movimientos/pages/MovimientosPage.jsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Search, TrendingUp, TrendingDown, DollarSign, FileText, X, Download } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { movimientosService } from '../services/movimientosService';
import { formatCurrency, formatDate, getTipoMovimientoLabel, getEstadoLabel, getEstadoColor, getDateRange, getEffectiveIvaPercentage, getSumableIva, getValor125, isIngreso } from '../../../lib/utils';
import { exportToExcel } from '../../../lib/exportExcel';
import MovimientoForm from '../components/MovimientoForm';

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [movimientoEditando, setMovimientoEditando] = useState(null);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    cuentaId: '',
    tipoMovimiento: '',
    estado: '',
    busqueda: '',
    ordenarPor: 'fecha_desc',
  });
  const [stats, setStats] = useState({ ingresos: 0, egresos: 0, iva: 0, valor125: 0, facturas: 0 });

  useEffect(() => {
    loadMovimientos();
  }, [filtros]);

  const loadMovimientos = async () => {
    try {
      setLoading(true);
      const data = await movimientosService.getAll(filtros);
      setMovimientos(data);

      const statsCalc = { ingresos: 0, egresos: 0, iva: 0, valor125: 0, facturas: 0 };
      data.forEach(m => {
        if (['ingreso', 'factura_venta'].includes(m.tipo_movimiento) && m.estado !== 'anulado') {
          statsCalc.ingresos += m.valor_total || 0;
        } else if (['egreso', 'gasto', 'compra', 'pago'].includes(m.tipo_movimiento) && m.estado !== 'anulado') {
          statsCalc.egresos += m.valor_total || 0;
        }
        statsCalc.iva += getSumableIva(m);
        if (isIngreso(m.tipo_movimiento) && m.estado !== 'anulado') statsCalc.valor125 += getValor125(m);
        if (m.tipo_movimiento === 'factura_venta') statsCalc.facturas += 1;
      });
      setStats(statsCalc);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (movimientoData) => {
    try {
      if (movimientoEditando) {
        await movimientosService.update(movimientoEditando.id, movimientoData);
      } else {
        await movimientosService.create(movimientoData);
      }
      setModalOpen(false);
      setMovimientoEditando(null);
      loadMovimientos();
    } catch (error) {
      console.error('Error guardando movimiento:', error);
      alert(`Error al guardar el movimiento: ${error.message || 'Revise los datos e intente nuevamente'}`);
    }
  };

  const handleEdit = (movimiento) => {
    setMovimientoEditando(movimiento);
    setModalOpen(true);
  };

  const handleAnular = async (movimiento) => {
    if (!confirm(`¿Está seguro de ANULAR el movimiento "${movimiento.descripcion}"?`)) return;
    try {
      await movimientosService.anular(movimiento.id);
      loadMovimientos();
    } catch (error) {
      console.error('Error anulando movimiento:', error);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const quickDateFilter = (type) => {
    const range = getDateRange(type);
    if (range.start && range.end) {
      setFiltros(prev => ({
        ...prev,
        fechaInicio: range.start.toISOString().split('T')[0],
        fechaFin: range.end.toISOString().split('T')[0],
      }));
    }
  };

  const clearFilters = () => {
    setFiltros({ fechaInicio: '', fechaFin: '', cuentaId: '', tipoMovimiento: '', estado: '', busqueda: '', ordenarPor: 'fecha_desc' });
  };

  const getTipoColor = (tipo) => {
    const colors = {
      ingreso: 'bg-green-100 text-green-700',
      egreso: 'bg-red-100 text-red-700',
      factura_venta: 'bg-blue-100 text-blue-700',
      gasto: 'bg-orange-100 text-orange-700',
      compra: 'bg-purple-100 text-purple-700',
      pago: 'bg-amber-100 text-amber-700',
    };
    return colors[tipo] || 'bg-slate-100 text-slate-700';
  };

  const utilidad = stats.ingresos - stats.egresos - stats.valor125;

  const handleExport = () => {
    exportToExcel({
      fileName: 'movimientos-financieros',
      sheetName: 'Movimientos',
      columns: [
        { header: 'Fecha', value: (mov) => formatDate(mov.fecha) },
        { header: 'Factura', value: (mov) => mov.numero_factura || '' },
        { header: 'Tipo', value: (mov) => getTipoMovimientoLabel(mov.tipo_movimiento) },
        { header: 'Descripcion', value: (mov) => mov.descripcion || '' },
        { header: 'Cliente/Proveedor', value: (mov) => mov.cliente_proveedor || '' },
        { header: 'Base', value: (mov) => mov.valor_base || mov.valor_total || 0 },
        { header: '% IVA', value: (mov) => getEffectiveIvaPercentage(mov) },
        { header: 'IVA', value: (mov) => getSumableIva(mov) },
        { header: '1.25%', value: (mov) => getValor125(mov) },
        { header: 'Total', value: (mov) => mov.valor_total || 0 },
        { header: 'Estado', value: (mov) => getEstadoLabel(mov.estado) },
        { header: 'Metodo de pago', value: (mov) => mov.metodo_pago || '' },
      ],
      rows: movimientos,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Movimientos Financieros</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Registra ingresos, egresos y facturas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button variant="outline" onClick={handleExport} disabled={loading || movimientos.length === 0} className="shrink-0">
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button onClick={() => { setMovimientoEditando(null); setModalOpen(true); }} className="shrink-0">
            <Plus size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Movimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg shrink-0">
                <TrendingUp className="text-green-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Ingresos</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">{formatCurrency(stats.ingresos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg shrink-0">
                <TrendingDown className="text-red-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Egresos</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">{formatCurrency(stats.egresos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${utilidad >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                {utilidad >= 0 ? (
                  <TrendingUp className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <TrendingDown className="text-orange-600 w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">Utilidad</p>
                <p className={`text-sm sm:text-lg font-bold truncate ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(utilidad)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg shrink-0">
                <DollarSign className="text-purple-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">IVA</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">{formatCurrency(stats.iva)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg shrink-0">
                <DollarSign className="text-amber-600 w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600">ICA 1.25%</p>
                <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">{formatCurrency(stats.valor125)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            {/* Filtros rápidos */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button onClick={() => quickDateFilter('today')} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Hoy</button>
              <button onClick={() => quickDateFilter('week')} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Semana</button>
              <button onClick={() => quickDateFilter('month')} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Mes</button>
              <button onClick={() => quickDateFilter('prevMonth')} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Mes ant.</button>
              <button onClick={() => quickDateFilter('year')} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">Año</button>
              <button onClick={clearFilters} className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-lg">Limpiar</button>
            </div>

            {/* Filtros avanzados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  name="busqueda"
                  placeholder="Buscar..."
                  value={filtros.busqueda}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <input
                type="date"
                name="fechaInicio"
                value={filtros.fechaInicio}
                onChange={handleFilterChange}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Desde"
              />
              <input
                type="date"
                name="fechaFin"
                value={filtros.fechaFin}
                onChange={handleFilterChange}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Hasta"
              />
              <select
                name="tipoMovimiento"
                value={filtros.tipoMovimiento}
                onChange={handleFilterChange}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">Todos</option>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
                <option value="factura_venta">Factura</option>
                <option value="gasto">Gasto</option>
                <option value="compra">Compra</option>
                <option value="pago">Pago</option>
              </select>
              <select
                name="ordenarPor"
                value={filtros.ordenarPor}
                onChange={handleFilterChange}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="fecha_desc">Más recientes primero</option>
                <option value="fecha_asc">Más antiguos primero</option>
                <option value="valor_total_desc">Mayor valor primero</option>
                <option value="valor_total_asc">Menor valor primero</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de movimientos */}
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden md:table-header-group">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Factura</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Descripción</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">IVA</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">1.25%</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">Cargando...</td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">No hay movimientos</td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-4 py-3">
                      <span className="md:hidden text-xs text-slate-500 mr-1">Fecha:</span>
                      <span className="text-sm text-slate-800">{formatDate(mov.fecha)}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="md:hidden text-xs text-slate-500 mr-1">Factura:</span>
                      <span className="text-sm text-slate-600">{mov.numero_factura || '-'}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTipoColor(mov.tipo_movimiento)}`}>
                        {getTipoMovimientoLabel(mov.tipo_movimiento)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 max-w-[150px] sm:max-w-none">
                      <p className="text-sm text-slate-800 truncate">{mov.descripcion}</p>
                      {mov.cliente_proveedor && <p className="text-xs text-slate-500 hidden sm:block">{mov.cliente_proveedor}</p>}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <span className="md:hidden text-xs text-slate-500 mr-1">Valor:</span>
                      <span className="text-sm font-medium text-slate-800">{formatCurrency(mov.valor_total)}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <span className="md:hidden text-xs text-slate-500 mr-1">IVA:</span>
                      <span className="text-sm text-slate-600">{getEffectiveIvaPercentage(mov)}% - {formatCurrency(getSumableIva(mov))}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <span className="md:hidden text-xs text-slate-500 mr-1">1.25%:</span>
                      <span className="text-sm text-slate-600">{formatCurrency(getValor125(mov))}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(mov.estado)}`}>
                        {getEstadoLabel(mov.estado)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(mov)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        {mov.estado !== 'anulado' && (
                          <button onClick={() => handleAnular(mov)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Anular">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold hidden sm:table-footer-group">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-right">TOTALES:</td>
                <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(stats.ingresos + stats.egresos)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(stats.iva)}</td>
                <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(stats.valor125)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setMovimientoEditando(null); }}
        title={movimientoEditando ? 'Editar Movimiento' : 'Nuevo Movimiento'}
        size="lg"
      >
        <MovimientoForm
          movimiento={movimientoEditando}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setMovimientoEditando(null); }}
        />
      </Modal>
    </div>
  );
}
