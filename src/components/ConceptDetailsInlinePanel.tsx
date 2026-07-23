import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConceptDetailBody } from "@/components/ConceptDetailBody";
import { ConceptDetailPreview } from "@/components/ConceptDetailPreview";
import type { ConceptDetail, KeyPointWithBoards } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { downloadConceptDetailPdf } from "@/lib/downloadConceptDetailPdf";
import { richHtmlImageOptionsFromEditor } from "@/lib/richHtmlImages";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { conceptAdminPreviewHeadingSlidesEnabled } from "@/lib/uiAppearance";
import { Download, Eye, EyeOff, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { StoryBasedLearningButton } from "@/components/StoryBasedLearning";
import {
  EditableKeyPointSection,
  type KeyPointSavePayload,
} from "@/components/EditableKeyPointSection";
import type { BoardOption } from "@/components/BoardCheckboxGroup";
import { ConceptSelfQaEditor } from "@/components/ConceptSelfQaEditor";
import { cn } from "@/lib/utils";

export type ConceptDetailsInlinePanelProps = {
  active: boolean;
  conceptName: string;
  detail: ConceptDetail;
  keyPoints: KeyPointWithBoards[] | string[];
  loading?: boolean;
  editable?: boolean;
  onDetailChange?: (updater: ConceptDetailUpdater) => void;
  onSave?: (detail: ConceptDetail) => Promise<void>;
  saving?: boolean;
  showDownloadPdf?: boolean;
  showKeyPoints?: boolean;
  keyPointsEditable?: boolean;
  boardOptions?: BoardOption[];
  onSaveKeyPoint?: (payload: KeyPointSavePayload) => Promise<void>;
  onAddKeyPoint?: (payload: { content: string; boardIds: string[] }) => Promise<void>;
  onDeleteKeyPoint?: (id: string) => Promise<void>;
  savingKeyPoint?: boolean;
  conceptId?: string;
  showSelfQaEditor?: boolean;
  onClose?: () => void;
  /** dialog = inside modal; inline = Suggestions dropdown panel */
  variant?: "dialog" | "inline";
};

function normalizeKeyPoints(kps: KeyPointWithBoards[] | string[]): KeyPointWithBoards[] {
  if (!kps.length) return [];
  if (typeof kps[0] === "string") {
    return (kps as string[]).map((content) => ({ content }));
  }
  return kps as KeyPointWithBoards[];
}

export function ConceptDetailsInlinePanel({
  active,
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
  onClose,
  variant = "inline",
}: ConceptDetailsInlinePanelProps) {
  const { appearance, activeDevice } = useUiAppearance();
  const [draft, setDraft] = useState<ConceptDetail>(detail);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const normalizedKps = normalizeKeyPoints(keyPoints);
  const adminPreviewSlides = conceptAdminPreviewHeadingSlidesEnabled(
    appearance.conceptAdminPreview,
    activeDevice,
  );
  const devicePreviewLabel =
    activeDevice === "mobile" ? "Phone" : activeDevice === "tablet" ? "Tablet" : "Computer";
  const isDialog = variant === "dialog";

  useEffect(() => {
    if (active && !loading) setDraft(detail);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when panel opens / load completes
  }, [active, loading]);

  useEffect(() => {
    if (!active) {
      setStoryOpen(false);
      setShowPreview(false);
    }
  }, [active]);

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
      onOpenChange={setStoryOpen}
    />
  ) : null;

  const editMaxH = isDialog ? "max-h-[58vh]" : "max-h-[min(65vh,32rem)]";

  return (
    <div className={isDialog ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "space-y-3"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={isDialog ? "text-lg font-semibold leading-none" : "text-sm font-semibold"}>
            {isDialog ? `Concept: ${conceptName || "Untitled"}` : "Concept details"}
          </p>
          {!isDialog && conceptName ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{conceptName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {editable && !loading && !storyOpen ? (
            <Button
              type="button"
              variant={showPreview ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowPreview((v) => !v)}
              aria-pressed={showPreview}
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? "Hide preview" : "Preview"}
            </Button>
          ) : null}
          {showDownloadPdf && !loading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              PDF
            </Button>
          ) : null}
          {onClose && !isDialog ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose} disabled={saving}>
              <X className="mr-1 h-3.5 w-3.5" />
              Close
            </Button>
          ) : null}
        </div>
      </div>

      {storyButton ? <div className="border-b pb-3">{storyButton}</div> : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading concept details…
        </div>
      ) : storyOpen ? null : editable ? (
        <div className="space-y-4">
          <div
            className={cn(
              showPreview &&
                (activeDevice === "tablet"
                  ? "grid gap-4 md:grid-cols-2"
                  : activeDevice === "desktop"
                    ? "grid gap-4 lg:grid-cols-2"
                    : "grid gap-4"),
            )}
          >
            <div className="flex min-h-0 flex-col rounded-lg border bg-background">
              <div className="shrink-0 border-b px-3 py-2 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Source textbox format — no AI rewrite</p>
              </div>
              <div className={`${editMaxH} flex-1 overflow-y-auto p-3 sm:p-4`}>
                <ConceptDetailBody detail={draft} editable onChange={handleDraftChange} showVerbatim={false} />
              </div>
            </div>

            {showPreview ? (
              <div className="flex min-h-0 flex-col rounded-lg border bg-muted/30">
                <div className="shrink-0 border-b bg-muted/50 px-3 py-2 sm:px-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {devicePreviewLabel} view
                    {adminPreviewSlides
                      ? " · Heading slides + progress"
                      : " · Plain HTML (slides off for this device)"}
                  </p>
                </div>
                <div className={`${editMaxH} flex-1 space-y-4 overflow-y-auto p-3 sm:p-4`}>
                  <ConceptDetailPreview conceptName={conceptName} detail={draft} />
                  {keyPointsSection}
                  {showSelfQaEditor && conceptId ? (
                    <ConceptSelfQaEditor conceptId={conceptId} conceptName={conceptName} />
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {!showPreview ? (
            <div className="space-y-4">
              {keyPointsSection}
              {showSelfQaEditor && conceptId ? (
                <ConceptSelfQaEditor conceptId={conceptId} conceptName={conceptName} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="concept-detail-card">
            <ConceptDetailBody detail={detail} showVerbatim={false} />
          </div>
          {keyPointsSection}
          {showSelfQaEditor && conceptId ? (
            <ConceptSelfQaEditor conceptId={conceptId} conceptName={conceptName} />
          ) : null}
        </div>
      )}

      {editable && !loading && !storyOpen && onSave ? (
        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          {onClose && isDialog ? (
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Close
            </Button>
          ) : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      ) : null}
    </div>
  );
}
