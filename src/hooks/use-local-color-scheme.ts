import { useCallback, useEffect, useState } from "react";
import {
  getLocalColorScheme,
  setLocalColorScheme,
  subscribeLocalColorScheme,
  type LocalColorScheme,
} from "@/lib/colorSchemeLocal";
import { applyUiAppearance, detectDeviceKey } from "@/lib/uiAppearance";
import { useUiAppearance } from "@/components/UiAppearanceProvider";

/** Device-local Dark / System preference (not in Appearance database). */
export function useLocalColorScheme() {
  const { appearance } = useUiAppearance();
  const [mode, setModeState] = useState<LocalColorScheme>(() => getLocalColorScheme());

  useEffect(() => subscribeLocalColorScheme(() => setModeState(getLocalColorScheme())), []);

  const setMode = useCallback(
    (next: LocalColorScheme) => {
      setLocalColorScheme(next);
      setModeState(next);
      applyUiAppearance(appearance, detectDeviceKey());
    },
    [appearance],
  );

  return { mode, setMode, isDarkForced: mode === "dark" };
}
