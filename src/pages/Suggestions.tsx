import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, TrendingUp } from "lucide-react";

type ConceptJoin = {
  title: string | null;
  subject: string | null;
  system: string | null;
  topic: string | null;
  concept_boards?: { board_id: string; boards: { id: string; name: string } | null }[] | null;
} | null;

type Row = {
  id: string;
  content: string;
  language: string | null;
  increment_count: number;
  concept_id: string;
  concepts?: ConceptJoin;
};

function compactTaxonomy(c: ConceptJoin): string {
  if (!c) return "";
  const parts = [c.subject, c.system, c.topic].map((x) => (x ?? "").trim()).filter(Boolean);
  return parts.join(" → ");
}

const Suggestions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [systemFilter, setSystemFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("key_points")
      .select(
        `
        id,
        content,
        language,
        increment_count,
        concept_id,
        concepts (
          title,
          subject,
          system,
          topic,
          concept_boards (
            board_id,
            boards ( id, name )
          )
        )
      `,
      )
      .order("increment_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (row: Row) => {
    setDeleting(row.id);
    const { error } = await supabase.from("key_points").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Deleted");
    }
    setDeleting(null);
  };

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = (r.concepts?.subject ?? "").trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const systemOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (subjectFilter !== "all" && (r.concepts?.subject ?? "").trim() !== subjectFilter) continue;
      const s = (r.concepts?.system ?? "").trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, subjectFilter]);

  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (subjectFilter !== "all" && (r.concepts?.subject ?? "").trim() !== subjectFilter) continue;
      if (systemFilter !== "all" && (r.concepts?.system ?? "").trim() !== systemFilter) continue;
      const t = (r.concepts?.topic ?? "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, subjectFilter, systemFilter]);

  const conceptTitleOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (subjectFilter !== "all" && (r.concepts?.subject ?? "").trim() !== subjectFilter) continue;
      if (systemFilter !== "all" && (r.concepts?.system ?? "").trim() !== systemFilter) continue;
      if (topicFilter !== "all" && (r.concepts?.topic ?? "").trim() !== topicFilter) continue;
      const t = (r.concepts?.title ?? "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, subjectFilter, systemFilter, topicFilter]);

  const boardOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const links = r.concepts?.concept_boards ?? [];
      for (const l of links) {
        const id = l.boards?.id ?? l.board_id;
        const name = l.boards?.name?.trim();
        if (id && name) map.set(id, name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const c = r.concepts;
      if (subjectFilter !== "all" && (c?.subject ?? "").trim() !== subjectFilter) return false;
      if (systemFilter !== "all" && (c?.system ?? "").trim() !== systemFilter) return false;
      if (topicFilter !== "all" && (c?.topic ?? "").trim() !== topicFilter) return false;
      if (conceptFilter !== "all" && (c?.title ?? "").trim() !== conceptFilter) return false;
      if (boardFilter !== "all") {
        const ids = new Set(
          (c?.concept_boards ?? []).map((l) => l.boards?.id ?? l.board_id).filter(Boolean) as string[],
        );
        if (!ids.has(boardFilter)) return false;
      }
      const bySearch = q
        ? `${r.content} ${c?.title ?? ""} ${c?.subject ?? ""} ${c?.system ?? ""} ${c?.topic ?? ""}`
            .toLowerCase()
            .includes(q)
        : true;
      return bySearch;
    });
  }, [rows, subjectFilter, systemFilter, topicFilter, conceptFilter, boardFilter, search]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Suggestions</h1>
            <p className="text-muted-foreground mt-1">
              Key points are stored under concepts (Subject → System → Topic → Concept). Filter by taxonomy and board.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text…"
            />
            <Select
              value={subjectFilter}
              onValueChange={(v) => {
                setSubjectFilter(v);
                setSystemFilter("all");
                setTopicFilter("all");
                setConceptFilter("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjectOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={systemFilter}
              onValueChange={(v) => {
                setSystemFilter(v);
                setTopicFilter("all");
                setConceptFilter("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All systems</SelectItem>
                {systemOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={topicFilter}
              onValueChange={(v) => {
                setTopicFilter(v);
                setConceptFilter("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topicOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={conceptFilter} onValueChange={setConceptFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Concept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All concepts</SelectItem>
                {conceptTitleOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={boardFilter} onValueChange={setBoardFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Board" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All boards</SelectItem>
                {boardOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">No matching suggestions found.</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRows.map((r) => {
              const tax = compactTaxonomy(r.concepts);
              const title = (r.concepts?.title ?? "").trim();
              const boardNames = (r.concepts?.concept_boards ?? [])
                .map((l) => l.boards?.name)
                .filter((n): n is string => Boolean(n?.trim()));
              return (
                <Card key={r.id} className="p-4 h-full space-y-2 transition-shadow hover:shadow-md">
                  <div className="w-full text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge className="tabular-nums gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {r.increment_count}
                      </Badge>
                      {boardNames.length ? (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {boardNames.map((n) => (
                            <Badge key={n} variant="outline" className="text-[10px] font-normal">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-pretty mt-2">{r.content}</p>
                    {title ? (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        {tax ? <p className="text-[11px] text-muted-foreground leading-snug">{tax}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(r)}
                    disabled={deleting === r.id}
                    className="w-full"
                  >
                    {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Suggestions;
