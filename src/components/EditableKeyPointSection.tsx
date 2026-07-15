import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Loader2, Trash2, X } from "lucide-react";
import { BoardCheckboxGroup, type BoardOption } from "@/components/BoardCheckboxGroup";
import type { KeyPointWithBoards } from "@/lib/conceptDetail";
import { KeyPointList } from "@/components/KeyPointList";

export type KeyPointSavePayload = {
  id?: string;
  content: string;
  boardIds: string[];
};

type Props = {
  keyPoints: KeyPointWithBoards[];
  boardOptions?: BoardOption[];
  editable?: boolean;
  saving?: boolean;
  onSavePoint?: (payload: KeyPointSavePayload) => Promise<void>;
  onAddPoint?: (payload: { content: string; boardIds: string[] }) => Promise<void>;
  onDeletePoint?: (id: string) => Promise<void>;
};

function boardIdsFromPoint(kp: KeyPointWithBoards, boardOptions: BoardOption[]): string[] {
  const fromLinks = (kp.boardLinks ?? [])
    .map((b) => b.id)
    .filter((id): id is string => Boolean(id));
  if (fromLinks.length) return fromLinks;
  const names = new Set((kp.boardNames ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (!names.size) return [];
  return boardOptions.filter((b) => names.has(b.name.trim().toLowerCase())).map((b) => b.id);
}

export function EditableKeyPointSection({
  keyPoints,
  boardOptions = [],
  editable = false,
  saving = false,
  onSavePoint,
  onAddPoint,
  onDeletePoint,
}: Props) {
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftBoardIds, setDraftBoardIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!editable) {
    if (!keyPoints.length) return null;
    return (
      <div className="space-y-2 pt-2 border-t">
        <p className="font-semibold text-sm">Key points</p>
        <KeyPointList keyPoints={keyPoints} />
      </div>
    );
  }

  const startEdit = (kp: KeyPointWithBoards) => {
    setEditingId(kp.id ?? `idx-${kp.content.slice(0, 12)}`);
    setDraftContent(kp.content);
    setDraftBoardIds(boardIdsFromPoint(kp, boardOptions));
  };

  const startAdd = () => {
    setEditingId("new");
    setDraftContent("");
    setDraftBoardIds([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftContent("");
    setDraftBoardIds([]);
  };

  const handleSaveExisting = async (kp: KeyPointWithBoards) => {
    if (!onSavePoint || !draftContent.trim()) return;
    setBusy(true);
    try {
      await onSavePoint({
        id: kp.id,
        content: draftContent.trim(),
        boardIds: draftBoardIds,
      });
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    if (!onAddPoint || !draftContent.trim()) return;
    setBusy(true);
    try {
      await onAddPoint({ content: draftContent.trim(), boardIds: draftBoardIds });
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || saving;

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm">Key points</p>
        {editingId !== "new" ? (
          <Button type="button" variant="outline" size="sm" onClick={startAdd} disabled={disabled}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add box
          </Button>
        ) : null}
      </div>

      <ul className="space-y-2 text-sm">
        {keyPoints.map((kp, i) => {
          const rowKey = kp.id ?? `kp-${i}`;
          const isEditing = editingId === (kp.id ?? `idx-${kp.content.slice(0, 12)}`);

          if (isEditing) {
            return (
              <li key={rowKey} className="rounded-md border bg-background p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Key point</Label>
                  <Textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={3}
                    className="resize-y"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Boards (optional)</Label>
                  <BoardCheckboxGroup
                    boardOptions={boardOptions}
                    selectedIds={draftBoardIds}
                    onChange={setDraftBoardIds}
                    compact
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSaveExisting(kp)}
                    disabled={disabled || !draftContent.trim()}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={disabled}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                  {kp.id && onDeletePoint ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive ml-auto"
                      disabled={disabled}
                      onClick={() => void onDeletePoint(kp.id!)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          }

          return (
            <li key={rowKey} className="rounded-md border bg-muted/20 px-3 py-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="leading-snug flex-1">• {kp.content}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => startEdit(kp)}
                  disabled={disabled || editingId === "new"}
                >
                  <Pencil className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              </div>
              {(kp.boardNames?.length || kp.boardLinks?.length) ? (
                <div className="flex flex-wrap gap-1">
                  {(kp.boardLinks?.length
                    ? kp.boardLinks.map((b) => b.name)
                    : kp.boardNames ?? []
                  ).map((name) => (
                    <Badge
                      key={`${rowKey}-${name}`}
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-normal text-red-600 border-red-300 bg-red-50"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {editingId === "new" ? (
        <div className="rounded-md border border-dashed bg-background p-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">New key point</Label>
            <Textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={3}
              className="resize-y"
              placeholder="Key point…"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Boards (optional)</Label>
            <BoardCheckboxGroup
              boardOptions={boardOptions}
              selectedIds={draftBoardIds}
              onChange={setDraftBoardIds}
              compact
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleAdd()}
              disabled={disabled || !draftContent.trim()}
            >
              {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
              Add key point
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={cancelEdit} disabled={disabled}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {!keyPoints.length && editingId !== "new" ? (
        <p className="text-xs text-muted-foreground">No key points yet. Use Add box to create one.</p>
      ) : null}
    </div>
  );
}
