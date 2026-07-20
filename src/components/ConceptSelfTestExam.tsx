import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  countPracticeAnswerUnits,
  PracticeQuestionBlock,
  type PracticeQuestionFull,
} from "@/components/PracticeQuestionBlock";
import { useProgressAppearance, useProgressStepLabel } from "@/hooks/useProgressAppearance";
import { apiUrl } from "@/lib/apiBase";
import { sortQuestionsByBoardImportance } from "@/lib/progressEngine";
import { userBottomBar, userBottomBarInner } from "@/lib/userShell";
import { toast } from "sonner";

type Props = {
  conceptId: string;
  conceptName: string;
  conceptPct: number;
  seenIds: Set<string>;
  onAnswerSeen: (answerId: string) => void;
  onComplete: () => void;
  completing?: boolean;
};

function gradeMcqStatement(correct: "true" | "false", given: "true" | "false") {
  return correct === given;
}

export function ConceptSelfTestExam({
  conceptId,
  conceptName,
  conceptPct,
  seenIds,
  onAnswerSeen,
  onComplete,
  completing = false,
}: Props) {
  const pp = useProgressAppearance();
  const stepTitle = useProgressStepLabel(3);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<PracticeQuestionFull[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, { given: unknown; correct: boolean }>>({});
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const totalUnits = useMemo(
    () => questions.reduce((sum, q) => sum + countPracticeAnswerUnits(q), 0),
    [questions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ concept: conceptName.trim() });
      const res = await fetch(apiUrl(`/api/questions?${qs}`));
      const data = (await res.json()) as { rows?: PracticeQuestionFull[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
      const sorted = sortQuestionsByBoardImportance(data.rows ?? []) as PracticeQuestionFull[];
      setQuestions(sorted);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load self-test");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [conceptName]);

  useEffect(() => {
    void load();
  }, [load, conceptId]);

  const q = questions[qIndex];
  const step3Pct = totalUnits > 0 ? Math.round((seenIds.size / totalUnits) * 100) : 0;

  const revealMcq = (
    stmtKey: string,
    stmtId: string,
    correct: "true" | "false",
    given: "true" | "false",
    explanation?: string,
  ) => {
    if (locked[stmtKey]) return;
    const ok = gradeMcqStatement(correct, given);
    setLocked((p) => ({ ...p, [stmtKey]: true }));
    setRevealed((p) => ({ ...p, [stmtKey]: { given, correct: ok } }));
    setScore((s) => s + (ok ? 1 : 0));
    setAnsweredCount((n) => n + 1);
    onAnswerSeen(`${q!.id}:${stmtId}`);
  };

  const revealSba = (optionIndex: number) => {
    if (!q || locked[q.id]) return;
    const correctIdx = q.sba?.correctIndex ?? -1;
    const ok = optionIndex === correctIdx;
    setLocked((p) => ({ ...p, [q.id]: true }));
    setRevealed((p) => ({ ...p, [q.id]: { given: optionIndex, correct: ok } }));
    setScore((s) => s + (ok ? 1 : 0));
    setAnsweredCount((n) => n + 1);
    onAnswerSeen(q.id);
  };

  const goNext = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }
    onComplete();
  };

  const nextLabel =
    qIndex >= questions.length - 1 ? (
      <>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        {pp.step3CompleteButton}
      </>
    ) : (
      pp.selfQaNextQuestionLabel || "Next question"
    );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!questions.length) {
    return (
      <Card className="mx-auto max-w-xl space-y-2 p-8 text-center">
        <Brain className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium">{stepTitle}</p>
        <p className="text-xs text-muted-foreground">{pp.noSelfQaSkip}</p>
        <Button size="sm" className="mt-2" onClick={onComplete} disabled={completing}>
          Continue without self-test
        </Button>
      </Card>
    );
  }

  if (!q) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center text-sm text-muted-foreground">
        No questions available.
      </Card>
    );
  }

  return (
    <div className="space-y-4 pb-28 md:pb-8">
      <div className="mx-auto max-w-2xl space-y-3 px-1">
        <div className="rounded-xl border bg-gradient-to-br from-violet-500/5 via-background to-primary/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold">{stepTitle}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {questions.length} question{questions.length === 1 ? "" : "s"} · high-yield boards first · no selection needed
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {conceptPct}% · target 75%
            </Badge>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {pp.selfQaProgressLabel} {seenIds.size}/{totalUnits}
              </span>
              <span>{step3Pct}%</span>
            </div>
            <Progress value={step3Pct} className="h-1.5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <span className="tabular-nums">
            Question {qIndex + 1} / {questions.length}
          </span>
          <span className="tabular-nums">{score} correct · {answeredCount} answered</span>
        </div>

        <PracticeQuestionBlock
          q={q}
          qNum={qIndex + 1}
          locked={locked}
          revealed={revealed}
          onRevealMcq={revealMcq}
          onRevealSba={revealSba}
        />
      </div>

      <div className={userBottomBar}>
        <div className={userBottomBarInner}>
          <Button type="button" className="flex-1" disabled={completing} onClick={goNext}>
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
