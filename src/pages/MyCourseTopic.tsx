import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";

type Concept = { id: string; title: string };

export default function MyCourseTopic() {
  const { courseId = "", topicId = "" } = useParams();
  const [path, setPath] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(apiUrl(`/api/me/courses/${courseId}/topics/${topicId}/concepts`), {
          headers: getAuthHeaders(),
        });
        const j = (await r.json().catch(() => ({}))) as {
          concepts?: Concept[];
          path?: { path?: string };
          error?: string;
          unlocks_on?: string;
        };
        if (!r.ok) {
          if (r.status === 403 && j.unlocks_on) {
            setLockedMsg(`Unlocks on ${j.unlocks_on}`);
            return;
          }
          throw new Error(j.error ?? "Failed to load");
        }
        setConcepts(j.concepts ?? []);
        setPath(j.path?.path ?? "");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, topicId]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/my-courses/${courseId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to course
        </Link>
      </Button>
      <div>
        <h1 className="page-title">Topic concepts</h1>
        {path ? <p className="text-sm text-muted-foreground mt-1">{path}</p> : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lockedMsg ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">{lockedMsg}</Card>
      ) : concepts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No concepts under this topic yet.</Card>
      ) : (
        <div className="grid gap-2">
          {concepts.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
              <p className="font-medium text-sm">{c.title}</p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to={`/concept/${c.id}/learn`}>
                    <GraduationCap className="h-3.5 w-3.5" /> Study
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="gap-1">
                  <Link to={`/concept/${c.id}/details`}>
                    <BookOpen className="h-3.5 w-3.5" /> Details
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
