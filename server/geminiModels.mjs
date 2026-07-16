import { getAppSetting } from "./appSettings.mjs";

export const PRIMARY_AI_MODEL_KEY = "primary_ai_model";
export const FALLBACK_AI_MODEL_KEY = "fallback_ai_model";
export const MATCH_AI_MODEL_KEY = "match_ai_model";

export const DEFAULT_PRIMARY_AI_MODEL = "gemini-3.5-flash";
export const DEFAULT_FALLBACK_AI_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_MATCH_AI_MODEL = "gemini-3.5-flash";

/** Curated list shown in Settings → Gemini API */
export const GEMINI_MODEL_OPTIONS = [
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (recommended · default)" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (fast · fallback default)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

const ALLOWED = new Set(GEMINI_MODEL_OPTIONS.map((m) => m.id));

function sanitizeModel(value, fallback) {
  const v = String(value ?? "").trim();
  if (!v) return fallback;
  // Allow known IDs; also allow custom strings that look like gemini-* for flexibility
  if (ALLOWED.has(v) || /^gemini-[\w.-]+$/i.test(v)) return v;
  return fallback;
}

export function envPrimaryModel() {
  return sanitizeModel(process.env.PRIMARY_AI_MODEL, DEFAULT_PRIMARY_AI_MODEL);
}

export function envFallbackModel() {
  return sanitizeModel(process.env.FALLBACK_AI_MODEL, DEFAULT_FALLBACK_AI_MODEL);
}

export async function getGeminiModelSettings(db) {
  const [primaryRow, fallbackRow, matchRow] = await Promise.all([
    getAppSetting(db, PRIMARY_AI_MODEL_KEY),
    getAppSetting(db, FALLBACK_AI_MODEL_KEY),
    getAppSetting(db, MATCH_AI_MODEL_KEY),
  ]);

  const primary = sanitizeModel(primaryRow?.value, envPrimaryModel());
  const fallback = sanitizeModel(fallbackRow?.value, envFallbackModel());
  const match = sanitizeModel(
    matchRow?.value,
    sanitizeModel(process.env.MATCH_AI_MODEL, primary || DEFAULT_MATCH_AI_MODEL),
  );

  return {
    primary,
    fallback,
    match,
    options: GEMINI_MODEL_OPTIONS,
    source: {
      primary: primaryRow?.value ? "database" : process.env.PRIMARY_AI_MODEL ? "env" : "default",
      fallback: fallbackRow?.value ? "database" : process.env.FALLBACK_AI_MODEL ? "env" : "default",
      match: matchRow?.value ? "database" : "primary",
    },
    updated_at: primaryRow?.updated_at ?? fallbackRow?.updated_at ?? null,
  };
}

async function upsertSetting(db, key, value) {
  const { error } = await db
    .from("app_settings")
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

export async function saveGeminiModelSettings(db, body) {
  const current = await getGeminiModelSettings(db);
  const primary = sanitizeModel(body?.primary ?? body?.primaryModel, current.primary);
  const fallback = sanitizeModel(body?.fallback ?? body?.fallbackModel, current.fallback);
  const match = sanitizeModel(body?.match ?? body?.matchModel, primary);

  await Promise.all([
    upsertSetting(db, PRIMARY_AI_MODEL_KEY, primary),
    upsertSetting(db, FALLBACK_AI_MODEL_KEY, fallback),
    upsertSetting(db, MATCH_AI_MODEL_KEY, match),
  ]);

  return getGeminiModelSettings(db);
}

/** Resolve models for runtime AI calls (DB → env → defaults). */
export async function resolveAiModels(db) {
  const settings = await getGeminiModelSettings(db);
  return {
    primary: settings.primary,
    fallback: settings.fallback,
    match: settings.match,
  };
}
