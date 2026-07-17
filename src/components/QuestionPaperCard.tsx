import { Badge } from "@/components/ui/badge";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
import { resolveDeviceTheme } from "@/lib/uiAppearance";

type TfItem = { id?: string; statement: string; correct: "true" | "false"; explanation?: string };
type McqPayload = { stem?: string; trueFalse?: TfItem[] };
type SbaPayload = { stem?: string; options?: string[]; correctIndex?: number; optionExplanations?: string[] };
type McqDist = Record<string, { true: number; false: number; notTouched: number }>;
type SbaDist = Record<string, { count: number }>;

function MiniBar({ pct, variant }: { pct: number; variant: "correct" | "wrong" | "neutral" }) {
  const color =
    variant === "correct"
      ? "bg-[var(--aq-correct,#047857)]"
      : variant === "wrong"
        ? "bg-[var(--aq-wrong,#dc2626)]"
        : "bg-[var(--aq-paper-muted,#a3a3a3)]";
  return (
    <div className="w-8 h-1 rounded-full overflow-hidden shrink-0 bg-[color-mix(in_srgb,var(--aq-paper-muted,#a3a3a3)_25%,transparent)]">
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
  const { appearance, activeDevice } = useUiAppearance();
  const aq = resolveDeviceTheme(appearance, activeDevice).allQuestions;
  const showExplanations = aq.showExplanations !== false;

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
    <article className="question-paper print:shadow-none">
      <header className="question-paper-header flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          {index != null ? (
            <p className="question-paper-meta uppercase tracking-widest font-medium">Question {index + 1}</p>
          ) : null}
          {taxonomy ? <p className="question-paper-taxonomy leading-snug">{taxonomy}</p> : null}
          {concept ? <p className="question-paper-concept font-semibold">{concept}</p> : null}
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
                    className="question-paper-board-badge font-normal tabular-nums px-1.5 py-0"
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
          <Badge variant="outline" className="question-paper-badge font-normal uppercase tracking-wide px-1.5 py-0">
            {questionMode}
          </Badge>
          {marks != null ? <span className="question-paper-marks tabular-nums">{marks} mark(s)</span> : null}
        </div>
      </header>

      {stem ? (
        <p className="question-paper-stem">{stem}</p>
      ) : (
        <p className="question-paper-meta italic mb-3">No stem</p>
      )}

      {questionMode === "mcq" && mcq?.trueFalse?.length ? (
        <ol className="question-paper-options">
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
              <li key={sid} className="question-paper-option space-y-1">
                <div className="flex gap-2">
                  <span className="question-paper-option-num shrink-0 w-4 tabular-nums">{i + 1}.</span>
                  <span className="flex-1">{item.statement || "—"}</span>
                  {!hideAnswers ? (
                    <span className="question-paper-badge shrink-0 uppercase tracking-wide border px-1 rounded-sm">
                      {correct}
                    </span>
                  ) : null}
                  {reviewActive && given ? (
                    <span
                      className={`shrink-0 uppercase tracking-wide border px-1 rounded-sm ${
                        given === correct ? "question-paper-correct" : "question-paper-wrong"
                      }`}
                      style={{ fontSize: "var(--aq-mode-badge-size, 9px)" }}
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
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 tabular-nums ${
                            picked && isCorrectOpt
                              ? "question-paper-correct"
                              : picked
                                ? "question-paper-wrong"
                                : isCorrectOpt
                                  ? "question-paper-correct opacity-70"
                                  : "question-paper-badge"
                          }`}
                          style={{ fontSize: "var(--aq-mode-badge-size, 9px)" }}
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
        <ol className="question-paper-options">
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
                className={`question-paper-option flex flex-wrap items-center gap-x-2 gap-y-1 ${
                  isCorrect ? "font-medium" : ""
                } ${reviewActive && isSelected ? (isCorrect ? "question-paper-correct" : "question-paper-wrong") : ""}`}
              >
                <span className="question-paper-option-num shrink-0 w-4">{optionLabel(i)}.</span>
                <span className="flex-1 min-w-[6rem]">{opt || "—"}</span>
                {reviewActive && dist && totalResponses > 0 ? (
                  <>
                    <MiniBar pct={pct} variant={isCorrect ? "correct" : "neutral"} />
                    <span className="question-paper-meta tabular-nums shrink-0" style={{ fontSize: "var(--aq-mode-badge-size, 9px)" }}>
                      {pct}%
                    </span>
                  </>
                ) : null}
                {!hideAnswers && isCorrect ? (
                  <span className="question-paper-correct shrink-0 border px-1 rounded-sm" style={{ fontSize: "var(--aq-mode-badge-size, 9px)" }}>
                    ✓
                  </span>
                ) : null}
                {reviewActive && isSelected ? (
                  <span
                    className={`shrink-0 border px-1 rounded-sm ${
                      isCorrect ? "question-paper-correct" : "question-paper-wrong"
                    }`}
                    style={{ fontSize: "var(--aq-mode-badge-size, 9px)" }}
                  >
                    You
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {showExplanations && questionMode === "mcq" && mcqHasExplanations && !hideAnswers ? (
        <div className="question-paper-expl">
          <p className="question-paper-expl-title">{aq.explanationTitle || "Explanations"}</p>
          {(mcq?.trueFalse ?? []).map((item, i) => {
            const expl = (item.explanation ?? "").trim();
            if (!expl) return null;
            return (
              <div key={item.id ?? i} className="question-paper-expl-item">
                <span className="question-paper-expl-label">
                  {i + 1}. ({item.correct === "true" ? "T" : "F"}):
                </span>{" "}
                {expl}
              </div>
            );
          })}
        </div>
      ) : null}

      {showExplanations && questionMode === "sba" && sbaHasExplanations && !hideAnswers ? (
        <div className="question-paper-expl">
          <p className="question-paper-expl-title">{aq.explanationTitle || "Explanations"}</p>
          {(sba?.options ?? []).map((_opt, i) => {
            const expl = (sba?.optionExplanations?.[i] ?? "").trim();
            if (!expl) return null;
            const isCorrect = sba?.correctIndex === i;
            return (
              <div key={i} className="question-paper-expl-item">
                <span className="question-paper-expl-label">
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
