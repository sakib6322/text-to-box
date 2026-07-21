import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { KeyPointList } from "@/components/KeyPointList";
import type { ConceptDetail, KeyPointWithBoards } from "@/lib/conceptDetail";

type Props = {
  conceptName: string;
  detail: ConceptDetail;
  keyPoints?: KeyPointWithBoards[] | string[];
};

export function ConceptDetailPreview({ conceptName, detail, keyPoints = [] }: Props) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
        <h2 className="text-lg font-bold text-primary mt-1">{conceptName || "Untitled concept"}</h2>
      </div>

      <ConceptDetailBody detail={detail} showVerbatim={false} adminPreview />

      {keyPoints.length ? (
        <div className="space-y-2 pt-2 border-t">
          <p className="font-semibold">Key points</p>
          <KeyPointList keyPoints={keyPoints} />
        </div>
      ) : null}

      {detail.verbatimText ? (
        <div className="space-y-2 pt-2 border-t">
          <p className="font-semibold text-muted-foreground">Verbatim source</p>
          <p className="text-muted-foreground whitespace-pre-wrap text-xs">{detail.verbatimText}</p>
        </div>
      ) : null}
    </div>
  );
}
