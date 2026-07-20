import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteProgressSet,
  adminFetchProgressSets,
  adminSaveProgressSet,
  type ProgressPracticeSet,
} from "@/lib/progressApi";
import type { ProgressScopeType, ProgressSetKind } from "@/lib/progressPlan";

const SET_KINDS: ProgressSetKind[] = [
  "concept_practice",
  "chapter_exam",
  "system_exam",
  "subject_final",
  "final_mock",
  "exam_night_pyq",
];

const SCOPES: ProgressScopeType[] = ["concept", "chapter", "system", "subject", "course"];

export default function AdminProgressSets() {
  const { id: courseId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<ProgressPracticeSet[]>([]);
  const [title, setTitle] = useState("");
  const [scopeType, setScopeType] = useState<ProgressScopeType>("chapter");
  const [scopeId, setScopeId] = useState("");
  const [setKind, setSetKind] = useState<ProgressSetKind>("chapter_exam");
  const [questionIdsRaw, setQuestionIdsRaw] = useState("");
  const [passPercent, setPassPercent] = useState(70);
  const [publishAt, setPublishAt] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setSets(await adminFetchProgressSets(courseId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [courseId]);

  const addSet = async () => {
    if (!title.trim()) return toast.error("Title required");
    const question_ids = questionIdsRaw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    if (!question_ids.length) return toast.error("Add at least one question ID");
    setSaving(true);
    try {
      await adminSaveProgressSet(courseId, {
        title: title.trim(),
        scope_type: scopeType,
        scope_id: scopeType === "course" ? null : scopeId.trim() || null,
        set_kind: setKind,
        question_ids,
        pass_percent: passPercent,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        is_required: true,
        sort_order: sets.length,
      });
      setTitle("");
      setQuestionIdsRaw("");
      toast.success("Set created");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeSet = async (setId: string) => {
    try {
      await adminDeleteProgressSet(setId);
      toast.success("Deleted");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Courses
        </Link>
      </Button>
      <div>
        <h1 className="page-title">Progress practice sets</h1>
        <p className="text-sm text-muted-foreground mt-1">Admin-managed sets for the Progress Plan (students cannot pick questions).</p>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold">New set</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Chapter 1 review" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Scope</Label>
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as ProgressScopeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Set kind</Label>
            <Select value={setKind} onValueChange={(v) => setSetKind(v as ProgressSetKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SET_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {scopeType !== "course" ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Scope ID (concept/chapter/system/subject UUID)</Label>
              <Input value={scopeId} onChange={(e) => setScopeId(e.target.value)} placeholder="uuid" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label className="text-xs">Pass %</Label>
            <Input type="number" value={passPercent} onChange={(e) => setPassPercent(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Publish at (optional, for Exam Night / mocks)</Label>
            <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Question IDs (comma or newline separated)</Label>
            <Textarea value={questionIdsRaw} onChange={(e) => setQuestionIdsRaw(e.target.value)} rows={3} placeholder="uuid1, uuid2, …" />
          </div>
        </div>
        <Button onClick={() => void addSet()} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add set
        </Button>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : sets.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No sets yet.</Card>
      ) : (
        <div className="space-y-2">
          {sets.map((s) => (
            <Card key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.set_kind} · {s.scope_type} · {s.question_ids.length} Q · pass {s.pass_percent}%
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removeSet(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
