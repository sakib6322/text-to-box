import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import {
  adminDeleteProgressSet,
  adminFetchProgressSets,
  adminSaveProgressSet,
  type ProgressPracticeSet,
} from "@/lib/progressApi";
import type { ProgressScopeType, ProgressSetKind } from "@/lib/progressPlan";

type MappedTopic = {
  topic_id: string;
  topic_name: string;
  chapter_id: string | null;
  chapter_name: string | null;
  system_id: string | null;
  system_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  path: string;
};

type ConceptRow = { id: string; title: string; topic_id?: string | null; topic?: string | null };

type QRow = {
  id: string;
  questionMode: "mcq" | "sba";
  concept: string;
  subject?: string;
  system?: string;
  chapter?: string;
  topic?: string;
  incrementCount?: number;
  count?: number;
  boards?: { name: string; mention_count?: number }[];
  mcq?: { stem?: string } | null;
  sba?: { stem?: string } | null;
};

const SET_KIND_OPTIONS: { value: ProgressSetKind; label: string; hint: string; defaultScope: ProgressScopeType }[] = [
  { value: "concept_practice", label: "Concept practice (Step 4)", hint: "Unlocks concept 100%", defaultScope: "concept" },
  { value: "chapter_exam", label: "Chapter exam", hint: "50% of chapter progress", defaultScope: "chapter" },
  { value: "system_exam", label: "System exam", hint: "50% of system progress", defaultScope: "system" },
  { value: "subject_final", label: "Subject final", hint: "50% of subject progress", defaultScope: "subject" },
  { value: "final_mock", label: "Final mock", hint: "Required to complete course", defaultScope: "course" },
  { value: "exam_night_pyq", label: "Exam Night PYQ", hint: "Unlocks before publish time", defaultScope: "course" },
];

const SCOPE_OPTIONS: { value: ProgressScopeType; label: string }[] = [
  { value: "concept", label: "Concept" },
  { value: "chapter", label: "Chapter" },
  { value: "system", label: "System" },
  { value: "subject", label: "Subject" },
  { value: "course", label: "Whole course" },
];

function questionImportance(q: QRow) {
  if (typeof q.count === "number") return q.count;
  if (typeof q.incrementCount === "number") return q.incrementCount;
  return (q.boards ?? []).reduce((s, b) => s + Math.max(1, Number(b.mention_count ?? 1)), 0);
}

function stemOf(q: QRow) {
  return String(q.mcq?.stem ?? q.sba?.stem ?? "").trim() || "(no stem)";
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function uniqById<T extends { id: string }>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) m.set(it.id, it);
  return [...m.values()];
}

export default function AdminProgressSets() {
  const { id: courseId = "" } = useParams();
  const [courseName, setCourseName] = useState("Course");
  const [mapped, setMapped] = useState<MappedTopic[]>([]);
  const [sets, setSets] = useState<ProgressPracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [setKind, setSetKind] = useState<ProgressSetKind>("concept_practice");
  const [scopeType, setScopeType] = useState<ProgressScopeType>("concept");
  const [scopeId, setScopeId] = useState<string>("");
  const [passPercent, setPassPercent] = useState(70);
  const [isRequired, setIsRequired] = useState(true);
  const [publishAt, setPublishAt] = useState("");
  const [selectedQ, setSelectedQ] = useState<Set<string>>(new Set());

  // Question bank filters
  const [filterSubject, setFilterSubject] = useState("");
  const [filterSystem, setFilterSystem] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterConceptId, setFilterConceptId] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "mcq" | "sba">("all");
  const [qSearch, setQSearch] = useState("");
  const [importantFirst, setImportantFirst] = useState(true);
  const [selectN, setSelectN] = useState("20");
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const [concepts, setConcepts] = useState<ConceptRow[]>([]);

  // List filters
  const [listKind, setListKind] = useState<string>("all");
  const [listScope, setListScope] = useState<string>("all");

  const subjects = useMemo(
    () =>
      uniqById(
        mapped
          .filter((t) => t.subject_id)
          .map((t) => ({ id: t.subject_id!, name: t.subject_name || "Subject" })),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [mapped],
  );

  /** Full course taxonomy — used for set SCOPE picker (never tied to question filters). */
  const allSystems = useMemo(
    () =>
      uniqById(
        mapped.filter((t) => t.system_id).map((t) => ({ id: t.system_id!, name: t.system_name || "System", subject_id: t.subject_id })),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [mapped],
  );

  const allChapters = useMemo(
    () =>
      uniqById(
        mapped.filter((t) => t.chapter_id).map((t) => ({ id: t.chapter_id!, name: t.chapter_name || "Chapter", system_id: t.system_id })),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [mapped],
  );

  /** Filtered lists — only for question bank cascade. */
  const systems = useMemo(() => {
    const rows = mapped.filter((t) => t.system_id && (!filterSubject || t.subject_id === filterSubject));
    return uniqById(rows.map((t) => ({ id: t.system_id!, name: t.system_name || "System", subject_id: t.subject_id }))).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [mapped, filterSubject]);

  const chapters = useMemo(() => {
    const rows = mapped.filter(
      (t) =>
        t.chapter_id &&
        (!filterSubject || t.subject_id === filterSubject) &&
        (!filterSystem || t.system_id === filterSystem),
    );
    return uniqById(rows.map((t) => ({ id: t.chapter_id!, name: t.chapter_name || "Chapter", system_id: t.system_id }))).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [mapped, filterSubject, filterSystem]);

  const topics = useMemo(() => {
    const rows = mapped.filter(
      (t) =>
        (!filterSubject || t.subject_id === filterSubject) &&
        (!filterSystem || t.system_id === filterSystem) &&
        (!filterChapter || t.chapter_id === filterChapter),
    );
    return uniqById(rows.map((t) => ({ id: t.topic_id, name: t.topic_name || "Topic", chapter_id: t.chapter_id }))).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [mapped, filterSubject, filterSystem, filterChapter]);

  /** Scope picker options for the set's scope_type */
  const scopeOptions = useMemo(() => {
    if (scopeType === "course") return [] as { id: string; name: string; hint?: string }[];
    if (scopeType === "subject") return subjects.map((s) => ({ id: s.id, name: s.name }));
    if (scopeType === "system") return allSystems.map((s) => ({ id: s.id, name: s.name }));
    if (scopeType === "chapter") return allChapters.map((c) => ({ id: c.id, name: c.name }));
    return concepts.map((c) => ({ id: c.id, name: c.title, hint: c.topic ?? undefined }));
  }, [scopeType, subjects, allSystems, allChapters, concepts]);

  const nameById = useCallback(
    (type: ProgressScopeType, id: string | null) => {
      if (!id || type === "course") return courseName;
      if (type === "subject") return subjects.find((s) => s.id === id)?.name ?? id.slice(0, 8);
      if (type === "system") return allSystems.find((s) => s.id === id)?.name ?? id.slice(0, 8);
      if (type === "chapter") return allChapters.find((c) => c.id === id)?.name ?? id.slice(0, 8);
      if (type === "concept") return concepts.find((c) => c.id === id)?.title ?? id.slice(0, 8);
      const t = mapped.find((m) => m.topic_id === id);
      return t?.topic_name ?? id.slice(0, 8);
    },
    [subjects, allSystems, allChapters, concepts, mapped, courseName],
  );

  /** Resolve scope id from form or question-bank filters (fallback). */
  const resolvedScopeId = useMemo(() => {
    if (scopeType === "course") return "";
    if (scopeId.trim()) return scopeId.trim();
    if (scopeType === "concept" && filterConceptId) return filterConceptId;
    if (scopeType === "chapter" && filterChapter) return filterChapter;
    if (scopeType === "system" && filterSystem) return filterSystem;
    if (scopeType === "subject" && filterSubject) return filterSubject;
    return "";
  }, [scopeType, scopeId, filterConceptId, filterChapter, filterSystem, filterSubject]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [setsRes, topicsRes, coursesRes] = await Promise.all([
        adminFetchProgressSets(courseId),
        fetch(apiUrl(`/api/admin/courses/${courseId}/topics`), { headers: getAuthHeaders() }),
        fetch(apiUrl("/api/admin/courses"), { headers: getAuthHeaders() }),
      ]);
      setSets(setsRes);
      const tj = (await topicsRes.json().catch(() => ({}))) as { topics?: MappedTopic[]; error?: string };
      if (!topicsRes.ok) throw new Error(tj.error ?? "Failed to load course topics");
      setMapped(tj.topics ?? []);
      const cj = (await coursesRes.json().catch(() => ({}))) as { courses?: { id: string; name: string }[] };
      setCourseName(cj.courses?.find((c) => c.id === courseId)?.name ?? "Course");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Load all concepts for mapped topics
  useEffect(() => {
    const topicIds = [...new Set(mapped.map((t) => t.topic_id).filter(Boolean))];
    if (!topicIds.length) {
      setConcepts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const lists = await Promise.all(
          topicIds.map(async (tid) => {
            const r = await fetch(apiUrl(`/api/concepts?topic_id=${encodeURIComponent(tid)}`));
            const j = (await r.json().catch(() => ({}))) as { concepts?: ConceptRow[] };
            return j.concepts ?? [];
          }),
        );
        if (cancelled) return;
        const merged = new Map<string, ConceptRow>();
        for (const list of lists) for (const c of list) merged.set(c.id, c);
        setConcepts([...merged.values()].sort((a, b) => a.title.localeCompare(b.title)));
      } catch {
        if (!cancelled) setConcepts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapped]);

  const loadQuestions = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingQs(true);
      try {
        const qs = new URLSearchParams();
        const subName = subjects.find((s) => s.id === filterSubject)?.name?.trim();
        const sysName = allSystems.find((s) => s.id === filterSystem)?.name?.trim();
        const chName = allChapters.find((c) => c.id === filterChapter)?.name?.trim();
        const topicName = mapped.find((t) => t.topic_id === filterTopic)?.topic_name?.trim();
        const conceptTitle = concepts.find((c) => c.id === filterConceptId)?.title?.trim();

        if (subName) qs.set("subject", subName);
        if (sysName) qs.set("system", sysName);
        if (chName) qs.set("chapter", chName);
        if (topicName) qs.set("topic", topicName);
        if (conceptTitle) qs.set("concept", conceptTitle);
        if (filterMode !== "all") qs.set("type", filterMode);
        if (qSearch.trim()) qs.set("search", qSearch.trim());

        const r = await fetch(apiUrl(`/api/questions?${qs}`), { signal });
        const j = (await r.json().catch(() => ({}))) as { rows?: QRow[]; error?: string };
        if (signal?.aborted) return;
        if (!r.ok) throw new Error(j.error ?? "Failed to load questions");

        let rows = j.rows ?? [];

        // Soft course preference only when no taxonomy filter is chosen —
        // never force a subject that would return zero rows.
        const hasTaxonomyFilter = !!(subName || sysName || chName || topicName || conceptTitle);
        if (!hasTaxonomyFilter && mapped.length && rows.length) {
          const subjectNames = new Set(subjects.map((s) => s.name.trim().toLowerCase()).filter(Boolean));
          const systemNames = new Set(allSystems.map((s) => s.name.trim().toLowerCase()).filter(Boolean));
          const preferred = rows.filter(
            (q) =>
              subjectNames.has(String(q.subject ?? "").trim().toLowerCase()) ||
              systemNames.has(String(q.system ?? "").trim().toLowerCase()),
          );
          if (preferred.length > 0) rows = preferred;
        }

        setQuestions(rows);
      } catch (e) {
        if (signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        toast.error(e instanceof Error ? e.message : "Question load failed");
        setQuestions([]);
      } finally {
        if (!signal?.aborted) setLoadingQs(false);
      }
    },
    [
      filterSubject,
      filterSystem,
      filterChapter,
      filterTopic,
      filterConceptId,
      filterMode,
      qSearch,
      subjects,
      allSystems,
      allChapters,
      mapped,
      concepts,
    ],
  );

  useEffect(() => {
    const ac = new AbortController();
    const delay = qSearch.trim() ? 280 : 0;
    const t = window.setTimeout(() => {
      void loadQuestions(ac.signal);
    }, delay);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [loadQuestions, qSearch]);

  const displayedQuestions = useMemo(() => {
    let rows = [...questions];
    if (importantFirst) rows.sort((a, b) => questionImportance(b) - questionImportance(a));
    return rows;
  }, [questions, importantFirst]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSetKind("concept_practice");
    setScopeType("concept");
    setScopeId("");
    setPassPercent(70);
    setIsRequired(true);
    setPublishAt("");
    setSelectedQ(new Set());
  };

  const applyKind = (kind: ProgressSetKind) => {
    setSetKind(kind);
    const opt = SET_KIND_OPTIONS.find((o) => o.value === kind);
    if (opt) {
      setScopeType(opt.defaultScope);
      setScopeId("");
    }
  };

  const suggestTitle = () => {
    const kindLabel = SET_KIND_OPTIONS.find((o) => o.value === setKind)?.label ?? setKind;
    const sid = resolvedScopeId;
    const scopeLabel = scopeType === "course" ? courseName : nameById(scopeType, sid || null);
    setTitle(`${scopeLabel} — ${kindLabel.split("(")[0].trim()}`);
  };

  const startEdit = async (s: ProgressPracticeSet) => {
    setEditingId(s.id);
    setTitle(s.title);
    setSetKind(s.set_kind);
    setScopeType(s.scope_type);
    setScopeId(s.scope_id ?? "");
    setPassPercent(s.pass_percent ?? 70);
    setIsRequired(s.is_required !== false);
    setPublishAt(toDatetimeLocal(s.publish_at));
    setSelectedQ(new Set(s.question_ids ?? []));
    // Load those questions into the bank view
    if (s.question_ids?.length) {
      try {
        const r = await fetch(apiUrl(`/api/questions?ids=${s.question_ids.map(encodeURIComponent).join(",")}`));
        const j = (await r.json().catch(() => ({}))) as { rows?: QRow[] };
        if (r.ok && j.rows?.length) {
          setQuestions((prev) => {
            const m = new Map(prev.map((q) => [q.id, q]));
            for (const q of j.rows!) m.set(q.id, q);
            return [...m.values()];
          });
        }
      } catch {
        /* ignore */
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateSet = (s: ProgressPracticeSet) => {
    setEditingId(null);
    setTitle(`${s.title} (copy)`);
    setSetKind(s.set_kind);
    setScopeType(s.scope_type);
    setScopeId(s.scope_id ?? "");
    setPassPercent(s.pass_percent ?? 70);
    setIsRequired(s.is_required !== false);
    setPublishAt(toDatetimeLocal(s.publish_at));
    setSelectedQ(new Set(s.question_ids ?? []));
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.message("Duplicated into form — save to create");
  };

  const saveSet = async () => {
    if (!title.trim()) return toast.error("Title required");
    const effectiveScopeId = resolvedScopeId;
    if (scopeType !== "course" && !effectiveScopeId) {
      return toast.error(`Select a ${SCOPE_OPTIONS.find((o) => o.value === scopeType)?.label ?? "scope"} above`);
    }
    if (!selectedQ.size) return toast.error("Select at least one question");
    // Keep form state in sync if we resolved from filters
    if (effectiveScopeId && effectiveScopeId !== scopeId) setScopeId(effectiveScopeId);
    setSaving(true);
    try {
      const payload = {
        id: editingId ?? undefined,
        title: title.trim(),
        scope_type: scopeType,
        scope_id: scopeType === "course" ? null : effectiveScopeId,
        set_kind: setKind,
        question_ids: [...selectedQ],
        pass_percent: passPercent,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        is_required: isRequired,
        sort_order: editingId ? sets.find((s) => s.id === editingId)?.sort_order ?? sets.length : sets.length,
      };
      await adminSaveProgressSet(courseId, payload);
      toast.success(editingId ? "Set updated" : "Set created");
      resetForm();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeSet = async (setId: string) => {
    if (!confirm("Delete this progress set?")) return;
    try {
      await adminDeleteProgressSet(setId);
      toast.success("Deleted");
      if (editingId === setId) resetForm();
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const moveSet = async (setId: string, dir: -1 | 1) => {
    const ordered = [...sets].sort((a, b) => a.sort_order - b.sort_order);
    const idx = ordered.findIndex((s) => s.id === setId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[swap];
    try {
      await Promise.all([
        adminSaveProgressSet(courseId, { id: a.id, sort_order: b.sort_order }),
        adminSaveProgressSet(courseId, { id: b.id, sort_order: a.sort_order }),
      ]);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  const toggleQ = (id: string, on: boolean) => {
    setSelectedQ((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllVisible = () => setSelectedQ(new Set(displayedQuestions.map((q) => q.id)));
  const clearSelected = () => setSelectedQ(new Set());
  const selectFirstN = () => {
    const n = Math.max(1, Number(selectN) || 20);
    setSelectedQ(new Set(displayedQuestions.slice(0, n).map((q) => q.id)));
  };

  const filteredSets = useMemo(() => {
    return [...sets]
      .sort((a, b) => a.sort_order - b.sort_order)
      .filter((s) => (listKind === "all" || s.set_kind === listKind) && (listScope === "all" || s.scope_type === listScope));
  }, [sets, listKind, listScope]);

  const kindMeta = SET_KIND_OPTIONS.find((o) => o.value === setKind);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Courses
        </Link>
      </Button>

      <div>
        <h1 className="page-title">Progress practice sets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courseName} — select scope & questions (no UUID paste). Students only take published sets.
        </p>
      </div>

      {!mapped.length && !loading ? (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          This course has no mapped topics yet.{" "}
          <Link className="underline font-medium" to={`/admin/courses/${courseId}/mapping`}>
            Map topics first
          </Link>{" "}
          so you can pick subjects / chapters / concepts.
        </Card>
      ) : null}

      <Card className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{editingId ? "Edit set" : "New set"}</p>
          {editingId ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="gap-1">
              <X className="h-3.5 w-3.5" /> Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Set type</Label>
            <Select value={setKind} onValueChange={(v) => applyKind(v as ProgressSetKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SET_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kindMeta ? <p className="text-[11px] text-muted-foreground">{kindMeta.hint}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Scope level</Label>
            <Select
              value={scopeType}
              onValueChange={(v) => {
                setScopeType(v as ProgressScopeType);
                setScopeId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scopeType !== "course" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">
                Select {SCOPE_OPTIONS.find((o) => o.value === scopeType)?.label ?? "item"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={resolvedScopeId || undefined}
                onValueChange={(v) => {
                  setScopeId(v);
                  // Keep question filters in sync for convenience
                  if (scopeType === "concept") setFilterConceptId(v);
                  if (scopeType === "chapter") setFilterChapter(v);
                  if (scopeType === "system") setFilterSystem(v);
                  if (scopeType === "subject") setFilterSubject(v);
                }}
              >
                <SelectTrigger className={!resolvedScopeId ? "border-destructive/50" : undefined}>
                  <SelectValue placeholder={`Choose ${SCOPE_OPTIONS.find((o) => o.value === scopeType)?.label ?? "scope"}…`} />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Nothing mapped yet — map course topics first
                    </SelectItem>
                  ) : (
                    scopeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                        {o.hint ? ` · ${o.hint}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!resolvedScopeId ? (
                <p className="text-[11px] text-destructive">Required — pick the {scopeType} this set belongs to.</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Applies to</Label>
              <Input value={courseName} disabled />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cardiology — Chapter exam" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={suggestTitle}>
                Auto title
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pass %</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={passPercent}
              onChange={(e) => setPassPercent(Number(e.target.value) || 70)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Publish at (Exam Night / scheduled)</Label>
            <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            <p className="text-[10px] text-muted-foreground">
              Exam Night: visible from 24h before this time until this time. Clear = always available.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border p-3 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Required set</p>
              <p className="text-[11px] text-muted-foreground">Final mocks must be required to gate course completion.</p>
            </div>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>
        </div>

        {/* Question picker */}
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Questions <Badge variant="secondary">{selectedQ.size} selected</Badge>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadQuestions()} disabled={loadingQs}>
              {loadingQs ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Refresh bank
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              value={filterSubject || "__all"}
              onValueChange={(v) => {
                const next = v === "__all" ? "" : v;
                setFilterSubject(next);
                setFilterSystem("");
                setFilterChapter("");
                setFilterTopic("");
                setFilterConceptId("");
                if (scopeType === "subject" && next) setScopeId(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSystem || "__all"}
              onValueChange={(v) => {
                const next = v === "__all" ? "" : v;
                setFilterSystem(next);
                setFilterChapter("");
                setFilterTopic("");
                setFilterConceptId("");
                if (scopeType === "system" && next) setScopeId(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="System" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All systems</SelectItem>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterChapter || "__all"}
              onValueChange={(v) => {
                const next = v === "__all" ? "" : v;
                setFilterChapter(next);
                setFilterTopic("");
                setFilterConceptId("");
                if (scopeType === "chapter" && next) setScopeId(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All chapters</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterTopic || "__all"}
              onValueChange={(v) => {
                setFilterTopic(v === "__all" ? "" : v);
                setFilterConceptId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All topics</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterConceptId || "__all"}
              onValueChange={(v) => {
                const next = v === "__all" ? "" : v;
                setFilterConceptId(next);
                if (scopeType === "concept" && next) setScopeId(next);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Concept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All concepts</SelectItem>
                {concepts
                  .filter((c) => !filterTopic || c.topic_id === filterTopic)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "all" | "mcq" | "sba")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">MCQ + SBA</SelectItem>
                <SelectItem value="mcq">MCQ only</SelectItem>
                <SelectItem value="sba">SBA only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search stem…"
              value={qSearch}
              onChange={(e) => setQSearch(e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={importantFirst} onCheckedChange={(v) => setImportantFirst(v === true)} />
              Important first (board count)
            </label>
            {loadingQs ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating…
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">{displayedQuestions.length} shown</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={selectAllVisible}>
              <CheckSquare className="h-3.5 w-3.5" /> Select all ({displayedQuestions.length})
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={clearSelected}>
              <Square className="h-3.5 w-3.5" /> Clear
            </Button>
            <Input className="w-16 h-8" value={selectN} onChange={(e) => setSelectN(e.target.value)} />
            <Button type="button" size="sm" variant="outline" onClick={selectFirstN}>
              Select N
            </Button>
          </div>

          <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border p-2">
            {loadingQs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayedQuestions.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No questions — adjust filters and Apply.</p>
            ) : (
              displayedQuestions.map((q) => {
                const checked = selectedQ.has(q.id);
                const imp = questionImportance(q);
                return (
                  <label
                    key={q.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-md border px-2 py-1.5 text-xs ${
                      checked ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/40"
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleQ(q.id, v === true)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {q.questionMode}
                        </Badge>
                        {imp > 0 ? (
                          <Badge variant="secondary" className="text-[10px] tabular-nums">
                            ×{imp}
                          </Badge>
                        ) : null}
                        <span className="truncate text-muted-foreground">{q.concept}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-foreground">{stemOf(q)}</p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <Button onClick={() => void saveSet()} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Update set" : "Create set"}
        </Button>
      </Card>

      {/* Existing sets */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Existing sets ({filteredSets.length})</h2>
          <div className="flex flex-wrap gap-2">
            <Select value={listKind} onValueChange={setListKind}>
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                {SET_KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={listScope} onValueChange={setListScope}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scopes</SelectItem>
                {SCOPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filteredSets.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No sets yet — create one above.</Card>
        ) : (
          <div className="space-y-2">
            {filteredSets.map((s) => {
              const kindLabel = SET_KIND_OPTIONS.find((o) => o.value === s.set_kind)?.label ?? s.set_kind;
              return (
                <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabel} · {s.scope_type}
                      {s.scope_id ? ` · ${nameById(s.scope_type, s.scope_id)}` : ""} · {s.question_ids?.length ?? 0} Q · pass{" "}
                      {s.pass_percent}%
                      {s.is_required === false ? " · optional" : " · required"}
                      {s.publish_at ? ` · publish ${new Date(s.publish_at).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Move up" onClick={() => void moveSet(s.id, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Move down" onClick={() => void moveSet(s.id, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => void startEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Duplicate" onClick={() => duplicateSet(s)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Delete"
                      onClick={() => void removeSet(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
