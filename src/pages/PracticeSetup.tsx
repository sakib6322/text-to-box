import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/apiBase";
import { fetchConceptByIdWithBoards } from "@/lib/conceptDetail";
import { savePracticeSession, type PracticeSession } from "@/lib/userProgress";
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
  mcq?: { stem?: string } | null;
  sba?: { stem?: string } | null;
};

export default function PracticeSetup() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const navigate = useNavigate();
  const [conceptName, setConceptName] = useState("");
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!conceptId) return;
    setLoading(true);
    try {
      const concept = await fetchConceptByIdWithBoards(conceptId);
      setConceptName(concept.conceptName);
      setTitle(`${concept.conceptName} — Practice 1`);
      const qs = new URLSearchParams({ concept: concept.conceptName });
      const res = await fetch(apiUrl(`/api/questions?${qs}`));
      const data = (await res.json()) as { rows?: QRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
      const rows = data.rows ?? [];
      setQuestions(rows);
      setSelected(new Set(rows.map((q) => q.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [conceptId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
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
      title: title.trim() || `${conceptName} practice`,
      questionIds: Array.from(selected),
      createdAt: new Date().toISOString(),
    };
    savePracticeSession(session);
    navigate(`/practice/session/${session.id}`);
  };

  const mcqCount = useMemo(() => questions.filter((q) => selected.has(q.id) && q.questionMode === "mcq").length, [questions, selected]);
  const sbaCount = useMemo(() => questions.filter((q) => selected.has(q.id) && q.questionMode === "sba").length, [questions, selected]);

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
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/my-suggestions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
            <p className="text-xs text-muted-foreground md:text-sm">Practice setup</p>
            <h1 className="truncate text-sm font-semibold md:text-lg">{conceptName}</h1>
          </div>
          <div className={userStickyHeaderActions}>
            <Button asChild variant="outline" size="sm" className={userHeaderActionBtn} title="Study">
              <Link to={`/study/${conceptId}`}>
                <BookOpen className="h-3.5 w-3.5 sm:mr-1" />
                <span className={userHeaderActionLabel}>Study</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="mx-3 space-y-3 p-4 md:mx-0 md:p-6">
        <div className="space-y-2">
          <Label className="text-xs">Practice exam title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{selected.size} selected</Badge>
          <Badge variant="outline">MCQ {mcqCount}</Badge>
          <Badge variant="outline">SBA {sbaCount}</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          একই concept-এর {questions.length}টি প্রশ্ন আছে — ইচ্ছেমতো select করে আলাদা practice exam বানাতে পারবেন।
        </p>
      </Card>

      <div className="space-y-2 px-3 md:px-0">
        {questions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No questions linked to this concept yet.</Card>
        ) : (
          questions.map((q, i) => (
            <Card key={q.id} className="p-3">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox checked={selected.has(q.id)} onCheckedChange={() => toggle(q.id)} className="mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {q.questionMode}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Q{i + 1}</span>
                  </div>
                  <p className="line-clamp-3 text-xs leading-snug">{q.mcq?.stem ?? q.sba?.stem ?? "—"}</p>
                </div>
              </label>
            </Card>
          ))
        )}
      </div>

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
