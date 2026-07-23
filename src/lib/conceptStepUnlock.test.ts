import { describe, expect, it } from "vitest";
import { isConceptStepUnlocked } from "./conceptStepUnlock";
import type { ProgressStepConfig } from "./uiAppearance";
import type { StudyProgress } from "./userProgress";

const lockedSteps: ProgressStepConfig[] = [
  { id: 1, label: "L", labelBn: "L", lockUntilPrevious: false },
  { id: 2, label: "K", labelBn: "K", lockUntilPrevious: true },
  { id: 3, label: "Q", labelBn: "Q", lockUntilPrevious: true },
  { id: 4, label: "P", labelBn: "P", lockUntilPrevious: true },
];

const unlockedSteps: ProgressStepConfig[] = lockedSteps.map((s) => ({
  ...s,
  lockUntilPrevious: false,
}));

const baseProgress = (patch: Partial<StudyProgress> = {}): StudyProgress => ({
  conceptId: "c1",
  conceptName: "C",
  studiedKeyPointIds: [],
  selfQaSeenIds: [],
  totalKeyPoints: 2,
  lastStudiedAt: new Date().toISOString(),
  ...patch,
});

describe("isConceptStepUnlocked", () => {
  it("always allows step 1", () => {
    expect(isConceptStepUnlocked(1, null, 2, 5, lockedSteps)).toBe(true);
  });

  it("blocks step 2 until step 1 is done when locked", () => {
    expect(isConceptStepUnlocked(2, baseProgress(), 2, 5, lockedSteps)).toBe(false);
    expect(
      isConceptStepUnlocked(2, baseProgress({ step1CompletedAt: "2026-01-01" }), 2, 5, lockedSteps),
    ).toBe(true);
  });

  it("does not treat empty key points as step 2 done", () => {
    expect(
      isConceptStepUnlocked(3, baseProgress({ step1CompletedAt: "2026-01-01" }), 0, 5, lockedSteps),
    ).toBe(false);
  });

  it("allows skip when lockUntilPrevious is off", () => {
    expect(isConceptStepUnlocked(3, baseProgress(), 2, 5, unlockedSteps)).toBe(true);
    expect(isConceptStepUnlocked(4, baseProgress(), 2, 5, unlockedSteps)).toBe(true);
  });

  it("unlocks step 4 only after step 3 complete", () => {
    const p = baseProgress({
      step1CompletedAt: "2026-01-01",
      step2CompletedAt: "2026-01-01",
      selfQaSeenIds: ["a", "b"],
    });
    expect(isConceptStepUnlocked(4, p, 2, 5, lockedSteps)).toBe(false);
    expect(isConceptStepUnlocked(4, { ...p, step3CompletedAt: "2026-01-01" }, 2, 5, lockedSteps)).toBe(
      true,
    );
  });
});
