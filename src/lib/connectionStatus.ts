import { apiUrl } from "@/lib/apiBase";

export type TableCheck = { ok: boolean; code?: string | null; message?: string | null };

export type ConnectionStatus = {
  apiOk: boolean;
  dbOk: boolean;
  supabaseUrl: string;
  tables: Record<string, TableCheck>;
  error?: string;
};

export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
  const fallback: ConnectionStatus = {
    apiOk: false,
    dbOk: false,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? "",
    tables: {},
    error: "Could not reach API",
  };

  try {
    const [healthR, schemaR] = await Promise.all([
      fetch(apiUrl("/api/health")),
      fetch(apiUrl("/api/debug/schema-check")),
    ]);

    const apiOk = healthR.ok;
    if (!schemaR.ok) {
      const j = (await schemaR.json().catch(() => ({}))) as { error?: string };
      return {
        ...fallback,
        apiOk,
        error: typeof j?.error === "string" ? j.error : `Schema check failed (${schemaR.status})`,
      };
    }

    const schema = (await schemaR.json()) as {
      supabase_url?: string;
      checks?: Record<string, TableCheck>;
    };

    const tables = schema.checks ?? {};
    const dbOk = Object.values(tables).some((t) => t.ok);

    return {
      apiOk,
      dbOk,
      supabaseUrl: schema.supabase_url ?? import.meta.env.VITE_SUPABASE_URL ?? "",
      tables,
    };
  } catch (e) {
    return {
      ...fallback,
      error: e instanceof Error ? e.message : "Connection failed",
    };
  }
}
