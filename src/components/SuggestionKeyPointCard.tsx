import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Pencil, TrendingUp, Trash2, Loader2 } from "lucide-react";

export type SuggestionBoardLink = {
  board_id: string;
  mention_count?: number | null;
  boards: { id: string; name: string } | null;
};

type Props = {
  content: string;
  incrementCount: number;
  boardLinks: SuggestionBoardLink[];
  boardFilterId?: string;
  conceptTitle?: string;
  taxonomy?: string;
  showActions?: boolean;
  deleting?: boolean;
  onDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Click a board badge to view that board's questions */
  onBoardClick?: (board: { id: string; name: string }) => void;
  compact?: boolean;
};

function mentionForBoard(links: SuggestionBoardLink[], boardId: string): number {
  for (const l of links) {
    const id = l.boards?.id ?? l.board_id;
    if (id === boardId) return Number(l.mention_count ?? 1);
  }
  return 0;
}

export function SuggestionKeyPointCard({
  content,
  incrementCount,
  boardLinks,
  boardFilterId,
  conceptTitle,
  taxonomy,
  showActions = false,
  deleting = false,
  onDetails,
  onEdit,
  onDelete,
  onBoardClick,
  compact = false,
}: Props) {
  const boardMention = boardFilterId && boardFilterId !== "all" ? mentionForBoard(boardLinks, boardFilterId) : null;

  return (
    <Card className={compact ? "p-3 space-y-2 bg-muted/30 border-dashed" : "suggestion-card"}>
      <div className="w-full text-left space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className="tabular-nums gap-1 bg-primary/90 text-primary-foreground border-0">
            <TrendingUp className="h-3 w-3" />
            {incrementCount}
          </Badge>
          {boardMention != null && boardMention > 0 ? (
            <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
              Board ×{boardMention}
            </Badge>
          ) : null}
        </div>
        {boardLinks.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {boardLinks.map((l) => {
              const name = l.boards?.name?.trim();
              if (!name) return null;
              const id = l.boards?.id ?? l.board_id;
              const cnt = Number(l.mention_count ?? 1);
              const label = `${name}${cnt > 1 ? ` ×${cnt}` : ""}`;
              const className =
                "text-[10px] font-normal tabular-nums text-red-600 border-red-300 bg-red-50";
              if (onBoardClick && id) {
                return (
                  <button
                    key={`${l.board_id}-${name}`}
                    type="button"
                    className="inline-flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBoardClick({ id, name });
                    }}
                  >
                    <Badge variant="outline" className={`${className} cursor-pointer hover:bg-red-100`}>
                      {label}
                    </Badge>
                  </button>
                );
              }
              return (
                <Badge key={`${l.board_id}-${name}`} variant="outline" className={className}>
                  {label}
                </Badge>
              );
            })}
          </div>
        ) : null}
        <p className={`leading-relaxed text-pretty break-words ${compact ? "text-xs" : "text-sm"}`}>{content}</p>
        {conceptTitle && !compact ? (
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">{conceptTitle}</p>
            {taxonomy ? <p className="text-[11px] text-muted-foreground leading-snug">{taxonomy}</p> : null}
          </div>
        ) : null}
      </div>
      {showActions ? (
        <div className="flex gap-2 flex-wrap">
          {onDetails ? (
            <Button variant="outline" size="sm" className="flex-1 min-w-[5.5rem]" onClick={onDetails}>
              <BookOpen className="h-4 w-4 mr-1" />
              Details
            </Button>
          ) : null}
          {onEdit ? (
            <Button variant="outline" size="sm" className="flex-1 min-w-[5.5rem]" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="destructive" size="sm" className="flex-1 min-w-[5.5rem]" onClick={onDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export { mentionForBoard };
