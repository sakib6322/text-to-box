import { useEffect, useRef, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { TaxonomyItem } from "@/lib/taxonomy";

const BATCH = 12;

type Props = {
  items: TaxonomyItem[];
  loading?: boolean;
  emptyLabel?: string;
  onSelect: (item: TaxonomyItem) => void;
};

/** Vertical list with progressive (lazy) reveal as you scroll. */
export function TaxonomyBrowseList({
  items,
  loading = false,
  emptyLabel = "No items found",
  onSelect,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(BATCH);
  }, [items]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount((n) => Math.min(n + BATCH, items.length));
      },
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [items.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">{emptyLabel}</Card>
    );
  }

  const visible = items.slice(0, visibleCount);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      {visible.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item)}
          className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {String(item.name).trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
      {visibleCount < items.length ? (
        <div ref={sentinelRef} className="flex justify-center py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
