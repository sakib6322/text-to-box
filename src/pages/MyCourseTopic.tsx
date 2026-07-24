import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProgressPctBadge } from "@/components/ProgressPctBadge";
import {
  getCachedCourseProgress,
  getCachedTopicConcepts,
  loadCourseProgressCached,
  loadTopicConcepts,
} from "@/lib/courseBrowseCache";
import {
  getStudyProgress,
  hydrateProgressFromServer,
  studyCompletionPct,
} from "@/lib/userProgress";
import {
  conceptDetailsLink,
  conceptLearnLink,
  courseBrowseLink,
  resolveBrowseBackNav,
  type CourseBrowseNavState,
  type CourseTopicPath,
} from "@/lib/courseBrowseNav";

type Concept = { id: string; title: string };

export default function MyCourseTopic() {
  const { courseId = "", topicId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const cached = courseId && topicId ? getCachedTopicConcepts(courseId, topicId) : null;
  const cachedProgress = courseId ? getCachedCourseProgress(courseId) : null;
  const [topicPath, setTopicPath] = useState<CourseTopicPath | null>(
    () => (cached?.path as CourseTopicPath | null) ?? null,
  );
  const [concepts, setConcepts] = useState<Concept[]>(() => cached?.concepts ?? []);
  const [topicPct, setTopicPct] = useState<number | null>(() => {
    if (!cachedProgress) return null;
    return cachedProgress.topics.find((t) => t.topic_id === topicId)?.pct ?? null;
  });
  const [conceptPctMap, setConceptPctMap] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!cachedProgress) return map;
    for (const c of cachedProgress.concepts) {
      if (c.topic_id === topicId) map.set(c.concept_id, c.pct);
    }
    return map;
  });
  const [loading, setLoading] = useState(!(cached?.concepts && cached.concepts.length > 0) && !cached?.unlocks_on);
  const [lockedMsg, setLockedMsg] = useState<string | null>(
    () => (cached?.status === 403 && cached.unlocks_on ? `Unlocks on ${cached.unlocks_on}` : null),
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!courseId || !topicId) return;
    let cancelled = false;
    void (async () => {
      const hadCache = Boolean(getCachedTopicConcepts(courseId, topicId)?.concepts?.length);
      if (!hadCache) setLoading(true);
      try {
        const conceptsPromise = loadTopicConcepts(courseId, topicId);
        const progressPromise = loadCourseProgressCached(courseId).catch(() => null);
        void hydrateProgressFromServer().catch(() => undefined);

        const j = await conceptsPromise;
        if (cancelled) return;
        if (j.status === 403 && j.unlocks_on) {
          setLockedMsg(`Unlocks on ${j.unlocks_on}`);
          setConcepts([]);
          setLoading(false);
          return;
        }
        if (j.error && j.status && j.status >= 400) {
          throw new Error(j.error);
        }
        setLockedMsg(null);
        setConcepts(j.concepts ?? []);
        setTopicPath((j.path as CourseTopicPath | null) ?? null);
        setLoading(false);

        const progressRes = await progressPromise;
        if (cancelled || !progressRes) {
          setTick((n) => n + 1);
          return;
        }
        const topic = progressRes.topics.find((t) => t.topic_id === topicId);
        setTopicPct(topic?.pct ?? null);
        const map = new Map<string, number>();
        for (const c of progressRes.concepts) {
          if (c.topic_id === topicId) map.set(c.concept_id, c.pct);
        }
        setConceptPctMap(map);
        setTick((n) => n + 1);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, topicId]);

  const pathLabel = topicPath?.path ?? "";
  const browseNav = useMemo(
    (): CourseBrowseNavState =>
      resolveBrowseBackNav({ courseId, locationState: location.state, topicPath }),
    [courseId, location.state, topicPath],
  );

  /** Server rollup + local additive (slides etc.) — each concept's total %. */
  const conceptTotalPct = (conceptId: string): number => {
    const server = conceptPctMap.get(conceptId);
    const local = studyCompletionPct(getStudyProgress(conceptId));
    if (server == null) return local;
    return Math.max(server, local);
  };

  const goBackToTopics = () => {
    const nav = resolveBrowseBackNav({ courseId, locationState: location.state, topicPath });
    // Always land on the topics list for this chapter — never jump to subjects
    const backNav: CourseBrowseNavState = {
      step: "topics",
      subjectId: nav.subjectId ?? topicPath?.subject_id ?? null,
      systemId: nav.systemId ?? topicPath?.system_id ?? null,
      chapterId: nav.chapterId ?? topicPath?.chapter_id ?? null,
    };
    navigate(courseBrowseLink(courseId, backNav));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Button type="button" variant="ghost" size="sm" onClick={goBackToTopics}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title">Topic concepts</h1>
          {topicPct != null ? <ProgressPctBadge pct={topicPct} size="md" /> : null}
        </div>
        {pathLabel ? <p className="mt-1 text-sm text-muted-foreground">{pathLabel}</p> : null}
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
            const pct = conceptTotalPct(c.id);
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</p>
                    <ProgressPctBadge pct={pct} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-1.5 max-w-[140px] flex-1" />
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link to={conceptLearnLink(courseId, c.id, topicId, browseNav)}>
                      <GraduationCap className="h-3.5 w-3.5" /> Study
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="gap-1">
                    <Link to={conceptDetailsLink(courseId, c.id, topicId, browseNav)}>
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
