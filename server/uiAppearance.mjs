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

function defaultSidebar(overrides = {}) {
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

function mergeSidebar(base, patch, legacy = {}) {
  if (!patch || typeof patch !== "object") patch = {};
  const str = (v, fallback) => (typeof v === "string" ? v : fallback);
  const num = (v, fallback, min, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  const merged = {
    backgroundHsl: str(patch.backgroundHsl, base.backgroundHsl),
    foregroundHsl: str(patch.foregroundHsl, base.foregroundHsl),
    primaryHsl: str(patch.primaryHsl, base.primaryHsl),
    primaryForegroundHsl: str(patch.primaryForegroundHsl, base.primaryForegroundHsl),
    accentHsl: str(patch.accentHsl, base.accentHsl),
    accentForegroundHsl: str(patch.accentForegroundHsl, base.accentForegroundHsl),
    borderHsl: str(patch.borderHsl, base.borderHsl),
    ringHsl: str(patch.ringHsl, base.ringHsl),
    widthRem: num(patch.widthRem, base.widthRem, 12, 24),
    widthIconRem: num(patch.widthIconRem, base.widthIconRem, 2.5, 6),
    widthMobileRem: num(patch.widthMobileRem, base.widthMobileRem, 14, 24),
    brandTitle: str(patch.brandTitle, base.brandTitle),
    brandSubtitle: str(patch.brandSubtitle, base.brandSubtitle),
    brandTitleSizePx: num(patch.brandTitleSizePx, base.brandTitleSizePx, 10, 22),
    brandSubtitleSizePx: num(patch.brandSubtitleSizePx, base.brandSubtitleSizePx, 8, 16),
    brandPaddingPx: num(patch.brandPaddingPx, base.brandPaddingPx, 8, 32),
    brandShowBorder: bool(patch.brandShowBorder, base.brandShowBorder),
    menuFontSizePx: num(patch.menuFontSizePx, base.menuFontSizePx, 10, 18),
    menuItemHeightPx: num(patch.menuItemHeightPx, base.menuItemHeightPx, 28, 52),
    menuItemPaddingPx: num(patch.menuItemPaddingPx, base.menuItemPaddingPx, 0, 24),
    menuItemRadiusRem: num(patch.menuItemRadiusRem, base.menuItemRadiusRem, 0, 1),
    menuIconSizePx: num(patch.menuIconSizePx, base.menuIconSizePx, 12, 24),
    menuGapPx: num(patch.menuGapPx, base.menuGapPx, 4, 16),
    activeFontWeight: num(patch.activeFontWeight, base.activeFontWeight, 400, 800),
    mutedOpacity: num(patch.mutedOpacity, base.mutedOpacity, 0.2, 1),
    menuTransformEnabled: bool(patch.menuTransformEnabled, base.menuTransformEnabled),
    menuTransitionDurationMs: num(patch.menuTransitionDurationMs, base.menuTransitionDurationMs, 0, 400),
    menuHoverSlidePx: num(patch.menuHoverSlidePx, base.menuHoverSlidePx, 0, 12),
    menuActiveSlidePx: num(patch.menuActiveSlidePx, base.menuActiveSlidePx, 0, 16),
    menuPressScale: num(patch.menuPressScale, base.menuPressScale, 0.94, 1),
    collapseTransitionEnabled: bool(patch.collapseTransitionEnabled, base.collapseTransitionEnabled),
    collapseDurationMs: num(patch.collapseDurationMs, base.collapseDurationMs, 0, 600),
    collapseEasing:
      patch.collapseEasing === "ease" || patch.collapseEasing === "ease-in-out"
        ? patch.collapseEasing
        : base.collapseEasing,
    collapseAnimateWidth: bool(patch.collapseAnimateWidth, base.collapseAnimateWidth),
    collapseAnimateTransform: bool(patch.collapseAnimateTransform, base.collapseAnimateTransform),
    collapseIconInnerSlide: bool(patch.collapseIconInnerSlide, base.collapseIconInnerSlide),
    menuCollapseSizeTransition: bool(patch.menuCollapseSizeTransition, base.menuCollapseSizeTransition),
    groupLabelTransition: bool(patch.groupLabelTransition, base.groupLabelTransition),
    railTransition: bool(patch.railTransition, base.railTransition),
  };
  if (legacy.sidebarBgHsl) merged.backgroundHsl = legacy.sidebarBgHsl;
  if (legacy.sidebarFgHsl) merged.foregroundHsl = legacy.sidebarFgHsl;
  return merged;
}

function defaultHeader(overrides = {}) {
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

function mergeHeader(base, patch) {
  if (!patch || typeof patch !== "object") patch = {};
  const str = (v, fallback) => (typeof v === "string" ? v : fallback);
  const num = (v, fallback, min, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  return {
    backgroundHsl: str(patch.backgroundHsl, base.backgroundHsl),
    foregroundHsl: str(patch.foregroundHsl, base.foregroundHsl),
    borderHsl: str(patch.borderHsl, base.borderHsl),
    titleColorHsl: str(patch.titleColorHsl, base.titleColorHsl),
    searchBackgroundHsl: str(patch.searchBackgroundHsl, base.searchBackgroundHsl),
    searchBorderHsl: str(patch.searchBorderHsl, base.searchBorderHsl),
    iconColorHsl: str(patch.iconColorHsl, base.iconColorHsl),
    iconHoverBgHsl: str(patch.iconHoverBgHsl, base.iconHoverBgHsl),
    notificationDotHsl: str(patch.notificationDotHsl, base.notificationDotHsl),
    heightPx: num(patch.heightPx, base.heightPx, 44, 80),
    titleFontSizePx: num(patch.titleFontSizePx, base.titleFontSizePx, 10, 22),
    titleFontWeight: num(patch.titleFontWeight, base.titleFontWeight, 400, 800),
    searchHeightPx: num(patch.searchHeightPx, base.searchHeightPx, 28, 52),
    searchRadiusRem: num(patch.searchRadiusRem, base.searchRadiusRem, 0, 1),
    paddingHorizontalPx: num(patch.paddingHorizontalPx, base.paddingHorizontalPx, 8, 32),
    hideOnScrollDown: bool(patch.hideOnScrollDown, base.hideOnScrollDown),
    backdropBlur: bool(patch.backdropBlur, base.backdropBlur),
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
    unsetTextColor: "#ffffff",
    backgroundColor: "",
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
    richEditor: defaultRichEditor(),
    landingFaq: defaultLandingFaq(),
    landingPage: defaultLandingPage(),
    progressPlan: defaultProgressPlan(),
    headingSlides: defaultHeadingSlides(),
    conceptStudentUi: defaultConceptStudentUi(),
    conceptAdminPreview: defaultConceptAdminPreview(),
  };
}

function defaultRichEditor(overrides = {}) {
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

function mergeRichEditor(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  const num = (v, fallback, min, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  return {
    imageLazyLoading: bool(patch.imageLazyLoading, base.imageLazyLoading),
    directImageUpload: bool(patch.directImageUpload, base.directImageUpload),
    imageCompression: bool(patch.imageCompression, base.imageCompression),
    imageCompressionMaxWidthPx: num(patch.imageCompressionMaxWidthPx, base.imageCompressionMaxWidthPx, 640, 3840),
    imageCompressionQuality: num(patch.imageCompressionQuality, base.imageCompressionQuality, 0.5, 1),
    googleDriveEmbeds: bool(patch.googleDriveEmbeds, base.googleDriveEmbeds),
  };
}

function defaultHeadingSlides(overrides = {}) {
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

function defaultConceptStudentUi(overrides = {}) {
  return {
    showKeyPointsOnDetails: true,
    showDetailsButton: true,
    showQuestionsButton: true,
    showStudyButton: true,
    showPracticeButton: true,
    showStudyAndPracticeButton: true,
    ...overrides,
  };
}

function mergeConceptStudentUi(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  return {
    showKeyPointsOnDetails: bool(patch.showKeyPointsOnDetails, base.showKeyPointsOnDetails),
    showDetailsButton: bool(patch.showDetailsButton, base.showDetailsButton),
    showQuestionsButton: bool(patch.showQuestionsButton, base.showQuestionsButton),
    showStudyButton: bool(patch.showStudyButton, base.showStudyButton),
    showPracticeButton: bool(patch.showPracticeButton, base.showPracticeButton),
    showStudyAndPracticeButton: bool(patch.showStudyAndPracticeButton, base.showStudyAndPracticeButton),
  };
}

function defaultConceptAdminPreview(overrides = {}) {
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

function mergeConceptAdminPreview(base, patch) {
  if (!patch || typeof patch !== "object") return base;
  const bool = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  return {
    showPreviewOnMobile: bool(patch.showPreviewOnMobile, base.showPreviewOnMobile),
    showPreviewOnTablet: bool(patch.showPreviewOnTablet, base.showPreviewOnTablet),
    showPreviewOnDesktop: bool(patch.showPreviewOnDesktop, base.showPreviewOnDesktop),
    showHeadingSlidesOnMobile: bool(patch.showHeadingSlidesOnMobile, base.showHeadingSlidesOnMobile),
    showHeadingSlidesOnTablet: bool(patch.showHeadingSlidesOnTablet, base.showHeadingSlidesOnTablet),
    showHeadingSlidesOnDesktop: bool(patch.showHeadingSlidesOnDesktop, base.showHeadingSlidesOnDesktop),
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
  const scrollMode = patch.scrollMode === "nested" || patch.scrollMode === "page" ? patch.scrollMode : base.scrollMode;
  const progressStyle =
    patch.progressStyle === "bar" || patch.progressStyle === "dots" || patch.progressStyle === "barAndDots"
      ? patch.progressStyle
      : base.progressStyle ?? "bar";
  return {
    conceptDetailsEnabled: bool(patch.conceptDetailsEnabled, base.conceptDetailsEnabled),
    storyEnabled: bool(patch.storyEnabled, base.storyEnabled),
    splitH1: bool(patch.splitH1, base.splitH1),
    splitH2: bool(patch.splitH2, base.splitH2),
    splitH3: bool(patch.splitH3, base.splitH3),
    splitH4: bool(patch.splitH4, base.splitH4 ?? false),
    splitH5: bool(patch.splitH5, base.splitH5 ?? false),
    splitH6: bool(patch.splitH6, base.splitH6 ?? false),
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
    scrollMode,
    trapNestedScroll: bool(patch.trapNestedScroll, base.trapNestedScroll),
    showProgressIndicator: bool(patch.showProgressIndicator, base.showProgressIndicator ?? true),
    progressStyle,
    progressBarHeightPx: num(patch.progressBarHeightPx, base.progressBarHeightPx ?? 5),
    progressTrackColor: str(patch.progressTrackColor, base.progressTrackColor ?? "hsl(var(--border))"),
    progressFillColor: str(patch.progressFillColor, base.progressFillColor ?? "hsl(var(--primary))"),
    progressDotSizePx: num(patch.progressDotSizePx, base.progressDotSizePx ?? 8),
    showProgressPercent: bool(patch.showProgressPercent, base.showProgressPercent ?? false),
    progressLabelTemplate: str(patch.progressLabelTemplate, base.progressLabelTemplate ?? "{percent}%"),
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
  if (valIsFeaturedEasing(patch.featuredEasing)) next.featuredEasing = patch.featuredEasing;
  if (Array.isArray(patch.whyItems)) {
    next.whyItems = patch.whyItems
      .map((it, i) => normalizeWhyItem(it, `why-${i + 1}`))
      .filter(Boolean);
  }
  return next;
}

function valIsTransition(v) {
  return v === "fade" || v === "slide" || v === "scale" || v === "none";
}

function valIsFeaturedEasing(v) {
  return v === "linear" || v === "ease" || v === "ease-out" || v === "ease-in-out";
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

function mergePerformance(base, patch) {
  const p = patch && typeof patch === "object" ? patch : {};
  return {
    smoothScroll: typeof p.smoothScroll === "boolean" ? p.smoothScroll : base.smoothScroll,
    reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : base.reduceMotion,
  };
}

function mergeDevice(base, patch) {
  const p = patch && typeof patch === "object" ? patch : {};
  const pg = p.global && typeof p.global === "object" ? p.global : {};
  const easing =
    pg.motionEasing === "linear" ||
    pg.motionEasing === "ease" ||
    pg.motionEasing === "ease-out" ||
    pg.motionEasing === "ease-in-out"
      ? pg.motionEasing
      : undefined;
  const clamp = (v, fallback, min, max) => {
    if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
  };
  return {
    global: {
      ...base.global,
      ...pg,
      ...(easing ? { motionEasing: easing } : {}),
      motionDurationMs: clamp(pg.motionDurationMs, base.global.motionDurationMs, 0, 600),
      motionHoverLiftPx: clamp(pg.motionHoverLiftPx, base.global.motionHoverLiftPx, 0, 12),
      motionHoverScale: clamp(pg.motionHoverScale, base.global.motionHoverScale, 1, 1.15),
      motionPressScale: clamp(pg.motionPressScale, base.global.motionPressScale, 0.9, 1),
      sidebarLabels: {
        ...base.global.sidebarLabels,
        ...(pg.sidebarLabels && typeof pg.sidebarLabels === "object" ? pg.sidebarLabels : {}),
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
    performance: mergePerformance(base.performance, performance),
    richEditor: mergeRichEditor(base.richEditor, raw?.richEditor),
    landingFaq: mergeLandingFaq(base.landingFaq, raw?.landingFaq),
    landingPage: mergeLandingPage(base.landingPage, raw?.landingPage),
    progressPlan: mergeProgressPlan(base.progressPlan, raw?.progressPlan),
    headingSlides: mergeHeadingSlides(base.headingSlides, raw?.headingSlides),
    conceptStudentUi: mergeConceptStudentUi(base.conceptStudentUi, raw?.conceptStudentUi),
    conceptAdminPreview: mergeConceptAdminPreview(base.conceptAdminPreview, raw?.conceptAdminPreview),
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
      performance: mergePerformance(defaults.performance, parsed.performance),
      richEditor: mergeRichEditor(defaults.richEditor, parsed.richEditor),
      landingFaq: mergeLandingFaq(defaults.landingFaq, parsed.landingFaq),
      landingPage: mergeLandingPage(defaults.landingPage, parsed.landingPage),
      progressPlan: mergeProgressPlan(defaults.progressPlan, parsed.progressPlan),
      headingSlides: mergeHeadingSlides(defaults.headingSlides, parsed.headingSlides),
      conceptStudentUi: mergeConceptStudentUi(defaults.conceptStudentUi, parsed.conceptStudentUi),
      conceptAdminPreview: mergeConceptAdminPreview(defaults.conceptAdminPreview, parsed.conceptAdminPreview),
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
