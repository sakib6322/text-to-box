import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MultiLineFieldProps = {
  label: string;
  required?: boolean;
  values: string[];
  onChange: (next: string[]) => void;
  className?: string;
  rows?: number;
};

/** Multi-value as separate lines; no placeholder (labels only). */
export function MultiLineField({ label, required, values, onChange, className, rows = 2 }: MultiLineFieldProps) {
  const setRow = (i: number, v: string) => {
    const next = [...values];
    next[i] = v;
    onChange(next);
  };
  const add = () => onChange([...values, ""]);
  const remove = (i: number) => onChange(values.filter((_, j) => j !== i));

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <div className="space-y-2">
        {values.map((v, i) => (
          <div key={i} className="flex gap-2">
            <Textarea
              value={v}
              onChange={(e) => setRow(i, e.target.value)}
              rows={rows}
              className="min-h-0 resize-y"
            />
            {values.length > 1 ? (
              <Button type="button" variant="outline" size="icon" onClick={() => remove(i)} aria-label="Remove row">
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add line
        </Button>
      </div>
    </div>
  );
}
