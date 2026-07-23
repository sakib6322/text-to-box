import { HelpCircle, List, Loader2, Play, Target } from "lucide-react";
import { ConceptKeyPointsPanel } from "@/components/ConceptKeyPointsPanel";
import { AppBackButton } from "@/components/AppBackButton";
import { Button } from "@/components/ui/button";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptDetailShell } from "@/components/ConceptDetailShell";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import { KeyPointList } from "@/components/KeyPointList";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import { emptyConceptDetail, fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
import { useConceptStudentUi } from "@/hooks/useConceptStudentUi";
import { useConceptHeadingSlideNav } from "@/hooks/useConceptHeadingSlideNav";
import { sortKeyPointsByImportance } from "@/lib/progressEngine";
import { userHeaderActionBtn, userPageShellTight, userPageTopBar, userStickyHeader, userStickyHeaderActions } from "@/lib/userShell";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ConceptDetailPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [taxonomy, setTaxonomy] = useState("");
  const [detail, setDetail] = useState(emptyConceptDetail());
  const [keyPoints, setKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [keyPointsOpen, setKeyPointsOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<{ id: string; name: string } | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const csu = useConceptStudentUi();
  const { slideIndex, setSlideIndex, jumpFilter, slides } = useConceptHeadingSlideNav(detail);

  useEffect(() => {
    if (!conceptId) return;
    setLoading(true);
    fetchConceptByIdWithBoards(conceptId)
      .then((data) => {
        setConceptName(data.conceptName);
        setDetail(data.detail);
        setKeyPoints(sortKeyPointsByImportance(data.keyPoints));
        const parts = [data.taxonomy.subject, data.taxonomy.system, data.taxonomy.chapter, data.taxonomy.topic]
          .map((x) => x.trim())
          .filter(Boolean);
        setTaxonomy(parts.join(" → "));
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Load failed");
        navigate("/my-suggestions");
      })
      .finally(() => setLoading(false));
  }, [conceptId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={userPageShellTight}>
      <div className={userPageTopBar}>
        <div className={userStickyHeader}>
          <AppBackButton fallback="/my-suggestions" />
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
            {taxonomy ? <p className="truncate text-[10px] text-muted-foreground md:text-xs">{taxonomy}</p> : null}
          </div>
          <div className={userStickyHeaderActions}>
            {csu.showQuestionsButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={userHeaderActionBtn}
                title="Questions"
                onClick={() => {
                  setBoardFilter(null);
                  setQuestionsOpen(true);
                }}
              >
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Qtns</span>
                <span className="hidden sm:inline">Questions</span>
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
              <List className="h-3.5 w-3.5 shrink-0" />
              <span className="sm:hidden">Keypoints</span>
              <span className="hidden sm:inline">Key points</span>
            </Button>
            ) : null}
            {csu.showStudyButton ? (
              <Button asChild size="sm" className={userHeaderActionBtn} title="Key Point Study">
                <Link to={`/concept/${conceptId}/learn`}>
                  <Target className="h-3.5 w-3.5 shrink-0" />
                  <span className="sm:hidden">Study</span>
                  <span className="hidden sm:inline">Key Point Study</span>
                </Link>
              </Button>
            ) : null}
            {csu.showPracticeButton ? (
              <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Practice">
                <Link to={`/practice/${conceptId}/setup`}>
                  <Play className="h-3.5 w-3.5 shrink-0" />
                  <span>Practice</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <StoryBasedLearningButton
          detail={detail}
          conceptName={conceptName}
          onOpenChange={setStoryOpen}
          leadingAction={jumpFilter}
        />
        {!storyOpen ? (
        <ConceptDetailShell className="mx-3 md:mx-0" title="Concept detail">
          <div className="space-y-4">
            <ConceptDetailBody
              detail={detail}
              showVerbatim
              slideIndex={slideIndex}
              onSlideIndexChange={setSlideIndex}
              slides={slides}
            />
            {csu.showKeyPointsOnDetails && keyPoints.length ? (
              <div className="space-y-2 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Key points</p>
                  <div className="flex flex-wrap gap-2">
                    {csu.showStudyButton ? (
                      <Button asChild size="sm" className="h-8 text-xs">
                        <Link to={`/concept/${conceptId}/learn`}>
                          <Target className="mr-1 h-3 w-3" />
                          Key Point Study
                        </Link>
                      </Button>
                    ) : null}
                    {csu.showPracticeButton ? (
                      <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                        <Link to={`/practice/${conceptId}/setup`}>
                          <Play className="mr-1 h-3 w-3" />
                          Practice
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
                <KeyPointList
                  keyPoints={keyPoints}
                  onBoardClick={(board) => {
                    setBoardFilter(board);
                    setQuestionsOpen(true);
                  }}
                />
              </div>
            ) : null}
          </div>
        </ConceptDetailShell>
        ) : null}
      </div>

      <ConceptQuestionsPanel
        open={questionsOpen}
        onOpenChange={(open) => {
          setQuestionsOpen(open);
          if (!open) setBoardFilter(null);
        }}
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
