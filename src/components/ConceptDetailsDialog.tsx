import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptDetailPreview } from "@/components/ConceptDetailPreview";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: string[];
  loading?: boolean;
  editable?: boolean;
  onDetailChange?: (detail: ConceptDetail) => void;
  onSave?: (detail: ConceptDetail) => Promise<void>;
  saving?: boolean;
};

export function ConceptDetailsDialog({
  open,
  onOpenChange,
  conceptName,
  detail,
  keyPoints,
  loading = false,
  editable = false,
  onDetailChange,
  onSave,
  saving = false,
}: Props) {
  const [draft, setDraft] = useState<ConceptDetail>(detail);

  useEffect(() => {
    if (open) setDraft(detail);
  }, [open, detail]);

  const handleDraftChange = (next: ConceptDetail) => {
    setDraft(next);
    onDetailChange?.(next);
  };

  const handleSave = async () => {
    if (!onSave) return;
    await onSave(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={editable ? "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" : "max-w-3xl max-h-[85vh] overflow-y-auto"}
      >
        <DialogHeader>
          <DialogTitle>Concept: {conceptName || "Untitled"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading concept details…
          </div>
        ) : editable ? (
          <div className="grid lg:grid-cols-2 gap-4 min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-col min-h-0 rounded-lg border bg-background">
              <div className="shrink-0 border-b px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 max-h-[58vh]">
                <ConceptDetailBody detail={draft} editable onChange={handleDraftChange} showVerbatim={false} />
              </div>
            </div>

            <div className="flex flex-col min-h-0 rounded-lg border bg-muted/30">
              <div className="shrink-0 border-b px-4 py-2 bg-muted/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 max-h-[58vh]">
                <ConceptDetailPreview conceptName={conceptName} detail={draft} keyPoints={keyPoints} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <ConceptDetailBody detail={detail} showVerbatim />

            {keyPoints.length ? (
              <div className="space-y-2 pt-2 border-t">
                <p className="font-semibold text-sm">Key points</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {keyPoints.map((kp, i) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        {editable && !loading ? (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Close
            </Button>
            {onSave ? (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            ) : null}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
