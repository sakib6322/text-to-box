import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConceptDetailsDialog } from "@/components/ConceptDetailsDialog";
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

type BoardLink = SuggestionBoardLink;

type ConceptJoin = {
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
} | null;

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

function compactTaxonomy(c: ConceptJoin): string {
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
  const [loading, setLoading] = useState(mode === "admin");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editConceptTitle, setEditConceptTitle] = useState("");
  const [editBoardIds, setEditBoardIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addTarget, setAddTarget] = useState<{ conceptId: string; title: string } | null>(null);
  const [addContent, setAddContent] = useState("");
  const [addBoardIds, setAddBoardIds] = useState<string[]>([]);
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingKeyPoint, setSavingKeyPoint] = useState(false);
  const [search, setSearch] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsConceptName, setDetailsConceptName] = useState("");
  const [detailsConceptId, setDetailsConceptId] = useState<string | null>(null);
  const [detailsConceptDetail, setDetailsConceptDetail] = useState<ConceptDetail>(emptyConceptDetail());
  const [detailsKeyPoints, setDetailsKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [savingConceptDetail, setSavingConceptDetail] = useState(false);

  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<TaxonomyItem[]>([]);
  const [chapters, setChapters] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [boardList, setBoardList] = useState<BoardOption[]>([]);
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
  const filtersVisible = useScrollUpVisible() && !searchFocused;

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
      .limit(500);
    if (error) toast.error(error.message);
    else setRows((data as unknown as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!adminView && browseStep !== "concepts") return;
    void load();
  }, [adminView, browseStep]);

  useEffect(() => {
    if (!adminView && browseStep !== "subjects") return;
    setBrowseLoading(true);
    fetchTaxonomy("subjects")
      .then(setSubjects)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load subjects"))
      .finally(() => setBrowseLoading(false));
  }, [adminView, browseStep]);

  useEffect(() => {
    if (adminView) {
      fetchTaxonomy("subjects")
        .then(setSubjects)
        .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load subjects"));
    }
  }, [adminView]);

  useEffect(() => {
    if (subjectId === "all") {
      setSystems([]);
      return;
    }
    if (!adminView && browseStep !== "systems") return;
    setBrowseLoading(true);
    fetchTaxonomy("systems", subjectId)
      .then(setSystems)
      .catch(() => setSystems([]))
      .finally(() => setBrowseLoading(false));
  }, [subjectId, adminView, browseStep]);

  useEffect(() => {
    if (systemId === "all") {
      setChapters([]);
      return;
    }
    if (!adminView && browseStep !== "chapters") return;
    setBrowseLoading(true);
    fetchTaxonomy("chapters", systemId)
      .then(setChapters)
      .catch(() => setChapters([]))
      .finally(() => setBrowseLoading(false));
  }, [systemId, adminView, browseStep]);

  useEffect(() => {
    if (chapterId === "all") {
      setTopics([]);
      return;
    }
    if (!adminView && browseStep !== "topics") return;
    setBrowseLoading(true);
    fetchTaxonomy("topics", chapterId)
      .then(setTopics)
      .catch(() => setTopics([]))
      .finally(() => setBrowseLoading(false));
  }, [chapterId, adminView, browseStep]);

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
    setAddTarget({ conceptId, title });
    setAddContent("");
    setAddBoardIds([]);
  };

  const openConceptDetails = async (conceptId: string, conceptTitle?: string) => {
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsConceptId(conceptId);
    setDetailsConceptName((conceptTitle ?? "").trim());
    setDetailsConceptDetail(emptyConceptDetail());
    setDetailsKeyPoints([]);
    try {
      const loaded = await fetchConceptByIdWithBoards(conceptId);
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

  const saveAdd = async () => {
    if (!addTarget) return;
    if (!guardPermission("suggestions.add")) return;
    const content = addContent.trim();
    if (!content) return toast.error("Content is required");
    setSavingAdd(true);
    try {
      const r = await fetch(apiUrl(`/api/concepts/${encodeURIComponent(addTarget.conceptId)}/key-points`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ content, board_ids: addBoardIds }),
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
      const nextBoards = boardLinksFromIds(addBoardIds, boardList);
      const template = rows.find((r) => r.concept_id === addTarget.conceptId);
      setRows((prev) => [
        {
          id: newId,
          content: created?.content ?? content,
          language: "mixed",
          increment_count: Number(created?.increment_count ?? 0),
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
      ]);
      if (detailsConceptId === addTarget.conceptId) {
        setDetailsKeyPoints((prev) => [
          ...prev,
          {
            ...apiKpToWithBoards({ ...created, content, id: newId }),
            boardNames: nextBoards.map((b) => b.boards?.name ?? "").filter(Boolean),
            boardLinks: nextBoards.map((b) => ({
              id: b.board_id,
              name: b.boards?.name ?? "",
              mention_count: Number(b.mention_count ?? 1) || 1,
            })),
          },
        ]);
      }
      toast.success("Key point added");
      setAddTarget(null);
      setExpandedConceptIds((prev) => new Set(prev).add(addTarget.conceptId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setSavingAdd(false);
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

    const q = search.toLowerCase().trim();
    const list = rows.filter((r) => {
      const c = r.concepts;
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
  }, [rows, subjectName, systemName, chapterName, topicName, boardFilter, conceptFilter, search, adminView, browseStep]);

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
    return Array.from(map.values());
  }, [filteredRows]);

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

  const homeLink = hasPermission("home.view") ? "/" : "/study/progress";

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
                ? "Browse concepts — click a concept to see its key points. Use Details for full concept content."
                : "Pick a subject, then system, chapter, and topic to open concepts for study & practice."}
            </p>
          </div>
        </div>
      </header>

      <main className="app-mesh-content container mx-auto max-w-7xl px-4 py-6 sm:py-8">
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
        ) : (
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
        )}

        {!adminView && browseStep !== "concepts" ? (
          browseStep === "subjects" ? (
            <TaxonomyBrowseList
              items={subjects}
              loading={browseLoading}
              emptyLabel="No subjects yet"
              onSelect={pickSubject}
            />
          ) : browseStep === "systems" ? (
            <TaxonomyBrowseList
              items={systems}
              loading={browseLoading}
              emptyLabel="No systems in this subject"
              onSelect={pickSystem}
            />
          ) : browseStep === "chapters" ? (
            <TaxonomyBrowseList
              items={chapters}
              loading={browseLoading}
              emptyLabel="No chapters in this system"
              onSelect={pickChapter}
            />
          ) : (
            <TaxonomyBrowseList
              items={topics}
              loading={browseLoading}
              emptyLabel="No topics in this chapter"
              onSelect={pickTopic}
            />
          )
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : filteredRows.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">No matching suggestions found.</Card>
        ) : conceptGroups.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">No concepts found for these filters.</Card>
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
                  onDetails={adminView ? () => void openConceptDetails(g.conceptId, g.title) : undefined}
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
            <div className="space-y-2">
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
            <Button type="button" onClick={() => void saveEdit()} disabled={savingEdit || !editContent.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(addTarget)} onOpenChange={(open) => !open && setAddTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add key point{addTarget?.title ? `: ${addTarget.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Key point content</Label>
              <Textarea
                value={addContent}
                onChange={(e) => setAddContent(e.target.value)}
                rows={5}
                className="resize-y"
                placeholder="New key point…"
              />
            </div>
            <div className="space-y-2">
              <Label>Boards (optional)</Label>
              <BoardCheckboxGroup
                boardOptions={boardList}
                selectedIds={addBoardIds}
                onChange={setAddBoardIds}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddTarget(null)} disabled={savingAdd}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveAdd()} disabled={savingAdd || !addContent.trim()}>
              {savingAdd ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add
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
      />
    </div>
  );
};

export default Suggestions;
