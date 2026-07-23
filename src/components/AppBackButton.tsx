import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppBack } from "@/hooks/useAppBack";
import { cn } from "@/lib/utils";
import type { To } from "react-router-dom";

type Props = {
  /** Used only when there is no previous history entry */
  fallback?: To;
  className?: string;
  "aria-label"?: string;
};

/** Header back control — goes to the previous page (not a hard-coded home). */
export function AppBackButton({
  fallback = "/my-suggestions",
  className,
  "aria-label": ariaLabel = "Back",
}: Props) {
  const goBack = useAppBack(fallback);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      onClick={goBack}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
