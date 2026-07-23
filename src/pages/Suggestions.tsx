import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, ClipboardCopy, FileJson, FileSpreadsheet, Loader2, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { BoardCheckboxGroup } from "@/components/BoardCheckboxGroup";
import { emptyConceptDetail, fetchConceptByIdWithBoards, conceptDetailToSavePayload, clearConceptCaches, type ConceptDetail, type KeyPointWithBoards } from "@/lib/conceptDetail";
import { hasPermission } from "@/lib/auth";
import { guardPermission, guardAnyPermission } from "@/lib/permissionGuard";
import { useCan } from "@/components/Can";
import { getAuthHeaders } from "@/lib/auth";
import { getStudyProgress, getPracticeSessionsForConcept, studyCompletionPct } from "@/lib/userProgress";
import { mentionForBoard, type SuggestionBoardLink } from "@/components/SuggestionKeyPointCard";
import { ConceptSuggestionGroupCard } from "@/components/ConceptSuggestionGroupCard";
import { TaxonomyBrowseList } from "@/components/TaxonomyBrowseList";
import type { KeyPointSavePayload } from "@/components/EditableKeyPointSection";
import { KeyPointQuestionsEditor } from "@/components/KeyPointQuestionsEditor";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import {
  buildExternalKeyPointsCsvPrompt,
  buildExternalKeyPointsJsonPrompt,
  parseKeyPointsCsv,
  parseKeyPointsJson,
} from "@/lib/bulkKeyPointsCsv";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useHeaderSearch } from "@/components/AppShellContext";
import { useScrollUpVisible } from "@/hooks/use-scroll-up-visible";

const ConceptDetailsInlinePanel = lazy(() =>
  import("@/components/ConceptDetailsInlinePanel").then((m) => ({ default: m.ConceptDetailsInlinePanel })),
);

type BoardLink = SuggestionBoardLink;

type ConceptJoin = {
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
} | null;

type ConceptShell = {
  id: string;
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
};

type Row = {
  id: string;
  content: string;
  language: string | null;
  increment_count: number;
  concept_id: string;
  concepts?: ConceptJoin;
  key_point_boards?: BoardLink[] | null;
};

type BoardOption = { id: string; name: string };
type ConceptOption = { id: string; title: string | null };

type AddDraftBox = {
  localId: string;
  content: string;
  boardIds: string[];
  createdKeyPointId: string | null;
};

const newAddDraft = (partial?: Partial<AddDraftBox>): AddDraftBox => ({
  localId:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  content: "",
  boardIds: [],
  createdKeyPointId: null,
  ...partial,
});

function compactTaxonomy(
  c: ConceptJoin | Pick<ConceptShell, "subject" | "system" | "chapter" | "topic"> | null | undefined,
): string {
  if (!c) return "";
  const parts = [c.subject, c.system, c.chapter, c.topic].map((x) => (x ?? "").trim()).filter(Boolean);
  return parts.join(" → ");
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function boardIdsFromLinks(links: BoardLink[] | null | undefined): string[] {
  return (links ?? [])
    .map((l) => l.boards?.id ?? l.board_id)
    .filter((id): id is string => Boolean(id));
}

function boardLinksFromIds(ids: string[], boardList: BoardOption[]): BoardLink[] {
  return ids.map((id) => {
    const name = boardList.find((b) => b.id === id)?.name ?? "";
    return {
      board_id: id,
      mention_count: 1,
      boards: { id, name },
    };
  });
}

function apiKpToWithBoards(kp: {
  id?: string;
  content?: string;
  increment_count?: number;
  board_names?: string[];
  board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
}): KeyPointWithBoards {
  return {
    id: kp.id,
    content: kp.content ?? "",
    incrementCount: Math.max(0, Number(kp.increment_count ?? 0)),
    boardNames: Array.isArray(kp.board_names) ? kp.board_names.filter(Boolean) : [],
    boardLinks: Array.isArray(kp.board_links)
      ? kp.board_links
          .filter((l) => l?.name?.trim())
          .map((l) => ({
            id: typeof l.board_id === "string" ? l.board_id : undefined,
            name: l.name!.trim(),
            mention_count: Number(l.mention_count ?? 1) || 1,
          }))
      : undefined,
  };
}

const Suggestions = ({ mode = "admin" }: { mode?: "admin" | "user" }) => {
  const adminView = mode === "admin";
  const canAdd = useCan("suggestions.add");
  const canEdit = useCan("suggestions.edit");
  const canDelete = useCan("suggestions.delete");
  type BrowseStep = "subjects" | "systems" | "chapters" | "topics" | "concepts";

  const [rows, setRows] = useState<Row[]>([]);
  const [conceptShells, setConceptShells] = useState<ConceptShell[]>([]);
  const [loading, setLoading] = useState(mode === "admin");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editConceptTitle, setEditConceptTitle] = useState("");
  const [editBoardIds, setEditBoardIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addTarget, setAddTarget] = useState<{ conceptId: string; title: string } | null>(null);
  const [addDrafts, setAddDrafts] = useState<AddDraftBox[]>(() => [newAddDraft()]);
  const addDraftsRef = useRef(addDrafts);
  addDraftsRef.current = addDrafts;
  const [savingAdd, setSavingAdd] = useState(false);
  const [addBulkJsonText, setAddBulkJsonText] = useState("");
  const addBulkCsvRef = useRef<HTMLInputElement>(null);
  const addBulkJsonRef = useRef<HTMLInputElement>(null);
  const [savingKeyPoint, setSavingKeyPoint] = useState(false);
  const [search, setSearch] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsConceptName, setDetailsConceptName] = useState("");
  const [detailsConceptId, setDetailsConceptId] = useState<string | null>(null);
  const [detailsConceptDetail, setDetailsConceptDetail] = useState<ConceptDetail>(emptyConceptDetail());
  const [detailsKeyPoints, setDetailsKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [savingConceptDetail, setSavingConceptDetail] = useState(false);
  const [questionsPanelOpen, setQuestionsPanelOpen] = useState(false);
  const [questionsBoardFilter, setQuestionsBoardFilter] = useState<{ id: string; name: string } | null>(null);
  const [questionsConceptName, setQuestionsConceptName] = useState("");

  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [boardList, setBoardList] = useState<BoardOption[]>([]);

  type EnrolledCourse = { id: string; name: string; slug: string };
  type CourseTaxonomy = {
    subjects: TaxonomyItem[];
    systems: (TaxonomyItem & { subject_id?: string | null })[];
    chapters: (TaxonomyItem & { system_id?: string | null })[];
    topics: (TaxonomyItem & { chapter_id?: string | null })[];
  };
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseTaxonomy, setCourseTaxonomy] = useState<CourseTaxonomy | null>(null);
  const [coursesLoading, setCoursesLoading] = useState(!adminView);
  const [taxonomyLoading, setTaxonomyLoading] = useState(false);
  const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseStep, setBrowseStep] = useState<BrowseStep>("subjects");

  const [subjectId, setSubjectId] = useState("all");
  const [systemId, setSystemId] = useState("all");
  const [chapterId, setChapterId] = useState("all");
  const [topicId, setTopicId] = useState("all");
  const [boardFilter, setBoardFilter] = useState("all");
  const [conceptFilter, setConceptFilter] = useState("all");
  const [expandedConceptIds, setExpandedConceptIds] = useState<Set<string>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const headerSearch = useMemo(
    () => ({
      value: search,
      onChange: setSearch,
      placeholder: adminView
        ? "Search suggestions, concept, taxonomy..."
        : browseStep === "concepts"
          ? "Search concepts…"
          : "Search…",
      onFocus: () => setSearchFocused(true),
      onBlur: () => setSearchFocused(false),
    }),
    [search, adminView, browseStep],
  );
  useHeaderSearch(headerSearch);
  const filtersVisible =
    useScrollUpVisible() && !searchFocused && !addTarget && expandedConceptIds.size === 0;

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
    try {
      const [kpRes, conceptsHttp] = await Promise.all([
        supabase
          .from("key_points")
          .select(
            `
        id,
        content,
        language,
        increment_count,
        concept_id,
        key_point_boards (
          board_id,
          mention_count,
          boards ( id, name )
        ),
        concepts (
          title,
          subject,
          system,
          chapter,
          topic
        )
      `,
          )
          .order("increment_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(500),
        fetch(apiUrl("/api/concepts"), { headers: getAuthHeaders() }),
      ]);
      if (kpRes.error) toast.error(kpRes.error.message);
      else setRows((kpRes.data as unknown as Row[]) ?? []);

      const conceptsJson = (await conceptsHttp.json().catch(() => ({}))) as {
        concepts?: ConceptShell[];
        error?: string;
      };
      if (!conceptsHttp.ok) {
        toast.error(conceptsJson.error ?? "Failed to load concepts");
        setConceptShells([]);
      } else {
        setConceptShells(
          (conceptsJson.concepts ?? []).map((c) => ({
            id: c.id,
            title: c.title ?? null,
            subject: c.subject ?? null,
            system: c.system ?? null,
            chapter: c.chapter ?? null,
            topic: c.topic ?? null,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminView) return;
    let cancelled = false;
    setCoursesLoading(true);
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/me/courses"), { headers: getAuthHeaders() });
        const j = (await r.json().catch(() => ({}))) as {
          courses?: EnrolledCourse[];
          error?: string;
        };
        if (cancelled) return;
        if (!r.ok) throw new Error(j.error ?? "Failed to load courses");
        const list = j.courses ?? [];
        setEnrolledCourses(list);
        setSelectedCourseId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          return list[0]?.id ?? "";
        });
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load courses");
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminView]);

  useEffect(() => {
    if (adminView || !selectedCourseId) {
      if (!adminView) {
        setCourseTaxonomy(null);
        setSubjects([]);
        setSystems([]);
        setChapters([]);
        setTopics([]);
      }
      return;
    }
    let cancelled = false;
    setTaxonomyLoading(true);
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/me/courses/${encodeURIComponent(selectedCourseId)}/taxonomy`), {
          headers: getAuthHeaders(),
        });
        const j = (await r.json().catch(() => ({}))) as CourseTaxonomy & { error?: string };
        if (cancelled) return;
        if (!r.ok) throw new Error(j.error ?? "Failed to load course syllabus");
        const tax: CourseTaxonomy = {
          subjects: j.subjects ?? [],
          systems: j.systems ?? [],
          chapters: j.chapters ?? [],
          topics: j.topics ?? [],
        };
        setCourseTaxonomy(tax);
        setSubjects(tax.subjects);
        setBrowseStep("subjects");
        setSubjectId("all");
        setSystemId("all");
        setChapterId("all");
        setTopicId("all");
        setSystems([]);
        setChapters([]);
        setTopics([]);
      } catch (e) {
        if (!cancelled) {
          setCourseTaxonomy(null);
          toast.error(e instanceof Error ? e.message : "Failed to load syllabus");
        }
      } finally {
        if (!cancelled) setTaxonomyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminView, selectedCourseId]);

  useEffect(() => {
    if (!adminView && browseStep !== "concepts") return;
    void load();
  }, [adminView, browseStep]);

  useEffect(() => {
    if (adminView) {
      fetchTaxonomy("subjects")
        .then(setSubjects)
        .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load subjects"));
    }
  }, [adminView]);

  useEffect(() => {
    if (adminView) return;
    if (browseStep !== "subjects") return;
    setBrowseLoading(taxonomyLoading);
    setSubjects(courseTaxonomy?.subjects ?? []);
  }, [adminView, browseStep, courseTaxonomy, taxonomyLoading]);

  useEffect(() => {
    if (subjectId === "all") {
      setSystems([]);
      return;
    }
    if (adminView) {
      setBrowseLoading(true);
      fetchTaxonomy("systems", subjectId)
        .then(setSystems)
        .catch(() => setSystems([]))
        .finally(() => setBrowseLoading(false));
      return;
    }
    if (browseStep !== "systems") return;
    setBrowseLoading(false);
    setSystems((courseTaxonomy?.systems ?? []).filter((s) => s.subject_id === subjectId));
  }, [subjectId, adminView, browseStep, courseTaxonomy]);

  useEffect(() => {
    if (systemId === "all") {
      setChapters([]);
      return;
    }
    if (adminView) {
      setBrowseLoading(true);
      fetchTaxonomy("chapters", systemId)
        .then(setChapters)
        .catch(() => setChapters([]))
        .finally(() => setBrowseLoading(false));
      return;
    }
    if (browseStep !== "chapters") return;
    setBrowseLoading(false);
    setChapters((courseTaxonomy?.chapters ?? []).filter((c) => c.system_id === systemId));
  }, [systemId, adminView, browseStep, courseTaxonomy]);

  useEffect(() => {
    if (chapterId === "all") {
      setTopics([]);
      return;
    }
    if (adminView) {
      setBrowseLoading(true);
      fetchTaxonomy("topics", chapterId)
        .then(setTopics)
        .catch(() => setTopics([]))
        .finally(() => setBrowseLoading(false));
      return;
    }
    if (browseStep !== "topics") return;
    setBrowseLoading(false);
    setTopics((courseTaxonomy?.topics ?? []).filter((t) => t.chapter_id === chapterId));
  }, [chapterId, adminView, browseStep, courseTaxonomy]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/boards"), { headers: { ...getAuthHeaders() } });
        const j = (await r.json().catch(() => ({}))) as { boards?: BoardOption[]; error?: string };
        if (cancelled) return;
        if (!r.ok || !Array.isArray(j.boards)) {
          console.warn("[Suggestions] /api/boards failed", r.status, j.error ?? j);
          return;
        }
        setBoardList(
          j.boards
            .map((b) => ({ id: String(b.id ?? "").trim(), name: String(b.name ?? "").trim() }))
            .filter((b) => b.id && b.name),
        );
      } catch (e) {
        console.warn("[Suggestions] /api/boards error", e);
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
    if (!guardPermission("suggestions.delete")) return;
    setDeleting(row.id);
    try {
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(row.id)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  const openEdit = (row: Row) => {
    if (!guardPermission("suggestions.edit")) return;
    setEditTarget(row);
    setEditContent(row.content);
    setEditConceptTitle((row.concepts?.title ?? "").trim());
    setEditBoardIds(boardIdsFromLinks(row.key_point_boards));
  };

  const openAdd = (conceptId: string, title: string) => {
    if (!guardPermission("suggestions.add")) return;
    if (addTarget?.conceptId === conceptId) {
      setAddTarget(null);
      setAddDrafts([newAddDraft()]);
      setAddBulkJsonText("");
      return;
    }
    closeDetailsPanel();
    setAddTarget({ conceptId, title });
    setAddDrafts([newAddDraft()]);
    setAddBulkJsonText("");
    setExpandedConceptIds((prev) => new Set(prev).add(conceptId));
  };

  const closeAddPanel = () => {
    setAddTarget(null);
    setAddDrafts([newAddDraft()]);
    setAddBulkJsonText("");
  };

  const openBoardQuestions = (board: { id: string; name: string }, conceptTitle?: string) => {
    setQuestionsBoardFilter(board);
    setQuestionsConceptName((conceptTitle ?? "").trim());
    setQuestionsPanelOpen(true);
  };

  const closeDetailsPanel = () => {
    setDetailsConceptId(null);
    setDetailsConceptName("");
    setDetailsConceptDetail(emptyConceptDetail());
    setDetailsKeyPoints([]);
  };

  const toggleConceptDetails = async (conceptId: string, conceptTitle?: string) => {
    if (detailsConceptId === conceptId) {
      closeDetailsPanel();
      return;
    }
    setAddTarget(null);
    setDetailsConceptId(conceptId);
    setDetailsLoading(true);
    setDetailsConceptName((conceptTitle ?? "").trim());
    setDetailsConceptDetail(emptyConceptDetail());
    setDetailsKeyPoints([]);
    setExpandedConceptIds((prev) => new Set(prev).add(conceptId));
    try {
      const loaded = await fetchConceptByIdWithBoards(conceptId);
      setDetailsConceptName(loaded.conceptName);
      setDetailsConceptDetail(loaded.detail);
      setDetailsKeyPoints(loaded.keyPoints);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load concept details");
      closeDetailsPanel();
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleConceptExpanded = (conceptId: string) => {
    setExpandedConceptIds((prev) => {
      const next = new Set(prev);
      if (next.has(conceptId)) next.delete(conceptId);
      else next.add(conceptId);
      return next;
    });
  };

  const saveConceptDetail = async (detail: ConceptDetail) => {
    if (!detailsConceptId) return;
    if (!guardAnyPermission(["settings.concepts.edit", "home.edit"])) return;
    setSavingConceptDetail(true);
    try {
      const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(detailsConceptId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(conceptDetailToSavePayload(detail)),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      clearConceptCaches(detailsConceptId);
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
    if (!guardPermission("suggestions.edit")) return;
    const content = editContent.trim();
    const conceptTitle = editConceptTitle.trim();
    if (!content) return toast.error("Content is required");
    setSavingEdit(true);
    try {
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(editTarget.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          content,
          concept_title: conceptTitle || undefined,
          board_ids: editBoardIds,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      const nextBoards = boardLinksFromIds(editBoardIds, boardList);
      setRows((prev) =>
        prev.map((row) =>
          row.id === editTarget.id
            ? {
                ...row,
                content,
                concepts: row.concepts
                  ? { ...row.concepts, title: conceptTitle || row.concepts.title }
                  : row.concepts,
                key_point_boards: nextBoards,
              }
            : row,
        ),
      );
      if (detailsConceptId === editTarget.concept_id) {
        setDetailsKeyPoints((prev) =>
          prev.map((kp) =>
            kp.id === editTarget.id
              ? {
                  ...kp,
                  content,
                  boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
                  boardLinks: nextBoards.map((b) => ({
                    id: b.board_id,
                    name: b.boards?.name ?? "",
                    mention_count: Number(b.mention_count ?? 1) || 1,
                  })),
                }
              : kp,
          ),
        );
      }
      toast.success("Updated");
      setEditTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const applyCreatedKeyPointToState = (
    newId: string,
    content: string,
    boardIds: string[],
    created?: {
      id?: string;
      content?: string;
      increment_count?: number;
      board_names?: string[];
      board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
    },
  ) => {
    if (!addTarget) return;
    const fromServer = Array.isArray(created?.board_links) && created.board_links.length > 0;
    const nextBoards: BoardLink[] = fromServer
      ? created!.board_links!.map((l) => ({
          board_id: l.board_id ?? "",
          mention_count: Math.max(1, Number(l.mention_count ?? 1) || 1),
          boards: {
            id: l.board_id ?? "",
            name: (l.name ?? "").trim(),
          },
        }))
      : boardLinksFromIds(boardIds, boardList);
    // Prefer server count, but never show 0 when boards were selected (old API left count at 0).
    const nextIncrement = Math.max(
      typeof created?.increment_count === "number" ? Math.max(0, created.increment_count) : 0,
      nextBoards.length,
      boardIds.length,
    );
    const template = rows.find((r) => r.concept_id === addTarget.conceptId);
    setRows((prev) => {
      if (prev.some((r) => r.id === newId)) {
        return prev.map((row) =>
          row.id === newId
            ? {
                ...row,
                content: created?.content ?? content,
                increment_count: nextIncrement,
                key_point_boards: nextBoards,
              }
            : row,
        );
      }
      return [
        {
          id: newId,
          content: created?.content ?? content,
          language: "mixed",
          increment_count: nextIncrement,
          concept_id: addTarget.conceptId,
          concepts: template?.concepts ?? {
            title: addTarget.title,
            subject: null,
            system: null,
            chapter: null,
            topic: null,
          },
          key_point_boards: nextBoards,
        },
        ...prev,
      ];
    });
    if (detailsConceptId === addTarget.conceptId) {
      setDetailsKeyPoints((prev) => {
        if (prev.some((kp) => kp.id === newId)) {
          return prev.map((kp) =>
            kp.id === newId
              ? {
                  ...kp,
                  content: created?.content ?? content,
                  incrementCount: nextIncrement,
                  boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
                  boardLinks: nextBoards.map((b) => ({
                    id: b.board_id,
                    name: b.boards?.name ?? "",
                    mention_count: Number(b.mention_count ?? 1) || 1,
                  })),
                }
              : kp,
          );
        }
        return [
          ...prev,
          {
            ...apiKpToWithBoards({
              ...created,
              content,
              id: newId,
              increment_count: nextIncrement,
            }),
            boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
            boardLinks: nextBoards.map((b) => ({
              id: b.board_id,
              name: b.boards?.name ?? "",
              mention_count: Number(b.mention_count ?? 1) || 1,
            })),
          },
        ];
      });
    }
    setExpandedConceptIds((prev) => new Set(prev).add(addTarget.conceptId));
  };

  /** Create/update a specific draft box (for optional questions on that box). */
  const ensureAddKeyPointIdForDraft = async (
    localId: string,
    opts?: { syncBoards?: boolean },
  ): Promise<string> => {
    if (!addTarget) throw new Error("No concept selected");
    if (!guardPermission("suggestions.add") && !guardPermission("suggestions.edit")) {
      throw new Error("No permission");
    }
    const draft = addDraftsRef.current.find((d) => d.localId === localId);
    if (!draft) throw new Error("No key point box");
    const content = draft.content.trim();
    if (!content) throw new Error("Key point content is required before saving questions");
    const syncBoards = opts?.syncBoards !== false;
    const boardIds = draft.boardIds;

    if (draft.createdKeyPointId) {
      const body: Record<string, unknown> = { content };
      if (syncBoards) body.board_ids = boardIds;
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(draft.createdKeyPointId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        key_point?: {
          id?: string;
          content?: string;
          increment_count?: number;
          board_names?: string[];
          board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
        };
      };
      if (!r.ok) throw new Error(j.error ?? "Failed to update key point");
      applyCreatedKeyPointToState(
        draft.createdKeyPointId,
        content,
        syncBoards
          ? boardIds
          : boardIdsFromLinks(rows.find((r) => r.id === draft.createdKeyPointId)?.key_point_boards),
        j.key_point,
      );
      return draft.createdKeyPointId;
    }

    const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(addTarget.conceptId)}/key-points`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ content, board_ids: syncBoards ? boardIds : [] }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      error?: string;
      key_point?: {
        id?: string;
        content?: string;
        increment_count?: number;
        board_names?: string[];
        board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
      };
    };
    if (!r.ok) throw new Error(j.error ?? "Add failed");
    const created = j.key_point;
    const newId = typeof created?.id === "string" ? created.id : crypto.randomUUID();
    setAddDrafts((prev) =>
      prev.map((d) => (d.localId === localId ? { ...d, createdKeyPointId: newId, content } : d)),
    );
    applyCreatedKeyPointToState(newId, content, syncBoards ? boardIds : [], created);
    return newId;
  };

  const mergeKeyPointBoardSelection = (setter: (fn: (prev: string[]) => string[]) => void, nextIds: string[]) => {
    setter((prev) => {
      const merged = new Set(prev);
      for (const id of nextIds) if (id) merged.add(id);
      const arr = [...merged];
      if (arr.length === prev.length && arr.every((id) => prev.includes(id))) return prev;
      return arr;
    });
  };

  const mergeDraftBoards = (localId: string, nextIds: string[]) => {
    setAddDrafts((prev) => {
      const draft = prev.find((d) => d.localId === localId);
      if (!draft) return prev;
      const merged = new Set(draft.boardIds);
      for (const id of nextIds) if (id) merged.add(id);
      const arr = [...merged];
      if (arr.length === draft.boardIds.length && arr.every((id) => draft.boardIds.includes(id))) return prev;
      return prev.map((d) => (d.localId === localId ? { ...d, boardIds: arr } : d));
    });
  };

  const applyKeyPointLinkedUpdate = (update: {
    keyPointId: string;
    incrementCount: number;
    boardCountAdded: number;
    boardLinks: { board_id: string | null; name: string; mention_count: number }[];
  }) => {
    const nextBoards: BoardLink[] = (update.boardLinks ?? [])
      .filter((l) => l.name?.trim())
      .map((l) => ({
        board_id: l.board_id ?? "",
        mention_count: Number(l.mention_count ?? 1) || 1,
        boards: {
          id: l.board_id ?? "",
          name: l.name.trim(),
        },
      }));
    const selectedIds = nextBoards.map((b) => b.boards?.id ?? b.board_id).filter(Boolean);

    setRows((prev) =>
      prev.map((row) =>
        row.id === update.keyPointId
          ? {
              ...row,
              increment_count: update.incrementCount,
              key_point_boards: nextBoards,
            }
          : row,
      ),
    );

    if (editTarget?.id === update.keyPointId) {
      setEditBoardIds(selectedIds);
      setEditTarget((prev) =>
        prev && prev.id === update.keyPointId
          ? { ...prev, increment_count: update.incrementCount, key_point_boards: nextBoards }
          : prev,
      );
    }
    if (addDrafts.some((d) => d.createdKeyPointId === update.keyPointId)) {
      setAddDrafts((prev) =>
        prev.map((d) =>
          d.createdKeyPointId === update.keyPointId ? { ...d, boardIds: selectedIds } : d,
        ),
      );
    }
  };

  const saveAdd = async () => {
    if (!addTarget) return;
    if (!guardPermission("suggestions.add")) return;
    const toSave = addDrafts
      .map((d) => ({ ...d, content: d.content.trim() }))
      .filter((d) => d.content);
    if (!toSave.length) return toast.error("Add at least one key point with content");
    setSavingAdd(true);
    try {
      let ok = 0;
      const errors: string[] = [];
      for (const draft of toSave) {
        try {
          if (draft.createdKeyPointId) {
            const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(draft.createdKeyPointId)}`), {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              body: JSON.stringify({ content: draft.content, board_ids: draft.boardIds }),
            });
            const j = (await r.json().catch(() => ({}))) as {
              error?: string;
              key_point?: {
                id?: string;
                content?: string;
                increment_count?: number;
                board_names?: string[];
                board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
              };
            };
            if (!r.ok) throw new Error(j.error ?? "Update failed");
            applyCreatedKeyPointToState(
              draft.createdKeyPointId,
              draft.content,
              draft.boardIds,
              j.key_point,
            );
            ok++;
            continue;
          }
          const created = await postOneKeyPoint(addTarget.conceptId, draft.content, draft.boardIds);
          const newId = typeof created?.id === "string" ? created.id : crypto.randomUUID();
          applyCreatedKeyPointToState(newId, draft.content, draft.boardIds, created);
          ok++;
        } catch (e: unknown) {
          errors.push(e instanceof Error ? e.message : "failed");
        }
      }
      if (ok) toast.success(ok === 1 ? "Key point added" : `${ok} key points added`);
      if (errors.length) toast.warning(`${errors.length} failed — ${errors[0]}`);
      if (ok) closeAddPanel();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setSavingAdd(false);
    }
  };

  const postOneKeyPoint = async (conceptId: string, content: string, boardIds: string[]) => {
    const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(conceptId)}/key-points`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ content, board_ids: boardIds }),
    });
    const j = (await r.json().catch(() => ({}))) as {
      error?: string;
      key_point?: {
        id?: string;
        content?: string;
        increment_count?: number;
        board_names?: string[];
        board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
      };
    };
    if (!r.ok) throw new Error(j.error ?? "Add failed");
    return j.key_point;
  };

  /** Load parsed points into UI boxes (does not call API until Save). */
  const loadDraftBoxesFromPoints = (points: string[], sourceLabel: string) => {
    if (!points.length) {
      toast.error("No key points to import");
      return;
    }
    setAddDrafts(points.map((content) => newAddDraft({ content })));
    toast.success(
      `${sourceLabel}: ${points.length} box${points.length === 1 ? "" : "es"} ready — set boards per box, then Save`,
    );
    if (addBulkCsvRef.current) addBulkCsvRef.current.value = "";
    if (addBulkJsonRef.current) addBulkJsonRef.current.value = "";
  };

  const handleAddBulkCsv = async (file: File) => {
    try {
      const parsed = parseKeyPointsCsv(await file.text());
      for (const w of parsed.warnings) toast.warning(w);
      loadDraftBoxesFromPoints(parsed.points, "CSV");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "CSV import failed");
      if (addBulkCsvRef.current) addBulkCsvRef.current.value = "";
    }
  };

  const handleAddBulkJson = async (rawOverride?: string) => {
    const raw = (rawOverride ?? addBulkJsonText).trim();
    if (!raw) {
      toast.error("Paste JSON or upload a .json file first");
      return;
    }
    try {
      const parsed = parseKeyPointsJson(raw);
      setAddBulkJsonText(raw);
      for (const w of parsed.warnings) toast.warning(w);
      loadDraftBoxesFromPoints(parsed.points, "JSON");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "JSON import failed");
      if (addBulkJsonRef.current) addBulkJsonRef.current.value = "";
    }
  };

  const copyAddKpPrompt = async (format: "json" | "csv") => {
    try {
      await navigator.clipboard.writeText(
        format === "csv" ? buildExternalKeyPointsCsvPrompt() : buildExternalKeyPointsJsonPrompt(),
      );
      toast.success(format === "csv" ? "CSV prompt copied" : "JSON prompt copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const saveDetailsKeyPoint = async (payload: KeyPointSavePayload) => {
    if (!payload.id) {
      toast.error("Key point id missing");
      return;
    }
    if (!guardPermission("suggestions.edit")) return;
    setSavingKeyPoint(true);
    try {
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(payload.id)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content: payload.content, board_ids: payload.boardIds }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Update failed");
      const nextBoards = boardLinksFromIds(payload.boardIds, boardList);
      setRows((prev) =>
        prev.map((row) =>
          row.id === payload.id
            ? { ...row, content: payload.content, key_point_boards: nextBoards }
            : row,
        ),
      );
      setDetailsKeyPoints((prev) =>
        prev.map((kp) =>
          kp.id === payload.id
            ? {
                ...kp,
                content: payload.content,
                boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
                boardLinks: nextBoards.map((b) => ({
                  id: b.board_id,
                  name: b.boards?.name ?? "",
                  mention_count: Number(b.mention_count ?? 1) || 1,
                })),
              }
            : kp,
        ),
      );
      if (detailsConceptId) clearConceptCaches(detailsConceptId);
      toast.success("Key point updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
      throw e;
    } finally {
      setSavingKeyPoint(false);
    }
  };

  const addDetailsKeyPoint = async (payload: { content: string; boardIds: string[] }) => {
    if (!detailsConceptId) return;
    if (!guardPermission("suggestions.add")) return;
    setSavingKeyPoint(true);
    try {
      const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(detailsConceptId)}/key-points`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content: payload.content, board_ids: payload.boardIds }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        key_point?: {
          id?: string;
          content?: string;
          increment_count?: number;
          board_names?: string[];
          board_links?: { board_id?: string | null; name?: string; mention_count?: number }[];
        };
      };
      if (!r.ok) throw new Error(j.error ?? "Add failed");
      const created = j.key_point;
      const newId = typeof created?.id === "string" ? created.id : crypto.randomUUID();
      const nextBoards = boardLinksFromIds(payload.boardIds, boardList);
      const template = rows.find((row) => row.concept_id === detailsConceptId);
      setRows((prev) => [
        {
          id: newId,
          content: created?.content ?? payload.content,
          language: "mixed",
          increment_count: Number(created?.increment_count ?? 0),
          concept_id: detailsConceptId,
          concepts: template?.concepts ?? {
            title: detailsConceptName,
            subject: null,
            system: null,
            chapter: null,
            topic: null,
          },
          key_point_boards: nextBoards,
        },
        ...prev,
      ]);
      setDetailsKeyPoints((prev) => [
        ...prev,
        {
          ...apiKpToWithBoards({ ...created, content: payload.content, id: newId }),
          boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
          boardLinks: nextBoards.map((b) => ({
            id: b.board_id,
            name: b.boards?.name ?? "",
            mention_count: Number(b.mention_count ?? 1) || 1,
          })),
        },
      ]);
      clearConceptCaches(detailsConceptId);
      toast.success("Key point added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
      throw e;
    } finally {
      setSavingKeyPoint(false);
    }
  };

  const deleteDetailsKeyPoint = async (id: string) => {
    if (!guardPermission("suggestions.delete")) return;
    setSavingKeyPoint(true);
    try {
      const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDetailsKeyPoints((prev) => prev.filter((kp) => kp.id !== id));
      if (detailsConceptId) clearConceptCaches(detailsConceptId);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      throw e;
    } finally {
      setSavingKeyPoint(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!adminView && browseStep !== "concepts") return [];

    const allowedTopicNames =
      !adminView && courseTaxonomy
        ? new Set(courseTaxonomy.topics.map((t) => norm(t.name)))
        : null;

    const q = search.toLowerCase().trim();
    const list = rows.filter((r) => {
      const c = r.concepts;
      if (allowedTopicNames && !allowedTopicNames.has(norm(c?.topic))) return false;
      if (subjectName && norm(c?.subject) !== norm(subjectName)) return false;
      if (systemName && norm(c?.system) !== norm(systemName)) return false;
      if (chapterName && norm(c?.chapter) !== norm(chapterName)) return false;
      if (topicName && norm(c?.topic) !== norm(topicName)) return false;
      if (boardFilter !== "all") {
        const ids = new Set(
          (r.key_point_boards ?? []).map((l) => l.boards?.id ?? l.board_id).filter(Boolean) as string[],
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
        const ma = mentionForBoard(a.key_point_boards ?? [], boardFilter);
        const mb = mentionForBoard(b.key_point_boards ?? [], boardFilter);
        if (mb !== ma) return mb - ma;
        return (b.increment_count || 0) - (a.increment_count || 0);
      });
    }
    return [...list].sort((a, b) => (b.increment_count || 0) - (a.increment_count || 0));
  }, [
    rows,
    subjectName,
    systemName,
    chapterName,
    topicName,
    boardFilter,
    conceptFilter,
    search,
    adminView,
    browseStep,
    courseTaxonomy,
  ]);

  type ConceptGroup = {
    conceptId: string;
    title: string;
    taxonomy: string;
    rows: Row[];
  };

  const conceptGroups = useMemo(() => {
    const map = new Map<string, ConceptGroup>();
    for (const r of filteredRows) {
      if (!r.concept_id) continue;
      const existing = map.get(r.concept_id);
      if (existing) {
        existing.rows.push(r);
      } else {
        map.set(r.concept_id, {
          conceptId: r.concept_id,
          title: (r.concepts?.title ?? "").trim() || "Untitled",
          taxonomy: compactTaxonomy(r.concepts),
          rows: [r],
        });
      }
    }

    // Concepts with zero key points (or after last KP deleted) still appear in Suggestions.
    // Board filter hides them — they have no board links.
    if (boardFilter === "all") {
      const allowedTopicNames =
        !adminView && courseTaxonomy
          ? new Set(courseTaxonomy.topics.map((t) => norm(t.name)))
          : null;
      const q = search.toLowerCase().trim();

      for (const c of conceptShells) {
        if (map.has(c.id)) continue;
        if (allowedTopicNames && !allowedTopicNames.has(norm(c.topic))) continue;
        if (subjectName && norm(c.subject) !== norm(subjectName)) continue;
        if (systemName && norm(c.system) !== norm(systemName)) continue;
        if (chapterName && norm(c.chapter) !== norm(chapterName)) continue;
        if (topicName && norm(c.topic) !== norm(topicName)) continue;
        if (conceptFilter !== "all" && c.id !== conceptFilter) continue;
        const title = (c.title ?? "").trim() || "Untitled";
        if (
          q &&
          !`${title} ${c.subject ?? ""} ${c.system ?? ""} ${c.chapter ?? ""} ${c.topic ?? ""}`
            .toLowerCase()
            .includes(q)
        ) {
          continue;
        }
        map.set(c.id, {
          conceptId: c.id,
          title,
          taxonomy: compactTaxonomy(c),
          rows: [],
        });
      }
    }

    return Array.from(map.values());
  }, [
    filteredRows,
    conceptShells,
    boardFilter,
    adminView,
    courseTaxonomy,
    search,
    subjectName,
    systemName,
    chapterName,
    topicName,
    conceptFilter,
  ]);

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

  const homeLink = hasPermission("home.view") ? "/builder" : "/my-courses";

  const goBrowse = (step: BrowseStep) => {
    setSearch("");
    setBrowseStep(step);
    if (step === "subjects") {
      setSubjectId("all");
      setSystemId("all");
      setChapterId("all");
      setTopicId("all");
      setConceptFilter("all");
    } else if (step === "systems") {
      setSystemId("all");
      setChapterId("all");
      setTopicId("all");
      setConceptFilter("all");
    } else if (step === "chapters") {
      setChapterId("all");
      setTopicId("all");
      setConceptFilter("all");
    } else if (step === "topics") {
      setTopicId("all");
      setConceptFilter("all");
    }
  };

  const pickSubject = (item: TaxonomyItem) => {
    setSubjectId(item.id);
    setSystemId("all");
    setChapterId("all");
    setTopicId("all");
    setConceptFilter("all");
    setBrowseStep("systems");
  };
  const pickSystem = (item: TaxonomyItem) => {
    setSystemId(item.id);
    setChapterId("all");
    setTopicId("all");
    setConceptFilter("all");
    setBrowseStep("chapters");
  };
  const pickChapter = (item: TaxonomyItem) => {
    setChapterId(item.id);
    setTopicId("all");
    setConceptFilter("all");
    setBrowseStep("topics");
  };
  const pickTopic = (item: TaxonomyItem) => {
    setTopicId(item.id);
    setConceptFilter("all");
    setBrowseStep("concepts");
  };

  const browseBack = () => {
    if (browseStep === "concepts") goBrowse("topics");
    else if (browseStep === "topics") goBrowse("chapters");
    else if (browseStep === "chapters") goBrowse("systems");
    else if (browseStep === "systems") goBrowse("subjects");
  };

  const browseTitle =
    browseStep === "subjects"
      ? "Subjects"
      : browseStep === "systems"
        ? "Systems"
        : browseStep === "chapters"
          ? "Chapters"
          : browseStep === "topics"
            ? "Topics"
            : "Concepts";

  if (adminView && !hasPermission("suggestions.view")) {
    return <Navigate to="/my-suggestions" replace />;
  }

  return (
    <div className="min-h-screen app-mesh-bg text-foreground antialiased">
      <header className="app-header-bar border-b">
        <div className="app-mesh-content container mx-auto px-4 py-6 flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Back">
            <Link to={homeLink}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-balance page-title">
              {adminView ? "Suggestions" : "My Suggestions"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {adminView
                ? "Browse concepts — click a concept to see its key points. Use Details for full concept content (inline panel)."
                : "Browse only the syllabus mapped to your enrolled course — subject → system → chapter → topic."}
            </p>
          </div>
        </div>
      </header>

      <main className="app-mesh-content container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {!adminView ? (
          <div className="mb-4 space-y-3">
            {coursesLoading ? (
              <Card className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your courses…
              </Card>
            ) : enrolledCourses.length === 0 ? (
              <Card className="space-y-3 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Enroll in a course first to browse its mapped subjects, systems, chapters, and topics.
                </p>
                <Button asChild>
                  <Link to="/">Browse courses</Link>
                </Button>
              </Card>
            ) : (
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5 sm:max-w-sm sm:flex-1">
                  <Label className="text-xs text-muted-foreground">Your course</Label>
                  {enrolledCourses.length === 1 ? (
                    <p className="text-sm font-semibold">{enrolledCourses[0].name}</p>
                  ) : (
                    <Select
                      value={selectedCourseId || undefined}
                      onValueChange={(v) => {
                        setSelectedCourseId(v);
                        setBrowseStep("subjects");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select enrolled course" />
                      </SelectTrigger>
                      <SelectContent>
                        {enrolledCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/my-courses">My courses</Link>
                </Button>
              </Card>
            )}
          </div>
        ) : null}

        {adminView ? (
          <Card
            className={`filter-card sticky-filter-card scroll-aware-panel mb-4 space-y-3 ${
              filtersVisible ? "" : "hidden-on-scroll-down"
            }`}
          >
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
            <div className="filter-grid-mobile xl:grid-cols-6">
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
        ) : !coursesLoading && enrolledCourses.length > 0 && selectedCourseId ? (
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <button
                type="button"
                className="max-w-full break-words text-left font-medium text-primary hover:underline"
                onClick={() => goBrowse("subjects")}
              >
                Subjects
              </button>
              {subjectName ? (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <button
                    type="button"
                    className={`max-w-full break-words text-left ${
                      browseStep === "systems" ? "font-semibold text-foreground" : "text-primary hover:underline"
                    }`}
                    onClick={() => goBrowse("systems")}
                  >
                    {subjectName}
                  </button>
                </>
              ) : null}
              {systemName ? (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <button
                    type="button"
                    className={`max-w-full break-words text-left ${
                      browseStep === "chapters" ? "font-semibold text-foreground" : "text-primary hover:underline"
                    }`}
                    onClick={() => goBrowse("chapters")}
                  >
                    {systemName}
                  </button>
                </>
              ) : null}
              {chapterName ? (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <button
                    type="button"
                    className={`max-w-full break-words text-left ${
                      browseStep === "topics" ? "font-semibold text-foreground" : "text-primary hover:underline"
                    }`}
                    onClick={() => goBrowse("topics")}
                  >
                    {chapterName}
                  </button>
                </>
              ) : null}
              {topicName ? (
                <>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="max-w-full break-words font-semibold text-foreground">{topicName}</span>
                </>
              ) : null}
            </div>
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 flex-1 break-words text-base font-semibold leading-snug">{browseTitle}</h2>
              {browseStep !== "subjects" ? (
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={browseBack}>
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back
                </Button>
              ) : (
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/study/progress">My progress →</Link>
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {!adminView && (!selectedCourseId || enrolledCourses.length === 0 || coursesLoading) ? null : !adminView && browseStep !== "concepts" ? (
          browseStep === "subjects" ? (
            <TaxonomyBrowseList
              items={subjects}
              loading={browseLoading || taxonomyLoading}
              emptyLabel="No mapped subjects in this course"
              onSelect={pickSubject}
            />
          ) : browseStep === "systems" ? (
            <TaxonomyBrowseList
              items={systems}
              loading={browseLoading}
              emptyLabel="No mapped systems in this subject"
              onSelect={pickSystem}
            />
          ) : browseStep === "chapters" ? (
            <TaxonomyBrowseList
              items={chapters}
              loading={browseLoading}
              emptyLabel="No mapped chapters in this system"
              onSelect={pickChapter}
            />
          ) : (
            <TaxonomyBrowseList
              items={topics}
              loading={browseLoading}
              emptyLabel="No mapped topics in this chapter"
              onSelect={pickTopic}
            />
          )
        ) : !adminView && (!selectedCourseId || enrolledCourses.length === 0) ? null : loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : conceptGroups.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            {filteredRows.length === 0
              ? "No matching suggestions found."
              : "No concepts found for these filters."}
          </Card>
        ) : (
          <div className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-sm text-muted-foreground">{conceptGroups.length} concept(s)</p>
              {!adminView ? (
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/study/progress">My progress →</Link>
                </Button>
              ) : null}
            </div>
            {conceptGroups.map((g) => {
              const prog = getStudyProgress(g.conceptId);
              const pct = studyCompletionPct(prog);
              const sessionCount = getPracticeSessionsForConcept(g.conceptId).length;
              return (
                <ConceptSuggestionGroupCard
                  key={g.conceptId}
                  group={g}
                  expanded={expandedConceptIds.has(g.conceptId)}
                  onToggle={() => toggleConceptExpanded(g.conceptId)}
                  boardFilter={boardFilter}
                  adminView={adminView}
                  studyPct={pct}
                  sessionCount={sessionCount}
                  deleting={deleting}
                  onDetailsToggle={adminView ? () => void toggleConceptDetails(g.conceptId, g.title) : undefined}
                  detailsOpen={detailsConceptId === g.conceptId}
                  detailsPanel={
                    detailsConceptId === g.conceptId ? (
                      <Suspense
                        fallback={
                          <div className="flex justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading details…
                          </div>
                        }
                      >
                        <ConceptDetailsInlinePanel
                          active
                          variant="inline"
                          conceptName={detailsConceptName}
                          detail={detailsConceptDetail}
                          keyPoints={detailsKeyPoints}
                          loading={detailsLoading}
                          editable={canEdit}
                          onDetailChange={setDetailsConceptDetail}
                          onSave={saveConceptDetail}
                          saving={savingConceptDetail}
                          keyPointsEditable={canEdit || canAdd || canDelete}
                          boardOptions={boardList}
                          onSaveKeyPoint={saveDetailsKeyPoint}
                          onAddKeyPoint={addDetailsKeyPoint}
                          onDeleteKeyPoint={deleteDetailsKeyPoint}
                          savingKeyPoint={savingKeyPoint}
                          conceptId={g.conceptId}
                          showSelfQaEditor={hasPermission("progress.self_qa.manage")}
                          onClose={closeDetailsPanel}
                      />
                      </Suspense>
                    ) : undefined
                  }
                  onEdit={
                    adminView && canEdit
                      ? (row) => {
                          const full = g.rows.find((r) => r.id === row.id);
                          if (full) openEdit(full);
                        }
                      : undefined
                  }
                  onDelete={
                    adminView && canDelete
                      ? (row) => {
                          const full = g.rows.find((r) => r.id === row.id);
                          if (full) setDeleteTarget(full);
                        }
                      : undefined
                  }
                  onAdd={adminView && canAdd ? () => openAdd(g.conceptId, g.title) : undefined}
                  addOpen={addTarget?.conceptId === g.conceptId}
                  addPanel={
                    addTarget?.conceptId === g.conceptId ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            Add key point{addDrafts.length > 1 ? `s (${addDrafts.length})` : ""}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={closeAddPanel}
                            disabled={savingAdd}
                          >
                            Close
                          </Button>
                        </div>

                        {canAdd ? (
                          <div className="space-y-3 rounded-lg border border-dashed p-3">
                            <div>
                              <p className="text-sm font-medium">Bulk load boxes (no AI)</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                CSV/JSON আপলোড করলে এখানেই ততগুলো বক্স বসবে — প্রতিটিতে আলাদা boards
                                select করে Save দিন।
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">CSV file</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                disabled={savingAdd}
                                onClick={() => addBulkCsvRef.current?.click()}
                              >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Upload key points CSV
                              </Button>
                              <Input
                                ref={addBulkCsvRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="sr-only"
                                disabled={savingAdd}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleAddBulkCsv(f);
                                }}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <a href="/samples/home-key-points-bulk.csv" download>
                                    Sample CSV
                                  </a>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={savingAdd}
                                  onClick={() => void copyAddKpPrompt("csv")}
                                >
                                  <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                                  Copy CSV prompt
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2 border-t pt-3">
                              <Label htmlFor="suggestions-bulk-kp-json" className="text-xs text-muted-foreground">
                                JSON text
                              </Label>
                              <Textarea
                                id="suggestions-bulk-kp-json"
                                value={addBulkJsonText}
                                onChange={(e) => setAddBulkJsonText(e.target.value)}
                                rows={4}
                                className="font-mono text-xs min-h-[80px]"
                                placeholder='{ "key_points": ["Point one", "Point two"] }'
                                disabled={savingAdd}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={savingAdd || !addBulkJsonText.trim()}
                                  onClick={() => void handleAddBulkJson()}
                                >
                                  <FileJson className="mr-2 h-4 w-4" />
                                  Load JSON boxes
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={savingAdd}
                                  onClick={() => addBulkJsonRef.current?.click()}
                                >
                                  <Upload className="mr-2 h-3.5 w-3.5" />
                                  Upload .json
                                </Button>
                                <Input
                                  ref={addBulkJsonRef}
                                  type="file"
                                  accept=".json,application/json"
                                  className="sr-only"
                                  disabled={savingAdd}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    void (async () => {
                                      try {
                                        await handleAddBulkJson(await f.text());
                                      } catch (err: unknown) {
                                        toast.error(err instanceof Error ? err.message : "Failed to read file");
                                      }
                                    })();
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={savingAdd}
                                  onClick={() => void copyAddKpPrompt("json")}
                                >
                                  <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                                  Copy JSON prompt
                                </Button>
                                <Button type="button" variant="outline" size="sm" asChild>
                                  <a href="/samples/home-key-points-bulk.json" download>
                                    Sample JSON
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="text-xs text-muted-foreground">Key point boxes</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={savingAdd}
                              onClick={() => setAddDrafts((prev) => [...prev, newAddDraft()])}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add box
                            </Button>
                          </div>
                          {addDrafts.map((draft, idx) => (
                            <div
                              key={draft.localId}
                              className="space-y-2 rounded-md border bg-muted/20 p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Box #{idx + 1}
                                  {draft.createdKeyPointId ? " · linked" : ""}
                                </p>
                                {addDrafts.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    disabled={savingAdd}
                                    onClick={() =>
                                      setAddDrafts((prev) => prev.filter((d) => d.localId !== draft.localId))
                                    }
                                    aria-label={`Remove box ${idx + 1}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                              <Textarea
                                value={draft.content}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setAddDrafts((prev) =>
                                    prev.map((d) =>
                                      d.localId === draft.localId ? { ...d, content: v } : d,
                                    ),
                                  );
                                }}
                                rows={3}
                                className="resize-y"
                                placeholder="Key point…"
                                disabled={savingAdd}
                              />
                              <div className="space-y-1.5">
                                <Label className="text-xs">Boards for this box</Label>
                                <BoardCheckboxGroup
                                  boardOptions={boardList}
                                  selectedIds={draft.boardIds}
                                  onChange={(ids) =>
                                    setAddDrafts((prev) =>
                                      prev.map((d) =>
                                        d.localId === draft.localId ? { ...d, boardIds: ids } : d,
                                      ),
                                    )
                                  }
                                  compact
                                />
                              </div>
                              <KeyPointQuestionsEditor
                                keyPointId={draft.createdKeyPointId}
                                defaultBoardIds={draft.boardIds}
                                boardOptions={boardList}
                                concept={{
                                  subject: (
                                    rows.find((r) => r.concept_id === addTarget.conceptId)?.concepts
                                      ?.subject ?? ""
                                  ).trim(),
                                  system: (
                                    rows.find((r) => r.concept_id === addTarget.conceptId)?.concepts
                                      ?.system ?? ""
                                  ).trim(),
                                  chapter: (
                                    rows.find((r) => r.concept_id === addTarget.conceptId)?.concepts
                                      ?.chapter ?? ""
                                  ).trim(),
                                  topic: (
                                    rows.find((r) => r.concept_id === addTarget.conceptId)?.concepts
                                      ?.topic ?? ""
                                  ).trim(),
                                  concept: addTarget.title.trim(),
                                }}
                                resetKey={`add-${addTarget.conceptId}-${draft.localId}`}
                                onKeyPointBoardsChange={(ids) => mergeDraftBoards(draft.localId, ids)}
                                onKeyPointLinked={applyKeyPointLinkedUpdate}
                                ensureKeyPointId={() =>
                                  ensureAddKeyPointIdForDraft(draft.localId, { syncBoards: false })
                                }
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={closeAddPanel}
                            disabled={savingAdd}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void saveAdd()}
                            disabled={
                              savingAdd || !addDrafts.some((d) => d.content.trim())
                            }
                          >
                            {savingAdd ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {addDrafts.filter((d) => d.content.trim()).length > 1
                              ? `Save all ${addDrafts.filter((d) => d.content.trim()).length}`
                              : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : null
                  }
                  onBoardClick={(board) => openBoardQuestions(board, g.title)}
                />
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
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden sm:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit suggestion</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
            <div className="space-y-2">
              <Label>Concept</Label>
              <Input value={editConceptTitle} onChange={(e) => setEditConceptTitle(e.target.value)} placeholder="Concept title" />
            </div>
            <div className="space-y-2">
              <Label>Key point content</Label>
              <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="resize-y" />
            </div>
            <div className="space-y-2">
              <Label>Boards (optional)</Label>
              <BoardCheckboxGroup
                boardOptions={boardList}
                selectedIds={editBoardIds}
                onChange={setEditBoardIds}
              />
            </div>
            {editTarget ? (
              <KeyPointQuestionsEditor
                keyPointId={editTarget.id}
                defaultBoardIds={editBoardIds}
                boardOptions={boardList}
                concept={{
                  subject: (editTarget.concepts?.subject ?? "").trim(),
                  system: (editTarget.concepts?.system ?? "").trim(),
                  chapter: (editTarget.concepts?.chapter ?? "").trim(),
                  topic: (editTarget.concepts?.topic ?? "").trim(),
                  concept: editConceptTitle.trim() || (editTarget.concepts?.title ?? "").trim(),
                }}
                resetKey={editTarget.id}
                onKeyPointBoardsChange={(ids) => mergeKeyPointBoardSelection(setEditBoardIds, ids)}
                onKeyPointLinked={applyKeyPointLinkedUpdate}
                ensureKeyPointId={async () => {
                  const content = editContent.trim();
                  if (!content) throw new Error("Key point content is required before saving questions");
                  // Content only — board counts are bumped by save-question via linkKeyPointBoards.
                  const r = await fetch(apiUrl(`/api/key-points/${encodeURIComponent(editTarget.id)}`), {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                    body: JSON.stringify({
                      content,
                      concept_title: editConceptTitle.trim() || undefined,
                    }),
                  });
                  const j = (await r.json().catch(() => ({}))) as { error?: string };
                  if (!r.ok) throw new Error(j.error ?? "Failed to sync key point");
                  setRows((prev) =>
                    prev.map((row) =>
                      row.id === editTarget.id
                        ? {
                            ...row,
                            content,
                            concepts: row.concepts
                              ? { ...row.concepts, title: editConceptTitle.trim() || row.concepts.title }
                              : row.concepts,
                          }
                        : row,
                    ),
                  );
                  return editTarget.id;
                }}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveEdit()} disabled={savingEdit || !editContent.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConceptQuestionsPanel
        open={questionsPanelOpen}
        onOpenChange={(open) => {
          setQuestionsPanelOpen(open);
          if (!open) setQuestionsBoardFilter(null);
        }}
        conceptName={questionsConceptName || undefined}
        boardId={questionsBoardFilter?.id}
        boardName={questionsBoardFilter?.name}
        onClearBoardFilter={
          questionsBoardFilter && questionsConceptName
            ? () => setQuestionsBoardFilter(null)
            : undefined
        }
        onBoardClick={(board) => {
          setQuestionsBoardFilter(board);
          setQuestionsPanelOpen(true);
        }}
      />

    </div>
  );
};

export default Suggestions;
