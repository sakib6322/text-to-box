import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Map, Plus, Trash2, Users, Pencil, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, hasPermission } from "@/lib/auth";
import { slugifyCourseName } from "@/lib/courseMappingPlan";

type Course = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  sort_order: number;
  topic_count?: number;
  enrollment_count?: number;
};

const emptyForm = { name: "", slug: "", description: "", status: "draft" as const, sort_order: 0 };

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/admin/courses"), { headers: getAuthHeaders() });
      const j = (await r.json().catch(() => ({}))) as { courses?: Course[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "Failed to load");
      setCourses(j.courses ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      status: c.status,
      sort_order: c.sort_order ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (editing && !hasPermission("courses.edit")) return toast.error("No permission");
    if (!editing && !hasPermission("courses.add")) return toast.error("No permission");
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugifyCourseName(form.name),
        description: form.description.trim(),
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
      };
      const r = await fetch(
        apiUrl(editing ? `/api/admin/courses/${editing.id}` : "/api/admin/courses"),
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify(body),
        },
      );
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Save failed");
      toast.success(editing ? "Course updated" : "Course created");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Course) => {
    if (!hasPermission("courses.delete")) return toast.error("No permission");
    if (!confirm(`Delete “${c.name}”? This removes mapping, routines, and enrollments.`)) return;
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${c.id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Delete failed");
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create programs, map syllabus topics, schedule unlocks, and manage enrollments.
          </p>
        </div>
        {hasPermission("courses.add") ? (
          <Button type="button" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add course
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No courses yet. Add FCPS Part-I Pediatrics, Medicine, Residency, and more.
        </Card>
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => (
            <Card key={c.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-base">{c.name}</h2>
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  {c.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground pt-1">
                    {c.topic_count ?? 0} topics · {c.enrollment_count ?? 0} enrolled
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link to={`/admin/courses/${c.id}/mapping`}>
                      <Map className="h-3.5 w-3.5" /> Mapping
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link to={`/admin/courses/${c.id}/routine`}>
                      <CalendarDays className="h-3.5 w-3.5" /> Routine
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link to={`/admin/courses/${c.id}/enrollments`}>
                      <Users className="h-3.5 w-3.5" /> Enroll
                    </Link>
                  </Button>
                  {hasPermission("progress.sets.manage") ? (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <Link to={`/admin/courses/${c.id}/progress-sets`}>
                        <Target className="h-3.5 w-3.5" /> Progress sets
                      </Link>
                    </Button>
                  ) : null}
                  {hasPermission("courses.edit") ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  {hasPermission("courses.delete") ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => void remove(c)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit course" : "Add course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug: editing ? f.slug : slugifyCourseName(name),
                  }));
                }}
                placeholder="FCPS Part-I Pediatrics"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugifyCourseName(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as "draft" | "published" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                />
                <p className="text-[10px] text-muted-foreground">Lower number appears first on the catalog.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
