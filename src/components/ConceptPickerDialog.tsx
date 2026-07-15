import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiUrl } from "@/lib/apiBase";
import { toast } from "sonner";

export type SelectableConcept = {
  id: string;
  title: string | null;
  subject: string | null;
  system: string | null;
  chapter: string | null;
  topic: string | null;
  topic_id: string | null;
  key_point_count?: number;
};

type Filters = {
  subject?: string;
  system?: string;
  chapter?: string;
  topic?: string;
  topicId?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters?: Filters;
  selectedId?: string | null;
  onSelect: (concept: SelectableConcept) => void;
};

function taxonomyLine(c: SelectableConcept): string {
  return [c.subject, c.system, c.chapter, c.topic].map((x) => (x ?? "").trim()).filter(Boolean).join(" → ");
}

export function ConceptPickerDialog({ open, onOpenChange, filters, selectedId, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [concepts, setConcepts] = useState<SelectableConcept[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.topicId?.trim()) params.set("topic_id", filters.topicId.trim());
        if (filters?.subject?.trim()) params.set("subject", filters.subject.trim());
        if (filters?.system?.trim()) params.set("system", filters.system.trim());
        if (filters?.chapter?.trim()) params.set("chapter", filters.chapter.trim());
        if (filters?.topic?.trim()) params.set("topic", filters.topic.trim());
        if (search.trim()) params.set("search", search.trim());
        const qs = params.toString() ? `?${params}` : "";
        const r = await fetch(apiUrl(`/api/concepts${qs}`));
        const j = (await r.json().catch(() => ({}))) as { concepts?: SelectableConcept[]; error?: string };
        if (!r.ok) throw new Error(j.error ?? "Failed to load concepts");
        if (!cancelled) setConcepts(Array.isArray(j.concepts) ? j.concepts : []);
      } catch (e) {
        if (!cancelled) {
          setConcepts([]);
          toast.error(e instanceof Error ? e.message : "Failed to load concepts");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, filters?.topicId, filters?.subject, filters?.system, filters?.chapter, filters?.topic, search]);

  const list = useMemo(() => concepts, [concepts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select concept</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search concepts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-md border divide-y max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading concepts…
            </div>
          ) : list.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No concepts found. Create one from Concept Builder first.</p>
          ) : (
            list.map((c) => {
              const active = selectedId === c.id;
              const tax = taxonomyLine(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-3 transition-colors hover:bg-muted/50 ${
                    active ? "bg-primary/10" : ""
                  }`}
                  onClick={() => {
                    onSelect(c);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.title?.trim() || "Untitled"}</p>
                      {tax ? <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{tax}</p> : null}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {typeof c.key_point_count === "number" ? (
                        <Badge variant="secondary" className="text-[10px] tabular-nums">
                          {c.key_point_count} KP
                        </Badge>
                      ) : null}
                      {active ? (
                        <Badge className="text-[10px]">Selected</Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TriggerProps = {
  conceptTitle: string;
  selectedId?: string | null;
  onOpen: () => void;
  onClear?: () => void;
};

export function ConceptSelectButton({ conceptTitle, selectedId, onOpen, onClear }: TriggerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onOpen}>
          <BookOpen className="mr-2 h-4 w-4" />
          {selectedId ? "Change concept" : "Select concept"}
        </Button>
        {selectedId && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        ) : null}
      </div>
      {selectedId ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Selected concept</p>
          <p className="font-medium mt-0.5">{conceptTitle || "Untitled"}</p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Existing concepts থেকে select করুন — নতুন concept এখানে তৈরি হবে না
        </p>
      )}
    </div>
  );
}
