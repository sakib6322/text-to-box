import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Pins children to the absolute top of the viewport while scrolling.
 * More reliable than CSS sticky inside nested flex / padded shells.
 */
export function StickyTopBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const update = () => setHeight(bar.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none h-0 w-full" aria-hidden />
      <div
        ref={barRef}
        className={cn(
          "z-50 border-b bg-background shadow-sm",
          pinned ? "fixed inset-x-0 top-0" : "relative -mx-3 md:-mx-6",
          className,
        )}
      >
        {children}
      </div>
      {pinned ? <div style={{ height }} aria-hidden className="shrink-0" /> : null}
    </>
  );
}
