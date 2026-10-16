/**
 * When users paste from Word / PDF / notes apps, list markers are often:
 * - CSS-only (lost in plain text), or
 * - Unicode glyphs (• ○) sitting in paragraphs instead of real <ul>/<li>.
 * Convert glyph-prefixed lines into nested HTML lists so bullets survive save/preview.
 */

const BULLET_LINE =
  /^([\t ]*)([•●○◦▪▫◆◇■□‣∙·*+\-–—])\s+(.*)$/u;
const NUMBERED_LINE =
  /^([\t ]*)((?:\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)])\s+(.*)$/;

/** Hollow / outline glyphs usually mean a nested (level-1+) item in study notes. */
const NESTED_GLYPHS = new Set(["○", "◦", "▫", "□", "◇"]);

function indentLevel(prefix: string, glyph?: string): number {
  const spaces = prefix.replace(/\t/g, "    ");
  const fromSpaces = Math.floor(spaces.length / 2);
  if (glyph && NESTED_GLYPHS.has(glyph)) return Math.max(fromSpaces, 1);
  return fromSpaces;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LineKind = "bullet" | "number" | "text";

type ParsedLine = {
  kind: LineKind;
  level: number;
  text: string;
};

function parseLine(raw: string): ParsedLine {
  const bullet = raw.match(BULLET_LINE);
  if (bullet) {
    const glyph = bullet[2] ?? "";
    return {
      kind: "bullet",
      level: indentLevel(bullet[1] ?? "", glyph),
      text: (bullet[3] ?? "").trimEnd(),
    };
  }
  const numbered = raw.match(NUMBERED_LINE);
  if (numbered) {
    return { kind: "number", level: indentLevel(numbered[1] ?? ""), text: (numbered[3] ?? "").trimEnd() };
  }
  return { kind: "text", level: 0, text: raw };
}

function hasListGlyphs(text: string): boolean {
  return text.split(/\n/).some((line) => BULLET_LINE.test(line) || NUMBERED_LINE.test(line));
}

function htmlAlreadyHasLists(html: string): boolean {
  return /<(ul|ol)\b/i.test(html);
}

/** Build nested ul/ol HTML from flat parsed lines. */
function linesToListHtml(lines: ParsedLine[]): string {
  type Frame = { kind: "ul" | "ol"; level: number; liOpen: boolean };
  const stack: Frame[] = [];
  const parts: string[] = [];

  const closeLi = () => {
    const top = stack[stack.length - 1];
    if (top?.liOpen) {
      parts.push("</li>");
      top.liOpen = false;
    }
  };

  const closeListsDeeperThan = (level: number) => {
    while (stack.length && stack[stack.length - 1].level > level) {
      closeLi();
      const top = stack.pop()!;
      parts.push(top.kind === "ul" ? "</ul>" : "</ol>");
    }
  };

  const closeAllLists = () => {
    while (stack.length) {
      closeLi();
      const top = stack.pop()!;
      parts.push(top.kind === "ul" ? "</ul>" : "</ol>");
    }
  };

  const ensureList = (kind: "ul" | "ol", level: number) => {
    closeListsDeeperThan(level);

    const top = stack[stack.length - 1];
    if (top && top.level === level && top.kind !== kind) {
      closeLi();
      stack.pop();
      parts.push(top.kind === "ul" ? "</ul>" : "</ol>");
    }

    const cur = stack[stack.length - 1];
    if (cur && cur.level === level && cur.kind === kind) return;

    // Open any missing parent levels so nesting stays valid HTML
    let nextLevel = cur ? cur.level + 1 : 0;
    while (nextLevel <= level) {
      parts.push(kind === "ul" ? "<ul>" : "<ol>");
      stack.push({ kind, level: nextLevel, liOpen: false });
      nextLevel += 1;
    }
  };

  for (const line of lines) {
    if (line.kind === "text") {
      closeAllLists();
      const t = line.text.trim();
      if (t) parts.push(`<p>${escapeHtml(t)}</p>`);
      continue;
    }

    const listKind = line.kind === "bullet" ? "ul" : "ol";
    // First list item always starts at top level even if glyph implies nesting
    const level = stack.length === 0 ? 0 : line.level;
    ensureList(listKind, level);
    closeLi();
    parts.push(`<li>${escapeHtml(line.text)}`);
    stack[stack.length - 1].liOpen = true;
  }

  closeAllLists();
  return parts.join("");
}

/**
 * Convert plain text that uses bullet/number glyphs into HTML lists.
 * Returns null when no conversion is needed.
 */
export function plainTextBulletsToHtml(text: string): string | null {
  const raw = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!raw.trim() || !hasListGlyphs(raw)) return null;

  const lines = raw.split("\n").map(parseLine);
  const listLineCount = lines.filter((l) => l.kind !== "text").length;
  if (listLineCount === 0) return null;

  return linesToListHtml(lines);
}

/**
 * Decide paste HTML for the editor.
 * Prefer existing real lists; otherwise promote glyph-prefixed plain text / paragraphs.
 */
export function normalizeClipboardListHtml(html: string, plainText: string): string | null {
  if (htmlAlreadyHasLists(html)) return null;

  const fromPlain = plainTextBulletsToHtml(plainText);
  if (fromPlain) return fromPlain;

  // HTML paste without <ul>/<ol> but with glyph bullets inside blocks (common from Word/web)
  if (html.trim() && typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocks = Array.from(doc.body.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6"));
    const asLines = blocks.length
      ? blocks.map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean)
      : [];
    if (asLines.length) {
      const reconstructed = plainTextBulletsToHtml(asLines.join("\n"));
      if (reconstructed) return reconstructed;
    }
  }

  return plainTextBulletsToHtml(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " "),
  );
}
