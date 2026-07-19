import { useEffect, useState } from "react";
import { BookMarked, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CKEditorField } from "@/components/CKEditorField";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { isHtmlEmpty } from "@/lib/htmlContent";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { hasStoryContent, withStoryHtml } from "@/lib/conceptDetail";
import type { ConceptDetailUpdater } from "@/components/ConceptDetailBody";
import { cn } from "@/lib/utils";
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

  const empty = isHtmlEmpty(draftStory) && isHtmlEmpty(detail.storyHtml);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
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
            className="shrink-0 border-b px-3 py-2 sm:px-4"
            style={{ borderColor: "var(--sbl-border)" }}
            data-sbl-title
          >
            <p className="text-sm font-semibold">
              {sbl.buttonLabel}
              {conceptName ? `: ${conceptName}` : ""}
            </p>
          </div>

          {editable ? (
            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
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
                    minHeight="280px"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-md border" style={{ borderColor: "var(--sbl-border)" }}>
                <div className="shrink-0 border-b px-3 py-2" style={{ borderColor: "var(--sbl-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                </div>
                <div className="max-h-[min(58vh,28rem)] flex-1 overflow-y-auto">
                  {isHtmlEmpty(draftStory) ? (
                    <p className="story-based-learning-empty text-sm">{sbl.emptyMessage}</p>
                  ) : (
                    <div className="story-based-learning m-3">
                      <RichHtmlContent content={draftStory} className="story-based-learning-rich" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 lg:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>
                  Close
                </Button>
                {onSave ? (
                  <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save story
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                )}
              </div>
            </div>
          ) : empty ? (
            <p className="story-based-learning-empty text-sm">{sbl.emptyMessage}</p>
          ) : (
            <div className="story-based-learning max-h-[min(70vh,32rem)] overflow-y-auto p-3 sm:p-4">
              <RichHtmlContent content={detail.storyHtml} className="story-based-learning-rich" />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
