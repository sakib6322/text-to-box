import { Button } from "@/components/ui/button";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptDetailShell } from "@/components/ConceptDetailShell";
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
        <ConceptDetailShell
          title={
            <span className="block min-w-0">
              <span className="block text-xs font-normal uppercase tracking-wide text-muted-foreground">
                Concept detail
              </span>
              <span className="mt-0.5 block truncate text-sm font-semibold text-primary">
                {conceptName || "Untitled concept"}
              </span>
            </span>
          }
          titleExtra={
            <Button variant="outline" size="sm" className="shrink-0" onClick={onOpenDetails}>
              <BookOpen className="mr-2 h-4 w-4" />
              Concept details
            </Button>
          }
        >
          <ConceptDetailBody
            detail={detail}
            showVerbatim={false}
            slideIndex={slideIndex}
            onSlideIndexChange={setSlideIndex}
          />
        </ConceptDetailShell>
      ) : null}
    </div>
  );
}
