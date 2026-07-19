import { jsPDF } from "jspdf";
import { COURSE_PLAN_META, COURSE_PLAN_SECTIONS } from "@/lib/courseMappingPlan";

const MARGIN = 18;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need > PAGE_H - 22) {
    doc.addPage();
    drawFooter(doc);
    return MARGIN + 8;
  }
  return y;
}

function drawFooter(doc: jsPDF) {
  const page = doc.getNumberOfPages();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 140);
  doc.text(`${COURSE_PLAN_META.product}  ·  Confidential product plan`, MARGIN, PAGE_H - 10);
  doc.text(`Page ${page}`, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
}

function wrap(doc: jsPDF, text: string, maxW: number): string[] {
  return doc.splitTextToSize(text, maxW);
}

/** Generate and download a professional multi-page PDF of the Course Mapping plan. */
export function downloadCourseMappingPlanPdf() {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  // Cover band
  doc.setFillColor(8, 47, 73);
  doc.rect(0, 0, PAGE_W, 52, "F");
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 52, PAGE_W, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(COURSE_PLAN_META.product.toUpperCase(), MARGIN, 18);
  doc.setFontSize(18);
  doc.text("Course Mapping Module", MARGIN, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Product & Implementation Plan  ·  v${COURSE_PLAN_META.version}  ·  ${COURSE_PLAN_META.date}`, MARGIN, 40);

  y = 66;
  doc.setTextColor(40, 50, 60);
  doc.setFontSize(10);
  const subtitleLines = wrap(doc, COURSE_PLAN_META.subtitle, CONTENT_W);
  doc.text(subtitleLines, MARGIN, y);
  y += subtitleLines.length * 5 + 8;

  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 10;

  drawFooter(doc);

  for (const section of COURSE_PLAN_SECTIONS) {
    y = ensureSpace(doc, y, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(8, 47, 73);
    doc.text(section.title, MARGIN, y);
    y += 7;

    if (section.body) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(55, 65, 75);
      const lines = wrap(doc, section.body, CONTENT_W);
      y = ensureSpace(doc, y, lines.length * 4.5 + 4);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.5 + 4;
    }

    if (section.bullets?.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(45, 55, 65);
      for (const bullet of section.bullets) {
        const lines = wrap(doc, bullet, CONTENT_W - 8);
        y = ensureSpace(doc, y, lines.length * 4.5 + 2);
        doc.setFillColor(14, 165, 233);
        doc.circle(MARGIN + 1.5, y - 1.2, 0.9, "F");
        doc.text(lines, MARGIN + 6, y);
        y += lines.length * 4.5 + 2.2;
      }
      y += 2;
    }

    if (section.subsections?.length) {
      for (const sub of section.subsections) {
        y = ensureSpace(doc, y, 10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(14, 116, 144);
        doc.text(sub.title, MARGIN + 2, y);
        y += 5.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(45, 55, 65);
        for (const bullet of sub.bullets) {
          const lines = wrap(doc, bullet, CONTENT_W - 10);
          y = ensureSpace(doc, y, lines.length * 4.5 + 2);
          doc.text(`–  ${lines[0]}`, MARGIN + 4, y);
          if (lines.length > 1) {
            doc.text(lines.slice(1), MARGIN + 8, y + 4.5);
            y += lines.length * 4.5 + 2;
          } else {
            y += 5.5;
          }
        }
        y += 2;
      }
    }

    y += 4;
  }

  y = ensureSpace(doc, y, 20);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Generated from PG Diary Admin Dashboard  ·  Align implementation with this document.",
    MARGIN + 4,
    y + 8.5,
  );

  doc.save(`PG-Diary-Course-Mapping-Plan-v${COURSE_PLAN_META.version}.pdf`);
}
