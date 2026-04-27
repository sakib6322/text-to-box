const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ExtractResponse = {
  concept_name: string;
  high_yield_points: string[];
};

function parseGeminiJson(rawText: string): ExtractResponse {
  const direct = rawText.trim();

  try {
    return JSON.parse(direct) as ExtractResponse;
  } catch {
    // Gemini may occasionally wrap JSON with extra text or markdown fences.
  }

  const fenced = direct.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) {
    try {
      return JSON.parse(fenced.trim()) as ExtractResponse;
    } catch {
      // Try object-slice parsing next.
    }
  }

  const objectStart = direct.indexOf("{");
  const objectEnd = direct.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    const objectSlice = direct.slice(objectStart, objectEnd + 1);
    return JSON.parse(objectSlice) as ExtractResponse;
  }

  throw new Error("Model returned non-JSON output");
}

async function resolveImagePayload(req: Request): Promise<{ imageBase64: string; mimeType: string }> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      throw new Error("Image file is required");
    }
    return {
      imageBase64: await fileToBase64(image),
      mimeType: image.type || "image/jpeg",
    };
  }

  const body = await req.json();
  if (typeof body?.imageBase64 === "string" && body.imageBase64.trim()) {
    return {
      imageBase64: body.imageBase64.trim(),
      mimeType: typeof body?.mimeType === "string" && body.mimeType ? body.mimeType : "image/jpeg",
    };
  }

  throw new Error("Image payload is required");
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured in Edge Function secrets");

    const PRIMARY_AI_MODEL = Deno.env.get("PRIMARY_AI_MODEL") ?? "gemini-2.5-pro";
    const { imageBase64, mimeType } = await resolveImagePayload(req);

    const prompt = `You are an expert Medical Professor. Analyze the uploaded medical textbook image.
Convert the essay-like text into the maximum possible number of easy, exam-friendly, high-yield points or stems.
Return output STRICTLY matching the JSON schema. Do not add explanations, markdown, or extra keys.`;

    const body = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: imageBase64,
              mimeType,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            concept_name: { type: "STRING" },
            high_yield_points: {
              type: "ARRAY",
              description: "List of exam-friendly, high-yield points or stems extracted from the text.",
              items: { type: "STRING" },
            },
          },
          required: ["concept_name", "high_yield_points"],
        },
      },
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gemini error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Failed to extract concept. Please try again." }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error("No JSON text returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "No structured output from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseGeminiJson(rawText);
    const normalized = {
      concept_name: parsed.concept_name ?? "",
      high_yield_points: Array.isArray(parsed.high_yield_points)
        ? parsed.high_yield_points.filter((item) => typeof item === "string")
        : [],
    };

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-points error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("required") ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
