import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type QuestionRow = {
  id: string;
  createdAt: string;
  subject: string;
  system: string;
  topic: string;
  concept: string;
  questionMode: "mcq" | "sba";
  metadata?: { status?: string; difficulty?: string };
  mcq?: { stem?: string } | null;
  sba?: { stem?: string } | null;
};

export default function AllQuestions() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (type !== "all") qs.set("type", type);
      if (status !== "all") qs.set("status", status);
      if (difficulty !== "all") qs.set("difficulty", difficulty);
      const resp = await fetch(`/api/questions?${qs.toString()}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Load failed");
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [search, type, status, difficulty]);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const resp = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Question deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const resultCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">All Questions</h1>
        <Badge variant="secondary">{resultCount} items</Badge>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by subject/system/topic/concept" />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="sba">SBA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No questions found</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{r.questionMode.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{r.concept || "Untitled concept"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.subject} {"->"} {r.system} {"->"} {r.topic}
                  </div>
                  <div className="text-sm line-clamp-2">{r.mcq?.stem || r.sba?.stem || "No stem"}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} disabled={deletingId === r.id} aria-label="Delete question">
                  {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

