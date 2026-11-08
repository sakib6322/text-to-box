import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, BookOpen, FolderTree, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  emptyTaxonomySelection,
  fetchTaxonomy,
  type TaxonomyItem,
  type TaxonomySelection,
} from "@/lib/taxonomy";
import { TaxonomySelects } from "@/components/TaxonomySelects";
import { apiUrl, apiFetch, readJsonResponse } from "@/lib/apiBase";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Can, useCan } from "@/components/Can";
import { guardPermission } from "@/lib/permissionGuard";
import { getAuthHeaders } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ExplanationField } from "@/components/ExplanationField";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
import { mkQuestionId } from "@/lib/questionDrafts";
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
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { resolveDeviceTheme } from "@/lib/uiAppearance";
import { cn } from "@/lib/utils";

type TfItem = { id?: string; statement: string; correct: "true" | "false"; explanation?: string };
type McqPayload = { stem?: string; trueFalse?: TfItem[]; boardIds?: string[] };
type SbaPayload = {
  stem?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  /** @deprecated Legacy per-option explanations. */
  optionExplanations?: string[];
  boardIds?: string[];
};

type ConceptOption = { id: string; title: string | null };
type BoardOption = { id: string; name: string };
type QuestionBoard = { id?: string | null; name: string; mention_count?: number };


function resolveSbaExplanation(sba: SbaPayload | null | undefined): string {
  if (!sba) return "";
  const single = typeof sba.explanation === "string" ? sba.explanation.trim() : "";
  if (single) return single;
  const arr = Array.isArray(sba.optionExplanations) ? sba.optionExplanations : [];
  const idx = Number(sba.correctIndex);
  if (Number.isFinite(idx) && idx >= 0 && typeof arr[idx] === "string" && arr[idx].trim()) {
    return arr[idx].trim();
  }
  return arr.find((e) => typeof e === "string" && e.trim())?.trim() ?? "";
}

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
  const { appearance, activeDevice } = useUiAppearance();
  const deviceTheme = resolveDeviceTheme(appearance, activeDevice);
  const aq = deviceTheme.allQuestions;
  const pageTitle = aq.useSidebarLabelAsTitle
    ? deviceTheme.global.sidebarLabels.allQuestions || aq.pageTitle
    : aq.pageTitle || "All Questions";

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
  const [editSbaOptions, setEditSbaOptions] = useState<string[]>(["", "", "", "", ""]);
  const [editSbaCorrect, setEditSbaCorrect] = useState(0);
  const [editSbaExplanation, setEditSbaExplanation] = useState("");
  const [editBoardIds, setEditBoardIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const canEdit = useCan("question_bank.questions.edit");
  const canDelete = useCan("question_bank.questions.delete");

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
  const [topicChangeMode, setTopicChangeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [topicChangeOpen, setTopicChangeOpen] = useState(false);
  const [topicChangeTaxonomy, setTopicChangeTaxonomy] = useState<TaxonomySelection>(emptyTaxonomySelection);
  const [topicChangeConcept, setTopicChangeConcept] = useState("");
  const [topicChangeConcepts, setTopicChangeConcepts] = useState<ConceptOption[]>([]);
  const [loadingTopicChangeConcepts, setLoadingTopicChangeConcepts] = useState(false);
  const [savingTopicChange, setSavingTopicChange] = useState(false);
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
    if (!guardPermission("question_bank.questions.delete")) return;
    setDeletingId(id);
    try {
      const resp = await fetch(apiUrl(`/api/questions/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
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
    if (!canEdit) return;
    setEditTarget(row);
    setEditConcept(row.concept);
    setEditStem(row.mcq?.stem ?? row.sba?.stem ?? "");
    setEditSubject(row.subject);
    setEditSystem(row.system);
    setEditChapter(row.chapter);
    setEditTopic(row.topic);
    const tf = (row.mcq?.trueFalse ?? []).map((t) => ({
      id: t.id || mkQuestionId(),
      statement: t.statement ?? "",
      correct: (t.correct === "false" ? "false" : "true") as "true" | "false",
      explanation: t.explanation ?? "",
    }));
    setEditMcqItems(
      tf.length > 0
        ? tf
        : [{ id: mkQuestionId(), statement: "", correct: "true", explanation: "" }],
    );
    const opts = [...(row.sba?.options ?? [])];
    while (opts.length < 5) opts.push("");
    setEditSbaOptions(opts.slice(0, 5).map((o) => o ?? ""));
    const correctIdx = Number(row.sba?.correctIndex);
    setEditSbaCorrect(Number.isFinite(correctIdx) && correctIdx >= 0 && correctIdx < 5 ? correctIdx : 0);
    setEditSbaExplanation(resolveSbaExplanation(row.sba));
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
    if (!guardPermission("question_bank.questions.edit")) return;

    if (editTarget.questionMode === "mcq") {
      const incomplete = editMcqItems.some((t) => !t.statement.trim());
      if (incomplete) return toast.error("প্রতিটি MCQ statement পূরণ করুন");
    } else {
      const filled = editSbaOptions.filter((o) => o.trim());
      if (filled.length < 2) return toast.error("কমপক্ষে ২টি SBA option লাগবে");
      if (!editSbaOptions[editSbaCorrect]?.trim()) {
        return toast.error("সঠিক option খালি রাখা যাবে না");
      }
    }

    setSavingEdit(true);
    try {
      const payload =
        editTarget.questionMode === "mcq"
          ? {
              ...editTarget.mcq,
              stem: editStem,
              trueFalse: editMcqItems.map((t) => ({
                ...t,
                id: t.id || mkQuestionId(),
                statement: t.statement.trim(),
                explanation: t.explanation ?? "",
              })),
              boardIds: editBoardIds,
            }
          : {
              ...editTarget.sba,
              stem: editStem,
              options: editSbaOptions.map((o) => o.trim()),
              correctIndex: editSbaCorrect,
              explanation: editSbaExplanation,
              boardIds: editBoardIds,
            };
      const resp = await fetch(apiUrl(`/api/questions/${editTarget.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
                mcq: r.questionMode === "mcq" ? (payload as McqPayload) : null,
                sba: r.questionMode === "sba" ? (payload as SbaPayload) : null,
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
  const selectedCount = selectedIds.size;
  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));

  useEffect(() => {
    if (!topicChangeMode) setSelectedIds(new Set());
  }, [topicChangeMode]);

  useEffect(() => {
    if (!topicChangeOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingTopicChangeConcepts(true);
      try {
        const params = new URLSearchParams();
        if (topicChangeTaxonomy.subjectName) params.set("subject", topicChangeTaxonomy.subjectName);
        if (topicChangeTaxonomy.systemName) params.set("system", topicChangeTaxonomy.systemName);
        if (topicChangeTaxonomy.chapterName) params.set("chapter", topicChangeTaxonomy.chapterName);
        if (topicChangeTaxonomy.topicName) params.set("topic", topicChangeTaxonomy.topicName);
        const qs = params.toString();
        const r = await fetch(apiUrl(`/api/concepts${qs ? `?${qs}` : ""}`));
        const j = await readJsonResponse<{ concepts?: ConceptOption[] }>(r, {});
        if (cancelled) return;
        setTopicChangeConcepts(Array.isArray(j.concepts) ? j.concepts : []);
      } catch {
        if (!cancelled) setTopicChangeConcepts([]);
      } finally {
        if (!cancelled) setLoadingTopicChangeConcepts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    topicChangeOpen,
    topicChangeTaxonomy.subjectName,
    topicChangeTaxonomy.systemName,
    topicChangeTaxonomy.chapterName,
    topicChangeTaxonomy.topicName,
  ]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  };

  const openTopicChangeDialog = () => {
    if (!guardPermission("question_bank.questions.edit")) return;
    if (selectedCount === 0) return toast.error("কমপক্ষে একটি question সিলেক্ট করুন");
    setTopicChangeTaxonomy(emptyTaxonomySelection());
    setTopicChangeConcept("");
    setTopicChangeOpen(true);
  };

  const applyTopicChange = async () => {
    if (!guardPermission("question_bank.questions.edit")) return;
    const ids = [...selectedIds];
    if (!ids.length) return toast.error("কমপক্ষে একটি question সিলেক্ট করুন");

    const patch: Record<string, string> = {};
    if (topicChangeTaxonomy.subjectName.trim()) patch.subject = topicChangeTaxonomy.subjectName.trim();
    if (topicChangeTaxonomy.systemName.trim()) patch.system = topicChangeTaxonomy.systemName.trim();
    if (topicChangeTaxonomy.chapterName.trim()) patch.chapter = topicChangeTaxonomy.chapterName.trim();
    if (topicChangeTaxonomy.topicName.trim()) patch.topic = topicChangeTaxonomy.topicName.trim();
    if (topicChangeConcept.trim()) patch.concept = topicChangeConcept.trim();
    if (!Object.keys(patch).length) {
      return toast.error("Subject / System / Chapter / Topic / Concept থেকে অন্তত একটি সিলেক্ট করুন");
    }

    setSavingTopicChange(true);
    try {
      const r = await apiFetch("/api/questions/bulk-taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, ...patch }),
      });
      const j = await readJsonResponse<{ ok?: boolean; updated?: number; error?: string }>(r, {});
      if (!r.ok) throw new Error(j.error || "Change failed");

      setRows((prev) =>
        prev.map((row) => (selectedIds.has(row.id) ? { ...row, ...patch } : row)),
      );
      toast.success(`${j.updated ?? ids.length} question update হয়েছে`);
      setTopicChangeOpen(false);
      setTopicChangeMode(false);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Change failed");
    } finally {
      setSavingTopicChange(false);
    }
  };

  return (
    <div className="space-y-4 print:bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2">
          <h1 className="page-title">{pageTitle}</h1>
          {aq.showResultBadge ? <Badge variant="secondary">{resultCount} items</Badge> : null}
        </div>
        <Can permission="question_bank.questions.edit">
          {!topicChangeMode ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setTopicChangeMode(true)}>
              <FolderTree className="mr-1.5 h-4 w-4" />
              Change Topics
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{selectedCount} selected</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleSelectAllVisible(!allVisibleSelected)}
                disabled={rows.length === 0}
              >
                {allVisibleSelected ? "Clear visible" : "Select all visible"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={openTopicChangeDialog}
                disabled={selectedCount === 0}
              >
                Change
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTopicChangeMode(false);
                  setSelectedIds(new Set());
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </Can>
      </div>

      <Card
        className={cn(
          "filter-card print:hidden",
          aq.filterSticky && "sticky-filter-card scroll-aware-panel",
          aq.filterSticky && !filtersVisible && "hidden-on-scroll-down",
        )}
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
        <Card className="p-10 text-center text-muted-foreground print:hidden">{aq.emptyMessage}</Card>
      ) : (
        <div className="all-questions-list">
          {rows.map((r, i) => (
            <div
              key={r.id}
              className={cn(
                "relative group",
                topicChangeMode && "cursor-pointer",
                topicChangeMode && selectedIds.has(r.id) && "rounded-lg ring-2 ring-primary/40",
              )}
              onClick={
                topicChangeMode
                  ? (e) => {
                      const t = e.target as HTMLElement;
                      if (t.closest("button, a, input, label, [role='checkbox']")) return;
                      toggleSelect(r.id, !selectedIds.has(r.id));
                    }
                  : undefined
              }
            >
              {topicChangeMode ? (
                <div className="absolute left-2 top-2 z-10 print:hidden">
                  <Checkbox
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={(v) => toggleSelect(r.id, v === true)}
                    aria-label={`Select question ${i + 1}`}
                    className="h-5 w-5 border-2 bg-background shadow-sm"
                  />
                </div>
              ) : null}
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
              <div
                className={cn(
                  "absolute top-2 right-2 print:hidden flex gap-1 opacity-80 group-hover:opacity-100",
                  topicChangeMode && "pointer-events-none opacity-30",
                )}
              >
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
                <Can permission="question_bank.questions.edit">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(r)}
                  aria-label="Edit question"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                </Can>
                <Can permission="question_bank.questions.delete">
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
                </Can>
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
        <DialogContent
          className="flex max-h-[92vh] w-[min(96vw,42rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:rounded-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.(".ck-body-wrapper, .ck-balloon-panel, .ck.ck-dropdown__panel, .ck.ck-toolbar")) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.(".ck-body-wrapper, .ck-balloon-panel, .ck.ck-dropdown__panel, .ck.ck-toolbar")) {
              e.preventDefault();
            }
          }}
          onFocusOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.closest?.(".ck-body-wrapper, .ck-balloon-panel, .ck.ck-dropdown__panel")) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
            <DialogTitle>
              Edit question
              {editTarget ? (
                <Badge variant="outline" className="ml-2 align-middle text-[10px] uppercase">
                  {editTarget.questionMode}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-1.5">
              <Label>Concept</Label>
              <Input value={editConcept} onChange={(e) => setEditConcept(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Stem / Question</Label>
              <Textarea value={editStem} onChange={(e) => setEditStem(e.target.value)} rows={3} className="resize-y" />
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

            {editTarget?.questionMode === "mcq" ? (
              <div className="space-y-3 border-t pt-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-sm font-medium">True / False statements</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditMcqItems((prev) => [
                        ...prev,
                        { id: mkQuestionId(), statement: "", correct: "true", explanation: "" },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add statement
                  </Button>
                </div>
                {editMcqItems.map((item, i) => (
                  <div key={item.id ?? i} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-medium">Statement {i + 1}</Label>
                      {editMcqItems.length > 1 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive"
                          onClick={() => setEditMcqItems((prev) => prev.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                    <Textarea
                      value={item.statement}
                      onChange={(e) =>
                        setEditMcqItems((prev) =>
                          prev.map((t, j) => (j === i ? { ...t, statement: e.target.value } : t)),
                        )
                      }
                      rows={2}
                      className="resize-y text-sm"
                      placeholder="Statement text…"
                    />
                    <div className="w-full sm:w-36">
                      <Label className="text-xs text-muted-foreground">Correct answer</Label>
                      <Select
                        value={item.correct}
                        onValueChange={(v) =>
                          setEditMcqItems((prev) =>
                            prev.map((t, j) =>
                              j === i ? { ...t, correct: v as "true" | "false" } : t,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Explanation ({item.correct === "true" ? "why TRUE" : "why FALSE"})
                      </Label>
                      <ExplanationField
                        value={item.explanation ?? ""}
                        onChange={(html) =>
                          setEditMcqItems((prev) =>
                            prev.map((t, j) => (j === i ? { ...t, explanation: html } : t)),
                          )
                        }
                        minHeight="110px"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {editTarget?.questionMode === "sba" ? (
              <div className="space-y-3 border-t pt-3">
                <Label className="text-sm font-medium">Options</Label>
                <div className="space-y-2">
                  {editSbaOptions.map((opt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2.5 w-5 shrink-0 text-xs font-medium text-muted-foreground">
                        {String.fromCharCode(97 + i)}.
                      </span>
                      <Textarea
                        value={opt}
                        onChange={(e) =>
                          setEditSbaOptions((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                        rows={2}
                        className="min-h-0 flex-1 resize-y text-sm"
                        placeholder={`Option ${String.fromCharCode(97 + i)}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Correct option</Label>
                  <RadioGroup
                    value={String(editSbaCorrect)}
                    onValueChange={(v) => setEditSbaCorrect(Number(v))}
                    className="grid grid-cols-5 gap-1.5"
                  >
                    {editSbaOptions.map((_, i) => (
                      <label
                        key={i}
                        className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-2 text-sm"
                      >
                        <RadioGroupItem value={String(i)} />
                        <span>{String.fromCharCode(97 + i)}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Explanation</Label>
                  <ExplanationField
                    value={editSbaExplanation}
                    onChange={setEditSbaExplanation}
                    minHeight="140px"
                    placeholder="Why correct? Wrong options? Features / differences (Heading, List, Table)…"
                  />
                </div>
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
          <DialogFooter className="shrink-0 border-t px-6 py-3 sm:justify-end">
            <Button type="button" variant="modalCancel" onClick={() => setEditTarget(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={savingEdit || !editStem.trim()}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={topicChangeOpen}
        onOpenChange={(open) => {
          if (!savingTopicChange) setTopicChangeOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Topics</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{selectedCount}</span> টি selected question-এ নতুন
              taxonomy / concept apply হবে। যেগুলো সিলেক্ট করবেন শুধু সেগুলোই আপডেট হবে।
            </p>
            <TaxonomySelects
              value={topicChangeTaxonomy}
              onChange={(next) => {
                setTopicChangeTaxonomy(next);
                setTopicChangeConcept("");
              }}
            />
            <div className="space-y-1.5">
              <Label>Concept (optional)</Label>
              <Select
                value={topicChangeConcept || "__none__"}
                onValueChange={(v) => setTopicChangeConcept(v === "__none__" ? "" : v)}
                disabled={loadingTopicChangeConcepts}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTopicChangeConcepts ? "Loading…" : "Keep existing / select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Don&apos;t change concept</SelectItem>
                  {topicChangeConcepts.map((c) => {
                    const title = (c.title ?? "").trim() || "Untitled concept";
                    return (
                      <SelectItem key={c.id} value={title}>
                        {title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Subject → Topic cascade filters the concept list. Leave a level empty to keep that field unchanged.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="modalCancel"
              onClick={() => setTopicChangeOpen(false)}
              disabled={savingTopicChange}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void applyTopicChange()} disabled={savingTopicChange}>
              {savingTopicChange ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply to {selectedCount}
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

