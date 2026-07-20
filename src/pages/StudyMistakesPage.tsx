import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl } from "@/lib/apiBase";
import { clearAllMistakes, fetchMistakes, submitMistakeReview } from "@/lib/progressApi";
import { useProgressAppearance } from "@/hooks/useProgressAppearance";

type QRow = {
  id: string;
  questionMode: string;
  mcq?: { stem?: string; trueFalse?: { statement: string; correct: "true" | "false" }[] } | null;
  sba?: { stem?: string; options?: string[]; correctIndex?: number } | null;
};

export default function StudyMistakesPage() {
  const pp = useProgressAppearance();
  const [loading, setLoading] = useState(true);
  const [mistakeIds, setMistakeIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { mistakes, count } = await fetchMistakes();
      setRemaining(count ?? mistakes.length);
      const ids = mistakes.map((m) => m.question_id);
      setMistakeIds(ids);
      if (!ids.length) {
        setQuestions([]);
        return;
      }
      const r = await fetch(apiUrl(`/api/questions?ids=${ids.join(",")}`));
      const j = (await r.json()) as { rows?: QRow[] };
      setQuestions(j.rows ?? []);
      setIdx(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const q = questions[idx];

  const markAnswer = async (isCorrect: boolean) => {
    if (!q) return;
    try {
      const res = await submitMistakeReview([{ question_id: q.id, is_correct: isCorrect }]);
      setRemaining(res.remaining ?? 0);
      if (isCorrect) toast.success("Removed from mistake bank");
      else toast.error("Still in mistake bank — try again later");
      if (idx < questions.length - 1) setIdx((i) => i + 1);
      else await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all mistakes from your bank?")) return;
    try {
      await clearAllMistakes();
      toast.success("Mistake bank cleared");
      setQuestions([]);
      setMistakeIds([]);
      setRemaining(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-10 px-3">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/profile"><ArrowLeft className="mr-1 h-4 w-4" /> Profile</Link>
        </Button>
        <Badge variant="secondary">{remaining} remaining</Badge>
      </div>

      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <XCircle className="h-5 w-5" style={{ color: "var(--pg-mistake-accent)" }} /> {pp.reviewMistakesTitle}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{pp.reviewMistakesSubtitle}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !mistakeIds.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{pp.reviewMistakesEmpty}</Card>
      ) : !q ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Could not load question.</Card>
      ) : (
        <Card className="space-y-4 p-4">
          <p className="text-xs text-muted-foreground">Question {idx + 1} / {questions.length}</p>
          <Badge variant="outline" className="text-[10px] uppercase">{q.questionMode}</Badge>
          <p className="text-sm font-medium">{q.mcq?.stem ?? q.sba?.stem}</p>
          {q.sba?.options ? (
            <div className="grid gap-2">
              {q.sba.options.map((opt, i) => (
                <Button key={i} variant="outline" className="h-auto justify-start py-2 text-left text-xs" onClick={() => void markAnswer(i === (q.sba?.correctIndex ?? -1))}>
                  {String.fromCharCode(65 + i)}. {opt}
                </Button>
              ))}
            </div>
          ) : null}
          {q.mcq?.trueFalse?.[0] ? (
            <div className="grid grid-cols-2 gap-2">
              {(["true", "false"] as const).map((val) => (
                <Button key={val} variant="outline" onClick={() => void markAnswer(q.mcq!.trueFalse![0].correct === val)}>
                  {val === "true" ? "True" : "False"}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>
      )}

      {mistakeIds.length > 0 ? (
        <Button variant="destructive" className="w-full gap-1" onClick={() => void clearAll()}>
          <Trash2 className="h-4 w-4" /> {pp.reviewMistakesClearAll}
        </Button>
      ) : null}
    </div>
  );
}
