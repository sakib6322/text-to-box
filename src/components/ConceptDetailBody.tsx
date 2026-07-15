import { CKEditorField } from "@/components/CKEditorField";
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
import { conceptDetailFromSourceHtml, resolveBodyHtml } from "@/lib/conceptDetail";

export type ConceptDetailUpdater = (prev: ConceptDetail) => ConceptDetail;

type Props = {
  detail: ConceptDetail;
  editable?: boolean;
  onChange?: (updater: ConceptDetailUpdater) => void;
  showVerbatim?: boolean;
};

function defaultHeaders(table: DetailTable | null): string[] {
  if (table?.headers?.length) return table.headers;
  const colCount = table?.rows?.[0]?.cells?.length ?? 3;
  return Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
}

function hasLegacyStructuredContent(detail: ConceptDetail): boolean {
  return Boolean(
    detail.summary.trim() ||
      detail.paragraphs.length > 1 ||
      (detail.paragraphs.length === 1 && detail.summary.trim()) ||
      (detail.table?.rows?.length ?? 0) > 0,
  );
}

function LegacyConceptDetailBody({ detail, showVerbatim }: { detail: ConceptDetail; showVerbatim: boolean }) {
  const table = detail.table;
  const headers = defaultHeaders(table);
  const hasTable = Boolean(table?.rows?.length);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {detail.summary ? <RichHtmlContent content={detail.summary} className="font-semibold" /> : null}

      {detail.paragraphs.length > 0
        ? detail.paragraphs.map((p, i) => <RichHtmlContent key={i} content={p} className="mb-3" />)
        : null}

      {hasTable && table ? (
        <div className="space-y-2">
          {table.title ? <p className="font-semibold">{table.title}</p> : null}
          <div className="rounded-md border overflow-x-auto">
            <Table className="table-fixed w-full border-collapse concept-detail-table">
              <TableHeader>
                <TableRow className="bg-amber-100/80 hover:bg-amber-100/80">
                  {headers.map((h, i) => (
                    <TableHead key={i} className="text-foreground font-semibold h-auto px-1.5 py-1.5">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(table.rows ?? []).map((row, ri) => (
                  <TableRow key={ri}>
                    {headers.map((_, ci) => (
                      <TableCell key={ci} className="align-top px-1.5 py-1 whitespace-normal">
                        <RichHtmlContent content={row.cells?.[ci] ?? ""} className="text-xs" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

export function ConceptDetailBody({ detail, editable = false, onChange, showVerbatim = true }: Props) {
  if (editable) {
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        <CKEditorField
          value={resolveBodyHtml(detail)}
          onChange={(bodyHtml) =>
            onChange?.((prev) =>
              conceptDetailFromSourceHtml(bodyHtml, {
                storyHtml: prev.storyHtml,
                verbatimText: prev.verbatimText,
              }),
            )
          }
          placeholder="Concept detail — heading, bold, underline, list, table…"
          minHeight="360px"
          className="w-full"
        />
      </div>
    );
  }

  const unifiedBody = resolveBodyHtml(detail).trim();
  if (unifiedBody && !hasLegacyStructuredContent(detail)) {
    return (
      <div className="space-y-4 text-sm leading-relaxed">
        <RichHtmlContent content={unifiedBody} />
        {showVerbatim && detail.verbatimText ? (
          <div className="space-y-2 pt-2 border-t">
            <p className="font-semibold text-muted-foreground">Verbatim source</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{detail.verbatimText}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return <LegacyConceptDetailBody detail={detail} showVerbatim={showVerbatim} />;
}
