import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";

type Course = {
  id: string;
  name: string;
  slug: string;
  description: string;
  topic_count?: number;
  routine_count?: number;
};

export default function CoursePublicDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/courses/${encodeURIComponent(slug)}`));
        const j = (await r.json().catch(() => ({}))) as { course?: Course; error?: string };
        if (!r.ok) throw new Error(j.error ?? "Not found");
        setCourse(j.course ?? null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const enroll = async () => {
    if (!course) return;
    if (!isAuthenticated()) {
      navigate("/login", { state: { from: `/courses/${slug}`, enrollCourseId: course.id } });
      return;
    }
    setEnrolling(true);
    try {
      const r = await fetch(apiUrl(`/api/courses/${course.id}/enroll`), {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; status?: string };
      if (!r.ok) throw new Error(j.error ?? "Enroll failed");
      if (j.status === "pending") {
        toast.success("Enrollment requested — waiting for admin approval");
        navigate("/my-courses");
      } else {
        toast.success("Enrolled");
        navigate(`/my-courses/${course.id}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enroll failed");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!course) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Button asChild className="mt-4" variant="outline">
          <Link to="/">Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e8f4fb]">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" /> All courses
          </Link>
        </Button>
        <Card className="space-y-4 p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">PG Diary</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{course.name}</h1>
          </div>
          {course.description ? <p className="text-sm leading-relaxed text-slate-600">{course.description}</p> : null}
          <p className="text-xs text-muted-foreground">
            {course.topic_count ?? 0} syllabus topics · {course.routine_count ?? 0} scheduled unlocks
          </p>
          <Button type="button" className="w-full bg-sky-600 hover:bg-sky-700" disabled={enrolling} onClick={() => void enroll()}>
            {enrolling ? "Enrolling…" : isAuthenticated() ? "Enroll in this course" : "Login to enroll"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
