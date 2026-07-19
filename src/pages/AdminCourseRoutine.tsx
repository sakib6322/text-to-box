import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, hasPermission } from "@/lib/auth";

type Routine = {
  id: string;
  system_id: string;
  system_name?: string | null;
  subject_name?: string | null;
  publish_date: string;
  label: string;
  mapped_topic_count?: number;
};

type MappableSystem = {
  system_id: string;
  system_name?: string | null;
  subject_name?: string | null;
  mapped_topic_count?: number;
};

export default function AdminCourseRoutine() {
  const { id: courseId = "" } = useParams();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [mappable, setMappable] = useState<MappableSystem[]>([]);
  const [systemId, setSystemId] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [courseName, setCourseName] = useState("Course");

  const load = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/routines`), { headers: getAuthHeaders() });
    const j = (await r.json().catch(() => ({}))) as {
      routines?: Routine[];
      mappable_systems?: MappableSystem[];
      error?: string;
    };
    if (!r.ok) throw new Error(j.error ?? "Failed to load");
    setRoutines(j.routines ?? []);
    setMappable(j.mappable_systems ?? []);
  }, [courseId]);

  useEffect(() => {
    void (async () => {
      try {
        const coursesRes = await fetch(apiUrl("/api/admin/courses"), { headers: getAuthHeaders() });
        const cj = (await coursesRes.json().catch(() => ({}))) as { courses?: { id: string; name: string }[] };
        setCourseName(cj.courses?.find((c) => c.id === courseId)?.name ?? "Course");
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      }
    })();
  }, [courseId, load]);

  const add = async () => {
    if (!hasPermission("courses.routine.edit")) return toast.error("No permission");
    if (!systemId || !publishDate) return toast.error("System and date required");
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/routines`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ system_id: systemId, publish_date: publishDate, label }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      toast.success("Routine saved");
      setSystemId("");
      setLabel("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (routineId: string) => {
    if (!hasPermission("courses.routine.edit")) return toast.error("No permission");
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/routines/${routineId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      toast.success("Removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const scheduledIds = new Set(routines.map((r) => r.system_id));
  const available = mappable.filter((m) => !scheduledIds.has(m.system_id));

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Courses
        </Link>
      </Button>
      <div>
        <h1 className="page-title">Course routine</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {courseName} — unlock mapped systems by publish date (Asia/Dhaka)
        </p>
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Example: 27-Jul-26 unlocks Anatomy → Head & Neck (all mapped topics in that system).
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label>System</Label>
            <Select value={systemId || undefined} onValueChange={setSystemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.system_id} value={s.system_id}>
                    {(s.subject_name ? `${s.subject_name} · ` : "") + (s.system_name ?? s.system_id)} (
                    {s.mapped_topic_count ?? 0} topics)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Publish date</Label>
            <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Label (optional)</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Week 1" />
          </div>
        </div>
        <Button type="button" onClick={() => void add()} disabled={saving} className="gap-1">
          <Plus className="h-4 w-4" /> {saving ? "Saving…" : "Add to routine"}
        </Button>
        {mappable.length === 0 ? (
          <p className="text-xs text-amber-700">Map topics first — only systems with mapped topics appear here.</p>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-3">Scheduled unlocks</h2>
        {routines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routine rows yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {routines.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium tabular-nums">{r.publish_date}</p>
                  <p>
                    {r.subject_name ? `${r.subject_name} · ` : ""}
                    {r.system_name}
                    {r.label ? ` — ${r.label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unlocks {r.mapped_topic_count ?? 0} mapped topic(s)
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
