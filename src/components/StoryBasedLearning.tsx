import { useEffect, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CKEditorField } from "@/components/CKEditorField";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { isHtmlEmpty } from "@/lib/htmlContent";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { hasStoryContent, withStoryHtml } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { cn } from "@/lib/utils";
import { resolveDeviceTheme, type StoryDialogWidth } from "@/lib/uiAppearance";

const DIALOG_WIDTH_CLASS: Record<StoryDialogWidth, string> = {
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "max-w-[min(96vw,90rem)]",
};

type StoryBasedLearningButtonProps = {
  detail: ConceptDetail;
  conceptName?: string;
  editable?: boolean;
  onDetailChange?: (updater: ConceptDetailUpdater) => void;
  onSave?: (detail: ConceptDetail) => Promise<void>;
  saving?: boolean;
  variant?: "outline" | "secondary" | "default" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
};

export function StoryBasedLearningButton({
  detail,
  conceptName = "",
  editable = false,
  onDetailChange,
  onSave,
  saving = false,
  variant = "outline",
  size = "sm",
  className,
}: StoryBasedLearningButtonProps) {
  const { appearance, activeDevice } = useUiAppearance();
  const sbl = resolveDeviceTheme(appearance, activeDevice).storyBasedLearning;
  const [open, setOpen] = useState(false);
  const [draftStory, setDraftStory] = useState(detail.storyHtml);

  useEffect(() => {
    if (open) setDraftStory(detail.storyHtml);
  }, [open, detail.storyHtml]);

  const handleStoryChange = (html: string) => {
    setDraftStory(html);
    if (editable) {
      onDetailChange?.((prev) => withStoryHtml(prev, html));
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    await onSave(withStoryHtml(detail, draftStory));
  };

  const showPreview = editable;
  const empty = isHtmlEmpty(draftStory) && isHtmlEmpty(detail.storyHtml);
  const widthClass = DIALOG_WIDTH_CLASS[sbl.dialogMaxWidth] ?? DIALOG_WIDTH_CLASS.lg;
  const editWidthClass =
    sbl.dialogMaxWidth === "full" || sbl.dialogMaxWidth === "2xl" ? widthClass : "max-w-6xl";

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {sbl.showButtonIcon ? <BookMarked className="mr-2 h-4 w-4" /> : null}
        {sbl.buttonLabel}
        {hasStoryContent(detail) ? (
          <span
            className="ml-1.5 h-1.5 w-1.5 rounded-full story-based-learning-accent"
            style={{ background: "var(--sbl-accent, hsl(var(--primary)))" }}
            aria-hidden
          />
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "story-based-learning-dialog overflow-hidden flex flex-col",
            editable ? `${editWidthClass} max-h-[90vh]` : `${widthClass} max-h-[85vh] overflow-y-auto`,
          )}
        >
          <DialogHeader>
            <DialogTitle data-sbl-title>
              {sbl.buttonLabel}
              {conceptName ? `: ${conceptName}` : ""}
            </DialogTitle>
          </DialogHeader>

          {editable ? (
            <div className="grid lg:grid-cols-2 gap-4 min-h-0 flex-1 overflow-hidden">
              <div className="flex flex-col min-h-0 story-based-learning-panel">
                <div className="shrink-0 border-b px-4 py-2" style={{ borderColor: "var(--sbl-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Edit
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    যেভাবে লিখবেন সেভাবেই সেভ হবে — কোনো AI পরিবর্তন নেই
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 max-h-[58vh]">
                  <CKEditorField
                    value={draftStory}
                    onChange={handleStoryChange}
                    placeholder="Story লিখুন — heading, bold, list, table…"
                    minHeight="360px"
                    className="w-full"
                  />
                </div>
              </div>

              {showPreview ? (
                <div className="flex flex-col min-h-0 story-based-learning-panel">
                  <div className="shrink-0 border-b px-4 py-2" style={{ borderColor: "var(--sbl-border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Preview
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[58vh]">
                    {isHtmlEmpty(draftStory) ? (
                      <p className="story-based-learning-empty text-sm">{sbl.emptyMessage}</p>
                    ) : (
                      <div className="story-based-learning m-3">
                        <RichHtmlContent content={draftStory} className="story-based-learning-rich" />
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : empty ? (
            <p className="story-based-learning-empty text-sm">{sbl.emptyMessage}</p>
          ) : (
            <div className="story-based-learning">
              <RichHtmlContent content={detail.storyHtml} className="story-based-learning-rich" />
            </div>
          )}

          {editable ? (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Close
              </Button>
              {onSave ? (
                <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save story
                </Button>
              ) : (
                <Button type="button" onClick={() => setOpen(false)}>
                  Done
                </Button>
              )}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
