import type { CSSProperties, ReactNode } from "react";

type Props = {
  id?: string;
  className?: string;
  background: string;
  /** Short sections (footer): background fills section height instead of sticky viewport. */
  fill?: boolean;
  children: ReactNode;
};

/** Section-scoped sticky background — stays fixed while content scrolls. */
export function LandingSection({ id, className, background, fill, children }: Props) {
  const bgStyle = { background } satisfies CSSProperties;
  return (
    <section id={id} className={["pg-section", fill ? "pg-section-fill" : "", className].filter(Boolean).join(" ")}>
      <div className="pg-section-bg" style={bgStyle} aria-hidden />
      <div className="pg-section-content">{children}</div>
    </section>
  );
}
