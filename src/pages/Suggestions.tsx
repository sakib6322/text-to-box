import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, BookOpen, Loader2, Pencil, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import { emptyConceptDetail, fetchConceptById, type ConceptDetail } from "@/lib/conceptDetail";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type BoardLink = {
  board_id: string;
  mention_count?: number | null;
  boards: { id: string; name: string } | null;
};

type ConceptJoin = {
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
  concept_boards?: BoardLink[] | null;
} | null;

type Row = {
  id: string;
  content: string;
  language: string | null;
  increment_count: number;
  concept_id: string;
  concepts?: ConceptJoin;
};

type BoardOption = { id: string; name: string };
type ConceptOption = { id: string; title: string | null };

function compactTaxonomy(c: ConceptJoin): string {
  if (!c) return "";
  const parts = [c.subject, c.system, c.chapter, c.topic].map((x) => (x ?? "").trim()).filter(Boolean);
  return parts.join(" → ");
}

function mentionForBoard(row: Row, boardId: string): number {
  const links = row.concepts?.concept_boards ?? [];
  for (const l of links) {
    const id = l.boards?.id ?? l.board_id;
    if (id === boardId) return Number(l.mention_count ?? 1);
  }
  return 0;
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

const Suggestions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editConceptTitle, setEditConceptTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsConceptName, setDetailsConceptName] = useState("");
  const [detailsConceptId, setDetailsConceptId] = useState<string | null>(null);
  const [detailsConceptDetail, setDetailsConceptDetail] = useState<ConceptDetail>(emptyConceptDetail());
  const [detailsKeyPoints, setDetailsKeyPoints] = useState<string[]>([]);
  const [savingConceptDetail, setSavingConceptDetail] = useState(false);

  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [boardList, setBoardList] = useState<BoardOption[]>([]);
  const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);

  const [subjectId, setSubjectId] = useState("all");
  const [systemId, setSystemId] = useState("all");
  const [chapterId, setChapterId] = useState("all");
  const [topicId, setTopicId] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [conceptFilter, setConceptFilter] = useState("all");

  const subjectName = useMemo(
    () => (subjectId === "all" ? "" : subjects.find((s) => s.id === subjectId)?.name ?? ""),
    [subjectId, subjects],
  );
  const systemName = useMemo(
    () => (systemId === "all" ? "" : systems.find((s) => s.id === systemId)?.name ?? ""),
    [systemId, systems],
  );
  const chapterName = useMemo(
    () => (chapterId === "all" ? "" : chapters.find((c) => c.id === chapterId)?.name ?? ""),
    [chapterId, chapters],
  );
  const topicName = useMemo(
    () => (topicId === "all" ? "" : topics.find((t) => t.id === topicId)?.name ?? ""),
    [topicId, topics],
  );

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
          chapter,
          topic,
          concept_boards (
            board_id,
            mention_count,
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

  useEffect(() => {
    fetchTaxonomy("subjects")
      .then(setSubjects)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load subjects"));
  }, []);

  useEffect(() => {
    if (subjectId === "all") {
      setSystems([]);
      return;
    }
    fetchTaxonomy("systems", subjectId)
      .then(setSystems)
      .catch(() => setSystems([]));
  }, [subjectId]);

  useEffect(() => {
    if (systemId === "all") {
      setChapters([]);
      return;
    }
    fetchTaxonomy("chapters", systemId)
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [systemId]);

  useEffect(() => {
    if (chapterId === "all") {
      setTopics([]);
      return;
    }
    fetchTaxonomy("topics", chapterId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [chapterId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/boards"));
        const j = (await r.json().catch(() => ({}))) as { boards?: BoardOption[] };
        if (cancelled || !r.ok || !Array.isArray(j.boards)) return;
        setBoardList(j.boards.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setConceptFilter("all");
  }, [subjectId, systemId, chapterId, topicId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConcepts(true);
      try {
        let query = supabase.from("concepts").select("id, title").order("title").limit(300);
        if (subjectName) query = query.eq("subject", subjectName);
        if (systemName) query = query.eq("system", systemName);
        if (chapterName) query = query.eq("chapter", chapterName);
        if (topicId !== "all") query = query.eq("topic_id", topicId);
        else if (topicName) query = query.eq("topic", topicName);

        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          toast.error(error.message);
          setConceptOptions([]);
          return;
        }
        setConceptOptions((data ?? []).map((c) => ({ id: c.id, title: c.title })));
      } finally {
        if (!cancelled) setLoadingConcepts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectName, systemName, chapterName, topicName, topicId]);

  const remove = async (row: Row) => {
    setDeleting(row.id);
    const { error } = await supabase.from("key_points").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Deleted");
      setDeleteTarget(null);
    }
    setDeleting(null);
  };

  const openEdit = (row: Row) => {
    setEditTarget(row);
    setEditContent(row.content);
    setEditConceptTitle((row.concepts?.title ?? "").trim());
  };

  const openConceptDetails = async (row: Row) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsConceptId(row.concept_id);
    setDetailsConceptName((row.concepts?.title ?? "").trim());
    setDetailsConceptDetail(emptyConceptDetail());
    setDetailsKeyPoints([]);
    try {
      const loaded = await fetchConceptById(row.concept_id);
      setDetailsConceptName(loaded.conceptName);
      setDetailsConceptDetail(loaded.detail);
      setDetailsKeyPoints(loaded.keyPoints);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load concept details");
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveConceptDetail = async (detail: ConceptDetail) => {
    if (!detailsConceptId) return;
    setSavingConceptDetail(true);
    try {
      const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(detailsConceptId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detail_summary: detail.summary || null,
          detail_paragraphs: detail.paragraphs,
          detail_table: detail.table,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setDetailsConceptDetail(detail);
      toast.success("Concept detail saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingConceptDetail(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const content = editContent.trim();
    const conceptTitle = editConceptTitle.trim();
    if (!content) return toast.error("Content is required");
    setSavingEdit(true);
    try {
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(editTarget.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, concept_title: conceptTitle || undefined }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      setRows((prev) =>
        prev.map((row) =>
          row.id === editTarget.id
            ? {
                ...row,
                content,
                concepts: row.concepts
                  ? { ...row.concepts, title: conceptTitle || row.concepts.title }
                  : row.concepts,
              }
            : row,
        ),
      );
      toast.success("Updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = rows.filter((r) => {
      const c = r.concepts;
      if (subjectName && norm(c?.subject) !== norm(subjectName)) return false;
      if (systemName && norm(c?.system) !== norm(systemName)) return false;
      if (chapterName && norm(c?.chapter) !== norm(chapterName)) return false;
      if (topicName && norm(c?.topic) !== norm(topicName)) return false;
      if (boardFilter !== "all") {
        const ids = new Set(
          (c?.concept_boards ?? []).map((l) => l.boards?.id ?? l.board_id).filter(Boolean) as string[],
        );
        if (!ids.has(boardFilter)) return false;
      }
      if (conceptFilter !== "all" && r.concept_id !== conceptFilter) return false;
      const bySearch = q
        ? `${r.content} ${c?.title ?? ""} ${c?.subject ?? ""} ${c?.system ?? ""} ${c?.chapter ?? ""} ${c?.topic ?? ""}`
            .toLowerCase()
            .includes(q)
        : true;
      return bySearch;
    });

    if (boardFilter !== "all") {
      return [...list].sort((a, b) => {
        const ma = mentionForBoard(a, boardFilter);
        const mb = mentionForBoard(b, boardFilter);
        if (mb !== ma) return mb - ma;
        return (b.increment_count || 0) - (a.increment_count || 0);
      });
    }
    return [...list].sort((a, b) => (b.increment_count || 0) - (a.increment_count || 0));
  }, [rows, subjectName, systemName, chapterName, topicName, boardFilter, conceptFilter, search]);

  const resetFilters = () => {
    setSearch("");
    setSubjectId("all");
    setSystemId("all");
    setChapterId("all");
    setTopicId("all");
    setBoardFilter("all");
    setConceptFilter("all");
    toast.success("Filters reset");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    subjectId !== "all" ||
    systemId !== "all" ||
    chapterId !== "all" ||
    topicId !== "all" ||
    boardFilter !== "all" ||
    conceptFilter !== "all";

  return (
    <div className="min-h-screen app-mesh-bg text-foreground antialiased">
      <header className="app-header-bar border-b">
        <div className="app-mesh-content container mx-auto px-4 py-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance page-title">Suggestions</h1>
            <p className="text-muted-foreground mt-1">
              Filters use the same Subject → System → Chapter → Topic and Boards as Admin Settings. Suggestions are
              matched by taxonomy names saved on each concept.
            </p>
          </div>
        </div>
      </header>

      <main className="app-mesh-content container mx-auto px-4 py-8">
        <Card className="filter-card mb-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ConnectionStatus compact />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search text…" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  setSubjectId(v);
                  setSystemId("all");
                  setChapterId("all");
                  setTopicId("all");
                  setConceptFilter("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">System</Label>
              <Select
                value={systemId}
                onValueChange={(v) => {
                  setSystemId(v);
                  setChapterId("all");
                  setTopicId("all");
                  setConceptFilter("all");
                }}
                disabled={subjectId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All systems" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All systems</SelectItem>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Chapter</Label>
              <Select
                value={chapterId}
                onValueChange={(v) => {
                  setChapterId(v);
                  setTopicId("all");
                  setConceptFilter("all");
                }}
                disabled={systemId === "all"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {chapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Topic</Label>
              <Select value={topicId} onValueChange={(v) => { setTopicId(v); setConceptFilter("all"); }} disabled={chapterId === "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Concept</Label>
              <Select value={conceptFilter} onValueChange={setConceptFilter} disabled={loadingConcepts}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingConcepts ? "Loading…" : "All concepts"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All concepts</SelectItem>
                  {conceptOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {(c.title ?? "").trim() || "Untitled concept"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Board</Label>
              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All boards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All boards</SelectItem>
                  {boardList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {filteredRows.map((r, i) => {
              const tax = compactTaxonomy(r.concepts);
              const title = (r.concepts?.title ?? "").trim();
              const boardNames = (r.concepts?.concept_boards ?? [])
                .map((l) => l.boards?.name)
                .filter((n): n is string => Boolean(n?.trim()));
              const boardMention = boardFilter !== "all" ? mentionForBoard(r, boardFilter) : null;
              return (
                <Card
                  key={r.id}
                  className="suggestion-card"
                  style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}
                >
                  <div className="w-full text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge className="tabular-nums gap-1 badge-glow bg-primary/90 text-primary-foreground border-0">
                        <TrendingUp className="h-3 w-3" />
                        {r.increment_count}
                      </Badge>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {boardMention != null && boardMention > 0 ? (
                          <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                            Board ×{boardMention}
                          </Badge>
                        ) : null}
                        {boardNames.length
                          ? boardNames.map((n) => (
                              <Badge key={n} variant="outline" className="text-[10px] font-normal">
                                {n}
                              </Badge>
                            ))
                          : null}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-pretty mt-2">{r.content}</p>
                    {title ? (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        {tax ? <p className="text-[11px] text-muted-foreground leading-snug">{tax}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="flex-1 min-w-[5.5rem]" onClick={() => openConceptDetails(r)}>
                      <BookOpen className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 min-w-[5.5rem]" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 min-w-[5.5rem]"
                      onClick={() => setDeleteTarget(r)}
                      disabled={deleting === r.id}
                    >
                      {deleting === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete suggestion?"
        description={
          deleteTarget ? (
            <>
              This key point will be permanently deleted.
              {deleteTarget.content ? (
                <span className="mt-2 block text-muted-foreground line-clamp-2">{deleteTarget.content}</span>
              ) : null}
            </>
          ) : null
        }
        confirming={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onConfirm={() => deleteTarget && remove(deleteTarget)}
      />

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit suggestion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Concept</Label>
              <Input value={editConceptTitle} onChange={(e) => setEditConceptTitle(e.target.value)} placeholder="Concept title" />
            </div>
            <div className="space-y-2">
              <Label>Key point content</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="resize-y" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit || !editContent.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConceptDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conceptName={detailsConceptName}
        detail={detailsConceptDetail}
        keyPoints={detailsKeyPoints}
        loading={detailsLoading}
        editable
        onDetailChange={setDetailsConceptDetail}
        onSave={saveConceptDetail}
        saving={savingConceptDetail}
      />
    </div>
  );
};

export default Suggestions;
