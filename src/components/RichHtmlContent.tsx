import { cn } from "@/lib/utils";
import { looksLikeHtml } from "@/lib/htmlContent";

type Props = {
  content: string;
  className?: string;
  as?: "div" | "p" | "span";
};

export function RichHtmlContent({ content, className, as: Tag = "div" }: Props) {
  if (!content.trim()) return null;

  if (looksLikeHtml(content)) {
    return (
      <Tag
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "[&_h1]:text-xl [&_h1]:font-bold",
          "[&_h2]:text-lg [&_h2]:font-semibold",
          "[&_h3]:text-base [&_h3]:font-semibold",
          "[&_u]:underline",
          "[&_strong]:font-bold [&_b]:font-bold",
          "[&_em]:italic [&_i]:italic",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2",
          "[&_figure]:my-3 [&_figcaption]:text-xs [&_figcaption]:text-muted-foreground",
          "[&_span]:align-baseline",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <Tag className={cn("whitespace-pre-wrap", className)}>{content}</Tag>;
}
