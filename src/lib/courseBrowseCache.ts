import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import { fetchCourseProgress, type CourseProgressRollup } from "@/lib/progressApi";

const TTL_MS = 60_000;

type CacheEntry<T> = { at: number; data: T; inflight?: Promise<T> };

const store = new Map<string, CacheEntry<unknown>>();

function peek<T>(key: string): T | null {
  const e = store.get(key) as CacheEntry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.at > TTL_MS) return null;
  return e.data;
}

function put<T>(key: string, data: T): T {
  store.set(key, { at: Date.now(), data });
  return data;
}

async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, opts?: { force?: boolean }): Promise<T> {
  if (!opts?.force) {
    const hit = peek<T>(key);
    if (hit != null) return hit;
    const existing = store.get(key) as CacheEntry<T> | undefined;
    if (existing?.inflight) return existing.inflight;
  }
  const inflight = fetcher()
    .then((data) => {
      put(key, data);
      const e = store.get(key) as CacheEntry<T> | undefined;
      if (e) delete e.inflight;
      return data;
    })
    .catch((err) => {
      const e = store.get(key) as CacheEntry<T> | undefined;
      if (e) delete e.inflight;
      throw err;
    });
  const prev = peek<T>(key);
  store.set(key, { at: prev != null ? (store.get(key) as CacheEntry<T>).at : 0, data: prev as T, inflight });
  return inflight;
}

export type CourseBrowsePayload = {
  course?: { name: string; id?: string; slug?: string; description?: string; status?: string };
  today?: string;
  systems: Array<{
    system_id: string;
    system_name: string | null;
    subject_id: string | null;
    subject_name: string | null;
    unlocked: boolean;
    publish_date: string | null;
    label: string;
    topics: Array<{
      topic_id: string;
      topic_name: string;
      chapter_id: string | null;
      chapter_name: string | null;
      stars: number;
      concept_count: number;
    }>;
  }>;
};

export type CourseTaxonomyPayload = {
  course?: { id: string; name: string; slug: string };
  subjects: Array<{ id: string; name: string }>;
  systems: Array<{ id: string; name: string; subject_id: string | null }>;
  chapters: Array<{ id: string; name: string; system_id: string | null }>;
  topics: Array<{ id: string; name: string; chapter_id: string | null; path?: string }>;
};

export type TopicConceptsPayload = {
  concepts: Array<{ id: string; title: string }>;
  path?: {
    topic_id: string;
    topic_name: string;
    chapter_id: string | null;
    chapter_name: string | null;
    system_id: string | null;
    system_name: string | null;
    subject_id: string | null;
    subject_name: string | null;
    path: string;
  } | null;
  unlocks_on?: string;
  error?: string;
  status?: number;
};

export function getCachedCourseBrowse(courseId: string): CourseBrowsePayload | null {
  return peek(`browse:${courseId}`);
}

export function getCachedCourseProgress(courseId: string): CourseProgressRollup | null {
  return peek(`progress:${courseId}`);
}

export function getCachedCourseTaxonomy(courseId: string): CourseTaxonomyPayload | null {
  return peek(`taxonomy:${courseId}`);
}

export function getCachedTopicConcepts(courseId: string, topicId: string): TopicConceptsPayload | null {
  return peek(`topic-concepts:${courseId}:${topicId}`);
}

export async function loadCourseBrowse(courseId: string, opts?: { force?: boolean }) {
  return cachedFetch(`browse:${courseId}`, async () => {
    const r = await fetch(apiUrl(`/api/me/courses/${courseId}/browse`), { headers: getAuthHeaders() });
    const j = (await r.json().catch(() => ({}))) as CourseBrowsePayload & { error?: string };
    if (!r.ok) throw new Error(j.error ?? "Failed to load");
    return { course: j.course, today: j.today, systems: j.systems ?? [] };
  }, opts);
}

export async function loadCourseTaxonomy(courseId: string, opts?: { force?: boolean }) {
  return cachedFetch(`taxonomy:${courseId}`, async () => {
    const r = await fetch(apiUrl(`/api/me/courses/${encodeURIComponent(courseId)}/taxonomy`), {
      headers: getAuthHeaders(),
    });
    const j = (await r.json().catch(() => ({}))) as CourseTaxonomyPayload & { error?: string };
    if (!r.ok) throw new Error(j.error ?? "Failed to load course syllabus");
    return {
      course: j.course,
      subjects: j.subjects ?? [],
      systems: j.systems ?? [],
      chapters: j.chapters ?? [],
      topics: j.topics ?? [],
    };
  }, opts);
}

export async function loadCourseProgressCached(courseId: string, opts?: { force?: boolean }) {
  return cachedFetch(`progress:${courseId}`, () => fetchCourseProgress(courseId), opts);
}

export async function loadTopicConcepts(courseId: string, topicId: string, opts?: { force?: boolean }) {
  return cachedFetch(`topic-concepts:${courseId}:${topicId}`, async () => {
    const r = await fetch(apiUrl(`/api/me/courses/${courseId}/topics/${topicId}/concepts`), {
      headers: getAuthHeaders(),
    });
    const j = (await r.json().catch(() => ({}))) as TopicConceptsPayload;
    if (!r.ok) {
      return {
        concepts: [],
        path: j.path ?? null,
        unlocks_on: j.unlocks_on,
        error: j.error ?? "Failed to load",
        status: r.status,
      };
    }
    return { concepts: j.concepts ?? [], path: j.path ?? null, status: r.status };
  }, opts);
}

export type ConceptShellLite = {
  id: string;
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
};

export async function loadConceptsByTopicId(topicId: string, opts?: { force?: boolean }) {
  return cachedFetch(`concepts-by-topic:${topicId}`, async () => {
    const qs = new URLSearchParams({ topic_id: topicId });
    const r = await fetch(apiUrl(`/api/concepts?${qs}`), { headers: getAuthHeaders() });
    const j = (await r.json().catch(() => ({}))) as { concepts?: ConceptShellLite[]; error?: string };
    if (!r.ok) throw new Error(j.error ?? "Failed to load concepts");
    return (j.concepts ?? []).map((c) => ({
      id: c.id,
      title: c.title ?? null,
      subject: c.subject ?? null,
      system: c.system ?? null,
      chapter: c.chapter ?? null,
      topic: c.topic ?? null,
    }));
  }, opts);
}

export function prefetchTopicConcepts(courseId: string, topicId: string) {
  if (!courseId || !topicId) return;
  if (peek(`topic-concepts:${courseId}:${topicId}`)) return;
  void loadTopicConcepts(courseId, topicId).catch(() => undefined);
}

export function prefetchConceptsByTopicId(topicId: string) {
  if (!topicId || topicId === "all") return;
  if (peek(`concepts-by-topic:${topicId}`)) return;
  void loadConceptsByTopicId(topicId).catch(() => undefined);
}

export function invalidateCourseBrowseCache(courseId?: string) {
  if (!courseId) {
    store.clear();
    return;
  }
  for (const key of [...store.keys()]) {
    if (key.includes(courseId) || key.startsWith("concepts-by-topic:")) {
      store.delete(key);
    }
  }
}
