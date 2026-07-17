import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckSquare,
  HelpCircle,
  Loader2,
  Play,
  Square,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConceptQuestionsPanel } from "@/components/ConceptQuestionsPanel";
import { KeyPointStudySlide } from "@/components/KeyPointStudySlide";
import { StickyTopBar } from "@/components/StickyTopBar";
import { fetchConceptByIdWithBoards, type KeyPointWithBoards } from "@/lib/conceptDetail";
import {
  getPracticeSessionsForConcept,
  getStudyProgress,
  markKeyPointStudied,
  savePracticeSession,
  studyCompletionPct,
  type PracticeSession,
} from "@/lib/userProgress";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";
import {
  userBottomBar,
  userBottomBarInner,
  userHeaderActionBtn,
  userHeaderActionLabel,
  userPageShell,
  userStickyHeader,
  userStickyHeaderActions,
} from "@/lib/userShell";





type QRow = {
  id: string;
  questionMode: "mcq" | "sba";
  concept: string;
  sourcePointId?: string | null;
  incrementCount?: number;
  count?: number;
  boards?: { id?: string | null; name: string; mention_count?: number }[];
  mcq?: { stem?: string } | null;
  sba?: { stem?: string } | null;
};

function questionImportance(q: QRow) {
  if (typeof q.count === "number") return q.count;
  if (typeof q.incrementCount === "number") return q.incrementCount;
  return (q.boards ?? []).reduce((s, b) => s + Math.max(1, Number(b.mention_count ?? 1)), 0);
}

export default function ConceptLearn() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const pathTab = location.pathname.includes("/practice/") ? "practice" : "study";
  const tab = searchParams.get("tab") === "practice" || searchParams.get("tab") === "study"
    ? searchParams.get("tab")!
    : pathTab;

  const [loading, setLoading] = useState(true);
  const [conceptName, setConceptName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [keyPoints, setKeyPoints] = useState<KeyPointWithBoards[]>([]);
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward");
  const [progressPct, setProgressPct] = useState(0);
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set());

  const [questions, setQuestions] = useState<QRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [practiceTitle, setPracticeTitle] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [conceptOnlyFilter, setConceptOnlyFilter] = useState(false);
  const [importantFirst, setImportantFirst] = useState(false);
  const [selectCountInput, setSelectCountInput] = useState("");
  const [pastSessions, setPastSessions] = useState<PracticeSession[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [boardFilter, setBoardFilter] = useState<{ id: string; name: string } | null>(null);

  const loadConcept = useCallback(async () => {
    if (!conceptId) return;
    setLoading(true);
    try {
      const data = await fetchConceptByIdWithBoards(conceptId);
      setConceptName(data.conceptName);
      setTopicName(data.taxonomy.topic);
      setKeyPoints(data.keyPoints);
      setPracticeTitle(`${data.conceptName} — Practice ${getPracticeSessionsForConcept(conceptId).length + 1}`);
      const p = getStudyProgress(conceptId);
      setProgressPct(studyCompletionPct(p));
      setStudiedIds(new Set(p?.studiedKeyPointIds ?? []));
      if (p?.studiedKeyPointIds.length) {
        const idx = data.keyPoints.findIndex((kp) => kp.id && !p.studiedKeyPointIds.includes(kp.id));
        setStep(idx >= 0 ? idx : 0);
      }
      setPastSessions(getPracticeSessionsForConcept(conceptId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
      navigate("/my-suggestions");
    } finally {
      setLoading(false);
    }
  }, [conceptId, navigate]);

  const loadQuestions = useCallback(async () => {
    if (!conceptId) return;
    setLoadingQuestions(true);
    try {
      const concept = await fetchConceptByIdWithBoards(conceptId);
      const qs = new URLSearchParams();
      if (concept.taxonomy.subject) qs.set("subject", concept.taxonomy.subject);
      if (concept.taxonomy.system) qs.set("system", concept.taxonomy.system);
      if (concept.taxonomy.chapter) qs.set("chapter", concept.taxonomy.chapter);
      if (concept.taxonomy.topic) qs.set("topic", concept.taxonomy.topic);
      const res = await fetch(apiUrl(`/api/questions?${qs}`));
      const data = (await res.json()) as { rows?: QRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
      setQuestions(data.rows ?? []);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoadingQuestions(false);
    }
  }, [conceptId]);

  useEffect(() => {
    loadConcept();
  }, [loadConcept]);

  useEffect(() => {
    if (tab === "practice" && conceptId) loadQuestions();
  }, [tab, conceptId, loadQuestions]);

  const setTab = (value: string) => {
    setSearchParams(value === "practice" ? { tab: "practice" } : {}, { replace: true });
  };

  const currentKp = keyPoints[step];

  const visibleQuestions = useMemo(() => {
    const filtered = conceptOnlyFilter
      ? questions.filter((q) => q.concept.trim().toLowerCase() === conceptName.trim().toLowerCase())
      : questions;
    if (!importantFirst) return filtered;
    return [...filtered].sort((a, b) => questionImportance(b) - questionImportance(a));
  }, [questions, conceptOnlyFilter, conceptName, importantFirst]);

  const selectAllVisible = () => setSelected(new Set(visibleQuestions.map((q) => q.id)));
  const clearSelection = () => setSelected(new Set());

  const selectByCount = () => {
    const n = Math.floor(Number(selectCountInput));
    if (!Number.isFinite(n) || n <= 0) {
      return toast.error("কতটা question select করবেন সেই সংখ্যা দিন");
    }
    const take = Math.min(n, visibleQuestions.length);
    setSelected(new Set(visibleQuestions.slice(0, take).map((q) => q.id)));
    toast.success(`${take}টি question select হয়েছে`);
  };

  const goPrev = () => {
    if (step <= 0) return;
    setSlideDir("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (!conceptId || !currentKp?.id) return;
    markKeyPointStudied(conceptId, conceptName, currentKp.id, keyPoints.length);
    const p = getStudyProgress(conceptId);
    setProgressPct(studyCompletionPct(p));
    setStudiedIds(new Set(p?.studiedKeyPointIds ?? []));
    if (step < keyPoints.length - 1) {
      setSlideDir("forward");
      setStep((s) => s + 1);
    } else {
      toast.success("All key points studied!");
    }
  };

  const toggleQuestion = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startPractice = () => {
    if (!conceptId || selected.size === 0) return toast.error("Select at least one question");
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      conceptId,
      conceptName,
      title: practiceTitle.trim() || `${conceptName} practice`,
      questionIds: Array.from(selected),
      createdAt: new Date().toISOString(),
    };
    savePracticeSession(session);
    navigate(`/practice/session/${session.id}`);
  };

  const openConceptQuestions = () => {
    setBoardFilter(null);
    setQuestionsOpen(true);
  };

  const openBoardQuestions = (board: { id: string; name: string }) => {
    setBoardFilter(board);
    setQuestionsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={userPageShell}>
      <StickyTopBar>
        <div className={userStickyHeader}>
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/my-suggestions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <p className="truncate text-xs text-muted-foreground md:text-sm">{topicName || "Concept"}</p>
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
          </div>
          <div className={userStickyHeaderActions}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={userHeaderActionBtn}
              onClick={openConceptQuestions}
              title="Questions"
            >
              <HelpCircle className="h-3.5 w-3.5 sm:mr-1" />
              <span className={userHeaderActionLabel}>Questions</span>
            </Button>
            <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Details">
              <Link to={`/concept/${conceptId}/details`}>
                <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
                <span className={userHeaderActionLabel}>Details</span>
              </Link>
            </Button>
          </div>
        </div>
      </StickyTopBar>

      <Tabs value={tab} onValueChange={setTab} className="min-w-0 px-3 pt-3 md:px-0 md:pt-4">
        <TabsList className="grid h-10 w-full max-w-md grid-cols-2">
          <TabsTrigger value="study" className="text-xs md:text-sm">Study</TabsTrigger>
          <TabsTrigger value="practice" className="text-xs md:text-sm">
            <Target className="mr-1 h-3 w-3" /> Practice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="study" className="mt-4 space-y-5 pb-28 md:pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground md:text-sm">
              <span>
                Studied {studiedIds.size}/{keyPoints.length || 0}
              </span>
              <span className="tabular-nums">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>

          <div className="mx-auto w-full max-w-2xl min-w-0 overflow-hidden">
            {currentKp ? (
              <KeyPointStudySlide
                key={`${currentKp.id ?? step}-${step}-${slideDir}`}
                keyPoint={currentKp}
                index={step}
                total={keyPoints.length}
                direction={slideDir}
                onBoardClick={openBoardQuestions}
              />
            ) : (
              <Card className="p-6 text-center text-sm text-muted-foreground">No key points for this concept.</Card>
            )}
          </div>

          {keyPoints.length > 1 ? (
            <div className="flex max-w-full items-center justify-start gap-1.5 overflow-x-auto px-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {keyPoints.map((kp, i) => {
                const done = kp.id ? studiedIds.has(kp.id) : false;
                const active = i === step;
                return (
                  <button
                    key={kp.id ?? i}
                    type="button"
                    aria-label={`Go to key point ${i + 1}`}
                    className={`h-2 shrink-0 rounded-full transition-all duration-300 ${
                      active ? "w-6 bg-primary" : done ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/25"
                    }`}
                    onClick={() => {
                      setSlideDir(i >= step ? "forward" : "back");
                      setStep(i);
                    }}
                  />
                );
              })}
            </div>
          ) : null}

          <p className="text-center text-[11px] text-muted-foreground md:text-xs">
            Next marks the current key point as studied
          </p>

          <div className={userBottomBar}>
            <div className={userBottomBarInner}>
              <Button variant="outline" className="flex-1" disabled={step <= 0} onClick={goPrev}>
                Previous
              </Button>
              <Button className="flex-1" onClick={goNext} disabled={!currentKp?.id}>
                {step >= keyPoints.length - 1 ? "Complete" : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="practice" className="space-y-4 mt-4 pb-8">
          <Card className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Topic <span className="font-medium text-foreground">{topicName || "—"}</span> এর সব প্রশ্ন থেকে select করে practice exam বানান।
            </p>
            <div className="flex items-center gap-2">
              <Checkbox
                id="concept-only"
                checked={conceptOnlyFilter}
                onCheckedChange={(v) => setConceptOnlyFilter(Boolean(v))}
              />
              <Label htmlFor="concept-only" className="text-xs cursor-pointer">
                শুধু এই concept ({conceptName})
              </Label>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Practice exam title</Label>
              <Input value={practiceTitle} onChange={(e) => setPracticeTitle(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Badge variant="outline">{visibleQuestions.length} available</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllVisible}>
                <CheckSquare className="mr-1 h-3 w-3" /> Select all
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                <Square className="mr-1 h-3 w-3" /> Clear
              </Button>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={visibleQuestions.length || 1}
                  inputMode="numeric"
                  placeholder="N"
                  value={selectCountInput}
                  onChange={(e) => setSelectCountInput(e.target.value)}
                  className="h-8 w-16 text-xs"
                  aria-label="Select how many questions"
                />
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={selectByCount}>
                  Select N
                </Button>
              </div>
              <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                <Checkbox
                  id="important-first"
                  checked={importantFirst}
                  onCheckedChange={(v) => setImportantFirst(Boolean(v))}
                />
                <Label htmlFor="important-first" className="cursor-pointer text-xs">
                  Important (count বেশি আগে)
                </Label>
              </div>
            </div>
          </Card>

          {loadingQuestions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : visibleQuestions.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No questions in this topic yet.</Card>
          ) : (
            <div className="space-y-2">
              {visibleQuestions.map((q, i) => (
                <Card key={q.id} className="p-3">
                  <label className="flex gap-3 cursor-pointer items-start">
                    <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggleQuestion(q.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {q.questionMode}
                        </Badge>
                        {questionImportance(q) > 0 ? (
                          <Badge variant="secondary" className="text-[9px] tabular-nums">
                            Count {questionImportance(q)}
                          </Badge>
                        ) : null}
                        {q.concept ? (
                          <span className="truncate text-[10px] text-muted-foreground">{q.concept}</span>
                        ) : null}
                      </div>
                      <p className="text-xs leading-snug line-clamp-3">{q.mcq?.stem ?? q.sba?.stem ?? "—"}</p>
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          )}

          {pastSessions.length > 0 ? (
            <Card className="p-4 space-y-2">
              <p className="text-xs font-semibold">Previous practice exams</p>
              {pastSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-xs border-b last:border-0 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground">{s.questionIds.length} questions</p>
                  </div>
                  {s.completedAt ? (
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {s.score ?? 0}/{s.total ?? s.questionIds.length}
                    </Badge>
                  ) : (
                    <Button asChild size="sm" variant="outline" className="h-7 text-[10px] shrink-0">
                      <Link to={`/practice/session/${s.id}`}>Resume</Link>
                    </Button>
                  )}
                </div>
              ))}
            </Card>
          ) : null}

          <div className={userBottomBar}>
            <div className={userBottomBarInner}>
              <Button className="h-12 w-full" onClick={startPractice} disabled={selected.size === 0}>
                <Play className="mr-2 h-4 w-4" /> Start practice ({selected.size})
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ConceptQuestionsPanel
        open={questionsOpen}
        onOpenChange={(open) => {
          setQuestionsOpen(open);
          if (!open) setBoardFilter(null);
        }}
        conceptName={conceptName}
        boardId={boardFilter?.id}
        boardName={boardFilter?.name}
        onClearBoardFilter={() => setBoardFilter(null)}
        onBoardClick={openBoardQuestions}
      />
    </div>
  );
}
