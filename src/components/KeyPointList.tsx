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

function boardBadges(kp: KeyPointWithBoards) {
  if (kp.boardLinks?.length) {
    return kp.boardLinks.map((b) => ({
      key: b.name,
      label: b.mention_count && b.mention_count > 1 ? `${b.name} ×${b.mention_count}` : b.name,
    }));
  }
  return (kp.boardNames ?? []).map((name) => ({ key: name, label: name }));
}

export function KeyPointList({ keyPoints, compact, studiedIds, currentId }: Props) {
  const list = normalize(keyPoints);
  if (!list.length) return null;

  return (
    <ul className={compact ? "space-y-1.5 text-xs" : "space-y-2 text-sm"}>
      {list.map((kp, i) => {
        const studied = kp.id && studiedIds?.has(kp.id);
        const current = kp.id && currentId === kp.id;
        const boards = boardBadges(kp);
        return (
          <li
            key={kp.id ?? i}
            className={`rounded-md px-1 py-1 space-y-1 ${
              current ? "bg-primary/10 ring-1 ring-primary/30" : studied ? "opacity-80" : ""
            }`}
          >
            {boards.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {boards.map((b) => (
                  <Badge
                    key={`${kp.id ?? i}-${b.key}`}
                    variant="outline"
                    className="text-[9px] px-1 py-0 h-4 text-red-600 border-red-300 bg-red-50 font-normal tabular-nums"
                  >
                    {b.label}
                  </Badge>
                ))}
              </div>
            ) : null}
            <span className="block leading-snug">
              {studied ? "✓ " : "• "}{kp.content}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
