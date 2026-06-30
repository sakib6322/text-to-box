import { GoogleGenerativeAI } from "@google/generative-ai";

export function maskKey(k) {
  const s = String(k ?? "");
  if (!s) return "";
  if (s.length <= 12) return `${s.slice(0, 3)}…${s.slice(-3)}`;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function isQuotaError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("rate limit") || msg.includes("resource exhausted");
}

function isLeakedOrBlockedKeyError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("403") && (msg.includes("reported as leaked") || msg.includes("forbidden"));
}

function isInvalidKeyError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("401") || msg.includes("api key not valid") || isLeakedOrBlockedKeyError(err);
}

export function isKeyRotationError(err) {
  return isQuotaError(err) || isInvalidKeyError(err) || String(err?.message ?? "").toLowerCase().includes("403");
}

function classifyError(err) {
  if (isQuotaError(err)) return { status: "quota_exceeded", message: String(err?.message ?? err).slice(0, 300) };
  if (isInvalidKeyError(err)) return { status: "invalid", message: String(err?.message ?? err).slice(0, 300) };
  return { status: "error", message: String(err?.message ?? err).slice(0, 300) };
}

function rowToSettingsItem(r) {
  return {
    id: r.id,
    label: r.label || `API Key ${r.sort_order + 1}`,
    masked: maskKey(r.api_key),
    sort_order: r.sort_order,
    is_active: r.is_active,
    status: r.status || "idle",
    last_used_at: r.last_used_at,
    last_success_at: r.last_success_at,
    last_error_at: r.last_error_at,
    last_error_message: r.last_error_message,
    error_count: r.error_count ?? 0,
    created_at: r.created_at,
  };
}

let cachedRows = null;
let cacheLoadedAt = 0;
let rrIndex = 0;
const CACHE_TTL_MS = 30_000;

const KEY_SELECT =
  "id, api_key, label, sort_order, is_active, status, last_used_at, last_success_at, last_error_at, last_error_message, error_count, created_at";

function envFallbackKeys() {
  const envKey = process.env.GEMINI_API_KEY?.trim();
  return envKey ? [envKey] : [];
}

async function loadAllKeyRowsFromDb(db) {
  const { data, error } = await db.from("gemini_api_keys").select(KEY_SELECT).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function loadActiveKeyRowsFromDb(db) {
  const { data, error } = await db
    .from("gemini_api_keys")
    .select(KEY_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function invalidateKeyCache() {
  cachedRows = null;
  cacheLoadedAt = 0;
}

export async function getActiveKeyRows(db, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedRows && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cachedRows;
  }
  try {
    cachedRows = await loadActiveKeyRowsFromDb(db);
  } catch {
    cachedRows = [];
  }
  cacheLoadedAt = now;
  return cachedRows;
}

export async function getGeminiKeyList(db, forceRefresh = false) {
  const rows = await getActiveKeyRows(db, forceRefresh);
  const fromDb = rows.map((r) => r.api_key).filter(Boolean);
  if (fromDb.length > 0) return fromDb;
  return envFallbackKeys();
}

export async function listGeminiKeysForSettings(db) {
  let rows = [];
  try {
    rows = await loadAllKeyRowsFromDb(db);
  } catch {
    rows = [];
  }
  const envKeys = envFallbackKeys();
  return {
    keys: rows.map(rowToSettingsItem),
    count: rows.length,
    source: rows.length > 0 ? "database" : envKeys.length > 0 ? "env_fallback" : "none",
    env_fallback_configured: envKeys.length > 0,
    env_fallback_masked: envKeys.length > 0 ? maskKey(envKeys[0]) : null,
  };
}

async function nextSortOrder(db) {
  const { data } = await db.from("gemini_api_keys").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  return data?.[0]?.sort_order != null ? Number(data[0].sort_order) + 1 : 0;
}

export async function addGeminiKeys(db, rawKeys) {
  const keys = (Array.isArray(rawKeys) ? rawKeys : [])
    .map((k) => String(k ?? "").trim())
    .filter(Boolean);
  if (keys.length === 0) throw new Error("At least one API key is required");

  const { data: existing } = await db.from("gemini_api_keys").select("api_key");
  const existingSet = new Set((existing ?? []).map((r) => r.api_key));
  const toAdd = keys.filter((k) => !existingSet.has(k));
  if (toAdd.length === 0) throw new Error("All provided keys already exist");

  const startOrder = await nextSortOrder(db);
  const rows = toAdd.map((api_key, idx) => ({
    api_key,
    label: `API Key ${startOrder + idx + 1}`,
    sort_order: startOrder + idx,
    is_active: true,
    status: "idle",
    error_count: 0,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await db.from("gemini_api_keys").insert(rows).select("id");
  if (error) throw error;

  invalidateKeyCache();
  return { saved: data?.length ?? toAdd.length };
}

export async function saveGeminiKeys(db, rawKeys) {
  const keys = (Array.isArray(rawKeys) ? rawKeys : [])
    .map((k) => String(k ?? "").trim())
    .filter(Boolean);
  if (keys.length === 0) throw new Error("At least one API key is required");
  if (keys.length > 20) throw new Error("Maximum 20 API keys allowed");
  const unique = new Set(keys);
  if (unique.size !== keys.length) throw new Error("Duplicate API keys are not allowed");

  const { error: delErr } = await db.from("gemini_api_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) throw delErr;

  const rows = keys.map((api_key, idx) => ({
    api_key,
    label: `API Key ${idx + 1}`,
    sort_order: idx,
    is_active: true,
    status: "idle",
    error_count: 0,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await db.from("gemini_api_keys").insert(rows).select("id");
  if (error) throw error;

  invalidateKeyCache();
  rrIndex = 0;
  return { saved: data?.length ?? keys.length };
}

export async function updateGeminiKey(db, id, patch) {
  const keyId = String(id ?? "").trim();
  if (!keyId) throw new Error("Key id required");

  const row = {};
  if (typeof patch?.label === "string") row.label = patch.label.trim() || null;
  if (typeof patch?.api_key === "string") {
    const api_key = patch.api_key.trim();
    if (!api_key) throw new Error("API key cannot be empty");
    row.api_key = api_key;
    row.status = "idle";
    row.error_count = 0;
    row.last_error_at = null;
    row.last_error_message = null;
  }
  if (typeof patch?.is_active === "boolean") {
    row.is_active = patch.is_active;
    if (!patch.is_active) row.status = "disabled";
    else if (row.status === "disabled") row.status = "idle";
  }
  if (Object.keys(row).length === 0) throw new Error("Nothing to update");

  row.updated_at = new Date().toISOString();
  const { data, error } = await db.from("gemini_api_keys").update(row).eq("id", keyId).select(KEY_SELECT);
  if (error) throw error;
  const updated = Array.isArray(data) ? data[0] : null;
  if (!updated) throw new Error("Key not found");

  invalidateKeyCache();
  return { key: rowToSettingsItem(updated) };
}

export async function deleteGeminiKey(db, id) {
  const keyId = String(id ?? "").trim();
  if (!keyId) throw new Error("Key id required");
  const { error } = await db.from("gemini_api_keys").delete().eq("id", keyId);
  if (error) throw error;
  invalidateKeyCache();
  return { ok: true };
}

async function runKeyTest(apiKey) {
  const modelName = process.env.PRIMARY_AI_MODEL || "gemini-2.5-pro";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: 'Reply with exactly: "ok"' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 8 },
  });
  return String(result?.response?.text?.() ?? "").trim();
}

async function setKeyStatus(db, id, status, extra = {}) {
  const row = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  await db.from("gemini_api_keys").update(row).eq("id", id);
}

export async function testGeminiKeyById(db, id) {
  const keyId = String(id ?? "").trim();
  if (!keyId) throw new Error("Key id required");

  const { data, error } = await db.from("gemini_api_keys").select(KEY_SELECT).eq("id", keyId).maybeSingle();
  if (error) throw error;
  if (!data?.api_key) throw new Error("Key not found");

  try {
    const snippet = await runKeyTest(data.api_key);
    const now = new Date().toISOString();
    await setKeyStatus(db, keyId, "active", {
      last_success_at: now,
      last_used_at: now,
      last_error_at: null,
      last_error_message: null,
      error_count: 0,
    });
    invalidateKeyCache();
    return { ok: true, status: "active", masked: maskKey(data.api_key), snippet: snippet.slice(0, 120) };
  } catch (err) {
    const { status, message } = classifyError(err);
    const now = new Date().toISOString();
    await setKeyStatus(db, keyId, status, {
      last_error_at: now,
      last_error_message: message,
      error_count: Number(data.error_count ?? 0) + 1,
    });
    invalidateKeyCache();
    return { ok: false, status, masked: maskKey(data.api_key), message };
  }
}

export async function testAllGeminiKeys(db) {
  const rows = await loadAllKeyRowsFromDb(db);
  const results = [];
  for (const row of rows) {
    const r = await testGeminiKeyById(db, row.id);
    results.push({ id: row.id, label: row.label, ...r });
  }
  return { results };
}

async function markKeyUsed(db, apiKey) {
  if (!db || !apiKey) return;
  try {
    const now = new Date().toISOString();
    await db
      .from("gemini_api_keys")
      .update({
        last_used_at: now,
        last_success_at: now,
        status: "active",
        last_error_at: null,
        last_error_message: null,
        updated_at: now,
      })
      .eq("api_key", apiKey);
    invalidateKeyCache();
  } catch {
    /* non-fatal */
  }
}

async function markKeyError(db, apiKey, err) {
  if (!db || !apiKey) return;
  try {
    const { status, message } = classifyError(err);
    const { data } = await db.from("gemini_api_keys").select("error_count").eq("api_key", apiKey).maybeSingle();
    const now = new Date().toISOString();
    await db
      .from("gemini_api_keys")
      .update({
        status,
        last_error_at: now,
        last_error_message: message,
        error_count: Number(data?.error_count ?? 0) + 1,
        updated_at: now,
      })
      .eq("api_key", apiKey);
    invalidateKeyCache();
  } catch {
    /* non-fatal */
  }
}

export async function withGeminiKeyRotation(db, fn) {
  const rows = await getActiveKeyRows(db);
  const keys = rows.length > 0 ? rows.map((r) => r.api_key).filter(Boolean) : envFallbackKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys configured. Add keys in Settings → Gemini API or set GEMINI_API_KEY in .env as fallback.",
    );
  }

  const start = rrIndex % keys.length;
  let lastErr = null;
  for (let i = 0; i < keys.length; i++) {
    const idx = (start + i) % keys.length;
    const key = keys[idx];
    try {
      const result = await fn(key);
      rrIndex = (idx + 1) % keys.length;
      await markKeyUsed(db, key);
      return result;
    } catch (err) {
      lastErr = err;
      if (!isKeyRotationError(err)) throw err;
      await markKeyError(db, key, err);
      console.warn(`Gemini key ${maskKey(key)} failed (${err?.message ?? err}), trying next…`);
    }
  }
  throw lastErr ?? new Error("All Gemini API keys failed");
}

export async function hasGeminiKeys(db) {
  const keys = await getGeminiKeyList(db);
  return keys.length > 0;
}
