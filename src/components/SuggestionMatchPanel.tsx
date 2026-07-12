import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import {
  matchTaxonomyPath,
  updateKeyPointContent,
  type LegacySuggestionMatch,
  type SuggestionMatch,
} from "@/lib/suggestionMatch";

type MatchLike = SuggestionMatch | LegacySuggestionMatch | null | undefined;

function isLegacy(m: MatchLike): m is LegacySuggestionMatch {
  return Boolean(m && "key_point_id" in m);
}

function normalizeMatch(m: MatchLike): SuggestionMatch | null {
  if (!m) return null;
  if (isLegacy(m)) {
    return {
      keyPointId: m.key_point_id,
      keyPointContent: m.key_point_content ?? "",
      percentage: Math.round(m.ai_percentage ?? m.similarity * 100),
      conceptTitle: m.concept_title,
      conceptId: m.concept_id,
      subject: m.concept_subject ?? null,
      system: m.concept_system ?? null,
      chapter: m.concept_chapter ?? null,
      topic: m.concept_topic ?? null,
      boardNames: m.board_names ?? [],
      aiReason: m.ai_reason,
      vectorPercentage: m.vector_percentage,
    };
  }
  return m;
}

type Props = {
  match: MatchLike;
  matchApproved?: boolean;
  matchApproving?: boolean;
  matchApproveError?: string | null;
  selectedBoardNames?: string[];
  onApprove?: () => void;
  onViewConcept?: () => void;
  allowApproveWithoutMatch?: boolean;
  onMatchUpdate?: (updated: SuggestionMatch) => void;
  compact?: boolean;
};

export function SuggestionMatchPanel({
  match: rawMatch,
  matchApproved,
  matchApproving,
  matchApproveError,
  selectedBoardNames,
  onApprove,
  onViewConcept,
  allowApproveWithoutMatch = false,
  onMatchUpdate,
  compact = false,
}: Props) {
  const match = normalizeMatch(rawMatch);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!match) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
        <p>No matching suggestion in database yet.</p>
        {selectedBoardNames?.length ? (
          <div className="flex flex-wrap gap-1">
            {selectedBoardNames.map((b) => (
              <Badge key={b} variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50">
                {b}
              </Badge>
            ))}
          </div>
        ) : null}
        {onApprove && !matchApproved && allowApproveWithoutMatch ? (
          <Button type="button" size="sm" className="h-7 text-xs" onClick={onApprove} disabled={matchApproving}>
            {matchApproving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Approve as new suggestion
          </Button>
        ) : null}
        {matchApproveError ? <p className="text-destructive">{matchApproveError}</p> : null}
      </div>
    );
  }

  const path = matchTaxonomyPath(match);
  const boards = [...new Set([...(match.boardNames ?? []), ...(selectedBoardNames ?? [])].filter(Boolean))];

  const startEdit = () => {
    setEditContent(match.keyPointContent);
    setEditing(true);
  };

  const saveEdit = async () => {
    const content = editContent.trim();
    if (!content) return toast.error("Key point cannot be empty");
    setSaving(true);
    try {
      await updateKeyPointContent(match.keyPointId, content);
      const updated = { ...match, keyPointContent: content };
      onMatchUpdate?.(updated);
      setEditing(false);
      toast.success("Key point updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-foreground">Suggestion match:</span> {match.percentage}%
          {matchApproved ? (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              Approved
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {onViewConcept && match.conceptId ? (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onViewConcept}>
              Concept details
            </Button>
          ) : null}
          {onApprove && !matchApproved ? (
            <Button type="button" size="sm" className="h-7 text-xs" onClick={onApprove} disabled={matchApproving}>
              {matchApproving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {allowApproveWithoutMatch ? "Approve" : "Approve match"}
            </Button>
          ) : null}
        </div>
      </div>

      {path ? (
        <p>
          <span className="font-medium text-foreground">Path:</span> {path}
        </p>
      ) : null}

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">Matched key point:</span>
          {!editing ? (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={startEdit}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          ) : null}
        </div>
        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={compact ? 2 : 3}
              className="text-xs resize-none bg-background"
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" className="h-7 text-xs" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                Save
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-foreground text-sm leading-snug">{match.keyPointContent || "—"}</p>
        )}
        <p className="font-mono text-[10px]">ID: {match.keyPointId}</p>
      </div>

      {boards.length ? (
        <div className="flex flex-wrap gap-1">
          {boards.map((b) => (
            <Badge key={b} variant="outline" className="text-[10px] text-red-600 border-red-300 bg-red-50">
              {b}
            </Badge>
          ))}
        </div>
      ) : null}

      {typeof match.vectorPercentage === "number" ? (
        <p>
          <span className="font-medium text-foreground">Vector score:</span> {Math.round(match.vectorPercentage)}%
        </p>
      ) : null}

      {match.aiReason ? (
        <p>
          <span className="font-medium text-foreground">Analysis:</span> {match.aiReason}
        </p>
      ) : null}

      {matchApproveError ? <p className="text-destructive">{matchApproveError}</p> : null}
    </div>
  );
}
