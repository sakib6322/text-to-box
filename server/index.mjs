import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

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
  if (start >= 0 && end > start) {
    return JSON.parse(direct.slice(start, end + 1));
  }

  throw new Error("Model returned non-JSON output");
}

app.post("/api/extract-concept", upload.single("image"), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY missing in server env" });

    const modelName = process.env.PRIMARY_AI_MODEL || "gemini-2.5-pro";
    if (!req.file) return res.status(400).json({ error: "Image file is required" });

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
      "You are an expert Medical Professor. Analyze the uploaded medical textbook image.\n" +
      "Convert the essay-like text into the maximum possible number of easy, exam-friendly, high-yield points or stems.\n" +
      "Return the output STRICTLY matching the JSON schema. Do not include any extra text.";

    const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype || "image/jpeg");

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
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

app.post("/api/approve-point", express.json(), async (req, res) => {
  try {
    const { point_id, question_text } = req.body ?? {};
    if (typeof point_id !== "string" || !point_id.trim()) return res.status(400).json({ error: "point_id required" });
    if (typeof question_text !== "string" || !question_text.trim()) return res.status(400).json({ error: "question_text required" });

    // TODO: Replace with real persistence:
    // - Increment line_count on point_id
    // - Insert into Questions table
    // - Store embeddings in PostgreSQL + pgvector
    return res.json({ ok: true, point_id, incremented: true, saved_question: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

