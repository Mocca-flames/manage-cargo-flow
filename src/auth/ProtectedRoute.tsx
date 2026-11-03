import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./context/AuthContext";
import { can } from "./permissions";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="center-screen">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!can.usePortal(user.staff_role)) {
    return <div className="center-screen"><div className="card auth-card"><h1>Access denied</h1><p className="muted">This portal is for admin and director accounts only.</p></div></div>;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
