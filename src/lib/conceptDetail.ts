import { apiUrl } from "@/lib/apiBase";
import { supabase } from "@/integrations/supabase/client";

export type DetailTable = {
  title?: string | null;
  headers?: string[];
  rows?: { cells: string[] }[];
};

export type ConceptDetail = {
  summary: string;
  paragraphs: string[];
  table: DetailTable | null;
  verbatimText: string;
};

export function emptyConceptDetail(): ConceptDetail {
  return { summary: "", paragraphs: [], table: null, verbatimText: "" };
}

export function tableRowToSuggestionLine(cells: string[]): string {
  const clean = cells.map((c) => c.trim()).filter(Boolean);
  if (!clean.length) return "";
  const label = clean[0] ?? "";
  const action = clean.length >= 3 ? clean[2] : clean[clean.length - 1] ?? "";
  return `${label} → ${action}`;
}

export function buildSuggestionLines(table: DetailTable | null, keyPoints: string[]): string[] {
  const fromTable = (table?.rows ?? [])
    .map((row) => tableRowToSuggestionLine(row.cells ?? []))
    .filter(Boolean);
  if (fromTable.length) return fromTable;
  return keyPoints.map((p) => p.trim()).filter(Boolean);
}

export type SuggestionMatch = {
  percentage: number;
  conceptTitle: string | null;
  boardNames: string[];
  keyPointId: string | null;
};

export function parseDetailTable(raw: unknown): DetailTable | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : null;
  const headers = Array.isArray(obj.headers)
    ? obj.headers.filter((h): h is string => typeof h === "string")
    : [];
  const rows = Array.isArray(obj.rows)
    ? obj.rows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const cells = Array.isArray((row as { cells?: unknown }).cells)
            ? (row as { cells: unknown[] }).cells.filter((c): c is string => typeof c === "string")
            : [];
          return cells.length ? { cells } : null;
        })
        .filter((r): r is { cells: string[] } => r != null)
    : [];
  if (!title && !headers.length && !rows.length) return null;
  return { title, headers, rows };
}

export function conceptDetailFromApi(data: Record<string, unknown>): ConceptDetail {
  const raw = data.raw_extraction;
  const rawObj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

  const summary =
    typeof data.detail_summary === "string" && data.detail_summary.trim()
      ? data.detail_summary
      : typeof rawObj?.detail_summary === "string"
        ? rawObj.detail_summary
        : "";

  const paragraphs = Array.isArray(data.detail_paragraphs) && data.detail_paragraphs.length
    ? data.detail_paragraphs.filter((p): p is string => typeof p === "string")
    : Array.isArray(rawObj?.detail_paragraphs)
      ? rawObj.detail_paragraphs.filter((p): p is string => typeof p === "string")
      : [];

  const table =
    parseDetailTable(data.detail_table) ??
    parseDetailTable(rawObj?.detail_table);

  const verbatimFromRaw =
    rawObj && typeof rawObj.verbatim_text === "string" ? rawObj.verbatim_text : "";

  return {
    summary,
    paragraphs,
    table,
    verbatimText: verbatimFromRaw,
  };
}

export type ConceptLookupFilters = {
  subject?: string;
  system?: string;
  chapter?: string;
  topic?: string;
};

function conceptFromLookupResponse(data: {
  concept?: Record<string, unknown>;
  key_points?: { content?: string }[];
}): {
  conceptId: string | null;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
} {
  const concept = data.concept ?? {};
  const conceptId = typeof concept.id === "string" ? concept.id : null;
  return {
    conceptId,
    conceptName: typeof concept.title === "string" ? concept.title : "",
    detail: conceptDetailFromApi(concept),
    keyPoints: (data.key_points ?? []).map((kp) => kp.content ?? "").filter(Boolean),
  };
}

export async function fetchConceptByTitle(
  title: string,
  filters?: ConceptLookupFilters,
): Promise<{
  conceptId: string | null;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
}> {
  const name = title.trim();
  if (!name) throw new Error("Concept name required");

  try {
    const params = new URLSearchParams({ title: name });
    if (filters?.subject?.trim()) params.set("subject", filters.subject.trim());
    if (filters?.system?.trim()) params.set("system", filters.system.trim());
    if (filters?.chapter?.trim()) params.set("chapter", filters.chapter.trim());
    if (filters?.topic?.trim()) params.set("topic", filters.topic.trim());
    const res = await fetch(apiUrl(`/api/concepts/lookup?${params}`));
    const data = (await res.json().catch(() => ({}))) as {
      concept?: Record<string, unknown>;
      key_points?: { content?: string }[];
      error?: string;
    };
    if (res.ok && data.concept) return conceptFromLookupResponse(data);
    if (!res.ok && res.status !== 404) throw new Error(data.error ?? "Concept lookup failed");
  } catch (e) {
    if (e instanceof Error && !/fetch|network|failed/i.test(e.message)) throw e;
  }

  let { data: concept, error } = await supabase
    .from("concepts")
    .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
    .ilike("title", name)
    .maybeSingle();

  if (!concept) {
    ({ data: concept, error } = await supabase
      .from("concepts")
      .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
      .ilike("title", `%${name}%`)
      .limit(1)
      .maybeSingle());
  }

  if (error && /detail_summary|detail_paragraphs|detail_table|column/i.test(error.message)) {
    ({ data: concept, error } = await supabase
      .from("concepts")
      .select("id, title, raw_extraction")
      .ilike("title", name)
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  if (!concept) throw new Error(`Concept not found: ${name}`);

  const conceptId = typeof concept.id === "string" ? concept.id : null;
  const { data: keyPoints, error: kpErr } = conceptId
    ? await supabase.from("key_points").select("content, position").eq("concept_id", conceptId).order("position", { ascending: true })
    : { data: [], error: null };

  if (kpErr) throw new Error(kpErr.message);

  return {
    conceptId,
    conceptName: typeof concept.title === "string" ? concept.title : name,
    detail: conceptDetailFromApi(concept as Record<string, unknown>),
    keyPoints: (keyPoints ?? []).map((kp) => kp.content).filter(Boolean),
  };
}

export async function fetchConceptById(conceptId: string): Promise<{
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
}> {
  const id = conceptId.trim();
  if (!id) throw new Error("Concept id required");

  let { data: concept, error } = await supabase
    .from("concepts")
    .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
    .eq("id", id)
    .maybeSingle();

  if (error && /detail_summary|detail_paragraphs|detail_table|column/i.test(error.message)) {
    ({ data: concept, error } = await supabase
      .from("concepts")
      .select("id, title, raw_extraction")
      .eq("id", id)
      .maybeSingle());
  }

  if (error) throw new Error(error.message);
  if (!concept) throw new Error("Concept not found");

  const { data: keyPoints, error: kpErr } = await supabase
    .from("key_points")
    .select("content, position")
    .eq("concept_id", id)
    .order("position", { ascending: true });

  if (kpErr) throw new Error(kpErr.message);

  return {
    conceptName: typeof concept.title === "string" ? concept.title : "",
    detail: conceptDetailFromApi(concept as Record<string, unknown>),
    keyPoints: (keyPoints ?? []).map((kp) => kp.content).filter(Boolean),
  };
}
