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
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { downloadConceptDetailPdf } from "@/lib/downloadConceptDetailPdf";
import { richHtmlImageOptionsFromEditor } from "@/lib/richHtmlImages";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { KeyPointWithBoards } from "@/lib/conceptDetail";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import {
  EditableKeyPointSection,
  type KeyPointSavePayload,
} from "@/components/EditableKeyPointSection";
import type { BoardOption } from "@/components/BoardCheckboxGroup";
import { ConceptSelfQaEditor } from "@/components/ConceptSelfQaEditor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: KeyPointWithBoards[] | string[];
  loading?: boolean;
  editable?: boolean;
  onDetailChange?: (updater: ConceptDetailUpdater) => void;
  onSave?: (detail: ConceptDetail) => Promise<void>;
  saving?: boolean;
  showDownloadPdf?: boolean;
  /** When false, key points block is hidden (e.g. home — points edited outside). */
  showKeyPoints?: boolean;
  /** Allow editing key points (with optional boards) inside this dialog */
  keyPointsEditable?: boolean;
  boardOptions?: BoardOption[];
  onSaveKeyPoint?: (payload: KeyPointSavePayload) => Promise<void>;
  onAddKeyPoint?: (payload: { content: string; boardIds: string[] }) => Promise<void>;
  onDeleteKeyPoint?: (id: string) => Promise<void>;
  savingKeyPoint?: boolean;
  /** When set with showSelfQaEditor, renders admin self-QA CRUD (Step 3 content). */
  conceptId?: string;
  showSelfQaEditor?: boolean;
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
  showKeyPoints = true,
  keyPointsEditable = false,
  boardOptions = [],
  onSaveKeyPoint,
  onAddKeyPoint,
  onDeleteKeyPoint,
  savingKeyPoint = false,
  conceptId,
  showSelfQaEditor = false,
}: Props) {
  const { appearance } = useUiAppearance();
  const [draft, setDraft] = useState<ConceptDetail>(detail);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const normalizedKps = normalizeKeyPoints(keyPoints);

  // Sync draft only when the dialog opens or loading finishes — not on every parent echo,
  // otherwise rapid CKEditor edits can be overwritten by stale parent state.
  useEffect(() => {
    if (open && !loading) setDraft(detail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit `detail`
  }, [open, loading]);

  const handleDraftChange = (updater: ConceptDetailUpdater) => {
    setDraft(updater);
    onDetailChange?.(updater);
  };

  const handleSave = async () => {
    if (!onSave) return;
    await onSave(draft);
  };

  const handleDownloadPdf = async () => {
    const payload = editable ? draft : detail;
    setDownloadingPdf(true);
    try {
      await downloadConceptDetailPdf(
        conceptName,
        payload,
        normalizedKps.map((kp) => kp.content),
        richHtmlImageOptionsFromEditor(appearance.richEditor),
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const keyPointsSection =
    !loading && showKeyPoints ? (
      <EditableKeyPointSection
        keyPoints={normalizedKps}
        boardOptions={boardOptions}
        editable={keyPointsEditable}
        saving={savingKeyPoint}
        onSavePoint={onSaveKeyPoint}
        onAddPoint={onAddKeyPoint}
        onDeletePoint={onDeleteKeyPoint}
      />
    ) : null;

  const storyButton = !loading ? (
    <StoryBasedLearningButton
      detail={editable ? draft : detail}
      conceptName={conceptName}
      editable={editable}
      onDetailChange={editable ? handleDraftChange : undefined}
      onSave={editable && onSave ? onSave : undefined}
      saving={saving}
    />
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          editable
            ? "max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            : "max-w-3xl max-h-[85vh] overflow-y-auto"
        }
      >
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <DialogTitle className="pr-2">Concept: {conceptName || "Untitled"}</DialogTitle>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {showDownloadPdf && !loading ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
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
          </div>
        </DialogHeader>

        {/* Story sits above Concept details — not inside the detail body/section */}
        {storyButton ? (
          <div className="w-full shrink-0 border-b pb-3">{storyButton}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading concept details…
          </div>
        ) : editable ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-2">
            <div className="flex min-h-0 flex-col rounded-lg border bg-background">
              <div className="shrink-0 border-b px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Concept details · Edit
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Source textbox-এর মতোই ফরম্যাট — AI পরিবর্তন নেই
                </p>
              </div>
              <div className="max-h-[58vh] flex-1 overflow-y-auto p-4">
                <ConceptDetailBody
                  detail={draft}
                  editable
                  onChange={handleDraftChange}
                  showVerbatim={false}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-lg border bg-muted/30">
              <div className="shrink-0 border-b bg-muted/50 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Concept details · Preview
                </p>
              </div>
              <div className="max-h-[58vh] flex-1 space-y-4 overflow-y-auto p-4">
                {/* Do not pass keyPoints here — shown once below to avoid duplicates */}
                <ConceptDetailPreview conceptName={conceptName} detail={draft} />
                {keyPointsSection}
                {showSelfQaEditor && conceptId ? (
                  <ConceptSelfQaEditor conceptId={conceptId} conceptName={conceptName} />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Concept details
            </p>
            <ConceptDetailBody detail={detail} showVerbatim />
            {keyPointsSection}
            {showSelfQaEditor && conceptId ? (
              <ConceptSelfQaEditor conceptId={conceptId} conceptName={conceptName} />
            ) : null}
          </div>
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
