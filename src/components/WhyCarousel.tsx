import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  PencilRuler,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { LandingWhyItem } from "@/lib/uiAppearance";

/** Explicit allowlist — never import lucide `icons` (pulls entire registry ~650KB). */
const WHY_ICONS: Record<string, LucideIcon> = {
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Lightbulb,
  PencilRuler,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
};

function WhyIcon({ name, color }: { name: string; color: string }) {
  const key = name.trim();
  const Lucide = WHY_ICONS[key] ?? (key ? null : Sparkles);
  if (Lucide) {
    return <Lucide className="h-7 w-7 sm:h-8 sm:w-8" style={{ color }} strokeWidth={1.75} aria-hidden />;
  }
  if (key) {
    return <span className={key} style={{ color, fontSize: "1.75rem", lineHeight: 1 }} aria-hidden />;
  }
  return <span className="inline-block h-7 w-7 rounded-full bg-current/20" style={{ color }} aria-hidden />;
}

function useVisibleCount() {
  const [visible, setVisible] = useState(4);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setVisible(mq.matches ? 2 : 4);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return visible;
}

type Props = {
  items: LandingWhyItem[];
  autoplay: boolean;
  intervalSec: number;
  transitionSec: number;
};

/** Continuous Why-cards: 4 visible on desktop, 2 on mobile; advances one card at a time. */
export function WhyCarousel({ items, autoplay, intervalSec, transitionSec }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const [viewportW, setViewportW] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  const visible = useVisibleCount();
  const jumpingRef = useRef(false);

  const count = items.length;
  const loop = count > 0 ? [...items, ...items] : [];
  const cardW = viewportW > 0 ? viewportW / visible : 0;

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setViewportW(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "60px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || count <= visible || paused || !inView || !tabVisible) return;
    const ms = Math.max(2, intervalSec) * 1000;
    const id = window.setInterval(() => {
      setIndex((i) => i + 1);
    }, ms);
    return () => window.clearInterval(id);
  }, [autoplay, count, visible, paused, inView, tabVisible, intervalSec]);

  useEffect(() => {
    if (count <= 0) return;
    if (index < count) return;
    jumpingRef.current = true;
    setInstant(true);
    setIndex(index - count);
    const t = window.setTimeout(() => {
      setInstant(false);
      jumpingRef.current = false;
    }, 40);
    return () => window.clearTimeout(t);
  }, [index, count]);

  const go = (dir: -1 | 1) => {
    if (jumpingRef.current || count <= 0) return;
    setIndex((i) => Math.max(0, i + dir));
  };

  if (!count) return null;

  const trackStyle: CSSProperties = {
    width: cardW > 0 ? cardW * loop.length : undefined,
    transform: cardW > 0 ? `translate3d(${-index * cardW}px,0,0)` : undefined,
    transition: instant ? "none" : `transform ${Math.max(0.2, transitionSec)}s ease`,
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex will-change-transform" style={trackStyle}>
          {loop.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="box-border shrink-0 px-1.5 sm:px-2"
              style={{ width: cardW > 0 ? cardW : `${100 / visible}%` }}
            >
              <div
                className="flex h-full flex-col items-center gap-3 rounded-2xl border border-white/15 px-3 py-5 text-center sm:px-4 sm:py-6"
                style={{
                  background: item.cardBg && item.cardBg !== "transparent" ? item.cardBg : "rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16"
                  style={{ background: item.iconBg }}
                >
                  <WhyIcon name={item.iconClass} color={item.iconColor} />
                </div>
                <p className="text-sm font-medium leading-snug sm:text-base" style={{ color: item.textColor }}>
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {count > visible ? (
        <>
          <button
            type="button"
            className="absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/55"
            onClick={() => go(-1)}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur-sm hover:bg-black/55"
            onClick={() => go(1)}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}
    </div>
  );
}
