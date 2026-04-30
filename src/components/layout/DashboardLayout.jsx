import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  Users,
  ArrowLeftRight,
  Receipt,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  Menu,
  User,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import Button from "../ui/Button";
import { useAuth } from "../../features/auth/AuthProvider";
import { canAccessModule } from "../../features/auth/permissions";

const navItems = [
  {
    moduleKey: "dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Resumen general",
  },
  {
    moduleKey: "cuentas",
    path: "/cuentas",
    icon: Wallet,
    label: "Cuentas",
    description: "Gestion de cuentas",
  },
  {
    moduleKey: "clientes",
    path: "/clientes",
    icon: Users,
    label: "Clientes",
    description: "NIT y contactos",
  },
  {
    moduleKey: "movimientos",
    path: "/movimientos",
    icon: ArrowLeftRight,
    label: "Movimientos",
    description: "Ingresos y egresos",
  },
  {
    moduleKey: "facturas",
    path: "/facturas",
    icon: Receipt,
    label: "Facturas",
    description: "Facturacion",
  },
  {
    moduleKey: "iva",
    path: "/iva",
    icon: FileText,
    label: "IVA",
    description: "Control de IVA",
  },
  {
    moduleKey: "reportes",
    path: "/reportes",
    icon: BarChart3,
    label: "Reportes",
    description: "Informes",
  },
  {
    moduleKey: "usuarios",
    path: "/usuarios",
    icon: ShieldCheck,
    label: "Usuarios",
    description: "Roles y permisos",
  },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { access, user, signOut } = useAuth();
  const currentPage = navItems.find((item) => item.path === location.pathname);
  const visibleNavItems = navItems.filter((item) =>
    canAccessModule(access, item.moduleKey),
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-[min(18rem,86vw)] bg-linear-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-700/50">
          <span className="font-semibold">Menu</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-slate-700"
            aria-label="Cerrar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-700/50">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold">CD</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-md font-bold truncate">
              {access.setSidebarOpen}
            </h1>
            <p className="text-xs text-slate-400">Sistema Administrativo</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `
                group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-gradient-to-r from-amber-600/20 to-transparent text-white border-l-2 border-amber-500"
                    : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                }
              `}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  location.pathname === item.path
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-700/50 text-slate-400 group-hover:text-white"
                }`}
              >
                <item.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                <p className="text-xs text-slate-400 truncate">
                  {item.description}
                </p>
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{access.roleLabel}</p>
              <p className="text-xs text-slate-400 truncate">
                {user?.email || "Usuario autenticado"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72 min-h-screen flex flex-col min-w-0">
        <header className="h-16 sm:h-20 bg-white dark:bg-slate-900 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700 flex items-center justify-between gap-3 px-3 sm:px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              className="lg:hidden p-2 sm:p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {currentPage?.label || "Dashboard"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                {currentPage?.description || "Resumen general"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                Sistema activo
              </span>
            </div>
            <button
              className="p-2 sm:p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Configuracion"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-5 lg:p-6 w-full min-w-0">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">
          Elaborado por{" "}
          <a
            href="https://nilspineda.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 underline decoration-amber-300 dark:decoration-amber-700 underline-offset-2"
          >
            Nils pineda
          </a>
        </footer>
      </div>
    </div>
  );
}
