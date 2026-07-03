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
          className,
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <Tag className={cn("whitespace-pre-wrap", className)}>{content}</Tag>;
}
