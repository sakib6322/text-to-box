import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, BookOpen, GraduationCap, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getPracticeSessions, getStudyProgressMap, hydrateProgressFromServer, studyCompletionPct } from "@/lib/userProgress";
import { useIsMobile } from "@/hooks/use-mobile";

export default function StudyProgressPage() {
  const isMobile = useIsMobile();
  const [, setTick] = useState(0);

  useEffect(() => {
    void hydrateProgressFromServer().then(() => setTick((n) => n + 1));
  }, []);
  const studyMap = getStudyProgressMap();
  const studyList = Object.values(studyMap).sort(
    (a, b) => new Date(b.lastStudiedAt).getTime() - new Date(a.lastStudiedAt).getTime(),
  );
  const practiceList = getPracticeSessions();

  const shellClass = isMobile ? "mx-auto max-w-lg pb-8 space-y-4" : "mx-auto max-w-5xl pb-10 space-y-6 px-2";

  return (
    <div className={shellClass}>
      <div className={`sticky top-0 z-20 bg-background/95 border-b ${isMobile ? "px-4 py-3" : "px-2 py-4 rounded-lg"}`}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <h1 className={`font-semibold ${isMobile ? "text-sm" : "text-xl"}`}>My progress</h1>
            <p className="text-[10px] text-muted-foreground sm:text-xs">Study & practice report</p>
          </div>
          <Button asChild variant="outline" size="sm" className="text-xs h-8 shrink-0">
            <Link to="/suggestions">Suggestions</Link>
          </Button>
        </div>
      </div>

      <Card className={`space-y-2 ${isMobile ? "mx-4 p-4" : "p-5"}`}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Summary</h2>
        </div>
        <div className={`grid gap-3 text-center text-xs ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold tabular-nums">{studyList.length}</p>
            <p className="text-muted-foreground mt-1">Concepts studied</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-2xl font-bold tabular-nums">{practiceList.filter((p) => p.completedAt).length}</p>
            <p className="text-muted-foreground mt-1">Practice exams done</p>
          </div>
          {!isMobile ? (
            <>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">
                  {studyList.reduce((n, s) => n + s.studiedKeyPointIds.length, 0)}
                </p>
                <p className="text-muted-foreground mt-1">Key points studied</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold tabular-nums">{practiceList.filter((p) => !p.completedAt).length}</p>
                <p className="text-muted-foreground mt-1">In progress</p>
              </div>
            </>
          ) : null}
        </div>
      </Card>

      <div className={`space-y-2 ${isMobile ? "px-4" : ""}`}>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Study progress
        </h2>
        {studyList.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">No study progress yet.</Card>
        ) : (
          <div className={isMobile ? "space-y-2" : "grid sm:grid-cols-2 gap-3"}>
            {studyList.map((s) => {
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
                  <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                    <Button asChild variant="default" size="sm" className="h-8 text-xs">
                      <Link to={`/concept/${s.conceptId}/learn`}>
                        <GraduationCap className="h-3.5 w-3.5 mr-1" /> Continue study
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                      <Link to={`/concept/${s.conceptId}/details`}>
                        <BookOpen className="h-3.5 w-3.5 mr-1" /> Details
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className={`space-y-2 pb-4 ${isMobile ? "px-4" : ""}`}>
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" /> Practice history
        </h2>
        {practiceList.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground text-center">No practice exams yet.</Card>
        ) : (
          <div className={isMobile ? "space-y-2" : "grid sm:grid-cols-2 gap-3"}>
            {practiceList.map((p) => (
              <Card key={p.id} className="p-3 space-y-2">
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-[10px] text-muted-foreground">{p.conceptName} · {p.questionIds.length} questions</p>
                {p.completedAt ? (
                  <>
                    <p className="text-xs tabular-nums">
                      Score: <span className="font-semibold text-primary">{p.score ?? 0}</span> / {p.total ?? p.questionIds.length}
                      {" · "}{new Date(p.completedAt).toLocaleDateString()}
                    </p>
                    <div className={`grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                      <Button asChild size="sm" variant="default" className="h-8 text-xs">
                        <Link to={`/practice/session/${p.id}?review=1`}>View full review</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                        <Link to={`/concept/${p.conceptId}/learn`}>Study again</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                    <Link to={`/practice/session/${p.id}`}>Resume</Link>
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
