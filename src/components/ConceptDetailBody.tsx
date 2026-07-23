import { CKEditorField } from "@/components/CKEditorField";
import { HeadingSlideReader } from "@/components/HeadingSlideReader";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { useUiAppearance } from "@/components/UiAppearanceProvider";
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
import { conceptAdminPreviewHeadingSlidesEnabled } from "@/lib/uiAppearance";

export type ConceptDetailUpdater = (prev: ConceptDetail) => ConceptDetail;

type Props = {
  detail: ConceptDetail;
  editable?: boolean;
  onChange?: (updater: ConceptDetailUpdater) => void;
  showVerbatim?: boolean;
  /** Admin Suggestions → Details edit preview panel */
  adminPreview?: boolean;
  /** Controlled heading-slide index (jump filter) */
  slideIndex?: number;
  onSlideIndexChange?: (index: number) => void;
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
          <div className="overflow-x-auto">
            <Table className="concept-detail-table table-fixed w-full border-collapse text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {headers.map((h, i) => (
                    <TableHead key={i} className="h-auto px-2 py-2 text-left font-bold text-slate-800">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(table.rows ?? []).map((row, ri) => (
                  <TableRow key={ri} className="hover:bg-transparent">
                    {headers.map((_, ci) => (
                      <TableCell key={ci} className="whitespace-normal px-2 py-2 align-top">
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

export function ConceptDetailBody({
  detail,
  editable = false,
  onChange,
  showVerbatim = true,
  adminPreview = false,
  slideIndex,
  onSlideIndexChange,
}: Props) {
  const { appearance, activeDevice } = useUiAppearance();
  const hs = appearance.headingSlides;

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
          appearanceScope="concept"
          className="w-full"
        />
      </div>
    );
  }

  const unifiedBody = resolveBodyHtml(detail).trim();
  if (unifiedBody && !hasLegacyStructuredContent(detail)) {
    const useHeadingSlides = adminPreview
      ? conceptAdminPreviewHeadingSlidesEnabled(appearance.conceptAdminPreview, activeDevice)
      : hs.conceptDetailsEnabled;

    return (
      <div className="space-y-4 text-sm leading-relaxed">
        {useHeadingSlides ? (
          <HeadingSlideReader
            html={unifiedBody}
            config={hs}
            richClassName="concept-detail-rich"
            index={slideIndex}
            onIndexChange={onSlideIndexChange}
          />
        ) : (
          <div className="concept-detail-rich">
            <RichHtmlContent content={unifiedBody} />
          </div>
        )}
        {showVerbatim && detail.verbatimText ? (
          <div className="space-y-2 border-t pt-2">
            <p className="font-semibold text-muted-foreground">Verbatim source</p>
            <p className="whitespace-pre-wrap text-muted-foreground">{detail.verbatimText}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return <LegacyConceptDetailBody detail={detail} showVerbatim={showVerbatim} />;
}
