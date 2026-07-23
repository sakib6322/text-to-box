import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { hasConceptDetailContent } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { useConceptHeadingSlideNav } from "@/hooks/useConceptHeadingSlideNav";
import { BookOpen } from "lucide-react";
import { useState } from "react";

type Props = {
  conceptName: string;
  detail: ConceptDetail;
  onOpenDetails: () => void;
  editable?: boolean;
  onDetailChange?: (updater: ConceptDetailUpdater) => void;
};

export function ConceptDetailCard({
  conceptName,
  detail,
  onOpenDetails,
  editable = false,
  onDetailChange,
}: Props) {
  const [storyOpen, setStoryOpen] = useState(false);
  const { slideIndex, setSlideIndex, jumpFilter } = useConceptHeadingSlideNav(detail, !editable);
  if (!hasConceptDetailContent(detail)) return null;

  return (
    <div className="space-y-3">
      <StoryBasedLearningButton
        detail={detail}
        conceptName={conceptName}
        editable={editable}
        onDetailChange={onDetailChange}
        onOpenChange={setStoryOpen}
        leadingAction={jumpFilter}
      />
      {!storyOpen ? (
      <Card className="concept-detail-card space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Concept detail</p>
            <h2 className="mt-1 text-lg font-bold text-primary">{conceptName || "Untitled concept"}</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">Source textbox-এর exact format preview</p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onOpenDetails}>
            <BookOpen className="mr-2 h-4 w-4" />
            Concept details
          </Button>
        </div>

        <ConceptDetailBody
          detail={detail}
          showVerbatim={false}
          slideIndex={slideIndex}
          onSlideIndexChange={setSlideIndex}
        />
      </Card>
      ) : null}
    </div>
  );
}
