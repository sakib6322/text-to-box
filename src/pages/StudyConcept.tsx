import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { KeyPointList } from "@/components/KeyPointList";
import { emptyConceptDetail, fetchConceptByIdWithBoards } from "@/lib/conceptDetail";
import { getStudyProgress, markKeyPointStudied, studyCompletionPct } from "@/lib/userProgress";
import { toast } from "sonner";

export default function StudyConcept() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [detail, setDetail] = useState(emptyConceptDetail());
  const [keyPoints, setKeyPoints] = useState<{ id?: string; content: string; boardNames?: string[] }[]>([]);
  const [step, setStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (!conceptId) return;
    setLoading(true);
    fetchConceptByIdWithBoards(conceptId)
      .then((data) => {
        setConceptName(data.conceptName);
        setDetail(data.detail);
        setKeyPoints(data.keyPoints);
        const p = getStudyProgress(conceptId);
        setProgressPct(studyCompletionPct(p));
        if (p?.studiedKeyPointIds.length) {
          const idx = data.keyPoints.findIndex((kp) => kp.id && !p.studiedKeyPointIds.includes(kp.id));
          setStep(idx >= 0 ? idx : 0);
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Load failed");
        navigate("/suggestions");
      })
      .finally(() => setLoading(false));
  }, [conceptId, navigate]);

  const currentKp = keyPoints[step];
  const taxonomyLine = useMemo(() => detail.summary, [detail.summary]);

  const goNext = () => {
    if (!conceptId || !currentKp?.id) return;
    markKeyPointStudied(conceptId, conceptName, currentKp.id, keyPoints.length);
    const p = getStudyProgress(conceptId);
    setProgressPct(studyCompletionPct(p));
    if (step < keyPoints.length - 1) setStep((s) => s + 1);
    else toast.success("All key points studied!");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg min-h-[80vh] pb-24 space-y-4">
      <div className="sticky top-0 z-20 bg-background/95 border-b px-4 py-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/suggestions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Study mode</p>
          <h1 className="font-semibold text-sm truncate">{conceptName}</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 text-xs h-8">
          <Link to={`/practice/${conceptId}/setup`}>
            <Target className="h-3 w-3 mr-1" /> Practice
          </Link>
        </Button>
      </div>

      <div className="px-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <Card className="mx-4 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <Badge variant="outline" className="text-[10px]">
            Key point {step + 1} / {keyPoints.length || 1}
          </Badge>
        </div>
        {currentKp ? (
          <KeyPointList keyPoints={[currentKp]} />
        ) : (
          <p className="text-sm text-muted-foreground">No key points for this concept.</p>
        )}
      </Card>

      <Card className="mx-4 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Concept detail</p>
        <ConceptDetailBody detail={detail} showVerbatim={false} />
        {taxonomyLine ? <p className="text-xs text-muted-foreground border-t pt-2">{taxonomyLine}</p> : null}
      </Card>

      {keyPoints.length > 1 ? (
        <Card className="mx-4 p-3">
          <p className="text-xs font-medium mb-2">All key points</p>
          <KeyPointList keyPoints={keyPoints} compact />
        </Card>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t flex gap-2 safe-area-pb">
        <Button
          variant="outline"
          className="flex-1"
          disabled={step <= 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Previous
        </Button>
        <Button className="flex-1" onClick={goNext} disabled={!currentKp?.id}>
          {step >= keyPoints.length - 1 ? "Complete" : "Next"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
