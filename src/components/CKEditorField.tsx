import { useEffect, useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Indent,
  Italic,
  Link,
  List,
  Paragraph,
  Strikethrough,
  Table,
  TableToolbar,
  Underline,
  Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

const baseConfig = {
  licenseKey: "GPL" as const,
  plugins: [
    Essentials,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Paragraph,
    Heading,
    Link,
    List,
    Alignment,
    BlockQuote,
    Table,
    TableToolbar,
    Indent,
    Undo,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "alignment",
      "|",
      "outdent",
      "indent",
      "|",
      "link",
      "blockQuote",
      "insertTable",
    ],
    shouldNotGroupWhenFull: false,
  },
  heading: {
    options: [
      { model: "paragraph", title: "Normal", class: "ck-heading_paragraph" },
      { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
      { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
      { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
    ],
  },
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
  link: {
    addTargetToExternalLinks: true,
  },
};

export function CKEditorField({ value, onChange, placeholder, className, minHeight = "180px" }: Props) {
  const editorRef = useRef<ClassicEditor | null>(null);
  const lastEmitted = useRef(value);

  const config = useMemo(
    () => ({
      ...baseConfig,
      placeholder,
    }),
    [placeholder],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastEmitted.current) return;
    if (editor.getData() === value) return;
    editor.setData(value || "");
    lastEmitted.current = value;
  }, [value]);

  return (
    <div
      className={cn("ckeditor-field rounded-md border bg-background overflow-hidden", className)}
      style={{ "--ck-editor-min-height": minHeight } as React.CSSProperties}
    >
      <CKEditor
        editor={ClassicEditor}
        config={config}
        data={value || ""}
        onReady={(editor) => {
          editorRef.current = editor;
          lastEmitted.current = editor.getData();
        }}
        onChange={(_event, editor) => {
          const data = editor.getData();
          lastEmitted.current = data;
          onChange(data);
        }}
      />
    </div>
  );
}
