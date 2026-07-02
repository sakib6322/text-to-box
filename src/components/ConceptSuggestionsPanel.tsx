import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { SuggestionMatch } from "@/lib/conceptDetail";

type Props = {
  lines: string[];
  matches: Map<string, SuggestionMatch | null>;
  loading?: boolean;
};

export function ConceptSuggestionsPanel({ lines, matches, loading }: Props) {
  if (!lines.length && !loading) return null;

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-center text-sm font-bold tracking-wide">Suggestions</h2>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Matching against database…
        </div>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => {
            const match = matches.get(line);
            const pct = match?.percentage;
            return (
              <li
                key={line}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex-1 min-w-[12rem]">{line}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {typeof pct === "number" ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {pct}% match
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No match</span>
                  )}
                  {(match?.boardNames ?? []).map((board) => (
                    <Badge key={board} variant="outline" className="text-red-600 border-red-300 bg-red-50">
                      {board}
                    </Badge>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
