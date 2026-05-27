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
import { QuestionPaperCard } from "@/components/QuestionPaperCard";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { apiUrl } from "@/lib/apiBase";

type TfItem = { id?: string; statement: string; correct: "true" | "false" };
type McqPayload = { stem?: string; trueFalse?: TfItem[] };
type SbaPayload = { stem?: string; options?: string[]; correctIndex?: number };

type QuestionRow = {
  id: string;
  createdAt: string;
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
  questionMode: "mcq" | "sba";
  marks?: number;
  metadata?: { status?: string; difficulty?: string };
  mcq?: McqPayload | null;
  sba?: SbaPayload | null;
};

export default function AllQuestions() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterSystem, setFilterSystem] = useState("all");
  const [filterChapter, setFilterChapter] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");

  useEffect(() => {
    fetchTaxonomy("subjects")
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (filterSubject === "all") {
      setSystems([]);
      return;
    }
    const sub = subjects.find((s) => s.name === filterSubject);
    if (!sub?.id) {
      setSystems([]);
      return;
    }
    fetchTaxonomy("systems", sub.id)
      .then(setSystems)
      .catch(() => setSystems([]));
  }, [filterSubject, subjects]);

  useEffect(() => {
    if (filterSystem === "all") {
      setChapters([]);
      return;
    }
    const sys = systems.find((s) => s.name === filterSystem);
    if (!sys?.id) {
      setChapters([]);
      return;
    }
    fetchTaxonomy("chapters", sys.id)
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [filterSystem, systems]);

  useEffect(() => {
    if (filterChapter === "all") {
      setTopics([]);
      return;
    }
    const ch = chapters.find((c) => c.name === filterChapter);
    if (!ch?.id) {
      setTopics([]);
      return;
    }
    fetchTaxonomy("topics", ch.id)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [filterChapter, chapters]);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (type !== "all") qs.set("type", type);
      if (status !== "all") qs.set("status", status);
      if (difficulty !== "all") qs.set("difficulty", difficulty);
      if (filterSubject !== "all") qs.set("subject", filterSubject);
      if (filterSystem !== "all") qs.set("system", filterSystem);
      if (filterChapter !== "all") qs.set("chapter", filterChapter);
      if (filterTopic !== "all") qs.set("topic", filterTopic);
      const resp = await fetch(apiUrl(`/api/questions?${qs.toString()}`));
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
  }, [search, type, status, difficulty, filterSubject, filterSystem, filterChapter, filterTopic]);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const resp = await fetch(apiUrl(`/api/questions/${id}`), { method: "DELETE" });
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
    <div className="space-y-4 print:bg-white">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <h1 className="page-title">All Questions</h1>
        <Badge variant="secondary">{resultCount} items</Badge>
      </div>

      <Card className="filter-card print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject / system / chapter / topic / concept"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="sba">SBA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All difficulty</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select
            value={filterSubject}
            onValueChange={(v) => {
              setFilterSubject(v);
              setFilterSystem("all");
              setFilterChapter("all");
              setFilterTopic("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterSystem}
            onValueChange={(v) => {
              setFilterSystem(v);
              setFilterChapter("all");
              setFilterTopic("all");
            }}
            disabled={filterSubject === "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="System" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All systems</SelectItem>
              {systems.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterChapter}
            onValueChange={(v) => {
              setFilterChapter(v);
              setFilterTopic("all");
            }}
            disabled={filterSystem === "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chapter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              {chapters.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTopic} onValueChange={setFilterTopic} disabled={filterChapter === "all"}>
            <SelectTrigger>
              <SelectValue placeholder="Topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground print:hidden">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground print:hidden">No questions found</Card>
      ) : (
        <div className="space-y-4 max-w-3xl mx-auto">
          {rows.map((r, i) => (
            <div key={r.id} className="relative group">
              <QuestionPaperCard
                index={i}
                questionMode={r.questionMode}
                subject={r.subject}
                system={r.system}
                chapter={r.chapter}
                topic={r.topic}
                concept={r.concept}
                marks={r.marks}
                mcq={r.mcq}
                sba={r.sba}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 print:hidden opacity-80 group-hover:opacity-100"
                onClick={() => remove(r.id)}
                disabled={deletingId === r.id}
                aria-label="Delete question"
              >
                {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
