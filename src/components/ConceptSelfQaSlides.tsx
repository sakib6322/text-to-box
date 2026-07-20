import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProgressAppearance, useProgressStepLabel } from "@/hooks/useProgressAppearance";
import {
  userBottomBar,
  userBottomBarInner,
} from "@/lib/userShell";

export type SelfQaSlideItem = {
  id: string;
  question: string;
  answer: string;
};

type Props = {
  items: SelfQaSlideItem[];
  seenIds: Set<string>;
  conceptPct: number;
  onSeen: (id: string) => void;
  onComplete: () => void;
  completing?: boolean;
};

export function ConceptSelfQaSlides({
  items,
  seenIds,
  conceptPct,
  onSeen,
  onComplete,
  completing = false,
}: Props) {
  const pp = useProgressAppearance();
  const stepTitle = useProgressStepLabel(3);

  const initialIndex = useMemo(() => {
    const firstUnseen = items.findIndex((it) => !seenIds.has(it.id));
    return firstUnseen >= 0 ? firstUnseen : Math.max(0, items.length - 1);
  }, [items, seenIds]);

  const [idx, setIdx] = useState(initialIndex);
  const [showAnswer, setShowAnswer] = useState(false);
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");

  const item = items[idx];
  const seenCount = items.filter((it) => seenIds.has(it.id)).length;
  const step3Pct = items.length > 0 ? Math.round((seenCount / items.length) * 100) : 0;

  useEffect(() => {
    setIdx(initialIndex);
    setShowAnswer(false);
  }, [initialIndex, items.length]);

  useEffect(() => {
    setShowAnswer(seenIds.has(item?.id ?? ""));
  }, [idx, item?.id, seenIds]);

  if (!items.length) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center space-y-2">
        <Brain className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="text-sm font-medium">Question Yourself</p>
        <p className="text-xs text-muted-foreground">{pp.noSelfQaSkip}</p>
      </Card>
    );
  }

  const goPrev = () => {
    if (idx <= 0) return;
    setSlideDir("back");
    setIdx((i) => i - 1);
  };

  const primaryLabel = !showAnswer
    ? pp.selfQaShowAnswerLabel
    : idx >= items.length - 1
      ? pp.step3CompleteButton
      : pp.selfQaNextQuestionLabel;

  const handlePrimary = () => {
    if (!item) return;
    if (!showAnswer) {
      setShowAnswer(true);
      if (!seenIds.has(item.id)) onSeen(item.id);
      return;
    }
    if (idx < items.length - 1) {
      setSlideDir("forward");
      setIdx((i) => i + 1);
      setShowAnswer(false);
    } else {
      onComplete();
    }
  };

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
              <p className="text-xs text-muted-foreground">{pp.selfQaIntro}</p>
            </div>
            <Badge variant="secondary" className="tabular-nums shrink-0">
              {conceptPct}% · target 75%
            </Badge>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {pp.selfQaProgressLabel} {seenCount}/{items.length}
              </span>
              <span>{step3Pct}%</span>
            </div>
            <Progress value={step3Pct} className="h-1.5" />
          </div>
        </div>

        <div className={slideDir === "back" ? "self-qa-slide self-qa-slide--back" : "self-qa-slide"}>
          <Card className="relative min-h-[220px] overflow-hidden border-violet-200/60 bg-card p-5 sm:p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-500/10 blur-2xl" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {pp.selfQaQuestionLabel} {idx + 1} / {items.length}
                </Badge>
                {seenIds.has(item?.id ?? "") ? (
                  <Badge className="gap-1 border-0 bg-emerald-600/90 text-[10px] text-white">
                    <CheckCircle2 className="h-3 w-3" /> Seen
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {pp.selfQaQuestionLabel}
                </p>
                <p className="text-base font-medium leading-relaxed sm:text-lg">{item?.question}</p>
              </div>

              {showAnswer ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                    {pp.selfQaAnswerLabel}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed sm:text-base">{item?.answer}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">{pp.selfQaTapHint}</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className={userBottomBar}>
        <div className={userBottomBarInner}>
          <Button type="button" variant="outline" className="flex-1" disabled={idx <= 0} onClick={goPrev}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {pp.selfQaPrevLabel}
          </Button>
          <Button type="button" className="flex-1" disabled={completing} onClick={handlePrimary}>
            {primaryLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
