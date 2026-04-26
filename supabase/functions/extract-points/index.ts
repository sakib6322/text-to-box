// Multilingual key-point extraction from a book page image.
// Auto-detects English / Bangla / mixed and preserves source language.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a medical exam content extractor.

INPUT: A photo of one page/section from a medical textbook. The text may be in English, Bangla (Bengali script), or a mix of both — Bangla narrative is common with English medical/anatomical/drug terms.

TASK:
1. Read all visible text accurately. OCR Bangla characters carefully (যুক্তাক্ষর, কার, ফলা).
2. First, organize the content into a brief essay-style structured summary in your head.
3. Then convert that into the MAXIMUM number of simple, atomic, exam-oriented key points (one fact per point, no compound sentences).
4. PRESERVE THE SOURCE LANGUAGE of each point:
   - If a sentence is originally in Bangla → keep it in Bangla.
   - If originally in English → keep it in English.
   - If mixed (Bangla narrative with English medical terms) → keep it mixed exactly as a student would write it. NEVER translate medical/anatomical/drug/disease terms out of English when the source uses them in English.
5. Each key point must be self-contained and directly answerable in an MCQ/SAQ.
6. Detect the dominant language of the page: "en", "bn", or "mixed".

OUTPUT: Call the function "return_key_points" with the structured result. No prose outside the tool call.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, imageBase64 } = await req.json();
    if (!imageUrl && !imageBase64) {
      return new Response(JSON.stringify({ error: "imageUrl or imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const imageContent = imageBase64
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const body = {
      model: "google/gemini-2.5-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract key points from this page. Auto-detect language and preserve it." },
            imageContent,
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_key_points",
            description: "Return the extracted multilingual key points.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short title for this concept/page in the source language." },
                detected_language: { type: "string", enum: ["en", "bn", "mixed"] },
                summary: { type: "string", description: "Brief essay-style summary in source language." },
                key_points: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      content: { type: "string", description: "One atomic exam-oriented fact in source language." },
                      language: { type: "string", enum: ["en", "bn", "mixed"] },
                    },
                    required: ["content", "language"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "detected_language", "summary", "key_points"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_key_points" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "No structured output from AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-points error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
