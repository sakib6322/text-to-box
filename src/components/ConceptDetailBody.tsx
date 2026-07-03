import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CKEditorField } from "@/components/CKEditorField";
import { CKEditorPopoverField } from "@/components/CKEditorPopoverField";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConceptDetail, DetailTable } from "@/lib/conceptDetail";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  detail: ConceptDetail;
  editable?: boolean;
  onChange?: (detail: ConceptDetail) => void;
  showVerbatim?: boolean;
};

function defaultHeaders(table: DetailTable | null): string[] {
  if (table?.headers?.length) return table.headers;
  const colCount = table?.rows?.[0]?.cells?.length ?? 3;
  return Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
}

function ensureTable(detail: ConceptDetail): DetailTable {
  return (
    detail.table ?? {
      title: "",
      headers: ["Column 1", "Column 2", "Column 3"],
      rows: [{ cells: ["", "", ""] }],
    }
  );
}

export function ConceptDetailBody({ detail, editable = false, onChange, showVerbatim = true }: Props) {
  const table = detail.table;
  const headers = defaultHeaders(table);
  const hasTable = Boolean(table?.rows?.length);

  const patch = (next: Partial<ConceptDetail>) => onChange?.({ ...detail, ...next });

  const patchTable = (next: DetailTable) => patch({ table: next });

  const updateHeader = (index: number, value: string) => {
    const t = ensureTable(detail);
    const nextHeaders = [...defaultHeaders(t)];
    nextHeaders[index] = value;
    patchTable({ ...t, headers: nextHeaders });
  };

  const updateCell = (rowIndex: number, cellIndex: number, value: string) => {
    const t = ensureTable(detail);
    const rows = (t.rows ?? []).map((row, ri) =>
      ri === rowIndex
        ? {
            cells: (row.cells ?? []).map((cell, ci) => (ci === cellIndex ? value : cell)),
          }
        : row,
    );
    patchTable({ ...t, rows });
  };

  const addRow = () => {
    const t = ensureTable(detail);
    const colCount = defaultHeaders(t).length;
    patchTable({
      ...t,
      rows: [...(t.rows ?? []), { cells: Array.from({ length: colCount }, () => "") }],
    });
  };

  const removeRow = (rowIndex: number) => {
    const t = ensureTable(detail);
    const rows = (t.rows ?? []).filter((_, i) => i !== rowIndex);
    patchTable({ ...t, rows: rows.length ? rows : [{ cells: Array.from({ length: defaultHeaders(t).length }, () => "") }] });
  };

  const addColumn = () => {
    const t = ensureTable(detail);
    const cols = defaultHeaders(t);
    const nextHeaders = [...cols, `Column ${cols.length + 1}`];
    const rows = (t.rows ?? []).map((row) => ({
      cells: [...(row.cells ?? []), ""],
    }));
    patchTable({ ...t, headers: nextHeaders, rows });
  };

  const removeColumn = (colIndex: number) => {
    const t = ensureTable(detail);
    const cols = defaultHeaders(t);
    if (cols.length <= 1) return;
    const nextHeaders = cols.filter((_, i) => i !== colIndex);
    const rows = (t.rows ?? []).map((row) => ({
      cells: (row.cells ?? []).filter((_, i) => i !== colIndex),
    }));
    patchTable({ ...t, headers: nextHeaders, rows });
  };

  const deleteTable = () => patch({ table: null });

  const addParagraph = () => patch({ paragraphs: [...detail.paragraphs, ""] });

  const updateParagraph = (index: number, value: string) => {
    patch({ paragraphs: detail.paragraphs.map((p, i) => (i === index ? value : p)) });
  };

  const removeParagraph = (index: number) => {
    patch({ paragraphs: detail.paragraphs.filter((_, i) => i !== index) });
  };

  const initTable = () => {
    patchTable({
      title: "",
      headers: ["Mediator", "Source", "Action"],
      rows: [{ cells: ["", "", ""] }],
    });
  };

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {editable ? (
        <div className="space-y-2">
          <Label>Summary</Label>
          <CKEditorField
            value={detail.summary}
            onChange={(summary) => patch({ summary })}
            placeholder="One-line concept definition…"
            minHeight="120px"
          />
        </div>
      ) : detail.summary ? (
        <RichHtmlContent content={detail.summary} className="font-semibold" />
      ) : null}

      {(editable || detail.paragraphs.length > 0) && (
        <div className="space-y-2">
          {editable ? <Label>Detail paragraphs</Label> : null}
          {editable ? (
            <div className="space-y-2">
              {detail.paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <CKEditorField
                      value={p}
                      onChange={(value) => updateParagraph(i, value)}
                      placeholder={`Paragraph ${i + 1}…`}
                      minHeight="140px"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeParagraph(i)} aria-label="Remove paragraph">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addParagraph}>
                <Plus className="mr-2 h-4 w-4" />
                Add paragraph
              </Button>
            </div>
          ) : (
            detail.paragraphs.map((p, i) => <RichHtmlContent key={i} content={p} className="mb-3" />)
          )}
        </div>
      )}

      {editable && !hasTable ? (
        <Button type="button" variant="outline" size="sm" onClick={initTable}>
          <Plus className="mr-2 h-4 w-4" />
          Add table
        </Button>
      ) : null}

      {hasTable && table ? (
        <div className="space-y-2">
          {editable ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Table</Label>
              <Button type="button" variant="destructive" size="sm" onClick={deleteTable}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete table
              </Button>
            </div>
          ) : null}
          {editable ? (
            <div className="space-y-2">
              <Label>Table title</Label>
              <Input
                value={table.title ?? ""}
                onChange={(e) => patchTable({ ...table, title: e.target.value })}
                placeholder="Table 3.5 Principal Mediators…"
              />
            </div>
          ) : table.title ? (
            <p className="font-semibold">{table.title}</p>
          ) : null}

          <div className="rounded-md border overflow-x-auto">
            <Table className="table-fixed w-full border-collapse concept-detail-table">
              <TableHeader>
                <TableRow className={editable ? "" : "bg-amber-100/80 hover:bg-amber-100/80"}>
                  {headers.map((h, i) => (
                    <TableHead key={i} className="text-foreground font-semibold h-auto px-1.5 py-1.5">
                      {editable ? (
                        <div className="flex items-center gap-0.5">
                          <Input
                            value={h}
                            onChange={(e) => updateHeader(i, e.target.value)}
                            className="h-7 text-xs font-semibold flex-1 min-w-0 px-1.5"
                          />
                          {headers.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => removeColumn(i)}
                              aria-label="Remove column"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        h
                      )}
                    </TableHead>
                  ))}
                  {editable ? <TableHead className="w-8 px-0.5" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(table.rows ?? []).map((row, ri) => (
                  <TableRow key={ri}>
                    {headers.map((_, ci) => (
                      <TableCell key={ci} className="align-top px-1.5 py-1 whitespace-normal">
                        {editable ? (
                          <CKEditorPopoverField
                            value={row.cells?.[ci] ?? ""}
                            onChange={(value) => updateCell(ri, ci, value)}
                            placeholder="Format…"
                          />
                        ) : (
                          <RichHtmlContent content={row.cells?.[ci] ?? ""} className="text-xs" />
                        )}
                      </TableCell>
                    ))}
                    {editable ? (
                      <TableCell className="align-top px-0.5 py-1 w-8">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeRow(ri)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {editable ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" />
                Add row
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addColumn}>
                <Plus className="mr-2 h-4 w-4" />
                Add column
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {showVerbatim && detail.verbatimText ? (
        <div className="space-y-2 pt-2 border-t">
          <p className="font-semibold text-muted-foreground">Verbatim source</p>
          <p className="text-muted-foreground whitespace-pre-wrap">{detail.verbatimText}</p>
        </div>
      ) : null}
    </div>
  );
}
