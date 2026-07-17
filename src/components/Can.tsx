import type { ReactNode } from "react";
import { hasPermission } from "@/lib/auth";

type Props = {
  permission: string;
  children: ReactNode;
  /** hide (default) or disable wrapper */
  mode?: "hide" | "disable";
  fallback?: ReactNode;
};

export function Can({ permission, children, mode = "hide", fallback = null }: Props) {
  const allowed = hasPermission(permission);
  if (allowed) return <>{children}</>;
  if (mode === "hide") return <>{fallback}</>;
  return (
    <div className="pointer-events-none opacity-50 select-none" aria-disabled title="No permission">
      {children}
    </div>
  );
}

export function useCan(permission: string) {
  return hasPermission(permission);
}
