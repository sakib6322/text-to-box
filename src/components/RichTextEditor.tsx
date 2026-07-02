import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bold, Heading1, Heading2, Heading3, Italic, Underline } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

export function htmlToPlainText(html: string): string {
  if (!html.trim()) return "";
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({ value, onChange, placeholder, className, minHeight = "140px" }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    lastHtml.current = html;
    onChange(html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML === value || lastHtml.current === value) return;
    el.innerHTML = value || "";
    lastHtml.current = value;
  }, [value]);

  const toolBtn = (label: string, icon: React.ReactNode, action: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        action();
        editorRef.current?.focus();
        emitChange();
      }}
    >
      {icon}
    </Button>
  );

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1 py-1 bg-muted/30">
        {toolBtn("Bold", <Bold className="h-4 w-4" />, () => exec("bold"))}
        {toolBtn("Italic", <Italic className="h-4 w-4" />, () => exec("italic"))}
        {toolBtn("Underline", <Underline className="h-4 w-4" />, () => exec("underline"))}
        <span className="mx-1 h-5 w-px bg-border" />
        {toolBtn("Heading 1", <Heading1 className="h-4 w-4" />, () => exec("formatBlock", "h1"))}
        {toolBtn("Heading 2", <Heading2 className="h-4 w-4" />, () => exec("formatBlock", "h2"))}
        {toolBtn("Heading 3", <Heading3 className="h-4 w-4" />, () => exec("formatBlock", "h3"))}
        {toolBtn("Paragraph", <span className="text-xs font-semibold">P</span>, () => exec("formatBlock", "p"))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2 outline-none",
          "min-h-[var(--editor-min-h)]",
          "[&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1",
          "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
          "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-1 [&_h3]:mb-1",
          "[&_u]:underline",
        )}
        style={{ "--editor-min-h": minHeight } as React.CSSProperties}
        onInput={emitChange}
        onBlur={emitChange}
        suppressContentEditableWarning
      />
    </div>
  );
}
