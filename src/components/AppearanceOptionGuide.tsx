import { ChevronDown, CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AppearanceGuideItem } from "@/lib/appearanceOptionGuides";

type Props = {
  title: string;
  description?: string;
  items: AppearanceGuideItem[];
  className?: string;
  /** Optional label on the trigger button */
  buttonLabel?: string;
};

export function AppearanceOptionGuide({
  title,
  description,
  items,
  className,
  buttonLabel = "অপশন গাইড",
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={cn("h-8 gap-1.5 shrink-0", className)}>
          <CircleHelp className="h-3.5 w-3.5" />
          {buttonLabel}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(92vw,28rem)] max-h-[min(72vh,34rem)] overflow-hidden p-0"
      >
        <div className="sticky top-0 z-10 border-b bg-popover px-3.5 py-2.5">
          <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <ul className="max-h-[min(62vh,28rem)] space-y-2 overflow-y-auto p-3">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-md border border-border/70 bg-muted/25 px-3 py-2.5"
            >
              <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
