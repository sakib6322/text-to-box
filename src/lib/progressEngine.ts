import { CONCEPT_STEP_WEIGHT } from "@/lib/progressPlan";

export type ConceptProgressInput = {
  step1Completed: boolean;
  studiedKeyPointIds: string[];
  totalKeyPoints: number;
  step2Completed: boolean;
  selfQaSeenIds: string[];
  totalSelfQa: number;
  step3Completed: boolean;
  passedConceptSetIds: string[];
  totalConceptSets: number;
  step4Completed: boolean;
};

export function averagePct(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function halfRollup(contentPct: number, completedSets: number, totalSets: number): number {
  const contentHalf = contentPct * 0.5;
  const examHalf = totalSets > 0 ? (completedSets / totalSets) * 50 : 0;
  return Math.round(contentHalf + examHalf);
}

/** Concept progress 0–100 based on 4 steps (25% each). */
export function conceptProgressPct(input: ConceptProgressInput): number {
  let pct = 0;
  if (input.step1Completed) pct += CONCEPT_STEP_WEIGHT;
  else return pct;

  if (input.totalKeyPoints > 0) {
    const kpRatio = Math.min(1, input.studiedKeyPointIds.length / input.totalKeyPoints);
    pct += kpRatio * CONCEPT_STEP_WEIGHT;
  } else if (input.step2Completed) {
    pct += CONCEPT_STEP_WEIGHT;
  }
  if (!input.step2Completed && input.totalKeyPoints > 0 && input.studiedKeyPointIds.length >= input.totalKeyPoints) {
    pct = CONCEPT_STEP_WEIGHT * 2;
  }

  if (input.step3Completed) {
    pct = Math.max(pct, CONCEPT_STEP_WEIGHT * 3);
  } else if (input.totalSelfQa > 0) {
    const qaRatio = Math.min(1, input.selfQaSeenIds.length / input.totalSelfQa);
    const step3Partial = CONCEPT_STEP_WEIGHT * 2 + qaRatio * CONCEPT_STEP_WEIGHT;
    pct = Math.max(pct, step3Partial);
  }

  if (input.step4Completed) {
    pct = 100;
  } else if (input.totalConceptSets > 0) {
    const setRatio = Math.min(1, input.passedConceptSetIds.length / input.totalConceptSets);
    const step4Partial = CONCEPT_STEP_WEIGHT * 3 + setRatio * CONCEPT_STEP_WEIGHT;
    pct = Math.max(pct, step4Partial);
  }

  return Math.min(100, Math.round(pct));
}

export function currentConceptStep(input: ConceptProgressInput): 1 | 2 | 3 | 4 {
  if (!input.step1Completed) return 1;
  if (!input.step2Completed) return 2;
  if (!input.step3Completed && input.totalSelfQa > 0) return 3;
  if (!input.step4Completed) return 4;
  return 4;
}

export type KeyPointSortable = {
  id?: string | null;
  increment_count?: number | null;
  incrementCount?: number | null;
  boards?: { mention_count?: number | null }[];
  boardLinks?: { mention_count?: number | null }[];
  key_point_boards?: { mention_count?: number | null }[];
};

function keyPointIncrementCount(kp: KeyPointSortable): number {
  return Math.max(0, Number(kp.incrementCount ?? kp.increment_count ?? 0));
}

function keyPointBoardScore(kp: KeyPointSortable): number {
  const links = kp.boardLinks ?? kp.boards ?? kp.key_point_boards ?? [];
  return links.reduce((sum, board) => sum + Math.max(0, Number(board.mention_count ?? 0)), 0);
}

/** Sort key points: higher suggestion count first, then total board mentions. */
export function sortKeyPointsByImportance<T extends KeyPointSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const incA = keyPointIncrementCount(a);
    const incB = keyPointIncrementCount(b);
    if (incB !== incA) return incB - incA;
    return keyPointBoardScore(b) - keyPointBoardScore(a);
  });
}

export type QuestionSortable = {
  count?: number | null;
  incrementCount?: number | null;
  boards?: { mention_count?: number | null }[];
};

/** Sort exam questions by board frequency (high-yield first). */
export function sortQuestionsByBoardImportance<T extends QuestionSortable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const countA = Number(a.count ?? 0);
    const countB = Number(b.count ?? 0);
    if (countB !== countA) return countB - countA;
    const incA = Number(a.incrementCount ?? 0);
    const incB = Number(b.incrementCount ?? 0);
    if (incB !== incA) return incB - incA;
    const boardA = (a.boards ?? []).reduce((s, b) => s + Math.max(0, Number(b.mention_count ?? 0)), 0);
    const boardB = (b.boards ?? []).reduce((s, b) => s + Math.max(0, Number(b.mention_count ?? 0)), 0);
    return boardB - boardA;
  });
}

export function courseComplete(params: {
  subjectPcts: number[];
  requiredMocksTotal: number;
  requiredMocksPassed: number;
}): boolean {
  if (!params.subjectPcts.length) return false;
  if (!params.subjectPcts.every((p) => p >= 100)) return false;
  if (params.requiredMocksTotal > 0 && params.requiredMocksPassed < params.requiredMocksTotal) return false;
  return true;
}

/** Exam Night unlock: within 24h before a final_mock publish_at. */
export function isExamNightUnlocked(mockPublishAt: string | null | undefined, now = new Date()): boolean {
  if (!mockPublishAt) return false;
  const mockTime = new Date(mockPublishAt).getTime();
  if (Number.isNaN(mockTime)) return false;
  const ms = now.getTime();
  const windowStart = mockTime - 24 * 60 * 60 * 1000;
  return ms >= windowStart && ms < mockTime;
}
