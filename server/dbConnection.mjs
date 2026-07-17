import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
export const DATA_DIR = path.join(__dirname, "data");
export const CONFIG_PATH = path.join(DATA_DIR, "database-connection.json");
export const DATABASE_CONNECTION_KEY = "database_connection";

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let supabaseAdmin = null;
/** @type {Record<string, unknown> | null} */
let activeConfig = null;
/** @type {{ source: string; loadedAt: string } | null} */
let activeMeta = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getEnvDefaults() {
  return {
    supabase: {
      projectId: process.env.VITE_SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_ID || "",
      url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      anonKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "",
      serviceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
    },
    postgres: {
      host: process.env.POSTGRES_HOST || "",
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE || "",
      user: process.env.POSTGRES_USER || "",
      password: process.env.POSTGRES_PASSWORD || "",
      ssl: String(process.env.POSTGRES_SSL || "false").toLowerCase() === "true",
      connectionString: process.env.DATABASE_URL || "",
    },
  };
}

function normalizeConfig(raw) {
  const env = getEnvDefaults();
  const supabase = raw?.supabase ?? {};
  const postgres = raw?.postgres ?? {};
  return {
    supabase: {
      projectId: String(supabase.projectId ?? env.supabase.projectId ?? "").trim(),
      url: String(supabase.url ?? env.supabase.url ?? "").trim().replace(/\/$/, ""),
      anonKey: String(supabase.anonKey ?? env.supabase.anonKey ?? "").trim(),
      serviceRoleKey: String(supabase.serviceRoleKey ?? env.supabase.serviceRoleKey ?? "").trim(),
    },
    postgres: {
      host: String(postgres.host ?? env.postgres.host ?? "").trim(),
      port: Number(postgres.port ?? env.postgres.port ?? 5432) || 5432,
      database: String(postgres.database ?? env.postgres.database ?? "").trim(),
      user: String(postgres.user ?? env.postgres.user ?? "").trim(),
      password: String(postgres.password ?? env.postgres.password ?? "").trim(),
      ssl: Boolean(postgres.ssl ?? env.postgres.ssl),
      connectionString: String(postgres.connectionString ?? env.postgres.connectionString ?? "").trim(),
    },
  };
}

export function maskSecret(value, visible = 4) {
  const s = String(value ?? "");
  if (!s) return "";
  if (s.length <= visible * 2) return "••••••••";
  return `${s.slice(0, visible)}…${s.slice(-visible)}`;
}

export function maskConnectionConfig(config) {
  const c = normalizeConfig(config);
  return {
    supabase: {
      projectId: c.supabase.projectId,
      url: c.supabase.url,
      anonKey: c.supabase.anonKey ? maskSecret(c.supabase.anonKey) : "",
      serviceRoleKey: c.supabase.serviceRoleKey ? maskSecret(c.supabase.serviceRoleKey) : "",
      hasAnonKey: Boolean(c.supabase.anonKey),
      hasServiceRoleKey: Boolean(c.supabase.serviceRoleKey),
    },
    postgres: {
      host: c.postgres.host,
      port: c.postgres.port,
      database: c.postgres.database,
      user: c.postgres.user,
      password: c.postgres.password ? maskSecret(c.postgres.password) : "",
      ssl: c.postgres.ssl,
      connectionString: c.postgres.connectionString ? maskSecret(c.postgres.connectionString, 8) : "",
      hasPassword: Boolean(c.postgres.password),
      hasConnectionString: Boolean(c.postgres.connectionString),
    },
  };
}

export function loadConfigFromFile() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

export function saveConfigToFile(config) {
  ensureDataDir();
  const normalized = normalizeConfig(config);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

async function loadConfigFromAppSettings(db) {
  try {
    const { data, error } = await db
      .from("app_settings")
      .select("value")
      .eq("key", DATABASE_CONNECTION_KEY)
      .maybeSingle();
    if (error || !data?.value) return null;
    const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

async function saveConfigToAppSettings(db, config) {
  const normalized = normalizeConfig(config);
  const { error } = await db.from("app_settings").upsert(
    {
      key: DATABASE_CONNECTION_KEY,
      value: JSON.stringify(normalized),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
  return normalized;
}

export function createSupabaseClientFromConfig(config) {
  const c = normalizeConfig(config);
  if (!c.supabase.url || !c.supabase.serviceRoleKey) return null;
  return createClient(c.supabase.url, c.supabase.serviceRoleKey, { auth: { persistSession: false } });
}

export function applyConnectionConfig(config, source = "manual") {
  const normalized = normalizeConfig(config);
  supabaseAdmin = createSupabaseClientFromConfig(normalized);
  activeConfig = normalized;
  activeMeta = { source, loadedAt: new Date().toISOString() };
  return { ok: Boolean(supabaseAdmin), config: normalized };
}

export async function initDbConnection() {
  const fileConfig = loadConfigFromFile();
  if (fileConfig?.supabase?.url && fileConfig?.supabase?.serviceRoleKey) {
    return applyConnectionConfig(fileConfig, "file");
  }

  const envConfig = getEnvDefaults();
  if (envConfig.supabase.url && envConfig.supabase.serviceRoleKey) {
    const applied = applyConnectionConfig(envConfig, "env");
    if (applied.ok && supabaseAdmin) {
      try {
        const dbConfig = await loadConfigFromAppSettings(supabaseAdmin);
        if (dbConfig?.supabase?.url && dbConfig?.supabase?.serviceRoleKey) {
          return applyConnectionConfig(dbConfig, "app_settings");
        }
      } catch {
        /* app_settings may not exist yet */
      }
    }
    return applied;
  }

  activeConfig = envConfig;
  activeMeta = { source: "env_partial", loadedAt: new Date().toISOString() };
  return { ok: false, config: envConfig };
}

export function getSupabaseAdmin() {
  return supabaseAdmin;
}

export function requireSupabase(res) {
  if (!supabaseAdmin) {
    res.status(500).json({
      error:
        "Supabase config missing. Configure in Settings → Connection or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env",
    });
    return null;
  }
  return supabaseAdmin;
}

export function getSupabaseUrl() {
  return activeConfig?.supabase?.url || getEnvDefaults().supabase.url || "";
}

export function getActiveConnectionConfig() {
  return activeConfig ?? normalizeConfig(getEnvDefaults());
}

export function getConnectionMeta() {
  return {
    ...(activeMeta ?? { source: "unknown", loadedAt: null }),
    connected: Boolean(supabaseAdmin),
    supabase_url: getSupabaseUrl(),
    config_path: CONFIG_PATH,
    config_file_exists: fs.existsSync(CONFIG_PATH),
  };
}

export async function loadFullConnectionConfig() {
  const fileConfig = loadConfigFromFile();
  const envConfig = getEnvDefaults();
  let dbConfig = null;
  if (supabaseAdmin) {
    dbConfig = await loadConfigFromAppSettings(supabaseAdmin);
  }
  const merged = normalizeConfig({
    supabase: {
      ...envConfig.supabase,
      ...(dbConfig?.supabase ?? {}),
      ...(fileConfig?.supabase ?? {}),
      ...(activeConfig?.supabase ?? {}),
    },
    postgres: {
      ...envConfig.postgres,
      ...(dbConfig?.postgres ?? {}),
      ...(fileConfig?.postgres ?? {}),
      ...(activeConfig?.postgres ?? {}),
    },
  });
  return { config: merged, meta: getConnectionMeta() };
}

function mergeSecrets(current, incoming, secretKeys) {
  const out = { ...current, ...incoming };
  for (const key of secretKeys) {
    const val = incoming[key];
    if (val === undefined || val === null || String(val).trim() === "") {
      out[key] = current[key] ?? "";
    }
  }
  return out;
}

export async function saveConnectionConfig(partial, { writeEnv = false, syncAppSettings = true } = {}) {
  const current = (await loadFullConnectionConfig()).config;
  const incoming = partial ?? {};
  const merged = normalizeConfig({
    supabase: mergeSecrets(current.supabase, incoming.supabase ?? {}, ["anonKey", "serviceRoleKey"]),
    postgres: mergeSecrets(current.postgres, incoming.postgres ?? {}, ["password", "connectionString"]),
  });

  saveConfigToFile(merged);

  if (syncAppSettings && supabaseAdmin) {
    try {
      await saveConfigToAppSettings(supabaseAdmin, merged);
    } catch (e) {
      console.warn("Could not sync connection config to app_settings:", e?.message ?? e);
    }
  }

  applyConnectionConfig(merged, "saved");

  if (writeEnv) {
    updateEnvFile({
      VITE_SUPABASE_PROJECT_ID: merged.supabase.projectId,
      VITE_SUPABASE_URL: merged.supabase.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: merged.supabase.anonKey,
      SUPABASE_URL: merged.supabase.url,
      SUPABASE_SERVICE_ROLE_KEY: merged.supabase.serviceRoleKey,
      POSTGRES_HOST: merged.postgres.host,
      POSTGRES_PORT: String(merged.postgres.port),
      POSTGRES_DB: merged.postgres.database,
      POSTGRES_USER: merged.postgres.user,
      POSTGRES_PASSWORD: merged.postgres.password,
      POSTGRES_SSL: merged.postgres.ssl ? "true" : "false",
      DATABASE_URL: merged.postgres.connectionString,
    });
  }

  return { config: merged, meta: getConnectionMeta() };
}

export function buildEnvSnippet(config) {
  const c = normalizeConfig(config);
  const lines = [
    `# Supabase (frontend + API)`,
    `VITE_SUPABASE_PROJECT_ID=${c.supabase.projectId}`,
    `VITE_SUPABASE_URL=${c.supabase.url}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${c.supabase.anonKey}`,
    `SUPABASE_URL=${c.supabase.url}`,
    `SUPABASE_SERVICE_ROLE_KEY=${c.supabase.serviceRoleKey}`,
    ``,
    `# VPS PostgreSQL (optional direct connection)`,
    `POSTGRES_HOST=${c.postgres.host}`,
    `POSTGRES_PORT=${c.postgres.port}`,
    `POSTGRES_DB=${c.postgres.database}`,
    `POSTGRES_USER=${c.postgres.user}`,
    `POSTGRES_PASSWORD=${c.postgres.password}`,
    `POSTGRES_SSL=${c.postgres.ssl ? "true" : "false"}`,
    `DATABASE_URL=${c.postgres.connectionString}`,
  ];
  return lines.join("\n");
}

function updateEnvFile(updates) {
  const envPath = path.join(ROOT_DIR, ".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, rawValue] of Object.entries(updates)) {
    const value = String(rawValue ?? "");
    if (!value) continue;
    const escaped = value.replace(/\n/g, "\\n");
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${escaped}`);
    } else {
      content = `${content.trim()}\n${key}=${escaped}\n`;
    }
  }
  fs.writeFileSync(envPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export async function testSupabaseConnection(config) {
  const client = createSupabaseClientFromConfig(config);
  if (!client) {
    return { ok: false, error: "Supabase URL and service role key are required" };
  }
  const start = Date.now();
  const { error } = await client.from("subjects").select("id").limit(1);
  const latencyMs = Date.now() - start;
  if (error) {
    return { ok: false, error: error.message, code: error.code ?? null, latencyMs };
  }
  return { ok: true, latencyMs, url: normalizeConfig(config).supabase.url };
}
