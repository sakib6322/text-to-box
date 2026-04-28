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
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "models/text-embedding-004";
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

app.post("/api/extract-concept", upload.single("image"), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing in server env" });

    const modelName = process.env.PRIMARY_AI_MODEL || "gemini-2.5-pro";
    const inputText = String(req.body?.input_text ?? "").trim();
    if (!req.file && !inputText) {
      return res.status(400).json({ error: "Image file or input text is required" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        concept_name: { type: SchemaType.STRING },
        high_yield_points: {
          type: SchemaType.ARRAY,
          description: "List of exam-friendly, high-yield points or stems extracted from the text.",
          items: { type: SchemaType.STRING },
        },
      },
      required: ["concept_name", "high_yield_points"],
    };

    const generationConfig = {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema,
    };

    const prompt =
      "You are an expert Medical Professor. Analyze the uploaded medical textbook image and/or given source text.\n" +
      "Convert the essay-like text into the maximum possible number of easy, exam-friendly, high-yield points or stems.\n" +
      "Return the output STRICTLY matching the JSON schema. Do not include any extra text.";

    const parts = [{ text: `${prompt}${inputText ? `\n\nSource text:\n${inputText}` : ""}` }];
    if (req.file) parts.push(fileToGenerativePart(req.file.buffer, req.file.mimetype || "image/jpeg"));

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
    });

    const text = result?.response?.text?.() ?? "";
    const parsed = parseGeminiJson(text);
    const concept_name = typeof parsed?.concept_name === "string" ? parsed.concept_name : "";
    const high_yield_points = Array.isArray(parsed?.high_yield_points)
      ? parsed.high_yield_points.filter((x) => typeof x === "string")
      : [];

    return res.json({ concept_name, high_yield_points });
  } catch (e) {
    console.error(e);
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
    const { point_id, question_text } = req.body ?? {};
    if (typeof point_id !== "string" || !point_id.trim()) return res.status(400).json({ error: "point_id required" });
    if (typeof question_text !== "string" || !question_text.trim()) return res.status(400).json({ error: "question_text required" });

    const { data: point, error: pointErr } = await db
      .from("key_points")
      .select("id, concept_id, increment_count")
      .eq("id", point_id)
      .single();
    if (pointErr || !point) return res.status(404).json({ error: "point_id not found" });

    const { data: concept } = await db.from("concepts").select("title").eq("id", point.concept_id).single();
    const apiKey = process.env.GEMINI_API_KEY;
    const emb = apiKey ? await embedText(question_text, apiKey) : null;
    const embedding = emb ? `[${emb.join(",")}]` : null;

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
      concept: concept?.title ?? null,
    });
    if (qErr) return res.status(500).json({ error: qErr.message });

    const { error: incErr } = await db
      .from("key_points")
      .update({ increment_count: Number(point.increment_count || 0) + 1 })
      .eq("id", point.id);
    if (incErr) return res.status(500).json({ error: incErr.message });

    return res.json({ ok: true, point_id, incremented: true, saved_question: true });
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
              embedding: emb ? `[${emb.join(",")}]` : null,
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

