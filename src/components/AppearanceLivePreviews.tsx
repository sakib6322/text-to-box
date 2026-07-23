import type { CSSProperties, ReactNode } from "react";
import { BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HeadingSlideReader } from "@/components/HeadingSlideReader";
import { cn } from "@/lib/utils";
import {
  heroSectionBackground,
  landingPageStyleVars,
  progressStepLabel,
  conceptAdminPreviewHeadingSlidesEnabled,
  conceptAdminPreviewPanelEnabled,
  type GlobalAppearance,
  type SidebarAppearance,
  type HeaderAppearance,
  type ConceptStudentUiAppearance,
  type ConceptAdminPreviewAppearance,
  type DeviceKey,
  type HeadingSlidesAppearance,
  type LandingFaqAppearance,
  type LandingPageAppearance,
  type ProgressPlanAppearance,
  type RichEditorAppearance,
  type StoryBasedLearningAppearance,
} from "@/lib/uiAppearance";

export function AppearancePreviewPanel({
  title = "Live preview",
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 rounded-lg border bg-muted/20 p-3 sm:p-4 ${className ?? ""}`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="overflow-hidden rounded-md border bg-background p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function GlobalWebsiteLivePreview({
  g,
  sb,
  hdr,
}: {
  g: GlobalAppearance;
  sb?: SidebarAppearance;
  hdr?: HeaderAppearance;
}) {
  const labels = g.sidebarLabels;
  const sidebar = sb ?? g.sidebar;
  const header = hdr ?? g.header;
  return (
    <div className="space-y-4">
      <div
        className="overflow-hidden rounded-lg border text-xs"
        style={{
          background: `hsl(${header.backgroundHsl})`,
          borderColor: `hsl(${header.borderHsl})`,
          color: `hsl(${header.foregroundHsl})`,
        }}
      >
        <div
          className="flex items-center gap-2 border-b"
          style={{
            height: `${header.heightPx}px`,
            paddingLeft: `${header.paddingHorizontalPx}px`,
            paddingRight: `${header.paddingHorizontalPx}px`,
            borderColor: `hsl(${header.borderHsl})`,
          }}
        >
          <span
            style={{
              fontSize: `${header.titleFontSizePx}px`,
              fontWeight: header.titleFontWeight,
              color: `hsl(${header.titleColorHsl})`,
            }}
          >
            Page title
          </span>
          <span
            className="ml-auto flex-1 max-w-[8rem] rounded border px-2 py-1 text-[10px] opacity-70"
            style={{
              height: `${header.searchHeightPx}px`,
              borderRadius: `${header.searchRadiusRem}rem`,
              background: `hsl(${header.searchBackgroundHsl})`,
              borderColor: `hsl(${header.searchBorderHsl})`,
            }}
          >
            Search…
          </span>
          <span
            className="relative inline-flex h-6 w-6 items-center justify-center rounded"
            style={{ color: `hsl(${header.iconColorHsl})`, background: `hsl(${header.iconHoverBgHsl} / 0.3)` }}
          >
            •
            <span
              className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full"
              style={{ background: `hsl(${header.notificationDotHsl})` }}
            />
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <p className="page-title-static">Sample page title</p>
        <p className="text-sm text-muted-foreground">Base font, line height, and content max width from current draft.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
      </div>
      <div className="glass-card max-w-sm">
        <div style={{ padding: "var(--ui-density-card-padding, var(--ui-card-padding, 1rem))" }}>
          <p className="text-sm font-semibold">Card preview</p>
          <p className="text-xs text-muted-foreground">Border, padding, radius, shadow, blur.</p>
        </div>
      </div>
      <div className="app-section-stack max-w-md">
        <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">Section one</div>
        <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">Section two (gap)</div>
      </div>
      <div
        className="max-w-[14rem] overflow-hidden rounded-lg border text-xs"
        style={{
          background: `hsl(${sidebar.backgroundHsl})`,
          color: `hsl(${sidebar.foregroundHsl})`,
          borderColor: `hsl(${sidebar.borderHsl})`,
        }}
      >
        <div
          className={cn("px-3 py-2", sidebar.brandShowBorder && "border-b")}
          style={{
            padding: `${sidebar.brandPaddingPx}px`,
            borderColor: `hsl(${sidebar.borderHsl})`,
          }}
        >
          <p className="font-bold" style={{ fontSize: `${sidebar.brandTitleSizePx}px`, color: `hsl(${sidebar.primaryHsl})` }}>
            {sidebar.brandTitle}
          </p>
          {sidebar.brandSubtitle.trim() ? (
            <p style={{ fontSize: `${sidebar.brandSubtitleSizePx}px`, opacity: sidebar.mutedOpacity }}>
              {sidebar.brandSubtitle}
            </p>
          ) : null}
        </div>
        <div className="space-y-1 p-2">
          {[labels.home, labels.suggestions, labels.settings].map((label) => (
            <div
              key={label}
              className="flex items-center rounded-md"
              style={{
                minHeight: `${sidebar.menuItemHeightPx}px`,
                padding: `${sidebar.menuItemPaddingPx}px`,
                fontSize: `${sidebar.menuFontSizePx}px`,
                borderRadius: `${sidebar.menuItemRadiusRem}rem`,
                gap: `${sidebar.menuGapPx}px`,
                background: label === labels.home ? `hsl(${sidebar.accentHsl})` : "transparent",
                color: label === labels.home ? `hsl(${sidebar.accentForegroundHsl})` : undefined,
                fontWeight: label === labels.home ? sidebar.activeFontWeight : 400,
              }}
            >
              <span
                className="rounded-sm bg-current/20"
                style={{ width: sidebar.menuIconSizePx, height: sidebar.menuIconSizePx }}
              />
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONCEPT_DETAILS_SLIDES_SAMPLE = `<h1>Sample topic one</h1><p>Paragraph under first heading — admin preview uses heading slides when enabled for this device.</p><h1>Sample topic two</h1><p>Second slide content.</p>`;

export function ConceptDetailsLivePreview({
  studentUi,
  adminPreview,
  headingSlides,
  previewDevice = "desktop",
}: {
  studentUi?: ConceptStudentUiAppearance;
  adminPreview?: ConceptAdminPreviewAppearance;
  headingSlides?: HeadingSlidesAppearance;
  previewDevice?: DeviceKey;
}) {
  const csu = studentUi ?? {
    showKeyPointsOnDetails: true,
    showDetailsButton: true,
    showQuestionsButton: true,
    showKeyPointsButton: true,
    showStudyButton: true,
    showPracticeButton: true,
    showStudyAndPracticeButton: true,
  };
  const cap = adminPreview ?? {
    showPreviewOnMobile: true,
    showPreviewOnTablet: true,
    showPreviewOnDesktop: true,
    showHeadingSlidesOnMobile: true,
    showHeadingSlidesOnTablet: true,
    showHeadingSlidesOnDesktop: true,
  };
  const hs = headingSlides;
  const showAdminPreview = conceptAdminPreviewPanelEnabled(cap, previewDevice);
  const showAdminSlides = hs && showAdminPreview && conceptAdminPreviewHeadingSlidesEnabled(cap, previewDevice);

  return (
    <div className="space-y-4">
      {!showAdminPreview ? (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
          Admin edit preview ({previewDevice}): Preview column off — Suggestions → Details shows Edit only.
        </p>
      ) : null}
      {showAdminSlides ? (
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="mb-2 text-[10px] text-muted-foreground">
            Admin edit preview mock ({previewDevice}) — heading slides + progress
          </p>
          <HeadingSlideReader
            html={CONCEPT_DETAILS_SLIDES_SAMPLE}
            config={hs}
            richClassName="concept-detail-rich"
            className="max-h-[14rem]"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {csu.showQuestionsButton ? <span className="rounded border px-2 py-1 text-xs">Questions</span> : null}
        {csu.showKeyPointsButton !== false ? <span className="rounded border px-2 py-1 text-xs">Key points</span> : null}
        {csu.showStudyButton ? <span className="rounded border px-2 py-1 text-xs">Study</span> : null}
        {csu.showPracticeButton ? <span className="rounded border px-2 py-1 text-xs">Practice</span> : null}
        {csu.showDetailsButton ? <span className="rounded border px-2 py-1 text-xs">Details</span> : null}
      </div>
      <div className="concept-detail-card overflow-hidden">
        <div className="concept-detail-card-header">
          <p className="text-sm font-semibold">Concept detail</p>
        </div>
        <div className="concept-detail-card-body">
      <div className="concept-detail-rich space-y-3 text-sm leading-relaxed">
      <h1>Heading 1 sample</h1>
      <h2>Heading 2 sample</h2>
      <h3>Heading 3 sample</h3>
      <p>
        Paragraph with <strong>bold</strong>, <em>italic</em>, and a <a href="#cd-preview">link</a>.
      </p>
      <ul>
        <li>Bullet one</li>
        <li>Bullet two</li>
      </ul>
      <table>
        <thead>
          <tr>
            <th>Column A</th>
            <th>Column B</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
          </tr>
          <tr>
            <td>Cell 3</td>
            <td>Cell 4</td>
          </tr>
        </tbody>
      </table>
      </div>
        </div>
      </div>
      {csu.showKeyPointsOnDetails ? (
        <div className="rounded-md border bg-muted/30 p-3 text-xs">
          <p className="mb-2 font-semibold uppercase text-muted-foreground">Key points</p>
          <ul className="space-y-1">
            <li>• High-yield point (Count 5 · FMGE)</li>
            <li>• Second point (Count 2)</li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function StoryLivePreview({ s }: { s: StoryBasedLearningAppearance }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1.5 pointer-events-none">
          {s.showButtonIcon ? <BookMarked className="h-4 w-4" /> : null}
          {s.buttonLabel || "Story-based learning"}
        </Button>
      </div>
      <div className="story-based-learning-panel overflow-hidden rounded-md border" style={{ borderColor: "var(--sbl-border)" }}>
        <div className="border-b px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--sbl-border)" }}>
          {s.buttonLabel}: Sample concept
        </div>
        <div className="story-based-learning space-y-2 p-3">
          <h2 style={{ color: "var(--sbl-heading-color)", fontSize: "1.15em" }}>Story heading sample</h2>
          <p>
            Story body with <strong>emphasis</strong> and a <a href="#story-preview">link</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AllQuestionsLivePreview({ explanationTitle = "Explanations" }: { explanationTitle?: string }) {
  return (
    <div className="all-questions-list max-w-lg">
      <article className="question-paper">
        <header className="question-paper-header flex justify-between gap-2">
          <div className="space-y-0.5">
            <p className="question-paper-meta uppercase tracking-widest font-medium">Question 1</p>
            <p className="question-paper-taxonomy">Anatomy · CVS · Heart · Valves</p>
            <p className="question-paper-concept font-semibold">Mitral valve</p>
          </div>
          <span className="question-paper-badge uppercase border px-1.5 rounded-sm">mcq</span>
        </header>
        <p className="question-paper-stem">Which statement about the mitral valve is correct?</p>
        <ol className="question-paper-options">
          <li className="question-paper-option flex gap-2">
            <span className="question-paper-option-num w-4">1.</span>
            <span className="flex-1">Has three cusps</span>
            <span className="question-paper-badge border px-1 rounded-sm">F</span>
          </li>
          <li className="question-paper-option flex gap-2">
            <span className="question-paper-option-num w-4">2.</span>
            <span className="flex-1">Guards the left AV orifice</span>
            <span className="question-paper-correct border px-1 rounded-sm">T</span>
          </li>
        </ol>
        <div className="question-paper-expl">
          <p className="question-paper-expl-title">{explanationTitle}</p>
          <div className="question-paper-expl-item">
            <span className="question-paper-expl-label">2. (T):</span> It guards the left atrioventricular orifice.
          </div>
        </div>
      </article>
    </div>
  );
}

type LandingSection =
  | "colors"
  | "nav"
  | "hero"
  | "featured"
  | "courses"
  | "about"
  | "faq"
  | "footer";

function PgShell({
  lp,
  sectionBg,
  children,
  className,
}: {
  lp: LandingPageAppearance;
  sectionBg?: string;
  children: ReactNode;
  className?: string;
}) {
  const vars = landingPageStyleVars(lp) as CSSProperties;
  return (
    <div className={`pg-landing overflow-hidden rounded-md ${className ?? ""}`} style={vars}>
      <div
        className="relative min-h-[8rem] p-4"
        style={{
          background: sectionBg ?? heroSectionBackground(lp),
          color: "var(--pg-text, #ecfeff)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LandingLivePreview({
  section,
  lp,
  faq,
}: {
  section: LandingSection;
  lp: LandingPageAppearance;
  faq: LandingFaqAppearance;
}) {
  const firstWhy = lp.whyItems[0];
  const firstFaq = faq.items[0];

  if (section === "colors") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <PgShell lp={lp}>
          <p className="pg-eyebrow pg-eyebrow-on-dark">Hero gradient</p>
          <p className="pg-hero-title mt-2 text-lg font-bold">{lp.heroHeadline || "Headline"}</p>
        </PgShell>
        <PgShell lp={lp} sectionBg={lp.coursesSectionBg}>
          <p className="text-sm font-semibold">{lp.coursesTitle || "Courses"}</p>
          <div
            className="mt-2 rounded-lg border p-3 text-sm"
            style={{
              background: "var(--pg-course-card-bg)",
              borderColor: "var(--pg-course-card-border)",
            }}
          >
            Course card sample
          </div>
        </PgShell>
      </div>
    );
  }

  if (section === "nav") {
    return (
      <PgShell lp={lp}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="pg-brand-word text-base">{lp.brandName}</span>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="pg-nav-link">{lp.navCourses}</span>
            <span className="pg-nav-link">{lp.navAbout}</span>
            <span className="pg-nav-link">{lp.navFaq}</span>
          </div>
          <button type="button" className="pg-btn-primary text-xs">
            {lp.loginButtonLabel}
          </button>
        </div>
      </PgShell>
    );
  }

  if (section === "hero") {
    return (
      <PgShell lp={lp}>
        <p className="pg-eyebrow pg-eyebrow-on-dark">{lp.heroEyebrow}</p>
        <p className="pg-hero-brand mt-1">{lp.brandName}</p>
        <h2 className="pg-hero-title mt-2 text-xl font-bold">{lp.heroHeadline}</h2>
        <p className="mt-2 max-w-md text-sm opacity-90">{lp.heroSubtext}</p>
        <button type="button" className="pg-btn-accent mt-3 text-xs">
          {lp.heroCtaExplore}
        </button>
        {lp.heroFixedOverlayEnabled ? (
          <p className="mt-3 text-[10px] opacity-70">Fixed overlay enabled ({lp.heroFixedOverlayColor})</p>
        ) : null}
      </PgShell>
    );
  }

  if (section === "featured") {
    return (
      <PgShell lp={lp}>
        <p className="text-xs uppercase tracking-wide opacity-80">{lp.heroFeaturedLabel}</p>
        <Card className="mt-2 max-w-xs border-white/20 bg-white/10 p-3 text-sm text-inherit backdrop-blur-sm">
          <p className="font-semibold">{lp.heroFallbackTitle || "Featured course"}</p>
          <p className="mt-1 text-xs opacity-80">{lp.heroFallbackDesc}</p>
          <p className="mt-2 text-[10px] opacity-70">
            {lp.featuredAutoplay ? "Autoplay" : "Manual"}
            {lp.featuredPauseOnHover ? " · pause hover" : ""} ·{" "}
            {lp.featuredTransitionEnabled ? lp.featuredTransition : "no-anim"} · shine{" "}
            {lp.featuredShineEnabled ? "on" : "off"}
          </p>
        </Card>
      </PgShell>
    );
  }

  if (section === "courses") {
    return (
      <PgShell lp={lp} sectionBg={lp.coursesSectionBg}>
        <h3 className="text-lg font-bold">{lp.coursesTitle}</h3>
        <p className="text-sm opacity-80">{lp.coursesSubtitle}</p>
        <div
          className="mt-3 rounded-lg border p-3"
          style={{ background: "var(--pg-course-card-bg)", borderColor: "var(--pg-course-card-border)" }}
        >
          <p className="font-semibold">Sample course</p>
          <p className="mt-1 text-xs opacity-80">{lp.courseViewLabel}</p>
          <p className="mt-2 text-[11px] opacity-70">{lp.routineLabel}: Mon · Anatomy</p>
        </div>
      </PgShell>
    );
  }

  if (section === "about") {
    return (
      <PgShell lp={lp} sectionBg={lp.aboutSectionBg}>
        <p className="text-xs uppercase tracking-wide opacity-80">{lp.aboutEyebrow}</p>
        <h3 className="mt-1 text-lg font-bold">{lp.aboutTitle}</h3>
        <p className="mt-2 text-sm opacity-90">{lp.aboutBody}</p>
        {firstWhy ? (
          <div
            className="mt-3 max-w-xs rounded-lg border p-3 text-sm"
            style={{ background: firstWhy.cardBg, color: firstWhy.textColor, borderColor: "rgba(255,255,255,0.15)" }}
          >
            {firstWhy.text || "Why card sample"}
          </div>
        ) : null}
      </PgShell>
    );
  }

  if (section === "faq") {
    return (
      <PgShell lp={lp} sectionBg={lp.faqSectionBg}>
        <h3 className="text-lg font-bold">{faq.title}</h3>
        <p className="text-sm opacity-80">{faq.subtitle}</p>
        <div className="pg-faq-card mt-3 is-open">
          <div className="pg-faq-trigger pointer-events-none">
            <span className="pg-faq-question">{firstFaq?.question || "Sample FAQ question?"}</span>
            <span className="pg-faq-action">{faq.seeAnswerLabel}</span>
          </div>
          <div className="pg-faq-answers">
            <p className="pg-faq-answer whitespace-pre-wrap">
              {firstFaq?.answers[0]?.text || "Sample answer text appears here."}
            </p>
          </div>
        </div>
      </PgShell>
    );
  }

  return (
    <PgShell lp={lp} sectionBg={lp.footerSectionBg}>
      <p className="text-sm font-semibold">{lp.brandName}</p>
      <p className="mt-1 text-xs opacity-80">{lp.footerNote}</p>
      <button type="button" className="pg-btn-primary mt-3 text-xs">
        {lp.fabLabel}
      </button>
    </PgShell>
  );
}

type ProgressSection = "steps" | "copy" | "features" | "colors";

export function ProgressLivePreview({ section, prog }: { section: ProgressSection; prog: ProgressPlanAppearance }) {
  const steps = prog.steps.length >= 4 ? prog.steps : prog.steps;
  const stepLabel = (id: 1 | 2 | 3 | 4) => progressStepLabel(steps, id, prog.preferBengaliStepLabels);

  if (section === "steps") {
    const demoLocal = [20, 0, 40, 0]; // Learn 5% + Self-test 10% of 25 bands → 15% total
    return (
      <div className="space-y-3 max-w-md">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{prog.stepBarTitle}</span>
          <span className="font-medium text-foreground">15{prog.progressPctSuffix ? `% ${prog.progressPctSuffix}` : "%"}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {steps.slice(0, 4).map((s, i) => {
            // Demo: prior steps unfinished (local < 100) → lock when enabled
            const prevDone = i === 0 || (demoLocal[i - 1] ?? 0) >= 100;
            const locked = s.id > 1 && s.lockUntilPrevious !== false && !prevDone;
            const local = locked ? 0 : (demoLocal[i] ?? 0);
            return (
              <div
                key={s.id}
                className={`rounded-lg border px-1 py-1.5 text-center ${
                  s.id === 1 ? "border-primary bg-primary/10" : locked ? "border-border opacity-50" : "border-border"
                }`}
              >
                <p className="text-[10px] font-semibold tabular-nums">{s.id}</p>
                <p className="mt-0.5 line-clamp-1 text-[8px] leading-tight text-muted-foreground">
                  {locked ? "Locked" : stepLabel(s.id as 1 | 2 | 3 | 4)}
                </p>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${local}%` }} />
                </div>
                <p className="mt-0.5 text-[8px] tabular-nums text-muted-foreground">{local}%</p>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">Demo: Learn 5% + Self-test 10% (Key Points skipped) = 15% total.</p>
      </div>
    );
  }

  if (section === "copy") {
    return (
      <div className="space-y-3 max-w-lg text-sm">
        <div>
          <p className="font-semibold">{prog.studyProgressTitle}</p>
          <p className="text-xs text-muted-foreground">{prog.studyProgressSubtitle}</p>
        </div>
        <Progress value={42} className="h-2" />
        <p className="text-xs">
          42% {prog.progressPctSuffix} · <span className="rounded px-1.5 py-0.5 text-[10px] text-white" style={{ background: "var(--pg-complete-badge)" }}>{prog.courseCompleteLabel}</span>
        </p>
        <Button size="sm">{prog.step1CompleteButton}</Button>
        <p className="text-xs text-amber-700 dark:text-amber-400">{prog.lockedPreviousSteps}</p>
      </div>
    );
  }

  if (section === "features") {
    return (
      <div className="space-y-2 max-w-md text-sm">
        <p>Progress Plan: {prog.enabled ? "enabled" : "disabled"}</p>
        <p>Step bar: {prog.showConceptStepBar ? "visible" : "hidden"}</p>
        <p>Browse %: {prog.showProgressOnBrowse ? "on" : "off"}</p>
        <p>Default pass: {prog.defaultPassPercent}%</p>
        <p>Exam Night unlock: {prog.examNightHoursBefore}h before mock</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {prog.showExamNightCard ? <span className="rounded border px-2 py-1">Exam Night card</span> : null}
          {prog.showFinalMockCard ? <span className="rounded border px-2 py-1">Final mock card</span> : null}
          {prog.showReviewMistakes ? <span className="rounded border px-2 py-1">Review mistakes</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
      <div className="rounded-lg border p-3" style={{ background: "var(--pg-exam-night-bg)", borderColor: "var(--pg-exam-night-border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--pg-exam-night-icon)" }}>
          {prog.examNightTitle}
        </p>
        <p className="text-xs opacity-80">{prog.examNightSubtitle}</p>
      </div>
      <div className="rounded-lg border p-3" style={{ background: "var(--pg-final-mock-bg)", borderColor: "var(--pg-final-mock-border)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--pg-final-mock-icon)" }}>
          {prog.finalMockTitle}
        </p>
        <p className="text-xs opacity-80">{prog.finalMockSubtitle}</p>
      </div>
      <div className="sm:col-span-2">
        <Progress value={65} className="h-2 [&>div]:bg-[var(--pg-progress-bar)]" />
        <p className="mt-2 text-xs" style={{ color: "var(--pg-mistake-accent)" }}>
          {prog.reviewMistakesTitle} — {prog.reviewMistakesButton}
        </p>
      </div>
    </div>
  );
}

const HEADING_SLIDES_SAMPLE_HTML = `<h1>Nerve supply of Eye</h1><p>The eye is innervated by several cranial nerves. Scroll down to continue reading this sample slide.</p><p>More detail about sensory and motor supply appears here so you can scroll.</p><p>Keep scrolling until the Next button appears at the bottom.</p><h1>Blood supply of eye</h1><p>Arterial supply comes primarily from the ophthalmic artery and its branches.</p><p>Venous drainage includes the superior and inferior ophthalmic veins.</p>`;

export function HeadingSlidesLivePreview({ config }: { config: HeadingSlidesAppearance }) {
  return (
    <HeadingSlideReader
      config={config}
      richClassName="concept-detail-rich"
      className="max-h-[22rem]"
      html={HEADING_SLIDES_SAMPLE_HTML}
    />
  );
}

export function PerformanceLivePreview({ smoothScroll, reduceMotion }: { smoothScroll: boolean; reduceMotion: boolean }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Smooth scroll: <strong>{smoothScroll ? "on" : "off"}</strong> · Reduce motion:{" "}
        <strong>{reduceMotion ? "on" : "off"}</strong>
      </p>
      <div
        className={`h-16 rounded-md border bg-muted/40 ${reduceMotion ? "" : "animate-pulse"}`}
        style={{ scrollBehavior: smoothScroll ? "smooth" : "auto" }}
      >
        <p className="p-3 text-xs text-muted-foreground">Scroll this page to feel smooth scroll on long content.</p>
      </div>
    </div>
  );
}

export function RichEditorLivePreview({ re }: { re: RichEditorAppearance }) {
  return (
    <div className="space-y-3 text-sm">
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>Lazy loading: {re.imageLazyLoading ? "On" : "Off"}</li>
        <li>Direct upload: {re.directImageUpload ? "On" : "Off"}</li>
        <li>
          Compression:{" "}
          {re.imageCompression
            ? `On (${re.imageCompressionMaxWidthPx}px, ${Math.round(re.imageCompressionQuality * 100)}%)`
            : "Off"}
        </li>
        <li>Google Drive embeds: {re.googleDriveEmbeds ? "On" : "Off"}</li>
      </ul>
      <div className="ckeditor-field max-w-xl rounded-md border">
        <div className="flex flex-wrap gap-1 border-b bg-muted p-2">
          {["B", "I", "U", "H1", "List", "Link", "Table", re.directImageUpload ? "Img" : null]
            .filter(Boolean)
            .map((label) => (
              <span key={String(label)} className="rounded border bg-background px-2 py-0.5 text-[10px] font-medium">
                {label}
              </span>
            ))}
        </div>
        <p className="p-3 text-xs text-muted-foreground">Toolbar wraps on narrow widths — all icons stay visible.</p>
      </div>
    </div>
  );
}

export function CombinedAppearancePreview({
  g,
  s,
  explanationTitle,
}: {
  g: GlobalAppearance;
  s: StoryBasedLearningAppearance;
  explanationTitle?: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Website UI</p>
        <GlobalWebsiteLivePreview g={g} />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Concept details</p>
        <ConceptDetailsLivePreview />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Story learning</p>
        <StoryLivePreview s={s} />
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">All questions</p>
        <AllQuestionsLivePreview explanationTitle={explanationTitle} />
      </div>
    </div>
  );
}
