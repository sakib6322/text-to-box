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

/** Split multi-value CSV cell on | (trim empties kept for aligned correct/explanation lists). */
function splitPipe(cell: string): string[] {
  if (!cell.trim()) return [];
  return cell.split("|").map((s) => s.trim());
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (cur.trim()) rows.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) rows.push(cur);
  return rows;
}

function normHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

const TYPE_ALIASES = new Set(["type", "question_type", "question_mode"]);
const STEM_ALIASES = new Set(["stem", "question", "question_stem"]);
const BOARDS_ALIASES = new Set(["boards", "board", "board_names"]);
const TEXTS_ALIASES = new Set(["texts", "items", "statements", "options", "text"]);
const CORRECTS_ALIASES = new Set(["corrects", "correct", "correct_index", "answer"]);
const EXPL_ALIASES = new Set(["explanations", "explanation", "option_explanations"]);

/**
 * One question per CSV row.
 * Columns: type,stem,boards,texts,corrects,explanations
 * Multi-values use | (pipe). MCQ: corrects = true|false… ; SBA: corrects = 0–4 index.
 */
export function parseBulkQuestionsCsv(raw: string): ParseBulkQuestionsResult {
  const body = (() => {
    const t = stripBom(raw).trim();
    const fence = t.match(/^```(?:csv|json|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
    return fence ? fence[1].trim() : t;
  })();

  if (!body.trim()) throw new Error("CSV is empty");
  const rows = splitCsvRows(body);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row");

  const headers = parseCsvLine(rows[0]).map(normHeader);
  const col = (aliases: Set<string>) => headers.findIndex((h) => aliases.has(h));
  const typeIdx = col(TYPE_ALIASES);
  const stemIdx = col(STEM_ALIASES);
  const boardsIdx = col(BOARDS_ALIASES);
  const textsIdx = col(TEXTS_ALIASES);
  const correctsIdx = col(CORRECTS_ALIASES);
  const explIdx = col(EXPL_ALIASES);

  if (typeIdx < 0) throw new Error('Missing "type" column (mcq|sba)');
  if (stemIdx < 0) throw new Error('Missing "stem" column');
  if (textsIdx < 0) throw new Error('Missing "texts" column (pipe-separated statements/options)');
  if (correctsIdx < 0) throw new Error('Missing "corrects" column');

  if (rows.length - 1 > MAX_QUESTIONS) {
    throw new Error(`Too many questions (${rows.length - 1}). Maximum is ${MAX_QUESTIONS} per import.`);
  }

  const warnings: string[] = [];
  const items: BulkQuestionItem[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = parseCsvLine(rows[r]);
    const type = (cells[typeIdx] ?? "").trim().toLowerCase();
    const stem = (cells[stemIdx] ?? "").trim();
    const boards = boardsIdx >= 0 ? splitPipe(cells[boardsIdx] ?? "") : [];
    const texts = splitPipe(cells[textsIdx] ?? "");
    const correctsRaw = (cells[correctsIdx] ?? "").trim();
    const expls = explIdx >= 0 ? splitPipe(cells[explIdx] ?? "") : [];

    if (!type && !stem && !texts.length) continue;
    if (type !== "mcq" && type !== "sba") {
      warnings.push(`Row ${r + 1}: skipped — type must be mcq or sba`);
      continue;
    }
    if (!stem) {
      warnings.push(`Row ${r + 1}: skipped — stem is required`);
      continue;
    }
    if (!texts.length) {
      warnings.push(`Row ${r + 1}: skipped — texts is empty`);
      continue;
    }

    if (type === "mcq") {
      if (texts.length > MAX_MCQ_STATEMENTS) {
        warnings.push(`Row ${r + 1}: truncated statements to ${MAX_MCQ_STATEMENTS}`);
      }
      const correctParts = splitPipe(correctsRaw);
      const statements: BulkMcqStatement[] = [];
      const slice = texts.slice(0, MAX_MCQ_STATEMENTS);
      for (let i = 0; i < slice.length; i++) {
        const correct = parseCorrect(correctParts[i] ?? "false");
        if (correct === null && correctParts[i]) {
          warnings.push(`Row ${r + 1} statement ${i + 1}: invalid correct — defaulted to false`);
        }
        statements.push({
          text: slice[i],
          correct: correct ?? false,
          explanation: expls[i] ?? "",
        });
      }
      items.push({ type: "mcq", stem, boards, statements });
    } else {
      if (texts.length < 5) {
        warnings.push(`Row ${r + 1}: skipped — SBA needs exactly 5 options in texts`);
        continue;
      }
      const options = padFive(texts, warnings, "options", items.length);
      if (options.some((o) => !o.trim())) {
        warnings.push(`Row ${r + 1}: skipped — SBA options must be non-empty`);
        continue;
      }
      let correctIndex = Number(correctsRaw.split("|")[0]?.trim() ?? "0");
      if (!Number.isFinite(correctIndex) || correctIndex < 0 || correctIndex > 4) {
        warnings.push(`Row ${r + 1}: invalid correct index — using 0`);
        correctIndex = 0;
      }
      const optionExplanations = padFive(expls, warnings, "explanations", items.length);
      items.push({
        type: "sba",
        stem,
        boards,
        options,
        correctIndex: Math.trunc(correctIndex),
        optionExplanations,
      });
    }
  }

  if (!items.length) throw new Error("No valid questions after CSV validation");
  return { items, warnings };
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

/** External-AI prompt with live board names injected (JSON output). */
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

/** External-AI prompt for CSV bulk (one question per row, pipe-separated multi-values). */
export function buildExternalBulkQuestionsCsvPrompt(boardNames: string[]): string {
  const boardList =
    boardNames.length > 0
      ? boardNames.join(" | ")
      : "(no boards yet — leave boards cell empty)";

  return `You are preparing exam questions for a medical question-bank app.

Output ONLY a CSV file (no markdown fences, no commentary).

Header row EXACTLY:
type,stem,boards,texts,corrects,explanations

Rules:
- One question per data row
- type: mcq or sba
- boards: board names separated by | (pipe). Use exact names from: ${boardList}
  If none: leave boards empty
- texts: for MCQ = true/false statements separated by | ; for SBA = exactly 5 options separated by |
- corrects: for MCQ = true|false|... aligned with texts ; for SBA = single 0-based index 0–4
- explanations: pipe-separated, same count as texts (SBA must have 5)
- Quote cells that contain commas
- Do NOT put | inside a statement/option (use commas or rephrase)
- Do NOT include subject/system/chapter/topic/concept
- 4–12 questions; mix mcq and sba allowed
- Plain UTF-8 CSV only

Example:
type,stem,boards,texts,corrects,explanations
mcq,"Regarding the mitral valve:","BCPS|FCPS","It has two cusps|It guards the right AV orifice","true|false","Anterior and posterior leaflets.|It guards the left AV orifice."
sba,"Which structure guards the left AV orifice?","MD","Tricuspid valve|Mitral valve|Aortic valve|Pulmonary valve|Eustachian valve","1","Right AV valve.|Correct — mitral.|LV outflow.|RV outflow.|IVC remnant."

Source / concept notes:
<<<PASTE TEXTBOOK NOTES OR TOPIC HERE>>>`;
}
