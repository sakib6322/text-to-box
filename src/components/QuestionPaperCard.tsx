import { Badge } from "@/components/ui/badge";

type TfItem = { id?: string; statement: string; correct: "true" | "false" };
type McqPayload = { stem?: string; trueFalse?: TfItem[] };
type SbaPayload = { stem?: string; options?: string[]; correctIndex?: number };

type Props = {
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept?: string;
  marks?: number;
  mcq?: McqPayload | null;
  sba?: SbaPayload | null;
  index?: number;
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
  mcq,
  sba,
  index,
}: Props) {
  const taxonomy = [subject, system, chapter, topic].filter(Boolean).join(" · ");
  const stem = questionMode === "mcq" ? mcq?.stem : sba?.stem;

  return (
    <article className="question-paper bg-white text-neutral-900 border border-neutral-300 shadow-sm rounded-sm p-5 sm:p-6 print:shadow-none print:border-neutral-400">
      <header className="border-b border-neutral-300 pb-2 mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {index != null ? (
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-medium">Question {index + 1}</p>
          ) : null}
          {taxonomy ? <p className="text-[10px] leading-snug text-neutral-600">{taxonomy}</p> : null}
          {concept ? <p className="text-[11px] font-semibold text-neutral-800">{concept}</p> : null}
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
        <ol className="space-y-1.5 pl-0 list-none">
          {mcq.trueFalse.map((item, i) => (
            <li key={item.id ?? i} className="flex gap-2 text-[10.5px] leading-[1.5] font-serif text-neutral-800">
              <span className="shrink-0 w-4 tabular-nums text-neutral-500">{i + 1}.</span>
              <span className="flex-1">{item.statement || "—"}</span>
              <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500 border border-neutral-300 px-1 rounded-sm">
                {item.correct === "true" ? "T" : "F"}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {questionMode === "sba" && sba?.options?.length ? (
        <ol className="space-y-1 pl-0 list-none">
          {sba.options.map((opt, i) => {
            const isCorrect = sba.correctIndex === i;
            return (
              <li
                key={i}
                className={`flex gap-2 text-[10.5px] leading-[1.5] font-serif ${
                  isCorrect ? "text-neutral-900 font-medium" : "text-neutral-700"
                }`}
              >
                <span className="shrink-0 w-4">{optionLabel(i)}.</span>
                <span className="flex-1">{opt || "—"}</span>
                {isCorrect ? (
                  <span className="shrink-0 text-[9px] text-emerald-700 border border-emerald-300 px-1 rounded-sm">✓</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </article>
  );
}
