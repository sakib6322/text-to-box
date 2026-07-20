/**
 * UI Master — per-device (mobile / tablet / desktop) appearance.
 * Stored in public.ui_appearance.config (jsonb), fallback app_settings.ui_appearance
 */

import { CONCEPT_STEPS } from "@/lib/progressPlan";

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
  sidebarBgHsl: string;
  sidebarFgHsl: string;
  pageTitleGradient: boolean;
  meshBackground: boolean;
  cardBackdropBlur: boolean;
  stickyBackdropBlur: boolean;
  cardShadow: boolean;
  density: "comfortable" | "compact";
  contentMaxWidthPx: number;
  /** Card chrome */
  cardBorderWidthPx: number;
  cardBorderOpacity: number;
  cardPaddingPx: number;
  cardHoverHighlight: boolean;
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
  codeBg: string;
  blockquoteBorder: string;
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
  /** Featured track card — advanced animation options */
  featuredAutoplay: boolean;
  /** Seconds between slide changes */
  featuredIntervalSec: number;
  /** Seconds for content enter/exit transition */
  featuredTransitionSec: number;
  featuredTransition: "fade" | "slide" | "scale";
  featuredShineEnabled: boolean;
  /** Seconds for one shine loop */
  featuredShineSec: number;
  featuredTiltEnabled: boolean;
  featuredHoverLift: boolean;
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

export type UiAppearance = {
  version: 2;
  mobile: DeviceAppearance;
  tablet: DeviceAppearance;
  desktop: DeviceAppearance;
  performance: {
    smoothScroll: boolean;
    reduceMotion: boolean;
  };
  /** Public course landing FAQ section */
  landingFaq: LandingFaqAppearance;
  /** Public course landing design + copy */
  landingPage: LandingPageAppearance;
  /** Progress Plan student UI + behavior knobs */
  progressPlan: ProgressPlanAppearance;
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
    sidebarBgHsl: "222 47% 11%",
    sidebarFgHsl: "210 25% 92%",
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
    steps: CONCEPT_STEPS.map((s) => ({ id: s.id, label: s.label, labelBn: s.labelBn })),
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
      const prev = byId.get(id) ?? { id, label: "", labelBn: "" };
      byId.set(id, {
        id,
        label: typeof s.label === "string" ? s.label : prev.label,
        labelBn: typeof s.labelBn === "string" ? s.labelBn : prev.labelBn,
      });
    }
    steps = [1, 2, 3, 4].map((id) => byId.get(id as 1 | 2 | 3 | 4)!);
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
    featuredTransitionSec: 0.3,
    featuredTransition: "fade",
    featuredShineEnabled: false,
    featuredShineSec: 8,
    featuredTiltEnabled: false,
    featuredHoverLift: true,
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
    p.featuredTransition === "scale"
  ) {
    next.featuredTransition = p.featuredTransition;
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
    "--pg-featured-transition-sec": `${Math.max(0.1, lp.featuredTransitionSec || 0.45)}s`,
    "--pg-why-transition-sec": `${Math.max(0.15, lp.whyTransitionSec || 0.55)}s`,
    "--pg-fixed-overlay-display": lp.heroFixedOverlayEnabled ? "block" : "none",
    "--pg-fixed-overlay-bg": lp.heroFixedOverlayColor || "#000000",
    "--pg-fixed-overlay-width": `${overlayW}%`,
    "--pg-fixed-overlay-height": `${overlayH}vh`,
    "--pg-fixed-overlay-top": `${overlayTop}vh`,
    "--pg-fixed-overlay-left": `${overlayLeft}%`,
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
    landingFaq: defaultLandingFaq(),
    landingPage: defaultLandingPage(),
    progressPlan: defaultProgressPlan(),
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
  return {
    global: {
      ...base.global,
      ...pg,
      sidebarLabels: {
        ...base.global.sidebarLabels,
        ...((pg.sidebarLabels && typeof pg.sidebarLabels === "object" ? pg.sidebarLabels : {}) as Partial<SidebarLabels>),
      },
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
    performance: { ...base.performance, ...performance },
    landingFaq: mergeLandingFaq(base.landingFaq, raw.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, raw.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, raw.progressPlan),
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
    performance: {
      ...base.performance,
      ...((p.performance && typeof p.performance === "object" ? p.performance : {}) as object),
    },
    landingFaq: mergeLandingFaq(base.landingFaq, p.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, p.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, p.progressPlan),
  };
}

export function detectDeviceKey(width = typeof window !== "undefined" ? window.innerWidth : 1280): DeviceKey {
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function resolveDeviceTheme(theme: UiAppearance, device: DeviceKey = detectDeviceKey()): DeviceAppearance {
  return theme[device] ?? theme.desktop;
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

  root.style.setProperty("--ui-font-family", g.fontFamily);
  root.style.setProperty("--ui-font-size", `${g.baseFontSizePx}px`);
  root.style.setProperty("--ui-line-height", String(g.lineHeight));
  root.style.setProperty("--radius", `${g.radiusRem}rem`);
  root.style.setProperty("--primary", g.primaryHsl);
  root.style.setProperty("--accent", g.accentHsl);
  root.style.setProperty("--background", g.backgroundHsl);
  root.style.setProperty("--foreground", g.foregroundHsl);
  root.style.setProperty("--card", g.cardHsl);
  root.style.setProperty("--border", g.borderHsl);
  root.style.setProperty("--input", g.borderHsl);
  root.style.setProperty("--muted-foreground", g.mutedForegroundHsl);
  root.style.setProperty("--sidebar-background", g.sidebarBgHsl);
  root.style.setProperty("--sidebar-foreground", g.sidebarFgHsl);
  root.style.setProperty("--ring", g.primaryHsl);
  root.style.setProperty("--glow-cyan", g.primaryHsl);
  root.style.setProperty("--glow-violet", g.accentHsl);
  root.style.setProperty("--ui-content-max", `${g.contentMaxWidthPx}px`);
  root.style.setProperty("--ui-card-border-width", `${g.cardBorderWidthPx}px`);
  root.style.setProperty("--ui-card-border-opacity", String(g.cardBorderOpacity));
  root.style.setProperty("--ui-card-padding", `${g.cardPaddingPx}px`);
  root.style.setProperty("--ui-page-padding", `${g.pagePaddingPx}px`);
  root.style.setProperty("--ui-section-gap", `${g.sectionGapPx}px`);

  root.style.setProperty("--cd-font-family", c.fontFamily);
  root.style.setProperty("--cd-font-size", `${c.fontSizePx}px`);
  root.style.setProperty("--cd-line-height", String(c.lineHeight));
  root.style.setProperty("--cd-p-spacing", `${c.paragraphSpacingPx}px`);
  root.style.setProperty("--cd-h1-size", `${c.heading1SizePx}px`);
  root.style.setProperty("--cd-h2-size", `${c.heading2SizePx}px`);
  root.style.setProperty("--cd-h3-size", `${c.heading3SizePx}px`);
  root.style.setProperty("--cd-heading", c.headingColor);
  root.style.setProperty("--cd-h1-color", c.heading1Color);
  root.style.setProperty("--cd-h2-color", c.heading2Color);
  root.style.setProperty("--cd-h3-color", c.heading3Color);
  root.style.setProperty("--cd-paragraph", c.paragraphColor);
  root.style.setProperty("--cd-bold-weight", String(c.boldWeight));
  root.style.setProperty("--cd-link", c.linkColor);
  root.style.setProperty("--cd-bullet", c.bulletColor);
  root.style.setProperty("--cd-bullet-size", `${c.bulletSizePx}px`);
  root.style.setProperty("--cd-list-indent", `${c.listIndentPx}px`);
  root.style.setProperty("--cd-table-header-bg", c.tableHeaderBg);
  root.style.setProperty("--cd-table-header-color", c.tableHeaderColor);
  root.style.setProperty("--cd-table-border", c.tableBorderColor);
  root.style.setProperty("--cd-table-even", c.tableEvenRowBg);
  root.style.setProperty("--cd-table-font-size", `${c.tableFontSizePx}px`);
  root.style.setProperty("--cd-table-pad", `${c.tableCellPaddingPx}px`);
  root.style.setProperty("--cd-code-bg", c.codeBg);
  root.style.setProperty("--cd-quote-border", c.blockquoteBorder);

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

  root.style.fontFamily = g.fontFamily;
  root.style.fontSize = `${g.baseFontSizePx}px`;
  root.style.lineHeight = String(g.lineHeight);
  root.style.scrollBehavior = p.smoothScroll ? "smooth" : "auto";
}
