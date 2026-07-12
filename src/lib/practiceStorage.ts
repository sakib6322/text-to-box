const STUDY_KEY = "pgdiary_study_progress";
const PRACTICE_KEY = "pgdiary_practice_sessions";

export type StudyProgress = {
  conceptIds: string[];
  currentIndex: number;
  lastStudiedAt: string;
};

export type PracticeSession = {
  id: string;
  conceptId: string;
  conceptTitle: string;
  questionIds: string[];
  createdAt: string;
  completedAt?: string | null;
};

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

export function getStudyProgress(): StudyProgress | null {
  return readJson<StudyProgress | null>(STUDY_KEY, null);
}

export function saveStudyProgress(progress: StudyProgress) {
  writeJson(STUDY_KEY, progress);
}

export function listPracticeSessions(conceptId?: string): PracticeSession[] {
  const all = readJson<PracticeSession[]>(PRACTICE_KEY, []);
  if (!conceptId) return all;
  return all.filter((s) => s.conceptId === conceptId);
}

export function savePracticeSession(session: PracticeSession) {
  const all = listPracticeSessions();
  writeJson(PRACTICE_KEY, [session, ...all.filter((s) => s.id !== session.id)].slice(0, 50));
}

export function markPracticeComplete(sessionId: string) {
  const all = listPracticeSessions();
  writeJson(
    PRACTICE_KEY,
    all.map((s) => (s.id === sessionId ? { ...s, completedAt: new Date().toISOString() } : s)),
  );
}
