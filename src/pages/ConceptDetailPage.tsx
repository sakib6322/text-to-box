import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, HelpCircle, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import { KeyPointList } from "@/components/KeyPointList";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import { emptyConceptDetail, fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
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
        navigate("/suggestions");
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
    <div className="mx-auto max-w-lg pb-8 space-y-4">
      <div className="sticky top-0 z-20 bg-background/95 border-b px-4 py-3 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link to="/suggestions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{conceptName}</h1>
          {taxonomy ? <p className="text-[10px] text-muted-foreground truncate">{taxonomy}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs h-8"
          onClick={() => {
            setBoardFilter(null);
            setQuestionsOpen(true);
          }}
        >
          <HelpCircle className="h-3 w-3 mr-1" /> Questions
        </Button>
        <Button asChild size="sm" className="shrink-0 text-xs h-8">
          <Link to={`/concept/${conceptId}/learn`}>
            <Target className="h-3 w-3 mr-1" /> Study & Practice
          </Link>
        </Button>
      </div>

      <Card className="mx-4 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Concept detail</p>
          <StoryBasedLearningButton detail={detail} conceptName={conceptName} />
        </div>
        <ConceptDetailBody detail={detail} showVerbatim />
        {keyPoints.length ? (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Key points</p>
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
