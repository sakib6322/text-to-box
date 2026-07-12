import { getSession } from "@/lib/auth";

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
  map[conceptId] = {
    conceptId,
    conceptName,
    studiedKeyPointIds: Array.from(ids),
    lastStudiedAt: new Date().toISOString(),
    totalKeyPoints,
  };
  writeJson(`${PREFIX}_${userKey()}_study`, map);
}

export function getPracticeSessions(): PracticeSession[] {
  return readJson(`${PREFIX}_${userKey()}_practice`, []);
}

export function savePracticeSession(session: PracticeSession) {
  const list = getPracticeSessions().filter((s) => s.id !== session.id);
  writeJson(`${PREFIX}_${userKey()}_practice`, [session, ...list].slice(0, 100));
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
