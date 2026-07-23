import { useEffect, useState } from "react";
import { BookMarked, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CKEditorField } from "@/components/CKEditorField";
import { HeadingSlideReader } from "@/components/HeadingSlideReader";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { isHtmlEmpty } from "@/lib/htmlContent";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { hasStoryContent, withStoryHtml } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { cn } from "@/lib/utils";
import type { HeadingSlidesAppearance } from "@/lib/uiAppearance";
import { resolveDeviceTheme } from "@/lib/uiAppearance";

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
  /** Fired when story panel opens/closes — parents can hide Concept Details below. */
  onOpenChange?: (open: boolean) => void;
};

function StoryPreviewBody({
  html,
  emptyMessage,
  storyEnabled,
  headingSlides,
}: {
  html: string;
  emptyMessage: string;
  storyEnabled: boolean;
  headingSlides: HeadingSlidesAppearance;
}) {
  if (isHtmlEmpty(html)) {
    return <p className="story-based-learning-empty text-sm">{emptyMessage}</p>;
  }
  if (storyEnabled) {
    return (
      <HeadingSlideReader
        html={html}
        config={headingSlides}
        richClassName="story-based-learning-rich"
        className="story-based-learning"
      />
    );
  }
  return (
    <div className="story-based-learning m-0 max-h-[min(58vh,28rem)] overflow-y-auto sm:m-1">
      <RichHtmlContent content={html} className="story-based-learning-rich" />
    </div>
  );
}

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
  onOpenChange,
}: StoryBasedLearningButtonProps) {
  const { appearance, activeDevice } = useUiAppearance();
  const sbl = resolveDeviceTheme(appearance, activeDevice).storyBasedLearning;
  const hs = appearance.headingSlides;
  const [open, setOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draftStory, setDraftStory] = useState(detail.storyHtml);

  const setOpenAndNotify = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (!next) setShowPreview(false);
  };

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

  const empty = isHtmlEmpty(draftStory) && isHtmlEmpty(detail.storyHtml);
  const previewHtml = editable ? draftStory : detail.storyHtml;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpenAndNotify}
      className={cn("story-based-learning-root w-full", className)}
    >
      <div className="flex justify-end">
        <CollapsibleTrigger asChild>
          <Button type="button" variant={variant} size={size} className="gap-1.5" aria-expanded={open}>
            {sbl.showButtonIcon ? <BookMarked className="h-4 w-4" /> : null}
            {sbl.buttonLabel}
            {hasStoryContent(detail) ? (
              <span
                className="h-1.5 w-1.5 rounded-full story-based-learning-accent"
                style={{ background: "var(--sbl-accent, hsl(var(--primary)))" }}
                aria-hidden
              />
            ) : null}
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="story-based-learning-dropdown data-[state=open]:animate-in data-[state=closed]:animate-out">
        <div className="story-based-learning-panel mt-2 overflow-hidden">
          <div
            className="flex flex-wrap items-start justify-between gap-2 border-b px-3 py-2 sm:px-4"
            style={{ borderColor: "var(--sbl-border)" }}
            data-sbl-title
          >
            <p className="min-w-0 text-sm font-semibold">
              {sbl.buttonLabel}
              {conceptName ? `: ${conceptName}` : ""}
            </p>
            <Button
              type="button"
              variant={showPreview ? "default" : "outline"}
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={() => setShowPreview((v) => !v)}
              aria-pressed={showPreview}
            >
              {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showPreview ? "Hide preview" : "Preview"}
            </Button>
          </div>

          {editable ? (
            <div className="space-y-3 p-3 sm:p-4">
              <div
                className={cn(
                  "grid gap-3",
                  showPreview ? "lg:grid-cols-2" : "grid-cols-1",
                )}
              >
                <div className="flex min-h-0 flex-col rounded-md border" style={{ borderColor: "var(--sbl-border)" }}>
                  <div className="shrink-0 border-b px-3 py-2" style={{ borderColor: "var(--sbl-border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      যেভাবে লিখবেন সেভাবেই সেভ হবে — কোনো AI পরিবর্তন নেই
                    </p>
                  </div>
                  <div className="max-h-[min(58vh,28rem)] flex-1 overflow-y-auto p-3">
                    <CKEditorField
                      value={draftStory}
                      onChange={handleStoryChange}
                      placeholder="Story লিখুন — heading, bold, list, table…"
                      appearanceScope="story"
                      className="w-full"
                    />
                  </div>
                </div>

                {showPreview ? (
                  <div className="flex min-h-0 flex-col rounded-md border" style={{ borderColor: "var(--sbl-border)" }}>
                    <div className="shrink-0 border-b px-3 py-2" style={{ borderColor: "var(--sbl-border)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {hs.storyEnabled ? "Heading slides + progress" : "Plain HTML"}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex-1 p-3",
                        hs.storyEnabled ? "min-h-0" : "max-h-[min(58vh,28rem)] overflow-y-auto",
                      )}
                    >
                      <StoryPreviewBody
                        html={draftStory}
                        emptyMessage={sbl.emptyMessage}
                        storyEnabled={hs.storyEnabled}
                        headingSlides={hs}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpenAndNotify(false)} disabled={saving}>
                  Close
                </Button>
                {onSave ? (
                  <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save story
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setOpenAndNotify(false)}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          ) : showPreview ? (
            empty ? (
              <p className="story-based-learning-empty p-3 text-sm sm:p-4">{sbl.emptyMessage}</p>
            ) : (
              <div className="p-3 sm:p-4">
                <StoryPreviewBody
                  html={previewHtml}
                  emptyMessage={sbl.emptyMessage}
                  storyEnabled={hs.storyEnabled}
                  headingSlides={hs}
                />
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-3 px-3 py-8 text-center sm:px-4">
              <p className="text-sm text-muted-foreground">
                {empty ? sbl.emptyMessage : "Preview দেখতে উপরের Preview বাটনে ক্লিক করুন।"}
              </p>
              {!empty ? (
                <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setShowPreview(true)}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
