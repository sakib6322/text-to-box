import { getAppSetting } from "./appSettings.mjs";

export const UI_APPEARANCE_KEY = "ui_appearance";
export const UI_APPEARANCE_ROW_ID = "default";

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

function defaultDevice(kind) {
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

export function getDefaultUiAppearance() {
  return {
    version: 2,
    mobile: defaultDevice("mobile"),
    tablet: defaultDevice("tablet"),
    desktop: defaultDevice("desktop"),
    performance: { smoothScroll: false, reduceMotion: false },
  };
}

function mergeDevice(base, patch) {
  const p = patch && typeof patch === "object" ? patch : {};
  return {
    global: { ...base.global, ...(p.global ?? {}) },
    conceptDetails: { ...base.conceptDetails, ...(p.conceptDetails ?? {}) },
  };
}

function fromV1(raw) {
  const base = getDefaultUiAppearance();
  const global = raw?.global && typeof raw.global === "object" ? raw.global : {};
  const conceptDetails = raw?.conceptDetails && typeof raw.conceptDetails === "object" ? raw.conceptDetails : {};
  const performance = raw?.performance && typeof raw.performance === "object" ? raw.performance : {};
  const shared = {
    global: { ...base.desktop.global, ...global },
    conceptDetails: { ...base.desktop.conceptDetails, ...conceptDetails },
  };
  return {
    version: 2,
    mobile: {
      global: { ...shared.global, contentMaxWidthPx: 512, density: "compact" },
      conceptDetails: shared.conceptDetails,
    },
    tablet: {
      global: { ...shared.global, contentMaxWidthPx: 840 },
      conceptDetails: shared.conceptDetails,
    },
    desktop: shared,
    performance: { ...base.performance, ...performance },
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
