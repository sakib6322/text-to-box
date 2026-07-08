import { useMemo } from "react";
import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatScheduleRange } from "@/lib/exams";

type Props = {
  scheduledStart: string | null;
  scheduledEnd: string | null;
  attemptStartedAt?: string | null;
  attemptEndsAt?: string | null;
  now?: number;
};

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExamTimeline({
  scheduledStart,
  scheduledEnd,
  attemptStartedAt,
  attemptEndsAt,
  now = Date.now(),
}: Props) {
  const scheduleProgress = useMemo(() => {
    if (!scheduledStart || !scheduledEnd) return null;
    const start = new Date(scheduledStart).getTime();
    const end = new Date(scheduledEnd).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    let label = "In window";
    if (now < start) label = "Not started";
    else if (now > end) label = "Ended";
    return { pct, label };
  }, [scheduledStart, scheduledEnd, now]);

  const attemptProgress = useMemo(() => {
    if (!attemptStartedAt || !attemptEndsAt) return null;
    const start = new Date(attemptStartedAt).getTime();
    const end = new Date(attemptEndsAt).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return pct;
  }, [attemptStartedAt, attemptEndsAt, now]);

  return (
    <div className="rounded-xl border bg-muted/20 p-3 space-y-3 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="font-medium text-foreground">Exam schedule</span>
        <span className="truncate">{formatScheduleRange(scheduledStart, scheduledEnd)}</span>
      </div>

      {scheduleProgress ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Schedule timeline</span>
            <Badge variant="outline" className="text-[10px] h-5">{scheduleProgress.label}</Badge>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary/70 transition-all duration-1000" style={{ width: `${scheduleProgress.pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{fmtTime(scheduledStart)}</span>
            <span>{fmtTime(scheduledEnd)}</span>
          </div>
        </div>
      ) : null}

      {attemptStartedAt && attemptEndsAt ? (
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Your attempt: {fmtTime(attemptStartedAt)} → {fmtTime(attemptEndsAt)}</span>
          </div>
          {attemptProgress != null ? (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500/80 transition-all duration-1000"
                style={{ width: `${attemptProgress}%` }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
