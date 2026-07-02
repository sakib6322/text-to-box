import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { BookOpen } from "lucide-react";

type Props = {
  conceptName: string;
  detail: ConceptDetail;
  onOpenDetails: () => void;
};

export function ConceptDetailCard({ conceptName, detail, onOpenDetails }: Props) {
  const hasContent =
    detail.summary.trim() ||
    detail.paragraphs.length > 0 ||
    (detail.table?.rows?.length ?? 0) > 0;

  if (!hasContent) return null;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Concept detail</p>
          <h2 className="text-lg font-bold text-primary mt-1">{conceptName || "Untitled concept"}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenDetails}>
          <BookOpen className="mr-2 h-4 w-4" />
          Concept details
        </Button>
      </div>

      <ConceptDetailBody detail={detail} showVerbatim={false} />
    </Card>
  );
}
