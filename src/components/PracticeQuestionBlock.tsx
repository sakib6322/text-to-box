import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type PracticeQuestionFull = {
  id: string;
  questionMode: "mcq" | "sba";
  count?: number | null;
  incrementCount?: number | null;
  boards?: { mention_count?: number | null }[];
  mcq?: {
    stem?: string;
    trueFalse?: { id?: string; statement: string; correct: "true" | "false"; explanation?: string }[];
  } | null;
  sba?: {
    stem?: string;
    options?: string[];
    correctIndex?: number;
    optionExplanations?: string[];
  } | null;
};

type Props = {
  q: PracticeQuestionFull;
  qNum: number;
  locked: Record<string, boolean>;
  revealed: Record<string, { given: unknown; correct: boolean }>;
  readOnly?: boolean;
  onRevealMcq?: (
    stmtKey: string,
    stmtId: string,
    correct: "true" | "false",
    given: "true" | "false",
    explanation?: string,
  ) => void;
  onRevealSba?: (optionIndex: number) => void;
};

export function PracticeQuestionBlock({
  q,
  qNum,
  locked,
  revealed,
  readOnly,
  onRevealMcq,
  onRevealSba,
}: Props) {
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          Q{qNum}
        </Badge>
        <Badge variant="outline" className="text-[10px] uppercase">
          {q.questionMode}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{q.mcq?.stem ?? q.sba?.stem ?? "—"}</p>

      {q.questionMode === "mcq" && q.mcq?.trueFalse?.length ? (
        <div className="space-y-3">
          {q.mcq.trueFalse.map((stmt, i) => {
            const sid = stmt.id ?? String(i);
            const key = `${q.id}:${sid}`;
            const isLocked = locked[key];
            const rev = revealed[key];
            return (
              <div key={key} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <p className="text-xs">
                  {i + 1}. {stmt.statement}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["true", "false"] as const).map((val) => {
                    const isCorrectOpt = stmt.correct === val;
                    const picked = rev?.given === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        disabled={isLocked || readOnly}
                        onClick={() => onRevealMcq?.(key, sid, stmt.correct, val, stmt.explanation)}
                        className={[
                          "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                          isLocked && picked && rev?.correct ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "",
                          isLocked && picked && !rev?.correct ? "border-red-500 bg-red-50 text-red-800" : "",
                          isLocked && !picked && isCorrectOpt ? "border-emerald-300 bg-emerald-50/50" : "",
                          !isLocked && !readOnly ? "cursor-pointer hover:border-primary" : "cursor-not-allowed opacity-80",
                        ].join(" ")}
                      >
                        {val === "true" ? "True" : "False"}
                      </button>
                    );
                  })}
                </div>
                {isLocked && stmt.explanation?.trim() ? (
                  <p className="border-t pt-2 text-[11px] text-muted-foreground">{stmt.explanation}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {q.questionMode === "sba" && q.sba?.options?.length ? (
        <div className="space-y-2">
          {q.sba.options.map((opt, i) => {
            const isLocked = locked[q.id];
            const rev = revealed[q.id];
            const isCorrect = q.sba?.correctIndex === i;
            const picked = rev?.given === i;
            return (
              <button
                key={i}
                type="button"
                disabled={isLocked || readOnly}
                onClick={() => onRevealSba?.(i)}
                className={[
                  "flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                  isLocked && picked && rev?.correct ? "border-emerald-500 bg-emerald-50" : "",
                  isLocked && picked && !rev?.correct ? "border-red-500 bg-red-50" : "",
                  isLocked && !picked && isCorrect ? "border-emerald-300 bg-emerald-50/50" : "",
                  !isLocked && !readOnly ? "cursor-pointer hover:border-primary" : "cursor-not-allowed opacity-80",
                ].join(" ")}
              >
                <span className="shrink-0 font-medium">{String.fromCharCode(97 + i)}.</span>
                <span className="flex-1">{opt}</span>
                {isLocked && picked ? (
                  rev?.correct ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )
                ) : null}
              </button>
            );
          })}
          {locked[q.id] && q.sba?.optionExplanations?.length ? (
            <div className="space-y-1 border-t pt-2 text-[11px] text-muted-foreground">
              {(() => {
                const picked = Number(revealed[q.id]?.given);
                const expl =
                  (Number.isFinite(picked) && q.sba?.optionExplanations?.[picked]?.trim()) ||
                  q.sba?.optionExplanations?.[q.sba.correctIndex ?? -1]?.trim();
                return expl ? <p>{expl}</p> : null;
              })()}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function countPracticeAnswerUnits(q: PracticeQuestionFull): number {
  if (q.questionMode === "mcq") {
    const n = q.mcq?.trueFalse?.length ?? 0;
    return n > 0 ? n : q.mcq?.stem?.trim() ? 1 : 0;
  }
  if (q.questionMode === "sba") {
    return q.sba?.options?.length ? 1 : 0;
  }
  return 0;
}
