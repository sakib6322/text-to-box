import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import type { PermissionGroup } from "@/lib/permissions";

export type AccessUser = {
  id: string;
  email: string;
  role: "admin" | "staff" | "user";
  display_name?: string | null;
  permissions: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

async function parseJson<T>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text().catch(() => "");
  let data = {} as T & { error?: string };
  try {
    data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  } catch {
    if (res.status === 404) {
      throw new Error(
        "Access API not found — restart the dev server (npm run dev) so the API loads the latest routes.",
      );
    }
    throw new Error(text?.slice(0, 200) || res.statusText || "Request failed");
  }
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data;
}

export async function fetchPermissionGroups(): Promise<{ groups: PermissionGroup[] }> {
  const res = await fetch(apiUrl("/api/settings/access/permissions"));
  return parseJson(res);
}

export async function fetchAccessUsers(): Promise<{ users: AccessUser[] }> {
  const res = await fetch(apiUrl("/api/settings/access/users"), { headers: getAuthHeaders() });
  return parseJson(res);
}

export async function createAccessUser(body: {
  email: string;
  password: string;
  permissions: string[];
  displayName?: string;
}) {
  const res = await fetch(apiUrl("/api/settings/access/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return parseJson<{ user: AccessUser }>(res);
}

export async function updateAccessUser(
  id: string,
  body: { email?: string; password?: string; permissions?: string[]; displayName?: string },
) {
  const res = await fetch(apiUrl(`/api/settings/access/users/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  return parseJson<{ user: AccessUser }>(res);
}

export async function deleteAccessUser(id: string) {
  const res = await fetch(apiUrl(`/api/settings/access/users/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}
