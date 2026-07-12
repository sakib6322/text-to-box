import type { ExamPerformance } from "@/lib/exams";

type Props = {
  performance: ExamPerformance | null;
  position: number | null;
  totalMarks: number;
};

export function ExamPerformanceCard({ performance, position, totalMarks }: Props) {
  if (!performance) return null;

  const mcq = performance.mcq;
  const sba = performance.sba;

  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-semibold">Your Performance on this Exam</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Section</th>
              <th className="py-2 pr-4">Detail</th>
              <th className="py-2 pr-4 text-right">Count</th>
              <th className="py-2 text-right">Marks</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium" rowSpan={4}>MCQ (T/F)</td>
              <td className="py-1 pr-4">Total Correct stem submitted</td>
              <td className="py-1 pr-4 text-right">{mcq.correct}</td>
              <td className="py-1 text-right text-emerald-700">+ {mcq.positiveMarks.toFixed(1)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-4">Total Wrong stem submitted</td>
              <td className="py-1 pr-4 text-right">{mcq.wrong}</td>
              <td className="py-1 text-right text-red-600">− {mcq.negativeMarks.toFixed(2)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-4">Not Touched</td>
              <td className="py-1 pr-4 text-right">{mcq.notTouched}</td>
              <td className="py-1 text-right">0</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-4 text-muted-foreground" colSpan={2}>MCQ net</td>
              <td className="py-1 text-right font-medium">{(mcq.positiveMarks - mcq.negativeMarks).toFixed(2)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 pr-4 font-medium" rowSpan={3}>SBA</td>
              <td className="py-1 pr-4">Total Correct</td>
              <td className="py-1 pr-4 text-right">{sba.correct}</td>
              <td className="py-1 text-right text-emerald-700">+ {sba.positiveMarks.toFixed(0)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-4">Total Wrong</td>
              <td className="py-1 pr-4 text-right">{sba.wrong}</td>
              <td className="py-1 text-right">0</td>
            </tr>
            <tr className="border-b">
              <td className="py-1 pr-4">Not Touched</td>
              <td className="py-1 pr-4 text-right">{sba.notTouched}</td>
              <td className="py-1 text-right">0</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground">Without negative marking</p>
          <p className="text-lg font-bold tabular-nums">{performance.scoreWithoutNegative.toFixed(1)} / {totalMarks}</p>
        </div>
        <div className="rounded-lg border p-3 bg-primary/5">
          <p className="text-muted-foreground">With negative marking</p>
          <p className="text-lg font-bold tabular-nums text-primary">{performance.scoreWithNegative.toFixed(1)} / {totalMarks}</p>
        </div>
      </div>

      {position != null ? (
        <p className="text-sm">
          <span className="font-medium">Position:</span>{" "}
          <span className="text-primary font-bold">#{position}</span>
        </p>
      ) : null}
    </div>
  );
}

function MiniBar({ pct, variant }: { pct: number; variant: "correct" | "wrong" | "neutral" }) {
  const color =
    variant === "correct" ? "bg-emerald-500" : variant === "wrong" ? "bg-red-500" : "bg-neutral-400";
  return (
    <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

type McqDist = Record<string, { true: number; false: number; notTouched: number }>;
type SbaDist = Record<string, { count: number }>;

export function ExamAnswerReview({
  questionMode,
  mcq,
  sba,
  studentAnswer,
  distribution,
}: {
  questionMode: "mcq" | "sba";
  mcq?: { stem?: string; trueFalse?: { id?: string; statement: string; correct: "true" | "false" }[] } | null;
  sba?: { stem?: string; options?: string[]; correctIndex?: number } | null;
  studentAnswer?: unknown;
  distribution?: { mode: string; options: McqDist | SbaDist } | null;
}) {
  const ans = (studentAnswer ?? {}) as Record<string, unknown>;

  if (questionMode === "mcq" && mcq?.trueFalse?.length) {
    const studentAnswers = Array.isArray(ans.answers) ? (ans.answers as { id?: string; value?: string }[]) : [];
    const opts = (distribution?.options ?? {}) as McqDist;

    return (
      <div className="mt-3 space-y-2 border-t pt-3 text-[10.5px]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 font-medium text-muted-foreground border-b pb-1">
          <span>Statement / option</span>
          <span className="w-10 text-center">Ans</span>
          <span className="w-14 text-center">You</span>
        </div>
        {mcq.trueFalse.map((item, i) => {
          const sid = item.id ?? String(i);
          const student =
            studentAnswers.find((a) => a?.id === sid || a?.id === item.id) ?? studentAnswers[i];
          const given = student?.value === "true" ? "T" : student?.value === "false" ? "F" : "—";
          const correct = item.correct === "true" ? "T" : "F";
          const dist = opts[sid] ?? opts[item.statement];
          const total = dist ? dist.true + dist.false + dist.notTouched : 0;
          const truePct = total ? Math.round((dist.true / total) * 100) : 0;
          const falsePct = total ? Math.round((dist.false / total) * 100) : 0;

          return (
            <div key={sid} className="space-y-1 border-b border-dashed pb-2 last:border-0">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-start">
                <span>{i + 1}.{String.fromCharCode(97 + i)}) {item.statement}</span>
                <span className="w-10 text-center font-mono">{correct}</span>
                <span className={`w-14 text-center font-mono ${given === correct ? "text-emerald-700" : given === "—" ? "text-muted-foreground" : "text-red-600"}`}>
                  {given}
                </span>
              </div>
              {dist && total > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pl-1">
                  <span className="text-[9px] text-emerald-700">T</span>
                  <MiniBar pct={truePct} variant="correct" />
                  <span className="text-[9px] tabular-nums w-6">{truePct}%</span>
                  <span className="text-[9px] text-red-600 ml-1">F</span>
                  <MiniBar pct={falsePct} variant="wrong" />
                  <span className="text-[9px] tabular-nums w-6">{falsePct}%</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (questionMode === "sba" && sba?.options?.length) {
    const selected = ans.selectedIndex;
    const hasAnswer = selected !== undefined && selected !== null && selected !== "";
    const selectedNum = Number(selected);
    const opts = (distribution?.options ?? {}) as SbaDist;
    const totalResponses =
      Object.entries(opts)
        .filter(([k]) => k !== "notTouched")
        .reduce((s, [, v]) => s + (v.count ?? 0), 0) + (opts.notTouched?.count ?? 0);

    return (
      <div className="mt-3 space-y-1 border-t pt-3 text-[10.5px]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 font-medium text-muted-foreground border-b pb-1">
          <span>Option</span>
          <span className="w-10 text-center">Ans</span>
          <span className="w-14 text-center">You</span>
        </div>
        {sba.options.map((opt, i) => {
          const isCorrect = sba.correctIndex === i;
          const isSelected = hasAnswer && selectedNum === i;
          const dist = opts[String(i)];
          const pct = totalResponses && dist ? Math.round((dist.count / totalResponses) * 100) : 0;
          const label = String.fromCharCode(97 + i);

          return (
            <div
              key={i}
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 py-1 border-b border-dashed last:border-0 ${
                isCorrect ? "font-medium" : ""
              }`}
            >
              <span className="flex-1 min-w-[8rem]">{label}) {opt}</span>
              <span className="w-10 text-center">{isCorrect ? label : ""}</span>
              <span className={`w-14 text-center ${isSelected ? (isCorrect ? "text-emerald-700" : "text-red-600") : ""}`}>
                {isSelected ? label : ""}
              </span>
              {dist && totalResponses > 0 ? (
                <>
                  <MiniBar pct={pct} variant={isCorrect ? "correct" : "neutral"} />
                  <span className="text-[9px] tabular-nums w-6">{pct}%</span>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
