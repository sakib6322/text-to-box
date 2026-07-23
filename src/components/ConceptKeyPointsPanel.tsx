import { useMemo } from "react";
import { X } from "lucide-react";
import { KeyPointList } from "@/components/KeyPointList";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KeyPointWithBoards } from "@/lib/conceptDetail";
import { sortKeyPointsByImportance } from "@/lib/progressEngine";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptName?: string;
  keyPoints: KeyPointWithBoards[];
  onBoardClick?: (board: { id: string; name: string }) => void;
};

export function ConceptKeyPointsPanel({ open, onOpenChange, conceptName, keyPoints, onBoardClick }: Props) {
  const sortedKeyPoints = useMemo(() => sortKeyPointsByImportance(keyPoints), [keyPoints]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogClose
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-md transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </DialogClose>

        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-14 sm:px-5">
          <DialogTitle className="text-base sm:text-lg">
            Key points{conceptName ? `: ${conceptName}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {sortedKeyPoints.length} key point{sortedKeyPoints.length === 1 ? "" : "s"} with count and board tags.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          {sortedKeyPoints.length ? (
            <KeyPointList keyPoints={sortedKeyPoints} onBoardClick={onBoardClick} preserveOrder />
          ) : (
            <p className="text-sm text-muted-foreground">No key points found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
