import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, icons, type LucideIcon } from "lucide-react";
import type { LandingWhyItem } from "@/lib/uiAppearance";

function WhyIcon({ name, color }: { name: string; color: string }) {
  const key = name.trim();
  const Lucide = (icons as Record<string, LucideIcon | undefined>)[key];
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
    setIndex(0);
    setPaused(false);
  }, [count, visible]);

  useEffect(() => {
    if (!autoplay || paused || count <= 1 || !inView || !tabVisible) return;
    const ms = Math.max(1800, (intervalSec || 3) * 1000);
    const t = window.setInterval(() => setIndex((n) => n + 1), ms);
    return () => window.clearInterval(t);
  }, [autoplay, paused, count, intervalSec, inView, tabVisible]);

  useEffect(() => {
    if (count === 0 || index < count || jumpingRef.current) return;
    const dur = Math.max(150, (transitionSec || 0.55) * 1000);
    const t = window.setTimeout(() => {
      setInstant(true);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setInstant(false));
      });
    }, dur);
    return () => window.clearTimeout(t);
  }, [index, count, transitionSec]);

  const goNext = () => {
    if (count <= 1 || jumpingRef.current) return;
    setPaused(true);
    setIndex((n) => n + 1);
  };

  const goPrev = () => {
    if (count <= 1 || jumpingRef.current) return;
    setPaused(true);
    if (index > 0) {
      setIndex((n) => n - 1);
      return;
    }
    // Seamless wrap: jump to duplicate set, then step back one
    jumpingRef.current = true;
    setInstant(true);
    setIndex(count);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setInstant(false);
        setIndex(count - 1);
        window.setTimeout(() => {
          jumpingRef.current = false;
        }, Math.max(150, (transitionSec || 0.55) * 1000) + 40);
      });
    });
  };

  if (count === 0) return null;

  const trackStyle: CSSProperties = {
    transform: cardW > 0 ? `translate3d(-${index * cardW}px, 0, 0)` : undefined,
    transition: instant ? "none" : `transform var(--pg-why-transition-sec, ${transitionSec || 0.55}s) ease`,
  };

  return (
    <div className={`pg-why-carousel${paused ? " is-paused" : ""}`}>
      <button type="button" className="pg-why-nav pg-why-nav-prev" aria-label="Previous" onClick={goPrev}>
        <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
      </button>

      <div
        ref={viewportRef}
        className="pg-why-viewport"
        style={{ ["--pg-why-visible" as string]: String(visible) }}
        aria-roledescription="carousel"
        aria-label={paused ? "Carousel paused — use arrows or click to resume" : "Carousel playing — click to pause"}
        onClick={() => setPaused((p) => !p)}
        role="group"
      >
        <div className="pg-why-track" style={trackStyle}>
          {loop.map((item, i) => (
            <article
              key={`${item.id}-${i}`}
              className="pg-why-card"
              style={{
                width: cardW > 0 ? cardW : undefined,
                flex: cardW > 0 ? `0 0 ${cardW}px` : `0 0 calc(100% / ${visible})`,
                background: item.cardBg,
                color: item.textColor,
              }}
            >
              <div className="pg-why-icon" style={{ background: item.iconBg, color: item.iconColor }}>
                <WhyIcon name={item.iconClass} color={item.iconColor} />
              </div>
              <p className="pg-why-text">{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <button type="button" className="pg-why-nav pg-why-nav-next" aria-label="Next" onClick={goNext}>
        <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}
