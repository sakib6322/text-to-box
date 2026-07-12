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
import { downloadConceptDetailPdf } from "@/lib/downloadConceptDetailPdf";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { KeyPointList } from "@/components/KeyPointList";
import type { KeyPointWithBoards } from "@/lib/conceptDetail";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: KeyPointWithBoards[] | string[];
  loading?: boolean;
  editable?: boolean;
  onDetailChange?: (detail: ConceptDetail) => void;
  onSave?: (detail: ConceptDetail) => Promise<void>;
  saving?: boolean;
  showDownloadPdf?: boolean;
};

function normalizeKeyPoints(kps: KeyPointWithBoards[] | string[]): KeyPointWithBoards[] {
  if (!kps.length) return [];
  if (typeof kps[0] === "string") {
    return (kps as string[]).map((content) => ({ content }));
  }
  return kps as KeyPointWithBoards[];
}

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
  showDownloadPdf = true,
}: Props) {
  const [draft, setDraft] = useState<ConceptDetail>(detail);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const normalizedKps = normalizeKeyPoints(keyPoints);

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

  const handleDownloadPdf = () => {
    const payload = editable ? draft : detail;
    setDownloadingPdf(true);
    try {
      downloadConceptDetailPdf(
        conceptName,
        payload,
        normalizedKps.map((kp) => kp.content),
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const keyPointsList = (
    <div className="space-y-2 pt-2 border-t">
      <p className="font-semibold text-sm">Key points</p>
      <KeyPointList keyPoints={normalizedKps} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={editable ? "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" : "max-w-3xl max-h-[85vh] overflow-y-auto"}
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <DialogTitle className="pr-2">Concept: {conceptName || "Untitled"}</DialogTitle>
          {showDownloadPdf && !loading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
          ) : null}
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
                <ConceptDetailPreview
                  conceptName={conceptName}
                  detail={draft}
                  keyPoints={normalizedKps.map((kp) => kp.content)}
                />
                {keyPointsList}
              </div>
            </div>
          </div>
        ) : (
          <>
            <ConceptDetailBody detail={detail} showVerbatim />
            {normalizedKps.length ? keyPointsList : null}
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
