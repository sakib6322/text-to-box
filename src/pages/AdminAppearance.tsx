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
  type SidebarLabels,
  type StoryDialogWidth,
  type UiAppearance,
} from "@/lib/uiAppearance";
import { Textarea } from "@/components/ui/textarea";

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

function ColorField(props: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const hex = props.value.startsWith("#") ? props.value : "#000000";
  return (
    <Field label={props.label} hint={props.hint}>
      <div className="flex gap-2">
        <Input type="color" className="h-10 w-14 p-1" value={hex} onChange={(e) => props.onChange(e.target.value)} />
        <Input value={props.value} onChange={(e) => props.onChange(e.target.value)} />
      </div>
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
  "sidebarBgHsl",
  "sidebarFgHsl",
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
    reset,
  } = useUiAppearance();
  const [draft, setDraft] = useState<UiAppearance | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [landingSection, setLandingSection] = useState<
    "colors" | "nav" | "hero" | "featured" | "courses" | "about" | "faq" | "footer"
  >("colors");
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

  const faq = theme.landingFaq;
  const lp = theme.landingPage;

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

  const handleReset = async () => {
    setResetting(true);
    try {
      await reset();
      setDraft(null);
      toast.success("Reset to defaults");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const preview = useMemo(
    () => (
      <div className="space-y-4">
        <div className="concept-detail-rich space-y-3 rounded-lg border p-4" style={{ background: "hsl(var(--card))" }}>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Concept details</p>
          <h1>Heading 1 sample</h1>
          <h2>Heading 2 sample</h2>
          <h3>Heading 3 sample</h3>
          <p>
            Paragraph with <strong>bold</strong>, <em>italic</em>, and a <a href="#preview">link</a>.
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
        <div className="story-based-learning space-y-2">
          <p className="text-xs font-semibold uppercase opacity-70">Story-based learning</p>
          <h2>Once upon a concept…</h2>
          <p>
            A short story paragraph with <strong>emphasis</strong> and a{" "}
            <a href="#story-preview">story link</a>.
          </p>
        </div>
        <div className="all-questions-list max-w-md">
          <p className="text-xs font-semibold uppercase text-muted-foreground print:hidden">All questions paper</p>
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
              <p className="question-paper-expl-title">Explanations</p>
              <div className="question-paper-expl-item">
                <span className="question-paper-expl-label">2. (T):</span> It guards the left atrioventricular orifice.
              </div>
            </div>
          </article>
        </div>
      </div>
    ),
    [],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading appearance…
      </div>
    );
  }

  const g = deviceTheme.global;
  const c = deviceTheme.conceptDetails;
  const s = deviceTheme.storyBasedLearning;
  const aq = deviceTheme.allQuestions;
  const p = theme.performance;

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
          <Button type="button" variant="outline" size="sm" onClick={() => void handleReset()} disabled={resetting}>
            {resetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Reset defaults
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

        <Tabs defaultValue="global">
          <TabsList className="flex h-auto flex-wrap gap-1">
            <TabsTrigger value="global">{deviceMeta[editDevice].label} · Website UI</TabsTrigger>
            <TabsTrigger value="concept">{deviceMeta[editDevice].label} · Concept details</TabsTrigger>
            <TabsTrigger value="story">{deviceMeta[editDevice].label} · Story learning</TabsTrigger>
            <TabsTrigger value="questions">{deviceMeta[editDevice].label} · All questions</TabsTrigger>
            <TabsTrigger value="landing">Landing page</TabsTrigger>
            <TabsTrigger value="performance">Performance (shared)</TabsTrigger>
            <TabsTrigger value="preview">Live preview</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-4 space-y-4">
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
                <p className="text-xs font-semibold uppercase text-muted-foreground">Cards &amp; layout</p>
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NumberField
                  label="Card border width (px)"
                  value={g.cardBorderWidthPx}
                  min={0}
                  max={4}
                  step={0.5}
                  onChange={(n) => updateGlobal("cardBorderWidthPx", n)}
                />
                <NumberField
                  label="Card border opacity"
                  value={g.cardBorderOpacity}
                  min={0}
                  max={1}
                  step={0.05}
                  hint="0 = invisible, 1 = solid"
                  onChange={(n) => updateGlobal("cardBorderOpacity", n)}
                />
                <NumberField
                  label="Card padding (px)"
                  value={g.cardPaddingPx}
                  min={8}
                  max={48}
                  onChange={(n) => updateGlobal("cardPaddingPx", n)}
                />
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
                  <div className="space-y-1" style={{ padding: "var(--ui-density-card-padding, var(--ui-card-padding, 1rem))" }}>
                    <p className="text-sm font-semibold">Card preview</p>
                    <p className="text-xs text-muted-foreground">Border, padding, radius from current draft.</p>
                  </div>
                </div>
                <div className="app-section-stack sm:col-span-2">
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">Section one</div>
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">Section two (gap preview)</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Colors (HSL without hsl())</p>
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
              <TextField label="Primary" value={g.primaryHsl} onChange={(v) => updateGlobal("primaryHsl", v)} />
              <TextField label="Accent" value={g.accentHsl} onChange={(v) => updateGlobal("accentHsl", v)} />
              <TextField label="Background" value={g.backgroundHsl} onChange={(v) => updateGlobal("backgroundHsl", v)} />
              <TextField label="Foreground" value={g.foregroundHsl} onChange={(v) => updateGlobal("foregroundHsl", v)} />
              <TextField label="Card" value={g.cardHsl} onChange={(v) => updateGlobal("cardHsl", v)} />
              <TextField label="Border" value={g.borderHsl} onChange={(v) => updateGlobal("borderHsl", v)} />
              <TextField label="Muted foreground" value={g.mutedForegroundHsl} onChange={(v) => updateGlobal("mutedForegroundHsl", v)} />
              <TextField label="Sidebar background" value={g.sidebarBgHsl} onChange={(v) => updateGlobal("sidebarBgHsl", v)} />
              <TextField label="Sidebar foreground" value={g.sidebarFgHsl} onChange={(v) => updateGlobal("sidebarFgHsl", v)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <BoolField label="Page title gradient" checked={g.pageTitleGradient} onChange={(v) => updateGlobal("pageTitleGradient", v)} />
              <BoolField label="Mesh background" checked={g.meshBackground} onChange={(v) => updateGlobal("meshBackground", v)} />
              <BoolField label="Card backdrop blur" checked={g.cardBackdropBlur} onChange={(v) => updateGlobal("cardBackdropBlur", v)} hint="Can cause scroll lag" />
              <BoolField label="Sticky bar backdrop blur" checked={g.stickyBackdropBlur} onChange={(v) => updateGlobal("stickyBackdropBlur", v)} />
              <BoolField label="Card shadow" checked={g.cardShadow} onChange={(v) => updateGlobal("cardShadow", v)} />
              <BoolField
                label="Card hover highlight"
                checked={g.cardHoverHighlight}
                onChange={(v) => updateGlobal("cardHoverHighlight", v)}
                hint="Primary-tinted border on hover"
              />
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
          </TabsContent>

          <TabsContent value="concept" className="mt-4 space-y-4">
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
              <ColorField label="Paragraph color" value={c.paragraphColor} onChange={(v) => updateCd("paragraphColor", v)} />
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
          </TabsContent>

          <TabsContent value="story" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Story-based learning · {deviceMeta[editDevice].label}
              </p>
              <div className="flex flex-wrap gap-2">
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
              <NumberField
                label="Border radius (px)"
                value={s.borderRadiusPx}
                min={0}
                max={24}
                onChange={(n) => updateSbl("borderRadiusPx", n)}
              />
              <NumberField
                label="Content padding (px)"
                value={s.contentPaddingPx}
                min={8}
                max={40}
                onChange={(n) => updateSbl("contentPaddingPx", n)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField label="Title color" value={s.titleColor} onChange={(v) => updateSbl("titleColor", v)} />
              <ColorField label="Body color" value={s.bodyColor} onChange={(v) => updateSbl("bodyColor", v)} />
              <ColorField label="Heading color" value={s.headingColor} onChange={(v) => updateSbl("headingColor", v)} />
              <ColorField label="Link color" value={s.linkColor} onChange={(v) => updateSbl("linkColor", v)} />
              <ColorField
                label="Background"
                value={s.backgroundColor}
                onChange={(v) => updateSbl("backgroundColor", v)}
              />
              <ColorField label="Panel background" value={s.panelBg} onChange={(v) => updateSbl("panelBg", v)} />
              <ColorField label="Accent" value={s.accentColor} onChange={(v) => updateSbl("accentColor", v)} />
              <ColorField label="Border" value={s.borderColor} onChange={(v) => updateSbl("borderColor", v)} />
            </div>
            <div className="story-based-learning space-y-2">
              <p className="text-xs font-semibold uppercase opacity-70">Live story preview</p>
              <h2 style={{ color: "var(--sbl-heading-color)", fontSize: "1.15em" }}>Story heading sample</h2>
              <p>
                Body text with <strong>bold</strong> and a <a href="#sbl">link</a> — uses current device draft.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                All questions · {deviceMeta[editDevice].label}
              </p>
              <div className="flex flex-wrap gap-2">
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

            <div className="all-questions-list max-w-lg">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Live paper preview</p>
              <article className="question-paper">
                <header className="question-paper-header flex justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="question-paper-meta uppercase tracking-widest font-medium">Question 1</p>
                    <p className="question-paper-taxonomy">Anatomy · CVS · Heart · Valves</p>
                    <p className="question-paper-concept font-semibold">Mitral valve</p>
                    <span className="question-paper-board-badge inline-block border px-1.5 rounded-sm">BMDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="question-paper-badge uppercase border px-1.5 rounded-sm">mcq</span>
                    <span className="question-paper-marks tabular-nums">1 mark(s)</span>
                  </div>
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
                  <p className="question-paper-expl-title">{aq.explanationTitle || "Explanations"}</p>
                  <div className="question-paper-expl-item">
                    <span className="question-paper-expl-label">1. (F):</span> Mitral valve has two cusps, not three.
                  </div>
                  <div className="question-paper-expl-item">
                    <span className="question-paper-expl-label">2. (T):</span> It guards the left atrioventricular orifice.
                  </div>
                </div>
              </article>
            </div>
          </TabsContent>

          <TabsContent value="landing" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Public landing page (shared). Edit colors, section copy, and FAQ. Save to database to publish.
            </p>

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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField label="Background color 1" value={lp.bgColor1} onChange={(v) => updateLandingPage("bgColor1", v)} />
                <ColorField label="Background color 2" value={lp.bgColor2} onChange={(v) => updateLandingPage("bgColor2", v)} />
                <ColorField label="Background color 3" value={lp.bgColor3} onChange={(v) => updateLandingPage("bgColor3", v)} />
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
            ) : null}

            {landingSection === "featured" ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Featured Track card — light by default (shine/tilt off) to avoid lag. Prefer Fade + short
                  transition. Shine &amp; 3D tilt are heavier; enable only if needed.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <BoolField
                    label="Autoplay slides"
                    checked={lp.featuredAutoplay}
                    onChange={(v) => updateLandingPage("featuredAutoplay", v)}
                    hint="Rotate featured courses automatically"
                  />
                  <NumberField
                    label="Slide interval (seconds)"
                    value={lp.featuredIntervalSec}
                    min={1}
                    max={30}
                    step={0.5}
                    onChange={(n) => updateLandingPage("featuredIntervalSec", n)}
                    hint="How long each course stays before switching"
                  />
                  <NumberField
                    label="Transition duration (seconds)"
                    value={lp.featuredTransitionSec}
                    min={0.1}
                    max={3}
                    step={0.05}
                    onChange={(n) => updateLandingPage("featuredTransitionSec", n)}
                    hint="Fade / slide / scale animation length"
                  />
                  <Field label="Transition style">
                    <Select
                      value={lp.featuredTransition}
                      onValueChange={(v) =>
                        updateLandingPage("featuredTransition", v as "fade" | "slide" | "scale")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Slide</SelectItem>
                        <SelectItem value="scale">Scale</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <NumberField
                    label="Max slides"
                    value={lp.featuredMaxSlides}
                    min={1}
                    max={8}
                    step={1}
                    onChange={(n) => updateLandingPage("featuredMaxSlides", Math.round(n))}
                  />
                  <BoolField
                    label="Shine animation"
                    checked={lp.featuredShineEnabled}
                    onChange={(v) => updateLandingPage("featuredShineEnabled", v)}
                  />
                  <NumberField
                    label="Shine loop (seconds)"
                    value={lp.featuredShineSec}
                    min={1}
                    max={20}
                    step={0.5}
                    onChange={(n) => updateLandingPage("featuredShineSec", n)}
                    hint="One full shine sweep duration"
                  />
                  <BoolField
                    label="3D tilt"
                    checked={lp.featuredTiltEnabled}
                    onChange={(v) => updateLandingPage("featuredTiltEnabled", v)}
                  />
                  <BoolField
                    label="Hover lift"
                    checked={lp.featuredHoverLift}
                    onChange={(v) => updateLandingPage("featuredHoverLift", v)}
                  />
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
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-3">
            <BoolField label="Smooth scroll" checked={p.smoothScroll} onChange={(v) => updatePerf("smoothScroll", v)} hint="Shared across all devices — often laggy" />
            <BoolField label="Reduce motion" checked={p.reduceMotion} onChange={(v) => updatePerf("reduceMotion", v)} />
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Preview uses the live viewport device ({deviceMeta[activeDevice].label}). Editing {deviceMeta[editDevice].label}.
              Still unsaved until you click Save to database.
            </p>
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
