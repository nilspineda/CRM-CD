import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";

const CuentasPage = lazy(() => import("../features/cuentas/pages/CuentasPage"));
const ClientesPage = lazy(() => import("../features/clientes/pages/ClientesPage"));
const MovimientosPage = lazy(() => import("../features/movimientos/pages/MovimientosPage"));
const DashboardHome = lazy(() => import("../features/dashboard/pages/DashboardHome"));
const FacturasPage = lazy(() => import("../features/facturas/pages/FacturasPage"));
const IvaPage = lazy(() => import("../features/iva/pages/IvaPage"));
const ReportesPage = lazy(() => import("../features/reportes/pages/ReportesPage"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500">Cargando...</div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <DashboardHome />
          </Suspense>
        ),
      },
      {
        path: "cuentas",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <CuentasPage />
          </Suspense>
        ),
      },
      {
        path: "clientes",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ClientesPage />
          </Suspense>
        ),
      },
      {
        path: "movimientos",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <MovimientosPage />
          </Suspense>
        ),
      },
      {
        path: "facturas",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <FacturasPage />
          </Suspense>
        ),
      },
      {
        path: "iva",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <IvaPage />
          </Suspense>
        ),
      },
      {
        path: "reportes",
        element: (
          <Suspense fallback={<LoadingFallback />}>
            <ReportesPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export default router;