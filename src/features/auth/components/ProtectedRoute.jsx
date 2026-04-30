import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthProvider";

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-2">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        <p className="text-sm text-slate-300">Validando sesión...</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
