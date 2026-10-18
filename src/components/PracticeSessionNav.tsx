import { useState, type ReactNode } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleDashed, CircleDot, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PracticeRunSummary,
  QuestionFillStatus,
  QuestionUnitDetail,
  UnitDot,
} from "@/lib/practiceProgress";

type Props = {
  summary: PracticeRunSummary;
  currentIndex: number;
  onJump: (index: number) => void;
  className?: string;
  /** Desktop side panel (default) or mobile bottom dock */
  variant?: "panel" | "mobileDock";
};

const DOT_CLASS: Record<UnitDot, string> = {
  correct: "bg-emerald-500",
  wrong: "bg-rose-500",
  skip: "bg-slate-300 dark:bg-slate-600",
};

function boxTone(detail: QuestionUnitDetail): string {
  if (detail.status === "empty") {
    return "border-dashed border-primary/50 bg-background text-primary hover:bg-primary/5";
  }
  if (detail.wrong > 0 && detail.correct === 0 && detail.skip === 0) {
    return "border-rose-400 bg-rose-50 text-rose-900 hover:brightness-95";
  }
  if (detail.wrong > 0) {
    return "border-rose-300/80 bg-rose-50/80 text-rose-950 hover:brightness-95";
  }
  if (detail.status === "full" && detail.correct > 0) {
    return "border-emerald-500 bg-emerald-50 text-emerald-900 hover:brightness-95";
  }
  return "border-amber-400 bg-amber-50 text-amber-950 hover:brightness-95";
}

function ringTone(detail: QuestionUnitDetail): string {
  if (detail.wrong > 0) return "ring-rose-400/50";
  if (detail.status === "full") return "ring-emerald-400/60";
  if (detail.status === "partial") return "ring-amber-400/60";
  return "ring-primary/40";
}

export function PracticeSessionNav({
  summary,
  currentIndex,
  onJump,
  className,
  variant = "panel",
}: Props) {
  const [expanded, setExpanded] = useState(false);
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
        if (variant === "mobileDock") setExpanded(false);
        return;
      }
    }
  };

  const handleJump = (index: number) => {
    onJump(index);
    if (variant === "mobileDock") setExpanded(false);
  };

  const openCount = summary.empty + summary.partial;
  const details = summary.details.length
    ? summary.details
    : summary.statuses.map((status) => ({
        status,
        units: [] as UnitDot[],
        correct: 0,
        wrong: 0,
        skip: 0,
        pctCorrect: 0,
        pctTouched: 0,
      }));

  if (variant === "mobileDock") {
    return (
      <div
        className={cn(
          "safe-area-pb fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md",
          className,
        )}
      >
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full flex-col items-center gap-2 px-3 pb-1 pt-2"
        >
          <span className="h-1 w-9 rounded-full bg-muted-foreground/25" aria-hidden />
          <div className="flex w-full items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
              <Chip tone="emerald" label="Full" value={summary.full} />
              <Chip tone="amber" label="Partial" value={summary.partial} />
              <Chip tone="muted" label="Left" value={summary.empty} />
              <Chip tone="primary" label="Score" value={`${summary.correct}/${summary.attempted || 0}`} />
            </div>
            <span className="shrink-0 rounded-full border bg-muted/40 p-1 text-muted-foreground">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </button>

        {expanded ? (
          <div className="max-h-[42vh] space-y-2.5 overflow-y-auto overscroll-contain px-3 pb-3 pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Session board · Jump
              </p>
              {openCount > 0 ? (
                <button
                  type="button"
                  onClick={jumpNextOpen}
                  className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  Next open →
                </button>
              ) : null}
            </div>
            <JumpGrid details={details} currentIndex={currentIndex} onJump={handleJump} dense />
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <Legend swatch="bg-emerald-500" label="Correct" />
              <Legend swatch="bg-rose-500" label="Wrong" />
              <Legend swatch="bg-slate-300" label="Skip" />
            </div>
          </div>
        ) : (
          <p className="px-3 pb-2 text-center text-[9px] text-muted-foreground">
            উপরে সোয়াইপ / ট্যাপ করে jump board খুলুন
          </p>
        )}
      </div>
    );
  }

  return (
    <aside
      className={cn("rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm", className)}
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Stat
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          label="Fully touched"
          value={summary.full}
          hint="সব অপশন"
        />
        <Stat
          icon={<CircleDot className="h-3.5 w-3.5 text-amber-600" />}
          label="Partially touched"
          value={summary.partial}
          hint="ক্লিক → শেষ করুন"
          onClick={summary.partial > 0 ? jumpNextOpen : undefined}
        />
        <Stat
          icon={<CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />}
          label="Not touched"
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

      <p className="mt-3 mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Jump to question
      </p>
      <JumpGrid details={details} currentIndex={currentIndex} onJump={handleJump} />
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <Legend swatch="bg-emerald-500" label="Correct" />
        <Legend swatch="bg-rose-500" label="Wrong" />
        <Legend swatch="bg-slate-300" label="Skip" />
      </div>
    </aside>
  );
}

function JumpGrid({
  details,
  currentIndex,
  onJump,
  dense,
}: {
  details: QuestionUnitDetail[];
  currentIndex: number;
  onJump: (index: number) => void;
  dense?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", dense ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-4")}>
      {details.map((detail, i) => {
        const active = i === currentIndex;
        return (
          <button
            key={i}
            type="button"
            title={jumpTitle(detail, i)}
            onClick={() => onJump(i)}
            className={cn(
              "flex flex-col items-stretch gap-1 rounded-md border px-1.5 py-1.5 text-left transition",
              dense ? "min-h-[2.75rem]" : "min-h-[3.25rem]",
              boxTone(detail),
              active && `ring-2 ring-offset-1 ring-offset-background ${ringTone(detail)}`,
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-semibold tabular-nums">Q{i + 1}</span>
              <span className="text-[9px] font-medium tabular-nums opacity-80">{detail.pctCorrect}%</span>
            </div>
            {detail.units.length > 0 ? (
              <div className="flex flex-wrap gap-0.5">
                {detail.units.map((u, ui) => (
                  <span key={ui} className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[u])} title={u} />
                ))}
              </div>
            ) : null}
            <UnitBar detail={detail} />
          </button>
        );
      })}
    </div>
  );
}

function Chip({
  tone,
  label,
  value,
}: {
  tone: "emerald" | "amber" | "muted" | "primary";
  label: string;
  value: string | number;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : tone === "primary"
          ? "border-primary/20 bg-primary/5 text-primary"
          : "border-border bg-muted/50 text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums",
        toneClass,
      )}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function jumpTitle(detail: QuestionUnitDetail, index: number): string {
  const statusLabel: Record<QuestionFillStatus, string> = {
    full: "Fully touched",
    partial: "Partially touched",
    empty: "Not touched",
  };
  return `Q${index + 1} · ${statusLabel[detail.status]} · ✓${detail.correct} ✗${detail.wrong} ○${detail.skip}`;
}

function UnitBar({ detail }: { detail: QuestionUnitDetail }) {
  const total = detail.units.length || 1;
  const c = (detail.correct / total) * 100;
  const w = (detail.wrong / total) * 100;
  const s = (detail.skip / total) * 100;
  return (
    <div className="flex h-1 w-full overflow-hidden rounded-full bg-black/5">
      {c > 0 ? <span className="bg-emerald-500" style={{ width: `${c}%` }} /> : null}
      {w > 0 ? <span className="bg-rose-500" style={{ width: `${w}%` }} /> : null}
      {s > 0 ? <span className="bg-slate-300 dark:bg-slate-600" style={{ width: `${s}%` }} /> : null}
    </div>
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
