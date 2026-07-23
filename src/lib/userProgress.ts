import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, getSession } from "@/lib/auth";
import {
  conceptProgressPct,
  conceptStepRatios,
  currentConceptStep,
  type ConceptProgressInput,
  type ConceptStepRatios,
} from "@/lib/progressEngine";
import { CONCEPT_STEP_WEIGHT } from "@/lib/progressPlan";

export type { ConceptProgressInput, ConceptStepRatios };
export { conceptStepRatios, CONCEPT_STEP_WEIGHT };

const PREFIX = "pgdiary_progress";

function storageUserKey(): string {
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
  step1MaxSlideIndex?: number;
  step1SlideTotal?: number;
  resumeStep?: 1 | 2 | 3 | 4 | null;
  resumeKeyPointId?: string | null;
  resumeSelfQaId?: string | null;
  resumePracticeSetId?: string | null;
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

function numOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function rowToStudyProgress(r: Record<string, unknown>): StudyProgress {
  const resumeStepRaw = r.resume_step ?? r.resumeStep;
  const resumeStepNum = resumeStepRaw == null || resumeStepRaw === "" ? null : Number(resumeStepRaw);
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
    step1MaxSlideIndex: numOr(r.step1_max_slide_index ?? r.step1MaxSlideIndex, 0),
    step1SlideTotal: numOr(r.step1_slide_total ?? r.step1SlideTotal, 0),
    resumeStep:
      resumeStepNum === 1 || resumeStepNum === 2 || resumeStepNum === 3 || resumeStepNum === 4
        ? resumeStepNum
        : null,
    resumeKeyPointId: (r.resume_key_point_id ?? r.resumeKeyPointId ?? null) as string | null,
    resumeSelfQaId: (r.resume_self_qa_id ?? r.resumeSelfQaId ?? null) as string | null,
    resumePracticeSetId: (r.resume_practice_set_id ?? r.resumePracticeSetId ?? null) as string | null,
  };
}

function studyPayload(entry: StudyProgress) {
  return {
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
    step1_max_slide_index: entry.step1MaxSlideIndex ?? 0,
    step1_slide_total: entry.step1SlideTotal ?? 0,
    resume_step: entry.resumeStep ?? null,
    resume_key_point_id: entry.resumeKeyPointId ?? null,
    resume_self_qa_id: entry.resumeSelfQaId ?? null,
    resume_practice_set_id: entry.resumePracticeSetId ?? null,
  };
}

function preserveExtras(
  existing: StudyProgress | null | undefined,
  patch: Partial<StudyProgress>,
): Pick<
  StudyProgress,
  | "step1MaxSlideIndex"
  | "step1SlideTotal"
  | "resumeStep"
  | "resumeKeyPointId"
  | "resumeSelfQaId"
  | "resumePracticeSetId"
> {
  return {
    step1MaxSlideIndex: patch.step1MaxSlideIndex ?? existing?.step1MaxSlideIndex ?? 0,
    step1SlideTotal: patch.step1SlideTotal ?? existing?.step1SlideTotal ?? 0,
    resumeStep: patch.resumeStep !== undefined ? patch.resumeStep : existing?.resumeStep ?? null,
    resumeKeyPointId:
      patch.resumeKeyPointId !== undefined ? patch.resumeKeyPointId : existing?.resumeKeyPointId ?? null,
    resumeSelfQaId:
      patch.resumeSelfQaId !== undefined ? patch.resumeSelfQaId : existing?.resumeSelfQaId ?? null,
    resumePracticeSetId:
      patch.resumePracticeSetId !== undefined
        ? patch.resumePracticeSetId
        : existing?.resumePracticeSetId ?? null,
  };
}

async function syncStudyToServer(entry: StudyProgress) {
  try {
    await fetch(apiUrl("/api/user/progress/study"), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(studyPayload(entry)),
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
        writeJson(`${PREFIX}_${storageUserKey()}_study`, map);
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
        writeJson(`${PREFIX}_${storageUserKey()}_practice`, sessions);
      }
    } catch {
      /* use cache */
    }
  })();
  return hydratePromise;
}

export function getStudyProgressMap(): Record<string, StudyProgress> {
  return readJson(`${PREFIX}_${storageUserKey()}_study`, {});
}

export function getStudyProgress(conceptId: string): StudyProgress | null {
  return getStudyProgressMap()[conceptId] ?? null;
}

function saveStudyEntry(entry: StudyProgress) {
  const map = getStudyProgressMap();
  map[entry.conceptId] = entry;
  writeJson(`${PREFIX}_${storageUserKey()}_study`, map);
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
    ...preserveExtras(existing, {
      resumeStep: 2,
      resumeKeyPointId: keyPointId,
    }),
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
    step1MaxSlideIndex?: number;
    step1SlideTotal?: number;
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
    step1CompletedAt: existing?.step1CompletedAt,
    step2CompletedAt: existing?.step2CompletedAt,
    step3CompletedAt: existing?.step3CompletedAt,
    step4CompletedAt: existing?.step4CompletedAt,
    ...preserveExtras(existing, {
      step1MaxSlideIndex: extra?.step1MaxSlideIndex,
      step1SlideTotal: extra?.step1SlideTotal,
      resumeStep: Math.min(4, (step + 1) as 1 | 2 | 3 | 4) as 1 | 2 | 3 | 4,
    }),
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
        step1_max_slide_index: entry.step1MaxSlideIndex ?? 0,
        step1_slide_total: entry.step1SlideTotal ?? 0,
      }),
    });
  } catch {
    /* offline */
  }
}

/** Persist Step 1 heading-slide progress (partial credit toward 25%). */
export function saveStep1SlideProgress(
  conceptId: string,
  conceptName: string,
  slideIndex: number,
  slideTotal: number,
  opts?: { markComplete?: boolean; totalKeyPoints?: number },
) {
  const existing = getStudyProgress(conceptId);
  const now = new Date().toISOString();
  const maxIdx = Math.max(existing?.step1MaxSlideIndex ?? 0, Math.max(0, slideIndex));
  const total = Math.max(0, slideTotal);
  const reachedEnd = total > 0 && maxIdx >= total - 1;
  const markComplete = Boolean(opts?.markComplete || reachedEnd);
  saveStudyEntry({
    conceptId,
    conceptName,
    studiedKeyPointIds: existing?.studiedKeyPointIds ?? [],
    selfQaSeenIds: existing?.selfQaSeenIds ?? [],
    lastStudiedAt: now,
    totalKeyPoints: opts?.totalKeyPoints ?? existing?.totalKeyPoints ?? 0,
    step1CompletedAt: markComplete ? existing?.step1CompletedAt ?? now : existing?.step1CompletedAt,
    step2CompletedAt: existing?.step2CompletedAt,
    step3CompletedAt: existing?.step3CompletedAt,
    step4CompletedAt: existing?.step4CompletedAt,
    ...preserveExtras(existing, {
      step1MaxSlideIndex: maxIdx,
      step1SlideTotal: total,
      resumeStep: 1,
    }),
  });
}

export function saveResumeCursor(
  conceptId: string,
  conceptName: string,
  patch: {
    resumeStep?: 1 | 2 | 3 | 4;
    resumeKeyPointId?: string | null;
    resumeSelfQaId?: string | null;
    resumePracticeSetId?: string | null;
  },
) {
  const existing = getStudyProgress(conceptId);
  if (!existing && !conceptId) return;
  const now = new Date().toISOString();
  saveStudyEntry({
    conceptId,
    conceptName: conceptName || existing?.conceptName || "",
    studiedKeyPointIds: existing?.studiedKeyPointIds ?? [],
    selfQaSeenIds: existing?.selfQaSeenIds ?? [],
    lastStudiedAt: now,
    totalKeyPoints: existing?.totalKeyPoints ?? 0,
    step1CompletedAt: existing?.step1CompletedAt,
    step2CompletedAt: existing?.step2CompletedAt,
    step3CompletedAt: existing?.step3CompletedAt,
    step4CompletedAt: existing?.step4CompletedAt,
    ...preserveExtras(existing, patch),
  });
}

/** Content complete for step 2 (does not require step 1 — unlock-safe). */
export function isStep2Complete(progress: StudyProgress | null, totalKeyPoints: number): boolean {
  if (progress?.step2CompletedAt) return true;
  if (totalKeyPoints <= 0) return true;
  return (progress?.studiedKeyPointIds?.length ?? 0) >= totalKeyPoints;
}

export function isStep3Complete(progress: StudyProgress | null, totalSelfQa: number): boolean {
  if (progress?.step3CompletedAt) return true;
  if (totalSelfQa <= 0) return true;
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
    ...preserveExtras(existing, {
      resumeStep: 3,
      resumeSelfQaId: qaId,
    }),
  };
  saveStudyEntry(entry);
}

export function getPracticeSessions(): PracticeSession[] {
  return readJson(`${PREFIX}_${storageUserKey()}_practice`, []);
}

export function savePracticeSession(session: PracticeSession) {
  const list = getPracticeSessions().filter((s) => s.id !== session.id);
  writeJson(`${PREFIX}_${storageUserKey()}_practice`, [session, ...list].slice(0, 100));
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
  opts?: { totalKeyPoints?: number },
): ConceptProgressInput {
  const studied = p?.studiedKeyPointIds ?? [];
  const totalKp = opts?.totalKeyPoints ?? p?.totalKeyPoints ?? 0;
  const step1Done = !!p?.step1CompletedAt;
  const step2Done = !!p?.step2CompletedAt || (totalKp > 0 ? studied.length >= totalKp : true);
  const seenQa = p?.selfQaSeenIds ?? [];
  const step3Done = !!p?.step3CompletedAt || (totalSelfQa > 0 ? seenQa.length >= totalSelfQa : true);
  return {
    step1Completed: step1Done,
    step1MaxSlideIndex: p?.step1MaxSlideIndex ?? 0,
    step1SlideTotal: p?.step1SlideTotal ?? 0,
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
  opts?: { totalKeyPoints?: number },
): number {
  return conceptProgressPct(studyProgressInput(p, totalSelfQa, totalConceptSets, passedConceptSetIds, opts));
}

export function studyStepRatios(
  p: StudyProgress | null,
  totalSelfQa = 0,
  totalConceptSets = 0,
  passedConceptSetIds: string[] = [],
  opts?: { totalKeyPoints?: number },
): ConceptStepRatios {
  return conceptStepRatios(studyProgressInput(p, totalSelfQa, totalConceptSets, passedConceptSetIds, opts));
}

export function getCurrentConceptStep(
  p: StudyProgress | null,
  totalSelfQa = 0,
  totalConceptSets = 0,
  passedConceptSetIds: string[] = [],
  opts?: { totalKeyPoints?: number },
): 1 | 2 | 3 | 4 {
  const input = studyProgressInput(p, totalSelfQa, totalConceptSets, passedConceptSetIds, opts);
  const derived = currentConceptStep(input);
  if (p?.resumeStep === 1 || p?.resumeStep === 2 || p?.resumeStep === 3 || p?.resumeStep === 4) {
    const ratios = conceptStepRatios(input);
    const local = [ratios.r1, ratios.r2, ratios.r3, ratios.r4][p.resumeStep - 1] ?? 1;
    if (local < 1) return p.resumeStep;
  }
  return derived;
}
