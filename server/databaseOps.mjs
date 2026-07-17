import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import pg from "pg";
import { DATA_DIR, getActiveConnectionConfig } from "./dbConnection.mjs";

const { Client } = pg;

export const BACKUP_DIR = path.join(DATA_DIR, "backups");
export const MIGRATIONS_DIR = path.join(DATA_DIR, "..", "..", "supabase", "migrations");

/** Tables in FK-safe order for export/import */
export const BACKUP_TABLES = [
  "subjects",
  "boards",
  "app_users",
  "systems",
  "chapters",
  "topics",
  "concepts",
  "question_papers",
  "key_points",
  "concept_boards",
  "key_point_boards",
  "questions",
  "gemini_api_keys",
  "app_settings",
  "ui_appearance",
  "app_sessions",
  "exams",
  "exam_questions",
  "exam_attempts",
  "exam_answers",
  "user_study_progress",
  "user_practice_sessions",
];

const VECTOR_COLUMNS = {
  key_points: ["embedding"],
  concepts: ["detail_embedding"],
  questions: ["embedding", "explanation_embedding"],
  exams: ["title_embedding"],
};

/** @type {Map<string, { id: string; status: string; startedAt: string; finishedAt?: string; progress: object[]; error?: string; result?: object }>} */
export const migrationJobs = new Map();

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getPostgresConfig(config) {
  const c = config?.postgres ?? getActiveConnectionConfig().postgres;
  if (c.connectionString?.trim()) {
    return { connectionString: c.connectionString.trim(), ssl: c.ssl ? { rejectUnauthorized: false } : false };
  }
  if (!c.host || !c.database || !c.user) return null;
  return {
    host: c.host,
    port: c.port || 5432,
    database: c.database,
    user: c.user,
    password: c.password ?? "",
    ssl: c.ssl ? { rejectUnauthorized: false } : false,
  };
}

export async function testPostgresConnection(config) {
  const pgConfig = getPostgresConfig(config);
  if (!pgConfig) {
    return { ok: false, error: "PostgreSQL host, database, and user (or DATABASE_URL) are required" };
  }
  const client = new Client(pgConfig);
  const start = Date.now();
  try {
    await client.connect();
    const { rows } = await client.query("select version() as version, current_database() as db");
    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      version: rows[0]?.version ?? null,
      database: rows[0]?.db ?? null,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await client.end().catch(() => {});
  }
}

async function fetchAllRows(db, table, pageSize = 1000) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await db.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function getDatabaseStats(db) {
  const stats = {};
  for (const table of BACKUP_TABLES) {
    try {
      const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
      stats[table] = { ok: !error, count: error ? null : (count ?? 0), error: error?.message ?? null };
    } catch (e) {
      stats[table] = { ok: false, count: null, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return stats;
}

export async function exportDatabase(db, { tables = BACKUP_TABLES, includeEmbeddings = true } = {}) {
  const exportData = {
    meta: {
      exportedAt: new Date().toISOString(),
      tables,
      includeEmbeddings,
      version: 1,
    },
    tables: {},
  };

  for (const table of tables) {
    const rows = await fetchAllRows(db, table);
    if (!includeEmbeddings && VECTOR_COLUMNS[table]) {
      exportData.tables[table] = rows.map((row) => {
        const copy = { ...row };
        for (const col of VECTOR_COLUMNS[table]) delete copy[col];
        return copy;
      });
    } else {
      exportData.tables[table] = rows;
    }
  }

  return exportData;
}

export async function createBackup(db, options = {}) {
  ensureBackupDir();
  const payload = await exportDatabase(db, options);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = sanitizeFilename(`backup-${stamp}`);
  const jsonPath = path.join(BACKUP_DIR, `${id}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  let sqlPath = null;
  if (options.includeSql) {
    sqlPath = path.join(BACKUP_DIR, `${id}.sql`);
    fs.writeFileSync(sqlPath, buildSqlDump(payload), "utf8");
  }

  const stat = fs.statSync(jsonPath);
  return {
    id,
    jsonPath,
    sqlPath,
    sizeBytes: stat.size,
    exportedAt: payload.meta.exportedAt,
    tableCounts: Object.fromEntries(
      Object.entries(payload.tables).map(([t, rows]) => [t, Array.isArray(rows) ? rows.length : 0]),
    ),
  };
}

export function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));
  return files
    .map((filename) => {
      const full = path.join(BACKUP_DIR, filename);
      const stat = fs.statSync(full);
      const id = filename.replace(/\.json$/, "");
      const sqlFile = path.join(BACKUP_DIR, `${id}.sql`);
      return {
        id,
        filename,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
        hasSql: fs.existsSync(sqlFile),
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getBackupFilePath(id, format = "json") {
  const safe = sanitizeFilename(id);
  const ext = format === "sql" ? ".sql" : ".json";
  const full = path.join(BACKUP_DIR, `${safe}${ext}`);
  if (!fs.existsSync(full)) return null;
  return full;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSqlDump(payload) {
  const lines = [
    "-- PG Diary database backup",
    `-- Exported: ${payload.meta.exportedAt}`,
    "BEGIN;",
  ];
  for (const table of BACKUP_TABLES) {
    const rows = payload.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    lines.push(`\n-- ${table} (${rows.length} rows)`);
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => sqlLiteral(row[c]));
      lines.push(`INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${vals.join(", ")}) ON CONFLICT DO NOTHING;`);
    }
  }
  lines.push("COMMIT;");
  return lines.join("\n");
}

async function runMigrationsOnPostgres(client) {
  const dir = path.resolve(MIGRATIONS_DIR);
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations folder not found: ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const applied = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      await client.query(sql);
      applied.push(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("storage.buckets") || msg.includes("storage.objects")) {
        applied.push(`${file} (skipped storage)`);
        continue;
      }
      throw new Error(`${file}: ${msg}`);
    }
  }
  return applied;
}

function formatVectorValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return `[${value.join(",")}]`;
  return String(value);
}

const TABLE_CONFLICT_KEYS = {
  app_settings: ["key"],
  ui_appearance: ["id"],
  concept_boards: ["concept_id", "board_id"],
  key_point_boards: ["key_point_id", "board_id"],
  exam_questions: ["exam_id", "question_id"],
  exam_answers: ["attempt_id", "exam_question_id"],
  user_study_progress: ["user_id", "concept_id"],
};

async function insertRowsPg(client, table, rows, { batchSize = 100, onConflict = "nothing" } = {}) {
  if (!rows.length) return 0;
  let inserted = 0;
  const vectorCols = VECTOR_COLUMNS[table] ?? [];
  const conflictCols = TABLE_CONFLICT_KEYS[table] ?? ["id"];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    for (const row of batch) {
      const cols = Object.keys(row);
      const placeholders = cols.map((col, idx) => {
        if (vectorCols.includes(col) && row[col] != null) return `$${idx + 1}::vector`;
        return `$${idx + 1}`;
      });
      const values = cols.map((col) => {
        if (vectorCols.includes(col)) return formatVectorValue(row[col]);
        if (typeof row[col] === "object" && row[col] !== null && !(row[col] instanceof Date)) {
          return JSON.stringify(row[col]);
        }
        return row[col];
      });
      const conflictTarget = conflictCols.every((c) => cols.includes(c))
        ? ` (${conflictCols.join(", ")})`
        : "";
      let conflict = "";
      if (conflictTarget) {
        conflict =
          onConflict === "update"
            ? ` ON CONFLICT${conflictTarget} DO UPDATE SET ` +
              cols.filter((c) => !conflictCols.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(", ")
            : ` ON CONFLICT${conflictTarget} DO NOTHING`;
      }
      const sql = `INSERT INTO public.${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})${conflict}`;
      try {
        await client.query(sql, values);
        inserted += 1;
      } catch (e) {
        throw new Error(`${table} insert failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return inserted;
}

async function truncateTablesPg(client, tables) {
  const list = tables.map((t) => `public.${t}`).join(", ");
  await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export function startMigrationJob(supabaseDb, options = {}) {
  const jobId = randomUUID();
  const job = {
    id: jobId,
    status: "running",
    startedAt: new Date().toISOString(),
    progress: [],
    options,
  };
  migrationJobs.set(jobId, job);

  runMigrationJob(jobId, supabaseDb, options).catch((e) => {
    const j = migrationJobs.get(jobId);
    if (j) {
      j.status = "failed";
      j.error = e instanceof Error ? e.message : String(e);
      j.finishedAt = new Date().toISOString();
    }
  });

  return jobId;
}

export function getMigrationJob(jobId) {
  return migrationJobs.get(jobId) ?? null;
}

async function runMigrationJob(jobId, supabaseDb, options) {
  const job = migrationJobs.get(jobId);
  if (!job) return;

  const {
    tables = BACKUP_TABLES,
    truncateTarget = false,
    runSchema = true,
    includeEmbeddings = true,
    batchSize = 100,
    onConflict = "nothing",
    postgresConfig,
  } = options;

  const pgConfig = getPostgresConfig(postgresConfig ?? { postgres: getActiveConnectionConfig().postgres });
  if (!pgConfig) throw new Error("PostgreSQL connection not configured");

  const client = new Client(pgConfig);
  await client.connect();

  try {
    if (runSchema) {
      job.progress.push({ step: "schema", status: "running", at: new Date().toISOString() });
      const applied = await runMigrationsOnPostgres(client);
      job.progress.push({ step: "schema", status: "done", files: applied, at: new Date().toISOString() });
    }

    if (truncateTarget) {
      job.progress.push({ step: "truncate", status: "running", at: new Date().toISOString() });
      await truncateTablesPg(client, [...tables].reverse());
      job.progress.push({ step: "truncate", status: "done", at: new Date().toISOString() });
    }

    const exportPayload = await exportDatabase(supabaseDb, { tables, includeEmbeddings });
    const tableResults = {};

    for (const table of tables) {
      job.progress.push({ step: table, status: "running", at: new Date().toISOString() });
      const rows = exportPayload.tables[table] ?? [];
      const count = await insertRowsPg(client, table, rows, { batchSize, onConflict });
      tableResults[table] = { exported: rows.length, inserted: count };
      job.progress.push({
        step: table,
        status: "done",
        exported: rows.length,
        inserted: count,
        at: new Date().toISOString(),
      });
    }

    job.status = "completed";
    job.result = { tableResults, exportedAt: exportPayload.meta.exportedAt };
    job.finishedAt = new Date().toISOString();
  } finally {
    await client.end().catch(() => {});
  }
}

export async function runSchemaCheck(db) {
  const checks = {};
  for (const table of BACKUP_TABLES) {
    const selectCol = table === "app_settings" ? "key" : "id";
    const { error } = await db.from(table).select(selectCol).limit(1);
    checks[table] = {
      ok: !error,
      code: error?.code ?? null,
      message: error?.message ?? null,
    };
  }
  return checks;
}
