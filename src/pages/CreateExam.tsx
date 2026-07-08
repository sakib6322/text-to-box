import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckSquare, Loader2, Save, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import { getSession } from "@/lib/auth";
import { createExam, fetchExam, updateExam } from "@/lib/exams";
import { QuestionPaperCard } from "@/components/QuestionPaperCard";

type QuestionRow = {
  id: string;
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
  marks?: number;
  mcq?: { stem?: string } | null;
  sba?: { stem?: string } | null;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMinutesToLocalInput(start: string, minutes: number): string {
  if (!start) return "";
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() + Math.max(1, minutes));
  return toLocalInput(d.toISOString());
}

export default function CreateExam() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [useScheduleWindow, setUseScheduleWindow] = useState(true);
  const [autoScheduleEnd, setAutoScheduleEnd] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingExam, setLoadingExam] = useState(Boolean(editId));

  const loadQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const qs = new URLSearchParams();
      if (typeFilter !== "all") qs.set("type", typeFilter);
      const res = await fetch(apiUrl(`/api/questions?${qs}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
      setQuestions(data.rows ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    if (!editId) return;
    setLoadingExam(true);
    fetchExam(editId)
      .then(({ exam, questions: eq }) => {
        setTitle(exam.title);
        setDescription(exam.description);
        setDurationMinutes(String(exam.durationMinutes));
        setScheduledStart(toLocalInput(exam.scheduledStart));
        setScheduledEnd(toLocalInput(exam.scheduledEnd));
        setUseScheduleWindow(Boolean(exam.scheduledStart));
        setAutoScheduleEnd(true);
        setSelected(new Set(eq.map((q) => q.id)));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Load exam failed"))
      .finally(() => setLoadingExam(false));
  }, [editId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter((row) =>
      `${row.concept} ${row.mcq?.stem ?? ""} ${row.sba?.stem ?? ""} ${row.subject}`.toLowerCase().includes(q),
    );
  }, [questions, search]);

  const selectedList = useMemo(() => questions.filter((q) => selected.has(q.id)), [questions, selected]);

  const totalMarks = useMemo(
    () => selectedList.reduce((sum, q) => sum + Number(q.marks ?? 1), 0),
    [selectedList],
  );

  const mcqCount = selectedList.filter((q) => q.questionMode === "mcq").length;
  const sbaCount = selectedList.filter((q) => q.questionMode === "sba").length;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!useScheduleWindow || !autoScheduleEnd || !scheduledStart) return;
    const duration = Math.max(1, Number(durationMinutes) || 60);
    setScheduledEnd(addMinutesToLocalInput(scheduledStart, duration));
  }, [scheduledStart, durationMinutes, useScheduleWindow, autoScheduleEnd]);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Exam title required");
    if (selected.size === 0) return toast.error("Select at least one question");
    const duration = Math.max(1, Number(durationMinutes) || 60);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      durationMinutes: duration,
      scheduledStart: useScheduleWindow && scheduledStart ? new Date(scheduledStart).toISOString() : null,
      scheduledEnd:
        useScheduleWindow && scheduledStart
          ? new Date(
              autoScheduleEnd
                ? addMinutesToLocalInput(scheduledStart, duration)
                : scheduledEnd || addMinutesToLocalInput(scheduledStart, duration),
            ).toISOString()
          : null,
      questionIds: Array.from(selected),
      createdBy: getSession()?.email ?? "",
    };
    setSaving(true);
    try {
      if (editId) {
        await updateExam(editId, payload);
        toast.success("Exam updated");
        navigate("/admin/exam/schedules");
      } else {
        const { exam } = await createExam(payload);
        toast.success("Exam created");
        navigate(`/admin/exam/schedules?highlight=${exam.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loadingExam) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading exam…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 border-b flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/admin/exam/schedules">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="page-title-static text-lg sm:text-xl truncate">{editId ? "Edit exam" : "Create exam"}</h1>
          <p className="text-xs text-muted-foreground">All Questions থেকে MCQ/SBA সিলেক্ট করুন</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Exam title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Medicine Mock Test 1" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional notes…" />
        </div>
        <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={useScheduleWindow}
              onCheckedChange={(v) => setUseScheduleWindow(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Exam schedule window</p>
              <p className="text-xs text-muted-foreground">
                Schedule start অনুযায়ী exam শুরু হবে · End time duration থেকে auto-set হবে
              </p>
            </div>
          </label>

          {useScheduleWindow ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Schedule start *</Label>
                <Input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Schedule end</Label>
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={autoScheduleEnd}
                      onCheckedChange={(v) => setAutoScheduleEnd(v === true)}
                      className="h-3.5 w-3.5"
                    />
                    Auto
                  </label>
                </div>
                <Input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => {
                    setAutoScheduleEnd(false);
                    setScheduledEnd(e.target.value);
                  }}
                  disabled={autoScheduleEnd}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 max-w-xs">
              <Label className="text-xs">Duration (min)</Label>
              <Input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 rounded-lg bg-muted/40 p-3 text-sm">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Badge variant="outline">MCQ {mcqCount}</Badge>
          <Badge variant="outline">SBA {sbaCount}</Badge>
          <Badge className="ml-auto tabular-nums">Total marks: {totalMarks}</Badge>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions…"
            className="flex-1 min-w-[140px]"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="sba">SBA</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loadingQuestions ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No questions found</p>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {filtered.map((q) => {
              const checked = selected.has(q.id);
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-3 transition-colors ${checked ? "border-primary/50 bg-primary/5" : "border-border"}`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggle(q.id)} className="mt-1" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Badge variant="outline" className="text-[10px] uppercase">{q.questionMode}</Badge>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{q.marks ?? 1} mark</span>
                        {q.concept ? <span className="text-xs font-medium truncate">{q.concept}</span> : null}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {q.mcq?.stem ?? q.sba?.stem ?? "—"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        toggle(q.id);
                      }}
                    >
                      {checked ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                    </Button>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedList.length > 0 ? (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Question paper preview ({selectedList.length})</h2>
          <div className="space-y-4 max-h-[40vh] overflow-y-auto">
            {selectedList.map((q, i) => (
              <QuestionPaperCard
                key={q.id}
                index={i}
                questionMode={q.questionMode}
                subject={q.subject}
                system={q.system}
                chapter={q.chapter}
                topic={q.topic}
                concept={q.concept}
                marks={q.marks}
                mcq={q.mcq}
                sba={q.sba}
              />
            ))}
          </div>
        </Card>
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t md:hidden">
        <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {editId ? "Update exam" : "Create exam"} · {totalMarks} marks
        </Button>
      </div>
    </div>
  );
}
