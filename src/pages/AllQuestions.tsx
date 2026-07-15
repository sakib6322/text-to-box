import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Trash2, BookOpen } from "lucide-react";
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
import { BoardCheckboxGroup } from "@/components/BoardCheckboxGroup";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { apiUrl } from "@/lib/apiBase";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import {
  fetchConceptByKeyPointId,
  fetchConceptByTitle,
  fetchConceptByIdWithBoards,
  emptyConceptDetail,
  type ConceptDetail,
  type KeyPointWithBoards,
} from "@/lib/conceptDetail";
import { useHeaderSearch } from "@/components/AppShellContext";
import { useScrollUpVisible } from "@/hooks/use-scroll-up-visible";

type TfItem = { id?: string; statement: string; correct: "true" | "false"; explanation?: string };
type McqPayload = { stem?: string; trueFalse?: TfItem[]; boardIds?: string[] };
type SbaPayload = {
  stem?: string;
  options?: string[];
  correctIndex?: number;
  optionExplanations?: string[];
  boardIds?: string[];
};

type ConceptOption = { id: string; title: string | null };
type BoardOption = { id: string; name: string };
type QuestionBoard = { id?: string | null; name: string; mention_count?: number };

type QuestionRow = {
  id: string;
  createdAt: string;
  sourcePointId?: string | null;
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
  questionMode: "mcq" | "sba";
  marks?: number;
  metadata?: { status?: string; difficulty?: string };
  boards?: QuestionBoard[];
  mcq?: McqPayload | null;
  sba?: SbaPayload | null;
};

export default function AllQuestions() {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [editTarget, setEditTarget] = useState<QuestionRow | null>(null);
  const [editConcept, setEditConcept] = useState("");
  const [editStem, setEditStem] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editSystem, setEditSystem] = useState("");
  const [editChapter, setEditChapter] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editMcqItems, setEditMcqItems] = useState<TfItem[]>([]);
  const [editSbaExplanations, setEditSbaExplanations] = useState<string[]>(["", "", "", "", ""]);
  const [editBoardIds, setEditBoardIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [boardList, setBoardList] = useState<BoardOption[]>([]);
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterSystem, setFilterSystem] = useState("all");
  const [filterChapter, setFilterChapter] = useState("all");
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterConcept, setFilterConcept] = useState("all");
  const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsName, setDetailsName] = useState("");
  const [detailsConcept, setDetailsConcept] = useState<ConceptDetail>(emptyConceptDetail());
  const [detailsKeyPoints, setDetailsKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const headerSearch = useMemo(
    () => ({
      value: search,
      onChange: setSearch,
      placeholder: "Search questions, subject, concept...",
      onFocus: () => setSearchFocused(true),
      onBlur: () => setSearchFocused(false),
    }),
    [search],
  );
  useHeaderSearch(headerSearch);
  const filtersVisible = useScrollUpVisible() && !searchFocused;

  useEffect(() => {
    fetchTaxonomy("subjects")
      .then(setSubjects)
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/boards"));
        const j = (await r.json().catch(() => ({}))) as { boards?: BoardOption[] };
        if (cancelled || !r.ok || !Array.isArray(j.boards)) return;
        setBoardList(j.boards.map((b) => ({ id: b.id, name: b.name })));
      } catch {
        if (!cancelled) setBoardList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    setFilterConcept("all");
  }, [filterSubject, filterSystem, filterChapter, filterTopic]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConcepts(true);
      try {
        const params = new URLSearchParams();
        if (filterSubject !== "all") params.set("subject", filterSubject);
        if (filterSystem !== "all") params.set("system", filterSystem);
        if (filterChapter !== "all") params.set("chapter", filterChapter);
        if (filterTopic !== "all") params.set("topic", filterTopic);
        const qs = params.toString();
        const r = await fetch(apiUrl(`/api/concepts${qs ? `?${qs}` : ""}`));
        const j = (await r.json().catch(() => ({}))) as { concepts?: ConceptOption[]; error?: string };
        if (cancelled) return;
        if (!r.ok) {
          setConceptOptions([]);
          return;
        }
        setConceptOptions(Array.isArray(j.concepts) ? j.concepts : []);
      } catch {
        if (!cancelled) setConceptOptions([]);
      } finally {
        if (!cancelled) setLoadingConcepts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterSubject, filterSystem, filterChapter, filterTopic]);

  const load = useCallback(async () => {
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
      if (filterConcept !== "all") qs.set("concept", filterConcept);
      const resp = await fetch(apiUrl(`/api/questions?${qs.toString()}`));
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error ?? "Load failed");
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [search, type, status, difficulty, filterSubject, filterSystem, filterChapter, filterTopic, filterConcept]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const resp = await fetch(apiUrl(`/api/questions/${id}`), { method: "DELETE" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Question deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (row: QuestionRow) => {
    setEditTarget(row);
    setEditConcept(row.concept);
    setEditStem(row.mcq?.stem ?? row.sba?.stem ?? "");
    setEditSubject(row.subject);
    setEditSystem(row.system);
    setEditChapter(row.chapter);
    setEditTopic(row.topic);
    setEditMcqItems(
      (row.mcq?.trueFalse ?? []).map((t) => ({
        ...t,
        explanation: t.explanation ?? "",
      })),
    );
    const expls = ["", "", "", "", ""];
    (row.sba?.optionExplanations ?? []).forEach((e, i) => {
      if (i < 5) expls[i] = e ?? "";
    });
    setEditSbaExplanations(expls);
    const fromRow = (row.boards ?? []).map((b) => b.id).filter((id): id is string => Boolean(id));
    const fromPayload = row.mcq?.boardIds ?? row.sba?.boardIds ?? [];
    setEditBoardIds(fromRow.length ? fromRow : fromPayload.filter(Boolean));
  };

  const openConceptDetails = async (row: QuestionRow) => {
    const conceptName = row.concept?.trim();
    if (!conceptName) {
      toast.error("No concept on this question");
      return;
    }
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsName(conceptName);
    try {
      if (row.sourcePointId?.trim()) {
        const data = await fetchConceptByKeyPointId(row.sourcePointId);
        const withBoards = await fetchConceptByIdWithBoards(data.conceptId);
        setDetailsConcept(withBoards.detail);
        setDetailsKeyPoints(withBoards.keyPoints);
        if (withBoards.conceptName) setDetailsName(withBoards.conceptName);
      } else {
        const data = await fetchConceptByTitle(conceptName, {
          subject: row.subject,
          system: row.system,
          chapter: row.chapter,
          topic: row.topic,
        });
        if (data.conceptId) {
          const withBoards = await fetchConceptByIdWithBoards(data.conceptId);
          setDetailsConcept(withBoards.detail);
          setDetailsKeyPoints(withBoards.keyPoints);
          if (withBoards.conceptName) setDetailsName(withBoards.conceptName);
        } else {
          setDetailsConcept(data.detail);
          setDetailsKeyPoints(data.keyPoints.map((content) => ({ content })));
          if (data.conceptName) setDetailsName(data.conceptName);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Concept not found");
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const payload =
        editTarget.questionMode === "mcq"
          ? { ...editTarget.mcq, stem: editStem, trueFalse: editMcqItems }
          : { ...editTarget.sba, stem: editStem, optionExplanations: editSbaExplanations };
      const resp = await fetch(apiUrl(`/api/questions/${editTarget.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: editConcept,
          stem: editStem,
          subject: editSubject,
          system: editSystem,
          chapter: editChapter,
          topic: editTopic,
          status: editTarget.metadata?.status,
          difficulty: editTarget.metadata?.difficulty,
          marks: editTarget.marks,
          question_mode: editTarget.questionMode,
          payload,
          board_ids: editBoardIds,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error ?? "Update failed");
      const nextBoards = editBoardIds.map((id) => ({
        id,
        name: boardList.find((b) => b.id === id)?.name ?? id,
        mention_count: 1,
      }));
      setRows((prev) =>
        prev.map((r) =>
          r.id === editTarget.id
            ? {
                ...r,
                concept: editConcept.trim(),
                subject: editSubject.trim(),
                system: editSystem.trim(),
                chapter: editChapter.trim(),
                topic: editTopic.trim(),
                boards: nextBoards,
                mcq:
                  r.questionMode === "mcq"
                    ? {
                        ...(r.mcq ?? {}),
                        stem: editStem,
                        trueFalse: editMcqItems,
                        boardIds: editBoardIds,
                      }
                    : null,
                sba:
                  r.questionMode === "sba"
                    ? {
                        ...(r.sba ?? {}),
                        stem: editStem,
                        optionExplanations: editSbaExplanations,
                        boardIds: editBoardIds,
                      }
                    : null,
              }
            : r,
        ),
      );
      toast.success("Question updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const resultCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-4 print:bg-white">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <h1 className="page-title">All Questions</h1>
        <Badge variant="secondary">{resultCount} items</Badge>
      </div>

      <Card
        className={`filter-card sticky-filter-card scroll-aware-panel print:hidden ${
          filtersVisible ? "" : "hidden-on-scroll-down"
        }`}
      >
        <div className="filter-grid-mobile lg:grid-cols-4">
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
        <div className="mt-3 filter-grid-mobile lg:grid-cols-5">
          <Select
            value={filterSubject}
            onValueChange={(v) => {
              setFilterSubject(v);
              setFilterSystem("all");
              setFilterChapter("all");
              setFilterTopic("all");
              setFilterConcept("all");
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
              setFilterConcept("all");
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
              setFilterConcept("all");
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
          <Select
            value={filterTopic}
            onValueChange={(v) => {
              setFilterTopic(v);
              setFilterConcept("all");
            }}
            disabled={filterChapter === "all"}
          >
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
          <Select value={filterConcept} onValueChange={setFilterConcept} disabled={loadingConcepts}>
            <SelectTrigger>
              <SelectValue placeholder={loadingConcepts ? "Loading…" : "Concept"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All concepts</SelectItem>
              {conceptOptions.map((c) => {
                const title = (c.title ?? "").trim() || "Untitled concept";
                return (
                  <SelectItem key={c.id} value={title}>
                    {title}
                  </SelectItem>
                );
              })}
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
                boards={r.boards}
                mcq={r.mcq}
                sba={r.sba}
              />
              <div className="absolute top-2 right-2 print:hidden flex gap-1 opacity-80 group-hover:opacity-100">
                {r.concept?.trim() ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openConceptDetails(r)}
                    aria-label="Concept details"
                    title="Concept details"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(r)}
                  aria-label="Edit question"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDeleteTarget({
                      id: r.id,
                      label: r.concept || r.mcq?.stem || r.sba?.stem || `Question ${i + 1}`,
                    })
                  }
                  disabled={deletingId === r.id}
                  aria-label="Delete question"
                >
                  {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete question?"
        description={
          deleteTarget ? (
            <>
              <strong>{deleteTarget.label}</strong> will be permanently deleted.
            </>
          ) : null
        }
        confirming={Boolean(deleteTarget && deletingId === deleteTarget.id)}
        onConfirm={() => deleteTarget && remove(deleteTarget.id)}
      />

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit question</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Concept</Label>
              <Input value={editConcept} onChange={(e) => setEditConcept(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stem</Label>
              <Textarea value={editStem} onChange={(e) => setEditStem(e.target.value)} rows={4} className="resize-y" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>System</Label>
                <Input value={editSystem} onChange={(e) => setEditSystem(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Chapter</Label>
                <Input value={editChapter} onChange={(e) => setEditChapter(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
              </div>
            </div>
            {editTarget?.questionMode === "mcq" && editMcqItems.length > 0 ? (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-medium">Statement explanations</Label>
                {editMcqItems.map((item, i) => (
                  <div key={item.id ?? i} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Statement {i + 1} ({item.correct === "true" ? "TRUE" : "FALSE"})
                    </Label>
                    <Textarea
                      value={item.explanation ?? ""}
                      onChange={(e) =>
                        setEditMcqItems((prev) =>
                          prev.map((t, j) => (j === i ? { ...t, explanation: e.target.value } : t)),
                        )
                      }
                      rows={2}
                      className="resize-y text-sm"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {editTarget?.questionMode === "sba" ? (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-medium">Option explanations</Label>
                {editSbaExplanations.map((expl, i) => {
                  const label = String.fromCharCode(97 + i);
                  const isCorrect = editTarget.sba?.correctIndex === i;
                  return (
                    <div key={i} className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Option {label}: {isCorrect ? "Why correct" : "Why wrong"}
                      </Label>
                      <Textarea
                        value={expl}
                        onChange={(e) =>
                          setEditSbaExplanations((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                        }
                        rows={2}
                        className="resize-y text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="space-y-2 border-t pt-3">
              <Label>Boards (optional)</Label>
              <BoardCheckboxGroup
                boardOptions={boardList}
                selectedIds={editBoardIds}
                onChange={setEditBoardIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={savingEdit || !editStem.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConceptDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        conceptName={detailsName}
        detail={detailsConcept}
        keyPoints={detailsKeyPoints}
        loading={detailsLoading}
        showDownloadPdf
      />
    </div>
  );
}

