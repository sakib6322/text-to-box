/** Per-browser dark mode — localStorage only, never saved to Appearance DB. */

export type LocalColorScheme = "system" | "dark";

export const LOCAL_COLOR_SCHEME_KEY = "pg-color-scheme";

const listeners = new Set<() => void>();

export function getLocalColorScheme(): LocalColorScheme {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(LOCAL_COLOR_SCHEME_KEY);
    if (v === "dark" || v === "system") return v;
  } catch {
    /* private mode */
  }
  return "system";
}

export function setLocalColorScheme(mode: LocalColorScheme) {
  try {
    localStorage.setItem(LOCAL_COLOR_SCHEME_KEY, mode);
  } catch {
    /* ignore */
  }
  for (const fn of listeners) fn();
}

export function subscribeLocalColorScheme(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function prefersDarkSystem(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveLocalIsDark(mode: LocalColorScheme = getLocalColorScheme()): boolean {
  if (mode === "dark") return true;
  return prefersDarkSystem();
}
