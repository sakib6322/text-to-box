import { Navigate, useLocation } from "react-router-dom";
import {
  canAccessAdmin,
  getDefaultLandingPath,
  hasPermission,
  isAuthenticated,
  type UserRole,
} from "@/lib/auth";

type Props = {
  children: React.ReactNode;
  /** Legacy: admin-only route guard */
  role?: UserRole | "admin-only";
  /** Require access to admin area (admin or staff with permissions) */
  adminArea?: boolean;
  /** Single permission key required */
  permission?: string;
};

export function ProtectedRoute({ children, role, adminArea, permission }: Props) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role === "admin" || role === "admin-only" || adminArea) {
    if (!canAccessAdmin()) {
      return <Navigate to={getDefaultLandingPath()} replace />;
    }
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={getDefaultLandingPath()} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
