import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import type { ConceptDetail } from "@/lib/conceptDetail";

type Props = {
  conceptName: string;
  detail: ConceptDetail;
  keyPoints?: string[];
};

export function ConceptDetailPreview({ conceptName, detail, keyPoints = [] }: Props) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Preview</p>
        <h2 className="text-lg font-bold text-primary mt-1">{conceptName || "Untitled concept"}</h2>
      </div>

      <ConceptDetailBody detail={detail} showVerbatim={false} />

      {keyPoints.length ? (
        <div className="space-y-2 pt-2 border-t">
          <p className="font-semibold">Key points</p>
          <ul className="list-disc pl-5 space-y-1">
            {keyPoints.map((kp, i) => (
              <li key={i}>{kp}</li>
            ))}
          </ul>
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
