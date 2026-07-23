import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AppBackButton } from "@/components/AppBackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PracticeQuestionBlock, type PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { apiUrl } from "@/lib/apiBase";
import { getPracticeSession, savePracticeSession, type PracticeAnswer } from "@/lib/userProgress";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

function gradeMcqStatement(correct: "true" | "false", given: "true" | "false") {
  return correct === given;
}

function restoreFromAnswers(
  saved: PracticeAnswer[],
): { locked: Record<string, boolean>; revealed: Record<string, { given: unknown; correct: boolean }> } {
  const locked: Record<string, boolean> = {};
  const revealed: Record<string, { given: unknown; correct: boolean }> = {};
  for (const a of saved) {
    locked[a.questionId] = true;
    const ans = a.answer as { value?: unknown; selectedIndex?: number };
    revealed[a.questionId] = {
      given: ans.value ?? ans.selectedIndex,
      correct: a.isCorrect,
    };
  }
  return { locked, revealed };
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
    if (reviewMode && session.completedAt && session.answers?.length) {
      const restored = restoreFromAnswers(session.answers);
      setLocked(restored.locked);
      setRevealed(restored.revealed);
      setAnswers(session.answers);
    }
    setLoading(true);
    try {
      const ids = session.questionIds.join(",");
      const res = await fetch(apiUrl(`/api/questions?ids=${encodeURIComponent(ids)}`));
      const data = (await res.json()) as { rows?: PracticeQuestionFull[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      const byId = new Map((data.rows ?? []).map((q) => [q.id, q]));
      setQuestions(session.questionIds.map((id) => byId.get(id)).filter(Boolean) as PracticeQuestionFull[]);
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
  const score = useMemo(() => {
    if (reviewMode) {
      const session = sessionId ? getPracticeSession(sessionId) : null;
      return session?.score ?? answers.filter((a) => a.isCorrect).length;
    }
    return answers.filter((a) => a.isCorrect).length;
  }, [answers, reviewMode, sessionId]);

  const totalAnswered = useMemo(() => {
    if (reviewMode) {
      const session = sessionId ? getPracticeSession(sessionId) : null;
      return session?.total ?? answers.length;
    }
    return answers.length;
  }, [answers, reviewMode, sessionId]);

  const finish = (finalAnswers: PracticeAnswer[]) => {
    if (!sessionId) return;
    const session = getPracticeSession(sessionId);
    if (!session) return;
    savePracticeSession({
      ...session,
      completedAt: new Date().toISOString(),
      score: finalAnswers.filter((a) => a.isCorrect).length,
      total: finalAnswers.length,
      answers: finalAnswers,
    });
    setDone(true);
  };

  const revealMcq = (stmtKey: string, stmtId: string, correct: "true" | "false", given: "true" | "false", explanation?: string) => {
    if (locked[stmtKey] || reviewMode) return;
    const ok = gradeMcqStatement(correct, given);
    setLocked((p) => ({ ...p, [stmtKey]: true }));
    setRevealed((p) => ({ ...p, [stmtKey]: { given, correct: ok } }));
    const entry: PracticeAnswer = {
      questionId: `${q!.id}:${stmtId}`,
      answer: { value: given, explanation },
      isCorrect: ok,
      answeredAt: new Date().toISOString(),
    };
    setAnswers((prev) => [...prev, entry]);
  };

  const revealSba = (optionIndex: number) => {
    if (!q || locked[q.id] || reviewMode) return;
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
    setAnswers((prev) => [...prev, entry]);
  };

  const goNextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
    } else {
      setAnswers((current) => {
        finish(current);
        return current;
      });
    }
  };

  const shellClass = isMobile ? "mx-auto max-w-lg pb-28 space-y-4" : "mx-auto max-w-3xl pb-10 space-y-4 px-2";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (reviewMode && questions.length > 0) {
    return (
      <div className={shellClass}>
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 py-3">
          <AppBackButton fallback="/study/progress" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{sessionTitle}</p>
            <p className="text-sm font-medium">Full review</p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {score} / {totalAnswered}
          </Badge>
        </div>
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
        <div
          className={`flex gap-2 ${isMobile ? "safe-area-pb fixed bottom-0 left-0 right-0 flex-col border-t bg-background/95 p-4" : "pt-2"}`}
        >
          <Button asChild className={isMobile ? "h-12 w-full" : ""}>
            <Link to={`/concept/${conceptId}/details`}>Study & practice again</Link>
          </Button>
          <Button asChild variant="outline" className={isMobile ? "w-full" : ""}>
            <Link to="/study/progress">Back to My progress</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={`${isMobile ? "max-w-lg" : "max-w-xl"} mx-auto space-y-4 p-6 text-center`}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h1 className="text-xl font-bold">Practice complete</h1>
        <p className="text-muted-foreground">
          Score: {score} / {answers.length}
        </p>
        <Button asChild className="w-full">
          <Link to={`/practice/session/${sessionId}?review=1`}>View full review</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link to="/study/progress">View progress report</Link>
        </Button>
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
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 py-3">
        <AppBackButton fallback="/study/progress" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{sessionTitle}</p>
          <p className="text-sm font-medium tabular-nums">
            Q{qIndex + 1} / {questions.length}
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {score} correct
        </Badge>
      </div>

      <div className={isMobile ? "px-4" : ""}>
        <PracticeQuestionBlock
          q={q}
          qNum={qIndex + 1}
          locked={locked}
          revealed={revealed}
          onRevealMcq={revealMcq}
          onRevealSba={revealSba}
        />
      </div>

      {q.questionMode === "mcq" ? (
        <div className="safe-area-pb fixed bottom-0 left-0 right-0 border-t bg-background/95 p-4">
          <Button
            className="mx-auto block h-12 w-full max-w-lg"
            onClick={goNextQuestion}
            disabled={!q.mcq?.trueFalse?.every((stmt, i) => locked[`${q.id}:${stmt.id ?? i}`])}
          >
            {qIndex >= questions.length - 1 ? "Finish practice" : "Next question"}
          </Button>
        </div>
      ) : locked[q.id] ? (
        <div className="safe-area-pb fixed bottom-0 left-0 right-0 border-t bg-background/95 p-4">
          <Button className="mx-auto block h-12 w-full max-w-lg" onClick={goNextQuestion}>
            {qIndex >= questions.length - 1 ? "Finish practice" : "Next question"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
