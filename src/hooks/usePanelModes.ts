import { useUiAppearance } from "@/components/UiAppearanceProvider";
import type { PanelModesAppearance } from "@/lib/uiAppearance";

export function usePanelModes(): PanelModesAppearance {
  return useUiAppearance().appearance.panelModes;
}
