/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** e.g. http://localhost:8787 — forwards /api/* to Express when proxy is unavailable */
  readonly VITE_API_URL?: string;
}
