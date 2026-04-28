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

type Row = {
  id: string;
  content: string;
  language: string | null;
  increment_count: number;
  concept_id: string;
  concepts?: { title: string | null } | null;
};

const langLabel: Record<string, string> = { en: "English", bn: "Bangla", mixed: "Mixed" };

const Suggestions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [conceptFilter, setConceptFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("key_points")
      .select("id, content, language, increment_count, concept_id, concepts(title)")
      .order("increment_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // increment_count is increased from Create Question approval flow now.

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

  const concepts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.concepts?.title?.trim()).filter(Boolean))) as string[],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const byLang = languageFilter === "all" ? true : (r.language ?? "") === languageFilter;
      const byConcept = conceptFilter === "all" ? true : (r.concepts?.title ?? "") === conceptFilter;
      const bySearch = q
        ? `${r.content} ${r.concepts?.title ?? ""} ${r.language ?? ""}`.toLowerCase().includes(q)
        : true;
      return byLang && byConcept && bySearch;
    });
  }, [rows, languageFilter, conceptFilter, search]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance">Suggestions</h1>
            <p className="text-muted-foreground mt-1">
              Click a key point to increment its suggestion count. Most-suggested rise to the top.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suggestions..."
            />
            {/* <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="bn">Bangla</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select> */}
            <Select value={conceptFilter} onValueChange={setConceptFilter}>
              <SelectTrigger><SelectValue placeholder="Concept" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All concepts</SelectItem>
                {concepts.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            No matching suggestions found.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRows.map((r) => (
              <Card key={r.id} className="p-4 h-full space-y-2 transition-shadow hover:shadow-md">
                <div className="w-full text-left">
                  <div className="flex items-center justify-between gap-2">
                    {/* <Badge variant="outline">{langLabel[r.language ?? ""] ?? "—"}</Badge> */}
                    <Badge className="tabular-nums gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {r.increment_count}
                    </Badge>
                  </div>
                  {/* <p className="mt-1 text-xs font-mono text-muted-foreground">
                    Point ID: {r.id}
                  </p> */}
                  <p className="text-sm leading-relaxed text-pretty">{r.content}</p>
                  {r.concepts?.title && (
                    <p className="text-xs text-muted-foreground truncate">From: {r.concepts.title}</p>
                  )}
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Suggestions;
