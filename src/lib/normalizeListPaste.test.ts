import { describe, expect, it } from "vitest";
import { normalizeClipboardListHtml, plainTextBulletsToHtml } from "./normalizeListPaste";

describe("plainTextBulletsToHtml", () => {
  it("converts solid and hollow bullets into nested lists", () => {
    const html = plainTextBulletsToHtml(
      [
        "• Community-Acquired Pneumonia (CAP)",
        "○ Exam Trap: Nosocomial pneumonia is NOT the same",
        "○ Aspiration pneumonia: right upper lobe when supine",
        "• Hospital-Acquired Pneumonia (HAP)",
      ].join("\n"),
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Community-Acquired Pneumonia (CAP)");
    expect(html).toMatch(/<ul>[\s\S]*<ul>/);
    expect(html).toContain("Exam Trap");
    expect(html).toContain("</ul></li><li>Hospital-Acquired Pneumonia (HAP)");
  });

  it("returns null when there are no list glyphs", () => {
    expect(plainTextBulletsToHtml("Just a paragraph.")).toBeNull();
  });
});

describe("normalizeClipboardListHtml", () => {
  it("leaves real HTML lists alone", () => {
    expect(normalizeClipboardListHtml("<ul><li>A</li></ul>", "• A")).toBeNull();
  });

  it("promotes plain glyph paste when HTML has no lists", () => {
    const out = normalizeClipboardListHtml("", "• CAP\n○ Exam Trap");
    expect(out).toContain("<ul>");
    expect(out).toContain("CAP");
  });
});
