/** Curated Gemini models for Settings → Gemini API */
export type GeminiModelOption = { id: string; label: string };

export const DEFAULT_PRIMARY_AI_MODEL = "gemini-3.5-flash";
export const DEFAULT_FALLBACK_AI_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_MATCH_AI_MODEL = "gemini-3.5-flash";

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (recommended · default)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (fast · fallback default)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];
