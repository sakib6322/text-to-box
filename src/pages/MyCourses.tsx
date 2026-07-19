import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";

type Course = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export default function MyCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl("/api/me/courses"), { headers: getAuthHeaders() });
        const j = (await r.json().catch(() => ({}))) as { courses?: Course[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? "Failed to load");
        setCourses(j.courses ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">My courses</h1>
          <p className="text-sm text-muted-foreground mt-1">Enrolled programs and unlocked syllabus</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/">Browse catalog</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : courses.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">You are not enrolled in any course yet.</p>
          <Button asChild>
            <Link to="/">Find a course</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {courses.map((c) => (
            <Link key={c.id} to={`/my-courses/${c.id}`}>
              <Card className="flex items-center gap-3 p-4 transition hover:border-primary/40">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{c.name}</p>
                  {c.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                  ) : null}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
