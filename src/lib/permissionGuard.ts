import { toast } from "sonner";
import { hasPermission } from "@/lib/auth";

export function guardPermission(permission: string, message?: string): boolean {
  if (hasPermission(permission)) return true;
  toast.error(message ?? "You don't have permission for this action");
  return false;
}

export function guardAnyPermission(permissions: string[], message?: string): boolean {
  if (permissions.some((p) => hasPermission(p))) return true;
  toast.error(message ?? "You don't have permission for this action");
  return false;
}

export function settingsLevelPerm(level: string, action: "view" | "add" | "edit" | "delete") {
  return `settings.${level}.${action}`;
}
