import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";

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
  const [bumping, setBumping] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("key_points")
      .select("id, content, language, increment_count, concept_id, concepts(title)")
      .order("increment_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const bump = async (row: Row) => {
    setBumping(row.id);
    const next = row.increment_count + 1;
    // optimistic
    setRows((rs) =>
      [...rs.map((r) => (r.id === row.id ? { ...r, increment_count: next } : r))]
        .sort((a, b) => b.increment_count - a.increment_count),
    );
    const { error } = await supabase
      .from("key_points")
      .update({ increment_count: next })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      load();
    }
    setBumping(null);
  };

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
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            No saved key points yet. Save some on the home page first.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => bump(r)}
                disabled={bumping === r.id}
                className="text-left"
              >
                <Card className="p-4 h-full space-y-2 transition-shadow hover:shadow-md cursor-pointer">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{langLabel[r.language ?? ""] ?? "—"}</Badge>
                    <Badge className="tabular-nums gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {r.increment_count}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-pretty">{r.content}</p>
                  {r.concepts?.title && (
                    <p className="text-xs text-muted-foreground truncate">From: {r.concepts.title}</p>
                  )}
                </Card>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Suggestions;
