import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BookOpen, CheckSquare, Loader2, Play, Square } from "lucide-react";
import { AppBackButton } from "@/components/AppBackButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/apiBase";
import { fetchConceptByIdWithBoards } from "@/lib/conceptDetail";
import { useConceptStudentUi } from "@/hooks/useConceptStudentUi";
import {
  getPracticeSessionsForConcept,
  savePracticeSession,
  type PracticeSession,
} from "@/lib/userProgress";
import {
  userBottomBar,
  userBottomBarInner,
  userHeaderActionBtn,
  userHeaderActionLabel,
  userPageShellTight,
  userPageTopBar,
  userStickyHeader,
  userStickyHeaderActions,
} from "@/lib/userShell";
import { toast } from "sonner";

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

export default function PracticeSetup() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [conceptName, setConceptName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [conceptOnlyFilter, setConceptOnlyFilter] = useState(false);
  const [importantFirst, setImportantFirst] = useState(false);
  const [selectCountInput, setSelectCountInput] = useState("");
  const [pastSessions, setPastSessions] = useState<PracticeSession[]>([]);
  const csu = useConceptStudentUi();

  const load = useCallback(async () => {
    if (!conceptId) return;
    setLoading(true);
    try {
      const concept = await fetchConceptByIdWithBoards(conceptId);
      setConceptName(concept.conceptName);
      setTopicName(concept.taxonomy.topic);
      setTitle(`${concept.conceptName} — Practice ${getPracticeSessionsForConcept(conceptId).length + 1}`);
      setPastSessions(getPracticeSessionsForConcept(conceptId));

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
      setLoading(false);
    }
  }, [conceptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleQuestions = useMemo(() => {
    const filtered = conceptOnlyFilter
      ? questions.filter((q) => q.concept.trim().toLowerCase() === conceptName.trim().toLowerCase())
      : questions;
    if (!importantFirst) return filtered;
    return [...filtered].sort((a, b) => questionImportance(b) - questionImportance(a));
  }, [questions, conceptOnlyFilter, conceptName, importantFirst]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const startPractice = () => {
    if (!conceptId || selected.size === 0) return toast.error("Select at least one question");
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      conceptId,
      conceptName,
      title: title.trim() || `${conceptName} practice`,
      questionIds: Array.from(selected),
      createdAt: new Date().toISOString(),
    };
    savePracticeSession(session);
    navigate(`/practice/session/${session.id}`);
  };

  const mcqCount = useMemo(
    () => questions.filter((q) => selected.has(q.id) && q.questionMode === "mcq").length,
    [questions, selected],
  );
  const sbaCount = useMemo(
    () => questions.filter((q) => selected.has(q.id) && q.questionMode === "sba").length,
    [questions, selected],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className={userPageShellTight}>
      <div className={userPageTopBar}>
        <div className={userStickyHeader}>
          <AppBackButton fallback={`/concept/${conceptId}/details`} />
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <p className="text-xs text-muted-foreground md:text-sm">Practice setup</p>
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
          </div>
          <div className={userStickyHeaderActions}>
            {csu.showStudyButton ? (
              <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Study">
                <Link to={`/concept/${conceptId}/learn`}>
                  <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
                  <span className={userHeaderActionLabel}>Study</span>
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="mx-3 space-y-3 p-4 md:mx-0 md:p-6">
        <p className="text-xs text-muted-foreground">
          Topic <span className="font-medium text-foreground">{topicName || "—"}</span> এর সব প্রশ্ন থেকে select করে
          practice exam বানান।
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="concept-only"
            checked={conceptOnlyFilter}
            onCheckedChange={(v) => setConceptOnlyFilter(Boolean(v))}
          />
          <Label htmlFor="concept-only" className="cursor-pointer text-xs">
            শুধু এই concept ({conceptName})
          </Label>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Practice exam title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Badge variant="outline">{visibleQuestions.length} available</Badge>
          <Badge variant="outline">MCQ {mcqCount}</Badge>
          <Badge variant="outline">SBA {sbaCount}</Badge>
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

      <div className="space-y-2 px-3 md:px-0">
        {visibleQuestions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No questions in this topic yet.</Card>
        ) : (
          visibleQuestions.map((q) => (
            <Card key={q.id} className="p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggle(q.id)} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
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
                      <span className="max-w-[12rem] truncate text-[10px] text-muted-foreground">{q.concept}</span>
                    ) : null}
                  </div>
                  <p className="line-clamp-3 text-xs leading-snug">{q.mcq?.stem ?? q.sba?.stem ?? "—"}</p>
                </div>
              </label>
            </Card>
          ))
        )}
      </div>

      {pastSessions.length > 0 ? (
        <Card className="mx-3 space-y-2 p-4 md:mx-0">
          <p className="text-xs font-semibold">Previous practice exams</p>
          {pastSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 border-b py-2 text-xs last:border-0">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.title}</p>
                <p className="text-[10px] text-muted-foreground">{s.questionIds.length} questions</p>
              </div>
              {s.completedAt ? (
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {s.score ?? 0}/{s.total ?? s.questionIds.length}
                </Badge>
              ) : (
                <Button asChild size="sm" variant="outline" className="h-7 shrink-0 text-[10px]">
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
    </div>
  );
}
