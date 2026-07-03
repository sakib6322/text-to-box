import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CKEditorField } from "@/components/CKEditorField";
import { RichHtmlContent } from "@/components/RichHtmlContent";
import { isHtmlEmpty } from "@/lib/htmlContent";
import { cn } from "@/lib/utils";
import { ChevronDown, Pencil } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function CKEditorPopoverField({ value, onChange, placeholder = "Click Format to edit…" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full min-h-[2rem] rounded-sm border border-transparent px-1 py-0.5 text-left",
            "hover:border-border hover:bg-muted/30 transition-colors",
            "flex items-start gap-1 group",
            open && "border-primary/40 bg-muted/40",
          )}
        >
          <span className="flex-1 min-w-0 text-xs leading-snug">
            {!isHtmlEmpty(value) ? (
              <RichHtmlContent content={value} className="text-xs [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0" />
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <span className="shrink-0 inline-flex items-center gap-0.5 rounded border bg-background px-1 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm group-hover:border-primary/30 group-hover:text-primary">
            <Pencil className="h-2.5 w-2.5" />
            Format
            <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", open && "rotate-180")} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(460px,calc(100vw-2rem))] p-2 z-[80]"
        align="start"
        side="bottom"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {open ? (
          <CKEditorField
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight="96px"
            variant="compact"
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
