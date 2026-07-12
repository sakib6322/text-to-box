import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, BookOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPracticeSessions, getStudyProgressMap, studyCompletionPct } from "@/lib/userProgress";

export default function StudyProgressPage() {
  const studyMap = getStudyProgressMap();
  const studyList = Object.values(studyMap).sort(
    (a, b) => new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime(),
  );
  const practiceList = getPracticeSessions();

  return (
    <div className="mx-auto max-w-lg pb-8 space-y-4">
      <div className="sticky top-0 z-20 bg-background/95 border-b px-4 py-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/suggestions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="font-semibold text-sm">My progress</h1>
          <p className="text-[10px] text-muted-foreground">Study & practice report</p>
        </div>
      </div>

      <Card className="mx-4 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Summary</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold tabular-nums">{studyList.length}</p>
            <p className="text-muted-foreground mt-1">Concepts studied</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold tabular-nums">{practiceList.filter((p) => p.completedAt).length}</p>
            <p className="text-muted-foreground mt-1">Practice exams done</p>
          </div>
        </div>
      </Card>

      <div className="px-4 space-y-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Study progress
        </h2>
        {studyList.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">No study progress yet.</Card>
        ) : (
          studyList.map((s) => {
            const pct = studyCompletionPct(s);
            return (
              <Card key={s.conceptId} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{s.conceptName}</p>
                  <Badge variant="secondary" className="tabular-nums shrink-0">{pct}%</Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">
                  {s.studiedKeyPointIds.length} / {s.totalKeyPoints} key points ·{" "}
                  {new Date(s.lastStudiedAt).toLocaleDateString()}
                </p>
                <Button asChild variant="outline" size="sm" className="w-full h-8 text-xs">
                  <Link to={`/concept/${s.conceptId}/learn`}>Continue study</Link>
                </Button>
              </Card>
            );
          })
        )}
      </div>

      <div className="px-4 space-y-2 pb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" /> Practice history
        </h2>
        {practiceList.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">No practice exams yet.</Card>
        ) : (
          practiceList.map((p) => (
            <Card key={p.id} className="p-3 space-y-1">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="text-[10px] text-muted-foreground">{p.conceptName} · {p.questionIds.length} questions</p>
              {p.completedAt ? (
                <p className="text-xs tabular-nums">
                  Score: <span className="font-semibold text-primary">{p.score ?? 0}</span> / {p.total ?? p.questionIds.length}
                  {" · "}{new Date(p.completedAt).toLocaleDateString()}
                </p>
              ) : (
                <Button asChild size="sm" variant="outline" className="h-7 text-xs mt-1">
                  <Link to={`/practice/session/${p.id}`}>Resume</Link>
                </Button>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
