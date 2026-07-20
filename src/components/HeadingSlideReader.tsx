import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import {
  formatSlideTemplate,
  levelsFromFlags,
  splitHtmlByHeadings,
  type HeadingSlide,
} from "@/lib/headingSlides";
import type { HeadingSlidesAppearance } from "@/lib/uiAppearance";
import { cn } from "@/lib/utils";

type Props = {
  html: string;
  config: HeadingSlidesAppearance;
  /** Extra class on the rich HTML wrapper (e.g. concept-detail-rich / story-based-learning-rich) */
  richClassName?: string;
  className?: string;
  /** Called when user reaches the last slide (or single-slide content) */
  onReachLastSlide?: () => void;
};

export function HeadingSlideReader({ html, config, richClassName, className, onReachLastSlide }: Props) {
  const levels = useMemo(
    () => levelsFromFlags(config.splitH1, config.splitH2, config.splitH3),
    [config.splitH1, config.splitH2, config.splitH3],
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

  const [index, setIndex] = useState(0);
  const [nearEnd, setNearEnd] = useState(!config.requireScrollToEnd);
  const scrollRef = useRef<HTMLDivElement>(null);

  const safeIndex = Math.min(index, Math.max(0, slides.length - 1));
  const slide: HeadingSlide | undefined = slides[safeIndex];
  const isLast = safeIndex >= slides.length - 1;
  const hasMultiple = slides.length > 1;

  useEffect(() => {
    setIndex(0);
  }, [html, levels.join(",")]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    if (!config.requireScrollToEnd) {
      setNearEnd(true);
      return;
    }
    // Short content: treat as already at end
    requestAnimationFrame(() => {
      const box = scrollRef.current;
      if (!box) return;
      if (box.scrollHeight <= box.clientHeight + 8) setNearEnd(true);
      else setNearEnd(false);
    });
  }, [safeIndex, slide?.id, config.requireScrollToEnd]);

  useEffect(() => {
    if (isLast && slides.length > 0) onReachLastSlide?.();
  }, [isLast, slides.length, onReachLastSlide]);

  const onScroll = useCallback(() => {
    const box = scrollRef.current;
    if (!box || !config.requireScrollToEnd) {
      setNearEnd(true);
      return;
    }
    const max = box.scrollHeight - box.clientHeight;
    if (max <= 0) {
      setNearEnd(true);
      return;
    }
    const pct = (box.scrollTop / max) * 100;
    setNearEnd(pct >= (config.scrollShowNextAtPercent ?? 85));
  }, [config.requireScrollToEnd, config.scrollShowNextAtPercent]);

  if (!slide) {
    return null;
  }

  if (!hasMultiple) {
    return (
      <div className={cn(richClassName, className)}>
        <RichHtmlContent content={slide.html} />
      </div>
    );
  }

  const nextSlide = !isLast ? slides[safeIndex + 1] : undefined;
  const nextHeading = nextSlide?.headingText || "";
  const showNext = nearEnd && !isLast;
  const nextBtnLabel = config.nextLabel || "Next";
  const headingCardText =
    config.showNextHeadingPreview && nextHeading
      ? formatSlideTemplate(config.nextTemplate || "{heading}", {
          next: nextBtnLabel,
          heading: nextHeading,
        })
      : "";

  const counterText = config.showCounter
    ? formatSlideTemplate(config.counterTemplate || "{current} / {total}", {
        current: safeIndex + 1,
        total: slides.length,
      })
    : "";

  const showEndLabel = isLast && Boolean(config.lastSlideLabel);
  const footerVisible = showNext || showEndLabel;

  return (
    <div
      className={cn("heading-slide-reader", className)}
      data-sticky-next={config.stickyNextBar ? "1" : "0"}
      data-footer={footerVisible ? "1" : "0"}
      data-has-heading-card={headingCardText ? "1" : "0"}
    >
      <div className="heading-slide-chrome">
        {config.showCounter ? <span className="heading-slide-counter">{counterText}</span> : null}
        {config.showPrev ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={safeIndex <= 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {config.prevLabel || "Previous"}
          </Button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="heading-slide-scroll"
        data-pad-footer={!isLast || showEndLabel ? "1" : "0"}
        onScroll={onScroll}
      >
        <div className={cn("heading-slide-body", richClassName)}>
          <RichHtmlContent content={slide.html} />
        </div>
      </div>

      {showEndLabel ? (
        <div className="heading-slide-next-bar heading-slide-next-bar--end">
          <span className="text-sm font-medium">{config.lastSlideLabel}</span>
        </div>
      ) : null}

      {showNext ? (
        <div className="heading-slide-next-bar">
          <div className="heading-slide-next-actions">
            <Button
              type="button"
              className="heading-slide-next-btn w-full gap-2 sm:w-auto"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
            >
              <span className="truncate">{nextBtnLabel}</span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
          </div>
          {headingCardText ? (
            <div className="heading-slide-next-heading-card">
              <p className="heading-slide-next-heading-text">{headingCardText}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
