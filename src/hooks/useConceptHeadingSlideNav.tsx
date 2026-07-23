import { useEffect, useMemo, useState } from "react";
import { HeadingSlideJumpFilter } from "@/components/HeadingSlideJumpFilter";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { resolveBodyHtml } from "@/lib/conceptDetail";

/** Shared slide index + jump filter for concept-detail read views (opposite Story button). */
export function useConceptHeadingSlideNav(detail: ConceptDetail, enabled = true) {
  const { appearance } = useUiAppearance();
  const hs = appearance.headingSlides;
  const html = useMemo(() => resolveBodyHtml(detail).trim(), [detail]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [html]);

  const showFilter = enabled && hs.conceptDetailsEnabled && Boolean(html);
  const jumpFilter = showFilter ? (
    <HeadingSlideJumpFilter html={html} config={hs} index={slideIndex} onIndexChange={setSlideIndex} />
  ) : null;

  return { slideIndex, setSlideIndex, jumpFilter };
}
