import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ConceptDetail } from "@/lib/conceptDetail";

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "concept";
}

function ensureSpace(doc: jsPDF, y: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return margin;
  }
  return y;
}

export function downloadConceptDetailPdf(
  conceptName: string,
  detail: ConceptDetail,
  keyPoints: string[],
): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(conceptName || "Untitled concept", pageWidth - margin * 2);
  doc.text(titleLines, margin, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Concept details", margin, 26);

  doc.setTextColor(30, 41, 59);
  y = 42;

  if (detail.summary.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const summaryLines = doc.splitTextToSize(detail.summary.trim(), pageWidth - margin * 2);
    y = ensureSpace(doc, y, summaryLines.length * 6 + 4, margin);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 6 + 6;
  }

  if (detail.paragraphs.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    y = ensureSpace(doc, y, 10, margin);
    doc.text("Details", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const paragraph of detail.paragraphs) {
      if (!paragraph.trim()) continue;
      const lines = doc.splitTextToSize(`• ${paragraph.trim()}`, pageWidth - margin * 2);
      y = ensureSpace(doc, y, lines.length * 5 + 3, margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }
  }

  const table = detail.table;
  if (table?.rows?.length) {
    y += 2;
    if (table.title?.trim()) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      y = ensureSpace(doc, y, 10, margin);
      doc.text(table.title.trim(), margin, y);
      y += 8;
    }

    const headers = table.headers?.length
      ? table.headers
      : Array.from({ length: table.rows[0]?.cells?.length ?? 3 }, (_, i) => `Column ${i + 1}`);
    const body = table.rows.map((row) => {
      const cells = row.cells ?? [];
      return headers.map((_, i) => cells[i] ?? "");
    });

    autoTable(doc, {
      startY: y,
      head: [headers],
      body,
      margin: { left: margin, right: margin },
      theme: "grid",
      headStyles: {
        fillColor: [251, 191, 36],
        textColor: [30, 30, 30],
        fontStyle: "bold",
        halign: "left",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "top",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: headers.reduce(
        (acc, _, i) => {
          acc[i] = { cellWidth: "wrap" };
          return acc;
        },
        {} as Record<number, { cellWidth: "wrap" }>,
      ),
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
    y += 10;
  }

  if (keyPoints.length) {
    y = ensureSpace(doc, y, 14, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Key points", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const kp of keyPoints) {
      if (!kp.trim()) continue;
      const lines = doc.splitTextToSize(`• ${kp.trim()}`, pageWidth - margin * 2);
      y = ensureSpace(doc, y, lines.length * 5 + 2, margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 3;
    }
  }

  if (detail.verbatimText.trim()) {
    y = ensureSpace(doc, y, 16, margin);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Verbatim source", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const verbatimLines = doc.splitTextToSize(detail.verbatimText.trim(), pageWidth - margin * 2);
    for (const line of verbatimLines.slice(0, 80)) {
      y = ensureSpace(doc, y, 5, margin);
      doc.text(line, margin, y);
      y += 4;
    }
  }

  const pageCount = doc.getNumberOfPages();
  const generated = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`pgdiary.cloud · ${generated}`, margin, 290);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, 290, { align: "right" });
  }

  doc.save(`${sanitizeFilename(conceptName)}.pdf`);
}
