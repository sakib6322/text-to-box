import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { ConceptDetail } from "@/lib/conceptDetail";
import { looksLikeHtml } from "@/lib/htmlContent";
import { prepareRichHtmlForDisplay, attachGoogleDriveImageFallbacks, type RichHtmlImageOptions } from "@/lib/richHtmlImages";
import { resolveBodyHtml } from "@/lib/conceptDetail";

function sanitizeFilename(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned.slice(0, 80) || "concept";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function richHtml(value: string, imageOptions?: RichHtmlImageOptions): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (looksLikeHtml(raw)) return prepareRichHtmlForDisplay(raw, imageOptions);
  return `<p>${escapeHtml(raw).replace(/\n/g, "<br/>")}</p>`;
}

function ensureBanglaFontStylesheet(): Promise<void> {
  const id = "concept-pdf-noto-bengali";
  if (document.getElementById(id)) return document.fonts.ready.then(() => undefined);
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap";
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
    // Don't hang forever if network is slow
    window.setTimeout(() => resolve(), 2500);
  }).then(() => document.fonts.ready.then(() => undefined));
}

function buildConceptHtml(
  conceptName: string,
  detail: ConceptDetail,
  keyPoints: string[],
  imageOptions?: RichHtmlImageOptions,
): string {
  const body = richHtml(resolveBodyHtml(detail), imageOptions);
  const hasLegacy =
    Boolean(detail.summary.trim()) ||
    detail.paragraphs.length > 1 ||
    (detail.table?.rows?.length ?? 0) > 0;
  const summary = !body || hasLegacy ? richHtml(detail.summary, imageOptions) : "";
  const paragraphs =
    !body || hasLegacy ? detail.paragraphs.map((p) => richHtml(p, imageOptions)).filter(Boolean) : [];
  const table = !body || hasLegacy ? detail.table : null;
  const story = richHtml(detail.storyHtml, imageOptions);

  let tableHtml = "";
  if (table?.rows?.length) {
    const headers = table.headers?.length
      ? table.headers
      : Array.from({ length: table.rows[0]?.cells?.length ?? 3 }, (_, i) => `Column ${i + 1}`);
    const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
    const bodyRows = table.rows
      .map((row) => {
        const cells = row.cells ?? [];
        return `<tr>${headers
          .map((_, i) => `<td>${richHtml(cells[i] ?? "", imageOptions) || "&nbsp;"}</td>`)
          .join("")}</tr>`;
      })
      .join("");
    tableHtml = `
      <section class="block">
        ${table.title?.trim() ? `<h2>${escapeHtml(table.title.trim())}</h2>` : "<h2>Table</h2>"}
        <table><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>
      </section>`;
  }

  const kpHtml = keyPoints
    .map((kp) => kp.trim())
    .filter(Boolean)
    .map((kp) => `<li>${escapeHtml(kp)}</li>`)
    .join("");

  const verbatim = detail.verbatimText.trim()
    ? `<section class="block muted"><h2>Verbatim source</h2><pre>${escapeHtml(detail.verbatimText.trim())}</pre></section>`
    : "";

  return `
    <div class="pdf-root">
      <header class="hero">
        <p class="eyebrow">Concept details</p>
        <h1>${escapeHtml(conceptName || "Untitled concept")}</h1>
      </header>
      ${body && !hasLegacy ? `<section class="block">${body}</section>` : ""}
      ${summary ? `<section class="block summary">${summary}</section>` : ""}
      ${
        paragraphs.length
          ? `<section class="block"><h2>Details</h2>${paragraphs.map((p) => `<div class="para">${p}</div>`).join("")}</section>`
          : ""
      }
      ${tableHtml}
      ${story ? `<section class="block"><h2>Story-based learning</h2>${story}</section>` : ""}
      ${kpHtml ? `<section class="block"><h2>Key points</h2><ul>${kpHtml}</ul></section>` : ""}
      ${verbatim}
      <footer>pgdiary.cloud · ${escapeHtml(
        new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
      )}</footer>
    </div>
  `;
}

export async function downloadConceptDetailPdf(
  conceptName: string,
  detail: ConceptDetail,
  keyPoints: string[],
  imageOptions?: RichHtmlImageOptions,
): Promise<void> {
  await ensureBanglaFontStylesheet();

  const host = document.createElement("div");
  host.setAttribute("data-concept-pdf-host", "1");
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    "width:794px",
    "padding:0",
    "margin:0",
    "background:#fff",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = `
    .pdf-root {
      box-sizing: border-box;
      width: 794px;
      padding: 36px 40px 48px;
      color: #1e293b;
      background: #ffffff;
      font-family: "Noto Sans Bengali", "Noto Sans", "Nirmala UI", "Vrinda", "Kalpurush", "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
    }
    .pdf-root *, .pdf-root *::before, .pdf-root *::after { box-sizing: border-box; }
    .hero {
      background: #2563eb;
      color: #fff;
      margin: -36px -40px 24px;
      padding: 28px 40px 24px;
    }
    .eyebrow { margin: 0 0 6px; font-size: 12px; opacity: 0.9; }
    .hero h1 { margin: 0; font-size: 26px; font-weight: 700; line-height: 1.35; word-break: break-word; }
    .block { margin-bottom: 22px; }
    .summary { font-size: 15px; font-weight: 600; }
    h2 { margin: 0 0 10px; font-size: 16px; font-weight: 700; color: #0f172a; }
    .para { margin-bottom: 12px; }
    .para p, .summary p { margin: 0 0 8px; }
    strong, b { font-weight: 700; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    ul, ol { margin: 0; padding-left: 1.25rem; }
    li { margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; word-wrap: break-word; }
    th { background: #fbbf24; color: #1e293b; font-weight: 700; text-align: left; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    img { max-width: 100%; height: auto; display: block; margin: 8px 0; border-radius: 6px; }
    figure { margin: 10px 0; }
    figcaption { font-size: 11px; color: #64748b; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: inherit;
      font-size: 12px;
      color: #475569;
    }
    .muted h2 { color: #64748b; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  `;

  host.appendChild(style);
  const content = document.createElement("div");
  content.innerHTML = buildConceptHtml(conceptName, detail, keyPoints, imageOptions);
  host.appendChild(content);
  document.body.appendChild(host);

  try {
    attachGoogleDriveImageFallbacks(host);

    // Allow images (base64 / Drive proxy) to decode before capture
    const images = Array.from(host.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    );

    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageCanvas = document.createElement("canvas");
    const pageCtx = pageCanvas.getContext("2d");
    if (!pageCtx) throw new Error("Could not create canvas context");

    const pxPerMm = canvas.width / imgWidth;
    const pageHeightPx = pageHeight * pxPerMm;
    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      pageCtx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0,
        renderedHeight,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      const sliceData = pageCanvas.toDataURL("image/jpeg", 0.92);
      const sliceHeightMm = sliceHeight / pxPerMm;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeightMm);

      renderedHeight += sliceHeight;
      pageIndex += 1;
      // safety against infinite loop on tiny remainders
      if (sliceHeight < 1) break;
    }

    pdf.save(`${sanitizeFilename(conceptName)}.pdf`);
  } finally {
    host.remove();
  }
}
