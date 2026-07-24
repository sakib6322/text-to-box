import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, Plus } from "lucide-react";
import { SuggestionKeyPointCard, type SuggestionBoardLink } from "@/components/SuggestionKeyPointCard";
import { useConceptStudentUi } from "@/hooks/useConceptStudentUi";
import { sortKeyPointsByImportance } from "@/lib/progressEngine";
import { cn } from "@/lib/utils";

export type ConceptSuggestionRow = {
  id: string;
  content: string;
  increment_count: number;
  key_point_boards?: SuggestionBoardLink[] | null;
};

export type ConceptSuggestionGroup = {
  conceptId: string;
  title: string;
  taxonomy: string;
  rows: ConceptSuggestionRow[];
};

type Props = {
  group: ConceptSuggestionGroup;
  expanded: boolean;
  onToggle: () => void;
  boardFilter: string;
  adminView?: boolean;
  studyPct?: number;
  sessionCount?: number;
  deleting?: string | null;
  /** Toggle inline details dropdown (not a modal) */
  onDetailsToggle?: () => void;
  detailsOpen?: boolean;
  /** When true, Details opens as modal — hide inline panel chevron rotate cue slightly */
  detailsAsModal?: boolean;
  /** Inline concept details panel under Details button */
  detailsPanel?: ReactNode;
  onEdit?: (row: ConceptSuggestionRow) => void;
  onDelete?: (row: ConceptSuggestionRow) => void;
  /** Toggle inline add panel (not a modal) */
  onAdd?: () => void;
  addOpen?: boolean;
  addAsModal?: boolean;
  /** Inline add form rendered under Add box */
  addPanel?: ReactNode;
  onBoardClick?: (board: { id: string; name: string }) => void;
};

export function ConceptSuggestionGroupCard({
  group,
  expanded,
  onToggle,
  boardFilter,
  adminView = false,
  studyPct,
  sessionCount = 0,
  deleting,
  onDetailsToggle,
  detailsOpen = false,
  detailsAsModal = false,
  detailsPanel,
  onEdit,
  onDelete,
  onAdd,
  addOpen = false,
  addAsModal = false,
  addPanel,
  onBoardClick,
}: Props) {
  const pct = studyPct ?? 0;
  const csu = useConceptStudentUi();
  const sortedRows = sortKeyPointsByImportance(group.rows);

  return (
    <Card className="overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggle}
            className="mt-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse key points" : "Expand key points"}
          >
            {expanded ? <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
            <p className="break-words text-base font-semibold leading-snug sm:text-lg lg:text-xl">{group.title}</p>
            {group.taxonomy ? (
              <p className="mt-1 break-words text-[11px] leading-snug text-muted-foreground sm:text-xs">{group.taxonomy}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {group.rows.length} key point{group.rows.length === 1 ? "" : "s"}
              </Badge>
              {!adminView ? (
                <>
                  <Badge variant="outline" className="text-[10px] tabular-nums sm:text-xs">
                    {pct}% studied
                  </Badge>
                  {sessionCount > 0 ? (
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {sessionCount} practice
                    </Badge>
                  ) : null}
                </>
              ) : null}
            </div>
            {!adminView ? <Progress value={pct} className="mt-2 h-1.5 max-w-md" /> : null}
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 pl-9 sm:pl-0 lg:flex-col lg:items-stretch xl:flex-row">
          {adminView ? (
            <>
              {onDetailsToggle ? (
                <Button
                  type="button"
                  variant={detailsOpen ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs flex-1 sm:flex-none"
                  onClick={onDetailsToggle}
                  aria-expanded={detailsOpen}
                >
                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                  Details
                  {!detailsAsModal ? (
                    <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", detailsOpen && "rotate-180")} />
                  ) : null}
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none">
                <Link to={`/concept/${group.conceptId}/details`}>
                  <GraduationCap className="mr-1 h-3.5 w-3.5" />
                  Study & Practice
                </Link>
              </Button>
            </>
          ) : (
            <>
              {csu.showStudyAndPracticeButton ? (
                <Button asChild size="sm" className="h-9 flex-1 min-w-[8.5rem] sm:flex-none">
                  <Link to={`/concept/${group.conceptId}/details`}>
                    <GraduationCap className="mr-1.5 h-4 w-4" />
                    Study & Practice
                  </Link>
                </Button>
              ) : null}
              {csu.showDetailsButton ? (
                <Button asChild variant="outline" size="sm" className="h-9 flex-1 min-w-[8.5rem] sm:flex-none">
                  <Link to={`/concept/${group.conceptId}/details`}>
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    Details
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {detailsOpen && detailsPanel ? (
        detailsAsModal ? (
          <Dialog
            open={detailsOpen}
            onOpenChange={(next) => {
              if (!next) onDetailsToggle?.();
            }}
          >
            <DialogContent className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden p-0 sm:p-0">
              <DialogHeader className="sr-only">
                <DialogTitle>Concept details · {group.title}</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{detailsPanel}</div>
            </DialogContent>
          </Dialog>
        ) : (
          <div className="border-t bg-muted/10 px-4 pb-4 pt-3 sm:px-5">{detailsPanel}</div>
        )
      ) : null}

      {expanded ? (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <p className="mb-3 text-xs font-medium text-muted-foreground sm:text-sm">Key points</p>
          {sortedRows.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-background/60 px-3 py-6 text-center text-xs text-muted-foreground sm:text-sm">
              No key points yet{adminView ? " — use Add box to create one" : ""}.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedRows.map((r) => (
                <SuggestionKeyPointCard
                  key={r.id}
                  content={r.content}
                  incrementCount={r.increment_count}
                  boardLinks={r.key_point_boards ?? []}
                  boardFilterId={boardFilter}
                  showActions={adminView}
                  deleting={deleting === r.id}
                  onEdit={onEdit ? () => onEdit(r) : undefined}
                  onDelete={onDelete ? () => onDelete(r) : undefined}
                  onBoardClick={onBoardClick}
                  compact
                />
              ))}
            </div>
          )}
          {adminView && onAdd ? (
            <div className="mt-3 space-y-3">
              <Button
                type="button"
                variant={addOpen ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={onAdd}
                aria-expanded={addOpen}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add box
                {!addAsModal ? (
                  <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", addOpen && "rotate-180")} />
                ) : null}
              </Button>
              {addOpen && addPanel ? (
                addAsModal ? (
                  <Dialog
                    open={addOpen}
                    onOpenChange={(next) => {
                      if (!next) onAdd?.();
                    }}
                  >
                    <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>Add key points · {group.title}</DialogTitle>
                      </DialogHeader>
                      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{addPanel}</div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="rounded-lg border bg-background p-3 shadow-sm sm:p-4">{addPanel}</div>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
