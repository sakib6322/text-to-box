import { Lock } from "lucide-react";
import { CONCEPT_STEPS } from "@/lib/progressPlan";
import { progressStepLabel, type ProgressStepConfig } from "@/lib/uiAppearance";
import { useProgressAppearance } from "@/hooks/useProgressAppearance";
import { isConceptStepUnlocked } from "@/lib/conceptStepUnlock";
import { studyStepRatios, type StudyProgress } from "@/lib/userProgress";
import { cn } from "@/lib/utils";

type Props = {
  progress: StudyProgress | null;
  pct: number;
  activeStep: 1 | 2 | 3 | 4;
  totalKeyPoints?: number;
  totalSelfQa?: number;
  totalConceptSets?: number;
  passedConceptSetIds?: string[];
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
};

function stepConfig(ppSteps: ProgressStepConfig[]): ProgressStepConfig[] {
  return [1, 2, 3, 4].map((id) => {
    const fromPp = ppSteps.find((x) => x.id === id);
    const fromConst = CONCEPT_STEPS.find((x) => x.id === id)!;
    return {
      id: id as 1 | 2 | 3 | 4,
      label: fromPp?.label ?? fromConst.label,
      labelBn: fromPp?.labelBn ?? fromConst.labelBn,
      lockUntilPrevious:
        typeof fromPp?.lockUntilPrevious === "boolean" ? fromPp.lockUntilPrevious : id !== 1,
    };
  });
}

export function ConceptStepBar({
  progress,
  pct,
  activeStep,
  totalKeyPoints = 0,
  totalSelfQa = 0,
  totalConceptSets = 0,
  passedConceptSetIds = [],
  onStepClick,
}: Props) {
  const pp = useProgressAppearance();
  const steps = stepConfig(pp.steps);
  const ratios = studyStepRatios(progress, totalSelfQa, totalConceptSets, passedConceptSetIds, {
    totalKeyPoints,
  });
  const localPct = [ratios.r1, ratios.r2, ratios.r3, ratios.r4].map((r) => Math.round(r * 100));

  const unlocked = (n: 1 | 2 | 3 | 4) =>
    isConceptStepUnlocked(n, progress, totalKeyPoints, totalSelfQa, steps);

  if (!pp.enabled || !pp.showConceptStepBar) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pp.stepBarTitle}</span>
        <span className="tabular-nums font-semibold text-foreground">{pct}%</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {steps.map((s) => {
          const stepId = s.id as 1 | 2 | 3 | 4;
          const isActive = activeStep === stepId;
          const stepLocal = localPct[stepId - 1] ?? 0;
          const isDone = stepLocal >= 100;
          const isUnlocked = unlocked(stepId);
          const label = progressStepLabel(steps, stepId, pp.preferBengaliStepLabels);
          return (
            <button
              key={s.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onStepClick?.(stepId)}
              className={cn(
                "rounded-lg border px-1 py-1.5 text-center transition-colors",
                isActive && "border-primary bg-primary/10",
                isDone && !isActive && "border-emerald-500/40 bg-emerald-500/5",
                !isDone && !isActive && "border-border",
                !isUnlocked ? "cursor-not-allowed opacity-50" : "hover:bg-muted/40",
              )}
            >
              <p className="text-[10px] font-semibold tabular-nums leading-none">{s.id}</p>
              {!isUnlocked ? (
                <Lock className="mx-auto mt-0.5 h-3 w-3 text-muted-foreground" />
              ) : (
                <p className="mt-0.5 line-clamp-1 text-[8px] leading-tight text-muted-foreground">{label}</p>
              )}
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-[width]", isDone ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${stepLocal}%` }}
                />
              </div>
              <p className="mt-0.5 text-[8px] font-medium tabular-nums text-muted-foreground">{stepLocal}%</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
