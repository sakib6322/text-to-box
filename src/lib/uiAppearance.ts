/**
 * UI Master — per-device (mobile / tablet / desktop) appearance.
 * Stored in public.ui_appearance.config (jsonb), fallback app_settings.ui_appearance
 */

export type DeviceKey = "mobile" | "tablet" | "desktop";

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

export type DeviceAppearance = {
  global: GlobalAppearance;
  conceptDetails: ConceptDetailsAppearance;
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
};

export const UI_APPEARANCE_KEY = "ui_appearance";
export const DEVICE_KEYS: DeviceKey[] = ["mobile", "tablet", "desktop"];

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

function defaultDevice(kind: DeviceKey): DeviceAppearance {
  if (kind === "mobile") {
    return {
      global: defaultGlobal({ baseFontSizePx: 15, contentMaxWidthPx: 512, density: "compact" }),
      conceptDetails: defaultConcept({ fontSizePx: 14, heading1SizePx: 20, heading2SizePx: 17, heading3SizePx: 15 }),
    };
  }
  if (kind === "tablet") {
    return {
      global: defaultGlobal({ baseFontSizePx: 16, contentMaxWidthPx: 840 }),
      conceptDetails: defaultConcept({ fontSizePx: 15, heading1SizePx: 22, heading2SizePx: 18 }),
    };
  }
  return {
    global: defaultGlobal({ baseFontSizePx: 16, contentMaxWidthPx: 1120, density: "comfortable" }),
    conceptDetails: defaultConcept({ fontSizePx: 15, heading1SizePx: 24, heading2SizePx: 20, heading3SizePx: 17 }),
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
  };
}

function mergeDevice(base: DeviceAppearance, patch: unknown): DeviceAppearance {
  const p = (patch && typeof patch === "object" ? patch : {}) as Partial<DeviceAppearance>;
  return {
    global: { ...base.global, ...(p.global ?? {}) },
    conceptDetails: { ...base.conceptDetails, ...(p.conceptDetails ?? {}) },
  };
}

/** Migrate v1 flat theme → v2 per-device */
function fromV1(raw: Record<string, unknown>): UiAppearance {
  const base = defaultUiAppearance();
  const global = (raw.global && typeof raw.global === "object" ? raw.global : {}) as Partial<GlobalAppearance>;
  const conceptDetails = (
    raw.conceptDetails && typeof raw.conceptDetails === "object" ? raw.conceptDetails : {}
  ) as Partial<ConceptDetailsAppearance>;
  const performance = (
    raw.performance && typeof raw.performance === "object" ? raw.performance : {}
  ) as Partial<UiAppearance["performance"]>;
  const sharedDevice: DeviceAppearance = {
    global: { ...base.desktop.global, ...global },
    conceptDetails: { ...base.desktop.conceptDetails, ...conceptDetails },
  };
  return {
    version: 2,
    mobile: {
      global: { ...sharedDevice.global, contentMaxWidthPx: 512, density: "compact" },
      conceptDetails: sharedDevice.conceptDetails,
    },
    tablet: {
      global: { ...sharedDevice.global, contentMaxWidthPx: 840 },
      conceptDetails: sharedDevice.conceptDetails,
    },
    desktop: sharedDevice,
    performance: { ...base.performance, ...performance },
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

  root.dataset.pageTitleGradient = g.pageTitleGradient ? "1" : "0";
  root.dataset.meshBg = g.meshBackground ? "1" : "0";
  root.dataset.cardBlur = g.cardBackdropBlur ? "1" : "0";
  root.dataset.stickyBlur = g.stickyBackdropBlur ? "1" : "0";
  root.dataset.cardShadow = g.cardShadow ? "1" : "0";
  root.dataset.density = g.density;
  root.dataset.uiDevice = device;
  root.dataset.smoothScroll = p.smoothScroll ? "1" : "0";
  root.dataset.reduceMotion = p.reduceMotion ? "1" : "0";

  root.style.fontFamily = g.fontFamily;
  root.style.fontSize = `${g.baseFontSizePx}px`;
  root.style.lineHeight = String(g.lineHeight);
  root.style.scrollBehavior = p.smoothScroll ? "smooth" : "auto";
}
