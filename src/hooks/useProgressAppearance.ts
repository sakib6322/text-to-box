import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { progressStepLabel, type ProgressPlanAppearance, type ProgressStepConfig } from "@/lib/uiAppearance";

export function useProgressAppearance(): ProgressPlanAppearance {
  return useUiAppearance().appearance.progressPlan;
}

export function useProgressStepLabel(stepId: 1 | 2 | 3 | 4): string {
  const pp = useProgressAppearance();
  return progressStepLabel(pp.steps, stepId, pp.preferBengaliStepLabels);
}

export function useProgressSteps(): ProgressStepConfig[] {
  return useProgressAppearance().steps;
}

export function formatProgressPct(pct: number, suffix?: string): string {
  const pp = useProgressAppearance();
  const sfx = suffix ?? pp.progressPctSuffix;
  return sfx ? `${Math.round(pct)}% ${sfx}` : `${Math.round(pct)}%`;
}
