import { apiUrl } from "@/lib/apiBase";
import {
  canAccessAdminArea,
  firstAllowedAdminPath,
  hasAnyPermissionKey,
  hasPermissionKey,
  resolvePermissions,
} from "@/lib/permissions";

const AUTH_KEY = "pgdiary_auth";

export type UserRole = "admin" | "staff" | "user";

export type AuthSession = {
  token: string;
  email: string;
  role: UserRole;
  userId: string;
  permissions: string[];
  loggedInAt: string;
  expiresAt?: string;
};

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email || !parsed?.token) return null;
    parsed.permissions = resolvePermissions(parsed.role, parsed.permissions);
    return parsed;
  } catch {
    return null;
  }
}

export function getAuthHeaders(): Record<string, string> {
  const session = getSession();
  if (!session?.token) return {};
  return { Authorization: `Bearer ${session.token}` };
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}

export function isStaff(): boolean {
  return getSession()?.role === "staff";
}

export function isUser(): boolean {
  return getSession()?.role === "user";
}

export function getPermissions(): string[] {
  const s = getSession();
  if (!s) return [];
  return s.permissions;
}

export function hasPermission(key: string): boolean {
  const s = getSession();
  if (!s) return false;
  return hasPermissionKey(s.role, s.permissions, key);
}

export function hasAnyPermission(keys: string[]): boolean {
  const s = getSession();
  if (!s) return false;
  return hasAnyPermissionKey(s.role, s.permissions, keys);
}

export function canAccessAdmin(): boolean {
  const s = getSession();
  if (!s) return false;
  return canAccessAdminArea(s.role, s.permissions);
}

export function getDefaultLandingPath(): string {
  const s = getSession();
  if (!s) return "/login";
  if (canAccessAdminArea(s.role, s.permissions)) {
    if (hasPermission("home.view")) return "/";
    return firstAllowedAdminPath(s.role, s.permissions);
  }
  return "/study/progress";
}

function saveSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function sessionFromLogin(data: {
  token: string;
  user: { id: string; email: string; role: UserRole; permissions?: string[] | null };
  expiresAt?: string;
}): AuthSession {
  const role = data.user.role;
  const permissions = resolvePermissions(role, data.user.permissions ?? []);
  return {
    token: data.token,
    email: data.user.email,
    role,
    userId: data.user.id,
    permissions,
    loggedInAt: new Date().toISOString(),
    expiresAt: data.expiresAt,
  };
}

export async function login(email: string, password: string, mode: "admin" | "user" = "user"): Promise<AuthSession> {
  const resp = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, mode }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    token?: string;
    user?: { id: string; email: string; role: UserRole; permissions?: string[] | null };
    expiresAt?: string;
    error?: string;
  };
  if (!resp.ok) throw new Error(data.error ?? "Login failed");
  if (!data.token || !data.user) throw new Error("Invalid login response");

  const session = sessionFromLogin({
    token: data.token,
    user: data.user,
    expiresAt: data.expiresAt,
  });
  saveSession(session);
  return session;
}

export async function register(email: string, password: string): Promise<AuthSession> {
  const resp = await fetch(apiUrl("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    token?: string;
    user?: { id: string; email: string; role: UserRole; permissions?: string[] | null };
    expiresAt?: string;
    error?: string;
  };
  if (!resp.ok) throw new Error(data.error ?? "Registration failed");
  if (!data.token || !data.user) throw new Error("Invalid registration response");

  const session = sessionFromLogin({
    token: data.token,
    user: data.user,
    expiresAt: data.expiresAt,
  });
  saveSession(session);
  return session;
}

export async function logout(): Promise<void> {
  const session = getSession();
  if (session?.token) {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(AUTH_KEY);
}

export async function fetchCurrentUser(): Promise<AuthSession | null> {
  const session = getSession();
  if (!session?.token) return null;
  try {
    const resp = await fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (!resp.ok) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    const data = (await resp.json()) as {
      user?: { id: string; email: string; role: UserRole; permissions?: string[] };
    };
    if (!data.user) return null;
    const updated: AuthSession = {
      ...session,
      email: data.user.email,
      role: data.user.role,
      userId: data.user.id,
      permissions: resolvePermissions(data.user.role, data.user.permissions),
    };
    saveSession(updated);
    return updated;
  } catch {
    return session;
  }
}
