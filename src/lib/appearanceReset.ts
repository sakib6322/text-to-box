import {
  defaultConceptAdminPreview,
  defaultConceptStudentUi,
  defaultPanelModes,
  defaultUiAppearance,
  type DeviceKey,
  type LandingPageAppearance,
  type ProgressPlanAppearance,
  type UiAppearance,
} from "@/lib/uiAppearance";

export type AppearanceTab =
  | "global"
  | "concept"
  | "story"
  | "questions"
  | "landing"
  | "progress"
  | "headingSlides"
  | "richEditor"
  | "performance"
  | "preview";

export type LandingSubSection =
  | "colors"
  | "nav"
  | "hero"
  | "featured"
  | "courses"
  | "about"
  | "faq"
  | "footer";

export type ProgressSubSection = "steps" | "copy" | "features" | "colors";

export type AppearanceResetScope = {
  tab: AppearanceTab;
  landingSection?: LandingSubSection;
  progressSection?: ProgressSubSection;
};

const LANDING_COLORS_KEYS = [
  "bgColor1",
  "bgColor2",
  "bgColor3",
  "coursesSectionBg",
  "aboutSectionBg",
  "faqSectionBg",
  "footerSectionBg",
  "textColor",
  "mutedTextColor",
  "accentColor",
  "courseCardBg",
  "courseCardBorder",
  "courseRoutineBg",
  "faqCardBg",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_NAV_KEYS = [
  "brandName",
  "navCourses",
  "navAbout",
  "navFaq",
  "loginButtonLabel",
  "goToAppLabel",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_HERO_KEYS = [
  "heroEyebrow",
  "heroHeadline",
  "heroSubtext",
  "heroCtaExplore",
  "heroFeaturedLabel",
  "heroFallbackTitle",
  "heroFallbackDesc",
  "heroFixedOverlayEnabled",
  "heroFixedOverlayColor",
  "heroFixedOverlayWidthPercent",
  "heroFixedOverlayHeightPercent",
  "heroFixedOverlayTopPercent",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_FEATURED_KEYS = [
  "featuredAutoplay",
  "featuredIntervalSec",
  "featuredPauseOnHover",
  "featuredTransitionEnabled",
  "featuredTransitionSec",
  "featuredTransition",
  "featuredEasing",
  "featuredSlideDistancePx",
  "featuredScaleFrom",
  "featuredShineEnabled",
  "featuredShineSec",
  "featuredTiltEnabled",
  "featuredHoverLift",
  "featuredHoverLiftPx",
  "featuredHoverDurationMs",
  "featuredMaxSlides",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_COURSES_KEYS = [
  "coursesTitle",
  "coursesSubtitle",
  "coursesEmpty",
  "coursesLoading",
  "courseViewLabel",
  "routineLabel",
  "routineEmpty",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_ABOUT_KEYS = [
  "aboutEyebrow",
  "aboutTitle",
  "aboutBody",
  "whyItems",
  "whyAutoplay",
  "whyIntervalSec",
  "whyTransitionSec",
] as const satisfies readonly (keyof LandingPageAppearance)[];

const LANDING_FOOTER_KEYS = ["footerNote", "fabLabel"] as const satisfies readonly (keyof LandingPageAppearance)[];

const PROGRESS_COPY_KEYS = [
  "studyProgressTitle",
  "studyProgressSubtitle",
  "courseCompleteLabel",
  "progressPctSuffix",
  "examNightTitle",
  "examNightSubtitle",
  "finalMockTitle",
  "finalMockSubtitle",
  "finalMockProgressLabel",
  "reviewMistakesTitle",
  "reviewMistakesSubtitle",
  "reviewMistakesButton",
  "reviewMistakesEmpty",
  "reviewMistakesClearAll",
  "conceptPracticeIntro",
  "step1CompleteButton",
  "step2CompleteButton",
  "step3CompleteButton",
  "lockedPreviousSteps",
  "noSelfQaSkip",
  "noPracticeSets",
  "openFromMyCourses",
  "selfQaIntro",
  "selfQaShowAnswerLabel",
  "selfQaNextQuestionLabel",
  "selfQaAnswerLabel",
  "selfQaQuestionLabel",
  "selfQaTapHint",
  "selfQaPrevLabel",
  "selfQaProgressLabel",
  "selfQaCompleteToast",
] as const satisfies readonly (keyof ProgressPlanAppearance)[];

const PROGRESS_FEATURES_KEYS = [
  "enabled",
  "showProgressOnBrowse",
  "showExamNightCard",
  "showFinalMockCard",
  "showReviewMistakes",
  "showConceptStepBar",
  "preferBengaliStepLabels",
  "defaultPassPercent",
  "examNightHoursBefore",
] as const satisfies readonly (keyof ProgressPlanAppearance)[];

const PROGRESS_COLORS_KEYS = [
  "progressBarColor",
  "examNightCardBg",
  "examNightBorder",
  "examNightIconColor",
  "finalMockCardBg",
  "finalMockBorder",
  "finalMockIconColor",
  "completeBadgeBg",
  "mistakeAccentColor",
] as const satisfies readonly (keyof ProgressPlanAppearance)[];

function copyKeys<T extends object, K extends keyof T>(target: T, source: T, keys: readonly K[]) {
  for (const key of keys) {
    const value = source[key];
    (target as Record<K, T[K]>)[key] =
      value !== null && typeof value === "object"
        ? (structuredClone(value) as T[K])
        : value;
  }
}

function resetLandingSubSection(
  theme: UiAppearance,
  section: LandingSubSection,
  defaults: UiAppearance,
) {
  const lp = theme.landingPage;
  const dlp = defaults.landingPage;
  switch (section) {
    case "colors":
      copyKeys(lp, dlp, LANDING_COLORS_KEYS);
      break;
    case "nav":
      copyKeys(lp, dlp, LANDING_NAV_KEYS);
      break;
    case "hero":
      copyKeys(lp, dlp, LANDING_HERO_KEYS);
      break;
    case "featured":
      copyKeys(lp, dlp, LANDING_FEATURED_KEYS);
      break;
    case "courses":
      copyKeys(lp, dlp, LANDING_COURSES_KEYS);
      break;
    case "about":
      copyKeys(lp, dlp, LANDING_ABOUT_KEYS);
      break;
    case "faq":
      theme.landingFaq = structuredClone(defaults.landingFaq);
      break;
    case "footer":
      copyKeys(lp, dlp, LANDING_FOOTER_KEYS);
      break;
  }
}

function resetProgressSubSection(
  theme: UiAppearance,
  section: ProgressSubSection,
  defaults: UiAppearance,
) {
  const prog = theme.progressPlan;
  const dprog = defaults.progressPlan;
  switch (section) {
    case "steps":
      prog.stepBarTitle = dprog.stepBarTitle;
      prog.preferBengaliStepLabels = dprog.preferBengaliStepLabels;
      prog.steps = structuredClone(dprog.steps);
      break;
    case "copy":
      copyKeys(prog, dprog, PROGRESS_COPY_KEYS);
      break;
    case "features":
      copyKeys(prog, dprog, PROGRESS_FEATURES_KEYS);
      break;
    case "colors":
      copyKeys(prog, dprog, PROGRESS_COLORS_KEYS);
      break;
  }
}

export function appearanceResetLabel(scope: AppearanceResetScope, editDevice: DeviceKey): string {
  const device = editDevice === "mobile" ? "Phone" : editDevice === "tablet" ? "Tablet" : "Computer";
  switch (scope.tab) {
    case "global":
      return `${device} · Website UI`;
    case "concept":
      return `${device} · Concept details`;
    case "story":
      return `${device} · Story learning`;
    case "questions":
      return `${device} · All questions`;
    case "landing":
      return scope.landingSection ? `Landing · ${scope.landingSection}` : "Landing page";
    case "progress":
      return scope.progressSection ? `Progress · ${scope.progressSection}` : "Progress plan";
    case "headingSlides":
      return "Heading slides";
    case "richEditor":
      return "Rich editor · Images";
    case "performance":
      return "Performance";
    case "preview":
      return "Live preview";
    default:
      return "Section";
  }
}

/** Reset only the active tab/section to defaults; other appearance data is preserved. */
export function resetAppearanceSection(
  theme: UiAppearance,
  scope: AppearanceResetScope,
  editDevice: DeviceKey,
): UiAppearance {
  if (scope.tab === "preview") {
    return theme;
  }

  const defaults = defaultUiAppearance();
  const next = structuredClone(theme);

  switch (scope.tab) {
    case "global":
      next[editDevice] = {
        ...next[editDevice],
        global: structuredClone(defaults[editDevice].global),
      };
      break;
    case "concept":
      next[editDevice] = {
        ...next[editDevice],
        conceptDetails: structuredClone(defaults[editDevice].conceptDetails),
      };
      next.conceptStudentUi = structuredClone(defaultConceptStudentUi());
      next.conceptAdminPreview = structuredClone(defaultConceptAdminPreview());
      next.panelModes = structuredClone(defaultPanelModes());
      break;
    case "story":
      next[editDevice] = {
        ...next[editDevice],
        storyBasedLearning: structuredClone(defaults[editDevice].storyBasedLearning),
      };
      next.panelModes = {
        ...next.panelModes,
        storyAsModal: defaultPanelModes().storyAsModal,
      };
      break;
    case "questions":
      next[editDevice] = {
        ...next[editDevice],
        allQuestions: structuredClone(defaults[editDevice].allQuestions),
      };
      break;
    case "landing":
      if (scope.landingSection) {
        resetLandingSubSection(next, scope.landingSection, defaults);
      } else {
        next.landingPage = structuredClone(defaults.landingPage);
        next.landingFaq = structuredClone(defaults.landingFaq);
      }
      break;
    case "progress":
      if (scope.progressSection) {
        resetProgressSubSection(next, scope.progressSection, defaults);
      } else {
        next.progressPlan = structuredClone(defaults.progressPlan);
      }
      break;
    case "headingSlides":
      next.headingSlides = structuredClone(defaults.headingSlides);
      break;
    case "richEditor":
      next.richEditor = structuredClone(defaults.richEditor);
      break;
    case "performance":
      next.performance = structuredClone(defaults.performance);
      break;
    default:
      break;
  }

  return next;
}
