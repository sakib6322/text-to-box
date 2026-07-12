import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, isAdmin, type UserRole } from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  /** When "admin", only administrators may access. Omit for any logged-in user (admin included). */
  role?: UserRole | "admin-only";
};

export function ProtectedRoute({ children, role }: Props) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role === "admin" || role === "admin-only") {
    if (!isAdmin()) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
}
