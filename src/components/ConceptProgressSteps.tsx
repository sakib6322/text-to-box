import { Lock } from "lucide-react";
import { CONCEPT_STEPS } from "@/lib/progressPlan";
import { progressStepLabel } from "@/lib/uiAppearance";
import { useProgressAppearance } from "@/hooks/useProgressAppearance";
import { isStep2Complete, type StudyProgress } from "@/lib/userProgress";
type Props = {
  progress: StudyProgress | null;
  pct: number;
  activeStep: 1 | 2 | 3 | 4;
  totalKeyPoints?: number;
  onStepClick?: (step: 1 | 2 | 3 | 4) => void;
};

export function ConceptStepBar({ progress, pct, activeStep, totalKeyPoints = 0, onStepClick }: Props) {  const pp = useProgressAppearance();
  const steps = pp.steps.length >= 4 ? pp.steps : CONCEPT_STEPS.map((s) => ({ id: s.id, label: s.label, labelBn: s.labelBn }));

  const done = (n: 1 | 2 | 3 | 4) => {
    if (!progress) return false;
    if (n === 1) return !!progress.step1CompletedAt;
    if (n === 2) return !!progress.step2CompletedAt;
    if (n === 3) return !!progress.step3CompletedAt;
    if (n === 4) return !!progress.step4CompletedAt;
    return false;
  };

  const unlocked = (n: 1 | 2 | 3 | 4) => {
    if (n === 1) return true;
    if (n === 2) return done(1);
    if (n === 3) return done(1) && isStep2Complete(progress, totalKeyPoints);
    if (n === 4) return done(1) && isStep2Complete(progress, totalKeyPoints) && done(3);
    return false;
  };
  if (!pp.enabled || !pp.showConceptStepBar) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{pp.stepBarTitle}</span>
        <span className="tabular-nums font-medium text-foreground">{pct}%</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {steps.map((s) => {
          const stepId = s.id as 1 | 2 | 3 | 4;
          const isActive = activeStep === stepId;
          const isDone = done(stepId);
          const isUnlocked = unlocked(stepId);
          const label = progressStepLabel(steps, stepId, pp.preferBengaliStepLabels);
          return (
            <button
              key={s.id}
              type="button"
              disabled={!isUnlocked}
              onClick={() => isUnlocked && onStepClick?.(stepId)}
              className={`rounded-lg border px-1 py-2 text-center transition-colors ${
                isActive ? "border-primary bg-primary/10" : isDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
              } ${!isUnlocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/40"}`}
            >
              <p className="text-[10px] font-semibold tabular-nums">{s.id}</p>
              {!isUnlocked ? (
                <Lock className="mx-auto mt-0.5 h-3 w-3 text-muted-foreground" />
              ) : (
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-muted-foreground">{label}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
