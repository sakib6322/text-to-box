import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { hasConceptDetailContent } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { BookOpen } from "lucide-react";

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
  if (!hasConceptDetailContent(detail)) return null;

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Concept detail</p>
            <h2 className="text-lg font-bold text-primary mt-1">{conceptName || "Untitled concept"}</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Source textbox-এর exact format preview
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" onClick={onOpenDetails}>
            <BookOpen className="mr-2 h-4 w-4" />
            Concept details
          </Button>
        </div>
        <StoryBasedLearningButton
          detail={detail}
          conceptName={conceptName}
          editable={editable}
          onDetailChange={onDetailChange}
        />
      </div>

      <ConceptDetailBody detail={detail} showVerbatim={false} />
    </Card>
  );
}
