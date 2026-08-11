import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading" aria-live="polite"><span className="auth-spinner" /><p>Abriendo NosVamos...</p></div>;
  }

  if (!session) {
    return <Navigate to="/ingresar" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
