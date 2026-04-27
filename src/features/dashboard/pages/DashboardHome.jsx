// filepath: src/features/dashboard/pages/DashboardHome.jsx
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, FileText, DollarSign, Clock, ArrowRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { cuentasService } from '../../cuentas/services/cuentasService';
import { movimientosService } from '../../movimientos/services/movimientosService';
import { formatCurrency, formatDate, getDateRange, getTipoMovimientoLabel } from '../../../lib/utils';
import { exportToExcel } from '../../../lib/exportExcel';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState([]);
  const [stats, setStats] = useState({
    ingresos: 0,
    egresos: 0,
    iva: 0,
    facturas: 0,
    saldoTotal: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      const cuentasData = await cuentasService.getActivas();
      setCuentas(cuentasData);
      
      const movimientosData = await movimientosService.getAll({});
      setMovimientosRecientes(movimientosData.slice(0, 5));
      
      const mesActual = getDateRange('month');
      const statsData = await movimientosService.getEstadisticas(
        mesActual.start.toISOString().split('T')[0],
        mesActual.end.toISOString().split('T')[0]
      );
      
      const saldoTotal = cuentasData.reduce((sum, c) => sum + (c.saldo_actual || 0), 0);
      
      setStats({
        ...statsData,
        saldoTotal,
      });
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const utilidad = stats.ingresos - stats.egresos;

  const handleExport = () => {
    const rows = [
      { seccion: 'Indicadores', concepto: 'Ingresos del mes', detalle: '', valor: stats.ingresos },
      { seccion: 'Indicadores', concepto: 'Egresos del mes', detalle: '', valor: stats.egresos },
      { seccion: 'Indicadores', concepto: 'Utilidad del mes', detalle: '', valor: utilidad },
      { seccion: 'Indicadores', concepto: 'IVA por pagar', detalle: '', valor: stats.iva },
      { seccion: 'Indicadores', concepto: 'Saldo total disponible', detalle: '', valor: stats.saldoTotal },
      ...cuentas.map((cuenta) => ({
        seccion: 'Saldo por cuenta',
        concepto: cuenta.nombre,
        detalle: cuenta.tipo_cuenta?.replace('_', ' ') || '',
        valor: cuenta.saldo_actual || 0,
      })),
      ...movimientosRecientes.map((mov) => ({
        seccion: 'Movimientos recientes',
        concepto: mov.descripcion,
        detalle: `${formatDate(mov.fecha)} - ${getTipoMovimientoLabel(mov.tipo_movimiento)}`,
        valor: mov.valor_total || 0,
      })),
    ];

    exportToExcel({
      fileName: 'dashboard',
      sheetName: 'Dashboard',
      columns: [
        { header: 'Seccion', value: (row) => row.seccion },
        { header: 'Concepto', value: (row) => row.concepto },
        { header: 'Detalle', value: (row) => row.detalle },
        { header: 'Valor', value: (row) => row.valor },
      ],
      rows,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Resumen financiero del mes en curso</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="shrink-0">
          <Download size={16} className="mr-1 sm:mr-2" />
          Excel
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 w-full">
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg shrink-0">
              <TrendingUp className="text-green-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600">Ingresos del mes</p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 truncate">{formatCurrency(stats.ingresos)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-red-100 rounded-lg shrink-0">
              <TrendingDown className="text-red-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600">Egresos del mes</p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 truncate">{formatCurrency(stats.egresos)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${utilidad >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              {utilidad >= 0 ? (
                <TrendingUp className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <TrendingDown className="text-orange-600 w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600">Utilidad del mes</p>
              <p className={`text-base sm:text-xl lg:text-2xl font-bold truncate ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(utilidad)}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="w-full">
          <CardContent className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg shrink-0">
              <DollarSign className="text-purple-600 w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-slate-600">IVA por pagar</p>
              <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-800 truncate">{formatCurrency(stats.iva)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
        {/* Saldo por cuenta */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Saldo por Cuenta</CardTitle>
              <Link to="/cuentas" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {cuentas.length === 0 ? (
                <p className="text-slate-500 text-center py-4 text-sm">No hay cuentas registradas</p>
              ) : (
                cuentas.map((cuenta) => (
                  <div key={cuenta.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm sm:text-base truncate">{cuenta.nombre}</p>
                      <p className="text-xs sm:text-sm text-slate-500 capitalize">{cuenta.tipo_cuenta?.replace('_', ' ')}</p>
                    </div>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base shrink-0 ml-2">{formatCurrency(cuenta.saldo_actual)}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 text-sm sm:text-base">Total disponible</p>
                <p className="text-lg sm:text-xl font-bold text-slate-800">{formatCurrency(stats.saldoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movimientos recientes */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Últimos Movimientos</CardTitle>
              <Link to="/movimientos" className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {movimientosRecientes.length === 0 ? (
                <p className="text-slate-500 text-center py-4 text-sm">No hay movimientos registrados</p>
              ) : (
                movimientosRecientes.map((mov) => (
                  <div key={mov.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                        ['ingreso', 'factura_venta'].includes(mov.tipo_movimiento) 
                          ? 'bg-green-100' 
                          : 'bg-red-100'
                      }`}>
                        {['ingreso', 'factura_venta'].includes(mov.tipo_movimiento) ? (
                          <TrendingUp size={14} className="text-green-600" />
                        ) : (
                          <TrendingDown size={14} className="text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{mov.descripcion}</p>
                        <p className="text-xs text-slate-500">{formatDate(mov.fecha)}</p>
                      </div>
                    </div>
                    <p className={`font-semibold text-sm sm:text-base shrink-0 ml-2 ${
                      ['ingreso', 'factura_venta'].includes(mov.tipo_movimiento)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(mov.valor_total)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">Acciones rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <Link
              to="/movimientos"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <FileText size={20} className="text-blue-600" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">Nuevo Movimiento</span>
            </Link>
            <Link
              to="/cuentas"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Wallet size={20} className="text-green-600" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">Ver Cuentas</span>
            </Link>
            <Link
              to="/movimientos"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Clock size={20} className="text-orange-600" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">Pendientes</span>
            </Link>
            <Link
              to="/movimientos"
              className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <DollarSign size={20} className="text-purple-600" />
              <span className="text-xs sm:text-sm font-medium text-slate-700 text-center">Reporte IVA</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
