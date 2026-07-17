import { apiFetch, apiUrl } from "@/lib/apiBase";

export type ExamPerformance = {
  mcq: { correct: number; wrong: number; notTouched: number; positiveMarks: number; negativeMarks: number };
  sba: { correct: number; wrong: number; notTouched: number; positiveMarks: number; negativeMarks: number };
  scoreWithoutNegative: number;
  scoreWithNegative: number;
};

export type AnswerDistribution = Record<
  string,
  { mode: string; options: Record<string, { true?: number; false?: number; notTouched?: number; count?: number }> }
>;

export type ExamQuestion = {
  id: string;
  sourcePointId?: string | null;
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
  marks?: number;
  examMarks?: number;
  position?: number;
  mcq?: { stem?: string; trueFalse?: { id?: string; statement: string; correct: "true" | "false"; explanation?: string }[] } | null;
  sba?: { stem?: string; options?: string[]; correctIndex?: number; optionExplanations?: string[] } | null;
  studentAnswer?: unknown;
  isCorrect?: boolean;
  marksEarned?: number;
  gradingDetail?: unknown;
  showSolutions?: boolean;
};

export type ExamSummary = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  status: string;
  questionCount?: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  liveStatus?: string;
  canStart?: boolean;
  attempt?: {
    id: string;
    status: string;
    score: number;
    totalMarks: number;
    startedAt: string;
    submittedAt: string | null;
    endsAt: string;
  } | null;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  userEmail?: string;
  startedAt: string;
  endsAt: string;
  submittedAt?: string | null;
  score: number;
  totalMarks: number;
  status: string;
  performance?: ExamPerformance | null;
  position?: number | null;
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as T;
}

export async function fetchExams(): Promise<ExamSummary[]> {
  const res = await fetch(apiUrl("/api/exams"));
  const data = await parseJson<{ exams: ExamSummary[] }>(res);
  return data.exams ?? [];
}

export async function fetchExam(id: string): Promise<{ exam: ExamSummary; questions: ExamQuestion[] }> {
  const res = await fetch(apiUrl(`/api/exams/${id}`));
  return parseJson(res);
}

export async function createExam(payload: {
  title: string;
  description?: string;
  durationMinutes: number;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  questionIds: string[];
  createdBy?: string;
}): Promise<{ exam: ExamSummary; questions: ExamQuestion[] }> {
  const res = await apiFetch("/api/exams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function updateExam(
  id: string,
  payload: Partial<{
    title: string;
    description: string;
    durationMinutes: number;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    questionIds: string[];
    status: string;
  }>,
): Promise<{ exam: ExamSummary; questions: ExamQuestion[] }> {
  const res = await apiFetch(`/api/exams/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function deleteExam(id: string): Promise<void> {
  const res = await apiFetch(`/api/exams/${id}`, { method: "DELETE" });
  await parseJson(res);
}

export async function fetchMyExams(email: string): Promise<ExamSummary[]> {
  const res = await fetch(apiUrl(`/api/my-exams?email=${encodeURIComponent(email)}`));
  const data = await parseJson<{ exams: ExamSummary[] }>(res);
  return data.exams ?? [];
}

export async function startExam(
  examId: string,
  email: string,
): Promise<{ attempt: ExamAttempt; exam: ExamSummary; questions: ExamQuestion[] }> {
  const res = await fetch(apiUrl(`/api/exams/${examId}/start`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseJson(res);
}

export async function submitExam(
  examId: string,
  attemptId: string,
  answers: { questionId: string; answer: unknown }[],
): Promise<{ score: number; totalMarks: number; status: string; attemptId: string }> {
  const res = await fetch(apiUrl(`/api/exams/${examId}/submit`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attemptId, answers }),
  });
  return parseJson(res);
}

export async function fetchAttemptResult(attemptId: string): Promise<{
  attempt: ExamAttempt;
  exam: ExamSummary | null;
  questions: ExamQuestion[];
  answerDistribution?: AnswerDistribution | null;
}> {
  const res = await fetch(apiUrl(`/api/exam-attempts/${attemptId}?include=answers`));
  return parseJson(res);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m} min`;
}

export function formatScheduleRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Not scheduled";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}
