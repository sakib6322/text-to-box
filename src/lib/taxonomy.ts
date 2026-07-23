import { apiUrl } from "@/lib/apiBase";

export type TaxonomyItem = {
  id: string;
  name: string;
  sort_order?: number;
  created_at?: string;
  /** Optional secondary line (e.g. progress %) */
  subtitle?: string;
};

export type TaxonomySelection = {
  subjectId: string;
  systemId: string;
  chapterId: string;
  topicId: string;
  subjectName: string;
  systemName: string;
  chapterName: string;
  topicName: string;
};

export const emptyTaxonomySelection = (): TaxonomySelection => ({
  subjectId: "",
  systemId: "",
  chapterId: "",
  topicId: "",
  subjectName: "",
  systemName: "",
  chapterName: "",
  topicName: "",
});

const taxonomyMem = new Map<string, { at: number; items: TaxonomyItem[] }>();

export async function fetchTaxonomy(level: "subjects" | "systems" | "chapters" | "topics", parentId?: string) {
  const key = `tax:${level}:${parentId ?? ""}`;
  const hit = taxonomyMem.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.items;

  const qs = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : "";
  const r = await fetch(apiUrl(`/api/taxonomy/${level}${qs}`));
  const j = (await r.json().catch(() => ({}))) as { items?: TaxonomyItem[]; error?: string };
  const msg =
    typeof j?.error === "string"
      ? j.error
      : !r.ok && r.status === 404
        ? "API returned 404. Run npm run dev (starts API on :8787) or set VITE_API_URL=http://localhost:8787 in .env and restart vite."
        : `Failed to load ${level} (${r.status})`;
  if (!r.ok) throw new Error(msg);
  const items = Array.isArray(j.items) ? j.items : [];
  taxonomyMem.set(key, { at: Date.now(), items });
  return items;
}
