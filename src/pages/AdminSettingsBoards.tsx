import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight, Home, Loader2, Trash2 } from "lucide-react";

type BoardRow = { id: string; name: string; created_at?: string };

export default function AdminSettingsBoards() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/boards");
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
      const r = await fetch("/api/boards", {
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
      const r = await fetch(`/api/boards/${encodeURIComponent(id)}`, { method: "DELETE" });
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
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Link to="/admin" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-4 w-4" />
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Settings · Boards</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/question-bank/create-ai">Create Question (AI)</Link>
        </Button>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-sky-900 dark:text-sky-100">Boards</h1>
          <p className="mt-2 text-muted-foreground">
            Boards you create here appear as checkboxes on Create Question (AI). Approving a concept point links the
            selected boards to that concept in the database.
          </p>
        </div>

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
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : boards.length === 0 ? (
          <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-8 text-center">
            No boards yet. Add one above.
          </p>
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
                  aria-label={`Delete ${b.name}`}
                >
                  {deleting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
