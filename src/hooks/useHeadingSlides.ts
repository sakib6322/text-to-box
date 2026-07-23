import { useMemo } from "react";
import {
  levelsFromFlags,
  splitHtmlByHeadings,
  type HeadingSlide,
} from "@/lib/headingSlides";
import type { HeadingSlidesAppearance } from "@/lib/uiAppearance";

/** Single parse of HTML → heading slides (share between jump filter + reader). */
export function useHeadingSlides(html: string, config: HeadingSlidesAppearance): HeadingSlide[] {
  const levels = useMemo(
    () => levelsFromFlags(config),
    [config.splitH1, config.splitH2, config.splitH3, config.splitH4, config.splitH5, config.splitH6],
  );

  return useMemo(
    () =>
      splitHtmlByHeadings(html, {
        levels,
        preHeadingMode: config.preHeadingMode,
        minCharsPerSlide: config.minCharsPerSlide,
      }),
    [html, levels, config.preHeadingMode, config.minCharsPerSlide],
  );
}
