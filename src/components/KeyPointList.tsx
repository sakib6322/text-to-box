import { Badge } from "@/components/ui/badge";
import type { KeyPointWithBoards } from "@/lib/conceptDetail";

type Props = {
  keyPoints: KeyPointWithBoards[] | string[];
  compact?: boolean;
  studiedIds?: Set<string>;
  currentId?: string;
};

function normalize(kps: KeyPointWithBoards[] | string[]): KeyPointWithBoards[] {
  if (!kps.length) return [];
  if (typeof kps[0] === "string") {
    return (kps as string[]).map((content) => ({ content }));
  }
  return kps as KeyPointWithBoards[];
}

export function KeyPointList({ keyPoints, compact, studiedIds, currentId }: Props) {
  const list = normalize(keyPoints);
  if (!list.length) return null;

  return (
    <ul className={compact ? "space-y-1.5 text-xs" : "space-y-2 text-sm"}>
      {list.map((kp, i) => {
        const studied = kp.id && studiedIds?.has(kp.id);
        const current = kp.id && currentId === kp.id;
        return (
        <li
          key={kp.id ?? i}
          className={`flex flex-wrap items-start gap-1.5 rounded-md px-1 py-0.5 ${
            current ? "bg-primary/10 ring-1 ring-primary/30" : studied ? "opacity-80" : ""
          }`}
        >
          <span className="flex-1 min-w-0 leading-snug">
            {studied ? "✓ " : "• "}{kp.content}
          </span>
          {(kp.boardNames ?? []).map((board) => (
            <Badge
              key={`${kp.id ?? i}-${board}`}
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 text-red-600 border-red-300 bg-red-50 shrink-0 font-normal"
            >
              {board}
            </Badge>
          ))}
        </li>
        );
      })}
    </ul>
  );
}
