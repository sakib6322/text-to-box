import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title?: ReactNode;
  titleExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Extra classes on the body (content) area */
  bodyClassName?: string;
  /** Hide the title bar (body only, still one panel card) */
  hideHeader?: boolean;
};

/** Single concept-details panel — same shell pattern as `.story-based-learning-panel`. */
export function ConceptDetailShell({
  title = "Concept detail",
  titleExtra,
  children,
  className,
  bodyClassName,
  hideHeader = false,
}: Props) {
  return (
    <div className={cn("concept-detail-card overflow-hidden", className)}>
      {!hideHeader ? (
        <div className="concept-detail-card-header" data-cd-title>
          <div className="min-w-0 flex-1 text-sm font-semibold">{title}</div>
          {titleExtra ? <div className="flex shrink-0 flex-wrap items-center gap-2">{titleExtra}</div> : null}
        </div>
      ) : null}
      <div className={cn("concept-detail-card-body", bodyClassName)}>{children}</div>
    </div>
  );
}
