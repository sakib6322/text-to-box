import { Badge } from "@/components/ui/badge";
import type { BoardLinkDisplay, KeyPointWithBoards } from "@/lib/conceptDetail";
import { TrendingUp } from "lucide-react";

export type BoardClickTarget = {
  id: string;
  name: string;
};

type Props = {
  keyPoints: KeyPointWithBoards[] | string[];
  compact?: boolean;
  studiedIds?: Set<string>;
  currentId?: string;
  onBoardClick?: (board: BoardClickTarget) => void;
};

function normalize(kps: KeyPointWithBoards[] | string[]): KeyPointWithBoards[] {
  if (!kps.length) return [];
  if (typeof kps[0] === "string") {
    return (kps as string[]).map((content) => ({ content }));
  }
  return kps as KeyPointWithBoards[];
}

function boardBadges(kp: KeyPointWithBoards): Array<BoardLinkDisplay & { key: string; label: string }> {
  if (kp.boardLinks?.length) {
    return kp.boardLinks.map((b) => ({
      ...b,
      key: b.id ?? b.name,
      label: b.mention_count && b.mention_count > 1 ? `${b.name} ×${b.mention_count}` : b.name,
    }));
  }
  return (kp.boardNames ?? []).map((name) => ({ key: name, name, label: name }));
}

export function KeyPointList({ keyPoints, compact, studiedIds, currentId, onBoardClick }: Props) {
  const list = normalize(keyPoints);
  if (!list.length) return null;

  return (
    <ul className={compact ? "space-y-1.5 text-xs" : "space-y-2 text-sm"}>
      {list.map((kp, i) => {
        const studied = kp.id && studiedIds?.has(kp.id);
        const current = kp.id && currentId === kp.id;
        const boards = boardBadges(kp);
        const count = Number(kp.incrementCount ?? 0);
        const showMeta = count > 0 || boards.length > 0;
        return (
          <li
            key={kp.id ?? i}
            className={`rounded-md px-1 py-1 space-y-1 ${
              current ? "bg-primary/10 ring-1 ring-primary/30" : studied ? "opacity-80" : ""
            }`}
          >
            {showMeta ? (
              <div className="flex flex-wrap items-center gap-1">
                {count > 0 ? (
                  <Badge
                    title="Suggestion count"
                    className={`tabular-nums gap-0.5 border-0 bg-primary/90 text-primary-foreground font-normal ${
                      compact ? "text-[9px] px-1 py-0 h-4" : "text-[10px] px-1.5 py-0 h-5"
                    }`}
                  >
                    <TrendingUp className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
                    {count}
                  </Badge>
                ) : null}
                {boards.map((b) => {
                  const clickable = Boolean(onBoardClick && b.id);
                  const className = `font-normal tabular-nums text-red-600 border-red-300 bg-red-50 ${
                    compact ? "text-[9px] px-1 py-0 h-4" : "text-[9px] px-1.5 py-0 h-4"
                  } ${clickable ? "cursor-pointer hover:bg-red-100" : ""}`;
                  if (clickable) {
                    return (
                      <button
                        key={`${kp.id ?? i}-${b.key}`}
                        type="button"
                        className="inline-flex"
                        title={`Open ${b.name} questions`}
                        onClick={() => onBoardClick?.({ id: b.id!, name: b.name })}
                      >
                        <Badge variant="outline" className={className}>
                          {b.label}
                        </Badge>
                      </button>
                    );
                  }
                  return (
                    <Badge key={`${kp.id ?? i}-${b.key}`} variant="outline" className={className}>
                      {b.label}
                    </Badge>
                  );
                })}
              </div>
            ) : null}
            <span className="block leading-snug">
              {studied ? "✓ " : "• "}
              {kp.content}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
