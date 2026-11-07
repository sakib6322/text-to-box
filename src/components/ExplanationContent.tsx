import { RichHtmlContent } from "@/components/RichHtmlContent";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
};

/** Renders question explanation — rich HTML when present, plain text otherwise. */
export function ExplanationContent({ content, className }: Props) {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) return null;
  return (
    <RichHtmlContent
      content={trimmed}
      className={cn("explanation-prose max-w-none", className)}
    />
  );
}
