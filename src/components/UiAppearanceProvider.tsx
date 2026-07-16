import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/apiBase";
import {
  applyUiAppearance,
  defaultUiAppearance,
  detectDeviceKey,
  mergeUiAppearance,
  type DeviceKey,
  type UiAppearance,
} from "@/lib/uiAppearance";

type Ctx = {
  appearance: UiAppearance;
  loading: boolean;
  source: "default" | "database";
  storage?: string;
  activeDevice: DeviceKey;
  editDevice: DeviceKey;
  setEditDevice: (d: DeviceKey) => void;
  refresh: () => Promise<void>;
  setLocal: (next: UiAppearance) => void;
  save: (next: UiAppearance) => Promise<{ warning?: string; storage?: string }>;
  reset: () => Promise<void>;
};

const UiAppearanceContext = createContext<Ctx | null>(null);

export function UiAppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<UiAppearance>(defaultUiAppearance);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"default" | "database">("default");
  const [storage, setStorage] = useState<string | undefined>();
  const [activeDevice, setActiveDevice] = useState<DeviceKey>(() => detectDeviceKey());
  const [editDevice, setEditDevice] = useState<DeviceKey>(() => detectDeviceKey());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/settings/appearance"));
      const data = (await res.json().catch(() => ({}))) as {
        appearance?: unknown;
        source?: string;
        storage?: string;
        warning?: string;
        error?: string;
      };
      if (res.ok && data.appearance) {
        const merged = mergeUiAppearance(data.appearance);
        setAppearance(merged);
        setSource(data.source === "database" ? "database" : "default");
        setStorage(data.storage);
        applyUiAppearance(merged, detectDeviceKey());
      } else {
        const d = defaultUiAppearance();
        setAppearance(d);
        applyUiAppearance(d, detectDeviceKey());
      }
    } catch {
      applyUiAppearance(defaultUiAppearance(), detectDeviceKey());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onResize = () => {
      const next = detectDeviceKey();
      setActiveDevice(next);
      applyUiAppearance(appearance, next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [appearance]);

  const setLocal = useCallback(
    (next: UiAppearance) => {
      setAppearance(next);
      applyUiAppearance(next, detectDeviceKey());
    },
    [],
  );

  const save = useCallback(async (next: UiAppearance) => {
    const res = await fetch(apiUrl("/api/settings/appearance"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = (await res.json().catch(() => ({}))) as {
      appearance?: unknown;
      storage?: string;
      warning?: string;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);
    const merged = mergeUiAppearance(data.appearance ?? next);
    setAppearance(merged);
    setSource("database");
    setStorage(data.storage);
    applyUiAppearance(merged, detectDeviceKey());
    if (data.warning) console.warn(data.warning);
    return { warning: data.warning, storage: data.storage };
  }, []);

  const reset = useCallback(async () => {
    const res = await fetch(apiUrl("/api/settings/appearance/reset"), { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { appearance?: unknown; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Reset failed");
    const merged = mergeUiAppearance(data.appearance ?? defaultUiAppearance());
    setAppearance(merged);
    setSource("default");
    setStorage(undefined);
    applyUiAppearance(merged, detectDeviceKey());
  }, []);

  const value = useMemo(
    () => ({
      appearance,
      loading,
      source,
      storage,
      activeDevice,
      editDevice,
      setEditDevice,
      refresh,
      setLocal,
      save,
      reset,
    }),
    [appearance, loading, source, storage, activeDevice, editDevice, refresh, setLocal, save, reset],
  );

  return <UiAppearanceContext.Provider value={value}>{children}</UiAppearanceContext.Provider>;
}

export function useUiAppearance() {
  const ctx = useContext(UiAppearanceContext);
  if (!ctx) throw new Error("useUiAppearance must be used within UiAppearanceProvider");
  return ctx;
}
