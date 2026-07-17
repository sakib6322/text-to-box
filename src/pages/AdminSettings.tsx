import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronRight, Home, Loader2, Pencil, Trash2 } from "lucide-react";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { apiUrl } from "@/lib/apiBase";
import { DatabaseConnectionPanel } from "@/components/DatabaseConnectionPanel";
import { GeminiKeysPanel } from "@/components/GeminiKeysPanel";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { AIPromptsPanel } from "@/components/AIPromptsPanel";
import { ConceptsPanel } from "@/components/ConceptsPanel";
import { AccessManagementPanel } from "@/components/AccessManagementPanel";
import { hasPermission, isAdmin, getAuthHeaders } from "@/lib/auth";
import { SETTINGS_TAB_PERMISSION } from "@/lib/permissions";
import { guardPermission } from "@/lib/permissionGuard";
import { settingsLevelPerm } from "@/lib/permissionGuard";
import { Can, useCan } from "@/components/Can";

type BoardRow = { id: string; name: string; created_at?: string };

function TaxonomySection({
  level,
  label,
  parentLevel,
  parentLabel,
}: {
  level: "subjects" | "systems" | "chapters" | "topics";
  label: string;
  parentLevel?: "subjects" | "systems" | "chapters";
  parentLabel?: string;
}) {
  const permAdd = settingsLevelPerm(level, "add");
  const permEdit = settingsLevelPerm(level, "edit");
  const permDelete = settingsLevelPerm(level, "delete");
  const canAdd = useCan(permAdd);
  const canEdit = useCan(permEdit);
  const canDelete = useCan(permDelete);

  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [parents, setParents] = useState<TaxonomyItem[]>([]);
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      if (parentLevel) {
        const p = await fetchTaxonomy(parentLevel);
        setParents(p);
        const pid = parentId || p[0]?.id || "";
        if (!parentId && pid) setParentId(pid);
        if (pid) setItems(await fetchTaxonomy(level, pid));
        else setItems([]);
      } else {
        setItems(await fetchTaxonomy(level));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to load ${label}`);
    } finally {
      setLoading(false);
    }
  }, [level, label, parentLevel, parentId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const add = async () => {
    if (!guardPermission(permAdd)) return;
    const n = name.trim();
    if (!n) return toast.error("Enter a name");
    if (parentLevel && !parentId) return toast.error(`Select ${parentLabel}`);
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/${level}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: n, parent_id: parentId || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { item?: TaxonomyItem; error?: unknown };
      if (!r.ok) {
        let errMsg =
          typeof j?.error === "string" ? j.error : j?.error != null ? JSON.stringify(j.error) : "";
        if (!errMsg && r.status === 404) {
          errMsg =
            "API returned 404 — start the API with npm run dev, or add VITE_API_URL=http://localhost:8787 to .env";
        }
        if (!errMsg) errMsg = `Request failed (${r.status})`;
        throw new Error(errMsg);
      }
      setName("");
      await loadItems();
      toast.success(`${label} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!guardPermission(permDelete)) return;
    setDeleting(id);
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/${level}/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to delete");
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Removed");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  
  const openEdit = (item: TaxonomyItem) => {
    if (!guardPermission(permEdit)) return;
    setEditTarget({ id: item.id, name: item.name });
    setEditName(item.name);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!guardPermission(permEdit)) return;
    const n = editName.trim();
    if (!n) return toast.error("Enter a name");
    setSavingEdit(true);
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/${level}/${encodeURIComponent(editTarget.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: n }),
      });
      const j = (await r.json().catch(() => ({}))) as { item?: TaxonomyItem; error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Update failed");
      setItems((prev) => prev.map((x) => (x.id === editTarget.id ? { ...x, name: n } : x)));
      toast.success("Updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      {parentLevel ? (
        <div className="max-w-sm space-y-2">
          <Label>{parentLabel}</Label>
          <Select value={parentId || undefined} onValueChange={setParentId}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${parentLabel?.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {parents.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label>New {label.toLowerCase()} name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. ${label} name`}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
            disabled={!canAdd}
          />
        </div>
        <Can permission={permAdd}>
        <Button type="button" onClick={add} disabled={saving || !canAdd}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add {label.toLowerCase()}
        </Button>
        </Can>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-6">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">No items yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{item.name}</span>
              <div className="flex gap-1">
                {canEdit ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                ) : null}
                {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                  disabled={deleting === item.id}
                >
                  {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${label.toLowerCase()}?`}
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.name}</strong> will be permanently removed.
            </>
          ) : null
        }
        confirming={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />
      <EditItemDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title={`Edit ${label.toLowerCase()}`}
        label="Name"
        value={editName}
        onChange={setEditName}
        onSave={saveEdit}
        saving={savingEdit}
      />
    </div>
  );
}

function BoardsSection() {
  const permAdd = settingsLevelPerm("boards", "add");
  const permEdit = settingsLevelPerm("boards", "edit");
  const permDelete = settingsLevelPerm("boards", "delete");
  const canAdd = useCan(permAdd);
  const canEdit = useCan(permEdit);
  const canDelete = useCan(permDelete);

  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/boards"));
      const j = (await r.json().catch(() => ({}))) as { boards?: BoardRow[]; error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to load boards");
      setBoards(Array.isArray(j.boards) ? j.boards : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load boards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addBoard = async () => {
    if (!guardPermission(permAdd)) return;
    const n = name.trim();
    if (!n) return toast.error("Enter a board name");
    setSaving(true);
    try {
      const r = await fetch(apiUrl("/api/boards"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: n }),
      });
      const j = (await r.json().catch(() => ({}))) as { board?: BoardRow; error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to create board");
      if (j.board) setBoards((prev) => [...prev, j.board!].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      toast.success("Board added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create board");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!guardPermission(permDelete)) return;
    setDeleting(id);
    try {
      const r = await fetch(apiUrl(`/api/boards/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to delete");
      setBoards((prev) => prev.filter((b) => b.id !== id));
      toast.success("Board removed");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (board: BoardRow) => {
    if (!guardPermission(permEdit)) return;
    setEditTarget({ id: board.id, name: board.name });
    setEditName(board.name);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!guardPermission(permEdit)) return;
    const n = editName.trim();
    if (!n) return toast.error("Enter a board name");
    setSavingEdit(true);
    try {
      const r = await fetch(apiUrl(`/api/boards/${encodeURIComponent(editTarget.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name: n }),
      });
      const j = (await r.json().catch(() => ({}))) as { board?: BoardRow; error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Update failed");
      setBoards((prev) =>
        prev.map((b) => (b.id === editTarget.id ? { ...b, name: n } : b)).sort((a, c) => a.name.localeCompare(c.name)),
      );
      toast.success("Board updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Exam boards linked to concepts. More approvals on a board increase ranking on the Suggestions page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="new-board">New board name</Label>
          <Input
            id="new-board"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. BMDC, FCPS Part-1"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBoard())}
            disabled={!canAdd}
          />
        </div>
        <Can permission={permAdd}>
        <Button type="button" onClick={addBoard} disabled={saving || !canAdd}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add board
        </Button>
        </Can>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-6">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : boards.length === 0 ? (
        <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">No boards yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {boards.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{b.name}</span>
              <div className="flex gap-1">
                {canEdit ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(b)} aria-label={`Edit ${b.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                ) : null}
                {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ id: b.id, name: b.name })}
                  disabled={deleting === b.id}
                >
                  {deleting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete board?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.name}</strong> will be permanently removed.
            </>
          ) : null
        }
        confirming={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />
      <EditItemDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        title="Edit board"
        label="Board name"
        value={editName}
        onChange={setEditName}
        onSave={saveEdit}
        saving={savingEdit}
      />
    </div>
  );
}

const SETTINGS_TABS = [
  { value: "connection", label: "Connection", permission: SETTINGS_TAB_PERMISSION.connection },
  { value: "gemini", label: "Gemini API", permission: SETTINGS_TAB_PERMISSION.gemini },
  { value: "prompts", label: "AI Prompts", permission: SETTINGS_TAB_PERMISSION.prompts },
  { value: "subjects", label: "Subjects", permission: SETTINGS_TAB_PERMISSION.subjects },
  { value: "systems", label: "Systems", permission: SETTINGS_TAB_PERMISSION.systems },
  { value: "chapters", label: "Chapters", permission: SETTINGS_TAB_PERMISSION.chapters },
  { value: "topics", label: "Topics", permission: SETTINGS_TAB_PERMISSION.topics },
  { value: "concepts", label: "Concepts", permission: SETTINGS_TAB_PERMISSION.concepts },
  { value: "boards", label: "Boards", permission: SETTINGS_TAB_PERMISSION.boards },
  { value: "access", label: "Access", permission: SETTINGS_TAB_PERMISSION.access, adminOnly: true },
] as const;

export default function AdminSettings() {
  const visibleTabs = SETTINGS_TABS.filter((t) => {
    if (t.adminOnly) return isAdmin();
    return hasPermission(t.permission);
  });
  const defaultTab = visibleTabs[0]?.value ?? "connection";

  if (visibleTabs.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">You do not have permission to view any settings sections.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Settings</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/settings/appearance">Appearance · UI Master</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/question-bank/create-ai">Create Question (AI)</Link>
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage academic taxonomy (Subject → System → Chapter → Topic) and exam boards. These appear as dropdowns on
            Create Question and filters on Suggestions.
          </p>
        </div>

        <Tabs defaultValue={defaultTab} key={defaultTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {hasPermission(SETTINGS_TAB_PERMISSION.connection) ? (
            <TabsContent value="connection" className="mt-4">
              <DatabaseConnectionPanel />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.gemini) ? (
            <TabsContent value="gemini" className="mt-4">
              <GeminiKeysPanel />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.prompts) ? (
            <TabsContent value="prompts" className="mt-4">
              <AIPromptsPanel />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.subjects) ? (
            <TabsContent value="subjects" className="mt-4">
              <TaxonomySection level="subjects" label="Subject" />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.systems) ? (
            <TabsContent value="systems" className="mt-4">
              <TaxonomySection level="systems" label="System" parentLevel="subjects" parentLabel="Parent subject" />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.chapters) ? (
            <TabsContent value="chapters" className="mt-4">
              <TaxonomySection level="chapters" label="Chapter" parentLevel="systems" parentLabel="Parent system" />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.topics) ? (
            <TabsContent value="topics" className="mt-4">
              <TaxonomySection level="topics" label="Topic" parentLevel="chapters" parentLabel="Parent chapter" />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.concepts) ? (
            <TabsContent value="concepts" className="mt-4">
              <ConceptsPanel />
            </TabsContent>
          ) : null}
          {hasPermission(SETTINGS_TAB_PERMISSION.boards) ? (
            <TabsContent value="boards" className="mt-4">
              <BoardsSection />
            </TabsContent>
          ) : null}
          {isAdmin() ? (
            <TabsContent value="access" className="mt-4">
              <AccessManagementPanel />
            </TabsContent>
          ) : null}
        </Tabs>
      </Card>
    </div>
  );
}
