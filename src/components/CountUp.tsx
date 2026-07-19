import { useEffect, useState } from "react";

type CountUpProps = {
  value: number;
  /** Animation length */
  durationMs?: number;
  /** Stagger start so numbers rise serially */
  delayMs?: number;
  active?: boolean;
  className?: string;
};

/** Lightweight count-up — rAF + ease-out only (no heavy libs). */
export function CountUp({
  value,
  durationMs = 850,
  delayMs = 0,
  active = true,
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) {
      setDisplay(0);
      return;
    }
    const target = Math.max(0, Math.floor(value));
    if (target === 0) {
      setDisplay(0);
      return;
    }

    let raf = 0;
    let startAt: number | null = null;
    const delayId = window.setTimeout(() => {
      const tick = (now: number) => {
        if (startAt == null) startAt = now;
        const t = Math.min(1, (now - startAt) / Math.max(200, durationMs));
        const eased = 1 - (1 - t) ** 3;
        setDisplay(Math.round(target * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(target);
      };
      raf = requestAnimationFrame(tick);
    }, Math.max(0, delayMs));

    return () => {
      window.clearTimeout(delayId);
      cancelAnimationFrame(raf);
    };
  }, [value, durationMs, delayMs, active]);

  return <span className={className}>{display}</span>;
}
