import { describe, expect, it } from "vitest";
import {
  extractGoogleDriveFileId,
  googleDriveImageUrl,
  resolveImageInsertUrl,
  transformRichHtmlImages,
} from "./richHtmlImages";

describe("richHtmlImages", () => {
  it("extracts file id from share link", () => {
    expect(extractGoogleDriveFileId("https://drive.google.com/file/d/abc123XYZ/view?usp=sharing")).toBe("abc123XYZ");
    expect(extractGoogleDriveFileId("https://drive.google.com/open?id=openId99")).toBe("openId99");
  });

  it("converts drive anchor to lazy img via proxy", () => {
    const html =
      '<p><a href="https://drive.google.com/file/d/abc123/view">link</a></p>';
    const out = transformRichHtmlImages(html);
    expect(out).toContain('src="/api/gdrive-image/abc123"');
    expect(out).toContain('data-gdrive-id="abc123"');
    expect(out).toContain('loading="lazy"');
    expect(out).not.toContain("<a ");
  });

  it("converts plain drive URL in paragraph", () => {
    const html = "<p>https://drive.google.com/file/d/plainId/view</p>";
    const out = transformRichHtmlImages(html);
    expect(out).toContain('/api/gdrive-image/plainId');
    expect(out).toContain("<img");
  });

  it("resolves img src from drive view URL", () => {
    const html = '<img src="https://drive.google.com/file/d/imgSrc1/view" alt="x" />';
    const out = transformRichHtmlImages(html);
    expect(out).toContain(googleDriveImageUrl("imgSrc1"));
  });

  it("resolves insert urls for drive and direct images", () => {
    expect(resolveImageInsertUrl("https://drive.google.com/file/d/abc123/view")).toBe("/api/gdrive-image/abc123");
    expect(resolveImageInsertUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(resolveImageInsertUrl("not-a-url")).toBeNull();
  });

  it("respects lazy loading off", () => {
    const html = '<img src="https://example.com/a.png" alt="x" />';
    const out = transformRichHtmlImages(html, { lazyLoading: false });
    expect(out).toContain('loading="eager"');
    expect(out).not.toContain('loading="lazy"');
  });
});
