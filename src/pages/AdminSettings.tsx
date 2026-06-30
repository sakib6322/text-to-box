import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronRight, Home, Loader2, Trash2 } from "lucide-react";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { apiUrl } from "@/lib/apiBase";
import { DatabaseConnectionPanel } from "@/components/DatabaseConnectionPanel";
import { GeminiKeysPanel } from "@/components/GeminiKeysPanel";

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
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [parents, setParents] = useState<TaxonomyItem[]>([]);
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    const n = name.trim();
    if (!n) return toast.error("Enter a name");
    if (parentLevel && !parentId) return toast.error(`Select ${parentLabel}`);
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/${level}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setDeleting(id);
    try {
      const r = await fetch(apiUrl(`/api/taxonomy/${level}/${encodeURIComponent(id)}`), { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to delete");
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success("Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
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
          />
        </div>
        <Button type="button" onClick={add} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add {label.toLowerCase()}
        </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(item.id)}
                disabled={deleting === item.id}
              >
                {deleting === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BoardsSection() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    const n = name.trim();
    if (!n) return toast.error("Enter a board name");
    setSaving(true);
    try {
      const r = await fetch(apiUrl("/api/boards"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setDeleting(id);
    try {
      const r = await fetch(apiUrl(`/api/boards/${encodeURIComponent(id)}`), { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Failed to delete");
      setBoards((prev) => prev.filter((b) => b.id !== id));
      toast.success("Board removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(null);
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
          />
        </div>
        <Button type="button" onClick={addBoard} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add board
        </Button>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => remove(b.id)}
                disabled={deleting === b.id}
              >
                {deleting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminSettings() {
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

        <Tabs defaultValue="subjects">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="gemini">Gemini API</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="systems">Systems</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="boards">Boards</TabsTrigger>
          </TabsList>
          <TabsContent value="connection" className="mt-4">
            <DatabaseConnectionPanel />
          </TabsContent>
          <TabsContent value="gemini" className="mt-4">
            <GeminiKeysPanel />
          </TabsContent>
          <TabsContent value="subjects" className="mt-4">
            <TaxonomySection level="subjects" label="Subject" />
          </TabsContent>
          <TabsContent value="systems" className="mt-4">
            <TaxonomySection level="systems" label="System" parentLevel="subjects" parentLabel="Parent subject" />
          </TabsContent>
          <TabsContent value="chapters" className="mt-4">
            <TaxonomySection level="chapters" label="Chapter" parentLevel="systems" parentLabel="Parent system" />
          </TabsContent>
          <TabsContent value="topics" className="mt-4">
            <TaxonomySection level="topics" label="Topic" parentLevel="chapters" parentLabel="Parent chapter" />
          </TabsContent>
          <TabsContent value="boards" className="mt-4">
            <BoardsSection />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
