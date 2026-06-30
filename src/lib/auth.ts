const AUTH_KEY = "pgdiary_auth";

/** Bootstrap login for first-time / dev access */
export const DEFAULT_LOGIN = {
  email: "abc@gmail.com",
  password: "abc",
} as const;

export type AuthSession = {
  email: string;
  loggedInAt: string;
};

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function login(email: string, password: string): boolean {
  const e = email.trim().toLowerCase();
  const p = password;
  if (e === DEFAULT_LOGIN.email && p === DEFAULT_LOGIN.password) {
    const session: AuthSession = { email: e, loggedInAt: new Date().toISOString() };
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}
