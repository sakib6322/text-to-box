import { CKEditorField } from "@/components/CKEditorField";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  hint?: boolean;
};

/** Rich explanation editor — headings, lists, tables for organised answers. */
export function ExplanationField({
  value,
  onChange,
  placeholder = "Organised explanation: Heading → points → table (features / differences)…",
  disabled,
  minHeight = "140px",
  className,
  hint = true,
}: Props) {
  return (
    <div className={cn("space-y-1", disabled && "pointer-events-none opacity-60", className)}>
      <CKEditorField value={value} onChange={onChange} placeholder={placeholder} minHeight={minHeight} />
      {hint ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Tip: <span className="font-medium text-foreground/80">Heading</span> = section ·{" "}
          <span className="font-medium text-foreground/80">List</span> = points ·{" "}
          <span className="font-medium text-foreground/80">Table</span> = বৈশিষ্ট্য / পার্থক্য
        </p>
      ) : null}
    </div>
  );
}
