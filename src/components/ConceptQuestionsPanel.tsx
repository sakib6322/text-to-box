import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";

type TfItem = { id?: string; statement: string; correct: "true" | "false"; explanation?: string };
type McqPayload = { stem?: string; trueFalse?: TfItem[] };
type SbaPayload = {
  stem?: string;
  options?: string[];
  correctIndex?: number;
  optionExplanations?: string[];
};

export type ConceptQuestionRow = {
  id: string;
  questionMode: "mcq" | "sba";
  concept?: string;
  mcq?: McqPayload | null;
  sba?: SbaPayload | null;
  boards?: { id?: string | null; name: string; mention_count?: number }[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filter by exact concept title */
  conceptName?: string;
  /** Filter by board id (questions linked via key point boards) */
  boardId?: string;
  boardName?: string;
  title?: string;
  /** When board filter is active, allow switching back to concept questions */
  onClearBoardFilter?: () => void;
  /** Click a board badge on a question to switch board filter */
  onBoardClick?: (board: { id: string; name: string }) => void;
};

function QuestionOptionsView({
  q,
  index,
  onBoardClick,
}: {
  q: ConceptQuestionRow;
  index: number;
  onBoardClick?: (board: { id: string; name: string }) => void;
}) {
  return (
    <Card className="p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          Q{index + 1}
        </Badge>
        <Badge variant="outline" className="text-[9px] uppercase">
          {q.questionMode}
        </Badge>
        {q.concept ? (
          <span className="text-[10px] text-muted-foreground truncate max-w-[12rem]">{q.concept}</span>
        ) : null}
        {(q.boards ?? []).map((b) => {
          const clickable = Boolean(onBoardClick && b.id);
          const label = `${b.name}${b.mention_count && b.mention_count > 1 ? ` ×${b.mention_count}` : ""}`;
          const className =
            "text-[9px] px-1 py-0 h-4 text-red-600 border-red-300 bg-red-50 font-normal tabular-nums";
          if (clickable) {
            return (
              <button
                key={`${q.id}-${b.id ?? b.name}`}
                type="button"
                className="inline-flex"
                onClick={() => onBoardClick?.({ id: b.id!, name: b.name })}
              >
                <Badge variant="outline" className={`${className} cursor-pointer hover:bg-red-100`}>
                  {label}
                </Badge>
              </button>
            );
          }
          return (
            <Badge key={`${q.id}-${b.id ?? b.name}`} variant="outline" className={className}>
              {label}
            </Badge>
          );
        })}
      </div>
      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
        {q.mcq?.stem ?? q.sba?.stem ?? "—"}
      </p>

      {q.questionMode === "mcq" && q.mcq?.trueFalse?.length ? (
        <div className="space-y-2">
          {q.mcq.trueFalse.map((stmt, i) => (
            <div key={stmt.id ?? i} className="rounded-md border p-2.5 space-y-1.5 bg-muted/20">
              <p className="text-xs leading-snug">
                {i + 1}. {stmt.statement}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["true", "false"] as const).map((val) => {
                  const isCorrect = stmt.correct === val;
                  return (
                    <div
                      key={val}
                      className={`rounded-md border px-2.5 py-2 text-xs font-medium ${
                        isCorrect
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {val === "true" ? "True" : "False"}
                      {isCorrect ? " ✓" : ""}
                    </div>
                  );
                })}
              </div>
              {stmt.explanation?.trim() ? (
                <p className="text-[11px] text-muted-foreground border-t pt-1.5">{stmt.explanation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {q.questionMode === "sba" && q.sba?.options?.length ? (
        <div className="space-y-1.5">
          {q.sba.options.map((opt, i) => {
            const isCorrect = q.sba?.correctIndex === i;
            return (
              <div
                key={i}
                className={`rounded-md border p-2.5 text-xs leading-snug flex gap-2 ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-border bg-background"
                }`}
              >
                <span className="font-medium shrink-0">{String.fromCharCode(97 + i)}.</span>
                <span className="flex-1">
                  {opt}
                  {isCorrect ? " ✓" : ""}
                </span>
              </div>
            );
          })}
          {typeof q.sba.correctIndex === "number" &&
          q.sba.optionExplanations?.[q.sba.correctIndex]?.trim() ? (
            <p className="text-[11px] text-muted-foreground border-t pt-1.5">
              {q.sba.optionExplanations[q.sba.correctIndex]}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function ConceptQuestionsPanel({
  open,
  onOpenChange,
  conceptName,
  boardId,
  boardName,
  title,
  onClearBoardFilter,
  onBoardClick,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ConceptQuestionRow[]>([]);

  useEffect(() => {
    if (!open) return;
    if (!conceptName?.trim() && !boardId?.trim()) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = new URLSearchParams();
        // Board filter is global for that board; otherwise concept-exact.
        if (boardId?.trim()) qs.set("board_id", boardId.trim());
        else if (conceptName?.trim()) qs.set("concept", conceptName.trim());
        const res = await fetch(apiUrl(`/api/questions?${qs}`));
        const data = (await res.json().catch(() => ({}))) as {
          rows?: ConceptQuestionRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
        if (!cancelled) setRows(data.rows ?? []);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          toast.error(e instanceof Error ? e.message : "Failed to load questions");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, conceptName, boardId]);

  const heading =
    title ||
    (boardName
      ? `Board questions: ${boardName}`
      : conceptName
        ? `Questions: ${conceptName}`
        : "Questions");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-base pr-6 leading-snug">{heading}</DialogTitle>
          {boardId && conceptName && onClearBoardFilter ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={onClearBoardFilter}>
                ← All concept questions
              </Button>
            </div>
          ) : null}
          {!loading && rows.length > 0 ? (
            <p className="text-[11px] text-muted-foreground font-normal">{rows.length} question(s) · options shown</p>
          ) : null}
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No questions found.</p>
          ) : (
            rows.map((q, i) => (
              <QuestionOptionsView key={q.id} q={q} index={i} onBoardClick={onBoardClick} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
