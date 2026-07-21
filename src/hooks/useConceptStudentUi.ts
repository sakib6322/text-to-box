import { useUiAppearance } from "@/components/UiAppearanceProvider";
import type { ConceptStudentUiAppearance } from "@/lib/uiAppearance";

export function useConceptStudentUi(): ConceptStudentUiAppearance {
  return useUiAppearance().appearance.conceptStudentUi;
}
