import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, Plus } from "lucide-react";
import { SuggestionKeyPointCard, type SuggestionBoardLink } from "@/components/SuggestionKeyPointCard";
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
  onDetails?: () => void;
  onEdit?: (row: ConceptSuggestionRow) => void;
  onDelete?: (row: ConceptSuggestionRow) => void;
  /** Toggle inline add panel (not a modal) */
  onAdd?: () => void;
  addOpen?: boolean;
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
  onDetails,
  onEdit,
  onDelete,
  onAdd,
  addOpen = false,
  addPanel,
  onBoardClick,
}: Props) {
  const pct = studyPct ?? 0;

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
              {onDetails ? (
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs flex-1 sm:flex-none" onClick={onDetails}>
                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                  Details
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
              <Button asChild size="sm" className="h-9 flex-1 min-w-[8.5rem] sm:flex-none">
                <Link to={`/concept/${group.conceptId}/details`}>
                  <GraduationCap className="mr-1.5 h-4 w-4" />
                  Study & Practice
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9 flex-1 min-w-[8.5rem] sm:flex-none">
                <Link to={`/concept/${group.conceptId}/details`}>
                  <BookOpen className="mr-1.5 h-4 w-4" />
                  Details
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded ? (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          <p className="mb-3 text-xs font-medium text-muted-foreground sm:text-sm">Key points</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.rows.map((r) => (
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
                <ChevronDown className={cn("ml-1.5 h-3.5 w-3.5 transition-transform", addOpen && "rotate-180")} />
              </Button>
              {addOpen && addPanel ? (
                <div className="rounded-lg border bg-background p-3 shadow-sm sm:p-4">{addPanel}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
