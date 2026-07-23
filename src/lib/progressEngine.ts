import { CONCEPT_STEP_WEIGHT } from "@/lib/progressPlan";

export type ConceptProgressInput = {
  step1Completed: boolean;
  /** Highest slide index reached (0-based); used when Step 1 not fully completed */
  step1MaxSlideIndex: number;
  step1SlideTotal: number;
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

export type ConceptStepRatios = {
  /** 0–1 within each step (step-local 100%) */
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  /** Contribution toward concept total (each ≤ 25) */
  c1: number;
  c2: number;
  c3: number;
  c4: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** Per-step completion ratios — independent (unlock-safe additive model). */
export function conceptStepRatios(input: ConceptProgressInput): ConceptStepRatios {
  const r1 = input.step1Completed
    ? 1
    : input.step1SlideTotal > 0
      ? clamp01((Math.max(0, input.step1MaxSlideIndex) + 1) / input.step1SlideTotal)
      : 0;

  const r2 = input.step2Completed
    ? 1
    : input.totalKeyPoints > 0
      ? clamp01(input.studiedKeyPointIds.length / input.totalKeyPoints)
      : 1; // no key points → step contributes full band

  const r3 = input.step3Completed
    ? 1
    : input.totalSelfQa > 0
      ? clamp01(input.selfQaSeenIds.length / input.totalSelfQa)
      : 1; // no self-test units → full band

  const r4 = input.step4Completed
    ? 1
    : input.totalConceptSets > 0
      ? clamp01(input.passedConceptSetIds.length / input.totalConceptSets)
      : 0; // no practice sets → 0 until marked complete

  return {
    r1,
    r2,
    r3,
    r4,
    c1: r1 * CONCEPT_STEP_WEIGHT,
    c2: r2 * CONCEPT_STEP_WEIGHT,
    c3: r3 * CONCEPT_STEP_WEIGHT,
    c4: r4 * CONCEPT_STEP_WEIGHT,
  };
}

export function averagePct(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function halfRollup(contentPct: number, completedSets: number, totalSets: number): number {
  const contentHalf = contentPct * 0.5;
  const examHalf = totalSets > 0 ? (completedSets / totalSets) * 50 : 0;
  return Math.round(contentHalf + examHalf);
}

/**
 * Concept progress 0–100 = sum of four independent step contributions (≤25 each).
 * Example: Learn 5% + Self-test 10% (Key Points skipped) = 15%.
 */
export function conceptProgressPct(input: ConceptProgressInput): number {
  const { c1, c2, c3, c4 } = conceptStepRatios(input);
  return Math.min(100, Math.round(c1 + c2 + c3 + c4));
}

/** First incomplete step (ratio < 1); prefers content that still has work. */
export function currentConceptStep(input: ConceptProgressInput): 1 | 2 | 3 | 4 {
  const { r1, r2, r3, r4 } = conceptStepRatios(input);
  if (r1 < 1) return 1;
  if (r2 < 1) return 2;
  if (r3 < 1 && input.totalSelfQa > 0) return 3;
  if (r4 < 1) return 4;
  if (r3 < 1) return 3;
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
