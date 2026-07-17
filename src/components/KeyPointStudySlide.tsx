import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BoardClickTarget } from "@/components/KeyPointList";
import type { KeyPointWithBoards } from "@/lib/conceptDetail";
import { TrendingUp } from "lucide-react";

type Props = {
  keyPoint: KeyPointWithBoards;
  index: number;
  total: number;
  direction?: "forward" | "back";
  onBoardClick?: (board: BoardClickTarget) => void;
};

function boardItems(kp: KeyPointWithBoards) {
  if (kp.boardLinks?.length) {
    return kp.boardLinks.map((b) => ({
      key: b.id ?? b.name,
      id: b.id,
      name: b.name,
      label: b.mention_count && b.mention_count > 1 ? `${b.name} ×${b.mention_count}` : b.name,
    }));
  }
  return (kp.boardNames ?? []).map((name) => ({ key: name, id: undefined as string | undefined, name, label: name }));
}

export function KeyPointStudySlide({ keyPoint, index, total, direction = "forward", onBoardClick }: Props) {
  const count = Number(keyPoint.incrementCount ?? 0);
  const boards = boardItems(keyPoint);

  return (
    <div className={direction === "back" ? "kp-study-slide--back" : "kp-study-slide"}>
      <Card className="kp-study-card relative overflow-hidden border-primary/15 bg-gradient-to-br from-background via-background to-primary/[0.06] p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />

        <div className="relative min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="text-[10px] tracking-wide">
              Key point {index + 1} / {total || 1}
            </Badge>
            {count > 0 ? (
              <Badge className="gap-1 border-0 bg-primary/90 text-[10px] font-normal tabular-nums text-primary-foreground">
                <TrendingUp className="h-3 w-3" />
                Count {count}
              </Badge>
            ) : null}
          </div>

          {boards.length ? (
            <div className="flex max-w-full flex-wrap gap-1.5">
              {boards.map((b) => {
                const clickable = Boolean(onBoardClick && b.id);
                const className =
                  "font-normal tabular-nums text-red-600 border-red-300 bg-red-50 text-[10px] px-2 py-0.5 h-6";
                if (clickable) {
                  return (
                    <button
                      key={b.key}
                      type="button"
                      className="inline-flex max-w-full"
                      title={`Open ${b.name} questions`}
                      onClick={() => onBoardClick?.({ id: b.id!, name: b.name })}
                    >
                      <Badge variant="outline" className={`${className} max-w-full truncate cursor-pointer hover:bg-red-100`}>
                        {b.label}
                      </Badge>
                    </button>
                  );
                }
                return (
                  <Badge key={b.key} variant="outline" className={`${className} max-w-full truncate`}>
                    {b.label}
                  </Badge>
                );
              })}
            </div>
          ) : null}

          <p className="break-words text-base leading-relaxed sm:text-lg sm:leading-relaxed">{keyPoint.content}</p>
        </div>
      </Card>
    </div>
  );
}
