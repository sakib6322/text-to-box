import { Navigate } from "react-router-dom";
import { isAdmin } from "@/lib/auth";
import Index from "@/pages/Index";

/** Home (Concept Builder) is admin-only; users land on My progress. */
export default function RoleBasedHome() {
  if (isAdmin()) return <Index />;
  return <Navigate to="/study/progress" replace />;
}
