import {
  emptySbaExplanations,
  mkQuestionId,
  type DraftQuestion,
  type TfItem,
} from "@/lib/questionDrafts";

const MAX_QUESTIONS = 50;
const MAX_MCQ_STATEMENTS = 20;

export type BulkMcqStatement = {
  text: string;
  correct: boolean;
  explanation: string;
};

export type BulkMcqItem = {
  type: "mcq";
  stem: string;
  boards: string[];
  statements: BulkMcqStatement[];
};

export type BulkSbaItem = {
  type: "sba";
  stem: string;
  boards: string[];
  options: [string, string, string, string, string];
  correctIndex: number;
  optionExplanations: [string, string, string, string, string];
};

export type BulkQuestionItem = BulkMcqItem | BulkSbaItem;

export type ParseBulkQuestionsResult = {
  items: BulkQuestionItem[];
  warnings: string[];
};

export type BoardOptionLike = { id: string; name: string };

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return fence ? fence[1].trim() : trimmed;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(asString).filter(Boolean);
}

function parseCorrect(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "t" || s === "yes" || s === "1") return true;
    if (s === "false" || s === "f" || s === "no" || s === "0") return false;
  }
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  return null;
}

function padFive(arr: string[], warnings: string[], label: string, qIndex: number): [string, string, string, string, string] {
  const out = emptySbaExplanations();
  for (let i = 0; i < 5; i++) out[i] = arr[i] ?? "";
  if (arr.length !== 5) {
    warnings.push(`Question ${qIndex + 1}: ${label} length ${arr.length} — padded/truncated to 5`);
  }
  return out;
}

function parseOneItem(raw: unknown, index: number, warnings: string[]): BulkQuestionItem | null {
  const obj = asRecord(raw);
  if (!obj) {
    warnings.push(`Question ${index + 1}: skipped — not an object`);
    return null;
  }

  const typeRaw = asString(obj.type ?? obj.question_type ?? obj.questionMode).toLowerCase();
  const type = typeRaw === "mcq" || typeRaw === "sba" ? typeRaw : null;
  if (!type) {
    warnings.push(`Question ${index + 1}: skipped — type must be "mcq" or "sba"`);
    return null;
  }

  const stem = asString(obj.stem);
  if (!stem) {
    warnings.push(`Question ${index + 1}: skipped — stem is required`);
    return null;
  }

  const boards = asStringArray(obj.boards ?? obj.board_names ?? obj.boardNames);

  if (type === "mcq") {
    const stmtsRaw = obj.statements ?? obj.mcq_statements ?? obj.trueFalse;
    if (!Array.isArray(stmtsRaw) || stmtsRaw.length === 0) {
      warnings.push(`Question ${index + 1}: skipped — MCQ needs statements[]`);
      return null;
    }
    if (stmtsRaw.length > MAX_MCQ_STATEMENTS) {
      warnings.push(`Question ${index + 1}: truncated statements to ${MAX_MCQ_STATEMENTS}`);
    }
    const statements: BulkMcqStatement[] = [];
    for (const row of stmtsRaw.slice(0, MAX_MCQ_STATEMENTS)) {
      const r = asRecord(row);
      if (!r) continue;
      const text = asString(r.text ?? r.statement);
      if (!text) continue;
      const correct = parseCorrect(r.correct);
      if (correct === null) {
        warnings.push(`Question ${index + 1}: statement missing valid correct — defaulted to false`);
      }
      statements.push({
        text,
        correct: correct ?? false,
        explanation: asString(r.explanation),
      });
    }
    if (!statements.length) {
      warnings.push(`Question ${index + 1}: skipped — no valid MCQ statements`);
      return null;
    }
    return { type: "mcq", stem, boards, statements };
  }

  const optsRaw = obj.options ?? obj.sba_options;
  const optStrings = Array.isArray(optsRaw)
    ? optsRaw.map((o) => {
        if (typeof o === "string" || typeof o === "number") return asString(o);
        const r = asRecord(o);
        return r ? asString(r.text ?? r.option) : "";
      })
    : [];
  if (optStrings.filter(Boolean).length < 5 && optStrings.length < 5) {
    warnings.push(`Question ${index + 1}: skipped — SBA needs exactly 5 options`);
    return null;
  }
  const options = padFive(optStrings, warnings, "options", index);
  if (options.some((o) => !o.trim())) {
    warnings.push(`Question ${index + 1}: skipped — SBA options must be non-empty`);
    return null;
  }

  let correctIndex = Number(obj.correct_index ?? obj.correctIndex ?? obj.sba_correct_index ?? 0);
  if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 4) {
    warnings.push(`Question ${index + 1}: invalid correct_index — using 0`);
    correctIndex = 0;
  }

  const explRaw = obj.option_explanations ?? obj.optionExplanations ?? [];
  const explStrings = Array.isArray(explRaw) ? explRaw.map(asString) : [];
  const optionExplanations = padFive(explStrings, warnings, "option_explanations", index);

  return {
    type: "sba",
    stem,
    boards,
    options,
    correctIndex: Math.trunc(correctIndex),
    optionExplanations,
  };
}

/**
 * Parse Create-Question bulk JSON (no Gemini). Accepts `{ questions: [...] }` or a bare array.
 */
export function parseBulkQuestionsJson(raw: string): ParseBulkQuestionsResult {
  const text = stripMarkdownFence(stripBom(raw));
  if (!text.trim()) throw new Error("JSON is empty");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON — fix syntax and try again");
  }

  let list: unknown[];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else {
    const root = asRecord(parsed);
    const q = root?.questions ?? root?.items;
    if (!Array.isArray(q)) {
      throw new Error('Root must be an array or { "questions": [...] }');
    }
    list = q;
  }

  if (!list.length) throw new Error("No questions found in JSON");
  if (list.length > MAX_QUESTIONS) {
    throw new Error(`Too many questions (${list.length}). Maximum is ${MAX_QUESTIONS} per import.`);
  }

  const warnings: string[] = [];
  const items: BulkQuestionItem[] = [];
  list.forEach((row, i) => {
    const item = parseOneItem(row, i, warnings);
    if (item) items.push(item);
  });

  if (!items.length) throw new Error("No valid questions after validation");
  return { items, warnings };
}

export function resolveBoardNames(
  names: string[],
  boardOptions: BoardOptionLike[],
): { boardIds: string[]; boardNames: string[]; unknown: string[] } {
  const byNorm = new Map(boardOptions.map((b) => [b.name.trim().toLowerCase(), b]));
  const boardIds: string[] = [];
  const boardNames: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    const hit = byNorm.get(key);
    if (!hit) {
      unknown.push(name.trim());
      continue;
    }
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    boardIds.push(hit.id);
    boardNames.push(hit.name);
  }
  return { boardIds, boardNames, unknown };
}

export type BulkDraftContext = {
  subject: string;
  system: string;
  chapter: string;
  topic: string;
  topicId?: string;
  concept: string;
  boardOptions: BoardOptionLike[];
  difficulty?: string;
  status?: string;
  marks?: number;
  mkId?: () => string;
};

export type BulkToDraftsResult = {
  drafts: DraftQuestion[];
  warnings: string[];
  boardsResolved: number;
};

export function bulkItemsToDrafts(items: BulkQuestionItem[], ctx: BulkDraftContext): BulkToDraftsResult {
  const mkId = ctx.mkId ?? mkQuestionId;
  const warnings: string[] = [];
  let boardsResolved = 0;
  const drafts: DraftQuestion[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const resolved = resolveBoardNames(item.boards, ctx.boardOptions);
    boardsResolved += resolved.boardIds.length;
    if (resolved.unknown.length) {
      warnings.push(
        `Question ${i + 1}: unknown board(s) skipped — ${resolved.unknown.slice(0, 5).join(", ")}${resolved.unknown.length > 5 ? "…" : ""}`,
      );
    }

    const metadata: DraftQuestion["metadata"] = {
      boards: resolved.boardNames,
      importantSchools: [],
      sources: [],
      teachers: [],
      tags: [],
      difficulty: ctx.difficulty ?? "medium",
      status: ctx.status ?? "published",
      marks: ctx.marks ?? 1,
    };

    if (item.type === "mcq") {
      const trueFalse: TfItem[] = item.statements.map((s) => ({
        id: mkId(),
        statement: s.text,
        correct: s.correct ? "true" : "false",
        explanation: s.explanation,
      }));
      drafts.push({
        id: mkId(),
        questionMode: "mcq",
        subject: ctx.subject,
        system: ctx.system,
        chapter: ctx.chapter,
        topic: ctx.topic,
        concept: ctx.concept,
        boardIds: resolved.boardIds,
        metadata,
        mcq: { stem: item.stem, trueFalse },
        sba: null,
        sourcePointId: null,
      });
    } else {
      drafts.push({
        id: mkId(),
        questionMode: "sba",
        subject: ctx.subject,
        system: ctx.system,
        chapter: ctx.chapter,
        topic: ctx.topic,
        concept: ctx.concept,
        boardIds: resolved.boardIds,
        metadata,
        mcq: null,
        sba: {
          stem: item.stem,
          options: [...item.options],
          correctIndex: item.correctIndex,
          optionExplanations: [...item.optionExplanations],
        },
        sourcePointId: null,
      });
    }
  }

  return { drafts, warnings, boardsResolved };
}

/** External-AI prompt with live board names injected. */
export function buildExternalBulkQuestionsPrompt(boardNames: string[]): string {
  const boardList =
    boardNames.length > 0
      ? boardNames.map((n) => `"${n}"`).join(", ")
      : "(no boards configured yet — use empty arrays)";

  return `You are preparing exam questions for a medical question-bank app.

Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:

{
  "questions": [ /* 1–N items, mix mcq and sba allowed */ ]
}

MCQ item:
{
  "type": "mcq",
  "stem": "string",
  "boards": ["ExactBoardName1"],
  "statements": [
    { "text": "statement", "correct": true, "explanation": "why true/false" }
  ]
}

SBA item:
{
  "type": "sba",
  "stem": "string",
  "boards": ["ExactBoardName2"],
  "options": ["A", "B", "C", "D", "E"],
  "correct_index": 0,
  "option_explanations": ["expA", "expB", "expC", "expD", "expE"]
}

Rules:
- Do NOT include subject/system/chapter/topic/concept (user selects those in the app).
- boards: use exact board names from this list when relevant: ${boardList}
- If no board applies, use "boards": []
- MCQ: 3–6 high-yield true/false statements with short explanations
- SBA: exactly 5 options; correct_index is 0-based; every option gets a short explanation
- One concept / topic only; 4–12 questions total unless I ask otherwise
- Plain UTF-8 JSON only

Source / concept notes:
<<<PASTE TEXTBOOK NOTES OR TOPIC HERE>>>`;
}
