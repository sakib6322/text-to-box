const MAX_POINTS = 200;

const POINT_ALIASES = new Set(["key_point", "content", "keypoint", "key_points"]);

export type ParsedKeyPointsCsv = {
  points: string[];
  warnings: string[];
};

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

/** Remove optional markdown fences like ```csv ... ``` */
function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:csv|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return fence ? fence[1].trim() : trimmed;
}

/** Minimal RFC4180-ish CSV line splitter (handles quoted commas / escaped quotes). */
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

/**
 * Parse Home bulk CSV: key_point column only (concept name is typed in the UI).
 * Extra columns (e.g. concept_name) are ignored. No Gemini — pure client parse.
 */
export function parseKeyPointsCsv(raw: string): ParsedKeyPointsCsv {
  const text = stripMarkdownFence(stripBom(raw));
  if (!text.trim()) throw new Error("CSV is empty");

  const rows = splitCsvRows(text);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one data row");

  const headers = parseCsvLine(rows[0]).map(normHeader);
  const pointIdx = headers.findIndex((h) => POINT_ALIASES.has(h));

  if (pointIdx < 0) {
    throw new Error('Missing key point column — use header "key_point" (or content / keypoint)');
  }

  const warnings: string[] = [];
  const points: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = parseCsvLine(rows[r]);
    const p = (cells[pointIdx] ?? "").trim();
    if (!p) continue;
    points.push(p);
  }

  if (!points.length) throw new Error("No key points found — add at least one key_point row");
  if (points.length > MAX_POINTS) {
    throw new Error(`Too many key points (${points.length}). Maximum is ${MAX_POINTS} per upload.`);
  }

  let dupes = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i] === points[i - 1]) dupes++;
  }
  if (dupes > 0) warnings.push(`${dupes} consecutive duplicate key point(s) kept — review before save.`);

  return { points, warnings };
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return fence ? fence[1].trim() : trimmed;
}

function finalizeKeyPoints(points: string[]): ParsedKeyPointsCsv {
  const cleaned = points.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) throw new Error("No key points found — add at least one entry");
  if (cleaned.length > MAX_POINTS) {
    throw new Error(`Too many key points (${cleaned.length}). Maximum is ${MAX_POINTS} per upload.`);
  }
  const warnings: string[] = [];
  let dupes = 0;
  for (let i = 1; i < cleaned.length; i++) {
    if (cleaned[i] === cleaned[i - 1]) dupes++;
  }
  if (dupes > 0) warnings.push(`${dupes} consecutive duplicate key point(s) kept — review before save.`);
  return { points: cleaned, warnings };
}

/**
 * Parse Home bulk JSON: key points only (concept name typed in the UI).
 * Accepts `{ "key_points": ["..."] }`, `{ "points": [...] }`, or a bare string array.
 * Objects like `{ "key_point": "..." }` / `{ "content": "..." }` in an array are also accepted.
 */
export function parseKeyPointsJson(raw: string): ParsedKeyPointsCsv {
  const text = stripJsonFence(stripBom(raw));
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
  } else if (parsed && typeof parsed === "object") {
    const root = parsed as Record<string, unknown>;
    const arr = root.key_points ?? root.keyPoints ?? root.points ?? root.high_yield_points;
    if (!Array.isArray(arr)) {
      throw new Error('Root must be an array or { "key_points": ["..."] }');
    }
    list = arr;
  } else {
    throw new Error('Root must be an array or { "key_points": ["..."] }');
  }

  const points: string[] = [];
  for (const row of list) {
    if (typeof row === "string" || typeof row === "number") {
      const s = String(row).trim();
      if (s) points.push(s);
      continue;
    }
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const s = String(o.key_point ?? o.keyPoint ?? o.content ?? o.text ?? "").trim();
      if (s) points.push(s);
    }
  }

  return finalizeKeyPoints(points);
}

/** External-AI prompt for Home key-points JSON (no taxonomy / concept in output). */
export function buildExternalKeyPointsJsonPrompt(): string {
  return `You are preparing high-yield medical key points for a question-bank app (Home concept builder).

Output ONLY valid JSON (no markdown fences, no commentary) with this exact shape:

{
  "key_points": [
    "One clear exam-oriented fact per string",
    "Another key point"
  ]
}

Rules:
- Do NOT include concept_name, subject, system, chapter, or topic (user types/selects those in the app)
- 8–40 key points for one concept only
- Each string: one recall line (not a paragraph)
- Plain UTF-8 JSON only

Source / concept notes:
<<<PASTE CONCEPT NAME + TEXTBOOK NOTES HERE>>>`;
}

/** @deprecated Use parseKeyPointsCsv */
export const parseConceptKeyPointsCsv = parseKeyPointsCsv;

export async function readCsvFileAsText(file: File): Promise<string> {
  return file.text();
}
