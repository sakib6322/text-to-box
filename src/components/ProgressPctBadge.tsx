import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  pct: number;
  className?: string;
  size?: "sm" | "md";
};

export function ProgressPctBadge({ pct, className, size = "sm" }: Props) {
  const complete = pct >= 100;
  return (
    <Badge
      variant={complete ? "default" : "secondary"}
      className={cn("tabular-nums shrink-0", size === "sm" ? "text-[10px]" : "text-xs", className)}
    >
      {Math.round(pct)}%
    </Badge>
  );
}
