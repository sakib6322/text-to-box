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
