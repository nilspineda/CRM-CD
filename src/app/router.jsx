// filepath: src/app/router.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import CuentasPage from '../features/cuentas/pages/CuentasPage';
import MovimientosPage from '../features/movimientos/pages/MovimientosPage';
import DashboardHome from '../features/dashboard/pages/DashboardHome';
import FacturasPage from '../features/facturas/pages/FacturasPage';
import IvaPage from '../features/iva/pages/IvaPage';
import ReportesPage from '../features/reportes/pages/ReportesPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardHome />,
      },
      {
        path: 'cuentas',
        element: <CuentasPage />,
      },
      {
        path: 'movimientos',
        element: <MovimientosPage />,
      },
      {
        path: 'facturas',
        element: <FacturasPage />,
      },
      {
        path: 'iva',
        element: <IvaPage />,
      },
      {
        path: 'reportes',
        element: <ReportesPage />,
      },
    ],
  },
]);

export default router;
