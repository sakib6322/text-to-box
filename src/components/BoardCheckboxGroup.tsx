import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type BoardOption = { id: string; name: string };

type Props = {
  boardOptions: BoardOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
  emptyLabel?: string;
  /** Scroll viewport height (default max-h-44 / compact max-h-36) */
  maxHeightClass?: string;
};

export function BoardCheckboxGroup({
  boardOptions,
  selectedIds,
  onChange,
  compact = false,
  emptyLabel = "No boards yet. Add them in Settings.",
  maxHeightClass,
}: Props) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (boardOptions.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  const selectedCount = selectedIds.length;
  const heightClass = maxHeightClass ?? (compact ? "max-h-36" : "max-h-44 sm:max-h-52");

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-muted/15", compact && "rounded-lg")}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <p className={cn("font-medium text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
          {selectedCount > 0 ? `${selectedCount} selected` : "Select boards"}
        </p>
        {selectedCount > 0 ? (
          <button
            type="button"
            className="text-[10px] font-medium text-primary hover:underline sm:text-xs"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        ) : null}
      </div>
      <div
        className={cn(
          "overflow-y-auto overscroll-contain p-2 sm:p-2.5",
          "[-webkit-overflow-scrolling:touch]",
          heightClass,
        )}
      >
        <div
          className={cn(
            "grid gap-1.5",
            compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
          )}
        >
          {boardOptions.map((b) => {
            const checked = selectedIds.includes(b.id);
            return (
              <label
                key={b.id}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition active:scale-[0.99]",
                  compact ? "min-h-9 text-xs" : "text-sm",
                  checked
                    ? "border-primary/40 bg-primary/10 shadow-sm"
                    : "border-transparent bg-background/80 hover:border-border hover:bg-muted/40",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(b.id)}
                  className="shrink-0"
                />
                <span className="min-w-0 flex-1 leading-snug break-words">{b.name}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
