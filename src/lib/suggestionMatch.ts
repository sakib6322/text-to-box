import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";

export type SuggestionMatch = {
  keyPointId: string;
  keyPointContent: string;
  percentage: number;
  conceptTitle: string | null;
  conceptId?: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
  boardNames: string[];
  aiReason?: string | null;
  vectorPercentage?: number;
};

type RawMatch = {
  id: string;
  content?: string;
  concept_id?: string | null;
  similarity?: number;
  percentage?: number;
  concept_title?: string | null;
  concept_subject?: string | null;
  concept_system?: string | null;
  concept_chapter?: string | null;
  concept_topic?: string | null;
  board_names?: string[];
  ai_percentage?: number | null;
  ai_reason?: string | null;
  vector_percentage?: number;
};

export function matchTaxonomyPath(m: Pick<SuggestionMatch, "subject" | "system" | "chapter" | "topic" | "conceptTitle">): string {
  return [m.subject, m.system, m.chapter, m.topic, m.conceptTitle]
    .map((x) => (x ?? "").trim())
    .filter(Boolean)
    .join(" → ");
}

function mapRawMatch(best: RawMatch): SuggestionMatch {
  const pct =
    typeof best.ai_percentage === "number"
      ? Math.round(best.ai_percentage)
      : typeof best.percentage === "number"
        ? Math.round(best.percentage)
        : typeof best.similarity === "number"
          ? Math.round(best.similarity * 100)
          : 0;
  return {
    keyPointId: best.id,
    keyPointContent: typeof best.content === "string" ? best.content : "",
    percentage: pct,
    conceptTitle: best.concept_title ?? null,
    conceptId: best.concept_id ?? null,
    subject: best.concept_subject ?? null,
    system: best.concept_system ?? null,
    chapter: best.concept_chapter ?? null,
    topic: best.concept_topic ?? null,
    boardNames: Array.isArray(best.board_names) ? best.board_names.filter(Boolean) : [],
    aiReason: typeof best.ai_reason === "string" ? best.ai_reason : null,
    vectorPercentage: typeof best.vector_percentage === "number" ? best.vector_percentage : undefined,
  };
}

export async function fetchSuggestionMatches(texts: string[]): Promise<Map<string, SuggestionMatch | null>> {
  const bestByText = new Map<string, SuggestionMatch | null>();
  const list = texts.filter((t) => t.trim());
  if (!list.length) return bestByText;

  const resp = await fetch(apiUrl("/api/match-key-points"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ texts: list.slice(0, 40), threshold: 0.55, count: 1 }),
  });

  type MatchResult = { text: string; matches: RawMatch[] };
  const j = (await resp.json().catch(() => ({}))) as { results?: MatchResult[]; error?: string };
  if (!resp.ok) throw new Error(j.error ?? "Match failed");

  for (const r of j.results ?? []) {
    if (typeof r?.text !== "string") continue;
    const best = Array.isArray(r.matches) && r.matches.length ? r.matches[0] : null;
    if (!best?.id) {
      bestByText.set(r.text, null);
      continue;
    }
    bestByText.set(r.text, mapRawMatch(best));
  }
  return bestByText;
}

export async function updateKeyPointContent(keyPointId: string, content: string): Promise<void> {
  const resp = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(keyPointId)}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  const j = (await resp.json().catch(() => ({}))) as { error?: string };
  if (!resp.ok) throw new Error(j.error ?? "Update failed");
}

/** Legacy alias used by CreateQuestionAI */
export type LegacySuggestionMatch = {
  key_point_id: string;
  key_point_content?: string;
  concept_id?: string | null;
  similarity: number;
  concept_title: string | null;
  concept_subject?: string | null;
  concept_system?: string | null;
  concept_chapter?: string | null;
  concept_topic?: string | null;
  board_names?: string[];
  ai_percentage?: number | null;
  ai_reason?: string | null;
  vector_percentage?: number;
};

export function toLegacyMatch(m: SuggestionMatch): LegacySuggestionMatch {
  return {
    key_point_id: m.keyPointId,
    key_point_content: m.keyPointContent,
    concept_id: m.conceptId,
    similarity: m.percentage / 100,
    concept_title: m.conceptTitle,
    concept_subject: m.subject ?? undefined,
    concept_system: m.system ?? undefined,
    concept_chapter: m.chapter ?? undefined,
    concept_topic: m.topic ?? undefined,
    board_names: m.boardNames,
    ai_percentage: m.percentage,
    ai_reason: m.aiReason,
    vector_percentage: m.vectorPercentage,
  };
}

export function fromLegacyMatch(m: LegacySuggestionMatch): SuggestionMatch {
  return {
    keyPointId: m.key_point_id,
    keyPointContent: m.key_point_content ?? "",
    percentage: Math.round(m.ai_percentage ?? m.similarity * 100),
    conceptTitle: m.concept_title,
    conceptId: m.concept_id,
    subject: m.concept_subject ?? null,
    system: m.concept_system ?? null,
    chapter: m.concept_chapter ?? null,
    topic: m.concept_topic ?? null,
    boardNames: m.board_names ?? [],
    aiReason: m.ai_reason,
    vectorPercentage: m.vector_percentage,
  };
}
