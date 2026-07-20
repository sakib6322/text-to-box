import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, ChevronRight, Headphones, Menu, Play, X } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { getSession, isAuthenticated } from "@/lib/auth";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { LandingSection } from "@/components/LandingSection";
import { WhyCarousel } from "@/components/WhyCarousel";
import { heroSectionBackground, landingPageStyleVars, type LandingFaqItem } from "@/lib/uiAppearance";

type CourseRoutine = {
  id: string;
  publish_date: string;
  label: string;
  system_name?: string | null;
  subject_name?: string | null;
};

type Course = {
  id: string;
  name: string;
  slug: string;
  description: string;
  routines?: CourseRoutine[];
};

function formatRoutineDate(raw: string) {
  const d = new Date(`${String(raw).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function FaqItemCard({
  item,
  seeAnswerLabel,
  open,
  onToggle,
}: {
  item: LandingFaqItem;
  seeAnswerLabel: string;
  open: boolean;
  onToggle: () => void;
}) {
  const answers = item.answers.filter((a) => a.text.trim());
  return (
    <div className={`pg-faq-card ${open ? "is-open" : ""}`}>
      <button type="button" className="pg-faq-trigger" onClick={onToggle} aria-expanded={open}>
        <span className="pg-faq-question">{item.question.trim() || "—"}</span>
        <span className="pg-faq-action">
          {seeAnswerLabel}
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="pg-faq-answers">
          {answers.length === 0 ? (
            <p className="text-sm text-cyan-50/60">উত্তর এখনো যোগ করা হয়নি।</p>
          ) : (
            <ul className="space-y-3">
              {answers.map((a, i) => (
                <li key={a.id} className="pg-faq-answer">
                  {answers.length > 1 ? <span className="pg-faq-answer-num">{i + 1}.</span> : null}
                  <span className="whitespace-pre-wrap">{a.text.trim()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CourseLanding() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const { appearance } = useUiAppearance();
  const faq = appearance.landingFaq;
  const lp = appearance.landingPage;
  const faqItems = faq.items.filter((it) => it.question.trim() || it.answers.some((a) => a.text.trim()));
  const authed = isAuthenticated();
  const session = getSession();
  const appLink = authed ? (session?.role === "user" ? "/my-courses" : "/builder") : "/login";
  const ctaLabel = authed ? lp.goToAppLabel : lp.loginButtonLabel;
  const landingStyle = landingPageStyleVars(lp) as CSSProperties;

  useEffect(() => {
    const id = "pg-landing-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/courses"));
        const j = (await r.json().catch(() => ({}))) as { courses?: Course[] };
        setCourses(j.courses ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const heroStageRef = useRef<HTMLDivElement>(null);
  const [heroInView, setHeroInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = heroStageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { rootMargin: "80px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const max = Math.max(1, Math.min(lp.featuredMaxSlides || 4, courses.length || 1));
    if (!courses.length || !lp.featuredAutoplay || max <= 1 || !heroInView || !tabVisible) return;
    const ms = Math.max(1500, (lp.featuredIntervalSec || 5) * 1000);
    const t = window.setInterval(() => {
      setHeroSlide((n) => (n + 1) % max);
    }, ms);
    return () => window.clearInterval(t);
  }, [
    courses.length,
    lp.featuredAutoplay,
    lp.featuredIntervalSec,
    lp.featuredMaxSlides,
    heroInView,
    tabVisible,
  ]);

  const featured = courses.slice(0, Math.max(1, lp.featuredMaxSlides || 4));
  const activeSlide = featured.length ? Math.min(heroSlide, featured.length - 1) : 0;
  const slide = featured[activeSlide] ?? null;

  return (
    <div className="pg-landing" style={landingStyle}>
      <div className="pg-landing-fixed-center" aria-hidden />
      <header className="pg-landing-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="pg-brand group flex items-center gap-2.5">
            <span className="pg-brand-mark" aria-hidden>
              <span className="pg-brand-mark-inner" />
            </span>
            <span className="pg-brand-word">{lp.brandName}</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="#courses" className="pg-nav-link">
              {lp.navCourses}
            </a>
            <a href="#about" className="pg-nav-link">
              {lp.navAbout}
            </a>
            <a href="#faq" className="pg-nav-link">
              {lp.navFaq}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to={appLink} className="pg-btn-primary hidden sm:inline-flex">
              {ctaLabel}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-cyan-50 md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="border-t border-white/15 bg-transparent px-4 py-3 md:hidden">
            <a href="#courses" className="block py-2 text-sm font-medium text-cyan-50" onClick={() => setMenuOpen(false)}>
              {lp.navCourses}
            </a>
            <a href="#about" className="block py-2 text-sm font-medium text-cyan-50" onClick={() => setMenuOpen(false)}>
              {lp.navAbout}
            </a>
            <a href="#faq" className="block py-2 text-sm font-medium text-cyan-50" onClick={() => setMenuOpen(false)}>
              {lp.navFaq}
            </a>
            <Link to={appLink} className="pg-btn-primary mt-2 w-full justify-center" onClick={() => setMenuOpen(false)}>
              {ctaLabel}
            </Link>
          </div>
        ) : null}
      </header>

      <main className="pg-landing-main relative">
        <LandingSection className="pg-hero-layer" background={heroSectionBackground(lp)}>
          <div className="pg-hero-away mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="pg-eyebrow pg-eyebrow-on-dark">{lp.heroEyebrow}</p>
              <h1 className="pg-hero-title">
                <span className="pg-hero-brand">{lp.brandName}</span>
                <span className="mt-3 block text-[1.65rem] leading-snug text-cyan-50 sm:text-3xl md:text-4xl">
                  {lp.heroHeadline}
                </span>
              </h1>
              <p className="pg-section-copy mt-4 max-w-md text-base leading-relaxed sm:text-lg">{lp.heroSubtext}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={appLink} className="pg-btn-primary">
                  {ctaLabel}
                </Link>
                <a href="#courses" className="pg-btn-accent">
                  <span className="pg-play-dot">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                  {lp.heroCtaExplore}
                </a>
              </div>
            </div>

            <div
              ref={heroStageRef}
              className={[
                "pg-hero-stage mx-auto w-full max-w-lg lg:max-w-none",
                lp.featuredTiltEnabled ? "has-tilt" : "",
                lp.featuredHoverLift ? "has-hover-lift" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="pg-hero-card">
                {lp.featuredShineEnabled && heroInView && tabVisible ? (
                  <div className="pg-hero-card-shine" aria-hidden />
                ) : null}
                <div
                  key={slide?.id ?? "fallback"}
                  className={`pg-hero-slide pg-hero-slide-${lp.featuredTransition || "fade"} relative flex h-full min-h-[280px] flex-col justify-between p-6 sm:p-8`}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                      {lp.heroFeaturedLabel}
                    </p>
                    <p className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
                      {slide?.name ?? lp.heroFallbackTitle}
                    </p>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                      {slide?.description?.trim() || lp.heroFallbackDesc}
                    </p>
                  </div>
                  <div className="mt-8 flex items-end justify-between gap-3">
                    <div className="flex -space-x-2">
                      {["#0e7490", "#059669", "#0369a1", "#0f766e"].map((c, i) => (
                        <span
                          key={c}
                          className="inline-block h-8 w-8 rounded-full border-2 border-slate-900/80"
                          style={{ background: c, zIndex: 4 - i }}
                        />
                      ))}
                    </div>
                    {slide ? (
                      <Link to={`/courses/${slide.slug}`} className="pg-hero-cta-link">
                        {lp.courseViewLabel} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold tracking-wide text-cyan-200">{lp.brandName}</span>
                    )}
                  </div>
                  {featured.length > 1 ? (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {featured.map((c, i) => (
                        <button
                          key={c.id}
                          type="button"
                          aria-label={`Slide ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            i === activeSlide ? "w-6 bg-cyan-300" : "w-1.5 bg-white/30"
                          }`}
                          onClick={() => setHeroSlide(i)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </LandingSection>

        <LandingSection id="courses" className="pg-glass-panel" background={lp.coursesSectionBg}>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="pg-section-title">{lp.coursesTitle}</h2>
              <p className="pg-section-copy mt-3 text-sm sm:text-base">{lp.coursesSubtitle}</p>
            </div>

            {loading ? (
              <p className="pg-section-copy mt-12 text-center text-sm">{lp.coursesLoading}</p>
            ) : courses.length === 0 ? (
              <p className="pg-section-copy mt-12 text-center text-sm">{lp.coursesEmpty}</p>
            ) : (
              <div className="mt-10 grid gap-5 lg:grid-cols-2">
                {courses.map((c) => {
                  const routines = c.routines ?? [];
                  return (
                    <article key={c.id} className="pg-course-block">
                      <Link to={`/courses/${c.slug}`} className="pg-course-card group">
                        <span className="pg-course-icon">
                          <BookOpen className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <h3 className="text-base font-semibold leading-snug sm:text-lg">{c.name}</h3>
                          {c.description?.trim() ? (
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed sm:text-sm">
                              {c.description.trim()}
                            </p>
                          ) : null}
                          <span className="pg-course-link mt-2">
                            {lp.courseViewLabel}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </Link>

                      <div className="pg-course-routine">
                        <div className="pg-course-routine-head">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{lp.routineLabel}</span>
                          <span className="pg-course-routine-count">{routines.length}</span>
                        </div>
                        {routines.length === 0 ? (
                          <p className="px-3 pb-3 text-xs text-cyan-50/60">{lp.routineEmpty}</p>
                        ) : (
                          <ul className="pg-course-routine-list">
                            {routines.map((r) => (
                              <li key={r.id}>
                                <span className="pg-routine-date">{formatRoutineDate(r.publish_date)}</span>
                                <span className="pg-routine-meta">
                                  {[r.subject_name, r.system_name].filter(Boolean).join(" · ") || "System unlock"}
                                  {r.label?.trim() ? ` — ${r.label.trim()}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </LandingSection>

        <LandingSection id="about" className="pg-glass-panel pg-why-section" background={lp.aboutSectionBg}>
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-16">
            <p className="pg-eyebrow mx-auto justify-center">{lp.aboutEyebrow}</p>
            {lp.aboutTitle.trim() ? <h2 className="pg-section-title mt-3">{lp.aboutTitle}</h2> : null}
            {lp.aboutBody.trim() ? (
              <p className="pg-section-copy mx-auto mt-3 max-w-3xl text-sm leading-relaxed sm:text-base">
                {lp.aboutBody}
              </p>
            ) : null}
            {(lp.whyItems?.filter((it) => it.text.trim()).length ?? 0) > 0 ? (
              <div className="mt-10 sm:mt-12">
                <WhyCarousel
                  items={lp.whyItems.filter((it) => it.text.trim())}
                  autoplay={lp.whyAutoplay !== false}
                  intervalSec={lp.whyIntervalSec || 3}
                  transitionSec={lp.whyTransitionSec || 0.55}
                />
              </div>
            ) : null}
          </div>
        </LandingSection>

        <LandingSection id="faq" className="pg-faq-section" background={lp.faqSectionBg}>
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="pg-faq-title">{faq.title}</h2>
              {faq.subtitle ? <p className="pg-section-copy mt-3 text-sm sm:text-base">{faq.subtitle}</p> : null}
            </div>

            {faqItems.length === 0 ? (
              <p className="pg-section-copy mt-10 text-center text-sm">FAQ শীঘ্রই যোগ করা হবে।</p>
            ) : (
              <div className="mt-10 space-y-3">
                {faqItems.map((item) => (
                  <FaqItemCard
                    key={item.id}
                    item={item}
                    seeAnswerLabel={faq.seeAnswerLabel || "উত্তর দেখুন"}
                    open={openFaqId === item.id}
                    onToggle={() => setOpenFaqId((cur) => (cur === item.id ? null : item.id))}
                  />
                ))}
              </div>
            )}
          </div>
        </LandingSection>
      </main>

      <LandingSection className="pg-landing-footer-wrap" background={lp.footerSectionBg} fill>
        <footer className="pg-landing-footer">
          © {new Date().getFullYear()} {lp.footerNote}
        </footer>
      </LandingSection>

      <a href="#courses" className="pg-fab" aria-label={lp.fabLabel}>
        <Headphones className="h-4 w-4" />
        <span>{lp.fabLabel}</span>
      </a>
    </div>
  );
}
