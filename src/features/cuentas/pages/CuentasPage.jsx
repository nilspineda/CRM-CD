// filepath: src/features/cuentas/pages/CuentasPage.jsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wallet, Search, TrendingUp, Download } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Badge from '../../../components/ui/Badge';
import { cuentasService } from '../services/cuentasService';
import { formatCurrency, getTipoCuentaLabel } from '../../../lib/utils';
import { exportToExcel } from '../../../lib/exportExcel';
import CuentaForm from '../components/CuentaForm';

export default function CuentasPage() {
  const [cuentas, setCuentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cuentaEditando, setCuentaEditando] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    loadCuentas();
  }, []);

  const loadCuentas = async () => {
    try {
      setLoading(true);
      const data = await cuentasService.getAll();
      setCuentas(data);
    } catch (error) {
      console.error('Error cargando cuentas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (cuentaData) => {
    try {
      if (cuentaEditando) {
        await cuentasService.update(cuentaEditando.id, cuentaData);
      } else {
        await cuentasService.create(cuentaData);
      }
      setModalOpen(false);
      setCuentaEditando(null);
      loadCuentas();
    } catch (error) {
      console.error('Error guardando cuenta:', error);
      alert('Error al guardar la cuenta');
    }
  };

  const handleEdit = (cuenta) => {
    setCuentaEditando(cuenta);
    setModalOpen(true);
  };

  const handleDelete = async (cuenta) => {
    if (!confirm(`¿Está seguro de inactivar la cuenta "${cuenta.nombre}"?`)) {
      return;
    }
    try {
      await cuentasService.delete(cuenta.id);
      loadCuentas();
    } catch (error) {
      console.error('Error eliminando cuenta:', error);
    }
  };

  const handleActivate = async (cuenta) => {
    try {
      await cuentasService.activate(cuenta.id);
      loadCuentas();
    } catch (error) {
      console.error('Error activando cuenta:', error);
    }
  };

  const cuentasFiltradas = cuentas.filter(cuenta => {
    const matchesSearch = cuenta.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filtroEstado === 'todos' 
      ? true 
      : filtroEstado === 'activa' 
        ? cuenta.estado 
        : !cuenta.estado;
    return matchesSearch && matchesEstado;
  });

  const cuentasActivas = cuentas.filter(c => c.estado);
  const saldoTotal = cuentasActivas.reduce((sum, c) => sum + (c.saldo_actual || 0), 0);

  const getTipoColor = (tipo) => {
    const colors = {
      caja: 'bg-purple-100 text-purple-700',
      banco: 'bg-blue-100 text-blue-700',
      billetera_digital: 'bg-green-100 text-green-700',
      ahorro: 'bg-yellow-100 text-yellow-700',
      efectivo: 'bg-orange-100 text-orange-700',
      otra: 'bg-slate-100 text-slate-700',
    };
    return colors[tipo] || colors.otra;
  };

  const handleExport = () => {
    exportToExcel({
      fileName: 'cuentas-financieras',
      sheetName: 'Cuentas',
      columns: [
        { header: 'Nombre', value: (cuenta) => cuenta.nombre },
        { header: 'Tipo', value: (cuenta) => getTipoCuentaLabel(cuenta.tipo_cuenta) },
        { header: 'Saldo inicial', value: (cuenta) => cuenta.saldo_inicial || 0 },
        { header: 'Saldo actual', value: (cuenta) => cuenta.saldo_actual || 0 },
        { header: 'Estado', value: (cuenta) => (cuenta.estado ? 'Activa' : 'Inactiva') },
        { header: 'Descripcion', value: (cuenta) => cuenta.descripcion || '' },
      ],
      rows: cuentasFiltradas,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Cuentas Financieras</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Administra tus cuentas bancarias, cajas y billeteras</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button variant="outline" onClick={handleExport} disabled={loading || cuentasFiltradas.length === 0} className="shrink-0">
            <Download size={16} className="mr-1 sm:mr-2" />
            Excel
          </Button>
          <Button onClick={() => { setCuentaEditando(null); setModalOpen(true); }} className="shrink-0">
            <Plus size={16} className="mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Nueva Cuenta</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg shrink-0">
              <Wallet className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600">Total Cuentas</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{cuentasActivas.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg shrink-0">
              <TrendingUp className="text-green-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600">Saldo Total</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{formatCurrency(saldoTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-slate-100 rounded-lg shrink-0">
              <Wallet className="text-slate-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-slate-600">Inactivas</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{cuentas.length - cuentasActivas.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="w-full">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cuentas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white min-w-[140px]"
            >
              <option value="todos">Todos</option>
              <option value="activa">Activas</option>
              <option value="inactiva">Inactivas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de cuentas */}
      <Card className="w-full overflow-hidden">
        <div className="overflow-x-auto mobile-card-table">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 hidden sm:table-header-group">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nombre</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Saldo Inicial</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Saldo Actual</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Estado</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-slate-500">
                    Cargando...
                  </td>
                </tr>
              ) : cuentasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 sm:px-6 py-12 text-center text-slate-500">
                    No hay cuentas que mostrar
                  </td>
                </tr>
              ) : (
                cuentasFiltradas.map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-slate-50">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="sm:hidden text-xs text-slate-500 mb-1">Nombre</div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm sm:text-base">{cuenta.nombre}</p>
                        {cuenta.descripcion && (
                          <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">{cuenta.descripcion}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoColor(cuenta.tipo_cuenta)}`}>
                        <span className="sm:hidden mr-1">📁</span>
                        {getTipoCuentaLabel(cuenta.tipo_cuenta)}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="sm:hidden text-xs text-slate-500 mr-1">Inicial:</span>
                      <span className="text-sm sm:text-base text-slate-800">{formatCurrency(cuenta.saldo_inicial)}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className="sm:hidden text-xs text-slate-500 mr-1">Actual:</span>
                      <span className="text-sm sm:text-base font-semibold text-slate-800">{formatCurrency(cuenta.saldo_actual)}</span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <Badge variant={cuenta.estado ? 'success' : 'default'}>
                        {cuenta.estado ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(cuenta)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {cuenta.estado ? (
                          <button
                            onClick={() => handleDelete(cuenta)}
                            className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Inactivar"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(cuenta)}
                            className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Activar"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal para crear/editar cuenta */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setCuentaEditando(null); }}
        title={cuentaEditando ? 'Editar Cuenta' : 'Nueva Cuenta'}
        size="md"
      >
        <CuentaForm
          cuenta={cuentaEditando}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setCuentaEditando(null); }}
        />
      </Modal>
    </div>
  );
}
