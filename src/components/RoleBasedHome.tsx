import { Navigate } from "react-router-dom";
import { hasPermission } from "@/lib/auth";
import { lazyPage } from "@/components/lazyPage";

const Index = lazyPage(() => import("@/pages/Index"));

/** Home (Concept Builder) requires home.view permission. */
export default function RoleBasedHome() {
  if (!hasPermission("home.view")) return <Navigate to="/my-courses" replace />;
  return <Index />;
}
