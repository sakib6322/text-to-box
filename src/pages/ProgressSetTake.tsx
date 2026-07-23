import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AppBackButton } from "@/components/AppBackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { fetchProgressSets, submitProgressSet } from "@/lib/progressApi";
import { toast } from "sonner";

type QFull = {
  id: string;
  questionMode: "mcq" | "sba";
  mcq?: { stem?: string; trueFalse?: { id?: string; statement: string; correct: "true" | "false" }[] } | null;
  sba?: { stem?: string; options?: string[]; correctIndex?: number } | null;
};

export default function ProgressSetTake() {
  const { setId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") ?? "";
  const conceptId = searchParams.get("conceptId") ?? "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [passPercent, setPassPercent] = useState(70);
  const [questions, setQuestions] = useState<QFull[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const wrongIdsRef = useRef<string[]>([]);
  const [done, setDone] = useState(false);
  const [passed, setPassed] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!setId || !courseId) return;
    setLoading(true);
    try {
      const sets = await fetchProgressSets(courseId);
      const set = sets.find((s) => s.id === setId);
      if (!set) throw new Error("Set not found");
      setTitle(set.title);
      setPassPercent(set.pass_percent);
      scoreRef.current = 0;
      wrongIdsRef.current = [];
      setScore(0);
      setWrongIds([]);
      setQIndex(0);
      setDone(false);
      setLocked({});
      const ids = set.question_ids ?? [];
      if (!ids.length) {
        setQuestions([]);
        return;
      }
      const r = await fetch(apiUrl(`/api/questions?ids=${ids.join(",")}`));
      const j = (await r.json()) as { rows?: QFull[] };
      const map = new Map((j.rows ?? []).map((q) => [q.id, q]));
      setQuestions(ids.map((id) => map.get(id)).filter(Boolean) as QFull[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [setId, courseId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = questions[qIndex];
  const total = questions.length;

  const answerMcq = (stmtKey: string, correct: "true" | "false", given: "true" | "false", qId: string) => {
    if (locked[stmtKey]) return;
    const ok = correct === given;
    setLocked((p) => ({ ...p, [stmtKey]: true }));
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else if (!wrongIdsRef.current.includes(qId)) {
      wrongIdsRef.current = [...wrongIdsRef.current, qId];
      setWrongIds(wrongIdsRef.current);
    }
    setTimeout(() => {
      if (qIndex < total - 1) setQIndex((i) => i + 1);
      else void finish(scoreRef.current, wrongIdsRef.current);
    }, 400);
  };

  const answerSba = (optionIndex: number) => {
    if (!q || locked[q.id]) return;
    const ok = optionIndex === (q.sba?.correctIndex ?? -1);
    setLocked((p) => ({ ...p, [q.id]: true }));
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    } else if (!wrongIdsRef.current.includes(q.id)) {
      wrongIdsRef.current = [...wrongIdsRef.current, q.id];
      setWrongIds(wrongIdsRef.current);
    }
    setTimeout(() => {
      if (qIndex < total - 1) setQIndex((i) => i + 1);
      else void finish(scoreRef.current, wrongIdsRef.current);
    }, 400);
  };

  const finish = async (submitScore: number, submitWrong: string[]) => {
    try {
      const uniqueWrong = [...new Set(submitWrong)];
      const res = await submitProgressSet(setId, {
        score: submitScore,
        total,
        answers: { score: submitScore, total },
        wrong_question_ids: uniqueWrong,
      });
      setFinalScore(submitScore);
      setPassed(!!res.passed);
      setDone(true);
      if (res.passed) toast.success(`Passed (${passPercent}% required)`);
      else toast.error(`Did not pass — need ${passPercent}%`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-center">
        {passed ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : <XCircle className="mx-auto h-12 w-12 text-destructive" />}
        <h1 className="text-xl font-bold">{passed ? "Set passed" : "Try again"}</h1>
        <p className="text-muted-foreground">
          Score: {finalScore} / {total}
        </p>
        <Button
          className="w-full"
          onClick={() => navigate(conceptId ? `/concept/${conceptId}/learn?courseId=${courseId}` : `/my-courses/${courseId}`)}
        >
          Back to concept
        </Button>
      </div>
    );
  }

  if (!q) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">
        No questions in this set.
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10 px-3">
      <div className="flex items-center gap-2">
        <AppBackButton
          fallback={
            conceptId
              ? `/concept/${conceptId}/learn?courseId=${courseId}`
              : `/my-courses/${courseId}`
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">
            Q{qIndex + 1}/{total} · Pass {passPercent}%
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {score}/{total}
        </Badge>
      </div>

      <Card className="space-y-4 p-4">
        <Badge variant="outline" className="text-[10px] uppercase">
          {q.questionMode}
        </Badge>
        <p className="text-sm font-medium leading-relaxed">{q.mcq?.stem ?? q.sba?.stem}</p>

        {q.questionMode === "sba" && q.sba?.options ? (
          <div className="grid gap-2">
            {q.sba.options.map((opt, i) => (
              <Button key={i} variant="outline" className="h-auto justify-start whitespace-normal py-2 text-left text-xs" disabled={!!locked[q.id]} onClick={() => answerSba(i)}>
                {String.fromCharCode(65 + i)}. {opt}
              </Button>
            ))}
          </div>
        ) : null}

        {q.questionMode === "mcq" && q.mcq?.trueFalse?.length ? (
          <div className="space-y-3">
            {q.mcq.trueFalse.map((stmt, i) => {
              const sid = stmt.id ?? String(i);
              const key = `${q.id}:${sid}`;
              return (
                <div key={key} className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs">{stmt.statement}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["true", "false"] as const).map((val) => (
                      <Button key={val} size="sm" variant="outline" disabled={!!locked[key]} onClick={() => answerMcq(key, stmt.correct, val, q.id)}>
                        {val === "true" ? "True" : "False"}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
