import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, hasPermission } from "@/lib/auth";

type Enrollment = {
  user_id: string;
  source: string;
  enrolled_at: string;
  user?: { id: string; email: string; display_name?: string | null; role?: string } | null;
};

type SearchUser = { id: string; email: string; display_name?: string | null; role?: string };

export default function AdminCourseEnrollments() {
  const { id: courseId = "" } = useParams();
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [email, setEmail] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [courseName, setCourseName] = useState("Course");

  const load = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/enrollments`), { headers: getAuthHeaders() });
    const j = (await r.json().catch(() => ({}))) as { enrollments?: Enrollment[]; error?: string };
    if (!r.ok) throw new Error(j.error ?? "Failed to load");
    setRows(j.enrollments ?? []);
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

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void (async () => {
        const r = await fetch(apiUrl(`/api/admin/users/search?q=${encodeURIComponent(q.trim())}`), {
          headers: getAuthHeaders(),
        });
        const j = (await r.json().catch(() => ({}))) as { users?: SearchUser[] };
        if (r.ok) setHits(j.users ?? []);
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const assign = async (payload: { user_id?: string; email?: string }) => {
    if (!hasPermission("courses.enroll.manage")) return toast.error("No permission");
    setSaving(true);
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/enrollments`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Assign failed");
      toast.success("Student enrolled");
      setEmail("");
      setQ("");
      setHits([]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (userId: string) => {
    if (!hasPermission("courses.enroll.manage")) return toast.error("No permission");
    try {
      const r = await fetch(apiUrl(`/api/admin/courses/${courseId}/enrollments/${userId}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Remove failed");
      toast.success("Removed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/courses">
          <ArrowLeft className="mr-1 h-4 w-4" /> Courses
        </Link>
      </Button>
      <div>
        <h1 className="page-title">Enrollments</h1>
        <p className="text-sm text-muted-foreground mt-1">{courseName} — admin assign (students can also self-enroll)</p>
      </div>

      <Card className="space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Enroll by email</Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@example.com"
              />
              <Button
                type="button"
                disabled={saving || !email.trim()}
                onClick={() => void assign({ email: email.trim() })}
                className="gap-1 shrink-0"
              >
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Search users</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email…" />
            {hits.length > 0 ? (
              <ul className="mt-1 max-h-40 overflow-auto rounded-md border text-sm">
                {hits.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                      onClick={() => void assign({ user_id: u.id })}
                    >
                      <span>
                        {u.display_name || u.email}
                        <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>
                      </span>
                      <Badge variant="secondary">{u.role}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold mb-3">Enrolled ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No enrollments yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((row) => (
              <li key={row.user_id} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium">{row.user?.display_name || row.user?.email || row.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.user?.email} · {row.source} · {new Date(row.enrolled_at).toLocaleString()}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void remove(row.user_id)}>
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
