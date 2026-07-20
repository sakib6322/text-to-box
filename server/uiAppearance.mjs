import { getAppSetting } from "./appSettings.mjs";

export const UI_APPEARANCE_KEY = "ui_appearance";
export const UI_APPEARANCE_ROW_ID = "default";

function defaultSidebarLabels(overrides = {}) {
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

function defaultGlobal(overrides = {}) {
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

function defaultConcept(overrides = {}) {
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

function defaultStory(overrides = {}) {
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

function defaultAllQuestions(overrides = {}) {
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

function defaultDevice(kind) {
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

export function getDefaultUiAppearance() {
  return {
    version: 2,
    mobile: defaultDevice("mobile"),
    tablet: defaultDevice("tablet"),
    desktop: defaultDevice("desktop"),
    performance: { smoothScroll: false, reduceMotion: false },
    landingFaq: defaultLandingFaq(),
    landingPage: defaultLandingPage(),
    progressPlan: defaultProgressPlan(),
    headingSlides: defaultHeadingSlides(),
  };
}

function defaultHeadingSlides(overrides = {}) {
  return {
    conceptDetailsEnabled: true,
    storyEnabled: true,
    splitH1: true,
    splitH2: false,
    splitH3: false,
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
    ...overrides,
  };
}

function mergeHeadingSlides(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  const str = (v, fallback) => (typeof v === "string" ? v : fallback);
  const num = (v, fallback) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const mode = patch.preHeadingMode === "mergeFirst" || patch.preHeadingMode === "intro" ? patch.preHeadingMode : base.preHeadingMode;
  let nextTemplate = str(patch.nextTemplate, base.nextTemplate);
  if (nextTemplate === "{next} ({heading})") nextTemplate = "{heading}";
  return {
    conceptDetailsEnabled: bool(patch.conceptDetailsEnabled, base.conceptDetailsEnabled),
    storyEnabled: bool(patch.storyEnabled, base.storyEnabled),
    splitH1: bool(patch.splitH1, base.splitH1),
    splitH2: bool(patch.splitH2, base.splitH2),
    splitH3: bool(patch.splitH3, base.splitH3),
    preHeadingMode: mode,
    requireScrollToEnd: bool(patch.requireScrollToEnd, base.requireScrollToEnd),
    scrollShowNextAtPercent: num(patch.scrollShowNextAtPercent, base.scrollShowNextAtPercent),
    showNextHeadingPreview: bool(patch.showNextHeadingPreview, base.showNextHeadingPreview),
    nextLabel: str(patch.nextLabel, base.nextLabel),
    nextTemplate,
    showPrev: bool(patch.showPrev, base.showPrev),
    prevLabel: str(patch.prevLabel, base.prevLabel),
    showCounter: bool(patch.showCounter, base.showCounter),
    counterTemplate: str(patch.counterTemplate, base.counterTemplate),
    lastSlideLabel: str(patch.lastSlideLabel, base.lastSlideLabel),
    stickyNextBar: bool(patch.stickyNextBar, base.stickyNextBar),
    nextBarBg: str(patch.nextBarBg, base.nextBarBg),
    nextBarFg: str(patch.nextBarFg, base.nextBarFg),
    minCharsPerSlide: num(patch.minCharsPerSlide, base.minCharsPerSlide),
  };
}

function defaultProgressPlan(overrides = {}) {
  return {
    enabled: true,
    stepBarTitle: "Progress Plan",
    steps: [
      { id: 1, label: "Concept Learning", labelBn: "কনসেপ্ট শেখা" },
      { id: 2, label: "Key Points", labelBn: "Key Points" },
      { id: 3, label: "Question Yourself", labelBn: "নিজেকে পরীক্ষা" },
      { id: 4, label: "Practice Questions", labelBn: "Practice Questions" },
    ],
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

function mergeProgressPlan(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const p = patch;
  let steps = base.steps;
  if (Array.isArray(p.steps) && p.steps.length) {
    const byId = new Map(base.steps.map((s) => [s.id, s]));
    for (const raw of p.steps) {
      if (!raw || typeof raw !== "object") continue;
      const id = raw.id;
      if (id < 1 || id > 4) continue;
      const prev = byId.get(id) ?? { id, label: "", labelBn: "" };
      byId.set(id, {
        id,
        label: typeof raw.label === "string" ? raw.label : prev.label,
        labelBn: typeof raw.labelBn === "string" ? raw.labelBn : prev.labelBn,
      });
    }
    steps = [1, 2, 3, 4].map((id) => byId.get(id));
  }
  const out = { ...base, steps };
  for (const key of Object.keys(base)) {
    if (key === "steps") continue;
    if (p[key] !== undefined) out[key] = p[key];
  }
  return out;
}

function defaultLandingFaqItems() {
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

function defaultLandingFaq(overrides = {}) {
  return {
    title: overrides.title ?? "আপনার প্রশ্নগুলির উত্তর",
    subtitle: overrides.subtitle ?? "সচরাচর যেসব প্রশ্ন আমাদের সেবাগ্রহীতাগণ করে থাকেন",
    seeAnswerLabel: overrides.seeAnswerLabel ?? "উত্তর দেখুন",
    contentVersion: overrides.contentVersion ?? 2,
    items: overrides.items ?? defaultLandingFaqItems(),
  };
}

function defaultLandingPage(overrides = {}) {
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
    heroSubtext:
      "পোস্ট-গ্রাজুয়েশন জগতে সিলেবাস-ম্যাপড কোর্স, হাই-ইল্ড টপিক — আপনার সফলতার সঙ্গী।",
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

function defaultWhyItems() {
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

function normalizeWhyItem(raw, fallbackId) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.text !== "string") return null;
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : fallbackId,
    iconClass: typeof raw.iconClass === "string" ? raw.iconClass.trim() : "Sparkles",
    text: raw.text,
    iconColor: typeof raw.iconColor === "string" && raw.iconColor.trim() ? raw.iconColor : "#0ea5e9",
    iconBg: typeof raw.iconBg === "string" && raw.iconBg.trim() ? raw.iconBg : "rgba(255,255,255,0.92)",
    textColor: typeof raw.textColor === "string" && raw.textColor.trim() ? raw.textColor : "#ecfeff",
    cardBg: typeof raw.cardBg === "string" && raw.cardBg.trim() ? raw.cardBg : "transparent",
  };
}

function mergeLandingPage(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const next = { ...base };
  for (const key of Object.keys(base)) {
    if (key === "whyItems") continue;
    const val = patch[key];
    if (typeof val === "string" && typeof base[key] === "string") next[key] = val;
    else if (typeof val === "number" && typeof base[key] === "number" && Number.isFinite(val)) next[key] = val;
    else if (typeof val === "boolean" && typeof base[key] === "boolean") next[key] = val;
  }
  if (valIsTransition(patch.featuredTransition)) next.featuredTransition = patch.featuredTransition;
  if (Array.isArray(patch.whyItems)) {
    next.whyItems = patch.whyItems
      .map((it, i) => normalizeWhyItem(it, `why-${i + 1}`))
      .filter(Boolean);
  }
  return next;
}

function valIsTransition(v) {
  return v === "fade" || v === "slide" || v === "scale";
}

function newFaqId() {
  return `faq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeLandingFaq(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const patchVersion = typeof patch.contentVersion === "number" ? patch.contentVersion : 0;
  const useSavedItems =
    Array.isArray(patch.items) && patch.items.length > 0 && patchVersion >= 2;

  let items = base.items;
  if (useSavedItems) {
    items = patch.items
      .filter((it) => it && typeof it === "object")
      .map((it) => {
        const answers = Array.isArray(it.answers)
          ? it.answers
              .filter((a) => a && typeof a === "object")
              .map((a) => ({
                id: String(a.id ?? "").trim() || newFaqId(),
                text: String(a.text ?? ""),
              }))
          : [];
        return {
          id: String(it.id ?? "").trim() || newFaqId(),
          question: String(it.question ?? ""),
          answers,
        };
      });
  }
  return {
    title: typeof patch.title === "string" ? patch.title : base.title,
    subtitle: typeof patch.subtitle === "string" ? patch.subtitle : base.subtitle,
    seeAnswerLabel: typeof patch.seeAnswerLabel === "string" ? patch.seeAnswerLabel : base.seeAnswerLabel,
    contentVersion: Math.max(patchVersion, base.contentVersion ?? 0, 2),
    items,
  };
}

function mergeDevice(base, patch) {
  const p = patch && typeof patch === "object" ? patch : {};
  const pg = p.global && typeof p.global === "object" ? p.global : {};
  return {
    global: {
      ...base.global,
      ...pg,
      sidebarLabels: {
        ...base.global.sidebarLabels,
        ...(pg.sidebarLabels && typeof pg.sidebarLabels === "object" ? pg.sidebarLabels : {}),
      },
    },
    conceptDetails: { ...base.conceptDetails, ...(p.conceptDetails ?? {}) },
    storyBasedLearning: { ...base.storyBasedLearning, ...(p.storyBasedLearning ?? {}) },
    allQuestions: { ...base.allQuestions, ...(p.allQuestions ?? {}) },
  };
}

function fromV1(raw) {
  const base = getDefaultUiAppearance();
  const global = raw?.global && typeof raw.global === "object" ? raw.global : {};
  const conceptDetails = raw?.conceptDetails && typeof raw.conceptDetails === "object" ? raw.conceptDetails : {};
  const storyBasedLearning =
    raw?.storyBasedLearning && typeof raw.storyBasedLearning === "object" ? raw.storyBasedLearning : {};
  const allQuestions = raw?.allQuestions && typeof raw.allQuestions === "object" ? raw.allQuestions : {};
  const performance = raw?.performance && typeof raw.performance === "object" ? raw.performance : {};
  const shared = {
    global: {
      ...base.desktop.global,
      ...global,
      sidebarLabels: {
        ...base.desktop.global.sidebarLabels,
        ...(global.sidebarLabels && typeof global.sidebarLabels === "object" ? global.sidebarLabels : {}),
      },
    },
    conceptDetails: { ...base.desktop.conceptDetails, ...conceptDetails },
    storyBasedLearning: { ...base.desktop.storyBasedLearning, ...storyBasedLearning },
    allQuestions: { ...base.desktop.allQuestions, ...allQuestions },
  };
  return {
    version: 2,
    mobile: {
      global: { ...shared.global, contentMaxWidthPx: 512, density: "compact" },
      conceptDetails: shared.conceptDetails,
      storyBasedLearning: { ...shared.storyBasedLearning, fontSizePx: 15, titleSizePx: 16, dialogMaxWidth: "md" },
      allQuestions: { ...shared.allQuestions, listMaxWidthPx: 512, paperPaddingPx: 14, cardGapPx: 12 },
    },
    tablet: {
      global: { ...shared.global, contentMaxWidthPx: 840 },
      conceptDetails: shared.conceptDetails,
      storyBasedLearning: { ...shared.storyBasedLearning, dialogMaxWidth: "xl" },
      allQuestions: { ...shared.allQuestions, listMaxWidthPx: 680 },
    },
    desktop: shared,
    performance: { ...base.performance, ...performance },
    landingFaq: mergeLandingFaq(base.landingFaq, raw?.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, raw?.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, raw?.progressPlan),
    headingSlides: mergeHeadingSlides(base.headingSlides, raw?.headingSlides),
  };
}

export function parseUiAppearance(raw) {
  const defaults = getDefaultUiAppearance();
  if (raw == null || raw === "") return defaults;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== "object") return defaults;
    if (parsed.version === 1 || (!parsed.mobile && parsed.global)) return fromV1(parsed);
    return {
      version: 2,
      mobile: mergeDevice(defaults.mobile, parsed.mobile),
      tablet: mergeDevice(defaults.tablet, parsed.tablet),
      desktop: mergeDevice(defaults.desktop, parsed.desktop),
      performance: { ...defaults.performance, ...(parsed.performance ?? {}) },
      landingFaq: mergeLandingFaq(defaults.landingFaq, parsed.landingFaq),
      landingPage: mergeLandingPage(defaults.landingPage, parsed.landingPage),
      progressPlan: mergeProgressPlan(defaults.progressPlan, parsed.progressPlan),
      headingSlides: mergeHeadingSlides(defaults.headingSlides, parsed.headingSlides),
    };
  } catch {
    return defaults;
  }
}

function isMissingTableError(error) {
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  const code = String(error?.code ?? "");
  return code === "42P01" || code === "PGRST205" || msg.includes("does not exist") || msg.includes("could not find the table");
}

export async function loadProgressPlanSettings(db) {
  try {
    const row = await readFromUiTable(db);
    if (row?.config) return parseUiAppearance(row.config).progressPlan;
    const fallback = await getAppSetting(db, UI_APPEARANCE_KEY);
    if (fallback) return parseUiAppearance(fallback).progressPlan;
  } catch {
    /* use defaults */
  }
  return getDefaultUiAppearance().progressPlan;
}

async function readFromUiTable(db) {
  const { data, error } = await db
    .from("ui_appearance")
    .select("config, updated_at")
    .eq("id", UI_APPEARANCE_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function writeToUiTable(db, appearance) {
  const { data, error } = await db
    .from("ui_appearance")
    .upsert(
      {
        id: UI_APPEARANCE_ROW_ID,
        config: appearance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("config, updated_at")
    .single();
  if (error) throw error;
  return data;
}

async function readFromAppSettings(db) {
  const row = await getAppSetting(db, UI_APPEARANCE_KEY);
  return row ? { config: row.value, updated_at: row.updated_at } : null;
}

async function writeToAppSettings(db, appearance) {
  const { data, error } = await db
    .from("app_settings")
    .upsert(
      {
        key: UI_APPEARANCE_KEY,
        value: JSON.stringify(appearance),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();
  if (error) throw error;
  return { config: data.value, updated_at: data.updated_at };
}

export async function getUiAppearance(db) {
  try {
    const row = await readFromUiTable(db);
    const appearance = parseUiAppearance(row?.config ?? {});
    return {
      appearance,
      source: row?.config && Object.keys(row.config).length ? "database" : "default",
      storage: "ui_appearance",
      updated_at: row?.updated_at ?? null,
    };
  } catch (e) {
    if (!isMissingTableError(e)) throw e;
    const row = await readFromAppSettings(db);
    const appearance = parseUiAppearance(row?.config ?? "");
    return {
      appearance,
      source: row?.config ? "database" : "default",
      storage: "app_settings",
      updated_at: row?.updated_at ?? null,
      warning:
        "Table public.ui_appearance missing — using app_settings fallback. Run migration 20260717030000_ui_appearance_table.sql",
    };
  }
}

export async function saveUiAppearance(db, body) {
  const appearance = parseUiAppearance(body);
  try {
    const data = await writeToUiTable(db, appearance);
    return {
      appearance: parseUiAppearance(data.config),
      source: "database",
      storage: "ui_appearance",
      updated_at: data.updated_at,
    };
  } catch (e) {
    if (!isMissingTableError(e)) {
      const msg = e instanceof Error ? e.message : typeof e?.message === "string" ? e.message : JSON.stringify(e);
      throw new Error(msg || "Save failed");
    }
    const data = await writeToAppSettings(db, appearance);
    return {
      appearance: parseUiAppearance(data.config),
      source: "database",
      storage: "app_settings",
      updated_at: data.updated_at,
      warning:
        "Saved to app_settings because ui_appearance table is missing. Run migration for dedicated table.",
    };
  }
}

export async function resetUiAppearance(db) {
  const defaults = getDefaultUiAppearance();
  try {
    await db.from("ui_appearance").delete().eq("id", UI_APPEARANCE_ROW_ID);
  } catch (e) {
    if (!isMissingTableError(e)) throw e;
  }
  try {
    await db.from("app_settings").delete().eq("key", UI_APPEARANCE_KEY);
  } catch {
    /* ignore */
  }
  return {
    appearance: defaults,
    source: "default",
    storage: "none",
    updated_at: null,
  };
}
