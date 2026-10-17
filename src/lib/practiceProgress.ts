import type { PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { countPracticeAnswerUnits } from "@/components/PracticeQuestionBlock";
import type { PracticeAnswer } from "@/lib/userProgress";

export type QuestionFillStatus = "empty" | "partial" | "full";

export type PracticeRunSummary = {
  full: number;
  partial: number;
  empty: number;
  correct: number;
  attempted: number;
  totalUnits: number;
  statuses: QuestionFillStatus[];
};

export function answeredUnitsForQuestion(q: PracticeQuestionFull, answers: PracticeAnswer[]): number {
  if (q.questionMode === "sba") {
    return answers.some((a) => a.questionId === q.id) ? 1 : 0;
  }
  const stmts = q.mcq?.trueFalse ?? [];
  let n = 0;
  for (let i = 0; i < stmts.length; i++) {
    const sid = stmts[i]?.id ?? String(i);
    if (answers.some((a) => a.questionId === `${q.id}:${sid}`)) n += 1;
  }
  return n;
}

export function getQuestionFillStatus(
  q: PracticeQuestionFull,
  answers: PracticeAnswer[],
): QuestionFillStatus {
  const total = countPracticeAnswerUnits(q);
  if (total <= 0) return "empty";
  const got = answeredUnitsForQuestion(q, answers);
  if (got <= 0) return "empty";
  if (got >= total) return "full";
  return "partial";
}

export function summarizePracticeRun(
  questions: PracticeQuestionFull[],
  answers: PracticeAnswer[],
): PracticeRunSummary {
  const statuses = questions.map((q) => getQuestionFillStatus(q, answers));
  let full = 0;
  let partial = 0;
  let empty = 0;
  for (const s of statuses) {
    if (s === "full") full += 1;
    else if (s === "partial") partial += 1;
    else empty += 1;
  }
  const correct = answers.filter((a) => a.isCorrect).length;
  const attempted = answers.length;
  const totalUnits = questions.reduce((sum, q) => sum + countPracticeAnswerUnits(q), 0);
  return { full, partial, empty, correct, attempted, totalUnits, statuses };
}

export function restoreRevealState(saved: PracticeAnswer[]): {
  locked: Record<string, boolean>;
  revealed: Record<string, { given: unknown; correct: boolean }>;
} {
  const locked: Record<string, boolean> = {};
  const revealed: Record<string, { given: unknown; correct: boolean }> = {};
  for (const a of saved) {
    locked[a.questionId] = true;
    const ans = a.answer as { value?: unknown; selectedIndex?: number };
    revealed[a.questionId] = {
      given: ans.value ?? ans.selectedIndex,
      correct: a.isCorrect,
    };
  }
  return { locked, revealed };
}
