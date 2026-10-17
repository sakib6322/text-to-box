import type { ReactNode } from "react";
import { CheckCircle2, CircleDashed, CircleDot, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PracticeRunSummary, QuestionFillStatus } from "@/lib/practiceProgress";

type Props = {
  summary: PracticeRunSummary;
  currentIndex: number;
  onJump: (index: number) => void;
  className?: string;
  compact?: boolean;
};

const STATUS_STYLE: Record<
  QuestionFillStatus,
  { label: string; dot: string; ring: string }
> = {
  full: {
    label: "Full — done",
    dot: "bg-emerald-500 text-white border-emerald-600 hover:brightness-95",
    ring: "ring-emerald-400/60",
  },
  partial: {
    label: "Partial — tap to finish",
    dot: "bg-amber-400 text-amber-950 border-amber-500 hover:brightness-95",
    ring: "ring-amber-400/60",
  },
  empty: {
    label: "Skipped — tap to answer",
    dot: "bg-background text-primary border-dashed border-primary/60 hover:bg-primary/10",
    ring: "ring-primary/40",
  },
};

export function PracticeSessionNav({
  summary,
  currentIndex,
  onJump,
  className,
  compact,
}: Props) {
  const pct =
    summary.totalUnits > 0
      ? Math.round((summary.attempted / summary.totalUnits) * 100)
      : 0;

  const jumpNextOpen = () => {
    const n = summary.statuses.length;
    if (!n) return;
    for (let step = 1; step <= n; step++) {
      const i = (currentIndex + step) % n;
      if (summary.statuses[i] === "empty" || summary.statuses[i] === "partial") {
        onJump(i);
        return;
      }
    }
  };

  const openCount = summary.empty + summary.partial;

  return (
    <aside
      className={cn(
        "rounded-xl border bg-card/80 shadow-sm backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-semibold tracking-wide">Session board</p>
        </div>
        {openCount > 0 ? (
          <button
            type="button"
            onClick={jumpNextOpen}
            className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
          >
            Next open →
          </button>
        ) : null}
      </div>

      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          label="Full"
          value={summary.full}
          hint="সব অপশন"
        />
        <Stat
          icon={<CircleDot className="h-3.5 w-3.5 text-amber-600" />}
          label="Partial"
          value={summary.partial}
          hint="ক্লিক → শেষ করুন"
          onClick={summary.partial > 0 ? jumpNextOpen : undefined}
        />
        <Stat
          icon={<CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />}
          label="Left"
          value={summary.empty}
          hint="ক্লিক → দাগান"
          onClick={summary.empty > 0 ? jumpNextOpen : undefined}
        />
        <Stat
          icon={<Target className="h-3.5 w-3.5 text-primary" />}
          label="Score"
          value={`${summary.correct}/${summary.attempted || 0}`}
          hint={`${pct}% done`}
        />
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Jump to question — skip/partial এ ক্লিক করে দাগান
      </p>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
        {summary.statuses.map((status, i) => {
          const style = STATUS_STYLE[status];
          const active = i === currentIndex;
          const needsAnswer = status === "empty" || status === "partial";
          return (
            <button
              key={i}
              type="button"
              title={`Q${i + 1} · ${style.label}`}
              onClick={() => onJump(i)}
              className={cn(
                "flex h-8 items-center justify-center rounded-md border text-[11px] font-semibold tabular-nums transition",
                style.dot,
                active && `ring-2 ring-offset-1 ring-offset-background ${style.ring}`,
                needsAnswer && "cursor-pointer",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <Legend swatch="bg-emerald-500" label="Full" />
        <Legend swatch="bg-amber-400" label="Partial" />
        <Legend swatch="border border-dashed border-primary/50 bg-background" label="Skipped" />
      </div>
    </aside>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint: string;
  onClick?: () => void;
}) {
  const className = cn(
    "rounded-lg border bg-background/60 px-2.5 py-2 text-left w-full",
    onClick && "cursor-pointer transition hover:border-primary/40 hover:bg-primary/5",
  );
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[9px] text-muted-foreground">{hint}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-sm", swatch)} />
      {label}
    </span>
  );
}
