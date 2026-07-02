import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
          <Textarea
            value={detail.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            rows={2}
            placeholder="One-line concept definition…"
          />
        </div>
      ) : detail.summary ? (
        <p className="font-semibold">{detail.summary}</p>
      ) : null}

      {(editable || detail.paragraphs.length > 0) && (
        <div className="space-y-2">
          {editable ? <Label>Detail paragraphs</Label> : null}
          {editable ? (
            <div className="space-y-2">
              {detail.paragraphs.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea
                    value={p}
                    onChange={(e) => updateParagraph(i, e.target.value)}
                    rows={3}
                    className="flex-1"
                    placeholder={`Paragraph ${i + 1}…`}
                  />
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
            detail.paragraphs.map((p, i) => <p key={i}>{p}</p>)
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

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className={editable ? "" : "bg-amber-100/80 hover:bg-amber-100/80"}>
                  {headers.map((h, i) => (
                    <TableHead key={i} className="text-foreground font-semibold">
                      {editable ? (
                        <Input
                          value={h}
                          onChange={(e) => updateHeader(i, e.target.value)}
                          className="h-8 text-xs font-semibold"
                        />
                      ) : (
                        h
                      )}
                    </TableHead>
                  ))}
                  {editable ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(table.rows ?? []).map((row, ri) => (
                  <TableRow key={ri}>
                    {headers.map((_, ci) => (
                      <TableCell key={ci} className="align-top whitespace-pre-wrap">
                        {editable ? (
                          <Textarea
                            value={row.cells?.[ci] ?? ""}
                            onChange={(e) => updateCell(ri, ci, e.target.value)}
                            rows={2}
                            className="min-h-[2.5rem] resize-y text-sm"
                          />
                        ) : (
                          row.cells?.[ci] ?? ""
                        )}
                      </TableCell>
                    ))}
                    {editable ? (
                      <TableCell className="align-top">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(ri)} aria-label="Remove row">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {editable ? (
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add row
            </Button>
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
