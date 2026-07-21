import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { looksLikeHtml } from "@/lib/htmlContent";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import {
  attachGoogleDriveImageFallbacks,
  prepareRichHtmlForDisplay,
  richHtmlImageOptionsFromEditor,
} from "@/lib/richHtmlImages";

type Props = {
  content: string;
  className?: string;
  as?: "div" | "p" | "span";
};

export function RichHtmlContent({ content, className, as: Tag = "div" }: Props) {
  const { appearance } = useUiAppearance();
  const containerRef = useRef<HTMLElement>(null);
  const imageOptions = useMemo(
    () => richHtmlImageOptionsFromEditor(appearance.richEditor),
    [appearance.richEditor],
  );

  const html = useMemo(() => {
    if (!content.trim() || !looksLikeHtml(content)) return "";
    return prepareRichHtmlForDisplay(content, imageOptions);
  }, [content, imageOptions]);

  useEffect(() => {
    if (!html) return;
    return attachGoogleDriveImageFallbacks(containerRef.current);
  }, [html]);

  if (!content.trim()) return null;

  if (looksLikeHtml(content)) {
    return (
      <Tag
        ref={containerRef as never}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none concept-detail-prose",
          "[&_h1]:font-bold",
          "[&_h2]:font-semibold",
          "[&_h3]:font-semibold",
          "[&_u]:underline",
          "[&_em]:italic [&_i]:italic",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2",
          "[&_figure]:my-3 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground",
          "[&_span]:align-baseline",
          "[&_img.rich-html-gdrive-failed]:min-h-[4rem] [&_img.rich-html-gdrive-failed]:border [&_img.rich-html-gdrive-failed]:border-dashed [&_img.rich-html-gdrive-failed]:bg-muted/40 [&_img.rich-html-gdrive-failed]:p-2",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return <Tag className={cn("whitespace-pre-wrap", className)}>{content}</Tag>;
}
