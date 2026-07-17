import { getAuthHeaders } from "@/lib/auth";

/**
 * Optional direct API origin when the Vite proxy is not used (e.g. `vite` alone, or tooling that does not proxy /api).
 * Set in `.env`: VITE_API_URL=http://localhost:8787 (no trailing slash)
 */
export function apiUrl(path: string): string {
  const raw = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_URL : "";
  const base = typeof raw === "string" ? raw.trim().replace(/\/$/, "") : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** Merge Authorization header from the current session into a fetch init. */
export function withAuthHeaders(init: RequestInit = {}): RequestInit {
  const auth = getAuthHeaders();
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(auth)) {
    if (value && !headers.has(key)) headers.set(key, value);
  }
  return { ...init, headers };
}

/** Authenticated fetch — always sends Bearer token when logged in. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), withAuthHeaders(init ?? {}));
}
