import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, getSession } from "@/lib/auth";

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
  lastStudiedAt: string;
  totalKeyPoints: number;
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
      }),
    });
  } catch {
    /* offline — local cache remains */
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

/** Load progress from database into localStorage cache (once per session). */
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
        const data = (await studyRes.json()) as {
          rows?: {
            concept_id: string;
            concept_name: string;
            studied_key_point_ids: string[];
            total_key_points: number;
            last_studied_at: string;
          }[];
        };
        const map: Record<string, StudyProgress> = {};
        for (const r of data.rows ?? []) {
          map[r.concept_id] = {
            conceptId: r.concept_id,
            conceptName: r.concept_name,
            studiedKeyPointIds: r.studied_key_point_ids ?? [],
            totalKeyPoints: r.total_key_points ?? 0,
            lastStudiedAt: r.last_studied_at,
          };
        }
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
      /* use local cache */
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

export function markKeyPointStudied(
  conceptId: string,
  conceptName: string,
  keyPointId: string,
  totalKeyPoints: number,
) {
  const map = getStudyProgressMap();
  const existing = map[conceptId];
  const ids = new Set(existing?.studiedKeyPointIds ?? []);
  ids.add(keyPointId);
  const entry: StudyProgress = {
    conceptId,
    conceptName,
    studiedKeyPointIds: Array.from(ids),
    lastStudiedAt: new Date().toISOString(),
    totalKeyPoints,
  };
  map[conceptId] = entry;
  writeJson(`${PREFIX}_${userKey()}_study`, map);
  void syncStudyToServer(entry);
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

export function studyCompletionPct(p: StudyProgress | null): number {
  if (!p || !p.totalKeyPoints) return 0;
  return Math.round((p.studiedKeyPointIds.length / p.totalKeyPoints) * 100);
}
