import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { emptyTaxonomySelection, type TaxonomySelection } from "@/lib/taxonomy";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";

type ConceptRow = {
  id: string;
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
  topic_id: string | null;
  created_at?: string;
  key_point_count?: number;
};

function compactTaxonomy(c: ConceptRow): string {
  return [c.subject, c.system, c.chapter, c.topic].filter((x) => (x ?? "").trim()).join(" → ");
}

function formatWhen(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function resolveTaxonomy(topicId: string): Promise<TaxonomySelection> {
  const r = await fetch(apiUrl(`/api/taxonomy/resolve/${encodeURIComponent(topicId)}`));
  const j = (await r.json().catch(() => ({}))) as {
    subject?: { id: string; name: string } | null;
    system?: { id: string; name: string } | null;
    chapter?: { id: string; name: string } | null;
    topic?: { id: string; name: string } | null;
    error?: string;
  };
  if (!r.ok) throw new Error(j.error ?? "Failed to resolve taxonomy");
  return {
    subjectId: j.subject?.id ?? "",
    systemId: j.system?.id ?? "",
    chapterId: j.chapter?.id ?? "",
    topicId: j.topic?.id ?? "",
    subjectName: j.subject?.name ?? "",
    systemName: j.system?.name ?? "",
    chapterName: j.chapter?.name ?? "",
    topicName: j.topic?.name ?? "",
  };
}

export function ConceptsPanel() {
  const [concepts, setConcepts] = useState<ConceptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConceptRow | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ConceptRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTaxonomy, setEditTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection());
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async (searchTerm = "") => {
    setLoading(true);
    try {
      const qs = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
      const r = await fetch(apiUrl(`/api/concepts${qs}`));
      const j = (await r.json().catch(() => ({}))) as { concepts?: ConceptRow[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? `Failed (${r.status})`);
      setConcepts(Array.isArray(j.concepts) ? j.concepts : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load concepts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("");
  }, [load]);

  const openEdit = async (row: ConceptRow) => {
    setEditTarget(row);
    setEditTitle((row.title ?? "").trim());
    setEditTaxonomy(emptyTaxonomySelection());
    setEditOpen(true);
    setLoadingEdit(true);
    try {
      if (row.topic_id) {
        setEditTaxonomy(await resolveTaxonomy(row.topic_id));
      }
    } catch {
      /* taxonomy optional for edit */
    } finally {
      setLoadingEdit(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const title = editTitle.trim();
    if (!title) return toast.error("Concept title is required");
    setSavingEdit(true);
    try {
      const r = await apiFetch(`/api/concepts/${encodeURIComponent(editTarget.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject: editTaxonomy.subjectName || null,
          system: editTaxonomy.systemName || null,
          chapter: editTaxonomy.chapterName || null,
          topic: editTaxonomy.topicName || null,
          topic_id: editTaxonomy.topicId || null,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { concept?: ConceptRow; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      const updated = j.concept;
      if (updated) {
        setConcepts((prev) =>
          prev.map((c) =>
            c.id === editTarget.id
              ? {
                  ...c,
                  ...updated,
                  key_point_count: c.key_point_count,
                }
              : c,
          ),
        );
      } else {
        await load(search);
      }
      toast.success("Concept updated");
      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async (row: ConceptRow) => {
    setDeletingId(row.id);
    try {
      const r = await apiFetch(`/api/concepts/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      setConcepts((prev) => prev.filter((c) => c.id !== row.id));
      toast.success("Concept deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Saved concepts from the Medical Concept Builder and question approvals. Deleting a concept also removes its key
        points.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="concept-search">Search</Label>
          <Input
            id="concept-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or taxonomy…"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), load(search))}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => load(search)} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading concepts…
        </div>
      ) : concepts.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">No concepts found.</p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concept</TableHead>
                <TableHead className="hidden md:table-cell">Taxonomy</TableHead>
                <TableHead className="text-center w-24">Points</TableHead>
                <TableHead className="hidden lg:table-cell w-40">Created</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concepts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium max-w-[220px]">
                    <span className="line-clamp-2">{(c.title ?? "").trim() || "Untitled"}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-xs max-w-[280px]">
                    <span className="line-clamp-2">{compactTaxonomy(c) || "—"}</span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{c.key_point_count ?? 0}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{formatWhen(c.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit concept">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        disabled={deletingId === c.id}
                        aria-label="Delete concept"
                      >
                        {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete concept?"
        description={
          deleteTarget ? (
            <>
              <strong>{(deleteTarget.title ?? "").trim() || "Untitled"}</strong> and all{" "}
              <strong>{deleteTarget.key_point_count ?? 0}</strong> key point(s) will be permanently removed.
            </>
          ) : null
        }
        confirming={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
      />

      <Dialog open={editOpen} onOpenChange={(open) => !open && (setEditOpen(false), setEditTarget(null))}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit concept</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-concept-title">Title</Label>
              <Input
                id="edit-concept-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Concept title"
              />
            </div>
            <div className="space-y-2">
              <Label>Taxonomy</Label>
              {loadingEdit ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading taxonomy…
                </div>
              ) : (
                <TaxonomySelects value={editTaxonomy} onChange={setEditTaxonomy} />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit || !editTitle.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
