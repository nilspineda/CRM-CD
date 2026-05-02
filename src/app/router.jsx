import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import PermissionRoute from "../features/auth/components/PermissionRoute";
import LoginPage from "../features/auth/pages/LoginPage";

const CuentasPage = lazy(() => import("../features/cuentas/pages/CuentasPage"));
const ClientesPage = lazy(
  () => import("../features/clientes/pages/ClientesPage"),
);
const MovimientosPage = lazy(
  () => import("../features/movimientos/pages/MovimientosPage"),
);
const DashboardHome = lazy(
  () => import("../features/dashboard/pages/DashboardHome"),
);
const FacturasPage = lazy(
  () => import("../features/facturas/pages/FacturasPage"),
);
const CarteraPage = lazy(
  () => import("../features/cartera/pages/CarteraPage"),
);
const IvaPage = lazy(() => import("../features/iva/pages/IvaPage"));
const ReportesPage = lazy(
  () => import("../features/reportes/pages/ReportesPage"),
);
const UsuariosPage = lazy(
  () => import("../features/usuarios/pages/UsuariosPage"),
);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500">Cargando...</div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: (
          <PermissionRoute moduleKey="dashboard">
            <Suspense fallback={<LoadingFallback />}>
              <DashboardHome />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "cuentas",
        element: (
          <PermissionRoute moduleKey="cuentas">
            <Suspense fallback={<LoadingFallback />}>
              <CuentasPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "clientes",
        element: (
          <PermissionRoute moduleKey="clientes">
            <Suspense fallback={<LoadingFallback />}>
              <ClientesPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "movimientos",
        element: (
          <PermissionRoute moduleKey="movimientos">
            <Suspense fallback={<LoadingFallback />}>
              <MovimientosPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "facturas",
        element: (
          <PermissionRoute moduleKey="facturas">
            <Suspense fallback={<LoadingFallback />}>
              <FacturasPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "cartera",
        element: (
          <PermissionRoute moduleKey="cartera">
            <Suspense fallback={<LoadingFallback />}>
              <CarteraPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "iva",
        element: (
          <PermissionRoute moduleKey="iva">
            <Suspense fallback={<LoadingFallback />}>
              <IvaPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "reportes",
        element: (
          <PermissionRoute moduleKey="reportes">
            <Suspense fallback={<LoadingFallback />}>
              <ReportesPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
      {
        path: "usuarios",
        element: (
          <PermissionRoute moduleKey="usuarios">
            <Suspense fallback={<LoadingFallback />}>
              <UsuariosPage />
            </Suspense>
          </PermissionRoute>
        ),
      },
    ],
  },
]);

export default router;
