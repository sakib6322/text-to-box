import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import { hasPermission } from "@/lib/auth";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("@/pages/Index"));

/** Home (Concept Builder) requires home.view permission. */
export default function RoleBasedHome() {
  if (!hasPermission("home.view")) return <Navigate to="/my-courses" replace />;
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      }
    >
      <Index />
    </Suspense>
  );
}
