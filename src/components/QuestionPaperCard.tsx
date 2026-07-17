import { Badge } from "@/components/ui/badge";

type TfItem = { id?: string; statement: string; correct: "true" | "false"; explanation?: string };
type McqPayload = { stem?: string; trueFalse?: TfItem[] };
type SbaPayload = { stem?: string; options?: string[]; correctIndex?: number; optionExplanations?: string[] };
type McqDist = Record<string, { true: number; false: number; notTouched: number }>;
type SbaDist = Record<string, { count: number }>;

function MiniBar({ pct, variant }: { pct: number; variant: "correct" | "wrong" | "neutral" }) {
  const color =
    variant === "correct" ? "bg-emerald-500" : variant === "wrong" ? "bg-red-500" : "bg-neutral-400";
  return (
    <div className="w-8 h-1 bg-neutral-200 rounded-full overflow-hidden shrink-0">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

type QuestionBoard = { id?: string | null; name: string; mention_count?: number };

type Props = {
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept?: string;
  marks?: number;
  boards?: QuestionBoard[];
  mcq?: McqPayload | null;
  sba?: SbaPayload | null;
  index?: number;
  hideAnswers?: boolean;
  studentAnswer?: unknown;
  distribution?: { mode: string; options: McqDist | SbaDist } | null;
  showAnswerReview?: boolean;
};

const optionLabel = (i: number) => String.fromCharCode(97 + i);

export function QuestionPaperCard({
  questionMode,
  subject,
  system,
  chapter,
  topic,
  concept,
  marks,
  boards,
  mcq,
  sba,
  index,
  hideAnswers = false,
  studentAnswer,
  distribution = null,
  showAnswerReview = false,
}: Props) {
  const taxonomy = [subject, system, chapter, topic].filter(Boolean).join(" · ");
  const stem = questionMode === "mcq" ? mcq?.stem : sba?.stem;
  const reviewActive = showAnswerReview && !hideAnswers && distribution;
  const ans = (studentAnswer ?? {}) as Record<string, unknown>;
  const mcqStudentAnswers = Array.isArray(ans.answers) ? (ans.answers as { id?: string; value?: string }[]) : [];
  const sbaSelected = ans.selectedIndex;
  const sbaHasAnswer = sbaSelected !== undefined && sbaSelected !== null && sbaSelected !== "";

  const mcqHasExplanations = (mcq?.trueFalse ?? []).some((item) => (item.explanation ?? "").trim());
  const sbaHasExplanations = (sba?.optionExplanations ?? []).some((e) => (e ?? "").trim());

  return (
    <article className="question-paper bg-white text-neutral-900 border border-neutral-300 shadow-sm rounded-sm p-5 sm:p-6 print:shadow-none print:border-neutral-400">
      <header className="border-b border-neutral-300 pb-2 mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {index != null ? (
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Question {index + 1}</p>
          ) : null}
          {taxonomy ? <p className="text-[10px] leading-snug text-neutral-600">{taxonomy}</p> : null}
          {concept ? <p className="text-[11px] font-semibold text-neutral-800">{concept}</p> : null}
          {boards?.length ? (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {boards.map((b, idx) => {
                const name = b.name?.trim();
                if (!name) return null;
                const cnt = Number(b.mention_count ?? 1);
                return (
                  <Badge
                    key={b.id ?? `${name}-${idx}`}
                    variant="outline"
                    className="text-[9px] font-normal tabular-nums border-neutral-300 px-1.5 py-0 text-neutral-600"
                  >
                    {name}
                    {cnt > 1 ? ` ×${cnt}` : ""}
                  </Badge>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[9px] font-normal uppercase tracking-wide px-1.5 py-0">
            {questionMode}
          </Badge>
          {marks != null ? <span className="text-[10px] text-neutral-500 tabular-nums">{marks} mark(s)</span> : null}
        </div>
      </header>

      {stem ? (
        <p className="text-[11px] leading-[1.55] text-neutral-900 font-serif whitespace-pre-wrap mb-3">{stem}</p>
      ) : (
        <p className="text-[11px] text-neutral-400 italic mb-3">No stem</p>
      )}

      {questionMode === "mcq" && mcq?.trueFalse?.length ? (
        <ol className="space-y-2 pl-0 list-none">
          {mcq.trueFalse.map((item, i) => {
            const sid = item.id ?? String(i);
            const student =
              mcqStudentAnswers.find((a) => a?.id === sid || a?.id === item.id) ?? mcqStudentAnswers[i];
            const given = student?.value === "true" ? "T" : student?.value === "false" ? "F" : null;
            const correct = item.correct === "true" ? "T" : "F";
            const opts = reviewActive ? ((distribution?.options ?? {}) as McqDist) : null;
            const dist = opts ? (opts[sid] ?? opts[item.statement]) : null;
            const total = dist ? dist.true + dist.false + dist.notTouched : 0;
            const truePct = total ? Math.round((dist!.true / total) * 100) : 0;
            const falsePct = total ? Math.round((dist!.false / total) * 100) : 0;

            return (
              <li key={sid} className="text-[10.5px] leading-[1.5] font-serif text-neutral-800 space-y-1">
                <div className="flex gap-2">
                  <span className="shrink-0 w-4 tabular-nums text-neutral-500">{i + 1}.</span>
                  <span className="flex-1">{item.statement || "—"}</span>
                  {!hideAnswers ? (
                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500 border border-neutral-300 px-1 rounded-sm">
                      {correct}
                    </span>
                  ) : null}
                  {reviewActive && given ? (
                    <span
                      className={`shrink-0 text-[9px] uppercase tracking-wide border px-1 rounded-sm ${
                        given === correct ? "text-emerald-700 border-emerald-300" : "text-red-600 border-red-300"
                      }`}
                    >
                      You: {given}
                    </span>
                  ) : null}
                </div>
                {reviewActive && dist && total > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pl-6">
                    {(["true", "false"] as const).map((val) => {
                      const pct = val === "true" ? truePct : falsePct;
                      const label = val === "true" ? "T" : "F";
                      const isCorrectOpt = item.correct === val;
                      const picked = given === label;
                      return (
                        <span
                          key={val}
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] tabular-nums ${
                            picked && isCorrectOpt
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : picked
                                ? "border-red-400 bg-red-50 text-red-800"
                                : isCorrectOpt
                                  ? "border-emerald-200 bg-emerald-50/50"
                                  : "border-neutral-200"
                          }`}
                        >
                          {label}
                          <MiniBar pct={pct} variant={isCorrectOpt ? "correct" : val === "false" ? "wrong" : "neutral"} />
                          {pct}%
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {questionMode === "sba" && sba?.options?.length ? (
        <ol className="space-y-1 pl-0 list-none">
          {sba.options.map((opt, i) => {
            const isCorrect = sba.correctIndex === i;
            const isSelected = sbaHasAnswer && Number(sbaSelected) === i;
            const opts = reviewActive ? ((distribution?.options ?? {}) as SbaDist) : null;
            const totalResponses = opts
              ? Object.entries(opts)
                  .filter(([k]) => k !== "notTouched")
                  .reduce((s, [, v]) => s + (v.count ?? 0), 0) + (opts.notTouched?.count ?? 0)
              : 0;
            const dist = opts?.[String(i)];
            const pct = totalResponses && dist ? Math.round((dist.count / totalResponses) * 100) : 0;

            return (
              <li
                key={i}
                className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] leading-[1.5] font-serif ${
                  isCorrect ? "text-neutral-900 font-medium" : "text-neutral-700"
                } ${reviewActive && isSelected ? (isCorrect ? "text-emerald-800" : "text-red-700") : ""}`}
              >
                <span className="shrink-0 w-4">{optionLabel(i)}.</span>
                <span className="flex-1 min-w-[6rem]">{opt || "—"}</span>
                {reviewActive && dist && totalResponses > 0 ? (
                  <>
                    <MiniBar pct={pct} variant={isCorrect ? "correct" : "neutral"} />
                    <span className="text-[9px] tabular-nums text-neutral-500 shrink-0">{pct}%</span>
                  </>
                ) : null}
                {!hideAnswers && isCorrect ? (
                  <span className="shrink-0 text-[9px] text-emerald-700 border border-emerald-300 px-1 rounded-sm">✓</span>
                ) : null}
                {reviewActive && isSelected ? (
                  <span
                    className={`shrink-0 text-[9px] border px-1 rounded-sm ${
                      isCorrect ? "text-emerald-700 border-emerald-300" : "text-red-600 border-red-300"
                    }`}
                  >
                    You
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {questionMode === "mcq" && mcqHasExplanations && !hideAnswers ? (
        <div className="mt-4 border-t border-neutral-200 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">Explanations</p>
          {(mcq?.trueFalse ?? []).map((item, i) => {
            const expl = (item.explanation ?? "").trim();
            if (!expl) return null;
            return (
              <div key={item.id ?? i} className="text-[10px] leading-snug text-neutral-700">
                <span className="font-medium text-neutral-800">
                  {i + 1}. ({item.correct === "true" ? "T" : "F"}):
                </span>{" "}
                {expl}
              </div>
            );
          })}
        </div>
      ) : null}

      {questionMode === "sba" && sbaHasExplanations && !hideAnswers ? (
        <div className="mt-4 border-t border-neutral-200 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">Explanations</p>
          {(sba?.options ?? []).map((opt, i) => {
            const expl = (sba?.optionExplanations?.[i] ?? "").trim();
            if (!expl) return null;
            const isCorrect = sba?.correctIndex === i;
            return (
              <div key={i} className="text-[10px] leading-snug text-neutral-700">
                <span className="font-medium text-neutral-800">
                  {optionLabel(i)} ({isCorrect ? "correct" : "wrong"}):
                </span>{" "}
                {expl}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
