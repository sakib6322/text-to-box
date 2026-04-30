import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "models/gemini-embedding-001";
const EMBEDDING_DIM = Number(process.env.EMBEDDING_DIM || 768);
const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

function requireSupabase(res) {
  if (!supabaseAdmin) {
    res.status(500).json({
      error: "Supabase config missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) in server env",
    });
    return null;
  }
  return supabaseAdmin;
}

function fileToGenerativePart(fileBuffer, mimeType) {
  return {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType,
    },
  };
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

function isQuotaError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("rate limit");
}

async function embedText(text, apiKey) {
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
    console.error("Embedding API failed", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  return Array.isArray(data?.embedding?.values) ? data.embedding.values : null;
}

function toPgVector(values) {
  if (!Array.isArray(values)) return null;
  const nums = values.filter((v) => Number.isFinite(v)).map((v) => Number(v));
  if (nums.length === 0) return null;
  const dim = Number.isFinite(EMBEDDING_DIM) && EMBEDDING_DIM > 0 ? EMBEDDING_DIM : 768;
  const normalized = nums.length >= dim ? nums.slice(0, dim) : nums.concat(Array(dim - nums.length).fill(0));
  return `[${normalized.join(",")}]`;
}

async function scoreMatchesWithGemini(apiKey, sourceText, candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return {};
  const modelName = process.env.MATCH_AI_MODEL || process.env.PRIMARY_AI_MODEL || "gemini-2.5-pro";
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

  const prompt = `You are matching semantic similarity between one extracted study point and candidate key-points.
Return percentage similarity between 0 and 100 for each candidate.
Higher means stronger conceptual match.`;

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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing in server env" });

    const modelName = process.env.PRIMARY_AI_MODEL || "gemini-2.5-pro";
    const fallbackModelName = process.env.FALLBACK_AI_MODEL || "gemini-2.5-flash";
    const inputText = String(req.body?.input_text ?? "").trim();
    if (!req.file && !inputText) {
      return res.status(400).json({ error: "Image file or input text is required" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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
      },
      required: ["concept_name", "verbatim_text", "high_yield_points"],
    };

    const generationConfig = {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema,
    };

    const prompt =
      "You are an expert Medical Professor. Analyze the uploaded medical textbook image and/or given source text.\n" +
      "First extract verbatim_text as close to the original wording as possible (plain text, no HTML).\n" +
      "Convert the essay-like text into the maximum possible number of easy, exam-friendly, high-yield points or stems.\n" +
      "Return the output STRICTLY matching the JSON schema. Do not include any extra text.";

    const parts = [{ text: `${prompt}${inputText ? `\n\nSource text:\n${inputText}` : ""}` }];
    if (req.file) parts.push(fileToGenerativePart(req.file.buffer, req.file.mimetype || "image/jpeg"));

    let result;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      result = await model.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
      });
    } catch (err) {
      if (!isQuotaError(err) || fallbackModelName === modelName) throw err;
      const fallbackModel = genAI.getGenerativeModel({ model: fallbackModelName });
      result = await fallbackModel.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig,
      });
    }

    const text = result?.response?.text?.() ?? "";
    const parsed = parseGeminiJson(text);
    const concept_name = typeof parsed?.concept_name === "string" ? sanitizeModelText(parsed.concept_name) : "";
    const verbatim_text =
      typeof parsed?.verbatim_text === "string" ? sanitizeModelText(parsed.verbatim_text) : "";
    const high_yield_points = Array.isArray(parsed?.high_yield_points)
      ? parsed.high_yield_points
          .filter((x) => typeof x === "string")
          .map((x) => sanitizeModelText(x))
          .filter(Boolean)
      : [];

    return res.json({ concept_name, verbatim_text, high_yield_points });
  } catch (e) {
    console.error(e);
    if (isQuotaError(e)) {
      return res.status(429).json({
        error:
          "AI quota exceeded. Please try again after a short wait, or switch to a lower-cost model (e.g. gemini-2.5-flash).",
      });
    }
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/db-health", async (_req, res) => {
  const db = requireSupabase(res);
  if (!db) return;
  const { error } = await db.from("concepts").select("id").limit(1);
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true });
});

app.post("/api/approve-point", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const { matched_key_point_id, point_id, question_text, concept, subject, system, topic } = req.body ?? {};
    if (typeof question_text !== "string" || !question_text.trim()) return res.status(400).json({ error: "question_text required" });
    let targetId = typeof matched_key_point_id === "string" && matched_key_point_id.trim()
      ? matched_key_point_id.trim()
      : typeof point_id === "string" && point_id.trim()
        ? point_id.trim()
      : null;

    let point = null;
    let createdNewPoint = false;

    if (targetId) {
      const { data: existingPoint, error: pointErr } = await db
        .from("key_points")
        .select("id, concept_id, increment_count")
        .eq("id", targetId)
        .single();
      if (!pointErr && existingPoint) {
        point = existingPoint;
      } else {
        // id was provided but not found -> fallback to creating a new suggestion.
        targetId = null;
      }
    } else {
      // No matched suggestion: create a new concept + key_point so it appears in Suggestions.
      targetId = null;
    }

    if (!targetId || !point) {
      const conceptTitle = typeof concept === "string" && concept.trim() ? concept.trim() : "Auto-added from approval";
      const { data: newConcept, error: conceptErr } = await db
        .from("concepts")
        .insert({
          title: conceptTitle,
          detected_language: "mixed",
          subject: typeof subject === "string" ? subject.trim() || null : null,
          system: typeof system === "string" ? system.trim() || null : null,
          topic: typeof topic === "string" ? topic.trim() || null : null,
          raw_extraction: {
            source: "create-ai-approve-fallback",
            text: question_text.trim(),
          },
        })
        .select("id")
        .single();
      if (conceptErr || !newConcept) return res.status(500).json({ error: conceptErr?.message ?? "Failed to create concept fallback" });

      const apiKey = process.env.GEMINI_API_KEY;
      const emb = apiKey ? await embedText(question_text, apiKey) : null;
      const embedding = toPgVector(emb);

      const { data: newPoint, error: kpErr } = await db
        .from("key_points")
        .insert({
          concept_id: newConcept.id,
          content: question_text.trim(),
          language: "mixed",
          position: 0,
          increment_count: 1,
          embedding,
        })
        .select("id, concept_id, increment_count")
        .single();
      if (kpErr || !newPoint) return res.status(500).json({ error: kpErr?.message ?? "Failed to create suggestion point fallback" });

      point = newPoint;
      targetId = newPoint.id;
      createdNewPoint = true;
    }

    const { data: conceptRow } = await db.from("concepts").select("title").eq("id", point.concept_id).single();
    const apiKey = process.env.GEMINI_API_KEY;
    const emb = apiKey ? await embedText(question_text, apiKey) : null;
    const embedding = toPgVector(emb);

    const { error: qErr } = await db.from("questions").insert({
      paper_id: null,
      source_point_id: point.id,
      question_mode: "mcq",
      stem: question_text,
      payload: { auto_approved_from_suggestion: true },
      embedding,
      status: "published",
      difficulty: "medium",
      marks: 1,
      subject: null,
      system: null,
      topic: null,
      concept: conceptRow?.title ?? null,
    });
    if (qErr) return res.status(500).json({ error: qErr.message });

    if (!createdNewPoint) {
      const { error: incErr } = await db
        .from("key_points")
        .update({ increment_count: Number(point.increment_count || 0) + 1 })
        .eq("id", point.id);
      if (incErr) return res.status(500).json({ error: incErr.message });
    }

    return res.json({
      ok: true,
      point_id: targetId,
      incremented: true,
      saved_question: true,
      created_new_point: createdNewPoint,
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing in server env" });

    const { texts, threshold, count } = req.body ?? {};
    const useAiScoring = String(process.env.MATCH_USE_AI_SCORING || "false").toLowerCase() === "true";
    const list = Array.isArray(texts) ? texts.filter((t) => typeof t === "string") : [];
    if (list.length === 0) return res.status(400).json({ error: "texts[] required" });
    const matchThreshold = typeof threshold === "number" ? threshold : 0.6;
    const matchCount = typeof count === "number" ? count : 3;

    const results = [];
    for (const text of list) {
      const emb = await embedText(text, apiKey);
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
      const { data: conceptRows } = await db
        .from("concepts")
        .select("id, title")
        .in("id", conceptIds);
      const conceptTitleById = new Map((conceptRows ?? []).map((c) => [c.id, c.title]));

      const enrichedMatches = (matches ?? []).map((m) => ({
        id: m.id,
        content: m.content,
        concept_id: m.concept_id,
        concept_title: conceptTitleById.get(m.concept_id) ?? null,
        increment_count: m.increment_count,
        vector_similarity: m.similarity,
      }));
      let aiScoreById = {};
      if (useAiScoring) {
        try {
          aiScoreById = await scoreMatchesWithGemini(apiKey, text, enrichedMatches.slice(0, 5));
        } catch (err) {
          console.error("Gemini match scoring failed, using vector similarity fallback", err);
        }
      }

      results.push({
        text,
        matches: enrichedMatches.map((m) => {
          const aiScore = aiScoreById[m.id];
          const vectorPct = Math.max(0, Math.min(100, Math.round((m.vector_similarity ?? 0) * 100)));
          const finalPct = typeof aiScore?.percentage === "number" ? aiScore.percentage : vectorPct;
          return {
            id: m.id,
            content: m.content,
            concept_id: m.concept_id,
            concept_title: m.concept_title,
            increment_count: m.increment_count,
            similarity: finalPct / 100,
            percentage: finalPct,
            ai_percentage: typeof aiScore?.percentage === "number" ? aiScore.percentage : null,
            ai_reason: typeof aiScore?.reason === "string" ? aiScore.reason : null,
            vector_percentage: vectorPct,
          };
        }),
      });
    }

    return res.json({ results });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/save-concept", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const apiKey = process.env.GEMINI_API_KEY;
    const body = req.body ?? {};

    const conceptName = String(body?.concept_name ?? "").trim();
    const subject = body?.subject ? String(body.subject).trim() : null;
    const system = body?.system ? String(body.system).trim() : null;
    const topic = body?.topic ? String(body.topic).trim() : null;
    const rawPoints = Array.isArray(body?.high_yield_points) ? body.high_yield_points : [];
    const points = rawPoints
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!conceptName) return res.status(400).json({ error: "concept_name required" });
    if (points.length === 0) return res.status(400).json({ error: "high_yield_points required" });

    const { data: concept, error: cErr } = await db
      .from("concepts")
      .insert({
        title: conceptName,
        detected_language: "mixed",
        subject,
        system,
        topic,
        raw_extraction: {
          concept_name: conceptName,
          high_yield_points: points,
        },
        source_image_path: null,
      })
      .select("id")
      .single();
    if (cErr || !concept) return res.status(500).json({ error: cErr?.message ?? "Failed to create concept" });

    const keyPointRows = await Promise.all(
      points.map(async (content, idx) => {
        const emb = apiKey ? await embedText(content, apiKey) : null;
        return {
          concept_id: concept.id,
          content,
          language: "mixed",
          position: idx,
          embedding: toPgVector(emb),
        };
      }),
    );
    const { data: insertedKp, error: kpErr } = await db.from("key_points").insert(keyPointRows).select("id");
    if (kpErr) return res.status(500).json({ error: kpErr.message });

    return res.json({ ok: true, concept_id: concept.id, count: insertedKp?.length ?? 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

app.post("/api/save-question", async (req, res) => {
  try {
    const db = requireSupabase(res);
    if (!db) return;
    const apiKey = process.env.GEMINI_API_KEY;
    const body = req.body ?? {};
    const list = Array.isArray(body?.questions) ? body.questions : [body];

    const normalized = (
      await Promise.all(
        list
          .filter((q) => q && (q.questionMode === "mcq" || q.questionMode === "sba"))
          .map(async (q) => {
            const stem = q.questionMode === "mcq" ? q?.mcq?.stem : q?.sba?.stem;
            const emb = apiKey ? await embedText(stem ?? "", apiKey) : null;
            return {
              subject: q.subject ?? null,
              system: q.system ?? null,
              topic: q.topic ?? null,
              concept: q.concept ?? null,
              questionMode: q.questionMode,
              metadata: q.metadata ?? {},
              mcq: q.mcq ?? null,
              sba: q.sba ?? null,
              sourcePointId: q.sourcePointId ?? null,
              embedding: toPgVector(emb),
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
      payload: q.questionMode === "mcq" ? q.mcq : q.sba,
      embedding: q.embedding,
      status: q.metadata?.status ?? "published",
      difficulty: q.metadata?.difficulty ?? "medium",
      marks: Number(q.metadata?.marks ?? 1),
      subject: q.subject,
      system: q.system,
      topic: q.topic,
      concept: q.concept,
    }));
    const { data: inserted, error: qErr } = await db.from("questions").insert(questionsToInsert).select("id");
    if (qErr) return res.status(500).json({ error: qErr.message });

    return res.json({ ok: true, paper_id: paper.id, count: inserted?.length ?? 0, ids: (inserted ?? []).map((q) => q.id) });
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

    let query = db
      .from("questions")
      .select("id, created_at, question_mode, stem, status, difficulty, marks, subject, system, topic, concept")
      .order("created_at", { ascending: false })
      .limit(300);
    if (type) query = query.eq("question_mode", type);
    if (status) query = query.eq("status", status);
    if (difficulty) query = query.eq("difficulty", difficulty);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    let rows = (data ?? []).map((q) => ({
      id: q.id,
      createdAt: q.created_at,
      questionMode: q.question_mode,
      subject: q.subject ?? "",
      system: q.system ?? "",
      topic: q.topic ?? "",
      concept: q.concept ?? "",
      metadata: { status: q.status ?? "", difficulty: q.difficulty ?? "" },
      mcq: q.question_mode === "mcq" ? { stem: q.stem } : null,
      sba: q.question_mode === "sba" ? { stem: q.stem } : null,
    }));
    if (search) {
      rows = rows.filter((q) =>
        `${q.subject} ${q.system} ${q.topic} ${q.concept} ${q.mcq?.stem ?? ""} ${q.sba?.stem ?? ""}`
          .toLowerCase()
          .includes(search),
      );
    }
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
    const { error } = await db.from("questions").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

