import { describe, expect, it } from "vitest";
import { htmlToPlainText, isHtmlEmpty } from "./htmlContent";

describe("htmlToPlainText", () => {
  it("preserves nested list markers", () => {
    const plain = htmlToPlainText(
      "<ul><li>CAP<ul><li>Exam Trap</li><li>Aspiration</li></ul></li><li>HAP</li></ul>",
    );
    expect(plain).toContain("• CAP");
    expect(plain).toContain("○ Exam Trap");
    expect(plain).toContain("○ Aspiration");
    expect(plain).toContain("• HAP");
  });

  it("treats empty list shells as empty", () => {
    expect(isHtmlEmpty("<p></p>")).toBe(true);
    expect(isHtmlEmpty("<ul><li></li></ul>")).toBe(true);
    expect(isHtmlEmpty("<ul><li>CAP</li></ul>")).toBe(false);
  });
});
