import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, getSession } from "@/lib/auth";
import {
  conceptProgressPct,
  currentConceptStep,
  type ConceptProgressInput,
} from "@/lib/progressEngine";

const PREFIX = "pgdiary_progress";

function userKey(): string {
  return getSession()?.userId ?? getSession()?.email ?? "guest";
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type StudyProgress = {
  conceptId: string;
  conceptName: string;
  studiedKeyPointIds: string[];
  selfQaSeenIds: string[];
  lastStudiedAt: string;
  totalKeyPoints: number;
  step1CompletedAt?: string | null;
  step2CompletedAt?: string | null;
  step3CompletedAt?: string | null;
  step4CompletedAt?: string | null;
};

export type PracticeAnswer = {
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  answeredAt: string;
};

export type PracticeSession = {
  id: string;
  conceptId: string;
  conceptName: string;
  title: string;
  questionIds: string[];
  createdAt: string;
  completedAt?: string;
  score?: number;
  total?: number;
  answers?: PracticeAnswer[];
};

let hydratePromise: Promise<void> | null = null;

function rowToStudyProgress(r: Record<string, unknown>): StudyProgress {
  return {
    conceptId: String(r.concept_id ?? r.conceptId ?? ""),
    conceptName: String(r.concept_name ?? r.conceptName ?? ""),
    studiedKeyPointIds: (r.studied_key_point_ids ?? r.studiedKeyPointIds ?? []) as string[],
    selfQaSeenIds: (r.self_qa_seen_ids ?? r.selfQaSeenIds ?? []) as string[],
    totalKeyPoints: Number(r.total_key_points ?? r.totalKeyPoints ?? 0),
    lastStudiedAt: String(r.last_studied_at ?? r.lastStudiedAt ?? new Date().toISOString()),
    step1CompletedAt: (r.step1_completed_at ?? r.step1CompletedAt) as string | null | undefined,
    step2CompletedAt: (r.step2_completed_at ?? r.step2CompletedAt) as string | null | undefined,
    step3CompletedAt: (r.step3_completed_at ?? r.step3CompletedAt) as string | null | undefined,
    step4CompletedAt: (r.step4_completed_at ?? r.step4CompletedAt) as string | null | undefined,
  };
}

async function syncStudyToServer(entry: StudyProgress) {
  try {
    await fetch(apiUrl("/api/user/progress/study"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        concept_id: entry.conceptId,
        concept_name: entry.conceptName,
        studied_key_point_ids: entry.studiedKeyPointIds,
        total_key_points: entry.totalKeyPoints,
        last_studied_at: entry.lastStudiedAt,
        self_qa_seen_ids: entry.selfQaSeenIds,
        step1_completed_at: entry.step1CompletedAt ?? null,
        step2_completed_at: entry.step2CompletedAt ?? null,
        step3_completed_at: entry.step3CompletedAt ?? null,
        step4_completed_at: entry.step4CompletedAt ?? null,
      }),
    });
  } catch {
    /* offline */
  }
}

async function syncPracticeToServer(session: PracticeSession) {
  try {
    await fetch(apiUrl("/api/user/progress/practice"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        id: session.id,
        concept_id: session.conceptId,
        concept_name: session.conceptName,
        title: session.title,
        question_ids: session.questionIds,
        answers: session.answers ?? null,
        score: session.score ?? null,
        total: session.total ?? null,
        created_at: session.createdAt,
        completed_at: session.completedAt ?? null,
      }),
    });
  } catch {
    /* offline */
  }
}

export async function hydrateProgressFromServer(): Promise<void> {
  if (!getSession()?.token) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const [studyRes, practiceRes] = await Promise.all([
        fetch(apiUrl("/api/user/progress/study"), { headers: getAuthHeaders() }),
        fetch(apiUrl("/api/user/progress/practice"), { headers: getAuthHeaders() }),
      ]);
      if (studyRes.ok) {
        const data = (await studyRes.json()) as { rows?: Record<string, unknown>[] };
        const map: Record<string, StudyProgress> = {};
        for (const r of data.rows ?? []) map[String(r.concept_id)] = rowToStudyProgress(r);
        writeJson(`${PREFIX}_${userKey()}_study`, map);
      }
      if (practiceRes.ok) {
        const data = (await practiceRes.json()) as {
          rows?: {
            id: string;
            concept_id: string;
            concept_name: string;
            title: string;
            question_ids: string[];
            answers?: PracticeAnswer[];
            score?: number;
            total?: number;
            created_at: string;
            completed_at?: string;
          }[];
        };
        const sessions: PracticeSession[] = (data.rows ?? []).map((r) => ({
          id: r.id,
          conceptId: r.concept_id,
          conceptName: r.concept_name,
          title: r.title,
          questionIds: r.question_ids ?? [],
          answers: r.answers,
          score: r.score,
          total: r.total,
          createdAt: r.created_at,
          completedAt: r.completed_at,
        }));
        writeJson(`${PREFIX}_${userKey()}_practice`, sessions);
      }
    } catch {
      /* use cache */
    }
  })();
  return hydratePromise;
}

export function getStudyProgressMap(): Record<string, StudyProgress> {
  return readJson(`${PREFIX}_${userKey()}_study`, {});
}

export function getStudyProgress(conceptId: string): StudyProgress | null {
  return getStudyProgressMap()[conceptId] ?? null;
}

function saveStudyEntry(entry: StudyProgress) {
  const map = getStudyProgressMap();
  map[entry.conceptId] = entry;
  writeJson(`${PREFIX}_${userKey()}_study`, map);
  void syncStudyToServer(entry);
}

export function markKeyPointStudied(
  conceptId: string,
  conceptName: string,
  keyPointId: string,
  totalKeyPoints: number,
) {
  const existing = getStudyProgress(conceptId);
  const ids = new Set(existing?.studiedKeyPointIds ?? []);
  ids.add(keyPointId);
  const studied = Array.from(ids);
  const now = new Date().toISOString();
  const step2Done = totalKeyPoints > 0 && studied.length >= totalKeyPoints;
  saveStudyEntry({
    conceptId,
    conceptName,
    studiedKeyPointIds: studied,
    selfQaSeenIds: existing?.selfQaSeenIds ?? [],
    lastStudiedAt: now,
    totalKeyPoints,
    step1CompletedAt: existing?.step1CompletedAt,
    step2CompletedAt: step2Done ? existing?.step2CompletedAt ?? now : existing?.step2CompletedAt,
    step3CompletedAt: existing?.step3CompletedAt,
    step4CompletedAt: existing?.step4CompletedAt,
  });
}

export async function markConceptStep(
  conceptId: string,
  conceptName: string,
  step: 1 | 2 | 3 | 4,
  extra?: {
    totalKeyPoints?: number;
    studiedKeyPointIds?: string[];
    selfQaSeenIds?: string[];
  },
) {
  const existing = getStudyProgress(conceptId);
  const now = new Date().toISOString();
  const entry: StudyProgress = {
    conceptId,
    conceptName,
    studiedKeyPointIds: extra?.studiedKeyPointIds ?? existing?.studiedKeyPointIds ?? [],
    selfQaSeenIds: extra?.selfQaSeenIds ?? existing?.selfQaSeenIds ?? [],
    totalKeyPoints: extra?.totalKeyPoints ?? existing?.totalKeyPoints ?? 0,
    lastStudiedAt: now,
    step1CompletedAt: step >= 1 ? existing?.step1CompletedAt ?? now : existing?.step1CompletedAt,
    step2CompletedAt: step >= 2 ? existing?.step2CompletedAt ?? now : existing?.step2CompletedAt,
    step3CompletedAt: step >= 3 ? existing?.step3CompletedAt ?? now : existing?.step3CompletedAt,
    step4CompletedAt: step >= 4 ? existing?.step4CompletedAt ?? now : existing?.step4CompletedAt,
  };
  if (step === 1) entry.step1CompletedAt = now;
  if (step === 2) entry.step2CompletedAt = now;
  if (step === 3) entry.step3CompletedAt = now;
  if (step === 4) entry.step4CompletedAt = now;
  saveStudyEntry(entry);
  try {
    await fetch(apiUrl(`/api/user/progress/concept/${conceptId}/step`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        step,
        concept_name: conceptName,
        total_key_points: entry.totalKeyPoints,
        studied_key_point_ids: entry.studiedKeyPointIds,
        self_qa_seen_ids: entry.selfQaSeenIds,
      }),
    });
  } catch {
    /* offline */
  }
}

export function isStep2Complete(progress: StudyProgress | null, totalKeyPoints: number): boolean {
  if (!progress?.step1CompletedAt) return false;
  if (progress.step2CompletedAt) return true;
  if (totalKeyPoints <= 0) return true;
  return (progress.studiedKeyPointIds?.length ?? 0) >= totalKeyPoints;
}

export function isStep3Complete(progress: StudyProgress | null, totalSelfQa: number): boolean {
  if (progress?.step3CompletedAt) return true;
  if (totalSelfQa <= 0) return isStep2Complete(progress, progress?.totalKeyPoints ?? 0);
  return (progress?.selfQaSeenIds?.length ?? 0) >= totalSelfQa;
}

export function markSelfQaSeen(
  conceptId: string,
  conceptName: string,
  qaId: string,
  totalSelfQa: number,
) {
  const existing = getStudyProgress(conceptId);
  const ids = new Set(existing?.selfQaSeenIds ?? []);
  ids.add(qaId);
  const seen = Array.from(ids);
  const now = new Date().toISOString();
  const step3Done = totalSelfQa > 0 && seen.length >= totalSelfQa;
  const entry: StudyProgress = {
    conceptId,
    conceptName,
    studiedKeyPointIds: existing?.studiedKeyPointIds ?? [],
    selfQaSeenIds: seen,
    lastStudiedAt: now,
    totalKeyPoints: existing?.totalKeyPoints ?? 0,
    step1CompletedAt: existing?.step1CompletedAt,
    step2CompletedAt: existing?.step2CompletedAt,
    step3CompletedAt: step3Done ? existing?.step3CompletedAt ?? now : existing?.step3CompletedAt,
    step4CompletedAt: existing?.step4CompletedAt,
  };
  saveStudyEntry(entry);
  void syncSelfQaProgress(entry);
}

async function syncSelfQaProgress(entry: StudyProgress) {
  try {
    await fetch(apiUrl("/api/user/progress/study"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        concept_id: entry.conceptId,
        concept_name: entry.conceptName,
        studied_key_point_ids: entry.studiedKeyPointIds,
        total_key_points: entry.totalKeyPoints,
        last_studied_at: entry.lastStudiedAt,
        self_qa_seen_ids: entry.selfQaSeenIds,
        step1_completed_at: entry.step1CompletedAt ?? null,
        step2_completed_at: entry.step2CompletedAt ?? null,
        step3_completed_at: entry.step3CompletedAt ?? null,
        step4_completed_at: entry.step4CompletedAt ?? null,
      }),
    });
  } catch {
    /* offline */
  }
}

export function getPracticeSessions(): PracticeSession[] {
  return readJson(`${PREFIX}_${userKey()}_practice`, []);
}

export function savePracticeSession(session: PracticeSession) {
  const list = getPracticeSessions().filter((s) => s.id !== session.id);
  writeJson(`${PREFIX}_${userKey()}_practice`, [session, ...list].slice(0, 100));
  void syncPracticeToServer(session);
}

export function getPracticeSession(id: string): PracticeSession | null {
  return getPracticeSessions().find((s) => s.id === id) ?? null;
}

export function getPracticeSessionsForConcept(conceptId: string): PracticeSession[] {
  return getPracticeSessions().filter((s) => s.conceptId === conceptId);
}

export function studyProgressInput(
  p: StudyProgress | null,
  totalSelfQa: number,
  totalConceptSets: number,
  passedConceptSetIds: string[],
): ConceptProgressInput {
  const studied = p?.studiedKeyPointIds ?? [];
  const totalKp = p?.totalKeyPoints ?? 0;
  const step1Done = !!p?.step1CompletedAt;
  const step2Done =
    !!p?.step2CompletedAt || (totalKp > 0 ? studied.length >= totalKp : step1Done);
  const seenQa = p?.selfQaSeenIds ?? [];
  const step3Done =
    !!p?.step3CompletedAt || (totalSelfQa > 0 ? seenQa.length >= totalSelfQa : step2Done);
  return {
    step1Completed: step1Done,
    studiedKeyPointIds: studied,
    totalKeyPoints: totalKp,
    step2Completed: step2Done,
    selfQaSeenIds: seenQa,
    totalSelfQa,
    step3Completed: step3Done,
    passedConceptSetIds,
    totalConceptSets,
    step4Completed: !!p?.step4CompletedAt,
  };
}

export function studyCompletionPct(
  p: StudyProgress | null,
  totalSelfQa = 0,
  totalConceptSets = 0,
  passedConceptSetIds: string[] = [],
): number {
  return conceptProgressPct(studyProgressInput(p, totalSelfQa, totalConceptSets, passedConceptSetIds));
}

export function getCurrentConceptStep(
  p: StudyProgress | null,
  totalSelfQa = 0,
  totalConceptSets = 0,
  passedConceptSetIds: string[] = [],
): 1 | 2 | 3 | 4 {
  return currentConceptStep(studyProgressInput(p, totalSelfQa, totalConceptSets, passedConceptSetIds));
}
