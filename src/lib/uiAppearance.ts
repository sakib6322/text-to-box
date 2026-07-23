/**
 * UI Master — per-device (mobile / tablet / desktop) appearance.
 * Stored in public.ui_appearance.config (jsonb), fallback app_settings.ui_appearance
 */

import { CONCEPT_STEPS } from "@/lib/progressPlan";
import { getLocalColorScheme, resolveLocalIsDark } from "@/lib/colorSchemeLocal";

export type DeviceKey = "mobile" | "tablet" | "desktop";

export type StoryDialogWidth = "md" | "lg" | "xl" | "2xl" | "full";

export type SidebarLabels = {
  home: string;
  suggestions: string;
  mySuggestions: string;
  myProgress: string;
  myExams: string;
  dashboard: string;
  questionBank: string;
  createQuestionAi: string;
  allQuestions: string;
  exam: string;
  createExam: string;
  schedules: string;
  student: string;
  teacher: string;
  organization: string;
  settings: string;
  general: string;
  appearance: string;
  signOut: string;
};

/** App sidebar chrome — colors, layout, brand, menu item styling */
export type SidebarAppearance = {
  backgroundHsl: string;
  foregroundHsl: string;
  primaryHsl: string;
  primaryForegroundHsl: string;
  accentHsl: string;
  accentForegroundHsl: string;
  borderHsl: string;
  ringHsl: string;
  widthRem: number;
  widthIconRem: number;
  widthMobileRem: number;
  brandTitle: string;
  brandSubtitle: string;
  brandTitleSizePx: number;
  brandSubtitleSizePx: number;
  brandPaddingPx: number;
  brandShowBorder: boolean;
  menuFontSizePx: number;
  menuItemHeightPx: number;
  menuItemPaddingPx: number;
  menuItemRadiusRem: number;
  menuIconSizePx: number;
  menuGapPx: number;
  activeFontWeight: number;
  mutedOpacity: number;
  /** Menu click/hover — transform only (GPU; no width animation / layout reflow) */
  menuTransformEnabled: boolean;
  menuTransitionDurationMs: number;
  /** Hover slide (translateX) */
  menuHoverSlidePx: number;
  /** Active route slide (translateX) */
  menuActiveSlidePx: number;
  /** Press scale on :active (0.94–1) */
  menuPressScale: number;
  /** Toggle open/hide — original shadcn shell transitions (Appearance-controlled) */
  collapseTransitionEnabled: boolean;
  collapseDurationMs: number;
  collapseEasing: "linear" | "ease" | "ease-in-out";
  /** Spacer + panel width (original shadcn; may lag on large pages) */
  collapseAnimateWidth: boolean;
  /** Panel transform e.g. offcanvas slide */
  collapseAnimateTransform: boolean;
  /** Icon mode: inner content slide via transform (lag-free) */
  collapseIconInnerSlide: boolean;
  /** Menu width/height/padding on icon collapse */
  menuCollapseSizeTransition: boolean;
  /** Group label opacity/margin on collapse */
  groupLabelTransition: boolean;
  /** Edge rail transition-all */
  railTransition: boolean;
};

/** Top app header bar — search, title, notifications */
export type HeaderAppearance = {
  backgroundHsl: string;
  foregroundHsl: string;
  borderHsl: string;
  titleColorHsl: string;
  searchBackgroundHsl: string;
  searchBorderHsl: string;
  iconColorHsl: string;
  iconHoverBgHsl: string;
  notificationDotHsl: string;
  heightPx: number;
  titleFontSizePx: number;
  titleFontWeight: number;
  searchHeightPx: number;
  searchRadiusRem: number;
  paddingHorizontalPx: number;
  hideOnScrollDown: boolean;
  backdropBlur: boolean;
};

export type GlobalAppearance = {
  fontFamily: string;
  baseFontSizePx: number;
  lineHeight: number;
  radiusRem: number;
  primaryHsl: string;
  accentHsl: string;
  backgroundHsl: string;
  foregroundHsl: string;
  cardHsl: string;
  borderHsl: string;
  mutedForegroundHsl: string;
  /** @deprecated use global.sidebar — kept for legacy JSON migration only */
  sidebarBgHsl?: string;
  /** @deprecated use global.sidebar — kept for legacy JSON migration only */
  sidebarFgHsl?: string;
  sidebar: SidebarAppearance;
  header: HeaderAppearance;
  pageTitleGradient: boolean;
  meshBackground: boolean;
  cardBackdropBlur: boolean;
  stickyBackdropBlur: boolean;
  cardShadow: boolean;
  density: "comfortable" | "compact";
  contentMaxWidthPx: number;
  /** Card chrome — `.glass-card` / shadcn Card */
  cardBorderWidthPx: number;
  cardBorderOpacity: number;
  cardPaddingPx: number;
  cardHoverHighlight: boolean;
  /** Empty = use theme foreground / dark white */
  cardForegroundHsl: string;
  /** Empty = use global borderHsl */
  cardBorderHsl: string;
  /** Card corner radius (independent from global --radius) */
  cardRadiusRem: number;
  /** Card fill opacity 0–1 */
  cardBgOpacity: number;
  cardShadowBlurPx: number;
  cardShadowOffsetYPx: number;
  cardShadowOpacity: number;
  /** HSL token for shadow tint */
  cardShadowColorHsl: string;
  cardBackdropBlurPx: number;
  cardHoverBorderOpacity: number;
  cardHoverShadowBlurPx: number;
  cardHoverShadowOpacity: number;
  cardHoverLiftPx: number;
  cardHoverScale: number;
  cardTransitionMs: number;
  /** Gap for stacked / grid card groups using `.app-card-gap` */
  cardGapPx: number;
  /** Page shell spacing */
  pagePaddingPx: number;
  sectionGapPx: number;
  /** Sidebar labels */
  sidebarLabels: SidebarLabels;
};

export type ConceptDetailsAppearance = {
  fontFamily: string;
  fontSizePx: number;
  lineHeight: number;
  paragraphSpacingPx: number;
  heading1SizePx: number;
  heading2SizePx: number;
  heading3SizePx: number;
  headingColor: string;
  heading1Color: string;
  heading2Color: string;
  heading3Color: string;
  paragraphColor: string;
  /**
   * Textbox/HTML-এ text color না দিলে (বা dark mode-এ গাঢ় Appearance color) এই রঙ।
   * Appearance থেকে manage — default white.
   */
  unsetTextColor: string;
  /** Concept detail read body background — empty = transparent */
  backgroundColor: string;
  /** Outer textbox card shell (around concept detail content) */
  cardBg: string;
  cardBorderColor: string;
  cardBorderWidthPx: number;
  cardBorderRadiusPx: number;
  cardPaddingPx: number;
  cardShadow: boolean;
  cardShadowBlurPx: number;
  cardShadowOffsetYPx: number;
  cardShadowOpacity: number;
  cardShadowColor: string;
  /** CKEditor / textbox shape (edit + body shell) */
  textboxRadiusPx: number;
  textboxBorderWidthPx: number;
  textboxBorderColor: string;
  textboxBg: string;
  textboxMinHeightPx: number;
  textboxPaddingPx: number;
  boldWeight: number;
  linkColor: string;
  bulletColor: string;
  bulletSizePx: number;
  listIndentPx: number;
  tableHeaderBg: string;
  tableHeaderColor: string;
  tableBorderColor: string;
  tableEvenRowBg: string;
  tableFontSizePx: number;
  tableCellPaddingPx: number;
  /**
   * Phone (≤640px): when concept body has a table, override textbox-card chrome
   * so the table can use the full card width.
   */
  mobileTableFullBleed: boolean;
  mobileTableCardPaddingPx: number;
  mobileTableCardBorderWidthPx: number;
  mobileTableCardBorderRadiusPx: number;
  codeBg: string;
  blockquoteBorder: string;
};

/** Student concept UI — shared across devices (not typography). */
export type ConceptStudentUiAppearance = {
  /** Show key points list under concept detail on student pages */
  showKeyPointsOnDetails: boolean;
  /** Concept detail page + learn header */
  showDetailsButton: boolean;
  showQuestionsButton: boolean;
  /** Header button that opens all key points panel (Details + Learn) */
  showKeyPointsButton: boolean;
  showStudyButton: boolean;
  showPracticeButton: boolean;
  /** My Suggestions concept card */
  showStudyAndPracticeButton: boolean;
};

/** Admin concept edit preview (Suggestions → Details) — shared, per-device toggles */
export type ConceptAdminPreviewAppearance = {
  /** Phone: show Preview column beside Edit */
  showPreviewOnMobile: boolean;
  showPreviewOnTablet: boolean;
  showPreviewOnDesktop: boolean;
  /** Phone: admin edit preview panel uses heading slides + progress */
  showHeadingSlidesOnMobile: boolean;
  showHeadingSlidesOnTablet: boolean;
  showHeadingSlidesOnDesktop: boolean;
};

/** Story-based learning modal + content styling (per device) */
export type StoryBasedLearningAppearance = {
  fontFamily: string;
  fontSizePx: number;
  lineHeight: number;
  titleSizePx: number;
  titleColor: string;
  bodyColor: string;
  headingColor: string;
  linkColor: string;
  backgroundColor: string;
  panelBg: string;
  accentColor: string;
  borderColor: string;
  borderRadiusPx: number;
  contentPaddingPx: number;
  /** Textbox / panel card chrome */
  borderWidthPx: number;
  panelShadow: boolean;
  panelShadowBlurPx: number;
  panelShadowOffsetYPx: number;
  panelShadowOpacity: number;
  panelShadowColor: string;
  /** CKEditor textbox shape inside story edit panel */
  textboxRadiusPx: number;
  textboxBorderWidthPx: number;
  textboxBorderColor: string;
  textboxBg: string;
  textboxMinHeightPx: number;
  textboxPaddingPx: number;
  dialogMaxWidth: StoryDialogWidth;
  buttonLabel: string;
  showButtonIcon: boolean;
  emptyMessage: string;
};

/** All Questions page + question paper card styling (per device) */
export type AllQuestionsAppearance = {
  useSidebarLabelAsTitle: boolean;
  pageTitle: string;
  showResultBadge: boolean;
  filterSticky: boolean;
  listMaxWidthPx: number;
  emptyMessage: string;
  cardGapPx: number;
  paperBg: string;
  paperFg: string;
  paperMuted: string;
  paperBorder: string;
  paperRadiusPx: number;
  paperPaddingPx: number;
  paperShadow: boolean;
  /** Header meta: "Question N", marks, mode badge */
  questionLabelSizePx: number;
  marksSizePx: number;
  modeBadgeSizePx: number;
  boardBadgeSizePx: number;
  taxonomySizePx: number;
  conceptSizePx: number;
  taxonomyColor: string;
  conceptColor: string;
  headerBorderColor: string;
  badgeBorderColor: string;
  /** Stem */
  stemFontFamily: string;
  stemFontSizePx: number;
  stemLineHeight: number;
  stemColor: string;
  /** Options / statements */
  optionFontFamily: string;
  optionFontSizePx: number;
  optionLineHeight: number;
  optionGapPx: number;
  optionNumberColor: string;
  optionTextColor: string;
  correctColor: string;
  wrongColor: string;
  /** Explanations block */
  showExplanations: boolean;
  explanationTitle: string;
  explanationTitleSizePx: number;
  explanationTitleColor: string;
  explanationFontSizePx: number;
  explanationLineHeight: number;
  explanationColor: string;
  explanationLabelColor: string;
  explanationGapPx: number;
  explanationBorderColor: string;
  explanationPaddingTopPx: number;
};

export type DeviceAppearance = {
  global: GlobalAppearance;
  conceptDetails: ConceptDetailsAppearance;
  storyBasedLearning: StoryBasedLearningAppearance;
  allQuestions: AllQuestionsAppearance;
};

/** Landing page FAQ — shared (not per-device). One question → one or many answers. */
export type LandingFaqAnswer = {
  id: string;
  text: string;
};

export type LandingFaqItem = {
  id: string;
  question: string;
  answers: LandingFaqAnswer[];
};

export type LandingFaqAppearance = {
  title: string;
  subtitle: string;
  seeAnswerLabel: string;
  /** Bump when default FAQ set changes so stale copies refresh once. */
  contentVersion: number;
  items: LandingFaqItem[];
};

/** Why PG Diary feature / testimonial cards on the landing about section. */
export type LandingWhyItem = {
  id: string;
  /** Lucide icon name (e.g. Brain, PencilRuler) or a CSS class for an icon font */
  iconClass: string;
  text: string;
  iconColor: string;
  iconBg: string;
  textColor: string;
  cardBg: string;
};

/** Public course landing — colors + copy (shared, not per-device). */
export type LandingPageAppearance = {
  /** Page background gradient stops (hero section) */
  bgColor1: string;
  bgColor2: string;
  bgColor3: string;
  /** Per-section sticky backgrounds (CSS color / gradient) */
  coursesSectionBg: string;
  aboutSectionBg: string;
  faqSectionBg: string;
  footerSectionBg: string;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  courseCardBg: string;
  courseCardBorder: string;
  courseRoutineBg: string;
  faqCardBg: string;
  brandName: string;
  navCourses: string;
  navAbout: string;
  navFaq: string;
  loginButtonLabel: string;
  goToAppLabel: string;
  heroEyebrow: string;
  heroHeadline: string;
  heroSubtext: string;
  heroCtaExplore: string;
  heroFeaturedLabel: string;
  heroFallbackTitle: string;
  heroFallbackDesc: string;
  /** Fixed overlay in hero — stays put while section content scrolls over it */
  heroFixedOverlayEnabled: boolean;
  heroFixedOverlayColor: string;
  /** Viewport % — default full width */
  heroFixedOverlayWidthPercent: number;
  /** Viewport height % — default 40 */
  heroFixedOverlayHeightPercent: number;
  /** Distance from top of viewport (vh %) — default 30 centers a 40% band */
  heroFixedOverlayTopPercent: number;
  /** Featured track card — lag-free animation (opacity/transform only) */
  featuredAutoplay: boolean;
  /** Seconds between slide changes */
  featuredIntervalSec: number;
  /** Pause autoplay while pointer is over the card */
  featuredPauseOnHover: boolean;
  /** Master: slide content enter animation */
  featuredTransitionEnabled: boolean;
  /** Seconds for content enter transition */
  featuredTransitionSec: number;
  featuredTransition: "fade" | "slide" | "scale" | "none";
  featuredEasing: "linear" | "ease" | "ease-out" | "ease-in-out";
  /** Slide style: translateX distance (GPU) */
  featuredSlideDistancePx: number;
  /** Scale style: starting scale (0.9–1) */
  featuredScaleFrom: number;
  featuredShineEnabled: boolean;
  /** Seconds for one shine loop */
  featuredShineSec: number;
  featuredTiltEnabled: boolean;
  featuredHoverLift: boolean;
  /** Hover lift distance in px (transform only) */
  featuredHoverLiftPx: number;
  /** Hover transform transition ms */
  featuredHoverDurationMs: number;
  featuredMaxSlides: number;
  coursesTitle: string;
  coursesSubtitle: string;
  coursesEmpty: string;
  coursesLoading: string;
  courseViewLabel: string;
  routineLabel: string;
  routineEmpty: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutBody: string;
  /** Continuous Why-card carousel */
  whyItems: LandingWhyItem[];
  whyAutoplay: boolean;
  whyIntervalSec: number;
  whyTransitionSec: number;
  fabLabel: string;
  footerNote: string;
};

/** Effective Study & Practice Progress Plan — shared UI copy, steps, toggles, colors. */
export type ProgressStepConfig = {
  id: 1 | 2 | 3 | 4;
  label: string;
  labelBn: string;
  /**
   * When true, student must finish the previous step before entering this one.
   * When false (Appearance unlock), step is free to open; progress still adds independently.
   */
  lockUntilPrevious: boolean;
};

export type ProgressPlanAppearance = {
  /** Master switch — hides progress chrome when false (API progress still works). */
  enabled: boolean;
  stepBarTitle: string;
  steps: ProgressStepConfig[];
  defaultPassPercent: number;
  /** Hours before final mock when Exam Night PYQ unlocks. */
  examNightHoursBefore: number;
  showProgressOnBrowse: boolean;
  showExamNightCard: boolean;
  showFinalMockCard: boolean;
  showReviewMistakes: boolean;
  showConceptStepBar: boolean;
  preferBengaliStepLabels: boolean;
  examNightTitle: string;
  examNightSubtitle: string;
  finalMockTitle: string;
  finalMockSubtitle: string;
  finalMockProgressLabel: string;
  reviewMistakesTitle: string;
  reviewMistakesSubtitle: string;
  reviewMistakesButton: string;
  reviewMistakesEmpty: string;
  reviewMistakesClearAll: string;
  studyProgressTitle: string;
  studyProgressSubtitle: string;
  conceptPracticeIntro: string;
  courseCompleteLabel: string;
  progressPctSuffix: string;
  step1CompleteButton: string;
  step2CompleteButton: string;
  step3CompleteButton: string;
  lockedPreviousSteps: string;
  noSelfQaSkip: string;
  noPracticeSets: string;
  openFromMyCourses: string;
  selfQaIntro: string;
  selfQaShowAnswerLabel: string;
  selfQaNextQuestionLabel: string;
  selfQaAnswerLabel: string;
  selfQaQuestionLabel: string;
  selfQaTapHint: string;
  selfQaPrevLabel: string;
  selfQaProgressLabel: string;
  selfQaCompleteToast: string;
  progressBarColor: string;
  examNightCardBg: string;
  examNightBorder: string;
  examNightIconColor: string;
  finalMockCardBg: string;
  finalMockBorder: string;
  finalMockIconColor: string;
  completeBadgeBg: string;
  mistakeAccentColor: string;
};

export type HeadingSlidesAppearance = {
  /** Enable heading slides on Concept Details (read-only views) */
  conceptDetailsEnabled: boolean;
  /** Enable heading slides on Story-based learning (read/preview) */
  storyEnabled: boolean;
  splitH1: boolean;
  splitH2: boolean;
  splitH3: boolean;
  splitH4: boolean;
  splitH5: boolean;
  splitH6: boolean;
  preHeadingMode: "intro" | "mergeFirst";
  requireScrollToEnd: boolean;
  scrollShowNextAtPercent: number;
  showNextHeadingPreview: boolean;
  nextLabel: string;
  nextTemplate: string;
  showPrev: boolean;
  prevLabel: string;
  showCounter: boolean;
  counterTemplate: string;
  lastSlideLabel: string;
  stickyNextBar: boolean;
  nextBarBg: string;
  nextBarFg: string;
  minCharsPerSlide: number;
  /**
   * nested = own scroll box (can trap page scroll).
   * page = grows with content; page scroll continues past slides (recommended for Concept Learn).
   */
  scrollMode: "nested" | "page";
  /** Only for nested mode: when true, scroll does not chain to the page at the edges */
  trapNestedScroll: boolean;
  /** Visual slide progress (bar / dots) */
  showProgressIndicator: boolean;
  progressStyle: "bar" | "dots" | "barAndDots";
  progressBarHeightPx: number;
  progressTrackColor: string;
  progressFillColor: string;
  progressDotSizePx: number;
  showProgressPercent: boolean;
  progressLabelTemplate: string;
};

export type RichEditorAppearance = {
  /** Lazy-load images in concept details, story, slides, etc. */
  imageLazyLoading: boolean;
  /** Allow direct image upload in CKEditor (base64 in HTML) */
  directImageUpload: boolean;
  /** Compress images before base64 embed on upload */
  imageCompression: boolean;
  imageCompressionMaxWidthPx: number;
  /** JPEG quality 0.5–1 when compression is on */
  imageCompressionQuality: number;
  /** Convert Google Drive share links to embedded images */
  googleDriveEmbeds: boolean;
};

export type UiAppearance = {
  version: 2;
  mobile: DeviceAppearance;
  tablet: DeviceAppearance;
  desktop: DeviceAppearance;
  performance: {
    smoothScroll: boolean;
    reduceMotion: boolean;
  };
  /** CKEditor + rich HTML image behavior (shared) */
  richEditor: RichEditorAppearance;
  /** Public course landing FAQ section */
  landingFaq: LandingFaqAppearance;
  /** Public course landing design + copy */
  landingPage: LandingPageAppearance;
  /** Progress Plan student UI + behavior knobs */
  progressPlan: ProgressPlanAppearance;
  /** Heading-based auto slides (Concept details + Story learning) */
  headingSlides: HeadingSlidesAppearance;
  /** Student concept details actions + key points visibility */
  conceptStudentUi: ConceptStudentUiAppearance;
  /** Admin Suggestions/Details edit preview panel */
  conceptAdminPreview: ConceptAdminPreviewAppearance;
};

export const UI_APPEARANCE_KEY = "ui_appearance";
export const DEVICE_KEYS: DeviceKey[] = ["mobile", "tablet", "desktop"];

function defaultSidebarLabels(overrides: Partial<SidebarLabels> = {}): SidebarLabels {
  return {
    home: "Home",
    suggestions: "Suggestions",
    mySuggestions: "My Suggestions",
    myProgress: "My progress",
    myExams: "My exams",
    dashboard: "Dashboard",
    questionBank: "Question bank",
    createQuestionAi: "Create question (AI)",
    allQuestions: "All questions",
    exam: "Exam",
    createExam: "Create exam",
    schedules: "Schedules",
    student: "Student",
    teacher: "Teacher",
    organization: "Organization",
    settings: "Settings",
    general: "General",
    appearance: "Appearance",
    signOut: "Sign out",
    ...overrides,
  };
}

function defaultSidebar(overrides: Partial<SidebarAppearance> = {}): SidebarAppearance {
  return {
    backgroundHsl: "222 47% 11%",
    foregroundHsl: "210 25% 92%",
    primaryHsl: "192 85% 48%",
    primaryForegroundHsl: "0 0% 100%",
    accentHsl: "222 35% 18%",
    accentForegroundHsl: "210 25% 96%",
    borderHsl: "222 30% 22%",
    ringHsl: "192 85% 48%",
    widthRem: 16,
    widthIconRem: 3,
    widthMobileRem: 18,
    brandTitle: "PG Diary",
    brandSubtitle: "Question Bank",
    brandTitleSizePx: 14,
    brandSubtitleSizePx: 10,
    brandPaddingPx: 16,
    brandShowBorder: true,
    menuFontSizePx: 14,
    menuItemHeightPx: 32,
    menuItemPaddingPx: 8,
    menuItemRadiusRem: 0.375,
    menuIconSizePx: 16,
    menuGapPx: 8,
    activeFontWeight: 500,
    mutedOpacity: 0.6,
    menuTransformEnabled: true,
    menuTransitionDurationMs: 180,
    menuHoverSlidePx: 2,
    menuActiveSlidePx: 4,
    menuPressScale: 0.98,
    collapseTransitionEnabled: true,
    collapseDurationMs: 200,
    collapseEasing: "linear",
    collapseAnimateWidth: true,
    collapseAnimateTransform: true,
    collapseIconInnerSlide: false,
    menuCollapseSizeTransition: true,
    groupLabelTransition: true,
    railTransition: true,
    ...overrides,
  };
}

function mergeSidebar(
  base: SidebarAppearance,
  patch: unknown,
  legacy?: { sidebarBgHsl?: string; sidebarFgHsl?: string },
): SidebarAppearance {
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<SidebarAppearance>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const merged: SidebarAppearance = {
    backgroundHsl: str(p.backgroundHsl, base.backgroundHsl),
    foregroundHsl: str(p.foregroundHsl, base.foregroundHsl),
    primaryHsl: str(p.primaryHsl, base.primaryHsl),
    primaryForegroundHsl: str(p.primaryForegroundHsl, base.primaryForegroundHsl),
    accentHsl: str(p.accentHsl, base.accentHsl),
    accentForegroundHsl: str(p.accentForegroundHsl, base.accentForegroundHsl),
    borderHsl: str(p.borderHsl, base.borderHsl),
    ringHsl: str(p.ringHsl, base.ringHsl),
    widthRem: num(p.widthRem, base.widthRem, 12, 24),
    widthIconRem: num(p.widthIconRem, base.widthIconRem, 2.5, 6),
    widthMobileRem: num(p.widthMobileRem, base.widthMobileRem, 14, 24),
    brandTitle: str(p.brandTitle, base.brandTitle),
    brandSubtitle: str(p.brandSubtitle, base.brandSubtitle),
    brandTitleSizePx: num(p.brandTitleSizePx, base.brandTitleSizePx, 10, 22),
    brandSubtitleSizePx: num(p.brandSubtitleSizePx, base.brandSubtitleSizePx, 8, 16),
    brandPaddingPx: num(p.brandPaddingPx, base.brandPaddingPx, 8, 32),
    brandShowBorder: bool(p.brandShowBorder, base.brandShowBorder),
    menuFontSizePx: num(p.menuFontSizePx, base.menuFontSizePx, 10, 18),
    menuItemHeightPx: num(p.menuItemHeightPx, base.menuItemHeightPx, 28, 52),
    menuItemPaddingPx: num(p.menuItemPaddingPx, base.menuItemPaddingPx, 0, 24),
    menuItemRadiusRem: num(p.menuItemRadiusRem, base.menuItemRadiusRem, 0, 1),
    menuIconSizePx: num(p.menuIconSizePx, base.menuIconSizePx, 12, 24),
    menuGapPx: num(p.menuGapPx, base.menuGapPx, 4, 16),
    activeFontWeight: num(p.activeFontWeight, base.activeFontWeight, 400, 800),
    mutedOpacity: num(p.mutedOpacity, base.mutedOpacity, 0.2, 1),
    menuTransformEnabled: bool(p.menuTransformEnabled, base.menuTransformEnabled),
    menuTransitionDurationMs: num(p.menuTransitionDurationMs, base.menuTransitionDurationMs, 0, 400),
    menuHoverSlidePx: num(p.menuHoverSlidePx, base.menuHoverSlidePx, 0, 12),
    menuActiveSlidePx: num(p.menuActiveSlidePx, base.menuActiveSlidePx, 0, 16),
    menuPressScale: num(p.menuPressScale, base.menuPressScale, 0.94, 1),
    collapseTransitionEnabled: bool(p.collapseTransitionEnabled, base.collapseTransitionEnabled),
    collapseDurationMs: num(p.collapseDurationMs, base.collapseDurationMs, 0, 600),
    collapseEasing:
      p.collapseEasing === "ease" || p.collapseEasing === "ease-in-out" ? p.collapseEasing : base.collapseEasing,
    collapseAnimateWidth: bool(p.collapseAnimateWidth, base.collapseAnimateWidth),
    collapseAnimateTransform: bool(p.collapseAnimateTransform, base.collapseAnimateTransform),
    collapseIconInnerSlide: bool(p.collapseIconInnerSlide, base.collapseIconInnerSlide),
    menuCollapseSizeTransition: bool(p.menuCollapseSizeTransition, base.menuCollapseSizeTransition),
    groupLabelTransition: bool(p.groupLabelTransition, base.groupLabelTransition),
    railTransition: bool(p.railTransition, base.railTransition),
  };
  if (legacy?.sidebarBgHsl) merged.backgroundHsl = legacy.sidebarBgHsl;
  if (legacy?.sidebarFgHsl) merged.foregroundHsl = legacy.sidebarFgHsl;
  return merged;
}

function defaultHeader(overrides: Partial<HeaderAppearance> = {}): HeaderAppearance {
  return {
    backgroundHsl: "210 40% 98%",
    foregroundHsl: "222 47% 11%",
    borderHsl: "214 28% 88%",
    titleColorHsl: "192 85% 38%",
    searchBackgroundHsl: "0 0% 100%",
    searchBorderHsl: "214 28% 88%",
    iconColorHsl: "222 47% 11%",
    iconHoverBgHsl: "210 30% 94%",
    notificationDotHsl: "0 72% 51%",
    heightPx: 56,
    titleFontSizePx: 14,
    titleFontWeight: 500,
    searchHeightPx: 36,
    searchRadiusRem: 0.375,
    paddingHorizontalPx: 16,
    hideOnScrollDown: true,
    backdropBlur: false,
    ...overrides,
  };
}

function mergeHeader(base: HeaderAppearance, patch: unknown): HeaderAppearance {
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<HeaderAppearance>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    backgroundHsl: str(p.backgroundHsl, base.backgroundHsl),
    foregroundHsl: str(p.foregroundHsl, base.foregroundHsl),
    borderHsl: str(p.borderHsl, base.borderHsl),
    titleColorHsl: str(p.titleColorHsl, base.titleColorHsl),
    searchBackgroundHsl: str(p.searchBackgroundHsl, base.searchBackgroundHsl),
    searchBorderHsl: str(p.searchBorderHsl, base.searchBorderHsl),
    iconColorHsl: str(p.iconColorHsl, base.iconColorHsl),
    iconHoverBgHsl: str(p.iconHoverBgHsl, base.iconHoverBgHsl),
    notificationDotHsl: str(p.notificationDotHsl, base.notificationDotHsl),
    heightPx: num(p.heightPx, base.heightPx, 44, 80),
    titleFontSizePx: num(p.titleFontSizePx, base.titleFontSizePx, 10, 22),
    titleFontWeight: num(p.titleFontWeight, base.titleFontWeight, 400, 800),
    searchHeightPx: num(p.searchHeightPx, base.searchHeightPx, 28, 52),
    searchRadiusRem: num(p.searchRadiusRem, base.searchRadiusRem, 0, 1),
    paddingHorizontalPx: num(p.paddingHorizontalPx, base.paddingHorizontalPx, 8, 32),
    hideOnScrollDown: bool(p.hideOnScrollDown, base.hideOnScrollDown),
    backdropBlur: bool(p.backdropBlur, base.backdropBlur),
  };
}

function defaultGlobal(overrides: Partial<GlobalAppearance> = {}): GlobalAppearance {
  return {
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    baseFontSizePx: 16,
    lineHeight: 1.5,
    radiusRem: 0.625,
    primaryHsl: "192 85% 38%",
    accentHsl: "258 72% 58%",
    backgroundHsl: "210 40% 98%",
    foregroundHsl: "222 47% 11%",
    cardHsl: "0 0% 100%",
    borderHsl: "214 28% 88%",
    mutedForegroundHsl: "215 16% 42%",
    sidebar: defaultSidebar(),
    header: defaultHeader(),
    pageTitleGradient: true,
    meshBackground: true,
    cardBackdropBlur: false,
    stickyBackdropBlur: false,
    cardShadow: true,
    density: "comfortable",
    contentMaxWidthPx: 1280,
    cardBorderWidthPx: 1,
    cardBorderOpacity: 0.9,
    cardPaddingPx: 24,
    cardHoverHighlight: true,
    cardForegroundHsl: "",
    cardBorderHsl: "",
    cardRadiusRem: 0.625,
    cardBgOpacity: 1,
    cardShadowBlurPx: 6,
    cardShadowOffsetYPx: 1,
    cardShadowOpacity: 0.1,
    cardShadowColorHsl: "222 47% 11%",
    cardBackdropBlurPx: 4,
    cardHoverBorderOpacity: 0.28,
    cardHoverShadowBlurPx: 12,
    cardHoverShadowOpacity: 0.1,
    cardHoverLiftPx: 0,
    cardHoverScale: 1,
    cardTransitionMs: 0,
    cardGapPx: 16,
    pagePaddingPx: 24,
    sectionGapPx: 16,
    sidebarLabels: defaultSidebarLabels(),
    ...overrides,
  };
}

function defaultConcept(overrides: Partial<ConceptDetailsAppearance> = {}): ConceptDetailsAppearance {
  return {
    fontFamily: "inherit",
    fontSizePx: 14,
    lineHeight: 1.65,
    paragraphSpacingPx: 12,
    heading1SizePx: 22,
    heading2SizePx: 18,
    heading3SizePx: 16,
    headingColor: "#0f172a",
    heading1Color: "#0f172a",
    heading2Color: "#0f172a",
    heading3Color: "#1e293b",
    paragraphColor: "#1e293b",
    unsetTextColor: "#ffffff",
    backgroundColor: "",
    cardBg: "",
    cardBorderColor: "",
    cardBorderWidthPx: 1,
    cardBorderRadiusPx: 10,
    cardPaddingPx: 16,
    cardShadow: true,
    cardShadowBlurPx: 6,
    cardShadowOffsetYPx: 1,
    cardShadowOpacity: 0.1,
    cardShadowColor: "#0f172a",
    textboxRadiusPx: 8,
    textboxBorderWidthPx: 1,
    textboxBorderColor: "",
    textboxBg: "",
    textboxMinHeightPx: 360,
    textboxPaddingPx: 12,
    boldWeight: 700,
    linkColor: "#2563eb",
    bulletColor: "#0f172a",
    bulletSizePx: 14,
    listIndentPx: 20,
    tableHeaderBg: "#fbbf24",
    tableHeaderColor: "#1e293b",
    tableBorderColor: "#cbd5e1",
    tableEvenRowBg: "#f8fafc",
    tableFontSizePx: 12,
    tableCellPaddingPx: 8,
    mobileTableFullBleed: true,
    mobileTableCardPaddingPx: 0,
    mobileTableCardBorderWidthPx: 0,
    mobileTableCardBorderRadiusPx: 0,
    codeBg: "#f1f5f9",
    blockquoteBorder: "#94a3b8",
    ...overrides,
  };
}

function defaultStory(overrides: Partial<StoryBasedLearningAppearance> = {}): StoryBasedLearningAppearance {
  return {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSizePx: 16,
    lineHeight: 1.75,
    titleSizePx: 18,
    titleColor: "#0f172a",
    bodyColor: "#1e293b",
    headingColor: "#0f766e",
    linkColor: "#0d9488",
    backgroundColor: "#fffbeb",
    panelBg: "#ffffff",
    accentColor: "#0d9488",
    borderColor: "#fde68a",
    borderRadiusPx: 12,
    contentPaddingPx: 16,
    borderWidthPx: 1,
    panelShadow: false,
    panelShadowBlurPx: 8,
    panelShadowOffsetYPx: 2,
    panelShadowOpacity: 0.08,
    panelShadowColor: "#0f172a",
    textboxRadiusPx: 8,
    textboxBorderWidthPx: 1,
    textboxBorderColor: "",
    textboxBg: "",
    textboxMinHeightPx: 280,
    textboxPaddingPx: 12,
    dialogMaxWidth: "lg",
    buttonLabel: "Story-based learning",
    showButtonIcon: true,
    emptyMessage: "এই concept-এ এখনো কোনো story নেই।",
    ...overrides,
  };
}

function defaultAllQuestions(overrides: Partial<AllQuestionsAppearance> = {}): AllQuestionsAppearance {
  return {
    useSidebarLabelAsTitle: true,
    pageTitle: "All Questions",
    showResultBadge: true,
    filterSticky: true,
    listMaxWidthPx: 768,
    emptyMessage: "No questions found",
    cardGapPx: 16,
    paperBg: "#ffffff",
    paperFg: "#171717",
    paperMuted: "#737373",
    paperBorder: "#d4d4d4",
    paperRadiusPx: 2,
    paperPaddingPx: 20,
    paperShadow: true,
    questionLabelSizePx: 10,
    marksSizePx: 10,
    modeBadgeSizePx: 9,
    boardBadgeSizePx: 9,
    taxonomySizePx: 10,
    conceptSizePx: 11,
    taxonomyColor: "#525252",
    conceptColor: "#262626",
    headerBorderColor: "#d4d4d4",
    badgeBorderColor: "#d4d4d4",
    stemFontFamily: "Georgia, 'Times New Roman', serif",
    stemFontSizePx: 11,
    stemLineHeight: 1.55,
    stemColor: "#171717",
    optionFontFamily: "Georgia, 'Times New Roman', serif",
    optionFontSizePx: 10.5,
    optionLineHeight: 1.5,
    optionGapPx: 8,
    optionNumberColor: "#737373",
    optionTextColor: "#262626",
    correctColor: "#047857",
    wrongColor: "#dc2626",
    showExplanations: true,
    explanationTitle: "Explanations",
    explanationTitleSizePx: 10,
    explanationTitleColor: "#737373",
    explanationFontSizePx: 10,
    explanationLineHeight: 1.45,
    explanationColor: "#404040",
    explanationLabelColor: "#262626",
    explanationGapPx: 8,
    explanationBorderColor: "#e5e5e5",
    explanationPaddingTopPx: 12,
    ...overrides,
  };
}

function defaultDevice(kind: DeviceKey): DeviceAppearance {
  if (kind === "mobile") {
    return {
      global: defaultGlobal({
        baseFontSizePx: 15,
        contentMaxWidthPx: 512,
        density: "compact",
        cardPaddingPx: 12,
        pagePaddingPx: 12,
        sectionGapPx: 12,
      }),
      conceptDetails: defaultConcept({ fontSizePx: 14, heading1SizePx: 20, heading2SizePx: 17, heading3SizePx: 15 }),
      storyBasedLearning: defaultStory({
        fontSizePx: 15,
        titleSizePx: 16,
        contentPaddingPx: 12,
        dialogMaxWidth: "md",
        borderRadiusPx: 10,
      }),
      allQuestions: defaultAllQuestions({
        listMaxWidthPx: 512,
        paperPaddingPx: 14,
        cardGapPx: 12,
        stemFontSizePx: 12,
        optionFontSizePx: 11,
      }),
    };
  }
  if (kind === "tablet") {
    return {
      global: defaultGlobal({
        baseFontSizePx: 16,
        contentMaxWidthPx: 840,
        cardPaddingPx: 16,
        pagePaddingPx: 20,
        sectionGapPx: 14,
      }),
      conceptDetails: defaultConcept({ fontSizePx: 15, heading1SizePx: 22, heading2SizePx: 18 }),
      storyBasedLearning: defaultStory({ fontSizePx: 16, dialogMaxWidth: "xl" }),
      allQuestions: defaultAllQuestions({ listMaxWidthPx: 680, paperPaddingPx: 18 }),
    };
  }
  return {
    global: defaultGlobal({ baseFontSizePx: 16, contentMaxWidthPx: 1120, density: "comfortable" }),
    conceptDetails: defaultConcept({ fontSizePx: 15, heading1SizePx: 24, heading2SizePx: 20, heading3SizePx: 17 }),
    storyBasedLearning: defaultStory({ fontSizePx: 17, titleSizePx: 20, dialogMaxWidth: "2xl" }),
    allQuestions: defaultAllQuestions({ listMaxWidthPx: 768, paperPaddingPx: 24, stemFontSizePx: 12 }),
  };
}

export function defaultLandingFaqItems(): LandingFaqItem[] {
  return [
    {
      id: "faq-pg-what-is",
      question: "PG Diary কী এবং কীভাবে সাহায্য করে?",
      answers: [
        {
          id: "faq-pg-what-is-a1",
          text: "PG Diary মেডিকেল পোস্ট-গ্রাজুয়েশন প্রস্তুতির প্ল্যাটফর্ম — কোর্সভিত্তিক সিলেবাস, হাই‑ইল্ড টপিক এবং তারিখভিত্তিক আনলক এক জায়গায়।",
        },
        {
          id: "faq-pg-what-is-a2",
          text: "এখানে পুরো প্রশ্নব্যাংক একসাথে না খুলে আপনার এনরোল্ড কোর্সের ম্যাপড কনটেন্ট ধাপে ধাপে দেখা যায়।",
        },
      ],
    },
    {
      id: "faq-pg-enroll",
      question: "কোর্সে এনরোল কীভাবে করব? অ্যাপ্রুভাল লাগে কি?",
      answers: [
        {
          id: "faq-pg-enroll-a1",
          text: "ল্যান্ডিং থেকে কোর্স বেছে লগইন করে Enroll চাপুন। সেলফ‑এনরোল প্রথমে Pending থাকে; অ্যাডমিন Approve করলেই কোর্স অ্যাক্সেস পাবেন।",
        },
        {
          id: "faq-pg-enroll-a2",
          text: "অ্যাডমিন সরাসরি Assign করলে এনরোলমেন্ট সাথে সাথে Approved হয় — আলাদা অপেক্ষা লাগে না।",
        },
      ],
    },
    {
      id: "faq-pg-unlock",
      question: "রুটিন অনুযায়ী কনটেন্ট কখন আনলক হয়?",
      answers: [
        {
          id: "faq-pg-unlock-a1",
          text: "অ্যাডমিন কোর্স রুটিনে সিস্টেম/টপিকের তারিখ সেট করে। ওই তারিখ আসার পর সংশ্লিষ্ট অংশ আপনার কোর্সে খুলে যায়।",
        },
        {
          id: "faq-pg-unlock-a2",
          text: "আগে থেকে পুরো সিলেবাস দেখা যায় না — শুধু আনলকড অংশ My Courses থেকে পড়া যায়।",
        },
      ],
    },
    {
      id: "faq-pg-stars",
      question: "টপিকের স্টার বা বোর্ড‑কাউন্ট মানে কী?",
      answers: [
        {
          id: "faq-pg-stars-a1",
          text: "স্টার (১–৩) টপিকের গুরুত্ব বোঝায় — যেখানে বোর্ড/ইনক্রিমেন্ট কাউন্ট বেশি, সেখানে হাই‑ইল্ড হিসেবে চিহ্নিত।",
        },
        {
          id: "faq-pg-stars-a2",
          text: "প্রথমে বেশি স্টারওয়ালা টপিক রিভিশন করলে সময় বাঁচে এবং পরীক্ষায় বেশি ফোকাসড প্রস্তুতি হয়।",
        },
      ],
    },
    {
      id: "faq-pg-suggestions",
      question: "My Suggestions‑এ কী দেখা যায় এবং কীভাবে কাজ করে?",
      answers: [
        {
          id: "faq-pg-suggestions-a1",
          text: "এনরোল্ড ও অ্যাপ্রুভড কোর্সের ম্যাপড সাবজেক্ট → সিস্টেম → চ্যাপ্টার → টপিক থেকেই সাজেশন/কী‑পয়েন্ট যোগ বা এডিট করা যায়।",
        },
        {
          id: "faq-pg-suggestions-a2",
          text: "কোর্সের বাইরের ট্যাক্সোনমি সাধারণত দেখায় না — তাই প্রস্তুতি শুধু আপনার কোর্স স্কোপেই থাকে।",
        },
      ],
    },
  ];
}

export const LANDING_FAQ_CONTENT_VERSION = 2;

export function defaultLandingFaq(overrides: Partial<LandingFaqAppearance> = {}): LandingFaqAppearance {
  return {
    title: overrides.title ?? "আপনার প্রশ্নগুলির উত্তর",
    subtitle: overrides.subtitle ?? "সচরাচর যেসব প্রশ্ন আমাদের সেবাগ্রহীতাগণ করে থাকেন",
    seeAnswerLabel: overrides.seeAnswerLabel ?? "উত্তর দেখুন",
    contentVersion: overrides.contentVersion ?? LANDING_FAQ_CONTENT_VERSION,
    items: overrides.items ?? defaultLandingFaqItems(),
  };
}

export function defaultProgressPlan(overrides: Partial<ProgressPlanAppearance> = {}): ProgressPlanAppearance {
  return {
    enabled: true,
    stepBarTitle: "Progress Plan",
    steps: CONCEPT_STEPS.map((s) => ({
      id: s.id,
      label: s.label,
      labelBn: s.labelBn,
      lockUntilPrevious: s.id !== 1,
    })),
    defaultPassPercent: 70,
    examNightHoursBefore: 24,
    showProgressOnBrowse: true,
    showExamNightCard: true,
    showFinalMockCard: true,
    showReviewMistakes: true,
    showConceptStepBar: true,
    preferBengaliStepLabels: true,
    examNightTitle: "Exam Night — Previous Year Questions",
    examNightSubtitle: "Light PYQ revision before your upcoming mock (15–20 min suggested).",
    finalMockTitle: "Final Mock Exams",
    finalMockSubtitle: "Required to complete the course",
    finalMockProgressLabel: "passed",
    reviewMistakesTitle: "Review Mistakes",
    reviewMistakesSubtitle: "Re-test wrong questions. Answer correctly to remove from the bank.",
    reviewMistakesButton: "Review Mistakes",
    reviewMistakesEmpty: "No active mistakes — great work!",
    reviewMistakesClearAll: "Clear all mistakes",
    studyProgressTitle: "My progress",
    studyProgressSubtitle: "Study & practice report",
    conceptPracticeIntro: "Admin-assigned practice sets. Pass each set to complete this concept (100%).",
    courseCompleteLabel: "Course complete",
    progressPctSuffix: "complete",
    step1CompleteButton: "Step complete — Key Points unlock",
    step2CompleteButton: "Complete key points",
    step3CompleteButton: "Complete step",
    lockedPreviousSteps: "Complete previous steps first.",
    noSelfQaSkip: "এই concept-এ Question Bank-এ এখনো প্রশ্ন নেই। Admin প্রশ্ন যোগ করলে নিজেকে পরীক্ষা স্বয়ংক্রিয়ভাবে তৈরি হবে।",
    noPracticeSets: "No practice sets assigned yet.",
    openFromMyCourses: "Open from My Courses to access admin practice sets.",
    selfQaIntro: "প্রথমে প্রশ্ন পড়ুন → উত্তর দেখুন → পরের প্রশ্নে যান। সব শেষ হলে Progress ৭৫% হবে।",
    selfQaShowAnswerLabel: "উত্তর দেখুন",
    selfQaNextQuestionLabel: "পরের প্রশ্ন",
    selfQaAnswerLabel: "উত্তর",
    selfQaQuestionLabel: "প্রশ্ন",
    selfQaTapHint: "নিজে উত্তর ভেবে দেখুন, তারপর «উত্তর দেখুন» চাপুন",
    selfQaPrevLabel: "আগের",
    selfQaProgressLabel: "Cards seen",
    selfQaCompleteToast: "Question Yourself সম্পন্ন — Practice unlocked (৭৫%)",
    progressBarColor: "192 85% 38%",
    examNightCardBg: "rgba(139, 92, 246, 0.08)",
    examNightBorder: "rgba(139, 92, 246, 0.35)",
    examNightIconColor: "#7c3aed",
    finalMockCardBg: "rgba(245, 158, 11, 0.08)",
    finalMockBorder: "rgba(245, 158, 11, 0.35)",
    finalMockIconColor: "#d97706",
    completeBadgeBg: "192 85% 38%",
    mistakeAccentColor: "#ef4444",
    ...overrides,
  };
}

export function mergeProgressPlan(base: ProgressPlanAppearance, patch: unknown): ProgressPlanAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<ProgressPlanAppearance>;
  let steps = base.steps;
  if (Array.isArray(p.steps) && p.steps.length) {
    const byId = new Map(base.steps.map((s) => [s.id, s]));
    for (const raw of p.steps) {
      if (!raw || typeof raw !== "object") continue;
      const s = raw as Partial<ProgressStepConfig>;
      const id = s.id as 1 | 2 | 3 | 4;
      if (id < 1 || id > 4) continue;
      const prev = byId.get(id) ?? { id, label: "", labelBn: "", lockUntilPrevious: id !== 1 };
      byId.set(id, {
        id,
        label: typeof s.label === "string" ? s.label : prev.label,
        labelBn: typeof s.labelBn === "string" ? s.labelBn : prev.labelBn,
        lockUntilPrevious:
          typeof s.lockUntilPrevious === "boolean" ? s.lockUntilPrevious : prev.lockUntilPrevious,
      });
    }
    steps = [1, 2, 3, 4].map((id) => {
      const s = byId.get(id as 1 | 2 | 3 | 4)!;
      return {
        id: s.id,
        label: s.label,
        labelBn: s.labelBn,
        lockUntilPrevious: typeof s.lockUntilPrevious === "boolean" ? s.lockUntilPrevious : id !== 1,
      };
    });
  }
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    enabled: bool(p.enabled, base.enabled),
    stepBarTitle: str(p.stepBarTitle, base.stepBarTitle),
    steps,
    defaultPassPercent: num(p.defaultPassPercent, base.defaultPassPercent),
    examNightHoursBefore: num(p.examNightHoursBefore, base.examNightHoursBefore),
    showProgressOnBrowse: bool(p.showProgressOnBrowse, base.showProgressOnBrowse),
    showExamNightCard: bool(p.showExamNightCard, base.showExamNightCard),
    showFinalMockCard: bool(p.showFinalMockCard, base.showFinalMockCard),
    showReviewMistakes: bool(p.showReviewMistakes, base.showReviewMistakes),
    showConceptStepBar: bool(p.showConceptStepBar, base.showConceptStepBar),
    preferBengaliStepLabels: bool(p.preferBengaliStepLabels, base.preferBengaliStepLabels),
    examNightTitle: str(p.examNightTitle, base.examNightTitle),
    examNightSubtitle: str(p.examNightSubtitle, base.examNightSubtitle),
    finalMockTitle: str(p.finalMockTitle, base.finalMockTitle),
    finalMockSubtitle: str(p.finalMockSubtitle, base.finalMockSubtitle),
    finalMockProgressLabel: str(p.finalMockProgressLabel, base.finalMockProgressLabel),
    reviewMistakesTitle: str(p.reviewMistakesTitle, base.reviewMistakesTitle),
    reviewMistakesSubtitle: str(p.reviewMistakesSubtitle, base.reviewMistakesSubtitle),
    reviewMistakesButton: str(p.reviewMistakesButton, base.reviewMistakesButton),
    reviewMistakesEmpty: str(p.reviewMistakesEmpty, base.reviewMistakesEmpty),
    reviewMistakesClearAll: str(p.reviewMistakesClearAll, base.reviewMistakesClearAll),
    studyProgressTitle: str(p.studyProgressTitle, base.studyProgressTitle),
    studyProgressSubtitle: str(p.studyProgressSubtitle, base.studyProgressSubtitle),
    conceptPracticeIntro: str(p.conceptPracticeIntro, base.conceptPracticeIntro),
    courseCompleteLabel: str(p.courseCompleteLabel, base.courseCompleteLabel),
    progressPctSuffix: str(p.progressPctSuffix, base.progressPctSuffix),
    step1CompleteButton: str(p.step1CompleteButton, base.step1CompleteButton),
    step2CompleteButton: str(p.step2CompleteButton, base.step2CompleteButton),
    step3CompleteButton: str(p.step3CompleteButton, base.step3CompleteButton),
    lockedPreviousSteps: str(p.lockedPreviousSteps, base.lockedPreviousSteps),
    noSelfQaSkip: str(p.noSelfQaSkip, base.noSelfQaSkip),
    noPracticeSets: str(p.noPracticeSets, base.noPracticeSets),
    openFromMyCourses: str(p.openFromMyCourses, base.openFromMyCourses),
    selfQaIntro: str(p.selfQaIntro, base.selfQaIntro),
    selfQaShowAnswerLabel: str(p.selfQaShowAnswerLabel, base.selfQaShowAnswerLabel),
    selfQaNextQuestionLabel: str(p.selfQaNextQuestionLabel, base.selfQaNextQuestionLabel),
    selfQaAnswerLabel: str(p.selfQaAnswerLabel, base.selfQaAnswerLabel),
    selfQaQuestionLabel: str(p.selfQaQuestionLabel, base.selfQaQuestionLabel),
    selfQaTapHint: str(p.selfQaTapHint, base.selfQaTapHint),
    selfQaPrevLabel: str(p.selfQaPrevLabel, base.selfQaPrevLabel),
    selfQaProgressLabel: str(p.selfQaProgressLabel, base.selfQaProgressLabel),
    selfQaCompleteToast: str(p.selfQaCompleteToast, base.selfQaCompleteToast),
    progressBarColor: str(p.progressBarColor, base.progressBarColor),
    examNightCardBg: str(p.examNightCardBg, base.examNightCardBg),
    examNightBorder: str(p.examNightBorder, base.examNightBorder),
    examNightIconColor: str(p.examNightIconColor, base.examNightIconColor),
    finalMockCardBg: str(p.finalMockCardBg, base.finalMockCardBg),
    finalMockBorder: str(p.finalMockBorder, base.finalMockBorder),
    finalMockIconColor: str(p.finalMockIconColor, base.finalMockIconColor),
    completeBadgeBg: str(p.completeBadgeBg, base.completeBadgeBg),
    mistakeAccentColor: str(p.mistakeAccentColor, base.mistakeAccentColor),
  };
}

export function progressStepLabel(
  steps: ProgressStepConfig[],
  stepId: 1 | 2 | 3 | 4,
  preferBn: boolean,
): string {
  const step = steps.find((s) => s.id === stepId);
  if (!step) return `Step ${stepId}`;
  const bn = step.labelBn.trim();
  const en = step.label.trim();
  if (preferBn && bn) return bn;
  return en || bn || `Step ${stepId}`;
}

export function defaultLandingPage(overrides: Partial<LandingPageAppearance> = {}): LandingPageAppearance {
  return {
    bgColor1: "#0a3d4d",
    bgColor2: "#127a7a",
    bgColor3: "#134e4a",
    coursesSectionBg: "linear-gradient(165deg, #0e6678 0%, #0f766e 100%)",
    aboutSectionBg: "linear-gradient(165deg, #127a7a 0%, #115e59 100%)",
    faqSectionBg: "linear-gradient(165deg, #134e4a 0%, #0f5c52 100%)",
    footerSectionBg: "#0a3d4d",
    textColor: "#ecfeff",
    mutedTextColor: "rgba(236, 254, 255, 0.82)",
    accentColor: "#67e8f9",
    courseCardBg: "rgba(255, 255, 255, 0.12)",
    courseCardBorder: "rgba(255, 255, 255, 0.2)",
    courseRoutineBg: "rgba(255, 255, 255, 0.08)",
    faqCardBg: "rgba(255, 255, 255, 0.1)",
    brandName: "PG Diary",
    navCourses: "Courses",
    navAbout: "About",
    navFaq: "FAQ",
    loginButtonLabel: "Login / Register",
    goToAppLabel: "Go to app",
    heroEyebrow: "Medical PG preparation",
    heroHeadline: "পরিবারে আপনাকে স্বাগতম!",
    heroSubtext: "পোস্ট-গ্রাজুয়েশন জগতে সিলেবাস-ম্যাপড কোর্স, হাই-ইল্ড টপিক — আপনার সফলতার সঙ্গী।",
    heroCtaExplore: "Explore courses",
    heroFeaturedLabel: "Featured track",
    heroFallbackTitle: "Your PG journey starts here",
    heroFallbackDesc: "Mapped syllabus · date unlocks · board-count importance stars",
    heroFixedOverlayEnabled: true,
    heroFixedOverlayColor: "#000000",
    heroFixedOverlayWidthPercent: 100,
    heroFixedOverlayHeightPercent: 40,
    heroFixedOverlayTopPercent: 30,
    featuredAutoplay: true,
    featuredIntervalSec: 5,
    featuredPauseOnHover: true,
    featuredTransitionEnabled: true,
    featuredTransitionSec: 0.3,
    featuredTransition: "fade",
    featuredEasing: "ease-out",
    featuredSlideDistancePx: 14,
    featuredScaleFrom: 0.98,
    featuredShineEnabled: false,
    featuredShineSec: 8,
    featuredTiltEnabled: false,
    featuredHoverLift: true,
    featuredHoverLiftPx: 3,
    featuredHoverDurationMs: 250,
    featuredMaxSlides: 4,
    coursesTitle: "আপনার কাঙ্ক্ষিত কোর্সটি খুঁজে নিন",
    coursesSubtitle: "নিচের ক্যাটাগরিতে প্রবেশ করে আপনার পছন্দের কোর্সে এনরোল করুন",
    coursesEmpty: "Published courses will appear here soon.",
    coursesLoading: "Loading courses…",
    courseViewLabel: "কোর্স দেখুন",
    routineLabel: "Routine",
    routineEmpty: "এখনো কোনো রুটিন সেট করা হয়নি।",
    aboutEyebrow: "Why PG Diary",
    aboutTitle: "কেন PG Diary বেছে নিবেন?",
    aboutBody: "",
    whyItems: overrides.whyItems ?? defaultWhyItems(),
    whyAutoplay: true,
    whyIntervalSec: 3,
    whyTransitionSec: 0.55,
    fabLabel: "সরাসরি দেখুন",
    footerNote: "PG Diary",
    ...overrides,
  };
}

export function defaultWhyItems(): LandingWhyItem[] {
  return [
    {
      id: "why-1",
      iconClass: "PencilRuler",
      text: "ভর্তি পরীক্ষার পূর্ণ প্রস্তুতি",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
    {
      id: "why-2",
      iconClass: "Brain",
      text: "বিষয়ভিত্তিক সহজবোধ্য ও কার্যকরী পাঠদান",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
    {
      id: "why-3",
      iconClass: "ClipboardCheck",
      text: "নিয়মিত মডেল টেস্ট এবং ফলাফল বিশ্লেষণ",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
    {
      id: "why-4",
      iconClass: "GraduationCap",
      text: "পরামর্শ ও গাইডলাইন",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
    {
      id: "why-5",
      iconClass: "BookOpen",
      text: "সিলেবাস-ম্যাপড হাই-ইল্ড টপিক",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
    {
      id: "why-6",
      iconClass: "Target",
      text: "ধাপে ধাপে অগ্রগতি ট্র্যাকিং",
      iconColor: "#0ea5e9",
      iconBg: "rgba(255, 255, 255, 0.92)",
      textColor: "#ecfeff",
      cardBg: "transparent",
    },
  ];
}

export function newWhyId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `why-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeWhyItem(raw: unknown, fallbackId: string): LandingWhyItem | null {
  if (!raw || typeof raw !== "object") return null;
  const it = raw as Partial<LandingWhyItem>;
  if (typeof it.text !== "string") return null;
  return {
    id: typeof it.id === "string" && it.id.trim() ? it.id : fallbackId,
    iconClass: typeof it.iconClass === "string" ? it.iconClass.trim() : "Sparkles",
    text: it.text,
    iconColor: typeof it.iconColor === "string" && it.iconColor.trim() ? it.iconColor : "#0ea5e9",
    iconBg: typeof it.iconBg === "string" && it.iconBg.trim() ? it.iconBg : "rgba(255,255,255,0.92)",
    textColor: typeof it.textColor === "string" && it.textColor.trim() ? it.textColor : "#ecfeff",
    cardBg: typeof it.cardBg === "string" && it.cardBg.trim() ? it.cardBg : "transparent",
  };
}

export function mergeLandingPage(base: LandingPageAppearance, patch: unknown): LandingPageAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<LandingPageAppearance> & { whyItems?: unknown };
  const next = { ...base };
  for (const key of Object.keys(base) as (keyof LandingPageAppearance)[]) {
    if (key === "whyItems") continue;
    const val = p[key];
    if (typeof val === "string" && typeof base[key] === "string") {
      (next as Record<string, unknown>)[key] = val;
    } else if (typeof val === "number" && typeof base[key] === "number" && Number.isFinite(val)) {
      (next as Record<string, unknown>)[key] = val;
    } else if (typeof val === "boolean" && typeof base[key] === "boolean") {
      (next as Record<string, unknown>)[key] = val;
    }
  }
  if (
    p.featuredTransition === "fade" ||
    p.featuredTransition === "slide" ||
    p.featuredTransition === "scale" ||
    p.featuredTransition === "none"
  ) {
    next.featuredTransition = p.featuredTransition;
  }
  if (
    p.featuredEasing === "linear" ||
    p.featuredEasing === "ease" ||
    p.featuredEasing === "ease-out" ||
    p.featuredEasing === "ease-in-out"
  ) {
    next.featuredEasing = p.featuredEasing;
  }
  if (Array.isArray(p.whyItems)) {
    next.whyItems = p.whyItems
      .map((it, i) => normalizeWhyItem(it, `why-${i + 1}`))
      .filter((it): it is LandingWhyItem => it != null);
  }
  return next;
}

/** Hero sticky background from gradient stops */
export function heroSectionBackground(lp: LandingPageAppearance): string {
  return `linear-gradient(160deg, ${lp.bgColor1} 0%, ${lp.bgColor2} 50%, ${lp.bgColor3} 100%)`;
}

/** Inline CSS variables for `.pg-landing` root */
export function landingPageStyleVars(lp: LandingPageAppearance): Record<string, string> {
  const overlayW = Math.min(100, Math.max(1, lp.heroFixedOverlayWidthPercent ?? 100));
  const overlayH = Math.min(100, Math.max(1, lp.heroFixedOverlayHeightPercent ?? 40));
  const overlayTop = Math.min(100 - overlayH, Math.max(0, lp.heroFixedOverlayTopPercent ?? 30));
  const overlayLeft = (100 - overlayW) / 2;

  return {
    "--pg-bg-1": lp.bgColor1,
    "--pg-bg-2": lp.bgColor2,
    "--pg-bg-3": lp.bgColor3,
    "--pg-text": lp.textColor,
    "--pg-muted": lp.mutedTextColor,
    "--pg-accent": lp.accentColor,
    "--pg-course-card-bg": lp.courseCardBg,
    "--pg-course-card-border": lp.courseCardBorder,
    "--pg-course-routine-bg": lp.courseRoutineBg,
    "--pg-faq-card-bg": lp.faqCardBg,
    "--pg-featured-shine-sec": `${Math.max(1, lp.featuredShineSec || 6)}s`,
    "--pg-featured-transition-sec": `${Math.max(0, lp.featuredTransitionSec || 0.3)}s`,
    "--pg-featured-easing": lp.featuredEasing || "ease-out",
    "--pg-featured-slide-px": `${Math.max(0, lp.featuredSlideDistancePx ?? 14)}px`,
    "--pg-featured-scale-from": String(Math.min(1, Math.max(0.9, lp.featuredScaleFrom ?? 0.98))),
    "--pg-featured-hover-lift-px": `${Math.max(0, lp.featuredHoverLiftPx ?? 3)}px`,
    "--pg-featured-hover-duration": `${Math.max(0, lp.featuredHoverDurationMs ?? 250)}ms`,
    "--pg-why-transition-sec": `${Math.max(0.15, lp.whyTransitionSec || 0.55)}s`,
    "--pg-fixed-overlay-display": lp.heroFixedOverlayEnabled ? "block" : "none",
    "--pg-fixed-overlay-bg": lp.heroFixedOverlayColor || "#000000",
    "--pg-fixed-overlay-width": `${overlayW}%`,
    "--pg-fixed-overlay-height": `${overlayH}vh`,
    "--pg-fixed-overlay-top": `${overlayTop}vh`,
    "--pg-fixed-overlay-left": `${overlayLeft}%`,
  };
}

export function defaultConceptStudentUi(
  overrides: Partial<ConceptStudentUiAppearance> = {},
): ConceptStudentUiAppearance {
  return {
    showKeyPointsOnDetails: true,
    showDetailsButton: true,
    showQuestionsButton: true,
    showKeyPointsButton: true,
    showStudyButton: true,
    showPracticeButton: true,
    showStudyAndPracticeButton: true,
    ...overrides,
  };
}

export function mergeConceptStudentUi(
  base: ConceptStudentUiAppearance,
  patch: unknown,
): ConceptStudentUiAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<ConceptStudentUiAppearance>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    showKeyPointsOnDetails: bool(p.showKeyPointsOnDetails, base.showKeyPointsOnDetails),
    showDetailsButton: bool(p.showDetailsButton, base.showDetailsButton),
    showQuestionsButton: bool(p.showQuestionsButton, base.showQuestionsButton),
    showKeyPointsButton: bool(p.showKeyPointsButton, base.showKeyPointsButton),
    showStudyButton: bool(p.showStudyButton, base.showStudyButton),
    showPracticeButton: bool(p.showPracticeButton, base.showPracticeButton),
    showStudyAndPracticeButton: bool(p.showStudyAndPracticeButton, base.showStudyAndPracticeButton),
  };
}

export function defaultConceptAdminPreview(
  overrides: Partial<ConceptAdminPreviewAppearance> = {},
): ConceptAdminPreviewAppearance {
  return {
    showPreviewOnMobile: true,
    showPreviewOnTablet: true,
    showPreviewOnDesktop: true,
    showHeadingSlidesOnMobile: true,
    showHeadingSlidesOnTablet: true,
    showHeadingSlidesOnDesktop: true,
    ...overrides,
  };
}

export function mergeConceptAdminPreview(
  base: ConceptAdminPreviewAppearance,
  patch: unknown,
): ConceptAdminPreviewAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<ConceptAdminPreviewAppearance>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    showPreviewOnMobile: bool(p.showPreviewOnMobile, base.showPreviewOnMobile),
    showPreviewOnTablet: bool(p.showPreviewOnTablet, base.showPreviewOnTablet),
    showPreviewOnDesktop: bool(p.showPreviewOnDesktop, base.showPreviewOnDesktop),
    showHeadingSlidesOnMobile: bool(p.showHeadingSlidesOnMobile, base.showHeadingSlidesOnMobile),
    showHeadingSlidesOnTablet: bool(p.showHeadingSlidesOnTablet, base.showHeadingSlidesOnTablet),
    showHeadingSlidesOnDesktop: bool(p.showHeadingSlidesOnDesktop, base.showHeadingSlidesOnDesktop),
  };
}

export function conceptAdminPreviewPanelEnabled(
  config: ConceptAdminPreviewAppearance,
  device: DeviceKey,
): boolean {
  if (device === "mobile") return config.showPreviewOnMobile;
  if (device === "tablet") return config.showPreviewOnTablet;
  return config.showPreviewOnDesktop;
}

export function conceptAdminPreviewHeadingSlidesEnabled(
  config: ConceptAdminPreviewAppearance,
  device: DeviceKey,
): boolean {
  if (device === "mobile") return config.showHeadingSlidesOnMobile;
  if (device === "tablet") return config.showHeadingSlidesOnTablet;
  return config.showHeadingSlidesOnDesktop;
}

export function defaultRichEditor(overrides: Partial<RichEditorAppearance> = {}): RichEditorAppearance {
  return {
    imageLazyLoading: true,
    directImageUpload: true,
    imageCompression: true,
    imageCompressionMaxWidthPx: 1600,
    imageCompressionQuality: 0.82,
    googleDriveEmbeds: true,
    ...overrides,
  };
}

export function mergeRichEditor(base: RichEditorAppearance, patch: unknown): RichEditorAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<RichEditorAppearance>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  return {
    imageLazyLoading: bool(p.imageLazyLoading, base.imageLazyLoading),
    directImageUpload: bool(p.directImageUpload, base.directImageUpload),
    imageCompression: bool(p.imageCompression, base.imageCompression),
    imageCompressionMaxWidthPx: num(p.imageCompressionMaxWidthPx, base.imageCompressionMaxWidthPx, 640, 3840),
    imageCompressionQuality: num(p.imageCompressionQuality, base.imageCompressionQuality, 0.5, 1),
    googleDriveEmbeds: bool(p.googleDriveEmbeds, base.googleDriveEmbeds),
  };
}

export function defaultHeadingSlides(overrides: Partial<HeadingSlidesAppearance> = {}): HeadingSlidesAppearance {
  return {
    conceptDetailsEnabled: true,
    storyEnabled: true,
    splitH1: true,
    splitH2: false,
    splitH3: false,
    splitH4: false,
    splitH5: false,
    splitH6: false,
    preHeadingMode: "intro",
    requireScrollToEnd: true,
    scrollShowNextAtPercent: 85,
    showNextHeadingPreview: true,
    nextLabel: "Next",
    nextTemplate: "{heading}",
    showPrev: true,
    prevLabel: "Previous",
    showCounter: true,
    counterTemplate: "{current} / {total}",
    lastSlideLabel: "",
    stickyNextBar: true,
    nextBarBg: "hsl(var(--primary))",
    nextBarFg: "hsl(var(--primary-foreground))",
    minCharsPerSlide: 0,
    scrollMode: "page",
    trapNestedScroll: false,
    showProgressIndicator: true,
    progressStyle: "bar",
    progressBarHeightPx: 5,
    progressTrackColor: "hsl(var(--border))",
    progressFillColor: "hsl(var(--primary))",
    progressDotSizePx: 8,
    showProgressPercent: false,
    progressLabelTemplate: "{percent}%",
    ...overrides,
  };
}

export function mergeHeadingSlides(base: HeadingSlidesAppearance, patch: unknown): HeadingSlidesAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<HeadingSlidesAppearance>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const mode = p.preHeadingMode === "mergeFirst" || p.preHeadingMode === "intro" ? p.preHeadingMode : base.preHeadingMode;
  let nextTemplate = str(p.nextTemplate, base.nextTemplate);
  // Migrate old in-button label template → heading card template
  if (nextTemplate === "{next} ({heading})") nextTemplate = "{heading}";
  const scrollMode = p.scrollMode === "nested" || p.scrollMode === "page" ? p.scrollMode : base.scrollMode;
  const progressStyle =
    p.progressStyle === "bar" || p.progressStyle === "dots" || p.progressStyle === "barAndDots"
      ? p.progressStyle
      : base.progressStyle;
  return {
    conceptDetailsEnabled: bool(p.conceptDetailsEnabled, base.conceptDetailsEnabled),
    storyEnabled: bool(p.storyEnabled, base.storyEnabled),
    splitH1: bool(p.splitH1, base.splitH1),
    splitH2: bool(p.splitH2, base.splitH2),
    splitH3: bool(p.splitH3, base.splitH3),
    splitH4: bool(p.splitH4, base.splitH4 ?? false),
    splitH5: bool(p.splitH5, base.splitH5 ?? false),
    splitH6: bool(p.splitH6, base.splitH6 ?? false),
    preHeadingMode: mode,
    requireScrollToEnd: bool(p.requireScrollToEnd, base.requireScrollToEnd),
    scrollShowNextAtPercent: num(p.scrollShowNextAtPercent, base.scrollShowNextAtPercent),
    showNextHeadingPreview: bool(p.showNextHeadingPreview, base.showNextHeadingPreview),
    nextLabel: str(p.nextLabel, base.nextLabel),
    nextTemplate,
    showPrev: bool(p.showPrev, base.showPrev),
    prevLabel: str(p.prevLabel, base.prevLabel),
    showCounter: bool(p.showCounter, base.showCounter),
    counterTemplate: str(p.counterTemplate, base.counterTemplate),
    lastSlideLabel: str(p.lastSlideLabel, base.lastSlideLabel),
    stickyNextBar: bool(p.stickyNextBar, base.stickyNextBar),
    nextBarBg: str(p.nextBarBg, base.nextBarBg),
    nextBarFg: str(p.nextBarFg, base.nextBarFg),
    minCharsPerSlide: num(p.minCharsPerSlide, base.minCharsPerSlide),
    scrollMode,
    trapNestedScroll: bool(p.trapNestedScroll, base.trapNestedScroll),
    showProgressIndicator: bool(p.showProgressIndicator, base.showProgressIndicator ?? true),
    progressStyle,
    progressBarHeightPx: num(p.progressBarHeightPx, base.progressBarHeightPx ?? 5),
    progressTrackColor: str(p.progressTrackColor, base.progressTrackColor ?? "hsl(var(--border))"),
    progressFillColor: str(p.progressFillColor, base.progressFillColor ?? "hsl(var(--primary))"),
    progressDotSizePx: num(p.progressDotSizePx, base.progressDotSizePx ?? 8),
    showProgressPercent: bool(p.showProgressPercent, base.showProgressPercent ?? false),
    progressLabelTemplate: str(p.progressLabelTemplate, base.progressLabelTemplate ?? "{percent}%"),
  };
}

export function defaultUiAppearance(): UiAppearance {
  return {
    version: 2,
    mobile: defaultDevice("mobile"),
    tablet: defaultDevice("tablet"),
    desktop: defaultDevice("desktop"),
    performance: {
      smoothScroll: false,
      reduceMotion: false,
    },
    richEditor: defaultRichEditor(),
    landingFaq: defaultLandingFaq(),
    landingPage: defaultLandingPage(),
    progressPlan: defaultProgressPlan(),
    headingSlides: defaultHeadingSlides(),
    conceptStudentUi: defaultConceptStudentUi(),
    conceptAdminPreview: defaultConceptAdminPreview(),
  };
}

export function newFaqId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function mergeLandingFaq(base: LandingFaqAppearance, patch: unknown): LandingFaqAppearance {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Partial<LandingFaqAppearance> & { items?: unknown };
  const patchVersion = typeof p.contentVersion === "number" ? p.contentVersion : 0;
  const useSavedItems =
    Array.isArray(p.items) && p.items.length > 0 && patchVersion >= LANDING_FAQ_CONTENT_VERSION;

  let items = base.items;
  if (useSavedItems) {
    items = [];
    for (const raw of p.items as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const it = raw as Record<string, unknown>;
      const answers: LandingFaqAnswer[] = [];
      if (Array.isArray(it.answers)) {
        for (const rawAns of it.answers) {
          if (!rawAns || typeof rawAns !== "object") continue;
          const a = rawAns as Record<string, unknown>;
          answers.push({
            id: String(a.id ?? "").trim() || newFaqId(),
            text: String(a.text ?? ""),
          });
        }
      }
      items.push({
        id: String(it.id ?? "").trim() || newFaqId(),
        question: String(it.question ?? ""),
        answers,
      });
    }
  }
  return {
    title: typeof p.title === "string" ? p.title : base.title,
    subtitle: typeof p.subtitle === "string" ? p.subtitle : base.subtitle,
    seeAnswerLabel: typeof p.seeAnswerLabel === "string" ? p.seeAnswerLabel : base.seeAnswerLabel,
    contentVersion: Math.max(patchVersion, base.contentVersion, LANDING_FAQ_CONTENT_VERSION),
    items,
  };
}

function mergeDevice(base: DeviceAppearance, patch: unknown): DeviceAppearance {
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<DeviceAppearance>;
  const pg = (p.global && typeof p.global === "object" ? p.global : {}) as Partial<GlobalAppearance>;
  const clamp = (v: unknown, fallback: number, min: number, max: number) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  // Strip legacy site-wide motion fields if present in saved JSON (no longer applied)
  const {
    motionEnabled: _me,
    motionDurationMs: _md,
    motionEasing: _mez,
    motionInteractive: _mi,
    motionHoverLiftPx: _ml,
    motionHoverScale: _ms,
    motionPressScale: _mp,
    ...pgSafe
  } = pg as Partial<GlobalAppearance> & Record<string, unknown>;
  return {
    global: {
      ...base.global,
      ...pgSafe,
      cardBorderWidthPx: clamp(pg.cardBorderWidthPx, base.global.cardBorderWidthPx, 0, 8),
      cardBorderOpacity: clamp(pg.cardBorderOpacity, base.global.cardBorderOpacity, 0, 1),
      cardPaddingPx: clamp(pg.cardPaddingPx, base.global.cardPaddingPx, 0, 64),
      cardRadiusRem: clamp(pg.cardRadiusRem, base.global.cardRadiusRem, 0, 2),
      cardBgOpacity: clamp(pg.cardBgOpacity, base.global.cardBgOpacity, 0, 1),
      cardShadowBlurPx: clamp(pg.cardShadowBlurPx, base.global.cardShadowBlurPx, 0, 48),
      cardShadowOffsetYPx: clamp(pg.cardShadowOffsetYPx, base.global.cardShadowOffsetYPx, 0, 24),
      cardShadowOpacity: clamp(pg.cardShadowOpacity, base.global.cardShadowOpacity, 0, 1),
      cardBackdropBlurPx: clamp(pg.cardBackdropBlurPx, base.global.cardBackdropBlurPx, 0, 24),
      cardHoverBorderOpacity: clamp(pg.cardHoverBorderOpacity, base.global.cardHoverBorderOpacity, 0, 1),
      cardHoverShadowBlurPx: clamp(pg.cardHoverShadowBlurPx, base.global.cardHoverShadowBlurPx, 0, 48),
      cardHoverShadowOpacity: clamp(pg.cardHoverShadowOpacity, base.global.cardHoverShadowOpacity, 0, 1),
      cardHoverLiftPx: clamp(pg.cardHoverLiftPx, base.global.cardHoverLiftPx, 0, 16),
      cardHoverScale: clamp(pg.cardHoverScale, base.global.cardHoverScale, 1, 1.08),
      cardTransitionMs: clamp(pg.cardTransitionMs, base.global.cardTransitionMs, 0, 600),
      cardGapPx: clamp(pg.cardGapPx, base.global.cardGapPx, 0, 48),
      sidebarLabels: {
        ...base.global.sidebarLabels,
        ...((pg.sidebarLabels && typeof pg.sidebarLabels === "object" ? pg.sidebarLabels : {}) as Partial<SidebarLabels>),
      },
      sidebar: mergeSidebar(base.global.sidebar, pg.sidebar, {
        sidebarBgHsl: pg.sidebarBgHsl,
        sidebarFgHsl: pg.sidebarFgHsl,
      }),
      header: mergeHeader(base.global.header, pg.header),
    },
    conceptDetails: { ...base.conceptDetails, ...(p.conceptDetails ?? {}) },
    storyBasedLearning: { ...base.storyBasedLearning, ...(p.storyBasedLearning ?? {}) },
    allQuestions: { ...base.allQuestions, ...(p.allQuestions ?? {}) },
  };
}

/** Migrate v1 flat theme → v2 per-device */
function fromV1(raw: Record<string, unknown>): UiAppearance {
  const base = defaultUiAppearance();
  const global = (raw.global && typeof raw.global === "object" ? raw.global : {}) as Partial<GlobalAppearance>;
  const conceptDetails = (
    raw.conceptDetails && typeof raw.conceptDetails === "object" ? raw.conceptDetails : {}
  ) as Partial<ConceptDetailsAppearance>;
  const storyBasedLearning = (
    raw.storyBasedLearning && typeof raw.storyBasedLearning === "object" ? raw.storyBasedLearning : {}
  ) as Partial<StoryBasedLearningAppearance>;
  const allQuestions = (
    raw.allQuestions && typeof raw.allQuestions === "object" ? raw.allQuestions : {}
  ) as Partial<AllQuestionsAppearance>;
  const performance = (
    raw.performance && typeof raw.performance === "object" ? raw.performance : {}
  ) as Partial<UiAppearance["performance"]>;
  const sharedDevice: DeviceAppearance = {
    global: {
      ...base.desktop.global,
      ...global,
      sidebarLabels: {
        ...base.desktop.global.sidebarLabels,
        ...((global.sidebarLabels && typeof global.sidebarLabels === "object"
          ? global.sidebarLabels
          : {}) as Partial<SidebarLabels>),
      },
      sidebar: mergeSidebar(base.desktop.global.sidebar, global.sidebar, {
        sidebarBgHsl: global.sidebarBgHsl,
        sidebarFgHsl: global.sidebarFgHsl,
      }),
      header: mergeHeader(base.desktop.global.header, global.header),
    },
    conceptDetails: { ...base.desktop.conceptDetails, ...conceptDetails },
    storyBasedLearning: { ...base.desktop.storyBasedLearning, ...storyBasedLearning },
    allQuestions: { ...base.desktop.allQuestions, ...allQuestions },
  };
  return {
    version: 2,
    mobile: {
      global: { ...sharedDevice.global, contentMaxWidthPx: 512, density: "compact" },
      conceptDetails: sharedDevice.conceptDetails,
      storyBasedLearning: {
        ...sharedDevice.storyBasedLearning,
        fontSizePx: 15,
        titleSizePx: 16,
        dialogMaxWidth: "md",
      },
      allQuestions: {
        ...sharedDevice.allQuestions,
        listMaxWidthPx: 512,
        paperPaddingPx: 14,
        cardGapPx: 12,
      },
    },
    tablet: {
      global: { ...sharedDevice.global, contentMaxWidthPx: 840 },
      conceptDetails: sharedDevice.conceptDetails,
      storyBasedLearning: { ...sharedDevice.storyBasedLearning, dialogMaxWidth: "xl" },
      allQuestions: { ...sharedDevice.allQuestions, listMaxWidthPx: 680 },
    },
    desktop: sharedDevice,
    performance: mergePerformance(base.performance, performance),
    richEditor: mergeRichEditor(base.richEditor, raw.richEditor),
    landingFaq: mergeLandingFaq(base.landingFaq, raw.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, raw.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, raw.progressPlan),
    headingSlides: mergeHeadingSlides(base.headingSlides, raw.headingSlides),
    conceptStudentUi: mergeConceptStudentUi(base.conceptStudentUi, raw.conceptStudentUi),
    conceptAdminPreview: mergeConceptAdminPreview(base.conceptAdminPreview, raw.conceptAdminPreview),
  };
}

export function mergeUiAppearance(partial: unknown): UiAppearance {
  const base = defaultUiAppearance();
  if (!partial || typeof partial !== "object") return base;
  const p = partial as Record<string, unknown>;
  if (p.version === 1 || (!p.mobile && p.global)) return fromV1(p);

  return {
    version: 2,
    mobile: mergeDevice(base.mobile, p.mobile),
    tablet: mergeDevice(base.tablet, p.tablet),
    desktop: mergeDevice(base.desktop, p.desktop),
    performance: mergePerformance(base.performance, p.performance),
    richEditor: mergeRichEditor(base.richEditor, p.richEditor),
    landingFaq: mergeLandingFaq(base.landingFaq, p.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, p.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, p.progressPlan),
    headingSlides: mergeHeadingSlides(base.headingSlides, p.headingSlides),
    conceptStudentUi: mergeConceptStudentUi(base.conceptStudentUi, p.conceptStudentUi),
    conceptAdminPreview: mergeConceptAdminPreview(base.conceptAdminPreview, p.conceptAdminPreview),
  };
}

function hslTokenOr(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return v ? v : fallback;
}

/** Parse HSL token lightness (`222 47% 11%` → 11). */
function hslLightness(token: string): number | null {
  const m = token.trim().match(/([\d.]+)\s*%\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Night mode: missing text → white.
 * Also if saved Appearance text is dark (light-theme color), force white so it stays readable.
 */
function resolveForeground(token: unknown, isDark: boolean): string {
  const raw = typeof token === "string" ? token.trim() : "";
  if (isDark) {
    if (!raw) return DARK_FG;
    const L = hslLightness(raw);
    if (L != null && L < 50) return DARK_FG;
    return raw;
  }
  return raw || LIGHT_FG;
}

/** Relative luminance 0–1 from #hex / rgb() / hsl(). */
function cssColorLuminance(color: string): number | null {
  const v = color.trim();
  if (!v) return null;
  let r = 0;
  let g = 0;
  let b = 0;
  if (v.startsWith("#")) {
    const h = v.slice(1);
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length === 6) {
      const n = parseInt(h, 16);
      if (Number.isNaN(n)) return null;
      r = (n >> 16) & 255;
      g = (n >> 8) & 255;
      b = n & 255;
    } else return null;
  } else {
    const rgb = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgb) {
      r = Number(rgb[1]);
      g = Number(rgb[2]);
      b = Number(rgb[3]);
    } else {
      const hsl = v.match(/^hsla?\(\s*([\d.]+)\s*,?\s*([\d.]+)%\s*,?\s*([\d.]+)%/i);
      if (!hsl) {
        const L = hslLightness(v);
        return L != null ? L / 100 : null;
      }
      const h = Number(hsl[1]) / 360;
      const s = Number(hsl[2]) / 100;
      const l = Number(hsl[3]) / 100;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const k = (n + h * 12) % 12;
        return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      };
      r = f(0) * 255;
      g = f(8) * 255;
      b = f(4) * 255;
    }
  }
  const lin = (c: number) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Concept details / textbox text: empty → unsetTextColor (default white).
 * Dark mode + dark-looking saved color → unsetTextColor so content stays readable.
 */
function resolveConceptTextColor(saved: unknown, unsetTextColor: string, isDark: boolean): string {
  const fallback = (typeof unsetTextColor === "string" && unsetTextColor.trim()) || "#ffffff";
  const raw = typeof saved === "string" ? saved.trim() : "";
  if (!raw) return fallback;
  if (!isDark) return raw;
  const L = cssColorLuminance(raw);
  if (L != null && L < 0.35) return fallback;
  return raw;
}

function resolveMutedForeground(token: unknown, isDark: boolean): string {
  const raw = typeof token === "string" ? token.trim() : "";
  if (isDark) {
    if (!raw) return DARK_MUTED;
    const L = hslLightness(raw);
    if (L != null && L < 45) return DARK_MUTED;
    return raw;
  }
  return raw || LIGHT_MUTED;
}

/** Light palette text fallback (readable on light bg). Night/dark uses white. */
const LIGHT_FG = "222 47% 11%";
const LIGHT_MUTED = "215 16% 42%";
const LIGHT_BG = "210 40% 98%";
const LIGHT_CARD = "0 0% 100%";
const LIGHT_BORDER = "214 28% 88%";

const DARK_FG = "0 0% 100%"; // white when text color missing / night mode
const DARK_MUTED = "215 18% 72%";
const DARK_BG = "222 47% 7%";
const DARK_CARD = "222 40% 11%";
const DARK_BORDER = "222 28% 20%";
const DARK_CARD_FG = "0 0% 100%";

export function detectDeviceKey(width = typeof window !== "undefined" ? window.innerWidth : 1280): DeviceKey {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function resolveDeviceTheme(theme: UiAppearance, device: DeviceKey = detectDeviceKey()): DeviceAppearance {
  return theme[device] ?? theme.desktop;
}

function mergePerformance(
  base: UiAppearance["performance"],
  patch: unknown,
): UiAppearance["performance"] {
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<UiAppearance["performance"]>;
  return {
    smoothScroll: typeof p.smoothScroll === "boolean" ? p.smoothScroll : base.smoothScroll,
    reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : base.reduceMotion,
  };
}

/** Apply active device appearance as CSS custom properties on :root */
export function applyUiAppearance(theme: UiAppearance, device: DeviceKey = detectDeviceKey()) {
  const root = document.documentElement;
  const resolved = resolveDeviceTheme(theme, device);
  const g = resolved.global;
  const c = resolved.conceptDetails;
  const s = resolved.storyBasedLearning;
  const aq = resolved.allQuestions;
  const p = theme.performance;
  // Dark mode is per-browser (localStorage) — never from Appearance DB
  const localScheme = getLocalColorScheme();
  const isDark = resolveLocalIsDark(localScheme);

  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  root.dataset.colorScheme = localScheme;
  root.dataset.colorSchemeResolved = isDark ? "dark" : "light";

  const fg = resolveForeground(g.foregroundHsl, isDark);
  const muted = resolveMutedForeground(g.mutedForegroundHsl, isDark);
  const bg = isDark ? hslTokenOr(g.backgroundHsl, DARK_BG) : hslTokenOr(g.backgroundHsl, LIGHT_BG);
  // Light-theme bg/card on night mode would wash out — use dark surfaces when L is high
  const bgResolved = (() => {
    if (!isDark) return bg;
    const L = hslLightness(bg);
    if (L != null && L > 40) return DARK_BG;
    return bg;
  })();
  const cardRaw = isDark ? hslTokenOr(g.cardHsl, DARK_CARD) : hslTokenOr(g.cardHsl, LIGHT_CARD);
  const card = (() => {
    if (!isDark) return cardRaw;
    const L = hslLightness(cardRaw);
    if (L != null && L > 40) return DARK_CARD;
    return cardRaw;
  })();
  const border = isDark ? hslTokenOr(g.borderHsl, DARK_BORDER) : hslTokenOr(g.borderHsl, LIGHT_BORDER);

  root.style.setProperty("--ui-font-family", g.fontFamily);
  root.style.setProperty("--ui-font-size", `${g.baseFontSizePx}px`);
  root.style.setProperty("--ui-line-height", String(g.lineHeight));
  root.style.setProperty("--radius", `${g.radiusRem}rem`);
  root.style.setProperty("--primary", g.primaryHsl);
  root.style.setProperty("--accent", g.accentHsl);
  root.style.setProperty("--background", bgResolved);
  root.style.setProperty("--foreground", fg);
  root.style.setProperty("--card", card);
  const cardFgToken =
    typeof g.cardForegroundHsl === "string" && g.cardForegroundHsl.trim()
      ? g.cardForegroundHsl.trim()
      : isDark
        ? DARK_CARD_FG
        : fg;
  root.style.setProperty("--card-foreground", cardFgToken);
  root.style.setProperty("--popover", card);
  root.style.setProperty("--popover-foreground", cardFgToken);
  root.style.setProperty("--secondary-foreground", isDark ? DARK_FG : fg);
  root.style.setProperty("--border", border);
  root.style.setProperty("--input", border);
  root.style.setProperty("--muted-foreground", muted);
  const sb = g.sidebar;
  root.style.setProperty("--sidebar-background", sb.backgroundHsl);
  root.style.setProperty("--sidebar-foreground", sb.foregroundHsl);
  root.style.setProperty("--sidebar-primary", sb.primaryHsl);
  root.style.setProperty("--sidebar-primary-foreground", sb.primaryForegroundHsl);
  root.style.setProperty("--sidebar-accent", sb.accentHsl);
  root.style.setProperty("--sidebar-accent-foreground", sb.accentForegroundHsl);
  root.style.setProperty("--sidebar-border", sb.borderHsl);
  root.style.setProperty("--sidebar-ring", sb.ringHsl);
  root.style.setProperty("--sidebar-width", `${sb.widthRem}rem`);
  root.style.setProperty("--sidebar-width-icon", `${sb.widthIconRem}rem`);
  root.style.setProperty("--sb-width-mobile", `${sb.widthMobileRem}rem`);
  root.style.setProperty("--sb-brand-title-size", `${sb.brandTitleSizePx}px`);
  root.style.setProperty("--sb-brand-subtitle-size", `${sb.brandSubtitleSizePx}px`);
  root.style.setProperty("--sb-brand-padding", `${sb.brandPaddingPx}px`);
  root.style.setProperty("--sb-menu-font-size", `${sb.menuFontSizePx}px`);
  root.style.setProperty("--sb-menu-height", `${sb.menuItemHeightPx}px`);
  root.style.setProperty("--sb-menu-padding", `${sb.menuItemPaddingPx}px`);
  root.style.setProperty("--sb-menu-radius", `${sb.menuItemRadiusRem}rem`);
  root.style.setProperty("--sb-menu-icon-size", `${sb.menuIconSizePx}px`);
  root.style.setProperty("--sb-menu-gap", `${sb.menuGapPx}px`);
  root.style.setProperty("--sb-active-weight", String(sb.activeFontWeight));
  root.style.setProperty("--sb-muted-opacity", String(sb.mutedOpacity));
  root.style.setProperty("--sb-menu-transition-duration", `${sb.menuTransitionDurationMs}ms`);
  root.style.setProperty("--sb-menu-hover-slide", `${sb.menuHoverSlidePx}px`);
  root.style.setProperty("--sb-menu-active-slide", `${sb.menuActiveSlidePx}px`);
  root.style.setProperty("--sb-menu-press-scale", String(sb.menuPressScale));
  root.dataset.sidebarBrandBorder = sb.brandShowBorder ? "1" : "0";
  root.dataset.sbMenuTransform = sb.menuTransformEnabled ? "1" : "0";
  root.style.setProperty("--sb-collapse-duration", `${sb.collapseDurationMs}ms`);
  root.style.setProperty(
    "--sb-collapse-easing",
    sb.collapseEasing === "linear" ? "linear" : sb.collapseEasing === "ease-in-out" ? "ease-in-out" : "ease",
  );
  root.dataset.sbCollapseTransition = sb.collapseTransitionEnabled ? "1" : "0";
  root.dataset.sbCollapseWidth = sb.collapseAnimateWidth ? "1" : "0";
  root.dataset.sbCollapseTransform = sb.collapseAnimateTransform ? "1" : "0";
  root.dataset.sbCollapseIconSlide = sb.collapseIconInnerSlide ? "1" : "0";
  root.dataset.sbMenuCollapseSize = sb.menuCollapseSizeTransition ? "1" : "0";
  root.dataset.sbGroupLabelTransition = sb.groupLabelTransition ? "1" : "0";
  root.dataset.sbRailTransition = sb.railTransition ? "1" : "0";
  const hdr = g.header;
  root.style.setProperty("--hdr-background", hdr.backgroundHsl);
  root.style.setProperty("--hdr-foreground", hdr.foregroundHsl);
  root.style.setProperty("--hdr-border", hdr.borderHsl);
  root.style.setProperty("--hdr-title", hdr.titleColorHsl);
  root.style.setProperty("--hdr-search-bg", hdr.searchBackgroundHsl);
  root.style.setProperty("--hdr-search-border", hdr.searchBorderHsl);
  root.style.setProperty("--hdr-icon", hdr.iconColorHsl);
  root.style.setProperty("--hdr-icon-hover-bg", hdr.iconHoverBgHsl);
  root.style.setProperty("--hdr-notification-dot", hdr.notificationDotHsl);
  root.style.setProperty("--hdr-height", `${hdr.heightPx}px`);
  root.style.setProperty("--hdr-title-size", `${hdr.titleFontSizePx}px`);
  root.style.setProperty("--hdr-title-weight", String(hdr.titleFontWeight));
  root.style.setProperty("--hdr-search-height", `${hdr.searchHeightPx}px`);
  root.style.setProperty("--hdr-search-radius", `${hdr.searchRadiusRem}rem`);
  root.style.setProperty("--hdr-padding-x", `${hdr.paddingHorizontalPx}px`);
  root.dataset.hdrBlur = hdr.backdropBlur ? "1" : "0";
  root.dataset.hdrHideScroll = hdr.hideOnScrollDown ? "1" : "0";
  root.style.setProperty("--ring", g.primaryHsl);
  root.style.setProperty("--glow-cyan", g.primaryHsl);
  root.style.setProperty("--glow-violet", g.accentHsl);
  root.style.setProperty("--ui-content-max", `${g.contentMaxWidthPx}px`);
  root.style.setProperty("--ui-card-border-width", `${g.cardBorderWidthPx}px`);
  root.style.setProperty("--ui-card-border-opacity", String(g.cardBorderOpacity));
  root.style.setProperty("--ui-card-padding", `${g.cardPaddingPx}px`);
  root.style.setProperty("--ui-card-radius", `${g.cardRadiusRem}rem`);
  root.style.setProperty("--ui-card-bg-opacity", String(g.cardBgOpacity ?? 1));
  root.style.setProperty(
    "--ui-card-border-color",
    typeof g.cardBorderHsl === "string" && g.cardBorderHsl.trim() ? g.cardBorderHsl.trim() : border,
  );
  root.style.setProperty("--ui-card-shadow-blur", `${g.cardShadowBlurPx ?? 6}px`);
  root.style.setProperty("--ui-card-shadow-y", `${g.cardShadowOffsetYPx ?? 1}px`);
  root.style.setProperty("--ui-card-shadow-opacity", String(g.cardShadowOpacity ?? 0.1));
  root.style.setProperty(
    "--ui-card-shadow-color",
    typeof g.cardShadowColorHsl === "string" && g.cardShadowColorHsl.trim()
      ? g.cardShadowColorHsl.trim()
      : "222 47% 11%",
  );
  root.style.setProperty("--ui-card-backdrop-blur", `${g.cardBackdropBlurPx ?? 4}px`);
  root.style.setProperty("--ui-card-hover-border-opacity", String(g.cardHoverBorderOpacity ?? 0.28));
  root.style.setProperty("--ui-card-hover-shadow-blur", `${g.cardHoverShadowBlurPx ?? 12}px`);
  root.style.setProperty("--ui-card-hover-shadow-opacity", String(g.cardHoverShadowOpacity ?? 0.1));
  root.style.setProperty("--ui-card-hover-lift", `${g.cardHoverLiftPx ?? 0}px`);
  root.style.setProperty("--ui-card-hover-scale", String(g.cardHoverScale ?? 1));
  root.style.setProperty("--ui-card-transition", `${g.cardTransitionMs ?? 200}ms`);
  root.style.setProperty("--ui-card-gap", `${g.cardGapPx ?? 16}px`);
  root.style.setProperty("--ui-page-padding", `${g.pagePaddingPx}px`);
  root.style.setProperty("--ui-section-gap", `${g.sectionGapPx}px`);

  const unsetCd = (typeof c.unsetTextColor === "string" && c.unsetTextColor.trim()) || "#ffffff";
  const cdParagraph = resolveConceptTextColor(c.paragraphColor, unsetCd, isDark);
  const cdHeading = resolveConceptTextColor(c.headingColor, unsetCd, isDark);
  const cdH1 = resolveConceptTextColor(c.heading1Color, unsetCd, isDark);
  const cdH2 = resolveConceptTextColor(c.heading2Color, unsetCd, isDark);
  const cdH3 = resolveConceptTextColor(c.heading3Color, unsetCd, isDark);
  const cdBullet = resolveConceptTextColor(c.bulletColor, unsetCd, isDark);

  root.style.setProperty("--cd-font-family", c.fontFamily);
  root.style.setProperty("--cd-font-size", `${c.fontSizePx}px`);
  root.style.setProperty("--cd-line-height", String(c.lineHeight));
  root.style.setProperty("--cd-p-spacing", `${c.paragraphSpacingPx}px`);
  root.style.setProperty("--cd-h1-size", `${c.heading1SizePx}px`);
  root.style.setProperty("--cd-h2-size", `${c.heading2SizePx}px`);
  root.style.setProperty("--cd-h3-size", `${c.heading3SizePx}px`);
  root.style.setProperty("--cd-unset-text", unsetCd);
  const cdBg = (typeof c.backgroundColor === "string" && c.backgroundColor.trim()) || "transparent";
  root.style.setProperty("--cd-bg", cdBg);
  root.dataset.cdBg = cdBg !== "transparent" ? "1" : "0";
  root.style.setProperty("--cd-heading", cdHeading);
  root.style.setProperty("--cd-h1-color", cdH1);
  root.style.setProperty("--cd-h2-color", cdH2);
  root.style.setProperty("--cd-h3-color", cdH3);
  root.style.setProperty("--cd-paragraph", cdParagraph);
  root.style.setProperty("--cd-bold-weight", String(c.boldWeight));
  root.style.setProperty("--cd-link", c.linkColor);
  root.style.setProperty("--cd-bullet", cdBullet);
  root.style.setProperty("--cd-bullet-size", `${c.bulletSizePx}px`);
  root.style.setProperty("--cd-list-indent", `${c.listIndentPx}px`);
  root.style.setProperty("--cd-table-header-bg", c.tableHeaderBg);
  root.style.setProperty("--cd-table-header-color", c.tableHeaderColor);
  root.style.setProperty("--cd-table-border", c.tableBorderColor);
  root.style.setProperty("--cd-table-even", c.tableEvenRowBg);
  root.style.setProperty("--cd-table-font-size", `${c.tableFontSizePx}px`);
  root.style.setProperty("--cd-table-pad", `${c.tableCellPaddingPx}px`);
  root.style.setProperty(
    "--cd-mobile-table-card-padding",
    `${Math.max(0, Number(c.mobileTableCardPaddingPx ?? 0))}px`,
  );
  root.style.setProperty(
    "--cd-mobile-table-card-border-width",
    `${Math.max(0, Number(c.mobileTableCardBorderWidthPx ?? 0))}px`,
  );
  root.style.setProperty(
    "--cd-mobile-table-card-radius",
    `${Math.max(0, Number(c.mobileTableCardBorderRadiusPx ?? 0))}px`,
  );
  root.dataset.cdMobileTableBleed = c.mobileTableFullBleed !== false ? "1" : "0";
  root.style.setProperty("--cd-code-bg", c.codeBg);
  root.style.setProperty("--cd-quote-border", c.blockquoteBorder);
  const cdCardBg = typeof c.cardBg === "string" && c.cardBg.trim() ? c.cardBg.trim() : "";
  const cdCardBorder =
    typeof c.cardBorderColor === "string" && c.cardBorderColor.trim() ? c.cardBorderColor.trim() : "";
  root.style.setProperty("--cd-card-bg", cdCardBg || "hsl(var(--card))");
  root.style.setProperty("--cd-card-border", cdCardBorder || "hsl(var(--ui-card-border-color, var(--border)))");
  root.style.setProperty("--cd-card-border-width", `${c.cardBorderWidthPx ?? 1}px`);
  root.style.setProperty("--cd-card-radius", `${c.cardBorderRadiusPx ?? 10}px`);
  root.style.setProperty("--cd-card-padding", `${c.cardPaddingPx ?? 16}px`);
  root.style.setProperty("--cd-card-shadow-blur", `${c.cardShadowBlurPx ?? 6}px`);
  root.style.setProperty("--cd-card-shadow-y", `${c.cardShadowOffsetYPx ?? 1}px`);
  root.style.setProperty("--cd-card-shadow-opacity", String(c.cardShadowOpacity ?? 0.1));
  root.style.setProperty(
    "--cd-card-shadow-color",
    typeof c.cardShadowColor === "string" && c.cardShadowColor.trim() ? c.cardShadowColor.trim() : "#0f172a",
  );
  root.dataset.cdCardShadow = c.cardShadow !== false ? "1" : "0";
  root.style.setProperty("--cd-textbox-radius", `${c.textboxRadiusPx ?? 8}px`);
  root.style.setProperty("--cd-textbox-border-width", `${c.textboxBorderWidthPx ?? 1}px`);
  root.style.setProperty(
    "--cd-textbox-border",
    typeof c.textboxBorderColor === "string" && c.textboxBorderColor.trim()
      ? c.textboxBorderColor.trim()
      : "hsl(var(--border))",
  );
  root.style.setProperty(
    "--cd-textbox-bg",
    typeof c.textboxBg === "string" && c.textboxBg.trim() ? c.textboxBg.trim() : "hsl(var(--background))",
  );
  root.style.setProperty("--cd-textbox-min-height", `${c.textboxMinHeightPx ?? 360}px`);
  root.style.setProperty("--cd-textbox-padding", `${c.textboxPaddingPx ?? 12}px`);

  root.style.setProperty("--sbl-font-family", s.fontFamily);
  root.style.setProperty("--sbl-font-size", `${s.fontSizePx}px`);
  root.style.setProperty("--sbl-line-height", String(s.lineHeight));
  root.style.setProperty("--sbl-title-size", `${s.titleSizePx}px`);
  root.style.setProperty("--sbl-title-color", s.titleColor);
  root.style.setProperty("--sbl-body-color", s.bodyColor);
  root.style.setProperty("--sbl-heading-color", s.headingColor);
  root.style.setProperty("--sbl-link-color", s.linkColor);
  root.style.setProperty("--sbl-bg", s.backgroundColor);
  root.style.setProperty("--sbl-panel-bg", s.panelBg);
  root.style.setProperty("--sbl-accent", s.accentColor);
  root.style.setProperty("--sbl-border", s.borderColor);
  root.style.setProperty("--sbl-radius", `${s.borderRadiusPx}px`);
  root.style.setProperty("--sbl-pad", `${s.contentPaddingPx}px`);
  root.style.setProperty("--sbl-panel-border-width", `${s.borderWidthPx ?? 1}px`);
  root.style.setProperty("--sbl-panel-shadow-blur", `${s.panelShadowBlurPx ?? 8}px`);
  root.style.setProperty("--sbl-panel-shadow-y", `${s.panelShadowOffsetYPx ?? 2}px`);
  root.style.setProperty("--sbl-panel-shadow-opacity", String(s.panelShadowOpacity ?? 0.08));
  root.style.setProperty(
    "--sbl-panel-shadow-color",
    typeof s.panelShadowColor === "string" && s.panelShadowColor.trim() ? s.panelShadowColor.trim() : "#0f172a",
  );
  root.dataset.sblPanelShadow = s.panelShadow ? "1" : "0";
  root.style.setProperty("--sbl-textbox-radius", `${s.textboxRadiusPx ?? 8}px`);
  root.style.setProperty("--sbl-textbox-border-width", `${s.textboxBorderWidthPx ?? 1}px`);
  root.style.setProperty(
    "--sbl-textbox-border",
    typeof s.textboxBorderColor === "string" && s.textboxBorderColor.trim()
      ? s.textboxBorderColor.trim()
      : "hsl(var(--border))",
  );
  root.style.setProperty(
    "--sbl-textbox-bg",
    typeof s.textboxBg === "string" && s.textboxBg.trim() ? s.textboxBg.trim() : "hsl(var(--background))",
  );
  root.style.setProperty("--sbl-textbox-min-height", `${s.textboxMinHeightPx ?? 280}px`);
  root.style.setProperty("--sbl-textbox-padding", `${s.textboxPaddingPx ?? 12}px`);
  root.dataset.sblDialogWidth = s.dialogMaxWidth;

  root.style.setProperty("--aq-list-max", `${aq.listMaxWidthPx}px`);
  root.style.setProperty("--aq-card-gap", `${aq.cardGapPx}px`);
  root.style.setProperty("--aq-paper-bg", aq.paperBg);
  root.style.setProperty("--aq-paper-fg", aq.paperFg);
  root.style.setProperty("--aq-paper-muted", aq.paperMuted);
  root.style.setProperty("--aq-paper-border", aq.paperBorder);
  root.style.setProperty("--aq-paper-radius", `${aq.paperRadiusPx}px`);
  root.style.setProperty("--aq-paper-pad", `${aq.paperPaddingPx}px`);
  root.style.setProperty("--aq-q-label-size", `${aq.questionLabelSizePx}px`);
  root.style.setProperty("--aq-marks-size", `${aq.marksSizePx}px`);
  root.style.setProperty("--aq-mode-badge-size", `${aq.modeBadgeSizePx}px`);
  root.style.setProperty("--aq-board-badge-size", `${aq.boardBadgeSizePx}px`);
  root.style.setProperty("--aq-taxonomy-size", `${aq.taxonomySizePx}px`);
  root.style.setProperty("--aq-concept-size", `${aq.conceptSizePx}px`);
  root.style.setProperty("--aq-taxonomy", aq.taxonomyColor);
  root.style.setProperty("--aq-concept", aq.conceptColor);
  root.style.setProperty("--aq-header-border", aq.headerBorderColor);
  root.style.setProperty("--aq-badge-border", aq.badgeBorderColor);
  root.style.setProperty("--aq-stem-font", aq.stemFontFamily);
  root.style.setProperty("--aq-stem-size", `${aq.stemFontSizePx}px`);
  root.style.setProperty("--aq-stem-lh", String(aq.stemLineHeight));
  root.style.setProperty("--aq-stem-color", aq.stemColor);
  root.style.setProperty("--aq-option-font", aq.optionFontFamily);
  root.style.setProperty("--aq-option-size", `${aq.optionFontSizePx}px`);
  root.style.setProperty("--aq-option-lh", String(aq.optionLineHeight));
  root.style.setProperty("--aq-option-gap", `${aq.optionGapPx}px`);
  root.style.setProperty("--aq-option-num", aq.optionNumberColor);
  root.style.setProperty("--aq-option-text", aq.optionTextColor);
  root.style.setProperty("--aq-correct", aq.correctColor);
  root.style.setProperty("--aq-wrong", aq.wrongColor);
  root.style.setProperty("--aq-expl-title-size", `${aq.explanationTitleSizePx}px`);
  root.style.setProperty("--aq-expl-title-color", aq.explanationTitleColor);
  root.style.setProperty("--aq-expl-size", `${aq.explanationFontSizePx}px`);
  root.style.setProperty("--aq-expl-lh", String(aq.explanationLineHeight));
  root.style.setProperty("--aq-expl-color", aq.explanationColor);
  root.style.setProperty("--aq-expl-label", aq.explanationLabelColor);
  root.style.setProperty("--aq-expl-gap", `${aq.explanationGapPx}px`);
  root.style.setProperty("--aq-expl-border", aq.explanationBorderColor);
  root.style.setProperty("--aq-expl-pad-top", `${aq.explanationPaddingTopPx}px`);
  root.dataset.aqPaperShadow = aq.paperShadow ? "1" : "0";
  root.dataset.aqFilterSticky = aq.filterSticky ? "1" : "0";
  root.dataset.aqShowExplanations = aq.showExplanations ? "1" : "0";

  root.dataset.pageTitleGradient = g.pageTitleGradient ? "1" : "0";
  root.dataset.meshBg = g.meshBackground ? "1" : "0";
  root.dataset.cardBlur = g.cardBackdropBlur ? "1" : "0";
  root.dataset.stickyBlur = g.stickyBackdropBlur ? "1" : "0";
  root.dataset.cardShadow = g.cardShadow ? "1" : "0";
  root.dataset.cardHover = g.cardHoverHighlight ? "1" : "0";
  root.dataset.density = g.density;
  root.dataset.uiDevice = device;
  root.dataset.smoothScroll = p.smoothScroll ? "1" : "0";
  root.dataset.reduceMotion = p.reduceMotion ? "1" : "0";
  const cardAnimMs = Math.max(0, g.cardTransitionMs ?? 0);
  root.dataset.cardAnim = !p.reduceMotion && cardAnimMs > 0 ? "1" : "0";
  root.dataset.cardHoverMotion =
    !p.reduceMotion && ((g.cardHoverLiftPx ?? 0) > 0 || (g.cardHoverScale ?? 1) !== 1) ? "1" : "0";

  const pp = theme.progressPlan;

  root.style.setProperty("--pg-progress-bar", pp.progressBarColor.startsWith("#") ? pp.progressBarColor : `hsl(${pp.progressBarColor})`);
  root.style.setProperty("--pg-exam-night-bg", pp.examNightCardBg);
  root.style.setProperty("--pg-exam-night-border", pp.examNightBorder);
  root.style.setProperty("--pg-exam-night-icon", pp.examNightIconColor);
  root.style.setProperty("--pg-final-mock-bg", pp.finalMockCardBg);
  root.style.setProperty("--pg-final-mock-border", pp.finalMockBorder);
  root.style.setProperty("--pg-final-mock-icon", pp.finalMockIconColor);
  root.style.setProperty("--pg-complete-badge", pp.completeBadgeBg.startsWith("#") ? pp.completeBadgeBg : `hsl(${pp.completeBadgeBg})`);
  root.style.setProperty("--pg-mistake-accent", pp.mistakeAccentColor);
  root.dataset.progressPlanEnabled = pp.enabled ? "1" : "0";

  const hs = theme.headingSlides;
  root.style.setProperty("--hs-next-bar-bg", hs.nextBarBg);
  root.style.setProperty("--hs-next-bar-fg", hs.nextBarFg);
  root.style.setProperty("--hs-progress-track", hs.progressTrackColor);
  root.style.setProperty("--hs-progress-fill", hs.progressFillColor);
  root.style.setProperty("--hs-progress-height", `${hs.progressBarHeightPx}px`);
  root.style.setProperty("--hs-progress-dot-size", `${hs.progressDotSizePx}px`);
  root.dataset.hsProgress = hs.showProgressIndicator ? "1" : "0";
  root.dataset.headingSlidesConcept = hs.conceptDetailsEnabled ? "1" : "0";
  root.dataset.headingSlidesStory = hs.storyEnabled ? "1" : "0";

  root.style.fontFamily = g.fontFamily;
  root.style.fontSize = `${g.baseFontSizePx}px`;
  root.style.lineHeight = String(g.lineHeight);
  root.style.scrollBehavior = p.smoothScroll ? "smooth" : "auto";
}
