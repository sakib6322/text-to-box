import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  fetchAttemptResult,
  type AnswerDistribution,
  type ExamPerformance,
  type ExamQuestion,
} from "@/lib/exams";
import { ExamPaperView } from "@/components/ExamPaperView";
import { ExamTimeline } from "@/components/ExamTimeline";
import { ExamPerformanceCard } from "@/components/ExamPerformanceCard";

export default function ExamResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [score, setScore] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [performance, setPerformance] = useState<ExamPerformance | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [scheduledStart, setScheduledStart] = useState<string | null>(null);
  const [scheduledEnd, setScheduledEnd] = useState<string | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState<string | null>(null);
  const [attemptEndsAt, setAttemptEndsAt] = useState<string | null>(null);
  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    fetchAttemptResult(attemptId)
      .then(({ attempt, exam, questions: qs, answerDistribution: dist }) => {
        setTitle(exam?.title ?? "Exam result");
        setScore(attempt.performance?.scoreWithNegative ?? attempt.score);
        setTotalMarks(attempt.totalMarks);
        setPerformance(attempt.performance ?? null);
        setPosition(attempt.position ?? null);
        setQuestions(qs);
        setScheduledStart(exam?.scheduledStart ?? null);
        setScheduledEnd(exam?.scheduledEnd ?? null);
        setAttemptStartedAt(attempt.startedAt);
        setAttemptEndsAt(attempt.endsAt);
        setAnswerDistribution(dist ?? null);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const wrongCount = questions.length - correctCount;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div className="flex items-center gap-3 px-1">
        <Button asChild variant="ghost" size="icon">
          <Link to="/my-exams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="page-title-static text-lg">{title}</h1>
          <p className="text-xs text-muted-foreground">Result & full review</p>
        </div>
      </div>

      <Card className="p-5 text-center space-y-3">
        <p className="text-3xl font-bold tabular-nums text-primary">
          {score.toFixed(1)} <span className="text-lg text-muted-foreground font-normal">/ {totalMarks}</span>
        </p>
        <Badge variant="secondary" className="text-sm">{pct}%</Badge>
        <div className="flex justify-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {correctCount} correct
          </span>
          <span className="inline-flex items-center gap-1 text-red-600">
            <XCircle className="h-3.5 w-3.5" /> {wrongCount} wrong
          </span>
        </div>
      </Card>

      <ExamTimeline
        scheduledStart={scheduledStart}
        scheduledEnd={scheduledEnd}
        attemptStartedAt={attemptStartedAt}
        attemptEndsAt={attemptEndsAt}
      />

      {performance ? (
        <Card className="p-4">
          <ExamPerformanceCard performance={performance} position={position} totalMarks={totalMarks} />
        </Card>
      ) : null}

      <Card className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Question paper review</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Correct answer, your submission, and how other students answered
          </p>
        </div>
        <ExamPaperView
          questions={questions}
          showSolutionsDefault
          showToggle
          showConceptButtons
          answerDistribution={answerDistribution}
          showAnswerReview
        />
      </Card>
    </div>
  );
}
