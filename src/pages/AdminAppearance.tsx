import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home, Loader2, Monitor, RotateCcw, Save, Smartphone, Tablet } from "lucide-react";
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
  type DeviceKey,
  type UiAppearance,
} from "@/lib/uiAppearance";

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

  const updatePerf = <K extends keyof UiAppearance["performance"]>(
    key: K,
    value: UiAppearance["performance"][K],
  ) => {
    commit({ ...theme, performance: { ...theme.performance, [key]: value } });
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
      <div className="concept-detail-rich space-y-3 rounded-lg border p-4" style={{ background: "hsl(var(--card))" }}>
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
