import type { PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { countPracticeAnswerUnits } from "@/components/PracticeQuestionBlock";
import type { PracticeAnswer } from "@/lib/userProgress";

export type QuestionFillStatus = "empty" | "partial" | "full";

/** Per-statement / per-SBA outcome for jump-box dots. */
export type UnitDot = "correct" | "wrong" | "skip";

export type QuestionUnitDetail = {
  mode: "mcq" | "sba";
  status: QuestionFillStatus;
  units: UnitDot[];
  correct: number;
  wrong: number;
  skip: number;
  total: number;
  /** % of units that are correct (of total units). */
  pctCorrect: number;
  /** % touched (correct+wrong) of total. */
  pctTouched: number;
};

export type PracticeRunSummary = {
  full: number;
  partial: number;
  empty: number;
  correct: number;
  attempted: number;
  totalUnits: number;
  statuses: QuestionFillStatus[];
  details: QuestionUnitDetail[];
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

export function getQuestionUnitDetail(
  q: PracticeQuestionFull,
  answers: PracticeAnswer[],
): QuestionUnitDetail {
  const mode: "mcq" | "sba" = q.questionMode === "sba" ? "sba" : "mcq";
  const units: UnitDot[] = [];

  if (mode === "sba") {
    const hit = answers.find((a) => a.questionId === q.id);
    if (!hit) units.push("skip");
    else units.push(hit.isCorrect ? "correct" : "wrong");
  } else {
    const stmts = q.mcq?.trueFalse ?? [];
    for (let i = 0; i < stmts.length; i++) {
      const sid = stmts[i]?.id ?? String(i);
      const hit = answers.find((a) => a.questionId === `${q.id}:${sid}`);
      if (!hit) units.push("skip");
      else units.push(hit.isCorrect ? "correct" : "wrong");
    }
    if (!units.length && q.mcq?.stem?.trim()) units.push("skip");
  }

  const correct = units.filter((u) => u === "correct").length;
  const wrong = units.filter((u) => u === "wrong").length;
  const skip = units.filter((u) => u === "skip").length;
  const total = units.length || 1;
  const touched = correct + wrong;

  let status: QuestionFillStatus = "empty";
  if (touched <= 0) status = "empty";
  else if (skip <= 0) status = "full";
  else status = "partial";

  return {
    mode,
    status,
    units,
    correct,
    wrong,
    skip,
    total,
    pctCorrect: Math.round((correct / total) * 100),
    pctTouched: Math.round((touched / total) * 100),
  };
}

export function getQuestionFillStatus(
  q: PracticeQuestionFull,
  answers: PracticeAnswer[],
): QuestionFillStatus {
  return getQuestionUnitDetail(q, answers).status;
}

export function summarizePracticeRun(
  questions: PracticeQuestionFull[],
  answers: PracticeAnswer[],
): PracticeRunSummary {
  const details = questions.map((q) => getQuestionUnitDetail(q, answers));
  const statuses = details.map((d) => d.status);
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
  return { full, partial, empty, correct, attempted, totalUnits, statuses, details };
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
