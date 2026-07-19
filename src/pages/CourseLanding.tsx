import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Headphones, Menu, Play, X } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { getSession, isAuthenticated } from "@/lib/auth";

type Course = { id: string; name: string; slug: string; description: string };

export default function CourseLanding() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const authed = isAuthenticated();
  const session = getSession();
  const appLink = authed ? (session?.role === "user" ? "/my-courses" : "/builder") : "/login";

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

  useEffect(() => {
    if (!courses.length) return;
    const t = window.setInterval(() => {
      setHeroSlide((n) => (n + 1) % Math.min(courses.length, 4));
    }, 4500);
    return () => window.clearInterval(t);
  }, [courses]);

  const featured = courses.slice(0, 4);
  const slide = featured[heroSlide] ?? null;

  return (
    <div className="pg-landing text-slate-900">
      {/* Fixed distinct background — stays put; content scrolls transparently over it */}
      <div className="pg-fixed-scene" aria-hidden>
        <div className="pg-fixed-scene-color" />
        <div className="pg-fixed-scene-glow" />
        <div className="pg-fixed-scene-grid" />
      </div>

      <header className="pg-landing-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="pg-brand group flex items-center gap-2.5">
            <span className="pg-brand-mark" aria-hidden>
              <span className="pg-brand-mark-inner" />
            </span>
            <span className="pg-brand-word">PG Diary</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#courses" className="pg-nav-link">
              Courses
            </a>
            <a href="#about" className="pg-nav-link">
              About
            </a>
            <Link to="/login" className="pg-nav-link">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link to={appLink} className="pg-btn-primary hidden sm:inline-flex">
              {authed ? "Go to app" : "Login / Register"}
            </Link>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-white/50 text-slate-700 md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <div className="border-t border-white/30 bg-white/80 px-4 py-3 md:hidden">
            <a href="#courses" className="block py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
              Courses
            </a>
            <a href="#about" className="block py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <Link to={appLink} className="pg-btn-primary mt-2 w-full justify-center" onClick={() => setMenuOpen(false)}>
              {authed ? "Go to app" : "Login / Register"}
            </Link>
          </div>
        ) : null}
      </header>

      <main className="relative z-10">
        <section className="pg-hero-layer">
          <div className="pg-hero-away mx-auto grid max-w-6xl gap-10 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div>
              <p className="pg-eyebrow pg-eyebrow-on-dark">Medical PG preparation</p>
              <h1 className="pg-hero-title">
                <span className="pg-hero-brand">PG Diary</span>
                <span className="mt-3 block text-[1.65rem] leading-snug text-white sm:text-3xl md:text-4xl">
                  পরিবারে আপনাকে স্বাগতম!
                </span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-cyan-50/90 sm:text-lg">
                পোস্ট-গ্রাজুয়েশন জগতে সিলেবাস-ম্যাপড কোর্স, হাই-ইল্ড টপিক — আপনার সফলতার সঙ্গী।
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={appLink} className="pg-btn-primary">
                  {authed ? "Continue learning" : "Login / Register"}
                </Link>
                <a href="#courses" className="pg-btn-accent">
                  <span className="pg-play-dot">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                  Explore courses
                </a>
              </div>
            </div>

            <div className="pg-hero-stage mx-auto w-full max-w-lg lg:max-w-none">
              <div className="pg-hero-card">
                <div className="pg-hero-card-shine" aria-hidden />
                <div className="relative flex h-full min-h-[280px] flex-col justify-between p-6 sm:p-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                      Featured track
                    </p>
                    <p className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
                      {slide?.name ?? "Your PG journey starts here"}
                    </p>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
                      {slide?.description?.trim() ||
                        "Mapped syllabus · date unlocks · board-count importance stars"}
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
                        View course <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold tracking-wide text-cyan-200">PG Diary</span>
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
                            i === heroSlide ? "w-6 bg-cyan-300" : "w-1.5 bg-white/30"
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
        </section>

        <section id="courses" className="pg-glass-panel">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="pg-section-title">আপনার কাঙ্ক্ষিত কোর্সটি খুঁজে নিন</h2>
              <p className="mt-3 text-sm text-slate-700 sm:text-base">
                নিচের ক্যাটাগরিতে প্রবেশ করে আপনার পছন্দের কোর্সে এনরোল করুন
              </p>
            </div>

            {loading ? (
              <p className="mt-12 text-center text-sm text-slate-600">Loading courses…</p>
            ) : courses.length === 0 ? (
              <p className="mt-12 text-center text-sm text-slate-600">Published courses will appear here soon.</p>
            ) : (
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((c) => (
                  <Link key={c.id} to={`/courses/${c.slug}`} className="pg-course-card group">
                    <span className="pg-course-icon">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 flex-1 text-center text-sm font-semibold leading-snug text-slate-800 sm:text-[0.95rem]">
                      {c.name}
                    </h3>
                    <span className="pg-course-link">
                      ব্যাচগুলো দেখুন
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="about" className="pg-glass-panel pg-glass-panel-tint">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
            <p className="pg-eyebrow mx-auto justify-center">Why PG Diary</p>
            {/* <p className="mt-3 text-lg font-semibold text-slate-800 sm:text-xl">
              এক কোর্স · ম্যাপড সিলেবাস · স্মার্ট আনলক
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700 sm:text-base">
              অ্যাডমিন সিলেবাস ম্যাপ ও তারিখভিত্তিক রুটিন সেট করে; শিক্ষার্থী শুধু নিজের কোর্সের কনটেন্ট দেখে —
              হাই বোর্ড-কাউন্ট টপিক স্টার দিয়ে চিহ্নিত।
            </p> */}
          </div>
        </section>
      </main>

      <footer className="pg-glass-panel relative z-10 border-t border-white/40 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} PG Diary
      </footer>

      <a href="#courses" className="pg-fab" aria-label="Browse courses">
        <Headphones className="h-4 w-4" />
        <span>সরাসরি দেখুন</span>
      </a>
    </div>
  );
}
