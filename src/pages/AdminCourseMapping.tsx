import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, hasPermission } from "@/lib/auth";
import { fetchTaxonomy, type TaxonomyItem } from "@/lib/taxonomy";

type MappedTopic = {
  topic_id: string;
  topic_name: string;
  path: string;
  subject_name?: string | null;
  system_name?: string | null;
  chapter_name?: string | null;
};

type SystemRow = TaxonomyItem & { subject_id: string };
type ChapterRow = TaxonomyItem & { system_id: string };
type TopicRow = TaxonomyItem & { chapter_id: string };

function toggleId(set: Set<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

function ChecklistBlock({
  title,
  items,
  selected,
  onToggle,
  disabled,
  emptyLabel,
}: {
  title: string;
  items: { id: string; name: string; hint?: string }[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
  disabled?: boolean;
  emptyLabel: string;
}) {
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{title}</Label>
        <span className="text-[10px] text-muted-foreground">{selected.size} selected</span>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
        {items.length === 0 ? (
          <p className="px-1 py-2 text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={(v) => onToggle(item.id, v === true)}
                className="mt-0.5"
              />
              <span className="min-w-0 leading-snug">
                {item.name}
                {item.hint ? (
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{item.hint}</span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminCourseMapping() {
  const { id: courseId = "" } = useParams();
  const [mapped, setMapped] = useState<MappedTopic[]>([]);
  const [subjects, setSubjects] = useState<TaxonomyItem[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [subjectIds, setSubjectIds] = useState<Set<string>>(new Set());
  const [systemIds, setSystemIds] = useState<Set<string>>(new Set());
  const [chapterIds, setChapterIds] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loadingCascade, setLoadingCascade] = useState(false);
  const [courseName, setCourseName] = useState("Course");

  const loadMapped = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/topics`), { headers: getAuthHeaders() });
    const j = (await r.json().catch(() => ({}))) as { topics?: MappedTopic[]; error?: string };
    if (!r.ok) throw new Error(j.error ?? "Failed to load mapping");
    setMapped(j.topics ?? []);
  }, [courseId]);

  useEffect(() => {
    void (async () => {
      try {
        const [subs, coursesRes] = await Promise.all([
          fetchTaxonomy("subjects"),
          fetch(apiUrl("/api/admin/courses"), { headers: getAuthHeaders() }),
        ]);
        setSubjects(subs);
        const cj = (await coursesRes.json().catch(() => ({}))) as {
          courses?: { id: string; name: string }[];
        };
        setCourseName(cj.courses?.find((c) => c.id === courseId)?.name ?? "Course");
        await loadMapped();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      }
    })();
  }, [courseId, loadMapped]);

  // Subjects → systems (union)
  useEffect(() => {
    const ids = [...subjectIds];
    if (!ids.length) {
      setSystems([]);
      setSystemIds(new Set());
      setChapters([]);
      setChapterIds(new Set());
      setTopics([]);
      setSelectedTopics(new Set());
      return;
    }
    let cancelled = false;
    setLoadingCascade(true);
    void (async () => {
      try {
        const lists = await Promise.all(ids.map((id) => fetchTaxonomy("systems", id)));
        if (cancelled) return;
        const merged = new Map<string, SystemRow>();
        ids.forEach((sid, i) => {
          for (const s of lists[i] ?? []) merged.set(s.id, { ...s, subject_id: sid });
        });
        const next = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
        setSystems(next);
        setSystemIds((prev) => new Set([...prev].filter((id) => merged.has(id))));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load systems");
      } finally {
        if (!cancelled) setLoadingCascade(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectIds]);

  // Systems → chapters (union)
  useEffect(() => {
    const ids = [...systemIds];
    if (!ids.length) {
      setChapters([]);
      setChapterIds(new Set());
      setTopics([]);
      setSelectedTopics(new Set());
      return;
    }
    let cancelled = false;
    setLoadingCascade(true);
    void (async () => {
      try {
        const lists = await Promise.all(ids.map((id) => fetchTaxonomy("chapters", id)));
        if (cancelled) return;
        const merged = new Map<string, ChapterRow>();
        ids.forEach((sysId, i) => {
          for (const c of lists[i] ?? []) merged.set(c.id, { ...c, system_id: sysId });
        });
        const next = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
        setChapters(next);
        setChapterIds((prev) => new Set([...prev].filter((id) => merged.has(id))));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load chapters");
      } finally {
        if (!cancelled) setLoadingCascade(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [systemIds]);

  // Chapters → topics (union), select-all pre-checked
  useEffect(() => {
    const ids = [...chapterIds];
    if (!ids.length) {
      setTopics([]);
      setSelectedTopics(new Set());
      return;
    }
    let cancelled = false;
    setLoadingCascade(true);
    void (async () => {
      try {
        const lists = await Promise.all(ids.map((id) => fetchTaxonomy("topics", id)));
        if (cancelled) return;
        const merged = new Map<string, TopicRow>();
        ids.forEach((chId, i) => {
          for (const t of lists[i] ?? []) merged.set(t.id, { ...t, chapter_id: chId });
        });
        const next = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
        setTopics(next);
        setSelectedTopics(new Set(next.map((t) => t.id)));
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Failed to load topics");
      } finally {
        if (!cancelled) setLoadingCascade(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterIds]);

  const subjectNameById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const systemNameById = useMemo(() => new Map(systems.map((s) => [s.id, s.name])), [systems]);

  const systemItems = systems.map((s) => ({
    id: s.id,
    name: s.name,
    hint: subjectNameById.get(s.subject_id),
  }));
  const chapterItems = chapters.map((c) => ({
    id: c.id,
    name: c.name,
    hint: systemNameById.get(c.system_id),
  }));

  const addSelected = async () => {
    if (!hasPermission("courses.mapping.edit")) return toast.error("No permission");
    const ids = [...selectedTopics];
    if (!ids.length) return toast.error("Select at least one topic");
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/topics`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ mode: "add", topic_ids: ids }),
      });
      const j = (await r.json().catch(() => ({}))) as { topics?: MappedTopic[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setMapped(j.topics ?? []);
      toast.success(`${ids.length} topic(s) added to course`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addAllChapters = async () => {
    if (!hasPermission("courses.mapping.edit")) return toast.error("No permission");
    const ids = [...chapterIds];
    if (!ids.length) return toast.error("Select at least one chapter");
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/topics`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ mode: "add_chapters", chapter_ids: ids }),
      });
      const j = (await r.json().catch(() => ({}))) as { topics?: MappedTopic[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      setMapped(j.topics ?? []);
      toast.success("All topics from selected chapters added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeTopic = async (topicId: string) => {
    if (!hasPermission("courses.mapping.edit")) return toast.error("No permission");
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/topics`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ mode: "remove", topic_ids: [topicId] }),
      });
      const j = (await r.json().catch(() => ({}))) as { topics?: MappedTopic[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Remove failed");
      setMapped(j.topics ?? []);
      toast.success("Removed from course");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  const mappedIds = useMemo(() => new Set(mapped.map((m) => m.topic_id)), [mapped]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/courses">
            <ArrowLeft className="mr-1 h-4 w-4" /> Courses
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="page-title">Course mapping</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {courseName} — multi-select subjects, systems, and chapters, then add topics
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <ChecklistBlock
            title="Subjects"
            items={subjects.map((s) => ({ id: s.id, name: s.name }))}
            selected={subjectIds}
            onToggle={(id, on) => setSubjectIds((prev) => toggleId(prev, id, on))}
            emptyLabel="No subjects"
          />
          <ChecklistBlock
            title="Systems"
            items={systemItems}
            selected={systemIds}
            onToggle={(id, on) => setSystemIds((prev) => toggleId(prev, id, on))}
            disabled={!subjectIds.size}
            emptyLabel={subjectIds.size ? "No systems" : "Select subject(s) first"}
          />
          <ChecklistBlock
            title="Chapters"
            items={chapterItems}
            selected={chapterIds}
            onToggle={(id, on) => setChapterIds((prev) => toggleId(prev, id, on))}
            disabled={!systemIds.size}
            emptyLabel={systemIds.size ? "No chapters" : "Select system(s) first"}
          />
        </div>

        {chapterIds.size ? (
          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Topics in selected chapters {loadingCascade ? "(loading…)" : `(${topics.length})`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setSelectedTopics(new Set(topics.map((t) => t.id)))}
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTopics(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {topics.map((t) => {
                const checked = selectedTopics.has(t.id);
                const already = mappedIds.has(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setSelectedTopics((prev) => toggleId(prev, t.id, v === true))}
                      className="mt-0.5"
                    />
                    <span>
                      {t.name}
                      {already ? <span className="ml-1.5 text-[10px] text-emerald-600">mapped</span> : null}
                    </span>
                  </label>
                );
              })}
              {topics.length === 0 && !loadingCascade ? (
                <p className="col-span-full text-sm text-muted-foreground">No topics in selected chapters.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void addSelected()} disabled={saving || !selectedTopics.size}>
                {saving ? "Saving…" : `Add selected topics (${selectedTopics.size})`}
              </Button>
              <Button type="button" variant="secondary" onClick={() => void addAllChapters()} disabled={saving}>
                Add all topics from selected chapters
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Mapped topics ({mapped.length})</h2>
        {mapped.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing mapped yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {mapped.map((m) => (
              <li key={m.topic_id} className="flex items-start justify-between gap-2 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{m.topic_name}</p>
                  <p className="text-xs text-muted-foreground">{m.path}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive"
                  onClick={() => void removeTopic(m.topic_id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
