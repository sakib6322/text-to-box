import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { getPracticeSession, savePracticeSession, type PracticeAnswer } from "@/lib/userProgress";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

type QFull = {
  id: string;
  questionMode: "mcq" | "sba";
  mcq?: {
    stem?: string;
    trueFalse?: { id?: string; statement: string; correct: "true" | "false"; explanation?: string }[];
  } | null;
  sba?: {
    stem?: string;
    options?: string[];
    correctIndex?: number;
    optionExplanations?: string[];
  } | null;
};

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

type QuestionBlockProps = {
  q: QFull;
  qNum: number;
  locked: Record<string, boolean>;
  revealed: Record<string, { given: unknown; correct: boolean }>;
  readOnly?: boolean;
  onRevealMcq?: (stmtKey: string, stmtId: string, correct: "true" | "false", given: "true" | "false", explanation?: string) => void;
  onRevealSba?: (optionIndex: number) => void;
};

function QuestionBlock({ q, qNum, locked, revealed, readOnly, onRevealMcq, onRevealSba }: QuestionBlockProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] tabular-nums">Q{qNum}</Badge>
        <Badge variant="outline" className="text-[10px] uppercase">{q.questionMode}</Badge>
      </div>
      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
        {q.mcq?.stem ?? q.sba?.stem ?? "—"}
      </p>

      {q.questionMode === "mcq" && q.mcq?.trueFalse?.length ? (
        <div className="space-y-3">
          {q.mcq.trueFalse.map((stmt, i) => {
            const sid = stmt.id ?? String(i);
            const key = `${q.id}:${sid}`;
            const isLocked = locked[key];
            const rev = revealed[key];
            return (
              <div key={key} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <p className="text-xs">{i + 1}. {stmt.statement}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["true", "false"] as const).map((val) => {
                    const isCorrectOpt = stmt.correct === val;
                    const picked = rev?.given === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isLocked || readOnly}
                        onClick={() => onRevealMcq?.(key, sid, stmt.correct, val, stmt.explanation)}
                        className={[
                          "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                          isLocked && picked && rev?.correct ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "",
                          isLocked && picked && !rev?.correct ? "border-red-500 bg-red-50 text-red-800" : "",
                          isLocked && !picked && isCorrectOpt ? "border-emerald-300 bg-emerald-50/50" : "",
                          !isLocked && !readOnly ? "hover:border-primary cursor-pointer" : "opacity-80 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {val === "true" ? "True" : "False"}
                      </button>
                    );
                  })}
                </div>
                {isLocked && stmt.explanation?.trim() ? (
                  <p className="text-[11px] text-muted-foreground border-t pt-2">{stmt.explanation}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {q.questionMode === "sba" && q.sba?.options?.length ? (
        <div className="space-y-2">
          {q.sba.options.map((opt, i) => {
            const isLocked = locked[q.id];
            const rev = revealed[q.id];
            const isCorrect = q.sba?.correctIndex === i;
            const picked = rev?.given === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isLocked || readOnly}
                onClick={() => onRevealSba?.(i)}
                className={[
                  "w-full text-left rounded-lg border p-3 text-sm transition-colors flex items-start gap-2",
                  isLocked && picked && rev?.correct ? "border-emerald-500 bg-emerald-50" : "",
                  isLocked && picked && !rev?.correct ? "border-red-500 bg-red-50" : "",
                  isLocked && !picked && isCorrect ? "border-emerald-300 bg-emerald-50/50" : "",
                  !isLocked && !readOnly ? "hover:border-primary cursor-pointer" : "opacity-80 cursor-not-allowed",
                ].join(" ")}
              >
                <span className="font-medium shrink-0">{String.fromCharCode(97 + i)}.</span>
                <span className="flex-1">{opt}</span>
                {isLocked && picked ? (
                  rev?.correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                ) : null}
              </button>
            );
          })}
          {locked[q.id] && q.sba?.optionExplanations?.length ? (
            <div className="text-[11px] text-muted-foreground border-t pt-2 space-y-1">
              {(() => {
                const picked = Number(revealed[q.id]?.given);
                const expl =
                  (Number.isFinite(picked) && q.sba?.optionExplanations?.[picked]?.trim()) ||
                  q.sba?.optionExplanations?.[q.sba.correctIndex ?? -1]?.trim();
                return expl ? <p>{expl}</p> : null;
              })()}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default function PracticeTake() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const reviewMode = searchParams.get("review") === "1";
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sessionTitle, setSessionTitle] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [questions, setQuestions] = useState<QFull[]>([]);
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
      const res = await fetch(apiUrl("/api/questions"));
      const data = (await res.json()) as { rows?: QFull[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Load failed");
      const byId = new Map((data.rows ?? []).map((q) => [q.id, q]));
      setQuestions(session.questionIds.map((id) => byId.get(id)).filter(Boolean) as QFull[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [sessionId, navigate, reviewMode]);

  useEffect(() => {
    load();
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
        <div className="sticky top-0 z-20 bg-background/95 border-b px-4 py-3 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/study/progress"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{sessionTitle}</p>
            <p className="text-sm font-medium">Full review</p>
          </div>
          <Badge variant="secondary" className="tabular-nums">{score} / {totalAnswered}</Badge>
        </div>
        <div className={`space-y-4 ${isMobile ? "px-4" : ""}`}>
          {questions.map((question, i) => (
            <QuestionBlock
              key={question.id}
              q={question}
              qNum={i + 1}
              locked={locked}
              revealed={revealed}
              readOnly
            />
          ))}
        </div>
        <div className={`flex gap-2 ${isMobile ? "fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t safe-area-pb flex-col" : "pt-2"}`}>
          <Button asChild className={isMobile ? "w-full h-12" : ""}>
            <Link to={`/concept/${conceptId}/learn`}>Study & practice again</Link>
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
      <div className={`${isMobile ? "max-w-lg" : "max-w-xl"} mx-auto p-6 space-y-4 text-center`}>
        <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
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
        <Button asChild variant="link"><Link to="/study/progress">Go back</Link></Button>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="sticky top-0 z-20 bg-background/95 border-b px-4 py-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/study/progress"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{sessionTitle}</p>
          <p className="text-sm font-medium tabular-nums">Q{qIndex + 1} / {questions.length}</p>
        </div>
        <Badge variant="secondary" className="tabular-nums">{score} correct</Badge>
      </div>

      <div className={isMobile ? "px-4" : ""}>
        <QuestionBlock
          q={q}
          qNum={qIndex + 1}
          locked={locked}
          revealed={revealed}
          onRevealMcq={revealMcq}
          onRevealSba={revealSba}
        />
      </div>

      {q.questionMode === "mcq" ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t safe-area-pb">
          <Button
            className="w-full h-12 max-w-lg mx-auto block"
            onClick={goNextQuestion}
            disabled={!q.mcq?.trueFalse?.every((stmt, i) => locked[`${q.id}:${stmt.id ?? i}`])}
          >
            {qIndex >= questions.length - 1 ? "Finish practice" : "Next question"}
          </Button>
        </div>
      ) : locked[q.id] ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t safe-area-pb">
          <Button className="w-full h-12 max-w-lg mx-auto block" onClick={goNextQuestion}>
            {qIndex >= questions.length - 1 ? "Finish practice" : "Next question"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
