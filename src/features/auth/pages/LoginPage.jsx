import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogIn, ShieldCheck, Mail } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { useAuth } from "../AuthProvider";

export default function LoginPage() {
  const { signIn, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [from, loading, navigate, user]);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          <p className="text-sm text-slate-300">Preparando acceso...</p>
        </div>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      await signIn({ email: form.email, password: form.password });
      navigate(from, { replace: true });
    } catch (authError) {
      setError(authError.message || "No se pudo iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
      <div className="relative min-h-screen grid lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:flex flex-col justify-between p-10 xl:p-16">
          <div className="space-y-8 max-w-xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
              <ShieldCheck size={16} />
              Acceso privado por invitación
            </div>
            <div className="space-y-5">
              <h1 className="text-5xl xl:text-6xl font-black tracking-tight leading-tight">
                CRM con control de acceso real.
              </h1>
              <p className="text-lg text-slate-300 max-w-lg leading-8">
                Inicia sesión para trabajar según tu rol. SuperAdmin administra
                todo. Auxiliar opera clientes, movimientos y estados de facturas
                según los permisos habilitados.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Roles</p>
              <p className="mt-1 text-xl font-semibold">
                SuperAdmin / Auxiliar
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Alta</p>
              <p className="mt-1 text-xl font-semibold">Invitación del admin</p>
            </div>
          </div>
        </section>

        <section className="relative flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md rounded-4xl border border-white/10 bg-white/95 text-slate-900 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl overflow-hidden">
            <div className="p-8 sm:p-10 space-y-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <LogIn size={14} />
                  Acceso al sistema
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-950">
                    Bienvenido
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Ingresa con tu correo autorizado para continuar.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Correo"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@empresa.com"
                  autoComplete="email"
                  required
                />
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="********"
                  autoComplete="current-password"
                  required
                />

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 text-base"
                >
                  {loading ? "Validando..." : "Entrar"}
                </Button>
              </form>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Mail size={16} />
                  Invitaciones
                </div>
                <p>
                  El alta de usuarios se gestiona desde el SuperAdmin. Este
                  formulario solo permite acceder a cuentas ya creadas o
                  invitadas.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
