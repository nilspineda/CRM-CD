const linkweb = import.meta.env.VITE_LINK_WEB || window.location.href;

const whatsappLink = `https://wa.me/573167195500?text=${encodeURIComponent(
  `Hola, tengo un error con la pagina:\n${linkweb}`,
)}`;

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
import OfflineIndicator from "../ui/OfflineIndicator";
import InstallPrompt from "../ui/InstallPrompt";

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
    moduleKey: "cartera",
    path: "/cartera",
    icon: Receipt, // We can use another icon like AlertCircle or Wallet
    label: "Cartera",
    description: "Cuentas por cobrar",
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
        <header className="h-14 md:h-16 lg:h-20 bg-white dark:bg-slate-900 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700 flex items-center justify-between gap-2 md:gap-3 px-3 md:px-6 sticky top-0 z-30 shrink-0 pt-safe">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              className="lg:hidden p-2 md:p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0 touch-target flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
                {currentPage?.label || "Dashboard"}
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hidden md:block truncate">
                {currentPage?.description || "Resumen general"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
              <div className="hidden md:flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  Reportar Fallos{" "}
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path>
                  </svg>
                </span>
              </div>
            </a>
          </div>
        </header>

        <main className="flex-1 p-3 md:p-4 lg:p-5 xl:p-6 w-full min-w-0 mobile-scroll">
          <Outlet />
        </main>

        <OfflineIndicator />
        <InstallPrompt />

        <footer className="border-t border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pb-safe text-center text-sm text-slate-600 dark:text-slate-400">
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
