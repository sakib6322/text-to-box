import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Lock, Moon, Play, Star, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressPctBadge } from "@/components/ProgressPctBadge";
import { TaxonomyBrowseList } from "@/components/TaxonomyBrowseList";
import {
  getCachedCourseBrowse,
  getCachedCourseProgress,
  loadCourseBrowse,
  loadCourseProgressCached,
  prefetchTopicConcepts,
} from "@/lib/courseBrowseCache";
import type { TaxonomyItem } from "@/lib/taxonomy";
import { fetchProgressSets, type CourseProgressRollup, type ProgressPracticeSet } from "@/lib/progressApi";
import { formatProgressPct, useProgressAppearance } from "@/hooks/useProgressAppearance";
import {
  persistCourseBrowseNav,
  readCourseBrowseNav,
  readPersistedCourseBrowseNav,
  topicConceptsLink,
  type CourseBrowseNavState,
  type CourseBrowseStep,
} from "@/lib/courseBrowseNav";

type TopicRow = {
  topic_id: string;
  topic_name: string;
  chapter_id: string | null;
  chapter_name: string | null;
  stars: number;
  concept_count: number;
};

type SystemBlock = {
  system_id: string;
  system_name: string | null;
  subject_id: string | null;
  subject_name: string | null;
  unlocked: boolean;
  publish_date: string | null;
  label: string;
  topics: TopicRow[];
};

type BrowseStep = CourseBrowseStep;

function browseNavState(
  step: BrowseStep,
  subjectId: string | null,
  systemId: string | null,
  chapterId: string | null,
): CourseBrowseNavState {
  return { step, subjectId, systemId, chapterId };
}

function Stars({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex text-amber-500" aria-label={`${n} stars`}>
      {Array.from({ length: Math.min(n, 3) }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

export default function MyCourseBrowse() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pp = useProgressAppearance();
  const initialNav =
    readCourseBrowseNav(location.state) ?? (courseId ? readPersistedCourseBrowseNav(courseId) : null);
  const pendingNavRef = useRef(initialNav);
  const cachedBrowse = courseId ? getCachedCourseBrowse(courseId) : null;
  const cachedProgress = courseId ? getCachedCourseProgress(courseId) : null;
  const [name, setName] = useState(cachedBrowse?.course?.name ?? "Course");
  const [today, setToday] = useState(cachedBrowse?.today ?? "");
  const [systems, setSystems] = useState<SystemBlock[]>(() => (cachedBrowse?.systems as SystemBlock[]) ?? []);
  const [loading, setLoading] = useState(!cachedBrowse);
  const [rollup, setRollup] = useState<CourseProgressRollup | null>(cachedProgress);
  const [examNightSets, setExamNightSets] = useState<ProgressPracticeSet[]>([]);
  const [finalMockSets, setFinalMockSets] = useState<ProgressPracticeSet[]>([]);
  const [, startTransition] = useTransition();

  const [step, setStep] = useState<BrowseStep>(() => initialNav?.step ?? "subjects");
  const [subjectId, setSubjectId] = useState<string | null>(() => initialNav?.subjectId ?? null);
  const [systemId, setSystemId] = useState<string | null>(() => initialNav?.systemId ?? null);
  const [chapterId, setChapterId] = useState<string | null>(() => initialNav?.chapterId ?? null);

  const applyNav = (nav: CourseBrowseNavState | null | undefined) => {
    if (!nav) return;
    setStep(nav.step);
    setSubjectId(nav.subjectId ?? null);
    setSystemId(nav.systemId ?? null);
    setChapterId(nav.chapterId ?? null);
    if (courseId) persistCourseBrowseNav(courseId, nav);
  };

  // Restore hierarchy when returning from Topic Concepts (location state / session)
  useEffect(() => {
    const nav =
      readCourseBrowseNav(location.state) ?? (courseId ? readPersistedCourseBrowseNav(courseId) : null);
    if (!nav) return;
    applyNav(nav);
    pendingNavRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when router location changes
  }, [courseId, location.key, location.state]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void (async () => {
      if (!getCachedCourseBrowse(courseId)) setLoading(true);
      try {
        const j = await loadCourseBrowse(courseId);
        if (cancelled) return;
        setName(j.course?.name ?? "Course");
        setToday(j.today ?? "");
        setSystems((j.systems as SystemBlock[]) ?? []);
        const pending =
          pendingNavRef.current ??
          readCourseBrowseNav(location.state) ??
          readPersistedCourseBrowseNav(courseId);
        if (pending && (j.systems ?? []).length) {
          applyNav(pending);
          pendingNavRef.current = null;
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Keep session nav in sync while browsing
  useEffect(() => {
    if (!courseId) return;
    persistCourseBrowseNav(courseId, browseNavState(step, subjectId, systemId, chapterId));
  }, [courseId, step, subjectId, systemId, chapterId]);

  // Progress badges — never block the hierarchy UI
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void (async () => {
      try {
        const progress = await loadCourseProgressCached(courseId);
        if (cancelled) return;
        setRollup(progress);
        const [exam, mocks] = await Promise.all([
          progress.exam_night_visible
            ? fetchProgressSets(courseId, { set_kind: "exam_night_pyq" })
            : Promise.resolve([] as ProgressPracticeSet[]),
          progress.final_mocks.total > 0 && progress.final_mocks.passed < progress.final_mocks.total
            ? fetchProgressSets(courseId, { set_kind: "final_mock" })
            : Promise.resolve([] as ProgressPracticeSet[]),
        ]);
        if (cancelled) return;
        setExamNightSets(exam);
        setFinalMockSets(mocks);
      } catch {
        if (!cancelled) {
          setRollup(null);
          setExamNightSets([]);
          setFinalMockSets([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const goStep = (next: BrowseStep, patch: { subjectId?: string | null; systemId?: string | null; chapterId?: string | null }) => {
    startTransition(() => {
      if ("subjectId" in patch) setSubjectId(patch.subjectId ?? null);
      if ("systemId" in patch) setSystemId(patch.systemId ?? null);
      if ("chapterId" in patch) setChapterId(patch.chapterId ?? null);
      setStep(next);
    });
  };

  const subjectName = useMemo(() => {
    if (!subjectId) return "";
    return systems.find((s) => s.subject_id === subjectId)?.subject_name ?? "";
  }, [systems, subjectId]);

  const selectedSystem = useMemo(
    () => (systemId ? systems.find((s) => s.system_id === systemId) ?? null : null),
    [systems, systemId],
  );

  const chapterName = useMemo(() => {
    if (!chapterId || !selectedSystem) return "";
    return selectedSystem.topics.find((t) => t.chapter_id === chapterId)?.chapter_name ?? "";
  }, [selectedSystem, chapterId]);

  const pctBySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of rollup?.subjects ?? []) map.set(s.subject_id, s.pct);
    return map;
  }, [rollup]);

  const pctBySystem = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of rollup?.systems ?? []) map.set(s.system_id, s.pct);
    return map;
  }, [rollup]);

  const pctByChapter = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rollup?.chapters ?? []) map.set(c.chapter_id, c.pct);
    return map;
  }, [rollup]);

  const pctByTopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of rollup?.topics ?? []) map.set(t.topic_id, t.pct);
    return map;
  }, [rollup]);

  const subjectItems: TaxonomyItem[] = useMemo(() => {
    const map = new Map<string, TaxonomyItem>();
    for (const s of systems) {
      if (!s.subject_id || !s.subject_name) continue;
      if (!map.has(s.subject_id)) {
        const pct = pctBySubject.get(s.subject_id);
        map.set(s.subject_id, {
          id: s.subject_id,
          name: s.subject_name,
          subtitle: pct != null && pp.showProgressOnBrowse ? formatProgressPct(pct) : undefined,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [systems, pctBySubject]);

  const systemItems: TaxonomyItem[] = useMemo(() => {
    if (!subjectId) return [];
    return systems
      .filter((s) => s.subject_id === subjectId)
      .map((s) => {
        const pct = pctBySystem.get(s.system_id);
        const lockedSuffix = s.unlocked
          ? ""
          : ` (locked${s.publish_date ? ` · ${s.publish_date}` : ""})`;
        return {
          id: s.system_id,
          name: `${s.system_name ?? "System"}${lockedSuffix}`,
          subtitle: pct != null && pp.showProgressOnBrowse ? formatProgressPct(pct) : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [systems, subjectId, pctBySystem]);

  const chapterItems: TaxonomyItem[] = useMemo(() => {
    if (!selectedSystem?.unlocked) return [];
    const map = new Map<string, TaxonomyItem>();
    for (const t of selectedSystem.topics) {
      if (!t.chapter_id || !t.chapter_name) continue;
      if (!map.has(t.chapter_id)) {
        const pct = pctByChapter.get(t.chapter_id);
        map.set(t.chapter_id, {
          id: t.chapter_id,
          name: t.chapter_name,
          subtitle: pct != null && pp.showProgressOnBrowse ? formatProgressPct(pct) : undefined,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedSystem]);

  const topicRows = useMemo(() => {
    if (!selectedSystem?.unlocked || !chapterId) return [];
    return selectedSystem.topics
      .filter((t) => t.chapter_id === chapterId)
      .sort((a, b) => a.topic_name.localeCompare(b.topic_name));
  }, [selectedSystem, chapterId]);

  const goBack = () => {
    if (step === "topics") {
      goStep("chapters", { chapterId: null });
      return;
    }
    if (step === "chapters") {
      goStep("systems", { systemId: null, chapterId: null });
      return;
    }
    if (step === "systems") {
      goStep("subjects", { subjectId: null, systemId: null, chapterId: null });
      return;
    }
    navigate("/my-courses");
  };

  const stepTitle =
    step === "subjects"
      ? "Select subject"
      : step === "systems"
        ? "Select system"
        : step === "chapters"
          ? "Select chapter"
          : "Select topic";

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-10">
      <Button type="button" variant="ghost" size="sm" onClick={goBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="page-title">{name}</h1>
          {rollup && pp.showProgressOnBrowse ? <ProgressPctBadge pct={rollup.course_pct} size="md" /> : null}
          {rollup?.course_complete ? <Badge variant="default">{pp.courseCompleteLabel}</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Subject → System → Chapter → Topic · today (Dhaka): {today || "—"}
        </p>
        {rollup?.final_mocks && rollup.final_mocks.total > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Final mocks: {rollup.final_mocks.passed} / {rollup.final_mocks.total} passed
          </p>
        ) : null}
      </div>

      {pp.enabled && pp.showExamNightCard && rollup?.exam_night_visible && examNightSets.length > 0 ? (
        <Card
          className="p-4"
          style={{
            background: pp.examNightCardBg,
            borderColor: pp.examNightBorder,
          }}
        >
          <div className="flex items-start gap-3">
            <Moon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: pp.examNightIconColor }} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold">{pp.examNightTitle}</p>
                <p className="text-xs text-muted-foreground">{pp.examNightSubtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {examNightSets.map((set) => (
                  <Button
                    key={set.id}
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={() => navigate(`/progress/set/${set.id}?courseId=${courseId}`)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {set.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {pp.enabled && pp.showFinalMockCard && finalMockSets.length > 0 ? (
        <Card
          className="p-4"
          style={{
            background: pp.finalMockCardBg,
            borderColor: pp.finalMockBorder,
          }}
        >
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-5 w-5 shrink-0" style={{ color: pp.finalMockIconColor }} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold">{pp.finalMockTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {pp.finalMockSubtitle} · {rollup?.final_mocks.passed ?? 0} / {rollup?.final_mocks.total ?? 0} {pp.finalMockProgressLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {finalMockSets.map((set) => (
                  <Button
                    key={set.id}
                    size="sm"
                    variant={set.attempt?.passed ? "outline" : "default"}
                    className="gap-1"
                    onClick={() => navigate(`/progress/set/${set.id}?courseId=${courseId}`)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {set.title}
                    {set.attempt?.passed ? " · Passed" : ""}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {!loading && systems.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setStep("subjects");
                setSubjectId(null);
                setSystemId(null);
                setChapterId(null);
              }}
            >
              Subjects
            </button>
            {subjectName ? (
              <>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  type="button"
                  className={
                    step === "systems" ? "font-semibold text-foreground" : "text-primary hover:underline"
                  }
                  onClick={() => {
                    setStep("systems");
                    setSystemId(null);
                    setChapterId(null);
                  }}
                >
                  {subjectName}
                </button>
              </>
            ) : null}
            {selectedSystem?.system_name ? (
              <>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  type="button"
                  className={
                    step === "chapters" ? "font-semibold text-foreground" : "text-primary hover:underline"
                  }
                  onClick={() => {
                    setStep("chapters");
                    setChapterId(null);
                  }}
                >
                  {selectedSystem.system_name}
                </button>
              </>
            ) : null}
            {chapterName ? (
              <>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <span className="font-semibold text-foreground">{chapterName}</span>
              </>
            ) : null}
          </div>

          <h2 className="text-base font-semibold">{stepTitle}</h2>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : systems.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No mapped topics yet. Ask your admin to map the syllabus and publish a routine.
        </Card>
      ) : step === "subjects" ? (
        <TaxonomyBrowseList
          items={subjectItems}
          emptyLabel="No subjects mapped in this course"
          onSelect={(item) => goStep("systems", { subjectId: item.id, systemId: null, chapterId: null })}
        />
      ) : step === "systems" ? (
        <TaxonomyBrowseList
          items={systemItems}
          emptyLabel="No systems under this subject"
          onSelect={(item) => {
            const sys = systems.find((s) => s.system_id === item.id);
            if (sys && !sys.unlocked) {
              toast.message(
                sys.publish_date
                  ? `This system unlocks on ${sys.publish_date}`
                  : "This system is not scheduled yet",
              );
            }
            goStep("chapters", { systemId: item.id, chapterId: null });
          }}
        />
      ) : step === "chapters" ? (
        selectedSystem && !selectedSystem.unlocked ? (
          <Card className="space-y-2 p-6 text-center">
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" /> Locked
            </Badge>
            <p className="text-sm font-medium">{selectedSystem.system_name}</p>
            <p className="text-xs text-muted-foreground">
              {selectedSystem.publish_date
                ? `Content unlocks on ${selectedSystem.publish_date}`
                : "Not scheduled in the course routine yet"}
              {selectedSystem.label ? ` · ${selectedSystem.label}` : ""}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              Choose another system
            </Button>
          </Card>
        ) : (
          <TaxonomyBrowseList
            items={chapterItems}
            emptyLabel="No chapters under this system"
            onSelect={(item) => goStep("topics", { chapterId: item.id })}
          />
        )
      ) : (
        <div className="mx-auto w-full max-w-2xl space-y-2">
          {topicRows.length === 0 ? (
            <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
              No topics in this chapter
            </Card>
          ) : (
            topicRows.map((t) => {
              const topicPct = pctByTopic.get(t.topic_id);
              return (
              <button
                key={t.topic_id}
                type="button"
                onPointerEnter={() => prefetchTopicConcepts(courseId, t.topic_id)}
                onFocus={() => prefetchTopicConcepts(courseId, t.topic_id)}
                onClick={() => {
                  prefetchTopicConcepts(courseId, t.topic_id);
                  navigate(
                    topicConceptsLink(
                      courseId,
                      t.topic_id,
                      browseNavState("topics", subjectId, systemId, chapterId),
                    ),
                  );
                }}
                className="flex w-full min-w-0 items-start gap-3 rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {t.topic_name.trim().charAt(0).toUpperCase() || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug">{t.topic_name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t.concept_count} concepts
                    {topicPct != null && pp.showProgressOnBrowse ? ` · ${formatProgressPct(topicPct)}` : ""}
                  </span>
                </span>
                <span className="mt-1 flex shrink-0 items-center gap-2">
                  {topicPct != null && pp.showProgressOnBrowse ? <ProgressPctBadge pct={topicPct} /> : null}
                  <Stars n={t.stars} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            );
            })
          )}
        </div>
      )}
    </div>
  );
}
