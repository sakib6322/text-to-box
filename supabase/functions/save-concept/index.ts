// Saves a verified concept + its key points, generating embeddings per box.
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

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
    const { title, detected_language, raw_extraction, source_image_path, key_points } = await req.json();

    if (!Array.isArray(key_points) || key_points.length === 0) {
      return new Response(JSON.stringify({ error: "key_points required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: concept, error: cErr } = await supabase
      .from("concepts")
      .insert({ title, detected_language, raw_extraction, source_image_path })
      .select()
      .single();
    if (cErr) throw cErr;

    const rows = [];
    for (let i = 0; i < key_points.length; i++) {
      const kp = key_points[i];
      const emb = await embed(kp.content, LOVABLE_API_KEY);
      rows.push({
        concept_id: concept.id,
        content: kp.content,
        language: kp.language ?? detected_language ?? null,
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
