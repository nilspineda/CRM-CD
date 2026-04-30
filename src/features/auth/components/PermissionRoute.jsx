import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button";
import { useAuth } from "../AuthProvider";
import { canAccessModule } from "../permissions";

function AccessDenied({ moduleKey }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 text-2xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">
            Acceso restringido
          </h3>
          <p className="text-slate-600">
            Tu usuario no tiene permisos para abrir el módulo {moduleKey}.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => navigate("/dashboard", { replace: true })}
        >
          Volver al dashboard
        </Button>
      </div>
    </div>
  );
}

export default function PermissionRoute({ moduleKey, children }) {
  const { access } = useAuth();

  if (!canAccessModule(access, moduleKey)) {
    return <AccessDenied moduleKey={moduleKey} />;
  }

  return children;
}
