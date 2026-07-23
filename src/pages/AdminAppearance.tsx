import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home, Loader2, Monitor, Plus, RotateCcw, Save, Smartphone, Tablet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import {
  applyUiAppearance,
  defaultUiAppearance,
  detectDeviceKey,
  newFaqId,
  newWhyId,
  type DeviceKey,
  type LandingFaqAppearance,
  type LandingFaqItem,
  type LandingPageAppearance,
  type LandingWhyItem,
  type ProgressPlanAppearance,
  type ProgressStepConfig,
  type SidebarAppearance,
  type HeaderAppearance,
  type SidebarLabels,
  type StoryDialogWidth,
  type HeadingSlidesAppearance,
  type ConceptStudentUiAppearance,
  type ConceptAdminPreviewAppearance,
  type RichEditorAppearance,
  type UiAppearance,
} from "@/lib/uiAppearance";
import { Textarea } from "@/components/ui/textarea";
import { AppearanceOptionGuide } from "@/components/AppearanceOptionGuide";
import { ColorField, FlexibleColorField, ThemeColorField } from "@/components/AppearanceColorFields";
import { ConceptDetailShell } from "@/components/ConceptDetailShell";
import {
  AllQuestionsLivePreview,
  AppearancePreviewPanel,
  CombinedAppearancePreview,
  ConceptDetailsLivePreview,
  GlobalWebsiteLivePreview,
  HeadingSlidesLivePreview,
  LandingLivePreview,
  PerformanceLivePreview,
  ProgressLivePreview,
  RichEditorLivePreview,
  StoryLivePreview,
} from "@/components/AppearanceLivePreviews";
import {
  appearanceResetLabel,
  resetAppearanceSection,
  type AppearanceTab,
} from "@/lib/appearanceReset";
import {
  GUIDE_CONCEPT,
  GUIDE_HEADING_SLIDES,
  GUIDE_LANDING_ABOUT,
  GUIDE_LANDING_COLORS,
  GUIDE_LANDING_COURSES,
  GUIDE_LANDING_FAQ,
  GUIDE_LANDING_FEATURED,
  GUIDE_LANDING_FOOTER,
  GUIDE_LANDING_HERO,
  GUIDE_LANDING_NAV,
  GUIDE_PERFORMANCE,
  GUIDE_PREVIEW,
  GUIDE_PROGRESS_COLORS,
  GUIDE_PROGRESS_COPY,
  GUIDE_PROGRESS_FEATURES,
  GUIDE_PROGRESS_STEPS,
  GUIDE_QUESTIONS,
  GUIDE_RICH_EDITOR,
  GUIDE_STORY,
  GUIDE_WEBSITE_UI,
} from "@/lib/appearanceOptionGuides";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <Field label={props.label} hint={props.hint}>
      <Input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={props.label} hint={props.hint}>
      <Input value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </Field>
  );
}

function BoolField(props: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{props.label}</p>
        {props.hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{props.hint}</p> : null}
      </div>
      <Switch checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}

const deviceMeta: Record<DeviceKey, { label: string; hint: string; icon: typeof Smartphone }> = {
  mobile: { label: "Phone", hint: "< 768px", icon: Smartphone },
  tablet: { label: "Tablet", hint: "768–1023px", icon: Tablet },
  desktop: { label: "Computer", hint: "≥ 1024px", icon: Monitor },
};

const GLOBAL_COLOR_KEYS = [
  "primaryHsl",
  "accentHsl",
  "backgroundHsl",
  "foregroundHsl",
  "cardHsl",
  "borderHsl",
  "mutedForegroundHsl",
  "cardForegroundHsl",
  "cardBorderHsl",
  "cardShadowColorHsl",
] as const satisfies readonly (keyof UiAppearance["desktop"]["global"])[];

const GLOBAL_LAYOUT_KEYS = [
  "radiusRem",
  "cardBorderWidthPx",
  "cardBorderOpacity",
  "cardPaddingPx",
  "pagePaddingPx",
  "sectionGapPx",
  "cardHoverHighlight",
  "cardShadow",
  "cardBackdropBlur",
  "cardRadiusRem",
  "cardBgOpacity",
  "cardShadowBlurPx",
  "cardShadowOffsetYPx",
  "cardShadowOpacity",
  "cardBackdropBlurPx",
  "cardHoverBorderOpacity",
  "cardHoverShadowBlurPx",
  "cardHoverShadowOpacity",
  "cardHoverLiftPx",
  "cardHoverScale",
  "cardTransitionMs",
  "cardGapPx",
] as const satisfies readonly (keyof UiAppearance["desktop"]["global"])[];

const SIDEBAR_LABEL_FIELDS = [
  ["home", "Home"],
  ["suggestions", "Suggestions"],
  ["mySuggestions", "My Suggestions"],
  ["myProgress", "My progress"],
  ["myExams", "My exams"],
  ["dashboard", "Dashboard"],
  ["questionBank", "Question bank"],
  ["createQuestionAi", "Create question (AI)"],
  ["allQuestions", "All questions"],
  ["exam", "Exam"],
  ["createExam", "Create exam"],
  ["schedules", "Schedules"],
  ["student", "Student"],
  ["teacher", "Teacher"],
  ["organization", "Organization"],
  ["settings", "Settings"],
  ["general", "General"],
  ["appearance", "Appearance"],
  ["signOut", "Sign out"],
] as const satisfies readonly [keyof SidebarLabels, string][];

export default function AdminAppearance() {
  const {
    appearance,
    loading,
    source,
    storage,
    activeDevice,
    editDevice,
    setEditDevice,
    save,
  } = useUiAppearance();
  const [draft, setDraft] = useState<UiAppearance | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<AppearanceTab>("global");
  const [landingSection, setLandingSection] = useState<
    "colors" | "nav" | "hero" | "featured" | "courses" | "about" | "faq" | "footer"
  >("colors");
  const [progressSection, setProgressSection] = useState<"steps" | "copy" | "features" | "colors">("steps");
  const savedRef = useRef(appearance);
  savedRef.current = appearance;

  const theme = draft ?? appearance;
  const deviceTheme = theme[editDevice];
  const dirty = draft != null;

  // Preview-only CSS while editing. Never writes to DB.
  // Leaving without Save restores the last saved appearance.
  useEffect(() => {
    return () => {
      applyUiAppearance(savedRef.current, detectDeviceKey());
    };
  }, []);

  const commit = (next: UiAppearance) => {
    setDraft(next);
    applyUiAppearance(next, detectDeviceKey());
  };

  const discardDraft = () => {
    setDraft(null);
    applyUiAppearance(appearance, detectDeviceKey());
    toast.message("Unsaved changes discarded");
  };

  const updateGlobal = <K extends keyof UiAppearance["desktop"]["global"]>(
    key: K,
    value: UiAppearance["desktop"]["global"][K],
  ) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        global: { ...deviceTheme.global, [key]: value },
      },
    });
  };

  const updateSidebarLabel = (key: keyof SidebarLabels, value: string) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        global: {
          ...deviceTheme.global,
          sidebarLabels: { ...deviceTheme.global.sidebarLabels, [key]: value },
        },
      },
    });
  };

  const updateSidebar = <K extends keyof SidebarAppearance>(key: K, value: SidebarAppearance[K]) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        global: {
          ...deviceTheme.global,
          sidebar: { ...deviceTheme.global.sidebar, [key]: value },
        },
      },
    });
  };

  const updateHeader = <K extends keyof HeaderAppearance>(key: K, value: HeaderAppearance[K]) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        global: {
          ...deviceTheme.global,
          header: { ...deviceTheme.global.header, [key]: value },
        },
      },
    });
  };

  const updateCd = <K extends keyof UiAppearance["desktop"]["conceptDetails"]>(
    key: K,
    value: UiAppearance["desktop"]["conceptDetails"][K],
  ) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        conceptDetails: { ...deviceTheme.conceptDetails, [key]: value },
      },
    });
  };

  const updateSbl = <K extends keyof UiAppearance["desktop"]["storyBasedLearning"]>(
    key: K,
    value: UiAppearance["desktop"]["storyBasedLearning"][K],
  ) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        storyBasedLearning: { ...deviceTheme.storyBasedLearning, [key]: value },
      },
    });
  };

  const updateAq = <K extends keyof UiAppearance["desktop"]["allQuestions"]>(
    key: K,
    value: UiAppearance["desktop"]["allQuestions"][K],
  ) => {
    commit({
      ...theme,
      [editDevice]: {
        ...deviceTheme,
        allQuestions: { ...deviceTheme.allQuestions, [key]: value },
      },
    });
  };

  const updatePerf = <K extends keyof UiAppearance["performance"]>(
    key: K,
    value: UiAppearance["performance"][K],
  ) => {
    commit({ ...theme, performance: { ...theme.performance, [key]: value } });
  };

  const updateRichEditor = <K extends keyof RichEditorAppearance>(key: K, value: RichEditorAppearance[K]) => {
    commit({ ...theme, richEditor: { ...theme.richEditor, [key]: value } });
  };

  const faq = theme.landingFaq;
  const lp = theme.landingPage;
  const prog = theme.progressPlan;
  const hs = theme.headingSlides;
  const re = theme.richEditor;
  const csu = theme.conceptStudentUi;
  const cap = theme.conceptAdminPreview;

  const updateProgressPlan = <K extends keyof ProgressPlanAppearance>(key: K, value: ProgressPlanAppearance[K]) => {
    commit({ ...theme, progressPlan: { ...theme.progressPlan, [key]: value } });
  };

  const updateHeadingSlides = <K extends keyof HeadingSlidesAppearance>(key: K, value: HeadingSlidesAppearance[K]) => {
    commit({ ...theme, headingSlides: { ...theme.headingSlides, [key]: value } });
  };

  const updateConceptStudentUi = <K extends keyof ConceptStudentUiAppearance>(
    key: K,
    value: ConceptStudentUiAppearance[K],
  ) => {
    commit({ ...theme, conceptStudentUi: { ...theme.conceptStudentUi, [key]: value } });
  };

  const updateConceptAdminPreview = <K extends keyof ConceptAdminPreviewAppearance>(
    key: K,
    value: ConceptAdminPreviewAppearance[K],
  ) => {
    commit({ ...theme, conceptAdminPreview: { ...theme.conceptAdminPreview, [key]: value } });
  };

  const applyConceptAdminPreviewTo = (targets: DeviceKey[]) => {
    const slidesKey: keyof ConceptAdminPreviewAppearance =
      editDevice === "mobile"
        ? "showHeadingSlidesOnMobile"
        : editDevice === "tablet"
          ? "showHeadingSlidesOnTablet"
          : "showHeadingSlidesOnDesktop";
    const previewKey: keyof ConceptAdminPreviewAppearance =
      editDevice === "mobile"
        ? "showPreviewOnMobile"
        : editDevice === "tablet"
          ? "showPreviewOnTablet"
          : "showPreviewOnDesktop";
    const slidesValue = cap[slidesKey];
    const previewValue = cap[previewKey];
    let next = theme;
    for (const target of targets) {
      const targetSlidesKey: keyof ConceptAdminPreviewAppearance =
        target === "mobile"
          ? "showHeadingSlidesOnMobile"
          : target === "tablet"
            ? "showHeadingSlidesOnTablet"
            : "showHeadingSlidesOnDesktop";
      const targetPreviewKey: keyof ConceptAdminPreviewAppearance =
        target === "mobile"
          ? "showPreviewOnMobile"
          : target === "tablet"
            ? "showPreviewOnTablet"
            : "showPreviewOnDesktop";
      next = {
        ...next,
        conceptAdminPreview: {
          ...next.conceptAdminPreview,
          [targetSlidesKey]: slidesValue,
          [targetPreviewKey]: previewValue,
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Admin preview settings applied to ${labels} (unsaved)`);
  };

  const updateProgressStep = (id: 1 | 2 | 3 | 4, patch: Partial<ProgressStepConfig>) => {
    commit({
      ...theme,
      progressPlan: {
        ...theme.progressPlan,
        steps: theme.progressPlan.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
    });
  };

  const updateLandingFaq = (patch: Partial<LandingFaqAppearance>) => {
    commit({ ...theme, landingFaq: { ...theme.landingFaq, ...patch } });
  };

  const updateLandingPage = <K extends keyof LandingPageAppearance>(key: K, value: LandingPageAppearance[K]) => {
    commit({ ...theme, landingPage: { ...theme.landingPage, [key]: value } });
  };

  const setFaqItems = (items: LandingFaqItem[]) => {
    updateLandingFaq({ items });
  };

  const addFaqItem = () => {
    setFaqItems([
      ...faq.items,
      { id: newFaqId(), question: "", answers: [{ id: newFaqId(), text: "" }] },
    ]);
  };

  const updateFaqItem = (id: string, patch: Partial<Pick<LandingFaqItem, "question">>) => {
    setFaqItems(faq.items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeFaqItem = (id: string) => {
    setFaqItems(faq.items.filter((it) => it.id !== id));
  };

  const addFaqAnswer = (faqId: string) => {
    setFaqItems(
      faq.items.map((it) =>
        it.id === faqId ? { ...it, answers: [...it.answers, { id: newFaqId(), text: "" }] } : it,
      ),
    );
  };

  const updateFaqAnswer = (faqId: string, answerId: string, text: string) => {
    setFaqItems(
      faq.items.map((it) =>
        it.id === faqId
          ? { ...it, answers: it.answers.map((a) => (a.id === answerId ? { ...a, text } : a)) }
          : it,
      ),
    );
  };

  const removeFaqAnswer = (faqId: string, answerId: string) => {
    setFaqItems(
      faq.items.map((it) =>
        it.id === faqId
          ? {
              ...it,
              answers:
                it.answers.length <= 1
                  ? [{ id: newFaqId(), text: "" }]
                  : it.answers.filter((a) => a.id !== answerId),
            }
          : it,
      ),
    );
  };

  const whyItems = lp.whyItems ?? [];

  const setWhyItems = (items: LandingWhyItem[]) => {
    updateLandingPage("whyItems", items);
  };

  const addWhyItem = () => {
    setWhyItems([
      ...whyItems,
      {
        id: newWhyId(),
        iconClass: "Sparkles",
        text: "",
        iconColor: "#0ea5e9",
        iconBg: "rgba(255, 255, 255, 0.92)",
        textColor: "#ecfeff",
        cardBg: "transparent",
      },
    ]);
  };

  const updateWhyItem = (id: string, patch: Partial<LandingWhyItem>) => {
    setWhyItems(whyItems.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeWhyItem = (id: string) => {
    setWhyItems(whyItems.filter((it) => it.id !== id));
  };

  const copyFrom = (from: DeviceKey) => {
    commit({
      ...theme,
      [editDevice]: structuredClone(theme[from]),
    });
    toast.message(`Copied ${deviceMeta[from].label} settings into ${deviceMeta[editDevice].label}`);
  };

  /** Copy current device colors onto one or more targets (preview only until Save). */
  const applyColorsTo = (targets: DeviceKey[]) => {
    const colors = Object.fromEntries(
      GLOBAL_COLOR_KEYS.map((key) => [key, deviceTheme.global[key]]),
    ) as Pick<UiAppearance["desktop"]["global"], (typeof GLOBAL_COLOR_KEYS)[number]>;

    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          global: { ...next[target].global, ...colors },
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Colors applied to ${labels} (unsaved)`);
  };

  /** Copy card & layout settings from current device onto targets (preview until Save). */
  const applyLayoutTo = (targets: DeviceKey[]) => {
    const layout = Object.fromEntries(
      GLOBAL_LAYOUT_KEYS.map((key) => [key, deviceTheme.global[key]]),
    ) as Pick<UiAppearance["desktop"]["global"], (typeof GLOBAL_LAYOUT_KEYS)[number]>;

    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          global: { ...next[target].global, ...layout },
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Card & layout applied to ${labels} (unsaved)`);
  };

  const applySidebarLabelsTo = (targets: DeviceKey[]) => {
    const sidebarLabels = structuredClone(deviceTheme.global.sidebarLabels);
    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          global: { ...next[target].global, sidebarLabels: structuredClone(sidebarLabels) },
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Sidebar labels applied to ${labels} (unsaved)`);
  };

  const applySidebarStyleTo = (targets: DeviceKey[]) => {
    const sidebar = structuredClone(deviceTheme.global.sidebar);
    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          global: { ...next[target].global, sidebar: structuredClone(sidebar) },
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Sidebar style applied to ${labels} (unsaved)`);
  };

  const applyHeaderStyleTo = (targets: DeviceKey[]) => {
    const header = structuredClone(deviceTheme.global.header);
    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          global: { ...next[target].global, header: structuredClone(header) },
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Header style applied to ${labels} (unsaved)`);
  };

  /** Copy current device Story-based learning settings onto targets (preview until Save). */
  const applyStoryTo = (targets: DeviceKey[]) => {
    const story = structuredClone(deviceTheme.storyBasedLearning);
    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          storyBasedLearning: structuredClone(story),
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`Story design applied to ${labels} (unsaved)`);
  };

  /** Copy current device All Questions settings onto targets (preview until Save). */
  const applyAllQuestionsTo = (targets: DeviceKey[]) => {
    const aq = structuredClone(deviceTheme.allQuestions);
    let next = theme;
    for (const target of targets) {
      next = {
        ...next,
        [target]: {
          ...next[target],
          allQuestions: structuredClone(aq),
        },
      };
    }
    commit(next);
    const labels = targets.map((t) => deviceMeta[t].label).join(", ");
    toast.message(`All Questions design applied to ${labels} (unsaved)`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await save(theme);
      setDraft(null);
      if (result.warning) toast.warning(result.warning);
      else toast.success(`Appearance saved (${result.storage ?? storage ?? "database"})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleResetSection = () => {
    if (activeTab === "preview") {
      toast.message("Live preview tab has nothing to reset");
      return;
    }
    setResetting(true);
    try {
      const scope = {
        tab: activeTab,
        landingSection: activeTab === "landing" ? landingSection : undefined,
        progressSection: activeTab === "progress" ? progressSection : undefined,
      };
      const next = resetAppearanceSection(theme, scope, editDevice);
      commit(next);
      toast.success(`${appearanceResetLabel(scope, editDevice)} reset to defaults (unsaved)`);
    } finally {
      setResetting(false);
    }
  };

  const resetSectionLabel = appearanceResetLabel(
    {
      tab: activeTab,
      landingSection: activeTab === "landing" ? landingSection : undefined,
      progressSection: activeTab === "progress" ? progressSection : undefined,
    },
    editDevice,
  );

  const g = deviceTheme.global;
  const sb = deviceTheme.global.sidebar;
  const hdr = deviceTheme.global.header;
  const c = deviceTheme.conceptDetails;
  const s = deviceTheme.storyBasedLearning;
  const aq = deviceTheme.allQuestions;
  const p = theme.performance;

  const preview = useMemo(
    () => <CombinedAppearancePreview g={g} s={s} explanationTitle={aq.explanationTitle} />,
    [g, s, aq.explanationTitle],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading appearance…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/admin/settings" className="hover:text-foreground">
            Settings
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Appearance</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="rounded-md bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
              Unsaved changes
            </span>
          ) : null}
          {dirty ? (
            <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
              Discard
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetSection}
            disabled={resetting || activeTab === "preview"}
          >
            {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Reset · {resetSectionLabel}
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save to database
          </Button>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div>
          <h1 className="page-title">Appearance · UI Master</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Edits are preview-only until you click <strong>Save to database</strong>. Leaving without saving discards
            changes. Live viewport: <strong>{deviceMeta[activeDevice].label}</strong>. Source: {source}
            {storage ? ` · storage: ${storage}` : ""}.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(deviceMeta) as DeviceKey[]).map((key) => {
            const meta = deviceMeta[key];
            const Icon = meta.icon;
            const active = editDevice === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setEditDevice(key)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <span>
                  <span className="block text-sm font-semibold">{meta.label}</span>
                  <span className="text-[11px] text-muted-foreground">{meta.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => copyFrom("mobile")} disabled={editDevice === "mobile"}>
            Copy from Phone
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => copyFrom("tablet")} disabled={editDevice === "tablet"}>
            Copy from Tablet
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => copyFrom("desktop")} disabled={editDevice === "desktop"}>
            Copy from Computer
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AppearanceTab)}>
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="global">{deviceMeta[editDevice].label} · Website UI</TabsTrigger>
            <TabsTrigger value="concept">{deviceMeta[editDevice].label} · Concept details</TabsTrigger>
            <TabsTrigger value="story">{deviceMeta[editDevice].label} · Story learning</TabsTrigger>
            <TabsTrigger value="questions">{deviceMeta[editDevice].label} · All questions</TabsTrigger>
            <TabsTrigger value="landing">Landing page</TabsTrigger>
            <TabsTrigger value="progress">Progress plan</TabsTrigger>
            <TabsTrigger value="headingSlides">Heading slides</TabsTrigger>
            <TabsTrigger value="richEditor">Rich editor · Images</TabsTrigger>
            <TabsTrigger value="performance">Performance (shared)</TabsTrigger>
            <TabsTrigger value="preview">Live preview</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Website shell · editing <strong>{deviceMeta[editDevice].label}</strong>
              </p>
              <AppearanceOptionGuide
                title="Website UI — অপশন গাইড"
                description="প্রতিটি ইনপুট কী করে এবং কোথায় দেখা যায়।"
                items={GUIDE_WEBSITE_UI}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Font family" value={g.fontFamily} onChange={(v) => updateGlobal("fontFamily", v)} />
              <NumberField label="Base font size (px)" value={g.baseFontSizePx} min={12} max={22} onChange={(n) => updateGlobal("baseFontSizePx", n)} />
              <NumberField label="Line height" value={g.lineHeight} min={1.2} max={2} step={0.05} onChange={(n) => updateGlobal("lineHeight", n)} />
              <NumberField label="Border radius (rem)" value={g.radiusRem} min={0} max={1.5} step={0.125} onChange={(n) => updateGlobal("radiusRem", n)} />
              <NumberField label="Content max width (px)" value={g.contentMaxWidthPx} min={320} max={1600} step={20} onChange={(n) => updateGlobal("contentMaxWidthPx", n)} />
              <Field label="Density">
                <Select value={g.density} onValueChange={(v) => updateGlobal("density", v as "comfortable" | "compact")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Cards</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyLayoutTo(["mobile"])}>
                    Set to Phone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyLayoutTo(["tablet"])}>
                    Set to Tablet
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyLayoutTo(["desktop"])}>
                    Set to Computer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyLayoutTo(["mobile", "tablet", "desktop"])}
                  >
                    Set to all
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                `.glass-card` / shadcn Card — পুরো সাইটের কার্ড chrome। Device অনুযায়ী আলাদা সেট করা যায়।
              </p>

              <p className="text-[11px] font-medium text-muted-foreground">Colors &amp; surface</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ThemeColorField
                  label="Card background"
                  value={g.cardHsl}
                  onChange={(v) => updateGlobal("cardHsl", v)}
                  hint="`--card` fill"
                />
                <ThemeColorField
                  label="Card text"
                  value={g.cardForegroundHsl || g.foregroundHsl}
                  onChange={(v) => updateGlobal("cardForegroundHsl", v)}
                  hint="খালি রাখলে theme foreground / dark white"
                />
                <ThemeColorField
                  label="Card border color"
                  value={g.cardBorderHsl || g.borderHsl}
                  onChange={(v) => updateGlobal("cardBorderHsl", v)}
                  hint="খালি = global Border color"
                />
                <NumberField
                  label="Background opacity"
                  value={g.cardBgOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateGlobal("cardBgOpacity", n)}
                />
                <NumberField
                  label="Border width (px)"
                  value={g.cardBorderWidthPx}
                  min={0}
                  max={4}
                  step={0.5}
                  hint="0 = no border"
                  onChange={(n) => updateGlobal("cardBorderWidthPx", n)}
                />
                <NumberField
                  label="Border opacity"
                  value={g.cardBorderOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateGlobal("cardBorderOpacity", n)}
                />
                <NumberField
                  label="Corner radius (rem)"
                  value={g.cardRadiusRem}
                  min={0}
                  max={2}
                  step={0.125}
                  hint="Card-only — global radius থেকে আলাদা"
                  onChange={(n) => updateGlobal("cardRadiusRem", n)}
                />
                <NumberField
                  label="Padding (px)"
                  value={g.cardPaddingPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateGlobal("cardPaddingPx", n)}
                  hint="filter-card / suggestion-card / CardHeader"
                />
                <NumberField
                  label="Card gap (px)"
                  value={g.cardGapPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateGlobal("cardGapPx", n)}
                  hint="`.app-card-gap` stacks"
                />
                <NumberField
                  label="Transition (ms)"
                  value={g.cardTransitionMs}
                  min={0}
                  max={600}
                  step={20}
                  onChange={(n) => updateGlobal("cardTransitionMs", n)}
                  hint="0 = instant (recommended, no lag)। Hover lift/scale only animates when &gt; 0"
                />
              </div>

              <p className="text-[11px] font-medium text-muted-foreground">Shadow</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField
                  label="Enable shadow"
                  checked={g.cardShadow}
                  onChange={(v) => updateGlobal("cardShadow", v)}
                />
                <ThemeColorField
                  label="Shadow color"
                  value={g.cardShadowColorHsl}
                  onChange={(v) => updateGlobal("cardShadowColorHsl", v)}
                />
                <NumberField
                  label="Shadow blur (px)"
                  value={g.cardShadowBlurPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateGlobal("cardShadowBlurPx", n)}
                />
                <NumberField
                  label="Shadow offset Y (px)"
                  value={g.cardShadowOffsetYPx}
                  min={0}
                  max={24}
                  onChange={(n) => updateGlobal("cardShadowOffsetYPx", n)}
                />
                <NumberField
                  label="Shadow opacity"
                  value={g.cardShadowOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateGlobal("cardShadowOpacity", n)}
                />
              </div>

              <p className="text-[11px] font-medium text-muted-foreground">Backdrop blur</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField
                  label="Enable backdrop blur"
                  checked={g.cardBackdropBlur}
                  onChange={(v) => updateGlobal("cardBackdropBlur", v)}
                  hint="Can cause scroll lag on mobile"
                />
                <NumberField
                  label="Blur amount (px)"
                  value={g.cardBackdropBlurPx}
                  min={0}
                  max={24}
                  onChange={(n) => updateGlobal("cardBackdropBlurPx", n)}
                />
              </div>

              <p className="text-[11px] font-medium text-muted-foreground">Hover</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField
                  label="Hover highlight"
                  checked={g.cardHoverHighlight}
                  onChange={(v) => updateGlobal("cardHoverHighlight", v)}
                  hint="Primary-tinted border + lift/scale"
                />
                <NumberField
                  label="Hover border opacity"
                  value={g.cardHoverBorderOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateGlobal("cardHoverBorderOpacity", n)}
                />
                <NumberField
                  label="Hover shadow blur (px)"
                  value={g.cardHoverShadowBlurPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateGlobal("cardHoverShadowBlurPx", n)}
                />
                <NumberField
                  label="Hover shadow opacity"
                  value={g.cardHoverShadowOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateGlobal("cardHoverShadowOpacity", n)}
                />
                <NumberField
                  label="Hover lift (px)"
                  value={g.cardHoverLiftPx}
                  min={0}
                  max={16}
                  onChange={(n) => updateGlobal("cardHoverLiftPx", n)}
                  hint="0 = no lift"
                />
                <NumberField
                  label="Hover scale"
                  value={g.cardHoverScale}
                  min={1}
                  max={1.08}
                  step={0.01}
                  onChange={(n) => updateGlobal("cardHoverScale", n)}
                  hint="1 = no scale"
                />
              </div>

              <p className="text-[11px] font-medium text-muted-foreground">Page layout (with card set-to)</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Page padding (px)"
                  value={g.pagePaddingPx}
                  min={8}
                  max={48}
                  onChange={(n) => updateGlobal("pagePaddingPx", n)}
                />
                <NumberField
                  label="Section gap (px)"
                  value={g.sectionGapPx}
                  min={4}
                  max={48}
                  onChange={(n) => updateGlobal("sectionGapPx", n)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="glass-card sm:col-span-2 lg:col-span-1">
                  <div
                    className="space-y-1"
                    style={{ padding: "var(--ui-density-card-padding, var(--ui-card-padding, 1rem))" }}
                  >
                    <p className="text-sm font-semibold">Card preview</p>
                    <p className="text-xs text-muted-foreground">Hover to preview lift / border / shadow.</p>
                  </div>
                </div>
                <div className="app-section-stack app-card-gap flex flex-col sm:col-span-2">
                  <div className="glass-card px-3 py-2 text-xs">Gap preview card A</div>
                  <div className="glass-card px-3 py-2 text-xs">Gap preview card B</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Theme colors</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => applyColorsTo(["mobile"])}>
                  Set to Phone
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyColorsTo(["tablet"])}>
                  Set to Tablet
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyColorsTo(["desktop"])}>
                  Set to Computer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyColorsTo(["mobile", "tablet", "desktop"])}
                >
                  Set to all
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Apply the colors from <strong>{deviceMeta[editDevice].label}</strong> to other devices. Still needs{" "}
              <strong>Save to database</strong>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ThemeColorField label="Primary" value={g.primaryHsl} onChange={(v) => updateGlobal("primaryHsl", v)} hint="বাটন, লিংক, ring — পুরো অ্যাপ" />
              <ThemeColorField label="Accent" value={g.accentHsl} onChange={(v) => updateGlobal("accentHsl", v)} hint="গ্রেডিয়েন্ট, হাইলাইট" />
              <ThemeColorField label="Background" value={g.backgroundHsl} onChange={(v) => updateGlobal("backgroundHsl", v)} hint="পেজ ব্যাকগ্রাউন্ড" />
              <ThemeColorField label="Foreground" value={g.foregroundHsl} onChange={(v) => updateGlobal("foregroundHsl", v)} hint="মূল টেক্সট" />
              <ThemeColorField label="Border" value={g.borderHsl} onChange={(v) => updateGlobal("borderHsl", v)} hint="ইনপুট / general border" />
              <ThemeColorField label="Muted foreground" value={g.mutedForegroundHsl} onChange={(v) => updateGlobal("mutedForegroundHsl", v)} hint="hint, secondary text" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <BoolField label="Page title gradient" checked={g.pageTitleGradient} onChange={(v) => updateGlobal("pageTitleGradient", v)} />
              <BoolField label="Mesh background" checked={g.meshBackground} onChange={(v) => updateGlobal("meshBackground", v)} />
              <BoolField label="Sticky bar backdrop blur" checked={g.stickyBackdropBlur} onChange={(v) => updateGlobal("stickyBackdropBlur", v)} />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sidebar style</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarStyleTo(["mobile"])}>
                    Set to Phone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarStyleTo(["tablet"])}>
                    Set to Tablet
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarStyleTo(["desktop"])}>
                    Set to Computer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applySidebarStyleTo(["mobile", "tablet", "desktop"])}
                  >
                    Set to all
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Colors, width, brand, and menu item styling for the app sidebar · {deviceMeta[editDevice].label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ThemeColorField label="Background" value={sb.backgroundHsl} onChange={(v) => updateSidebar("backgroundHsl", v)} hint="Sidebar panel bg" />
                <ThemeColorField label="Foreground" value={sb.foregroundHsl} onChange={(v) => updateSidebar("foregroundHsl", v)} hint="Menu text" />
                <ThemeColorField label="Primary / brand" value={sb.primaryHsl} onChange={(v) => updateSidebar("primaryHsl", v)} hint="Brand title color" />
                <ThemeColorField label="Primary text" value={sb.primaryForegroundHsl} onChange={(v) => updateSidebar("primaryForegroundHsl", v)} />
                <ThemeColorField label="Accent / hover" value={sb.accentHsl} onChange={(v) => updateSidebar("accentHsl", v)} hint="Active menu bg" />
                <ThemeColorField label="Accent text" value={sb.accentForegroundHsl} onChange={(v) => updateSidebar("accentForegroundHsl", v)} />
                <ThemeColorField label="Border" value={sb.borderHsl} onChange={(v) => updateSidebar("borderHsl", v)} />
                <ThemeColorField label="Focus ring" value={sb.ringHsl} onChange={(v) => updateSidebar("ringHsl", v)} />
                <NumberField label="Width expanded (rem)" value={sb.widthRem} min={12} max={24} step={0.5} onChange={(n) => updateSidebar("widthRem", n)} />
                <NumberField label="Width collapsed icon (rem)" value={sb.widthIconRem} min={2.5} max={6} step={0.25} onChange={(n) => updateSidebar("widthIconRem", n)} />
                <NumberField label="Width mobile sheet (rem)" value={sb.widthMobileRem} min={14} max={24} step={0.5} onChange={(n) => updateSidebar("widthMobileRem", n)} />
                <TextField label="Brand title" value={sb.brandTitle} onChange={(v) => updateSidebar("brandTitle", v)} />
                <TextField label="Brand subtitle" value={sb.brandSubtitle} onChange={(v) => updateSidebar("brandSubtitle", v)} />
                <NumberField label="Brand title size (px)" value={sb.brandTitleSizePx} min={10} max={22} onChange={(n) => updateSidebar("brandTitleSizePx", n)} />
                <NumberField label="Brand subtitle size (px)" value={sb.brandSubtitleSizePx} min={8} max={16} onChange={(n) => updateSidebar("brandSubtitleSizePx", n)} />
                <NumberField label="Brand padding (px)" value={sb.brandPaddingPx} min={8} max={32} onChange={(n) => updateSidebar("brandPaddingPx", n)} />
                <NumberField label="Menu font size (px)" value={sb.menuFontSizePx} min={10} max={18} onChange={(n) => updateSidebar("menuFontSizePx", n)} />
                <NumberField label="Menu item height (px)" value={sb.menuItemHeightPx} min={28} max={52} onChange={(n) => updateSidebar("menuItemHeightPx", n)} />
                <NumberField label="Menu item padding (px)" value={sb.menuItemPaddingPx} min={0} max={24} onChange={(n) => updateSidebar("menuItemPaddingPx", n)} hint="প্রতিটি menu/submenu item-এর ভিতরের ফাঁক" />
                <NumberField label="Menu item radius (rem)" value={sb.menuItemRadiusRem} min={0} max={1} step={0.05} onChange={(n) => updateSidebar("menuItemRadiusRem", n)} />
                <NumberField label="Menu icon size (px)" value={sb.menuIconSizePx} min={12} max={24} onChange={(n) => updateSidebar("menuIconSizePx", n)} />
                <NumberField label="Menu icon gap (px)" value={sb.menuGapPx} min={4} max={16} onChange={(n) => updateSidebar("menuGapPx", n)} />
                <NumberField label="Active item font weight" value={sb.activeFontWeight} min={400} max={800} step={100} onChange={(n) => updateSidebar("activeFontWeight", n)} />
                <NumberField label="Muted subtitle opacity" value={sb.mutedOpacity} min={0.2} max={1} step={0.05} onChange={(n) => updateSidebar("mutedOpacity", n)} />
              </div>
              <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Menu interaction</p>
                <p className="text-[11px] text-muted-foreground">
                  Transform-only (GPU) — sidebar width instant; menu click/hover-এ translate + scale। Lag হওয়ার কারণ width animation নেই।
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <BoolField
                    label="Enable menu transform"
                    checked={sb.menuTransformEnabled}
                    onChange={(v) => updateSidebar("menuTransformEnabled", v)}
                    hint="Hover, active, press effects"
                  />
                  <NumberField
                    label="Duration (ms)"
                    value={sb.menuTransitionDurationMs}
                    min={0}
                    max={400}
                    step={20}
                    onChange={(n) => updateSidebar("menuTransitionDurationMs", n)}
                  />
                  <NumberField
                    label="Hover slide (px)"
                    value={sb.menuHoverSlidePx}
                    min={0}
                    max={12}
                    onChange={(n) => updateSidebar("menuHoverSlidePx", n)}
                    hint="translateX on hover"
                  />
                  <NumberField
                    label="Active slide (px)"
                    value={sb.menuActiveSlidePx}
                    min={0}
                    max={16}
                    onChange={(n) => updateSidebar("menuActiveSlidePx", n)}
                    hint="translateX on current route"
                  />
                  <NumberField
                    label="Press scale"
                    value={sb.menuPressScale}
                    min={0.94}
                    max={1}
                    step={0.01}
                    onChange={(n) => updateSidebar("menuPressScale", n)}
                    hint="1 = no shrink on click"
                  />
                </div>
              </div>
              <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sidebar open / close</p>
                <p className="text-[11px] text-muted-foreground">
                  Toggle ক্লিকে sidebar hide/open — আগে shadcn-এ hardcoded ছিল (width/transform 200ms linear)। এখন Appearance থেকে control;{" "}
                  <code className="text-[10px]">sidebar.tsx</code>-এ transition class নেই।
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <BoolField
                    label="Enable collapse transition"
                    checked={sb.collapseTransitionEnabled}
                    onChange={(v) => updateSidebar("collapseTransitionEnabled", v)}
                    hint="Master — toggle open/hide animation"
                  />
                  <NumberField
                    label="Duration (ms)"
                    value={sb.collapseDurationMs}
                    min={0}
                    max={600}
                    step={25}
                    onChange={(n) => updateSidebar("collapseDurationMs", n)}
                    hint="Original shadcn: 200"
                  />
                  <Field label="Easing" hint="Original shadcn: linear">
                    <Select
                      value={sb.collapseEasing}
                      onValueChange={(v) => updateSidebar("collapseEasing", v as SidebarAppearance["collapseEasing"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linear">Linear</SelectItem>
                        <SelectItem value="ease">Ease</SelectItem>
                        <SelectItem value="ease-in-out">Ease in-out</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <BoolField
                    label="Animate width"
                    checked={sb.collapseAnimateWidth}
                    onChange={(v) => updateSidebar("collapseAnimateWidth", v)}
                    hint="Spacer + panel — original shadcn; lag হতে পারে"
                  />
                  <BoolField
                    label="Animate transform"
                    checked={sb.collapseAnimateTransform}
                    onChange={(v) => updateSidebar("collapseAnimateTransform", v)}
                    hint="Offcanvas slide (translateX)"
                  />
                  <BoolField
                    label="Icon mode inner slide"
                    checked={sb.collapseIconInnerSlide}
                    onChange={(v) => updateSidebar("collapseIconInnerSlide", v)}
                    hint="Transform-only icon collapse (lag-free)"
                  />
                  <BoolField
                    label="Menu size on collapse"
                    checked={sb.menuCollapseSizeTransition}
                    onChange={(v) => updateSidebar("menuCollapseSizeTransition", v)}
                    hint="width/height/padding — original menu button"
                  />
                  <BoolField
                    label="Group label fade"
                    checked={sb.groupLabelTransition}
                    onChange={(v) => updateSidebar("groupLabelTransition", v)}
                    hint="Opacity + margin on collapse"
                  />
                  <BoolField
                    label="Edge rail transition"
                    checked={sb.railTransition}
                    onChange={(v) => updateSidebar("railTransition", v)}
                    hint="Original transition-all on rail"
                  />
                </div>
              </div>
              <BoolField
                label="Brand bottom border"
                checked={sb.brandShowBorder}
                onChange={(v) => updateSidebar("brandShowBorder", v)}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Header style</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyHeaderStyleTo(["mobile"])}>
                    Set to Phone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyHeaderStyleTo(["tablet"])}>
                    Set to Tablet
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyHeaderStyleTo(["desktop"])}>
                    Set to Computer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyHeaderStyleTo(["mobile", "tablet", "desktop"])}
                  >
                    Set to all
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Top bar (page title, search, notifications) · {deviceMeta[editDevice].label}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ThemeColorField label="Background" value={hdr.backgroundHsl} onChange={(v) => updateHeader("backgroundHsl", v)} hint="AppShellHeader bg" />
                <ThemeColorField label="Foreground" value={hdr.foregroundHsl} onChange={(v) => updateHeader("foregroundHsl", v)} />
                <ThemeColorField label="Border" value={hdr.borderHsl} onChange={(v) => updateHeader("borderHsl", v)} />
                <ThemeColorField label="Title color" value={hdr.titleColorHsl} onChange={(v) => updateHeader("titleColorHsl", v)} hint="Page title in header" />
                <ThemeColorField label="Search background" value={hdr.searchBackgroundHsl} onChange={(v) => updateHeader("searchBackgroundHsl", v)} />
                <ThemeColorField label="Search border" value={hdr.searchBorderHsl} onChange={(v) => updateHeader("searchBorderHsl", v)} />
                <ThemeColorField label="Icon color" value={hdr.iconColorHsl} onChange={(v) => updateHeader("iconColorHsl", v)} hint="Bell button" />
                <ThemeColorField label="Icon hover bg" value={hdr.iconHoverBgHsl} onChange={(v) => updateHeader("iconHoverBgHsl", v)} />
                <ThemeColorField label="Notification dot" value={hdr.notificationDotHsl} onChange={(v) => updateHeader("notificationDotHsl", v)} />
                <NumberField label="Height (px)" value={hdr.heightPx} min={44} max={80} onChange={(n) => updateHeader("heightPx", n)} />
                <NumberField label="Title font size (px)" value={hdr.titleFontSizePx} min={10} max={22} onChange={(n) => updateHeader("titleFontSizePx", n)} />
                <NumberField label="Title font weight" value={hdr.titleFontWeight} min={400} max={800} step={100} onChange={(n) => updateHeader("titleFontWeight", n)} />
                <NumberField label="Search height (px)" value={hdr.searchHeightPx} min={28} max={52} onChange={(n) => updateHeader("searchHeightPx", n)} />
                <NumberField label="Search radius (rem)" value={hdr.searchRadiusRem} min={0} max={1} step={0.05} onChange={(n) => updateHeader("searchRadiusRem", n)} />
                <NumberField label="Horizontal padding (px)" value={hdr.paddingHorizontalPx} min={8} max={32} onChange={(n) => updateHeader("paddingHorizontalPx", n)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BoolField
                  label="Hide header on scroll down"
                  checked={hdr.hideOnScrollDown}
                  onChange={(v) => updateHeader("hideOnScrollDown", v)}
                  hint="Scroll down করলে header লুকায়"
                />
                <BoolField
                  label="Header backdrop blur"
                  checked={hdr.backdropBlur}
                  onChange={(v) => updateHeader("backdropBlur", v)}
                  hint="Sticky header-এ blur (global sticky blur-এর চেয়ে আলাদা)"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Sidebar page names</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarLabelsTo(["mobile"])}>
                    Set to Phone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarLabelsTo(["tablet"])}>
                    Set to Tablet
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applySidebarLabelsTo(["desktop"])}>
                    Set to Computer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applySidebarLabelsTo(["mobile", "tablet", "desktop"])}
                  >
                    Set to all
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Change what each sidebar page is called for <strong>{deviceMeta[editDevice].label}</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {SIDEBAR_LABEL_FIELDS.map(([key, label]) => (
                  <TextField
                    key={key}
                    label={label}
                    value={g.sidebarLabels[key]}
                    onChange={(v) => updateSidebarLabel(key, v)}
                  />
                ))}
              </div>
            </div>

            <AppearancePreviewPanel title="Live preview · Website UI" hint="Colors, typography, cards, sidebar, header, and labels from current draft.">
              <GlobalWebsiteLivePreview g={g} sb={sb} hdr={hdr} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="concept" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Concept details typography &amp; colors · {deviceMeta[editDevice].label}
              </p>
              <AppearanceOptionGuide
                title="Concept details — অপশন গাইড"
                description="শিক্ষার্থী Concept detail পড়ার ভিউয়ের স্টাইল।"
                items={GUIDE_CONCEPT}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Font family" value={c.fontFamily} onChange={(v) => updateCd("fontFamily", v)} />
              <NumberField label="Body font size (px)" value={c.fontSizePx} min={11} max={22} onChange={(n) => updateCd("fontSizePx", n)} />
              <NumberField label="Line height" value={c.lineHeight} min={1.2} max={2.2} step={0.05} onChange={(n) => updateCd("lineHeight", n)} />
              <NumberField label="Paragraph spacing (px)" value={c.paragraphSpacingPx} min={0} max={32} onChange={(n) => updateCd("paragraphSpacingPx", n)} />
              <NumberField label="Bold weight" value={c.boldWeight} min={500} max={900} step={100} onChange={(n) => updateCd("boldWeight", n)} />
              <NumberField label="H1 size (px)" value={c.heading1SizePx} min={16} max={36} onChange={(n) => updateCd("heading1SizePx", n)} />
              <NumberField label="H2 size (px)" value={c.heading2SizePx} min={14} max={28} onChange={(n) => updateCd("heading2SizePx", n)} />
              <NumberField label="H3 size (px)" value={c.heading3SizePx} min={13} max={24} onChange={(n) => updateCd("heading3SizePx", n)} />
              <NumberField label="Bullet size (px)" value={c.bulletSizePx} min={10} max={20} onChange={(n) => updateCd("bulletSizePx", n)} />
              <NumberField label="List indent (px)" value={c.listIndentPx} min={8} max={40} onChange={(n) => updateCd("listIndentPx", n)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField
                label="Body background"
                value={c.backgroundColor?.trim() || "#ffffff"}
                onChange={(v) => updateCd("backgroundColor", v)}
                hint="শুধু rich text body। খালি/transparent = পেজ bg।"
              />
              <ColorField
                label="Unset text color"
                value={c.unsetTextColor || "#ffffff"}
                onChange={(v) => updateCd("unsetTextColor", v)}
                hint="Textbox-এ color না দিলে এই রঙ (ডিফল্ট white)। Dark mode-এ গাঢ় paragraph/heading হলেও এটা।"
              />
              <ColorField
                label="Paragraph color"
                value={c.paragraphColor}
                onChange={(v) => updateCd("paragraphColor", v)}
                hint="খালি রাখলে Unset text color"
              />
              <ColorField label="H1 color" value={c.heading1Color} onChange={(v) => updateCd("heading1Color", v)} />
              <ColorField label="H2 color" value={c.heading2Color} onChange={(v) => updateCd("heading2Color", v)} />
              <ColorField label="H3 color" value={c.heading3Color} onChange={(v) => updateCd("heading3Color", v)} />
              <ColorField label="Link color" value={c.linkColor} onChange={(v) => updateCd("linkColor", v)} />
              <ColorField label="Bullet color" value={c.bulletColor} onChange={(v) => updateCd("bulletColor", v)} />
              <ColorField label="Table header BG" value={c.tableHeaderBg} onChange={(v) => updateCd("tableHeaderBg", v)} />
              <ColorField label="Table header text" value={c.tableHeaderColor} onChange={(v) => updateCd("tableHeaderColor", v)} />
              <ColorField label="Table border" value={c.tableBorderColor} onChange={(v) => updateCd("tableBorderColor", v)} />
              <ColorField label="Table even row" value={c.tableEvenRowBg} onChange={(v) => updateCd("tableEvenRowBg", v)} />
              <ColorField label="Code background" value={c.codeBg} onChange={(v) => updateCd("codeBg", v)} />
              <ColorField label="Blockquote border" value={c.blockquoteBorder} onChange={(v) => updateCd("blockquoteBorder", v)} />
              <NumberField label="Table font size (px)" value={c.tableFontSizePx} min={10} max={16} onChange={(n) => updateCd("tableFontSizePx", n)} />
              <NumberField label="Table cell padding (px)" value={c.tableCellPaddingPx} min={4} max={16} onChange={(n) => updateCd("tableCellPaddingPx", n)} />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Mobile table</p>
              <p className="text-[11px] text-muted-foreground">
                Phone (≤640px)-এ concept body-তে table থাকলে panel card-এর body padding / border / radius আলাদা — table পুরো width নিতে পারে।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField
                  label="Full-bleed table on phone"
                  checked={c.mobileTableFullBleed !== false}
                  onChange={(v) => updateCd("mobileTableFullBleed", v)}
                  hint="চালু = নিচের body padding/border/radius table থাকলে apply হবে"
                />
                <NumberField
                  label="Body padding with table (px)"
                  value={c.mobileTableCardPaddingPx ?? 0}
                  min={0}
                  max={48}
                  onChange={(n) => updateCd("mobileTableCardPaddingPx", n)}
                />
                <NumberField
                  label="Panel border with table (px)"
                  value={c.mobileTableCardBorderWidthPx ?? 0}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={(n) => updateCd("mobileTableCardBorderWidthPx", n)}
                />
                <NumberField
                  label="Panel radius with table (px)"
                  value={c.mobileTableCardBorderRadiusPx ?? 0}
                  min={0}
                  max={32}
                  onChange={(n) => updateCd("mobileTableCardBorderRadiusPx", n)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Textbox shape</p>
              <p className="text-[11px] text-muted-foreground">
                Concept details CKEditor textbox — radius, border, background, height, padding।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Corner radius (px)"
                  value={c.textboxRadiusPx ?? 8}
                  min={0}
                  max={32}
                  onChange={(n) => updateCd("textboxRadiusPx", n)}
                />
                <NumberField
                  label="Border width (px)"
                  value={c.textboxBorderWidthPx ?? 1}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={(n) => updateCd("textboxBorderWidthPx", n)}
                />
                <ColorField
                  label="Border color"
                  value={c.textboxBorderColor?.trim() || "#e2e8f0"}
                  onChange={(v) => updateCd("textboxBorderColor", v)}
                  hint="খালি = theme border"
                />
                <ColorField
                  label="Textbox background"
                  value={c.textboxBg?.trim() || "#ffffff"}
                  onChange={(v) => updateCd("textboxBg", v)}
                  hint="খালি = page background"
                />
                <NumberField
                  label="Min height (px)"
                  value={c.textboxMinHeightPx ?? 360}
                  min={120}
                  max={800}
                  step={20}
                  onChange={(n) => updateCd("textboxMinHeightPx", n)}
                />
                <NumberField
                  label="Inner padding (px)"
                  value={c.textboxPaddingPx ?? 12}
                  min={0}
                  max={40}
                  onChange={(n) => updateCd("textboxPaddingPx", n)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Textbox card (panel)</p>
              <p className="text-[11px] text-muted-foreground">
                Story panel-এর মতো একটা shell — title header + body (`ConceptDetailShell` / `.concept-detail-card`)।
                Details / Learn / Suggestions read view। Nested glass-card নেই।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField
                  label="Panel background"
                  value={c.cardBg?.trim() || "#ffffff"}
                  onChange={(v) => updateCd("cardBg", v)}
                  hint="খালি = theme card color"
                />
                <ColorField
                  label="Panel border"
                  value={c.cardBorderColor?.trim() || "#e2e8f0"}
                  onChange={(v) => updateCd("cardBorderColor", v)}
                  hint="খালি = theme border · header divider-ও এই রঙ"
                />
                <NumberField
                  label="Border width (px)"
                  value={c.cardBorderWidthPx}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={(n) => updateCd("cardBorderWidthPx", n)}
                />
                <NumberField
                  label="Corner radius (px)"
                  value={c.cardBorderRadiusPx}
                  min={0}
                  max={32}
                  onChange={(n) => updateCd("cardBorderRadiusPx", n)}
                />
                <NumberField
                  label="Body padding (px)"
                  value={c.cardPaddingPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateCd("cardPaddingPx", n)}
                  hint="Content area padding — outer panel-এ padding 0 (Story-এর মতো)"
                />
                <BoolField
                  label="Panel shadow"
                  checked={c.cardShadow !== false}
                  onChange={(v) => updateCd("cardShadow", v)}
                />
                <ColorField
                  label="Shadow color"
                  value={c.cardShadowColor || "#0f172a"}
                  onChange={(v) => updateCd("cardShadowColor", v)}
                />
                <NumberField
                  label="Shadow blur (px)"
                  value={c.cardShadowBlurPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateCd("cardShadowBlurPx", n)}
                />
                <NumberField
                  label="Shadow offset Y (px)"
                  value={c.cardShadowOffsetYPx}
                  min={0}
                  max={24}
                  onChange={(n) => updateCd("cardShadowOffsetYPx", n)}
                />
                <NumberField
                  label="Shadow opacity"
                  value={c.cardShadowOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateCd("cardShadowOpacity", n)}
                />
              </div>
              <ConceptDetailShell className="max-w-md" title="Concept detail">
                <p className="text-xs text-muted-foreground">
                  Panel preview — header bar + body (Story-based learning panel-এর মতো)।
                </p>
              </ConceptDetailShell>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Student concept UI</p>
              <p className="text-[11px] text-muted-foreground">
                Key points order is automatic: higher suggestion count first, then total board mentions.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <BoolField
                  label="Show key points on concept details"
                  checked={csu.showKeyPointsOnDetails}
                  onChange={(v) => updateConceptStudentUi("showKeyPointsOnDetails", v)}
                  hint="Details page-এ concept body-র নিচে key points list"
                />
                <BoolField
                  label="Show Details button"
                  checked={csu.showDetailsButton}
                  onChange={(v) => updateConceptStudentUi("showDetailsButton", v)}
                  hint="Learn header + My Suggestions card"
                />
                <BoolField
                  label="Show Questions button"
                  checked={csu.showQuestionsButton}
                  onChange={(v) => updateConceptStudentUi("showQuestionsButton", v)}
                  hint="Details + Learn header"
                />
                <BoolField
                  label="Show Study button"
                  checked={csu.showStudyButton}
                  onChange={(v) => updateConceptStudentUi("showStudyButton", v)}
                  hint="Details header + key points section + Practice setup"
                />
                <BoolField
                  label="Show Practice button"
                  checked={csu.showPracticeButton}
                  onChange={(v) => updateConceptStudentUi("showPracticeButton", v)}
                  hint="Details header + key points section"
                />
                <BoolField
                  label="Show Study & Practice button"
                  checked={csu.showStudyAndPracticeButton}
                  onChange={(v) => updateConceptStudentUi("showStudyAndPracticeButton", v)}
                  hint="My Suggestions concept card"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Admin edit preview</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyConceptAdminPreviewTo(["mobile"])}>
                    Set to Phone
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyConceptAdminPreviewTo(["tablet"])}>
                    Set to Tablet
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyConceptAdminPreviewTo(["desktop"])}>
                    Set to Computer
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyConceptAdminPreviewTo(["mobile", "tablet", "desktop"])}
                  >
                    Set to all
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Suggestions → Details edit panel। Browser width অনুযায়ী Phone/Tablet/Computer detect হয়। Preview column বন্ধ = শুধু Edit; চালু + slides = HeadingSlideReader + progress (Heading slides tab)।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <BoolField
                  label="Phone — show preview column"
                  checked={cap.showPreviewOnMobile}
                  onChange={(v) => updateConceptAdminPreview("showPreviewOnMobile", v)}
                  hint="Viewport &lt; 768px"
                />
                <BoolField
                  label="Phone — heading slides in preview"
                  checked={cap.showHeadingSlidesOnMobile}
                  onChange={(v) => updateConceptAdminPreview("showHeadingSlidesOnMobile", v)}
                  hint="Preview column-এ slides + progress"
                />
                <BoolField
                  label="Tablet — show preview column"
                  checked={cap.showPreviewOnTablet}
                  onChange={(v) => updateConceptAdminPreview("showPreviewOnTablet", v)}
                  hint="768–1023px"
                />
                <BoolField
                  label="Tablet — heading slides in preview"
                  checked={cap.showHeadingSlidesOnTablet}
                  onChange={(v) => updateConceptAdminPreview("showHeadingSlidesOnTablet", v)}
                  hint="Preview column-এ slides + progress"
                />
                <BoolField
                  label="Computer — show preview column"
                  checked={cap.showPreviewOnDesktop}
                  onChange={(v) => updateConceptAdminPreview("showPreviewOnDesktop", v)}
                  hint="≥ 1024px"
                />
                <BoolField
                  label="Computer — heading slides in preview"
                  checked={cap.showHeadingSlidesOnDesktop}
                  onChange={(v) => updateConceptAdminPreview("showHeadingSlidesOnDesktop", v)}
                  hint="Preview column-এ slides + progress"
                />
              </div>
            </div>

            <AppearancePreviewPanel title="Live preview · Concept details">
              <ConceptDetailsLivePreview
                studentUi={csu}
                adminPreview={cap}
                headingSlides={hs}
                previewDevice={editDevice}
              />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="story" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Story-based learning · {deviceMeta[editDevice].label}
              </p>
              <div className="flex flex-wrap gap-2">
                <AppearanceOptionGuide
                  title="Story learning — অপশন গাইড"
                  description="Story বাটন, প্যানেল ও কন্টেন্ট স্টাইল।"
                  items={GUIDE_STORY}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => applyStoryTo(["mobile"])}>
                  Set to Phone
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyStoryTo(["tablet"])}>
                  Set to Tablet
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyStoryTo(["desktop"])}>
                  Set to Computer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyStoryTo(["mobile", "tablet", "desktop"])}
                >
                  Set to all
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Apply this device&apos;s story design to others. Still needs <strong>Save to database</strong>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Button label" value={s.buttonLabel} onChange={(v) => updateSbl("buttonLabel", v)} />
              <TextField label="Empty message" value={s.emptyMessage} onChange={(v) => updateSbl("emptyMessage", v)} />
              <Field label="Dialog max width">
                <Select
                  value={s.dialogMaxWidth}
                  onValueChange={(v) => updateSbl("dialogMaxWidth", v as StoryDialogWidth)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">XL</SelectItem>
                    <SelectItem value="2xl">2XL</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <BoolField
                label="Show button icon"
                checked={s.showButtonIcon}
                onChange={(v) => updateSbl("showButtonIcon", v)}
              />
              <TextField label="Font family" value={s.fontFamily} onChange={(v) => updateSbl("fontFamily", v)} />
              <NumberField
                label="Body font size (px)"
                value={s.fontSizePx}
                min={12}
                max={24}
                onChange={(n) => updateSbl("fontSizePx", n)}
              />
              <NumberField
                label="Line height"
                value={s.lineHeight}
                min={1.2}
                max={2.4}
                step={0.05}
                onChange={(n) => updateSbl("lineHeight", n)}
              />
              <NumberField
                label="Title size (px)"
                value={s.titleSizePx}
                min={14}
                max={32}
                onChange={(n) => updateSbl("titleSizePx", n)}
              />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Textbox shape</p>
              <p className="text-[11px] text-muted-foreground">
                Story edit CKEditor textbox — radius, border, background, height, padding।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Corner radius (px)"
                  value={s.textboxRadiusPx ?? 8}
                  min={0}
                  max={32}
                  onChange={(n) => updateSbl("textboxRadiusPx", n)}
                />
                <NumberField
                  label="Border width (px)"
                  value={s.textboxBorderWidthPx ?? 1}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={(n) => updateSbl("textboxBorderWidthPx", n)}
                />
                <ColorField
                  label="Border color"
                  value={s.textboxBorderColor?.trim() || "#e2e8f0"}
                  onChange={(v) => updateSbl("textboxBorderColor", v)}
                  hint="খালি = theme border"
                />
                <ColorField
                  label="Textbox background"
                  value={s.textboxBg?.trim() || "#ffffff"}
                  onChange={(v) => updateSbl("textboxBg", v)}
                  hint="খালি = page background"
                />
                <NumberField
                  label="Min height (px)"
                  value={s.textboxMinHeightPx ?? 280}
                  min={120}
                  max={800}
                  step={20}
                  onChange={(n) => updateSbl("textboxMinHeightPx", n)}
                />
                <NumberField
                  label="Inner padding (px)"
                  value={s.textboxPaddingPx ?? 12}
                  min={0}
                  max={40}
                  onChange={(n) => updateSbl("textboxPaddingPx", n)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Textbox card (panel)</p>
              <p className="text-[11px] text-muted-foreground">
                Story open করলে যে প্যানেল/কার্ড দেখায় (`.story-based-learning-panel`)।
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField label="Panel background" value={s.panelBg} onChange={(v) => updateSbl("panelBg", v)} />
                <ColorField label="Card / content background" value={s.backgroundColor} onChange={(v) => updateSbl("backgroundColor", v)} />
                <ColorField label="Border color" value={s.borderColor} onChange={(v) => updateSbl("borderColor", v)} />
                <NumberField
                  label="Border width (px)"
                  value={s.borderWidthPx}
                  min={0}
                  max={8}
                  step={0.5}
                  onChange={(n) => updateSbl("borderWidthPx", n)}
                />
                <NumberField
                  label="Corner radius (px)"
                  value={s.borderRadiusPx}
                  min={0}
                  max={32}
                  onChange={(n) => updateSbl("borderRadiusPx", n)}
                />
                <NumberField
                  label="Content padding (px)"
                  value={s.contentPaddingPx}
                  min={8}
                  max={40}
                  onChange={(n) => updateSbl("contentPaddingPx", n)}
                />
                <BoolField label="Panel shadow" checked={Boolean(s.panelShadow)} onChange={(v) => updateSbl("panelShadow", v)} />
                <ColorField
                  label="Shadow color"
                  value={s.panelShadowColor || "#0f172a"}
                  onChange={(v) => updateSbl("panelShadowColor", v)}
                />
                <NumberField
                  label="Shadow blur (px)"
                  value={s.panelShadowBlurPx}
                  min={0}
                  max={48}
                  onChange={(n) => updateSbl("panelShadowBlurPx", n)}
                />
                <NumberField
                  label="Shadow offset Y (px)"
                  value={s.panelShadowOffsetYPx}
                  min={0}
                  max={24}
                  onChange={(n) => updateSbl("panelShadowOffsetYPx", n)}
                />
                <NumberField
                  label="Shadow opacity"
                  value={s.panelShadowOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(n) => updateSbl("panelShadowOpacity", n)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField label="Title color" value={s.titleColor} onChange={(v) => updateSbl("titleColor", v)} />
              <ColorField label="Body color" value={s.bodyColor} onChange={(v) => updateSbl("bodyColor", v)} />
              <ColorField label="Heading color" value={s.headingColor} onChange={(v) => updateSbl("headingColor", v)} />
              <ColorField label="Link color" value={s.linkColor} onChange={(v) => updateSbl("linkColor", v)} />
              <ColorField label="Accent" value={s.accentColor} onChange={(v) => updateSbl("accentColor", v)} />
            </div>
            <AppearancePreviewPanel title="Live preview · Story learning">
              <StoryLivePreview s={s} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                All questions · {deviceMeta[editDevice].label}
              </p>
              <div className="flex flex-wrap gap-2">
                <AppearanceOptionGuide
                  title="All questions — অপশন গাইড"
                  description="পেজ ক্রোম, পেপার শেল, স্টেম, অপশন ও explanation।"
                  items={GUIDE_QUESTIONS}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => applyAllQuestionsTo(["mobile"])}>
                  Set to Phone
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyAllQuestionsTo(["tablet"])}>
                  Set to Tablet
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => applyAllQuestionsTo(["desktop"])}>
                  Set to Computer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => applyAllQuestionsTo(["mobile", "tablet", "desktop"])}
                >
                  Set to all
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Page chrome + question paper look. Still needs <strong>Save to database</strong>.
            </p>

            <p className="text-xs font-semibold uppercase text-muted-foreground">Page chrome</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <BoolField
                label="Use sidebar label as title"
                checked={aq.useSidebarLabelAsTitle}
                onChange={(v) => updateAq("useSidebarLabelAsTitle", v)}
                hint="Uses Website UI → Sidebar labels → All questions"
              />
              <TextField
                label="Custom page title"
                value={aq.pageTitle}
                onChange={(v) => updateAq("pageTitle", v)}
                hint="Used when sidebar label toggle is off"
              />
              <TextField label="Empty message" value={aq.emptyMessage} onChange={(v) => updateAq("emptyMessage", v)} />
              <BoolField label="Show result count badge" checked={aq.showResultBadge} onChange={(v) => updateAq("showResultBadge", v)} />
              <BoolField label="Sticky filters" checked={aq.filterSticky} onChange={(v) => updateAq("filterSticky", v)} />
              <NumberField
                label="List max width (px)"
                value={aq.listMaxWidthPx}
                min={320}
                max={1200}
                onChange={(n) => updateAq("listMaxWidthPx", n)}
              />
              <NumberField
                label="Card gap (px)"
                value={aq.cardGapPx}
                min={4}
                max={40}
                onChange={(n) => updateAq("cardGapPx", n)}
              />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Paper shell</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                label="Paper padding (px)"
                value={aq.paperPaddingPx}
                min={8}
                max={40}
                onChange={(n) => updateAq("paperPaddingPx", n)}
              />
              <NumberField
                label="Paper radius (px)"
                value={aq.paperRadiusPx}
                min={0}
                max={24}
                onChange={(n) => updateAq("paperRadiusPx", n)}
              />
              <BoolField label="Paper shadow" checked={aq.paperShadow} onChange={(v) => updateAq("paperShadow", v)} />
              <ColorField label="Paper background" value={aq.paperBg} onChange={(v) => updateAq("paperBg", v)} />
              <ColorField label="Paper text" value={aq.paperFg} onChange={(v) => updateAq("paperFg", v)} />
              <ColorField label="Paper border" value={aq.paperBorder} onChange={(v) => updateAq("paperBorder", v)} />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Header · taxonomy · badges</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField
                label="Question label size (px)"
                value={aq.questionLabelSizePx}
                min={8}
                max={16}
                step={0.5}
                onChange={(n) => updateAq("questionLabelSizePx", n)}
              />
              <NumberField
                label="Marks size (px)"
                value={aq.marksSizePx}
                min={8}
                max={16}
                step={0.5}
                onChange={(n) => updateAq("marksSizePx", n)}
              />
              <NumberField
                label="Mode badge size (px)"
                value={aq.modeBadgeSizePx}
                min={7}
                max={14}
                step={0.5}
                onChange={(n) => updateAq("modeBadgeSizePx", n)}
              />
              <NumberField
                label="Board badge size (px)"
                value={aq.boardBadgeSizePx}
                min={7}
                max={14}
                step={0.5}
                onChange={(n) => updateAq("boardBadgeSizePx", n)}
              />
              <NumberField
                label="Taxonomy size (px)"
                value={aq.taxonomySizePx}
                min={8}
                max={16}
                step={0.5}
                onChange={(n) => updateAq("taxonomySizePx", n)}
              />
              <NumberField
                label="Concept size (px)"
                value={aq.conceptSizePx}
                min={8}
                max={18}
                step={0.5}
                onChange={(n) => updateAq("conceptSizePx", n)}
              />
              <ColorField label="Taxonomy color" value={aq.taxonomyColor} onChange={(v) => updateAq("taxonomyColor", v)} />
              <ColorField label="Concept color" value={aq.conceptColor} onChange={(v) => updateAq("conceptColor", v)} />
              <ColorField label="Header border" value={aq.headerBorderColor} onChange={(v) => updateAq("headerBorderColor", v)} />
              <ColorField label="Badge border" value={aq.badgeBorderColor} onChange={(v) => updateAq("badgeBorderColor", v)} />
              <ColorField label="Muted text" value={aq.paperMuted} onChange={(v) => updateAq("paperMuted", v)} />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Stem</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Stem font family" value={aq.stemFontFamily} onChange={(v) => updateAq("stemFontFamily", v)} />
              <NumberField
                label="Stem font size (px)"
                value={aq.stemFontSizePx}
                min={9}
                max={20}
                step={0.5}
                onChange={(n) => updateAq("stemFontSizePx", n)}
              />
              <NumberField
                label="Stem line height"
                value={aq.stemLineHeight}
                min={1.2}
                max={2.2}
                step={0.05}
                onChange={(n) => updateAq("stemLineHeight", n)}
              />
              <ColorField label="Stem color" value={aq.stemColor} onChange={(v) => updateAq("stemColor", v)} />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Options / statements</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextField label="Option font family" value={aq.optionFontFamily} onChange={(v) => updateAq("optionFontFamily", v)} />
              <NumberField
                label="Option font size (px)"
                value={aq.optionFontSizePx}
                min={9}
                max={18}
                step={0.5}
                onChange={(n) => updateAq("optionFontSizePx", n)}
              />
              <NumberField
                label="Option line height"
                value={aq.optionLineHeight}
                min={1.2}
                max={2.2}
                step={0.05}
                onChange={(n) => updateAq("optionLineHeight", n)}
              />
              <NumberField
                label="Option gap (px)"
                value={aq.optionGapPx}
                min={2}
                max={24}
                onChange={(n) => updateAq("optionGapPx", n)}
              />
              <ColorField label="Option number color" value={aq.optionNumberColor} onChange={(v) => updateAq("optionNumberColor", v)} />
              <ColorField label="Option text color" value={aq.optionTextColor} onChange={(v) => updateAq("optionTextColor", v)} />
              <ColorField label="Correct highlight" value={aq.correctColor} onChange={(v) => updateAq("correctColor", v)} />
              <ColorField label="Wrong highlight" value={aq.wrongColor} onChange={(v) => updateAq("wrongColor", v)} />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Explanations</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <BoolField
                label="Show explanations"
                checked={aq.showExplanations}
                onChange={(v) => updateAq("showExplanations", v)}
              />
              <TextField
                label="Explanations title"
                value={aq.explanationTitle}
                onChange={(v) => updateAq("explanationTitle", v)}
              />
              <NumberField
                label="Title size (px)"
                value={aq.explanationTitleSizePx}
                min={8}
                max={16}
                step={0.5}
                onChange={(n) => updateAq("explanationTitleSizePx", n)}
              />
              <NumberField
                label="Body font size (px)"
                value={aq.explanationFontSizePx}
                min={8}
                max={18}
                step={0.5}
                onChange={(n) => updateAq("explanationFontSizePx", n)}
              />
              <NumberField
                label="Body line height"
                value={aq.explanationLineHeight}
                min={1.2}
                max={2.2}
                step={0.05}
                onChange={(n) => updateAq("explanationLineHeight", n)}
              />
              <NumberField
                label="Item gap (px)"
                value={aq.explanationGapPx}
                min={2}
                max={24}
                onChange={(n) => updateAq("explanationGapPx", n)}
              />
              <NumberField
                label="Top padding (px)"
                value={aq.explanationPaddingTopPx}
                min={4}
                max={32}
                onChange={(n) => updateAq("explanationPaddingTopPx", n)}
              />
              <ColorField
                label="Title color"
                value={aq.explanationTitleColor}
                onChange={(v) => updateAq("explanationTitleColor", v)}
              />
              <ColorField
                label="Body color"
                value={aq.explanationColor}
                onChange={(v) => updateAq("explanationColor", v)}
              />
              <ColorField
                label="Label color (1. T:)"
                value={aq.explanationLabelColor}
                onChange={(v) => updateAq("explanationLabelColor", v)}
              />
              <ColorField
                label="Divider border"
                value={aq.explanationBorderColor}
                onChange={(v) => updateAq("explanationBorderColor", v)}
              />
            </div>

            <AppearancePreviewPanel title="Live preview · All questions" hint="Paper shell, stem, options, and explanation block from current draft.">
              <AllQuestionsLivePreview explanationTitle={aq.explanationTitle || "Explanations"} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="landing" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Public landing page (shared). Edit colors, section copy, and FAQ. Save to database to publish.
              </p>
              <AppearanceOptionGuide
                title={
                  landingSection === "colors"
                    ? "Landing · Colors"
                    : landingSection === "nav"
                      ? "Landing · Header & nav"
                      : landingSection === "hero"
                        ? "Landing · Hero"
                        : landingSection === "featured"
                          ? "Landing · Featured"
                          : landingSection === "courses"
                            ? "Landing · Courses"
                            : landingSection === "about"
                              ? "Landing · About"
                              : landingSection === "faq"
                                ? "Landing · FAQ"
                                : "Landing · Footer"
                }
                description="বর্তমান সাব-সেকশনের অপশনগুলোর ব্যাখ্যা।"
                items={
                  landingSection === "colors"
                    ? GUIDE_LANDING_COLORS
                    : landingSection === "nav"
                      ? GUIDE_LANDING_NAV
                      : landingSection === "hero"
                        ? GUIDE_LANDING_HERO
                        : landingSection === "featured"
                          ? GUIDE_LANDING_FEATURED
                          : landingSection === "courses"
                            ? GUIDE_LANDING_COURSES
                            : landingSection === "about"
                              ? GUIDE_LANDING_ABOUT
                              : landingSection === "faq"
                                ? GUIDE_LANDING_FAQ
                                : GUIDE_LANDING_FOOTER
                }
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["colors", "Colors"],
                  ["nav", "Header & nav"],
                  ["hero", "Hero"],
                  ["featured", "Featured card"],
                  ["courses", "Courses"],
                  ["about", "Why / About"],
                  ["faq", "FAQ"],
                  ["footer", "Footer"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={landingSection === id ? "default" : "outline"}
                  className="h-8"
                  onClick={() => setLandingSection(id)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {landingSection === "colors" ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Hero section background</p>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Hero uses a gradient from the three colors below. Background stays fixed while hero content scrolls.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <ColorField label="Background color 1" value={lp.bgColor1} onChange={(v) => updateLandingPage("bgColor1", v)} />
                    <ColorField label="Background color 2" value={lp.bgColor2} onChange={(v) => updateLandingPage("bgColor2", v)} />
                    <ColorField label="Background color 3" value={lp.bgColor3} onChange={(v) => updateLandingPage("bgColor3", v)} />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Other section backgrounds</p>
                  <p className="mb-3 text-[11px] text-muted-foreground">
                    Each section has its own sticky background. Hex, rgb, or CSS gradient — e.g.{" "}
                    <code className="text-[10px]">linear-gradient(165deg, #0e6678, #0f766e)</code>
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Courses section"
                      value={lp.coursesSectionBg}
                      onChange={(v) => updateLandingPage("coursesSectionBg", v)}
                    />
                    <TextField
                      label="Why / About section"
                      value={lp.aboutSectionBg}
                      onChange={(v) => updateLandingPage("aboutSectionBg", v)}
                    />
                    <TextField
                      label="FAQ section"
                      value={lp.faqSectionBg}
                      onChange={(v) => updateLandingPage("faqSectionBg", v)}
                    />
                    <TextField
                      label="Footer section"
                      value={lp.footerSectionBg}
                      onChange={(v) => updateLandingPage("footerSectionBg", v)}
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Global text & cards</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField label="Text color" value={lp.textColor} onChange={(v) => updateLandingPage("textColor", v)} />
                <TextField
                  label="Muted text (color / rgba)"
                  value={lp.mutedTextColor}
                  onChange={(v) => updateLandingPage("mutedTextColor", v)}
                />
                <ColorField label="Accent color" value={lp.accentColor} onChange={(v) => updateLandingPage("accentColor", v)} />
                <TextField
                  label="Course card background"
                  value={lp.courseCardBg}
                  onChange={(v) => updateLandingPage("courseCardBg", v)}
                  hint="Hex or rgba(…)"
                />
                <TextField
                  label="Course card border"
                  value={lp.courseCardBorder}
                  onChange={(v) => updateLandingPage("courseCardBorder", v)}
                />
                <TextField
                  label="Routine panel background"
                  value={lp.courseRoutineBg}
                  onChange={(v) => updateLandingPage("courseRoutineBg", v)}
                />
                <TextField
                  label="FAQ card background"
                  value={lp.faqCardBg}
                  onChange={(v) => updateLandingPage("faqCardBg", v)}
                />
                  </div>
                </div>
              </div>
            ) : null}

            {landingSection === "nav" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Brand name" value={lp.brandName} onChange={(v) => updateLandingPage("brandName", v)} />
                <TextField label="Nav · Courses" value={lp.navCourses} onChange={(v) => updateLandingPage("navCourses", v)} />
                <TextField label="Nav · About" value={lp.navAbout} onChange={(v) => updateLandingPage("navAbout", v)} />
                <TextField label="Nav · FAQ" value={lp.navFaq} onChange={(v) => updateLandingPage("navFaq", v)} />
                <TextField
                  label="Login / Register button"
                  value={lp.loginButtonLabel}
                  onChange={(v) => updateLandingPage("loginButtonLabel", v)}
                />
                <TextField
                  label="Go to app button"
                  value={lp.goToAppLabel}
                  onChange={(v) => updateLandingPage("goToAppLabel", v)}
                />
              </div>
            ) : null}

            {landingSection === "hero" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Eyebrow" value={lp.heroEyebrow} onChange={(v) => updateLandingPage("heroEyebrow", v)} />
                  <TextField
                    label="Headline"
                    value={lp.heroHeadline}
                    onChange={(v) => updateLandingPage("heroHeadline", v)}
                  />
                  <div className="sm:col-span-2">
                    <Field label="Supporting text">
                      <Textarea
                        value={lp.heroSubtext}
                        onChange={(e) => updateLandingPage("heroSubtext", e.target.value)}
                        rows={3}
                      />
                    </Field>
                  </div>
                  <TextField
                    label="Explore CTA"
                    value={lp.heroCtaExplore}
                    onChange={(v) => updateLandingPage("heroCtaExplore", v)}
                  />
                  <TextField
                    label="Featured label"
                    value={lp.heroFeaturedLabel}
                    onChange={(v) => updateLandingPage("heroFeaturedLabel", v)}
                  />
                  <TextField
                    label="Fallback course title"
                    value={lp.heroFallbackTitle}
                    onChange={(v) => updateLandingPage("heroFallbackTitle", v)}
                  />
                  <TextField
                    label="Fallback course description"
                    value={lp.heroFallbackDesc}
                    onChange={(v) => updateLandingPage("heroFallbackDesc", v)}
                  />
                </div>

                <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Fixed hero overlay</p>
                  <p className="text-[11px] text-muted-foreground">
                    Stays fixed while hero and later sections scroll over it. Default: full width, 40% viewport height,
                    vertically centered (top 30%).
                  </p>
                  <BoolField
                    label="Show fixed overlay"
                    checked={lp.heroFixedOverlayEnabled}
                    onChange={(v) => updateLandingPage("heroFixedOverlayEnabled", v)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ColorField
                      label="Overlay color"
                      value={lp.heroFixedOverlayColor}
                      onChange={(v) => updateLandingPage("heroFixedOverlayColor", v)}
                    />
                    <NumberField
                      label="Width (%)"
                      value={lp.heroFixedOverlayWidthPercent}
                      min={1}
                      max={100}
                      step={1}
                      onChange={(n) => updateLandingPage("heroFixedOverlayWidthPercent", n)}
                      hint="100 = full width"
                    />
                    <NumberField
                      label="Height (vh %)"
                      value={lp.heroFixedOverlayHeightPercent}
                      min={1}
                      max={100}
                      step={1}
                      onChange={(n) => updateLandingPage("heroFixedOverlayHeightPercent", n)}
                      hint="Default 40"
                    />
                    <NumberField
                      label="Top offset (vh %)"
                      value={lp.heroFixedOverlayTopPercent}
                      min={0}
                      max={99}
                      step={1}
                      onChange={(n) => updateLandingPage("heroFixedOverlayTopPercent", n)}
                      hint="30 centers 40% band"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {landingSection === "featured" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Featured Track card animation — শুধু opacity/transform (GPU)। Shine ও 3D tilt heavier; default off।
                  Lag এড়াতে: Fade + short duration, shine/tilt বন্ধ রাখুন।
                </p>

                <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Slide rotation</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BoolField
                      label="Autoplay slides"
                      checked={lp.featuredAutoplay}
                      onChange={(v) => updateLandingPage("featuredAutoplay", v)}
                      hint="Rotate featured courses automatically"
                    />
                    <BoolField
                      label="Pause autoplay on hover"
                      checked={lp.featuredPauseOnHover}
                      onChange={(v) => updateLandingPage("featuredPauseOnHover", v)}
                      hint="Pointer over card = timer pauses"
                    />
                    <NumberField
                      label="Slide interval (seconds)"
                      value={lp.featuredIntervalSec}
                      min={1}
                      max={30}
                      step={0.5}
                      onChange={(n) => updateLandingPage("featuredIntervalSec", n)}
                      hint="How long each course stays"
                    />
                    <NumberField
                      label="Max slides"
                      value={lp.featuredMaxSlides}
                      min={1}
                      max={8}
                      step={1}
                      onChange={(n) => updateLandingPage("featuredMaxSlides", Math.round(n))}
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Slide transition</p>
                  <p className="text-[11px] text-muted-foreground">
                    Content enter animation when slide changes — fade/slide/scale use GPU only (no layout reflow)।
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BoolField
                      label="Enable slide transition"
                      checked={lp.featuredTransitionEnabled}
                      onChange={(v) => updateLandingPage("featuredTransitionEnabled", v)}
                      hint="Off = instant content swap"
                    />
                    <Field label="Transition style" hint="Fade = lightest; None = no anim">
                      <Select
                        value={lp.featuredTransition}
                        onValueChange={(v) =>
                          updateLandingPage(
                            "featuredTransition",
                            v as LandingPageAppearance["featuredTransition"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fade">Fade (opacity)</SelectItem>
                          <SelectItem value="slide">Slide (translateX)</SelectItem>
                          <SelectItem value="scale">Scale</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <NumberField
                      label="Duration (seconds)"
                      value={lp.featuredTransitionSec}
                      min={0}
                      max={2}
                      step={0.05}
                      onChange={(n) => updateLandingPage("featuredTransitionSec", n)}
                      hint="0.2–0.35 recommended"
                    />
                    <Field label="Easing">
                      <Select
                        value={lp.featuredEasing}
                        onValueChange={(v) =>
                          updateLandingPage("featuredEasing", v as LandingPageAppearance["featuredEasing"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ease-out">Ease out</SelectItem>
                          <SelectItem value="ease">Ease</SelectItem>
                          <SelectItem value="ease-in-out">Ease in-out</SelectItem>
                          <SelectItem value="linear">Linear</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <NumberField
                      label="Slide distance (px)"
                      value={lp.featuredSlideDistancePx}
                      min={0}
                      max={48}
                      onChange={(n) => updateLandingPage("featuredSlideDistancePx", n)}
                      hint="Only for Slide style"
                    />
                    <NumberField
                      label="Scale from"
                      value={lp.featuredScaleFrom}
                      min={0.9}
                      max={1}
                      step={0.01}
                      onChange={(n) => updateLandingPage("featuredScaleFrom", n)}
                      hint="Only for Scale style (0.98 = subtle)"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Card effects</p>
                  <p className="text-[11px] text-muted-foreground">
                    Hover lift = transform only (safe)। Shine = continuous paint; 3D tilt = perspective — both heavier।
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <BoolField
                      label="Hover lift"
                      checked={lp.featuredHoverLift}
                      onChange={(v) => updateLandingPage("featuredHoverLift", v)}
                      hint="Card rises on hover (GPU)"
                    />
                    <NumberField
                      label="Hover lift (px)"
                      value={lp.featuredHoverLiftPx}
                      min={0}
                      max={16}
                      onChange={(n) => updateLandingPage("featuredHoverLiftPx", n)}
                    />
                    <NumberField
                      label="Hover duration (ms)"
                      value={lp.featuredHoverDurationMs}
                      min={0}
                      max={600}
                      step={25}
                      onChange={(n) => updateLandingPage("featuredHoverDurationMs", n)}
                    />
                    <BoolField
                      label="Shine animation"
                      checked={lp.featuredShineEnabled}
                      onChange={(v) => updateLandingPage("featuredShineEnabled", v)}
                      hint="May cost FPS on low-end devices"
                    />
                    <NumberField
                      label="Shine loop (seconds)"
                      value={lp.featuredShineSec}
                      min={1}
                      max={20}
                      step={0.5}
                      onChange={(n) => updateLandingPage("featuredShineSec", n)}
                    />
                    <BoolField
                      label="3D tilt"
                      checked={lp.featuredTiltEnabled}
                      onChange={(v) => updateLandingPage("featuredTiltEnabled", v)}
                      hint="Heavier — prefer off"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {landingSection === "courses" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Section title"
                  value={lp.coursesTitle}
                  onChange={(v) => updateLandingPage("coursesTitle", v)}
                />
                <TextField
                  label="View course label"
                  value={lp.courseViewLabel}
                  onChange={(v) => updateLandingPage("courseViewLabel", v)}
                />
                <div className="sm:col-span-2">
                  <Field label="Section subtitle">
                    <Textarea
                      value={lp.coursesSubtitle}
                      onChange={(e) => updateLandingPage("coursesSubtitle", e.target.value)}
                      rows={2}
                    />
                  </Field>
                </div>
                <TextField
                  label="Loading text"
                  value={lp.coursesLoading}
                  onChange={(v) => updateLandingPage("coursesLoading", v)}
                />
                <TextField
                  label="Empty text"
                  value={lp.coursesEmpty}
                  onChange={(v) => updateLandingPage("coursesEmpty", v)}
                />
                <TextField
                  label="Routine heading"
                  value={lp.routineLabel}
                  onChange={(v) => updateLandingPage("routineLabel", v)}
                />
                <TextField
                  label="Routine empty"
                  value={lp.routineEmpty}
                  onChange={(v) => updateLandingPage("routineEmpty", v)}
                />
              </div>
            ) : null}

            {landingSection === "about" ? (
              <div className="space-y-4">
                <TextField
                  label="Eyebrow"
                  value={lp.aboutEyebrow}
                  onChange={(v) => updateLandingPage("aboutEyebrow", v)}
                />
                <TextField label="Title" value={lp.aboutTitle} onChange={(v) => updateLandingPage("aboutTitle", v)} />
                <Field label="Body (optional)">
                  <Textarea
                    value={lp.aboutBody}
                    onChange={(e) => updateLandingPage("aboutBody", e.target.value)}
                    rows={3}
                  />
                </Field>

                <div className="space-y-3 rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Why cards carousel</p>
                  <p className="text-[11px] text-muted-foreground">
                    Desktop shows 4 cards at a time, mobile shows 2. Advances one card continuously.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <BoolField
                      label="Autoplay"
                      checked={lp.whyAutoplay !== false}
                      onChange={(v) => updateLandingPage("whyAutoplay", v)}
                    />
                    <NumberField
                      label="Interval (sec)"
                      value={lp.whyIntervalSec || 3}
                      min={1.5}
                      max={20}
                      step={0.5}
                      onChange={(n) => updateLandingPage("whyIntervalSec", n)}
                    />
                    <NumberField
                      label="Transition (sec)"
                      value={lp.whyTransitionSec || 0.55}
                      min={0.15}
                      max={2}
                      step={0.05}
                      onChange={(n) => updateLandingPage("whyTransitionSec", n)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Cards ({whyItems.length})
                  </p>
                  <Button type="button" size="sm" className="gap-1" onClick={addWhyItem}>
                    <Plus className="h-4 w-4" /> Add card
                  </Button>
                </div>

                {whyItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No Why cards yet. Add cards with an icon class, text, and colors.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {whyItems.map((item, idx) => (
                      <Card key={item.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Card {idx + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeWhyItem(item.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TextField
                            label="Icon class / Lucide name"
                            value={item.iconClass}
                            onChange={(v) => updateWhyItem(item.id, { iconClass: v })}
                            hint="e.g. Brain, PencilRuler, GraduationCap — or a CSS icon class"
                          />
                          <Field label="Text">
                            <Textarea
                              value={item.text}
                              onChange={(e) => updateWhyItem(item.id, { text: e.target.value })}
                              rows={2}
                              placeholder="কার্ডের লেখা…"
                            />
                          </Field>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <ColorField
                            label="Icon color"
                            value={item.iconColor}
                            onChange={(v) => updateWhyItem(item.id, { iconColor: v })}
                          />
                          <ColorField
                            label="Icon background"
                            value={item.iconBg}
                            onChange={(v) => updateWhyItem(item.id, { iconBg: v })}
                          />
                          <ColorField
                            label="Text color"
                            value={item.textColor}
                            onChange={(v) => updateWhyItem(item.id, { textColor: v })}
                          />
                          <ColorField
                            label="Card background"
                            value={item.cardBg.startsWith("#") ? item.cardBg : "#ffffff"}
                            onChange={(v) => updateWhyItem(item.id, { cardBg: v })}
                          />
                        </div>
                        <TextField
                          label="Card background (CSS)"
                          value={item.cardBg}
                          onChange={(v) => updateWhyItem(item.id, { cardBg: v })}
                          hint="e.g. transparent, rgba(255,255,255,0.08), #ffffff"
                        />
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {landingSection === "faq" ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Section title" value={faq.title} onChange={(v) => updateLandingFaq({ title: v })} />
                  <TextField
                    label="“See answer” label"
                    value={faq.seeAnswerLabel}
                    onChange={(v) => updateLandingFaq({ seeAnswerLabel: v })}
                  />
                </div>
                <Field label="Section subtitle">
                  <Textarea
                    value={faq.subtitle}
                    onChange={(e) => updateLandingFaq({ subtitle: e.target.value })}
                    rows={2}
                  />
                </Field>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Questions ({faq.items.length})
                  </p>
                  <Button type="button" size="sm" className="gap-1" onClick={addFaqItem}>
                    <Plus className="h-4 w-4" /> Add question
                  </Button>
                </div>
                {faq.items.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No FAQ items yet. Add a question, then add one or more answers under it.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {faq.items.map((item, idx) => (
                      <Card key={item.id} className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Question {idx + 1}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => removeFaqItem(item.id)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete question
                          </Button>
                        </div>
                        <Field label="Question text">
                          <Textarea
                            value={item.question}
                            onChange={(e) => updateFaqItem(item.id, { question: e.target.value })}
                            rows={2}
                            placeholder="প্রশ্ন লিখুন…"
                          />
                        </Field>
                        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Answers ({item.answers.length})
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => addFaqAnswer(item.id)}
                            >
                              <Plus className="h-3.5 w-3.5" /> Add answer
                            </Button>
                          </div>
                          {item.answers.map((ans, aIdx) => (
                            <div key={ans.id} className="space-y-1.5 rounded-md border bg-background p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs">Answer {aIdx + 1}</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive"
                                  onClick={() => removeFaqAnswer(item.id, ans.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <Textarea
                                value={ans.text}
                                onChange={(e) => updateFaqAnswer(item.id, ans.id, e.target.value)}
                                rows={3}
                                placeholder="উত্তর লিখুন…"
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {landingSection === "footer" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Footer note" value={lp.footerNote} onChange={(v) => updateLandingPage("footerNote", v)} />
                <TextField label="FAB label" value={lp.fabLabel} onChange={(v) => updateLandingPage("fabLabel", v)} />
              </div>
            ) : null}

            <AppearancePreviewPanel
              title={`Live preview · Landing · ${landingSection === "colors" ? "Colors" : landingSection === "nav" ? "Header & nav" : landingSection === "hero" ? "Hero" : landingSection === "featured" ? "Featured" : landingSection === "courses" ? "Courses" : landingSection === "about" ? "About" : landingSection === "faq" ? "FAQ" : "Footer"}`}
              hint="Uses landing page CSS variables from current draft."
            >
              <LandingLivePreview section={landingSection} lp={lp} faq={faq} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="progress" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Effective Study &amp; Practice Progress Plan — shared copy, step labels, feature toggles, and card colors.
                Save to database to publish for all students.
              </p>
              <AppearanceOptionGuide
                title={
                  progressSection === "steps"
                    ? "Progress · 4-step labels"
                    : progressSection === "copy"
                      ? "Progress · Messages & cards"
                      : progressSection === "features"
                        ? "Progress · Toggles & defaults"
                        : "Progress · Colors"
                }
                description="বর্তমান সাব-সেকশনের অপশনগুলোর ব্যাখ্যা।"
                items={
                  progressSection === "steps"
                    ? GUIDE_PROGRESS_STEPS
                    : progressSection === "copy"
                      ? GUIDE_PROGRESS_COPY
                      : progressSection === "features"
                        ? GUIDE_PROGRESS_FEATURES
                        : GUIDE_PROGRESS_COLORS
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["steps", "4-step labels"],
                  ["copy", "Messages & cards"],
                  ["features", "Toggles & defaults"],
                  ["colors", "Colors"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={progressSection === id ? "default" : "outline"}
                  onClick={() => setProgressSection(id)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {progressSection === "steps" ? (
              <div className="space-y-3">
                <TextField label="Step bar title" value={prog.stepBarTitle} onChange={(v) => updateProgressPlan("stepBarTitle", v)} />
                <BoolField
                  label="Prefer Bengali step labels"
                  checked={prog.preferBengaliStepLabels}
                  onChange={(v) => updateProgressPlan("preferBengaliStepLabels", v)}
                />
                {prog.steps.map((step) => (
                  <Card key={step.id} className="space-y-2 p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Step {step.id}</p>
                    <TextField label="English label" value={step.label} onChange={(v) => updateProgressStep(step.id, { label: v })} />
                    <TextField label="Bengali label" value={step.labelBn} onChange={(v) => updateProgressStep(step.id, { labelBn: v })} />
                  </Card>
                ))}
              </div>
            ) : null}

            {progressSection === "copy" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Study progress page title" value={prog.studyProgressTitle} onChange={(v) => updateProgressPlan("studyProgressTitle", v)} />
                <TextField label="Study progress subtitle" value={prog.studyProgressSubtitle} onChange={(v) => updateProgressPlan("studyProgressSubtitle", v)} />
                <TextField label="Course complete badge" value={prog.courseCompleteLabel} onChange={(v) => updateProgressPlan("courseCompleteLabel", v)} />
                <TextField label="Progress % suffix" value={prog.progressPctSuffix} onChange={(v) => updateProgressPlan("progressPctSuffix", v)} hint='e.g. "complete" → "42% complete"' />
                <TextField label="Exam Night title" value={prog.examNightTitle} onChange={(v) => updateProgressPlan("examNightTitle", v)} />
                <TextField label="Exam Night subtitle" value={prog.examNightSubtitle} onChange={(v) => updateProgressPlan("examNightSubtitle", v)} />
                <TextField label="Final mock title" value={prog.finalMockTitle} onChange={(v) => updateProgressPlan("finalMockTitle", v)} />
                <TextField label="Final mock subtitle" value={prog.finalMockSubtitle} onChange={(v) => updateProgressPlan("finalMockSubtitle", v)} />
                <TextField label="Review mistakes title" value={prog.reviewMistakesTitle} onChange={(v) => updateProgressPlan("reviewMistakesTitle", v)} />
                <TextField label="Review mistakes button" value={prog.reviewMistakesButton} onChange={(v) => updateProgressPlan("reviewMistakesButton", v)} />
                <TextField label="Review mistakes empty" value={prog.reviewMistakesEmpty} onChange={(v) => updateProgressPlan("reviewMistakesEmpty", v)} />
                <TextField label="Concept practice intro" value={prog.conceptPracticeIntro} onChange={(v) => updateProgressPlan("conceptPracticeIntro", v)} />
                <TextField label="Step 1 complete button" value={prog.step1CompleteButton} onChange={(v) => updateProgressPlan("step1CompleteButton", v)} />
                <TextField label="Step 2 complete button" value={prog.step2CompleteButton} onChange={(v) => updateProgressPlan("step2CompleteButton", v)} />
                <TextField label="Locked steps message" value={prog.lockedPreviousSteps} onChange={(v) => updateProgressPlan("lockedPreviousSteps", v)} />
              </div>
            ) : null}

            {progressSection === "features" ? (
              <div className="space-y-3">
                <BoolField label="Progress Plan enabled" checked={prog.enabled} onChange={(v) => updateProgressPlan("enabled", v)} />
                <BoolField label="Show concept step bar" checked={prog.showConceptStepBar} onChange={(v) => updateProgressPlan("showConceptStepBar", v)} />
                <BoolField label="Show % on course browse" checked={prog.showProgressOnBrowse} onChange={(v) => updateProgressPlan("showProgressOnBrowse", v)} />
                <BoolField label="Show Exam Night card" checked={prog.showExamNightCard} onChange={(v) => updateProgressPlan("showExamNightCard", v)} />
                <BoolField label="Show Final Mock card" checked={prog.showFinalMockCard} onChange={(v) => updateProgressPlan("showFinalMockCard", v)} />
                <BoolField label="Show Review Mistakes on profile" checked={prog.showReviewMistakes} onChange={(v) => updateProgressPlan("showReviewMistakes", v)} />
                <Field label="Default pass %" hint="Used when admin set has no pass_percent">
                  <Input type="number" min={1} max={100} value={prog.defaultPassPercent} onChange={(e) => updateProgressPlan("defaultPassPercent", Number(e.target.value) || 70)} />
                </Field>
                <Field label="Exam Night unlock (hours before mock)">
                  <Input type="number" min={1} max={168} value={prog.examNightHoursBefore} onChange={(e) => updateProgressPlan("examNightHoursBefore", Number(e.target.value) || 24)} />
                </Field>
              </div>
            ) : null}

            {progressSection === "colors" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FlexibleColorField label="Progress bar" value={prog.progressBarColor} onChange={(v) => updateProgressPlan("progressBarColor", v)} hint="My progress, concept browse %" />
                <FlexibleColorField label="Complete badge" value={prog.completeBadgeBg} onChange={(v) => updateProgressPlan("completeBadgeBg", v)} />
                <ColorField label="Exam Night card bg" value={prog.examNightCardBg} onChange={(v) => updateProgressPlan("examNightCardBg", v)} hint="Profile card" />
                <ColorField label="Exam Night border" value={prog.examNightBorder} onChange={(v) => updateProgressPlan("examNightBorder", v)} />
                <ColorField label="Exam Night icon" value={prog.examNightIconColor} onChange={(v) => updateProgressPlan("examNightIconColor", v)} />
                <ColorField label="Final mock card bg" value={prog.finalMockCardBg} onChange={(v) => updateProgressPlan("finalMockCardBg", v)} />
                <ColorField label="Final mock border" value={prog.finalMockBorder} onChange={(v) => updateProgressPlan("finalMockBorder", v)} />
                <ColorField label="Final mock icon" value={prog.finalMockIconColor} onChange={(v) => updateProgressPlan("finalMockIconColor", v)} />
                <ColorField label="Mistake accent" value={prog.mistakeAccentColor} onChange={(v) => updateProgressPlan("mistakeAccentColor", v)} hint="Review mistakes highlight" />
              </div>
            ) : null}

            <AppearancePreviewPanel
              title={`Live preview · Progress · ${progressSection === "steps" ? "4-step labels" : progressSection === "copy" ? "Messages" : progressSection === "features" ? "Toggles" : "Colors"}`}
            >
              <ProgressLivePreview section={progressSection} prog={prog} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="headingSlides" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Word থেকে পেস্ট করা HTML-কে heading অনুযায়ী অটো স্লাইডে ভাগ করে। Concept details ও Story learning — দুটোতেই কাজ করে। Shared (সব device)।
              </p>
              <AppearanceOptionGuide
                title="Heading slides — অপশন গাইড"
                description="স্প্লিট রুল, Next বার, লেবেল ও প্রিভিউ — কোনটা কী করে।"
                items={GUIDE_HEADING_SLIDES}
              />
            </div>
            <div className="space-y-3">
              <BoolField
                label="Enable on Concept details"
                checked={hs.conceptDetailsEnabled}
                onChange={(v) => updateHeadingSlides("conceptDetailsEnabled", v)}
                hint="Student read views (Learn Step 1, details page, dialog)"
              />
              <BoolField
                label="Enable on Story-based learning"
                checked={hs.storyEnabled}
                onChange={(v) => updateHeadingSlides("storyEnabled", v)}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium">Split on these headings</p>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <BoolField label="H1" checked={hs.splitH1} onChange={(v) => updateHeadingSlides("splitH1", v)} />
                <BoolField label="H2" checked={hs.splitH2} onChange={(v) => updateHeadingSlides("splitH2", v)} />
                <BoolField label="H3" checked={hs.splitH3} onChange={(v) => updateHeadingSlides("splitH3", v)} />
                <BoolField label="H4" checked={hs.splitH4} onChange={(v) => updateHeadingSlides("splitH4", v)} />
                <BoolField label="H5" checked={hs.splitH5} onChange={(v) => updateHeadingSlides("splitH5", v)} />
                <BoolField label="H6" checked={hs.splitH6} onChange={(v) => updateHeadingSlides("splitH6", v)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Content before first heading">
                <Select
                  value={hs.preHeadingMode}
                  onValueChange={(v) => updateHeadingSlides("preHeadingMode", v as "intro" | "mergeFirst")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intro">Separate Intro slide</SelectItem>
                    <SelectItem value="mergeFirst">Merge into first slide</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="Scroll mode"
                hint="Page = পেজের সাথে স্ক্রল (Concept Learn-এ নিচে Complete এ যাওয়া যায়). Nested = ভিতরে আলাদা স্ক্রল বক্স।"
              >
                <Select
                  value={hs.scrollMode ?? "page"}
                  onValueChange={(v) => updateHeadingSlides("scrollMode", v as "nested" | "page")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="page">Page scroll (recommended)</SelectItem>
                    <SelectItem value="nested">Nested box (can trap scroll)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <NumberField
                label="Show Next after scroll %"
                value={hs.scrollShowNextAtPercent}
                min={50}
                max={100}
                onChange={(n) => updateHeadingSlides("scrollShowNextAtPercent", n)}
                hint="Require scrolling this far before Next appears"
              />
              <NumberField
                label="Min chars per slide (0 = off)"
                value={hs.minCharsPerSlide}
                min={0}
                max={500}
                onChange={(n) => updateHeadingSlides("minCharsPerSlide", n)}
              />
            </div>
            <div className="space-y-3">
              <BoolField label="Require scroll to end before Next" checked={hs.requireScrollToEnd} onChange={(v) => updateHeadingSlides("requireScrollToEnd", v)} />
              <BoolField
                label="Trap scroll inside nested box"
                checked={hs.trapNestedScroll}
                onChange={(v) => updateHeadingSlides("trapNestedScroll", v)}
                hint="Only for Nested mode. On = নিচে গেলে পেজে স্ক্রল যাবে না (আটকে থাকে)."
              />
              <BoolField label="Show next heading below button (card)" checked={hs.showNextHeadingPreview} onChange={(v) => updateHeadingSlides("showNextHeadingPreview", v)} />
              <BoolField label="Show Previous button" checked={hs.showPrev} onChange={(v) => updateHeadingSlides("showPrev", v)} />
              <BoolField label="Show slide counter" checked={hs.showCounter} onChange={(v) => updateHeadingSlides("showCounter", v)} />
              <BoolField label="Sticky Next bar" checked={hs.stickyNextBar} onChange={(v) => updateHeadingSlides("stickyNextBar", v)} hint="Nested mode only — overlays the scroll box footer" />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Progress indicator</p>
              <p className="text-[11px] text-muted-foreground">
                Heading slides-এর উপরে slide progress bar/dots — Concept details ও Story read view।
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <BoolField
                  label="Show progress indicator"
                  checked={hs.showProgressIndicator}
                  onChange={(v) => updateHeadingSlides("showProgressIndicator", v)}
                  hint="Bar বা dots — counter-এর নিচে"
                />
                <Field label="Progress style">
                  <Select
                    value={hs.progressStyle}
                    onValueChange={(v) => updateHeadingSlides("progressStyle", v as "bar" | "dots" | "barAndDots")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar only</SelectItem>
                      <SelectItem value="dots">Dots only</SelectItem>
                      <SelectItem value="barAndDots">Bar + dots</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <NumberField label="Bar height (px)" value={hs.progressBarHeightPx} min={2} max={16} onChange={(n) => updateHeadingSlides("progressBarHeightPx", n)} />
                <NumberField label="Dot size (px)" value={hs.progressDotSizePx} min={4} max={16} onChange={(n) => updateHeadingSlides("progressDotSizePx", n)} />
                <ColorField label="Track color" value={hs.progressTrackColor} onChange={(v) => updateHeadingSlides("progressTrackColor", v)} hint="Bar track / inactive dots" />
                <ColorField label="Fill color" value={hs.progressFillColor} onChange={(v) => updateHeadingSlides("progressFillColor", v)} hint="Completed + current slide" />
                <BoolField
                  label="Show progress label"
                  checked={hs.showProgressPercent}
                  onChange={(v) => updateHeadingSlides("showProgressPercent", v)}
                  hint="যেমন 50% বা Slide 2 of 4"
                />
                <TextField
                  label="Progress label template"
                  value={hs.progressLabelTemplate}
                  onChange={(v) => updateHeadingSlides("progressLabelTemplate", v)}
                  hint="{percent}, {current}, {total}"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Next label" value={hs.nextLabel} onChange={(v) => updateHeadingSlides("nextLabel", v)} />
              <TextField label="Heading card template" value={hs.nextTemplate} onChange={(v) => updateHeadingSlides("nextTemplate", v)} hint="{heading} — shown under the Next button" />
              <TextField label="Previous label" value={hs.prevLabel} onChange={(v) => updateHeadingSlides("prevLabel", v)} />
              <TextField label="Counter template" value={hs.counterTemplate} onChange={(v) => updateHeadingSlides("counterTemplate", v)} hint="{current} / {total}" />
              <TextField label="Last slide label" value={hs.lastSlideLabel} onChange={(v) => updateHeadingSlides("lastSlideLabel", v)} hint="Optional text on last slide" />
              <ColorField label="Next bar background" value={hs.nextBarBg} onChange={(v) => updateHeadingSlides("nextBarBg", v)} hint="HeadingSlideReader sticky bar" />
              <ColorField label="Next bar text color" value={hs.nextBarFg} onChange={(v) => updateHeadingSlides("nextBarFg", v)} />
            </div>
            <AppearancePreviewPanel title="Live preview · Heading slides">
              <HeadingSlidesLivePreview config={hs} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="richEditor" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                CKEditor textbox — image lazy load, upload, compression, Google Drive embeds. Shared across all devices.
              </p>
              <AppearanceOptionGuide
                title="Rich editor · Images — অপশন গাইড"
                description="Concept details, Story, Home textbox — image আচরণ।"
                items={GUIDE_RICH_EDITOR}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <BoolField
                label="Image lazy loading"
                checked={re.imageLazyLoading}
                onChange={(v) => updateRichEditor("imageLazyLoading", v)}
                hint="Read views — images load when scrolled near"
              />
              <BoolField
                label="Direct image upload"
                checked={re.directImageUpload}
                onChange={(v) => updateRichEditor("directImageUpload", v)}
                hint="CKEditor upload button (base64 in HTML)"
              />
              <BoolField
                label="Image compression on upload"
                checked={re.imageCompression}
                onChange={(v) => updateRichEditor("imageCompression", v)}
                hint={re.directImageUpload ? "Resize + JPEG before embed" : "Enable direct upload first"}
              />
              <BoolField
                label="Google Drive link → image"
                checked={re.googleDriveEmbeds}
                onChange={(v) => updateRichEditor("googleDriveEmbeds", v)}
                hint="Paste share link — shows inline without click"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField
                label="Compression max width (px)"
                value={re.imageCompressionMaxWidthPx}
                min={640}
                max={3840}
                step={80}
                onChange={(n) => updateRichEditor("imageCompressionMaxWidthPx", n)}
                hint="Only when compression is on"
              />
              <NumberField
                label="Compression quality (0.5–1)"
                value={re.imageCompressionQuality}
                min={0.5}
                max={1}
                step={0.05}
                onChange={(n) => updateRichEditor("imageCompressionQuality", n)}
                hint="JPEG quality — lower = smaller file"
              />
            </div>
            <AppearancePreviewPanel title="Live preview · Rich editor images">
              <RichEditorLivePreview re={re} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Shared across all devices</p>
              <AppearanceOptionGuide
                title="Performance — অপশন গাইড"
                description="স্ক্রল ও মোশন সম্পর্কিত সেটিংস।"
                items={GUIDE_PERFORMANCE}
              />
            </div>
            <BoolField label="Smooth scroll" checked={p.smoothScroll} onChange={(v) => updatePerf("smoothScroll", v)} hint="Shared across all devices — often laggy" />
            <BoolField
              label="Reduce motion"
              checked={p.reduceMotion}
              onChange={(v) => updatePerf("reduceMotion", v)}
              hint="সব transition/animation বন্ধ — lag থাকলে চালু করুন"
            />
            <AppearancePreviewPanel title="Live preview · Performance">
              <PerformanceLivePreview smoothScroll={p.smoothScroll} reduceMotion={p.reduceMotion} />
            </AppearancePreviewPanel>
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Preview uses the live viewport device ({deviceMeta[activeDevice].label}). Editing {deviceMeta[editDevice].label}.
                Still unsaved until you click Save to database.
              </p>
              <AppearanceOptionGuide
                title="Live preview — অপশন গাইড"
                description="এই ট্যাব কী দেখায় এবং ডিফল্ট লোড কী করে।"
                items={GUIDE_PREVIEW}
              />
            </div>
            {preview}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                commit(defaultUiAppearance());
              }}
            >
              Load defaults into draft (unsaved)
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
