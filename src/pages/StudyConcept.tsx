import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KeyPointStudySlide } from "@/components/KeyPointStudySlide";
import { fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
import { getStudyProgress, markKeyPointStudied, studyCompletionPct } from "@/lib/userProgress";
import {
  userBottomBar,
  userBottomBarInner,
  userHeaderActionBtn,
  userHeaderActionLabel,
  userPageShell,
  userPageTopBar,
  userStickyHeader,
  userStickyHeaderActions,
} from "@/lib/userShell";
import { toast } from "sonner";

export default function StudyConcept() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [keyPoints, setKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");
  const [progressPct, setProgressPct] = useState(0);
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!conceptId) return;
    setLoading(true);
    fetchConceptByIdWithBoards(conceptId)
      .then((data) => {
        setConceptName(data.conceptName);
        setKeyPoints(data.keyPoints);
        const p = getStudyProgress(conceptId);
        setProgressPct(studyCompletionPct(p));
        setStudiedIds(new Set(p?.studiedKeyPointIds ?? []));
        if (p?.studiedKeyPointIds.length) {
          const idx = data.keyPoints.findIndex((kp) => kp.id && !p.studiedKeyPointIds.includes(kp.id));
          setStep(idx >= 0 ? idx : 0);
        }
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Load failed");
        navigate("/my-suggestions");
      })
      .finally(() => setLoading(false));
  }, [conceptId, navigate]);

  const currentKp = keyPoints[step];

  const goPrev = () => {
    if (step <= 0) return;
    setSlideDir("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (!conceptId || !currentKp?.id) return;
    markKeyPointStudied(conceptId, conceptName, currentKp.id, keyPoints.length);
    const p = getStudyProgress(conceptId);
    setProgressPct(studyCompletionPct(p));
    setStudiedIds(new Set(p?.studiedKeyPointIds ?? []));
    if (step < keyPoints.length - 1) {
      setSlideDir("forward");
      setStep((s) => s + 1);
    } else {
      toast.success("All key points studied!");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={userPageShell}>
      <div className={userPageTopBar}>
        <div className={userStickyHeader}>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to={`/concept/${conceptId}/details`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <p className="text-xs text-muted-foreground md:text-sm">Key point study</p>
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
          </div>
          <div className={userStickyHeaderActions}>
            <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Practice">
              <Link to={`/concept/${conceptId}/learn?tab=practice`}>
                <Target className="h-3.5 w-3.5 sm:mr-1" />
                <span className={userHeaderActionLabel}>Practice</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-3 md:px-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground md:text-sm">
          <span>
            Studied {studiedIds.size}/{keyPoints.length || 0}
          </span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      <div className="mx-auto w-full max-w-2xl min-w-0 overflow-hidden px-3 md:px-0">
        {currentKp ? (
          <KeyPointStudySlide
            key={`${currentKp.id ?? step}-${step}-${slideDir}`}
            keyPoint={currentKp}
            index={step}
            total={keyPoints.length}
            direction={slideDir}
          />
        ) : (
          <Card className="p-6 text-center text-sm text-muted-foreground">No key points for this concept.</Card>
        )}
      </div>

      {keyPoints.length > 1 ? (
        <div className="flex max-w-full items-center justify-start gap-1.5 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center md:px-4">
          {keyPoints.map((kp, i) => {
            const done = kp.id ? studiedIds.has(kp.id) : false;
            const active = i === step;
            return (
              <button
                key={kp.id ?? i}
                type="button"
                aria-label={`Go to key point ${i + 1}`}
                className={`h-2 shrink-0 rounded-full transition-all duration-300 ${
                  active ? "w-6 bg-primary" : done ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/25"
                }`}
                onClick={() => {
                  setSlideDir(i >= step ? "forward" : "back");
                  setStep(i);
                }}
              />
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-center px-3">
        <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] md:text-xs">
          <Link to={`/concept/${conceptId}/details`}>
            <BookOpen className="mr-1 h-3 w-3" /> Back to details
          </Link>
        </Button>
      </div>

      <div className={userBottomBar}>
        <div className={userBottomBarInner}>
          <Button variant="outline" className="flex-1" disabled={step <= 0} onClick={goPrev}>
            Previous
          </Button>
          <Button className="flex-1" onClick={goNext} disabled={!currentKp?.id}>
            {step >= keyPoints.length - 1 ? "Complete" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
