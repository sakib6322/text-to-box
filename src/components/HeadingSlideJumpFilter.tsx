import { useMemo } from "react";
import { Check, ChevronDown, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  levelsFromFlags,
  splitHtmlByHeadings,
  type HeadingSlide,
} from "@/lib/headingSlides";
import type { HeadingSlidesAppearance } from "@/lib/uiAppearance";
import { cn } from "@/lib/utils";

function slideLabel(slide: HeadingSlide, index: number): string {
  const text = slide.headingText?.trim();
  if (text) return text;
  if (slide.headingTag === "intro") return "Intro";
  return `Section ${index + 1}`;
}

type Props = {
  html: string;
  config: HeadingSlidesAppearance;
  index: number;
  onIndexChange: (index: number) => void;
  className?: string;
  /** Compact trigger for mobile toolbars */
  size?: "sm" | "default";
};

export function HeadingSlideJumpFilter({
  html,
  config,
  index,
  onIndexChange,
  className,
  size = "sm",
}: Props) {
  const levels = useMemo(
    () => levelsFromFlags(config),
    [config.splitH1, config.splitH2, config.splitH3, config.splitH4, config.splitH5, config.splitH6],
  );

  const slides = useMemo(
    () =>
      splitHtmlByHeadings(html, {
        levels,
        preHeadingMode: config.preHeadingMode,
        minCharsPerSlide: config.minCharsPerSlide,
      }),
    [html, levels, config.preHeadingMode, config.minCharsPerSlide],
  );

  if (slides.length <= 1) return null;

  const safeIndex = Math.min(Math.max(0, index), slides.length - 1);
  const currentLabel = slideLabel(slides[safeIndex]!, safeIndex);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={cn(
            "h-8 max-w-[min(100%,11rem)] gap-1 px-2 text-xs sm:max-w-[16rem] sm:gap-1.5 sm:px-2.5",
            className,
          )}
          aria-label="Jump to heading"
          title="Jump to heading"
        >
          <ListTree className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="min-w-0 truncate">{currentLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[min(70vh,24rem)] w-[min(calc(100vw-1.5rem),22rem)] overflow-y-auto p-1"
      >
        {slides.map((slide, i) => {
          const active = i === safeIndex;
          return (
            <DropdownMenuItem
              key={slide.id}
              className={cn(
                "cursor-pointer items-start gap-2 rounded-sm px-2 py-2 text-xs",
                active && "bg-accent",
              )}
              onSelect={() => onIndexChange(i)}
            >
              <span className="mt-0.5 w-5 shrink-0 tabular-nums text-[10px] text-muted-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug">
                {slideLabel(slide, i)}
              </span>
              {active ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
