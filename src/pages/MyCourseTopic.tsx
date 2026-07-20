import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressPctBadge } from "@/components/ProgressPctBadge";
import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";
import { fetchCourseProgress } from "@/lib/progressApi";

type Concept = { id: string; title: string };

export default function MyCourseTopic() {
  const { courseId = "", topicId = "" } = useParams();
  const [path, setPath] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [topicPct, setTopicPct] = useState<number | null>(null);
  const [conceptPctMap, setConceptPctMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lockedMsg, setLockedMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [conceptsRes, progressRes] = await Promise.all([
          fetch(apiUrl(`/api/me/courses/${courseId}/topics/${topicId}/concepts`), {
            headers: getAuthHeaders(),
          }),
          fetchCourseProgress(courseId).catch(() => null),
        ]);
        const j = (await conceptsRes.json().catch(() => ({}))) as {
          concepts?: Concept[];
          path?: { path?: string };
          error?: string;
          unlocks_on?: string;
        };
        if (!conceptsRes.ok) {
          if (conceptsRes.status === 403 && j.unlocks_on) {
            setLockedMsg(`Unlocks on ${j.unlocks_on}`);
            return;
          }
          throw new Error(j.error ?? "Failed to load");
        }
        setConcepts(j.concepts ?? []);
        setPath(j.path?.path ?? "");
        if (progressRes) {
          const topic = progressRes.topics.find((t) => t.topic_id === topicId);
          setTopicPct(topic?.pct ?? null);
          const map = new Map<string, number>();
          for (const c of progressRes.concepts) {
            if (topic && c.topic_id === topicId) map.set(c.concept_id, c.pct);
          }
          setConceptPctMap(map);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, topicId]);

  const learnHref = useMemo(
    () => (conceptId: string) => `/concept/${conceptId}/learn?courseId=${courseId}`,
    [courseId],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/my-courses/${courseId}`}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to course
        </Link>
      </Button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title">Topic concepts</h1>
          {topicPct != null ? <ProgressPctBadge pct={topicPct} size="md" /> : null}
        </div>
        {path ? <p className="text-sm text-muted-foreground mt-1">{path}</p> : null}
        {topicPct != null ? (
          <div className="mt-2 max-w-xs">
            <Progress value={topicPct} className="h-1.5" />
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : lockedMsg ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">{lockedMsg}</Card>
      ) : concepts.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No concepts under this topic yet.</Card>
      ) : (
        <div className="grid gap-2">
          {concepts.map((c) => {
            const pct = conceptPctMap.get(c.id);
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-sm">{c.title}</p>
                  {pct != null ? (
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1 max-w-[120px]" />
                      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to={learnHref(c.id)}>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
