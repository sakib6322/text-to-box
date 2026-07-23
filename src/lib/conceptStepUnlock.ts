import type { ProgressStepConfig } from "@/lib/uiAppearance";
import { isStep2Complete, isStep3Complete, type StudyProgress } from "@/lib/userProgress";

/** Navigation gate — respects Appearance lockUntilPrevious. */
export function isConceptStepUnlocked(
  step: 1 | 2 | 3 | 4,
  progress: StudyProgress | null,
  totalKeyPoints: number,
  totalSelfQa: number,
  steps: ProgressStepConfig[],
): boolean {
  const cfg = steps.find((s) => s.id === step);
  const lock = cfg?.lockUntilPrevious ?? step !== 1;
  if (!lock || step === 1) return true;
  if (step === 2) return !!progress?.step1CompletedAt;
  if (step === 3) return isStep2Complete(progress, totalKeyPoints);
  if (step === 4) return isStep3Complete(progress, totalSelfQa);
  return false;
}
