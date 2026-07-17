import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HelpCircle, Loader2, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import { KeyPointList } from "@/components/KeyPointList";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import { emptyConceptDetail, fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
import { userContentCard, userHeaderActionBtn, userPageShellTight, userPageTopBar, userStickyHeader, userStickyHeaderActions } from "@/lib/userShell";
import { toast } from "sonner";

export default function ConceptDetailPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [taxonomy, setTaxonomy] = useState("");
  const [detail, setDetail] = useState(emptyConceptDetail());
  const [keyPoints, setKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!conceptId) return;
    setLoading(true);
    fetchConceptByIdWithBoards(conceptId)
      .then((data) => {
        setConceptName(data.conceptName);
        setDetail(data.detail);
        setKeyPoints(data.keyPoints);
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
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/my-suggestions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
            {taxonomy ? <p className="truncate text-[10px] text-muted-foreground md:text-xs">{taxonomy}</p> : null}
          </div>
          <div className={userStickyHeaderActions}>
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
            <Button asChild size="sm" className={userHeaderActionBtn} title="Key Point Study">
              <Link to={`/concept/${conceptId}/learn`}>
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="sm:hidden">Study</span>
                <span className="hidden sm:inline">Key Point Study</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Practice">
              <Link to={`/concept/${conceptId}/learn?tab=practice`}>
                <Play className="h-3.5 w-3.5 shrink-0" />
                <span>Practice</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className={userContentCard}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Concept detail</p>
          <StoryBasedLearningButton detail={detail} conceptName={conceptName} />
        </div>
        <ConceptDetailBody detail={detail} showVerbatim />
        {keyPoints.length ? (
          <div className="space-y-2 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Key points</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="h-8 text-xs">
                  <Link to={`/concept/${conceptId}/learn`}>
                    <Target className="mr-1 h-3 w-3" />
                    Key Point Study
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to={`/concept/${conceptId}/learn?tab=practice`}>
                    <Play className="mr-1 h-3 w-3" />
                    Practice
                  </Link>
                </Button>
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
      </Card>

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
    </div>
  );
}
