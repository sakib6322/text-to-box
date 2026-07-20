import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import type { ProgressScopeType, ProgressSetKind } from "@/lib/progressPlan";

export type SelfQaItem = {
  id: string;
  concept_id: string;
  question: string;
  answer: string;
  sort_order: number;
};

export type ProgressPracticeSet = {
  id: string;
  course_id: string;
  scope_type: ProgressScopeType;
  scope_id: string | null;
  set_kind: ProgressSetKind;
  title: string;
  question_ids: string[];
  pass_percent: number;
  sort_order: number;
  is_required: boolean;
  publish_at: string | null;
  attempt?: { passed: boolean; score: number; total: number; completed_at: string } | null;
};

export type CourseProgressRollup = {
  course_id: string;
  course_pct: number;
  course_complete: boolean;
  exam_night_visible: boolean;
  subjects: { subject_id: string; pct: number }[];
  systems: { system_id: string; pct: number; chapter_count: number }[];
  chapters: { chapter_id: string; pct: number; topic_count: number }[];
  topics: { topic_id: string; pct: number; concept_count: number; chapter_id: string | null; system_id: string | null; subject_id: string | null }[];
  concepts: { concept_id: string; topic_id: string; pct: number }[];
  final_mocks: { total: number; passed: number };
};

export type MistakeRow = {
  user_id: string;
  question_id: string;
  course_id: string | null;
  wrong_count: number;
  last_wrong_at: string;
  active: boolean;
};

export async function fetchSelfQa(conceptId: string) {
  const r = await fetch(apiUrl(`/api/concepts/${conceptId}/self-qa`));
  const j = (await r.json()) as { items?: SelfQaItem[]; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Failed to load self-QA");
  return j.items ?? [];
}

export async function fetchCourseProgress(courseId: string) {
  const r = await fetch(apiUrl(`/api/me/courses/${courseId}/progress`), { headers: getAuthHeaders() });
  const j = (await r.json()) as CourseProgressRollup & { error?: string };
  if (!r.ok) throw new Error(j.error ?? "Failed to load progress");
  return j;
}

export async function fetchProgressSets(
  courseId: string,
  params?: { scope_type?: string; scope_id?: string; set_kind?: string },
) {
  const qs = new URLSearchParams();
  if (params?.scope_type) qs.set("scope_type", params.scope_type);
  if (params?.scope_id) qs.set("scope_id", params.scope_id);
  if (params?.set_kind) qs.set("set_kind", params.set_kind);
  const r = await fetch(apiUrl(`/api/me/courses/${courseId}/progress-sets?${qs}`), { headers: getAuthHeaders() });
  const j = (await r.json()) as { sets?: ProgressPracticeSet[]; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Failed to load sets");
  return j.sets ?? [];
}

export async function submitProgressSet(
  setId: string,
  payload: { score: number; total: number; answers: unknown; wrong_question_ids: string[] },
) {
  const r = await fetch(apiUrl(`/api/me/progress-sets/${setId}/submit`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  const j = (await r.json()) as { passed?: boolean; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Submit failed");
  return j;
}

export async function fetchMistakes() {
  const r = await fetch(apiUrl("/api/user/mistakes"), { headers: getAuthHeaders() });
  const j = (await r.json()) as { mistakes?: MistakeRow[]; count?: number; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Failed to load mistakes");
  return j;
}

export async function clearAllMistakes() {
  const r = await fetch(apiUrl("/api/user/mistakes"), { method: "DELETE", headers: getAuthHeaders() });
  const j = (await r.json()) as { ok?: boolean; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Clear failed");
  return j;
}

export async function submitMistakeReview(results: { question_id: string; is_correct: boolean }[]) {
  const r = await fetch(apiUrl("/api/user/mistakes/review/submit"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ results }),
  });
  const j = (await r.json()) as { cleared?: number; remaining?: number; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Review submit failed");
  return j;
}

export async function adminFetchProgressSets(courseId: string) {
  const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/progress-sets`), { headers: getAuthHeaders() });
  const j = (await r.json()) as { sets?: ProgressPracticeSet[]; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Failed to load sets");
  return j.sets ?? [];
}

export async function adminSaveProgressSet(
  courseId: string,
  payload: Partial<ProgressPracticeSet> & { id?: string },
) {
  const isEdit = !!payload.id;
  const r = await fetch(
    apiUrl(isEdit ? `/api/admin/progress-sets/${payload.id}` : `/api/admin/courses/${courseId}/progress-sets`),
    {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(payload),
    },
  );
  const j = (await r.json()) as { set?: ProgressPracticeSet; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Save failed");
  return j.set!;
}

export async function adminDeleteProgressSet(setId: string) {
  const r = await fetch(apiUrl(`/api/admin/progress-sets/${setId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!r.ok) {
    const j = (await r.json()) as { error?: string };
    throw new Error(j.error ?? "Delete failed");
  }
}

export async function adminCreateSelfQa(conceptId: string, question: string, answer: string, sortOrder = 0) {
  const r = await fetch(apiUrl(`/api/admin/concepts/${conceptId}/self-qa`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ question, answer, sort_order: sortOrder }),
  });
  const j = (await r.json()) as { item?: SelfQaItem; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Create failed");
  return j.item!;
}

export async function adminUpdateSelfQa(id: string, patch: Partial<SelfQaItem>) {
  const r = await fetch(apiUrl(`/api/admin/self-qa/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(patch),
  });
  const j = (await r.json()) as { item?: SelfQaItem; error?: string };
  if (!r.ok) throw new Error(j.error ?? "Update failed");
  return j.item!;
}

export async function adminDeleteSelfQa(id: string) {
  const r = await fetch(apiUrl(`/api/admin/self-qa/${id}`), { method: "DELETE", headers: getAuthHeaders() });
  if (!r.ok) {
    const j = (await r.json()) as { error?: string };
    throw new Error(j.error ?? "Delete failed");
  }
}
