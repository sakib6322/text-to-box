import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, ChevronRight, Clock, FileText, Loader2, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getSession } from "@/lib/auth";
import { fetchExam, fetchMyExams, formatDuration, formatScheduleRange, type ExamQuestion, type ExamSummary } from "@/lib/exams";
import { ExamPaperLoading, ExamPaperView } from "@/components/ExamPaperView";
import { ExamTimeline } from "@/components/ExamTimeline";
import { useAppShell, useHeaderSearch } from "@/components/AppShellContext";

const liveColors: Record<string, string> = {
  scheduled: "bg-blue-500/15 text-blue-700",
  active: "bg-emerald-500/15 text-emerald-700",
  completed: "bg-muted text-muted-foreground",
};

export default function MyExams() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paperExam, setPaperExam] = useState<ExamSummary | null>(null);
  const [paperQuestions, setPaperQuestions] = useState<ExamQuestion[]>([]);
  const [paperLoading, setPaperLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { pushNotification } = useAppShell();
  const lastReadyCountRef = useRef<number>(0);
  const headerSearch = useMemo(() => ({
    value: search,
    onChange: setSearch,
    placeholder: "Search my exams...",
  }), [search]);
  useHeaderSearch(headerSearch);

  const load = useCallback(async () => {
    const email = getSession()?.email;
    if (!email) {
      toast.error("Please log in");
      return;
    }
    setLoading(true);
    try {
      setExams(await fetchMyExams(email));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const ready = exams.filter((e) => e.canStart).length;
    if (ready > 0 && ready !== lastReadyCountRef.current) {
      pushNotification({
        title: "Exam ready",
        message: `${ready} exam এখন attend করা যাবে`,
      });
    }
    lastReadyCountRef.current = ready;
  }, [exams, pushNotification]);

  const openPaper = async (exam: ExamSummary) => {
    setPaperExam(exam);
    setPaperQuestions([]);
    setPaperLoading(true);
    try {
      const data = await fetchExam(exam.id);
      setPaperQuestions(data.questions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load question paper");
      setPaperExam(null);
    } finally {
      setPaperLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-8">
      <div className="px-1">
        <h1 className="page-title-static text-xl">My exams</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Schedule অনুযায়ী exam · Attend · Result review</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : exams.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground border-dashed text-sm">
          কোনো scheduled exam নেই। Admin schedule set করলে এখানে দেখাবে।
        </Card>
      ) : (
        <div className="space-y-3">
          {exams
            .filter((exam) =>
              `${exam.title} ${exam.description}`.toLowerCase().includes(search.trim().toLowerCase()),
            )
            .map((exam) => {
            const live = exam.liveStatus ?? exam.status;
            const attempt = exam.attempt;
            const done = attempt?.status === "submitted" || attempt?.status === "expired";
            const inProgress = attempt?.status === "in_progress";
            const canStart = exam.canStart && !done;

            return (
              <Card key={exam.id} className="overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold leading-snug">{exam.title}</h2>
                    <Badge className={liveColors[live] ?? "bg-muted"}>{live}</Badge>
                  </div>

                  <ExamTimeline
                    scheduledStart={exam.scheduledStart}
                    scheduledEnd={exam.scheduledEnd}
                    attemptStartedAt={attempt?.startedAt ?? null}
                    attemptEndsAt={attempt?.endsAt ?? null}
                  />

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatScheduleRange(exam.scheduledStart, exam.scheduledEnd)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>{formatDuration(exam.durationMinutes)} · {exam.totalMarks} marks</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => openPaper(exam)}>
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Question paper
                  </Button>

                  {done && attempt ? (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium tabular-nums">
                            {attempt.score} / {attempt.totalMarks}
                          </span>
                        </div>
                        <Button asChild size="sm">
                          <Link to={`/my-exams/result/${attempt.id}`}>
                            Full review <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                          </Link>
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Wrong/correct, answers, explanations ও concept details দেখুন
                      </p>
                    </div>
                  ) : null}

                  {canStart ? (
                    <Button asChild className="w-full h-11 text-base">
                      <Link to={`/my-exams/take/${exam.id}`}>
                        {inProgress ? "Continue exam" : "Attend exam"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  ) : null}

                  {live === "scheduled" && !attempt ? (
                    <p className="text-xs text-center text-muted-foreground py-1">Schedule শুরু হলে Attend exam বাটন আসবে</p>
                  ) : null}

                  {live === "completed" && !done ? (
                    <p className="text-xs text-center text-muted-foreground">Exam window শেষ — attempt নেই</p>
                  ) : null}
                </div>
              </Card>
            );
            })}
        </div>
      )}

      <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <BookOpen className="h-5 w-5 shrink-0 text-primary" />
        <p>Question paper থেকে answers toggle করে দেখুন · Result page-এ পুরো review পাবেন</p>
      </Card>

      <Dialog open={Boolean(paperExam)} onOpenChange={(open) => !open && setPaperExam(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{paperExam?.title ?? "Question paper"}</DialogTitle>
          </DialogHeader>
          {paperLoading ? (
            <ExamPaperLoading />
          ) : (
            <ExamPaperView questions={paperQuestions} showConceptButtons />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
