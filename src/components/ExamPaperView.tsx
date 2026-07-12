import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { QuestionPaperCard } from "@/components/QuestionPaperCard";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import {
  emptyConceptDetail,
  fetchConceptByIdWithBoards,
  fetchConceptByKeyPointId,
  fetchConceptByTitle,
  type ConceptDetail,
  type KeyPointWithBoards,
} from "@/lib/conceptDetail";
import type { AnswerDistribution, ExamQuestion } from "@/lib/exams";
import { toast } from "sonner";

type Props = {
  questions: ExamQuestion[];
  showSolutionsDefault?: boolean;
  showToggle?: boolean;
  showConceptButtons?: boolean;
  answerDistribution?: AnswerDistribution | null;
  showAnswerReview?: boolean;
};

export function ExamPaperView({
  questions,
  showSolutionsDefault = false,
  showToggle = true,
  showConceptButtons = true,
  answerDistribution = null,
  showAnswerReview = false,
}: Props) {
  const [showSolutions, setShowSolutions] = useState(showSolutionsDefault);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsName, setDetailsName] = useState("");
  const [detailsConcept, setDetailsConcept] = useState<ConceptDetail>(emptyConceptDetail());
  const [detailsKeyPoints, setDetailsKeyPoints] = useState<KeyPointWithBoards[]>([]);

  const openConcept = async (q: ExamQuestion) => {
    if (!q.concept?.trim()) {
      toast.error("No concept linked");
      return;
    }
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsName(q.concept);
    try {
      if (q.sourcePointId?.trim()) {
        const data = await fetchConceptByKeyPointId(q.sourcePointId);
        const withBoards = await fetchConceptByIdWithBoards(data.conceptId);
        setDetailsConcept(withBoards.detail);
        setDetailsKeyPoints(withBoards.keyPoints);
        if (withBoards.conceptName) setDetailsName(withBoards.conceptName);
      } else {
        const data = await fetchConceptByTitle(q.concept, {
          subject: q.subject,
          system: q.system,
          chapter: q.chapter,
          topic: q.topic,
        });
        if (data.conceptId) {
          const withBoards = await fetchConceptByIdWithBoards(data.conceptId);
          setDetailsConcept(withBoards.detail);
          setDetailsKeyPoints(withBoards.keyPoints);
          if (withBoards.conceptName) setDetailsName(withBoards.conceptName);
        } else {
          setDetailsConcept(data.detail);
          setDetailsKeyPoints(data.keyPoints.map((content) => ({ content })));
          if (data.conceptName) setDetailsName(data.conceptName);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Concept not found");
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {showToggle ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5">
          <div className="space-y-0.5">
            <Label htmlFor="show-solutions" className="text-sm font-medium">
              Show answers & explanations
            </Label>
            <p className="text-[10px] text-muted-foreground">Question paper review mode</p>
          </div>
          <Switch id="show-solutions" checked={showSolutions} onCheckedChange={setShowSolutions} />
        </div>
      ) : null}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="relative space-y-2">
            <div className="flex items-center justify-end gap-2">
              {showConceptButtons && q.concept?.trim() ? (
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => openConcept(q)}>
                  <BookOpen className="h-3 w-3 mr-1" /> Concept
                </Button>
              ) : null}
              {q.isCorrect != null ? (
                <Badge variant={q.isCorrect ? "default" : "destructive"} className="text-[10px]">
                  {q.isCorrect ? "Correct" : "Wrong"}
                </Badge>
              ) : null}
              {q.marksEarned != null ? (
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  {q.marksEarned.toFixed(1)} marks
                </Badge>
              ) : null}
            </div>
            <QuestionPaperCard
              index={i}
              questionMode={q.questionMode}
              subject={q.subject}
              system={q.system}
              chapter={q.chapter}
              topic={q.topic}
              concept={q.concept}
              marks={q.examMarks ?? q.marks}
              hideAnswers={!(showSolutions || q.showSolutions)}
              mcq={q.mcq}
              sba={q.sba}
              studentAnswer={q.studentAnswer}
              distribution={answerDistribution?.[q.id] ?? null}
              showAnswerReview={showAnswerReview && (showSolutions || q.showSolutions)}
            />
          </div>
        ))}
      </div>

      <ConceptDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conceptName={detailsName}
        detail={detailsConcept}
        keyPoints={detailsKeyPoints}
        loading={detailsLoading}
        showDownloadPdf
      />
    </div>
  );
}

export function ExamPaperLoading() {
  return (
    <div className="py-8 flex justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
