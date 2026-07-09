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

type LoadedConcept = {
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
};

const conceptByIdCache = new Map<string, LoadedConcept>();
const conceptIdByTitleCache = new Map<string, string>();
const conceptIdByPointCache = new Map<string, string>();

function normalizeLookupText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickBestConceptByTitle<T extends { title?: string | null }>(items: T[], title: string): T | null {
  if (!items.length) return null;
  const target = normalizeLookupText(title);
  if (!target) return items[0] ?? null;

  let best: T | null = null;
  let bestScore = -1;
  for (const item of items) {
    const raw = (item.title ?? "").trim();
    if (!raw) continue;
    const current = normalizeLookupText(raw);
    if (!current) continue;
    if (current === target) return item;
    let score = 0;
    if (current.includes(target) || target.includes(current)) score += 3;
    const currentWords = new Set(current.split(" "));
    const targetWords = target.split(" ");
    for (const w of targetWords) if (currentWords.has(w)) score += 1;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

function buildSearchPhrases(title: string): string[] {
  const normalized = normalizeLookupText(title);
  if (!normalized) return [];
  const words = normalized.split(" ").filter(Boolean);
  const phrases = new Set<string>();
  phrases.add(normalized);
  for (let size = Math.min(words.length, 6); size >= 2; size -= 1) {
    for (let i = 0; i + size <= words.length; i += 1) {
      phrases.add(words.slice(i, i + size).join(" "));
    }
    if (phrases.size >= 24) break;
  }
  return Array.from(phrases);
}

function buildTitleCacheKey(title: string, filters?: ConceptLookupFilters): string {
  return JSON.stringify({
    title: normalizeLookupText(title),
    subject: normalizeLookupText(filters?.subject ?? ""),
    system: normalizeLookupText(filters?.system ?? ""),
    chapter: normalizeLookupText(filters?.chapter ?? ""),
    topic: normalizeLookupText(filters?.topic ?? ""),
  });
}

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
  const titleCacheKey = buildTitleCacheKey(name, filters);
  const cachedConceptId = conceptIdByTitleCache.get(titleCacheKey);
  if (cachedConceptId) {
    const loaded = await fetchConceptById(cachedConceptId);
    return {
      conceptId: cachedConceptId,
      conceptName: loaded.conceptName,
      detail: loaded.detail,
      keyPoints: loaded.keyPoints,
    };
  }

  const lookupViaApi = async (withFilters: boolean) => {
    const params = new URLSearchParams({ title: name });
    if (withFilters) {
      if (filters?.subject?.trim()) params.set("subject", filters.subject.trim());
      if (filters?.system?.trim()) params.set("system", filters.system.trim());
      if (filters?.chapter?.trim()) params.set("chapter", filters.chapter.trim());
      if (filters?.topic?.trim()) params.set("topic", filters.topic.trim());
    }
    const res = await fetch(apiUrl(`/api/concepts/lookup?${params}`));
    const data = (await res.json().catch(() => ({}))) as {
      concept?: Record<string, unknown>;
      key_points?: { content?: string }[];
      error?: string;
    };
    return { res, data };
  };

  try {
    const { res, data } = await lookupViaApi(true);
    if (res.ok && data.concept) {
      const mapped = conceptFromLookupResponse(data);
      if (mapped.conceptId) conceptIdByTitleCache.set(titleCacheKey, mapped.conceptId);
      return mapped;
    }
    if (!res.ok && res.status !== 404) throw new Error(data.error ?? "Concept lookup failed");

    const hasFilters = Boolean(
      filters?.subject?.trim() ||
        filters?.system?.trim() ||
        filters?.chapter?.trim() ||
        filters?.topic?.trim(),
    );
    if (res.status === 404 && hasFilters) {
      const retry = await lookupViaApi(false);
      if (retry.res.ok && retry.data.concept) {
        const mapped = conceptFromLookupResponse(retry.data);
        if (mapped.conceptId) conceptIdByTitleCache.set(titleCacheKey, mapped.conceptId);
        return mapped;
      }
      if (!retry.res.ok && retry.res.status !== 404) {
        throw new Error(retry.data.error ?? "Concept lookup failed");
      }
    }
  } catch (e) {
    if (e instanceof Error && !/fetch|network|failed/i.test(e.message)) throw e;
  }

  const fallbackViaConceptList = async () => {
    const request = async (withFilters: boolean) => {
      const params = new URLSearchParams({ search: name });
      if (withFilters) {
        if (filters?.subject?.trim()) params.set("subject", filters.subject.trim());
        if (filters?.system?.trim()) params.set("system", filters.system.trim());
        if (filters?.chapter?.trim()) params.set("chapter", filters.chapter.trim());
        if (filters?.topic?.trim()) params.set("topic", filters.topic.trim());
      }
      const res = await fetch(apiUrl(`/api/concepts?${params}`));
      const data = (await res.json().catch(() => ({}))) as {
        concepts?: { id?: string; title?: string | null }[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Concept lookup failed");
      const concepts = Array.isArray(data.concepts) ? data.concepts : [];
      const best = pickBestConceptByTitle(concepts, name);
      const bestId = typeof best?.id === "string" ? best.id : "";
      if (!bestId) return null;
      const loaded = await fetchConceptById(bestId);
      conceptIdByTitleCache.set(titleCacheKey, bestId);
      return {
        conceptId: bestId,
        conceptName: loaded.conceptName,
        detail: loaded.detail,
        keyPoints: loaded.keyPoints,
      };
    };

    const withFilters = await request(true);
    if (withFilters) return withFilters;
    const hasFilters = Boolean(
      filters?.subject?.trim() ||
        filters?.system?.trim() ||
        filters?.chapter?.trim() ||
        filters?.topic?.trim(),
    );
    if (!hasFilters) return null;
    return request(false);
  };

  const fallbackViaSupabaseTokenSearch = async () => {
    const phrases = buildSearchPhrases(name);
    if (!phrases.length) return null;
    const candidates: { id?: string; title?: string | null }[] = [];
    const seen = new Set<string>();
    for (const phrase of phrases) {
      let query = supabase
        .from("concepts")
        .select("id, title")
        .ilike("title", `%${phrase}%`)
        .limit(40);
      if (filters?.subject?.trim()) query = query.eq("subject", filters.subject.trim());
      if (filters?.system?.trim()) query = query.eq("system", filters.system.trim());
      if (filters?.topic?.trim()) query = query.eq("topic", filters.topic.trim());
      const { data, error } = await query;
      if (error) continue;
      for (const row of data ?? []) {
        const id = typeof row.id === "string" ? row.id : "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        candidates.push(row);
      }
      if (candidates.length >= 120) break;
    }
    const best = pickBestConceptByTitle(candidates, name);
    const bestId = typeof best?.id === "string" ? best.id : "";
    if (!bestId) return null;
    const loaded = await fetchConceptById(bestId);
    conceptIdByTitleCache.set(titleCacheKey, bestId);
    return {
      conceptId: bestId,
      conceptName: loaded.conceptName,
      detail: loaded.detail,
      keyPoints: loaded.keyPoints,
    };
  };

  const fallbackViaSemanticMatch = async () => {
    const r = await fetch(apiUrl("/api/match-key-points"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texts: [name],
        threshold: 0,
        count: 1,
      }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      results?: { matches?: { concept_id?: string | null }[] }[];
      error?: string;
    };
    if (!r.ok) throw new Error(j.error ?? "Concept lookup failed");
    const conceptId = j.results?.[0]?.matches?.[0]?.concept_id ?? null;
    if (!conceptId || typeof conceptId !== "string") return null;
    const loaded = await fetchConceptById(conceptId);
    conceptIdByTitleCache.set(titleCacheKey, conceptId);
    return {
      conceptId,
      conceptName: loaded.conceptName,
      detail: loaded.detail,
      keyPoints: loaded.keyPoints,
    };
  };

  const loadSupabaseCandidates = async (pattern: string) => {
    let query = supabase
      .from("concepts")
      .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
      .ilike("title", pattern)
      .limit(50);
    if (filters?.subject?.trim()) query = query.eq("subject", filters.subject.trim());
    if (filters?.system?.trim()) query = query.eq("system", filters.system.trim());
    if (filters?.topic?.trim()) query = query.eq("topic", filters.topic.trim());
    const { data, error } = await query;
    if (error && /detail_summary|detail_paragraphs|detail_table|column/i.test(error.message)) {
      let fallbackQuery = supabase
        .from("concepts")
        .select("id, title, raw_extraction")
        .ilike("title", pattern)
        .limit(50);
      if (filters?.subject?.trim()) fallbackQuery = fallbackQuery.eq("subject", filters.subject.trim());
      if (filters?.system?.trim()) fallbackQuery = fallbackQuery.eq("system", filters.system.trim());
      if (filters?.topic?.trim()) fallbackQuery = fallbackQuery.eq("topic", filters.topic.trim());
      const fallback = await fallbackQuery;
      if (fallback.error) throw new Error(fallback.error.message);
      return (fallback.data as unknown as Record<string, unknown>[]) ?? [];
    }
    if (error) throw new Error(error.message);
    return (data as unknown as Record<string, unknown>[]) ?? [];
  };

  const exactCandidates = await loadSupabaseCandidates(name);
  let concept = pickBestConceptByTitle(exactCandidates, name) as Record<string, unknown> | null;
  if (!concept) {
    const fuzzyCandidates = await loadSupabaseCandidates(`%${name}%`);
    concept = pickBestConceptByTitle(fuzzyCandidates, name) as Record<string, unknown> | null;
  }
  if (!concept) {
    try {
      const fallback = await fallbackViaConceptList();
      if (fallback) return fallback;
    } catch {
      // ignore and keep the original not-found behavior
    }
    try {
      const fallback = await fallbackViaSupabaseTokenSearch();
      if (fallback) return fallback;
    } catch {
      // ignore and keep the original not-found behavior
    }
    try {
      const fallback = await fallbackViaSemanticMatch();
      if (fallback) return fallback;
    } catch {
      // ignore and keep the original not-found behavior
    }
    throw new Error(`Concept not found: ${name}`);
  }

  const conceptId = typeof concept["id"] === "string" ? concept["id"] : null;
  const { data: keyPoints, error: kpErr } = conceptId
    ? await supabase.from("key_points").select("content, position").eq("concept_id", conceptId).order("position", { ascending: true })
    : { data: [], error: null };

  if (kpErr) throw new Error(kpErr.message);

  const result = {
    conceptId,
    conceptName: typeof concept["title"] === "string" ? concept["title"] : name,
    detail: conceptDetailFromApi(concept),
    keyPoints: (keyPoints ?? []).map((kp) => kp.content).filter(Boolean),
  };
  if (conceptId) {
    conceptIdByTitleCache.set(titleCacheKey, conceptId);
    conceptByIdCache.set(conceptId, {
      conceptName: result.conceptName,
      detail: result.detail,
      keyPoints: result.keyPoints,
    });
  }
  return result;
}

export async function fetchConceptById(conceptId: string): Promise<{
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
}> {
  const id = conceptId.trim();
  if (!id) throw new Error("Concept id required");
  const cached = conceptByIdCache.get(id);
  if (cached) return cached;

  let idLookup = await supabase
    .from("concepts")
    .select("id, title, detail_summary, detail_paragraphs, detail_table, raw_extraction")
    .eq("id", id)
    .maybeSingle();
  let concept = (idLookup.data as unknown as Record<string, unknown> | null) ?? null;
  let error = idLookup.error;

  if (error && /detail_summary|detail_paragraphs|detail_table|column/i.test(error.message)) {
    idLookup = await supabase
      .from("concepts")
      .select("id, title, raw_extraction")
      .eq("id", id)
      .maybeSingle();
    concept = (idLookup.data as unknown as Record<string, unknown> | null) ?? null;
    error = idLookup.error;
  }

  if (error) throw new Error(error.message);
  if (!concept) throw new Error("Concept not found");

  const { data: keyPoints, error: kpErr } = await supabase
    .from("key_points")
    .select("content, position")
    .eq("concept_id", id)
    .order("position", { ascending: true });

  if (kpErr) throw new Error(kpErr.message);

  const result = {
    conceptName: typeof concept["title"] === "string" ? concept["title"] : "",
    detail: conceptDetailFromApi(concept),
    keyPoints: (keyPoints ?? []).map((kp) => kp.content).filter(Boolean),
  };
  conceptByIdCache.set(id, result);
  return result;
}

export async function fetchConceptByKeyPointId(pointId: string): Promise<{
  conceptId: string;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
}> {
  const id = pointId.trim();
  if (!id) throw new Error("Key point id required");
  const cachedConceptId = conceptIdByPointCache.get(id);
  if (cachedConceptId) {
    const loaded = await fetchConceptById(cachedConceptId);
    return {
      conceptId: cachedConceptId,
      conceptName: loaded.conceptName,
      detail: loaded.detail,
      keyPoints: loaded.keyPoints,
    };
  }

  const { data, error } = await supabase
    .from("key_points")
    .select("concept_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const conceptId = typeof data?.concept_id === "string" ? data.concept_id : "";
  if (!conceptId) throw new Error("Concept not found");
  conceptIdByPointCache.set(id, conceptId);

  const loaded = await fetchConceptById(conceptId);
  return {
    conceptId,
    conceptName: loaded.conceptName,
    detail: loaded.detail,
    keyPoints: loaded.keyPoints,
  };
}
