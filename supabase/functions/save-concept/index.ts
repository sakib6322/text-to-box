// Saves a verified concept + its key points, generating embeddings per box.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function embed(text: string, apiKey: string): Promise<number[] | null> {
  // Lovable AI gateway exposes text-embedding-004 (768-dim)
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/text-embedding-004", input: text }),
  });
  if (!r.ok) {
    console.error("embedding failed", r.status, await r.text());
    return null;
  }
  const j = await r.json();
  return j.data?.[0]?.embedding ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      concept_name,
      high_yield_points,
      source_image_path,
      // Backward compatibility (older frontend payload)
      title,
      detected_language,
      raw_extraction,
      key_points,
    } = await req.json();

    const normalizedTitle = (concept_name ?? title ?? "").toString().trim();
    const normalizedPoints = Array.isArray(high_yield_points)
      ? high_yield_points
          .filter((item: unknown): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(key_points)
        ? key_points
            .map((kp: { content?: unknown }) =>
              typeof kp?.content === "string" ? kp.content.trim() : "",
            )
            .filter(Boolean)
        : [];

    if (!normalizedTitle) {
      return new Response(JSON.stringify({ error: "concept_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!normalizedPoints.length) {
      return new Response(JSON.stringify({ error: "high_yield_points required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: concept, error: cErr } = await supabase
      .from("concepts")
      .insert({
        title: normalizedTitle,
        detected_language: detected_language ?? "mixed",
        raw_extraction: raw_extraction ?? {
          concept_name: normalizedTitle,
          high_yield_points: normalizedPoints,
        },
        source_image_path,
      })
      .select()
      .single();
    if (cErr) throw cErr;

    const rows = [];
    for (let i = 0; i < normalizedPoints.length; i++) {
      const content = normalizedPoints[i];
      const emb = await embed(content, LOVABLE_API_KEY);
      rows.push({
        concept_id: concept.id,
        content,
        language: detected_language ?? "mixed",
        position: i,
        embedding: emb,
      });
    }

    const { error: kErr } = await supabase.from("key_points").insert(rows);
    if (kErr) throw kErr;

    return new Response(JSON.stringify({ concept_id: concept.id, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("save-concept error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});




