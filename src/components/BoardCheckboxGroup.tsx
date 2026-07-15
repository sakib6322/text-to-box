import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type BoardOption = { id: string; name: string };

type Props = {
  boardOptions: BoardOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  compact?: boolean;
  emptyLabel?: string;
};

export function BoardCheckboxGroup({
  boardOptions,
  selectedIds,
  onChange,
  compact = false,
  emptyLabel = "No boards yet. Add them in Settings.",
}: Props) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  if (boardOptions.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-2", compact ? "gap-x-3 gap-y-1" : "rounded-md border p-3")}>
      {boardOptions.map((b) => (
        <label
          key={b.id}
          className={cn("flex cursor-pointer items-center gap-2", compact ? "text-xs" : "text-sm")}
        >
          <Checkbox checked={selectedIds.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
          {b.name}
        </label>
      ))}
    </div>
  );
}
