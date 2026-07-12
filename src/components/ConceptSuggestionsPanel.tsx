import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SuggestionMatchPanel } from "@/components/SuggestionMatchPanel";
import type { SuggestionMatch } from "@/lib/suggestionMatch";

type Props = {
  lines: string[];
  matches: Map<string, SuggestionMatch | null>;
  loading?: boolean;
  onMatchUpdate?: (line: string, match: SuggestionMatch) => void;
};

export function ConceptSuggestionsPanel({ lines, matches, loading, onMatchUpdate }: Props) {
  const [localMatches, setLocalMatches] = useState<Map<string, SuggestionMatch | null>>(matches);

  useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  const handleUpdate = (line: string, updated: SuggestionMatch) => {
    setLocalMatches((prev) => {
      const next = new Map(prev);
      next.set(line, updated);
      return next;
    });
    onMatchUpdate?.(line, updated);
  };

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
        <ul className="space-y-3">
          {lines.map((line) => {
            const match = localMatches.get(line) ?? matches.get(line);
            return (
              <li key={line} className="rounded-md border p-3 space-y-2 text-sm">
                <div className="font-medium text-foreground">{line}</div>
                {match ? (
                  <SuggestionMatchPanel
                    match={match}
                    compact
                    onMatchUpdate={(updated) => handleUpdate(line, updated)}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No match</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
