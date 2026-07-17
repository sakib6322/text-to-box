import { apiFetch, apiUrl } from "@/lib/apiBase";

export type SupabaseConfig = {
  projectId: string;
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  hasAnonKey?: boolean;
  hasServiceRoleKey?: boolean;
};

export type PostgresConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  connectionString: string;
  hasPassword?: boolean;
  hasConnectionString?: boolean;
};

export type DatabaseConfigResponse = {
  config?: {
    supabase: SupabaseConfig;
    postgres: PostgresConfig;
  };
  meta?: {
    source: string;
    loadedAt: string | null;
    connected: boolean;
    supabase_url: string;
    config_file_exists: boolean;
  };
  tables?: string[];
  error?: string;
};

export type BackupInfo = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  hasSql: boolean;
};

export type MigrationJob = {
  id: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  finishedAt?: string;
  progress: Array<Record<string, unknown>>;
  error?: string;
  result?: Record<string, unknown>;
};

async function parseJson<T>(res: Response): Promise<T & { error?: string }> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data;
}

export async function fetchDatabaseConfig(): Promise<DatabaseConfigResponse> {
  const res = await apiFetch("/api/settings/database");
  return parseJson(res);
}

export async function saveDatabaseConfig(body: {
  supabase?: Partial<SupabaseConfig>;
  postgres?: Partial<PostgresConfig>;
  writeEnv?: boolean;
}) {
  const res = await apiFetch("/api/settings/database", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson<{ ok: boolean; envSnippet?: string }>(res);
}

export async function testSupabaseConfig(config: { supabase: Partial<SupabaseConfig> }) {
  const res = await apiFetch("/api/settings/database/test-supabase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return parseJson<{ ok: boolean; latencyMs?: number; error?: string }>(res);
}

export async function testPostgresConfig(config: { postgres: Partial<PostgresConfig> }) {
  const res = await apiFetch("/api/settings/database/test-postgres", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return parseJson<{ ok: boolean; latencyMs?: number; version?: string; error?: string }>(res);
}

export async function fetchDatabaseStats() {
  const res = await apiFetch("/api/settings/database/stats");
  return parseJson<{ stats: Record<string, { ok: boolean; count: number | null; error?: string }> }>(res);
}

export async function createDatabaseBackup(options: {
  includeSql?: boolean;
  includeEmbeddings?: boolean;
}) {
  const res = await apiFetch("/api/settings/database/backup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return parseJson<{ backup: { id: string; tableCounts: Record<string, number> } }>(res);
}

export async function listDatabaseBackups() {
  const res = await apiFetch("/api/settings/database/backups");
  return parseJson<{ backups: BackupInfo[] }>(res);
}

export function backupDownloadUrl(id: string, format: "json" | "sql" = "json") {
  return apiUrl(`/api/settings/database/backups/${encodeURIComponent(id)}/download?format=${format}`);
}

export async function downloadDatabaseBackup(id: string, format: "json" | "sql" = "json") {
  const res = await apiFetch(
    `/api/settings/database/backups/${encodeURIComponent(id)}/download?format=${format}`,
  );
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Download failed");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `backup-${id}.${format}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function startDatabaseMigration(options: Record<string, unknown>) {
  const res = await apiFetch("/api/settings/database/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  return parseJson<{ jobId: string }>(res);
}

export async function fetchMigrationJob(jobId: string) {
  const res = await apiFetch(`/api/settings/database/migrate/${encodeURIComponent(jobId)}`);
  return parseJson<MigrationJob>(res);
}

export async function fetchEnvSnippet() {
  const res = await apiFetch("/api/settings/database/env-snippet");
  return parseJson<{ snippet: string }>(res);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
