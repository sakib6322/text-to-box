import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, HelpCircle, List, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import { ConceptKeyPointsPanel } from "@/components/ConceptKeyPointsPanel";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptDetailShell } from "@/components/ConceptDetailShell";
import { AppBackButton } from "@/components/AppBackButton";
import { ConceptStepBar } from "@/components/ConceptProgressSteps";
import { ConceptSelfTestExam } from "@/components/ConceptSelfTestExam";
import { countPracticeAnswerUnits, type PracticeQuestionFull } from "@/components/PracticeQuestionBlock";
import { KeyPointStudySlide } from "@/components/KeyPointStudySlide";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import { emptyConceptDetail, fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
import { sortKeyPointsByImportance, sortQuestionsByBoardImportance } from "@/lib/progressEngine";
import { fetchProgressSets, type ProgressPracticeSet } from "@/lib/progressApi";
import { apiUrl } from "@/lib/apiBase";
import { useProgressAppearance, useProgressStepLabel } from "@/hooks/useProgressAppearance";
import { useConceptStudentUi } from "@/hooks/useConceptStudentUi";
import { useConceptHeadingSlideNav } from "@/hooks/useConceptHeadingSlideNav";
import {
  getStudyProgress,
  hydrateProgressFromServer,
  markConceptStep,
  markKeyPointStudied,
  markSelfQaSeen,
  studyCompletionPct,
  getCurrentConceptStep,
  isStep2Complete,
  isStep3Complete,
} from "@/lib/userProgress";
import { toast } from "sonner";
import { courseFlowBackLink } from "@/lib/courseBrowseNav";
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

export default function ConceptLearn() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const courseId = searchParams.get("courseId") ?? "";
  const topicId = searchParams.get("topicId") ?? "";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [detail, setDetail] = useState(emptyConceptDetail());
  const [keyPoints, setKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [selfTestTotal, setSelfTestTotal] = useState(0);
  const [conceptSets, setConceptSets] = useState<ProgressPracticeSet[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [kpStep, setKpStep] = useState(0);
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");
  const [, setTick] = useState(0);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [keyPointsOpen, setKeyPointsOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<{ id: string; name: string } | null>(null);
  const [completingStep3, setCompletingStep3] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const { slideIndex, setSlideIndex, jumpFilter } = useConceptHeadingSlideNav(detail);

  const progress = conceptId ? getStudyProgress(conceptId) : null;
  const studiedIds = useMemo(() => new Set(progress?.studiedKeyPointIds ?? []), [progress]);
  const seenQaIds = useMemo(() => new Set(progress?.selfQaSeenIds ?? []), [progress]);
  const passedSetIds = useMemo(
    () => conceptSets.filter((s) => s.attempt?.passed).map((s) => s.id),
    [conceptSets],
  );
  const pct = studyCompletionPct(progress, selfTestTotal, conceptSets.length, passedSetIds);
  const resumeStep = getCurrentConceptStep(progress, selfTestTotal, conceptSets.length, passedSetIds);
  const step2Done = isStep2Complete(progress, keyPoints.length);
  const step3Done = isStep3Complete(progress, selfTestTotal);
  const pp = useProgressAppearance();
  const csu = useConceptStudentUi();
  const stepLabel = useProgressStepLabel(activeStep);

  const loadAll = useCallback(async () => {
    if (!conceptId) return;
    setLoading(true);
    try {
      await hydrateProgressFromServer();
      const data = await fetchConceptByIdWithBoards(conceptId);
      setConceptName(data.conceptName);
      setTopicName(data.taxonomy.topic);
      setDetail(data.detail);
      setKeyPoints(sortKeyPointsByImportance(data.keyPoints));
      let sets: ProgressPracticeSet[] = [];
      if (courseId) {
        sets = await fetchProgressSets(courseId, {
          scope_type: "concept",
          scope_id: conceptId,
          set_kind: "concept_practice",
        });
        setConceptSets(sets);
      } else {
        setConceptSets([]);
      }
      const qsRes = await fetch(apiUrl(`/api/questions?${new URLSearchParams({ concept: data.conceptName })}`));
      const qsData = (await qsRes.json()) as { rows?: PracticeQuestionFull[]; error?: string };
      if (!qsRes.ok) throw new Error(qsData.error ?? "Failed to load questions");
      const sortedQs = sortQuestionsByBoardImportance(qsData.rows ?? []) as PracticeQuestionFull[];
      const totalUnits = sortedQs.reduce((sum, q) => sum + countPracticeAnswerUnits(q), 0);
      setSelfTestTotal(totalUnits);
      setTick((n) => n + 1);
      const p = getStudyProgress(conceptId);
      const setCount = courseId ? sets.length : 0;
      const passedIds = sets.filter((s) => s.attempt?.passed).map((s) => s.id);
      const step = getCurrentConceptStep(p, totalUnits, setCount, passedIds);
      setActiveStep(step);
      if (p?.studiedKeyPointIds.length) {
        const sorted = sortKeyPointsByImportance(data.keyPoints);
        const idx = sorted.findIndex((kp) => kp.id && !p.studiedKeyPointIds.includes(kp.id));
        setKpStep(idx >= 0 ? idx : 0);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      navigate("/my-suggestions");
    } finally {
      setLoading(false);
    }
  }, [conceptId, courseId, navigate]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!conceptId || loading || keyPoints.length > 0) return;
    const p = getStudyProgress(conceptId);
    if (p?.step1CompletedAt && !p?.step2CompletedAt) {
      void markConceptStep(conceptId, conceptName, 2, { totalKeyPoints: 0 }).then(() => setTick((n) => n + 1));
    }
  }, [conceptId, conceptName, keyPoints.length, loading]);

  const currentKp = keyPoints[kpStep];

  const goKpPrev = () => {
    if (kpStep <= 0) return;
    setSlideDir("back");
    setKpStep((s) => Math.max(0, s - 1));
  };

  const goKpNext = async () => {
    if (!conceptId) return;
    if (keyPoints.length === 0) {
      if (!progress?.step1CompletedAt) return;
      await markConceptStep(conceptId, conceptName, 2, { totalKeyPoints: 0 });
      setTick((n) => n + 1);
      setActiveStep(selfTestTotal > 0 ? 3 : 4);
      toast.success("Key points skipped — continue");
      return;
    }
    if (!currentKp?.id) return;
    markKeyPointStudied(conceptId, conceptName, currentKp.id, keyPoints.length);
    setTick((n) => n + 1);
    if (kpStep < keyPoints.length - 1) {
      setSlideDir("forward");
      setKpStep((s) => s + 1);
    } else {
      await markConceptStep(conceptId, conceptName, 2, { totalKeyPoints: keyPoints.length });
      setTick((n) => n + 1);
      toast.success("Key points complete!");
      setActiveStep(3);
    }
  };

  const completeStep1 = async () => {
    if (!conceptId) return;
    await markConceptStep(conceptId, conceptName, 1, { totalKeyPoints: keyPoints.length });
    setTick((n) => n + 1);
    setActiveStep(2);
    toast.success("Concept learning complete — Key Points unlocked");
  };

  const onSelfTestSeen = (id: string) => {
    if (!conceptId) return;
    markSelfQaSeen(conceptId, conceptName, id, selfTestTotal);
    setTick((n) => n + 1);
  };

  const completeStep3 = async () => {
    if (!conceptId || completingStep3) return;
    setCompletingStep3(true);
    try {
      const p = getStudyProgress(conceptId);
      await markConceptStep(conceptId, conceptName, 3, {
        totalKeyPoints: keyPoints.length,
        selfQaSeenIds: p?.selfQaSeenIds ?? [],
      });
      setTick((n) => n + 1);
      setActiveStep(4);
      toast.success(pp.selfQaCompleteToast);
    } finally {
      setCompletingStep3(false);
    }
  };

  const openBoardQuestions = (board: { id: string; name: string }) => {
    setBoardFilter(board);
    setQuestionsOpen(true);
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
          <AppBackButton
            fallback={courseFlowBackLink({
              courseId: courseId || undefined,
              topicId: topicId || undefined,
              conceptId: conceptId || undefined,
              locationState: location.state,
            })}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{topicName || "Concept"}</p>
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
          </div>
          <div className={userStickyHeaderActions}>
            {csu.showQuestionsButton ? (
              <Button type="button" variant="outline" size="sm" className={userHeaderActionBtn} onClick={() => setQuestionsOpen(true)}>
                <HelpCircle className="h-3.5 w-3.5 sm:mr-1" />
                <span className={userHeaderActionLabel}>Questions</span>
              </Button>
            ) : null}
            {csu.showKeyPointsButton !== false ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={userHeaderActionBtn}
                title="Key points"
                onClick={() => setKeyPointsOpen(true)}
              >
                <List className="h-3.5 w-3.5 sm:mr-1" />
                <span className="sm:hidden">Keypoints</span>
                <span className={userHeaderActionLabel}>Key points</span>
              </Button>
            ) : null}
            {csu.showDetailsButton ? (
              <Button asChild variant="outline" size="sm" className={userHeaderActionBtn}>
                <Link to={`/concept/${conceptId}/details`}>
                  <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
                  <span className={userHeaderActionLabel}>Details</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-3 pb-28 pt-3 md:px-0 md:pb-8">
        <ConceptStepBar
          progress={progress}
          pct={pct}
          activeStep={activeStep}
          totalKeyPoints={keyPoints.length}
          onStepClick={(s) => {
            if (s === 2 && !progress?.step1CompletedAt) return;
            if (s === 3 && !step2Done) return;
            if (s === 4 && !step3Done && selfTestTotal > 0) return;
            setActiveStep(s);
          }}
        />
        <Progress value={pct} className="h-2" />

        <div className="rounded-lg border bg-muted/20 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">
            Step {activeStep}: {stepLabel}
          </p>
          {activeStep > resumeStep && activeStep > 1 ? (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">{pp.lockedPreviousSteps}</p>
          ) : null}
        </div>

        {activeStep === 1 ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <StoryBasedLearningButton
              detail={detail}
              conceptName={conceptName}
              onOpenChange={setStoryOpen}
              leadingAction={jumpFilter}
            />
            {!storyOpen ? (
            <ConceptDetailShell title="Concept detail">
              <ConceptDetailBody
                detail={detail}
                showVerbatim
                slideIndex={slideIndex}
                onSlideIndexChange={setSlideIndex}
              />
            </ConceptDetailShell>
            ) : null}
            <div className="flex justify-center">
              <Button onClick={() => void completeStep1()}>{pp.step1CompleteButton}</Button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="space-y-5">
            {!progress?.step1CompletedAt ? (
              <Card className="p-4 text-center text-sm text-muted-foreground">Complete Concept Learning (Step 1) first.</Card>
            ) : (
              <>
                <div className="mx-auto w-full max-w-2xl min-w-0 overflow-hidden">
                  {currentKp ? (
                    <KeyPointStudySlide
                      key={`${currentKp.id ?? kpStep}-${kpStep}-${slideDir}`}
                      keyPoint={currentKp}
                      index={kpStep}
                      total={keyPoints.length}
                      direction={slideDir}
                      onBoardClick={openBoardQuestions}
                    />
                  ) : (
                    <Card className="space-y-3 p-6 text-center text-sm text-muted-foreground">
                      <p>No key points — this step auto-completes.</p>
                      <Button onClick={() => void goKpNext()} disabled={!progress?.step1CompletedAt}>
                        {pp.step2CompleteButton}
                      </Button>
                    </Card>
                  )}
                </div>
                <div className={userBottomBar}>
                  <div className={userBottomBarInner}>
                    <Button variant="outline" className="flex-1" disabled={kpStep <= 0} onClick={goKpPrev}>
                      Previous
                    </Button>
                    <Button className="flex-1" onClick={() => void goKpNext()} disabled={!currentKp?.id && keyPoints.length > 0}>
                      {kpStep >= keyPoints.length - 1 ? "Complete key points" : "Next"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : null}

        {activeStep === 3 ? (
          !step2Done ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">Complete Key Points (Step 2) first.</Card>
          ) : (
            <ConceptSelfTestExam
              conceptId={conceptId!}
              conceptName={conceptName}
              conceptPct={pct}
              seenIds={seenQaIds}
              onAnswerSeen={onSelfTestSeen}
              onComplete={() => void completeStep3()}
              completing={completingStep3}
            />
          )
        ) : null}

        {activeStep === 4 ? (
          !step3Done && selfTestTotal > 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground space-y-3">
              <p>Complete Question Yourself (Step 3) first — progress must reach 75%.</p>
              <Button size="sm" onClick={() => setActiveStep(3)}>Continue Question Yourself</Button>
            </Card>
          ) : (
            <div className="mx-auto max-w-xl space-y-3">
              <p className="text-sm text-muted-foreground text-center">{pp.conceptPracticeIntro}</p>
              {!courseId ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">{pp.openFromMyCourses}</Card>
              ) : conceptSets.length === 0 ? (
                <Card className="p-4 text-center text-sm text-muted-foreground">{pp.noPracticeSets}</Card>
              ) : (
                conceptSets.map((set) => (
                  <Card key={set.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-medium text-sm">{set.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {set.question_ids.length} questions · Pass {set.pass_percent}%
                        {set.attempt?.passed ? " · Passed" : set.attempt ? " · Try again" : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => navigate(`/progress/set/${set.id}?courseId=${courseId}&conceptId=${conceptId}`)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {set.attempt?.passed ? "Review" : "Start"}
                    </Button>
                  </Card>
                ))
              )}
            </div>
          )
        ) : null}
      </div>

      <ConceptQuestionsPanel
        open={questionsOpen}
        onOpenChange={setQuestionsOpen}
        conceptName={conceptName}
        boardId={boardFilter?.id}
        boardName={boardFilter?.name}
        onClearBoardFilter={() => setBoardFilter(null)}
        onBoardClick={(board) => {
          setBoardFilter(board);
          setQuestionsOpen(true);
        }}
      />
      <ConceptKeyPointsPanel
        open={keyPointsOpen}
        onOpenChange={setKeyPointsOpen}
        conceptName={conceptName}
        keyPoints={keyPoints}
        onBoardClick={(board) => {
          setKeyPointsOpen(false);
          setBoardFilter(board);
          setQuestionsOpen(true);
        }}
      />
    </div>
  );
}
