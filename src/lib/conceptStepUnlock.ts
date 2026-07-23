import type { ProgressStepConfig } from "@/lib/uiAppearance";
import {
  isStep1FullyDone,
  isStep2Complete,
  isStep3Complete,
  type StudyProgress,
} from "@/lib/userProgress";

/**
 * Navigation gate — respects Appearance `lockUntilPrevious`.
 * When lock is on, previous step must be fully done (not merely "empty = skip").
 */
export function isConceptStepUnlocked(
  step: 1 | 2 | 3 | 4,
  progress: StudyProgress | null,
  totalKeyPoints: number,
  totalSelfQa: number,
  steps: ProgressStepConfig[],
): boolean {
  if (step === 1) return true;
  const cfg = steps.find((s) => s.id === step);
  const lock = typeof cfg?.lockUntilPrevious === "boolean" ? cfg.lockUntilPrevious : step !== 1;
  if (!lock) return true;

  if (step === 2) return isStep1FullyDone(progress);
  if (step === 3) return isStep2Complete(progress, totalKeyPoints);
  if (step === 4) return isStep3Complete(progress, totalSelfQa);
  return false;
}
