import { apiUrl } from "@/lib/apiBase";
import { getAuthHeaders } from "@/lib/auth";

export type TfItem = {
  id: string;
  statement: string;
  correct: "true" | "false";
  explanation: string;
};

export type ExtractedMcqStatement = { text: string; correct: "true" | "false" };
export type ExtractedQuestion = {
  question_type: "mcq" | "sba";
  question_number: string | null;
  stem: string;
  mcq_statements?: ExtractedMcqStatement[];
  sba_options?: { text: string }[];
  sba_correct_index?: number;
};

export type DraftQuestion = {
  id: string;
  questionMode: "mcq" | "sba";
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  concept: string;
  boardIds: string[];
  metadata: {
    boards: string[];
    importantSchools: string[];
    sources: string[];
    teachers: string[];
    tags: string[];
    difficulty: string;
    status: string;
    marks: number;
  };
  mcq: { stem: string; trueFalse: TfItem[] } | null;
  sba: { stem: string; options: string[]; correctIndex: number; optionExplanations: string[] } | null;
  sourcePointId: string | null;
};

export type GeneratedExplanationResult = {
  question_index: number;
  question_mode: "mcq" | "sba";
  explanations?: string[];
  option_explanations?: string[];
};

export const mkQuestionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export const emptySbaExplanations = (): [string, string, string, string, string] => ["", "", "", "", ""];

export function mergeExplanationResults(drafts: DraftQuestion[], results: GeneratedExplanationResult[]): DraftQuestion[] {
  const byIdx = new Map(results.map((r) => [r.question_index, r]));
  return drafts.map((draft, i) => {
    const gen = byIdx.get(i);
    if (!gen) return draft;
    if (draft.questionMode === "mcq" && draft.mcq && Array.isArray(gen.explanations)) {
      return {
        ...draft,
        mcq: {
          ...draft.mcq,
          trueFalse: draft.mcq.trueFalse.map((row, si) => ({
            ...row,
            explanation: gen.explanations?.[si]?.trim() || row.explanation || "",
          })),
        },
      };
    }
    if (draft.questionMode === "sba" && draft.sba && Array.isArray(gen.option_explanations)) {
      const expls = emptySbaExplanations();
      for (let j = 0; j < 5; j++) expls[j] = gen.option_explanations[j]?.trim() ?? "";
      return { ...draft, sba: { ...draft.sba, optionExplanations: [...expls] } };
    }
    return draft;
  });
}

/** Uses the same /api/generate-question-explanations endpoint + prompt as Create Question AI. */
export async function fetchGeneratedExplanations(drafts: DraftQuestion[], concept?: string): Promise<DraftQuestion[]> {
  const resp = await fetch(apiUrl("/api/generate-question-explanations"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ questions: drafts, concept: concept?.trim() || undefined }),
  });
  const j = (await resp.json().catch(() => ({}))) as {
    results?: GeneratedExplanationResult[];
    error?: string;
  };
  if (!resp.ok) throw new Error(j.error ?? "Explanation generation failed");
  return mergeExplanationResults(drafts, j.results ?? []);
}

export function draftFromExtracted(
  q: ExtractedQuestion,
  ctx: {
    subject: string;
    system: string;
    chapter: string;
    topic: string;
    concept: string;
    boardIds: string[];
    boardNames: string[];
    sourcePointId: string | null;
    difficulty?: string;
    status?: string;
    marks?: number;
  },
): DraftQuestion {
  const metadata = {
    boards: ctx.boardNames,
    importantSchools: [] as string[],
    sources: [] as string[],
    teachers: [] as string[],
    tags: [] as string[],
    difficulty: ctx.difficulty ?? "medium",
    status: ctx.status ?? "published",
    marks: ctx.marks ?? 1,
  };

  if (q.question_type === "mcq") {
    return {
      id: mkQuestionId(),
      questionMode: "mcq",
      subject: ctx.subject,
      system: ctx.system,
      chapter: ctx.chapter,
      topic: ctx.topic,
      concept: ctx.concept,
      boardIds: [...ctx.boardIds],
      metadata,
      mcq: {
        stem: q.stem,
        trueFalse: (q.mcq_statements ?? []).map((row) => ({
          id: mkQuestionId(),
          statement: row.text,
          correct: row.correct,
          explanation: "",
        })),
      },
      sba: null,
      sourcePointId: ctx.sourcePointId,
    };
  }

  const opts: [string, string, string, string, string] = ["", "", "", "", ""];
  (q.sba_options ?? []).slice(0, 5).forEach((row, i) => {
    opts[i] = row.text;
  });

  return {
    id: mkQuestionId(),
    questionMode: "sba",
    subject: ctx.subject,
    system: ctx.system,
    chapter: ctx.chapter,
    topic: ctx.topic,
    concept: ctx.concept,
    boardIds: [...ctx.boardIds],
    metadata,
    mcq: null,
    sba: {
      stem: q.stem,
      options: opts,
      correctIndex: (q.sba_correct_index ?? 0) as 0 | 1 | 2 | 3 | 4,
      optionExplanations: [...emptySbaExplanations()],
    },
    sourcePointId: ctx.sourcePointId,
  };
}
