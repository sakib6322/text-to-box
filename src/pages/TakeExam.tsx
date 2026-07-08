import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { startExam, submitExam, type ExamQuestion } from "@/lib/exams";
import { ExamTimeline } from "@/components/ExamTimeline";

type McqAnswers = Record<string, "true" | "false">;
type SbaAnswers = Record<string, number>;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [scheduledStart, setScheduledStart] = useState<string | null>(null);
  const [scheduledEnd, setScheduledEnd] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<McqAnswers>({});
  const [sbaAnswers, setSbaAnswers] = useState<SbaAnswers>({});
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const email = getSession()?.email;
    if (!email || !examId) return;
    setLoading(true);
    try {
      const data = await startExam(examId, email);
      setAttemptId(data.attempt.id);
      setStartedAt(data.attempt.startedAt);
      setEndsAt(data.attempt.endsAt);
      setScheduledStart(data.exam.scheduledStart);
      setScheduledEnd(data.exam.scheduledEnd);
      setTitle(data.exam.title);
      setQuestions(data.questions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cannot start exam");
      navigate("/my-exams");
    } finally {
      setLoading(false);
    }
  }, [examId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => (endsAt ? new Date(endsAt).getTime() - now : 0), [endsAt, now]);
  const expired = remaining <= 0 && !loading;
  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of questions) {
      if (q.questionMode === "sba") {
        if (sbaAnswers[q.id] != null && sbaAnswers[q.id] >= 0) count += 1;
      } else {
        const statements = q.mcq?.trueFalse ?? [];
        if (statements.some((stmt, i) => mcqAnswers[`${q.id}:${stmt.id ?? i}`])) count += 1;
      }
    }
    return count;
  }, [questions, mcqAnswers, sbaAnswers]);

  const buildAnswers = useCallback(() => {
    return questions.map((q) => {
      if (q.questionMode === "mcq") {
        const statements = q.mcq?.trueFalse ?? [];
        return {
          questionId: q.id,
          answer: {
            answers: statements.map((stmt, i) => ({
              id: stmt.id ?? String(i),
              value: mcqAnswers[`${q.id}:${stmt.id ?? i}`] ?? "false",
            })),
          },
        };
      }
      return {
        questionId: q.id,
        answer: { selectedIndex: sbaAnswers[q.id] ?? -1 },
      };
    });
  }, [questions, mcqAnswers, sbaAnswers]);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (!examId || !attemptId || submitting) return;
      setSubmitting(true);
      try {
        const result = await submitExam(examId, attemptId, buildAnswers());
        toast.success(auto ? "Time up — exam submitted" : "Exam submitted");
        navigate(`/my-exams/result/${result.attemptId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, buildAnswers, examId, navigate, submitting],
  );

  useEffect(() => {
    if (expired && attemptId && !submitting) handleSubmit(true);
  }, [expired, attemptId, submitting, handleSubmit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      <div className="sticky top-0 z-30 bg-background/95 border-b px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/my-exams">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </p>
          </div>
          <Badge variant={remaining < 120_000 ? "destructive" : "secondary"} className="tabular-nums gap-1 px-2.5 py-1">
            <Clock className="h-3 w-3" />
            {formatCountdown(remaining)}
          </Badge>
        </div>

        <ExamTimeline
          scheduledStart={scheduledStart}
          scheduledEnd={scheduledEnd}
          attemptStartedAt={startedAt}
          attemptEndsAt={endsAt}
          now={now}
        />
      </div>

      <div className="px-4 py-4 space-y-4">
        {questions.map((q, idx) => (
          <Card key={q.id} className="p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className="text-[10px]">Q{idx + 1} · {q.questionMode.toUpperCase()}</Badge>
              <span className="text-[10px] text-muted-foreground tabular-nums">{q.examMarks ?? q.marks ?? 1} mark</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {q.mcq?.stem ?? q.sba?.stem ?? "—"}
            </p>

            {q.questionMode === "mcq" && q.mcq?.trueFalse?.length ? (
              <div className="space-y-3">
                {q.mcq.trueFalse.map((stmt, i) => {
                  const key = `${q.id}:${stmt.id ?? i}`;
                  const selected = mcqAnswers[key];
                  return (
                    <div key={key} className="rounded-lg border p-3 space-y-2 bg-muted/20">
                      <p className="text-xs leading-snug">{i + 1}. {stmt.statement}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["true", "false"] as const).map((val) => {
                          const checked = selected === val;
                          const inputId = `${key}-${val}`;
                          return (
                            <label
                              key={val}
                              htmlFor={inputId}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                                checked ? "border-primary bg-primary/10" : "border-border bg-background"
                              }`}
                            >
                              <Checkbox
                                id={inputId}
                                checked={checked}
                                onCheckedChange={() => setMcqAnswers((prev) => ({ ...prev, [key]: val }))}
                              />
                              <span className="text-sm font-medium">{val === "true" ? "True" : "False"}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {q.questionMode === "sba" && q.sba?.options?.length ? (
              <div className="space-y-2">
                {q.sba.options.map((opt, i) => {
                  const checked = sbaAnswers[q.id] === i;
                  const inputId = `${q.id}-${i}`;
                  return (
                    <label
                      key={i}
                      htmlFor={inputId}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/10" : "border-border bg-background"
                      }`}
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={() => setSbaAnswers((prev) => ({ ...prev, [q.id]: i }))}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={inputId} className="text-sm leading-snug cursor-pointer">
                          <span className="font-medium mr-1">{String.fromCharCode(97 + i)}.</span>
                          {opt}
                        </Label>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t safe-area-pb">
        <Button className="w-full h-12 text-base" onClick={() => handleSubmit(false)} disabled={submitting || expired}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit exam · {answeredCount}/{questions.length}
        </Button>
      </div>
    </div>
  );
}
