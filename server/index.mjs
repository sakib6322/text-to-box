import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  addGeminiKeys,
  deleteGeminiKey,
  getGeminiKeyList,
  hasGeminiKeys,
  invalidateKeyCache,
  listGeminiKeysForSettings,
  maskKey,
  saveGeminiKeys,
  testAllGeminiKeys,
  testGeminiKeyById,
  updateGeminiKey,
  withGeminiKeyRotation,
} from "./geminiKeys.mjs";
import {
  getExtractQuestionsPrompt,
  resetExtractQuestionsPrompt,
  saveExtractQuestionsPrompt,
  getExtractConceptPrompt,
  resetExtractConceptPrompt,
  saveExtractConceptPrompt,
  getExtractKeyPointsPrompt,
  resetExtractKeyPointsPrompt,
  saveExtractKeyPointsPrompt,
  getQuestionExplanationsPrompt,
  resetQuestionExplanationsPrompt,
  saveQuestionExplanationsPrompt,
  getMatchingPromptConfig,
  saveMatchingPromptConfig,
  resetMatchingPromptConfig,
  getMatchingPrompt,
  saveMatchingPrompt,
  resetMatchingPrompt,
  registerUser,
  loginUser,
  validateSession,
  logoutSession,
  updateUserProfile,
} from "./appSettings.mjs";
import { getUiAppearance, saveUiAppearance, resetUiAppearance } from "./uiAppearance.mjs";
import {
  getGeminiModelSettings,
  saveGeminiModelSettings,
  resolveAiModels,
} from "./geminiModels.mjs";
import {
  createStaffUser,
  deleteStaffUser,
  listAccessUsers,
  updateStaffUser,
} from "./accessUsers.mjs";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_GROUPS,
  permissionsForResponse,
} from "./permissions.mjs";
import {
  denyPermission,
  requireAnyPermission,
  requireExtractAccess,
  requireCreateAiExtractAccess,
  requirePermission,
  requireStaffArea,
  taxonomyActionPermission,
} from "./routeAuth.mjs";
import {
  initDbConnection,
  requireSupabase,
  getSupabaseUrl,
  getConnectionMeta,
  loadFullConnectionConfig,
  saveConnectionConfig,
  maskConnectionConfig,
  testSupabaseConnection,
  buildEnvSnippet,
} from "./dbConnection.mjs";
import {
  BACKUP_TABLES,
  getDatabaseStats,
  createBackup,
  listBackups,
  getBackupFilePath,
  testPostgresConnection,
  startMigrationJob,
  getMigrationJob,
  runSchemaCheck,
} from "./databaseOps.mjs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.originalname?.toLowerCase().endsWith(".pdf");
    cb(ok ? null : new Error("Only image or PDF files are allowed"), ok);
  },
});

const MCQ_STATEMENT_MARK = 0.2;
const MCQ_WRONG_PENALTY = 0.05;
const SBA_CORRECT_MARK = 1;

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "models/gemini-embedding-001";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 768);

function formatSupabaseError(error) {
  if (error == null) return "Unknown error";
  if (typeof error === "string") return error;
  const code = String(error.code ?? "");
  const msg = String(error.message ?? error ?? "Unknown error");
  const details = error.details != null ? String(error.details) : "";
  const hint = error.hint != null ? String(error.hint) : "";
  if (msg.includes("fetch failed") || msg.includes("ENOTFOUND")) {
    return `Cannot reach Supabase (${getSupabaseUrl()}). Check Supabase URL in Settings → Connection or .env.`;
  }
  if (code === "PGRST205" || msg.includes("Could not find the table")) {
    const table = msg.match(/table '([^']+)'/i)?.[1] ?? "unknown table";
    return `Missing table ${table} on ${getSupabaseUrl()}. Run migrations on this project, then retry.`;
  }
  if (code === "PGRST116" || msg.toLowerCase().includes("contains 0 rows")) {
    return "Save returned no row (often RLS blocking RETURNING, or wrong table). In Supabase SQL Editor run the taxonomy migration and confirm policies on subjects/systems/chapters/topics.";
  }
  if (code === "23505") {
    return details ? `Duplicate: ${details}` : "That name already exists under this parent.";
  }
  const extra = [details, hint].filter(Boolean).join(" — ");
  return extra ? `${msg} (${extra})` : msg;
}

app.get("/api/debug/schema-check", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const checks = await runSchemaCheck(db);
    return res.json({ supabase_url: getSupabaseUrl(), checks, tables: BACKUP_TABLES });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/debug/embeddings-stats", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const { count: total, error: totalErr } = await db
      .from("key_points")
      .select("id", { count: "exact", head: true });
    if (totalErr) return res.status(500).json({ error: formatSupabaseError(totalErr) });

    const { data: sample, error: sampleErr } = await db
      .from("key_points")
      .select("id, content, embedding")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sampleErr) return res.status(500).json({ error: formatSupabaseError(sampleErr) });

    const rows = sample ?? [];
    const withEmbedding = rows.filter((r) => r.embedding != null).length;
    const withoutEmbedding = rows.filter((r) => r.embedding == null).length;

    return res.json({
      key_points_total: total ?? 0,
      sample_size: rows.length,
      sample_with_embedding: withEmbedding,
      sample_without_embedding: withoutEmbedding,
      embedding_model: EMBEDDING_MODEL,
      embedding_dim: EMBEDDING_DIM,
      note: "Each key_point line stores one 768-dim vector in key_points.embedding (pgvector). Matching runs only when linking questions to suggestions.",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

async function linkKeyPointBoards(db, keyPointId, boardIds) {
  const ids = Array.isArray(boardIds) ? boardIds.filter((id) => typeof id === "string" && id.trim()) : [];
  if (ids.length === 0 || !keyPointId) return;
  for (const board_id of ids.map((id) => id.trim())) {
    const { data: existing } = await db
      .from("key_point_boards")
      .select("mention_count")
      .eq("key_point_id", keyPointId)
      .eq("board_id", board_id)
      .maybeSingle();
    if (existing) {
      const { error } = await db
        .from("key_point_boards")
        .update({ mention_count: Number(existing.mention_count || 0) + 1 })
        .eq("key_point_id", keyPointId)
        .eq("board_id", board_id);
      if (error) console.error("linkKeyPointBoards:", error.message);
    } else {
      const { error } = await db
        .from("key_point_boards")
        .insert({ key_point_id: keyPointId, board_id, mention_count: 1 });
      if (error) console.error("linkKeyPointBoards:", error.message);
    }
  }
}

/** Replace board links for a key point (edit UI). Keeps existing mention_count when a board stays selected. */
async function replaceKeyPointBoards(db, keyPointId, boardIds) {
  if (!keyPointId) return;
  const ids = Array.isArray(boardIds)
    ? [...new Set(boardIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))]
    : [];

  const { data: existingRows, error: loadErr } = await db
    .from("key_point_boards")
    .select("board_id, mention_count")
    .eq("key_point_id", keyPointId);
  if (loadErr) throw new Error(loadErr.message);

  const existingById = new Map(
    (existingRows ?? [])
      .filter((r) => typeof r.board_id === "string" && r.board_id.trim())
      .map((r) => [r.board_id.trim(), Math.max(1, Number(r.mention_count ?? 1) || 1)]),
  );
  const nextSet = new Set(ids);
  const toDelete = [...existingById.keys()].filter((id) => !nextSet.has(id));
  if (toDelete.length) {
    const { error: delErr } = await db
      .from("key_point_boards")
      .delete()
      .eq("key_point_id", keyPointId)
      .in("board_id", toDelete);
    if (delErr) throw new Error(delErr.message);
  }
  for (const board_id of ids) {
    if (existingById.has(board_id)) continue;
    const { error: insErr } = await db
      .from("key_point_boards")
      .insert({ key_point_id: keyPointId, board_id, mention_count: 1 });
    if (insErr) throw new Error(insErr.message);
  }
}

function taxonomyTable(level) {
  if (level === "subjects") return "subjects";
  if (level === "systems") return "systems";
  if (level === "chapters") return "chapters";
  if (level === "topics") return "topics";
  return null;
}

function taxonomyParentKey(level) {
  if (level === "systems") return "subject_id";
  if (level === "chapters") return "system_id";
  if (level === "topics") return "chapter_id";
  return null;
}

function fileToGenerativePart(fileBuffer, mimeType) {
  const mt = mimeType === "application/pdf" || mimeType?.endsWith("/pdf") ? "application/pdf" : mimeType;
  return {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: mt || "image/jpeg",
    },
  };
}

function getBearerToken(req) {
  const header = String(req.headers.authorization ?? "");
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return String(req.body?.token ?? req.query?.token ?? "").trim() || null;
}

async function fetchBoardsByKeyPointIds(db, keyPointIds) {
  if (!keyPointIds.length) return new Map();
  const { data } = await db
    .from("key_point_boards")
    .select("key_point_id, board_id, mention_count, boards(id, name)")
    .in("key_point_id", keyPointIds);
  const map = new Map();
  for (const row of data ?? []) {
    const kpid = row.key_point_id;
    const name = row?.boards?.name;
    if (!kpid || typeof name !== "string" || !name.trim()) continue;
    const boardId = row?.boards?.id ?? row.board_id;
    const list = map.get(kpid) ?? [];
    list.push({
      board_id: typeof boardId === "string" ? boardId : null,
      name: name.trim(),
      mention_count: Number(row.mention_count ?? 1),
    });
    map.set(kpid, list);
  }
  return map;
}

async function enrichKeyPointsWithBoards(db, _conceptId, keyPoints) {
  const ids = (keyPoints ?? []).map((kp) => kp.id).filter(Boolean);
  const boardsByKp = await fetchBoardsByKeyPointIds(db, ids);
  return (keyPoints ?? []).map((kp) => {
    const links = boardsByKp.get(kp.id) ?? [];
    return {
      ...kp,
      board_names: links.map((l) => l.name),
      board_links: links,
    };
  });
}

async function enrichQuestionsWithBoards(db, rows) {
  const pointIds = [...new Set((rows ?? []).map((q) => q.sourcePointId).filter(Boolean))];
  const boardsByKp = await fetchBoardsByKeyPointIds(db, pointIds);

  const incrementByKp = new Map();
  if (pointIds.length) {
    const { data: kpRows } = await db.from("key_points").select("id, increment_count").in("id", pointIds);
    for (const kp of kpRows ?? []) {
      if (kp?.id) incrementByKp.set(kp.id, Math.max(0, Number(kp.increment_count ?? 0)));
    }
  }

  const payloadBoardIds = [
    ...new Set(
      (rows ?? [])
        .flatMap((q) => {
          const payload =
            q.questionMode === "mcq" ? q.mcq : q.questionMode === "sba" ? q.sba : q.payload;
          return Array.isArray(payload?.boardIds) ? payload.boardIds : [];
        })
        .filter((id) => typeof id === "string" && id.trim())
        .map((id) => id.trim()),
    ),
  ];

  let boardsById = new Map();
  if (payloadBoardIds.length) {
    const { data: boardRows } = await db.from("boards").select("id, name").in("id", payloadBoardIds);
    boardsById = new Map((boardRows ?? []).map((b) => [b.id, b.name]));
  }

  return (rows ?? []).map((q) => {
    const payload = q.questionMode === "mcq" ? q.mcq : q.questionMode === "sba" ? q.sba : q.payload;
    const fromPayload = Array.isArray(payload?.boardIds)
      ? payload.boardIds
          .filter((id) => typeof id === "string" && id.trim())
          .map((id) => ({
            id,
            name: boardsById.get(id) ?? id,
            mention_count: 1,
          }))
      : [];
    const fromKp = q.sourcePointId
      ? (boardsByKp.get(q.sourcePointId) ?? []).map((l) => ({
          id: l.board_id,
          name: l.name,
          mention_count: l.mention_count,
        }))
      : [];
    // Prefer boards saved on the question itself; fall back to linked key-point boards.
    const boards = fromPayload.length ? fromPayload : fromKp;
    const boardCount = boards.reduce((s, b) => s + Math.max(1, Number(b.mention_count ?? 1)), 0);
    const incrementCount = q.sourcePointId ? Number(incrementByKp.get(q.sourcePointId) ?? 0) : 0;
    return {
      ...q,
      boards,
      incrementCount,
      count: Math.max(incrementCount, boardCount),
    };
  });
}

function withBoardIdsOnPayload(payload, boardIds) {
  const base = payload && typeof payload === "object" ? { ...payload } : {};
  const ids = Array.isArray(boardIds)
    ? [...new Set(boardIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))]
    : [];
  if (ids.length) base.boardIds = ids;
  else delete base.boardIds;
  return base;
}

function stripBoardIdsFromPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const { boardIds: _ignored, ...rest } = payload;
  return rest;
}

function parseGeminiJson(rawText) {
  const direct = String(rawText ?? "").trim();
  try {
    return JSON.parse(direct);
  } catch {}

  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced.trim());
    } catch {}
  }

  const start = direct.indexOf("{");
  const end = direct.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(direct.slice(start, end + 1));
  throw new Error("Model returned non-JSON output");
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function sanitizeModelText(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keep CKEditor HTML (bold, lists, paragraphs, tables, images) while stripping scripts/events.
 *  Do not run full entity-decoding on markup — that can break tags/entities from the editor. */
function sanitizeRichHtml(value) {
  let html = String(value ?? "")
    .replace(/&nbsp;/gi, "\u00a0")
    .trim();
  if (!html) return "";

  html = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "")
    .replace(/<\s*(iframe|object|embed|form|input|button|textarea|select)\b[^>]*>[\s\S]*?(<\/\1\s*>)?/gi, "");

  html = html.replace(/\ssrc\s*=\s*(['"])(.*?)\1/gi, (match, quote, src) => {
    const trimmed = src.trim();
    if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return match;
    return "";
  });

  return html.trim();
}

function isRichHtmlEmpty(value) {
  if (!value?.trim()) return true;
  const text = sanitizeModelText(value);
  const hasImage = /<img\b/i.test(value);
  return !text && !hasImage;
}

/** Preserve line breaks and wording for exam questions (no paraphrase cleanup). */
function preserveVerbatimText(value) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeQuestionType(value) {
  const s = String(value ?? "").toLowerCase().trim();
  if (!s) return null;
  if (
    s === "mcq" ||
    s === "multiple" ||
    s.includes("mcq") ||
    s.includes("true/false") ||
    s.includes("true-false") ||
    s.includes("t/f") ||
    s.includes("tftf") ||
    s === "tf"
  ) {
    return "mcq";
  }
  if (s === "sba" || s === "single" || s.includes("sba") || s.includes("best answer") || s.includes("single best")) {
    return "sba";
  }
  return null;
}

function normalizeTfAnswer(value) {
  const s = String(value ?? "").toLowerCase().trim();
  if (s === "t" || s === "true" || s === "1" || s === "yes") return "true";
  return "false";
}

function labelToOptionIndex(label) {
  const ch = String(label ?? "").toLowerCase().replace(/[^a-e]/g, "");
  const map = { a: 0, b: 1, c: 2, d: 3, e: 4 };
  return ch in map ? map[ch] : 0;
}

async function generateWithFallback(genAI, modelName, fallbackModelName, request) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    return await model.generateContent(request);
  } catch (err) {
    if (!isQuotaError(err) || fallbackModelName === modelName) throw err;
    const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
    return await fallbackModel.generateContent(request);
  }
}

function isQuotaError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("rate limit");
}

function isLeakedOrBlockedKeyError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  // Only treat as "leaked" when Google explicitly reports it.
  return msg.includes("403") && msg.includes("reported as leaked");
}

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

async function embedTextWithKey(text, apiKey) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: t }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: EMBEDDING_DIM,
      }),
    },
  );
  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 429 || resp.status === 403 || resp.status === 401) {
      throw new Error(`Embedding API ${resp.status}: ${body.slice(0, 300)}`);
    }
    console.error("Embedding API failed", resp.status, body);
    return null;
  }
  const data = await resp.json();
  return Array.isArray(data?.embedding?.values) ? data.embedding.values : null;
}

async function embedTextRotating(db, text) {
  try {
    return await withGeminiKeyRotation(db, (apiKey) => embedTextWithKey(text, apiKey));
  } catch (e) {
    console.error("embedTextRotating:", e instanceof Error ? e.message : e);
    return null;
  }
}

function toPgVector(values) {
  if (!Array.isArray(values)) return null;
  const nums = values.filter((v) => Number.isFinite(v)).map((v) => Number(v));
  if (nums.length === 0) return null;
  const dim = Number.isFinite(EMBEDDING_DIM) && EMBEDDING_DIM > 0 ? EMBEDDING_DIM : 768;
  const normalized = nums.length >= dim ? nums.slice(0, dim) : nums.concat(Array(dim - nums.length).fill(0));
  return `[${normalized.join(",")}]`;
}

function buildExplanationEmbedText(questionMode, mcq, sba) {
  if (questionMode === "mcq" && mcq && Array.isArray(mcq.trueFalse)) {
    const parts = mcq.trueFalse
      .map((row, i) => {
        const expl = typeof row?.explanation === "string" ? row.explanation.trim() : "";
        if (!expl) return null;
        const stmt = typeof row?.statement === "string" ? row.statement.trim() : "";
        const ans = row?.correct === "false" ? "FALSE" : "TRUE";
        return `Statement ${i + 1} (${ans}): ${stmt}\nExplanation: ${expl}`;
      })
      .filter(Boolean);
    return parts.join("\n\n");
  }
  if (questionMode === "sba" && sba && Array.isArray(sba.options)) {
    const correctIdx = Number(sba.correctIndex ?? 0);
    const expls = Array.isArray(sba.optionExplanations) ? sba.optionExplanations : [];
    const parts = sba.options
      .map((opt, i) => {
        const expl = typeof expls[i] === "string" ? expls[i].trim() : "";
        if (!expl) return null;
        const label = String.fromCharCode(97 + i);
        const role = i === correctIdx ? "CORRECT" : "WRONG";
        const text = typeof opt === "string" ? opt.trim() : "";
        return `Option ${label} (${role}): ${text}\nExplanation: ${expl}`;
      })
      .filter(Boolean);
    return parts.join("\n\n");
  }
  return "";
}

function normalizeDetailTable(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? sanitizeModelText(raw.title) : "";
  const headers = Array.isArray(raw.headers)
    ? raw.headers.filter((h) => typeof h === "string").map((h) => sanitizeModelText(h)).filter(Boolean)
    : [];
  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .map((row) => {
          const cells = Array.isArray(row?.cells)
            ? row.cells
                .filter((c) => typeof c === "string")
                .map((c) => sanitizeRichHtml(c))
                .filter((c) => !isRichHtmlEmpty(c))
            : Array.isArray(row)
              ? row
                  .filter((c) => typeof c === "string")
                  .map((c) => sanitizeRichHtml(c))
                  .filter((c) => !isRichHtmlEmpty(c))
              : [];
          return cells.length ? { cells } : null;
        })
        .filter(Boolean)
    : [];
  if (!title && headers.length === 0 && rows.length === 0) return null;
  return { title: title || null, headers, rows };
}

function stripHtml(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildConceptDetailEmbedText(summary, paragraphs, table) {
  const parts = [];
  const summaryText = stripHtml(summary);
  if (summaryText) parts.push(summaryText);
  if (Array.isArray(paragraphs)) {
    for (const p of paragraphs) {
      const text = stripHtml(p);
      if (text) parts.push(text);
    }
  }
  if (table?.title) parts.push(stripHtml(table.title) || table.title.trim());
  if (Array.isArray(table?.headers) && table.headers.length) {
    parts.push(table.headers.map((h) => stripHtml(h) || h).join(" | "));
  }
  for (const row of table?.rows ?? []) {
    if (Array.isArray(row?.cells) && row.cells.length) {
      parts.push(row.cells.map((c) => stripHtml(c) || c).join(" | "));
    }
  }
  return parts.join("\n\n");
}

async function fetchBoardNamesByConceptIds(db, conceptIds) {
  if (!conceptIds.length) return new Map();
  const { data } = await db
    .from("concept_boards")
    .select("concept_id, boards(id, name)")
    .in("concept_id", conceptIds);
  const map = new Map();
  for (const row of data ?? []) {
    const cid = row.concept_id;
    const name = row?.boards?.name;
    if (!cid || typeof name !== "string" || !name.trim()) continue;
    const list = map.get(cid) ?? [];
    if (!list.includes(name)) list.push(name);
    map.set(cid, list);
  }
  return map;
}

async function embedExplanationRotating(db, questionMode, mcq, sba) {
  const text = buildExplanationEmbedText(questionMode, mcq, sba);
  if (!text.trim()) return null;
  const emb = await embedTextRotating(db, text);
  return toPgVector(emb);
}

async function scoreMatchesWithGemini(apiKey, sourceText, candidates, customPrompt, modelName = "gemini-3.5-flash") {
  if (!Array.isArray(candidates) || candidates.length === 0) return {};
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      scores: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING },
            percentage: { type: SchemaType.NUMBER },
            reason: { type: SchemaType.STRING },
          },
          required: ["id", "percentage", "reason"],
        },
      },
    },
    required: ["scores"],
  };

  const prompt =
    typeof customPrompt === "string" && customPrompt.trim()
      ? customPrompt.trim()
      : getDefaultMatchingPrompt();

  const candidatesText = candidates
    .map((c, idx) => `${idx + 1}. id=${c.id} | concept=${c.concept_title ?? "N/A"} | text=${c.content}`)
    .join("\n");

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text: `${prompt}\n\nSOURCE:\n${sourceText}\n\nCANDIDATES:\n${candidatesText}\n\nReturn JSON only.`,
      }],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const raw = result?.response?.text?.() ?? "";
  const parsed = parseGeminiJson(raw);
  const scores = Array.isArray(parsed?.scores) ? parsed.scores : [];
  const map = {};
  for (const s of scores) {
    if (typeof s?.id !== "string") continue;
    const pct = Number(s?.percentage);
    if (!Number.isFinite(pct)) continue;
    const bounded = Math.max(0, Math.min(100, pct));
    map[s.id] = {
      percentage: bounded,
      reason: typeof s?.reason === "string" ? s.reason : "",
    };
  }
  return map;
}

app.post("/api/extract-concept", upload.single("image"), async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const inputText = String(req.body?.input_text ?? "").trim();
    if (!req.file && !inputText) {
      return res.status(400).json({ error: "Image file or input text is required" });
    }
    if (!(await requireExtract(req, res, db, { hasFile: Boolean(req.file), hasText: Boolean(inputText) }))) return;
    if (!(await hasGeminiKeys(db))) {
      return res.status(500).json({ error: "No Gemini API keys configured. Add keys in Settings → Gemini API." });
    }

    const models = await resolveAiModels(db);
    const modelName = models.primary;
    const fallbackModelName = models.fallback;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        concept_name: { type: SchemaType.STRING },
        verbatim_text: {
          type: SchemaType.STRING,
          description: "Exact/plain transcription of the source image/text without rewriting.",
        },
        high_yield_points: {
          type: SchemaType.ARRAY,
          description: "List of exam-friendly, high-yield points or stems extracted from the text.",
          items: { type: SchemaType.STRING },
        },
        detail_summary: {
          type: SchemaType.STRING,
          description: "One bold-style definition sentence summarizing the concept (same-to-same from source).",
        },
        detail_paragraphs: {
          type: SchemaType.ARRAY,
          description: "Teaching paragraphs or bullet-style detail blocks from the source, kept close to original wording.",
          items: { type: SchemaType.STRING },
        },
        detail_table: {
          type: SchemaType.OBJECT,
          description: "Structured table if the source contains one (e.g. Mediator | Source | Action).",
          properties: {
            title: { type: SchemaType.STRING },
            headers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            rows: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  cells: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                },
                required: ["cells"],
              },
            },
          },
        },
      },
      required: ["concept_name", "verbatim_text", "high_yield_points", "detail_summary", "detail_paragraphs"],
    };

    const generationConfig = {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema,
    };

    const promptConcept = (await getExtractConceptPrompt(db)).prompt;
    const promptKeyPoints = (await getExtractKeyPointsPrompt(db)).prompt;

    const prompt =
      `${promptConcept}\n\n${promptKeyPoints}\n` +
      "Return the output STRICTLY matching the JSON schema. Do not include any extra text.";

    const parts = [{ text: `${prompt}${inputText ? `\n\nSource text:\n${inputText}` : ""}` }];
    if (req.file) {
      const mime =
        req.file.mimetype === "application/pdf" || req.file.originalname?.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : req.file.mimetype || "image/jpeg";
      parts.push(fileToGenerativePart(req.file.buffer, mime));
    }

    const {
      concept_name,
      verbatim_text,
      high_yield_points,
      detail_summary,
      detail_paragraphs,
      detail_table,
    } = await withGeminiKeyRotation(db, async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const result = await generateWithFallback(genAI, modelName, fallbackModelName, {
        contents: [{ role: "user", parts }],
        generationConfig,
      });

      const text = result?.response?.text?.() ?? "";
      const parsed = parseGeminiJson(text);
      return {
        concept_name: typeof parsed?.concept_name === "string" ? sanitizeModelText(parsed.concept_name) : "",
        verbatim_text:
          typeof parsed?.verbatim_text === "string" ? sanitizeModelText(parsed.verbatim_text) : "",
        high_yield_points: Array.isArray(parsed?.high_yield_points)
          ? parsed.high_yield_points
              .filter((x) => typeof x === "string")
              .map((x) => sanitizeModelText(x))
              .filter(Boolean)
          : [],
        detail_summary:
          typeof parsed?.detail_summary === "string" ? sanitizeModelText(parsed.detail_summary) : "",
        detail_paragraphs: Array.isArray(parsed?.detail_paragraphs)
          ? parsed.detail_paragraphs
              .filter((x) => typeof x === "string")
              .map((x) => sanitizeModelText(x))
              .filter(Boolean)
          : [],
        detail_table: normalizeDetailTable(parsed?.detail_table),
      };
    });

    return res.json({
      concept_name,
      verbatim_text,
      high_yield_points,
      detail_summary,
      detail_paragraphs,
      detail_table,
    });
  } catch (e) {
    console.error(e);
    if (isLeakedOrBlockedKeyError(e)) {
      return res.status(403).json({
        error:
          "All Gemini API keys are blocked or invalid. Add new keys in Settings → Gemini API.",
      });
    }
    if (isQuotaError(e)) {
      return res.status(429).json({
        error:
          "AI quota exceeded on all configured keys. Add more keys in Settings → Gemini API or wait and retry.",
      });
    }
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post(
  "/api/extract-questions",
  (req, res, next) => {
    const ct = String(req.headers["content-type"] ?? "");
    if (ct.includes("multipart/form-data")) return upload.single("image")(req, res, next);
    return next();
  },
  async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    // Support multipart (image + text) and JSON body `{ input_text }` (text-only, more reliable).
    const inputText = String(req.body?.input_text ?? req.body?.source_text ?? req.body?.text ?? "").trim();
    if (!req.file && !inputText) {
      return res.status(400).json({ error: "Image file or input text is required" });
    }
    if (!(await requireCreateAiExtract(req, res, db, { hasFile: Boolean(req.file), hasText: Boolean(inputText) }))) return;
    if (!(await hasGeminiKeys(db))) {
      return res.status(500).json({ error: "No Gemini API keys configured. Add keys in Settings → Gemini API." });
    }

    const models = await resolveAiModels(db);
    const modelName = models.primary;
    const fallbackModelName = models.fallback;

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        questions: {
          type: SchemaType.ARRAY,
          description: "Every distinct exam question found in the source, in order.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question_type: {
                type: SchemaType.STRING,
                description: "Exactly mcq or sba.",
              },
              question_number: {
                type: SchemaType.STRING,
                description: "Question number prefix if present, e.g. 04.",
              },
              stem: {
                type: SchemaType.STRING,
                description: "Exact question stem as printed, including number and exam tag.",
              },
              mcq_statements: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    text: {
                      type: SchemaType.STRING,
                      description: "Exact option line as printed, e.g. a) Azygos vein",
                    },
                    correct: {
                      type: SchemaType.STRING,
                      description: "true or false from the answer key for this option.",
                    },
                  },
                  required: ["text", "correct"],
                },
              },
              sba_options: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    text: {
                      type: SchemaType.STRING,
                      description: "Exact option line as printed, e.g. a) Azygos vein",
                    },
                  },
                  required: ["text"],
                },
              },
              sba_correct_index: {
                type: SchemaType.NUMBER,
                description: "0-based index of the single correct SBA option (0=a).",
              },
            },
            required: ["question_type", "stem"],
          },
        },
      },
      required: ["questions"],
    };

    const generationConfig = {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema,
    };

    const { prompt } = await getExtractQuestionsPrompt(db);

    const parts = [{ text: `${prompt}${inputText ? `\n\nSource text:\n${inputText}` : ""}` }];
    if (req.file) parts.push(fileToGenerativePart(req.file.buffer, req.file.mimetype || "image/jpeg"));

    const questions = await withGeminiKeyRotation(db, async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const result = await generateWithFallback(genAI, modelName, fallbackModelName, {
        contents: [{ role: "user", parts }],
        generationConfig,
      });

      const text = result?.response?.text?.() ?? "";
      const parsed = parseGeminiJson(text);
      const rawQuestions = Array.isArray(parsed?.questions)
        ? parsed.questions
        : Array.isArray(parsed)
          ? parsed
          : [];

      return rawQuestions
        .map((q) => {
          const question_type =
            normalizeQuestionType(q?.question_type) ||
            normalizeQuestionType(q?.questionType) ||
            normalizeQuestionType(q?.type) ||
            normalizeQuestionType(q?.mode);
          const stem = preserveVerbatimText(q?.stem ?? q?.question ?? q?.text);
          if (!stem) return null;

          const rawMcq = Array.isArray(q?.mcq_statements)
            ? q.mcq_statements
            : Array.isArray(q?.trueFalse)
              ? q.trueFalse
              : Array.isArray(q?.statements)
                ? q.statements
                : Array.isArray(q?.options) && question_type === "mcq"
                  ? q.options
                  : [];
          const mcq_statements = rawMcq
            .map((row) => {
              const line = preserveVerbatimText(
                typeof row === "string" ? row : row?.text ?? row?.statement ?? row?.option,
              );
              if (!line) return null;
              return {
                text: line,
                correct: normalizeTfAnswer(
                  typeof row === "string" ? undefined : row?.correct ?? row?.answer ?? row?.is_correct,
                ),
              };
            })
            .filter(Boolean);

          const rawSba = Array.isArray(q?.sba_options)
            ? q.sba_options
            : Array.isArray(q?.options) && question_type !== "mcq"
              ? q.options
              : [];
          const sba_options = rawSba
            .map((row) => {
              const line = preserveVerbatimText(typeof row === "string" ? row : row?.text ?? row?.option);
              return line ? { text: line } : null;
            })
            .filter(Boolean);

          // Infer type when model omitted/odd question_type but options are present.
          let mode = question_type;
          if (!mode) {
            if (mcq_statements.length > 0) mode = "mcq";
            else if (sba_options.length > 0) mode = "sba";
            else mode = "sba";
          }

          if (mode === "mcq") {
            // Keep stem even if options missing — user can fill manually.
            const statements =
              mcq_statements.length > 0
                ? mcq_statements
                : sba_options.map((o) => ({ text: o.text, correct: "false" }));
            return {
              question_type: "mcq",
              question_number: preserveVerbatimText(q?.question_number ?? q?.questionNumber) || null,
              stem,
              mcq_statements:
                statements.length > 0
                  ? statements
                  : [{ text: "", correct: "false" }],
            };
          }

          const opts =
            sba_options.length > 0
              ? sba_options
              : mcq_statements.map((s) => ({ text: s.text }));
          let sba_correct_index = Number(q?.sba_correct_index ?? q?.sbaCorrectIndex ?? q?.correct_index);
          if (!Number.isInteger(sba_correct_index) || sba_correct_index < 0 || sba_correct_index > 4) {
            sba_correct_index = labelToOptionIndex(q?.sba_correct_label ?? q?.correct_option ?? q?.correct);
          }
          const sliced = (opts.length > 0 ? opts : [{ text: "" }]).slice(0, 5);
          return {
            question_type: "sba",
            question_number: preserveVerbatimText(q?.question_number ?? q?.questionNumber) || null,
            stem,
            sba_options: sliced,
            sba_correct_index: Math.min(Math.max(0, sba_correct_index), sliced.length - 1),
          };
        })
        .filter(Boolean);
    });

    return res.json({ questions });
  } catch (e) {
    console.error(e);
    if (isLeakedOrBlockedKeyError(e)) {
      return res.status(403).json({
        error: "All Gemini API keys are blocked or invalid. Add new keys in Settings → Gemini API.",
      });
    }
    if (isQuotaError(e)) {
      return res.status(429).json({
        error: "AI quota exceeded on all configured keys. Add more keys in Settings → Gemini API or wait and retry.",
      });
    }
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/generate-question-explanations", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "question_bank.create_ai.edit"))) return;
    if (!(await hasGeminiKeys(db))) {
      return res.status(500).json({ error: "No Gemini API keys configured. Add keys in Settings → Gemini API." });
    }

    const rawList = Array.isArray(req.body?.questions) ? req.body.questions : req.body?.question ? [req.body.question] : [];
    const questions = rawList
      .map((q, idx) => {
        const mode = q?.questionMode === "mcq" || q?.questionMode === "sba" ? q.questionMode : null;
        if (!mode) return null;
        if (mode === "mcq") {
          const stem = typeof q?.mcq?.stem === "string" ? q.mcq.stem.trim() : "";
          const statements = Array.isArray(q?.mcq?.trueFalse)
            ? q.mcq.trueFalse
                .map((row) => ({
                  text: typeof row?.statement === "string" ? row.statement.trim() : "",
                  correct: normalizeTfAnswer(row?.correct),
                }))
                .filter((row) => row.text)
            : [];
          if (!stem || statements.length === 0) return null;
          return { question_index: idx, question_mode: "mcq", stem, statements };
        }
        const stem = typeof q?.sba?.stem === "string" ? q.sba.stem.trim() : "";
        const options = Array.isArray(q?.sba?.options)
          ? q.sba.options.map((o) => (typeof o === "string" ? o.trim() : "")).slice(0, 5)
          : [];
        if (!stem || options.filter(Boolean).length === 0) return null;
        let correctIndex = Number(q?.sba?.correctIndex ?? q?.sba?.correct_index ?? 0);
        if (!Number.isInteger(correctIndex) || correctIndex < 0) correctIndex = 0;
        if (correctIndex > 4) correctIndex = 4;
        return { question_index: idx, question_mode: "sba", stem, options, correct_index: correctIndex };
      })
      .filter(Boolean);

    if (questions.length === 0) {
      return res.status(400).json({ error: "At least one valid MCQ or SBA question with stem and options is required" });
    }

    const models = await resolveAiModels(db);
    const modelName = models.primary;
    const fallbackModelName = models.fallback;
    const concept = typeof req.body?.concept === "string" ? req.body.concept.trim() : "";

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        results: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question_index: { type: SchemaType.NUMBER },
              mcq_explanations: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    statement_index: { type: SchemaType.NUMBER },
                    explanation: { type: SchemaType.STRING },
                  },
                  required: ["statement_index", "explanation"],
                },
              },
              option_explanations: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
              },
            },
            required: ["question_index"],
          },
        },
      },
      required: ["results"],
    };

    const questionsBlock = questions
      .map((q) => {
        if (q.question_mode === "mcq") {
          const lines = q.statements
            .map((s, i) => `  ${i}. [${s.correct.toUpperCase()}] ${s.text}`)
            .join("\n");
          return `Question #${q.question_index} (MCQ T/F)\nStem: ${q.stem}\nStatements:\n${lines}`;
        }
        const opts = q.options
          .map((o, i) => {
            const label = String.fromCharCode(97 + i);
            const mark = i === q.correct_index ? " ← CORRECT" : "";
            return `  ${label}) ${o || "—"}${mark}`;
          })
          .join("\n");
        return `Question #${q.question_index} (SBA)\nStem: ${q.stem}\nOptions:\n${opts}`;
      })
      .join("\n\n");

    const { prompt: explanationsPrompt } = await getQuestionExplanationsPrompt(db);
    const prompt = `${explanationsPrompt.trim()}${concept ? `\n\nConcept context: ${concept}` : ""}

QUESTIONS:
${questionsBlock}`;

    const generationConfig = {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema,
    };

    const parsed = await withGeminiKeyRotation(db, async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const result = await generateWithFallback(genAI, modelName, fallbackModelName, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });
      const text = result?.response?.text?.() ?? "";
      return parseGeminiJson(text);
    });

    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    const byIndex = new Map();
    for (const row of results) {
      const qi = Number(row?.question_index);
      if (!Number.isInteger(qi) || qi < 0) continue;
      const entry = { question_index: qi };
      if (Array.isArray(row?.mcq_explanations)) {
        entry.mcq_explanations = row.mcq_explanations
          .map((x) => ({
            statement_index: Number(x?.statement_index),
            explanation: sanitizeModelText(x?.explanation),
          }))
          .filter((x) => Number.isInteger(x.statement_index) && x.statement_index >= 0 && x.explanation);
      }
      if (Array.isArray(row?.option_explanations)) {
        entry.option_explanations = row.option_explanations
          .slice(0, 5)
          .map((x) => sanitizeModelText(x));
        while (entry.option_explanations.length < 5) entry.option_explanations.push("");
      }
      byIndex.set(qi, entry);
    }

    return res.json({
      results: questions.map((q) => {
        const gen = byIndex.get(q.question_index);
        if (q.question_mode === "mcq") {
          const explanations = (q.statements ?? []).map(() => "");
          for (const item of gen?.mcq_explanations ?? []) {
            if (item.statement_index < explanations.length) {
              explanations[item.statement_index] = item.explanation;
            }
          }
          return { question_index: q.question_index, question_mode: "mcq", explanations };
        }
        const option_explanations = gen?.option_explanations ?? ["", "", "", "", ""];
        return { question_index: q.question_index, question_mode: "sba", option_explanations };
      }),
    });
  } catch (e) {
    console.error(e);
    if (isLeakedOrBlockedKeyError(e)) {
      return res.status(403).json({
        error: "All Gemini API keys are blocked or invalid. Add new keys in Settings → Gemini API.",
      });
    }
    if (isQuotaError(e)) {
      return res.status(429).json({
        error: "AI quota exceeded on all configured keys. Add more keys in Settings → Gemini API or wait and retry.",
      });
    }
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Debug only (masked): confirm server env is updated.
app.get("/api/debug/env", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const info = await listGeminiKeysForSettings(db);
    const models = await resolveAiModels(db);
    const envKey = process.env.GEMINI_API_KEY || "";
    return res.json({
      hasKey: info.count > 0 || Boolean(envKey),
      keySource: info.source,
      keysInDb: info.count,
      keyMasked: info.keys?.[0]?.masked ?? (envKey ? maskKey(envKey) : null),
      envFallbackMasked: info.env_fallback_masked,
      primaryModel: models.primary,
      fallbackModel: models.fallback,
      matchModel: models.match,
    });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

/** One minimal generateContent call to verify key + model access (dev only). */
app.get("/api/debug/test-gemini", async (_req, res) => {
  const db = requireSupabase(res);
  if (!db) return;
  const models = await resolveAiModels(db);
  const modelName = models.primary;
  if (!(await hasGeminiKeys(db))) {
    return res.status(500).json({ ok: false, kind: "missing_key", message: "No Gemini API keys configured" });
  }
  try {
    const keyCount = (await getGeminiKeyList(db)).length;
    let usedKey = "";
    const text = await withGeminiKeyRotation(db, async (apiKey) => {
      usedKey = apiKey;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: 'Reply with exactly: "ok"' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 },
      });
      return String(result?.response?.text?.() ?? "").trim();
    });
    return res.json({
      ok: true,
      model: modelName,
      keyMasked: maskKey(usedKey),
      keys_tested: keyCount,
      snippet: text.slice(0, 120),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    let kind = "other";
    if (lower.includes("reported as leaked")) kind = "leaked_key";
    else if (lower.includes("403") && lower.includes("forbidden")) kind = "forbidden";
    else if (lower.includes("429") || lower.includes("quota") || lower.includes("rate limit")) kind = "quota";
    const status = kind === "leaked_key" || kind === "forbidden" ? 403 : kind === "quota" ? 429 : 502;
    return res.status(status).json({
      ok: false,
      kind,
      model: modelName,
      message: msg,
    });
  }
});

app.get("/api/settings/database", async (_req, res) => {
  try {
    const { config, meta } = await loadFullConnectionConfig();
    return res.json({ config: maskConnectionConfig(config), meta, tables: BACKUP_TABLES });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Load failed" });
  }
});

app.put("/api/settings/database", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.connection.edit"))) return;
    const { supabase, postgres, writeEnv, syncAppSettings } = req.body ?? {};
    const result = await saveConnectionConfig(
      { supabase, postgres },
      { writeEnv: Boolean(writeEnv), syncAppSettings: syncAppSettings !== false },
    );
    return res.json({
      ok: true,
      config: maskConnectionConfig(result.config),
      meta: result.meta,
      envSnippet: buildEnvSnippet(result.config),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Save failed" });
  }
});

app.post("/api/settings/database/test-supabase", async (req, res) => {
  try {
    const { config } = req.body ?? {};
    const { config: current } = await loadFullConnectionConfig();
    const merged = {
      supabase: { ...current.supabase, ...(config?.supabase ?? {}) },
      postgres: current.postgres,
    };
    return res.json(await testSupabaseConnection(merged));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Test failed" });
  }
});

app.post("/api/settings/database/test-postgres", async (req, res) => {
  try {
    const { config } = req.body ?? {};
    const { config: current } = await loadFullConnectionConfig();
    const merged = {
      supabase: current.supabase,
      postgres: { ...current.postgres, ...(config?.postgres ?? {}) },
    };
    return res.json(await testPostgresConnection(merged));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Test failed" });
  }
});

app.get("/api/settings/database/stats", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const stats = await getDatabaseStats(db);
    return res.json({ stats, meta: getConnectionMeta() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Stats failed" });
  }
});

app.post("/api/settings/database/backup", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.connection.backup"))) return;
    const { includeSql, includeEmbeddings, tables } = req.body ?? {};
    const backup = await createBackup(db, {
      includeSql: Boolean(includeSql),
      includeEmbeddings: includeEmbeddings !== false,
      tables: Array.isArray(tables) && tables.length ? tables : undefined,
    });
    return res.json({ ok: true, backup });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Backup failed" });
  }
});

app.get("/api/settings/database/backups", async (_req, res) => {
  try {
    return res.json({ backups: listBackups() });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "List failed" });
  }
});

app.get("/api/settings/database/backups/:id/download", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.connection.backup"))) return;
    const format = String(req.query.format ?? "json").toLowerCase() === "sql" ? "sql" : "json";
    const filePath = getBackupFilePath(req.params.id, format);
    if (!filePath) return res.status(404).json({ error: "Backup not found" });
    const filename = path.basename(filePath);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", format === "sql" ? "application/sql" : "application/json");
    return res.sendFile(filePath);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Download failed" });
  }
});

app.post("/api/settings/database/migrate", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.connection.migrate"))) return;
    const jobId = startMigrationJob(db, req.body ?? {});
    return res.json({ ok: true, jobId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Migration start failed" });
  }
});

app.get("/api/settings/database/migrate/:jobId", async (req, res) => {
  try {
    const job = getMigrationJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Migration job not found" });
    return res.json(job);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Status failed" });
  }
});

app.get("/api/settings/database/env-snippet", async (_req, res) => {
  try {
    const { config } = await loadFullConnectionConfig();
    return res.json({ snippet: buildEnvSnippet(config) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
  }
});

app.get("/api/settings/prompts/extract-questions", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await getExtractQuestionsPrompt(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.get("/api/settings/appearance", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await getUiAppearance(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.put("/api/settings/appearance", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.appearance.edit"))) return;
    const result = await saveUiAppearance(db, req.body);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) || (e instanceof Error ? e.message : "Save failed") });
  }
});

app.post("/api/settings/appearance/reset", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.appearance.reset"))) return;
    const result = await resetUiAppearance(db);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.put("/api/settings/prompts/extract-questions", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.prompts.edit"))) return;
    const result = await saveExtractQuestionsPrompt(db, req.body?.prompt);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Save failed" });
  }
});

app.post("/api/settings/prompts/extract-questions/reset", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.prompts.reset"))) return;
    const result = await resetExtractQuestionsPrompt(db);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

const promptHandlers = [
  ["extract-concept", getExtractConceptPrompt, saveExtractConceptPrompt, resetExtractConceptPrompt],
  ["extract-key-points", getExtractKeyPointsPrompt, saveExtractKeyPointsPrompt, resetExtractKeyPointsPrompt],
  ["question-explanations", getQuestionExplanationsPrompt, saveQuestionExplanationsPrompt, resetQuestionExplanationsPrompt],
];

for (const [slug, getFn, saveFn, resetFn] of promptHandlers) {
  app.get(`/api/settings/prompts/${slug}`, async (_req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      return res.json(await getFn(db));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: formatSupabaseError(e) });
    }
  });

  app.put(`/api/settings/prompts/${slug}`, async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "settings.prompts.edit"))) return;
      const result = await saveFn(db, req.body?.prompt);
      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error(e);
      return res.status(400).json({ error: e instanceof Error ? e.message : "Save failed" });
    }
  });

  app.post(`/api/settings/prompts/${slug}/reset`, async (req, res) => {
    try {
      const db = requireSupabase(res);
      if (!db) return;
      if (!(await requirePerm(req, res, db, "settings.prompts.reset"))) return;
      const result = await resetFn(db);
      return res.json({ ok: true, ...result });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: formatSupabaseError(e) });
    }
  });
}

app.get("/api/settings/prompts/matching", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await getMatchingPromptConfig(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.put("/api/settings/prompts/matching", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.prompts.edit"))) return;
    const { prompt, vector_enabled, ai_enabled } = req.body ?? {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Matching prompt is required" });
    }
    const result = await saveMatchingPromptConfig(db, {
      prompt,
      vector_enabled: typeof vector_enabled === "boolean" ? vector_enabled : undefined,
      ai_enabled: typeof ai_enabled === "boolean" ? ai_enabled : undefined,
    });
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Save failed" });
  }
});

app.post("/api/settings/prompts/matching/reset", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.prompts.reset"))) return;
    const result = await resetMatchingPromptConfig(db);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await registerUser(db, req.body?.email, req.body?.password);
    const session = await loginUser(db, user.email, req.body?.password, { userOnly: false });
    return res.json({ ok: true, ...session });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const mode = String(req.body?.mode ?? "user");
    const session = await loginUser(db, req.body?.email, req.body?.password, {
      adminOnly: mode === "admin",
      userOnly: mode === "user",
    });
    return res.json({ ok: true, ...session });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: e instanceof Error ? e.message : "Login failed" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const token = getBearerToken(req);
    if (token) await logoutSession(db, token);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Logout failed" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const token = getBearerToken(req);
    const user = token ? await validateSession(db, token) : null;
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    return res.json({ user: formatAuthUser(user) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/auth/profile", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await requireAuthUser(req, res, db);
    if (!user) return;
    const { displayName, currentPassword, newPassword } = req.body ?? {};
    const updated = await updateUserProfile(db, user.id, { displayName, currentPassword, newPassword });
    return res.json({
      ok: true,
      user: formatAuthUser({
        id: updated.id,
        email: updated.email,
        role: updated.role,
        permissions: updated.permissions,
        displayName: updated.display_name ?? null,
        createdAt: updated.created_at ?? null,
      }),
    });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Update failed" });
  }
});

async function requireAuthUser(req, res, db) {
  const token = getBearerToken(req);
  const user = token ? await validateSession(db, token) : null;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return user;
}

async function requireAdminUser(req, res, db) {
  const user = await requireAuthUser(req, res, db);
  if (!user) return null;
  if (user.role !== "admin") {
    res.status(403).json({ error: "Full administrator access required" });
    return null;
  }
  return user;
}

async function requireStaff(req, res, db) {
  return requireStaffArea(req, res, db, validateSession, getBearerToken);
}

async function requirePerm(req, res, db, permission) {
  return requirePermission(req, res, db, permission, validateSession, getBearerToken);
}

async function requireAnyPerm(req, res, db, permissions) {
  return requireAnyPermission(req, res, db, permissions, validateSession, getBearerToken);
}

async function requireExtract(req, res, db, { hasFile, hasText }) {
  return requireExtractAccess(req, res, db, validateSession, getBearerToken, { hasFile, hasText });
}

async function requireCreateAiExtract(req, res, db, { hasFile, hasText }) {
  return requireCreateAiExtractAccess(req, res, db, validateSession, getBearerToken, { hasFile, hasText });
}

function formatAuthUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName ?? null,
    permissions: permissionsForResponse(user),
    createdAt: user.createdAt ?? null,
  };
}

app.get("/api/settings/access/permissions", async (_req, res) => {
  try {
    return res.json({ groups: PERMISSION_GROUPS, all_keys: ALL_PERMISSION_KEYS });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
  }
});

app.get("/api/settings/access/users", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const actor = await requireAdminUser(req, res, db);
    if (!actor) return;
    const users = await listAccessUsers(db);
    return res.json({ users });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Failed" });
  }
});

app.post("/api/settings/access/users", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const actor = await requireAdminUser(req, res, db);
    if (!actor) return;
    const { email, password, permissions, displayName } = req.body ?? {};
    const user = await createStaffUser(db, { email, password, permissions, displayName });
    return res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Create failed" });
  }
});

app.patch("/api/settings/access/users/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const actor = await requireAdminUser(req, res, db);
    if (!actor) return;
    const { email, password, permissions, displayName } = req.body ?? {};
    const user = await updateStaffUser(
      db,
      req.params.id,
      { email, password, permissions, displayName },
      { actorId: actor.id },
    );
    return res.json({ ok: true, user });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Update failed" });
  }
});

app.delete("/api/settings/access/users/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const actor = await requireAdminUser(req, res, db);
    if (!actor) return;
    await deleteStaffUser(db, req.params.id, { actorId: actor.id });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Delete failed" });
  }
});

app.get("/api/user/progress/study", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await requireAuthUser(req, res, db);
    if (!user) return;
    const { data, error } = await db
      .from("user_study_progress")
      .select("concept_id, concept_name, studied_key_point_ids, total_key_points, last_studied_at")
      .eq("user_id", user.id);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.put("/api/user/progress/study", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await requireAuthUser(req, res, db);
    if (!user) return;
    const body = req.body ?? {};
    const conceptId = String(body.concept_id ?? "").trim();
    if (!conceptId) return res.status(400).json({ error: "concept_id required" });
    const row = {
      user_id: user.id,
      concept_id: conceptId,
      concept_name: String(body.concept_name ?? ""),
      studied_key_point_ids: Array.isArray(body.studied_key_point_ids) ? body.studied_key_point_ids : [],
      total_key_points: Number(body.total_key_points ?? 0),
      last_studied_at: body.last_studied_at ?? new Date().toISOString(),
    };
    const { error } = await db.from("user_study_progress").upsert(row, { onConflict: "user_id,concept_id" });
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/user/progress/practice", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await requireAuthUser(req, res, db);
    if (!user) return;
    const { data, error } = await db
      .from("user_practice_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ rows: data ?? [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.put("/api/user/progress/practice", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const user = await requireAuthUser(req, res, db);
    if (!user) return;
    const body = req.body ?? {};
    const id = String(body.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    const row = {
      id,
      user_id: user.id,
      concept_id: String(body.concept_id ?? ""),
      concept_name: String(body.concept_name ?? ""),
      title: String(body.title ?? ""),
      question_ids: Array.isArray(body.question_ids) ? body.question_ids : [],
      answers: body.answers ?? null,
      score: body.score != null ? Number(body.score) : null,
      total: body.total != null ? Number(body.total) : null,
      created_at: body.created_at ?? new Date().toISOString(),
      completed_at: body.completed_at ?? null,
    };
    const { error } = await db.from("user_practice_sessions").upsert(row, { onConflict: "user_id,id" });
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/settings/gemini-keys", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await listGeminiKeysForSettings(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.get("/api/settings/gemini-models", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await getGeminiModelSettings(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: formatSupabaseError(e) });
  }
});

app.put("/api/settings/gemini-models", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.gemini.edit"))) return;
    const result = await saveGeminiModelSettings(db, req.body ?? {});
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Save failed" });
  }
});

app.put("/api/settings/gemini-keys", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.gemini.edit"))) return;
    const keys = req.body?.keys;
    const result = await saveGeminiKeys(db, keys);
    invalidateKeyCache();
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Save failed" });
  }
});

app.post("/api/settings/gemini-keys", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.gemini.add"))) return;
    const keys = req.body?.keys ?? (req.body?.api_key ? [req.body.api_key] : []);
    const result = await addGeminiKeys(db, keys);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Add failed" });
  }
});

app.patch("/api/settings/gemini-keys/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.gemini.edit"))) return;
    const result = await updateGeminiKey(db, req.params.id, req.body ?? {});
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Update failed" });
  }
});


app.delete("/api/settings/gemini-keys/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.gemini.delete"))) return;
    await deleteGeminiKey(db, req.params.id);
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e instanceof Error ? e.message : "Delete failed" });
  }
});

app.post("/api/settings/gemini-keys/:id/test", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const result = await testGeminiKeyById(db, req.params.id);
    const status = result.ok ? 200 : result.status === "quota_exceeded" ? 429 : result.status === "invalid" ? 403 : 502;
    return res.status(status).json(result);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ ok: false, error: e instanceof Error ? e.message : "Test failed" });
  }
});


app.post("/api/settings/gemini-keys/test-all", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    return res.json(await testAllGeminiKeys(db));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Test failed" });
  }
});

app.get("/api/db-health", async (_req, res) => {
  const db = requireSupabase(res);
  if (!db) return;
  const { error } = await db.from("concepts").select("id").limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});

app.get("/api/concepts", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const topicId = String(req.query.topic_id ?? "").trim();
    const subject = String(req.query.subject ?? "").trim();
    const system = String(req.query.system ?? "").trim();
    const chapter = String(req.query.chapter ?? "").trim();
    const topic = String(req.query.topic ?? "").trim();
    const search = String(req.query.search ?? "").trim().toLowerCase();

    let query = db
      .from("concepts")
      .select("id, title, subject, system, chapter, topic, topic_id, created_at, key_points(count)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (topicId) query = query.eq("topic_id", topicId);
    if (subject) query = query.eq("subject", subject);
    if (system) query = query.eq("system", system);
    if (chapter) query = query.eq("chapter", chapter);
    if (topic) query = query.eq("topic", topic);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });

    let concepts = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      subject: row.subject,
      system: row.system,
      chapter: row.chapter,
      topic: row.topic,
      topic_id: row.topic_id,
      created_at: row.created_at,
      key_point_count: Array.isArray(row.key_points) && row.key_points[0]?.count != null ? Number(row.key_points[0].count) : 0,
    }));

    if (search) {
      concepts = concepts.filter((c) =>
        `${c.title ?? ""} ${c.subject ?? ""} ${c.system ?? ""} ${c.chapter ?? ""} ${c.topic ?? ""}`
          .toLowerCase()
          .includes(search),
      );
    }

    return res.json({ concepts });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/concepts/lookup", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const title = String(req.query.title ?? "").trim();
    if (!title) return res.status(400).json({ error: "title required" });
    const subject = String(req.query.subject ?? "").trim();
    const system = String(req.query.system ?? "").trim();
    const chapter = String(req.query.chapter ?? "").trim();
    const topic = String(req.query.topic ?? "").trim();

    const selectCols =
      "id, title, subject, system, chapter, topic, topic_id, detail_summary, detail_paragraphs, detail_table, raw_extraction, created_at";

    const loadKeyPoints = async (conceptId) => {
      const { data: keyPoints, error: kpErr } = await db
        .from("key_points")
        .select("id, content, position")
        .eq("concept_id", conceptId)
        .order("position", { ascending: true });
      if (kpErr) throw new Error(kpErr.message);
      return keyPoints ?? [];
    };

    const pickBest = (rows) => {
      if (!rows?.length) return null;
      const normalized = title.toLowerCase();
      const exact = rows.find((r) => (r.title ?? "").trim().toLowerCase() === normalized);
      if (exact) return exact;
      if (subject) {
        const byTaxonomy = rows.find((r) => (r.subject ?? "").trim().toLowerCase() === subject.toLowerCase());
        if (byTaxonomy) return byTaxonomy;
      }
      return rows[0];
    };

    let { data: exactRows, error } = await db.from("concepts").select(selectCols).ilike("title", title).limit(5);
    if (error && /detail_summary|detail_paragraphs|detail_table|column/i.test(error.message)) {
      ({ data: exactRows, error } = await db.from("concepts").select("id, title, subject, system, chapter, topic, topic_id, raw_extraction, created_at").ilike("title", title).limit(5));
    }
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });

    let concept = pickBest(exactRows);
    if (!concept) {
      let fuzzyQuery = db.from("concepts").select(selectCols).ilike("title", `%${title}%`).limit(20);
      if (subject) fuzzyQuery = fuzzyQuery.eq("subject", subject);
      if (system) fuzzyQuery = fuzzyQuery.eq("system", system);
      if (chapter) fuzzyQuery = fuzzyQuery.eq("chapter", chapter);
      if (topic) fuzzyQuery = fuzzyQuery.eq("topic", topic);
      let { data: fuzzyRows, error: fuzzyErr } = await fuzzyQuery;
      if (fuzzyErr && /detail_summary|detail_paragraphs|detail_table|column/i.test(fuzzyErr.message)) {
        let fallbackQuery = db
          .from("concepts")
          .select("id, title, subject, system, chapter, topic, topic_id, raw_extraction, created_at")
          .ilike("title", `%${title}%`)
          .limit(20);
        if (subject) fallbackQuery = fallbackQuery.eq("subject", subject);
        if (system) fallbackQuery = fallbackQuery.eq("system", system);
        if (chapter) fallbackQuery = fallbackQuery.eq("chapter", chapter);
        if (topic) fallbackQuery = fallbackQuery.eq("topic", topic);
        ({ data: fuzzyRows, error: fuzzyErr } = await fallbackQuery);
      }
      if (fuzzyErr) return res.status(500).json({ error: formatSupabaseError(fuzzyErr) });
      concept = pickBest(fuzzyRows);
    }

    if (!concept) return res.status(404).json({ error: "Concept not found" });

    const key_points = await enrichKeyPointsWithBoards(db, concept.id, await loadKeyPoints(concept.id));
    return res.json({ concept, key_points });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/concepts/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    const { data: concept, error } = await db
      .from("concepts")
      .select(
        "id, title, subject, system, chapter, topic, topic_id, detail_summary, detail_paragraphs, detail_table, raw_extraction, created_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    const { data: keyPoints, error: kpErr } = await db
      .from("key_points")
      .select("id, content, position, increment_count")
      .eq("concept_id", id)
      .order("position", { ascending: true });
    if (kpErr) return res.status(500).json({ error: formatSupabaseError(kpErr) });

    const key_points = await enrichKeyPointsWithBoards(db, id, keyPoints ?? []);
    return res.json({ concept, key_points });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/concepts/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requireAnyPerm(req, res, db, ["settings.concepts.edit", "home.edit"]))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    const { data: existing, error: loadErr } = await db
      .from("concepts")
      .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
      .eq("id", id)
      .maybeSingle();
    if (loadErr) return res.status(500).json({ error: formatSupabaseError(loadErr) });
    if (!existing) return res.status(404).json({ error: "Concept not found" });

    const patch = { updated_at: new Date().toISOString() };
    if (typeof req.body?.title === "string") {
      const title = req.body.title.trim();
      if (!title) return res.status(400).json({ error: "title cannot be empty" });
      patch.title = title;
    }
    if (typeof req.body?.subject === "string") patch.subject = req.body.subject.trim() || null;
    if (typeof req.body?.system === "string") patch.system = req.body.system.trim() || null;
    if (typeof req.body?.chapter === "string") patch.chapter = req.body.chapter.trim() || null;
    if (typeof req.body?.topic === "string") patch.topic = req.body.topic.trim() || null;
    if (typeof req.body?.topic_id === "string") patch.topic_id = req.body.topic_id.trim() || null;

    let detailUpdated = false;
    if (typeof req.body?.detail_summary === "string") {
      patch.detail_summary = isRichHtmlEmpty(req.body.detail_summary)
        ? null
        : sanitizeRichHtml(req.body.detail_summary);
      detailUpdated = true;
    }
    if (Array.isArray(req.body?.detail_paragraphs)) {
      patch.detail_paragraphs = req.body.detail_paragraphs
        .filter((p) => typeof p === "string")
        .map((p) => sanitizeRichHtml(p))
        .filter((p) => !isRichHtmlEmpty(p));
      detailUpdated = true;
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "detail_table")) {
      patch.detail_table = normalizeDetailTable(req.body.detail_table);
      detailUpdated = true;
    }

    let storyUpdated = false;
    let nextStoryHtml = undefined;
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "story_html")) {
      const rawStory = req.body.story_html;
      nextStoryHtml =
        typeof rawStory === "string" && !isRichHtmlEmpty(rawStory)
          ? sanitizeRichHtml(rawStory)
          : null;
      storyUpdated = true;
    }

    if (detailUpdated || storyUpdated) {
      const summary =
        patch.detail_summary !== undefined ? patch.detail_summary : existing.detail_summary;
      const paragraphs =
        patch.detail_paragraphs !== undefined ? patch.detail_paragraphs : existing.detail_paragraphs ?? [];
      const table =
        patch.detail_table !== undefined ? patch.detail_table : existing.detail_table;
      if (detailUpdated) {
        const embedText = buildConceptDetailEmbedText(summary, paragraphs, table);
        const detailEmbedding = embedText ? await embedTextRotating(db, embedText) : null;
        patch.detail_embedding = toPgVector(detailEmbedding);
      }
      const raw = existing.raw_extraction && typeof existing.raw_extraction === "object" ? existing.raw_extraction : {};
      const prevStory =
        typeof raw.story_html === "string" ? raw.story_html : null;
      patch.raw_extraction = {
        ...raw,
        detail_summary: summary,
        detail_paragraphs: paragraphs,
        detail_table: table,
        story_html: storyUpdated ? nextStoryHtml : prevStory,
      };
    }

    if (Object.keys(patch).length <= 1) return res.status(400).json({ error: "No fields to update" });

    const { data, error } = await db
      .from("concepts")
      .update(patch)
      .eq("id", id)
      .select(
        "id, title, subject, system, chapter, topic, topic_id, detail_summary, detail_paragraphs, detail_table, raw_extraction, created_at",
      );
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    const concept = Array.isArray(data) ? data[0] : null;
    if (!concept) return res.status(404).json({ error: "Concept not found" });
    return res.json({ concept, detail_embedding_saved: detailUpdated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/concepts/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.concepts.delete"))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await db.from("concepts").delete().eq("id", id);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/boards", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const { data, error } = await db.from("boards").select("id, name, created_at").order("name", { ascending: true });
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ boards: data ?? [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});



app.post("/api/boards", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.boards.add"))) return;
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const { data, error } = await db.from("boards").insert({ name }).select("id, name, created_at");
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    const board = Array.isArray(data) ? data[0] : null;
    if (!board) return res.status(500).json({ error: "Board insert returned no row (check RLS and SUPABASE_SERVICE_ROLE_KEY)." });
    return res.json({ board });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/boards/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.boards.delete"))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await db.from("boards").delete().eq("id", id);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/boards/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "settings.boards.edit"))) return;
    const id = String(req.params.id ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    if (!name) return res.status(400).json({ error: "name required" });
    const { data, error } = await db.from("boards").update({ name }).eq("id", id).select("id, name, created_at");
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    const board = Array.isArray(data) ? data[0] : null;
    if (!board) return res.status(404).json({ error: "Board not found" });
    return res.json({ board });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});



/** Must be registered before GET /api/taxonomy/:level so "resolve" is not captured as :level */
app.get("/api/taxonomy/resolve/:topicId", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const topicId = String(req.params.topicId ?? "").trim();
    if (!topicId) return res.status(400).json({ error: "topicId required" });
    const { data: topic, error: tErr } = await db.from("topics").select("id, name, chapter_id").eq("id", topicId).single();
    if (tErr || !topic) return res.status(404).json({ error: "Topic not found" });
    const { data: chapter } = await db.from("chapters").select("id, name, system_id").eq("id", topic.chapter_id).single();
    const { data: system } = chapter ? await db.from("systems").select("id, name, subject_id").eq("id", chapter.system_id).single() : { data: null };
    const { data: subject } = system ? await db.from("subjects").select("id, name").eq("id", system.subject_id).single() : { data: null };
    return res.json({
      subject: subject ? { id: subject.id, name: subject.name } : null,
      system: system ? { id: system.id, name: system.name } : null,
      chapter: chapter ? { id: chapter.id, name: chapter.name } : null,
      topic: { id: topic.id, name: topic.name },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/taxonomy/:level", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const table = taxonomyTable(String(req.params.level ?? ""));
    if (!table) return res.status(400).json({ error: "Invalid taxonomy level" });
    const parentKey = taxonomyParentKey(String(req.params.level ?? ""));
    const parentId = String(req.query.parent_id ?? "").trim();
    let query = db.from(table).select("id, name, sort_order, created_at" + (parentKey ? `, ${parentKey}` : "")).order("name", { ascending: true });
    if (parentKey && parentId) query = query.eq(parentKey, parentId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ items: data ?? [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/taxonomy/:level", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const level = String(req.params.level ?? "");
    const perm = taxonomyActionPermission(level, "add");
    if (!perm || !(await requirePerm(req, res, db, perm))) return;
    const table = taxonomyTable(level);
    if (!table) return res.status(400).json({ error: "Invalid taxonomy level" });
    const name = String(req.body?.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "name required" });
    const row = { name };
    const parentKey = taxonomyParentKey(level);
    if (parentKey) {
      const parentId = String(req.body?.parent_id ?? "").trim();
      if (!parentId) return res.status(400).json({ error: "parent_id required" });
      row[parentKey] = parentId;
    }
    const selectCols = "id, name, sort_order, created_at" + (parentKey ? `, ${parentKey}` : "");
    const { data, error } = await db.from(table).insert(row).select(selectCols);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    const item = Array.isArray(data) ? data[0] : null;
    if (!item) {
      return res.status(500).json({
        error:
          "Insert did not return a row. If the row was created, RLS may be blocking read-back — use the service role key (SUPABASE_SERVICE_ROLE_KEY) in .env for the API server, or add a SELECT policy for anon.",
      });
    }
    return res.json({ item });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/taxonomy/:level/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const level = String(req.params.level ?? "");
    const perm = taxonomyActionPermission(level, "delete");
    if (!perm || !(await requirePerm(req, res, db, perm))) return;
    const table = taxonomyTable(level);
    if (!table) return res.status(400).json({ error: "Invalid taxonomy level" });
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/taxonomy/:level/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const level = String(req.params.level ?? "");
    const perm = taxonomyActionPermission(level, "edit");
    if (!perm || !(await requirePerm(req, res, db, perm))) return;
    const table = taxonomyTable(level);
    if (!table) return res.status(400).json({ error: "Invalid taxonomy level" });
    const id = String(req.params.id ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    if (!name) return res.status(400).json({ error: "name required" });
    const parentKey = taxonomyParentKey(level);
    const selectCols = "id, name, sort_order, created_at" + (parentKey ? `, ${parentKey}` : "");
    const { data, error } = await db.from(table).update({ name }).eq("id", id).select(selectCols);
    if (error) return res.status(500).json({ error: formatSupabaseError(error) });
    const item = Array.isArray(data) ? data[0] : null;
    if (!item) return res.status(404).json({ error: "Item not found" });
    return res.json({ item });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/key-points/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "suggestions.edit"))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    const content = typeof req.body?.content === "string" ? req.body.content.trim() : null;
    const conceptTitle = typeof req.body?.concept_title === "string" ? req.body.concept_title.trim() : null;
    const hasBoardIds = Object.prototype.hasOwnProperty.call(req.body ?? {}, "board_ids");
    const boardIds = hasBoardIds
      ? Array.isArray(req.body.board_ids)
        ? req.body.board_ids.filter((x) => typeof x === "string" && x.trim())
        : []
      : null;
    if (!content && !conceptTitle && !hasBoardIds) {
      return res.status(400).json({ error: "content, concept_title, or board_ids required" });
    }

    const { data: existing, error: findErr } = await db
      .from("key_points")
      .select("id, concept_id, content")
      .eq("id", id)
      .maybeSingle();
    if (findErr) return res.status(500).json({ error: findErr.message });
    if (!existing) return res.status(404).json({ error: "Key point not found" });

    const patch = {};
    if (content) {
      patch.content = content;
      const emb = await embedTextRotating(db, content);
      patch.embedding = toPgVector(emb);
    }
    if (Object.keys(patch).length) {
      const { error: kpErr } = await db.from("key_points").update(patch).eq("id", id);
      if (kpErr) return res.status(500).json({ error: kpErr.message });
    }

    if (conceptTitle && existing.concept_id) {
      const { error: cErr } = await db.from("concepts").update({ title: conceptTitle }).eq("id", existing.concept_id);
      if (cErr) return res.status(500).json({ error: cErr.message });
    }

    if (hasBoardIds) {
      const { data: beforeRows } = await db
        .from("key_point_boards")
        .select("board_id")
        .eq("key_point_id", id);
      const beforeSet = new Set(
        (beforeRows ?? [])
          .map((r) => (typeof r.board_id === "string" ? r.board_id.trim() : ""))
          .filter(Boolean),
      );
      await replaceKeyPointBoards(db, id, boardIds);
      const newlyAdded = (boardIds ?? [])
        .map((x) => String(x).trim())
        .filter((bid) => bid && !beforeSet.has(bid));
      if (newlyAdded.length) {
        const { data: kpRow } = await db
          .from("key_points")
          .select("increment_count")
          .eq("id", id)
          .maybeSingle();
        const nextInc = Number(kpRow?.increment_count ?? 0) + newlyAdded.length;
        const { error: incErr } = await db
          .from("key_points")
          .update({ increment_count: nextInc })
          .eq("id", id);
        if (incErr) return res.status(500).json({ error: incErr.message });
      }
    }

    const { data: fresh } = await db
      .from("key_points")
      .select("id, content, position, increment_count, concept_id")
      .eq("id", id)
      .maybeSingle();
    const enriched = fresh
      ? await enrichKeyPointsWithBoards(db, fresh.concept_id, [fresh])
      : [];
    return res.json({ ok: true, id, key_point: enriched[0] ?? fresh ?? { id } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/key-points/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "suggestions.delete"))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });
    const { error } = await db.from("key_points").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/concepts/:id/key-points", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "suggestions.add"))) return;
    const conceptId = String(req.params.id ?? "").trim();
    if (!conceptId) return res.status(400).json({ error: "id required" });

    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content) return res.status(400).json({ error: "content required" });

    const boardIds = Array.isArray(req.body?.board_ids)
      ? req.body.board_ids.filter((x) => typeof x === "string" && x.trim())
      : [];

    const { data: concept, error: cErr } = await db
      .from("concepts")
      .select("id")
      .eq("id", conceptId)
      .maybeSingle();
    if (cErr) return res.status(500).json({ error: cErr.message });
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    const { data: maxRow } = await db
      .from("key_points")
      .select("position")
      .eq("concept_id", conceptId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = Number(maxRow?.position ?? -1) + 1;

    const emb = await embedTextRotating(db, content);
    const { data: point, error: kpErr } = await db
      .from("key_points")
      .insert({
        concept_id: conceptId,
        content,
        language: "mixed",
        position: nextPosition,
        // Same rule as approve-point save: count = number of selected boards
        increment_count: boardIds.length,
        embedding: toPgVector(emb),
      })
      .select("id, content, position, increment_count")
      .single();
    if (kpErr || !point) return res.status(500).json({ error: kpErr?.message ?? "Failed to create key point" });

    if (boardIds.length) await replaceKeyPointBoards(db, point.id, boardIds);

    const enriched = await enrichKeyPointsWithBoards(db, conceptId, [point]);
    return res.json({ ok: true, key_point: enriched[0] ?? point });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});



app.post("/api/approve-point", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "question_bank.create_ai.add"))) return;
    const {
      matched_key_point_id,
      point_id,
      question_text,
      concept,
      subject,
      system,
      chapter,
      topic,
      topic_id,
      board_ids,
      mode: rawMode,
    } = req.body ?? {};
    // approve = bump matched KP board counts only (no new KP / no new concept)
    // save = insert new KP under existing concept_id (count = board count, or 0)
    const mode = rawMode === "save" ? "save" : "approve";
    const boardIds = Array.isArray(board_ids) ? board_ids.filter((id) => typeof id === "string" && id.trim()) : [];
    if (typeof question_text !== "string" || !question_text.trim()) return res.status(400).json({ error: "question_text required" });

    // For approve only: resolve matched key point. Save never uses matched id for boards.
    let targetId =
      mode === "approve"
        ? typeof matched_key_point_id === "string" && matched_key_point_id.trim()
          ? matched_key_point_id.trim()
          : typeof point_id === "string" && point_id.trim()
            ? point_id.trim()
            : null
        : null;

    let point = null;

    if (targetId) {
      const { data: existingPoint, error: pointErr } = await db
        .from("key_points")
        .select("id, concept_id, increment_count")
        .eq("id", targetId)
        .single();
      if (!pointErr && existingPoint) {
        point = existingPoint;
      } else {
        targetId = null;
      }
    }

    if (mode === "approve") {
      if (!targetId || !point) {
        return res.status(400).json({
          error: "A matched key point is required to approve. Use Save to add a new key point.",
        });
      }

      // Count rises by number of boards on this suggestion (0 boards → no count change).
      // Do not insert a new key point.
      const bump = boardIds.length;
      if (bump > 0) {
        const { error: incErr } = await db
          .from("key_points")
          .update({ increment_count: Number(point.increment_count || 0) + bump })
          .eq("id", point.id);
        if (incErr) return res.status(500).json({ error: incErr.message });
        await linkKeyPointBoards(db, point.id, boardIds);
      }

      return res.json({
        ok: true,
        point_id: targetId,
        incremented: bump > 0,
        board_count_added: bump,
        saved_question: false,
        created_new_point: false,
        mode: "approve",
      });
    }

    // mode === "save": insert new key point under an EXISTING concept only — never create a concept.
    const conceptId =
      typeof req.body?.concept_id === "string" && req.body.concept_id.trim()
        ? req.body.concept_id.trim()
        : null;
    if (!conceptId) {
      return res.status(400).json({
        error: "concept_id required — select an existing concept before saving a new key point",
      });
    }

    const { data: existingConcept, error: conceptLoadErr } = await db
      .from("concepts")
      .select("id, title")
      .eq("id", conceptId)
      .maybeSingle();
    if (conceptLoadErr) return res.status(500).json({ error: conceptLoadErr.message });
    if (!existingConcept) return res.status(404).json({ error: "Selected concept not found" });

    const { data: maxRow } = await db
      .from("key_points")
      .select("position")
      .eq("concept_id", conceptId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = Number(maxRow?.position ?? -1) + 1;

    // Boards present → count = board count; no boards → count 0
    const saveBump = boardIds.length;
    const emb = await embedTextRotating(db, question_text);
    const { data: newPoint, error: kpErr } = await db
      .from("key_points")
      .insert({
        concept_id: conceptId,
        content: question_text.trim(),
        language: "mixed",
        position: nextPosition,
        increment_count: saveBump,
        embedding: toPgVector(emb),
      })
      .select("id, concept_id, increment_count")
      .single();
    if (kpErr || !newPoint) return res.status(500).json({ error: kpErr?.message ?? "Failed to save key point" });

    if (saveBump > 0) {
      await linkKeyPointBoards(db, newPoint.id, boardIds);
    }

    return res.json({
      ok: true,
      point_id: newPoint.id,
      concept_id: conceptId,
      incremented: false,
      board_count_added: saveBump,
      saved_question: false,
      created_new_point: true,
      mode: "save",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/match-key-points", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requireAnyPerm(req, res, db, ["home.match", "question_bank.create_ai.extract"]))) return;

    const matchingConfig = await getMatchingPromptConfig(db);
    const useVector = matchingConfig.vector_enabled;
    const useAi = matchingConfig.ai_enabled;
    const matchingPrompt = matchingConfig.prompt;
    const models = await resolveAiModels(db);

    if (!useVector && !useAi) {
      return res.status(400).json({
        error: "Both vector and AI matching are disabled. Enable at least one in Settings → AI Prompts → Matching.",
      });
    }

    if ((useVector || useAi) && !(await hasGeminiKeys(db))) {
      return res.status(500).json({ error: "No Gemini API keys configured. Add keys in Settings → Gemini API." });
    }

    const { texts, threshold, count } = req.body ?? {};
    const list = Array.isArray(texts) ? texts.filter((t) => typeof t === "string") : [];
    if (list.length === 0) return res.status(400).json({ error: "texts[] required" });
    const matchThreshold = typeof threshold === "number" ? threshold : 0.6;
    const matchCount = typeof count === "number" ? count : 3;

    const results = [];
    for (const text of list) {
      if (!useVector) {
        results.push({ text, matches: [] });
        continue;
      }

      const emb = await embedTextRotating(db, text);
      const embStr = toPgVector(emb);
      if (!embStr) {
        results.push({ text, matches: [] });
        continue;
      }
      const { data: matches, error } = await db.rpc("match_key_points", {
        query_embedding: embStr,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });
      if (error) return res.status(500).json({ error: error.message });

      const conceptIds = Array.from(new Set((matches ?? []).map((m) => m.concept_id).filter(Boolean)));
      const [conceptResult, boardsByConcept] = await Promise.all([
        db.from("concepts").select("id, title, subject, system, chapter, topic").in("id", conceptIds),
        fetchBoardNamesByConceptIds(db, conceptIds),
      ]);
      const conceptById = new Map((conceptResult.data ?? []).map((c) => [c.id, c]));

      const enrichedMatches = (matches ?? []).map((m) => {
        const c = conceptById.get(m.concept_id);
        return {
          id: m.id,
          content: m.content,
          concept_id: m.concept_id,
          concept_title: c?.title ?? null,
          concept_subject: c?.subject ?? null,
          concept_system: c?.system ?? null,
          concept_chapter: c?.chapter ?? null,
          concept_topic: c?.topic ?? null,
          board_names: boardsByConcept.get(m.concept_id) ?? [],
          increment_count: m.increment_count,
          vector_similarity: m.similarity,
        };
      });
      let aiScoreById = {};
      if (useAi) {
        try {
          aiScoreById = await withGeminiKeyRotation(db, (key) =>
            scoreMatchesWithGemini(key, text, enrichedMatches.slice(0, 5), matchingPrompt, models.match),
          );
        } catch (err) {
          console.error("Gemini match scoring failed, using vector similarity fallback", err);
        }
      }

      results.push({
        text,
        matches: enrichedMatches.map((m) => {
          const aiScore = aiScoreById[m.id];
          const vectorPct = Math.max(0, Math.min(100, Math.round((m.vector_similarity ?? 0) * 100)));
          const finalPct =
            useAi && typeof aiScore?.percentage === "number"
              ? aiScore.percentage
              : useVector
                ? vectorPct
                : 0;
          return {
            id: m.id,
            content: m.content,
            concept_id: m.concept_id,
            concept_title: m.concept_title,
            concept_subject: m.concept_subject,
            concept_system: m.concept_system,
            concept_chapter: m.concept_chapter,
            concept_topic: m.concept_topic,
            board_names: m.board_names ?? [],
            increment_count: m.increment_count,
            similarity: finalPct / 100,
            percentage: finalPct,
            ai_percentage: useAi && typeof aiScore?.percentage === "number" ? aiScore.percentage : null,
            ai_reason: useAi && typeof aiScore?.reason === "string" ? aiScore.reason : null,
            vector_percentage: useVector ? vectorPct : null,
          };
        }),
      });
    }

    return res.json({ results, matching: { vector_enabled: useVector, ai_enabled: useAi, prompt_source: matchingConfig.source } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/save-concept", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "home.add"))) return;
    const body = req.body ?? {};

    const conceptName = String(body?.concept_name ?? "").trim();
    const subject = body?.subject ? String(body.subject).trim() : null;
    const system = body?.system ? String(body.system).trim() : null;
    const chapter = body?.chapter ? String(body.chapter).trim() : null;
    const topic = body?.topic ? String(body.topic).trim() : null;
    const topicId = body?.topic_id ? String(body.topic_id).trim() : null;
    const rawPoints = Array.isArray(body?.high_yield_points) ? body.high_yield_points : [];
    const points = rawPoints
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!conceptName) return res.status(400).json({ error: "concept_name required" });
    if (points.length === 0) return res.status(400).json({ error: "high_yield_points required" });

    const detailSummary =
      typeof body?.detail_summary === "string" && !isRichHtmlEmpty(body.detail_summary)
        ? sanitizeRichHtml(body.detail_summary)
        : null;
    const detailParagraphs = Array.isArray(body?.detail_paragraphs)
      ? body.detail_paragraphs
          .filter((p) => typeof p === "string")
          .map((p) => sanitizeRichHtml(p))
          .filter((p) => !isRichHtmlEmpty(p))
      : [];
    const detailTable = normalizeDetailTable(body?.detail_table);
    const detailEmbedText = buildConceptDetailEmbedText(detailSummary, detailParagraphs, detailTable);
    const detailEmbedding = detailEmbedText ? await embedTextRotating(db, detailEmbedText) : null;
    const storyHtml =
      typeof body?.story_html === "string" && !isRichHtmlEmpty(body.story_html)
        ? sanitizeRichHtml(body.story_html)
        : null;

    const { data: concept, error: cErr } = await db
      .from("concepts")
      .insert({
        title: conceptName,
        detected_language: "mixed",
        subject,
        system,
        chapter,
        topic,
        topic_id: topicId,
        detail_summary: detailSummary,
        detail_paragraphs: detailParagraphs,
        detail_table: detailTable,
        detail_embedding: toPgVector(detailEmbedding),
        raw_extraction: {
          concept_name: conceptName,
          high_yield_points: points,
          detail_summary: detailSummary,
          detail_paragraphs: detailParagraphs,
          detail_table: detailTable,
          story_html: storyHtml,
        },
        source_image_path: null,
      })
      .select("id")
      .single();
    if (cErr || !concept) return res.status(500).json({ error: cErr?.message ?? "Failed to create concept" });

    const saveBoardIds = Array.isArray(body?.board_ids)
      ? body.board_ids.filter((id) => typeof id === "string" && id.trim())
      : [];
    const keyPointRows = await Promise.all(
      points.map(async (content, idx) => {
        const emb = await embedTextRotating(db, content);
        return {
          concept_id: concept.id,
          content,
          language: "mixed",
          position: idx,
          embedding: toPgVector(emb),
        };
      }),
    );
    const embeddingsSaved = keyPointRows.filter((r) => r.embedding != null).length;
    const embeddingsMissing = keyPointRows.length - embeddingsSaved;
    const { data: insertedKp, error: kpErr } = await db.from("key_points").insert(keyPointRows).select("id");
    if (kpErr) return res.status(500).json({ error: kpErr.message });

    if (saveBoardIds.length && insertedKp?.length) {
      for (const kp of insertedKp) {
        if (kp?.id) await linkKeyPointBoards(db, kp.id, saveBoardIds);
      }
    }

    return res.json({
      ok: true,
      concept_id: concept.id,
      count: insertedKp?.length ?? 0,
      embeddings_saved: embeddingsSaved,
      embeddings_missing: embeddingsMissing,
      detail_embedding_saved: detailEmbedding != null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/save-question", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "question_bank.create_ai.add"))) return;
    const body = req.body ?? {};
    const list = Array.isArray(body?.questions) ? body.questions : [body];

    const normalized = (
      await Promise.all(
        list
          .filter((q) => q && (q.questionMode === "mcq" || q.questionMode === "sba"))
          .map(async (q) => {
            const stem = q.questionMode === "mcq" ? q?.mcq?.stem : q?.sba?.stem;
            const mcq = q.mcq ?? null;
            const sba = q.sba ?? null;
            const emb = await embedTextRotating(db, stem ?? "");
            const explanationEmbedding = await embedExplanationRotating(db, q.questionMode, mcq, sba);
            const boardIds = Array.isArray(q.boardIds)
              ? q.boardIds.filter((id) => typeof id === "string" && id.trim())
              : Array.isArray(q.board_ids)
                ? q.board_ids.filter((id) => typeof id === "string" && id.trim())
                : [];
            return {
              subject: q.subject ?? null,
              system: q.system ?? null,
              chapter: q.chapter ?? null,
              topic: q.topic ?? null,
              topicId: q.topicId ?? q.topic_id ?? null,
              concept: q.concept ?? null,
              questionMode: q.questionMode,
              metadata: q.metadata ?? {},
              mcq,
              sba,
              sourcePointId: q.sourcePointId ?? null,
              boardIds,
              embedding: toPgVector(emb),
              explanationEmbedding,
            };
          }),
      )
    );
    

    if (normalized.length === 0) return res.status(400).json({ error: "No valid questions supplied" });

    const first = normalized[0];
    const { data: paper, error: pErr } = await db
      .from("question_papers")
      .insert({
        subject: first.subject,
        system: first.system,
        chapter: first.chapter,
        topic: first.topic,
        concept: first.concept,
        metadata: first.metadata,
        source: body.source ?? {},
      })
      .select("id")
      .single();
    if (pErr || !paper) return res.status(500).json({ error: pErr?.message ?? "Failed to create paper" });

    const questionsToInsert = normalized.map((q) => ({
      paper_id: paper.id,
      source_point_id: q.sourcePointId,
      question_mode: q.questionMode,
      stem: q.questionMode === "mcq" ? q.mcq?.stem ?? "" : q.sba?.stem ?? "",
      payload: withBoardIdsOnPayload(q.questionMode === "mcq" ? q.mcq : q.sba, q.boardIds),
      embedding: q.embedding,
      explanation_embedding: q.explanationEmbedding,
      status: q.metadata?.status ?? "published",
      difficulty: q.metadata?.difficulty ?? "medium",
      marks: Number(q.metadata?.marks ?? 1),
      subject: q.subject,
      system: q.system,
      chapter: q.chapter,
      topic: q.topic,
      concept: q.concept,
    }));
    const { data: inserted, error: qErr } = await db.from("questions").insert(questionsToInsert).select("id");
    if (qErr) return res.status(500).json({ error: qErr.message });

    // When questions are linked to a key point, bump that KP's boards + increment_count
    // the same way approve-point does (per board on each question).
    const bumpByKeyPoint = new Map();
    for (const q of normalized) {
      const kpId = typeof q.sourcePointId === "string" ? q.sourcePointId.trim() : "";
      if (!kpId || !Array.isArray(q.boardIds) || q.boardIds.length === 0) continue;
      const ids = q.boardIds.map((id) => String(id).trim()).filter(Boolean);
      if (!ids.length) continue;
      await linkKeyPointBoards(db, kpId, ids);
      bumpByKeyPoint.set(kpId, (bumpByKeyPoint.get(kpId) ?? 0) + ids.length);
    }

    const keyPointUpdates = [];
    for (const [kpId, bump] of bumpByKeyPoint.entries()) {
      const { data: point } = await db
        .from("key_points")
        .select("increment_count")
        .eq("id", kpId)
        .maybeSingle();
      let nextIncrement = Number(point?.increment_count ?? 0);
      if (bump > 0) {
        nextIncrement = nextIncrement + bump;
        const { error: incErr } = await db
          .from("key_points")
          .update({ increment_count: nextIncrement })
          .eq("id", kpId);
        if (incErr) console.error("save-question increment:", incErr.message);
      }
      const boardsMap = await fetchBoardsByKeyPointIds(db, [kpId]);
      keyPointUpdates.push({
        id: kpId,
        increment_count: nextIncrement,
        board_count_added: bump,
        board_links: boardsMap.get(kpId) ?? [],
      });
    }

    const explanationEmbeddingsSaved = normalized.filter((q) => q.explanationEmbedding != null).length;
    return res.json({
      ok: true,
      paper_id: paper.id,
      count: inserted?.length ?? 0,
      ids: (inserted ?? []).map((q) => q.id),
      explanation_embeddings_saved: explanationEmbeddingsSaved,
      key_point_updates: keyPointUpdates,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/questions", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const search = String(req.query.search ?? "").toLowerCase().trim();
    const type = String(req.query.type ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const difficulty = String(req.query.difficulty ?? "").trim();
    const subject = String(req.query.subject ?? "").trim();
    const system = String(req.query.system ?? "").trim();
    const chapter = String(req.query.chapter ?? "").trim();
    const topic = String(req.query.topic ?? "").trim();
    const concept = String(req.query.concept ?? "").trim();
    const boardId = String(req.query.board_id ?? "").trim();

    let sourcePointIdsForBoard = null;
    if (boardId) {
      const { data: kpBoardRows, error: kpBoardErr } = await db
        .from("key_point_boards")
        .select("key_point_id")
        .eq("board_id", boardId);
      if (kpBoardErr) return res.status(500).json({ error: kpBoardErr.message });
      sourcePointIdsForBoard = [...new Set((kpBoardRows ?? []).map((r) => r.key_point_id).filter(Boolean))];
      if (!sourcePointIdsForBoard.length) return res.json({ rows: [] });
    }

    let query = db
      .from("questions")
      .select("id, created_at, source_point_id, question_mode, stem, payload, status, difficulty, marks, subject, system, chapter, topic, concept")
      .order("created_at", { ascending: false })
      .limit(300);
    if (type) query = query.eq("question_mode", type);
    if (status) query = query.eq("status", status);
    if (difficulty) query = query.eq("difficulty", difficulty);
    if (subject) query = query.eq("subject", subject);
    if (system) query = query.eq("system", system);
    if (chapter) query = query.eq("chapter", chapter);
    if (topic) query = query.eq("topic", topic);
    if (concept) query = query.eq("concept", concept);
    if (sourcePointIdsForBoard) query = query.in("source_point_id", sourcePointIdsForBoard);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    let rows = (data ?? []).map((q) => ({
      id: q.id,
      createdAt: q.created_at,
      sourcePointId: q.source_point_id ?? null,
      questionMode: q.question_mode,
      subject: q.subject ?? "",
      system: q.system ?? "",
      chapter: q.chapter ?? "",
      topic: q.topic ?? "",
      concept: q.concept ?? "",
      marks: q.marks ?? 1,
      metadata: { status: q.status ?? "", difficulty: q.difficulty ?? "" },
      mcq: q.question_mode === "mcq" ? (q.payload && typeof q.payload === "object" ? q.payload : { stem: q.stem }) : null,
      sba: q.question_mode === "sba" ? (q.payload && typeof q.payload === "object" ? q.payload : { stem: q.stem }) : null,
    }));
    if (search) {
      rows = rows.filter((q) =>
        `${q.subject} ${q.system} ${q.chapter} ${q.topic} ${q.concept} ${q.mcq?.stem ?? ""} ${q.sba?.stem ?? ""}`
          .toLowerCase()
          .includes(search),
      );
    }
    rows = await enrichQuestionsWithBoards(db, rows);
    return res.json({ rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "question_bank.questions.delete"))) return;
    const { error } = await db.from("questions").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/questions/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "question_bank.questions.edit"))) return;
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "id required" });

    const body = req.body ?? {};
    const patch = {};
    if (typeof body.concept === "string") patch.concept = body.concept.trim() || null;
    if (typeof body.subject === "string") patch.subject = body.subject.trim() || null;
    if (typeof body.system === "string") patch.system = body.system.trim() || null;
    if (typeof body.chapter === "string") patch.chapter = body.chapter.trim() || null;
    if (typeof body.topic === "string") patch.topic = body.topic.trim() || null;
    if (typeof body.status === "string") patch.status = body.status.trim() || null;
    if (typeof body.difficulty === "string") patch.difficulty = body.difficulty.trim() || null;
    if (body.marks != null) patch.marks = Number(body.marks) || 1;

    const stem = typeof body.stem === "string" ? body.stem.trim() : null;
    const payload = body.payload && typeof body.payload === "object" ? body.payload : null;
    const questionMode = typeof body.question_mode === "string" ? body.question_mode : null;

    if (stem) {
      patch.stem = stem;
      const emb = await embedTextRotating(db, stem);
      patch.embedding = toPgVector(emb);
    }

    if (payload) {
      const hasBoardIds = Object.prototype.hasOwnProperty.call(body, "board_ids");
      const nextPayload = hasBoardIds
        ? withBoardIdsOnPayload(payload, Array.isArray(body.board_ids) ? body.board_ids : [])
        : payload;
      patch.payload = stem ? { ...nextPayload, stem } : nextPayload;
      const mode = questionMode === "mcq" || questionMode === "sba" ? questionMode : null;
      if (mode) {
        const clean = stripBoardIdsFromPayload(patch.payload);
        const mcq = mode === "mcq" ? clean : null;
        const sba = mode === "sba" ? clean : null;
        patch.explanation_embedding = await embedExplanationRotating(db, mode, mcq, sba);
      }
    } else if (Object.prototype.hasOwnProperty.call(body, "board_ids")) {
      const { data: existing, error: loadErr } = await db
        .from("questions")
        .select("payload, question_mode, stem")
        .eq("id", id)
        .maybeSingle();
      if (loadErr) return res.status(500).json({ error: loadErr.message });
      if (!existing) return res.status(404).json({ error: "Question not found" });
      const current =
        existing.payload && typeof existing.payload === "object"
          ? existing.payload
          : { stem: existing.stem };
      patch.payload = withBoardIdsOnPayload(current, Array.isArray(body.board_ids) ? body.board_ids : []);
    }

    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Nothing to update" });

    const { data, error } = await db.from("questions").update(patch).eq("id", id).select("id");
    if (error) return res.status(500).json({ error: error.message });
    if (!data?.length) return res.status(404).json({ error: "Question not found" });
    return res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

// ─── Exams ───────────────────────────────────────────────────────────────────

function resolveExamStatus(exam) {
  const now = Date.now();
  const start = exam.scheduled_start ? new Date(exam.scheduled_start).getTime() : null;
  const end = exam.scheduled_end ? new Date(exam.scheduled_end).getTime() : null;
  if (exam.status === "cancelled" || exam.status === "draft") return exam.status;
  if (start && now < start) return "scheduled";
  if (end && now > end) return "completed";
  if (start && end && now >= start && now <= end) return "active";
  if (start && !end && now >= start) return "active";
  return exam.status ?? "draft";
}

function computeScheduledEnd(scheduledStart, durationMinutes, scheduledEnd) {
  const duration = Math.max(1, Number(durationMinutes) || 60);
  if (scheduledStart) {
    const startMs = new Date(scheduledStart).getTime();
    if (!Number.isNaN(startMs)) {
      return new Date(startMs + duration * 60 * 1000).toISOString();
    }
  }
  return scheduledEnd || null;
}

function formatQuestionRow(q) {
  const mode = q.question_mode;
  const payload = q.payload && typeof q.payload === "object" ? q.payload : {};
  const boardIds = Array.isArray(payload.boardIds) ? payload.boardIds.filter((id) => typeof id === "string") : [];
  return {
    id: q.id,
    sourcePointId: q.source_point_id ?? null,
    questionMode: mode,
    subject: q.subject ?? "",
    system: q.system ?? "",
    chapter: q.chapter ?? "",
    topic: q.topic ?? "",
    concept: q.concept ?? "",
    marks: Number(q.marks ?? 1),
    metadata: { status: q.status ?? "", difficulty: q.difficulty ?? "" },
    boardIds,
    mcq: mode === "mcq" ? payload : null,
    sba: mode === "sba" ? payload : null,
  };
}

function gradeAnswer(question, answer) {
  const mode = question.question_mode;
  const payload = question.payload && typeof question.payload === "object" ? question.payload : {};

  if (mode === "mcq") {
    const statements = Array.isArray(payload.trueFalse) ? payload.trueFalse : [];
    const studentAnswers = Array.isArray(answer?.answers) ? answer.answers : [];
    if (!statements.length) {
      return {
        isCorrect: false,
        marksEarned: 0,
        gradingDetail: { mode: "mcq", correct: 0, wrong: 0, notTouched: 0, positiveMarks: 0, negativeMarks: 0 },
      };
    }

    let correct = 0;
    let wrong = 0;
    let notTouched = 0;
    let positiveMarks = 0;
    let negativeMarks = 0;
    const statementResults = [];

    statements.forEach((stmt, i) => {
      const sid = stmt.id ?? String(i);
      const student =
        studentAnswers.find((a) => a?.id === sid || a?.id === stmt.id) ?? studentAnswers[i];
      const expected = stmt.correct === "true" ? "true" : "false";
      const given = student?.value === "true" ? "true" : student?.value === "false" ? "false" : "";
      let status = "not_touched";
      if (!given) {
        notTouched += 1;
      } else if (given === expected) {
        correct += 1;
        positiveMarks += MCQ_STATEMENT_MARK;
        status = "correct";
      } else {
        wrong += 1;
        negativeMarks += MCQ_WRONG_PENALTY;
        status = "wrong";
      }
      statementResults.push({
        id: sid,
        statement: stmt.statement ?? "",
        expected,
        given: given || null,
        status,
      });
    });

    const marksEarned = Math.max(0, positiveMarks - negativeMarks);
    const allCorrect = wrong === 0 && notTouched === 0 && correct === statements.length;
    return {
      isCorrect: allCorrect,
      marksEarned,
      gradingDetail: {
        mode: "mcq",
        correct,
        wrong,
        notTouched,
        positiveMarks,
        negativeMarks,
        statementResults,
      },
    };
  }

  if (mode === "sba") {
    const correctIndex = Number(payload.correctIndex);
    const selected = answer?.selectedIndex;
    const hasAnswer = selected !== undefined && selected !== null && selected !== "";
    const selectedNum = Number(selected);
    const isCorrect = hasAnswer && !Number.isNaN(correctIndex) && selectedNum === correctIndex;
    const marksEarned = isCorrect ? SBA_CORRECT_MARK : 0;
    let status = "not_touched";
    if (hasAnswer) status = isCorrect ? "correct" : "wrong";
    return {
      isCorrect,
      marksEarned,
      gradingDetail: {
        mode: "sba",
        correct: isCorrect ? 1 : 0,
        wrong: hasAnswer && !isCorrect ? 1 : 0,
        notTouched: hasAnswer ? 0 : 1,
        positiveMarks: marksEarned,
        negativeMarks: 0,
        correctIndex,
        selectedIndex: hasAnswer ? selectedNum : null,
        status,
      },
    };
  }

  return { isCorrect: false, marksEarned: 0, gradingDetail: { mode: "unknown" } };
}

function computeQuestionMaxMarks(question) {
  const mode = question.question_mode ?? question.questionMode;
  const payload =
    question.payload && typeof question.payload === "object"
      ? question.payload
      : mode === "mcq"
        ? (question.mcq ?? {})
        : mode === "sba"
          ? (question.sba ?? {})
          : {};
  if (mode === "mcq") {
    const count = Array.isArray(payload.trueFalse) ? payload.trueFalse.length : 0;
    return count * MCQ_STATEMENT_MARK;
  }
  if (mode === "sba") return SBA_CORRECT_MARK;
  return Number(question.marks ?? 1);
}

async function loadExamQuestions(db, examId) {
  const { data: links, error } = await db
    .from("exam_questions")
    .select("id, position, marks, question_id, questions(*)")
    .eq("exam_id", examId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (links ?? []).map((row) => ({
    linkId: row.id,
    position: row.position,
    marks: Number(row.marks ?? 1),
    question: row.questions ? formatQuestionRow(row.questions) : null,
  }));
}

async function syncExamTotalMarks(db, examId) {
  const questions = await loadExamQuestions(db, examId);
  const total = questions.reduce((sum, q) => {
    if (!q.question) return sum;
    return sum + computeQuestionMaxMarks(q.question);
  }, 0);
  await db.from("exams").update({ total_marks: total, updated_at: new Date().toISOString() }).eq("id", examId);
  return total;
}

async function computeExamPosition(db, examId, attemptId, score) {
  const { data: attempts } = await db
    .from("exam_attempts")
    .select("id, score, status")
    .eq("exam_id", examId)
    .in("status", ["submitted", "expired"]);
  const submitted = (attempts ?? []).filter((a) => a.status === "submitted" || a.status === "expired");
  if (!submitted.length) return null;
  const sorted = [...submitted].sort((a, b) => Number(b.score) - Number(a.score));
  const rank = sorted.findIndex((a) => a.id === attemptId) + 1;
  return rank > 0 ? rank : submitted.length;
}

async function buildAnswerDistribution(db, examId) {
  const questions = await loadExamQuestions(db, examId);
  const questionIds = questions.filter((q) => q.question).map((q) => q.question.id);
  if (!questionIds.length) return {};

  const { data: attempts } = await db
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .in("status", ["submitted", "expired"]);
  const attemptIds = (attempts ?? []).map((a) => a.id);
  if (!attemptIds.length) return {};

  const { data: allAnswers } = await db
    .from("exam_answers")
    .select("question_id, answer")
    .in("attempt_id", attemptIds)
    .in("question_id", questionIds);

  const dist = {};
  for (const q of questions) {
    if (!q.question) continue;
    const qid = q.question.id;
    const mode = q.question.questionMode;
    dist[qid] = { mode, options: {} };
    if (mode === "mcq") {
      const statements = q.question.mcq?.trueFalse ?? [];
      for (const stmt of statements) {
        const sid = stmt.id ?? stmt.statement;
        dist[qid].options[sid] = { true: 0, false: 0, notTouched: 0 };
      }
    } else if (mode === "sba") {
      const opts = q.question.sba?.options ?? [];
      for (let i = 0; i < opts.length; i++) {
        dist[qid].options[String(i)] = { count: 0 };
      }
      dist[qid].options.notTouched = { count: 0 };
    }
  }

  for (const row of allAnswers ?? []) {
    const qid = row.question_id;
    const bucket = dist[qid];
    if (!bucket) continue;
    const ans = row.answer ?? {};
    if (bucket.mode === "mcq") {
      const studentAnswers = Array.isArray(ans.answers) ? ans.answers : [];
      for (const [sid, opt] of Object.entries(bucket.options)) {
        const student = studentAnswers.find((a) => a?.id === sid);
        const val = student?.value;
        if (val === "true") opt.true += 1;
        else if (val === "false") opt.false += 1;
        else opt.notTouched += 1;
      }
    } else if (bucket.mode === "sba") {
      const sel = ans.selectedIndex;
      if (sel === undefined || sel === null || sel === "") {
        bucket.options.notTouched.count += 1;
      } else {
        const key = String(sel);
        if (bucket.options[key]) bucket.options[key].count += 1;
      }
    }
  }
  return dist;
}

function formatExamSummary(exam, questionCount = 0) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description ?? "",
    durationMinutes: exam.duration_minutes,
    totalMarks: Number(exam.total_marks ?? 0),
    scheduledStart: exam.scheduled_start,
    scheduledEnd: exam.scheduled_end,
    status: resolveExamStatus(exam),
    questionCount,
    createdBy: exam.created_by ?? "",
    createdAt: exam.created_at,
    updatedAt: exam.updated_at,
  };
}

app.get("/api/exams", async (_req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const { data, error } = await db.from("exams").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    const ids = (data ?? []).map((e) => e.id);
    const counts = new Map();
    if (ids.length) {
      const { data: eq } = await db.from("exam_questions").select("exam_id").in("exam_id", ids);
      for (const row of eq ?? []) counts.set(row.exam_id, (counts.get(row.exam_id) ?? 0) + 1);
    }
    return res.json({
      exams: (data ?? []).map((e) => formatExamSummary(e, counts.get(e.id) ?? 0)),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/exams/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const id = String(req.params.id ?? "").trim();
    const { data: exam, error } = await db.from("exams").select("*").eq("id", id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const questions = await loadExamQuestions(db, id);
    return res.json({
      exam: formatExamSummary(exam, questions.length),
      questions: questions.filter((q) => q.question).map((q) => ({ ...q.question, position: q.position, examMarks: q.marks })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/exams", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "exam.create.add"))) return;
    const body = req.body ?? {};
    const title = String(body.title ?? "").trim();
    if (!title) return res.status(400).json({ error: "title required" });
    const durationMinutes = Math.max(1, Number(body.durationMinutes ?? body.duration_minutes ?? 60));
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const scheduledStart = body.scheduledStart ?? body.scheduled_start ?? null;
    const scheduledEndInput = body.scheduledEnd ?? body.scheduled_end ?? null;
    const scheduledEnd = computeScheduledEnd(scheduledStart, durationMinutes, scheduledEndInput);
    const createdBy = typeof body.createdBy === "string" ? body.createdBy.trim() : "";
    const questionIds = Array.isArray(body.questionIds) ? body.questionIds.filter(Boolean) : [];

    let status = "draft";
    if (scheduledStart) status = "scheduled";

    const embedText = [title, description].filter(Boolean).join("\n");
    const titleEmbedding = embedText ? toPgVector(await embedTextRotating(db, embedText)) : null;

    const { data: exam, error } = await db
      .from("exams")
      .insert({
        title,
        description: description || null,
        duration_minutes: durationMinutes,
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
        status,
        created_by: createdBy || null,
        title_embedding: titleEmbedding,
      })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });

    if (questionIds.length) {
      const { data: qs } = await db.from("questions").select("id, marks").in("id", questionIds);
      const markById = new Map((qs ?? []).map((q) => [q.id, Number(q.marks ?? 1)]));
      const rows = questionIds.map((qid, i) => ({
        exam_id: exam.id,
        question_id: qid,
        position: i,
        marks: markById.get(qid) ?? 1,
      }));
      const { error: linkErr } = await db.from("exam_questions").insert(rows);
      if (linkErr) return res.status(500).json({ error: linkErr.message });
      await syncExamTotalMarks(db, exam.id);
    }

    const questions = await loadExamQuestions(db, exam.id);
    return res.json({
      exam: formatExamSummary(exam, questions.length),
      questions: questions.filter((q) => q.question).map((q) => ({ ...q.question, position: q.position, examMarks: q.marks })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.patch("/api/exams/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requireAnyPerm(req, res, db, ["exam.create.edit", "exam.schedules.edit"]))) return;
    const id = String(req.params.id ?? "").trim();
    const body = req.body ?? {};
    const patch = { updated_at: new Date().toISOString() };

    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
    if (typeof body.description === "string") patch.description = body.description.trim() || null;
    if (body.durationMinutes != null || body.duration_minutes != null) {
      patch.duration_minutes = Math.max(1, Number(body.durationMinutes ?? body.duration_minutes));
    }
    if (body.scheduledStart !== undefined) patch.scheduled_start = body.scheduledStart || null;
    if (body.scheduledEnd !== undefined) patch.scheduled_end = body.scheduledEnd || null;

    const { data: existingExam } = await db.from("exams").select("scheduled_start, scheduled_end, duration_minutes").eq("id", id).maybeSingle();
    const nextStart = patch.scheduled_start !== undefined ? patch.scheduled_start : existingExam?.scheduled_start ?? null;
    const nextDuration =
      patch.duration_minutes != null ? patch.duration_minutes : Number(existingExam?.duration_minutes ?? 60);
    if (nextStart || (patch.duration_minutes != null && existingExam?.scheduled_start)) {
      const startForCalc = nextStart ?? existingExam?.scheduled_start ?? null;
      if (startForCalc) {
        patch.scheduled_end = computeScheduledEnd(startForCalc, nextDuration, null);
      }
    }
    if (typeof body.status === "string") patch.status = body.status;

    if (patch.title || patch.description !== undefined) {
      const { data: existing } = await db.from("exams").select("title, description").eq("id", id).maybeSingle();
      const embedText = [patch.title ?? existing?.title, patch.description ?? existing?.description]
        .filter(Boolean)
        .join("\n");
      if (embedText) patch.title_embedding = toPgVector(await embedTextRotating(db, embedText));
    }

    if (patch.scheduled_start) patch.status = "scheduled";

    const { data: exam, error } = await db.from("exams").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    if (Array.isArray(body.questionIds)) {
      await db.from("exam_questions").delete().eq("exam_id", id);
      const questionIds = body.questionIds.filter(Boolean);
      if (questionIds.length) {
        const { data: qs } = await db.from("questions").select("id, marks").in("id", questionIds);
        const markById = new Map((qs ?? []).map((q) => [q.id, Number(q.marks ?? 1)]));
        const rows = questionIds.map((qid, i) => ({
          exam_id: id,
          question_id: qid,
          position: i,
          marks: markById.get(qid) ?? 1,
        }));
        await db.from("exam_questions").insert(rows);
      }
      await syncExamTotalMarks(db, id);
    }

    const questions = await loadExamQuestions(db, id);
    const { data: refreshed } = await db.from("exams").select("*").eq("id", id).single();
    return res.json({
      exam: formatExamSummary(refreshed ?? exam, questions.length),
      questions: questions.filter((q) => q.question).map((q) => ({ ...q.question, position: q.position, examMarks: q.marks })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.delete("/api/exams/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    if (!(await requirePerm(req, res, db, "exam.schedules.delete"))) return;
    const { error } = await db.from("exams").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/my-exams", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const email = String(req.query.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email required" });

    const { data: exams, error } = await db.from("exams").select("*").order("scheduled_start", { ascending: false, nullsFirst: false });
    if (error) return res.status(500).json({ error: error.message });

    const { data: attempts } = await db
      .from("exam_attempts")
      .select("*")
      .eq("user_email", email)
      .order("created_at", { ascending: false });

    const attemptByExam = new Map();
    for (const a of attempts ?? []) {
      if (!attemptByExam.has(a.exam_id)) attemptByExam.set(a.exam_id, a);
    }

    const result = (exams ?? [])
      .map((exam) => {
        const status = resolveExamStatus(exam);
        const attempt = attemptByExam.get(exam.id) ?? null;
        return {
          ...formatExamSummary(exam),
          liveStatus: status,
          canStart: status === "active" && (!attempt || attempt.status === "in_progress"),
          attempt: attempt
            ? {
                id: attempt.id,
                status: attempt.status,
                score: Number(attempt.score),
                totalMarks: Number(attempt.total_marks),
                startedAt: attempt.started_at,
                submittedAt: attempt.submitted_at,
                endsAt: attempt.ends_at,
              }
            : null,
        };
      })
      .filter((e) => e.scheduledStart || e.status !== "draft");

    return res.json({ exams: result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/exams/:id/start", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const examId = String(req.params.id ?? "").trim();
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "email required" });

    const { data: exam, error } = await db.from("exams").select("*").eq("id", examId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!exam) return res.status(404).json({ error: "Exam not found" });

    const liveStatus = resolveExamStatus(exam);
    if (liveStatus !== "active") {
      return res.status(400).json({ error: `Exam is not active (status: ${liveStatus})` });
    }

    const { data: existing } = await db
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", examId)
      .eq("user_email", email)
      .eq("status", "in_progress")
      .maybeSingle();

    if (existing) {
      const questions = await loadExamQuestions(db, examId);
      return res.json({
        attempt: {
          id: existing.id,
          examId,
          startedAt: existing.started_at,
          endsAt: existing.ends_at,
          status: existing.status,
        },
        exam: formatExamSummary(exam, questions.length),
        questions: questions
          .filter((q) => q.question)
          .map((q) => ({ ...q.question, position: q.position, examMarks: q.marks })),
      });
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + Number(exam.duration_minutes) * 60 * 1000);
    const questions = await loadExamQuestions(db, examId);
    const totalMarks = questions.reduce((s, q) => s + (q.question ? computeQuestionMaxMarks(q.question) : 0), 0);

    const { data: attempt, error: attErr } = await db
      .from("exam_attempts")
      .insert({
        exam_id: examId,
        user_email: email,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        total_marks: totalMarks,
        status: "in_progress",
      })
      .select("*")
      .single();
    if (attErr) return res.status(500).json({ error: attErr.message });

    return res.json({
      attempt: {
        id: attempt.id,
        examId,
        startedAt: attempt.started_at,
        endsAt: attempt.ends_at,
        status: attempt.status,
      },
      exam: formatExamSummary(exam, questions.length),
      questions: questions
        .filter((q) => q.question)
        .map((q) => ({ ...q.question, position: q.position, examMarks: q.marks })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/exams/:id/submit", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const examId = String(req.params.id ?? "").trim();
    const attemptId = String(req.body?.attemptId ?? "").trim();
    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (!attemptId) return res.status(400).json({ error: "attemptId required" });

    const { data: attempt, error: attErr } = await db
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("exam_id", examId)
      .maybeSingle();
    if (attErr) return res.status(500).json({ error: attErr.message });
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });
    if (attempt.status !== "in_progress") return res.status(400).json({ error: "Attempt already submitted" });

    const now = new Date();
    const expired = now.getTime() > new Date(attempt.ends_at).getTime();
    const questions = await loadExamQuestions(db, examId);
    const questionMap = new Map(
      questions.filter((q) => q.question).map((q) => [q.question.id, { row: q.question, marks: q.marks }]),
    );

    let score = 0;
    let scoreWithoutNegative = 0;
    const answerRows = [];
    const breakdown = { mcq: { correct: 0, wrong: 0, notTouched: 0, positiveMarks: 0, negativeMarks: 0 }, sba: { correct: 0, wrong: 0, notTouched: 0, positiveMarks: 0, negativeMarks: 0 } };

    for (const item of answers) {
      const qid = String(item?.questionId ?? "").trim();
      const entry = questionMap.get(qid);
      if (!entry) continue;
      const { data: rawQ } = await db.from("questions").select("*").eq("id", qid).maybeSingle();
      if (!rawQ) continue;
      const graded = gradeAnswer(rawQ, item.answer ?? {});
      score += graded.marksEarned;
      const gd = graded.gradingDetail ?? {};
      if (gd.mode === "mcq") {
        breakdown.mcq.correct += gd.correct ?? 0;
        breakdown.mcq.wrong += gd.wrong ?? 0;
        breakdown.mcq.notTouched += gd.notTouched ?? 0;
        breakdown.mcq.positiveMarks += gd.positiveMarks ?? 0;
        breakdown.mcq.negativeMarks += gd.negativeMarks ?? 0;
        scoreWithoutNegative += gd.positiveMarks ?? 0;
      } else if (gd.mode === "sba") {
        breakdown.sba.correct += gd.correct ?? 0;
        breakdown.sba.wrong += gd.wrong ?? 0;
        breakdown.sba.notTouched += gd.notTouched ?? 0;
        breakdown.sba.positiveMarks += gd.positiveMarks ?? 0;
        scoreWithoutNegative += gd.positiveMarks ?? 0;
      }
      answerRows.push({
        attempt_id: attemptId,
        question_id: qid,
        answer: item.answer ?? {},
        is_correct: graded.isCorrect,
        marks_earned: graded.marksEarned,
        grading_detail: graded.gradingDetail ?? null,
      });
    }

    if (answerRows.length) {
      await db.from("exam_answers").upsert(answerRows, { onConflict: "attempt_id,question_id" });
    }

    const finalStatus = expired ? "expired" : "submitted";
    await db
      .from("exam_attempts")
      .update({
        status: finalStatus,
        submitted_at: now.toISOString(),
        score,
      })
      .eq("id", attemptId);

    return res.json({
      ok: true,
      attemptId,
      score,
      scoreWithoutNegative,
      totalMarks: Number(attempt.total_marks),
      breakdown,
      status: finalStatus,
      expired,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/exam-attempts/:id", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const attemptId = String(req.params.id ?? "").trim();
    const includeKey = String(req.query.include ?? "") === "answers";

    const { data: attempt, error } = await db.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const { data: exam } = await db.from("exams").select("*").eq("id", attempt.exam_id).maybeSingle();
    const questions = await loadExamQuestions(db, attempt.exam_id);

    let answerMap = new Map();
    if (includeKey || attempt.status !== "in_progress") {
      const { data: ans } = await db.from("exam_answers").select("*").eq("attempt_id", attemptId);
      answerMap = new Map((ans ?? []).map((a) => [a.question_id, a]));
    }

    const showSolutions = attempt.status === "submitted" || attempt.status === "expired";

    let performance = null;
    let position = null;
    let answerDistribution = null;
    if (showSolutions) {
      const { data: ansRows } = await db.from("exam_answers").select("grading_detail").eq("attempt_id", attemptId);
      const perf = {
        mcq: { correct: 0, wrong: 0, notTouched: 0, positiveMarks: 0, negativeMarks: 0 },
        sba: { correct: 0, wrong: 0, notTouched: 0, positiveMarks: 0, negativeMarks: 0 },
      };
      for (const row of ansRows ?? []) {
        const gd = row.grading_detail ?? {};
        if (gd.mode === "mcq") {
          perf.mcq.correct += gd.correct ?? 0;
          perf.mcq.wrong += gd.wrong ?? 0;
          perf.mcq.notTouched += gd.notTouched ?? 0;
          perf.mcq.positiveMarks += gd.positiveMarks ?? 0;
          perf.mcq.negativeMarks += gd.negativeMarks ?? 0;
        } else if (gd.mode === "sba") {
          perf.sba.correct += gd.correct ?? 0;
          perf.sba.wrong += gd.wrong ?? 0;
          perf.sba.notTouched += gd.notTouched ?? 0;
          perf.sba.positiveMarks += gd.positiveMarks ?? 0;
        }
      }
      const scoreWithoutNegative = perf.mcq.positiveMarks + perf.sba.positiveMarks;
      performance = { ...perf, scoreWithoutNegative, scoreWithNegative: Number(attempt.score) };
      position = await computeExamPosition(db, attempt.exam_id, attemptId, Number(attempt.score));
      answerDistribution = await buildAnswerDistribution(db, attempt.exam_id);
    }

    return res.json({
      attempt: {
        id: attempt.id,
        examId: attempt.exam_id,
        userEmail: attempt.user_email,
        startedAt: attempt.started_at,
        endsAt: attempt.ends_at,
        submittedAt: attempt.submitted_at,
        score: Number(attempt.score),
        totalMarks: Number(attempt.total_marks),
        status: attempt.status,
        performance,
        position,
      },
      exam: exam ? formatExamSummary(exam, questions.length) : null,
      answerDistribution,
      questions: questions
        .filter((q) => q.question)
        .map((q) => {
          const ans = answerMap.get(q.question.id);
          const base = { ...q.question, position: q.position, examMarks: q.marks };
          if (!showSolutions) {
            return {
              ...base,
              studentAnswer: ans?.answer ?? null,
            };
          }
          return {
            ...base,
            studentAnswer: ans?.answer ?? null,
            isCorrect: ans?.is_correct ?? false,
            marksEarned: Number(ans?.marks_earned ?? 0),
            gradingDetail: ans?.grading_detail ?? null,
            showSolutions: true,
          };
        }),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

const port = Number(process.env.PORT || 8787);
await initDbConnection();
app.listen(port, () => {
  const meta = getConnectionMeta();
  console.log(`API server listening on http://localhost:${port}`);
  console.log(`Database: ${meta.connected ? meta.supabase_url : "not configured"} (source: ${meta.source})`);
});

