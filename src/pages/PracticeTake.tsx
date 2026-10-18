import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { AppBackButton } from "@/components/AppBackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PracticeQuestionBlock, type PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { PracticeSessionNav } from "@/components/PracticeSessionNav";
import { apiUrl, readJsonResponse } from "@/lib/apiBase";
import {
  restoreRevealState,
  summarizePracticeRun,
} from "@/lib/practiceProgress";
import {
  getPracticeSession,
  savePracticeSession,
  type PracticeAnswer,
  type PracticeSession,
} from "@/lib/userProgress";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function gradeMcqStatement(correct: "true" | "false", given: "true" | "false") {
  return correct === given;
}

export default function PracticeTake() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sessionTitle, setSessionTitle] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [questions, setQuestions] = useState<PracticeQuestionFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, { given: unknown; correct: boolean }>>({});
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const questionAnchorRef = useRef<HTMLDivElement | null>(null);
  const qIndexRef = useRef(0);

  const persistDraft = useCallback(
    (patch: Partial<PracticeSession> & { answers?: PracticeAnswer[]; currentIndex?: number }) => {
      if (!sessionId) return;
      const session = getPracticeSession(sessionId);
      if (!session || session.completedAt) return;
      savePracticeSession({
        ...session,
        ...patch,
        answers: patch.answers ?? session.answers,
        currentIndex: patch.currentIndex ?? session.currentIndex,
      });
    },
    [sessionId],
  );

  const load = useCallback(async () => {
    if (!sessionId) return;
    const session = getPracticeSession(sessionId);
    if (!session) {
      toast.error("Practice session not found");
      navigate("/study/progress");
      return;
    }
    setSessionTitle(session.title);
    setConceptId(session.conceptId);

    const savedAnswers = session.answers ?? [];
    if (savedAnswers.length) {
      const restored = restoreRevealState(savedAnswers);
      setLocked(restored.locked);
      setRevealed(restored.revealed);
      setAnswers(savedAnswers);
    }
    if (typeof session.currentIndex === "number" && session.currentIndex >= 0) {
      setQIndex(session.currentIndex);
    }
    if (session.completedAt && !reviewMode) {
      setDone(true);
    }

    setLoading(true);
    try {
      const ids = session.questionIds.join(",");
      const loadQuestions = async () => {
        const res = await fetch(apiUrl(`/api/questions?ids=${encodeURIComponent(ids)}`));
        const data = await readJsonResponse<{ rows?: PracticeQuestionFull[]; error?: string }>(res, {});
        if (!res.ok) throw new Error(data.error || `Load failed (${res.status})`);
        return data.rows ?? [];
      };
      let rows: PracticeQuestionFull[] = [];
      try {
        rows = await loadQuestions();
      } catch {
        // API often resets during HMR — one quick retry
        await new Promise((r) => setTimeout(r, 400));
        rows = await loadQuestions();
      }
      const byId = new Map(rows.map((q) => [q.id, q]));
      const ordered = session.questionIds
        .map((id) => byId.get(id))
        .filter(Boolean) as PracticeQuestionFull[];
      if (!ordered.length) throw new Error("Questions could not be loaded — try again");
      setQuestions(ordered);
      if (typeof session.currentIndex === "number") {
        setQIndex(Math.min(session.currentIndex, Math.max(0, ordered.length - 1)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate, reviewMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = questions[qIndex];
  const summary = useMemo(() => summarizePracticeRun(questions, answers), [questions, answers]);
  const currentStatus = summary.statuses[qIndex] ?? "empty";

  useEffect(() => {
    qIndexRef.current = qIndex;
  }, [qIndex]);

  const score = useMemo(() => {
    if (reviewMode || done) {
      const session = sessionId ? getPracticeSession(sessionId) : null;
      return session?.score ?? summary.correct;
    }
    return summary.correct;
  }, [answers, reviewMode, sessionId, done, summary.correct]);

  const finish = useCallback(
    (finalAnswers: PracticeAnswer[]) => {
      if (!sessionId) return;
      const session = getPracticeSession(sessionId);
      if (!session) return;
      const stats = summarizePracticeRun(questions, finalAnswers);
      savePracticeSession({
        ...session,
        completedAt: new Date().toISOString(),
        score: stats.correct,
        total: stats.attempted,
        totalUnits: stats.totalUnits,
        fullAnswered: stats.full,
        partialAnswered: stats.partial,
        skipped: stats.empty,
        currentIndex: qIndex,
        answers: finalAnswers,
      });
      setDone(true);
    },
    [sessionId, questions, qIndex],
  );

  const revealMcq = (
    stmtKey: string,
    stmtId: string,
    correct: "true" | "false",
    given: "true" | "false",
    explanation?: string,
  ) => {
    if (locked[stmtKey] || reviewMode || done) return;
    const ok = gradeMcqStatement(correct, given);
    setLocked((p) => ({ ...p, [stmtKey]: true }));
    setRevealed((p) => ({ ...p, [stmtKey]: { given, correct: ok } }));
    const entry: PracticeAnswer = {
      questionId: `${q!.id}:${stmtId}`,
      answer: { value: given, explanation },
      isCorrect: ok,
      answeredAt: new Date().toISOString(),
    };
    setAnswers((prev) => {
      const next = [...prev.filter((a) => a.questionId !== entry.questionId), entry];
      persistDraft({ answers: next, currentIndex: qIndexRef.current });
      return next;
    });
  };

  const revealSba = (optionIndex: number) => {
    if (!q || locked[q.id] || reviewMode || done) return;
    const correctIdx = q.sba?.correctIndex ?? -1;
    const ok = optionIndex === correctIdx;
    setLocked((p) => ({ ...p, [q.id]: true }));
    setRevealed((p) => ({ ...p, [q.id]: { given: optionIndex, correct: ok } }));
    const entry: PracticeAnswer = {
      questionId: q.id,
      answer: { selectedIndex: optionIndex },
      isCorrect: ok,
      answeredAt: new Date().toISOString(),
    };
    setAnswers((prev) => {
      const next = [...prev.filter((a) => a.questionId !== entry.questionId), entry];
      persistDraft({ answers: next, currentIndex: qIndexRef.current });
      return next;
    });
  };

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(index, questions.length - 1));
    setQIndex(clamped);
    qIndexRef.current = clamped;
    persistDraft({ answers, currentIndex: clamped });
    // Bring the question into view so skipped items can be marked immediately
    requestAnimationFrame(() => {
      questionAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window !== "undefined" && window.scrollY > 80) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const goPrev = () => {
    if (qIndex > 0) goTo(qIndex - 1);
  };

  const goNext = () => {
    if (qIndex < questions.length - 1) goTo(qIndex + 1);
  };

  const submitPractice = () => {
    if (submitting || done || reviewMode) return;
    const left = summary.empty + summary.partial;
    if (left > 0) {
      const ok = window.confirm(
        `${summary.empty}টি question এখনো খালি, ${summary.partial}টি partial। তবুও submit করবেন?`,
      );
      if (!ok) return;
    }
    setSubmitting(true);
    finish(answers);
    setSubmitting(false);
    toast.success("Practice submitted");
  };

  const shellClass = isMobile
    ? "mx-auto max-w-lg space-y-3 pb-[7.5rem]"
    : "mx-auto max-w-5xl pb-16 space-y-4 px-2";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (reviewMode && questions.length > 0) {
    const session = sessionId ? getPracticeSession(sessionId) : null;
    return (
      <div className={shellClass}>
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 py-3">
          <AppBackButton fallback="/study/progress" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{sessionTitle}</p>
            <p className="text-sm font-medium">Full review</p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {score} / {session?.total ?? answers.length}
          </Badge>
        </div>

        {(session?.fullAnswered != null || summary.full > 0) && (
          <div className={isMobile ? "px-4" : ""}>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                Fully touched {session?.fullAnswered ?? summary.full}
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                Partially touched {session?.partialAnswered ?? summary.partial}
              </Badge>
              <Badge variant="outline">
                Not touched {session?.skipped ?? summary.empty}
              </Badge>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${isMobile ? "px-4" : ""}`}>
          {questions.map((question, i) => (
            <PracticeQuestionBlock
              key={question.id}
              q={question}
              qNum={i + 1}
              locked={locked}
              revealed={revealed}
              readOnly
            />
          ))}
        </div>
        <div className={`flex flex-wrap justify-end gap-2 ${isMobile ? "px-4" : ""}`}>
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to={`/practice/${conceptId}/setup`}>Practice again</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to="/study/progress">History</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    const session = sessionId ? getPracticeSession(sessionId) : null;
    return (
      <div className={`${isMobile ? "max-w-lg" : "max-w-xl"} mx-auto space-y-4 p-6`}>
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 text-lg font-bold">Practice submitted</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Score{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {score}/{session?.total ?? answers.length}
            </span>
            {session?.totalUnits != null ? (
              <span className="text-muted-foreground"> · of {session.totalUnits} units</span>
            ) : null}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Fully touched" value={session?.fullAnswered ?? summary.full} />
            <MiniStat label="Partially touched" value={session?.partialAnswered ?? summary.partial} />
            <MiniStat label="Not touched" value={session?.skipped ?? summary.empty} />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild size="sm" className="h-8 text-xs">
            <Link to={`/practice/session/${sessionId}?review=1`}>Review answers</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link to={`/practice/${conceptId}/setup`}>Practice again</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
            <Link to="/study/progress">History</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No questions in this session.
        <Button asChild variant="link">
          <Link to="/study/progress">Go back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-3 py-2.5 md:px-4">
        <AppBackButton fallback="/study/progress" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-muted-foreground">{sessionTitle}</p>
          <p className="text-sm font-medium tabular-nums">
            Q{qIndex + 1}
            <span className="text-muted-foreground font-normal"> / {questions.length}</span>
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums text-[10px]">
          {summary.correct}✓ · {summary.empty} left
        </Badge>
      </div>

      <div className={`grid gap-4 ${isMobile ? "" : "lg:grid-cols-[1fr_260px] lg:items-start"}`}>
        <div className={isMobile ? "space-y-3 px-3" : "space-y-3"}>
          <div ref={questionAnchorRef} className="scroll-mt-16 space-y-2">
            {currentStatus === "empty" ? (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-[11px] text-primary">
                Skip করা question — এখন True/False বা অপশনে ক্লিক করে দাগাতে পারেন।
              </div>
            ) : null}
            {currentStatus === "partial" ? (
              <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                Partial — বাকি statement/অপশন এখন দাগিয়ে Fully touched করতে পারেন।
              </div>
            ) : null}

            <PracticeQuestionBlock
              key={q.id}
              q={q}
              qNum={qIndex + 1}
              locked={locked}
              revealed={revealed}
              onRevealMcq={revealMcq}
              onRevealSba={revealSba}
            />
          </div>

          {!isMobile ? (
            <p className="text-[11px] text-muted-foreground">
              Jump box-এ সবুজ = সঠিক, লাল = ভুল, ধূসর = skip।
            </p>
          ) : null}
        </div>

        {!isMobile ? (
          <div className="sticky top-16">
            <PracticeSessionNav summary={summary} currentIndex={qIndex} onJump={goTo} />
          </div>
        ) : null}
      </div>

      {/* Prev left corner · Next (+ Submit) right corner — above mobile dock */}
      <div
        className={cn(
          "pointer-events-none fixed z-30",
          isMobile ? "bottom-[4.75rem] left-3" : "safe-area-pb bottom-4 left-4 md:bottom-5 md:left-6",
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="pointer-events-auto h-9 rounded-full border bg-background/95 px-3 text-xs shadow-md backdrop-blur"
          onClick={goPrev}
          disabled={qIndex <= 0}
          aria-label="Previous"
        >
          <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
          Prev
        </Button>
      </div>
      <div
        className={cn(
          "pointer-events-none fixed z-30 flex items-center gap-1.5",
          isMobile ? "bottom-[4.75rem] right-3" : "safe-area-pb bottom-4 right-4 md:bottom-5 md:right-6",
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="pointer-events-auto h-9 rounded-full border bg-background/95 px-3 text-xs shadow-md backdrop-blur"
          onClick={goNext}
          disabled={qIndex >= questions.length - 1}
          aria-label="Next"
        >
          Next
          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          className="pointer-events-auto h-9 rounded-full px-3 text-xs shadow-md"
          onClick={submitPractice}
          disabled={submitting}
        >
          <Send className="mr-1 h-3 w-3" />
          Submit
        </Button>
      </div>

      {isMobile ? (
        <PracticeSessionNav
          summary={summary}
          currentIndex={qIndex}
          onJump={goTo}
          variant="mobileDock"
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-2 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
